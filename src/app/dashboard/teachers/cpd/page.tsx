'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiBookOpen, FiPlus, FiSearch, FiRefreshCw, FiDownload,
  FiEdit2, FiTrash2, FiX, FiCheck, FiAward, FiClock,
  FiBarChart2, FiUsers, FiExternalLink,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
type CPDCategory = 'Workshop' | 'Seminar' | 'Conference' | 'Online Course' | 'In-School Training' | 'Mentorship' | 'Research' | 'Other';

interface CPDRecord {
  id?: number;
  teacher_id: number;
  title: string;
  category: CPDCategory;
  organizer: string;
  start_date: string;
  end_date: string;
  hours: number;
  certificate_url?: string;
  notes?: string;
  verified: boolean;
  created_at?: string;
}

const CATEGORY_CONFIG: Record<CPDCategory, { color: string; bg: string; border: string }> = {
  'Workshop':          { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Seminar':           { color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
  'Conference':        { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  'Online Course':     { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'In-School Training':{ color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  'Mentorship':        { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
  'Research':          { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  'Other':             { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as CPDCategory[];
const TSC_ANNUAL_TARGET = 40; // TSC requires 40 CPD hours per year

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function KPICard({ value, label, sub, icon: Icon, gradient }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -left-2 w-28 h-28 rounded-full opacity-5 bg-white" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>
      </div>
    </div>
  );
}

function CategoryBadge({ cat }: { cat: CPDCategory }) {
  const cfg = CATEGORY_CONFIG[cat];
  return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>{cat}</span>;
}

function CPDModal({ teachers, onClose, onSave, edit }: { teachers: any[]; onClose: () => void; onSave: (d: Partial<CPDRecord>) => void; edit?: Partial<CPDRecord> }) {
  const [f, setF] = useState<Partial<CPDRecord>>({
    category: 'Workshop', verified: false, hours: 0, title: '', organizer: '', start_date: '', end_date: '', notes: '', certificate_url: '', teacher_id: 0, ...edit,
  });
  const set = (p: Partial<CPDRecord>) => setF(prev => ({ ...prev, ...p }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <FiBookOpen size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{edit?.id ? 'Edit CPD Record' : 'Log CPD Activity'}</h3>
              <p className="text-xs text-gray-400">Continuous Professional Development Tracker</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Teacher *</label>
            <select value={f.teacher_id || ''} onChange={e => set({ teacher_id: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50">
              <option value="">Select teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">CPD Title *</label>
            <input type="text" value={f.title || ''} onChange={e => set({ title: e.target.value })} placeholder="e.g. CBC Curriculum Implementation Workshop"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Category *</label>
              <select value={f.category || ''} onChange={e => set({ category: e.target.value as CPDCategory })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Organizer *</label>
              <input type="text" value={f.organizer || ''} onChange={e => set({ organizer: e.target.value })} placeholder="e.g. KICD, MoE, TSC"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Start Date *</label>
              <input type="date" value={f.start_date || ''} onChange={e => set({ start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">End Date *</label>
              <input type="date" value={f.end_date || ''} onChange={e => set({ end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">CPD Hours *</label>
              <input type="number" min="0.5" step="0.5" value={f.hours || ''} onChange={e => set({ hours: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
            </div>
          </div>
          {f.hours && f.hours > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <FiClock size={14} className="text-white" />
              <p className="text-sm font-bold text-white">{f.hours} CPD hours · {Math.round((f.hours / TSC_ANNUAL_TARGET) * 100)}% of annual TSC target ({TSC_ANNUAL_TARGET}h)</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Certificate URL (optional)</label>
            <input type="url" value={f.certificate_url || ''} onChange={e => set({ certificate_url: e.target.value })} placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
            <textarea value={f.notes || ''} onChange={e => set({ notes: e.target.value })} rows={2}
              placeholder="Additional notes or key learnings…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50 resize-none" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={f.verified || false} onChange={e => set({ verified: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
            <span className="text-xs font-semibold text-gray-600">Verified by HOD/Administration</span>
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={() => {
            if (!f.teacher_id || !f.title?.trim() || !f.start_date || !f.hours) { toast.error('Fill all required fields'); return; }
            onSave(f);
          }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
            {edit?.id ? 'Save Changes' : 'Log CPD Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CPDTrackerPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [records, setRecords] = useState<CPDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<CPDRecord> | undefined>();
  const [tab, setTab] = useState<'log' | 'summary'>('log');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, rRes] = await Promise.all([
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('teacher_cpd').select('*').order('start_date', { ascending: false }),
    ]);
    setTeachers(tRes.data || []);
    if (!rRes.error) setRecords(rRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '—'; };
  const totalHours = records.reduce((s, r) => s + (r.hours || 0), 0);
  const verified = records.filter(r => r.verified).length;
  const thisYear = new Date().getFullYear().toString();
  const thisYearHours = records.filter(r => r.start_date?.startsWith(thisYear)).reduce((s, r) => s + (r.hours || 0), 0);
  const teachersMeetTarget = teachers.filter(t => records.filter(r => r.teacher_id === t.id && r.start_date?.startsWith(thisYear)).reduce((s, r) => s + (r.hours || 0), 0) >= TSC_ANNUAL_TARGET).length;

  const filtered = useMemo(() => records.filter(r => {
    const q = searchQ.toLowerCase();
    if (q && !getName(r.teacher_id).toLowerCase().includes(q) && !(r.title || '').toLowerCase().includes(q)) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterTeacher && String(r.teacher_id) !== filterTeacher) return false;
    return true;
  }), [records, searchQ, filterCategory, filterTeacher, teachers]);

  const handleSave = async (data: Partial<CPDRecord>) => {
    const tid = toast.loading(data.id ? 'Updating…' : 'Logging…');
    try {
      if (data.id) {
        const { error } = await supabase.from('teacher_cpd').update(data).eq('id', data.id);
        if (error) throw error;
        toast.success('Updated!', { id: tid });
      } else {
        const { error } = await supabase.from('teacher_cpd').insert({ ...data, created_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('CPD logged!', { id: tid });
      }
      setShowModal(false); setEditItem(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this CPD record?')) return;
    const { error } = await supabase.from('teacher_cpd').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Teacher', 'Title', 'Category', 'Organizer', 'Start', 'End', 'Hours', 'Verified', 'Certificate'],
      ...records.map(r => [getName(r.teacher_id), r.title, r.category, r.organizer, fmtDate(r.start_date), fmtDate(r.end_date), r.hours, r.verified ? 'Yes' : 'No', r.certificate_url || '—'])];
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `cpd-tracker-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
          <FiBookOpen size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Loading CPD records…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <CPDModal teachers={teachers} onClose={() => { setShowModal(false); setEditItem(undefined); }} onSave={handleSave} edit={editItem} />}
      <div className="space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <FiBookOpen size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">CPD Tracker</h1>
              <p className="text-sm text-gray-500 mt-0.5">Continuous Professional Development · TSC Annual Target: {TSC_ANNUAL_TARGET} hours</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FiDownload size={14} /> Export</button>
            <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <FiPlus size={14} /> Log CPD
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard value={records.length}     label="CPD Activities"     sub="All time logged"               icon={FiBookOpen}  gradient="linear-gradient(135deg,#059669,#047857)" />
          <KPICard value={`${totalHours}h`}   label="Total CPD Hours"    sub={`${thisYearHours}h this year`} icon={FiClock}     gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
          <KPICard value={verified}           label="Verified Records"   sub="HOD/Admin confirmed"           icon={FiAward}     gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
          <KPICard value={`${teachersMeetTarget}/${teachers.length}`} label="Met Annual Target" sub={`${TSC_ANNUAL_TARGET}h TSC requirement`} icon={FiUsers} gradient="linear-gradient(135deg,#10b981,#059669)" />
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          {([['log', 'Activity Log', FiBookOpen], ['summary', 'Teacher Summary', FiBarChart2]] as const).map(([t, l, Icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>

        {/* ACTIVITY LOG */}
        {tab === 'log' && <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
                <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Teacher or activity title…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50/50" /></div>
              </div>
              <div className="min-w-[155px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50/50">
                  <option value="all">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teacher</label>
                <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-gray-50/50">
                  <option value="">All Teachers</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{records.length}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['#', 'Teacher', 'Activity', 'Category', 'Organizer', 'Period', 'Hours', 'Verified', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center"><FiBookOpen size={24} className="text-gray-300" /></div>
                      <p className="text-gray-400 font-semibold text-sm">No CPD records found</p>
                      <p className="text-xs text-gray-300 mt-1">Click "Log CPD" to add a professional development activity</p>
                    </td></tr>
                  ) : filtered.map((rec, idx) => (
                    <tr key={rec.id} className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                            {getName(rec.teacher_id).split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <p className="text-xs font-semibold text-gray-800">{getName(rec.teacher_id)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800 max-w-[180px] truncate">{rec.title}</p>
                        {rec.notes && <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{rec.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><CategoryBadge cat={rec.category} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{rec.organizer}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700">{fmtDate(rec.start_date)}</p>
                        {rec.end_date !== rec.start_date && <p className="text-[10px] text-gray-400">to {fmtDate(rec.end_date)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>{rec.hours}h</span>
                      </td>
                      <td className="px-4 py-3">
                        {rec.verified
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100"><FiCheck size={9} /> Verified</span>
                          : <span className="text-[10px] text-gray-300 italic">Unverified</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {rec.certificate_url && <a href={rec.certificate_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"><FiExternalLink size={12} /></a>}
                          <button onClick={() => { setEditItem(rec); setShowModal(true); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"><FiEdit2 size={12} /></button>
                          <button onClick={() => rec.id && handleDelete(rec.id)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500"><span className="font-bold text-emerald-600">{totalHours}h total</span> · <span className="font-bold text-gray-600">{records.length} activities</span> · <span className="font-bold text-blue-600">{verified} verified</span></p>
              <p className="text-xs text-gray-400">CPD Tracker · TSC Compliant</p>
            </div>
          </div>
        </>}

        {/* TEACHER SUMMARY */}
        {tab === 'summary' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiBarChart2 size={15} className="text-emerald-500" /> CPD Hours Per Teacher — {thisYear} vs TSC Annual Target ({TSC_ANNUAL_TARGET}h)</h2></div>
            <div className="divide-y divide-gray-100">
              {teachers.map(teacher => {
                const tRecs = records.filter(r => r.teacher_id === teacher.id);
                const yearRecs = tRecs.filter(r => r.start_date?.startsWith(thisYear));
                const yearHours = yearRecs.reduce((s, r) => s + (r.hours || 0), 0);
                const allHours = tRecs.reduce((s, r) => s + (r.hours || 0), 0);
                const pct = Math.min((yearHours / TSC_ANNUAL_TARGET) * 100, 100);
                const metTarget = yearHours >= TSC_ANNUAL_TARGET;
                const catBreak: Record<string, number> = {};
                tRecs.forEach(r => { catBreak[r.category] = (catBreak[r.category] || 0) + (r.hours || 0); });
                return (
                  <div key={teacher.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>{teacher.first_name?.[0]}{teacher.last_name?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-bold text-gray-800">{teacher.first_name} {teacher.last_name}</p>
                          {metTarget
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Target Met</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{TSC_ANNUAL_TARGET - yearHours}h short</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: metTarget ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
                          </div>
                          <span className="text-xs font-black text-gray-700 flex-shrink-0">{yearHours}h / {TSC_ANNUAL_TARGET}h</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(catBreak).slice(0, 5).map(([cat, h]) => {
                            const cfg = CATEGORY_CONFIG[cat as CPDCategory] || CATEGORY_CONFIG['Other'];
                            return <span key={cat} className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>{cat}: {h}h</span>;
                          })}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black" style={{ color: metTarget ? '#059669' : '#D97706' }}>{allHours}h</p>
                        <p className="text-[10px] text-gray-400">all time</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


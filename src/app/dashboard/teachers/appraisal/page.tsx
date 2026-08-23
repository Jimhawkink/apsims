'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiAward, FiPlus, FiSearch, FiRefreshCw, FiDownload,
  FiEdit2, FiTrash2, FiCheck, FiX, FiStar, FiUser,
  FiChevronDown, FiChevronUp, FiCheckCircle, FiClock, FiAlertCircle,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
type AppraisalForm = 'P1' | 'P2';
type AppraisalStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Approved';
type Rating = 1 | 2 | 3 | 4 | 5;

interface Appraisal {
  id?: number;
  teacher_id: number;
  form_type: AppraisalForm;
  academic_year: string;
  term: string;
  status: AppraisalStatus;
  overall_rating?: number;
  submitted_at?: string;
  reviewed_by?: number | null;
  reviewer_comments?: string;
  created_at?: string;
  // Competency scores stored as JSON
  competencies?: Record<string, number>;
  targets?: Array<{ target: string; achieved: boolean; comments: string }>;
}

// ─── TSC P1/P2 Competency Domains ────────────────────────────────────────────
const P1_COMPETENCIES = [
  { id: 'subject_mastery',    label: 'Subject Content Mastery',         description: 'Depth of knowledge in taught subjects' },
  { id: 'lesson_planning',    label: 'Lesson Planning & Preparation',   description: 'Quality of schemes and lesson plans' },
  { id: 'delivery',           label: 'Teaching & Learning Delivery',    description: 'Effectiveness of instructional strategies' },
  { id: 'assessment',         label: 'Assessment & Feedback',           description: 'Variety and quality of assessment methods' },
  { id: 'classroom_mgmt',     label: 'Classroom Management',            description: 'Conducive learning environment creation' },
  { id: 'professionalism',    label: 'Professional Conduct',            description: 'Punctuality, ethics, and professional behavior' },
  { id: 'collaboration',      label: 'Collaboration & Teamwork',        description: 'Departmental and school community engagement' },
  { id: 'cbc_integration',    label: 'CBC/Competency-Based Integration', description: 'Application of CBC methodology and values' },
  { id: 'parent_engagement',  label: 'Parent & Community Engagement',   description: 'Communication with parents and stakeholders' },
  { id: 'cpd',               label: 'Continuous Professional Development', description: 'Participation in CPD and self-improvement' },
];

const P2_COMPETENCIES = [
  ...P1_COMPETENCIES,
  { id: 'leadership',         label: 'Leadership & Management',         description: 'Department/committee leadership effectiveness' },
  { id: 'mentorship',         label: 'Mentorship & Coaching',           description: 'Guiding junior teachers and students' },
  { id: 'innovation',         label: 'Innovation & Research',           description: 'Classroom innovation and action research' },
  { id: 'policy_compliance',  label: 'MoE/TSC Policy Compliance',       description: 'Adherence to national education policies' },
];

const STATUS_CFG: Record<AppraisalStatus, { color: string; bg: string; border: string; icon: any }> = {
  Draft:     { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', icon: FiEdit2       },
  Submitted: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: FiClock       },
  Reviewed:  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: FiCheckCircle },
  Approved:  { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', icon: FiAward       },
};

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Unsatisfactory',  color: '#DC2626' },
  2: { label: 'Needs Improvement', color: '#D97706' },
  3: { label: 'Satisfactory',    color: '#2563EB' },
  4: { label: 'Good',            color: '#059669' },
  5: { label: 'Excellent',       color: '#7C3AED' },
};

// ─── Components ───────────────────────────────────────────────────────────────
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

function RatingStars({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const cfg = RATING_LABELS[value] || RATING_LABELS[3];
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => !readonly && onChange?.(n)} disabled={readonly}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${readonly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
          style={{ background: n <= value ? cfg.color : '#e5e7eb' }}>
          <FiStar size={12} className="text-white" />
        </button>
      ))}
      {value > 0 && <span className="text-[10px] font-bold ml-1" style={{ color: cfg.color }}>{cfg.label}</span>}
    </div>
  );
}

function AppraisalModal({ teachers, onClose, onSave, edit }: { teachers: any[]; onClose: () => void; onSave: (d: Partial<Appraisal>) => void; edit?: Partial<Appraisal> }) {
  const currentYear = new Date().getFullYear();
  const [f, setF] = useState<Partial<Appraisal>>({
    form_type: 'P1', academic_year: `${currentYear}/${currentYear + 1}`,
    term: 'Term 1', status: 'Draft', teacher_id: 0,
    competencies: {}, targets: [{ target: '', achieved: false, comments: '' }],
    ...edit,
  });
  const comps = f.form_type === 'P2' ? P2_COMPETENCIES : P1_COMPETENCIES;
  const set = (patch: Partial<Appraisal>) => setF(p => ({ ...p, ...patch }));
  const setComp = (id: string, val: number) => set({ competencies: { ...(f.competencies || {}), [id]: val } });
  const addTarget = () => set({ targets: [...(f.targets || []), { target: '', achieved: false, comments: '' }] });
  const updateTarget = (i: number, patch: any) => {
    const ts = [...(f.targets || [])]; ts[i] = { ...ts[i], ...patch }; set({ targets: ts });
  };
  const removeTarget = (i: number) => { const ts = [...(f.targets || [])]; ts.splice(i, 1); set({ targets: ts }); };
  const avgRating = () => {
    const vals = Object.values(f.competencies || {}).filter(v => v > 0);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <FiAward size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{edit?.id ? 'Edit Appraisal' : 'New TSC Appraisal'}</h3>
              <p className="text-xs text-gray-400">TSC-Compliant P1/P2 Performance Appraisal</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Teacher *</label>
              <select value={f.teacher_id || ''} onChange={e => set({ teacher_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-gray-50">
                <option value="">Select teacher…</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Form Type *</label>
              <div className="flex gap-2">
                {(['P1', 'P2'] as AppraisalForm[]).map(ft => (
                  <button key={ft} onClick={() => set({ form_type: ft })}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl border-2 transition-all ${f.form_type === ft ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-purple-300'}`}>
                    {ft} Form
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Academic Year *</label>
              <input type="text" value={f.academic_year || ''} onChange={e => set({ academic_year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Term *</label>
              <select value={f.term || ''} onChange={e => set({ term: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-gray-50">
                {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Average Rating Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            <p className="text-sm font-bold text-white">Overall Average Rating</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{avgRating()}</span>
              <span className="text-xs text-white/70">/ 5.0</span>
            </div>
          </div>

          {/* Competency Ratings */}
          <div>
            <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">Competency Ratings ({comps.length} domains)</h4>
            <div className="space-y-3">
              {comps.map(comp => (
                <div key={comp.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700">{comp.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{comp.description}</p>
                    </div>
                    <RatingStars value={(f.competencies || {})[comp.id] || 0} onChange={v => setComp(comp.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Performance Targets</h4>
              <button onClick={addTarget} className="px-2.5 py-1 text-[11px] font-bold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1">
                <FiPlus size={11} /> Add Target
              </button>
            </div>
            <div className="space-y-2">
              {(f.targets || []).map((tgt, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={tgt.achieved} onChange={e => updateTarget(i, { achieved: e.target.checked })} className="mt-1 w-4 h-4 rounded text-purple-600 cursor-pointer" />
                    <div className="flex-1 space-y-1.5">
                      <input type="text" value={tgt.target} onChange={e => updateTarget(i, { target: e.target.value })} placeholder="Target description…"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                      <input type="text" value={tgt.comments} onChange={e => updateTarget(i, { comments: e.target.value })} placeholder="Achievement comments…"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                    </div>
                    <button onClick={() => removeTarget(i)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0">
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={() => {
            if (!f.teacher_id) { toast.error('Select a teacher'); return; }
            const avg = Object.values(f.competencies || {}).filter(v => v > 0);
            const overall = avg.length > 0 ? avg.reduce((a, b) => a + b, 0) / avg.length : 0;
            onSave({ ...f, overall_rating: Math.round(overall * 10) / 10 });
          }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            {edit?.id ? 'Save Changes' : 'Create Appraisal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TSCAppraisalPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Appraisal> | undefined>();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterForm, setFilterForm] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, aRes] = await Promise.all([
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('teacher_appraisals').select('*').order('created_at', { ascending: false }),
    ]);
    setTeachers(tRes.data || []);
    if (!aRes.error) setAppraisals(aRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '—'; };
  const toggleExpand = (id: number) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const draft = appraisals.filter(a => a.status === 'Draft').length;
  const submitted = appraisals.filter(a => a.status === 'Submitted').length;
  const approved = appraisals.filter(a => a.status === 'Approved').length;
  const avgOverall = appraisals.filter(a => a.overall_rating).length > 0
    ? (appraisals.filter(a => a.overall_rating).reduce((s, a) => s + (a.overall_rating || 0), 0) / appraisals.filter(a => a.overall_rating).length).toFixed(1)
    : '—';

  const filtered = useMemo(() => appraisals.filter(a => {
    const q = searchQ.toLowerCase();
    if (q && !getName(a.teacher_id).toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterForm !== 'all' && a.form_type !== filterForm) return false;
    return true;
  }), [appraisals, searchQ, filterStatus, filterForm, teachers]);

  const handleSave = async (data: Partial<Appraisal>) => {
    const tid = toast.loading(data.id ? 'Updating…' : 'Creating…');
    try {
      const payload = { ...data, competencies: JSON.stringify(data.competencies || {}), targets: JSON.stringify(data.targets || []) };
      if (data.id) {
        const { error } = await supabase.from('teacher_appraisals').update(payload).eq('id', data.id);
        if (error) throw error;
        toast.success('Updated!', { id: tid });
      } else {
        const { error } = await supabase.from('teacher_appraisals').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('Appraisal created!', { id: tid });
      }
      setShowModal(false); setEditItem(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleStatusChange = async (id: number, status: AppraisalStatus) => {
    const patch: any = { status };
    if (status === 'Submitted') patch.submitted_at = new Date().toISOString();
    const { error } = await supabase.from('teacher_appraisals').update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status: ${status}`); fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this appraisal?')) return;
    const { error } = await supabase.from('teacher_appraisals').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchAll();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <FiAward size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Loading TSC appraisals…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <AppraisalModal teachers={teachers} onClose={() => { setShowModal(false); setEditItem(undefined); }} onSave={handleSave} edit={editItem} />}
      <div className="space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <FiAward size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">TSC Appraisal Module</h1>
              <p className="text-sm text-gray-500 mt-0.5">TSC-Compliant P1 &amp; P2 Performance Appraisal Forms · Digital Sign-off</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <FiPlus size={14} /> New Appraisal
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard value={appraisals.length} label="Total Appraisals"  sub="All academic years"      icon={FiAward}        gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
          <KPICard value={submitted}          label="Pending Review"    sub="Awaiting HOD/Principal"  icon={FiClock}        gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
          <KPICard value={approved}           label="Approved"          sub={`${draft} still in draft`} icon={FiCheckCircle}  gradient="linear-gradient(135deg,#10b981,#059669)" />
          <KPICard value={avgOverall}         label="Avg School Rating" sub="Across all teachers"     icon={FiStar}         gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Teacher name…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-gray-50/50" /></div>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-gray-50/50">
                <option value="all">All Statuses</option>
                {['Draft', 'Submitted', 'Reviewed', 'Approved'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Form Type</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {['all', 'P1', 'P2'].map(v => (
                  <button key={v} onClick={() => setFilterForm(v)} className={`flex-1 py-2 text-[11px] font-bold transition-all ${filterForm === v ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    {v === 'all' ? 'All' : v}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{appraisals.length}</span></p>
          </div>
        </div>

        {/* Appraisal Cards */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiAward size={28} className="text-gray-300" /></div>
              <p className="font-semibold text-gray-400 text-sm">No appraisals found</p>
              <p className="text-xs text-gray-300 mt-1">Click "New Appraisal" to create a TSC P1/P2 form</p>
            </div>
          ) : filtered.map((ap, idx) => {
            const t = teachers.find(t => t.id === ap.teacher_id);
            const cfg = STATUS_CFG[ap.status];
            const StatusIcon = cfg.icon;
            const isOpen = expanded.has(ap.id!);
            const comps = ap.form_type === 'P2' ? P2_COMPETENCIES : P1_COMPETENCIES;
            const compData: Record<string, number> = typeof ap.competencies === 'string' ? JSON.parse(ap.competencies || '{}') : (ap.competencies || {});
            const targetsData: any[] = typeof ap.targets === 'string' ? JSON.parse(ap.targets || '[]') : (ap.targets || []);
            const ratingCfg = RATING_LABELS[Math.round(ap.overall_rating || 0)] || RATING_LABELS[3];
            return (
              <div key={ap.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => toggleExpand(ap.id!)}>
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    {t?.first_name?.[0]}{t?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800">{t?.first_name} {t?.last_name}</p>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-700">{ap.form_type} Form</span>
                      <span className="text-[10px] text-gray-400">{ap.academic_year} · {ap.term}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        <StatusIcon size={9} /> {ap.status}
                      </span>
                      {ap.overall_rating && (
                        <span className="text-[10px] font-bold" style={{ color: ratingCfg.color }}>
                          ★ {ap.overall_rating?.toFixed(1)} — {ratingCfg.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ap.status === 'Draft' && <button onClick={e => { e.stopPropagation(); handleStatusChange(ap.id!, 'Submitted'); }} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all">Submit</button>}
                    {ap.status === 'Submitted' && <button onClick={e => { e.stopPropagation(); handleStatusChange(ap.id!, 'Reviewed'); }} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">Mark Reviewed</button>}
                    {ap.status === 'Reviewed' && <button onClick={e => { e.stopPropagation(); handleStatusChange(ap.id!, 'Approved'); }} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 transition-all">Approve</button>}
                    <button onClick={e => { e.stopPropagation(); setEditItem(ap); setShowModal(true); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"><FiEdit2 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); ap.id && handleDelete(ap.id); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"><FiTrash2 size={12} /></button>
                    {isOpen ? <FiChevronUp size={14} className="text-purple-500" /> : <FiChevronDown size={14} className="text-gray-300" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gradient-to-b from-purple-50/30 to-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Competency Ratings */}
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Competency Ratings</p>
                        <div className="space-y-2">
                          {comps.map(comp => (
                            <div key={comp.id} className="flex items-center gap-3">
                              <p className="text-[11px] text-gray-600 flex-1 min-w-0 truncate">{comp.label}</p>
                              <RatingStars value={compData[comp.id] || 0} readonly />
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Targets */}
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Performance Targets ({targetsData.length})</p>
                        {targetsData.length === 0 ? <p className="text-xs text-gray-400 italic">No targets set</p>
                          : targetsData.map((tg, i) => (
                              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl mb-2 border ${tg.achieved ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 flex items-center justify-center ${tg.achieved ? 'bg-green-500' : 'border-2 border-gray-300'}`}>
                                  {tg.achieved && <FiCheck size={9} className="text-white" />}
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold text-gray-700">{tg.target}</p>
                                  {tg.comments && <p className="text-[10px] text-gray-400 mt-0.5">{tg.comments}</p>}
                                </div>
                              </div>
                            ))
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}


'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiBook, FiPlus, FiEdit2, FiTrash2, FiDownload, FiRefreshCw,
  FiSearch, FiCheck, FiX, FiChevronDown, FiChevronUp, FiSend,
  FiCheckCircle, FiClock, FiAlertCircle, FiFileText, FiLayers,
} from 'react-icons/fi';

// ─── CBC KICD Framework Constants ────────────────────────────────────────────
const CORE_COMPETENCIES = ['Communication & Collaboration','Critical Thinking & Problem Solving','Imagination & Creativity','Citizenship','Digital Literacy','Learning to Learn','Self-Efficacy'];
const PERTINENT_ISSUES = ['Life Skills Education','Environmental Education','Poverty Eradication','HIV/AIDS Education','Disaster Risk Reduction','Ethnic & Cultural Diversity','Gender','Inclusion & Special Needs'];
const CBC_VALUES = ['Love','Responsibility','Respect','Unity','Peace','Patriotism','Social Justice','Integrity'];
const LEARNING_AREA_ICONS: Record<string,string> = { Mathematics:'📐', English:'📚', Kiswahili:'🗣️', Science:'🔬', 'Social Studies':'🌍', CRE:'✝️', IRE:'☪️', HRE:'🕉️', 'Creative Arts':'🎨', 'Physical Education':'⚽', 'Agriculture':'🌱', 'Home Science':'🍳', 'Business Studies':'💼', 'Computer Studies':'💻' };
const STRANDS_BY_AREA: Record<string, string[]> = {
  Mathematics: ['Numbers','Algebra','Measurement','Geometry','Data Handling'],
  English: ['Listening & Speaking','Reading','Writing','Grammar in Use','Oral Literature'],
  Kiswahili: ['Kusikiliza & Kuzungumza','Kusoma','Kuandika','Sarufi','Fasihi'],
  Science: ['Living Things','Non-living Things','Body Systems','Technology','Environment'],
  'Social Studies': ['Our Home','Our Community','Our Nation Kenya','Our World'],
};
const HOD_STATUS = { draft:{c:'#6B7280',bg:'#F9FAFB',b:'#E5E7EB',l:'Draft'}, submitted:{c:'#2563EB',bg:'#EFF6FF',b:'#BFDBFE',l:'Submitted'}, approved:{c:'#059669',bg:'#ECFDF5',b:'#6EE7B7',l:'Approved'}, rejected:{c:'#DC2626',bg:'#FEF2F2',b:'#FCA5A5',l:'Rejected'} };

type HODStatus = keyof typeof HOD_STATUS;

interface CBCScheme {
  id?: number;
  form_id: number;
  term_id: number;
  subject_id: number;
  teacher_id?: number;
  week_number: number;
  strand: string;
  sub_strand: string;
  specific_learning_outcomes: string;
  key_inquiry_questions: string;
  learning_experiences: string;
  learning_resources: string;
  assessment_method: string;
  core_competencies: string[];
  pertinent_issues: string[];
  values: string[];
  reflection: string;
  hod_status: HODStatus;
  hod_comment?: string;
  created_at?: string;
}

const WEEKS = Array.from({ length: 13 }, (_, i) => i + 1);

function KPICard({ value, label, sub, icon: Icon, gradient }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="flex items-start justify-between relative z-10">
        <div><p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p><p className="text-4xl font-black">{value}</p>{sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}</div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: HODStatus }) {
  const cfg = HOD_STATUS[status] || HOD_STATUS.draft;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: cfg.bg, color: cfg.c, borderColor: cfg.b }}>{cfg.l}</span>;
}

function SchemeModal({ onClose, onSave, edit, forms, terms, subjects, teachers }: any) {
  const defaultScheme: Partial<CBCScheme> = { form_id: 0, term_id: 0, subject_id: 0, week_number: 1, strand: '', sub_strand: '', specific_learning_outcomes: '', key_inquiry_questions: '', learning_experiences: '', learning_resources: '', assessment_method: 'Observation', core_competencies: [], pertinent_issues: [], values: [], reflection: '', hod_status: 'draft' };
  const [f, setF] = useState<Partial<CBCScheme>>({ ...defaultScheme, ...edit });
  const set = (p: Partial<CBCScheme>) => setF(prev => ({ ...prev, ...p }));
  const selSubj = subjects.find((s: any) => s.id === f.subject_id);
  const availableStrands = selSubj ? (STRANDS_BY_AREA[selSubj.subject_name] || []) : [];
  const toggle = (field: 'core_competencies' | 'pertinent_issues' | 'values', val: string) => {
    const arr = (f[field] || []) as string[];
    set({ [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiBook size={18} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">{edit?.id ? 'Edit' : 'New'} CBC Scheme of Work</h3><p className="text-xs text-gray-400">KICD-Format · Competency-Based Curriculum</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Row 1: Form, Term, Subject, Teacher, Week */}
          <div className="grid grid-cols-5 gap-3">
            {[
              ['Form *', 'form_id', forms, 'form_name'],
              ['Term *', 'term_id', terms, 'term_name'],
              ['Learning Area *', 'subject_id', subjects, 'subject_name'],
              ['Teacher', 'teacher_id', teachers, null],
            ].map(([lbl, key, opts, nameKey]: any) => (
              <div key={key}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{lbl}</label>
                <select value={(f as any)[key] || ''} onChange={e => set({ [key]: Number(e.target.value) || e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50">
                  <option value="">Select…</option>
                  {opts.map((o: any) => <option key={o.id} value={o.id}>{nameKey ? o[nameKey] : `${o.first_name} ${o.last_name}`}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Week *</label>
              <select value={f.week_number || 1} onChange={e => set({ week_number: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50">
                {WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
            </div>
          </div>

          {/* Strand & Sub-strand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Strand *</label>
              {availableStrands.length > 0
                ? <select value={f.strand || ''} onChange={e => set({ strand: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50"><option value="">Select strand…</option>{availableStrands.map(s => <option key={s} value={s}>{s}</option>)}</select>
                : <input value={f.strand || ''} onChange={e => set({ strand: e.target.value })} placeholder="e.g. Numbers" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sub-Strand *</label>
              <input value={f.sub_strand || ''} onChange={e => set({ sub_strand: e.target.value })} placeholder="e.g. Whole Numbers" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />
            </div>
          </div>

          {/* KICD Core Fields */}
          {[
            ['Specific Learning Outcomes (SLOs) *', 'specific_learning_outcomes', 'By the end of this lesson, the learner should be able to…'],
            ['Key Inquiry Questions *', 'key_inquiry_questions', 'e.g. How do we use numbers in daily life?'],
            ['Learning Experiences *', 'learning_experiences', 'Describe activities: hands-on, group work, discovery…'],
            ['Learning Resources', 'learning_resources', 'e.g. Counters, textbook pg. 45, chart, digital device…'],
          ].map(([lbl, key, ph]: any) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{lbl}</label>
              <textarea value={(f as any)[key] || ''} onChange={e => set({ [key]: e.target.value })} placeholder={ph} rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50 resize-none" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assessment Method</label>
              <select value={f.assessment_method || 'Observation'} onChange={e => set({ assessment_method: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50">
                {['Observation','Oral Questions','Written Exercise','Portfolio','Project','Peer Assessment','Self Assessment','Practical'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reflection / Remarks</label>
              <input value={f.reflection || ''} onChange={e => set({ reflection: e.target.value })} placeholder="Post-lesson remarks…"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />
            </div>
          </div>

          {/* Competencies, Values, Issues */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Core Competencies', 'core_competencies', CORE_COMPETENCIES, '#6366f1'],
              ['Values', 'values', CBC_VALUES, '#059669'],
              ['Pertinent & Contemporary Issues', 'pertinent_issues', PERTINENT_ISSUES, '#d97706'],
            ].map(([lbl, field, opts, color]: any) => (
              <div key={field} className="border border-gray-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color }}>{lbl}</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {opts.map((opt: string) => {
                    const arr = (f[field as keyof CBCScheme] || []) as string[];
                    const checked = arr.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                        <div onClick={() => toggle(field, opt)} className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${checked ? 'border-0' : 'border-gray-300 bg-white'}`} style={checked ? { background: color } : {}}>
                          {checked && <FiCheck size={8} className="text-white" />}
                        </div>
                        <span className="text-[10px] text-gray-600">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => set({ hod_status: 'draft' })} className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${f.hod_status === 'draft' ? 'bg-gray-600 text-white border-gray-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>Save Draft</button>
            <button onClick={() => set({ hod_status: 'submitted' })} className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${f.hod_status === 'submitted' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>Submit to HOD</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
            <button onClick={() => {
              if (!f.form_id || !f.term_id || !f.subject_id || !f.strand?.trim() || !f.specific_learning_outcomes?.trim()) { toast.error('Fill all required fields'); return; }
              onSave(f);
            }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              {edit?.id ? 'Save Changes' : 'Create Scheme'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CBCSchemesPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<CBCScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<CBCScheme> | undefined>();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filterForm, setFilterForm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fR, tR, sR, tcR, schR] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_terms').select('*').order('year', { ascending: false }),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('cbc_schemes').select('*').order('week_number'),
    ]);
    setForms(fR.data || []); setTerms(tR.data || []); setSubjects(sR.data || []); setTeachers(tcR.data || []);
    if (!schR.error) setSchemes(schR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (id: number, list: any[], first: string, last: string) => { const i = list.find(x => x.id === id); return i ? (last ? `${i[first]} ${i[last]}` : i[first]) : '—'; };

  const filtered = useMemo(() => schemes.filter(s => {
    if (filterForm && String(s.form_id) !== filterForm) return false;
    if (filterTerm && String(s.term_id) !== filterTerm) return false;
    if (filterSubject && String(s.subject_id) !== filterSubject) return false;
    if (filterStatus !== 'all' && s.hod_status !== filterStatus) return false;
    const q = searchQ.toLowerCase();
    if (q && !(s.strand || '').toLowerCase().includes(q) && !(s.sub_strand || '').toLowerCase().includes(q)) return false;
    return true;
  }), [schemes, filterForm, filterTerm, filterSubject, filterStatus, searchQ]);

  const pending = schemes.filter(s => s.hod_status === 'submitted').length;
  const approved = schemes.filter(s => s.hod_status === 'approved').length;

  const handleSave = async (data: Partial<CBCScheme>) => {
    const tid = toast.loading(data.id ? 'Saving…' : 'Creating…');
    const payload = { ...data, core_competencies: JSON.stringify(data.core_competencies || []), pertinent_issues: JSON.stringify(data.pertinent_issues || []), values: JSON.stringify(data.values || []) };
    try {
      if (data.id) {
        const { error } = await supabase.from('cbc_schemes').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cbc_schemes').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
      toast.success(data.id ? 'Updated!' : 'Created!', { id: tid });
      setShowModal(false); setEditItem(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleHOD = async (id: number, status: HODStatus, comment?: string) => {
    const { error } = await supabase.from('cbc_schemes').update({ hod_status: status, hod_comment: comment || null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status: ${HOD_STATUS[status].l}`); fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this scheme?')) return;
    await supabase.from('cbc_schemes').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Form','Term','Subject','Week','Strand','Sub-Strand','SLOs','Key Questions','Experiences','Resources','Assessment','Core Competencies','Values','Pertinent Issues','Status'],
      ...schemes.map(s => [getName(s.form_id,forms,'form_name',''),getName(s.term_id,terms,'term_name',''),getName(s.subject_id,subjects,'subject_name',''),`Week ${s.week_number}`,s.strand,s.sub_strand,s.specific_learning_outcomes,s.key_inquiry_questions,s.learning_experiences,s.learning_resources,s.assessment_method,(s.core_competencies||[]).join('; '),(s.values||[]).join('; '),(s.pertinent_issues||[]).join('; '),s.hod_status])];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `cbc-schemes-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiBook size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Loading CBC Schemes of Work…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <SchemeModal onClose={() => { setShowModal(false); setEditItem(undefined); }} onSave={handleSave} edit={editItem} forms={forms} terms={terms} subjects={subjects} teachers={teachers} />}
      <div className="space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiBook size={22} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">CBC Schemes of Work Generator</h1>
              <p className="text-sm text-gray-500 mt-0.5">KICD-Format · Strands · SLOs · Core Competencies · Values · HOD Approval</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FiDownload size={14} /> CSV</button>
            <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiPlus size={14} /> New Scheme
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard value={schemes.length} label="Total Schemes"    sub="All learning areas"          icon={FiBook}         gradient="linear-gradient(135deg,#0891b2,#0e7490)" />
          <KPICard value={pending}         label="Pending HOD"      sub="Awaiting approval"           icon={FiClock}        gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
          <KPICard value={approved}        label="HOD Approved"     sub="Ready for teaching"          icon={FiCheckCircle}  gradient="linear-gradient(135deg,#10b981,#059669)" />
          <KPICard value={[...new Set(schemes.map(s => s.subject_id))].length} label="Learning Areas" sub="Covered this term" icon={FiLayers} gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
        </div>

        {/* HOD Alert */}
        {pending > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background: '#EFF6FF', borderColor: '#93C5FD' }}>
            <FiAlertCircle size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1"><p className="font-bold text-blue-800 text-sm">{pending} scheme{pending>1?'s':''} awaiting HOD review</p><p className="text-xs text-blue-600 mt-0.5">Review and approve/reject submitted schemes below</p></div>
            <button onClick={() => setFilterStatus('submitted')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-100 text-blue-800">Review Now</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search Strand/Sub-strand</label>
              <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50/50" /></div>
            </div>
            {[['Form', filterForm, setFilterForm, forms, 'form_name'], ['Term', filterTerm, setFilterTerm, terms, 'term_name'], ['Subject', filterSubject, setFilterSubject, subjects, 'subject_name']].map(([lbl, val, setter, opts, name]: any) => (
              <div key={lbl} className="min-w-[140px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{lbl}</label>
                <select value={val} onChange={e => setter(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50/50">
                  <option value="">All {lbl}s</option>
                  {opts.map((o: any) => <option key={o.id} value={o.id}>{o[name]}</option>)}
                </select>
              </div>
            ))}
            <div className="min-w-[130px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">HOD Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50/50">
                <option value="all">All</option>
                {Object.entries(HOD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{schemes.length}</span></p>
          </div>
        </div>

        {/* Schemes List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiBook size={28} className="text-gray-300" /></div>
              <p className="text-gray-400 font-semibold text-sm">No schemes found</p>
              <p className="text-xs text-gray-300 mt-1">Click "New Scheme" to create a KICD-format CBC scheme of work</p>
            </div>
          ) : filtered.map(sch => {
            const isOpen = expanded.has(sch.id!);
            const form = forms.find(f => f.id === sch.form_id);
            const term = terms.find(t => t.id === sch.term_id);
            const subj = subjects.find(s => s.id === sch.subject_id);
            const teacher = teachers.find(t => t.id === sch.teacher_id);
            const icon = LEARNING_AREA_ICONS[subj?.subject_name] || '📚';
            const comps: string[] = typeof sch.core_competencies === 'string' ? JSON.parse(sch.core_competencies || '[]') : (sch.core_competencies || []);
            const vals: string[] = typeof sch.values === 'string' ? JSON.parse(sch.values || '[]') : (sch.values || []);
            const issues: string[] = typeof sch.pertinent_issues === 'string' ? JSON.parse(sch.pertinent_issues || '[]') : (sch.pertinent_issues || []);
            return (
              <div key={sch.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Row */}
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => setExpanded(p => { const n = new Set(p); n.has(sch.id!) ? n.delete(sch.id!) : n.add(sch.id!); return n; })}>
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl bg-gray-100">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800">{subj?.subject_name || '—'}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-700">Week {sch.week_number}</span>
                      {form && <span className="text-[10px] text-gray-400">{form.form_name}</span>}
                      {term && <span className="text-[10px] text-gray-400">· {term.term_name}</span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">{sch.strand}{sch.sub_strand ? ` › ${sch.sub_strand}` : ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={sch.hod_status} />
                      {teacher && <span className="text-[10px] text-gray-400">{teacher.first_name} {teacher.last_name}</span>}
                      {comps.length > 0 && <span className="text-[10px] text-indigo-500">{comps.length} competencies</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sch.hod_status === 'submitted' && <>
                      <button onClick={e => { e.stopPropagation(); handleHOD(sch.id!, 'approved'); }} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 transition-all">✓ Approve</button>
                      <button onClick={e => { e.stopPropagation(); handleHOD(sch.id!, 'rejected', 'Needs revision'); }} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 transition-all">✗ Reject</button>
                    </>}
                    <button onClick={e => { e.stopPropagation(); setEditItem(sch); setShowModal(true); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"><FiEdit2 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); sch.id && handleDelete(sch.id); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"><FiTrash2 size={12} /></button>
                    {isOpen ? <FiChevronUp size={14} className="text-cyan-500" /> : <FiChevronDown size={14} className="text-gray-300" />}
                  </div>
                </div>
                {/* Expanded KICD Detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gradient-to-b from-cyan-50/30 to-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        {[['📌 Specific Learning Outcomes', sch.specific_learning_outcomes], ['❓ Key Inquiry Questions', sch.key_inquiry_questions], ['🎯 Learning Experiences', sch.learning_experiences], ['📦 Learning Resources', sch.learning_resources], ['✅ Assessment Method', sch.assessment_method]].map(([lbl, val]: any) => val && (
                          <div key={lbl}><p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">{lbl}</p><p className="text-xs text-gray-700 leading-relaxed">{val}</p></div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {comps.length > 0 && <div><p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider mb-1">🧠 Core Competencies</p><div className="flex flex-wrap gap-1">{comps.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{c}</span>)}</div></div>}
                        {vals.length > 0 && <div><p className="text-[10px] font-extrabold text-green-400 uppercase tracking-wider mb-1">💚 Values</p><div className="flex flex-wrap gap-1">{vals.map(v => <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">{v}</span>)}</div></div>}
                        {issues.length > 0 && <div><p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider mb-1">⚡ Pertinent Issues</p><div className="flex flex-wrap gap-1">{issues.map(i => <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">{i}</span>)}</div></div>}
                        {sch.reflection && <div><p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">📝 Reflection</p><p className="text-xs text-gray-600 italic">{sch.reflection}</p></div>}
                        {sch.hod_comment && <div className={`p-3 rounded-xl border ${sch.hod_status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}><p className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 text-gray-500">HOD Comment</p><p className="text-xs text-gray-700">{sch.hod_comment}</p></div>}
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


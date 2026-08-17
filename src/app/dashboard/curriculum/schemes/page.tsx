'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiRefreshCw, FiSearch,
  FiDownload, FiPrinter, FiFilter, FiCheck, FiX, FiFileText,
  FiCheckCircle, FiAlertCircle, FiBook, FiLayers, FiGrid, FiCalendar,
  FiUser, FiClock, FiTarget, FiAward, FiChevronDown, FiChevronRight,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type HODStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision';
const HOD_CONFIG: Record<HODStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  submitted: { label: 'Submitted', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  approved:  { label: 'Approved',  color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  rejected:  { label: 'Rejected',  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  revision:  { label: 'Needs Revision', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
};

const WEEKS = Array.from({ length: 13 }, (_, i) => i + 1);

interface Form { id: number; form_name: string; form_level: number; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface Subject { id: number; subject_name: string; subject_code?: string; }
interface LearningArea { id: number; name: string; code: string; icon: string; }
interface Teacher { id: number; first_name: string; last_name: string; staff_no?: string; }
interface Scheme {
  id?: number;
  form_id: number; term_id: number; year: number;
  subject_id?: number; learning_area_id?: number;
  teacher_id?: number;
  week_number: number;
  strand?: string; sub_strand?: string; specific_learning_outcomes?: string;
  key_inquiry_questions?: string; learning_experiences?: string;
  learning_resources?: string; assessment_methods?: string;
  values_pcis?: string; references_?: string;
  hod_status: HODStatus; hod_comments?: string;
  created_at?: string;
}
interface SchemeRow extends Scheme {
  form?: Form; subject?: Subject; learning_area?: LearningArea; teacher?: Teacher;
}

export default function SchemesPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schemes, setSchemes] = useState<SchemeRow[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selSubject, setSelSubject] = useState('');
  const [selTeacher, setSelTeacher] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editScheme, setEditScheme] = useState<Partial<Scheme>>({});
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isJSS, setIsJSS] = useState(false);
  const [tab, setTab] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const load = async () => {
      const [fR, tR, sR, laR, tR2] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        sb.from('jss_learning_areas').select('id,name,code,icon').eq('is_active', true).order('sort_order'),
        sb.from('school_teachers').select('id,first_name,last_name,staff_no').eq('status', 'Active').order('last_name'),
      ]);
      setForms(fR.data || []);
      setTerms(tR.data || []);
      setSubjects(sR.data || []);
      setLearningAreas(laR.data || []);
      setTeachers(tR2.data || []);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const f = forms.find(f => String(f.id) === selForm);
    setIsJSS(!!(f && (f.form_level >= 7 && f.form_level <= 9 || (f.form_name || '').toLowerCase().includes('grade'))));
  }, [selForm, forms]);

  const fetchSchemes = useCallback(async () => {
    if (!selForm || !selTerm) return;
    let q = sb.from('school_schemes_of_work').select('*').eq('form_id', selForm).eq('term_id', selTerm).eq('year', selYear);
    if (selSubject) q = q.eq('subject_id', selSubject);
    if (selTeacher) q = q.eq('teacher_id', selTeacher);
    const { data } = await q.order('week_number');
    const enriched = (data || []).map((s: Scheme) => ({
      ...s,
      form: forms.find(f => f.id === s.form_id),
      subject: subjects.find(sub => sub.id === s.subject_id),
      learning_area: learningAreas.find(la => la.id === s.learning_area_id),
      teacher: teachers.find(t => t.id === s.teacher_id),
    }));
    setSchemes(enriched);
  }, [selForm, selTerm, selYear, selSubject, selTeacher, forms, subjects, learningAreas, teachers]);

  useEffect(() => { if (forms.length > 0) fetchSchemes(); }, [fetchSchemes, forms.length]);

  const openNew = (week?: number) => {
    setEditScheme({
      form_id: Number(selForm) || undefined,
      term_id: Number(selTerm) || undefined,
      year: selYear,
      week_number: week || 1,
      hod_status: 'draft',
    } as Partial<Scheme>);
    setShowModal(true);
  };

  const saveScheme = async () => {
    if (!editScheme.form_id || !editScheme.term_id || !editScheme.week_number) {
      toast.error('Fill in required fields'); return;
    }
    if (!editScheme.subject_id && !editScheme.learning_area_id) {
      toast.error('Select a subject or learning area'); return;
    }
    setSaving(true);
    try {
      const payload = { ...editScheme, year: selYear };
      if (editScheme.id) {
        const { error } = await sb.from('school_schemes_of_work').update(payload).eq('id', editScheme.id);
        if (error) throw error;
        toast.success('Scheme updated');
      } else {
        const { error } = await sb.from('school_schemes_of_work').insert(payload);
        if (error) throw error;
        toast.success('Scheme of work saved');
      }
      setShowModal(false); setEditScheme({});
      fetchSchemes();
    } catch (e: any) { toast.error(e.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const deleteScheme = async (id: number) => {
    if (!confirm('Delete this scheme entry?')) return;
    await sb.from('school_schemes_of_work').delete().eq('id', id);
    fetchSchemes(); toast.success('Deleted');
  };

  const hodAction = async (id: number, status: HODStatus, comments?: string) => {
    await sb.from('school_schemes_of_work').update({ hod_status: status, hod_comments: comments }).eq('id', id);
    fetchSchemes(); toast.success(`Status: ${HOD_CONFIG[status].label}`);
  };

  const exportCSV = () => {
    const headers = ['Week','Class','Subject/LA','Strand','Sub-Strand','Learning Outcomes','Key Questions','Experiences','Resources','Assessment','HOD Status'];
    const rows = schemes.map(s => [
      `Week ${s.week_number}`,
      s.form?.form_name || '',
      s.subject?.subject_name || s.learning_area?.name || '',
      s.strand || '', s.sub_strand || '',
      s.specific_learning_outcomes || '', s.key_inquiry_questions || '',
      s.learning_experiences || '', s.learning_resources || '',
      s.assessment_methods || '', HOD_CONFIG[s.hod_status].label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const form = forms.find(f => String(f.id) === selForm);
    const term = terms.find(t => String(t.id) === selTerm);
    a.download = `Schemes_${form?.form_name}_${term?.term_name}_${selYear}.csv`;
    a.click(); toast.success('Schemes exported!');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return schemes;
    const s = search.toLowerCase();
    return schemes.filter(sc =>
      (sc.strand || '').toLowerCase().includes(s) ||
      (sc.specific_learning_outcomes || '').toLowerCase().includes(s) ||
      (sc.subject?.subject_name || sc.learning_area?.name || '').toLowerCase().includes(s)
    );
  }, [schemes, search]);

  const byWeek = useMemo(() => {
    const map: Record<number, SchemeRow[]> = {};
    filtered.forEach(s => {
      if (!map[s.week_number]) map[s.week_number] = [];
      map[s.week_number].push(s);
    });
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: schemes.length,
    weeks: new Set(schemes.map(s => s.week_number)).size,
    approved: schemes.filter(s => s.hod_status === 'approved').length,
    pending: schemes.filter(s => s.hod_status === 'submitted').length,
    coverage: WEEKS.filter(w => byWeek[w] && byWeek[w].length > 0).length,
  }), [schemes, byWeek]);

  const form = forms.find(f => String(f.id) === selForm);
  const term = terms.find(t => String(t.id) === selTerm);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <FiBook className="text-teal-500" />
                {editScheme.id ? 'Edit Scheme of Work' : 'New Scheme of Work Entry'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditScheme({}); }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Class / Form *</label>
                  <select value={editScheme.form_id || ''} onChange={e => setEditScheme(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Term *</label>
                  <select value={editScheme.term_id || ''} onChange={e => setEditScheme(p => ({ ...p, term_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Week *</label>
                  <select value={editScheme.week_number || ''} onChange={e => setEditScheme(p => ({ ...p, week_number: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Subject (8-4-4 / Senior)</label>
                  <select value={editScheme.subject_id || ''} onChange={e => setEditScheme(p => ({ ...p, subject_id: Number(e.target.value) || undefined, learning_area_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">JSS Learning Area</label>
                  <select value={editScheme.learning_area_id || ''} onChange={e => setEditScheme(p => ({ ...p, learning_area_id: Number(e.target.value) || undefined, subject_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select LA</option>
                    {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Teacher</label>
                <select value={editScheme.teacher_id || ''} onChange={e => setEditScheme(p => ({ ...p, teacher_id: Number(e.target.value) || undefined }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Strand / Topic</label>
                  <input value={editScheme.strand || ''} onChange={e => setEditScheme(p => ({ ...p, strand: e.target.value }))}
                    placeholder="e.g., Numbers and Operations"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Sub-Strand</label>
                  <input value={editScheme.sub_strand || ''} onChange={e => setEditScheme(p => ({ ...p, sub_strand: e.target.value }))}
                    placeholder="e.g., Whole Numbers up to 100,000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Specific Learning Outcomes (SLOs)</label>
                <textarea value={editScheme.specific_learning_outcomes || ''} onChange={e => setEditScheme(p => ({ ...p, specific_learning_outcomes: e.target.value }))}
                  rows={3} placeholder="By the end of the lesson, the learner should be able to..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Key Inquiry Questions</label>
                <textarea value={editScheme.key_inquiry_questions || ''} onChange={e => setEditScheme(p => ({ ...p, key_inquiry_questions: e.target.value }))}
                  rows={2} placeholder="What key questions will guide learning?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Learning Experiences</label>
                <textarea value={editScheme.learning_experiences || ''} onChange={e => setEditScheme(p => ({ ...p, learning_experiences: e.target.value }))}
                  rows={3} placeholder="Activities, discussions, practicals..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Learning Resources</label>
                  <textarea value={editScheme.learning_resources || ''} onChange={e => setEditScheme(p => ({ ...p, learning_resources: e.target.value }))}
                    rows={2} placeholder="Textbooks, charts, manipulatives..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Assessment Methods</label>
                  <textarea value={editScheme.assessment_methods || ''} onChange={e => setEditScheme(p => ({ ...p, assessment_methods: e.target.value }))}
                    rows={2} placeholder="Observation, Q&A, Portfolio..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Values, PCIs & Link to Other LAs</label>
                <input value={editScheme.values_pcis || ''} onChange={e => setEditScheme(p => ({ ...p, values_pcis: e.target.value }))}
                  placeholder="e.g., Responsibility, Environmental Education, links to ISC"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0 justify-end border-t bg-gray-50">
              <button onClick={() => { setShowModal(false); setEditScheme({}); }} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={saveScheme} disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : 'Save Scheme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                <FiBook size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">KICD Schemes of Work</h1>
                <p className="text-xs text-gray-400">CBC / 8-4-4 · Weekly Schemes · HOD Approval Workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> Export CSV
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiPrinter size={14} /> Print
              </button>
              <button onClick={() => openNew()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                <FiPlus size={14} /> New Entry
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-teal-300 outline-none">
              <option value="">All Classes</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => { setSelTerm(e.target.value); const t = terms.find(t => String(t.id) === e.target.value); if (t) setSelYear(t.year); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-teal-300 outline-none">
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' ✓' : ''}</option>)}
            </select>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[160px] focus:ring-2 focus:ring-teal-300 outline-none">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
            <select value={selTeacher} onChange={e => setSelTeacher(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[160px] focus:ring-2 focus:ring-teal-300 outline-none">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search strand, outcomes..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
            </div>
          </div>
        </div>
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {([['grid','📅 By Week'],['list','📋 Full List']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Entries', value: stats.total, color: '#0D9488' },
            { label: 'Weeks Covered', value: `${stats.coverage}/13`, color: '#2563EB' },
            { label: 'HOD Approved', value: stats.approved, color: '#059669' },
            { label: 'Awaiting HOD', value: stats.pending, color: '#D97706' },
            { label: 'Teachers Assigned', value: new Set(schemes.map(s => s.teacher_id).filter(Boolean)).size, color: '#7C3AED' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {!selForm && !selTerm ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4"><FiBook size={28} className="text-teal-400" /></div>
            <h3 className="font-bold text-gray-700 mb-1">Select Class & Term</h3>
            <p className="text-sm text-gray-400">Choose a class and term to view or create schemes of work</p>
          </div>
        ) : tab === 'grid' ? (
          /* WEEK-BY-WEEK GRID */
          <div className="space-y-3">
            {WEEKS.map(week => {
              const weekSchemes = byWeek[week] || [];
              const isExpanded = expandedWeek === week;
              const allApproved = weekSchemes.length > 0 && weekSchemes.every(s => s.hod_status === 'approved');
              return (
                <div key={week} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedWeek(isExpanded ? null : week)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${allApproved ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
                        style={allApproved ? { background: 'linear-gradient(135deg,#059669,#10B981)' } : {}}>
                        {allApproved ? <FiCheckCircle size={16} /> : week}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Week {week}</p>
                        <p className="text-xs text-gray-400">{weekSchemes.length} {weekSchemes.length === 1 ? 'entry' : 'entries'}</p>
                      </div>
                      {weekSchemes.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {weekSchemes.slice(0, 3).map(s => (
                            <span key={s.id} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                              style={{ background: HOD_CONFIG[s.hod_status].bg, color: HOD_CONFIG[s.hod_status].color }}>
                              {s.subject?.subject_name || s.learning_area?.name || 'Subject'}
                            </span>
                          ))}
                          {weekSchemes.length > 3 && <span className="text-xs text-gray-400">+{weekSchemes.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={e => { e.stopPropagation(); openNew(week); }}
                        className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500 transition">
                        <FiPlus size={14} />
                      </button>
                      {isExpanded ? <FiChevronDown size={16} className="text-gray-400" /> : <FiChevronRight size={16} className="text-gray-400" />}
                    </div>
                  </div>
                  {isExpanded && weekSchemes.length > 0 && (
                    <div className="border-t border-gray-100">
                      {weekSchemes.map((s, i) => (
                        <div key={s.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-teal-50/20 transition`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-800">
                                  {s.learning_area ? `${s.learning_area.icon} ${s.learning_area.name}` : s.subject?.subject_name}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold border"
                                  style={{ background: HOD_CONFIG[s.hod_status].bg, color: HOD_CONFIG[s.hod_status].color, borderColor: HOD_CONFIG[s.hod_status].border }}>
                                  {HOD_CONFIG[s.hod_status].label}
                                </span>
                                {s.teacher && <span className="text-xs text-gray-400 flex items-center gap-1"><FiUser size={10} /> {s.teacher.first_name} {s.teacher.last_name}</span>}
                              </div>
                              {s.strand && <p className="text-xs font-semibold text-teal-700 mb-0.5">📌 {s.strand}{s.sub_strand ? ` → ${s.sub_strand}` : ''}</p>}
                              {s.specific_learning_outcomes && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">SLOs:</span> {s.specific_learning_outcomes}</p>}
                              {s.key_inquiry_questions && <p className="text-xs text-gray-500 italic mb-1">❓ {s.key_inquiry_questions}</p>}
                              <div className="flex gap-4 mt-1 flex-wrap">
                                {s.learning_resources && <p className="text-[10px] text-gray-400">📦 {s.learning_resources}</p>}
                                {s.assessment_methods && <p className="text-[10px] text-gray-400">📝 {s.assessment_methods}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {s.hod_status === 'submitted' && (
                                <>
                                  <button onClick={() => hodAction(s.id!, 'approved')} className="px-2 py-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">✓ Approve</button>
                                  <button onClick={() => hodAction(s.id!, 'rejected')} className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">✗ Reject</button>
                                </>
                              )}
                              {s.hod_status === 'draft' && (
                                <button onClick={() => hodAction(s.id!, 'submitted')} className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">Submit</button>
                              )}
                              <button onClick={() => { setEditScheme(s); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><FiEdit2 size={12} /></button>
                              <button onClick={() => s.id && deleteScheme(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><FiTrash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && weekSchemes.length === 0 && (
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
                      <p className="text-sm text-gray-400">No entries for Week {week}.</p>
                      <button onClick={() => openNew(week)} className="text-xs text-teal-600 font-bold hover:underline">+ Add entry</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* FULL LIST VIEW */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Week','Subject / LA','Strand','Sub-Strand','SLOs','Teacher','HOD Status','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No scheme entries found. Click + New Entry to add.</td></tr>
                  ) : filtered.map((s, idx) => (
                    <tr key={s.id || idx} className={`border-b border-gray-100 hover:bg-teal-50/20 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                      <td className="px-4 py-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs" style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)', color: '#fff' }}>
                          {s.week_number}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">
                        {s.learning_area ? `${s.learning_area.icon} ${s.learning_area.name}` : s.subject?.subject_name || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[150px] truncate">{s.strand || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{s.sub_strand || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{s.specific_learning_outcomes || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{s.teacher ? `${s.teacher.first_name} ${s.teacher.last_name}` : '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-1 rounded-lg font-bold border"
                          style={{ background: HOD_CONFIG[s.hod_status].bg, color: HOD_CONFIG[s.hod_status].color, borderColor: HOD_CONFIG[s.hod_status].border }}>
                          {HOD_CONFIG[s.hod_status].label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditScheme(s); setShowModal(true); }} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500"><FiEdit2 size={12} /></button>
                          <button onClick={() => s.id && deleteScheme(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

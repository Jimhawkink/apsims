'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiRefreshCw, FiSearch,
  FiDownload, FiPrinter, FiX, FiFilter, FiCheckCircle, FiAlertCircle,
  FiBook, FiUser, FiClock, FiTarget, FiLayers, FiGrid,
  FiFileText, FiCalendar, FiEye, FiChevronDown,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type HODStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
const HOD_CFG: Record<HODStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  submitted: { label: 'Submitted', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  approved:  { label: 'Approved',  color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  rejected:  { label: 'Rejected',  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

interface Form { id: number; form_name: string; form_level: number; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface Subject { id: number; subject_name: string; }
interface LearningArea { id: number; name: string; code: string; icon: string; }
interface Teacher { id: number; first_name: string; last_name: string; staff_no?: string; }
interface LessonPlan {
  id?: number;
  form_id: number; term_id: number; year: number;
  subject_id?: number; learning_area_id?: number;
  teacher_id?: number;
  lesson_date?: string; lesson_number?: number;
  week_number?: number; lesson_in_week?: number;
  duration_minutes?: number;
  strand?: string; sub_strand?: string;
  specific_learning_outcomes?: string;
  key_inquiry_questions?: string;
  introduction?: string; lesson_body?: string;
  conclusion?: string; extended_activities?: string;
  learning_resources?: string;
  assessment_methods?: string;
  reflection_notes?: string;
  hod_status: HODStatus;
  hod_comments?: string;
  created_at?: string;
}

type View = 'list' | 'single';

export default function LessonPlansPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selTeacher, setSelTeacher] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>('list');
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Partial<LessonPlan>>({});
  const [schoolName, setSchoolName] = useState('APSIMS School');

  useEffect(() => {
    const load = async () => {
      const [fR, tR, sR, laR, tR2, snR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        sb.from('jss_learning_areas').select('id,name,code,icon').eq('is_active', true).order('sort_order'),
        sb.from('school_teachers').select('id,first_name,last_name,staff_no').eq('status', 'Active').order('last_name'),
        sb.from('school_settings').select('value').eq('key', 'school_name').maybeSingle(),
      ]);
      setForms(fR.data || []);
      setTerms(tR.data || []);
      setSubjects(sR.data || []);
      setLearningAreas(laR.data || []);
      setTeachers(tR2.data || []);
      if (snR.data?.value) setSchoolName(snR.data.value);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  const fetchPlans = useCallback(async () => {
    if (!selTerm && !selForm) return;
    let q = sb.from('school_lesson_plans').select('*').eq('year', selYear);
    if (selForm) q = q.eq('form_id', selForm);
    if (selTerm) q = q.eq('term_id', selTerm);
    if (selTeacher) q = q.eq('teacher_id', selTeacher);
    const { data } = await q.order('lesson_date', { ascending: false });
    setPlans(data || []);
  }, [selForm, selTerm, selYear, selTeacher]);

  useEffect(() => { if (forms.length > 0) fetchPlans(); }, [fetchPlans, forms.length]);

  const save = async () => {
    if (!editPlan.form_id || !editPlan.term_id) { toast.error('Select class and term'); return; }
    if (!editPlan.subject_id && !editPlan.learning_area_id) { toast.error('Select subject or learning area'); return; }
    setSaving(true);
    try {
      const payload = { ...editPlan, year: selYear };
      if (editPlan.id) {
        const { error } = await sb.from('school_lesson_plans').update(payload).eq('id', editPlan.id);
        if (error) throw error;
        toast.success('Lesson plan updated');
      } else {
        const { error } = await sb.from('school_lesson_plans').insert(payload);
        if (error) throw error;
        toast.success('Lesson plan saved');
      }
      setShowModal(false); setEditPlan({});
      fetchPlans();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id: number) => {
    if (!confirm('Delete this lesson plan?')) return;
    await sb.from('school_lesson_plans').delete().eq('id', id);
    fetchPlans(); toast.success('Deleted');
  };

  const hodAction = async (id: number, status: HODStatus) => {
    await sb.from('school_lesson_plans').update({ hod_status: status }).eq('id', id);
    fetchPlans(); toast.success(`${HOD_CFG[status].label}`);
  };

  const exportCSV = () => {
    const headers = ['Date','Week','Class','Subject/LA','Strand','SLOs','Resources','Assessment','HOD'];
    const rows = plans.map(p => [
      p.lesson_date || '', `W${p.week_number}L${p.lesson_in_week}`,
      forms.find(f => f.id === p.form_id)?.form_name || '',
      subjects.find(s => s.id === p.subject_id)?.subject_name || learningAreas.find(la => la.id === p.learning_area_id)?.name || '',
      p.strand || '', p.specific_learning_outcomes || '',
      p.learning_resources || '', p.assessment_methods || '',
      HOD_CFG[p.hod_status].label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `LessonPlans_${selYear}.csv`; a.click();
    toast.success('Exported!');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const s = search.toLowerCase();
    return plans.filter(p =>
      (p.strand || '').toLowerCase().includes(s) ||
      (p.specific_learning_outcomes || '').toLowerCase().includes(s)
    );
  }, [plans, search]);

  const stats = useMemo(() => ({
    total: plans.length,
    approved: plans.filter(p => p.hod_status === 'approved').length,
    pending: plans.filter(p => p.hod_status === 'submitted').length,
    draft: plans.filter(p => p.hod_status === 'draft').length,
  }), [plans]);

  // Print view for a single plan
  const PrintPlan = ({ plan }: { plan: LessonPlan }) => {
    const form = forms.find(f => f.id === plan.form_id);
    const term = terms.find(t => t.id === plan.term_id);
    const subject = subjects.find(s => s.id === plan.subject_id);
    const la = learningAreas.find(l => l.id === plan.learning_area_id);
    const teacher = teachers.find(t => t.id === plan.teacher_id);

    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden max-w-3xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
          <h1 className="text-xl font-black">{schoolName}</h1>
          <h2 className="text-lg font-bold mt-1">KICD LESSON PLAN — CBC FORMAT</h2>
          <div className="grid grid-cols-3 gap-6 mt-4 text-sm">
            <div><p className="text-white/60 text-xs mb-0.5">Class</p><p className="font-bold">{form?.form_name}</p></div>
            <div><p className="text-white/60 text-xs mb-0.5">Subject / LA</p><p className="font-bold">{la ? `${la.icon} ${la.name}` : subject?.subject_name}</p></div>
            <div><p className="text-white/60 text-xs mb-0.5">Date</p><p className="font-bold">{plan.lesson_date ? new Date(plan.lesson_date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p></div>
            <div><p className="text-white/60 text-xs mb-0.5">Term / Year</p><p className="font-bold">{term?.term_name} {plan.year}</p></div>
            <div><p className="text-white/60 text-xs mb-0.5">Week / Lesson</p><p className="font-bold">Week {plan.week_number}, Lesson {plan.lesson_in_week}</p></div>
            <div><p className="text-white/60 text-xs mb-0.5">Duration</p><p className="font-bold">{plan.duration_minutes || 40} min</p></div>
          </div>
          {teacher && <p className="mt-3 text-sm text-white/80">Teacher: <span className="font-bold text-white">{teacher.first_name} {teacher.last_name}</span></p>}
        </div>

        <div className="p-8 space-y-5">
          {/* Strand and SLOs */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs font-black text-teal-700 uppercase tracking-wider mb-2">Strand / Sub-Strand</p>
              <p className="text-sm font-bold text-gray-800">{plan.strand || '—'}</p>
              {plan.sub_strand && <p className="text-xs text-gray-600 mt-1">→ {plan.sub_strand}</p>}
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">Key Inquiry Questions</p>
              <p className="text-sm text-gray-700">{plan.key_inquiry_questions || '—'}</p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">Specific Learning Outcomes (SLOs)</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{plan.specific_learning_outcomes || '—'}</p>
          </div>

          {/* Lesson Steps */}
          {[
            { title: 'Introduction / Lesson Introduction', value: plan.introduction, icon: '🟢', color: '#059669', bg: '#D1FAE5' },
            { title: 'Lesson Body / Learning Experiences', value: plan.lesson_body, icon: '🔵', color: '#2563EB', bg: '#DBEAFE' },
            { title: 'Conclusion / Wrap-Up', value: plan.conclusion, icon: '🟠', color: '#D97706', bg: '#FEF3C7' },
          ].map(({ title, value, icon, color, bg }) => (
            <div key={title} className="rounded-xl p-4 border" style={{ background: bg, borderColor: bg }}>
              <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color }}>{icon} {title}</p>
              <p className="text-sm text-gray-800 whitespace-pre-line">{value || '—'}</p>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-5">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">📦 Learning Resources</p>
              <p className="text-sm text-gray-700">{plan.learning_resources || '—'}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">📝 Assessment Methods</p>
              <p className="text-sm text-gray-700">{plan.assessment_methods || '—'}</p>
            </div>
          </div>

          {plan.reflection_notes && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">🔄 Teacher Reflection Notes</p>
              <p className="text-sm text-gray-700 italic">{plan.reflection_notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="border-t-2 border-gray-200 pt-5 grid grid-cols-3 gap-6">
            {['Teacher', 'HOD / Subject Head', 'Principal'].map(role => (
              <div key={role} className="text-center">
                <div className="border-b-2 border-gray-300 h-10 mb-2" />
                <p className="text-xs text-gray-500">{role}</p>
                <p className="text-[10px] text-gray-300">Sign & Date</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-black text-gray-800 text-lg">{editPlan.id ? 'Edit Lesson Plan' : 'New Lesson Plan'}</h3>
              <button onClick={() => { setShowModal(false); setEditPlan({}); }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Class *</label>
                  <select value={editPlan.form_id || ''} onChange={e => setEditPlan(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Term *</label>
                  <select value={editPlan.term_id || ''} onChange={e => setEditPlan(p => ({ ...p, term_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
                  <input type="date" value={editPlan.lesson_date || ''} onChange={e => setEditPlan(p => ({ ...p, lesson_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Subject (8-4-4/Senior)</label>
                  <select value={editPlan.subject_id || ''} onChange={e => setEditPlan(p => ({ ...p, subject_id: Number(e.target.value) || undefined, learning_area_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">JSS Learning Area</label>
                  <select value={editPlan.learning_area_id || ''} onChange={e => setEditPlan(p => ({ ...p, learning_area_id: Number(e.target.value) || undefined, subject_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select LA</option>
                    {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Teacher</label>
                  <select value={editPlan.teacher_id || ''} onChange={e => setEditPlan(p => ({ ...p, teacher_id: Number(e.target.value) || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">Select</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Week</label>
                  <select value={editPlan.week_number || ''} onChange={e => setEditPlan(p => ({ ...p, week_number: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none">
                    <option value="">W</option>
                    {Array.from({length:13},(_,i)=>i+1).map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Duration (min)</label>
                  <input type="number" value={editPlan.duration_minutes || 40} onChange={e => setEditPlan(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Strand</label>
                  <input value={editPlan.strand || ''} onChange={e => setEditPlan(p => ({ ...p, strand: e.target.value }))} placeholder="e.g., Numbers" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Sub-Strand</label>
                  <input value={editPlan.sub_strand || ''} onChange={e => setEditPlan(p => ({ ...p, sub_strand: e.target.value }))} placeholder="e.g., Fractions" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Key Inquiry Questions</label>
                <textarea value={editPlan.key_inquiry_questions || ''} onChange={e => setEditPlan(p => ({ ...p, key_inquiry_questions: e.target.value }))} rows={2} placeholder="Questions driving the lesson..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Specific Learning Outcomes (SLOs)</label>
                <textarea value={editPlan.specific_learning_outcomes || ''} onChange={e => setEditPlan(p => ({ ...p, specific_learning_outcomes: e.target.value }))} rows={3} placeholder="By the end of the lesson, the learner should be able to..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
              {[
                ['introduction','Introduction (5–10 min)','How will you open the lesson?'],
                ['lesson_body','Lesson Body / Learning Experiences (25–30 min)','Activities, discussions, investigations...'],
                ['conclusion','Conclusion / Wrap-Up (5 min)','Summary, questions, assignments...'],
              ].map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
                  <textarea value={(editPlan as any)[field] || ''} onChange={e => setEditPlan(p => ({ ...p, [field]: e.target.value }))} rows={3} placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Learning Resources</label>
                  <textarea value={editPlan.learning_resources || ''} onChange={e => setEditPlan(p => ({ ...p, learning_resources: e.target.value }))} rows={2} placeholder="Textbooks, charts, ICT..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Assessment Methods</label>
                  <textarea value={editPlan.assessment_methods || ''} onChange={e => setEditPlan(p => ({ ...p, assessment_methods: e.target.value }))} rows={2} placeholder="Observation, oral Q&A, portfolio..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Teacher Reflection Notes (after lesson)</label>
                <textarea value={editPlan.reflection_notes || ''} onChange={e => setEditPlan(p => ({ ...p, reflection_notes: e.target.value }))} rows={2} placeholder="What went well? What to improve?" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0 justify-end sticky bottom-0 bg-white border-t">
              <button onClick={() => { setShowModal(false); setEditPlan({}); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : 'Save Lesson Plan'}
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                <FiFileText size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">KICD Lesson Plans</h1>
                <p className="text-xs text-gray-400">CBC Format · HOD Review & Approval · Print-Ready</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {view === 'single' && selectedPlan && (
                <>
                  <button onClick={() => setView('list')} className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">← Back</button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiPrinter size={14} /> Print</button>
                </>
              )}
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiDownload size={14} /> CSV</button>
              <button onClick={() => { setEditPlan({ form_id: Number(selForm) || undefined, term_id: Number(selTerm) || undefined, year: selYear, duration_minutes: 40, hod_status: 'draft' } as Partial<LessonPlan>); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0D9488,#2563EB)' }}>
                <FiPlus size={14} /> New Lesson Plan
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
      </div>

      <div className="p-6 space-y-5">
        {view === 'single' && selectedPlan ? (
          <PrintPlan plan={selectedPlan} />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Plans', value: stats.total, color: '#0D9488' },
                { label: 'Approved', value: stats.approved, color: '#059669' },
                { label: 'Awaiting HOD', value: stats.pending, color: '#D97706' },
                { label: 'Drafts', value: stats.draft, color: '#6B7280' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-3xl font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4"><FiFileText size={28} className="text-teal-400" /></div>
                <h3 className="font-bold text-gray-700 mb-1">No Lesson Plans Found</h3>
                <p className="text-sm text-gray-400 mb-4">Create your first KICD lesson plan above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(plan => {
                  const form = forms.find(f => f.id === plan.form_id);
                  const la = learningAreas.find(l => l.id === plan.learning_area_id);
                  const sub = subjects.find(s => s.id === plan.subject_id);
                  const teacher = teachers.find(t => t.id === plan.teacher_id);
                  return (
                    <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg,${HOD_CFG[plan.hod_status].color}44,${HOD_CFG[plan.hod_status].color})` }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs px-2 py-1 rounded-lg font-bold border"
                            style={{ background: HOD_CFG[plan.hod_status].bg, color: HOD_CFG[plan.hod_status].color, borderColor: HOD_CFG[plan.hod_status].border }}>
                            {HOD_CFG[plan.hod_status].label}
                          </span>
                          <div className="flex gap-1">
                            <button onClick={() => { setSelectedPlan(plan); setView('single'); }} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500"><FiEye size={12} /></button>
                            <button onClick={() => { setEditPlan(plan); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><FiEdit2 size={12} /></button>
                            <button onClick={() => plan.id && deletePlan(plan.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><FiTrash2 size={12} /></button>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1">{la ? `${la.icon} ${la.name}` : sub?.subject_name || 'Untitled'}</h3>
                        {plan.strand && <p className="text-xs text-teal-700 font-semibold mb-0.5">📌 {plan.strand}</p>}
                        {plan.specific_learning_outcomes && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{plan.specific_learning_outcomes}</p>}
                        <div className="flex gap-3 text-[10px] text-gray-400 flex-wrap">
                          <span>📅 {plan.lesson_date ? new Date(plan.lesson_date).toLocaleDateString() : '—'}</span>
                          <span>📚 {form?.form_name}</span>
                          <span>⏱️ {plan.duration_minutes || 40}min</span>
                          {plan.week_number && <span>Week {plan.week_number}</span>}
                        </div>
                        {teacher && <p className="text-[10px] text-gray-400 mt-1">👤 {teacher.first_name} {teacher.last_name}</p>}
                      </div>
                      <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50 flex gap-2">
                        {plan.hod_status === 'draft' && <button onClick={() => hodAction(plan.id!, 'submitted')} className="text-xs font-bold text-blue-600 hover:underline">Submit for Review</button>}
                        {plan.hod_status === 'submitted' && <button onClick={() => hodAction(plan.id!, 'approved')} className="text-xs font-bold text-green-600 hover:underline">Approve ✓</button>}
                        {plan.hod_status === 'submitted' && <button onClick={() => hodAction(plan.id!, 'rejected')} className="text-xs font-bold text-red-600 hover:underline">Reject</button>}
                        <button onClick={() => { setSelectedPlan(plan); setView('single'); }} className="text-xs font-bold text-teal-600 hover:underline ml-auto">View Full Plan →</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <style jsx global>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
    </div>
  );
}

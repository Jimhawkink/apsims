'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiRefreshCw, FiSearch,
  FiUsers, FiBook, FiGrid, FiCheck, FiX, FiDownload, FiFilter,
  FiCheckCircle, FiAlertCircle, FiSettings, FiLayers, FiUser,
  FiCalendar, FiAward, FiFileText,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Teacher { id: number; first_name: string; last_name: string; staff_no?: string; tsc_number?: string; subjects?: string[]; }
interface Subject { id: number; subject_name: string; subject_code?: string; category?: string; }
interface LearningArea { id: number; name: string; code: string; icon: string; color: string; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface Assignment {
  id?: number;
  teacher_id: number;
  subject_id?: number;
  learning_area_id?: number;
  form_id: number;
  stream_id?: number;
  term_id?: number;
  year: number;
  is_class_teacher: boolean;
  is_active: boolean;
  assigned_by?: string;
}
interface AssignmentRow extends Assignment {
  teacher?: Teacher;
  subject?: Subject;
  learning_area?: LearningArea;
  form?: Form;
  stream?: Stream;
}

// Hardcoded KICD Learning Areas — fallback when DB table not yet created
const KICD_LAS_FALLBACK: LearningArea[] = [
  { id: 1,  code: 'ENG', name: 'English',                icon: '📖', color: '#2563EB' },
  { id: 2,  code: 'KSW', name: 'Kiswahili',              icon: '🗣️', color: '#059669' },
  { id: 3,  code: 'MAT', name: 'Mathematics',            icon: '🔢', color: '#DC2626' },
  { id: 4,  code: 'ISC', name: 'Integrated Science',     icon: '⚗️', color: '#7C3AED' },
  { id: 5,  code: 'SST', name: 'Social Studies',         icon: '🌍', color: '#D97706' },
  { id: 6,  code: 'AGR', name: 'Agriculture',            icon: '🌱', color: '#16A34A' },
  { id: 7,  code: 'PTS', name: 'Pre-Technical Studies',  icon: '🔧', color: '#0891B2' },
  { id: 8,  code: 'BUS', name: 'Business Studies',       icon: '💼', color: '#9333EA' },
  { id: 9,  code: 'CAS', name: 'Creative Arts & Sports', icon: '🎨', color: '#EC4899' },
  { id: 10, code: 'LSE', name: 'Life Skills Education',  icon: '💡', color: '#06B6D4' },
  { id: 11, code: 'CRE', name: 'Religious Education',    icon: '✝️', color: '#6366F1' },
];



type Tab = 'grid' | 'list' | 'teacher-view';

export default function TeacherSubjectsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selTeacher, setSelTeacher] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('grid');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editAssign, setEditAssign] = useState<Partial<Assignment>>({});
  const [isJSS, setIsJSS] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tR, sR, laR, fR, stR, trR] = await Promise.all([
        sb.from('school_teachers').select('id,first_name,last_name,staff_no,tsc_number,subjects').eq('status', 'Active').order('last_name'),
        sb.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        sb.from('jss_learning_areas').select('*').eq('is_active', true).order('sort_order'),
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_streams').select('*').order('stream_name'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
      ]);
      setTeachers(tR.data || []);
      setSubjects(sR.data || []);
      // Use DB data if available, otherwise fall back to hardcoded KICD list
      setLearningAreas((laR.data && laR.data.length > 0) ? laR.data : KICD_LAS_FALLBACK);
      setForms(fR.data || []);
      setStreams(stR.data || []);
      setTerms(trR.data || []);
      const cur = (trR.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  const fetchAssignments = useCallback(async () => {
    let q = sb.from('school_teacher_subjects').select('*').eq('year', selYear);
    if (selForm) q = q.eq('form_id', selForm);
    if (selStream) q = q.eq('stream_id', selStream);
    if (selTerm) q = q.eq('term_id', selTerm);
    if (selTeacher) q = q.eq('teacher_id', selTeacher);
    const { data } = await q.order('form_id');
    const enriched = (data || []).map((a: Assignment) => ({
      ...a,
      teacher: teachers.find(t => t.id === a.teacher_id),
      subject: subjects.find(s => s.id === a.subject_id),
      learning_area: learningAreas.find(la => la.id === a.learning_area_id),
      form: forms.find(f => f.id === a.form_id),
      stream: streams.find(s => s.id === a.stream_id),
    }));
    setAssignments(enriched);
  }, [selForm, selStream, selTerm, selYear, selTeacher, teachers, subjects, learningAreas, forms, streams]);

  useEffect(() => { if (teachers.length > 0) fetchAssignments(); }, [fetchAssignments, teachers.length]);

  // Detect JSS form
  useEffect(() => {
    const f = forms.find(f => String(f.id) === selForm);
    setIsJSS(!!(f && (f.form_level >= 7 && f.form_level <= 9 || (f.form_name || '').toLowerCase().includes('grade'))));
  }, [selForm, forms]);

  const saveAssignment = async () => {
    if (!editAssign.teacher_id || !editAssign.form_id) { toast.error('Select teacher and class'); return; }
    if (!editAssign.subject_id && !editAssign.learning_area_id) { toast.error('Select subject or learning area'); return; }
    setSaving(true);
    try {
      const payload = {
        ...editAssign,
        year: selYear,
        term_id: selTerm ? Number(selTerm) : null,
        is_active: true,
        assigned_by: 'admin',
      };
      if (editAssign.id) {
        const { error } = await sb.from('school_teacher_subjects').update(payload).eq('id', editAssign.id);
        if (error) throw error;
        toast.success('Assignment updated');
      } else {
        const { error } = await sb.from('school_teacher_subjects').insert(payload);
        if (error) throw error;
        toast.success('Assignment saved');
      }
      setShowModal(false);
      setEditAssign({});
      fetchAssignments();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteAssignment = async (id: number) => {
    if (!confirm('Delete this assignment?')) return;
    await sb.from('school_teacher_subjects').delete().eq('id', id);
    fetchAssignments();
    toast.success('Assignment removed');
  };

  const exportCSV = () => {
    const headers = ['Teacher', 'Staff No', 'Subject / Learning Area', 'Class', 'Stream', 'Term', 'Class Teacher'];
    const rows = assignments.map(a => [
      `${a.teacher?.first_name} ${a.teacher?.last_name}`,
      a.teacher?.staff_no || '',
      a.subject?.subject_name || a.learning_area?.name || '',
      a.form?.form_name || '',
      a.stream?.stream_name || '',
      terms.find(t => t.id === a.term_id)?.term_name || '',
      a.is_class_teacher ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Teacher_Assignments_${selYear}.csv`; a.click();
    toast.success('Exported!');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const s = search.toLowerCase();
    return assignments.filter(a =>
      `${a.teacher?.first_name} ${a.teacher?.last_name}`.toLowerCase().includes(s) ||
      (a.subject?.subject_name || a.learning_area?.name || '').toLowerCase().includes(s)
    );
  }, [assignments, search]);

  // Grid: forms × subjects matrix
  const gridForms = useMemo(() => selForm ? forms.filter(f => String(f.id) === selForm) : forms, [forms, selForm]);
  const gridItems = isJSS ? learningAreas : subjects;

  const getAssigned = (formId: number, itemId: number): Teacher | undefined => {
    const a = assignments.find(a =>
      a.form_id === formId &&
      (isJSS ? a.learning_area_id === itemId : a.subject_id === itemId)
    );
    return a?.teacher;
  };

  const stats = useMemo(() => ({
    total: assignments.length,
    teachers: new Set(assignments.map(a => a.teacher_id)).size,
    classTeachers: assignments.filter(a => a.is_class_teacher).length,
    unassigned: (gridForms.length * gridItems.length) - assignments.length,
  }), [assignments, gridForms, gridItems]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ASSIGNMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-black text-gray-800 text-lg">{editAssign.id ? 'Edit Assignment' : 'New Assignment'}</h3>
              <button onClick={() => { setShowModal(false); setEditAssign({}); }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Teacher *</label>
                <select value={editAssign.teacher_id || ''} onChange={e => setEditAssign(p => ({ ...p, teacher_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.staff_no ? `(${t.staff_no})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Class / Form *</label>
                  <select value={editAssign.form_id || ''} onChange={e => setEditAssign(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">Select</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Stream</label>
                  <select value={editAssign.stream_id || ''} onChange={e => setEditAssign(p => ({ ...p, stream_id: Number(e.target.value) || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">All Streams</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Subject (8-4-4 / Senior)</label>
                <select value={editAssign.subject_id || ''} onChange={e => setEditAssign(p => ({ ...p, subject_id: Number(e.target.value) || undefined, learning_area_id: undefined }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
              </div>
              <div className="text-center text-xs text-gray-400 font-medium">— OR JSS Learning Area —</div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">JSS Learning Area</label>
                <select value={editAssign.learning_area_id || ''} onChange={e => setEditAssign(p => ({ ...p, learning_area_id: Number(e.target.value) || undefined, subject_id: undefined }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  <option value="">Select Learning Area</option>
                  {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Term</label>
                  <select value={editAssign.term_id || ''} onChange={e => setEditAssign(p => ({ ...p, term_id: Number(e.target.value) || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">All Terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editAssign.is_class_teacher || false}
                      onChange={e => setEditAssign(p => ({ ...p, is_class_teacher: e.target.checked }))} className="rounded w-4 h-4" />
                    <span className="font-semibold text-gray-700">Class Teacher</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0 justify-end">
              <button onClick={() => { setShowModal(false); setEditAssign({}); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={saveAssignment} disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70">
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : 'Save Assignment'}
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
                style={{ background: 'linear-gradient(135deg,#4F46E5,#0891B2)' }}>
                <FiUser size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Teacher Subject Assignment</h1>
                <p className="text-xs text-gray-400">Assign teachers to subjects / learning areas per class & stream</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> Export
              </button>
              <button onClick={() => { setEditAssign({ form_id: Number(selForm) || undefined, term_id: Number(selTerm) || undefined, year: selYear, is_class_teacher: false, is_active: true }); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#0891B2)' }}>
                <FiPlus size={14} /> New Assignment
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Classes</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selStream} onChange={e => setSelStream(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[130px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => { setSelTerm(e.target.value); const t = terms.find(t => String(t.id) === e.target.value); if (t) setSelYear(t.year); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' ✓' : ''}</option>)}
            </select>
            <select value={selTeacher} onChange={e => setSelTeacher(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[180px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher or subject..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {([['grid','🗓️ Assignment Grid'],['list','📋 Full List'],['teacher-view','👩‍🏫 By Teacher']] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab===t?'border-indigo-500 text-indigo-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Assignments', value: stats.total, color: '#4F46E5', icon: FiGrid },
            { label: 'Teachers Assigned', value: stats.teachers, color: '#059669', icon: FiUsers },
            { label: 'Class Teachers', value: stats.classTeachers, color: '#D97706', icon: FiAward },
            { label: 'Gaps (Unassigned)', value: Math.max(0, stats.unassigned), color: '#DC2626', icon: FiAlertCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* GRID TAB — matrix view */}
        {tab === 'grid' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">
                Assignment Matrix — {isJSS ? 'JSS Learning Areas' : 'Subjects'}
              </h3>
              <span className="text-xs text-gray-400">
                {isJSS ? 'JSS mode (Grade 7-9)' : 'Standard mode (Form 1-4)'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-10 min-w-[160px] font-bold text-gray-600 uppercase">
                      {isJSS ? 'Learning Area' : 'Subject'}
                    </th>
                    {gridForms.map(f => (
                      <th key={f.id} className="text-center py-3 px-3 min-w-[120px] font-bold text-gray-600 uppercase">{f.form_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(isJSS ? learningAreas : subjects).map((item, idx) => (
                    <tr key={item.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          {isJSS && <span className="text-base">{(item as LearningArea).icon}</span>}
                          <div>
                            <p className="font-semibold text-gray-700">{isJSS ? (item as LearningArea).name : (item as Subject).subject_name}</p>
                            <p className="text-[10px] text-gray-400">{isJSS ? (item as LearningArea).code : (item as Subject).subject_code}</p>
                          </div>
                        </div>
                      </td>
                      {gridForms.map(f => {
                        const teacher = getAssigned(f.id, item.id);
                        return (
                          <td key={f.id} className="text-center px-2 py-2">
                            {teacher ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{ background: `hsl(${(teacher.id * 47) % 360},60%,50%)` }}>
                                  {teacher.first_name[0]}{teacher.last_name[0]}
                                </div>
                                <span className="text-[9px] text-gray-600 leading-tight">{teacher.first_name}<br/>{teacher.last_name}</span>
                              </div>
                            ) : (
                              <button onClick={() => {
                                setEditAssign({ form_id: f.id, [isJSS ? 'learning_area_id' : 'subject_id']: item.id, term_id: Number(selTerm) || undefined, year: selYear, is_class_teacher: false, is_active: true });
                                setShowModal(true);
                              }} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition mx-auto text-gray-300 hover:text-indigo-500">
                                <FiPlus size={12} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {tab === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Teacher','Staff No','Subject / Learning Area','Class','Stream','Term','Class Teacher','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No assignments found. Add one using the + button.</td></tr>
                  ) : filtered.map((a, idx) => (
                    <tr key={a.id || idx} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ background: `hsl(${((a.teacher?.id || 0) * 47) % 360},60%,50%)` }}>
                            {a.teacher?.first_name?.[0]}{a.teacher?.last_name?.[0]}
                          </div>
                          <span className="text-xs font-semibold text-gray-800">{a.teacher?.first_name} {a.teacher?.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{a.teacher?.staff_no || '—'}</td>
                      <td className="px-4 py-2.5">
                        {a.learning_area ? (
                          <span className="flex items-center gap-1 text-xs font-medium">
                            <span>{a.learning_area.icon}</span>{a.learning_area.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-700">{a.subject?.subject_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{a.form?.form_name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{a.stream?.stream_name || 'All'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{terms.find(t => t.id === a.term_id)?.term_name || 'All'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {a.is_class_teacher ? (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-lg font-bold">✓ Yes</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditAssign(a); setShowModal(true); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500"><FiEdit2 size={12} /></button>
                          <button onClick={() => a.id && deleteAssignment(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEACHER VIEW TAB */}
        {tab === 'teacher-view' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teachers.filter(t => assignments.some(a => a.teacher_id === t.id)).map(teacher => {
              const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
              const isClassTeacher = teacherAssignments.some(a => a.is_class_teacher);
              return (
                <div key={teacher.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: `hsl(${(teacher.id * 47) % 360},60%,50%)` }}>
                      {teacher.first_name[0]}{teacher.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{teacher.first_name} {teacher.last_name}</p>
                      <p className="text-[10px] text-gray-400">{teacher.staff_no || teacher.tsc_number || 'No staff no'}</p>
                    </div>
                    {isClassTeacher && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">Class Teacher</span>}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{teacherAssignments.length} Assignment(s)</p>
                    <div className="space-y-1.5">
                      {teacherAssignments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-gray-500 w-16 flex-shrink-0">{a.form?.form_name}</span>
                          <span className="w-px h-3 bg-gray-300 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-700 flex-1">
                            {a.learning_area ? `${a.learning_area.icon} ${a.learning_area.name}` : a.subject?.subject_name}
                          </span>
                          {a.stream && <span className="text-[9px] text-gray-400">{a.stream.stream_name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {teachers.filter(t => assignments.some(a => a.teacher_id === t.id)).length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center h-48 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3"><FiUsers size={28} className="text-indigo-400" /></div>
                <h3 className="font-bold text-gray-700">No assignments yet</h3>
                <p className="text-sm text-gray-400">Create assignments using the + button</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiDownload, FiPrinter,
  FiRefreshCw, FiSearch, FiFilter, FiUsers, FiAward, FiFileText,
  FiClock, FiCheckCircle, FiAlertCircle, FiSend, FiSave, FiLayers,
  FiCalendar, FiShield, FiSettings, FiChevronDown, FiBarChart2, FiZap,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type TaskStatus = 'draft' | 'active' | 'closed' | 'submitted_knec';
type HODStatus = 'pending' | 'approved' | 'rejected';

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string }> = {
  EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

const STATUS_STYLES: Record<TaskStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft:          { label: 'Draft',          color: '#6B7280', bg: '#F9FAFB', icon: FiEdit2 },
  active:         { label: 'Active',         color: '#2563EB', bg: '#DBEAFE', icon: FiZap },
  closed:         { label: 'Closed',         color: '#059669', bg: '#D1FAE5', icon: FiCheckCircle },
  submitted_knec: { label: 'Submitted KNEC', color: '#7C3AED', bg: '#EDE9FE', icon: FiShield },
};

const HOD_STYLES: Record<HODStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Approved', color: '#059669', bg: '#D1FAE5' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
};

const TASK_TYPES = ['Project Work', 'Portfolio', 'Oral Presentation', 'Practical', 'Written Test', 'Field Work', 'Group Work', 'Research Paper'];

interface Form { id: number; form_name: string; form_level: number; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface LearningArea { id: number; name: string; code: string; icon: string; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; }
interface SATTask {
  id?: number; title: string; description?: string; form_id: number; learning_area_id: number;
  term_id: number; year: number; task_type: string; due_date?: string;
  status: TaskStatus; hod_approval: HODStatus; evidence_required: boolean; created_by?: string;
}
interface SATScore { id?: number; task_id: number; student_id: number; competency_level?: CompLevel; teacher_notes?: string; status: string; }

type ViewMode = 'tasks' | 'scoring' | 'analytics';

export default function JSSatManagerPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [tasks, setTasks] = useState<SATTask[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, CompLevel>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selTask, setSelTask] = useState<SATTask | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState<Partial<SATTask>>({});
  const [dirty, setDirty] = useState(false);

  // Load master data
  useEffect(() => {
    const load = async () => {
      const [fR, tR, laR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('jss_learning_areas').select('id,name,code,icon').eq('is_active', true).order('sort_order'),
      ]);
      const allForms = fR.data || [];
      const jssForms = allForms.filter((f: Form) =>
        (f.form_level >= 7 && f.form_level <= 9) ||
        ['grade 7','grade 8','grade 9','jss'].some(k => (f.form_name || '').toLowerCase().includes(k))
      );
      setForms(jssForms.length > 0 ? jssForms : allForms);
      setTerms(tR.data || []);
      setLearningAreas(laR.data || []);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  // Load tasks when form/term change
  const fetchTasks = useCallback(async () => {
    if (!selForm || !selTerm) return;
    const { data } = await sb.from('jss_sat_tasks')
      .select('*').eq('form_id', selForm).eq('term_id', selTerm).eq('year', selYear)
      .order('created_at', { ascending: false });
    setTasks(data || []);
  }, [selForm, selTerm, selYear]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Load students + scores for a task
  const loadScoring = useCallback(async (task: SATTask) => {
    if (!task.id) return;
    const { data: studs } = await sb.from('school_students')
      .select('id,first_name,last_name,admission_number')
      .eq('form_id', task.form_id).eq('status', 'Active').order('last_name');
    setStudents(studs || []);
    const { data: dbScores } = await sb.from('jss_sat_scores')
      .select('*').eq('task_id', task.id);
    const sc: Record<string, CompLevel> = {};
    const nt: Record<string, string> = {};
    (dbScores || []).forEach((s: SATScore) => {
      if (s.competency_level) sc[String(s.student_id)] = s.competency_level;
      if (s.teacher_notes) nt[String(s.student_id)] = s.teacher_notes;
    });
    setScores(sc); setNotes(nt); setDirty(false);
  }, []);

  const openScoring = (task: SATTask) => {
    setSelTask(task); setViewMode('scoring'); loadScoring(task);
  };

  // Save task
  const saveTask = async () => {
    if (!editTask.title || !editTask.form_id || !editTask.learning_area_id || !editTask.term_id) {
      toast.error('Fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const payload = { ...editTask, year: selYear, status: editTask.status || 'draft', hod_approval: editTask.hod_approval || 'pending', evidence_required: editTask.evidence_required ?? true, created_by: 'teacher' };
      if (editTask.id) {
        const { error } = await sb.from('jss_sat_tasks').update(payload).eq('id', editTask.id);
        if (error) throw error;
        toast.success('Task updated');
      } else {
        const { error } = await sb.from('jss_sat_tasks').insert(payload);
        if (error) throw error;
        toast.success('SAT Task created');
      }
      setShowTaskForm(false); setEditTask({});
      fetchTasks();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Save scores
  const saveScores = async () => {
    if (!selTask?.id) return;
    setSaving(true);
    try {
      const upserts = students.map(s => ({
        task_id: selTask.id, student_id: s.id,
        competency_level: scores[String(s.id)] || null,
        teacher_notes: notes[String(s.id)] || null,
        status: scores[String(s.id)] ? 'scored' : 'pending',
        submitted_at: scores[String(s.id)] ? new Date().toISOString() : null,
      }));
      const { error } = await sb.from('jss_sat_scores').upsert(upserts as any, { onConflict: 'task_id,student_id', ignoreDuplicates: false });
      if (error) throw error;
      setDirty(false);
      toast.success(`âœ… Saved scores for ${upserts.filter(u => u.competency_level).length} students`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // Change task status
  const changeStatus = async (task: SATTask, status: TaskStatus) => {
    if (!task.id) return;
    await sb.from('jss_sat_tasks').update({ status }).eq('id', task.id);
    fetchTasks(); toast.success(`Task marked as ${STATUS_STYLES[status].label}`);
  };

  // HOD Approve
  const hodApprove = async (task: SATTask, approval: HODStatus) => {
    if (!task.id) return;
    await sb.from('jss_sat_tasks').update({ hod_approval: approval }).eq('id', task.id);
    fetchTasks(); toast.success(`HOD: ${HOD_STYLES[approval].label}`);
  };

  // Export CSV
  const exportCSV = () => {
    if (!selTask || students.length === 0) { toast.error('Open scoring first'); return; }
    const headers = ['Adm No', 'Student Name', 'Competency', 'Notes'];
    const rows = students.map(s => [s.admission_number, `${s.first_name} ${s.last_name}`, scores[String(s.id)] || 'â€”', notes[String(s.id)] || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `SAT_${selTask.title.replace(/\s+/g,'_')}_Scores.csv`; a.click();
    toast.success('Exported!');
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const s = search.toLowerCase();
    return students.filter(st => `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) || st.admission_number.toLowerCase().includes(s));
  }, [students, search]);

  const scoredCount = useMemo(() => Object.values(scores).filter(Boolean).length, [scores]);
  const analytics = useMemo(() => {
    const vals = Object.values(scores) as CompLevel[];
    return { EE: vals.filter(l=>l==='EE').length, ME: vals.filter(l=>l==='ME').length, AE: vals.filter(l=>l==='AE').length, BE: vals.filter(l=>l==='BE').length, total: vals.length };
  }, [scores]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* TASK FORM MODAL */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-black text-gray-800 text-lg">{editTask.id ? 'Edit SAT Task' : 'New SAT Task'}</h3>
              <button onClick={() => { setShowTaskForm(false); setEditTask({}); }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Task Title *</label>
                <input value={editTask.title || ''} onChange={e => setEditTask(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Term 1 Mathematics Project Work"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Grade *</label>
                  <select value={editTask.form_id || selForm} onChange={e => setEditTask(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">Select</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Term *</label>
                  <select value={editTask.term_id || selTerm} onChange={e => setEditTask(p => ({ ...p, term_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">Select</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Learning Area *</label>
                  <select value={editTask.learning_area_id || ''} onChange={e => setEditTask(p => ({ ...p, learning_area_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    <option value="">Select</option>
                    {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Task Type</label>
                  <select value={editTask.task_type || 'Project Work'} onChange={e => setEditTask(p => ({ ...p, task_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Due Date</label>
                <input type="date" value={editTask.due_date || ''} onChange={e => setEditTask(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Description</label>
                <textarea value={editTask.description || ''} onChange={e => setEditTask(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Task instructions, rubric details, resources needed..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="evidence" checked={editTask.evidence_required ?? true}
                  onChange={e => setEditTask(p => ({ ...p, evidence_required: e.target.checked }))} className="rounded" />
                <label htmlFor="evidence" className="text-sm text-gray-600">Evidence required from students</label>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0 justify-end">
              <button onClick={() => { setShowTaskForm(false); setEditTask({}); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={saveTask} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70">
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : editTask.id ? 'Update Task' : 'Create Task'}
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
                style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                <FiAward size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS SAT Manager</h1>
                <p className="text-xs text-gray-400">Summative Assessment Tool â€” Grade 7 Â· 8 Â· 9 Â· KICD CBC</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'scoring' && selTask && (
                <>
                  {dirty && <button onClick={saveScores} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl disabled:opacity-70">
                    {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}Save Scores
                  </button>}
                  <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiDownload size={14} /> CSV</button>
                  <button onClick={() => setViewMode('tasks')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">â† Tasks</button>
                </>
              )}
              {viewMode === 'tasks' && (
                <button onClick={() => { setEditTask({ form_id: Number(selForm), term_id: Number(selTerm), year: selYear }); setShowTaskForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                  <FiPlus size={14} /> New SAT Task
                </button>
              )}
            </div>
          </div>
          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Grade</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => { setSelTerm(e.target.value); const t = terms.find(t => String(t.id) === e.target.value); if (t) setSelYear(t.year); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' âœ“' : ''}</option>)}
            </select>
            {viewMode === 'scoring' && (
              <div className="relative flex-1 min-w-[180px]">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
            )}
          </div>
        </div>
        {/* View tabs */}
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {[['tasks','ðŸ“‹ Tasks'],['analytics','ðŸ“Š Analytics']] .map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v as ViewMode)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${viewMode===v?'border-purple-500 text-purple-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* TASKS VIEW */}
        {viewMode === 'tasks' && (
          <>
            {!selForm || !selTerm ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4"><FiFilter size={28} className="text-purple-400" /></div>
                <h3 className="font-bold text-gray-700 mb-1">Select Grade & Term</h3>
                <p className="text-sm text-gray-400">Choose a grade and term to manage SAT tasks</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4"><FiAward size={28} className="text-purple-400" /></div>
                <h3 className="font-bold text-gray-700 mb-1">No SAT Tasks Yet</h3>
                <p className="text-sm text-gray-400 mb-4">Create your first summative assessment task</p>
                <button onClick={() => { setEditTask({ form_id: Number(selForm), term_id: Number(selTerm), year: selYear }); setShowTaskForm(true); }}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                  <FiPlus size={14} /> Create First SAT Task
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map(task => {
                  const StatusIcon = STATUS_STYLES[task.status].icon;
                  const la = learningAreas.find(la => la.id === task.learning_area_id);
                  return (
                    <div key={task.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded-lg font-bold"
                              style={{ background: STATUS_STYLES[task.status].bg, color: STATUS_STYLES[task.status].color }}>
                              <StatusIcon size={10} className="inline mr-1" />{STATUS_STYLES[task.status].label}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-lg font-bold"
                              style={{ background: HOD_STYLES[task.hod_approval].bg, color: HOD_STYLES[task.hod_approval].color }}>
                              HOD: {HOD_STYLES[task.hod_approval].label}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditTask(task); setShowTaskForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><FiEdit2 size={12} /></button>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight">{task.title}</h3>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs text-gray-500">{la?.icon} {la?.name}</span>
                          <span className="text-xs text-gray-300">Â·</span>
                          <span className="text-xs text-gray-500">{task.task_type}</span>
                          {task.due_date && <span className="text-xs text-gray-400 flex items-center gap-1"><FiCalendar size={10} />{new Date(task.due_date).toLocaleDateString()}</span>}
                        </div>
                        {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                      </div>
                      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50">
                        <button onClick={() => openScoring(task)}
                          className="flex-1 py-2 text-xs font-bold text-white rounded-xl text-center transition hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                          ðŸ“ Score Students
                        </button>
                        {task.status === 'draft' && (
                          <button onClick={() => changeStatus(task, 'active')} className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100">Activate</button>
                        )}
                        {task.status === 'active' && (
                          <button onClick={() => changeStatus(task, 'closed')} className="px-3 py-2 text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100">Close</button>
                        )}
                        {task.hod_approval === 'pending' && (
                          <button onClick={() => hodApprove(task, 'approved')} className="px-2 py-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100">Approve</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SCORING VIEW */}
        {viewMode === 'scoring' && selTask && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-gray-800 text-base">{selTask.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selTask.task_type} Â· {learningAreas.find(la=>la.id===selTask.learning_area_id)?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-indigo-600">{scoredCount}</p>
                    <p className="text-xs text-gray-400">Scored</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-gray-400">{students.length - scoredCount}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200"/>
                  <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-sm"
                    style={{ borderColor: scoredCount/Math.max(students.length,1)>=0.8?'#059669':'#D97706', color: scoredCount/Math.max(students.length,1)>=0.8?'#059669':'#D97706' }}>
                    {students.length>0?Math.round((scoredCount/students.length)*100):0}%
                  </div>
                </div>
              </div>
            </div>
            {/* Scoring grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-10 min-w-[220px] text-xs font-bold text-gray-600 uppercase">Student</th>
                      <th className="text-center py-3 px-4 min-w-[200px] text-xs font-bold text-gray-600 uppercase">Competency Level</th>
                      <th className="text-left py-3 px-4 min-w-[250px] text-xs font-bold text-gray-600 uppercase">Teacher Notes / Observations</th>
                      <th className="text-center py-3 px-3 min-w-[80px] text-xs font-bold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => {
                      const lvl = scores[String(s.id)];
                      const note = notes[String(s.id)] || '';
                      return (
                        <tr key={s.id} className={`border-b border-gray-100 transition hover:bg-purple-50/30 ${idx%2===0?'bg-white':'bg-gray-50/20'}`}>
                          <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background:`hsl(${(s.id*47)%360},60%,50%)` }}>
                                {s.first_name[0]}{s.last_name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                <p className="text-[10px] text-gray-400">{s.admission_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex gap-1.5 justify-center">
                              {(['EE','ME','AE','BE'] as CompLevel[]).map(l => (
                                <button key={l} onClick={() => { setScores(p => ({ ...p, [String(s.id)]: l })); setDirty(true); }}
                                  className={`px-2.5 py-1.5 text-[11px] font-black rounded-lg border-2 transition ${lvl===l?'scale-110 shadow-md':''}`}
                                  style={lvl===l?{background:COMP[l].bg,color:COMP[l].color,borderColor:COMP[l].border}:{borderColor:'#E5E7EB',color:'#9CA3AF'}}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <input value={note} onChange={e => { setNotes(p => ({ ...p, [String(s.id)]: e.target.value })); setDirty(true); }}
                              placeholder="Observation notes..."
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-300 outline-none" />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {lvl ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background:COMP[lvl].bg,color:COMP[lvl].color }}>âœ“ Scored</span>
                            ) : (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Floating save */}
            {dirty && (
              <div className="fixed bottom-6 right-6 z-40">
                <button onClick={saveScores} disabled={saving} className="flex items-center gap-2 px-6 py-3 font-bold text-white rounded-2xl shadow-2xl" style={{ background:'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                  {saving?<FiRefreshCw size={16} className="animate-spin"/>:<FiSave size={16}/>}
                  {saving?'Saving...':(`Save ${scoredCount} Scores`)}
                </button>
              </div>
            )}
          </>
        )}

        {/* ANALYTICS VIEW */}
        {viewMode === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
                <p className="text-4xl font-black text-gray-800">{tasks.length}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-blue-600">{tasks.filter(t=>t.status==='active').length} active</span>
                  <span className="text-green-600">{tasks.filter(t=>t.status==='closed').length} closed</span>
                  <span className="text-gray-400">{tasks.filter(t=>t.status==='draft').length} draft</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">HOD Approval Rate</p>
                <p className="text-4xl font-black text-green-600">
                  {tasks.length>0?Math.round((tasks.filter(t=>t.hod_approval==='approved').length/tasks.length)*100):0}%
                </p>
                <p className="text-xs text-gray-400 mt-1">{tasks.filter(t=>t.hod_approval==='approved').length} approved Â· {tasks.filter(t=>t.hod_approval==='pending').length} pending</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">KNEC Submitted</p>
                <p className="text-4xl font-black text-purple-600">{tasks.filter(t=>t.status==='submitted_knec').length}</p>
                <p className="text-xs text-gray-400 mt-1">of {tasks.length} tasks</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">Tasks by Learning Area</h3>
              {learningAreas.map(la => {
                const cnt = tasks.filter(t => t.learning_area_id === la.id).length;
                return cnt > 0 ? (
                  <div key={la.id} className="flex items-center gap-3 mb-3">
                    <span className="text-lg w-6">{la.icon}</span>
                    <span className="text-sm text-gray-600 w-44">{la.name}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width:`${(cnt/Math.max(tasks.length,1))*100}%` }}/>
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-6">{cnt}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


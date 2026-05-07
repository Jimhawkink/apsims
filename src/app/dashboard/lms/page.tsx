'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiBook, FiClipboard, FiUsers,
  FiDownload, FiTrash2, FiEdit2, FiAlertTriangle, FiCheckCircle,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: number; subject_name: string; }
interface Form { id: number; form_name: string; }
interface Stream { id: number; stream_name: string; }

interface LmsResource {
  id: number;
  subject_id?: number;
  form_id?: number;
  topic_name: string;
  resource_title: string;
  resource_type: 'PDF' | 'Word' | 'Video Link' | 'Other';
  file_url?: string;
  video_url?: string;
  upload_date: string;
  uploaded_by?: number;
  school_subjects?: { id: number; subject_name: string };
  school_forms?: { id: number; form_name: string };
}

interface LmsAssignment {
  id: number;
  subject_id?: number;
  form_id?: number;
  stream_id?: number;
  title: string;
  description?: string;
  due_date: string;
  max_marks: number;
  attachment_url?: string;
  submission_count: number;
  school_subjects?: { id: number; subject_name: string };
  school_forms?: { id: number; form_name: string };
  school_streams?: { id: number; stream_name: string };
}

interface LmsSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_text?: string;
  file_url?: string;
  submitted_at: string;
  is_late: boolean;
  school_students?: { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string };
  school_lms_grades?: { id: number; marks_awarded: number; teacher_comments?: string; graded_at: string } | null;
}

type Tab = 'resources' | 'assignments' | 'submissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function admNo(s: any) { return s?.admission_number || s?.admission_no || '-'; }
function sName(s: any) { return s ? `${s.first_name} ${s.last_name}` : 'Unknown'; }

const TYPE_BADGE: Record<string, string> = {
  'PDF': 'bg-red-100 text-red-700',
  'Word': 'bg-blue-100 text-blue-700',
  'Video Link': 'bg-purple-100 text-purple-700',
  'Other': 'bg-gray-100 text-gray-600',
};

// ─── Upload Resource Modal ────────────────────────────────────────────────────

function UploadResourceModal({ subjects, forms, onClose, onSaved }: {
  subjects: Subject[]; forms: Form[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    subject_id: '', form_id: '', topic_name: '', resource_title: '',
    resource_type: 'PDF', file_url: '', video_url: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.topic_name.trim()) return toast.error('Topic name is required');
    if (!form.resource_title.trim()) return toast.error('Resource title is required');
    setSaving(true);
    try {
      const res = await fetch('/api/lms/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          form_id: form.form_id ? Number(form.form_id) : null,
          file_url: form.resource_type !== 'Video Link' ? form.file_url : null,
          video_url: form.resource_type === 'Video Link' ? form.video_url : null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to upload resource');
      toast.success('Resource uploaded ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
          <h2 className="text-lg font-bold text-white">Upload Resource</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Subject</label>
              <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={inp}>
                <option value="">-- All Subjects --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Form</label>
              <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className={inp}>
                <option value="">-- All Forms --</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Topic Name *</label>
            <input type="text" value={form.topic_name} onChange={e => setForm({ ...form, topic_name: e.target.value })} placeholder="e.g. Photosynthesis" className={inp} />
          </div>
          <div><label className={lbl}>Resource Title *</label>
            <input type="text" value={form.resource_title} onChange={e => setForm({ ...form, resource_title: e.target.value })} placeholder="e.g. Form 2 Biology Notes - Chapter 3" className={inp} />
          </div>
          <div><label className={lbl}>Resource Type *</label>
            <select value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })} className={inp}>
              <option value="PDF">PDF</option>
              <option value="Word">Word</option>
              <option value="Video Link">Video Link</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {form.resource_type === 'Video Link' ? (
            <div><label className={lbl}>Video URL</label>
              <input type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/..." className={inp} />
            </div>
          ) : (
            <div><label className={lbl}>File URL</label>
              <input type="url" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://storage.supabase.co/..." className={inp} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Assignment Modal ──────────────────────────────────────────────────

function CreateAssignmentModal({ subjects, forms, streams, onClose, onSaved }: {
  subjects: Subject[]; forms: Form[]; streams: Stream[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    subject_id: '', form_id: '', stream_id: '', title: '', description: '',
    due_date: '', max_marks: 100, attachment_url: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.due_date) return toast.error('Due date is required');
    setSaving(true);
    try {
      const res = await fetch('/api/lms/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          form_id: form.form_id ? Number(form.form_id) : null,
          stream_id: form.stream_id ? Number(form.stream_id) : null,
          max_marks: Number(form.max_marks),
          attachment_url: form.attachment_url || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create assignment');
      toast.success('Assignment created ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
          <h2 className="text-lg font-bold text-white">Create Assignment</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Subject</label>
              <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={inp}>
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Form</label>
              <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className={inp}>
                <option value="">-- Select Form --</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Stream (optional)</label>
            <select value={form.stream_id} onChange={e => setForm({ ...form, stream_id: e.target.value })} className={inp}>
              <option value="">-- All Streams --</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 5 Homework" className={inp} />
          </div>
          <div><label className={lbl}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Assignment instructions..." className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Due Date *</label>
              <input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={inp} />
            </div>
            <div><label className={lbl}>Max Marks *</label>
              <input type="number" min={1} value={form.max_marks} onChange={e => setForm({ ...form, max_marks: Number(e.target.value) })} className={inp} />
            </div>
          </div>
          <div><label className={lbl}>Attachment URL (optional)</label>
            <input type="url" value={form.attachment_url} onChange={e => setForm({ ...form, attachment_url: e.target.value })} placeholder="https://..." className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Grade Submission Modal ───────────────────────────────────────────────────

function GradeSubmissionModal({ submission, maxMarks, onClose, onSaved }: {
  submission: LmsSubmission; maxMarks: number; onClose: () => void; onSaved: () => void;
}) {
  const existing = submission.school_lms_grades;
  const [marks, setMarks] = useState(existing?.marks_awarded ?? 0);
  const [comments, setComments] = useState(existing?.teacher_comments || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (marks < 0 || marks > maxMarks) return toast.error(`Marks must be between 0 and ${maxMarks}`);
    setSaving(true);
    try {
      const res = await fetch('/api/lms/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submission.id, marks_awarded: marks, teacher_comments: comments }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save grade');
      toast.success('Grade saved ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
          <h2 className="text-lg font-bold text-white">Grade Submission</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Student: <span className="font-semibold text-gray-800">{sName(submission.school_students)}</span>
          </p>
          <div><label className={lbl}>Marks Awarded (0 – {maxMarks}) *</label>
            <input type="number" min={0} max={maxMarks} value={marks} onChange={e => setMarks(Number(e.target.value))} className={inp} />
          </div>
          <div><label className={lbl}>Teacher Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Feedback for the student..." className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={14} />}
            Save Grade
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main LMS Page ────────────────────────────────────────────────────────────

export default function LmsPage() {
  const [tab, setTab] = useState<Tab>('resources');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);

  // Resources state
  const [resources, setResources] = useState<LmsResource[]>([]);
  const [resSubjectFilter, setResSubjectFilter] = useState('');
  const [resFormFilter, setResFormFilter] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [asgSubjectFilter, setAsgSubjectFilter] = useState('');
  const [asgFormFilter, setAsgFormFilter] = useState('');
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  // Submissions state
  const [selectedAssignment, setSelectedAssignment] = useState<LmsAssignment | null>(null);
  const [submissions, setSubmissions] = useState<LmsSubmission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<LmsSubmission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Fetch reference data ──
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    Promise.all([
      fetch('/api/lms/resources?_meta=subjects').then(() => null), // just trigger
    ]);

    // Fetch subjects, forms, streams via direct Supabase REST
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/school_subjects?select=id,subject_name&order=subject_name`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/school_forms?select=id,form_name&order=form_level`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/school_streams?select=id,stream_name&order=stream_name`, { headers }).then(r => r.json()),
    ]).then(([subs, fms, strs]) => {
      if (Array.isArray(subs)) setSubjects(subs);
      if (Array.isArray(fms)) setForms(fms);
      if (Array.isArray(strs)) setStreams(strs);
    }).catch(() => {});
  }, []);

  // ── Fetch resources ──
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resSubjectFilter) params.set('subject_id', resSubjectFilter);
      if (resFormFilter) params.set('form_id', resFormFilter);
      const res = await fetch(`/api/lms/resources?${params}`);
      const result = await res.json();
      if (res.ok) setResources(result.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [resSubjectFilter, resFormFilter]);

  // ── Fetch assignments ──
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asgSubjectFilter) params.set('subject_id', asgSubjectFilter);
      if (asgFormFilter) params.set('form_id', asgFormFilter);
      const res = await fetch(`/api/lms/assignments?${params}`);
      const result = await res.json();
      if (res.ok) setAssignments(result.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [asgSubjectFilter, asgFormFilter]);

  // ── Fetch submissions for selected assignment ──
  const fetchSubmissions = useCallback(async (assignmentId: number) => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/lms/assignments/${assignmentId}/submissions`);
      const result = await res.json();
      if (res.ok) setSubmissions(result.data || []);
    } catch { /* silent */ } finally { setLoadingSubmissions(false); }
  }, []);

  useEffect(() => { if (tab === 'resources') fetchResources(); }, [tab, fetchResources]);
  useEffect(() => { if (tab === 'assignments' || tab === 'submissions') fetchAssignments(); }, [tab, fetchAssignments]);
  useEffect(() => {
    if (selectedAssignment) fetchSubmissions(selectedAssignment.id);
  }, [selectedAssignment, fetchSubmissions]);

  const handleDeleteResource = async (id: number) => {
    if (!confirm('Delete this resource?')) return;
    try {
      const res = await fetch(`/api/lms/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Resource deleted');
      fetchResources();
    } catch (e: any) { toast.error(e.message); }
  };

  // Compute not-submitted students for selected assignment
  const submittedStudentIds = new Set(submissions.map(s => s.student_id));
  const isPastDue = selectedAssignment ? new Date() > new Date(selectedAssignment.due_date) : false;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'resources', label: 'Resources', icon: <FiBook size={16} /> },
    { key: 'assignments', label: 'Assignments', icon: <FiClipboard size={16} /> },
    { key: 'submissions', label: 'Submissions', icon: <FiUsers size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-8 text-white" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">LMS / E-Learning</h1>
          <p className="text-sky-100 text-sm mt-1">Manage resources, assignments, and student submissions</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-sky-600 text-sky-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Tab: Resources ── */}
        {tab === 'resources' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex gap-3 flex-wrap">
                <select value={resSubjectFilter} onChange={e => setResSubjectFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
                <select value={resFormFilter} onChange={e => setResFormFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                  <option value="">All Forms</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <button onClick={fetchResources} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Filter</button>
              </div>
              <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                <FiPlus size={14} /> Upload Resource
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
            ) : resources.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiBook size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No resources found</p>
                <p className="text-sm">Upload the first resource to get started</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Title', 'Type', 'Topic', 'Subject', 'Form', 'Upload Date', 'Link', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {resources.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.resource_title}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_BADGE[r.resource_type] || TYPE_BADGE['Other']}`}>
                              {r.resource_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{r.topic_name}</td>
                          <td className="px-4 py-3 text-gray-500">{r.school_subjects?.subject_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{r.school_forms?.form_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.upload_date)}</td>
                          <td className="px-4 py-3">
                            {(r.file_url || r.video_url) ? (
                              <a href={r.file_url || r.video_url || '#'} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-medium text-xs">
                                <FiDownload size={12} /> {r.resource_type === 'Video Link' ? 'Watch' : 'Download'}
                              </a>
                            ) : <span className="text-gray-300 text-xs">No link</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDeleteResource(r.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Assignments ── */}
        {tab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex gap-3 flex-wrap">
                <select value={asgSubjectFilter} onChange={e => setAsgSubjectFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
                <select value={asgFormFilter} onChange={e => setAsgFormFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400">
                  <option value="">All Forms</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <button onClick={fetchAssignments} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Filter</button>
              </div>
              <button onClick={() => setShowCreateAssignment(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
                <FiPlus size={14} /> Create Assignment
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiClipboard size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No assignments found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Title', 'Subject', 'Form', 'Due Date', 'Max Marks', 'Submissions', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {assignments.map(a => {
                        const pastDue = new Date() > new Date(a.due_date);
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">{a.title}</td>
                            <td className="px-4 py-3 text-gray-500">{a.school_subjects?.subject_name || '-'}</td>
                            <td className="px-4 py-3 text-gray-500">{a.school_forms?.form_name || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={pastDue ? 'text-red-600 font-medium' : 'text-gray-600'}>{fmtDT(a.due_date)}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{a.max_marks}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">{a.submission_count}</span>
                            </td>
                            <td className="px-4 py-3">
                              {pastDue ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Past Due</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Submissions ── */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-sm">
                <label className={lbl}>Select Assignment</label>
                <select
                  value={selectedAssignment?.id || ''}
                  onChange={e => {
                    const a = assignments.find(x => x.id === Number(e.target.value));
                    setSelectedAssignment(a || null);
                    setSubmissions([]);
                  }}
                  className={inp}
                >
                  <option value="">-- Choose an assignment --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} {a.school_forms ? `(${a.school_forms.form_name})` : ''} — Due: {fmtDate(a.due_date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedAssignment ? (
              <div className="text-center py-16 text-gray-400">
                <FiUsers size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select an assignment to view submissions</p>
              </div>
            ) : loadingSubmissions ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Not-submitted alert */}
                {isPastDue && submissions.length === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700">
                    <FiAlertTriangle size={18} />
                    <p className="text-sm font-medium">No submissions received for this assignment (past due date).</p>
                  </div>
                )}

                {submissions.length === 0 && !isPastDue ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="font-medium">No submissions yet</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            {['Student', 'Submitted At', 'Late?', 'Text Preview', 'File', 'Marks', 'Comments', 'Action'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {submissions.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800">{sName(s.school_students)}</p>
                                <p className="text-xs text-gray-400">{admNo(s.school_students)}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDT(s.submitted_at)}</td>
                              <td className="px-4 py-3">
                                {s.is_late ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">Late</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">On Time</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{s.submission_text || '-'}</td>
                              <td className="px-4 py-3">
                                {s.file_url ? (
                                  <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-xs flex items-center gap-1">
                                    <FiDownload size={12} /> View
                                  </a>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                {s.school_lms_grades ? (
                                  <span className="font-bold text-gray-800">{s.school_lms_grades.marks_awarded}/{selectedAssignment.max_marks}</span>
                                ) : <span className="text-gray-300 text-xs">Not graded</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">
                                {s.school_lms_grades?.teacher_comments || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setGradingSubmission(s)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                                  style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}
                                >
                                  <FiEdit2 size={11} /> Grade
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadResourceModal
          subjects={subjects} forms={forms}
          onClose={() => setShowUploadModal(false)}
          onSaved={fetchResources}
        />
      )}
      {showCreateAssignment && (
        <CreateAssignmentModal
          subjects={subjects} forms={forms} streams={streams}
          onClose={() => setShowCreateAssignment(false)}
          onSaved={fetchAssignments}
        />
      )}
      {gradingSubmission && selectedAssignment && (
        <GradeSubmissionModal
          submission={gradingSubmission}
          maxMarks={selectedAssignment.max_marks}
          onClose={() => setGradingSubmission(null)}
          onSaved={() => fetchSubmissions(selectedAssignment.id)}
        />
      )}
    </div>
  );
}

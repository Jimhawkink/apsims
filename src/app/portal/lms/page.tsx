'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FiBook, FiClipboard, FiDownload, FiX, FiPlus,
  FiEdit2, FiAlertTriangle, FiCheckCircle, FiClock,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: number; subject_name: string; }
interface Form { id: number; form_name: string; }

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
  school_subjects?: { id: number; subject_name: string };
  school_forms?: { id: number; form_name: string };
}

interface LmsAssignment {
  id: number;
  subject_id?: number;
  form_id?: number;
  title: string;
  description?: string;
  due_date: string;
  max_marks: number;
  attachment_url?: string;
  school_subjects?: { id: number; subject_name: string };
  school_forms?: { id: number; form_name: string };
  // Populated client-side
  submission?: LmsSubmission | null;
}

interface LmsSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_text?: string;
  file_url?: string;
  submitted_at: string;
  is_late: boolean;
  school_lms_grades?: { marks_awarded: number; teacher_comments?: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all';
const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

const TYPE_BADGE: Record<string, string> = {
  'PDF': 'bg-red-100 text-red-700',
  'Word': 'bg-blue-100 text-blue-700',
  'Video Link': 'bg-purple-100 text-purple-700',
  'Other': 'bg-gray-100 text-gray-600',
};

// ─── Submit Assignment Modal ──────────────────────────────────────────────────

function SubmitAssignmentModal({ assignment, studentId, onClose, onSaved }: {
  assignment: LmsAssignment; studentId: number; onClose: () => void; onSaved: () => void;
}) {
  const [text, setText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() && !fileUrl.trim()) return toast.error('Please provide submission text or a file URL');
    setSaving(true);
    try {
      const res = await fetch('/api/lms/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignment.id,
          student_id: studentId,
          submission_text: text.trim() || null,
          file_url: fileUrl.trim() || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit');
      toast.success('Assignment submitted ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
          <h2 className="text-lg font-bold text-white">Submit Assignment</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <p className="font-semibold text-sky-800 text-sm">{assignment.title}</p>
            {assignment.description && <p className="text-xs text-sky-600 mt-1">{assignment.description}</p>}
            <p className="text-xs text-sky-500 mt-1">Due: {fmtDT(assignment.due_date)}</p>
          </div>
          <div><label className={lbl}>Your Answer / Response</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Type your answer here..." className={inp} />
          </div>
          <div><label className={lbl}>File URL (optional)</label>
            <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." className={inp} />
            <p className="text-xs text-gray-400 mt-1">Paste a link to your uploaded file (Google Drive, Dropbox, etc.)</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Submission Modal ────────────────────────────────────────────────────

function EditSubmissionModal({ submission, assignment, onClose, onSaved }: {
  submission: LmsSubmission; assignment: LmsAssignment; onClose: () => void; onSaved: () => void;
}) {
  const [text, setText] = useState(submission.submission_text || '');
  const [fileUrl, setFileUrl] = useState(submission.file_url || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/lms/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_text: text.trim() || null,
          file_url: fileUrl.trim() || null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update submission');
      toast.success('Submission updated ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
          <h2 className="text-lg font-bold text-white">Edit Submission</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <p className="font-semibold text-sky-800 text-sm">{assignment.title}</p>
            <p className="text-xs text-sky-500 mt-1">Due: {fmtDT(assignment.due_date)}</p>
          </div>
          <div><label className={lbl}>Your Answer / Response</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Type your answer here..." className={inp} />
          </div>
          <div><label className={lbl}>File URL (optional)</label>
            <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." className={inp} />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiEdit2 size={14} />}
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main LMS Portal Page ─────────────────────────────────────────────────────

export default function LmsPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [studentFormId, setStudentFormId] = useState<number | null>(null);

  // Resources
  const [resources, setResources] = useState<LmsResource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [resSubjectFilter, setResSubjectFilter] = useState('');
  const [resFormFilter, setResFormFilter] = useState('');
  const [loadingResources, setLoadingResources] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Modals
  const [submittingAssignment, setSubmittingAssignment] = useState<LmsAssignment | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<{ submission: LmsSubmission; assignment: LmsAssignment } | null>(null);

  // ── Auth check ──
  useEffect(() => {
    const s = localStorage.getItem('portal_session');
    if (!s) { router.push('/portal/login'); return; }
    const parsed = JSON.parse(s);
    setSession(parsed);
  }, [router]);

  // ── Fetch student form_id if not in session ──
  useEffect(() => {
    if (!session) return;

    // Try session first
    if (session.form_id) {
      setStudentFormId(session.form_id);
      return;
    }

    // Fallback: fetch from school_students
    if (session.student_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      fetch(`${supabaseUrl}/rest/v1/school_students?id=eq.${session.student_id}&select=form_id`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data[0]?.form_id) {
            setStudentFormId(data[0].form_id);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // ── Fetch reference data ──
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/school_subjects?select=id,subject_name&order=subject_name`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/school_forms?select=id,form_name&order=form_level`, { headers }).then(r => r.json()),
    ]).then(([subs, fms]) => {
      if (Array.isArray(subs)) setSubjects(subs);
      if (Array.isArray(fms)) setForms(fms);
    }).catch(() => {});
  }, []);

  // ── Fetch resources ──
  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const params = new URLSearchParams();
      if (resSubjectFilter) params.set('subject_id', resSubjectFilter);
      // Default to student's form if no filter selected
      const formId = resFormFilter || (studentFormId ? String(studentFormId) : '');
      if (formId) params.set('form_id', formId);

      // Use the portal-accessible endpoint (resources are public read for authenticated users)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      let query = `${supabaseUrl}/rest/v1/school_lms_resources?is_active=eq.true&order=created_at.desc&select=*,school_subjects(id,subject_name),school_forms(id,form_name)`;
      if (resSubjectFilter) query += `&subject_id=eq.${resSubjectFilter}`;
      if (formId) query += `&form_id=eq.${formId}`;

      const res = await fetch(query, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) setResources(data);
    } catch { /* silent */ } finally { setLoadingResources(false); }
  }, [resSubjectFilter, resFormFilter, studentFormId]);

  // ── Fetch assignments for student's form ──
  const fetchAssignments = useCallback(async () => {
    if (!studentFormId) return;
    setLoadingAssignments(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      // Fetch assignments for student's form
      const asgRes = await fetch(
        `${supabaseUrl}/rest/v1/school_lms_assignments?is_active=eq.true&form_id=eq.${studentFormId}&order=due_date.desc&select=*,school_subjects(id,subject_name),school_forms(id,form_name)`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const asgData = await asgRes.json();
      if (!Array.isArray(asgData)) { setLoadingAssignments(false); return; }

      // Fetch student's submissions
      const studentId = session?.student_id;
      if (studentId) {
        const subRes = await fetch(
          `${supabaseUrl}/rest/v1/school_lms_submissions?student_id=eq.${studentId}&select=*,school_lms_grades(marks_awarded,teacher_comments)`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const subData = await subRes.json();
        const submissionsMap: Record<number, LmsSubmission> = {};
        if (Array.isArray(subData)) {
          subData.forEach((s: any) => { submissionsMap[s.assignment_id] = s; });
        }

        // Merge submissions into assignments
        const enriched = asgData.map((a: LmsAssignment) => ({
          ...a,
          submission: submissionsMap[a.id] || null,
        }));
        setAssignments(enriched);
      } else {
        setAssignments(asgData.map((a: LmsAssignment) => ({ ...a, submission: null })));
      }
    } catch { /* silent */ } finally { setLoadingAssignments(false); }
  }, [studentFormId, session]);

  useEffect(() => { if (studentFormId) { fetchResources(); fetchAssignments(); } }, [studentFormId, fetchResources, fetchAssignments]);

  const handleAccessResource = async (resource: LmsResource) => {
    try {
      const res = await fetch(`/api/lms/resources/${resource.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: session?.student_id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to access resource');

      const url = result.file_url || result.video_url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('No file or video URL available for this resource');
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const getAssignmentStatus = (a: LmsAssignment): { label: string; color: string } => {
    const pastDue = new Date() > new Date(a.due_date);
    if (a.submission) {
      if (a.submission.is_late) return { label: 'Submitted (Late)', color: 'bg-orange-100 text-orange-700' };
      return { label: 'Submitted', color: 'bg-green-100 text-green-700' };
    }
    if (pastDue) return { label: 'Not Submitted', color: 'bg-red-100 text-red-700' };
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-8 text-white" style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Learning Portal</h1>
            <p className="text-sky-100 text-sm mt-1">Access your resources and assignments</p>
          </div>
          <button
            onClick={() => router.push('/portal/student')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ── Section 1: Resource Library ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700"><FiBook size={20} /></div>
            <h2 className="text-xl font-bold text-gray-800">Resource Library</h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={resSubjectFilter}
              onChange={e => setResSubjectFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
            <select
              value={resFormFilter}
              onChange={e => setResFormFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
            >
              <option value="">My Form</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <button
              onClick={fetchResources}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Filter
            </button>
          </div>

          {loadingResources ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border">
              <FiBook size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No resources available yet</p>
              <p className="text-sm">Check back later for uploaded materials</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Title', 'Type', 'Topic', 'Subject', 'Form', 'Upload Date', 'Action'].map(h => (
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
                          <button
                            onClick={() => handleAccessResource(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                            style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}
                          >
                            <FiDownload size={11} />
                            {r.resource_type === 'Video Link' ? 'Watch' : 'Download'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: Assignments ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700"><FiClipboard size={20} /></div>
            <h2 className="text-xl font-bold text-gray-800">Assignments</h2>
          </div>

          {loadingAssignments ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border">
              <FiClipboard size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No assignments yet</p>
              <p className="text-sm">Your teachers haven't posted any assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => {
                const status = getAssignmentStatus(a);
                const pastDue = new Date() > new Date(a.due_date);
                const canEdit = a.submission && !pastDue;

                return (
                  <div key={a.id} className="bg-white rounded-2xl border shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-800">{a.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        {a.description && <p className="text-sm text-gray-500 mb-2">{a.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                          {a.school_subjects && <span>📚 {a.school_subjects.subject_name}</span>}
                          {a.school_forms && <span>🏫 {a.school_forms.form_name}</span>}
                          <span className={`flex items-center gap-1 ${pastDue ? 'text-red-500' : 'text-gray-400'}`}>
                            <FiClock size={11} /> Due: {fmtDT(a.due_date)}
                          </span>
                          <span>Max: {a.max_marks} marks</span>
                        </div>
                        {a.attachment_url && (
                          <a href={a.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-sky-600 hover:underline">
                            <FiDownload size={11} /> View attachment
                          </a>
                        )}
                        {/* Grade display */}
                        {a.submission?.school_lms_grades && (
                          <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-700 flex items-center gap-1">
                              <FiCheckCircle size={12} /> Graded: {a.submission.school_lms_grades.marks_awarded}/{a.max_marks} marks
                            </p>
                            {a.submission.school_lms_grades.teacher_comments && (
                              <p className="text-xs text-green-600 mt-1">"{a.submission.school_lms_grades.teacher_comments}"</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {!a.submission && !pastDue && (
                          <button
                            onClick={() => setSubmittingAssignment(a)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #0369a1, #0891b2)' }}
                          >
                            <FiPlus size={12} /> Submit
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setEditingSubmission({ submission: a.submission!, assignment: a })}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors"
                          >
                            <FiEdit2 size={12} /> Edit
                          </button>
                        )}
                        {a.submission && pastDue && !a.submission.school_lms_grades && (
                          <span className="text-xs text-gray-400 text-center">Awaiting grade</span>
                        )}
                        {!a.submission && pastDue && (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <FiAlertTriangle size={12} /> Missed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {submittingAssignment && session?.student_id && (
        <SubmitAssignmentModal
          assignment={submittingAssignment}
          studentId={session.student_id}
          onClose={() => setSubmittingAssignment(null)}
          onSaved={fetchAssignments}
        />
      )}
      {editingSubmission && (
        <EditSubmissionModal
          submission={editingSubmission.submission}
          assignment={editingSubmission.assignment}
          onClose={() => setEditingSubmission(null)}
          onSaved={fetchAssignments}
        />
      )}
    </div>
  );
}

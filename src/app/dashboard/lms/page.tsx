'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    FiBook, FiClipboard, FiUsers, FiPlus, FiX, FiDownload,
    FiTrash2, FiEdit2, FiCheckCircle, FiAlertTriangle, FiRefreshCw,
    FiSearch, FiFilter, FiClock, FiExternalLink, FiStar, FiAward,
} from 'react-icons/fi';

// ── Types ────────────────────────────────────────────────────────────────────

interface Subject { id: number; subject_name: string; }
interface Form    { id: number; form_name: string; }
interface Stream  { id: number; stream_name: string; }

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

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT   = (iso: string) => iso ? new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const admNo   = (s: any) => s?.admission_number || s?.admission_no || '—';
const sName   = (s: any) => s ? `${s.first_name} ${s.last_name}` : 'Unknown';
const inp     = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-sky-200 outline-none transition';
const lbl     = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const TYPE_CFG: Record<string, { bg: string; color: string; icon: string }> = {
    'PDF':        { bg: '#fee2e2', color: '#991b1b', icon: '📄' },
    'Word':       { bg: '#dbeafe', color: '#1e40af', icon: '📝' },
    'Video Link': { bg: '#ede9fe', color: '#5b21b6', icon: '🎥' },
    'Other':      { bg: '#f3f4f6', color: '#374151', icon: '📎' },
};

// ── Upload Resource Modal ─────────────────────────────────────────────────────
function UploadResourceModal({ subjects, forms, onClose, onSaved }: { subjects: Subject[]; forms: Form[]; onClose: () => void; onSaved: () => void; }) {
    const [form, setForm] = useState({ subject_id: '', form_id: '', topic_name: '', resource_title: '', resource_type: 'PDF', file_url: '', video_url: '' });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!form.topic_name.trim()) return toast.error('Topic name required');
        if (!form.resource_title.trim()) return toast.error('Resource title required');
        setSaving(true);
        const res = await fetch('/api/lms/resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, subject_id: form.subject_id ? Number(form.subject_id) : null, form_id: form.form_id ? Number(form.form_id) : null, file_url: form.resource_type !== 'Video Link' ? form.file_url : null, video_url: form.resource_type === 'Video Link' ? form.video_url : null }),
        });
        const r = await res.json();
        if (!res.ok) { toast.error(r.error || 'Failed'); setSaving(false); return; }
        toast.success('Resource uploaded ✅'); onSaved(); onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                    <div>
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2"><FiBook size={14} /> Upload Learning Resource</h2>
                        <p className="text-sky-300 text-[11px]">Add notes, documents, or video links for students</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white"><FiX size={15} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Subject</label>
                            <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={inp}>
                                <option value="">All Subjects</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Form</label>
                            <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className={inp}>
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Topic Name *</label>
                        <input type="text" value={form.topic_name} onChange={e => setForm({ ...form, topic_name: e.target.value })} placeholder="e.g. Photosynthesis" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Resource Title *</label>
                        <input type="text" value={form.resource_title} onChange={e => setForm({ ...form, resource_title: e.target.value })} placeholder="e.g. Form 2 Biology Notes – Chapter 3" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Resource Type *</label>
                        <div className="flex gap-2">
                            {Object.entries(TYPE_CFG).map(([t, cfg]) => (
                                <button key={t} onClick={() => setForm(f => ({ ...f, resource_type: t }))}
                                    className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                                    style={form.resource_type === t ? { background: 'linear-gradient(135deg,#0c4a6e,#0369a1)', color: '#fff' } : { background: cfg.bg, color: cfg.color }}>
                                    {cfg.icon} {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    {form.resource_type === 'Video Link' ? (
                        <div>
                            <label className={lbl}>Video URL</label>
                            <input type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/..." className={inp} />
                        </div>
                    ) : (
                        <div>
                            <label className={lbl}>File URL</label>
                            <input type="url" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://storage.supabase.co/..." className={inp} />
                        </div>
                    )}
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={submit} disabled={saving} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={12} />}
                        Upload Resource
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Create Assignment Modal ───────────────────────────────────────────────────
function CreateAssignmentModal({ subjects, forms, streams, onClose, onSaved }: { subjects: Subject[]; forms: Form[]; streams: Stream[]; onClose: () => void; onSaved: () => void; }) {
    const [form, setForm] = useState({ subject_id: '', form_id: '', stream_id: '', title: '', description: '', due_date: '', max_marks: 100, attachment_url: '' });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!form.title.trim()) return toast.error('Title required');
        if (!form.due_date) return toast.error('Due date required');
        setSaving(true);
        const res = await fetch('/api/lms/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, subject_id: form.subject_id ? Number(form.subject_id) : null, form_id: form.form_id ? Number(form.form_id) : null, stream_id: form.stream_id ? Number(form.stream_id) : null, max_marks: Number(form.max_marks), attachment_url: form.attachment_url || null }),
        });
        const r = await res.json();
        if (!res.ok) { toast.error(r.error || 'Failed'); setSaving(false); return; }
        toast.success('Assignment created ✅'); onSaved(); onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                    <div>
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2"><FiClipboard size={14} /> Create Assignment</h2>
                        <p className="text-sky-300 text-[11px]">Assign work to a specific form, stream, or subject</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white"><FiX size={15} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Subject</label>
                            <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={inp}>
                                <option value="">All Subjects</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Form *</label>
                            <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className={inp}>
                                <option value="">Select Form</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Stream (optional)</label>
                        <select value={form.stream_id} onChange={e => setForm({ ...form, stream_id: e.target.value })} className={inp}>
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>Assignment Title *</label>
                        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 5 End of Topic Exercise" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Instructions / Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detailed instructions for students…" className={`${inp} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Due Date & Time *</label>
                            <input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Max Marks *</label>
                            <input type="number" min={1} max={500} value={form.max_marks} onChange={e => setForm({ ...form, max_marks: Number(e.target.value) })} className={inp} />
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Attachment URL (optional)</label>
                        <input type="url" value={form.attachment_url} onChange={e => setForm({ ...form, attachment_url: e.target.value })} placeholder="https://…" className={inp} />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={submit} disabled={saving} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={12} />}
                        Create Assignment
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Grade Submission Modal ────────────────────────────────────────────────────
function GradeModal({ submission, maxMarks, onClose, onSaved }: { submission: LmsSubmission; maxMarks: number; onClose: () => void; onSaved: () => void; }) {
    const existing = submission.school_lms_grades;
    const [marks, setMarks]     = useState(existing?.marks_awarded ?? 0);
    const [comments, setComments] = useState(existing?.teacher_comments || '');
    const [saving, setSaving]   = useState(false);
    const pct = maxMarks > 0 ? Math.round(marks / maxMarks * 100) : 0;

    const submit = async () => {
        if (marks < 0 || marks > maxMarks) return toast.error(`Marks must be 0–${maxMarks}`);
        setSaving(true);
        const res = await fetch('/api/lms/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submission_id: submission.id, marks_awarded: marks, teacher_comments: comments }) });
        const r = await res.json();
        if (!res.ok) { toast.error(r.error || 'Failed'); setSaving(false); return; }
        toast.success('Grade saved ✅'); onSaved(); onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                    <div>
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2"><FiAward size={14} /> Grade Submission</h2>
                        <p className="text-sky-300 text-[11px]">{sName(submission.school_students)} · {admNo(submission.school_students)}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white"><FiX size={15} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {submission.submission_text && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Student Response</p>
                            <p className="text-xs text-gray-700">{submission.submission_text}</p>
                        </div>
                    )}
                    {submission.file_url && (
                        <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-sky-600 font-medium hover:underline">
                            <FiDownload size={12} /> View Submitted File
                        </a>
                    )}
                    <div>
                        <label className={lbl}>Marks Awarded (0 – {maxMarks}) *</label>
                        <div className="flex items-center gap-3">
                            <input type="number" min={0} max={maxMarks} value={marks} onChange={e => setMarks(Number(e.target.value))} className={`${inp} flex-1`} />
                            <span className={`text-sm font-black px-2 py-1 rounded-lg ${pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{pct}%</span>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Teacher Comments</label>
                        <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Feedback and guidance for the student…" className={`${inp} resize-none`} />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={submit} disabled={saving} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={12} />}
                        Save Grade
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LmsPage() {
    const [tab, setTab]         = useState<Tab>('resources');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [forms, setForms]     = useState<Form[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);

    const [resources, setResources]       = useState<LmsResource[]>([]);
    const [assignments, setAssignments]   = useState<LmsAssignment[]>([]);
    const [submissions, setSubmissions]   = useState<LmsSubmission[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<LmsAssignment | null>(null);
    const [gradingSubmission, setGradingSubmission]   = useState<LmsSubmission | null>(null);

    const [resSubject, setResSubject]   = useState('');
    const [resForm, setResForm]         = useState('');
    const [asgSubject, setAsgSubject]   = useState('');
    const [asgForm, setAsgForm]         = useState('');
    const [resSearch, setResSearch]     = useState('');
    const [asgSearch, setAsgSearch]     = useState('');

    const [showUpload, setShowUpload]       = useState(false);
    const [showCreate, setShowCreate]       = useState(false);
    const [loading, setLoading]             = useState(false);
    const [loadingSubs, setLoadingSubs]     = useState(false);

    // ── Fetch reference data via Supabase REST ──
    useEffect(() => {
        const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;
        const h = { apikey: key, Authorization: `Bearer ${key}` };
        Promise.all([
            fetch(`${url}/rest/v1/school_subjects?select=id,subject_name&order=subject_name`, { headers: h }).then(r => r.json()),
            fetch(`${url}/rest/v1/school_forms?select=id,form_name&order=form_level`, { headers: h }).then(r => r.json()),
            fetch(`${url}/rest/v1/school_streams?select=id,stream_name&order=stream_name`, { headers: h }).then(r => r.json()),
        ]).then(([s, f, st]) => {
            if (Array.isArray(s)) setSubjects(s);
            if (Array.isArray(f)) setForms(f);
            if (Array.isArray(st)) setStreams(st);
        }).catch(() => {});
    }, []);

    const fetchResources = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (resSubject) p.set('subject_id', resSubject);
        if (resForm)    p.set('form_id', resForm);
        const res = await fetch(`/api/lms/resources?${p}`);
        const r   = await res.json();
        if (res.ok) setResources(r.data || []);
        setLoading(false);
    }, [resSubject, resForm]);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (asgSubject) p.set('subject_id', asgSubject);
        if (asgForm)    p.set('form_id', asgForm);
        const res = await fetch(`/api/lms/assignments?${p}`);
        const r   = await res.json();
        if (res.ok) setAssignments(r.data || []);
        setLoading(false);
    }, [asgSubject, asgForm]);

    const fetchSubmissions = useCallback(async (asgId: number) => {
        setLoadingSubs(true);
        const res = await fetch(`/api/lms/assignments/${asgId}/submissions`);
        const r   = await res.json();
        if (res.ok) setSubmissions(r.data || []);
        setLoadingSubs(false);
    }, []);

    useEffect(() => { if (tab === 'resources')  fetchResources(); }, [tab, fetchResources]);
    useEffect(() => { if (tab !== 'resources')  fetchAssignments(); }, [tab, fetchAssignments]);
    useEffect(() => { if (selectedAssignment)   fetchSubmissions(selectedAssignment.id); }, [selectedAssignment, fetchSubmissions]);

    const handleDeleteResource = async (id: number) => {
        if (!confirm('Delete this resource?')) return;
        const res = await fetch(`/api/lms/resources/${id}`, { method: 'DELETE' });
        if (!res.ok) { toast.error('Failed to delete'); return; }
        toast.success('Deleted'); fetchResources();
    };

    // Derived
    const filteredRes = useMemo(() => resources.filter(r => !resSearch || r.resource_title.toLowerCase().includes(resSearch.toLowerCase()) || r.topic_name.toLowerCase().includes(resSearch.toLowerCase())), [resources, resSearch]);
    const filteredAsg = useMemo(() => assignments.filter(a => !asgSearch || a.title.toLowerCase().includes(asgSearch.toLowerCase())), [assignments, asgSearch]);
    const gradedCount = submissions.filter(s => s.school_lms_grades).length;
    const lateCount   = submissions.filter(s => s.is_late).length;
    const activeAsg   = assignments.filter(a => new Date() < new Date(a.due_date)).length;

    const TABS = [
        { key: 'resources' as Tab,    label: '📚 Resources',   count: resources.length },
        { key: 'assignments' as Tab,  label: '📋 Assignments',  count: assignments.length },
        { key: 'submissions' as Tab,  label: '📤 Submissions',  count: selectedAssignment ? submissions.length : undefined },
    ];

    return (
        <div className="space-y-5">
            {/* ════ HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0c2d48 0%,#0c4a6e 40%,#0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#38bdf8,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl p-2.5" style={{ background: 'linear-gradient(135deg,#0891b2,#0369a1)' }}>
                                <FiBook className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    🎓 LMS / E-Learning
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>ULTRA</span>
                                </h1>
                                <p className="text-sky-300 text-xs mt-0.5">Learning Resources · Assignments · Submissions · Grading · Analytics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setShowUpload(true)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition border border-sky-500/30"
                                style={{ background: 'rgba(255,255,255,0.12)' }}>
                                <FiPlus size={12} /> Upload Resource
                            </button>
                            <button onClick={() => setShowCreate(true)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition"
                                style={{ background: 'linear-gradient(135deg,#0891b2,#0369a1)' }}>
                                <FiClipboard size={12} /> Create Assignment
                            </button>
                            <button onClick={() => tab === 'resources' ? fetchResources() : fetchAssignments()}
                                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Total Resources', value: resources.length, icon: '📚' },
                            { label: 'Assignments', value: assignments.length, icon: '📋' },
                            { label: 'Active Tasks', value: activeAsg, icon: '⏳', pulse: activeAsg > 0 },
                            { label: 'Submissions', value: selectedAssignment ? submissions.length : '—', icon: '📤' },
                            { label: 'Graded', value: selectedAssignment ? gradedCount : '—', icon: '✅' },
                            { label: 'Late Subs', value: selectedAssignment ? lateCount : '—', icon: '⚠️', pulse: lateCount > 0 },
                        ].map((c: any, i) => (
                            <div key={i} className={`rounded-xl p-3 ${c.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{c.icon}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                                </div>
                                <p className="text-lg font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ════ TABS ════ */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={tab === t.key
                                ? { background: 'linear-gradient(135deg,#0c4a6e,#0369a1)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(3,105,161,0.4)' }
                                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {t.label}
                            {t.count !== undefined && <span className="text-[10px] font-bold opacity-60">({t.count})</span>}
                        </button>
                    ))}
                </div>
                <div className="relative min-w-[220px]">
                    <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                    <input value={tab === 'resources' ? resSearch : asgSearch}
                        onChange={e => tab === 'resources' ? setResSearch(e.target.value) : setAsgSearch(e.target.value)}
                        placeholder={tab === 'resources' ? 'Search resources…' : 'Search assignments…'}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-200 outline-none bg-white" />
                </div>
            </div>

            {/* ════ RESOURCES TAB ════ */}
            {tab === 'resources' && (
                <div className="space-y-4">
                    {/* Sub-filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className={lbl}>Subject</label>
                            <select value={resSubject} onChange={e => setResSubject(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200">
                                <option value="">All Subjects</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Form</label>
                            <select value={resForm} onChange={e => setResForm(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <button onClick={fetchResources} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                            <FiFilter size={11} /> Filter
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
                    ) : filteredRes.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                            <FiBook className="mx-auto mb-3 text-gray-300" size={36} />
                            <p className="text-sm font-bold text-gray-500">No resources found</p>
                            <button onClick={() => setShowUpload(true)} className="mt-4 px-5 py-2 text-xs font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                                <FiPlus className="inline mr-1" size={11} /> Upload First Resource
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            {['#', 'Type', 'Resource Title', 'Topic', 'Subject', 'Form', 'Uploaded', 'Link', ''].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRes.map((r, i) => {
                                            const cfg = TYPE_CFG[r.resource_type] || TYPE_CFG['Other'];
                                            return (
                                                <tr key={r.id} className="border-b border-gray-100 hover:bg-sky-50/20 transition-colors">
                                                    <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                    <td className="px-3 py-2.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                                                            {cfg.icon} {r.resource_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-sm font-semibold text-gray-800 max-w-[200px]">
                                                        <p className="truncate">{r.resource_title}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs text-gray-600">{r.topic_name}</td>
                                                    <td className="px-3 py-2.5 text-xs text-gray-500">{r.school_subjects?.subject_name || '—'}</td>
                                                    <td className="px-3 py-2.5 text-xs text-gray-500">{r.school_forms?.form_name || '—'}</td>
                                                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(r.upload_date)}</td>
                                                    <td className="px-3 py-2.5">
                                                        {(r.file_url || r.video_url) ? (
                                                            <a href={r.file_url || r.video_url || '#'} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-sky-600 hover:text-sky-800 text-xs font-semibold">
                                                                {r.resource_type === 'Video Link' ? <><FiExternalLink size={11} /> Watch</> : <><FiDownload size={11} /> Open</>}
                                                            </a>
                                                        ) : <span className="text-gray-300 text-xs">No link</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <button onClick={() => handleDeleteResource(r.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500">{filteredRes.length} resource(s)</div>
                        </div>
                    )}
                </div>
            )}

            {/* ════ ASSIGNMENTS TAB ════ */}
            {tab === 'assignments' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className={lbl}>Subject</label>
                            <select value={asgSubject} onChange={e => setAsgSubject(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200">
                                <option value="">All Subjects</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Form</label>
                            <select value={asgForm} onChange={e => setAsgForm(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-200">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                        </div>
                        <button onClick={fetchAssignments} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                            <FiFilter size={11} /> Filter
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
                    ) : filteredAsg.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                            <FiClipboard className="mx-auto mb-3 text-gray-300" size={36} />
                            <p className="text-sm font-bold text-gray-500">No assignments found</p>
                            <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2 text-xs font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                                <FiPlus className="inline mr-1" size={11} /> Create First Assignment
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAsg.map(a => {
                                const pastDue = new Date() > new Date(a.due_date);
                                const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
                                return (
                                    <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md" style={{ background: pastDue ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                                                    {pastDue ? '⏰' : '📋'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-extrabold text-gray-800">{a.title}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {a.school_subjects?.subject_name || '—'} · {a.school_forms?.form_name || 'All Forms'} {a.school_streams?.stream_name ? `· ${a.school_streams.stream_name}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${pastDue ? 'bg-red-100 text-red-700' : daysLeft <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {pastDue ? 'Past Due' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-sky-100 text-sky-700">
                                                    {a.submission_count} submitted
                                                </span>
                                                <p className="text-sm font-black text-sky-600">{a.max_marks} marks</p>
                                                <button
                                                    onClick={() => { setSelectedAssignment(a); setTab('submissions'); setSubmissions([]); }}
                                                    className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition"
                                                    style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                                                    <FiUsers size={10} /> View Submissions
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-5 py-3 flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <FiClock size={11} /> Due: <strong className={pastDue ? 'text-red-600' : 'text-gray-700'}>{fmtDT(a.due_date)}</strong>
                                            </div>
                                            {a.description && <p className="text-[11px] text-gray-400 max-w-[50%] truncate">{a.description}</p>}
                                            {a.attachment_url && (
                                                <a href={a.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 font-medium hover:underline">
                                                    <FiDownload size={11} /> Attachment
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ════ SUBMISSIONS TAB ════ */}
            {tab === 'submissions' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <label className={lbl}>Select Assignment to View Submissions</label>
                        <select
                            value={selectedAssignment?.id || ''}
                            onChange={e => {
                                const a = assignments.find(x => x.id === Number(e.target.value));
                                setSelectedAssignment(a || null);
                                setSubmissions([]);
                            }}
                            className={`${inp} max-w-xl`}>
                            <option value="">— Choose an assignment —</option>
                            {assignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.title} {a.school_forms ? `(${a.school_forms.form_name})` : ''} · Due: {fmtDate(a.due_date)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!selectedAssignment ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
                            <FiUsers className="mx-auto mb-3 text-gray-300" size={36} />
                            <p className="text-sm font-medium">Select an assignment above to view student submissions</p>
                        </div>
                    ) : loadingSubs ? (
                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
                    ) : (
                        <>
                            {/* Assignment summary strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Submissions', value: submissions.length, color: '#0369a1', bg: '#e0f2fe' },
                                    { label: 'Graded', value: gradedCount, color: '#15803d', bg: '#dcfce7' },
                                    { label: 'Ungraded', value: submissions.length - gradedCount, color: '#d97706', bg: '#fef3c7' },
                                    { label: 'Late Submissions', value: lateCount, color: '#dc2626', bg: '#fee2e2' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                        <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {submissions.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                                    {new Date() > new Date(selectedAssignment.due_date) ? (
                                        <div className="flex items-center gap-3 justify-center p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 mb-4">
                                            <FiAlertTriangle size={16} />
                                            <p className="text-sm font-bold">No submissions received — assignment is past due.</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-gray-400">No submissions yet — assignment is still open.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    {['#', 'Student', 'Adm No', 'Submitted', 'Status', 'Marks', 'Grade', 'Comments', 'Action'].map(h => (
                                                        <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submissions.map((s, i) => {
                                                    const grade = s.school_lms_grades;
                                                    const pct = grade ? Math.round(grade.marks_awarded / selectedAssignment.max_marks * 100) : null;
                                                    return (
                                                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${s.is_late ? 'border-l-4 border-l-red-400' : ''}`}>
                                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                            <td className="px-3 py-2.5">
                                                                <p className="text-sm font-semibold text-gray-800">{sName(s.school_students)}</p>
                                                                {s.submission_text && <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{s.submission_text}</p>}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-xs font-bold text-sky-600">{admNo(s.school_students)}</td>
                                                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(s.submitted_at)}</td>
                                                            <td className="px-3 py-2.5">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_late ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                    {s.is_late ? 'Late' : 'On Time'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-sm font-bold text-gray-700">
                                                                {grade ? `${grade.marks_awarded}/${selectedAssignment.max_marks}` : <span className="text-gray-300 text-xs">—</span>}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                {pct !== null && (
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {pct}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[140px]">
                                                                <p className="truncate">{grade?.teacher_comments || '—'}</p>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <div className="flex items-center gap-1">
                                                                    {s.file_url && (
                                                                        <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-sky-500 hover:bg-sky-50 rounded-lg transition" title="View file">
                                                                            <FiDownload size={12} />
                                                                        </a>
                                                                    )}
                                                                    <button onClick={() => setGradingSubmission(s)}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white rounded-lg transition"
                                                                        style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
                                                                        <FiEdit2 size={10} /> {grade ? 'Edit' : 'Grade'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
                                        <span>{submissions.length} submission(s)</span>
                                        <span>Graded: <strong className="text-green-600">{gradedCount}/{submissions.length}</strong> · Avg: <strong className="text-sky-600">{submissions.filter(s => s.school_lms_grades).length > 0 ? Math.round(submissions.filter(s => s.school_lms_grades).reduce((sum, s) => sum + (s.school_lms_grades?.marks_awarded || 0), 0) / submissions.filter(s => s.school_lms_grades).length) : '—'}/{selectedAssignment.max_marks}</strong></span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Modals */}
            {showUpload  && <UploadResourceModal subjects={subjects} forms={forms} onClose={() => setShowUpload(false)} onSaved={fetchResources} />}
            {showCreate  && <CreateAssignmentModal subjects={subjects} forms={forms} streams={streams} onClose={() => setShowCreate(false)} onSaved={fetchAssignments} />}
            {gradingSubmission && selectedAssignment && (
                <GradeModal
                    submission={gradingSubmission}
                    maxMarks={selectedAssignment.max_marks}
                    onClose={() => setGradingSubmission(null)}
                    onSaved={() => { setGradingSubmission(null); fetchSubmissions(selectedAssignment.id); }}
                />
            )}
        </div>
    );
}

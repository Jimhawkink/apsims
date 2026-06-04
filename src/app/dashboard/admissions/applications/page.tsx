'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    FiUser, FiSearch, FiRefreshCw, FiEye, FiCheckCircle, FiXCircle,
    FiClock, FiAlertCircle, FiFilter, FiDownload, FiUserPlus,
    FiPrinter, FiX, FiChevronDown, FiChevronUp, FiPhone, FiMail,
    FiCalendar, FiFileText, FiFolder, FiExternalLink,
} from 'react-icons/fi';

// Form / Grade display helper
const formLabel = (n?: number) => {
    if (!n) return '—';
    if (n === 10) return 'Grade 10 (CBC)';
    if (n === 11) return 'Grade 11 (CBC)';
    if (n === 12) return 'Grade 12 (CBC)';
    return `Form ${n} (8-4-4)`;
};

// Document type icon
const docIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('birth'))    return '🪪';
    if (t.includes('kcpe') || t.includes('result')) return '📋';
    if (t.includes('photo'))    return '📷';
    if (t.includes('medical'))  return '🏥';
    if (t.includes('pdf'))      return '📄';
    return '📎';
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Application {
    id: number;
    reference_number: string;
    student_first_name: string;
    student_middle_name?: string;
    student_last_name: string;
    date_of_birth: string;
    gender: string;
    previous_school?: string;
    kcpe_index_number: string;
    kcpe_total_marks?: number;
    form_applied_for?: number;
    guardian_full_name: string;
    guardian_phone: string;
    guardian_email?: string;
    guardian_national_id: string;
    status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted';
    review_notes?: string;
    reviewed_by?: number;
    reviewed_at?: string;
    converted_student_id?: number;
    submitted_at: string;
    school_forms?: { id: number; form_name: string };
}

const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT   = (iso: string) => iso ? new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const sName   = (a: Application) => [a.student_first_name, a.student_middle_name, a.student_last_name].filter(Boolean).join(' ');

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; grad: string }> = {
    Submitted:      { color: '#1d4ed8', bg: '#dbeafe', icon: <FiClock size={10} />,        grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
    'Under Review': { color: '#92400e', bg: '#fef3c7', icon: <FiAlertCircle size={10} />,  grad: 'linear-gradient(135deg,#d97706,#f59e0b)' },
    Approved:       { color: '#14532d', bg: '#dcfce7', icon: <FiCheckCircle size={10} />,  grad: 'linear-gradient(135deg,#15803d,#22c55e)' },
    Rejected:       { color: '#991b1b', bg: '#fee2e2', icon: <FiXCircle size={10} />,      grad: 'linear-gradient(135deg,#dc2626,#ef4444)' },
    Waitlisted:     { color: '#7c2d12', bg: '#ffedd5', icon: <FiAlertCircle size={10} />,  grad: 'linear-gradient(135deg,#ea580c,#f97316)' },
};

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_CFG[status] || STATUS_CFG['Submitted'];
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: c.bg, color: c.color }}>
            {c.icon}{status}
        </span>
    );
}

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-violet-200 outline-none transition';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

// ── Status Change Modal ──────────────────────────────────────────────────────
function StatusModal({ app, onClose, onSaved }: { app: Application; onClose: () => void; onSaved: () => void }) {
    const [status, setStatus] = useState(app.status);
    const [notes, setNotes]   = useState(app.review_notes || '');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        const res = await fetch(`/api/admissions/applications/${app.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, review_notes: notes }),
        });
        const r = await res.json();
        if (!res.ok) { toast.error(r.error || 'Failed'); setSaving(false); return; }
        toast.success('Status updated ✅'); onSaved(); onClose();
    };

    const cfg = STATUS_CFG[status] || STATUS_CFG['Submitted'];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between rounded-t-2xl" style={{ background: cfg.grad }}>
                    <div>
                        <h2 className="text-sm font-extrabold text-white">Update Application Status</h2>
                        <p className="text-white/70 text-[11px]">{sName(app)} · {app.reference_number}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={15} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className={lbl}>New Status *</label>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.keys(STATUS_CFG).map(s => (
                                <button key={s} onClick={() => setStatus(s as any)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                    style={status === s
                                        ? { background: STATUS_CFG[s].grad, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }
                                        : { background: STATUS_CFG[s].bg, color: STATUS_CFG[s].color }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Review Notes (sent to guardian)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            placeholder="Optional notes…" className={`${inp} resize-none`} />
                    </div>
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={submit} disabled={saving}
                        className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: cfg.grad }}>
                        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={12} />}
                        Update Status
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Convert to Student Modal ──────────────────────────────────────────────────
function ConvertModal({ app, onClose, onSaved }: { app: Application; onClose: () => void; onSaved: () => void }) {
    const [converting, setConverting] = useState(false);

    const convert = async () => {
        setConverting(true);
        const res = await fetch(`/api/admissions/applications/${app.id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const r = await res.json();
        if (!res.ok) { toast.error(r.error || 'Failed to enroll'); setConverting(false); return; }
        toast.success('✅ Student record created!'); onSaved(); onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}>
                    <h2 className="text-sm font-extrabold text-white flex items-center gap-2"><FiUserPlus size={14} /> Enroll as Student</h2>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white"><FiX size={15} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm space-y-1.5">
                        {[
                            ['Full Name', sName(app)], ['Date of Birth', fmtDate(app.date_of_birth)],
                            ['Gender', app.gender], ['Form', app.school_forms?.form_name || `Form ${app.form_applied_for}`],
                            ['Guardian', app.guardian_full_name], ['Phone', app.guardian_phone],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between">
                                <span className="text-gray-500 text-xs">{l}</span>
                                <span className="font-semibold text-gray-800 text-xs">{v}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-400">An admission number will be auto-generated. Complete additional details from the student profile.</p>
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-between">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={convert} disabled={converting}
                        className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}>
                        {converting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiUserPlus size={12} />}
                        Create Student Record
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Application Detail Drawer ─────────────────────────────────────────────────
function DetailDrawer({ app, onClose, onRefresh }: { app: Application; onClose: () => void; onRefresh: () => void }) {
    const [showStatus, setShowStatus]   = useState(false);
    const [showConvert, setShowConvert] = useState(false);
    const [documents, setDocuments]     = useState<any[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docsLoaded, setDocsLoaded]   = useState(false);

    const loadDocuments = useCallback(async () => {
        if (docsLoaded) return;
        setDocsLoading(true);
        try {
            const res = await fetch(`/api/admissions/applications/${app.id}/documents`);
            const r   = await res.json();
            if (res.ok) setDocuments(r.data || []);
        } catch { /* silent */ }
        finally { setDocsLoading(false); setDocsLoaded(true); }
    }, [app.id, docsLoaded]);

    // Load docs when drawer opens
    useEffect(() => { loadDocuments(); }, [loadDocuments]);

    const printLetter = () => {
        const w = window.open('', '_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>Admission Letter</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:700px;margin:40px auto;color:#1e293b;font-size:13px;}
.h{text-align:center;border-bottom:3px solid #7c3aed;padding-bottom:16px;margin-bottom:24px;}
.sn{font-size:22px;font-weight:900;color:#7c3aed;}.sub{font-size:12px;color:#64748b;}
.title{text-align:center;font-size:16px;font-weight:900;text-decoration:underline;margin:16px 0;}
.sec{margin:16px 0;}.sl{font-weight:700;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;}
.row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}
.row span:first-child{color:#64748b;}ul{margin:8px 0;padding-left:20px;}li{margin:4px 0;font-size:12px;}
.footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.sign{border-top:2px solid #334155;padding-top:8px;text-align:center;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
</style></head><body>
<div class="h"><p class="sn">APSIMS SCHOOL</p><p class="sub">Excellence in Education · Kenya</p></div>
<p class="title">ADMISSION LETTER</p>
<p>Date: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<p>Dear <strong>${app.guardian_full_name}</strong>,</p>
<p style="margin:12px 0">We are pleased to offer your child admission to our school for the upcoming academic year.</p>
<div class="sec"><p class="sl">Student Details</p>
<div class="row"><span>Full Name</span><span><strong>${sName(app)}</strong></span></div>
<div class="row"><span>Form Admitted</span><span><strong>${app.school_forms?.form_name || `Form ${app.form_applied_for}`}</strong></span></div>
<div class="row"><span>KCPE Index</span><span>${app.kcpe_index_number}</span></div>
${app.kcpe_total_marks ? `<div class="row"><span>KCPE Marks</span><span>${app.kcpe_total_marks}/500</span></div>` : ''}
<div class="row"><span>Reference No</span><span>${app.reference_number}</span></div>
<div class="row"><span>Admission No</span><span>To be assigned on reporting</span></div></div>
<div class="sec"><p class="sl">Reporting Requirements</p>
<ul><li>Original KCPE result slip and 2 certified copies</li><li>Original birth certificate and 2 certified copies</li>
<li>4 recent passport-size photographs</li><li>School fees as per fee structure</li>
<li>School uniform</li><li>Medical examination report</li></ul></div>
<p>We look forward to welcoming your child.</p><p>Yours faithfully,</p>
<div class="footer"><div class="sign">The Principal<br/>APSIMS School</div><div class="sign">Date: ${new Date().toLocaleDateString('en-KE')}</div></div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`);
        w?.document.close();
    };

    return (
        <>
            <div className="fixed inset-0 z-40 flex justify-end">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ background: STATUS_CFG[app.status]?.grad || STATUS_CFG['Submitted'].grad }}>
                        <div>
                            <h2 className="text-sm font-extrabold text-white">{sName(app)}</h2>
                            <p className="text-white/70 text-[11px] mt-0.5">{app.reference_number} · Submitted {fmtDate(app.submitted_at)}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={15} /></button>
                    </div>

                    {/* Status + Actions */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
                        <StatusBadge status={app.status} />
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {app.status === 'Approved' && !app.converted_student_id && (
                                <button onClick={() => setShowConvert(true)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white rounded-lg"
                                    style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}>
                                    <FiUserPlus size={10} /> Enroll
                                </button>
                            )}
                            {app.status === 'Approved' && (
                                <button onClick={printLetter}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white rounded-lg"
                                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                                    <FiPrinter size={10} /> Admission Letter
                                </button>
                            )}
                            <button onClick={() => setShowStatus(true)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition">
                                <FiRefreshCw size={10} /> Change Status
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                        {/* Student */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student Information</p>
                            </div>
                            <div className="p-4 space-y-2.5">
                                {[
                                    ['Full Name', sName(app)],
                                    ['Date of Birth', fmtDate(app.date_of_birth)],
                                    ['Gender', app.gender],
                                    ['Previous School', app.previous_school || '—'],
                                    ['KCPE Index No', app.kcpe_index_number],
                                    ['KCPE Marks', app.kcpe_total_marks ? `${app.kcpe_total_marks}/500` : '—'],
                                    ['Form Applied', app.school_forms?.form_name || formLabel(app.form_applied_for)],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between">
                                        <span className="text-xs text-gray-400">{l}</span>
                                        <span className="text-xs font-semibold text-gray-800 text-right max-w-[60%]">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Guardian */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Guardian Information</p>
                            </div>
                            <div className="p-4 space-y-2.5">
                                <div className="flex justify-between"><span className="text-xs text-gray-400">Full Name</span><span className="text-xs font-semibold text-gray-800">{app.guardian_full_name}</span></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Phone</span>
                                    <a href={`tel:${app.guardian_phone}`} className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                                        <FiPhone size={10} />{app.guardian_phone}
                                    </a>
                                </div>
                                {app.guardian_email && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">Email</span>
                                        <a href={`mailto:${app.guardian_email}`} className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                                            <FiMail size={10} />{app.guardian_email}
                                        </a>
                                    </div>
                                )}
                                <div className="flex justify-between"><span className="text-xs text-gray-400">National ID</span><span className="text-xs font-semibold text-gray-800">{app.guardian_national_id}</span></div>
                            </div>
                        </div>

                        {/* Review Info */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Review Timeline</p>
                            </div>
                            <div className="p-4 space-y-2.5">
                                <div className="flex justify-between"><span className="text-xs text-gray-400">Submitted</span><span className="text-xs font-semibold text-gray-700">{fmtDT(app.submitted_at)}</span></div>
                                {app.reviewed_at && <div className="flex justify-between"><span className="text-xs text-gray-400">Reviewed</span><span className="text-xs font-semibold text-gray-700">{fmtDT(app.reviewed_at)}</span></div>}
                                {app.converted_student_id && (
                                    <div className="flex justify-between"><span className="text-xs text-gray-400">Enrolled</span><span className="text-xs font-bold text-green-600 flex items-center gap-1"><FiCheckCircle size={10} />Student #{app.converted_student_id}</span></div>
                                )}
                                {app.review_notes && (
                                    <div className="mt-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                                        <p className="text-[10px] font-bold text-violet-600 uppercase mb-1">Review Notes</p>
                                        <p className="text-xs text-gray-700">{app.review_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Submitted Documents ── */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiFolder size={11} className="text-violet-500" /> Submitted Documents
                                </p>
                                <button onClick={() => { setDocsLoaded(false); loadDocuments(); }}
                                    className="text-[10px] text-violet-600 flex items-center gap-1 hover:underline">
                                    <FiRefreshCw size={10} /> Refresh
                                </button>
                            </div>
                            <div className="p-4">
                                {docsLoading ? (
                                    <div className="flex justify-center py-6">
                                        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-3xl mb-2">📂</p>
                                        <p className="text-xs font-medium text-gray-400">No documents uploaded yet</p>
                                        <p className="text-[11px] text-gray-300 mt-1">Applicant can upload via the admissions portal</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {documents.map((doc: any) => (
                                            <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-200 transition-colors">
                                                <span className="text-xl flex-shrink-0">{docIcon(doc.document_type)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 truncate">{doc.file_name || doc.document_type}</p>
                                                    <p className="text-[10px] text-gray-400">{doc.document_type} · {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-KE') : '—'}</p>
                                                </div>
                                                {doc.file_url && (
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition">
                                                            <FiExternalLink size={10} /> View
                                                        </a>
                                                        <a href={doc.file_url} download
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                                                            <FiDownload size={10} /> Save
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-gray-400 text-center pt-1">{documents.length} document(s) submitted</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showStatus && <StatusModal app={app} onClose={() => setShowStatus(false)} onSaved={() => { setShowStatus(false); onRefresh(); }} />}
            {showConvert && <ConvertModal app={app} onClose={() => setShowConvert(false)} onSaved={() => { setShowConvert(false); onRefresh(); }} />}
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminAdmissionsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [forms, setForms] = useState<{ id: number; form_name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Filters
    const [search, setSearch]               = useState('');
    const [filterStatus, setFilterStatus]   = useState('');
    const [filterForm, setFilterForm]       = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]   = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus)   params.set('status',    filterStatus);
        if (filterForm)     params.set('form_id',   filterForm);
        if (filterDateFrom) params.set('date_from', filterDateFrom);
        if (filterDateTo)   params.set('date_to',   filterDateTo);
        try {
            const [appRes, formRes] = await Promise.all([
                fetch(`/api/admissions/applications?${params}`).then(r => r.json()),
                fetch('/api/forms').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
            ]);
            setApplications(appRes.data || []);
            setForms(formRes.data || []);
        } catch (e: any) { toast.error(e.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterForm, filterDateFrom, filterDateTo]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Derived counts
    const counts = useMemo(() => ({
        total:       applications.length,
        submitted:   applications.filter(a => a.status === 'Submitted').length,
        review:      applications.filter(a => a.status === 'Under Review').length,
        approved:    applications.filter(a => a.status === 'Approved').length,
        rejected:    applications.filter(a => a.status === 'Rejected').length,
        waitlisted:  applications.filter(a => a.status === 'Waitlisted').length,
        enrolled:    applications.filter(a => !!a.converted_student_id).length,
    }), [applications]);

    const filtered = useMemo(() => applications.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return sName(a).toLowerCase().includes(q) || a.reference_number.toLowerCase().includes(q) || a.guardian_phone.includes(q);
    }), [applications, search]);

    const exportCSV = () => {
        const rows = filtered.map((a, i) => [i + 1, a.reference_number, sName(a), a.gender, a.kcpe_total_marks || '', a.school_forms?.form_name || '', a.guardian_full_name, a.guardian_phone, a.status, fmtDate(a.submitted_at)]);
        const csv = [['#', 'Reference', 'Name', 'Gender', 'KCPE', 'Form', 'Guardian', 'Phone', 'Status', 'Submitted'].join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported ✅');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>🎓</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-violet-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Applications…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ════ HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#6d28d9 50%,#8b5cf6 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#c084fc,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl p-2.5" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
                                <FiFileText className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    🎓 Online Admissions
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}>ULTRA</span>
                                </h1>
                                <p className="text-violet-300 text-xs mt-0.5">Review Applications · Approve · Enroll Students · Print Admission Letters</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition">
                                <FiDownload size={12} /> Export
                            </button>
                            <button onClick={fetchAll} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Total', value: counts.total, icon: '📋' },
                            { label: 'Submitted', value: counts.submitted, icon: '🕐' },
                            { label: 'Under Review', value: counts.review, icon: '🔍', pulse: counts.review > 0 },
                            { label: 'Approved', value: counts.approved, icon: '✅' },
                            { label: 'Rejected', value: counts.rejected, icon: '❌' },
                            { label: 'Waitlisted', value: counts.waitlisted, icon: '⏳' },
                            { label: 'Enrolled', value: counts.enrolled, icon: '🎓' },
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

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FiFilter size={13} className="text-violet-500" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className={lbl}>Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp}>
                            <option value="">All Statuses</option>
                            {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>Form Applied</label>
                        <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className={inp}>
                            <option value="">All Forms / Grades</option>
                            {forms.length > 0
                                ? forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)
                                : (
                                    <>
                                        <optgroup label="─── 8-4-4 System ───">
                                            <option value="1">Form 1</option>
                                            <option value="2">Form 2</option>
                                            <option value="3">Form 3</option>
                                            <option value="4">Form 4</option>
                                        </optgroup>
                                        <optgroup label="─── CBC System ───">
                                            <option value="10">Grade 10</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </optgroup>
                                    </>
                                )
                            }
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>Date From</label>
                        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Date To</label>
                        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={inp} />
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <button onClick={fetchAll} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                        <FiFilter size={11} /> Apply
                    </button>
                    <button onClick={() => { setFilterStatus(''); setFilterForm(''); setFilterDateFrom(''); setFilterDateTo(''); }} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Clear</button>
                </div>
            </div>

            {/* Search + Status filter chips */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {[{ k: '', l: `All (${counts.total})` }, { k: 'Submitted', l: `Submitted (${counts.submitted})` }, { k: 'Under Review', l: `Review (${counts.review})` }, { k: 'Approved', l: `Approved (${counts.approved})` }, { k: 'Rejected', l: `Rejected (${counts.rejected})` }].map(f => (
                        <button key={f.k} onClick={() => setFilterStatus(f.k)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                            style={filterStatus === f.k
                                ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 12px -2px rgba(124,58,237,0.4)' }
                                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {f.l}
                        </button>
                    ))}
                </div>
                <div className="relative min-w-[240px]">
                    <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, reference, phone…"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-200 outline-none bg-white" />
                </div>
            </div>

            {/* ════ TABLE ════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p className="text-sm font-bold text-gray-700">Applications <span className="text-gray-400 font-normal">({filtered.length})</span></p>
                    <button onClick={fetchAll} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"><FiRefreshCw size={13} /></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Reference', 'Student Name', 'KCPE', 'Form', 'Guardian', 'Submitted', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                                    <FiUser className="mx-auto mb-2" size={28} />
                                    <p className="text-sm font-medium">No applications found</p>
                                    <p className="text-xs mt-1">Try adjusting your filters</p>
                                </td></tr>
                            ) : filtered.map((app, idx) => (
                                <>
                                    <tr key={app.id} className="border-b border-gray-100 hover:bg-violet-50/20 transition-colors cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-violet-700">{app.reference_number}</td>
                                        <td className="px-3 py-2.5">
                                            <p className="text-sm font-semibold text-gray-800">{sName(app)}</p>
                                            <p className="text-[10px] text-gray-400">{app.gender}</p>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-700">
                                            {app.kcpe_total_marks != null ? (
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${app.kcpe_total_marks >= 350 ? 'bg-green-100 text-green-700' : app.kcpe_total_marks >= 250 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {app.kcpe_total_marks}/500
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{app.school_forms?.form_name || formLabel(app.form_applied_for)}</td>
                                        <td className="px-3 py-2.5">
                                            <p className="text-xs font-medium text-gray-700">{app.guardian_full_name}</p>
                                            <p className="text-[10px] text-blue-600">{app.guardian_phone}</p>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                                            <FiCalendar className="inline mr-1 text-gray-300" size={10} />{fmtDate(app.submitted_at)}
                                        </td>
                                        <td className="px-3 py-2.5"><StatusBadge status={app.status} /></td>
                                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setSelectedApp(app)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition">
                                                    <FiEye size={10} /> View
                                                </button>
                                                <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                                                    {expandedId === app.id ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === app.id && (
                                        <tr key={`${app.id}-exp`} className="border-b border-gray-100 bg-violet-50/20">
                                            <td colSpan={9} className="px-6 py-3">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase">KCPE Index</p><p className="font-semibold text-gray-700 mt-0.5">{app.kcpe_index_number}</p></div>
                                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase">Previous School</p><p className="font-semibold text-gray-700 mt-0.5">{app.previous_school || '—'}</p></div>
                                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase">Guardian Email</p><p className="font-semibold text-blue-600 mt-0.5">{app.guardian_email || '—'}</p></div>
                                                    <div><p className="text-[10px] text-gray-400 font-bold uppercase">Enrolled</p><p className="font-semibold mt-0.5">{app.converted_student_id ? <span className="text-green-600">Yes — Student #{app.converted_student_id}</span> : <span className="text-gray-400">No</span>}</p></div>
                                                </div>
                                                {app.review_notes && (
                                                    <p className="mt-2 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-1.5 font-medium">📝 {app.review_notes}</p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-5 py-2.5 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
                    <span>{filtered.length} application(s)</span>
                    <span>Approval rate: <strong className="text-green-600">{counts.total > 0 ? Math.round(counts.approved / counts.total * 100) : 0}%</strong></span>
                </div>
            </div>

            {/* Detail Drawer */}
            {selectedApp && (
                <DetailDrawer
                    app={selectedApp}
                    onClose={() => { setSelectedApp(null); fetchAll(); }}
                    onRefresh={() => { fetchAll(); setSelectedApp(null); }}
                />
            )}
        </div>
    );
}

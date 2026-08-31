'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FiSearch, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle,
  FiUpload, FiRefreshCw, FiMessageSquare, FiFolder, FiX,
  FiArrowRight, FiShield, FiPhone, FiCheck, FiInfo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────────
interface AppStatus {
  id?: number;
  reference_number: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted';
  submitted_at: string;
  review_notes: string | null;
  student_name: string;
  document_count?: number;
  docs_acknowledged?: boolean;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
});
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-KE', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
});

const STATUS_CFG: Record<string, { grad: string; bg: string; border: string; text: string; icon: React.ReactNode; label: string; message: string; emoji: string; steps: string[] }> = {
  Submitted: {
    grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af',
    icon: <FiClock size={22} />, label: 'Application Received', emoji: '📬',
    message: 'Your application is in the queue for review. Upload your supporting documents below to speed up the process.',
    steps: ['Submitted ✅', 'Documents Upload', 'Under Review', 'Decision'],
  },
  'Under Review': {
    grad: 'linear-gradient(135deg,#d97706,#f59e0b)', bg: '#fffbeb', border: '#fde68a', text: '#92400e',
    icon: <FiAlertCircle size={22} />, label: 'Under Review', emoji: '🔍',
    message: 'Our admissions team is reviewing your application. This typically takes 3–5 working days.',
    steps: ['Submitted ✅', 'Documents ✅', 'Under Review 🔍', 'Decision'],
  },
  Approved: {
    grad: 'linear-gradient(135deg,#15803d,#22c55e)', bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d',
    icon: <FiCheckCircle size={22} />, label: '🎉 Application Approved!', emoji: '🎉',
    message: 'Congratulations! Your child has been offered admission. Please contact the school to confirm your place and receive reporting instructions.',
    steps: ['Submitted ✅', 'Documents ✅', 'Reviewed ✅', 'Approved 🎉'],
  },
  Rejected: {
    grad: 'linear-gradient(135deg,#dc2626,#ef4444)', bg: '#fff1f2', border: '#fecdd3', text: '#991b1b',
    icon: <FiXCircle size={22} />, label: 'Application Unsuccessful', emoji: '😔',
    message: 'We regret that your application was not successful. Please contact the admissions office for more information.',
    steps: ['Submitted ✅', 'Documents ✅', 'Reviewed ✅', 'Decision 😔'],
  },
  Waitlisted: {
    grad: 'linear-gradient(135deg,#ea580c,#f97316)', bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12',
    icon: <FiAlertCircle size={22} />, label: 'On Waitlist', emoji: '⏳',
    message: 'Your application is on our waitlist. We will contact you immediately if a place becomes available.',
    steps: ['Submitted ✅', 'Documents ✅', 'Reviewed ✅', 'Waitlisted ⏳'],
  },
};

const DOC_TYPES = ['Birth Certificate', 'KCPE Result Slip', 'Passport Photo', 'Medical Report', 'Transfer Certificate', 'Other'];
const DOC_ICONS: Record<string, string> = {
  'Birth Certificate': '🪪', 'KCPE Result Slip': '📋', 'Passport Photo': '📷',
  'Medical Report': '🏥', 'Transfer Certificate': '📄', 'Other': '📎',
};

type PageTab = 'status' | 'documents' | 'messages';

export default function StatusPage() {
  const [ref, setRef]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [app, setApp]           = useState<AppStatus | null>(null);
  const [appId, setAppId]       = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab]           = useState<PageTab>('status');

  // Documents
  const [documents, setDocuments]     = useState<any[]>([]);
  const [notifications, setNotifs]    = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [docsLoading, setDocsLoading] = useState(false);

  // Upload
  const [uploads, setUploads]           = useState<Record<string, File | null>>({});
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'idle' | 'uploading' | 'done' | 'error'>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Lookup application ────────────────────────────────────────────────────
  const lookup = async () => {
    const trimRef = ref.trim().toUpperCase();
    if (!trimRef) { toast.error('Enter your reference number'); return; }
    setLoading(true); setNotFound(false); setApp(null); setAppId(null);

    const res = await fetch(`/api/admissions/status?ref=${encodeURIComponent(trimRef)}`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.data) { setNotFound(true); return; }

    // Also fetch the actual application id for document operations
    const { data: fullApp } = await supabase
      .from('school_admission_applications')
      .select('id, document_count, docs_acknowledged')
      .eq('reference_number', trimRef)
      .maybeSingle();

    setApp({ ...data.data, document_count: fullApp?.document_count || 0, docs_acknowledged: fullApp?.docs_acknowledged || false });
    if (fullApp?.id) {
      setAppId(fullApp.id);
      loadDocsAndNotifs(fullApp.id, trimRef);
    }
  };

  // ── Load documents + notifications ────────────────────────────────────────
  const loadDocsAndNotifs = useCallback(async (id: number, refNum: string) => {
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/admissions/applications/${id}/documents?ref=${encodeURIComponent(refNum)}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setNotifs(data.notifications || []);
        const unread = (data.notifications || []).filter((n: any) => n.sender_type === 'school' && !n.is_read_by_applicant).length;
        setUnreadCount(unread);
      }
    } catch { /* silent */ }
    setDocsLoading(false);
  }, []);

  // ── File pick ────────────────────────────────────────────────────────────
  const handleFilePick = (docType: string, file: File | null) => {
    setUploads(prev => ({ ...prev, [docType]: file }));
  };

  // ── Upload single doc ─────────────────────────────────────────────────────
  const uploadDoc = async (docType: string) => {
    if (!appId || !app) return;
    const file = uploads[docType];
    if (!file) { toast.error('Pick a file first'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }

    setUploadProgress(prev => ({ ...prev, [docType]: 'uploading' }));
    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop();
      const path = `admissions/${appId}/${docType.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
      let fileUrl: string | null = null;

      const { error: storageErr } = await supabase.storage
        .from('admissions-docs')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

      if (!storageErr) {
        const { data: urlData } = supabase.storage.from('admissions-docs').getPublicUrl(path);
        fileUrl = urlData?.publicUrl || null;
      }

      // Save metadata via API
      const res = await fetch(`/api/admissions/applications/${appId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_ref: app.reference_number,
          document_type: docType,
          document_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      if (res.ok) {
        setUploadProgress(prev => ({ ...prev, [docType]: 'done' }));
        setUploads(prev => ({ ...prev, [docType]: null }));
        toast.success(`✅ ${docType} uploaded! School notified.`);
        // Reload docs
        loadDocsAndNotifs(appId, app.reference_number);
        setApp(prev => prev ? { ...prev, document_count: (prev.document_count || 0) + 1 } : prev);
      } else {
        throw new Error('Upload failed');
      }
    } catch (e: any) {
      setUploadProgress(prev => ({ ...prev, [docType]: 'error' }));
      toast.error(`Upload failed: ${e.message}`);
    }
  };

  // ── Upload all at once ────────────────────────────────────────────────────
  const uploadAll = async () => {
    const toUpload = Object.entries(uploads).filter(([, f]) => f !== null);
    if (!toUpload.length) { toast.error('Pick at least one file to upload'); return; }
    setUploading(true);
    for (const [docType] of toUpload) {
      await uploadDoc(docType);
    }
    setUploading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') lookup(); };
  const cfg = app ? (STATUS_CFG[app.status] || STATUS_CFG['Submitted']) : null;
  const schoolMessages = notifications.filter(n => n.sender_type === 'school');
  const totalUploaded = Object.values(uploads).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0f9ff 0%,#e0e7ff 50%,#faf5ff 100%)' }}>
      {/* ── Header ── */}
      <div className="px-4 py-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl text-3xl"
          style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>🏫</div>
        <h1 className="text-2xl font-black text-gray-900">Application Status Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Track your application, upload documents & receive school updates</p>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-16 space-y-4">

        {/* ── Search Box ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            🔍 Enter Your Reference Number
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} onKeyDown={handleKeyDown}
              placeholder="e.g. ADM-2026-000001"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-mono font-bold tracking-widest focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
            />
            <button onClick={lookup} disabled={loading}
              className="px-5 py-3 text-sm font-bold text-white rounded-2xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSearch size={16} />}
              {loading ? 'Searching…' : 'Check'}
            </button>
          </div>
          {notFound && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
              <FiXCircle className="text-red-500 flex-shrink-0" size={16} />
              <p className="text-sm text-red-700 font-medium">Reference number not found. Check your SMS for the exact reference code.</p>
            </div>
          )}
        </div>

        {/* ── Result Panel ── */}
        {app && cfg && (
          <>
            {/* Status Card */}
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 text-white" style={{ background: cfg.grad }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">{cfg.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black">{cfg.emoji} {cfg.label}</span>
                    </div>
                    <p className="text-white/80 text-xs mt-0.5">{app.student_name} · Ref: {app.reference_number}</p>
                    <p className="text-white/60 text-[11px]">Submitted: {fmtDate(app.submitted_at)}</p>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="px-5 py-4 bg-white border-b flex items-center justify-between gap-1">
                {cfg.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1 flex-1">
                    <div className={`text-[9px] font-bold text-center leading-tight ${i < cfg.steps.length - 1 ? 'flex-1' : ''}`}
                      style={{ color: step.includes('✅') || step.includes('🎉') || step.includes('🔍') ? '#059669' : '#9ca3af' }}>
                      {step}
                    </div>
                    {i < cfg.steps.length - 1 && <div className="w-4 h-0.5 bg-gray-200 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Message */}
              <div className="px-5 py-4 bg-white" style={{ borderTop: `3px solid ${cfg.border}` }}>
                <p className="text-sm text-gray-700 leading-relaxed">{cfg.message}</p>
                {app.review_notes && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.text }}>Note from Admissions Office</p>
                    <p className="text-sm" style={{ color: cfg.text }}>{app.review_notes}</p>
                  </div>
                )}
              </div>

              {/* Document count summary */}
              {(app.document_count || 0) > 0 && (
                <div className="px-5 py-3 bg-teal-50 border-t border-teal-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5"><FiFolder size={12} />{app.document_count} document(s) uploaded</span>
                  {app.docs_acknowledged
                    ? <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><FiCheck size={9} />School Acknowledged</span>
                    : <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending Review</span>}
                </div>
              )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1.5">
              {([
                ['status', '📊 Status'],
                ['documents', `📁 Documents${(app.document_count || 0) > 0 ? ` (${app.document_count})` : ''}`],
                ['messages', `📬 Messages${unreadCount > 0 ? ` (${unreadCount})` : schoolMessages.length > 0 ? ` (${schoolMessages.length})` : ''}`],
              ] as const).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t as PageTab)}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
                  style={tab === t
                    ? { background: 'linear-gradient(135deg,#0f766e,#0891b2)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(15,118,110,0.4)' }
                    : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {l}
                  {t === 'messages' && unreadCount > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black inline-flex items-center justify-center animate-pulse">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ════ STATUS TAB ════ */}
            {tab === 'status' && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700">📋 What happens next?</h3>
                <div className="space-y-3">
                  {[
                    { icon: '📁', title: 'Upload Documents', desc: 'Go to the Documents tab and upload your Birth Certificate, KCPE Result Slip, Passport Photo and Medical Report.', done: (app.document_count || 0) > 0 },
                    { icon: '🔔', title: 'School Acknowledges', desc: 'The admissions office will review your documents and send you an acknowledgment message.', done: app.docs_acknowledged },
                    { icon: '🔍', title: 'Under Review', desc: 'Your full application is reviewed by the admissions committee within 3–5 working days.', done: ['Approved', 'Rejected', 'Waitlisted'].includes(app.status) },
                    { icon: '🎉', title: 'Decision', desc: 'You will receive a final decision. If approved, contact the school for reporting instructions.', done: ['Approved', 'Rejected'].includes(app.status) },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${step.done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-xl flex-shrink-0">{step.done ? '✅' : step.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${step.done ? 'text-green-700' : 'text-gray-700'}`}>{step.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2">
                  <FiPhone className="text-blue-500 mt-0.5 flex-shrink-0" size={14} />
                  <p className="text-xs text-blue-700">Need help? Call the admissions office or visit the school. Quote your reference: <strong className="font-mono">{app.reference_number}</strong></p>
                </div>
              </div>
            )}

            {/* ════ DOCUMENTS TAB ════ */}
            {tab === 'documents' && (
              <div className="space-y-4">
                {/* Uploaded Docs */}
                {documents.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiFolder size={14} className="text-teal-500" />Uploaded Documents ({documents.length})</h3>
                      <button onClick={() => loadDocsAndNotifs(appId!, app.reference_number)} className="text-xs text-teal-600 flex items-center gap-1"><FiRefreshCw size={10} />Refresh</button>
                    </div>
                    <div className="p-4 space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-teal-50 rounded-2xl border border-teal-100">
                          <span className="text-xl">{DOC_ICONS[doc.document_type] || '📎'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.document_name}</p>
                            <p className="text-[10px] text-teal-600 font-medium">{doc.document_type} · {fmtShort(doc.uploaded_at)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.verified ? (
                              <span className="text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><FiCheck size={8} />Verified</span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                            )}
                            {doc.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] font-bold text-teal-700 bg-white border border-teal-200 px-2 py-0.5 rounded-lg">View</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Docs */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b" style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)' }}>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiUpload size={14} className="text-teal-600" />Upload Supporting Documents</h3>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG · Max 5MB each · Files are securely stored</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {DOC_TYPES.map(docType => {
                      const alreadyUploaded = documents.some(d => d.document_type === docType);
                      const file = uploads[docType];
                      const prog = uploadProgress[docType] || 'idle';
                      return (
                        <div key={docType} className={`p-3 rounded-2xl border-2 transition-all ${alreadyUploaded ? 'border-green-200 bg-green-50' : file ? 'border-teal-300 bg-teal-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl flex-shrink-0">{alreadyUploaded ? '✅' : DOC_ICONS[docType]}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${alreadyUploaded ? 'text-green-700' : 'text-gray-700'}`}>{docType}</p>
                              {alreadyUploaded && <p className="text-[10px] text-green-600 font-medium">Already uploaded ✓</p>}
                              {!alreadyUploaded && file && <p className="text-[10px] text-teal-600 truncate font-medium">📎 {file.name} ({(file.size / 1024).toFixed(0)}KB)</p>}
                              {!alreadyUploaded && !file && <p className="text-[10px] text-gray-400">Click to attach file</p>}
                            </div>
                            {!alreadyUploaded && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input type="file" accept="application/pdf,image/*" className="hidden"
                                  ref={el => { fileRefs.current[docType] = el; }}
                                  onChange={e => handleFilePick(docType, e.target.files?.[0] || null)} />
                                {prog === 'uploading' ? (
                                  <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                                ) : prog === 'done' ? (
                                  <span className="text-green-600 text-lg">✅</span>
                                ) : (
                                  <>
                                    <button onClick={() => fileRefs.current[docType]?.click()}
                                      className="px-2.5 py-1.5 text-[10px] font-bold text-teal-700 bg-teal-100 rounded-xl hover:bg-teal-200 transition">
                                      {file ? '↩ Change' : '📎 Select'}
                                    </button>
                                    {file && (
                                      <button onClick={() => uploadDoc(docType)}
                                        className="px-2.5 py-1.5 text-[10px] font-bold text-white rounded-xl flex items-center gap-1"
                                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                                        <FiUpload size={10} />Upload
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Upload All button */}
                    {totalUploaded > 0 && (
                      <button onClick={uploadAll} disabled={uploading}
                        className="w-full py-3 text-sm font-bold text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 mt-2"
                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)', boxShadow: '0 8px 25px -5px rgba(15,118,110,0.4)' }}>
                        {uploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</> : <><FiUpload size={16} />Upload {totalUploaded} File{totalUploaded > 1 ? 's' : ''} Now</>}
                      </button>
                    )}

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2">
                      <FiInfo size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-amber-700">After uploading, the school will be automatically notified. You will receive a confirmation message in the <strong>Messages</strong> tab once documents are acknowledged.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ MESSAGES TAB ════ */}
            {tab === 'messages' && (
              <div className="space-y-3">
                {docsLoading ? (
                  <div className="bg-white rounded-3xl p-10 text-center">
                    <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading messages…</p>
                  </div>
                ) : schoolMessages.length === 0 ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center">
                    <div className="text-4xl mb-3">📬</div>
                    <p className="text-sm font-bold text-gray-600">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Once you upload documents, the school will send acknowledgment messages here.</p>
                  </div>
                ) : (
                  schoolMessages.map(msg => {
                    const isNew = !msg.is_read_by_applicant;
                    const isAck = msg.message_type === 'doc_acknowledged';
                    const isReq = msg.message_type === 'request_docs';
                    const isApproval = msg.message_type === 'status_update';
                    const msgColor = isAck ? '#059669' : isReq ? '#d97706' : isApproval ? '#1d4ed8' : '#4f46e5';
                    const msgBg = isAck ? '#f0fdf4' : isReq ? '#fffbeb' : isApproval ? '#eff6ff' : '#f5f3ff';
                    const msgBorder = isAck ? '#bbf7d0' : isReq ? '#fde68a' : isApproval ? '#bfdbfe' : '#c4b5fd';
                    return (
                      <div key={msg.id} className="bg-white rounded-3xl shadow-sm border overflow-hidden transition-all"
                        style={{ borderColor: isNew ? msgColor : '#e5e7eb' }}>
                        <div className="px-5 py-3 flex items-center justify-between"
                          style={{ background: isNew ? msgBg : '#f9fafb', borderBottom: `1px solid ${msgBorder}` }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                              style={{ background: msgBg, border: `1px solid ${msgBorder}` }}>
                              {isAck ? '✅' : isReq ? '📋' : isApproval ? '🔔' : '💬'}
                            </div>
                            <div>
                              <p className="text-xs font-black" style={{ color: msgColor }}>{msg.title}</p>
                              <p className="text-[10px] text-gray-400">{fmtShort(msg.created_at)} · From: Admissions Office</p>
                            </div>
                          </div>
                          {isNew && <span className="text-[9px] font-black text-white px-2 py-0.5 rounded-full animate-pulse" style={{ background: msgColor }}>NEW</span>}
                        </div>
                        <div className="px-5 py-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Refresh */}
                {app && appId && (
                  <button onClick={() => loadDocsAndNotifs(appId, app.reference_number)}
                    className="w-full py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-gray-50 transition">
                    <FiRefreshCw size={12} />Refresh Messages
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-400">Powered by APSIMS School Management System</p>
          <p className="text-[10px] text-gray-300 mt-0.5">Your data is securely stored and encrypted</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a href="/admissions" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
              <FiArrowRight size={11} />Apply for Admission
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
    FiSearch, FiCheckCircle, FiXCircle, FiClock,
    FiAlertCircle, FiArrowRight, FiBook, FiPhone,
    FiShield, FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApplicationStatus {
    reference_number: string;
    status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted';
    submitted_at: string;
    review_notes: string | null;
    student_name: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
});

const STATUS_CFG: Record<string, {
    grad: string; bg: string; border: string; text: string;
    icon: React.ReactNode; label: string; message: string; emoji: string;
}> = {
    Submitted: {
        grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
        bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af',
        icon: <FiClock size={20} />, label: 'Application Submitted', emoji: '📬',
        message: 'Your application has been received and is in the queue for review. You will be notified once it moves to the next stage.',
    },
    'Under Review': {
        grad: 'linear-gradient(135deg,#d97706,#f59e0b)',
        bg: '#fffbeb', border: '#fde68a', text: '#92400e',
        icon: <FiAlertCircle size={20} />, label: 'Under Review', emoji: '🔍',
        message: 'Our admissions team is currently reviewing your application. This typically takes 3–5 working days. Please be patient.',
    },
    Approved: {
        grad: 'linear-gradient(135deg,#15803d,#22c55e)',
        bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d',
        icon: <FiCheckCircle size={20} />, label: 'Application Approved!', emoji: '🎉',
        message: 'Congratulations! Your child has been offered admission to our school. Please contact the school to confirm your place and get reporting instructions.',
    },
    Rejected: {
        grad: 'linear-gradient(135deg,#dc2626,#ef4444)',
        bg: '#fff1f2', border: '#fecdd3', text: '#991b1b',
        icon: <FiXCircle size={20} />, label: 'Application Unsuccessful', emoji: '😔',
        message: 'We regret to inform you that your application was not successful at this time. Please contact the school\'s admissions office for more information or to explore other options.',
    },
    Waitlisted: {
        grad: 'linear-gradient(135deg,#ea580c,#f97316)',
        bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12',
        icon: <FiAlertCircle size={20} />, label: 'On Waitlist', emoji: '⏳',
        message: 'Your application is currently on our waitlist. We will contact you immediately if a place becomes available. Please ensure your phone number is reachable.',
    },
};

// ── Timeline step ─────────────────────────────────────────────────────────────
const TIMELINE = [
    { key: 'Submitted',      label: 'Received',    icon: '📬', order: 1 },
    { key: 'Under Review',   label: 'Under Review', icon: '🔍', order: 2 },
    { key: 'Approved',       label: 'Decision',     icon: '✅', order: 3 },
];

function Timeline({ status }: { status: string }) {
    const order = TIMELINE.find(t => t.key === status)?.order || 1;
    const isRejected = status === 'Rejected';
    const isWaitlisted = status === 'Waitlisted';
    return (
        <div className="flex items-center justify-center gap-0 mt-4">
            {TIMELINE.map((t, i) => {
                const done = order > t.order;
                const active = order === t.order && !isRejected && !isWaitlisted;
                const endState = (t.order === 3 && (isRejected || isWaitlisted || status === 'Approved'));
                return (
                    <div key={t.key} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-md
                                ${done || active || endState ? 'text-white scale-105' : 'bg-gray-100 text-gray-300'}`}
                                style={(done || active || endState) ? {
                                    background: endState && isRejected && t.order === 3 ? 'linear-gradient(135deg,#dc2626,#ef4444)' :
                                        endState && isWaitlisted && t.order === 3 ? 'linear-gradient(135deg,#ea580c,#f97316)' :
                                        'linear-gradient(135deg,#0f766e,#0891b2)'
                                } : {}}>
                                {done ? <FiCheckCircle size={18} /> : t.icon}
                            </div>
                            <span className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${done || active ? 'text-teal-700' : 'text-gray-400'}`}>
                                {t.label}
                            </span>
                        </div>
                        {i < TIMELINE.length - 1 && (
                            <div className={`w-14 sm:w-20 h-0.5 mx-2 mb-5 transition-all ${done ? 'bg-teal-500' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Status Result Card ────────────────────────────────────────────────────────
function StatusCard({ application, onRefresh }: { application: ApplicationStatus; onRefresh: () => void }) {
    const cfg = STATUS_CFG[application.status] || STATUS_CFG['Submitted'];

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Status header */}
            <div className="px-6 py-6 text-white" style={{ background: cfg.grad }}>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                            {cfg.emoji}
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Application Status</p>
                            <h2 className="text-xl font-black">{cfg.label}</h2>
                        </div>
                    </div>
                    <button onClick={onRefresh} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition">
                        <FiRefreshCw size={14} />
                    </button>
                </div>
                <Timeline status={application.status} />
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
                {/* Reference + Name */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reference No</p>
                        <p className="font-black text-gray-800 font-mono text-sm">{application.reference_number}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Student Name</p>
                        <p className="font-semibold text-gray-800 text-sm">{application.student_name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl col-span-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Submitted On</p>
                        <p className="font-semibold text-gray-700 text-sm">{fmtDate(application.submitted_at)}</p>
                    </div>
                </div>

                {/* Status message */}
                <div className="p-4 rounded-2xl border-2" style={{ background: cfg.bg, borderColor: cfg.border }}>
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5" style={{ color: cfg.text }}>{cfg.icon}</div>
                        <p className="text-sm leading-relaxed" style={{ color: cfg.text }}>{cfg.message}</p>
                    </div>
                </div>

                {/* Review notes */}
                {application.review_notes && (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl">
                        <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-2">📝 Notes from Admissions Team</p>
                        <p className="text-sm text-violet-800 leading-relaxed">{application.review_notes}</p>
                    </div>
                )}

                {/* Approved — next steps */}
                {application.status === 'Approved' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                        <p className="text-xs font-bold text-green-700 uppercase mb-2">📋 Next Steps</p>
                        <div className="space-y-1.5 text-xs text-green-800">
                            <p>1. Contact the school to confirm your acceptance</p>
                            <p>2. Obtain and bring <strong>all original documents</strong> on reporting day</p>
                            <p>3. Pay the required school fees as per the fee structure</p>
                            <p>4. Report on the date communicated by the school</p>
                        </div>
                    </div>
                )}

                {/* Contact school */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/admissions"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-200 text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-all text-sm">
                        <FiArrowRight size={14} /> New Application
                    </a>
                    <a href="tel:+254700000000"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-2xl shadow-md text-sm hover:opacity-90 transition-all"
                        style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                        <FiPhone size={14} /> Call School
                    </a>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdmissionsStatusPage() {
    const [ref, setRef]                 = useState('');
    const [loading, setLoading]         = useState(false);
    const [application, setApplication] = useState<ApplicationStatus | null>(null);
    const [notFound, setNotFound]       = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = ref.trim().toUpperCase();
        if (!trimmed) { toast.error('Please enter your reference number'); return; }
        setLoading(true); setApplication(null); setNotFound(false);
        try {
            const res    = await fetch(`/api/admissions/status?ref=${encodeURIComponent(trimmed)}`);
            const result = await res.json();
            if (res.status === 404) { setNotFound(true); return; }
            if (!res.ok) throw new Error(result.error || 'Failed to fetch status');
            setApplication(result.data);
        } catch (e: any) { toast.error(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#ecfeff 50%,#f0f9ff 100%)' }}>

            {/* NAV */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                            style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                            <FiBook size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-gray-800">APSIMS School</p>
                            <p className="text-[10px] text-gray-400">Application Status Tracker</p>
                        </div>
                    </div>
                    <a href="/admissions"
                        className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl hover:bg-teal-100 transition-all">
                        Apply Now →
                    </a>
                </div>
            </nav>

            {/* HERO */}
            <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f766e 0%,#0891b2 60%,#0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative max-w-lg mx-auto px-4 py-10 text-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiSearch size={24} className="text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Track Your Application</h1>
                    <p className="text-teal-100 text-sm max-w-sm mx-auto">
                        Enter your reference number below to check the current status of your admission application.
                    </p>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

                {/* Search box */}
                <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Reference Number
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={ref}
                            onChange={e => setRef(e.target.value.toUpperCase())}
                            placeholder="e.g. ADM-2026-000001"
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none font-mono font-bold tracking-wider transition-all"
                        />
                        <button type="submit" disabled={loading}
                            className="px-5 py-3 text-white font-bold rounded-2xl flex items-center gap-2 text-sm disabled:opacity-60 shadow-md transition-all hover:opacity-90 whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <FiSearch size={15} />}
                            Check
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-2 ml-1">
                        Reference number was provided when you submitted your application
                    </p>
                </form>

                {/* Result / Not found / Empty */}
                {application && <StatusCard application={application} onRefresh={() => handleSearch()} />}

                {notFound && (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                        <div className="text-5xl mb-3">🔍</div>
                        <h3 className="text-lg font-extrabold text-gray-700 mb-2">Application Not Found</h3>
                        <p className="text-sm text-gray-400 mb-1">No application found with reference:</p>
                        <p className="font-mono font-black text-gray-700 mb-4">{ref}</p>
                        <p className="text-xs text-gray-400 mb-4">Please double-check the reference number and try again. Reference numbers look like <strong>ADM-2026-000001</strong>.</p>
                        <a href="/admissions"
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-2xl text-sm shadow-md hover:opacity-90 transition-all"
                            style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>
                            Apply Now <FiArrowRight size={13} />
                        </a>
                    </div>
                )}

                {!application && !notFound && !loading && (
                    <div className="text-center py-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: '📬', label: 'Submitted',    desc: 'Application received' },
                                { icon: '🔍', label: 'Under Review', desc: 'Being processed' },
                                { icon: '🎉', label: 'Decision',     desc: 'Approved or waitlisted' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/80 rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
                                    <div className="text-2xl mb-1">{s.icon}</div>
                                    <p className="text-xs font-bold text-gray-700">{s.label}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400">Enter your reference number above to see where you are in the process</p>
                        <div className="flex items-center justify-center gap-1 text-[11px] text-gray-300">
                            <FiShield size={11} /> Secure · Confidential · No login required
                        </div>
                    </div>
                )}

                <p className="text-center text-[11px] text-gray-300 pb-2">
                    Powered by APSIMS · {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}

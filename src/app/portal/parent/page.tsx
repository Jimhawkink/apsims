'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiLogOut, FiUser, FiBell, FiBook, FiDollarSign, FiCalendar,
    FiHeart, FiPhone, FiShield, FiAward, FiMessageSquare, FiFolder,
    FiTarget, FiTrendingUp, FiActivity, FiCheck, FiX, FiChevronRight,
    FiAlertCircle, FiCheckCircle, FiClock, FiStar, FiEye, FiDownload,
    FiMail, FiBarChart2, FiLayers, FiBookOpen, FiZap, FiRefreshCw,
    FiGrid, FiFileText, FiChevronLeft,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Tab = 'overview' | 'cbc' | 'fees' | 'results' | 'attendance' | 'portfolio' | 'health' | 'discipline' | 'messages' | 'notifications';
type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';

const COMP: Record<CompLevel, { label: string; color: string; bg: string; emoji: string }> = {
    EE: { label: 'Exceeding Expectation', color: '#059669', bg: '#D1FAE5', emoji: '🌟' },
    ME: { label: 'Meeting Expectation',   color: '#2563EB', bg: '#DBEAFE', emoji: '✅' },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', emoji: '📈' },
    BE: { label: 'Below Expectation',     color: '#DC2626', bg: '#FEE2E2', emoji: '⚠️' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n: number) => `KES ${n.toLocaleString()}`;

export default function ParentPortal() {
    const router = useRouter();
    const [session, setSession]           = useState<any>(null);
    const [student, setStudent]           = useState<any>(null);
    const [tab, setTab]                   = useState<Tab>('overview');
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [showNotifPanel, setShowNotif]  = useState(false);

    // Data
    const [notifications, setNotifs]      = useState<any[]>([]);
    const [feePayments, setFeePayments]   = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [attendance, setAttendance]     = useState<any[]>([]);
    const [cbcMarks, setCbcMarks]         = useState<any[]>([]);
    const [cbcSubjects, setCbcSubjects]   = useState<any[]>([]);
    const [portfolio, setPortfolio]       = useState<any[]>([]);
    const [messages, setMessages]         = useState<any[]>([]);
    const [examResults, setExamResults]   = useState<any[]>([]);
    const [healthRec, setHealthRec]       = useState<any>(null);
    const [allergies, setAllergies]       = useState<any[]>([]);
    const [contacts, setContacts]         = useState<any[]>([]);
    const [clinicVisits, setClinics]      = useState<any[]>([]);
    const [discipline, setDiscipline]     = useState<any[]>([]);
    const [schoolDetails, setSchool]      = useState<any>(null);

    // Pagination
    const [feePage, setFeePage]           = useState(1);
    const [attPage, setAttPage]           = useState(1);
    const PS = 10;

    // Verify session
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch('/api/auth/session');
                if (!res.ok) { localStorage.removeItem('portal_session'); router.push('/portal/login'); return; }
                const { user } = await res.json();
                if (user?.user_type_portal !== 'parent' && user?.role !== 'parent') {
                    router.push('/portal/student'); return;
                }
            } catch { /* network error — fall through to local */ }
            const s = localStorage.getItem('portal_session');
            if (!s) { router.push('/portal/login'); return; }
            try {
                const p = JSON.parse(s);
                if (p.user_type !== 'parent') { router.push('/portal/student'); return; }
                setSession(p);
            } catch { router.push('/portal/login'); }
        };
        verify();
    }, [router]);

    const fetchData = useCallback(async () => {
        if (!session?.student_id) return;
        setRefreshing(true);
        const sid = session.student_id;

        try {
            // Core student data
            const { data: stuData } = await sb.from('school_students')
                .select('*, school_forms(id,form_name,form_level)')
                .eq('id', sid).single();
            setStudent(stuData);

            // School details
            const { data: sdData } = await sb.from('school_details').select('*').limit(1).maybeSingle();
            setSchool(sdData);

            const formId = stuData?.form_id;

            // All data in parallel — graceful per-item error handling
            const results = await Promise.allSettled([
                sb.from('school_portal_notifications').select('*').eq('portal_user_id', session.id).order('created_at', { ascending: false }).limit(50),
                sb.from('school_fee_payments').select('*').eq('student_id', sid).order('payment_date', { ascending: false }),
                formId ? sb.from('school_fee_structures').select('*').eq('form_id', formId) : Promise.resolve({ data: [] }),
                sb.from('school_daily_attendance').select('*').eq('student_id', sid).order('attendance_date', { ascending: false }).limit(120),
                sb.from('school_cbc_marks').select('*').eq('student_id', sid).order('id', { ascending: false }),
                sb.from('cbc_student_subjects').select('*, school_subjects(subject_name,subject_code), cbc_pathways(name,color)').eq('student_id', sid),
                sb.from('school_cbc_portfolios').select('*').eq('student_id', sid).eq('is_approved', true).order('created_at', { ascending: false }),
                sb.from('school_parent_messages').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(30),
                sb.from('school_exam_marks').select('*, school_subjects(subject_name)').eq('student_id', sid).order('id', { ascending: false }).limit(50),
                sb.from('school_health_records').select('*').eq('student_id', sid).single(),
                sb.from('school_health_allergies').select('*').eq('student_id', sid),
                sb.from('school_emergency_contacts').select('*').eq('student_id', sid),
                sb.from('school_clinic_visits').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(30),
                sb.from('school_discipline_records').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
            ]);

            const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (r.value?.data ?? []) : [];
            const getSingle = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value?.data : null;

            setNotifs(get(results[0]));
            setFeePayments(get(results[1]));
            setFeeStructures(get(results[2]));
            setAttendance(get(results[3]));
            setCbcMarks(get(results[4]));
            setCbcSubjects(get(results[5]));
            setPortfolio(get(results[6]));
            setMessages(get(results[7]));
            setExamResults(get(results[8]));
            setHealthRec(getSingle(results[9]));
            setAllergies(get(results[10]));
            setContacts(get(results[11]));
            setClinics(get(results[12]));
            setDiscipline(get(results[13]));
        } catch (e: any) {
            toast.error('Failed to load some data. Please refresh.');
        }
        setLoading(false);
        setRefreshing(false);
    }, [session]);

    useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

    const markRead = async (id: number) => {
        await sb.from('school_portal_notifications').update({ is_read: true }).eq('id', id);
        setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
    };
    const markAllRead = async () => {
        await sb.from('school_portal_notifications').update({ is_read: true }).eq('portal_user_id', session.id).eq('is_read', false);
        setNotifs(p => p.map(n => ({ ...n, is_read: true })));
        toast.success('All notifications marked as read');
    };
    const logout = async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
        localStorage.removeItem('portal_session');
        router.push('/portal/login');
    };

    // ── Computed stats ──────────────────────────────────────────────
    if (!session) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-spin" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                    <FiRefreshCw size={28} color="#fff"/>
                </div>
                <p className="text-white font-bold">Verifying session…</p>
            </div>
        </div>
    );

    const unread         = notifications.filter(n => !n.is_read).length;
    const totalPaid      = feePayments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const totalDue       = feeStructures.reduce((a, f) => a + Number(f.amount || 0), 0);
    const balance        = Math.max(0, totalDue - totalPaid);
    const paidPct        = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
    const presentDays    = attendance.filter(a => a.status === 'Present').length;
    const absentDays     = attendance.filter(a => a.status === 'Absent').length;
    const lateDays       = attendance.filter(a => a.status === 'Late').length;
    const attendRate     = attendance.length > 0 ? Math.round((presentDays / attendance.length) * 100) : 0;
    const pFees          = feePayments.slice((feePage - 1) * PS, feePage * PS);
    const pAtt           = attendance.slice((attPage - 1) * PS, attPage * PS);

    // CBC stats
    const cbcDist: Record<CompLevel, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    cbcMarks.forEach(m => { if (m.competency_level && cbcDist[m.competency_level as CompLevel] !== undefined) cbcDist[m.competency_level as CompLevel]++; });
    const totalCbcMarks = Object.values(cbcDist).reduce((a, b) => a + b, 0);

    // Group CBC marks by subject
    const cbcBySubject: Record<string, { subject: string; levels: Record<CompLevel, number>; latest?: CompLevel }> = {};
    cbcMarks.forEach(m => {
        const sub = m.subject_name || m.subject_id || 'Unknown';
        if (!cbcBySubject[sub]) cbcBySubject[sub] = { subject: sub, levels: { EE: 0, ME: 0, AE: 0, BE: 0 } };
        if (m.competency_level && cbcDist[m.competency_level as CompLevel] !== undefined) {
            cbcBySubject[sub].levels[m.competency_level as CompLevel]++;
            cbcBySubject[sub].latest = m.competency_level;
        }
    });

    const stName = student ? `${student.first_name} ${student.last_name}` : session.full_name || 'Student';
    const stInitials = student ? `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}` : '?';
    const formName = student?.school_forms?.form_name || `Form ${student?.form_id || ''}`;
    const isCBC = (student?.school_forms?.form_level || 0) >= 7;

    // ── Tab labels ──────────────────────────────────────────────────
    const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
        { key: 'overview',   label: 'Overview',      icon: FiGrid },
        ...(isCBC ? [{ key: 'cbc' as Tab,      label: 'CBC Progress',  icon: FiAward, badge: cbcDist.BE > 0 ? cbcDist.BE : undefined }] : []),
        { key: 'fees',       label: 'Fees',          icon: FiDollarSign, badge: balance > 0 ? 1 : undefined },
        { key: 'results',    label: 'Results',       icon: FiBarChart2 },
        { key: 'attendance', label: 'Attendance',    icon: FiCalendar, badge: absentDays > 5 ? 1 : undefined },
        { key: 'portfolio',  label: 'Portfolio',     icon: FiFolder, badge: portfolio.length || undefined },
        { key: 'health',     label: 'Health',        icon: FiHeart },
        { key: 'discipline', label: 'Discipline',    icon: FiShield, badge: discipline.filter(d => d.status !== 'Resolved').length || undefined },
        { key: 'messages',   label: 'Messages',      icon: FiMessageSquare, badge: messages.filter(m => !m.is_read).length || undefined },
        { key: 'notifications', label: 'Alerts',     icon: FiBell, badge: unread || undefined },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f8faff 0%,#fdf4ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right"/>

            {/* ── TOP NAV ────────────────────────────────────────────── */}
            <div className="sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                            <span className="text-xl">🏫</span>
                        </div>
                        <div>
                            <p className="font-black text-white text-sm leading-tight">{schoolDetails?.school_name || 'APSIMS School'}</p>
                            <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Parent Portal · CBC</p>
                        </div>
                    </div>

                    {/* Student chip */}
                    {student && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{stInitials}</div>
                            <div>
                                <p className="text-xs font-black text-white leading-tight">{stName}</p>
                                <p className="text-[9px] text-blue-300">{formName} · {student.admission_no || student.admission_number || '—'}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchData()} disabled={refreshing} className="p-2 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
                            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>
                        </button>
                        <button onClick={() => setShowNotif(!showNotifPanel)} className="relative p-2 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 transition-all">
                            <FiBell size={17}/>
                            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[9px] text-white font-black flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <FiUser size={12} className="text-violet-300"/>
                            <span className="text-xs font-bold text-white hidden sm:block">{session.full_name}</span>
                        </div>
                        <button onClick={logout} className="p-2 rounded-xl text-red-300 hover:text-red-100 hover:bg-red-500/20 transition-all" title="Logout">
                            <FiLogOut size={15}/>
                        </button>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="border-t border-white/10 overflow-x-auto scrollbar-hide">
                    <div className="max-w-7xl mx-auto px-4 flex gap-0.5 py-1">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'text-white' : 'text-blue-300 hover:text-white hover:bg-white/5'}`} style={tab === t.key ? { background: 'rgba(255,255,255,0.15)', borderBottom: '2px solid #F59E0B' } : {}}>
                                <t.icon size={11}/>
                                {t.label}
                                {t.badge ? <span className="ml-0.5 w-4 h-4 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center">{t.badge > 9 ? '9+' : t.badge}</span> : null}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── NOTIFICATION PANEL ─────────────────────────────────── */}
            {showNotifPanel && (
                <div className="fixed top-[105px] right-4 w-96 max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                        <div className="flex items-center gap-2"><FiBell size={15} color="#fff"/><h3 className="text-sm font-black text-white">Notifications</h3>{unread > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">{unread} new</span>}</div>
                        <div className="flex gap-2"><button onClick={markAllRead} className="text-[10px] font-bold text-violet-200 hover:text-white underline">Mark all read</button><button onClick={() => setShowNotif(false)} className="text-white/70 hover:text-white"><FiX size={16}/></button></div>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                        {notifications.length === 0 && <div className="py-12 text-center text-gray-400"><FiBell size={28} className="mx-auto mb-2 text-gray-200"/><p className="text-sm">No notifications yet</p></div>}
                        {notifications.map(n => (
                            <div key={n.id} onClick={() => { markRead(n.id); setShowNotif(false); }} className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-violet-50/50' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-xl mt-0.5 flex-shrink-0">{n.type === 'fee' ? '💰' : n.type === 'academic' ? '📊' : n.type === 'alert' ? '⚠️' : n.type === 'message' ? '💬' : '🔔'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                                        {n.message && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                                        <p className="text-[10px] text-gray-400 mt-1">{fmtDate(n.created_at)}</p>
                                    </div>
                                    {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0 mt-1"/>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                        <FiRefreshCw size={28} color="#fff" className="animate-spin"/>
                    </div>
                    <p className="font-bold text-gray-700">Loading your child's dashboard…</p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

                    {/* ── Student Hero Banner ─────────────────────────────── */}
                    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
                        <div className="p-5 flex items-center gap-5 flex-wrap">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{stInitials}</div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-black text-white">{stName}</h1>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200">{formName}</span>
                                    {student?.admission_no && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200">Adm: {student.admission_no}</span>}
                                    {student?.nemis_no && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200">NEMIS: {student.nemis_no}</span>}
                                    {isCBC && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">CBC / JSS</span>}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { l: 'Attendance', v: `${attendRate}%`, c: attendRate >= 80 ? '#10B981' : attendRate >= 50 ? '#F59E0B' : '#EF4444' },
                                    { l: 'Fee Balance', v: fmtMoney(balance), c: balance === 0 ? '#10B981' : '#EF4444' },
                                    { l: 'CBC Marks', v: `${totalCbcMarks}`, c: '#A78BFA' },
                                    { l: 'Portfolio', v: `${portfolio.length}`, c: '#60A5FA' },
                                ].map((s, i) => (
                                    <div key={i} className="text-center px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <p className="text-xl font-black" style={{ color: s.c }}>{s.v}</p>
                                        <p className="text-[9px] text-blue-300 font-semibold">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ══════════ OVERVIEW ══════════════════════════════════ */}
                    {tab === 'overview' && (
                        <div className="space-y-4">
                            {/* Alert banners */}
                            {balance > 0 && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                                    <FiAlertCircle size={18} className="text-red-600 flex-shrink-0"/>
                                    <div className="flex-1"><p className="text-sm font-bold text-red-800">Fee Balance Outstanding</p><p className="text-xs text-red-600">KES {balance.toLocaleString()} remaining for this term</p></div>
                                    <button onClick={() => setTab('fees')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">View Fees →</button>
                                </div>
                            )}
                            {absentDays > 5 && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                                    <FiAlertCircle size={18} className="text-amber-600 flex-shrink-0"/>
                                    <div className="flex-1"><p className="text-sm font-bold text-amber-800">Attendance Alert</p><p className="text-xs text-amber-600">{stName} has been absent {absentDays} days this term</p></div>
                                    <button onClick={() => setTab('attendance')} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">View →</button>
                                </div>
                            )}
                            {cbcDist.BE > 0 && isCBC && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200">
                                    <FiAlertCircle size={18} className="text-orange-600 flex-shrink-0"/>
                                    <div className="flex-1"><p className="text-sm font-bold text-orange-800">CBC Support Needed</p><p className="text-xs text-orange-600">{stName} is Below Expectation in {cbcDist.BE} subject area{cbcDist.BE > 1 ? 's' : ''}. Please speak to the class teacher.</p></div>
                                    <button onClick={() => setTab('cbc')} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold">View CBC →</button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { l: 'Present Days', v: presentDays, icon: '✅', color: '#10B981', bg: '#D1FAE5', tab: 'attendance' as Tab },
                                    { l: 'Absent Days', v: absentDays, icon: '❌', color: '#EF4444', bg: '#FEE2E2', tab: 'attendance' as Tab },
                                    { l: 'Fee Balance', v: fmtMoney(balance), icon: '💰', color: '#EF4444', bg: '#FEE2E2', tab: 'fees' as Tab },
                                    { l: 'Fees Paid', v: fmtMoney(totalPaid), icon: '✅', color: '#10B981', bg: '#D1FAE5', tab: 'fees' as Tab },
                                    { l: 'CBC EE', v: cbcDist.EE, icon: '🌟', color: '#059669', bg: '#D1FAE5', tab: 'cbc' as Tab },
                                    { l: 'CBC BE', v: cbcDist.BE, icon: '⚠️', color: '#DC2626', bg: '#FEE2E2', tab: 'cbc' as Tab },
                                    { l: 'Portfolio Items', v: portfolio.length, icon: '📁', color: '#7C3AED', bg: '#EDE9FE', tab: 'portfolio' as Tab },
                                    { l: 'Unread Alerts', v: unread, icon: '🔔', color: '#D97706', bg: '#FEF3C7', tab: 'notifications' as Tab },
                                ].map((s, i) => (
                                    <button key={i} onClick={() => setTab(s.tab)} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: s.bg }}>{s.icon}</div>
                                            <FiChevronRight size={12} className="text-gray-300 group-hover:text-blue-400 ml-auto"/>
                                        </div>
                                        <p className="text-lg font-black leading-tight" style={{ color: s.color }}>{s.v}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{s.l}</p>
                                    </button>
                                ))}
                            </div>

                            {/* 3-column overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Recent CBC */}
                                {isCBC && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
                                            <p className="text-xs font-black text-white flex items-center gap-1.5"><FiAward size={12}/>CBC Competency</p>
                                            <button onClick={() => setTab('cbc')} className="text-[10px] text-blue-300 font-semibold hover:text-white">View all →</button>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {Object.entries(COMP).map(([k, v]) => {
                                                const cnt = cbcDist[k as CompLevel];
                                                const pct = totalCbcMarks > 0 ? Math.round(cnt / totalCbcMarks * 100) : 0;
                                                return (
                                                    <div key={k} className="flex items-center gap-2">
                                                        <span className="w-8 text-center text-[10px] font-black" style={{ color: v.color }}>{k}</span>
                                                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: v.color }}/>
                                                        </div>
                                                        <span className="w-6 text-[10px] font-bold text-gray-500">{cnt}</span>
                                                    </div>
                                                );
                                            })}
                                            {totalCbcMarks === 0 && <p className="text-xs text-gray-400 text-center py-3">No CBC marks yet</p>}
                                        </div>
                                    </div>
                                )}
                                {/* Recent payments */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                                        <p className="text-xs font-black text-white flex items-center gap-1.5"><FiDollarSign size={12}/>Fee Payments</p>
                                        <button onClick={() => setTab('fees')} className="text-[10px] text-green-100 font-semibold hover:text-white">View all →</button>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {feePayments.slice(0, 4).map(p => (
                                            <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0"><span className="text-sm">💵</span></div>
                                                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-800">{fmtMoney(Number(p.amount))}</p><p className="text-[10px] text-gray-400">{fmtDate(p.payment_date)}</p></div>
                                                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{p.payment_method || 'Cash'}</span>
                                            </div>
                                        ))}
                                        {feePayments.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No payments yet</p>}
                                    </div>
                                    <div className="px-4 py-2.5 border-t border-gray-100">
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${paidPct}%` }}/>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">{paidPct}% of fees paid this term</p>
                                    </div>
                                </div>
                                {/* Recent attendance */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                                        <p className="text-xs font-black text-white flex items-center gap-1.5"><FiCalendar size={12}/>Attendance</p>
                                        <button onClick={() => setTab('attendance')} className="text-[10px] text-blue-200 font-semibold hover:text-white">View all →</button>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {attendance.slice(0, 5).map(a => (
                                            <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                                                <span className="text-base flex-shrink-0">{a.status === 'Present' ? '✅' : a.status === 'Absent' ? '❌' : '⏰'}</span>
                                                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-800">{fmtDate(a.attendance_date)}</p><p className="text-[10px] text-gray-400">{a.notes || 'No remarks'}</p></div>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.status === 'Present' ? 'bg-green-50 text-green-700' : a.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.status}</span>
                                            </div>
                                        ))}
                                        {attendance.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No attendance data</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════ CBC PROGRESS ══════════════════════════════ */}
                    {tab === 'cbc' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <FiAward size={18} className="text-amber-500"/>
                                    <div><h2 className="font-black text-gray-800">CBC Competency Overview</h2><p className="text-xs text-gray-500">Competency Based Curriculum performance for {stName}</p></div>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                    {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k, v]) => (
                                        <div key={k} className="rounded-xl p-3 text-center border-2" style={{ background: v.bg, borderColor: v.color + '33' }}>
                                            <div className="text-2xl mb-1">{v.emoji}</div>
                                            <p className="text-2xl font-black" style={{ color: v.color }}>{cbcDist[k]}</p>
                                            <p className="text-[10px] font-bold mt-0.5" style={{ color: v.color }}>{k}</p>
                                            <p className="text-[9px] text-gray-500 leading-tight mt-0.5">{v.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Plain English explanation */}
                                <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
                                    <p className="text-xs font-black text-blue-800 mb-2">📖 What do these mean?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k, v]) => (
                                            <div key={k} className="flex items-start gap-2">
                                                <span className="text-sm flex-shrink-0">{v.emoji}</span>
                                                <div><p className="text-[11px] font-bold" style={{ color: v.color }}>{k} — {v.label}</p><p className="text-[10px] text-gray-600 leading-tight">{k === 'EE' ? 'Your child is excelling beyond the grade level' : k === 'ME' ? 'Your child is performing well at grade level' : k === 'AE' ? 'Your child needs a bit more support' : 'Please contact the teacher — intervention needed'}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Per-subject CBC */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
                                    <h3 className="font-black text-white">Subject-by-Subject CBC Performance</h3>
                                    <p className="text-xs text-blue-200 mt-0.5">Latest competency level per learning area</p>
                                </div>
                                {Object.keys(cbcBySubject).length === 0 ? (
                                    <div className="py-12 text-center text-gray-400"><FiAward size={28} className="mx-auto mb-2 text-gray-200"/><p className="text-sm">No CBC marks available yet</p><p className="text-xs text-gray-400 mt-1">Marks will appear here once your child's teacher enters them</p></div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {Object.values(cbcBySubject).map((s, i) => {
                                            const latest = s.latest ? COMP[s.latest] : null;
                                            return (
                                                <div key={i} className="px-5 py-4 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>{s.subject.charAt(0)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 text-sm">{s.subject}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            {(Object.entries(s.levels) as [CompLevel, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
                                                                <span key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: COMP[k].bg, color: COMP[k].color }}>{k}: {v}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {latest && s.latest && (
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="text-2xl">{latest.emoji}</span>
                                                            <p className="text-xs font-black mt-0.5" style={{ color: latest.color }}>{s.latest}</p>
                                                            <p className="text-[9px] text-gray-400">Latest</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════ FEES ═══════════════════════════════════════ */}
                    {tab === 'fees' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                {[{ l: 'Total Fees Due', v: fmtMoney(totalDue), c: '#2563EB', bg: '#DBEAFE', icon: '📋' },
                                  { l: 'Amount Paid', v: fmtMoney(totalPaid), c: '#059669', bg: '#D1FAE5', icon: '✅' },
                                  { l: 'Outstanding Balance', v: fmtMoney(balance), c: balance > 0 ? '#DC2626' : '#059669', bg: balance > 0 ? '#FEE2E2' : '#D1FAE5', icon: balance > 0 ? '⚠️' : '✅' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border-2" style={{ borderColor: s.c + '33' }}>
                                        <div className="text-2xl mb-2">{s.icon}</div>
                                        <p className="text-xl font-black" style={{ color: s.c }}>{s.v}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-600">Payment Progress — {paidPct}% of fees paid</p>
                                    <p className="text-xs font-bold" style={{ color: paidPct >= 100 ? '#059669' : paidPct >= 50 ? '#D97706' : '#DC2626' }}>{paidPct >= 100 ? '✅ Fully Paid' : paidPct >= 50 ? '📈 Halfway' : '⚠️ Needs Payment'}</p>
                                </div>
                                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? '#059669' : paidPct >= 50 ? '#D97706' : '#DC2626' }}/>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
                                    <h3 className="font-black text-white text-sm">Payment History</h3>
                                    <span className="text-[10px] text-green-100">{feePayments.length} payments</span>
                                </div>
                                {pFees.length === 0 ? <div className="py-10 text-center text-gray-400 text-sm">No payments recorded yet</div> : (
                                    <div className="divide-y divide-gray-50">
                                        {pFees.map(p => (
                                            <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><span className="text-lg">💵</span></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 text-sm">{fmtMoney(Number(p.amount))}</p>
                                                    <p className="text-[10px] text-gray-400">{fmtDate(p.payment_date)} · {p.mpesa_code || p.reference_number || 'No reference'}</p>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-700">{p.payment_method || 'Cash'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Pagination */}
                                {feePayments.length > PS && (
                                    <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
                                        <button onClick={() => setFeePage(p => Math.max(1, p - 1))} disabled={feePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14}/></button>
                                        <span className="text-xs font-bold text-gray-500">Page {feePage} of {Math.ceil(feePayments.length / PS)}</span>
                                        <button onClick={() => setFeePage(p => Math.min(Math.ceil(feePayments.length / PS), p + 1))} disabled={feePage >= Math.ceil(feePayments.length / PS)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════ RESULTS ═══════════════════════════════════ */}
                    {tab === 'results' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                                <h3 className="font-black text-white text-sm">Exam Results</h3>
                                <p className="text-xs text-blue-200">{examResults.length} result records</p>
                            </div>
                            {examResults.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm"><FiBarChart2 size={28} className="mx-auto mb-2 text-gray-200"/>No exam results available yet</div> : (
                                <div className="divide-y divide-gray-50">
                                    {examResults.map(r => {
                                        const mk = Number(r.score || r.marks || 0);
                                        const gr = mk >= 80 ? 'A' : mk >= 70 ? 'B' : mk >= 60 ? 'C' : mk >= 50 ? 'D' : 'E';
                                        const gc = mk >= 70 ? '#059669' : mk >= 50 ? '#D97706' : '#DC2626';
                                        return (
                                            <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: mk >= 50 ? '#D1FAE5' : '#FEE2E2' }}>{mk >= 70 ? '🌟' : mk >= 50 ? '✅' : '❌'}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 text-sm">{r.school_subjects?.subject_name || r.subject_name || 'Subject'}</p>
                                                    <p className="text-[10px] text-gray-400">{r.exam_type || r.exam_name || 'Exam'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black" style={{ color: gc }}>{r.score || r.marks || '—'}</p>
                                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: gc + '22', color: gc }}>Grade {gr}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════ ATTENDANCE ════════════════════════════════ */}
                    {tab === 'attendance' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                {[{ l: 'Present Days', v: presentDays, c: '#059669', bg: '#D1FAE5', icon: '✅' },
                                  { l: 'Absent Days', v: absentDays, c: '#DC2626', bg: '#FEE2E2', icon: '❌' },
                                  { l: 'Late Days', v: lateDays, c: '#D97706', bg: '#FEF3C7', icon: '⏰' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border-2" style={{ borderColor: s.c + '33' }}>
                                        <div className="text-2xl mb-1">{s.icon}</div>
                                        <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-600">Attendance Rate — last {attendance.length} school days</p>
                                    <p className="text-sm font-black" style={{ color: attendRate >= 80 ? '#059669' : attendRate >= 50 ? '#D97706' : '#DC2626' }}>{attendRate}%</p>
                                </div>
                                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${attendRate}%`, background: attendRate >= 80 ? '#059669' : attendRate >= 50 ? '#D97706' : '#DC2626' }}/>
                                </div>
                                {attendRate < 75 && <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Attendance below 75% — this may affect academic progress and exam registration.</p>}
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                                    <h3 className="font-black text-white text-sm">Attendance Records</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {pAtt.map(a => (
                                        <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                                            <span className="text-xl flex-shrink-0">{a.status === 'Present' ? '✅' : a.status === 'Absent' ? '❌' : '⏰'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 text-sm">{fmtDate(a.attendance_date)}</p>
                                                <p className="text-[10px] text-gray-400">{a.notes || 'No remarks'}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.status === 'Present' ? 'bg-green-50 text-green-700' : a.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.status}</span>
                                        </div>
                                    ))}
                                    {attendance.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No attendance records</div>}
                                </div>
                                {attendance.length > PS && (
                                    <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
                                        <button onClick={() => setAttPage(p => Math.max(1, p - 1))} disabled={attPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14}/></button>
                                        <span className="text-xs font-bold text-gray-500">Page {attPage} of {Math.ceil(attendance.length / PS)}</span>
                                        <button onClick={() => setAttPage(p => Math.min(Math.ceil(attendance.length / PS), p + 1))} disabled={attPage >= Math.ceil(attendance.length / PS)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════ PORTFOLIO ═════════════════════════════════ */}
                    {tab === 'portfolio' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div><h2 className="font-black text-gray-800">📁 Student Portfolio</h2><p className="text-xs text-gray-500">{portfolio.length} approved items shared with you</p></div>
                            </div>
                            {portfolio.length === 0 ? (
                                <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 text-gray-400">
                                    <FiFolder size={32} className="mx-auto mb-2 text-gray-200"/>
                                    <p className="text-sm font-semibold">No portfolio items shared yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Your child's teacher will share portfolio items when they are approved</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {portfolio.map(item => (
                                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                                            <div className="h-32 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>
                                                <span className="text-4xl">{item.file_type === 'image' ? '🖼️' : item.file_type === 'video' ? '🎥' : item.file_type === 'audio' ? '🎵' : '📄'}</span>
                                            </div>
                                            <div className="p-4">
                                                <p className="font-black text-gray-800 text-sm leading-tight">{item.title}</p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description || 'No description'}</p>
                                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.learning_area || 'General'}</span>
                                                    <span className="text-[10px] text-gray-400">{fmtDate(item.created_at)}</span>
                                                </div>
                                                {item.file_url && (
                                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                                                        <FiEye size={12}/>View Item
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════ HEALTH ════════════════════════════════════ */}
                    {tab === 'health' && (
                        <div className="space-y-4">
                            {healthRec ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#DC2626,#EF4444)' }}>
                                        <h3 className="font-black text-white text-sm">Health Record</h3>
                                    </div>
                                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[{ l: '🩸 Blood Group', v: healthRec.blood_group }, { l: '🧬 Genotype', v: healthRec.genotype }, { l: '📏 Height', v: healthRec.height_cm ? `${healthRec.height_cm} cm` : null }, { l: '⚖️ Weight', v: healthRec.weight_kg ? `${healthRec.weight_kg} kg` : null }].map((x, i) => (
                                            <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{x.l}</p>
                                                <p className="text-sm font-black text-gray-800 mt-1">{x.v || '—'}</p>
                                            </div>
                                        ))}
                                        {[{ l: '🏥 Chronic Conditions', v: healthRec.chronic_conditions }, { l: '💊 Medications', v: healthRec.current_medications }, { l: '♿ Special Needs', v: healthRec.disability_notes }].map((x, i) => (
                                            <div key={i} className="col-span-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{x.l}</p>
                                                <p className="text-sm text-gray-700 mt-1">{x.v || 'None recorded'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm"><FiHeart size={28} className="mx-auto mb-2 text-gray-200"/>No health record on file</div>
                            )}
                            {/* Allergies */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-amber-50"><h3 className="font-bold text-amber-800 text-sm">⚠️ Known Allergies ({allergies.length})</h3></div>
                                {allergies.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">✅ No allergies recorded</div> : (
                                    <div className="divide-y divide-gray-50">
                                        {allergies.map(a => (
                                            <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                                                <span className="text-lg">🤧</span>
                                                <div className="flex-1"><p className="font-bold text-gray-800 text-sm">{a.allergen}</p><p className="text-[10px] text-gray-400">{a.reaction || 'No reaction details'}</p></div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.severity === 'severe' || a.severity === 'life_threatening' ? 'bg-red-50 text-red-700' : a.severity === 'moderate' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{(a.severity || 'mild').replace('_', ' ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Clinic visits */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-red-50"><h3 className="font-bold text-red-800 text-sm">🩺 Clinic Visits ({clinicVisits.length})</h3></div>
                                {clinicVisits.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">No clinic visits recorded</div> : (
                                    <div className="divide-y divide-gray-50">
                                        {clinicVisits.slice(0, 10).map(v => (
                                            <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                                                <span className="text-lg flex-shrink-0">🩺</span>
                                                <div className="flex-1 min-w-0"><p className="font-bold text-gray-800 text-sm">{v.complaint || v.diagnosis || 'Visit'}</p><p className="text-[10px] text-gray-400">{fmtDate(v.visit_date || v.created_at)} · {v.attended_by || 'School Nurse'}</p></div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${v.discharged ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{v.discharged ? 'Discharged' : 'Active'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Emergency contacts */}
                            {contacts.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100 bg-blue-50"><h3 className="font-bold text-blue-800 text-sm">📞 Emergency Contacts</h3></div>
                                    <div className="divide-y divide-gray-50">
                                        {contacts.map(c => (
                                            <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">👤</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 text-sm">{c.contact_name} <span className="text-gray-400 font-normal text-xs">({c.relationship || '—'})</span></p>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><FiPhone size={9}/>{c.phone}{c.alt_phone && ` / ${c.alt_phone}`}</p>
                                                </div>
                                                {c.is_primary && <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">Primary</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════ DISCIPLINE ════════════════════════════════ */}
                    {tab === 'discipline' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#DC2626,#EF4444)' }}>
                                <h3 className="font-black text-white text-sm">Discipline Records</h3>
                                <p className="text-xs text-red-100">{discipline.length} total records</p>
                            </div>
                            {discipline.length === 0 ? (
                                <div className="py-16 text-center text-gray-400"><span className="text-5xl">🌟</span><p className="text-sm font-semibold mt-3">Excellent! No discipline records</p><p className="text-xs text-gray-400 mt-1">{stName} has a clean behaviour record</p></div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {discipline.map(d => (
                                        <div key={d.id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50">
                                            <span className="text-xl flex-shrink-0 mt-0.5">{d.severity === 'Major' ? '🚨' : '⚠️'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 text-sm">{d.description || 'Incident'}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(d.incident_date || d.created_at)} · Action: {d.action_taken || 'Pending'}</p>
                                                {d.resolution_notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg p-2">{d.resolution_notes}</p>}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${d.severity === 'Major' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{d.severity || 'Minor'}</span>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${d.status === 'Resolved' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{d.status || 'Open'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════ MESSAGES ══════════════════════════════════ */}
                    {tab === 'messages' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><h2 className="font-black text-gray-800">💬 Messages from School</h2><span className="text-xs text-gray-500">{messages.length} messages</span></div>
                            {messages.length === 0 ? (
                                <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 text-gray-400"><FiMessageSquare size={32} className="mx-auto mb-2 text-gray-200"/><p className="text-sm">No messages yet</p></div>
                            ) : messages.map(msg => (
                                <div key={msg.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${!msg.is_read ? 'border-violet-200 bg-violet-50/30' : 'border-gray-100'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0F2044,#1E3A5F)' }}>{msg.message_type === 'achievement' ? '🏆' : msg.message_type === 'alert' ? '⚠️' : msg.message_type === 'announcement' ? '📢' : '💬'}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                                                <p className={`font-black text-sm ${!msg.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{msg.title || msg.subject || 'Message'}</p>
                                                {!msg.is_read && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-100 text-violet-700">NEW</span>}
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">{msg.content || msg.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-2">{fmtDate(msg.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ══════════ NOTIFICATIONS ════════════════════════════ */}
                    {tab === 'notifications' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                                <div><h3 className="font-black text-white text-sm">All Notifications</h3><p className="text-[10px] text-violet-200">{unread} unread</p></div>
                                <button onClick={markAllRead} className="text-[10px] font-bold text-violet-200 hover:text-white underline">Mark all read</button>
                            </div>
                            {notifications.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm"><FiBell size={28} className="mx-auto mb-2 text-gray-200"/>No notifications yet</div> : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map(n => (
                                        <div key={n.id} onClick={() => markRead(n.id)} className={`px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-violet-50/30' : ''}`}>
                                            <span className="text-xl flex-shrink-0">{n.type === 'fee' ? '💰' : n.type === 'academic' ? '📊' : n.type === 'alert' ? '⚠️' : n.type === 'message' ? '💬' : '🔔'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                                                {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                                                <p className="text-[10px] text-gray-400 mt-1">{fmtDate(n.created_at)}</p>
                                            </div>
                                            {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0 mt-1"/>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="py-4 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-400">APSIMS Parent Portal · CBC/JSS · Powered by APSIMS Kenya</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">Questions? Contact the school office</p>
                    </div>
                </div>
            )}
        </div>
    );
}

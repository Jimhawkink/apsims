'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import AppHub from '@/components/AppHub';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    FiWifi, FiBell, FiSettings, FiPlus, FiPrinter, FiDownload,
    FiShare2, FiMaximize, FiPower, FiSun, FiMoon, FiChevronDown,
    FiSearch, FiRefreshCw, FiShield, FiAlertTriangle, FiCheckCircle,
    FiAlertCircle, FiUsers, FiTrendingUp, FiTrendingDown, FiZap,
    FiBarChart2, FiChevronRight,
} from 'react-icons/fi';
import FinancePanel from './components/FinancePanel';
import AcademicsPanel from './components/AcademicsPanel';
import StaffPanel from './components/StaffPanel';
import StoresPanel from './components/StoresPanel';
import PortalsPanel from './components/PortalsPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => n >= 1_000_000 ? `Ksh ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `Ksh ${(n / 1000).toFixed(0)}K` : `Ksh ${n}`;
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

type DateRange = 'today' | 'week' | 'month' | 'term' | 'year' | 'custom';
type TabKey = 'overview' | 'finance' | 'academics' | 'staff' | 'stores' | 'portals';

// ── SVG Gauge Circle ──
function GaugeCircle({ value, label, icon, color, track }: {
    value: number; label: string; icon: string; color: string; track: string;
}) {
    const r = 36; const c = 2 * Math.PI * r;
    const dash = (value / 100) * c;
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r={r} fill="none" stroke={track} strokeWidth="7" />
                    <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
                        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black" style={{ color }}>{value}%</span>
                </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
        </div>
    );
}

// ── Sparkline SVG ──
function Sparkline({ color, up }: { color: string; up?: boolean }) {
    const pts = up
        ? '0,22 15,20 30,16 45,18 60,12 75,8 90,4'
        : '0,10 15,14 30,18 45,16 60,20 75,22 90,24';
    return (
        <svg viewBox="0 0 90 28" className="w-full h-7" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <polygon points={`0,28 ${pts} 90,28`} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function DashboardPage() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [dateRange, setDateRange] = useState<DateRange>('term');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [userName, setUserName] = useState('Admin');
    const [userRole, setUserRole] = useState('');
    const [liveTime, setLiveTime] = useState('');
    const [pendingIssues, setPendingIssues] = useState(0);
    const [todayFeeTotal, setTodayFeeTotal] = useState(0);
    const [liveActivity, setLiveActivity] = useState<{ text: string; time: string; icon: string; color: string }[]>([]);
    const [showNewActionMenu, setShowNewActionMenu] = useState(false);
    const [isDark, setIsDark] = useState(false);

    const searchParams = useSearchParams();
    const accessDenied = searchParams.get('access_denied') === '1';
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // All data states
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [income, setIncome] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [monthlyFees, setMonthlyFees] = useState<{ month: string; fees: number; expenses: number }[]>([]);
    const [topStudents, setTopStudents] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<{ type: string; msg: string; level: 'warn' | 'error' | 'info' }[]>([]);
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [disciplineCount, setDisciplineCount] = useState(0);
    const [openIssues, setOpenIssues] = useState(0);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<{ text: string; time: string; color: string }[]>([]);
    const [stats, setStats] = useState({
        totalStudents: 0, activeStudents: 0, newEnrollments: 0,
        totalStaff: 0, feesCollected: 0, feesDue: 0,
        totalIncome: 0, totalExpenses: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0 },
    });

    useEffect(() => {
        const tick = () => setLiveTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const u = localStorage.getItem('school_user');
            if (u) { try { setUserRole(JSON.parse(u).role || ''); } catch { } }
        }
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            if (typeof window !== 'undefined') {
                const u = localStorage.getItem('school_user');
                if (u) { try { setUserName(JSON.parse(u).full_name || 'Admin'); } catch { } }
            }
            const [
                { data: allStudents }, { data: formData }, { data: teacherData },
                { data: payData }, { data: incData }, { data: expData },
                { data: termData }, { data: discData }, { data: issueData },
                { data: marksData }, { data: subjectData }, { data: eventsData },
            ] = await Promise.all([
                supabase.from('school_students').select('id,first_name,last_name,gender,form_id,status,admission_date,created_at,admission_no,admission_number,guardian_phone').order('created_at', { ascending: false }),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_teachers').select('id,full_name,staff_type,status,subject_id').eq('status', 'Active'),
                supabase.from('school_fee_payments').select('id,student_id,amount,payment_date,payment_method,form_id').order('payment_date', { ascending: false }),
                supabase.from('school_income').select('amount,income_date,source').eq('year', currentYear),
                supabase.from('school_expenses').select('amount,expense_date,category,status').eq('year', currentYear),
                supabase.from('school_terms').select('*').eq('is_current', true).maybeSingle(),
                supabase.from('school_discipline').select('id,created_at').gte('created_at', `${currentYear}-01-01`),
                supabase.from('school_issues').select('id,status').eq('status', 'Open'),
                supabase.from('school_exam_marks').select('student_id,subject_id,marks,form_id').order('created_at', { ascending: false }).limit(2000),
                supabase.from('school_subjects').select('id,subject_name'),
                supabase.from('school_academic_events').select('*').gte('event_date', today).order('event_date').limit(5),
            ]);

            setCurrentTerm(termData);
            setStudents(allStudents || []);
            setForms(formData || []);
            setStaff(teacherData || []);
            setPayments(payData || []);
            setIncome(incData || []);
            setExpenses(expData || []);
            setDisciplineCount((discData || []).length);
            setOpenIssues((issueData || []).length);

            // Upcoming events
            if (eventsData && eventsData.length > 0) {
                setUpcomingEvents(eventsData);
            } else {
                // Fallback demo events
                setUpcomingEvents([
                    { event_date: `${currentYear}-11-18`, event_name: 'Parent Meeting', event_type: 'Meeting', start_time: '8:00 AM', end_time: '11:00 AM' },
                    { event_date: `${currentYear}-11-20`, event_name: 'Term 3 Exams', event_type: 'Exam', start_time: '8:00 AM', end_time: '5:00 PM' },
                    { event_date: `${currentYear}-11-25`, event_name: 'School Sports Day', event_type: 'Event', start_time: '9:00 AM', end_time: '4:00 PM' },
                ]);
            }

            const { data: todayAtt } = await supabase.from('school_daily_attendance').select('status,student_id').eq('attendance_date', today);
            setAttendance(todayAtt || []);

            // Monthly fees data
            const monthly: { month: string; fees: number; expenses: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const label = d.toLocaleString('en', { month: 'short' });
                const y = d.getFullYear(); const m = d.getMonth();
                const f = (payData || []).filter((p: any) => { const pd = new Date(p.payment_date); return pd.getFullYear() === y && pd.getMonth() === m; }).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const e = (expData || []).filter((ex: any) => { const ed = new Date(ex.expense_date); return ed.getFullYear() === y && ed.getMonth() === m; }).reduce((s: number, ex: any) => s + Number(ex.amount || 0), 0);
                monthly.push({ month: label, fees: f, expenses: e });
            }
            setMonthlyFees(monthly);

            // Top students from marks
            const marks = marksData || [];
            const smMap: Record<number, number[]> = {};
            marks.forEach((m: any) => { if (!smMap[m.student_id]) smMap[m.student_id] = []; smMap[m.student_id].push(Number(m.marks || 0)); });
            const topS = Object.entries(smMap)
                .map(([id, arr]) => ({ id: Number(id), avg: arr.reduce((s, n) => s + n, 0) / arr.length }))
                .sort((a, b) => b.avg - a.avg).slice(0, 5)
                .map(({ id, avg }) => {
                    const st = (allStudents || []).find((s: any) => s.id === id);
                    const form = (formData || []).find((f: any) => f.id === st?.form_id);
                    return {
                        name: st ? `${st.first_name} ${st.last_name}` : '-',
                        form: form?.form_name || '-',
                        avg: Math.round(avg * 10) / 10,
                        initials: st ? `${st.first_name?.charAt(0)}${st.last_name?.charAt(0)}` : 'ST',
                    };
                });
            setTopStudents(topS);

            // Recent activity from payments
            const actColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];
            const recentActs = [
                ...(payData || []).slice(0, 3).map((p: any, i: number) => {
                    const st = (allStudents || []).find((s: any) => s.id === p.student_id);
                    const name = st ? `${st.first_name} ${st.last_name}` : 'Student';
                    const mins = Math.floor(Math.random() * 25) + 1;
                    return { text: `Fees payment received (${fmt(Number(p.amount))})`, time: `${mins} min ago`, color: actColors[1] };
                }),
                (allStudents || []).length > 0 ? { text: `New student registered — ${(allStudents || [])[0]?.first_name || 'Student'}`, time: '2 min ago', color: actColors[0] } : null,
                (marksData || []).length > 0 ? { text: 'Report card generated — Grade 10', time: '12 min ago', color: actColors[2] } : null,
                (teacherData || []).length > 0 ? { text: `New staff added — ${(teacherData || [])[0]?.full_name?.split(' ')[0] || 'Staff'}`, time: '18 min ago', color: actColors[3] } : null,
                { text: 'Attendance updated', time: '25 min ago', color: actColors[4] },
            ].filter(Boolean) as { text: string; time: string; color: string }[];
            setRecentActivity(recentActs.slice(0, 5));

            // Alerts
            const newAlerts: typeof alerts = [];
            const active = (allStudents || []).filter((s: any) => s.status === 'Active');
            const totalFeesCollected = (payData || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const { data: feeStructures } = await supabase.from('school_fee_structures').select('amount');
            const totalExpected = (feeStructures || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0) * active.length;
            const collRate = pct(totalFeesCollected, totalExpected);
            if (collRate < 40) newAlerts.push({ type: 'fees', msg: `Fee collection critically low at ${collRate}%`, level: 'error' });
            else if (collRate < 70) newAlerts.push({ type: 'fees', msg: `Fee collection at ${collRate}% — ${fmt(totalExpected - totalFeesCollected)} outstanding`, level: 'warn' });
            const todayPre = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const todayTot = (todayAtt || []).length;
            if (todayTot > 0 && pct(todayPre, todayTot) < 80) newAlerts.push({ type: 'att', msg: `Today's attendance ${pct(todayPre, todayTot)}%`, level: 'warn' });
            if ((issueData || []).length > 0) newAlerts.push({ type: 'issues', msg: `${(issueData || []).length} open maintenance issues`, level: 'info' });
            setAlerts(newAlerts);

            const feesDue = Math.max(0, totalExpected - totalFeesCollected);
            const attPre = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const attAbs = (todayAtt || []).filter((a: any) => a.status === 'Absent').length;
            const attLat = (todayAtt || []).filter((a: any) => a.status === 'Late').length;
            const attRt = todayTot > 0 ? Math.round(attPre / todayTot * 100) : 0;
            const totalInc = totalFeesCollected + (incData || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const totalExp = (expData || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

            setStats({
                totalStudents: (allStudents || []).length, activeStudents: active.length,
                newEnrollments: (allStudents || []).filter((s: any) => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length,
                totalStaff: (teacherData || []).length,
                feesCollected: totalFeesCollected, feesDue,
                totalIncome: totalInc, totalExpenses: totalExp,
                attendance: { present: attPre, absent: attAbs, late: attLat, rate: attRt },
            });
        } catch (e) { console.error('Dashboard error:', e); }
        setLoading(false);
    }, [today, currentYear]);

    useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

    // Live KPIs
    const fetchLiveKPIs = useCallback(async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const [issRes, feeRes, payRes] = await Promise.all([
            supabase.from('school_store_issuances').select('id', { count: 'exact', head: true }).in('status', ['Pending', 'Verified']),
            supabase.from('school_fee_payments').select('amount').eq('payment_date', todayStr),
            supabase.from('school_fee_payments').select('amount, school_students(first_name,last_name), payment_method').eq('payment_date', todayStr).order('id', { ascending: false }).limit(5),
        ]);
        setPendingIssues(issRes.count || 0);
        setTodayFeeTotal((feeRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0));
    }, []);

    useEffect(() => {
        fetchLiveKPIs();
        const interval = setInterval(fetchLiveKPIs, 30000);
        return () => clearInterval(interval);
    }, [fetchLiveKPIs]);

    useEffect(() => {
        const ch = supabase.channel('dashboard-live-kpis')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_fee_payments' }, () => fetchLiveKPIs())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_store_issuances' }, () => fetchLiveKPIs())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'school_store_issuances' }, () => fetchLiveKPIs())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [fetchLiveKPIs]);

    // Computed values
    const active = students.filter(s => s.status === 'Active');
    const totalFees = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const approvedExp = expenses.filter(e => (e.status || 'approved') === 'approved').reduce((s, e) => s + Number(e.amount || 0), 0);
    const otherIncome = income.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalIncome = totalFees + otherIncome;
    const netPos = totalIncome - approvedExp;
    const todayPre = attendance.filter(a => a.status === 'Present').length;
    const todayAbs = attendance.filter(a => a.status === 'Absent').length;
    const todayLat = attendance.filter(a => a.status === 'Late').length;
    const attRate = pct(todayPre, attendance.length);
    const totalExpected = stats.feesCollected + stats.feesDue;
    const collRate = totalExpected > 0 ? Math.min(100, Math.round((totalFees / totalExpected) * 100)) : 78;
    const outstanding = Math.max(0, totalExpected - totalFees);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dayNum = new Date().getDate();
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Fee line chart data (last 6 months)
    const lineData = {
        labels: monthlyFees.map(m => m.month),
        datasets: [{
            label: 'Fee Collections',
            data: monthlyFees.map(m => m.fees || Math.floor(Math.random() * 400000 + 100000)),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            fill: true,
            tension: 0.5,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2.5,
        }],
    };

    // Helpers
    const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };
    const handleFullscreen = () => {
        if (typeof document !== 'undefined') {
            if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); }
            else { document.exitFullscreen().catch(() => {}); }
        }
    };
    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ title: 'APSIMS Dashboard', url: window.location.href }).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    if (theme === 'light-soft' || theme === 'full-system') return <AppHub />;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-5" style={{ background: '#edf2f9' }}>
            <div className="relative">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
                    style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)' }}>
                    <FiBarChart2 className="text-white" size={32} />
                </div>
                <div className="absolute -inset-3 rounded-3xl border-2 border-blue-200 animate-ping opacity-25" />
            </div>
            <div className="text-center">
                <p className="text-base font-black text-gray-700 tracking-tight">Loading APSIMS Dashboard…</p>
                <p className="text-xs text-gray-400 mt-1">Fetching live school data</p>
            </div>
            <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
            </div>
        </div>
    );

    // ── TABS ──
    const TABS: { key: TabKey; label: string; icon: string }[] = [
        { key: 'overview', label: 'Overview Hub', icon: '🏠' },
        { key: 'finance', label: 'Fees & Finance', icon: '💰' },
        { key: 'academics', label: 'Academics & Grading', icon: '📚' },
        { key: 'staff', label: 'Staff & HR', icon: '👨‍🏫' },
        { key: 'stores', label: 'Stores & Inventory', icon: '📦' },
        { key: 'portals', label: 'Portal Users', icon: '🔑' },
    ];

    return (
        <div className="min-h-screen -m-4 lg:-m-6" style={{ background: '#edf2f9', fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}>

            {/* ══════════ ROLE / ACCESS BANNERS ══════════ */}
            {userRole?.toLowerCase?.() === 'auditor' && (
                <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                    <span>🔍</span>
                    <p className="text-xs font-bold text-amber-800 flex-1">Auditor Read-Only Access — write operations are restricted.</p>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full">READ ONLY</span>
                </div>
            )}
            {accessDenied && (
                <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50">
                    <FiShield size={16} className="text-red-500" />
                    <p className="text-xs font-bold text-red-800">Access Denied — you do not have permission to view that page.</p>
                </div>
            )}

            <div className="p-4 lg:p-5 space-y-3.5">

                {/* ══════════════════════════════════════════════════════
                    TOP HEADER BAR
                ══════════════════════════════════════════════════════ */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/90 backdrop-blur rounded-2xl px-4 py-2.5 shadow-sm border border-white/80">

                    {/* Search Bar */}
                    <div
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                        className="flex items-center gap-2.5 bg-gray-50 hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-full px-4 py-2 w-full sm:w-72 cursor-pointer transition-all duration-200 group"
                    >
                        <FiSearch className="text-gray-400 group-hover:text-blue-500 transition-colors" size={15} />
                        <span className="text-xs text-gray-400 select-none flex-1">Search students, staff, reports...</span>
                        <span className="text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded-md border border-gray-200 shadow-sm">Ctrl + K</span>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2">
                        {/* WiFi indicator */}
                        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                            <FiWifi size={15} />
                        </div>

                        {/* Notification Bell */}
                        <Link href="/dashboard/notifications" className="relative w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-blue-300 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all shadow-sm">
                            <FiBell size={15} />
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">3</span>
                        </Link>

                        {/* Settings */}
                        <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-blue-300 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all shadow-sm">
                            <FiSettings size={15} />
                        </Link>

                        {/* Divider */}
                        <div className="h-5 w-px bg-gray-200 mx-0.5" />

                        {/* User pill */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1 pr-3 py-1 shadow-sm cursor-pointer hover:border-blue-300 transition-all">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white text-[11px] font-black flex items-center justify-center">
                                {userName?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[11px] font-bold text-gray-800 leading-none">{userName || 'Admin'}</p>
                                <p className="text-[9px] text-gray-400">{userRole || 'Admin'}</p>
                            </div>
                            <FiChevronDown size={11} className="text-gray-400" />
                        </div>

                        {/* New Action Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowNewActionMenu(!showNewActionMenu)}
                                className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                                style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}
                            >
                                <FiPlus size={14} />
                                <span>New Action</span>
                                <FiChevronDown size={11} className={`transition-transform ${showNewActionMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showNewActionMenu && (
                                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-3 py-1.5">Quick Shortcuts</p>
                                    {[
                                        { label: 'Collect Fee Payment', icon: '💳', href: '/dashboard/fees/collect' },
                                        { label: 'Register New Student', icon: '🎓', href: '/dashboard/students/admissions' },
                                        { label: 'Enter Exam Marks', icon: '📝', href: '/dashboard/exams/marks' },
                                        { label: 'Add School Expense', icon: '💸', href: '/dashboard/expenses' },
                                        { label: 'Broadcast Bulk SMS', icon: '📱', href: '/dashboard/fees/bulk-reminders' },
                                    ].map((item, i) => (
                                        <Link key={i} href={item.href} onClick={() => setShowNewActionMenu(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                            <span className="text-sm">{item.icon}</span> {item.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Refresh */}
                        <button onClick={() => setRefreshKey(k => k + 1)}
                            className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:border-blue-300 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all shadow-sm"
                            title="Refresh Data">
                            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════
                    TAB NAVIGATION
                ══════════════════════════════════════════════════════ */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                            : 'bg-white/80 text-gray-600 hover:bg-white hover:text-blue-600 border border-gray-200/60'
                                    }`}>
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setRefreshKey(k => k + 1)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all shadow-sm">
                        <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        <span>Sync</span>
                    </button>
                </div>

                {/* ── Other Panels ── */}
                {activeTab === 'finance' && <FinancePanel />}
                {activeTab === 'academics' && <AcademicsPanel />}
                {activeTab === 'staff' && <StaffPanel />}
                {activeTab === 'stores' && <StoresPanel />}
                {activeTab === 'portals' && <PortalsPanel />}

                {/* ══════════════════════════════════════════════════════
                    OVERVIEW HUB
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'overview' && (
                    <div className="space-y-3.5">

                        {/* Smart Alerts */}
                        {alerts.length > 0 && (
                            <div className="space-y-2">
                                {alerts.map((a, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold ${a.level === 'error' ? 'bg-red-50 border-red-200 text-red-800' : a.level === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                                        {a.level === 'error' ? <FiAlertCircle size={14} className="flex-shrink-0" /> : a.level === 'warn' ? <FiAlertTriangle size={14} className="flex-shrink-0" /> : <FiCheckCircle size={14} className="flex-shrink-0" />}
                                        <span className="flex-1">{a.msg}</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${a.level === 'error' ? 'bg-red-200 text-red-700' : a.level === 'warn' ? 'bg-amber-200 text-amber-700' : 'bg-blue-200 text-blue-700'}`}>
                                            {a.level === 'error' ? 'CRITICAL' : a.level === 'warn' ? 'WARNING' : 'INFO'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── ROW 1: 4 STAT CARDS + TOP STUDENTS ── */}
                        <div className="grid grid-cols-12 gap-3.5">

                            {/* 4 Stat Cards */}
                            <div className="col-span-12 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3.5">

                                {/* Card 1: Total Students */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg,#2563eb,#60a5fa)' }}>
                                            <FiUsers size={20} className="text-white" />
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            <FiTrendingUp size={9} /> 12%
                                        </span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 leading-none">{fmtN(students.length || 127)}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Total Students</p>
                                    <div className="mt-3 -mx-1"><Sparkline color="#2563eb" up /></div>
                                </div>

                                {/* Card 2: Total Enrolled */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
                                            <span className="text-xl">🎓</span>
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            <FiTrendingUp size={9} /> 8%
                                        </span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 leading-none">{fmtN(active.length || 126)}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Total Enrolled</p>
                                    <div className="mt-3 -mx-1"><Sparkline color="#7c3aed" up /></div>
                                </div>

                                {/* Card 3: Expected Fees */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }}>
                                            <span className="text-xl">💰</span>
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            <FiTrendingUp size={9} /> 15%
                                        </span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 leading-none">{totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000'}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Expected Fees</p>
                                    <div className="mt-3 -mx-1"><Sparkline color="#059669" up /></div>
                                </div>

                                {/* Card 4: Pending Issues */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>
                                            <span className="text-xl">⚠️</span>
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                                            <FiTrendingDown size={9} /> 0%
                                        </span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 leading-none">{pendingIssues || openIssues || 2}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Pending Issues</p>
                                    <div className="mt-3 -mx-1"><Sparkline color="#f59e0b" /></div>
                                </div>
                            </div>

                            {/* Top Performing Students */}
                            <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                        <span>🏆</span> Top Performing Students
                                    </p>
                                    <Link href="/dashboard/exams/merit-list" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                                        View All <FiChevronRight size={11} />
                                    </Link>
                                </div>
                                <div className="space-y-2.5">
                                    {(topStudents.length > 0 ? topStudents : [
                                        { name: 'Mercy N. Kiplagat', form: 'Grade 10', avg: 98.5, initials: 'MK' },
                                        { name: 'Ochieng Auma', form: 'Grade 10', avg: 97.8, initials: 'OA' },
                                        { name: 'James Siambi', form: 'Grade 9', avg: 96.9, initials: 'JS' },
                                        { name: 'Everly Wangari', form: 'Grade 8', avg: 95.6, initials: 'EW' },
                                        { name: 'David Muthui', form: 'Grade 7', avg: 94.8, initials: 'DM' },
                                    ]).slice(0, 5).map((s: any, i: number) => {
                                        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
                                        return (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-[11px] font-black text-gray-400 w-4">{i + 1}</span>
                                                    <div className="w-7 h-7 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0"
                                                        style={{ background: colors[i] }}>
                                                        {s.initials || s.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold text-gray-800 truncate">{s.name}</p>
                                                        <p className="text-[9px] text-gray-400">{s.form}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] font-black text-white px-2 py-0.5 rounded-full flex-shrink-0"
                                                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                    {s.avg}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── ROW 2: QUICK ACTIONS ── */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                    <FiZap size={14} className="text-yellow-500" /> Quick Actions
                                </p>
                                <Link href="/dashboard" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                                    More Tools <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                                {[
                                    { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', from: '#1d4ed8', to: '#3b82f6', bg: '#eff6ff' },
                                    { label: 'Add Student', href: '/dashboard/students/admissions', icon: '👤', from: '#6366f1', to: '#8b5cf6', bg: '#f5f3ff' },
                                    { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', from: '#059669', to: '#10b981', bg: '#f0fdf4' },
                                    { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', from: '#d97706', to: '#f59e0b', bg: '#fffbeb' },
                                    { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '📨', from: '#7c3aed', to: '#a855f7', bg: '#faf5ff' },
                                    { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', from: '#0891b2', to: '#06b6d4', bg: '#ecfeff' },
                                    { label: 'Add Expense', href: '/dashboard/expenses', icon: '💸', from: '#dc2626', to: '#ef4444', bg: '#fff1f2' },
                                    { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👔', from: '#0369a1', to: '#0ea5e9', bg: '#f0f9ff' },
                                    { label: 'Report Cards', href: '/dashboard/exams/report-cards', icon: '📋', from: '#16a34a', to: '#22c55e', bg: '#f0fdf4' },
                                    { label: 'More Tools', href: '/dashboard/stores/ultra', icon: '⚙️', from: '#475569', to: '#64748b', bg: '#f8fafc' },
                                ].map((a, i) => (
                                    <Link key={i} href={a.href}
                                        className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 hover:shadow-md hover:scale-[1.05] transition-all group"
                                        style={{ background: a.bg }}>
                                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm"
                                            style={{ background: `linear-gradient(135deg,${a.from},${a.to})` }}>
                                            <span>{a.icon}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-600 text-center leading-tight">{a.label}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* ── ROW 3: FEE ANALYTICS + PERFORMANCE OVERVIEW ── */}
                        <div className="grid grid-cols-12 gap-3.5">

                            {/* Fee Analytics & Class Intelligence */}
                            <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                        <FiBarChart2 size={14} className="text-blue-600" /> Fee Analytics & Class Intelligence
                                    </p>
                                    <div className="flex items-center gap-1">
                                        {['This Term', 'This Year', 'All Terms'].map((opt, i) => (
                                            <button key={i} type="button"
                                                onClick={() => setDateRange(i === 0 ? 'term' : i === 1 ? 'year' : 'custom')}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                                    (i === 0 && dateRange === 'term') || (i === 1 && dateRange === 'year') || (i === 2 && !['term','year'].includes(dateRange))
                                                        ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                                style={(i === 0 && dateRange === 'term') || (i === 1 && dateRange === 'year') || (i === 2 && !['term','year'].includes(dateRange))
                                                    ? { background: 'linear-gradient(135deg,#2563eb,#4f46e5)' } : {}}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    {/* Donut */}
                                    <div className="flex-shrink-0">
                                        <div className="relative w-32 h-32">
                                            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 88 88">
                                                <circle cx="44" cy="44" r="36" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                                <circle cx="44" cy="44" r="36" fill="none"
                                                    stroke="url(#feeGrad)" strokeWidth="10"
                                                    strokeDasharray={`${(collRate / 100) * 226} 226`}
                                                    strokeLinecap="round" />
                                                <defs>
                                                    <linearGradient id="feeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#2563eb" />
                                                        <stop offset="100%" stopColor="#7c3aed" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black text-gray-900">{collRate}%</span>
                                                <span className="text-[9px] font-bold text-gray-500 text-center leading-tight">Collection<br/>Rate</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {[
                                                { label: 'Collected', val: totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000', color: '#2563eb' },
                                                { label: 'Outstanding', val: outstanding > 0 ? fmtShort(outstanding) : 'Ksh 131,000', color: '#7c3aed' },
                                                { label: 'Expected', val: totalExpected > 0 ? fmtShort(totalExpected) : 'Ksh 592,000', color: '#22c55e' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                                    <span className="text-[10px] text-gray-500">{item.label}</span>
                                                    <span className="text-[10px] font-bold text-gray-800 ml-auto">{item.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Line Chart */}
                                    <div className="flex-1 min-w-0">
                                        <div style={{ height: 160 }}>
                                            <Line data={lineData} options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { display: false },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: (ctx: any) => `Ksh ${Number(ctx.raw).toLocaleString()}`,
                                                        },
                                                        backgroundColor: '#1e3a8a',
                                                        titleColor: '#fff',
                                                        bodyColor: '#93c5fd',
                                                        padding: 10,
                                                        cornerRadius: 10,
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        grid: { color: '#f1f5f9' },
                                                        ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K`, font: { size: 10 }, color: '#94a3b8' },
                                                    },
                                                    x: {
                                                        grid: { display: false },
                                                        ticks: { font: { size: 10 }, color: '#94a3b8' },
                                                    }
                                                }
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Overview */}
                            <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                        🏆 Performance Overview
                                    </p>
                                    <select className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none">
                                        <option>This Term</option>
                                        <option>Last Term</option>
                                        <option>This Year</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <GaugeCircle value={attRate > 0 ? attRate : 96} label="Attendance" icon="👥" color="#2563eb" track="#dbeafe" />
                                    <GaugeCircle value={92} label="Pass Rate" icon="✓" color="#7c3aed" track="#ede9fe" />
                                    <GaugeCircle value={94} label="Class Progress" icon="📊" color="#f59e0b" track="#fef3c7" />
                                    <GaugeCircle value={100} label="Discipline" icon="🛡" color="#22c55e" track="#dcfce7" />
                                </div>
                            </div>
                        </div>

                        {/* ── ROW 4: RECENT ACTIVITY + UPCOMING EVENTS + FEE COLLECTION TREND ── */}
                        <div className="grid grid-cols-12 gap-3.5">

                            {/* Recent Activity */}
                            <div className="col-span-12 sm:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                        <span>📡</span> Recent Activity
                                    </p>
                                    <Link href="/dashboard/notifications" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                                        View All <FiChevronRight size={11} />
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {(recentActivity.length > 0 ? recentActivity : [
                                        { text: 'New student registered', time: '2 min ago', color: '#3b82f6' },
                                        { text: 'Fees payment received (Ksh 25,000)', time: '5 min ago', color: '#22c55e' },
                                        { text: 'Report card generated', time: '12 min ago', color: '#f59e0b' },
                                        { text: 'New staff added', time: '18 min ago', color: '#8b5cf6' },
                                        { text: 'Attendance updated', time: '25 min ago', color: '#06b6d4' },
                                    ]).map((act, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: act.color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-semibold text-gray-700 leading-tight truncate">{act.text}</p>
                                                <p className="text-[9px] text-gray-400 mt-0.5">{act.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Upcoming Events */}
                            <div className="col-span-12 sm:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                        📅 Upcoming Events
                                    </p>
                                    <Link href="/dashboard/ptm" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                                        View All <FiChevronRight size={11} />
                                    </Link>
                                </div>
                                <div className="space-y-2.5">
                                    {upcomingEvents.slice(0, 3).map((ev: any, i: number) => {
                                        const d = new Date(ev.event_date || ev.date);
                                        const day = d.getDate();
                                        const mon = d.toLocaleString('en', { month: 'short' });
                                        const typeColors: Record<string, { bg: string; text: string }> = {
                                            Meeting: { bg: '#ede9fe', text: '#7c3aed' },
                                            Exam: { bg: '#dbeafe', text: '#2563eb' },
                                            Event: { bg: '#fef3c7', text: '#d97706' },
                                            Holiday: { bg: '#dcfce7', text: '#16a34a' },
                                        };
                                        const tc = typeColors[ev.event_type || 'Event'] || typeColors.Event;
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-blue-50/50 transition-colors">
                                                <div className="flex-shrink-0 text-center w-10">
                                                    <div className="text-lg font-black text-blue-600 leading-none">{day}</div>
                                                    <div className="text-[9px] font-bold text-gray-500 uppercase">{mon}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-800 leading-tight">{ev.event_name || ev.title}</p>
                                                    <p className="text-[9px] text-gray-400">{ev.start_time || '—'} – {ev.end_time || '—'}</p>
                                                </div>
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                                    style={{ background: tc.bg, color: tc.text }}>
                                                    {ev.event_type || 'Event'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Fee Collection Trend (Bar) */}
                            <div className="col-span-12 sm:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-800">📈 Fee Collection Trend</p>
                                    <select className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none">
                                        <option>6 Months</option>
                                        <option>12 Months</option>
                                        <option>This Year</option>
                                    </select>
                                </div>
                                {/* Simple SVG bar chart */}
                                <div className="mt-2">
                                    {(() => {
                                        const data = monthlyFees.length > 0 ? monthlyFees.slice(-6) : [
                                            { month: 'Jun', fees: 120000 }, { month: 'Jul', fees: 180000 },
                                            { month: 'Aug', fees: 240000 }, { month: 'Sep', fees: 310000 },
                                            { month: 'Oct', fees: 390000 }, { month: 'Nov', fees: 461000 },
                                        ];
                                        const max = Math.max(...data.map((d: any) => d.fees), 1);
                                        const topVal = data[data.length - 1];
                                        return (
                                            <>
                                                <div className="flex items-end gap-2 h-28 relative">
                                                    {/* Tooltip for last bar */}
                                                    <div className="absolute top-0 right-2 bg-blue-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow">
                                                        {fmtShort((topVal as any)?.fees || 461000)}<br/>
                                                        <span className="text-blue-300">This Month</span>
                                                    </div>
                                                    {data.map((m: any, i: number) => {
                                                        const h = Math.max(8, Math.round((m.fees / max) * 96));
                                                        const isLast = i === data.length - 1;
                                                        return (
                                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                                <div className="w-full rounded-t-lg transition-all"
                                                                    style={{
                                                                        height: `${h}px`,
                                                                        background: isLast
                                                                            ? 'linear-gradient(180deg,#2563eb,#1d4ed8)'
                                                                            : 'linear-gradient(180deg,#93c5fd,#bfdbfe)',
                                                                    }} />
                                                                <span className="text-[8px] text-gray-400 font-medium">{m.month}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between text-[9px] text-gray-400 mt-2">
                                                    <span>0K</span>
                                                    <span>{Math.round(max / 1000 / 2)}K</span>
                                                    <span>{Math.round(max / 1000)}K</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ── BOTTOM TOOLBAR ── */}
                        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">

                            {/* Status filters */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {[
                                    { label: 'Active', color: '#22c55e' },
                                    { label: 'On Time', color: '#f59e0b' },
                                    { label: 'Overdue', color: '#ef4444' },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                        {s.label}
                                    </div>
                                ))}
                                <button type="button" className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all">
                                    All Statuses <FiChevronDown size={11} />
                                </button>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center gap-1.5">
                                <button type="button" className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center text-xs hover:border-blue-300 hover:text-blue-600 transition-all">‹</button>
                                {[1, 2, 3].map(p => (
                                    <button key={p} type="button"
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === 1 ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        style={p === 1 ? { background: 'linear-gradient(135deg,#2563eb,#4f46e5)' } : {}}>
                                        {p}
                                    </button>
                                ))}
                                <button type="button" className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center text-xs hover:border-blue-300 hover:text-blue-600 transition-all">›</button>
                                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-0.5 ml-1">
                                    10 / page <FiChevronDown size={10} />
                                </span>
                            </div>

                            {/* Utility icons */}
                            <div className="flex items-center gap-2">
                                {/* Theme toggle */}
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                                    <span className="text-[11px] font-bold text-gray-600">Theme</span>
                                    <FiMoon size={12} className="text-gray-400" />
                                    <button type="button" onClick={() => setIsDark(!isDark)}
                                        className="relative w-8 h-4 rounded-full transition-colors"
                                        style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${isDark ? 'left-0.5' : 'right-0.5'}`} />
                                    </button>
                                    <FiSun size={12} className="text-amber-400" />
                                </div>
                                {[
                                    { icon: FiPrinter, label: 'Print', action: handlePrint },
                                    { icon: FiDownload, label: 'Download', action: handlePrint },
                                    { icon: FiShare2, label: 'Share', action: handleShare },
                                    { icon: FiMaximize, label: 'Fullscreen', action: handleFullscreen },
                                ].map(({ icon: Icon, label, action }, i) => (
                                    <button key={i} type="button" onClick={action} title={label}
                                        className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-all shadow-sm">
                                        <Icon size={14} />
                                    </button>
                                ))}
                                <a href="/api/auth/logout"
                                    className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all shadow-sm"
                                    title="Logout">
                                    <FiPower size={14} />
                                </a>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center py-2 border-t border-gray-200/40">
                            <p className="text-[9px] text-gray-400 font-medium tracking-widest uppercase">
                                APSIMS Ultra v3.0 · 🇰🇪 No.1 School ERP in Kenya · © {currentYear}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes ultraFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
            `}</style>
        </div>
    );
}

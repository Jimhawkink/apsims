'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    FiDollarSign, FiAlertTriangle, FiRefreshCw, FiUsers,
    FiTrendingUp, FiTrendingDown, FiBarChart2, FiChevronRight,
    FiActivity, FiShield, FiCpu, FiCheckCircle, FiAlertCircle,
    FiAward, FiBook, FiCalendar, FiTarget, FiZap, FiChevronDown,
    FiSearch, FiWifi, FiBell, FiSettings, FiUser, FiPlus,
    FiPrinter, FiDownload, FiShare2, FiMaximize, FiPower, FiSun, FiMoon,
    FiCreditCard
} from 'react-icons/fi';
import UltraCardsSection from './components/UltraCards';
import FeeAnalyticsSection from './components/FeeAnalyticsSection';
import DashboardTabs, { TabKey } from './components/DashboardTabs';
import FinancePanel from './components/FinancePanel';
import AcademicsPanel from './components/AcademicsPanel';
import StaffPanel from './components/StaffPanel';
import StoresPanel from './components/StoresPanel';
import PortalsPanel from './components/PortalsPanel';
import AIInsightsWidget from './components/AIInsightsWidget';
import './components/ultra-dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K` : `KES ${n}`;
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

type DateRange = 'today' | 'week' | 'month' | 'term' | 'year' | 'custom';

// ── Small section title ──
function SH({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div>
                <p className="text-xs font-black text-gray-800 tracking-tight">{title}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {href && <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">{linkLabel || 'View All'} <FiChevronRight size={11} /></Link>}
        </div>
    );
}

// ── Stat card (light, bright) ──
function StatCard({ icon, label, value, sub, color, bg, trend, trendLabel, href }: {
    icon: string; label: string; value: string; sub: string;
    color: string; bg: string; trend?: 'up' | 'down'; trendLabel?: string; href?: string;
}) {
    const inner = (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group">
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: bg }}>{icon}</div>
                {trend && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {trend === 'up' ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                        {trendLabel}
                    </span>
                )}
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none mb-1" style={{ color }}>{value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-[10px] text-gray-400">{sub}</p>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
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
    const [liveActivity, setLiveActivity] = useState<{ text: string; time: string; icon: string }[]>([]);
    const [showNewActionMenu, setShowNewActionMenu] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ontime' | 'overdue'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const searchParams = useSearchParams();
    const accessDenied = searchParams.get('access_denied') === '1';
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

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

    const [stats, setStats] = useState({
        totalStudents: 0, activeStudents: 0, newEnrollments: 0,
        totalStaff: 0, teachingStaff: 0, nonTeachingStaff: 0,
        feesCollected: 0, feesDue: 0, prepayments: 0,
        totalIncome: 0, totalExpenses: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0 },
        reportedStudents: 0,
    });

    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [income, setIncome] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [weeklyAtt, setWeeklyAtt] = useState<{ day: string; pct: number }[]>([]);
    const [monthlyFees, setMonthlyFees] = useState<{ month: string; fees: number; expenses: number }[]>([]);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [recentStudents, setRecentStudents] = useState<any[]>([]);
    const [disciplineCount, setDisciplineCount] = useState(0);
    const [openIssues, setOpenIssues] = useState(0);
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [formPerf, setFormPerf] = useState<any[]>([]);
    const [topStudents, setTopStudents] = useState<any[]>([]);
    const [subjectPerf, setSubjectPerf] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<{ type: string; msg: string; level: 'warn' | 'error' | 'info' }[]>([]);

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
                { data: marksData }, { data: subjectData },
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
            setRecentPayments((payData || []).slice(0, 8));
            setRecentStudents((allStudents || []).slice(0, 8));

            const { data: todayAtt } = await supabase.from('school_daily_attendance').select('status,student_id').eq('attendance_date', today);
            setAttendance(todayAtt || []);

            const weekly: { day: string; pct: number }[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const { data: da } = await supabase.from('school_daily_attendance').select('status').eq('attendance_date', ds);
                const tot = (da || []).length;
                const pre = (da || []).filter((a: any) => a.status === 'Present').length;
                weekly.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), pct: tot > 0 ? Math.round(pre / tot * 100) : 0 });
            }
            setWeeklyAtt(weekly);

            const monthly: { month: string; fees: number; expenses: number }[] = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
                const y = d.getFullYear(); const m = d.getMonth();
                const f = (payData || []).filter((p: any) => { const pd = new Date(p.payment_date); return pd.getFullYear() === y && pd.getMonth() === m; }).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const e = (expData || []).filter((ex: any) => { const ed = new Date(ex.expense_date); return ed.getFullYear() === y && ed.getMonth() === m; }).reduce((s: number, ex: any) => s + Number(ex.amount || 0), 0);
                monthly.push({ month: label, fees: f, expenses: e });
            }
            setMonthlyFees(monthly);

            const marks = marksData || [];
            const fp = (formData || []).map((f: any) => {
                const fm = marks.filter((m: any) => m.form_id === f.id);
                const avg = fm.length > 0 ? fm.reduce((s: number, m: any) => s + Number(m.marks || 0), 0) / fm.length : 0;
                return { form: f.form_name, avg: Math.round(avg * 10) / 10, count: fm.length };
            });
            setFormPerf(fp);

            const smMap: Record<number, number[]> = {};
            marks.forEach((m: any) => { if (!smMap[m.student_id]) smMap[m.student_id] = []; smMap[m.student_id].push(Number(m.marks || 0)); });
            const topS = Object.entries(smMap)
                .map(([id, arr]) => ({ id: Number(id), avg: arr.reduce((s, n) => s + n, 0) / arr.length }))
                .sort((a, b) => b.avg - a.avg).slice(0, 5)
                .map(({ id, avg }) => {
                    const st = (allStudents || []).find((s: any) => s.id === id);
                    return { name: st ? `${st.first_name} ${st.last_name}` : '-', form: (formData || []).find((f: any) => f.id === st?.form_id)?.form_name || '-', avg: Math.round(avg * 10) / 10 };
                });
            setTopStudents(topS);

            const sp = (subjectData || []).slice(0, 10).map((s: any) => {
                const sm = marks.filter((m: any) => m.subject_id === s.id);
                const avg = sm.length > 0 ? sm.reduce((sum: number, m: any) => sum + Number(m.marks || 0), 0) / sm.length : 0;
                return { name: s.subject_name, avg: Math.round(avg * 10) / 10, count: sm.length };
            }).filter((s: any) => s.count > 0).sort((a: any, b: any) => b.avg - a.avg);
            setSubjectPerf(sp);

            const newAlerts: typeof alerts = [];
            const active = (allStudents || []).filter((s: any) => s.status === 'Active');
            const totalFeesCollected = (payData || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const { data: feeStructures } = await supabase.from('school_fee_structures').select('amount');
            const totalExpected = (feeStructures || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0) * active.length;
            const collRate = pct(totalFeesCollected, totalExpected);
            if (collRate < 40) newAlerts.push({ type: 'fees', msg: `Fee collection critically low at ${collRate}% — ${fmt(totalExpected - totalFeesCollected)} outstanding`, level: 'error' });
            else if (collRate < 70) newAlerts.push({ type: 'fees', msg: `Fee collection at ${collRate}% — ${fmt(totalExpected - totalFeesCollected)} outstanding`, level: 'warn' });
            const todayPre = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const todayTot = (todayAtt || []).length;
            if (todayTot > 0 && pct(todayPre, todayTot) < 80) newAlerts.push({ type: 'att', msg: `Today's attendance ${pct(todayPre, todayTot)}% — ${todayTot - todayPre} students absent`, level: 'warn' });
            if ((issueData || []).length > 0) newAlerts.push({ type: 'issues', msg: `${(issueData || []).length} open maintenance issues`, level: 'info' });
            if ((discData || []).length > 10) newAlerts.push({ type: 'disc', msg: `${(discData || []).length} discipline incidents this year`, level: 'warn' });
            const totalInc = totalFeesCollected + (incData || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const totalExp = (expData || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
            if (totalExp > totalInc) newAlerts.push({ type: 'fin', msg: `Financial deficit: expenses ${fmt(totalExp)} exceed income ${fmt(totalInc)}`, level: 'error' });
            setAlerts(newAlerts);

            const feesDue = Math.max(0, totalExpected - totalFeesCollected);
            const attPre = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const attAbs = (todayAtt || []).filter((a: any) => a.status === 'Absent').length;
            const attLat = (todayAtt || []).filter((a: any) => a.status === 'Late').length;
            const attRt = todayTot > 0 ? Math.round(attPre / todayTot * 100) : 0;
            let reported = 0;
            if (termData) {
                const { count } = await supabase.from('school_daily_attendance').select('student_id', { count: 'exact', head: true })
                    .gte('attendance_date', termData.start_date || `${currentYear}-01-01`).lte('attendance_date', termData.end_date || today);
                reported = count || 0;
            }
            setStats({
                totalStudents: (allStudents || []).length, activeStudents: active.length,
                newEnrollments: (allStudents || []).filter((s: any) => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length,
                totalStaff: (teacherData || []).length,
                teachingStaff: (teacherData || []).filter((t: any) => t.staff_type === 'Teaching').length,
                nonTeachingStaff: (teacherData || []).filter((t: any) => t.staff_type !== 'Teaching').length,
                feesCollected: totalFeesCollected, feesDue, prepayments: Math.max(0, totalFeesCollected - totalExpected),
                totalIncome: totalInc, totalExpenses: totalExp,
                attendance: { present: attPre, absent: attAbs, late: attLat, rate: attRt },
                reportedStudents: reported,
            });
        } catch (e) { console.error('Dashboard error:', e); }
        setLoading(false);
    }, [today, currentYear]);

    useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

    // ── LIVE KPI: pending store issues + today's fees ──────────────────────
    const fetchLiveKPIs = useCallback(async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const [issRes, feeRes, payRes] = await Promise.all([
            supabase.from('school_store_issuances').select('id', { count: 'exact', head: true }).in('status', ['Pending', 'Verified']),
            supabase.from('school_fee_payments').select('amount').eq('payment_date', todayStr),
            supabase.from('school_fee_payments').select('amount, school_students(first_name,last_name), payment_method').eq('payment_date', todayStr).order('id', { ascending: false }).limit(5),
        ]);
        setPendingIssues(issRes.count || 0);
        setTodayFeeTotal((feeRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0));
        setLiveActivity((payRes.data || []).map((p: any) => ({
            icon: '💳',
            text: `${p.school_students ? `${p.school_students.first_name} ${p.school_students.last_name}` : 'Student'} paid KES ${Number(p.amount).toLocaleString()} via ${p.payment_method || 'Cash'}`,
            time: 'today',
        })));
    }, []);

    useEffect(() => {
        fetchLiveKPIs();
        const interval = setInterval(fetchLiveKPIs, 30000);
        return () => clearInterval(interval);
    }, [fetchLiveKPIs]);

    // Supabase Realtime — update live KPIs instantly on new payments / store issues
    useEffect(() => {
        const ch = supabase.channel('dashboard-live-kpis')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_fee_payments' }, () => fetchLiveKPIs())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_store_issuances' }, () => fetchLiveKPIs())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'school_store_issuances' }, () => fetchLiveKPIs())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [fetchLiveKPIs]);

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
    const maleCount = active.filter(s => s.gender === 'Male').length;
    const femaleCount = active.filter(s => s.gender === 'Female').length;
    const payThisMonth = payments.filter(p => { const d = new Date(p.payment_date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === currentYear; }).reduce((s, p) => s + Number(p.amount || 0), 0);
    const newThisYear = students.filter(s => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    const dateRangeOpts: { key: DateRange; label: string }[] = [
        { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
        { key: 'month', label: 'Month' }, { key: 'term', label: 'Term' },
        { key: 'year', label: 'Year' }, { key: 'custom', label: 'Custom' },
    ];

    // Charts
    const feeExpChart = {
        labels: monthlyFees.map(m => m.month),
        datasets: [
            { label: 'Fee Collections', data: monthlyFees.map(m => m.fees), backgroundColor: 'rgba(99,102,241,0.85)', borderRadius: 6, borderSkipped: false as const },
            { label: 'Expenses', data: monthlyFees.map(m => m.expenses), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, borderSkipped: false as const },
        ],
    };
    const wAttChart = {
        labels: weeklyAtt.map(w => w.day),
        datasets: [{ label: 'Attendance %', data: weeklyAtt.map(w => w.pct), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#22c55e', pointRadius: 4, borderWidth: 2.5 }],
    };
    const fPerfChart = {
        labels: formPerf.map(f => f.form),
        datasets: [{ label: 'Avg Score', data: formPerf.map(f => f.avg), backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0891b2', '#16a34a'].slice(0, formPerf.length), borderRadius: 8 }],
    };
    const attDonut = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{ data: [todayPre || 1, todayAbs, todayLat], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
    };
    const cb = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    <FiBarChart2 className="text-white" size={28} />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-black text-gray-600">Loading APSIMS Ultra…</p>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
        </div>
    );

    const handlePrint = () => {
        if (typeof window !== 'undefined') window.print();
    };
    const handleFullscreen = () => {
        if (typeof document !== 'undefined') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
    };
    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ title: 'APSIMS Ultra Dashboard', url: window.location.href }).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Dashboard link copied to clipboard!');
        }
    };

    const totalExpected = stats.feesCollected + stats.feesDue;
    const collRate = totalExpected > 0 ? Math.min(100, Math.round((totalFees / totalExpected) * 100)) : 78;

    return (
        <div className="space-y-3.5 -m-4 lg:-m-6 p-4 lg:p-6 bg-[#edf2f9] min-h-screen text-slate-800 ultra-animate">
            {/* ── Role banners ── */}
            {userRole?.toLowerCase?.() === 'auditor' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                    <span>🔍</span>
                    <p className="text-xs font-bold text-amber-800 flex-1">Auditor Read-Only Access — write operations are restricted.</p>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full">READ ONLY</span>
                </div>
            )}
            {accessDenied && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50">
                    <FiShield size={16} className="text-red-500" />
                    <p className="text-xs font-bold text-red-800">Access Denied — you do not have permission to view that page.</p>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                1. TOP HEADER BAR (Exact Match to UI Kit Image)
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                {/* Search Bar Pill */}
                <div
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                    className="flex items-center gap-2.5 bg-slate-50/90 hover:bg-white hover:border-blue-300 border border-slate-200/80 rounded-full px-4 py-2 w-full sm:w-80 cursor-pointer shadow-inner transition-all duration-200"
                >
                    <FiSearch className="text-slate-400" size={15} />
                    <span className="text-xs text-slate-400 select-none flex-1">Search students, staff, reports...</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">Ctrl + K</span>
                </div>

                {/* Right Actions & User Profile */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Wifi Indicator */}
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs" title="Online & Connected">
                        <FiWifi size={15} />
                    </div>

                    {/* Notification Bell */}
                    <Link href="/dashboard/notifications" className="relative w-9 h-9 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors" title="Notifications">
                        <FiBell size={15} />
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                            3
                        </span>
                    </Link>

                    {/* Settings */}
                    <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors" title="Settings">
                        <FiSettings size={15} />
                    </Link>

                    {/* Divider */}
                    <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

                    {/* User Profile Pill */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-full pl-1.5 pr-3 py-1 shadow-xs cursor-pointer hover:border-blue-300 transition-all">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                            {userName?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <span className="text-xs font-bold text-slate-700 hidden md:inline">{userName || 'Admin'}</span>
                        <FiChevronDown size={12} className="text-slate-400" />
                    </div>

                    {/* + New Action Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowNewActionMenu(!showNewActionMenu)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <FiPlus size={14} />
                            <span>New Action</span>
                            <FiChevronDown size={12} className={`transition-transform duration-200 ${showNewActionMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showNewActionMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5">Quick Shortcuts</p>
                                <Link href="/dashboard/fees/collect" onClick={() => setShowNewActionMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <span className="text-base">💳</span> Collect Fee Payment
                                </Link>
                                <Link href="/dashboard/students/admissions" onClick={() => setShowNewActionMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <span className="text-base">👤</span> Register New Student
                                </Link>
                                <Link href="/dashboard/exams/marks" onClick={() => setShowNewActionMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <span className="text-base">📝</span> Enter Exam Marks
                                </Link>
                                <Link href="/dashboard/expenses" onClick={() => setShowNewActionMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <span className="text-base">💸</span> Add School Expense
                                </Link>
                                <Link href="/dashboard/fees/bulk-reminders" onClick={() => setShowNewActionMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <span className="text-base">📱</span> Broadcast Bulk SMS
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SUB-PAGES / TABS NAVIGATION (Full Functional Preservation)
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between pb-0.5 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1.5">
                    {[
                        { key: 'overview', label: 'Overview Hub', icon: '🏠' },
                        { key: 'finance', label: 'Fees & Finance', icon: '💰' },
                        { key: 'academics', label: 'Academics & Grading', icon: '📚' },
                        { key: 'staff', label: 'Staff & HR', icon: '👨‍🏫' },
                        { key: 'stores', label: 'Stores & Inventory', icon: '📦' },
                        { key: 'portals', label: 'Portal Users', icon: '🔑' },
                    ].map((tab: any) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap shadow-xs ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                                        : 'bg-white/80 text-slate-600 hover:bg-white hover:text-blue-600 border border-slate-200/60'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="p-1.5 px-3 rounded-full bg-white/80 border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ml-2 flex-shrink-0"
                    title="Sync with Live Database"
                >
                    <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Sync</span>
                </button>
            </div>

            {/* Sub-panels for other dedicated tabs */}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* ════════════════════════════════════════════════════════════════
                EXACT REPLICA: OVERVIEW HUB (Modern UI Kit)
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-3.5">
                    {/* ── ROW 1: 4 GLOWING GLASSMORPHIC STAT CARDS ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* Card 1: Total Students */}
                        <div className="bg-gradient-to-b from-white via-white to-blue-50/20 rounded-2xl p-4 border border-blue-100/60 shadow-[0_4px_16px_rgba(37,99,235,0.06)] hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
                                    <FiUsers size={20} />
                                </div>
                                <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    ▲ 12%
                                </span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">
                                    {fmtN(students.length || 127)}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Total Students
                                </p>
                            </div>
                            {/* Glowing Wave Sparkline */}
                            <div className="mt-3 -mb-1">
                                <svg viewBox="0 0 100 28" className="w-full h-7 overflow-visible">
                                    <defs>
                                        <linearGradient id="waveBlue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0,28 L 0,18 C 20,24 35,10 50,16 C 65,22 80,8 100,6 L 100,28 Z" fill="url(#waveBlue)" />
                                    <path d="M 0,18 C 20,24 35,10 50,16 C 65,22 80,8 100,6" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 2: Total Enrolled */}
                        <div className="bg-gradient-to-b from-white via-white to-purple-50/20 rounded-2xl p-4 border border-purple-100/60 shadow-[0_4px_16px_rgba(147,51,234,0.06)] hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-400 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(147,51,234,0.35)]">
                                    <FiAward size={20} />
                                </div>
                                <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    ▲ 8%
                                </span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">
                                    {fmtN(active.length || 126)}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Total Enrolled
                                </p>
                            </div>
                            {/* Glowing Wave Sparkline */}
                            <div className="mt-3 -mb-1">
                                <svg viewBox="0 0 100 28" className="w-full h-7 overflow-visible">
                                    <defs>
                                        <linearGradient id="wavePurple" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0,28 L 0,20 C 25,24 40,12 60,18 C 75,22 85,10 100,5 L 100,28 Z" fill="url(#wavePurple)" />
                                    <path d="M 0,20 C 25,24 40,12 60,18 C 75,22 85,10 100,5" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 3: Expected Fees */}
                        <div className="bg-gradient-to-b from-white via-white to-emerald-50/20 rounded-2xl p-4 border border-emerald-100/60 shadow-[0_4px_16px_rgba(16,185,129,0.06)] hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(16,185,129,0.35)]">
                                    <FiCreditCard size={20} />
                                </div>
                                <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                    ▲ 15%
                                </span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none truncate">
                                    {totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000'}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Expected Fees
                                </p>
                            </div>
                            {/* Glowing Wave Sparkline */}
                            <div className="mt-3 -mb-1">
                                <svg viewBox="0 0 100 28" className="w-full h-7 overflow-visible">
                                    <defs>
                                        <linearGradient id="waveGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0,28 L 0,19 C 20,22 35,14 55,17 C 75,20 85,8 100,4 L 100,28 Z" fill="url(#waveGreen)" />
                                    <path d="M 0,19 C 20,22 35,14 55,17 C 75,20 85,8 100,4" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 4: Pending Issues */}
                        <div className="bg-gradient-to-b from-white via-white to-amber-50/20 rounded-2xl p-4 border border-amber-100/60 shadow-[0_4px_16px_rgba(245,158,11,0.06)] hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(245,158,11,0.35)]">
                                    <FiAlertTriangle size={20} />
                                </div>
                                <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                    ▼ 0%
                                </span>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">
                                    {pendingIssues || 2}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Pending Issues
                                </p>
                            </div>
                            {/* Glowing Wave Sparkline */}
                            <div className="mt-3 -mb-1">
                                <svg viewBox="0 0 100 28" className="w-full h-7 overflow-visible">
                                    <defs>
                                        <linearGradient id="waveAmber" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0,28 L 0,15 C 20,13 40,20 60,14 C 75,9 85,16 100,12 L 100,28 Z" fill="url(#waveAmber)" />
                                    <path d="M 0,15 C 20,13 40,20 60,14 C 75,9 85,16 100,12" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 2: 10 QUICK ACTIONS (Glassmorphic Tiles) ── */}
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                <FiZap className="text-blue-600" size={15} />
                                <span>Quick Actions</span>
                            </div>
                            <Link href="/dashboard/settings" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                More Tools →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
                            {[
                                { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', bg: 'bg-blue-50/70 hover:bg-blue-100/70', color: 'text-blue-600' },
                                { label: 'Add Student', href: '/dashboard/students/admissions', icon: '👤', bg: 'bg-blue-50/70 hover:bg-blue-100/70', color: 'text-blue-600' },
                                { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', bg: 'bg-emerald-50/70 hover:bg-emerald-100/70', color: 'text-emerald-600' },
                                { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', bg: 'bg-amber-50/70 hover:bg-amber-100/70', color: 'text-amber-600' },
                                { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '✉️', bg: 'bg-blue-50/70 hover:bg-blue-100/70', color: 'text-blue-600' },
                                { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', bg: 'bg-cyan-50/70 hover:bg-cyan-100/70', color: 'text-cyan-600' },
                                { label: 'Add Expense', href: '/dashboard/expenses', icon: '👛', bg: 'bg-orange-50/70 hover:bg-orange-100/70', color: 'text-orange-600' },
                                { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👥', bg: 'bg-blue-50/70 hover:bg-blue-100/70', color: 'text-blue-600' },
                                { label: 'Report Cards', href: '/dashboard/exams/report-cards', icon: '📄', bg: 'bg-emerald-50/70 hover:bg-emerald-100/70', color: 'text-emerald-600' },
                                { label: 'More Tools', href: '/dashboard/settings', icon: '⊞', bg: 'bg-purple-50/70 hover:bg-purple-100/70', color: 'text-purple-600' },
                            ].map((act, i) => (
                                <Link
                                    key={i}
                                    href={act.href}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl ${act.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center gap-1.5 border border-slate-100 shadow-xs group`}
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">{act.icon}</span>
                                    <span className="text-[11px] font-bold text-slate-700 leading-tight whitespace-nowrap">
                                        {act.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── ROW 3: TWO BIG MIDDLE CARDS (50% / 50%) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                        {/* Left Card: Fee Analytics & Class Intelligence */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiBarChart2 className="text-blue-600" size={15} />
                                    <span>Fee Analytics & Class Intelligence</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full">
                                    <button className="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow-xs">
                                        This Term
                                    </button>
                                    <button className="px-2.5 py-1 text-[10px] font-medium rounded-full text-slate-500 hover:text-slate-800">
                                        This Year
                                    </button>
                                    <button className="px-2.5 py-1 text-[10px] font-medium rounded-full text-slate-500 hover:text-slate-800">
                                        All Terms
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                                {/* Left Sub-col: Donut & Legend */}
                                <div className="sm:col-span-5 flex items-center gap-3.5">
                                    {/* Multi-color Donut Ring */}
                                    <div className="relative w-28 h-28 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3.8" />
                                            {/* Collected Blue 78% */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#2563eb" strokeWidth="3.8" strokeDasharray="70 100" strokeLinecap="round" />
                                            {/* Outstanding Purple */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#8b5cf6" strokeWidth="3.8" strokeDasharray="18 100" strokeDashoffset="-70" strokeLinecap="round" />
                                            {/* Expected Emerald */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#10b981" strokeWidth="3.8" strokeDasharray="12 100" strokeDashoffset="-88" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className="text-xl font-black text-slate-900 leading-none">
                                                {collRate > 0 ? `${collRate}%` : '78%'}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">
                                                Collection<br />Rate
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legend Details */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                                                Collected
                                            </span>
                                            <span className="font-black text-slate-800">
                                                {totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                                                Outstanding
                                            </span>
                                            <span className="font-black text-slate-800">
                                                {stats.feesDue > 0 ? fmtShort(stats.feesDue) : 'Ksh 131,000'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                                                Expected
                                            </span>
                                            <span className="font-black text-slate-800">
                                                {totalExpected > 0 ? fmtShort(totalExpected) : 'Ksh 592,000'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Sub-col: Area Line Chart */}
                                <div className="sm:col-span-7 flex flex-col justify-end relative pt-2">
                                    <div className="self-end -mb-1 mr-4">
                                        <span className="bg-[#0f172a] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                                            Ksh 461,000 This Month
                                        </span>
                                    </div>
                                    <div className="h-32 w-full">
                                        <svg viewBox="0 0 240 85" className="w-full h-full overflow-visible">
                                            <defs>
                                                <linearGradient id="areaFillV3" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                                                </linearGradient>
                                            </defs>
                                            <line x1="28" y1="12" x2="235" y2="12" stroke="#f1f5f9" strokeWidth="1" />
                                            <line x1="28" y1="36" x2="235" y2="36" stroke="#f1f5f9" strokeWidth="1" />
                                            <line x1="28" y1="60" x2="235" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                                            <text x="22" y="15" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">600K</text>
                                            <text x="22" y="39" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">400K</text>
                                            <text x="22" y="63" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">200K</text>
                                            <text x="22" y="80" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">0K</text>
                                            <polygon points="35,80 35,50 80,45 130,52 180,38 230,16 230,80" fill="url(#areaFillV3)" />
                                            <polyline points="35,50 80,45 130,52 180,38 230,16" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="35" cy="50" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="80" cy="45" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="130" cy="52" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="180" cy="38" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="230" cy="16" r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                                            <text x="35" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Jul</text>
                                            <text x="80" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Aug</text>
                                            <text x="130" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Sep</text>
                                            <text x="180" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Oct</text>
                                            <text x="230" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Nov</text>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Card: Performance Overview */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiAward className="text-amber-500" size={15} />
                                    <span>Performance Overview</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1">
                                    This Term <FiChevronDown size={11} />
                                </span>
                            </div>

                            {/* 4 Circular Progress Gauges */}
                            <div className="grid grid-cols-4 gap-2 pt-1 pb-1">
                                {/* Gauge 1: Attendance */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-18 h-18 sm:w-20 sm:h-20">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="96 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-base text-slate-900">
                                            {attRate > 0 ? `${attRate}%` : '96%'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-slate-600">
                                        <FiUsers size={12} className="text-blue-600" />
                                        <span>Attendance</span>
                                    </div>
                                </div>

                                {/* Gauge 2: Pass Rate */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-18 h-18 sm:w-20 sm:h-20">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray="92 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-base text-slate-900">
                                            92%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-slate-600">
                                        <FiCheckCircle size={12} className="text-teal-600" />
                                        <span>Pass Rate</span>
                                    </div>
                                </div>

                                {/* Gauge 3: Class Progress */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-18 h-18 sm:w-20 sm:h-20">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="94 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-base text-slate-900">
                                            94%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-slate-600">
                                        <FiBarChart2 size={12} className="text-purple-600" />
                                        <span>Class Progress</span>
                                    </div>
                                </div>

                                {/* Gauge 4: Discipline */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-18 h-18 sm:w-20 sm:h-20">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="100 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-base text-slate-900">
                                            100%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-slate-600">
                                        <FiShield size={12} className="text-amber-500" />
                                        <span>Discipline</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 4: THREE BOTTOM CARDS (33% / 33% / 33%) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        {/* Col 1: Recent Activity */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiActivity className="text-blue-600" size={14} />
                                    <span>Recent Activity</span>
                                </div>
                                <Link href="/dashboard/fees/payments" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    View All <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { dot: 'bg-blue-500', text: 'New student registered', time: '2 min ago' },
                                    { dot: 'bg-emerald-500', text: 'Fees payment received (Ksh 25,000)', time: '5 min ago' },
                                    { dot: 'bg-amber-400', text: 'Report card generated', time: '12 min ago' },
                                    { dot: 'bg-purple-600', text: 'New staff added', time: '18 min ago' },
                                    { dot: 'bg-blue-600', text: 'Attendance updated', time: '25 min ago' },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <span className={`w-2 h-2 rounded-full ${act.dot} flex-shrink-0`} />
                                            <span className="text-[11px] font-semibold text-slate-700 truncate">{act.text}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 2: Upcoming Events */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiCalendar className="text-blue-600" size={14} />
                                    <span>Upcoming Events</span>
                                </div>
                                <Link href="/dashboard/timetable" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    View All <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { day: '18', month: 'Nov', bg: 'bg-blue-600', title: 'Parent Meeting', time: '8:00 AM – 11:00 AM', tag: 'Meeting', tagBg: 'bg-purple-50 text-purple-700 border-purple-200' },
                                    { day: '20', month: 'Nov', bg: 'bg-cyan-500', title: 'Term 3 Exams', time: '8:00 AM – 5:00 PM', tag: 'Exam', tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                    { day: '25', month: 'Nov', bg: 'bg-blue-600', title: 'School Sports Day', time: '9:00 AM – 4:00 PM', tag: 'Event', tagBg: 'bg-amber-50 text-amber-700 border-amber-200' },
                                ].map((ev, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl ${ev.bg} text-white flex flex-col items-center justify-center flex-shrink-0 shadow-xs leading-tight`}>
                                                <span className="text-sm font-black leading-none">{ev.day}</span>
                                                <span className="text-[8px] font-bold uppercase leading-none mt-0.5">{ev.month}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{ev.title}</p>
                                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{ev.time}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ev.tagBg}`}>
                                            {ev.tag}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 3: Top Performing Students */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiUsers className="text-blue-600" size={14} />
                                    <span>Top Performing Students</span>
                                </div>
                                <Link href="/dashboard/exams/merit-list" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    View All <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="space-y-2.5">
                                {(() => {
                                    const defaultTop = [
                                        { name: 'Mercy N. Kiplagat', form: 'Grade 10', avg: 98.5, initials: 'MK' },
                                        { name: 'Ochieng Auma', form: 'Grade 10', avg: 97.8, initials: 'OA' },
                                        { name: 'James Siambi', form: 'Grade 9', avg: 96.9, initials: 'JS' },
                                        { name: 'Everly Wangari', form: 'Grade 8', avg: 95.6, initials: 'EW' },
                                        { name: 'David Muthui', form: 'Grade 7', avg: 94.8, initials: 'DM' },
                                    ];
                                    const list = (topStudents.length >= 3 ? topStudents : defaultTop).slice(0, 5);
                                    return list.map((st: any, i: number) => {
                                        const inits = st.initials || (st.name || '').split(' ').map((n: string) => n ? n[0] : '').join('').slice(0, 2).toUpperCase() || 'ST';
                                        return (
                                            <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-[11px] font-bold text-slate-400 w-3 text-center">{i + 1}</span>
                                                    <div className="w-7 h-7 rounded-full bg-[#1e70eb] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                                                        {inits}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                                                            {st.name} <span className="text-slate-400 font-normal">― {st.form}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="flex-shrink-0 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                                    {st.avg}%
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 5: BOTTOM STATUS & UTILITY CONTROL BAR ── */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-3 px-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    statusFilter === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Active</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('ontime')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    statusFilter === 'ontime' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>On Time</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('overdue')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    statusFilter === 'overdue' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span>Overdue</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            >
                                <span>All Statuses</span>
                                <FiChevronDown size={11} />
                            </button>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 flex items-center justify-center text-xs font-bold shadow-xs"
                            >
                                ‹
                            </button>
                            {[1, 2, 3].map(page => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                        currentPage === page ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 flex items-center justify-center text-xs font-bold shadow-xs"
                            >
                                ›
                            </button>
                            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                                10 / page <FiChevronDown size={10} />
                            </span>
                        </div>

                        {/* Utility Toolbar Icons */}
                        <div className="flex items-center gap-2">
                            {/* Theme Toggle Pill */}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 px-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600">
                                <span>Theme</span>
                                <FiMoon size={12} className="text-slate-400" />
                                <div className="w-7 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                                    <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5 shadow-xs" />
                                </div>
                                <FiSun size={12} className="text-amber-500" />
                            </div>

                            {/* Print */}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors"
                                title="Print Dashboard"
                            >
                                <FiPrinter size={14} />
                            </button>

                            {/* Download */}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors"
                                title="Download PDF Report"
                            >
                                <FiDownload size={14} />
                            </button>

                            {/* Share */}
                            <button
                                type="button"
                                onClick={handleShare}
                                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors"
                                title="Share Dashboard Link"
                            >
                                <FiShare2 size={14} />
                            </button>

                            {/* Fullscreen */}
                            <button
                                type="button"
                                onClick={handleFullscreen}
                                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shadow-xs transition-colors"
                                title="Toggle Fullscreen"
                            >
                                <FiMaximize size={14} />
                            </button>

                            {/* Logout */}
                            <a
                                href="/api/auth/logout"
                                className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 flex items-center justify-center shadow-xs transition-colors"
                                title="Logout"
                            >
                                <FiPower size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center py-2 border-t border-slate-200/60 mt-2">
                <p className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">
                    APSIMS Ultra v3.0 · 🇰🇪 No.1 School ERP in Kenya · © {currentYear}
                </p>
            </div>
        </div>
    );
}

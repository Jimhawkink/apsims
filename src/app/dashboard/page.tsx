'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import AppHub from '@/components/AppHub';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    FiDollarSign, FiAlertTriangle, FiRefreshCw, FiUsers, FiTrendingUp,
    FiTrendingDown, FiBarChart2, FiChevronRight, FiActivity, FiShield,
    FiZap, FiAward, FiBook, FiCalendar, FiMessageSquare, FiCpu,
    FiCheckCircle, FiAlertCircle, FiTarget, FiStar, FiGrid,
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

// Animated counter hook
function useCounter(target: number, duration = 1200) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (target === 0) { setVal(0); return; }
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setVal(target); clearInterval(timer); }
            else setVal(Math.round(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return val;
}

// Pulse dot
function PulseDot({ color = '#22c55e' }: { color?: string }) {
    return (
        <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
        </span>
    );
}

// KPI Mega Card
function MegaCard({ label, value, sub, icon, gradient, trend, trendVal, link }:
    { label: string; value: string; sub: string; icon: React.ReactNode; gradient: string; trend?: 'up' | 'down' | 'flat'; trendVal?: string; link?: string }) {
    const inner = (
        <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer`}
            style={{ background: gradient }}>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 bg-white" />
            <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full opacity-10 bg-white" />
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {icon}
                </div>
                {trend && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-white/20' : trend === 'down' ? 'bg-red-400/30' : 'bg-white/10'}`}>
                        {trend === 'up' ? <FiTrendingUp size={10} /> : trend === 'down' ? <FiTrendingDown size={10} /> : null}
                        {trendVal}
                    </span>
                )}
            </div>
            <p className="text-2xl font-black tracking-tight leading-none mb-1">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-0.5">{label}</p>
            <p className="text-[10px] text-white/50 font-medium">{sub}</p>
        </div>
    );
    return link ? <Link href={link}>{inner}</Link> : inner;
}

// Section header
function SectionHeader({ title, sub, action, actionHref }: { title: string; sub?: string; action?: string; actionHref?: string }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div>
                <h3 className="text-sm font-black text-gray-800">{title}</h3>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {action && actionHref && (
                <Link href={actionHref} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    {action} <FiChevronRight size={12} />
                </Link>
            )}
        </div>
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
    const [liveTime, setLiveTime] = useState(new Date());
    const searchParams = useSearchParams();
    const accessDenied = searchParams.get('access_denied') === '1';
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setLiveTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const u = localStorage.getItem('school_user');
            if (u) { try { setUserRole(JSON.parse(u).role || JSON.parse(u).user_type || ''); } catch { } }
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

    const getDateWindow = useCallback(() => {
        const now = new Date();
        if (dateRange === 'today') return { from: today, to: today };
        if (dateRange === 'week') { const s = new Date(now); s.setDate(now.getDate() - 6); return { from: s.toISOString().split('T')[0], to: today }; }
        if (dateRange === 'month') { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { from: s.toISOString().split('T')[0], to: today }; }
        if (dateRange === 'year') return { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
        if (dateRange === 'custom') return { from: customFrom || `${currentYear}-01-01`, to: customTo || today };
        if (currentTerm) return { from: currentTerm.start_date || `${currentYear}-01-01`, to: currentTerm.end_date || today };
        return { from: `${currentYear}-01-01`, to: today };
    }, [dateRange, today, currentYear, currentTerm, customFrom, customTo]);

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
                const total = (da || []).length;
                const present = (da || []).filter((a: any) => a.status === 'Present').length;
                weekly.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), pct: total > 0 ? Math.round(present / total * 100) : 0 });
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
                const formMarks = marks.filter((m: any) => m.form_id === f.id);
                const avg = formMarks.length > 0 ? formMarks.reduce((s: number, m: any) => s + Number(m.marks || 0), 0) / formMarks.length : 0;
                return { form: f.form_name, avg: Math.round(avg * 10) / 10, count: formMarks.length };
            });
            setFormPerf(fp);

            const studentMarksMap: Record<number, number[]> = {};
            marks.forEach((m: any) => { if (!studentMarksMap[m.student_id]) studentMarksMap[m.student_id] = []; studentMarksMap[m.student_id].push(Number(m.marks || 0)); });
            const topS = Object.entries(studentMarksMap).map(([id, arr]) => ({ id: Number(id), avg: arr.reduce((s, n) => s + n, 0) / arr.length }))
                .sort((a, b) => b.avg - a.avg).slice(0, 5)
                .map(({ id, avg }) => {
                    const st = (allStudents || []).find((s: any) => s.id === id);
                    return { name: st ? `${st.first_name} ${st.last_name}` : '-', form: (formData || []).find((f: any) => f.id === st?.form_id)?.form_name || '-', avg: Math.round(avg * 10) / 10 };
                });
            setTopStudents(topS);

            const subj = subjectData || [];
            const sp = subj.slice(0, 10).map((s: any) => {
                const sm = marks.filter((m: any) => m.subject_id === s.id);
                const avg = sm.length > 0 ? sm.reduce((sum: number, m: any) => sum + Number(m.marks || 0), 0) / sm.length : 0;
                return { name: s.subject_name, avg: Math.round(avg * 10) / 10, count: sm.length };
            }).filter((s: any) => s.count > 0).sort((a: any, b: any) => b.avg - a.avg);
            setSubjectPerf(sp);

            const newAlerts: typeof alerts = [];
            const active = (allStudents || []).filter((s: any) => s.status === 'Active');
            const totalFees = (payData || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const { data: feeStructures } = await supabase.from('school_fee_structures').select('amount');
            const totalExpected = (feeStructures || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0) * active.length;
            const collRate = pct(totalFees, totalExpected);
            if (collRate < 40) newAlerts.push({ type: 'fees', msg: `Fee collection critically low at ${collRate}% — ${fmt(totalExpected - totalFees)} outstanding`, level: 'error' });
            else if (collRate < 70) newAlerts.push({ type: 'fees', msg: `Fee collection at ${collRate}% — ${fmt(totalExpected - totalFees)} outstanding`, level: 'warn' });
            const todayPresent = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const todayTotal = (todayAtt || []).length;
            if (todayTotal > 0 && pct(todayPresent, todayTotal) < 80) newAlerts.push({ type: 'attendance', msg: `Today's attendance is ${pct(todayPresent, todayTotal)}% — ${todayTotal - todayPresent} students absent`, level: 'warn' });
            if ((issueData || []).length > 0) newAlerts.push({ type: 'issues', msg: `${(issueData || []).length} open maintenance issues require attention`, level: 'info' });
            if ((discData || []).length > 10) newAlerts.push({ type: 'discipline', msg: `${(discData || []).length} discipline incidents this year`, level: 'warn' });
            const totalInc = totalFees + (incData || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const totalExp = (expData || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
            if (totalExp > totalInc) newAlerts.push({ type: 'finance', msg: `Financial deficit: Expenses (${fmt(totalExp)}) exceed income (${fmt(totalInc)})`, level: 'error' });
            setAlerts(newAlerts);

            const feesDue = Math.max(0, totalExpected - totalFees);
            const prepayments = Math.max(0, totalFees - totalExpected);
            const attPresent = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const attAbsent = (todayAtt || []).filter((a: any) => a.status === 'Absent').length;
            const attLate = (todayAtt || []).filter((a: any) => a.status === 'Late').length;
            const attRate = (todayAtt || []).length > 0 ? Math.round(attPresent / (todayAtt || []).length * 100) : 0;
            let reported = 0;
            if (termData) {
                const { count } = await supabase.from('school_daily_attendance').select('student_id', { count: 'exact', head: true }).gte('attendance_date', termData.start_date || `${currentYear}-01-01`).lte('attendance_date', termData.end_date || today);
                reported = count || 0;
            }
            const newThisYearCount = (allStudents || []).filter((s: any) => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length;
            const teachingCount = (teacherData || []).filter((t: any) => t.staff_type === 'Teaching').length;
            const nonTeachCount = (teacherData || []).filter((t: any) => t.staff_type !== 'Teaching').length;
            setStats({
                totalStudents: (allStudents || []).length, activeStudents: active.length, newEnrollments: newThisYearCount,
                totalStaff: (teacherData || []).length, teachingStaff: teachingCount, nonTeachingStaff: nonTeachCount,
                feesCollected: totalFees, feesDue, prepayments, totalIncome: totalInc, totalExpenses: totalExp,
                attendance: { present: attPresent, absent: attAbsent, late: attLate, rate: attRate }, reportedStudents: reported,
            });
        } catch (e) { console.error('Dashboard fetch error:', e); }
        setLoading(false);
    }, [today, currentYear]);

    useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

    const active = students.filter(s => s.status === 'Active');
    const totalFees = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const approvedExpenses = expenses.filter(e => (e.status || 'approved') === 'approved').reduce((s, e) => s + Number(e.amount || 0), 0);
    const otherIncome = income.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalIncome = totalFees + otherIncome;
    const netPosition = totalIncome - approvedExpenses;
    const todayPresentCt = attendance.filter(a => a.status === 'Present').length;
    const todayAbsentCt = attendance.filter(a => a.status === 'Absent').length;
    const todayLateCt = attendance.filter(a => a.status === 'Late').length;
    const attRate = pct(todayPresentCt, attendance.length);
    const newThisYear = students.filter(s => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length;
    const maleCount = active.filter(s => s.gender === 'Male').length;
    const femaleCount = active.filter(s => s.gender === 'Female').length;
    const payThisMonth = payments.filter(p => { const d = new Date(p.payment_date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === currentYear; }).reduce((s, p) => s + Number(p.amount || 0), 0);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    const dateRangeOpts: { key: DateRange; label: string }[] = [
        { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
        { key: 'month', label: 'Month' }, { key: 'term', label: 'Term' },
        { key: 'year', label: 'Year' }, { key: 'custom', label: 'Custom' },
    ];

    // Chart data
    const feeExpenseChart = {
        labels: monthlyFees.map(m => m.month),
        datasets: [
            { label: 'Fee Collections', data: monthlyFees.map(m => m.fees), backgroundColor: 'rgba(99,102,241,0.85)', borderRadius: 6, borderSkipped: false as const },
            { label: 'Expenses', data: monthlyFees.map(m => m.expenses), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, borderSkipped: false as const },
        ],
    };
    const weeklyAttChart = {
        labels: weeklyAtt.map(w => w.day),
        datasets: [{ label: 'Attendance %', data: weeklyAtt.map(w => w.pct), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#22c55e', pointRadius: 5, borderWidth: 2.5 }],
    };
    const formPerfChart = {
        labels: formPerf.map(f => f.form),
        datasets: [{ label: 'Avg Score', data: formPerf.map(f => f.avg), backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0891b2', '#16a34a'].slice(0, formPerf.length), borderRadius: 8 }],
    };
    const attDoughnut = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{ data: [todayPresentCt || 1, todayAbsentCt, todayLateCt], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
    };
    const chartBase = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    if (theme === 'light-soft' || theme === 'full-system') return <AppHub />;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
            <div className="relative">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    <FiBarChart2 className="text-white" size={32} />
                </div>
                <div className="absolute -inset-2 rounded-[28px] border-2 border-indigo-300 animate-ping opacity-30" />
            </div>
            <div className="text-center">
                <p className="text-base font-black text-gray-700">Loading APSIMS Ultra</p>
                <p className="text-xs text-gray-400 mt-1">Kenya's #1 School Management System</p>
            </div>
            <div className="flex gap-1.5">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-5 ultra-animate pb-8">

            {/* ══════════════ ROLE BANNERS ══════════════ */}
            {userRole.toLowerCase() === 'auditor' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-amber-300 bg-amber-50">
                    <span className="text-xl">🔍</span>
                    <div className="flex-1">
                        <p className="font-black text-sm text-amber-800">Auditor Read-Only Access</p>
                        <p className="text-xs text-amber-700/70">You have view-only access. Write operations are restricted.</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">READ ONLY</span>
                </div>
            )}
            {accessDenied && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-200 bg-red-50">
                    <FiShield size={18} className="text-red-500 flex-shrink-0" />
                    <div>
                        <p className="font-black text-sm text-red-800">Access Denied</p>
                        <p className="text-xs text-red-700/70">You do not have permission to access that page.</p>
                    </div>
                </div>
            )}

            {/* ══════════════ ULTRA HERO HEADER ══════════════ */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

                {/* Animated grid overlay */}
                <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />

                {/* Glow orbs */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />

                <div className="relative px-6 py-6">
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                            {/* Live badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <PulseDot color="#22c55e" />
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Live · APSIMS Ultra v3.0</span>
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white">🇰🇪 NO.1 IN KENYA</span>
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                {greeting}, <span className="text-indigo-300">{userName}</span>! 👋
                            </h1>
                            <p className="text-white/40 text-xs mt-1 font-medium">
                                {liveTime.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                &nbsp;·&nbsp;
                                <span className="font-mono text-white/60">{liveTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </p>
                        </div>

                        {/* Right side: Term + Refresh */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {currentTerm && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <FiCalendar size={12} className="text-indigo-300" />
                                    {currentTerm.term_name} · {currentYear}
                                </div>
                            )}
                            <button onClick={() => setRefreshKey(k => k + 1)}
                                className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                title="Refresh data">
                                <FiRefreshCw size={15} />
                            </button>
                        </div>
                    </div>

                    {/* ── HERO METRIC STRIP ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
                        {[
                            { label: 'Total Students', value: fmtN(active.length), icon: '🎓', color: '#6366f1', change: `+${newThisYear} this year` },
                            { label: 'Fees Collected', value: fmtShort(totalFees), icon: '💰', color: '#22c55e', change: `${pct(totalFees, totalFees + Math.max(0, stats.feesDue))}% collection rate` },
                            { label: "Today's Attendance", value: `${attRate}%`, icon: '✅', color: attRate >= 80 ? '#22c55e' : '#f59e0b', change: `${todayPresentCt} present · ${todayAbsentCt} absent` },
                            { label: 'Active Staff', value: fmtN(staff.length), icon: '👨‍🏫', color: '#3b82f6', change: `${stats.teachingStaff} teaching · ${stats.nonTeachingStaff} non-teaching` },
                        ].map((m, i) => (
                            <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xl">{m.icon}</span>
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: m.color }} />
                                </div>
                                <p className="text-xl font-black text-white">{m.value}</p>
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide mt-0.5">{m.label}</p>
                                <p className="text-[9px] text-white/35 mt-1">{m.change}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Date Range Filter ── */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-white/10">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mr-1">Filter:</span>
                        {dateRangeOpts.map(opt => (
                            <button key={opt.key} onClick={() => setDateRange(opt.key)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dateRange === opt.key
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white border border-white/10'}`}>
                                {opt.label}
                            </button>
                        ))}
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 ml-2">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 text-white border border-white/20 focus:outline-none focus:border-indigo-400" />
                                <span className="text-white/40 text-xs">→</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 text-white border border-white/20 focus:outline-none focus:border-indigo-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════ SMART ALERTS ══════════════ */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${a.level === 'error'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : a.level === 'warn'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                            {a.level === 'error' ? <FiAlertCircle size={15} className="flex-shrink-0" /> :
                                a.level === 'warn' ? <FiAlertTriangle size={15} className="flex-shrink-0" /> :
                                    <FiCheckCircle size={15} className="flex-shrink-0" />}
                            <span className="flex-1 text-xs">{a.msg}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${a.level === 'error' ? 'bg-red-200 text-red-700' : a.level === 'warn' ? 'bg-amber-200 text-amber-700' : 'bg-blue-200 text-blue-700'}`}>
                                {a.level === 'error' ? 'CRITICAL' : a.level === 'warn' ? 'WARNING' : 'INFO'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ══════════════ TAB NAV ══════════════ */}
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ══════════════════════════════════════════
                    OVERVIEW TAB
            ══════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-5">

                    {/* Fee Analytics Section */}
                    <FeeAnalyticsSection />

                    {/* Ultra KPI Cards */}
                    <UltraCardsSection stats={stats} currentYear={currentYear} fmt={fmt} />

                    {/* ── PREMIUM MEGA CARDS ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MegaCard
                            label="Total Students" value={fmtN(active.length)} sub={`${maleCount} boys · ${femaleCount} girls`}
                            icon={<FiUsers size={18} className="text-white" />}
                            gradient="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                            trend="up" trendVal={`+${newThisYear} new`} link="/dashboard/students"
                        />
                        <MegaCard
                            label="Fees Collected" value={fmtShort(totalFees)} sub={`${fmt(payThisMonth)} this month`}
                            icon={<FiDollarSign size={18} className="text-white" />}
                            gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
                            trend={netPosition >= 0 ? 'up' : 'down'} trendVal={netPosition >= 0 ? 'Surplus' : 'Deficit'}
                            link="/dashboard/fees"
                        />
                        <MegaCard
                            label="Attendance Rate" value={`${attRate}%`} sub={`${todayPresentCt} present today`}
                            icon={<FiCheckCircle size={18} className="text-white" />}
                            gradient={attRate >= 80 ? 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'}
                            trend={attRate >= 80 ? 'up' : 'down'} trendVal={`${todayAbsentCt} absent`}
                            link="/dashboard/attendance"
                        />
                        <MegaCard
                            label="Net Financial Position" value={fmtShort(Math.abs(netPosition))} sub={`Income ${fmtShort(totalIncome)}`}
                            icon={<FiTrendingUp size={18} className="text-white" />}
                            gradient={netPosition >= 0 ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'}
                            trend={netPosition >= 0 ? 'up' : 'down'} trendVal={netPosition >= 0 ? 'Surplus' : 'Deficit'}
                            link="/dashboard/fees/reports/pl"
                        />
                    </div>

                    {/* ── SECONDARY METRIC STRIP ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Gender Ratio M:F', value: `${maleCount}:${femaleCount}`, bar: pct(maleCount, active.length), color: '#3b82f6', icon: '⚖️', sub: `${pct(maleCount, active.length)}% male` },
                            { label: 'This Month Fees', value: fmtShort(payThisMonth), bar: Math.min(100, pct(payThisMonth, totalFees || 1)), color: '#10b981', icon: '📅', sub: 'of total collected' },
                            { label: "Today's Absentees", value: `${todayAbsentCt}`, bar: pct(todayAbsentCt, active.length || 1), color: '#ef4444', icon: '⚠️', sub: `out of ${active.length} active` },
                            { label: 'Discipline Cases', value: fmtN(disciplineCount), bar: Math.min(100, disciplineCount * 5), color: '#f59e0b', icon: '⚡', sub: `${currentYear} YTD` },
                        ].map((m, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">{m.label}</p>
                                    <span className="text-base">{m.icon}</span>
                                </div>
                                <p className="text-xl font-black text-gray-900">{m.value}</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
                                <div className="mt-2.5 bg-gray-100 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${m.bar}%`, background: m.color }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── CHARTS ROW ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Fee vs Expenses 12-month */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SectionHeader
                                title="📊 Fee Collections vs Expenses — 12 Months"
                                sub="Monthly revenue vs cost comparison"
                                action="Full Finance" actionHref="/dashboard/fees/analytics"
                            />
                            <div className="flex items-center gap-4 mb-4 text-[10px]">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" />Fees</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Expenses</span>
                            </div>
                            <div style={{ height: 220 }}>
                                <Bar data={feeExpenseChart} options={{
                                    ...chartBase,
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K`, font: { size: 10 } } },
                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                                    }
                                }} />
                            </div>
                        </div>

                        {/* Attendance Doughnut */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SectionHeader title="📋 Today's Attendance" sub={new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })} />
                            <div style={{ height: 150 }}>
                                {attendance.length > 0
                                    ? <Doughnut data={attDoughnut} options={{ responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 8 } } } }} />
                                    : <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2"><FiActivity size={28} /><p className="text-xs">No attendance recorded today</p></div>}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-1 text-center">
                                {[
                                    { label: 'Present', val: todayPresentCt, color: '#22c55e', bg: '#f0fdf4' },
                                    { label: 'Absent', val: todayAbsentCt, color: '#ef4444', bg: '#fef2f2' },
                                    { label: 'Late', val: todayLateCt, color: '#f59e0b', bg: '#fffbeb' },
                                ].map(a => (
                                    <div key={a.label} className="rounded-xl py-2" style={{ background: a.bg }}>
                                        <p className="text-lg font-black" style={{ color: a.color }}>{a.val}</p>
                                        <p className="text-[9px] font-bold text-gray-500">{a.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── ATTENDANCE TREND + ACADEMIC PERFORMANCE ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SectionHeader title="📈 Weekly Attendance Trend" sub="Last 7 school days" action="Full Report" actionHref="/dashboard/attendance" />
                            <div style={{ height: 190 }}>
                                <Line data={weeklyAttChart} options={{
                                    ...chartBase,
                                    scales: {
                                        y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } } },
                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                                    }
                                }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SectionHeader title="🏆 Form-wise Academic Performance" sub="Average exam score by class" action="Full Analysis" actionHref="/dashboard/exams/analysis" />
                            <div style={{ height: 190 }}>
                                {formPerf.some(f => f.avg > 0)
                                    ? <Bar data={formPerfChart} options={{ ...chartBase, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
                                    : <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2"><FiBook size={28} /><p className="text-xs">No exam marks yet</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* ── ENROLLMENT BY FORM ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <SectionHeader title="👥 Student Enrollment by Form/Grade" sub={`${active.length} active students across ${forms.length} classes`} action="Manage Students" actionHref="/dashboard/students" />
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {forms.map(f => {
                                    const inForm = active.filter(s => s.form_id === f.id);
                                    const male = inForm.filter(s => s.gender === 'Male').length;
                                    const female = inForm.filter(s => s.gender === 'Female').length;
                                    const total = inForm.length;
                                    const maxStudents = Math.max(...forms.map(form => active.filter(s => s.form_id === form.id).length), 1);
                                    const fillPct = pct(total, maxStudents);
                                    return (
                                        <div key={f.id} className="rounded-xl p-3.5 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-gray-800">{f.form_name}</span>
                                                <span className="text-lg font-black text-gray-900">{total}</span>
                                            </div>
                                            <div className="flex gap-3 mb-2 text-[10px]">
                                                <span className="text-blue-600 font-bold">♂ {male}</span>
                                                <span className="text-pink-600 font-bold">♀ {female}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                                                <div className="bg-blue-400 h-full rounded-l-full transition-all" style={{ width: `${pct(male, maxStudents)}%` }} />
                                                <div className="bg-pink-400 h-full rounded-r-full transition-all" style={{ width: `${pct(female, maxStudents)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── AI INSIGHTS + TOP STUDENTS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1">
                            <AIInsightsWidget />
                        </div>
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <SectionHeader title="🏆 Top Performing Students" sub="Based on latest exam marks" action="Merit List" actionHref="/dashboard/exams/merit-list" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {topStudents.map((s, i) => (
                                    <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-indigo-50/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                                <p className="text-[10px] text-gray-400">{s.form}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</p>
                                            <p className="text-[9px] text-gray-400">avg score</p>
                                        </div>
                                    </div>
                                ))}
                                {topStudents.length === 0 && (
                                    <div className="px-5 py-10 text-center text-gray-400">
                                        <FiAward size={28} className="mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No exam data yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── SUBJECT PERFORMANCE RANKING ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <SectionHeader title="📚 Subject Performance Ranking" sub="Ordered by average score" action="Full Analysis" actionHref="/dashboard/exams/analysis" />
                        </div>
                        <div className="p-5">
                            {subjectPerf.length === 0
                                ? <div className="text-center py-8 text-gray-400"><FiBarChart2 size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No marks recorded yet</p></div>
                                : <div className="space-y-3">
                                    {subjectPerf.slice(0, 8).map((s, i) => (
                                        <div key={s.name} className="flex items-center gap-3 group">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                                            <span className="text-sm font-semibold text-gray-700 w-36 truncate">{s.name}</span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${s.avg}%`, background: s.avg >= 70 ? '#22c55e' : s.avg >= 50 ? '#f59e0b' : '#ef4444' }} />
                                            </div>
                                            <span className={`text-sm font-black w-10 text-right ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</span>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                    </div>

                    {/* ── RECENT PAYMENTS + RECENT ENROLLMENTS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <SectionHeader title="💳 Recent Fee Payments" sub="Latest transactions" action="View All" actionHref="/dashboard/fees/payments" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentPayments.map((p, i) => {
                                    const st = students.find(s => s.id === p.student_id);
                                    return (
                                        <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                    <FiDollarSign size={14} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{st ? `${st.first_name} ${st.last_name}` : `Student #${p.student_id}`}</p>
                                                    <p className="text-[10px] text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })} · {p.payment_method}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-emerald-600">{fmt(Number(p.amount))}</span>
                                        </div>
                                    );
                                })}
                                {recentPayments.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No payments recorded</div>}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <SectionHeader title="🎓 Recent Enrollments" sub="Latest admissions" action="View All" actionHref="/dashboard/students" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentStudents.map((s, i) => {
                                    const form = forms.find(f => f.id === s.form_id);
                                    return (
                                        <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm"
                                                    style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#ec4899,#db2777)' }}>
                                                    {s.first_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                                    <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number} · {form?.form_name || '—'}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── QUICK ACTIONS ── */}
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">⚡ Quick Actions</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {[
                                { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', color: '#22c55e' },
                                { label: 'Add Student', href: '/dashboard/students/admissions', icon: '➕', color: '#6366f1' },
                                { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', color: '#3b82f6' },
                                { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', color: '#f59e0b' },
                                { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '📱', color: '#8b5cf6' },
                                { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', color: '#0891b2' },
                                { label: 'Add Expense', href: '/dashboard/expenses', icon: '💸', color: '#ef4444' },
                                { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👨‍💼', color: '#7c3aed' },
                            ].map((a, i) => (
                                <Link key={i} href={a.href}
                                    className="bg-white rounded-2xl p-3.5 text-center hover:shadow-lg hover:scale-[1.05] transition-all border border-gray-100 group overflow-hidden relative"
                                    style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: a.color }} />
                                    <span className="text-2xl block mb-1.5">{a.icon}</span>
                                    <p className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 leading-tight transition-colors">{a.label}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── COMMAND CENTER / INTELLIGENCE HUB ── */}
                    <div className="relative overflow-hidden rounded-3xl shadow-xl"
                        style={{ background: 'linear-gradient(135deg, #0c0a2a 0%, #1e1b4b 45%, #312e81 100%)' }}>
                        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle,#818cf8,transparent)' }} />
                        <div className="relative px-6 py-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center">
                                    <FiCpu size={18} className="text-indigo-300" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">APSIMS Intelligence Command Center</h3>
                                    <p className="text-[10px] text-white/40 mt-0.5">Advanced analytics & management tools</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <PulseDot color="#818cf8" />
                                    <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">All Systems Online</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { label: '📊 P&L Report', href: '/dashboard/fees/reports/pl', desc: 'Full financial statement' },
                                    { label: '📱 Bulk SMS', href: '/dashboard/fees/bulk-reminders', desc: 'Fee defaulter campaigns' },
                                    { label: '📈 Fee Analytics', href: '/dashboard/fees/analytics', desc: 'Revenue intelligence' },
                                    { label: '🎓 Merit List', href: '/dashboard/exams/merit-list', desc: 'Academic rankings' },
                                    { label: '📋 Report Cards', href: '/dashboard/exams/report-cards', desc: 'Term progress reports' },
                                    { label: '🛡️ Exam Integrity', href: '/dashboard/exams/exam-integrity', desc: 'Anti-cheating system' },
                                    { label: '🤖 AI Insights', href: '/dashboard/exams/ai-insights', desc: 'AI performance chatbot' },
                                    { label: '🏫 CBC Reports', href: '/dashboard/exams/cbc-reports', desc: 'KICD-aligned analytics' },
                                    { label: '✏️ JSS Marks', href: '/dashboard/jss/marks', desc: 'Grade 7-9 entry' },
                                    { label: '🏆 KPSEA', href: '/dashboard/exams/kpsea', desc: 'Grade 6 assessment' },
                                    { label: '🎓 Senior School', href: '/dashboard/cbc/senior-school', desc: 'Grade 10-12 hub' },
                                    { label: '🔒 Audit Trail', href: '/dashboard/fees/audit', desc: 'Full transaction log' },
                                ].map((m, i) => (
                                    <Link key={i} href={m.href}
                                        className="group relative rounded-2xl p-4 transition-all hover:scale-[1.03]"
                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                        <p className="text-xs font-bold text-white mb-1">{m.label}</p>
                                        <p className="text-[10px] text-white/45 font-medium leading-tight">{m.desc}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ OTHER TABS ══════════════ */}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* ── FOOTER ── */}
            <div className="text-center py-4 border-t border-gray-100">
                <p className="text-[9px] text-gray-300 font-medium tracking-widest uppercase">
                    APSIMS Ultra v3.0 · Alpha Plus School Information Management System · 🇰🇪 No.1 School ERP in Kenya · © {currentYear}
                </p>
            </div>
        </div>
    );
}


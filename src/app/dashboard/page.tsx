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
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    FiDollarSign, FiAlertTriangle, FiRefreshCw, FiUsers,
    FiTrendingUp, FiTrendingDown, FiBarChart2, FiChevronRight,
    FiActivity, FiShield, FiCpu, FiCheckCircle, FiAlertCircle,
    FiAward, FiBook, FiCalendar, FiTarget, FiZap,
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

    // Derived
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

    if (theme === 'light-soft' || theme === 'full-system') return <AppHub />;

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

    return (
        <div className="space-y-4 ultra-animate pb-8">

            {/* ── Role banners ── */}
            {userRole.toLowerCase() === 'auditor' && (
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

            {/* ════════════════════════════════════════
                SLIM BRIGHT HEADER (not heavy/dark)
            ════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Top accent line */}
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #3b82f6, #06b6d4, #10b981)' }} />
                <div className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                                <span className="text-[10px] text-gray-300 mx-1">·</span>
                                <span className="text-[10px] font-mono text-gray-400">{liveTime}</span>
                                {currentTerm && (
                                    <>
                                        <span className="text-[10px] text-gray-300 mx-1">·</span>
                                        <span className="text-[10px] font-bold text-indigo-500">{currentTerm.term_name} {currentYear}</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-lg font-black text-gray-900">
                                {greeting}, <span className="text-indigo-600">{userName}</span>! 👋
                            </h1>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-400 to-orange-400 text-white">🇰🇪 #1 IN KENYA</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 border border-gray-100 transition-all" title="Refresh">
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Date filter pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Period:</span>
                        {dateRangeOpts.map(opt => (
                            <button key={opt.key} onClick={() => setDateRange(opt.key)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${dateRange === opt.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                {opt.label}
                            </button>
                        ))}
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-1.5 ml-1">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-700 border border-gray-200 focus:outline-none focus:border-indigo-400" />
                                <span className="text-gray-400 text-[10px]">→</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg text-[10px] bg-gray-100 text-gray-700 border border-gray-200 focus:outline-none focus:border-indigo-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Smart Alerts ── */}
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

            {/* ── Tab Nav ── */}
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ════════════════════════════════════════
                OVERVIEW TAB
            ════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-4">

                    {/* ── TOP 4 BRIGHT STAT CARDS ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon="🎓" label="Active Students" value={fmtN(active.length)} sub={`${maleCount} boys · ${femaleCount} girls`} color="#4f46e5" bg="#eef2ff" trend="up" trendLabel={`+${newThisYear} new`} href="/dashboard/students" />
                        <StatCard icon="💰" label="Fees Collected" value={fmtShort(totalFees)} sub={`${fmt(payThisMonth)} this month`} color="#059669" bg="#ecfdf5" trend={netPos >= 0 ? 'up' : 'down'} trendLabel={netPos >= 0 ? 'Surplus' : 'Deficit'} href="/dashboard/fees" />
                        <StatCard icon="✅" label="Attendance Rate" value={`${attRate}%`} sub={`${todayPre} present · ${todayAbs} absent`} color={attRate >= 80 ? '#0891b2' : '#d97706'} bg={attRate >= 80 ? '#e0f2fe' : '#fef3c7'} trend={attRate >= 80 ? 'up' : 'down'} trendLabel={`${todayAbs} absent`} href="/dashboard/attendance" />
                        <StatCard icon="📊" label="Net Position" value={fmtShort(Math.abs(netPos))} sub={`Income ${fmtShort(totalIncome)}`} color={netPos >= 0 ? '#7c3aed' : '#dc2626'} bg={netPos >= 0 ? '#f5f3ff' : '#fef2f2'} trend={netPos >= 0 ? 'up' : 'down'} trendLabel={netPos >= 0 ? 'Surplus' : 'Deficit'} href="/dashboard/fees/reports/pl" />
                    </div>

                    {/* ── FEE ANALYTICS (existing component) ── */}
                    <FeeAnalyticsSection />

                    {/* ── ULTRA KPI CARDS ── */}
                    <UltraCardsSection stats={stats} currentYear={currentYear} fmt={fmt} />

                    {/* ── SECONDARY METRICS ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Gender M:F', value: `${maleCount}:${femaleCount}`, bar: pct(maleCount, active.length), color: '#3b82f6', bg: '#dbeafe', icon: '⚖️', sub: `${pct(maleCount, active.length)}% male` },
                            { label: 'Month Fees', value: fmtShort(payThisMonth), bar: Math.min(100, pct(payThisMonth, totalFees || 1)), color: '#10b981', bg: '#d1fae5', icon: '📅', sub: 'of total collected' },
                            { label: 'Today Absent', value: `${todayAbs}`, bar: pct(todayAbs, active.length || 1), color: '#ef4444', bg: '#fee2e2', icon: '⚠️', sub: `of ${active.length} active` },
                            { label: 'Discipline Cases', value: fmtN(disciplineCount), bar: Math.min(100, disciplineCount * 5), color: '#f59e0b', bg: '#fef3c7', icon: '⚡', sub: `${currentYear} total` },
                        ].map((m, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: m.bg }}>{m.icon}</div>
                                </div>
                                <p className="text-xl font-black text-gray-900">{m.value}</p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-0.5">{m.label}</p>
                                <p className="text-[9px] text-gray-400 mb-2">{m.sub}</p>
                                <div className="bg-gray-100 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${m.bar}%`, background: m.color }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── CHARTS ROW 1: Fees vs Expenses + Doughnut ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SH title="📊 Fee Collections vs Expenses — 12 Months" sub="Monthly revenue vs costs" href="/dashboard/fees/analytics" linkLabel="Analytics" />
                            <div className="flex items-center gap-4 mb-3 text-[10px]">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" />Fees</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Expenses</span>
                            </div>
                            <div style={{ height: 220 }}>
                                <Bar data={feeExpChart} options={{ ...cb, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K`, font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SH title="📋 Today's Attendance" sub={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} />
                            <div style={{ height: 155 }}>
                                {attendance.length > 0
                                    ? <Doughnut data={attDonut} options={{ responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 8 } } } }} />
                                    : <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2"><FiActivity size={26} /><p className="text-xs text-gray-400">No data today</p></div>}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                {[{ l: 'Present', v: todayPre, c: '#22c55e', b: '#f0fdf4' }, { l: 'Absent', v: todayAbs, c: '#ef4444', b: '#fef2f2' }, { l: 'Late', v: todayLat, c: '#f59e0b', b: '#fffbeb' }].map(a => (
                                    <div key={a.l} className="rounded-xl py-2" style={{ background: a.b }}>
                                        <p className="text-base font-black" style={{ color: a.c }}>{a.v}</p>
                                        <p className="text-[9px] font-bold text-gray-500">{a.l}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── CHARTS ROW 2: Attendance Trend + Academic ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SH title="📈 Weekly Attendance Trend" sub="Last 7 school days" href="/dashboard/attendance" linkLabel="Full Report" />
                            <div style={{ height: 190 }}>
                                <Line data={wAttChart} options={{ ...cb, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <SH title="🏆 Academic Performance by Form" sub="Average exam score per class" href="/dashboard/exams/analysis" linkLabel="Full Analysis" />
                            <div style={{ height: 190 }}>
                                {formPerf.some(f => f.avg > 0)
                                    ? <Bar data={fPerfChart} options={{ ...cb, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
                                    : <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2"><FiBook size={26} /><p className="text-xs text-gray-400">No exam marks yet</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* ── ENROLLMENT BY FORM (card grid) ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50">
                            <SH title="👥 Student Enrollment by Form / Grade" sub={`${active.length} active across ${forms.length} classes`} href="/dashboard/students" linkLabel="Manage" />
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {forms.map(f => {
                                const inForm = active.filter(s => s.form_id === f.id);
                                const male = inForm.filter(s => s.gender === 'Male').length;
                                const female = inForm.filter(s => s.gender === 'Female').length;
                                const maxSt = Math.max(...forms.map(fm => active.filter(s => s.form_id === fm.id).length), 1);
                                return (
                                    <div key={f.id} className="rounded-xl p-3 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all">
                                        <p className="text-xs font-black text-gray-700 truncate mb-1">{f.form_name}</p>
                                        <p className="text-2xl font-black text-gray-900">{inForm.length}</p>
                                        <div className="flex gap-2 mt-1 mb-2 text-[9px]">
                                            <span className="text-blue-500 font-bold">♂ {male}</span>
                                            <span className="text-pink-500 font-bold">♀ {female}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                                            <div className="bg-blue-400 h-full" style={{ width: `${pct(male, maxSt)}%` }} />
                                            <div className="bg-pink-400 h-full" style={{ width: `${pct(female, maxSt)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── NET FINANCIAL POSITION STRIP ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Total Income', value: fmtShort(totalIncome), color: '#059669', bg: '#ecfdf5', icon: '📥', sub: `Fees + other income ${currentYear}` },
                            { label: 'Total Expenses', value: fmtShort(approvedExp), color: '#dc2626', bg: '#fef2f2', icon: '📤', sub: `Approved expenses ${currentYear}` },
                            { label: netPos >= 0 ? 'Net Surplus' : 'Net Deficit', value: fmtShort(Math.abs(netPos)), color: netPos >= 0 ? '#7c3aed' : '#dc2626', bg: netPos >= 0 ? '#f5f3ff' : '#fef2f2', icon: netPos >= 0 ? '✅' : '⚠️', sub: netPos >= 0 ? 'School is financially healthy' : 'Expenses exceed income' },
                        ].map((m, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: m.bg }}>{m.icon}</div>
                                <div>
                                    <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── AI INSIGHTS + TOP STUDENTS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <AIInsightsWidget />
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <SH title="🏆 Top Performing Students" sub="Based on exam marks" href="/dashboard/exams/merit-list" linkLabel="Merit List" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {topStudents.map((s, i) => (
                                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-indigo-50/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                                <p className="text-[10px] text-gray-400">{s.form}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.avg}%</p>
                                            <p className="text-[9px] text-gray-400">avg score</p>
                                        </div>
                                    </div>
                                ))}
                                {topStudents.length === 0 && <div className="py-10 text-center text-gray-400"><FiAward size={26} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No exam data yet</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* ── SUBJECT PERFORMANCE ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <SH title="📚 Subject Performance Ranking" sub="Average score per subject" href="/dashboard/exams/analysis" linkLabel="Full Analysis" />
                        {subjectPerf.length === 0
                            ? <div className="py-8 text-center text-gray-400"><FiBarChart2 size={26} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No exam marks yet</p></div>
                            : <div className="space-y-2.5">
                                {subjectPerf.slice(0, 8).map((s, i) => (
                                    <div key={s.name} className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                                        <span className="text-sm font-semibold text-gray-700 w-40 truncate flex-shrink-0">{s.name}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div className="h-2 rounded-full transition-all" style={{ width: `${s.avg}%`, background: s.avg >= 70 ? '#22c55e' : s.avg >= 50 ? '#f59e0b' : '#ef4444' }} />
                                        </div>
                                        <span className={`text-sm font-black w-10 text-right ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.avg}%</span>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>

                    {/* ── RECENT PAYMENTS + RECENT ENROLLMENTS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <SH title="💳 Recent Fee Payments" sub="Latest transactions" href="/dashboard/fees/payments" linkLabel="View All" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentPayments.map((p) => {
                                    const st = students.find(s => s.id === p.student_id);
                                    return (
                                        <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                    <FiDollarSign size={13} className="text-emerald-600" />
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
                                {recentPayments.length === 0 && <div className="py-8 text-center text-gray-400 text-xs">No payments recorded</div>}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <SH title="🎓 Recent Enrollments" sub="Latest student admissions" href="/dashboard/students" linkLabel="View All" />
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentStudents.map((s) => {
                                    const form = forms.find(f => f.id === s.form_id);
                                    return (
                                        <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                                                    style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#ec4899,#db2777)' }}>
                                                    {s.first_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                                    <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number} · {form?.form_name || '—'}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
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
                                { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', color: '#22c55e', bg: '#ecfdf5' },
                                { label: 'Add Student', href: '/dashboard/students/admissions', icon: '➕', color: '#6366f1', bg: '#eef2ff' },
                                { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', color: '#3b82f6', bg: '#dbeafe' },
                                { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', color: '#f59e0b', bg: '#fef3c7' },
                                { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '📱', color: '#8b5cf6', bg: '#ede9fe' },
                                { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', color: '#0891b2', bg: '#e0f2fe' },
                                { label: 'Add Expense', href: '/dashboard/expenses', icon: '💸', color: '#ef4444', bg: '#fee2e2' },
                                { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👨‍💼', color: '#7c3aed', bg: '#f5f3ff' },
                            ].map((a, i) => (
                                <Link key={i} href={a.href}
                                    className="bg-white rounded-2xl p-3.5 text-center hover:shadow-md hover:scale-[1.04] transition-all border border-gray-100 group overflow-hidden relative"
                                    style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg mx-auto mb-2" style={{ background: a.bg }}>{a.icon}</div>
                                    <p className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 leading-tight transition-colors">{a.label}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── INTELLIGENCE COMMAND CENTER (bright card) ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <FiCpu size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-800 uppercase tracking-wide">APSIMS Intelligence Hub</p>
                                <p className="text-[10px] text-gray-400">Advanced tools — Kenya's most powerful school system</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span>
                                <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">All Online</span>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                            {[
                                { label: '📊 P&L Report', href: '/dashboard/fees/reports/pl', desc: 'Full financial statement', color: '#059669', bg: '#ecfdf5' },
                                { label: '📱 Bulk SMS', href: '/dashboard/fees/bulk-reminders', desc: 'Fee defaulter campaigns', color: '#7c3aed', bg: '#f5f3ff' },
                                { label: '📈 Fee Analytics', href: '/dashboard/fees/analytics', desc: 'Revenue intelligence', color: '#0891b2', bg: '#e0f2fe' },
                                { label: '🎓 Merit List', href: '/dashboard/exams/merit-list', desc: 'Academic rankings', color: '#d97706', bg: '#fef3c7' },
                                { label: '📋 Report Cards', href: '/dashboard/exams/report-cards', desc: 'Term progress reports', color: '#6366f1', bg: '#eef2ff' },
                                { label: '🛡️ Exam Integrity', href: '/dashboard/exams/exam-integrity', desc: 'Anti-cheating system', color: '#dc2626', bg: '#fef2f2' },
                                { label: '🤖 AI Insights', href: '/dashboard/exams/ai-insights', desc: 'AI performance chatbot', color: '#059669', bg: '#ecfdf5' },
                                { label: '🏫 CBC Reports', href: '/dashboard/exams/cbc-reports', desc: 'KICD-aligned analytics', color: '#0891b2', bg: '#e0f2fe' },
                                { label: '✏️ JSS Marks', href: '/dashboard/jss/marks', desc: 'Grade 7-9 entry', color: '#7c3aed', bg: '#f5f3ff' },
                                { label: '🏆 KPSEA', href: '/dashboard/exams/kpsea', desc: 'Grade 6 assessment', color: '#d97706', bg: '#fef3c7' },
                                { label: '🎓 Senior School', href: '/dashboard/cbc/senior-school', desc: 'Grade 10-12 hub', color: '#6366f1', bg: '#eef2ff' },
                                { label: '🔒 Audit Trail', href: '/dashboard/fees/audit', desc: 'Full transaction log', color: '#dc2626', bg: '#fef2f2' },
                            ].map((m, i) => (
                                <Link key={i} href={m.href}
                                    className="rounded-xl p-3 border border-gray-100 hover:border-current hover:shadow-sm transition-all group"
                                    style={{ borderLeftWidth: 3, borderLeftColor: m.color }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm mb-2" style={{ background: m.bg }}>{m.label.split(' ')[0]}</div>
                                    <p className="text-[11px] font-bold text-gray-700 leading-tight">{m.label.split(' ').slice(1).join(' ')}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{m.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Other tabs ── */}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* Footer */}
            <div className="text-center py-3 border-t border-gray-100">
                <p className="text-[9px] text-gray-300 font-medium tracking-widest uppercase">
                    APSIMS Ultra v3.0 · 🇰🇪 No.1 School ERP in Kenya · © {currentYear}
                </p>
            </div>
        </div>
    );
}


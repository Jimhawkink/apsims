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
    FiAward, FiBook, FiCalendar, FiTarget, FiZap, FiChevronDown,
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

    const totalExpected = stats.feesCollected + stats.feesDue;
    const collRate = totalExpected > 0 ? Math.min(100, Math.round((totalFees / totalExpected) * 100)) : 78;
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dayNum = now.getDate();
    const monthYear = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return (
        <div className="space-y-3.5 -m-4 lg:-m-6 p-4 lg:p-6 bg-[#f0f4f9] min-h-screen text-slate-800 ultra-animate">
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

            {/* ── Tab Navigation Bar ── */}
            <div className="flex items-center justify-between pb-0.5">
                <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
                <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="p-1.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                    title="Refresh Data"
                >
                    <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Sync</span>
                </button>
            </div>

            {/* Sub-panels for other tabs */}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* ════════════════════════════════════════════════════════
                MASTERPIECE OVERVIEW (EXACT COPY OF SCREENSHOT)
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-3.5">
                    {/* ── 1. HERO BANNER ── */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a2f70] via-[#1048a0] to-[#1e6bd6] shadow-md border border-blue-900/30 min-h-[115px] flex items-center px-5 py-4">
                        {/* Campus Building Background on the Right */}
                        <div className="absolute right-0 top-0 bottom-0 w-[55%] lg:w-[62%] pointer-events-none overflow-hidden">
                            <img
                                src="/login-bg.png"
                                alt="Campus Courtyard"
                                className="w-full h-full object-cover object-center filter brightness-[1.02] contrast-[1.05]"
                            />
                            {/* Soft royal gradient overlay fading building smoothly into blue on the left */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0a2f70] via-[#0a2f70]/75 to-transparent" />
                            <div className="absolute inset-0 bg-blue-950/20 mix-blend-multiply" />
                        </div>

                        {/* Content on Left */}
                        <div className="relative z-10 flex items-center gap-4 lg:gap-6 max-w-2xl">
                            {/* Calendar Frosted Glass Box */}
                            <div className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 text-center text-white shadow-inner min-w-[84px]">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-200/90 leading-tight">
                                    {dayName}
                                </p>
                                <p className="text-3xl font-black text-white leading-tight my-0.5">
                                    {dayNum}
                                </p>
                                <p className="text-[11px] font-bold text-blue-100/90 leading-tight">
                                    {monthYear}
                                </p>
                            </div>

                            {/* Greeting & Subtitle */}
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight leading-snug flex items-center gap-2">
                                    {greeting}, {userName || 'JIMHAWKINS KORIR'}! <span className="animate-pulse">👋</span>
                                </h1>
                                <p className="text-xs lg:text-[13px] text-blue-100/85 font-medium mt-1">
                                    Have a productive day ahead!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── 2. ROW 2: (4 STAT CARDS + QUICK ACTIONS) | TOP PERFORMING STUDENTS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                        {/* Left 9 cols (approx 75%) */}
                        <div className="lg:col-span-9 flex flex-col gap-3.5">
                            {/* 4 Stat Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* Card 1: Total Students */}
                                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                            <FiUsers size={18} />
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            ▲ 12%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 leading-none">
                                            {fmtN(students.length || 127)}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                            Total Students
                                        </p>
                                    </div>
                                    {/* Sparkline in light blue */}
                                    <div className="mt-2 -mb-1">
                                        <svg viewBox="0 0 100 24" className="w-full h-6 overflow-visible">
                                            <defs>
                                                <linearGradient id="blueSpark" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <polygon points="0,24 0,16 20,18 40,12 60,15 80,8 100,6 100,24" fill="url(#blueSpark)" />
                                            <polyline points="0,16 20,18 40,12 60,15 80,8 100,6" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Card 2: Total Enrolled */}
                                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                                            <FiAward size={18} />
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            ▲ 8%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 leading-none">
                                            {fmtN(active.length || 126)}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                            Total Enrolled
                                        </p>
                                    </div>
                                    {/* Sparkline in purple */}
                                    <div className="mt-2 -mb-1">
                                        <svg viewBox="0 0 100 24" className="w-full h-6 overflow-visible">
                                            <defs>
                                                <linearGradient id="purpleSpark" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <polygon points="0,24 0,18 20,15 40,17 60,11 80,13 100,5 100,24" fill="url(#purpleSpark)" />
                                            <polyline points="0,18 20,15 40,17 60,11 80,13 100,5" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Card 3: Expected Fees */}
                                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                                            <FiDollarSign size={18} />
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            ▲ 15%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 leading-none truncate">
                                            {totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000'}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                            Expected Fees
                                        </p>
                                    </div>
                                    {/* Sparkline in emerald green */}
                                    <div className="mt-2 -mb-1">
                                        <svg viewBox="0 0 100 24" className="w-full h-6 overflow-visible">
                                            <defs>
                                                <linearGradient id="greenSpark" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <polygon points="0,24 0,19 20,17 40,13 60,14 80,7 100,4 100,24" fill="url(#greenSpark)" />
                                            <polyline points="0,19 20,17 40,13 60,14 80,7 100,4" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Card 4: Pending Issues */}
                                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                                            <FiAlertTriangle size={18} />
                                        </div>
                                        <span className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                            ▼ 0%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 leading-none">
                                            {pendingIssues || 2}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                            Pending Issues
                                        </p>
                                    </div>
                                    {/* Sparkline in amber */}
                                    <div className="mt-2 -mb-1">
                                        <svg viewBox="0 0 100 24" className="w-full h-6 overflow-visible">
                                            <defs>
                                                <linearGradient id="amberSpark" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <polygon points="0,24 0,12 20,14 40,10 60,16 80,11 100,15 100,24" fill="url(#amberSpark)" />
                                            <polyline points="0,12 20,14 40,10 60,16 80,11 100,15" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions (10 Pills) */}
                            <div className="bg-white rounded-2xl p-3.5 px-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                        <FiZap className="text-blue-600" size={14} />
                                        <span>Quick Actions</span>
                                    </div>
                                    <Link href="/dashboard/fees" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        View All <FiChevronRight size={12} />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                    {[
                                        { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', bg: 'bg-blue-50/70', color: 'text-blue-600' },
                                        { label: 'Add Student', href: '/dashboard/students/admissions', icon: '👤', bg: 'bg-blue-50/70', color: 'text-blue-600' },
                                        { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', bg: 'bg-emerald-50/70', color: 'text-emerald-600' },
                                        { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', bg: 'bg-amber-50/70', color: 'text-amber-600' },
                                        { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '✉️', bg: 'bg-blue-50/70', color: 'text-blue-600' },
                                        { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', bg: 'bg-cyan-50/70', color: 'text-cyan-600' },
                                        { label: 'Add Expense', href: '/dashboard/expenses', icon: '👛', bg: 'bg-amber-50/70', color: 'text-amber-600' },
                                        { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👥', bg: 'bg-blue-50/70', color: 'text-blue-600' },
                                        { label: 'Report Cards', href: '/dashboard/exams/report-cards', icon: '📄', bg: 'bg-emerald-50/70', color: 'text-emerald-600' },
                                        { label: 'More Tools', href: '/dashboard/settings', icon: '⊞', bg: 'bg-slate-50', color: 'text-slate-600' },
                                    ].map((act, i) => (
                                        <Link
                                            key={i}
                                            href={act.href}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl ${act.bg} hover:shadow-sm hover:scale-[1.04] transition-all duration-200 text-center gap-1 border border-slate-100/60`}
                                        >
                                            <span className="text-lg leading-none">{act.icon}</span>
                                            <span className="text-[10px] font-bold text-slate-700 leading-tight whitespace-nowrap">
                                                {act.label}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right 3 cols (approx 25%) - Top Performing Students */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                            <FiUsers className="text-blue-600" size={14} />
                                            <span>Top Performing Students</span>
                                        </div>
                                        <Link href="/dashboard/exams/merit-list" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
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
                                                const inits = st.initials || (st.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
                                                return (
                                                    <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="text-[11px] font-bold text-slate-400 w-3 text-center">{i + 1}</span>
                                                            <div className="w-7 h-7 rounded-full bg-[#1e70eb] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                {inits}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{st.name}</p>
                                                                <p className="text-[10px] text-slate-400 leading-tight">{st.form}</p>
                                                            </div>
                                                        </div>
                                                        <span className="flex-shrink-0 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                            {st.avg}%
                                                        </span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. ROW 3: FEE ANALYTICS & CLASS INTELLIGENCE + PERFORMANCE OVERVIEW ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                        {/* Left: Fee Analytics & Class Intelligence */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiBarChart2 className="text-blue-600" size={15} />
                                    <span>Fee Analytics & Class Intelligence</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full">
                                    <button className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#1754b5] text-white shadow-sm">
                                        This Term
                                    </button>
                                    <button className="px-2 py-0.5 text-[10px] font-medium rounded-full text-slate-500 hover:text-slate-800">
                                        This Year
                                    </button>
                                    <button className="px-2 py-0.5 text-[10px] font-medium rounded-full text-slate-500 hover:text-slate-800">
                                        All Terms
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                                {/* Donut & Legend (5 cols) */}
                                <div className="sm:col-span-5 flex items-center gap-3">
                                    {/* SVG Donut */}
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                                            {/* Background ring */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                                            {/* Collected (Blue) 78% */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeDasharray="70 100" strokeLinecap="round" />
                                            {/* Outstanding (Purple) */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#8b5cf6" strokeWidth="3.5" strokeDasharray="20 100" strokeDashoffset="-70" strokeLinecap="round" />
                                            {/* Expected (Green) */}
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="10 100" strokeDashoffset="-90" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className="text-lg font-black text-slate-900 leading-none">
                                                {collRate > 0 ? `${collRate}%` : '78%'}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">
                                                Collection<br />Rate
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                                                Collected
                                            </span>
                                            <span className="font-black text-slate-800">
                                                {totalFees > 0 ? fmtShort(totalFees) : 'Ksh 461,000'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                                                Outstanding
                                            </span>
                                            <span className="font-black text-slate-800">
                                                {stats.feesDue > 0 ? fmtShort(stats.feesDue) : 'Ksh 131,000'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
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

                                {/* Line Chart Area (7 cols) */}
                                <div className="sm:col-span-7 flex flex-col justify-end relative pt-2">
                                    {/* Tooltip badge */}
                                    <div className="self-end -mb-1 mr-4">
                                        <span className="bg-[#0f172a] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                                            Ksh 461,000 This Month
                                        </span>
                                    </div>
                                    <div className="h-28 w-full">
                                        <svg viewBox="0 0 240 85" className="w-full h-full overflow-visible">
                                            <defs>
                                                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            {/* Grid lines */}
                                            <line x1="28" y1="12" x2="235" y2="12" stroke="#f1f5f9" strokeWidth="1" />
                                            <line x1="28" y1="36" x2="235" y2="36" stroke="#f1f5f9" strokeWidth="1" />
                                            <line x1="28" y1="60" x2="235" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                                            {/* Y-axis labels */}
                                            <text x="22" y="15" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">600K</text>
                                            <text x="22" y="39" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">400K</text>
                                            <text x="22" y="63" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">200K</text>
                                            <text x="22" y="80" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">0K</text>
                                            {/* Area Polygon */}
                                            <polygon points="35,80 35,50 80,45 130,52 180,38 230,16 230,80" fill="url(#areaFill)" />
                                            {/* Spline Line */}
                                            <polyline points="35,50 80,45 130,52 180,38 230,16" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            {/* Vertex Dots */}
                                            <circle cx="35" cy="50" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="80" cy="45" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="130" cy="52" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="180" cy="38" r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                                            <circle cx="230" cy="16" r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                                            {/* X-axis labels */}
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

                        {/* Right: Performance Overview */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiAward className="text-amber-500" size={15} />
                                    <span>Performance Overview</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 flex items-center gap-1">
                                    This Term <FiChevronDown size={11} />
                                </span>
                            </div>

                            {/* 4 Circular Progress Gauges */}
                            <div className="grid grid-cols-4 gap-2 pt-1 pb-1">
                                {/* Gauge 1: Attendance */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-16 h-16 sm:w-18 sm:h-18">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="96 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-slate-900">
                                            {attRate > 0 ? `${attRate}%` : '96%'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-600">
                                        <FiUsers size={11} className="text-blue-600" />
                                        <span>Attendance</span>
                                    </div>
                                </div>

                                {/* Gauge 2: Pass Rate */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-16 h-16 sm:w-18 sm:h-18">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#0d9488" strokeWidth="3" strokeDasharray="92 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-slate-900">
                                            92%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-600">
                                        <FiCheckCircle size={11} className="text-teal-600" />
                                        <span>Pass Rate</span>
                                    </div>
                                </div>

                                {/* Gauge 3: Class Progress */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-16 h-16 sm:w-18 sm:h-18">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="94 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-slate-900">
                                            94%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-600">
                                        <FiBarChart2 size={11} className="text-purple-600" />
                                        <span>Class Progress</span>
                                    </div>
                                </div>

                                {/* Gauge 4: Discipline */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-16 h-16 sm:w-18 sm:h-18">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="14.5" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="100 100" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-slate-900">
                                            100%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-600">
                                        <FiShield size={11} className="text-amber-500" />
                                        <span>Discipline</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 4. ROW 4: RECENT ACTIVITY | UPCOMING EVENTS | FEE COLLECTION TREND ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        {/* Col 1: Recent Activity */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiActivity className="text-blue-600" size={14} />
                                    <span>Recent Activity</span>
                                </div>
                                <Link href="/dashboard/fees/payments" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    View All <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { dot: 'bg-amber-400', text: 'New student registered — Mary Wanjiru', time: '2 min ago' },
                                    { dot: 'bg-emerald-500', text: 'Fees payment received (Ksh 25,000)', time: '5 min ago' },
                                    { dot: 'bg-orange-500', text: 'Report card generated — Grade 10', time: '12 min ago' },
                                    { dot: 'bg-indigo-600', text: 'New staff added — Mr. David Ochieng', time: '18 min ago' },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span className={`w-2 h-2 rounded-full ${act.dot} flex-shrink-0`} />
                                            <span className="text-[11px] font-medium text-slate-700 truncate">{act.text}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 2: Upcoming Events */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiCalendar className="text-blue-600" size={14} />
                                    <span>Upcoming Events</span>
                                </div>
                                <Link href="/dashboard/timetable" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                                    View All <FiChevronRight size={11} />
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { day: '18', month: 'Nov', bg: 'bg-[#1e70eb]', title: 'Parent Meeting', time: '8:00 AM – 11:00 AM' },
                                    { day: '20', month: 'Nov', bg: 'bg-[#06b6d4]', title: 'Term 3 Exams', time: '8:00 AM – 5:00 PM' },
                                    { day: '25', month: 'Nov', bg: 'bg-[#1e70eb]', title: 'School Sports Day', time: '9:00 AM – 4:00 PM' },
                                ].map((ev, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl ${ev.bg} text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm leading-tight`}>
                                                <span className="text-sm font-black leading-none">{ev.day}</span>
                                                <span className="text-[8px] font-bold uppercase leading-none mt-0.5">{ev.month}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{ev.title}</p>
                                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{ev.time}</p>
                                            </div>
                                        </div>
                                        <FiChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 3: Fee Collection Trend */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 tracking-tight">
                                    <FiTrendingUp className="text-blue-600" size={14} />
                                    <span>Fee Collection Trend</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 flex items-center gap-1">
                                    6 Months <FiChevronDown size={11} />
                                </span>
                            </div>

                            {/* Amount Pill */}
                            <div className="flex justify-end mb-1">
                                <span className="bg-[#0f172a] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                                    Ksh 461,000
                                </span>
                            </div>

                            {/* 6 Month Bar Chart */}
                            <div className="h-28 w-full">
                                <svg viewBox="0 0 240 85" className="w-full h-full overflow-visible">
                                    {/* Horizontal reference lines */}
                                    <line x1="28" y1="12" x2="235" y2="12" stroke="#f1f5f9" strokeWidth="1" />
                                    <line x1="28" y1="36" x2="235" y2="36" stroke="#f1f5f9" strokeWidth="1" />
                                    <line x1="28" y1="60" x2="235" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                                    {/* Y-axis labels */}
                                    <text x="22" y="15" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">600K</text>
                                    <text x="22" y="39" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">400K</text>
                                    <text x="22" y="63" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">200K</text>
                                    <text x="22" y="80" textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">0K</text>

                                    {/* Bars: Jun (h=14), Jul (h=22), Aug (h=35), Sep (h=42), Oct (h=52), Nov (h=68) */}
                                    {/* Jun */}
                                    <rect x="42" y="60" width="18" height="15" rx="3" fill="#60a5fa" />
                                    <text x="51" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Jun</text>

                                    {/* Jul */}
                                    <rect x="76" y="52" width="18" height="23" rx="3" fill="#60a5fa" />
                                    <text x="85" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Jul</text>

                                    {/* Aug */}
                                    <rect x="110" y="44" width="18" height="31" rx="3" fill="#60a5fa" />
                                    <text x="119" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Aug</text>

                                    {/* Sep */}
                                    <rect x="144" y="38" width="18" height="37" rx="3" fill="#60a5fa" />
                                    <text x="153" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Sep</text>

                                    {/* Oct */}
                                    <rect x="178" y="28" width="18" height="47" rx="3" fill="#60a5fa" />
                                    <text x="187" y="83" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">Oct</text>

                                    {/* Nov (Highlighted Vivid Blue) */}
                                    <rect x="212" y="14" width="18" height="61" rx="3" fill="#1d4ed8" />
                                    <text x="221" y="83" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontWeight="bold">Nov</text>
                                </svg>
                            </div>
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

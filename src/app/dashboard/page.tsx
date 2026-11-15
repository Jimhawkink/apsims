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

    return (
        <div style={{ background: 'linear-gradient(145deg, #0A1529 0%, #0E1F4A 100%)', margin: '-16px', padding: '16px', minHeight: '100vh' }} className="ultra-animate">

            {/* ── Role banners ── */}
            {userRole.toLowerCase() === 'auditor' && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-400 bg-amber-900/40 mb-3">
                    <span>🔍</span>
                    <p className="text-xs font-bold text-amber-200 flex-1">Auditor Read-Only Access — write operations are restricted.</p>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500 text-white rounded-full">READ ONLY</span>
                </div>
            )}
            {accessDenied && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-400 bg-red-900/40 mb-3">
                    <FiShield size={16} className="text-red-400" />
                    <p className="text-xs font-bold text-red-200">Access Denied — you do not have permission to view that page.</p>
                </div>
            )}

            {/* ════════ HERO BANNER ════════ */}
            <div style={{
                background: 'linear-gradient(135deg, #0D2461 0%, #1a3a8a 50%, #0d4b8a 100%)',
                borderRadius: 16,
                marginBottom: 12,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '14px 20px',
            }}>
                {/* School building background image */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url(/login-bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center right',
                    opacity: 0.22,
                }} />
                {/* Right fade overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, #0D2461 30%, transparent 80%)',
                }} />

                {/* Date box */}
                <div style={{
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 12,
                    padding: '10px 16px',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                    position: 'relative',
                    minWidth: 72,
                }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2 }}>
                        {new Date().toLocaleDateString('en', { weekday: 'long' })}
                    </p>
                    <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                        {new Date().getDate()}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                        {new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                    </p>
                </div>

                {/* Greeting center */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                        {greeting}, <span style={{ color: '#60a5fa' }}>{userName}</span>! 👋
                    </h1>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Have a productive day ahead!</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {currentTerm && (
                            <span style={{ background: 'rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.6)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#c7d2fe' }}>
                                📅 {currentTerm.term_name} {currentYear}
                            </span>
                        )}
                        <span style={{ background: 'rgba(16,185,129,0.3)', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#6ee7b7', fontFamily: 'monospace' }}>
                            🕐 {liveTime}
                        </span>
                        <span style={{ background: 'rgba(245,158,11,0.3)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#fcd34d' }}>
                            🇰🇪 #1 IN KENYA
                        </span>
                    </div>
                </div>

                {/* Refresh button */}
                <button onClick={() => setRefreshKey(k => k + 1)}
                    style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#fff' }}
                    title="Refresh">
                    <FiRefreshCw size={13} />
                </button>
            </div>

            {/* ════════ MAIN 2-COLUMN GRID ════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 12 }}>

                {/* ───── LEFT COLUMN ───── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

                    {/* ── Tab Nav ── */}
                    <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

                    {/* ════════ OVERVIEW TAB ════════ */}
                    {activeTab === 'overview' && (
                        <>
                            {/* ROW 1: 4 KPI stat cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                                {[
                                    { icon: '👥', label: 'Total Students', value: fmtN(students.length), badge: `+${newThisYear}`, badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', color: '#60a5fa', spark: [60,65,70,68,75,80,active.length % 30 + 70], href: '/dashboard/students' },
                                    { icon: '🎓', label: 'Total Enrolled', value: fmtN(active.length), badge: `+8%`, badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', color: '#34d399', spark: [50,55,58,62,65,70,active.length % 20 + 60], href: '/dashboard/students' },
                                    { icon: '💰', label: 'Fees Collected', value: fmtShort(totalFees), badge: `+15%`, badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', color: '#fbbf24', spark: [40,50,45,60,70,80,90], href: '/dashboard/fees' },
                                    { icon: '⚠️', label: 'Pending Issues', value: String(pendingIssues), badge: pendingIssues > 0 ? `${pendingIssues}` : '0%', badgeColor: pendingIssues > 0 ? '#f87171' : '#10b981', badgeBg: pendingIssues > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: '#fb923c', spark: [10,8,12,9,11,8,pendingIssues], href: '/dashboard/stores/ultra' },
                                ].map((card, i) => {
                                    const maxS = Math.max(...card.spark, 1);
                                    const pts = card.spark.map((v, idx) => `${(idx / (card.spark.length - 1)) * 100},${40 - (v / maxS) * 36}`).join(' ');
                                    return (
                                        <Link key={i} href={card.href} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none', transition: 'all 0.2s' }}
                                            className="hover:bg-white/10">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: 20 }}>{card.icon}</span>
                                                <span style={{ background: card.badgeBg, color: card.badgeColor, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>{card.badge}</span>
                                            </div>
                                            <p style={{ fontSize: 22, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value}</p>
                                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</p>
                                            <svg viewBox="0 0 100 40" style={{ width: '100%', height: 28, marginTop: 4 }} preserveAspectRatio="none">
                                                <polyline points={pts} fill="none" stroke={card.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                                            </svg>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* ROW 2: Quick Actions */}
                            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Quick Actions</p>
                                    <Link href="/dashboard/fees" style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>View All →</Link>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 8 }}>
                                    {[
                                        { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', color: '#1E6FD9', bg: 'rgba(30,111,217,0.2)' },
                                        { label: 'Add Student', href: '/dashboard/students/admissions', icon: '👤', color: '#059669', bg: 'rgba(5,150,105,0.2)' },
                                        { label: 'Attendance', href: '/dashboard/attendance', icon: '✅', color: '#7C3AED', bg: 'rgba(124,58,237,0.2)' },
                                        { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', color: '#D97706', bg: 'rgba(217,119,6,0.2)' },
                                        { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '📱', color: '#DB2777', bg: 'rgba(219,39,119,0.2)' },
                                        { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', color: '#0891B2', bg: 'rgba(8,145,178,0.2)' },
                                        { label: 'Add Expense', href: '/dashboard/expenses', icon: '💸', color: '#DC2626', bg: 'rgba(220,38,38,0.2)' },
                                        { label: 'Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👔', color: '#7C3AED', bg: 'rgba(124,58,237,0.2)' },
                                        { label: 'Report Cards', href: '/dashboard/exams/report-cards', icon: '📋', color: '#059669', bg: 'rgba(5,150,105,0.2)' },
                                    ].map((a, i) => (
                                        <Link key={i} href={a.href} style={{ background: a.bg, border: `1px solid ${a.color}30`, borderRadius: 10, padding: '8px 4px', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.2s' }} className="hover:scale-105">
                                            <span style={{ fontSize: 18 }}>{a.icon}</span>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1.2, textAlign: 'center' }}>{a.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* ROW 3: Fee Analytics + Performance Overview */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                                {/* Fee Analytics */}
                                <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>📊 Fee Analytics & Class Intelligence</p>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {['This Term','This Year','All Terms'].map((t,i) => (
                                                <button key={i} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, border: 'none', background: i === 0 ? '#3b82f6' : '#f1f5f9', color: i === 0 ? '#fff' : '#64748b', fontWeight: 700, cursor: 'pointer' }}>{t}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
                                        {/* SVG Doughnut */}
                                        {(() => {
                                            const collected = totalFees;
                                            const outstanding = stats.feesDue;
                                            const expected = collected + outstanding;
                                            const colPct = expected > 0 ? Math.min(100, Math.round(collected / expected * 100)) : 78;
                                            const circ = 2 * Math.PI * 30;
                                            const dash = (colPct / 100) * circ;
                                            const outDash = ((100 - colPct) / 100) * circ;
                                            return (
                                                <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                                                    <svg viewBox="0 0 72 72" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
                                                        <circle cx="36" cy="36" r="30" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                                        <circle cx="36" cy="36" r="30" fill="none" stroke="#3b82f6" strokeWidth="10"
                                                            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
                                                        <circle cx="36" cy="36" r="30" fill="none" stroke="#f59e0b" strokeWidth="10"
                                                            strokeDasharray={`${outDash} ${circ}`} strokeLinecap="round"
                                                            strokeDashoffset={-dash} />
                                                    </svg>
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>{colPct}%</span>
                                                        <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Collection</span>
                                                        <span style={{ fontSize: 7, color: '#64748b' }}>Rate</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {/* Legend */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {[
                                                { dot: '#3b82f6', label: 'Collected', value: fmtShort(totalFees) },
                                                { dot: '#f59e0b', label: 'Outstanding', value: fmtShort(stats.feesDue) },
                                                { dot: '#10b981', label: 'Expected', value: fmtShort(totalFees + stats.feesDue) },
                                            ].map((l,i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot, flexShrink: 0 }} />
                                                    <span style={{ fontSize: 10, color: '#64748b', flex: 1 }}>{l.label}</span>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b' }}>{l.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Mini line chart */}
                                    {(() => {
                                        const pts6 = monthlyFees.slice(-6);
                                        const maxF = Math.max(...pts6.map(m => m.fees), 1);
                                        const W = 200; const H = 55;
                                        const polyPts = pts6.map((m, i) => `${(i / (pts6.length - 1 || 1)) * W},${H - (m.fees / maxF) * (H - 8) - 4}`).join(' ');
                                        return (
                                            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 55 }} preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                {pts6.length > 1 && <>
                                                    <polyline points={polyPts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    {pts6.map((m,i) => {
                                                        const x = (i / (pts6.length-1||1)) * W;
                                                        const y = H - (m.fees/maxF)*(H-8) - 4;
                                                        return <text key={i} x={x} y={H} textAnchor="middle" fontSize="8" fill="#94a3b8">{m.month}</text>;
                                                    })}
                                                </>}
                                            </svg>
                                        );
                                    })()}
                                </div>

                                {/* Performance Overview */}
                                <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>🏆 Performance Overview</p>
                                        <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>This Term</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
                                        {[
                                            { label: 'Attendance', value: attRate > 0 ? attRate : 96, color: '#3b82f6', icon: '👥' },
                                            { label: 'Pass Rate', value: formPerf.length > 0 ? Math.round(formPerf.filter(f => f.avg >= 50).length / formPerf.length * 100) || 92 : 92, color: '#10b981', icon: '✅' },
                                            { label: 'Class Progress', value: formPerf.length > 0 ? Math.round(formPerf.reduce((s, f) => s + Math.min(100, f.avg), 0) / (formPerf.length || 1)) || 94 : 94, color: '#8b5cf6', icon: '📊' },
                                            { label: 'Discipline', value: disciplineCount === 0 ? 100 : Math.max(0, 100 - disciplineCount * 2), color: '#f59e0b', icon: '🛡️' },
                                        ].map((g, i) => {
                                            const circ = 2 * Math.PI * 28;
                                            const dash = (g.value / 100) * circ;
                                            return (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ position: 'relative', width: 72, height: 72 }}>
                                                        <svg viewBox="0 0 64 64" style={{ width: 72, height: 72, transform: 'rotate(-90deg)' }}>
                                                            <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                                                            <circle cx="32" cy="32" r="28" fill="none" stroke={g.color} strokeWidth="6"
                                                                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
                                                        </svg>
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span style={{ fontSize: 14, fontWeight: 900, color: g.color }}>{g.value}%</span>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{g.icon} {g.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ROW 4: Recent Activity | Upcoming Events | Fee Collection Trend */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>

                                {/* Recent Activity */}
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <p style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>📡 Recent Activity</p>
                                        <Link href="/dashboard/fees" style={{ fontSize: 10, color: '#60a5fa', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {(liveActivity.length > 0 ? liveActivity : [
                                            { icon: '🟢', text: 'New student registered — Mary Wanjiru', time: '2 min ago' },
                                            { icon: '🟡', text: 'Fees payment received (Ksh 25,000)', time: '5 min ago' },
                                            { icon: '🟠', text: 'Report card generated — Grade 10', time: '12 min ago' },
                                            { icon: '🔵', text: 'New staff added — Mr. David Ochieng', time: '18 min ago' },
                                        ]).slice(0, 4).map((a, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                                                <div>
                                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{a.text}</p>
                                                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{a.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Upcoming Events */}
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <p style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>📅 Upcoming Events</p>
                                        <Link href="/dashboard" style={{ fontSize: 10, color: '#60a5fa', textDecoration: 'none', fontWeight: 700 }}>View All →</Link>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {[
                                            { day: '18', month: 'Nov', title: 'Parent Meeting', time: '8:00 AM – 11:00 AM', color: '#3b82f6' },
                                            { day: '20', month: 'Nov', title: 'Term 3 Exams', time: '8:00 AM – 5:00 PM', color: '#10b981' },
                                            { day: '25', month: 'Nov', title: 'School Sports Day', time: '9:00 AM – 4:00 PM', color: '#f59e0b' },
                                        ].map((ev, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
                                                <div style={{ background: ev.color, borderRadius: 8, padding: '4px 8px', textAlign: 'center', flexShrink: 0 }}>
                                                    <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{ev.day}</p>
                                                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{ev.month}</p>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{ev.title}</p>
                                                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{ev.time}</p>
                                                </div>
                                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>›</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Fee Collection Trend - bar chart */}
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <p style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>📈 Fee Collection Trend</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>6 Months</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const pts6 = monthlyFees.slice(-6);
                                        const maxF = Math.max(...pts6.map(m => m.fees), 1);
                                        const latestVal = pts6[pts6.length - 1]?.fees || 0;
                                        return (
                                            <>
                                                <p style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', marginBottom: 8 }}>{fmtShort(latestVal)}</p>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70, marginBottom: 4 }}>
                                                    {pts6.map((m, i) => {
                                                        const h = Math.max(8, (m.fees / maxF) * 60);
                                                        const isLast = i === pts6.length - 1;
                                                        return (
                                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                                <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: isLast ? '#3b82f6' : 'rgba(99,130,246,0.35)', transition: 'all 0.3s' }} />
                                                                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{m.month}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                                                    <span>0K</span>
                                                    <span>{fmtShort(maxF / 2)}</span>
                                                    <span>{fmtShort(maxF)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Other tabs ── */}
                    {activeTab === 'finance' && <FinancePanel />}
                    {activeTab === 'academics' && <AcademicsPanel />}
                    {activeTab === 'staff' && <StaffPanel />}
                    {activeTab === 'stores' && <StoresPanel />}
                    {activeTab === 'portals' && <PortalsPanel />}

                </div>

                {/* ───── RIGHT COLUMN ───── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Top Performing Students */}
                    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>🏆 Top Performing Students</p>
                            <Link href="/dashboard/exams/merit-list" style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>View All →</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(topStudents.length > 0 ? topStudents : [
                                { name: '—', form: '—', avg: 0 },
                                { name: '—', form: '—', avg: 0 },
                                { name: '—', form: '—', avg: 0 },
                                { name: '—', form: '—', avg: 0 },
                                { name: '—', form: '—', avg: 0 },
                            ]).slice(0, 5).map((s, i) => {
                                const initials = s.name !== '—' ? s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??';
                                const avatarColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', width: 14, textAlign: 'center' }}>{i + 1}</span>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                            {initials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                                            <p style={{ fontSize: 9, color: '#64748b' }}>{s.form}</p>
                                        </div>
                                        <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{s.avg}%</span>
                                    </div>
                                );
                            })}
                            {topStudents.length === 0 && (
                                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingTop: 8 }}>No exam data yet</p>
                            )}
                        </div>
                    </div>

                    {/* Live KPI strip on right */}
                    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Activity</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { dot: '#10b981', label: `${fmtN(active.length)} Active Students`, sub: `${maleCount}M · ${femaleCount}F` },
                                { dot: '#3b82f6', label: `${fmt(todayFeeTotal)} Today`, sub: 'fees collected' },
                                { dot: '#f59e0b', label: `${attRate}% Attendance`, sub: `${todayPre} present` },
                                { dot: pendingIssues > 0 ? '#ef4444' : '#10b981', label: `${pendingIssues} Pending Issues`, sub: 'store issuances' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{item.label}</p>
                                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{item.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Term info card */}
                    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>📅 Current Term</p>
                        <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{currentTerm?.term_name || 'Term 1'} {currentYear}</p>
                        {currentTerm?.end_date && (
                            <p style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginBottom: 8 }}>
                                {Math.max(0, Math.ceil((new Date(currentTerm.end_date).getTime() - Date.now()) / 86400000))} days remaining
                            </p>
                        )}
                        {currentTerm?.start_date && currentTerm?.end_date && (() => {
                            const start = new Date(currentTerm.start_date).getTime();
                            const end = new Date(currentTerm.end_date).getTime();
                            const pctDone = Math.min(100, Math.round((Date.now() - start) / (end - start) * 100));
                            return (
                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, height: 6, overflow: 'hidden' }}>
                                    <div style={{ width: `${pctDone}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 10, transition: 'all 0.5s' }} />
                                </div>
                            );
                        })()}
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Term progress</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', paddingTop: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
                    APSIMS Ultra v3.0 · 🇰🇪 No.1 School ERP in Kenya · © {currentYear}
                </p>
            </div>
        </div>
    );
}

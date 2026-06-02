'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    FiDollarSign, FiAlertTriangle, FiRefreshCw, FiFilter,
    FiBarChart2, FiChevronRight,
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
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

type DateRange = 'today' | 'week' | 'month' | 'term' | 'year' | 'custom';

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [dateRange, setDateRange] = useState<DateRange>('term');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [userName, setUserName] = useState('Admin');
    const [userRole, setUserRole] = useState('');
    const searchParams = useSearchParams();
    const accessDenied = searchParams.get('access_denied') === '1';
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // Load role from session
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const u = localStorage.getItem('school_user');
            if (u) { try { setUserRole(JSON.parse(u).role || JSON.parse(u).user_type || ''); } catch { } }
            const c = document.cookie.split('; ').find(r => r.startsWith('alpha_session='));
            if (c) { try { const d = JSON.parse(atob(c.split('=')[1])); setUserRole(d.role || d.user_type || ''); } catch { } }
        }
    }, []);

    // ── Original stats object (for UltraCardsSection) ──
    const [stats, setStats] = useState({
        totalStudents: 0, activeStudents: 0, newEnrollments: 0,
        totalStaff: 0, teachingStaff: 0, nonTeachingStaff: 0,
        feesCollected: 0, feesDue: 0, prepayments: 0,
        totalIncome: 0, totalExpenses: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0 },
        reportedStudents: 0,
    });

    // ── Core data ──
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
    const [smsBalance, setSmsBalance] = useState<number | null>(null);
    const [alerts, setAlerts] = useState<{ type: string; msg: string; level: 'warn' | 'error' | 'info' }[]>([]);

    // ── Computed date window ──
    const getDateWindow = useCallback(() => {
        const now = new Date();
        if (dateRange === 'today') return { from: today, to: today };
        if (dateRange === 'week') {
            const s = new Date(now); s.setDate(now.getDate() - 6);
            return { from: s.toISOString().split('T')[0], to: today };
        }
        if (dateRange === 'month') {
            const s = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from: s.toISOString().split('T')[0], to: today };
        }
        if (dateRange === 'year') return { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
        if (dateRange === 'custom') return { from: customFrom || `${currentYear}-01-01`, to: customTo || today };
        // term
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
                { data: allStudents },
                { data: formData },
                { data: teacherData },
                { data: payData },
                { data: incData },
                { data: expData },
                { data: termData },
                { data: discData },
                { data: issueData },
                { data: marksData },
                { data: subjectData },
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
            setRecentPayments((payData || []).slice(0, 10));
            setRecentStudents((allStudents || []).slice(0, 8));

            // Today's attendance
            const { data: todayAtt } = await supabase.from('school_daily_attendance').select('status,student_id').eq('attendance_date', today);
            setAttendance(todayAtt || []);

            // Weekly attendance (last 7 days)
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

            // Monthly fees + expenses (last 12 months)
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

            // Form-wise performance
            const marks = marksData || [];
            const fp = (formData || []).map((f: any) => {
                const formMarks = marks.filter((m: any) => m.form_id === f.id);
                const avg = formMarks.length > 0 ? formMarks.reduce((s: number, m: any) => s + Number(m.marks || 0), 0) / formMarks.length : 0;
                return { form: f.form_name, avg: Math.round(avg * 10) / 10, count: formMarks.length };
            });
            setFormPerf(fp);

            // Top students
            const studentMarksMap: Record<number, number[]> = {};
            marks.forEach((m: any) => { if (!studentMarksMap[m.student_id]) studentMarksMap[m.student_id] = []; studentMarksMap[m.student_id].push(Number(m.marks || 0)); });
            const topS = Object.entries(studentMarksMap).map(([id, arr]) => ({ id: Number(id), avg: arr.reduce((s, n) => s + n, 0) / arr.length }))
                .sort((a, b) => b.avg - a.avg).slice(0, 5)
                .map(({ id, avg }) => {
                    const st = (allStudents || []).find((s: any) => s.id === id);
                    return { name: st ? `${st.first_name} ${st.last_name}` : '-', form: (formData || []).find((f: any) => f.id === st?.form_id)?.form_name || '-', avg: Math.round(avg * 10) / 10 };
                });
            setTopStudents(topS);

            // Subject performance
            const subj = subjectData || [];
            const sp = subj.slice(0, 10).map((s: any) => {
                const sm = marks.filter((m: any) => m.subject_id === s.id);
                const avg = sm.length > 0 ? sm.reduce((sum: number, m: any) => sum + Number(m.marks || 0), 0) / sm.length : 0;
                return { name: s.subject_name, avg: Math.round(avg * 10) / 10, count: sm.length };
            }).filter((s: any) => s.count > 0).sort((a: any, b: any) => b.avg - a.avg);
            setSubjectPerf(sp);

            // Smart alerts
            const newAlerts: typeof alerts = [];
            const active = (allStudents || []).filter((s: any) => s.status === 'Active');
            const totalFees = (payData || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const { data: feeStructures } = await supabase.from('school_fee_structures').select('amount');
            const totalExpected = (feeStructures || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0) * active.length;
            const collRate = pct(totalFees, totalExpected);
            if (collRate < 40) newAlerts.push({ type: 'fees', msg: `⚠️ Fee collection rate critically low at ${collRate}% — KES ${fmt(totalExpected - totalFees)} outstanding`, level: 'error' });
            else if (collRate < 70) newAlerts.push({ type: 'fees', msg: `🔔 Fee collection at ${collRate}% — ${fmt(totalExpected - totalFees)} still outstanding`, level: 'warn' });
            const todayPresent = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const todayTotal = (todayAtt || []).length;
            if (todayTotal > 0 && pct(todayPresent, todayTotal) < 80) newAlerts.push({ type: 'attendance', msg: `📋 Today's attendance is ${pct(todayPresent, todayTotal)}% — ${todayTotal - todayPresent} absent students`, level: 'warn' });
            if ((issueData || []).length > 0) newAlerts.push({ type: 'issues', msg: `🔧 ${(issueData || []).length} open maintenance issues require attention`, level: 'info' });
            if ((discData || []).length > 10) newAlerts.push({ type: 'discipline', msg: `⚡ ${(discData || []).length} discipline incidents recorded this year`, level: 'warn' });
            const totalInc = totalFees + (incData || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const totalExp = (expData || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
            if (totalExp > totalInc) newAlerts.push({ type: 'finance', msg: `🔴 Financial deficit detected: Expenses (${fmt(totalExp)}) exceed income (${fmt(totalInc)})`, level: 'error' });
            setAlerts(newAlerts);

            // ── Populate original stats for UltraCardsSection ──
            const feesDue = Math.max(0, totalExpected - totalFees);
            const prepayments = Math.max(0, totalFees - totalExpected);
            const attPresent = (todayAtt || []).filter((a: any) => a.status === 'Present').length;
            const attAbsent  = (todayAtt || []).filter((a: any) => a.status === 'Absent').length;
            const attLate    = (todayAtt || []).filter((a: any) => a.status === 'Late').length;
            const attRate    = (todayAtt || []).length > 0 ? Math.round(attPresent / (todayAtt || []).length * 100) : 0;
            let reported = 0;
            if (termData) {
                const { count } = await supabase.from('school_daily_attendance').select('student_id', { count: 'exact', head: true }).gte('attendance_date', termData.start_date || `${currentYear}-01-01`).lte('attendance_date', termData.end_date || today);
                reported = count || 0;
            }
            const newThisYearCount = (allStudents || []).filter((s: any) => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length;
            const teachingCount  = (teacherData || []).filter((t: any) => t.staff_type === 'Teaching').length;
            const nonTeachCount  = (teacherData || []).filter((t: any) => t.staff_type !== 'Teaching').length;
            setStats({
                totalStudents: (allStudents || []).length,
                activeStudents: active.length,
                newEnrollments: newThisYearCount,
                totalStaff: (teacherData || []).length,
                teachingStaff: teachingCount,
                nonTeachingStaff: nonTeachCount,
                feesCollected: totalFees,
                feesDue,
                prepayments,
                totalIncome: totalInc,
                totalExpenses: totalExp,
                attendance: { present: attPresent, absent: attAbsent, late: attLate, rate: attRate },
                reportedStudents: reported,
            });

        } catch (e) { console.error('Dashboard fetch error:', e); }
        setLoading(false);
    }, [today, currentYear]);

    useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

    // ── Derived metrics ──
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
    const collRate = pct(totalFees, active.length * 50000); // approx
    const newThisYear = students.filter(s => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear).length;
    const maleCount = active.filter(s => s.gender === 'Male').length;
    const femaleCount = active.filter(s => s.gender === 'Female').length;
    const payThisMonth = payments.filter(p => { const d = new Date(p.payment_date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === currentYear; }).reduce((s, p) => s + Number(p.amount || 0), 0);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    const dateRangeOpts: { key: DateRange; label: string }[] = [
        { key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' }, { key: 'term', label: 'This Term' },
        { key: 'year', label: 'This Year' }, { key: 'custom', label: 'Custom' },
    ];

    // Chart data
    const feeExpenseChart = {
        labels: monthlyFees.map(m => m.month),
        datasets: [
            { label: 'Fee Collections', data: monthlyFees.map(m => m.fees), backgroundColor: 'rgba(99,102,241,0.8)', borderRadius: 4, borderSkipped: false as const },
            { label: 'Expenses', data: monthlyFees.map(m => m.expenses), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4, borderSkipped: false as const },
        ],
    };

    const weeklyAttChart = {
        labels: weeklyAtt.map(w => w.day),
        datasets: [{ label: 'Attendance %', data: weeklyAtt.map(w => w.pct), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)', fill: true, tension: 0.4, pointBackgroundColor: '#22c55e', pointRadius: 5, borderWidth: 2.5 }],
    };

    const formPerfChart = {
        labels: formPerf.map(f => f.form),
        datasets: [{ label: 'Avg Score', data: formPerf.map(f => f.avg), backgroundColor: formPerf.map((_, i) => ['#6366f1','#3b82f6','#10b981','#f59e0b'][i % 4]), borderRadius: 6 }],
    };

    const attDoughnut = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{ data: [todayPresentCt, todayAbsentCt, todayLateCt], backgroundColor: ['#22c55e','#ef4444','#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
    };

    const netPosChart = {
        labels: ['Total Income', 'Total Expenses', 'Net Position'],
        datasets: [{ data: [totalIncome, approvedExpenses, Math.abs(netPosition)], backgroundColor: ['#10b981','#ef4444', netPosition >= 0 ? '#3b82f6' : '#f97316'], borderRadius: 8, barPercentage: 0.5 }],
    };

    const chartBase = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        <FiBarChart2 className="text-white" size={26} />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
                </div>
                <p className="text-sm font-bold text-gray-500 mt-2">Loading APSIMS Ultra Dashboard…</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 ultra-animate">

            {/* ════ AUDITOR READ-ONLY BANNER ════ */}
            {userRole.toLowerCase() === 'auditor' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-800">
                    <span className="text-xl">🔍</span>
                    <div className="flex-1">
                        <p className="font-black text-sm">Auditor Read-Only Access</p>
                        <p className="text-xs font-medium opacity-80">You have view-only access. Write operations and sensitive pages are restricted.</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">READ ONLY</span>
                </div>
            )}

            {/* ════ ACCESS DENIED TOAST ════ */}
            {accessDenied && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800">
                    <span className="text-xl">🚫</span>
                    <div className="flex-1">
                        <p className="font-black text-sm">Access Denied</p>
                        <p className="text-xs font-medium opacity-80">You do not have permission to access that page. Contact your administrator.</p>
                    </div>
                </div>
            )}

            {/* ════════════════ HERO HEADER ════════════════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-5 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live Dashboard</span>
                            </div>
                            <h1 className="text-xl font-black text-white">{greeting}, {userName}! 👋</h1>
                            <p className="text-white/40 text-xs mt-0.5">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · APSIMS Ultra v3.0</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {currentTerm && (
                                <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.12)' }}>
                                    📚 {currentTerm.term_name} · {currentYear}
                                </div>
                            )}
                            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl text-white hover:bg-white/20 transition"><FiRefreshCw size={15} /></button>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                        <FiFilter size={12} className="text-white/50" />
                        {dateRangeOpts.map(opt => (
                            <button key={opt.key} onClick={() => setDateRange(opt.key)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dateRange === opt.key ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                                {opt.label}
                            </button>
                        ))}
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 text-white border border-white/20 focus:outline-none" />
                                <span className="text-white/40 text-xs">to</span>
                                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg text-[11px] bg-white/10 text-white border border-white/20 focus:outline-none" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════ SMART ALERTS ════════════════ */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${a.level === 'error' ? 'bg-red-50 border-red-200 text-red-800' : a.level === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                            <FiAlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                            <span>{a.msg}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ════════════════ TAB NAVIGATION ════════════════ */}
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ════════════════ OVERVIEW TAB ════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-5">

                    {/* ══════════════════════════════════════════════════════════
                         FEE ANALYTICS — Class DataGrid + Charts (TOP SECTION)
                         Shows Form 1-4, Grade 10/11/12, streams, paid vs outstanding
                    ══════════════════════════════════════════════════════════ */}
                    <FeeAnalyticsSection />

                    {/* ── ORIGINAL ULTRA KPI CARDS (sparklines + gradient bars) ── */}
                    <UltraCardsSection stats={stats} currentYear={currentYear} fmt={fmt} />

                    {/* ── Secondary Metrics Strip ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Gender Ratio M:F', value: `${maleCount}:${femaleCount}`, bar: pct(maleCount, active.length), color1: '#3b82f6', icon: '⚖️' },
                            { label: 'This Month Fees', value: fmt(payThisMonth), bar: Math.min(100, pct(payThisMonth, totalFees || 1)), color1: '#10b981', icon: '📅' },
                            { label: "Today's Absent", value: `${todayAbsentCt} students`, bar: pct(todayAbsentCt, active.length || 1), color1: '#ef4444', icon: '⚠️' },
                            { label: 'Other Income', value: fmt(otherIncome), bar: Math.min(100, pct(otherIncome, totalIncome || 1)), color1: '#8b5cf6', icon: '🏦' },
                        ].map((m, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
                                    <span className="text-base">{m.icon}</span>
                                </div>
                                <p className="text-lg font-extrabold text-gray-900">{m.value}</p>
                                <div className="mt-2 bg-gray-100 rounded-full h-2">
                                    <div className="h-2 rounded-full transition-all" style={{ width: `${m.bar}%`, background: m.color1 }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── ROW 3: Charts ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Fee vs Expense 12-month bar */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📊 Fee Collections vs Expenses — 12 Months</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Revenue bars vs cost bars per month</p>
                                </div>
                                <div className="flex items-center gap-3 text-[10px]">
                                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-indigo-500 inline-block" />Fees</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" />Expenses</span>
                                </div>
                            </div>
                            <div style={{ height: 240 }}>
                                <Bar data={feeExpenseChart} options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />
                            </div>
                        </div>

                        {/* Attendance Doughnut */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📋 Today's Attendance</p>
                            <p className="text-xs text-gray-400 mb-3">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                            <div style={{ height: 160 }}>
                                {attendance.length > 0 ? <Doughnut data={attDoughnut} options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No attendance data today</div>}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                {[{ label: 'Present', val: todayPresentCt, color: 'text-emerald-600' }, { label: 'Absent', val: todayAbsentCt, color: 'text-red-600' }, { label: 'Late', val: todayLateCt, color: 'text-amber-600' }].map(a => (
                                    <div key={a.label}>
                                        <p className={`text-lg font-extrabold ${a.color}`}>{a.val}</p>
                                        <p className="text-[10px] text-gray-400">{a.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 4: Attendance Trend + Academic Performance ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Weekly attendance trend */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">📈 Weekly Attendance Trend</p>
                            <p className="text-xs text-gray-400 mb-4">Last 7 school days</p>
                            <div style={{ height: 200 }}>
                                <Line data={weeklyAttChart} options={{ ...chartBase, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>

                        {/* Form-wise performance */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🏆 Form-wise Academic Performance</p>
                            <p className="text-xs text-gray-400 mb-4">Average exam score by class</p>
                            <div style={{ height: 200 }}>
                                {formPerf.some(f => f.avg > 0) ? (
                                    <Bar data={formPerfChart} options={{ ...chartBase, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
                                ) : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No exam data yet</div>}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 5: Net Financial Position + Student Enrollment ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* P&L Summary */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">💹 Financial Position {currentYear}</p>
                            <div style={{ height: 180 }}>
                                <Bar data={netPosChart} options={{ ...chartBase, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } }, x: { grid: { display: false } } } }} />
                            </div>
                            <div className={`mt-3 flex items-center gap-2 p-2.5 rounded-xl ${netPosition >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                <span className="text-lg">{netPosition >= 0 ? '✅' : '⚠️'}</span>
                                <div>
                                    <p className={`text-xs font-black ${netPosition >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{netPosition >= 0 ? 'Net Surplus' : 'Net Deficit'}: {fmt(Math.abs(netPosition))}</p>
                                    <p className="text-[10px] text-gray-400">Income {fmt(totalIncome)} · Expenses {fmt(approvedExpenses)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Student enrollment by form */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">👥 Student Enrollment by Form</p>
                            </div>
                            <div className="p-5 space-y-3">
                                {forms.map(f => {
                                    const inForm = active.filter(s => s.form_id === f.id);
                                    const male = inForm.filter(s => s.gender === 'Male').length;
                                    const female = inForm.filter(s => s.gender === 'Female').length;
                                    const total = inForm.length;
                                    const maxStudents = Math.max(...forms.map(form => active.filter(s => s.form_id === form.id).length), 1);
                                    return (
                                        <div key={f.id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-700 w-20">{f.form_name}</span>
                                                    <span className="text-[10px] text-blue-600 font-bold">♂ {male}</span>
                                                    <span className="text-[10px] text-pink-600 font-bold">♀ {female}</span>
                                                </div>
                                                <span className="text-xs font-black text-gray-800">{total}</span>
                                            </div>
                                            <div className="flex gap-0.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="bg-blue-400 h-full rounded-l-full" style={{ width: `${pct(male, maxStudents)}%` }} />
                                                <div className="bg-pink-400 h-full rounded-r-full" style={{ width: `${pct(female, maxStudents)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── AI INSIGHTS WIDGET ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1">
                            <AIInsightsWidget />
                        </div>

                        {/* Top students */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🏆 Top Performing Students</p>
                                <Link href="/dashboard/exams/merit-list" className="text-xs text-indigo-600 font-bold flex items-center gap-1">Merit List <FiChevronRight size={12} /></Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {topStudents.map((s, i) => (
                                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                                <p className="text-[10px] text-gray-400">{s.form}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-black ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</p>
                                            <p className="text-[10px] text-gray-400">avg score</p>
                                        </div>
                                    </div>
                                ))}
                                {topStudents.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No exam data yet</div>}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 6: Subject Performance ── */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Subject performance table */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📚 Subject Performance Ranking</p>
                                <Link href="/dashboard/exams/analysis" className="text-xs text-indigo-600 font-bold flex items-center gap-1">Full Analysis <FiChevronRight size={12} /></Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {subjectPerf.slice(0, 8).map((s, i) => (
                                    <div key={s.name} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                                            <span className="text-sm font-semibold text-gray-700">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 bg-gray-100 rounded-full h-2">
                                                <div className="h-2 rounded-full" style={{ width: `${s.avg}%`, background: s.avg >= 70 ? '#22c55e' : s.avg >= 50 ? '#f59e0b' : '#ef4444' }} />
                                            </div>
                                            <span className={`text-sm font-black w-10 text-right ${s.avg >= 70 ? 'text-emerald-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</span>
                                        </div>
                                    </div>
                                ))}
                                {subjectPerf.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No exam marks recorded yet</div>}
                            </div>
                        </div>

                    </div>

                    {/* ── ROW 7: Recent Payments + Recent Enrollments ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Recent payments */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">💳 Recent Fee Payments</p>
                                <Link href="/dashboard/fees/payments" className="text-xs text-indigo-600 font-bold flex items-center gap-1">View All <FiChevronRight size={12} /></Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentPayments.map((p, i) => {
                                    const st = students.find(s => s.id === p.student_id);
                                    return (
                                        <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
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
                                {recentPayments.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">No payments recorded</div>}
                            </div>
                        </div>

                        {/* Recent enrollments */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🎓 Recent Enrollments</p>
                                <Link href="/dashboard/students" className="text-xs text-indigo-600 font-bold flex items-center gap-1">View All <FiChevronRight size={12} /></Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentStudents.map((s, i) => {
                                    const form = forms.find(f => f.id === s.form_id);
                                    return (
                                        <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#ec4899,#db2777)' }}>
                                                    {s.first_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                                    <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number} · {form?.form_name || '—'}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 8: Quick Action Grid ── */}
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">⚡ Quick Actions</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {[
                                { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💳', color: '#22c55e' },
                                { label: 'Add Student', href: '/dashboard/students/admissions', icon: '➕', color: '#6366f1' },
                                { label: 'Mark Attendance', href: '/dashboard/attendance', icon: '✅', color: '#3b82f6' },
                                { label: 'Enter Marks', href: '/dashboard/exams/marks', icon: '📝', color: '#f59e0b' },
                                { label: 'Bulk SMS', href: '/dashboard/fees/bulk-reminders', icon: '📱', color: '#8b5cf6' },
                                { label: 'P&L Report', href: '/dashboard/fees/reports/pl', icon: '📊', color: '#0891b2' },
                                { label: 'Add Expense', href: '/dashboard/expenses', icon: '💸', color: '#ef4444' },
                                { label: 'Staff Payroll', href: '/dashboard/hr-payroll/payroll', icon: '👨‍💼', color: '#7c3aed' },
                            ].map((a, i) => (
                                <Link key={i} href={a.href}
                                    className="bg-white rounded-xl p-3 text-center hover:shadow-md hover:scale-[1.04] transition-all border border-gray-100 group relative overflow-hidden"
                                    style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                                    <span className="text-2xl block mb-1">{a.icon}</span>
                                    <p className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 leading-tight">{a.label}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ── ROW 9: Intelligence Strip ── */}
                    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0c0a2a 0%,#1e1b4b 50%,#312e81 100%)' }}>
                        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">🚀</span>
                                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">APSIMS Ultra Intelligence Hub</h3>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">NO.1 IN KENYA</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                {[
                                    { label: '📊 P&L Report', href: '/dashboard/fees/reports/pl', desc: 'Full financial statement' },
                                    { label: '📱 Bulk SMS Campaign', href: '/dashboard/fees/bulk-reminders', desc: 'Fee defaulter alerts' },
                                    { label: '📈 Financial Analytics', href: '/dashboard/fees/analytics', desc: 'AI revenue insights' },
                                    { label: '🎓 Merit List', href: '/dashboard/exams/merit-list', desc: 'Academic rankings' },
                                    { label: '📋 Report Cards', href: '/dashboard/exams/report-cards', desc: 'Term reports' },
                                    { label: '🔒 Fee Audit Trail', href: '/dashboard/fees/audit', desc: 'Transaction history' },
                                ].map((m, i) => (
                                    <Link key={i} href={m.href} className="group relative rounded-xl p-3.5 transition-all hover:scale-[1.03]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <p className="text-[12px] font-bold text-white mb-1">{m.label}</p>
                                        <p className="text-[10px] text-white/50 font-medium">{m.desc}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ OTHER TABS ════════════════ */}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* Footer */}
            <div className="text-center py-3 text-[9px] text-gray-300 font-medium tracking-wide">
                APSIMS v3.0 Ultra · Alpha Plus School Information Management System · #1 School ERP in Kenya · © {currentYear}
            </div>
        </div>
    );
}

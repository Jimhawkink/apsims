'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    ArcElement, Title, Tooltip, Legend, Filler, LineElement, PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    FiUsers, FiUserCheck, FiDollarSign, FiTrendingUp, FiTrendingDown,
    FiBriefcase, FiCalendar, FiArrowRight, FiDownload, FiRefreshCw,
    FiPhone, FiMail, FiClock, FiAlertCircle, FiCreditCard, FiActivity,
    FiBarChart2, FiShield, FiStar, FiCheckCircle, FiXCircle,
    FiPlusCircle, FiFileText, FiPrinter, FiFilter, FiSearch,
    FiChevronUp, FiChevronDown, FiMoreVertical, FiEdit2, FiEye,
    FiZap, FiAward, FiLayers, FiGrid, FiSliders,
} from 'react-icons/fi';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, Filler, LineElement, PointElement,
);

/* ─────────────────────────── helpers ─────────────────────────── */
const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) =>
    n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000 ? `KES ${(n / 1_000).toFixed(0)}K`
            : fmt(n);

const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ─────────────────────────── types ─────────────────────────── */
interface Stats {
    totalStaff: number; teachingStaff: number; supportTeachers: number; subordinateStaff: number;
    activeStaff: number; maleStaff: number; femaleStaff: number;
    totalWageBill: number; totalAllowances: number; totalDeductions: number; netPayroll: number;
    pendingPayroll: number; paidPayroll: number;
}

/* ─────────────────────────── micro-components ─────────────────────────── */

/** Animated counter that rolls up to target value */
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1200 }: {
    value: number; prefix?: string; suffix?: string; duration?: number;
}) {
    const [display, setDisplay] = useState(0);
    const raf = useRef<number>(0);
    useEffect(() => {
        const start = Date.now();
        const from = 0;
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(from + (value - from) * ease));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [value, duration]);
    return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

/** Status pill */
function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        Inactive: 'bg-red-100 text-red-600 border-red-200',
        Paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        Pending: 'bg-amber-100 text-amber-700 border-amber-200',
        Approved: 'bg-blue-100 text-blue-700 border-blue-200',
        Rejected: 'bg-red-100 text-red-600 border-red-200',
        'TSC Teacher': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'Support Teacher': 'bg-violet-100 text-violet-700 border-violet-200',
        Subordinate: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
}

/** Avatar initials */
function Avatar({ name, gradient }: { name: string; gradient: string }) {
    const parts = name.split(' ');
    const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${gradient}`}>
            {initials.toUpperCase()}
        </div>
    );
}

/** KPI metric card with gradient + pulse indicator */
function KpiCard({ label, value, sub, icon: Icon, gradient, accent, trend, isFormatted = false }: {
    label: string; value: number | string; sub: string; icon: any;
    gradient: string; accent: string; trend?: number; isFormatted?: boolean;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-white" />
            <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full opacity-10 bg-white" />

            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
                <Icon size={18} className="text-white" />
            </div>

            {/* Value */}
            <p className="text-2xl font-black tracking-tight leading-none mb-1">
                {isFormatted ? value : (typeof value === 'number' ? <AnimatedNumber value={value} /> : value)}
            </p>

            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{label}</p>

            {/* Sub */}
            <div className="flex items-center justify-between mt-2">
                <p className="text-xs opacity-70">{sub}</p>
                {trend !== undefined && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                        {trend >= 0 ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
        </div>
    );
}

/** Finance summary card */
function FinanceCard({ label, value, icon: Icon, iconBg, valueColor, sub }: {
    label: string; value: number; icon: any; iconBg: string; valueColor: string; sub?: string;
}) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className={`text-xl font-black ${valueColor} truncate`}>{fmt(value)}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

/** Section header with accent bar */
function SectionHeader({ title, icon: Icon, iconColor, action }: {
    title: string; icon: any; iconColor: string; action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <div className={`w-1 h-6 rounded-full ${iconColor}`} />
                <Icon size={16} className={iconColor.replace('bg-', 'text-')} />
                <h3 className="font-black text-gray-800 text-sm tracking-tight">{title}</h3>
            </div>
            {action}
        </div>
    );
}

/** Quick action button */
function QuickAction({ label, desc, icon: Icon, href, gradient, kbd }: {
    label: string; desc: string; icon: any; href: string; gradient: string; kbd?: string;
}) {
    return (
        <Link href={href}
            className={`relative group rounded-2xl p-5 text-white ${gradient} shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col gap-2`}>
            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={40} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={18} />
            </div>
            <div>
                <p className="font-black text-sm">{label}</p>
                <p className="text-xs opacity-75">{desc}</p>
            </div>
            {kbd && (
                <div className="absolute bottom-3 right-3">
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">{kbd}</span>
                </div>
            )}
            <div className="flex items-center gap-1 text-xs mt-auto font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                Open <FiArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
export default function HRPayrollOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'staff' | 'payroll'>('staff');
    const [staffSearch, setStaffSearch] = useState('');
    const [payrollSearch, setPayrollSearch] = useState('');
    const [stats, setStats] = useState<Stats>({
        totalStaff: 0, teachingStaff: 0, supportTeachers: 0, subordinateStaff: 0,
        activeStaff: 0, maleStaff: 0, femaleStaff: 0,
        totalWageBill: 0, totalAllowances: 0, totalDeductions: 0, netPayroll: 0,
        pendingPayroll: 0, paidPayroll: 0,
    });
    const [recentStaff, setRecentStaff] = useState<any[]>([]);
    const [recentPayroll, setRecentPayroll] = useState<any[]>([]);
    const [departmentDist, setDepartmentDist] = useState<{ dept: string; count: number }[]>([]);
    const [monthlyWageBill, setMonthlyWageBill] = useState<{ month: string; amount: number }[]>([]);

    /* ── fetch ── */
    const fetchData = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const [teachersRes, supportRes, subRes, payrollRes] = await Promise.all([
                supabase.from('school_teachers').select('*'),
                supabase.from('school_support_teachers').select('*'),
                supabase.from('school_subordinate_staff').select('*'),
                supabase.from('school_payroll').select('*').order('created_at', { ascending: false }),
            ]);
            const teachers = teachersRes.data || [];
            const support = supportRes.data || [];
            const subordinate = subRes.data || [];
            const payroll = payrollRes.data || [];
            const allStaff = [
                ...teachers.map(t => ({ ...t, _type: 'TSC Teacher' })),
                ...support.map(s => ({ ...s, _type: 'Support Teacher' })),
                ...subordinate.map(s => ({ ...s, _type: 'Subordinate' })),
            ];
            const activeAll = allStaff.filter(s => s.status === 'Active');
            const totalWage = allStaff.reduce((s, st) => s + Number(st.basic_salary || 0), 0);
            const totalAllowances = payroll.reduce((s, p) =>
                s + Number(p.house_allowance || 0) + Number(p.transport_allowance || 0) + Number(p.other_allowances || 0), 0);
            const totalDeductions = payroll.reduce((s, p) => s + Number(p.total_deductions || 0), 0);
            const netPayroll = payroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);
            const pendingPayroll = payroll.filter(p => p.status === 'Pending').length;
            const paidPayroll = payroll.filter(p => p.status === 'Paid').length;
            const deptMap: Record<string, number> = {};
            teachers.forEach(t => { const d = t.department || t.designation || 'General'; deptMap[d] = (deptMap[d] || 0) + 1; });
            subordinate.forEach(s => { const d = s.role || s.department || 'Support'; deptMap[d] = (deptMap[d] || 0) + 1; });
            setDepartmentDist(Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count).slice(0, 8));
            const monthlyMap: Record<string, number> = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
                const m = d.getMonth() + 1; const y = d.getFullYear();
                const mp = payroll.filter(p => p.month === m && p.year === y);
                monthlyMap[key] = mp.reduce((s, p) => s + Number(p.gross_pay || 0), 0);
            }
            setMonthlyWageBill(Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })));
            const sorted = [...allStaff].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            setRecentStaff(sorted.slice(0, 20));
            setRecentPayroll(payroll.slice(0, 20));
            setStats({
                totalStaff: allStaff.length, teachingStaff: teachers.length,
                supportTeachers: support.length, subordinateStaff: subordinate.length,
                activeStaff: activeAll.length,
                maleStaff: allStaff.filter(s => s.gender === 'Male').length,
                femaleStaff: allStaff.filter(s => s.gender === 'Female').length,
                totalWageBill: totalWage, totalAllowances, totalDeductions, netPayroll,
                pendingPayroll, paidPayroll,
            });
        } catch (e) { console.error('HR Dashboard error:', e); }
        isRefresh ? setRefreshing(false) : setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── filtered lists ── */
    const filteredStaff = recentStaff.filter(s =>
        `${s.first_name} ${s.last_name} ${s._type}`.toLowerCase().includes(staffSearch.toLowerCase()));
    const filteredPayroll = recentPayroll.filter(p =>
        `${p.staff_name} ${p.pay_period}`.toLowerCase().includes(payrollSearch.toLowerCase()));

    /* ── charts ── */
    const staffDistChart = {
        labels: ['TSC Teachers', 'Support Teachers', 'Support Staff'],
        datasets: [{ data: [stats.teachingStaff, stats.supportTeachers, stats.subordinateStaff], backgroundColor: ['#6366f1', '#8b5cf6', '#f59e0b'], borderWidth: 0 }],
    };
    const genderChart = {
        labels: ['Male', 'Female'],
        datasets: [{ data: [stats.maleStaff, stats.femaleStaff], backgroundColor: ['#3b82f6', '#ec4899'], borderWidth: 0 }],
    };
    const wageBillChart = {
        labels: monthlyWageBill.map(m => m.month),
        datasets: [{
            label: 'Wage Bill', data: monthlyWageBill.map(m => m.amount),
            backgroundColor: (ctx: any) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(99,102,241,0.9)');
                gradient.addColorStop(1, 'rgba(139,92,246,0.3)');
                return gradient;
            },
            borderRadius: 10, borderSkipped: false, barPercentage: 0.65,
        }],
    };
    const deptChart = {
        labels: departmentDist.map(d => d.dept),
        datasets: [{
            label: 'Staff', data: departmentDist.map(d => d.count),
            backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'],
            borderRadius: 8, barPercentage: 0.7,
        }],
    };
    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1b4b', padding: 10, cornerRadius: 8 } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        },
    };
    const doughnutOpts = {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, color: '#64748b', font: { size: 11 } } }, tooltip: { backgroundColor: '#1e1b4b', padding: 10, cornerRadius: 8 } },
    };

    /* ── avatar gradients per type ── */
    const avatarGradient = (type: string) =>
        type === 'TSC Teacher' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600'
            : type === 'Support Teacher' ? 'bg-gradient-to-br from-violet-400 to-violet-600'
                : 'bg-gradient-to-br from-amber-400 to-amber-600';

    /* ─────────────── LOADING ─────────────── */
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
            <div className="text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <FiBriefcase size={14} className="text-white" />
                    </div>
                </div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">AlphaSchool HR & Payroll</p>
                    <p className="text-gray-400 text-xs mt-1">Loading workforce data…</p>
                </div>
            </div>
        </div>
    );

    /* ─────────────── RENDER ─────────────── */
    return (
        <div className="min-h-screen bg-[#f8f9fc] font-sans">
            {/* ── TOP BANNER ── */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 px-6 py-4">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                            <FiBriefcase size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-lg tracking-tight leading-none">HR & Payroll Management</h1>
                            <p className="text-indigo-300 text-xs mt-0.5">{today}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all disabled:opacity-50">
                            <FiRefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all">
                            <FiDownload size={12} /> Export
                        </button>
                        <Link href="/dashboard/hr-payroll/staff"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-indigo-900 bg-white hover:bg-indigo-50 transition-all shadow-md">
                            <FiUsers size={12} /> Staff Directory
                        </Link>
                        <Link href="/dashboard/hr-payroll/payroll"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-md">
                            <FiDollarSign size={12} /> Run Payroll
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

                {/* ── ALERT STRIP (if pending payroll) ── */}
                {stats.pendingPayroll > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <FiAlertCircle size={13} className="text-amber-600" />
                        </div>
                        <p className="text-amber-800 font-semibold flex-1">
                            <span className="font-black">{stats.pendingPayroll} payroll records</span> are pending approval.
                        </p>
                        <Link href="/dashboard/hr-payroll/payroll" className="text-amber-700 font-bold text-xs hover:text-amber-900 flex items-center gap-1">
                            Review Now <FiArrowRight size={10} />
                        </Link>
                    </div>
                )}

                {/* ── ROW 1: KPI CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiCard label="Total Staff" value={stats.totalStaff} sub={`${stats.activeStaff} active`}
                        icon={FiUsers} gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
                        accent="bg-white/20" trend={5} />
                    <KpiCard label="TSC Teachers" value={stats.teachingStaff} sub="Permanent"
                        icon={FiUserCheck} gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                        accent="bg-white/20" />
                    <KpiCard label="Support Teachers" value={stats.supportTeachers} sub="Contract"
                        icon={FiAward} gradient="bg-gradient-to-br from-violet-500 to-violet-700"
                        accent="bg-white/20" />
                    <KpiCard label="Support Staff" value={stats.subordinateStaff} sub="Non-teaching"
                        icon={FiBriefcase} gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                        accent="bg-white/20" />
                    <KpiCard label="Wage Bill" value={stats.totalWageBill} sub="Basic salaries"
                        icon={FiDollarSign} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                        accent="bg-white/20" isFormatted
                    // pass formatted string as value prop hack
                    />
                    <KpiCard label="Pending Payroll" value={stats.pendingPayroll} sub={`${stats.paidPayroll} paid`}
                        icon={FiClock} gradient="bg-gradient-to-br from-rose-500 to-rose-700"
                        accent="bg-white/20" />
                </div>

                {/* ── ROW 2: FINANCE CARDS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FinanceCard label="Gross Pay" value={stats.totalWageBill + stats.totalAllowances}
                        icon={FiDollarSign} iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
                        valueColor="text-gray-900" sub="Total gross earnings" />
                    <FinanceCard label="Total Allowances" value={stats.totalAllowances}
                        icon={FiTrendingUp} iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
                        valueColor="text-blue-700" sub="House, Transport & Other" />
                    <FinanceCard label="Total Deductions" value={stats.totalDeductions}
                        icon={FiTrendingDown} iconBg="bg-gradient-to-br from-rose-500 to-rose-600"
                        valueColor="text-rose-600" sub="PAYE, NHIF, NSSF & Others" />
                    <FinanceCard label="Net Payroll" value={stats.netPayroll}
                        icon={FiCheckCircle} iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
                        valueColor="text-violet-700" sub="Take-home total" />
                </div>

                {/* ── ROW 3: CHARTS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Staff Distribution */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <SectionHeader title="Staff Distribution" icon={FiUsers} iconColor="bg-indigo-500" />
                        <div style={{ height: 210 }}>
                            {stats.totalStaff > 0
                                ? <Doughnut data={staffDistChart} options={doughnutOpts} />
                                : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                        </div>
                    </div>

                    {/* Gender Distribution */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <SectionHeader title="Gender Distribution" icon={FiActivity} iconColor="bg-pink-500" />
                        <div style={{ height: 210 }}>
                            {stats.totalStaff > 0
                                ? <Doughnut data={genderChart} options={doughnutOpts} />
                                : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                        </div>
                        {stats.totalStaff > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xl font-black text-blue-700">{stats.maleStaff}</p>
                                    <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Male</p>
                                </div>
                                <div className="bg-pink-50 rounded-xl px-3 py-2 text-center">
                                    <p className="text-xl font-black text-pink-600">{stats.femaleStaff}</p>
                                    <p className="text-[9px] text-pink-400 font-bold uppercase tracking-wider">Female</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Monthly Wage Bill */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <SectionHeader title="Monthly Wage Bill" icon={FiBarChart2} iconColor="bg-emerald-500" />
                        <div style={{ height: 210 }}>
                            <Bar data={wageBillChart} options={chartOpts} />
                        </div>
                    </div>
                </div>

                {/* ── ROW 4: DEPT CHART + QUICK ACTIONS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Department chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <SectionHeader title="Staff by Department / Role" icon={FiBriefcase} iconColor="bg-amber-500" />
                        <div style={{ height: 260 }}>
                            {departmentDist.length > 0
                                ? <Bar data={deptChart} options={{ ...chartOpts, indexAxis: 'y' as const }} />
                                : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No department data</div>}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-rows-4 gap-3">
                        <QuickAction label="Add New Staff" desc="Register a staff member"
                            icon={FiPlusCircle} href="/dashboard/hr-payroll/staff/new"
                            gradient="bg-gradient-to-br from-indigo-600 to-indigo-800" kbd="⌘N" />
                        <QuickAction label="Run Payroll" desc="Process monthly payroll"
                            icon={FiDollarSign} href="/dashboard/hr-payroll/payroll"
                            gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" kbd="⌘P" />
                        <QuickAction label="Staff Attendance" desc="Mark & view attendance"
                            icon={FiCalendar} href="/dashboard/attendance/staff"
                            gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
                        <QuickAction label="Payslip & Reports" desc="Download & print reports"
                            icon={FiPrinter} href="/dashboard/hr-payroll/reports"
                            gradient="bg-gradient-to-br from-violet-600 to-violet-800" />
                    </div>
                </div>

                {/* ── ROW 5: DATA GRID TABS ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Tab headers */}
                    <div className="flex items-center border-b border-gray-100 px-5 pt-4">
                        <div className="flex gap-1 mr-auto">
                            {(['staff', 'payroll'] as const).map(tab => (
                                <button key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {tab === 'staff' ? `Staff (${recentStaff.length})` : `Payroll (${recentPayroll.length})`}
                                </button>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 pb-2">
                            <div className="relative">
                                <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={activeTab === 'staff' ? staffSearch : payrollSearch}
                                    onChange={e => activeTab === 'staff' ? setStaffSearch(e.target.value) : setPayrollSearch(e.target.value)}
                                    placeholder={`Search ${activeTab}…`}
                                    className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 transition-all"
                                />
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                                <FiFilter size={11} /> Filter
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                                <FiDownload size={11} /> Export
                            </button>
                        </div>
                    </div>

                    {/* ── STAFF DATA GRID ── */}
                    {activeTab === 'staff' && (
                        <div className="overflow-x-auto">
                            {filteredStaff.length === 0 ? (
                                <div className="py-16 text-center">
                                    <FiUsers size={32} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-400 text-sm font-medium">No staff records found</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['#', 'Staff Member', 'Category', 'Department', 'Gender', 'Basic Salary', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStaff.map((s, i) => (
                                            <tr key={`${s._type}-${s.id}`}
                                                className="hover:bg-indigo-50/40 transition-colors group">
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={`${s.first_name} ${s.last_name}`} gradient={avatarGradient(s._type)} />
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-xs">{s.first_name} {s.last_name}</p>
                                                            {s.email && <p className="text-[10px] text-gray-400">{s.email}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3"><StatusPill status={s._type} /></td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{s.department || s.role || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{s.gender || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-black text-emerald-600 text-xs tabular-nums">
                                                        {fmt(Number(s.basic_salary || 0))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3"><StatusPill status={s.status || 'Active'} /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link href={`/dashboard/hr-payroll/staff/${s.id}`}
                                                            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-all">
                                                            <FiEye size={12} />
                                                        </Link>
                                                        <Link href={`/dashboard/hr-payroll/staff/${s.id}/edit`}
                                                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-100 transition-all">
                                                            <FiEdit2 size={12} />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ── PAYROLL DATA GRID ── */}
                    {activeTab === 'payroll' && (
                        <div className="overflow-x-auto">
                            {filteredPayroll.length === 0 ? (
                                <div className="py-16 text-center">
                                    <FiCreditCard size={32} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-400 text-sm font-medium">No payroll records yet</p>
                                    <Link href="/dashboard/hr-payroll/payroll"
                                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 font-bold hover:text-indigo-800">
                                        Run Payroll <FiArrowRight size={10} />
                                    </Link>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['#', 'Staff Name', 'Pay Period', 'Gross Pay', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredPayroll.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors group">
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={p.staff_name || 'S N'} gradient="bg-gradient-to-br from-indigo-400 to-indigo-600" />
                                                        <p className="font-bold text-gray-800 text-xs">{p.staff_name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{p.pay_period}</td>
                                                <td className="px-4 py-3 font-bold text-gray-800 text-xs tabular-nums">{fmt(Number(p.gross_pay || 0))}</td>
                                                <td className="px-4 py-3 font-semibold text-blue-600 text-xs tabular-nums">
                                                    {fmt(Number(p.house_allowance || 0) + Number(p.transport_allowance || 0) + Number(p.other_allowances || 0))}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-rose-600 text-xs tabular-nums">{fmt(Number(p.total_deductions || 0))}</td>
                                                <td className="px-4 py-3 font-black text-emerald-600 text-xs tabular-nums">{fmt(Number(p.net_pay || 0))}</td>
                                                <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 transition-all"><FiEye size={12} /></button>
                                                        <button className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-100 transition-all"><FiPrinter size={12} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Totals row */}
                                    <tfoot>
                                        <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                                            <td colSpan={3} className="px-4 py-3 text-xs font-black text-indigo-700 uppercase tracking-wider">TOTALS</td>
                                            <td className="px-4 py-3 font-black text-gray-900 text-xs tabular-nums">
                                                {fmt(filteredPayroll.reduce((s, p) => s + Number(p.gross_pay || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 font-black text-blue-600 text-xs tabular-nums">
                                                {fmt(filteredPayroll.reduce((s, p) => s + Number(p.house_allowance || 0) + Number(p.transport_allowance || 0) + Number(p.other_allowances || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 font-black text-rose-600 text-xs tabular-nums">
                                                {fmt(filteredPayroll.reduce((s, p) => s + Number(p.total_deductions || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 font-black text-emerald-600 text-xs tabular-nums">
                                                {fmt(filteredPayroll.reduce((s, p) => s + Number(p.net_pay || 0), 0))}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Pagination stub */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-xs text-gray-400">
                            Showing {activeTab === 'staff' ? filteredStaff.length : filteredPayroll.length} records
                        </p>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3].map(n => (
                                <button key={n}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${n === 1 ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <Link href={activeTab === 'staff' ? '/dashboard/hr-payroll/staff' : '/dashboard/hr-payroll/payroll'}
                            className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-800">
                            View All <FiArrowRight size={10} />
                        </Link>
                    </div>
                </div>

                {/* ── ROW 6: MORE QUICK ACTIONS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[
                        { label: 'Staff Directory', desc: 'View all staff', icon: FiUsers, href: '/dashboard/staff', color: 'from-indigo-500 to-indigo-700' },
                        { label: 'Run Payroll', desc: 'Process salaries', icon: FiDollarSign, href: '/dashboard/hr-payroll/payroll', color: 'from-emerald-500 to-emerald-700' },
                        { label: 'Attendance', desc: 'Mark attendance', icon: FiCalendar, href: '/dashboard/attendance/staff', color: 'from-amber-500 to-orange-600' },
                        { label: 'Leave Mgmt', desc: 'Staff leave records', icon: FiClock, href: '/dashboard/hr-payroll/leave', color: 'from-violet-500 to-violet-700' },
                        { label: 'Payslips', desc: 'Print & download', icon: FiPrinter, href: '/dashboard/hr-payroll/payslips', color: 'from-blue-500 to-blue-700' },
                        { label: 'HR Reports', desc: 'Analytics & exports', icon: FiBarChart2, href: '/dashboard/hr-payroll/reports', color: 'from-rose-500 to-rose-700' },
                    ].map((a, i) => {
                        const Icon = a.icon;
                        return (
                            <Link key={i} href={a.href}
                                className={`group relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${a.color} shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300`}>
                                <div className="absolute -right-3 -top-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Icon size={48} />
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                                    <Icon size={16} />
                                </div>
                                <p className="font-black text-xs leading-tight">{a.label}</p>
                                <p className="text-[10px] opacity-70 mt-0.5">{a.desc}</p>
                            </Link>
                        );
                    })}
                </div>

                {/* ── FOOTER ── */}
                <div className="flex items-center justify-between text-xs text-gray-400 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>AlphaSchool HR &amp; Payroll · Live data</span>
                    </div>
                    <span>Powered by AlphaSchool v2.0 · Beating Zeraki since day one 🇰🇪</span>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    FiUsers, FiUserCheck, FiDollarSign, FiTrendingUp, FiTrendingDown,
    FiBriefcase, FiCalendar, FiArrowRight, FiDownload, FiRefreshCw,
    FiPhone, FiMail, FiClock, FiAlertCircle, FiCreditCard
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export default function HRPayrollOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStaff: 0, teachingStaff: 0, supportTeachers: 0, subordinateStaff: 0,
        activeStaff: 0, maleStaff: 0, femaleStaff: 0,
        totalWageBill: 0, totalAllowances: 0, totalDeductions: 0, netPayroll: 0,
        pendingPayroll: 0, paidPayroll: 0,
    });
    const [recentStaff, setRecentStaff] = useState<any[]>([]);
    const [recentPayroll, setRecentPayroll] = useState<any[]>([]);
    const [departmentDist, setDepartmentDist] = useState<{ dept: string; count: number }[]>([]);
    const [monthlyWageBill, setMonthlyWageBill] = useState<{ month: string; amount: number }[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all staff types
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
            const maleCount = allStaff.filter(s => s.gender === 'Male').length;
            const femaleCount = allStaff.filter(s => s.gender === 'Female').length;

            // Total wage bill (sum of basic salaries)
            const totalWage = allStaff.reduce((s, st) => s + Number(st.basic_salary || 0), 0);

            // Payroll stats
            const totalAllowances = payroll.reduce((s, p) => s + Number(p.house_allowance || 0) + Number(p.transport_allowance || 0) + Number(p.other_allowances || 0), 0);
            const totalDeductions = payroll.reduce((s, p) => s + Number(p.total_deductions || 0), 0);
            const netPayroll = payroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);
            const pendingPayroll = payroll.filter(p => p.status === 'Pending').length;
            const paidPayroll = payroll.filter(p => p.status === 'Paid').length;

            // Department distribution from teachers
            const deptMap: Record<string, number> = {};
            teachers.forEach(t => {
                const dept = t.department || t.designation || 'General';
                deptMap[dept] = (deptMap[dept] || 0) + 1;
            });
            subordinate.forEach(s => {
                const dept = s.role || s.department || 'Support';
                deptMap[dept] = (deptMap[dept] || 0) + 1;
            });
            setDepartmentDist(Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count).slice(0, 8));

            // Monthly wage bill (last 6 months from payroll)
            const monthlyMap: Record<string, number> = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
                const m = d.getMonth() + 1;
                const y = d.getFullYear();
                const monthPayrolls = payroll.filter(p => p.month === m && p.year === y);
                monthlyMap[key] = monthPayrolls.reduce((s, p) => s + Number(p.gross_pay || 0), 0);
            }
            setMonthlyWageBill(Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })));

            // Recent staff (last 10 joined)
            const sorted = [...allStaff].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            setRecentStaff(sorted.slice(0, 8));

            // Recent payroll
            setRecentPayroll(payroll.slice(0, 8));

            setStats({
                totalStaff: allStaff.length, teachingStaff: teachers.length,
                supportTeachers: support.length, subordinateStaff: subordinate.length,
                activeStaff: activeAll.length, maleStaff: maleCount, femaleStaff: femaleCount,
                totalWageBill: totalWage, totalAllowances, totalDeductions, netPayroll,
                pendingPayroll, paidPayroll,
            });
        } catch (e) { console.error('HR Dashboard error:', e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading HR & Payroll...</p>
            </div>
        </div>
    );

    const staffDistChart = {
        labels: ['TSC Teachers', 'Support Teachers', 'Support Staff'],
        datasets: [{
            data: [stats.teachingStaff, stats.supportTeachers, stats.subordinateStaff],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b'],
            borderWidth: 0,
        }],
    };

    const genderChart = {
        labels: ['Male', 'Female'],
        datasets: [{
            data: [stats.maleStaff, stats.femaleStaff],
            backgroundColor: ['#3b82f6', '#ec4899'],
            borderWidth: 0,
        }],
    };

    const wageBillChart = {
        labels: monthlyWageBill.map(m => m.month),
        datasets: [{
            label: 'Monthly Wage Bill',
            data: monthlyWageBill.map(m => m.amount),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderRadius: 8,
            barPercentage: 0.6,
        }],
    };

    const deptChart = {
        labels: departmentDist.map(d => d.dept),
        datasets: [{
            label: 'Staff Count',
            data: departmentDist.map(d => d.count),
            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'],
            borderRadius: 6,
            barPercentage: 0.7,
        }],
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } },
    };

    const doughnutOptions = {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 14, usePointStyle: true, font: { size: 12 } } } },
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiBriefcase className="text-indigo-500" /> HR & Payroll Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Overview of staff records, payroll processing, and workforce analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 rounded-lg">
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                    <Link href="/dashboard/hr-payroll/staff"
                        className="px-5 py-2 text-sm font-bold text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <FiUsers size={14} /> Staff Directory <FiArrowRight size={14} />
                    </Link>
                    <Link href="/dashboard/hr-payroll/payroll"
                        className="px-5 py-2 text-sm font-bold text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <FiDollarSign size={14} /> Run Payroll <FiArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Stat Cards Row 1 - Staff */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Staff', value: stats.totalStaff, icon: FiUsers, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', sub: `${stats.activeStaff} active` },
                    { label: 'TSC Teachers', value: stats.teachingStaff, icon: FiUserCheck, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', sub: 'Permanent' },
                    { label: 'Support Teachers', value: stats.supportTeachers, icon: FiUsers, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', sub: 'Contract' },
                    { label: 'Support Staff', value: stats.subordinateStaff, icon: FiBriefcase, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', sub: 'Non-teaching' },
                    { label: 'Monthly Wage Bill', value: fmt(stats.totalWageBill), icon: FiDollarSign, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', sub: 'Basic salaries' },
                    { label: 'Pending Payroll', value: stats.pendingPayroll, icon: FiClock, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', sub: `${stats.paidPayroll} paid` },
                ].map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <div key={i} className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: c.gradient }}>
                            <div className="absolute top-3 right-3 opacity-20"><Icon size={28} /></div>
                            <p className="text-xs font-semibold opacity-85 mb-1">{c.label}</p>
                            <p className="text-xl font-extrabold">{c.value}</p>
                            <p className="text-[10px] opacity-75 mt-1">{c.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <FiDollarSign className="text-white" size={22} />
                    </div>
                    <div><p className="text-xs text-gray-400 font-semibold">GROSS PAY</p><p className="text-lg font-bold text-gray-800">{fmt(stats.totalWageBill + stats.totalAllowances)}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <FiTrendingUp className="text-white" size={22} />
                    </div>
                    <div><p className="text-xs text-gray-400 font-semibold">ALLOWANCES</p><p className="text-lg font-bold text-blue-600">{fmt(stats.totalAllowances)}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <FiTrendingDown className="text-white" size={22} />
                    </div>
                    <div><p className="text-xs text-gray-400 font-semibold">DEDUCTIONS</p><p className="text-lg font-bold text-red-600">{fmt(stats.totalDeductions)}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <FiDollarSign className="text-white" size={22} />
                    </div>
                    <div><p className="text-xs text-gray-400 font-semibold">NET PAYROLL</p><p className="text-lg font-bold text-purple-600">{fmt(stats.netPayroll)}</p></div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Staff Distribution */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><FiUsers className="text-indigo-500" /> Staff Distribution</h3>
                    <div style={{ height: 220 }}>
                        {stats.totalStaff > 0 ? <Doughnut data={staffDistChart} options={doughnutOptions} /> : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No staff data</div>
                        )}
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><FiUsers className="text-pink-500" /> Gender Distribution</h3>
                    <div style={{ height: 220 }}>
                        {stats.totalStaff > 0 ? <Doughnut data={genderChart} options={doughnutOptions} /> : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No staff data</div>
                        )}
                    </div>
                </div>

                {/* Monthly Wage Bill */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><FiDollarSign className="text-green-500" /> Monthly Wage Bill</h3>
                    <div style={{ height: 220 }}>
                        <Bar data={wageBillChart} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Department Chart + Recent Staff */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Department Distribution */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><FiBriefcase className="text-amber-500" /> Staff by Department / Role</h3>
                    <div style={{ height: 280 }}>
                        <Bar data={deptChart} options={{ ...chartOptions, indexAxis: 'y' as const }} />
                    </div>
                </div>

                {/* Recent Staff Members */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiUsers className="text-indigo-500" /> Recent Staff</h3>
                        <Link href="/dashboard/hr-payroll/staff" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">View All <FiArrowRight size={12} /></Link>
                    </div>
                    {recentStaff.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">No staff records found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Status</th><th>Salary</th></tr></thead>
                                <tbody>
                                    {recentStaff.map((s, i) => (
                                        <tr key={`${s._type}-${s.id}`}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                            <td><span className={`badge ${s._type === 'TSC Teacher' ? 'badge-blue' : s._type === 'Support Teacher' ? 'badge-purple' : 'badge-warning'}`}>{s._type}</span></td>
                                            <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                                            <td className="font-bold text-green-600">{fmt(Number(s.basic_salary || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Payroll Records */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiCreditCard className="text-green-500" /> Recent Payroll Records</h3>
                    <Link href="/dashboard/hr-payroll/payroll" className="text-xs text-green-600 hover:text-green-800 font-semibold flex items-center gap-1">Run Payroll <FiArrowRight size={12} /></Link>
                </div>
                {recentPayroll.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">
                        <FiAlertCircle className="mx-auto mb-2" size={28} />
                        No payroll records yet. Go to <Link href="/dashboard/hr-payroll/payroll" className="text-indigo-600 font-semibold underline">Run Payroll</Link> to process.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead><tr><th>#</th><th>Staff Name</th><th>Month</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                            <tbody>
                                {recentPayroll.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="text-xs text-gray-400">{i + 1}</td>
                                        <td className="font-semibold text-gray-800">{p.staff_name}</td>
                                        <td className="text-sm">{p.pay_period}</td>
                                        <td className="font-semibold text-gray-700">{fmt(Number(p.gross_pay || 0))}</td>
                                        <td className="font-semibold text-red-600">{fmt(Number(p.total_deductions || 0))}</td>
                                        <td className="font-bold text-green-600">{fmt(Number(p.net_pay || 0))}</td>
                                        <td><span className={`badge ${p.status === 'Paid' ? 'badge-success' : p.status === 'Approved' ? 'badge-blue' : 'badge-warning'}`}>{p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Add Staff', icon: FiUsers, href: '/dashboard/hr-payroll/staff', color: '#6366f1' },
                    { label: 'Run Payroll', icon: FiDollarSign, href: '/dashboard/hr-payroll/payroll', color: '#22c55e' },
                    { label: 'Staff Attendance', icon: FiCalendar, href: '/dashboard/attendance/staff', color: '#f59e0b' },
                    { label: 'Staff Directory', icon: FiUserCheck, href: '/dashboard/staff', color: '#3b82f6' },
                ].map((link, i) => {
                    const Icon = link.icon;
                    return (
                        <Link key={i} href={link.href} className="bg-white rounded-2xl border border-gray-200 p-5 text-center hover:shadow-lg hover:-translate-y-1 transition-all group">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: link.color + '18' }}>
                                <Icon size={22} style={{ color: link.color }} />
                            </div>
                            <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-800">{link.label}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

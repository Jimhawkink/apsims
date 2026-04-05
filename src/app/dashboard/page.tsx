'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FiUsers, FiDollarSign, FiTrendingUp, FiCalendar, FiBookOpen, FiUserCheck } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalStudents: 0, activeStudents: 0, newEnrollments: 0,
        totalStaff: 0, teachingStaff: 0, nonTeachingStaff: 0,
        feesCollected: 0, feesDue: 0, prepayments: 0,
        totalIncome: 0, totalExpenses: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0 },
        reportedStudents: 0,
    });
    const [studentsByForm, setStudentsByForm] = useState<{ form: string; male: number; female: number }[]>([]);
    const [feePayments, setFeePayments] = useState<{ month: string; amount: number }[]>([]);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [recentStudents, setRecentStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Admin');
    const currentYear = new Date().getFullYear();

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            if (typeof window !== 'undefined') {
                const u = localStorage.getItem('school_user');
                if (u) { try { setUserName(JSON.parse(u).full_name || 'Admin'); } catch { } }
            }

            // Students
            const { data: allStudents } = await supabase.from('school_students').select('id, first_name, last_name, gender, form_id, status, admission_date, created_at, admission_no, admission_number');
            const students = allStudents || [];
            const active = students.filter(s => s.status === 'Active');
            const thisYear = students.filter(s => {
                const d = s.admission_date || s.created_at;
                return d && new Date(d).getFullYear() === currentYear;
            });

            // Forms for student distribution
            const { data: forms } = await supabase.from('school_forms').select('*').order('form_level');
            const formList = forms || [];
            const dist = formList.map(f => {
                const inForm = students.filter(s => s.form_id === f.id);
                return { form: f.form_name, male: inForm.filter(s => s.gender === 'Male').length, female: inForm.filter(s => s.gender === 'Female').length };
            });
            setStudentsByForm(dist);

            // Staff
            const { data: teachers } = await supabase.from('school_teachers').select('id, staff_type, status');
            const staff = teachers || [];
            const teaching = staff.filter(s => s.staff_type === 'Teaching').length;
            const nonTeaching = staff.filter(s => s.staff_type !== 'Teaching').length;

            // Fee Payments
            const { data: payments } = await supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false });
            const paymentList = payments || [];
            const totalFees = paymentList.reduce((s, p) => s + Number(p.amount || 0), 0);

            // Fee structure for dues calculation
            const { data: structures } = await supabase.from('school_fee_structures').select('amount');
            const totalStructure = (structures || []).reduce((s, f) => s + Number(f.amount || 0), 0);
            const expectedFees = totalStructure * active.length;
            const feesDue = Math.max(0, expectedFees - totalFees);
            const prepayments = Math.max(0, totalFees - expectedFees);

            // Monthly fee trend (last 6 months)
            const monthlyFees: { month: string; amount: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const month = d.toLocaleString('en', { month: 'short', year: '2-digit' });
                const y = d.getFullYear(); const m = d.getMonth();
                const monthPayments = paymentList.filter(p => {
                    const pd = new Date(p.payment_date);
                    return pd.getFullYear() === y && pd.getMonth() === m;
                });
                monthlyFees.push({ month, amount: monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0) });
            }
            setFeePayments(monthlyFees);
            setRecentPayments(paymentList.slice(0, 8));

            // Recent students
            const recent = [...students].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8);
            setRecentStudents(recent);

            // Attendance (today)
            const today = new Date().toISOString().split('T')[0];
            const { data: attData } = await supabase.from('school_daily_attendance').select('status').eq('attendance_date', today);
            const att = attData || [];
            const present = att.filter(a => a.status === 'Present').length;
            const absent = att.filter(a => a.status === 'Absent').length;
            const late = att.filter(a => a.status === 'Late').length;
            const attRate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;

            // Reported students (attendance logged this term)
            const { data: termData } = await supabase.from('school_terms').select('*').eq('is_current', true).single();
            let reported = 0;
            if (termData) {
                const { count } = await supabase.from('school_daily_attendance').select('student_id', { count: 'exact', head: true }).gte('attendance_date', termData.start_date).lte('attendance_date', termData.end_date);
                reported = count || 0;
            }

            // Income & Expenses
            const { data: incomeData } = await supabase.from('school_income').select('amount');
            const totalIncome = (incomeData || []).reduce((s, i) => s + Number(i.amount || 0), 0) + totalFees;
            const { data: expenseData } = await supabase.from('school_expenses').select('amount');
            const totalExpenses = (expenseData || []).reduce((s, e) => s + Number(e.amount || 0), 0);

            setStats({
                totalStudents: students.length, activeStudents: active.length, newEnrollments: thisYear.length,
                totalStaff: staff.length, teachingStaff: teaching, nonTeachingStaff: nonTeaching,
                feesCollected: totalFees, feesDue, prepayments,
                totalIncome, totalExpenses,
                attendance: { present, absent, late, rate: attRate },
                reportedStudents: reported,
            });
        } catch (e) { console.error('Dashboard error:', e); }
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 40, height: 40, borderWidth: 3 }} />
                <p className="text-gray-500 text-sm">Loading dashboard...</p>
            </div>
        </div>
    );

    // Chart data
    const studentDistChart = {
        labels: studentsByForm.map(s => s.form),
        datasets: [
            { label: 'Male', data: studentsByForm.map(s => s.male), backgroundColor: '#3b82f6', borderRadius: 6, barPercentage: 0.6 },
            { label: 'Female', data: studentsByForm.map(s => s.female), backgroundColor: '#ec4899', borderRadius: 6, barPercentage: 0.6 },
        ],
    };

    const feeTrendChart = {
        labels: feePayments.map(f => f.month),
        datasets: [{
            label: 'Fees Collected',
            data: feePayments.map(f => f.amount),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 5,
        }],
    };

    const attendanceDoughnut = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{
            data: [stats.attendance.present, stats.attendance.absent, stats.attendance.late],
            backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
            borderWidth: 0,
        }],
    };

    const feeBreakdownDoughnut = {
        labels: ['Collected', 'Dues', 'Prepayments'],
        datasets: [{
            data: [stats.feesCollected, stats.feesDue, stats.prepayments],
            backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, weight: 500 as const } } } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } } },
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">{greeting}, {userName}! 👋</h1>
                <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening at your school today — {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Row 1: Key Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Students', value: stats.totalStudents, icon: '👨‍🎓', sub: `${stats.activeStudents} active`, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
                    { label: 'New Enrollment', value: stats.newEnrollments, icon: '🆕', sub: `Year ${currentYear}`, gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
                    { label: 'Attendance', value: `${stats.attendance.rate}%`, icon: '📋', sub: `${stats.attendance.present}P / ${stats.attendance.absent}A`, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                    { label: 'Reported (Term)', value: stats.reportedStudents, icon: '✅', sub: 'Current term', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
                    { label: 'Fees Collected', value: fmt(stats.feesCollected), icon: '💰', sub: `Year ${currentYear}`, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                    { label: 'Total Staff', value: stats.totalStaff, icon: '👨‍🏫', sub: `${stats.teachingStaff} teaching`, gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
                ].map((c, i) => (
                    <div key={i} className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: c.gradient }}>
                        <div className="absolute top-2 right-2 text-2xl opacity-30">{c.icon}</div>
                        <p className="text-xs font-semibold opacity-85 mb-1">{c.label}</p>
                        <p className="text-xl font-extrabold">{c.value}</p>
                        <p className="text-[10px] opacity-75 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* Row 2: Fee Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>💰</div>
                    <div><p className="text-xs text-gray-400 font-semibold">FEES COLLECTED</p><p className="text-lg font-bold text-gray-800">{fmt(stats.feesCollected)}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>📛</div>
                    <div><p className="text-xs text-gray-400 font-semibold">FEES DUE / ARREARS</p><p className="text-lg font-bold text-red-600">{fmt(stats.feesDue)}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>💎</div>
                    <div><p className="text-xs text-gray-400 font-semibold">PREPAYMENTS</p><p className="text-lg font-bold text-blue-600">{fmt(stats.prepayments)}</p></div>
                </div>
            </div>

            {/* Row 3: Charts — Student Distribution + Fee Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Student Distribution Bar Chart */}
                <div className="chart-container">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 text-sm">📊 Student Distribution by Form & Gender</h3>
                        <span className="badge badge-info">{stats.totalStudents} total</span>
                    </div>
                    <div style={{ height: 280 }}>
                        <Bar data={studentDistChart} options={chartOptions} />
                    </div>
                </div>

                {/* Fee Payment Trend Line Chart */}
                <div className="chart-container">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 text-sm">📈 Fee Payment Trend (Last 6 Months)</h3>
                        <span className="badge badge-purple">{fmt(stats.feesCollected)}</span>
                    </div>
                    <div style={{ height: 280 }}>
                        <Line data={feeTrendChart} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Row 4: Doughnut Charts — Attendance + Fee Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Attendance Doughnut */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4">📋 Today&apos;s Attendance</h3>
                    <div style={{ height: 220 }}>
                        {(stats.attendance.present + stats.attendance.absent + stats.attendance.late) > 0 ? (
                            <Doughnut data={attendanceDoughnut} options={doughnutOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No attendance data today</div>
                        )}
                    </div>
                </div>

                {/* Fee Breakdown Doughnut */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4">💰 Fee Status Breakdown</h3>
                    <div style={{ height: 220 }}>
                        {(stats.feesCollected + stats.feesDue + stats.prepayments) > 0 ? (
                            <Doughnut data={feeBreakdownDoughnut} options={doughnutOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No fee data yet</div>
                        )}
                    </div>
                </div>

                {/* Income vs Expenses */}
                <div className="chart-container">
                    <h3 className="font-bold text-gray-700 text-sm mb-4">💹 Income vs Expenses</h3>
                    <div className="space-y-4 pt-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total Income</span><span className="font-bold text-green-600">{fmt(stats.totalIncome)}</span></div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, stats.totalIncome > 0 ? 100 : 0)}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} /></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total Expenses</span><span className="font-bold text-red-600">{fmt(stats.totalExpenses)}</span></div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${stats.totalIncome > 0 ? Math.min(100, (stats.totalExpenses / stats.totalIncome) * 100) : 0}%`, background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} /></div>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                            <div className="flex justify-between"><span className="text-sm text-gray-500 font-medium">Net Income</span><span className={`font-bold text-lg ${stats.totalIncome - stats.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(stats.totalIncome - stats.totalExpenses)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 5: Data Grids — Recent Payments + Recent Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent Fee Payments DataGrid */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm">💳 Recent Fee Payments</h3>
                        <span className="badge badge-success">{recentPayments.length} records</span>
                    </div>
                    {recentPayments.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">No payments recorded yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Date</th><th>Student ID</th><th>Amount</th><th>Method</th><th>Receipt</th></tr></thead>
                                <tbody>
                                    {recentPayments.map((p, i) => (
                                        <tr key={p.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="text-sm">{new Date(p.payment_date).toLocaleDateString('en-KE')}</td>
                                            <td className="font-semibold text-blue-600">{p.student_id}</td>
                                            <td className="font-bold text-green-600">{fmt(Number(p.amount))}</td>
                                            <td><span className="badge badge-info">{p.payment_method || 'Cash'}</span></td>
                                            <td className="text-xs text-gray-500">{p.receipt_number || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Recent Students DataGrid */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm">🆕 Recent Enrollments</h3>
                        <span className="badge badge-purple">{stats.newEnrollments} this year</span>
                    </div>
                    {recentStudents.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">No students enrolled yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Adm No</th><th>Name</th><th>Gender</th><th>Status</th></tr></thead>
                                <tbody>
                                    {recentStudents.map((s, i) => (
                                        <tr key={s.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                            <td className="font-semibold">{s.first_name} {s.last_name}</td>
                                            <td><span className={`badge ${s.gender === 'Male' ? 'badge-blue' : 'badge-pink'}`}>{s.gender}</span></td>
                                            <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 6: Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Add Student', icon: '👨‍🎓', href: '/dashboard/students', color: '#22c55e' },
                    { label: 'Add Staff', icon: '👨‍🏫', href: '/dashboard/staff', color: '#3b82f6' },
                    { label: 'Record Fee', icon: '💰', href: '/dashboard/fees', color: '#8b5cf6' },
                    { label: 'Take Attendance', icon: '📋', href: '/dashboard/attendance', color: '#f59e0b' },
                    { label: 'Settings', icon: '⚙️', href: '/dashboard/settings', color: '#6366f1' },
                    { label: 'Users', icon: '🔑', href: '/dashboard/users', color: '#ec4899' },
                ].map((link, i) => (
                    <a key={i} href={link.href} className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:shadow-lg hover:-translate-y-1 transition-all group">
                        <div className="text-3xl mb-2">{link.icon}</div>
                        <p className="text-xs font-semibold text-gray-600 group-hover:text-gray-800">{link.label}</p>
                    </a>
                ))}
            </div>
        </div>
    );
}

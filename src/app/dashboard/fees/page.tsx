'use client';

import { useFeeData, fmt } from './useFeeData';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FiDollarSign, FiTrendingUp, FiCreditCard, FiUsers, FiAlertTriangle, FiFileText, FiGrid, FiBarChart2, FiBookOpen, FiArrowRight, FiRefreshCw, FiPieChart } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function FeeDashboardPage() {
    const { forms, students, payments, structures, terms, loading, fetchAll, currentTerm, getStudentFees } = useFeeData();

    if (loading) return <div className="flex flex-col items-center justify-center h-64 gap-3"><div className="relative"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>💰</div><div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" /></div><p className="text-sm font-bold text-gray-500">Loading Fee Dashboard…</p></div>;

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const activeStudents = students.filter(s => s.status === 'Active');
    const totalExpected = activeStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const studentsOwing = activeStudents.filter(s => getStudentFees(s.id, s.form_id).annualBalance > 0).length;

    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.payment_date === today);
    const todayTotal = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // This week
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekPayments = payments.filter(p => new Date(p.payment_date) >= weekStart);
    const weekTotal = weekPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Method breakdown
    const methodBreakdown: Record<string, number> = {};
    payments.forEach(p => { const m = (p.payment_method || 'Other').replace(/\s*\(.+\)/, ''); methodBreakdown[m] = (methodBreakdown[m] || 0) + Number(p.amount || 0); });

    // Monthly trends
    const monthlyTrends: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
        const m = d.getMonth(); const y = d.getFullYear();
        const amt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, p) => s + Number(p.amount || 0), 0);
        monthlyTrends.push({ month: key, amount: amt });
    }

    // Form-wise
    const formCollection = forms.map(form => {
        const fStudents = activeStudents.filter(s => s.form_id === form.id);
        const collected = fStudents.reduce((s, st) => s + payments.filter(p => p.student_id === st.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
        const expected = fStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).annualTotal, 0);
        return { name: form.form_name, collected, expected, balance: Math.max(0, expected - collected), students: fStudents.length };
    });

    // Recent payments
    const recentPayments = payments.slice(0, 8);

    // Daily collection (last 7 days)
    const daily: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
        const ds = d.toISOString().split('T')[0];
        daily.push({ day: key, amount: payments.filter(p => p.payment_date === ds).reduce((s, p) => s + Number(p.amount || 0), 0) });
    }

    const gp = 'linear-gradient(135deg, #7c3aed, #4f46e5)';

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: gp }}><FiPieChart size={18} /></span>
                        Fee Dashboard
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-12">Overview of fee collections, outstanding, and trends</p>
                </div>
                <div className="flex items-center gap-2">
                    {currentTerm && <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-semibold text-indigo-700">{currentTerm.term_name} {currentTerm.academic_year || currentTerm.year || ''}</span></div>}
                    <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiRefreshCw size={16} /></button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: "Today's Collection", value: fmt(todayTotal), emoji: '📅', color: '#22c55e', sub: `${todayPayments.length} payments` },
                    { label: "This Week", value: fmt(weekTotal), emoji: '📆', color: '#06b6d4', sub: `${weekPayments.length} payments` },
                    { label: 'Total Collected', value: fmt(totalCollected), emoji: '✅', color: '#3b82f6', sub: `${payments.length} transactions` },
                    { label: 'Total Expected', value: fmt(totalExpected), emoji: '📊', color: '#7c3aed', sub: `${activeStudents.length} students` },
                    { label: 'Outstanding', value: fmt(totalOutstanding), emoji: '⚠️', color: '#ef4444', sub: `${studentsOwing} owing`, pulse: totalOutstanding > 0 },
                    { label: 'Collection Rate', value: `${collectionRate}%`, emoji: '📈', color: collectionRate >= 70 ? '#22c55e' : collectionRate >= 40 ? '#f59e0b' : '#ef4444', sub: collectionRate >= 70 ? 'On track' : collectionRate >= 40 ? 'Needs attention' : 'Critical', pulse: collectionRate < 40 },
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: c.color }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{c.label}</p>
                            <span className="text-lg">{c.emoji}</span>
                        </div>
                        <p className="text-lg font-extrabold text-gray-900">{c.value}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{c.sub}</p>
                        {c.pulse && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: c.color }} />}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: c.color }} />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 chart-container">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiTrendingUp className="text-indigo-500" /> Monthly Collection Trend</p>
                    <div style={{ height: 260 }}>
                        <Line data={{ labels: monthlyTrends.map(m => m.month), datasets: [{ label: 'Collections', data: monthlyTrends.map(m => m.amount), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#6366f1' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>
                <div className="chart-container">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiCreditCard className="text-green-500" /> Payment Methods</p>
                    <div style={{ height: 260 }}>
                        {Object.keys(methodBreakdown).length > 0 ? (
                            <Doughnut data={{ labels: Object.keys(methodBreakdown), datasets: [{ data: Object.values(methodBreakdown), backgroundColor: ['#22c55e','#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' as const, labels: { padding: 10, usePointStyle: true, font: { size: 11 } } } } }} />
                        ) : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                    </div>
                </div>
            </div>

            {/* Daily bar chart + Recent payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="chart-container">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiBarChart2 className="text-purple-500" /> Daily Collection (Last 7 Days)</p>
                    <div style={{ height: 220 }}>
                        <Bar data={{ labels: daily.map(d => d.day), datasets: [{ label: 'KES', data: daily.map(d => d.amount), backgroundColor: '#8b5cf6', borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Payments</p>
                        <Link href="/dashboard/fees/payments" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">View All <FiArrowRight size={12} /></Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentPayments.map(p => {
                            const s = students.find(st => st.id === p.student_id);
                            return (
                                <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{s ? `${s.first_name} ${s.last_name}` : '-'}</p>
                                        <p className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })} • {p.payment_method}</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">{fmt(Number(p.amount))}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Form-wise Collection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiUsers className="text-purple-500" /> Form-wise Fee Collection</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Students</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Expected</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Collected</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-48">Progress</th>
                        </tr></thead>
                        <tbody>
                            {formCollection.map(f => {
                                const pct = f.expected > 0 ? Math.round((f.collected / f.expected) * 100) : 0;
                                return (
                                    <tr key={f.name} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-800">{f.name}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">{f.students}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-700">{fmt(f.expected)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(f.collected)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(f.balance)}</td>
                                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full" style={{ width: `${Math.min(100,pct)}%`, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }} /></div><span className="text-xs font-bold text-gray-600 w-10 text-right">{pct}%</span></div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot><tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                            <td className="px-4 py-3 text-sm">TOTALS</td>
                            <td className="px-4 py-3 text-center text-sm text-indigo-700">{activeStudents.length}</td>
                            <td className="px-4 py-3 text-right text-sm">{fmt(totalExpected)}</td>
                            <td className="px-4 py-3 text-right text-sm text-green-700">{fmt(totalCollected)}</td>
                            <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(totalOutstanding)}</td>
                            <td className="px-4 py-3 text-center text-sm" style={{ color: collectionRate >= 70 ? '#16a34a' : '#d97706' }}>{collectionRate}%</td>
                        </tr></tfoot>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: FiCreditCard, color: '#22c55e' },
                    { label: 'Outstanding', href: '/dashboard/fees/outstanding', icon: FiAlertTriangle, color: '#ef4444' },
                    { label: 'Payments', href: '/dashboard/fees/payments', icon: FiFileText, color: '#3b82f6' },
                    { label: 'Fee Structure', href: '/dashboard/fees/structure', icon: FiGrid, color: '#8b5cf6' },
                    { label: 'Statements', href: '/dashboard/fees/statements', icon: FiBookOpen, color: '#f59e0b' },
                ].map((a, i) => {
                    const Icon = a.icon;
                    return (
                        <Link key={i} href={a.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-md transition-all group relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: a.color }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: a.color + '18' }}><Icon size={22} style={{ color: a.color }} /></div>
                            <p className="text-sm font-bold text-gray-600 group-hover:text-gray-800">{a.label}</p>
                            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: a.color }} />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

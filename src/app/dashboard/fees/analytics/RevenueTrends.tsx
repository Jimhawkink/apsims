'use client';

import { useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FiTrendingUp, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { fmt } from '../useFeeData';

interface Props { payments: any[]; students: any[]; forms: any[]; structures: any[]; getStudentFees: (id: number, fid?: number) => any; }

export default function RevenueTrends({ payments, students, forms, structures, getStudentFees }: Props) {
    const active = useMemo(() => students.filter(s => s.status === 'Active'), [students]);

    const monthly = useMemo(() => {
        const res: { month: string; amount: number; prevAmount: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const m = d.getMonth(), y = d.getFullYear();
            const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
            const amt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, p) => s + Number(p.amount || 0), 0);
            const prevD = new Date(y - 1, m);
            const prevAmt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === prevD.getMonth() && pd.getFullYear() === prevD.getFullYear(); }).reduce((s, p) => s + Number(p.amount || 0), 0);
            res.push({ month: label, amount: amt, prevAmount: prevAmt });
        }
        return res;
    }, [payments]);

    const dailyThisMonth = useMemo(() => {
        const now = new Date();
        const res: { day: string; amount: number }[] = [];
        for (let d = 1; d <= now.getDate(); d++) {
            const dt = new Date(now.getFullYear(), now.getMonth(), d);
            const ds = dt.toISOString().split('T')[0];
            res.push({ day: `${d}`, amount: payments.filter(p => p.payment_date === ds).reduce((s, p) => s + Number(p.amount || 0), 0) });
        }
        return res;
    }, [payments]);

    const formWise = useMemo(() => forms.map(f => {
        const fSt = active.filter(s => s.form_id === f.id);
        const col = fSt.reduce((s, st) => s + payments.filter(p => p.student_id === st.id).reduce((a, p) => a + Number(p.amount || 0), 0), 0);
        return { name: f.form_name, collected: col };
    }), [forms, active, payments]);

    const methodBreak = useMemo(() => {
        const map: Record<string, number> = {};
        payments.forEach(p => { const m = (p.payment_method || 'Other').replace(/\s*\(.+\)/, ''); map[m] = (map[m] || 0) + Number(p.amount || 0); });
        return map;
    }, [payments]);

    const thisTermTotal = monthly.slice(-3).reduce((s, m) => s + m.amount, 0);
    const lastTermTotal = monthly.slice(-6, -3).reduce((s, m) => s + m.amount, 0);
    const termGrowth = lastTermTotal > 0 ? Math.round(((thisTermTotal - lastTermTotal) / lastTermTotal) * 100) : 0;

    const formColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6'];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Comparison Badge */}
            <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${termGrowth >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {termGrowth >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                    {termGrowth >= 0 ? 'Up' : 'Down'} {Math.abs(termGrowth)}% vs last term
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <FiTrendingUp size={14} /> This Term: {fmt(thisTermTotal)}
                </div>
            </div>

            {/* Monthly Line Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiTrendingUp className="text-indigo-500" /> Monthly Collections (12-Month Trend)</p>
                <div style={{ height: 280 }}>
                    <Line data={{
                        labels: monthly.map(m => m.month),
                        datasets: [
                            { label: 'This Year', data: monthly.map(m => m.amount), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1', borderWidth: 2.5 },
                            { label: 'Last Year', data: monthly.map(m => m.prevAmount), borderColor: '#d1d5db', backgroundColor: 'transparent', borderDash: [6, 4], tension: 0.4, pointRadius: 3, pointBackgroundColor: '#d1d5db', borderWidth: 1.5 },
                        ]
                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const, labels: { usePointStyle: true, padding: 20, font: { size: 11, weight: 'bold' } } } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } }, x: { grid: { display: false } } } }} />
                </div>
            </div>

            {/* Daily Collections Bar + Doughnut Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">📅 Daily Collections This Month</p>
                    <div style={{ height: 240 }}>
                        <Bar data={{ labels: dailyThisMonth.map(d => d.day), datasets: [{ label: 'KES', data: dailyThisMonth.map(d => d.amount), backgroundColor: '#8b5cf6', borderRadius: 4, barPercentage: 0.7 }] }}
                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>

                <div className="grid grid-rows-2 gap-5">
                    {/* Form-wise Doughnut */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🎓 Form-wise Revenue</p>
                        <div style={{ height: 140 }} className="flex items-center">
                            {formWise.some(f => f.collected > 0) ? (
                                <Doughnut data={{ labels: formWise.map(f => f.name), datasets: [{ data: formWise.map(f => f.collected), backgroundColor: formColors.slice(0, formWise.length), borderWidth: 0 }] }}
                                    options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right' as const, labels: { padding: 8, usePointStyle: true, font: { size: 10 } } } } }} />
                            ) : <p className="text-gray-400 text-xs w-full text-center">No data</p>}
                        </div>
                    </div>
                    {/* Payment Method */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💳 Payment Methods</p>
                        <div className="space-y-2 mt-1">
                            {Object.entries(methodBreak).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, v]) => {
                                const total = Object.values(methodBreak).reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                                return (
                                    <div key={m} className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-600 w-20 truncate">{m}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                                        <span className="text-xs font-bold text-gray-500 w-10 text-right">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

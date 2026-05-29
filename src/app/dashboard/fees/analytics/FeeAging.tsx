'use client';

import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiDownload, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { fmt } from '../useFeeData';

interface Props { payments: any[]; students: any[]; forms: any[]; getStudentFees: (id: number, fid?: number) => any; }

export default function FeeAging({ payments, students, forms, getStudentFees }: Props) {
    const [expandedBucket, setExpandedBucket] = useState<string | null>('90+');
    const active = useMemo(() => students.filter(s => s.status === 'Active'), [students]);

    const agingData = useMemo(() => {
        const now = new Date();
        const buckets = { 'Current (0-30)': [] as any[], '31-60 Days': [] as any[], '61-90 Days': [] as any[], '90+ Days': [] as any[] };
        active.forEach(st => {
            const fees = getStudentFees(st.id, st.form_id);
            if (fees.annualBalance <= 0) return;
            const stPayments = payments.filter(p => p.student_id === st.id);
            const lastPay = stPayments.length > 0 ? new Date(stPayments[0].payment_date) : null;
            // Days overdue: if they have a balance, calculate days since last expected payment or term start
            const daysSinceLastPay = lastPay ? Math.floor((now.getTime() - lastPay.getTime()) / 86400000) : 999;
            const daysOverdue = Math.max(0, daysSinceLastPay);
            const formName = forms.find(f => f.id === st.form_id)?.form_name || '-';
            const row = { id: st.id, name: `${st.first_name} ${st.last_name}`, admission: st.admission_number || '-', form: formName, amount: fees.annualBalance, daysOverdue, lastPayment: lastPay ? lastPay.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never' };
            if (daysOverdue <= 30) buckets['Current (0-30)'].push(row);
            else if (daysOverdue <= 60) buckets['31-60 Days'].push(row);
            else if (daysOverdue <= 90) buckets['61-90 Days'].push(row);
            else buckets['90+ Days'].push(row);
        });
        // Sort each bucket by amount desc
        Object.values(buckets).forEach(b => b.sort((a, b) => b.amount - a.amount));
        return buckets;
    }, [active, payments, forms, getStudentFees]);

    const bucketMeta = [
        { key: 'Current (0-30)', color: '#22c55e', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✅' },
        { key: '31-60 Days', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠️' },
        { key: '61-90 Days', color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🔶' },
        { key: '90+ Days', color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🔴' },
    ];

    const exportCsv = () => {
        const rows = [['Name', 'Admission', 'Form', 'Amount Owed', 'Days Overdue', 'Last Payment'].join(',')];
        Object.entries(agingData).forEach(([bucket, items]) => {
            items.forEach(r => rows.push([r.name, r.admission, r.form, r.amount, r.daysOverdue, r.lastPayment].join(',')));
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `fee_aging_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const chartData = {
        labels: bucketMeta.map(b => b.key),
        datasets: [{
            label: 'Total Amount',
            data: bucketMeta.map(b => agingData[b.key as keyof typeof agingData].reduce((s, r) => s + r.amount, 0)),
            backgroundColor: bucketMeta.map(b => b.color),
            borderRadius: 8,
            barPercentage: 0.6,
        }]
    };

    const selectedItems = expandedBucket ? agingData[expandedBucket as keyof typeof agingData] || [] : [];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Export Button */}
            <div className="flex justify-end">
                <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md">
                    <FiDownload size={13} /> Export CSV
                </button>
            </div>

            {/* Bucket Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {bucketMeta.map(b => {
                    const items = agingData[b.key as keyof typeof agingData];
                    const total = items.reduce((s, r) => s + r.amount, 0);
                    const isSelected = expandedBucket === b.key;
                    return (
                        <button key={b.key} onClick={() => setExpandedBucket(isSelected ? null : b.key)}
                            className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md ${isSelected ? `${b.bg} ${b.border} shadow-md ring-2 ring-offset-1` : 'bg-white border-gray-100'}`}
                            style={isSelected ? { outlineColor: b.color } : {}}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg">{b.icon}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}>{items.length} students</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{b.key}</p>
                            <p className={`text-lg font-extrabold mt-1 ${b.text}`}>{fmt(total)}</p>
                        </button>
                    );
                })}
            </div>

            {/* Stacked Bar Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiClock className="text-orange-500" /> Aging Distribution</p>
                <div style={{ height: 200 }}>
                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } }, x: { grid: { display: false } } } }} />
                </div>
            </div>

            {/* Student Table */}
            {expandedBucket && selectedItems.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                        <FiAlertTriangle className="text-amber-500" size={14} />
                        <p className="text-xs font-bold text-gray-700">{expandedBucket} — {selectedItems.length} students</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['Student Name', 'Admission', 'Form', 'Amount Owed', 'Days Overdue', 'Last Payment'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {selectedItems.slice(0, 50).map((r, i) => (
                                    <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-800">{r.name}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{r.admission}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600">{r.form}</td>
                                        <td className="px-4 py-2.5 text-xs font-bold text-red-600">{fmt(r.amount)}</td>
                                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.daysOverdue > 90 ? 'bg-red-100 text-red-700' : r.daysOverdue > 60 ? 'bg-orange-100 text-orange-700' : r.daysOverdue > 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.daysOverdue}d</span></td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{r.lastPayment}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

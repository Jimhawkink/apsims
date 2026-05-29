'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiPrinter, FiDownload, FiArrowLeft, FiRefreshCw,
    FiTrendingUp, FiTrendingDown, FiDollarSign, FiBarChart2,
    FiAlertTriangle, FiCheckCircle,
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);
const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

interface PLData {
    schoolName: string; termName: string; year: number;
    feeCollections: number; govGrants: number; donations: number; otherIncome: number;
    totalIncome: number;
    expenseByCategory: { name: string; icon: string; amount: number }[];
    totalExpenses: number;
    netPosition: number;
    totalExpected: number; collectionRate: number;
    activeStudents: number;
    terms: { id: number; term_name: string; term_number: number; year: number }[];
    termCashFlow: { termId: number; termName: string; expected: number; collected: number }[];
    formBreakdown: { form: string; students: number; expected: number; collected: number }[];
    agingBuckets: { label: string; days: string; count: number; amount: number }[];
}

export default function PLReportPage() {
    const [data, setData]     = useState<PLData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const currentYear = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                { data: school },
                { data: incomes },
                { data: expenses },
                { data: expCats },
                { data: payments },
                { data: structures },
                { data: students },
                { data: forms },
                { data: terms },
            ] = await Promise.all([
                supabase.from('school_details').select('school_name').limit(1).single(),
                supabase.from('school_income').select('*').eq('year', selectedYear),
                supabase.from('school_expenses').select('*').eq('year', selectedYear),
                supabase.from('school_expense_categories').select('*'),
                supabase.from('school_fee_payments').select('*'),
                supabase.from('school_fee_structures').select('*').eq('year', selectedYear),
                supabase.from('school_students').select('id,form_id,status'),
                supabase.from('school_forms').select('id,form_name'),
                supabase.from('school_terms').select('id,term_name,term_number,year,is_current').eq('year', selectedYear),
            ]);

            const formMap: Record<number, string> = {};
            (forms || []).forEach((f: any) => { formMap[f.id] = f.form_name; });

            const activeStudents = (students || []).filter((s: any) => s.status === 'Active');

            // Income breakdown
            const feeCollections = (payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const govGrants  = (incomes || []).filter((i: any) => ['Government Grants', 'CDF'].includes(i.source)).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const donations  = (incomes || []).filter((i: any) => i.source === 'Donations').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const otherIncome = (incomes || []).filter((i: any) => !['Government Grants', 'CDF', 'Donations', 'Fees'].includes(i.source)).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
            const totalIncome = feeCollections + govGrants + donations + otherIncome;

            // Expense by category
            const expenseByCategory = (expCats || []).map((c: any) => ({
                name: c.category_name, icon: c.icon || '💰',
                amount: (expenses || []).filter((e: any) => e.category_id === c.id && (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
            })).filter((c: any) => c.amount > 0).sort((a: any, b: any) => b.amount - a.amount);
            const totalExpenses = expenseByCategory.reduce((s, e) => s + e.amount, 0);
            const netPosition = totalIncome - totalExpenses;

            // Fee expected vs actual
            const totalExpected = activeStudents.reduce((s: number, st: any) => {
                const feeItems = (structures || []).filter((f: any) => !f.form_id || f.form_id === st.form_id);
                return s + feeItems.reduce((fs: number, f: any) => fs + Number(f.amount || 0), 0);
            }, 0);
            const collectionRate = totalExpected > 0 ? Math.round((feeCollections / totalExpected) * 100) : 0;

            // Term cash flow
            const termCashFlow = (terms || []).map((t: any) => {
                const termExpected = activeStudents.reduce((s: number, st: any) => {
                    const feeItems = (structures || []).filter((f: any) => (!f.form_id || f.form_id === st.form_id) && f.term_id === t.id);
                    return s + feeItems.reduce((fs: number, f: any) => fs + Number(f.amount || 0), 0);
                }, 0);
                const termCollected = (payments || []).filter((p: any) => p.term_id === t.id).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                return { termId: t.id, termName: t.term_name, expected: termExpected, collected: termCollected };
            });

            // Form breakdown
            const formBreakdown = (forms || []).map((f: any) => {
                const formStudents = activeStudents.filter((s: any) => s.form_id === f.id);
                const expected = formStudents.reduce((s: number, st: any) => {
                    return s + (structures || []).filter((fs: any) => !fs.form_id || fs.form_id === f.id).reduce((fs: number, fee: any) => fs + Number(fee.amount || 0), 0);
                }, 0);
                const collected = formStudents.reduce((s: number, st: any) => {
                    return s + (payments || []).filter((p: any) => p.student_id === st.id).reduce((ps: number, p: any) => ps + Number(p.amount || 0), 0);
                }, 0);
                return { form: f.form_name, students: formStudents.length, expected, collected };
            }).filter((f: any) => f.students > 0);

            // Aging buckets (fee outstanding)
            const today = new Date();
            const termsSorted = [...(terms || [])].sort((a: any, b: any) => a.id - b.id);
            const agingBuckets = [
                { label: 'Current (0–30 days)', days: '0-30', count: 0, amount: 0 },
                { label: '31–60 Days Overdue', days: '31-60', count: 0, amount: 0 },
                { label: '61–90 Days Overdue', days: '61-90', count: 0, amount: 0 },
                { label: '91–120 Days Overdue', days: '91-120', count: 0, amount: 0 },
                { label: 'Over 120 Days (Critical)', days: '120+', count: 0, amount: 0 },
            ];
            activeStudents.forEach((st: any) => {
                const totalPaid = (payments || []).filter((p: any) => p.student_id === st.id).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const feeItems = (structures || []).filter((f: any) => !f.form_id || f.form_id === st.form_id);
                const totalDue = feeItems.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                const balance = Math.max(0, totalDue - totalPaid);
                if (balance <= 0) return;
                // Use earliest unpaid term as reference
                const lastPayment = (payments || []).filter((p: any) => p.student_id === st.id).sort((a: any, b: any) => b.payment_date?.localeCompare(a.payment_date))[0];
                const refDate = lastPayment?.payment_date ? new Date(lastPayment.payment_date) : new Date(today.getFullYear(), 0, 1);
                const daysDue = Math.floor((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
                let bucketIdx = daysDue <= 30 ? 0 : daysDue <= 60 ? 1 : daysDue <= 90 ? 2 : daysDue <= 120 ? 3 : 4;
                agingBuckets[bucketIdx].count++;
                agingBuckets[bucketIdx].amount += balance;
            });

            setData({
                schoolName: school?.school_name || 'School',
                termName: 'Full Year', year: selectedYear,
                feeCollections, govGrants, donations, otherIncome, totalIncome,
                expenseByCategory, totalExpenses, netPosition,
                totalExpected, collectionRate, activeStudents: activeStudents.length,
                terms: terms || [], termCashFlow, formBreakdown, agingBuckets,
            });
        } catch (err: any) {
            toast.error(`Failed to load: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const exportCSV = () => {
        if (!data) return;
        const lines = [
            `"${data.schoolName} — Financial P&L Report ${data.year}"`,
            `"Generated: ${new Date().toLocaleDateString('en-KE')}"`,
            '',
            '"INCOME"',
            `"Fee Collections","${fmt(data.feeCollections)}"`,
            `"Government Grants","${fmt(data.govGrants)}"`,
            `"Donations","${fmt(data.donations)}"`,
            `"Other Income","${fmt(data.otherIncome)}"`,
            `"TOTAL INCOME","${fmt(data.totalIncome)}"`,
            '',
            '"EXPENSES"',
            ...data.expenseByCategory.map(e => `"${e.name}","${fmt(e.amount)}"`),
            `"TOTAL EXPENSES","${fmt(data.totalExpenses)}"`,
            '',
            `"NET POSITION","${fmt(data.netPosition)}"`,
        ];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
        a.download = `${data.schoolName.replace(/\s+/g, '_')}_PL_Report_${data.year}.csv`;
        a.click();
        toast.success('📊 P&L exported!');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)' }}>📊</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Generating Financial Report…</p>
        </div>
    );

    if (!data) return null;
    const netPositive = data.netPosition >= 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ═══ HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/fees" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><FiArrowLeft size={18} /></Link>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                                <FiBarChart2 className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white">📊 Financial P&amp;L Report</h1>
                                <p className="text-white/50 text-xs mt-0.5">{data.schoolName} · Profit &amp; Loss Statement</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-bold focus:outline-none">
                                {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y} className="text-gray-800">{y}</option>)}
                            </select>
                            <button onClick={fetchData} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><FiRefreshCw size={15} /></button>
                            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"><FiDownload size={14} />Export</button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-black text-white transition" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                                <FiPrinter size={14} />Print
                            </button>
                        </div>
                    </div>
                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Revenue', value: fmt(data.totalIncome), emoji: '💰', color: '#10b981' },
                            { label: 'Total Expenses', value: fmt(data.totalExpenses), emoji: '📉', color: '#ef4444' },
                            { label: 'Net Position', value: fmt(data.netPosition), emoji: netPositive ? '📈' : '📉', color: netPositive ? '#10b981' : '#ef4444', pulse: !netPositive },
                            { label: 'Collection Rate', value: `${data.collectionRate}%`, emoji: '🎯', color: data.collectionRate >= 70 ? '#10b981' : data.collectionRate >= 50 ? '#f59e0b' : '#ef4444' },
                        ].map((c, i) => (
                            <div key={i} className={`relative rounded-xl p-4 overflow-hidden ${c.pulse ? 'ring-1 ring-red-400/40' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{c.emoji}</span>
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{c.label}</span>
                                </div>
                                <p className="text-lg font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Net position alert */}
            <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${netPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                {netPositive ? <FiCheckCircle className="text-emerald-600 flex-shrink-0" size={20} /> : <FiAlertTriangle className="text-red-600 flex-shrink-0" size={20} />}
                <div>
                    <p className={`font-bold text-sm ${netPositive ? 'text-emerald-800' : 'text-red-800'}`}>
                        {netPositive ? `✅ Surplus of ${fmt(data.netPosition)} for ${data.year}` : `⚠️ Deficit of ${fmt(Math.abs(data.netPosition))} for ${data.year}`}
                    </p>
                    <p className={`text-xs mt-0.5 ${netPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        Total income {fmt(data.totalIncome)} minus total expenses {fmt(data.totalExpenses)} = net {fmt(data.netPosition)}
                    </p>
                </div>
            </div>

            {/* ═══ P&L STATEMENT ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none">
                <div className="px-6 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
                    <div className="text-center">
                        <h2 className="text-lg font-black text-gray-900">{data.schoolName}</h2>
                        <p className="text-sm font-bold text-gray-600">PROFIT &amp; LOSS STATEMENT — FINANCIAL YEAR {data.year}</p>
                        <p className="text-xs text-gray-500">Generated: {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="p-6">
                    <table className="w-full">
                        <tbody>
                            {/* INCOME Section */}
                            <tr><td colSpan={3} className="py-3"><p className="text-[10px] font-black text-blue-700 uppercase tracking-widest border-b-2 border-blue-200 pb-1">INCOME</p></td></tr>
                            {[
                                { label: 'Fee Collections (Student Payments)', amount: data.feeCollections, sub: `${data.activeStudents} active students · ${data.collectionRate}% collection rate` },
                                { label: 'Government Grants (FDSE, NG-CDF, Capitation)', amount: data.govGrants, sub: 'Government disbursements' },
                                { label: 'Donations & Fundraising', amount: data.donations, sub: 'Alumni, NGO & individual donors' },
                                { label: 'Other Income', amount: data.otherIncome, sub: 'Rent, sports, projects, etc.' },
                            ].map((item, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                    <td className="py-3 pl-4 w-8 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="py-3">
                                        <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                                    </td>
                                    <td className="py-3 text-right font-bold text-emerald-700 text-sm whitespace-nowrap">{fmt(item.amount)}</td>
                                </tr>
                            ))}
                            <tr className="bg-emerald-50 border-y-2 border-emerald-300">
                                <td className="py-3 pl-4" />
                                <td className="py-3 font-black text-emerald-800">TOTAL INCOME</td>
                                <td className="py-3 text-right font-black text-emerald-700 text-base">{fmt(data.totalIncome)}</td>
                            </tr>

                            {/* Spacer */}
                            <tr><td colSpan={3} className="py-2" /></tr>

                            {/* EXPENSES Section */}
                            <tr><td colSpan={3} className="py-3"><p className="text-[10px] font-black text-red-700 uppercase tracking-widest border-b-2 border-red-200 pb-1">EXPENSES</p></td></tr>
                            {data.expenseByCategory.map((cat, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-red-50/20 transition-colors">
                                    <td className="py-3 pl-4 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="py-3 font-semibold text-gray-800 flex items-center gap-2">
                                        <span>{cat.icon}</span>{cat.name}
                                    </td>
                                    <td className="py-3 text-right font-bold text-red-600 text-sm whitespace-nowrap">{fmt(cat.amount)}</td>
                                </tr>
                            ))}
                            {data.expenseByCategory.length === 0 && (
                                <tr><td colSpan={3} className="py-4 text-center text-gray-400 text-sm">No approved expenses recorded for {data.year}</td></tr>
                            )}
                            <tr className="bg-red-50 border-y-2 border-red-300">
                                <td className="py-3 pl-4" />
                                <td className="py-3 font-black text-red-800">TOTAL EXPENSES</td>
                                <td className="py-3 text-right font-black text-red-700 text-base">{fmt(data.totalExpenses)}</td>
                            </tr>

                            {/* Spacer */}
                            <tr><td colSpan={3} className="py-2" /></tr>

                            {/* NET */}
                            <tr className={`border-4 ${netPositive ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                                <td className="py-4 pl-4" />
                                <td className="py-4 font-black text-lg" style={{ color: netPositive ? '#065f46' : '#991b1b' }}>
                                    {netPositive ? '✅ NET SURPLUS' : '⚠️ NET DEFICIT'}
                                </td>
                                <td className="py-4 text-right font-black text-2xl whitespace-nowrap" style={{ color: netPositive ? '#059669' : '#dc2626' }}>
                                    {netPositive ? '' : '('}{fmt(Math.abs(data.netPosition))}{!netPositive ? ')' : ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {/* Signature line */}
                <div className="px-6 pb-6 pt-2 grid grid-cols-3 gap-8 print:block">
                    {['Prepared By: Bursar', 'Reviewed By: Deputy Principal', 'Approved By: Principal'].map(s => (
                        <div key={s} className="pt-4 border-t-2 border-gray-400">
                            <p className="text-xs text-gray-500">{s}</p>
                            <p className="text-[10px] text-gray-300 mt-6">Signature &amp; Date</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ CHARTS ROW ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Expense breakdown bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Expense Breakdown by Category</p>
                    {data.expenseByCategory.length > 0 ? (
                        <div style={{ height: 250 }}>
                            <Bar data={{
                                labels: data.expenseByCategory.map(c => c.name),
                                datasets: [{ label: 'KES', data: data.expenseByCategory.map(c => c.amount), backgroundColor: ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#8b5cf6'], borderRadius: 6 }]
                            }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}k` } }, x: { grid: { display: false }, ticks: { maxRotation: 45 } } } }} />
                        </div>
                    ) : <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No expense data</div>}
                </div>

                {/* Term cash flow */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Term Cash Flow — Expected vs Collected</p>
                    {data.termCashFlow.length > 0 ? (
                        <div style={{ height: 250 }}>
                            <Bar data={{
                                labels: data.termCashFlow.map(t => t.termName),
                                datasets: [
                                    { label: 'Expected', data: data.termCashFlow.map(t => t.expected), backgroundColor: '#bfdbfe', borderRadius: 4 },
                                    { label: 'Collected', data: data.termCashFlow.map(t => t.collected), backgroundColor: '#3b82f6', borderRadius: 4 },
                                ]
                            }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}k` } }, x: { grid: { display: false } } } }} />
                        </div>
                    ) : <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No term data</div>}
                </div>
            </div>

            {/* ═══ FORM BREAKDOWN ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Form-wise Fee Collection Summary</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['Form', 'Students', 'Expected (KES)', 'Collected (KES)', 'Outstanding (KES)', 'Rate', 'Progress'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {data.formBreakdown.map((f, i) => {
                                const rate = pct(f.collected, f.expected);
                                const outstanding = Math.max(0, f.expected - f.collected);
                                return (
                                    <tr key={f.form} className={`border-b border-gray-50 hover:bg-blue-50/20 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                        <td className="px-4 py-3 font-black text-gray-800">{f.form}</td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-700">{f.students}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-700">{fmt(f.expected)}</td>
                                        <td className="px-4 py-3 font-black text-emerald-700">{fmt(f.collected)}</td>
                                        <td className="px-4 py-3 font-black text-red-600">{fmt(outstanding)}</td>
                                        <td className="px-4 py-3 font-black text-sm" style={{ color: rate >= 70 ? '#059669' : rate >= 50 ? '#d97706' : '#dc2626' }}>{rate}%</td>
                                        <td className="px-4 py-3 w-40">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-3">
                                                    <div className="h-3 rounded-full" style={{ width: `${Math.min(100, rate)}%`, background: rate >= 70 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot><tr className="bg-blue-50 border-t-2 border-blue-300">
                            <td className="px-4 py-3 font-black text-blue-800">TOTALS</td>
                            <td className="px-4 py-3 text-center font-black text-blue-700">{data.activeStudents}</td>
                            <td className="px-4 py-3 font-black text-gray-700">{fmt(data.formBreakdown.reduce((s, f) => s + f.expected, 0))}</td>
                            <td className="px-4 py-3 font-black text-emerald-700">{fmt(data.feeCollections)}</td>
                            <td className="px-4 py-3 font-black text-red-600">{fmt(Math.max(0, data.totalExpected - data.feeCollections))}</td>
                            <td className="px-4 py-3 font-black text-blue-700">{data.collectionRate}%</td>
                            <td />
                        </tr></tfoot>
                    </table>
                </div>
            </div>

            {/* ═══ AGING ANALYSIS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📅 Accounts Receivable Aging Analysis</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['Aging Bucket', 'Student Count', 'Outstanding Amount', '% of Total Outstanding', 'Risk Level'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {data.agingBuckets.map((b, i) => {
                                const totalOut = data.agingBuckets.reduce((s, b) => s + b.amount, 0);
                                const share = pct(b.amount, totalOut);
                                const riskColors = ['text-emerald-700 bg-emerald-50', 'text-yellow-700 bg-yellow-50', 'text-orange-700 bg-orange-50', 'text-red-700 bg-red-50', 'text-red-900 bg-red-100'];
                                const riskLabels = ['Low', 'Medium', 'High', 'Critical', 'Write-off Risk'];
                                return (
                                    <tr key={b.label} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-orange-50/20`}>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{b.label}</td>
                                        <td className="px-4 py-3 text-center font-bold text-gray-700">{b.count}</td>
                                        <td className="px-4 py-3 font-black text-red-600">{fmt(b.amount)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-100 rounded-full h-2.5">
                                                    <div className="h-2.5 rounded-full" style={{ width: `${share}%`, background: ['#22c55e','#f59e0b','#f97316','#ef4444','#991b1b'][i] }} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">{share}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${riskColors[i]} border-current`}>{riskLabels[i]}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    nav, aside, .no-print { display: none !important; }
                    body { font-size: 12px; }
                    .animate-fade-in { animation: none !important; }
                }
            `}</style>
        </div>
    );
}

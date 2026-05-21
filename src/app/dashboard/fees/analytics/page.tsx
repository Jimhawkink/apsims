'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
    LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    FiTrendingUp, FiBarChart2, FiAlertTriangle, FiFileText, FiRefreshCw,
    FiDownload, FiUsers, FiDollarSign, FiClock, FiShield, FiActivity,
    FiPieChart, FiCalendar, FiPrinter, FiArrowUp, FiArrowDown
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;

type Tab = 'trends' | 'aging' | 'risk' | 'board';

export default function FinancialAnalyticsPage() {
    const [tab, setTab] = useState<Tab>('trends');
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, p, fs, f, t] = await Promise.all([
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, stream_id, guardian_name, guardian_phone, status').eq('status', 'Active'),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setStudents(s.data || []);
        setPayments(p.data || []);
        setStructures(fs.data || []);
        setForms(f.data || []);
        setTerms(t.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const currentTerm = terms.find(t => t.is_current);

    // ── Student fee calculations ──
    const getStudentFees = (studentId: number, formId: number) => {
        const fs = structures.filter(s => s.form_id === formId);
        const total = fs.reduce((s, f) => s + Number(f.amount || f.tuition || 0), 0);
        const paid = payments.filter(p => p.student_id === studentId).reduce((s, p) => s + Number(p.amount || 0), 0);
        return { total, paid, balance: Math.max(0, total - paid) };
    };

    // ── KPI calculations ──
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalExpected = students.reduce((s, st) => s + getStudentFees(st.id, st.form_id).total, 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // Revenue this term
    const termPayments = currentTerm ? payments.filter(p => p.term_id === currentTerm.id) : payments;
    const termRevenue = termPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Average days to pay (from term start to payment)
    const avgDaysToPay = useMemo(() => {
        if (!currentTerm || termPayments.length === 0) return 0;
        const termStart = new Date(currentTerm.start_date || currentTerm.created_at);
        const totalDays = termPayments.reduce((s, p) => {
            const pd = new Date(p.payment_date || p.created_at);
            const diff = Math.max(0, Math.floor((pd.getTime() - termStart.getTime()) / 86400000));
            return s + diff;
        }, 0);
        return Math.round(totalDays / termPayments.length);
    }, [currentTerm, termPayments]);

    // Defaulters
    const defaulters = useMemo(() => students.filter(s => getStudentFees(s.id, s.form_id).balance > 0), [students, structures, payments]);

    // ── Monthly trends (last 12 months) ──
    const monthlyTrends = useMemo(() => {
        const data: { month: string; amount: number; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const m = d.getMonth(), y = d.getFullYear();
            const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
            const monthPayments = payments.filter(p => { const pd = new Date(p.payment_date || p.created_at); return pd.getMonth() === m && pd.getFullYear() === y; });
            data.push({ month: label, amount: monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0), count: monthPayments.length });
        }
        return data;
    }, [payments]);

    // ── Form-wise breakdown ──
    const formBreakdown = useMemo(() => forms.map(form => {
        const fStudents = students.filter(s => s.form_id === form.id);
        const collected = fStudents.reduce((s, st) => s + payments.filter(p => p.student_id === st.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
        const expected = fStudents.reduce((s, st) => s + getStudentFees(st.id, st.form_id).total, 0);
        return { name: form.form_name, collected, expected, balance: Math.max(0, expected - collected), students: fStudents.length };
    }), [forms, students, payments, structures]);

    // ── Payment methods ──
    const methodBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        payments.forEach(p => { const m = (p.payment_method || 'Cash').replace(/\s*\(.+\)/, ''); map[m] = (map[m] || 0) + Number(p.amount || 0); });
        return map;
    }, [payments]);

    // ── Fee Aging Buckets ──
    const agingData = useMemo(() => {
        const buckets = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], days90plus: [] as any[] };
        const now = new Date();
        students.forEach(st => {
            const { balance } = getStudentFees(st.id, st.form_id);
            if (balance <= 0) return;
            const lastPayment = payments.filter(p => p.student_id === st.id).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
            const lastDate = lastPayment ? new Date(lastPayment.payment_date) : (currentTerm ? new Date(currentTerm.start_date || currentTerm.created_at) : new Date());
            const daysOverdue = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
            const entry = { ...st, balance, daysOverdue, lastPaymentDate: lastPayment?.payment_date };
            if (daysOverdue <= 30) buckets.current.push(entry);
            else if (daysOverdue <= 60) buckets.days30.push(entry);
            else if (daysOverdue <= 90) buckets.days60.push(entry);
            else if (daysOverdue <= 120) buckets.days90.push(entry);
            else buckets.days90plus.push(entry);
        });
        return buckets;
    }, [students, payments, structures, currentTerm]);

    // ── Risk Scoring ──
    const riskScores = useMemo(() => {
        return students.map(st => {
            const { balance, total, paid } = getStudentFees(st.id, st.form_id);
            if (balance <= 0) return null;
            const studentPayments = payments.filter(p => p.student_id === st.id);
            const paymentCount = studentPayments.length;
            const lastPayment = studentPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
            const daysSinceLastPayment = lastPayment ? Math.floor((Date.now() - new Date(lastPayment.payment_date).getTime()) / 86400000) : 999;
            const paidRatio = total > 0 ? paid / total : 0;
            // Risk = 100 - (payment_consistency * 40 + recency * 30 + amount_factor * 30)
            const consistencyScore = Math.min(1, paymentCount / 3) * 40;
            const recencyScore = Math.max(0, 1 - daysSinceLastPayment / 120) * 30;
            const amountScore = paidRatio * 30;
            const riskScore = Math.round(100 - (consistencyScore + recencyScore + amountScore));
            const level = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
            return { ...st, balance, riskScore, level, daysSinceLastPayment, paymentCount, paidRatio: Math.round(paidRatio * 100) };
        }).filter(Boolean).sort((a: any, b: any) => b.riskScore - a.riskScore) as any[];
    }, [students, payments, structures]);

    const riskCounts = useMemo(() => ({
        high: riskScores.filter(r => r.level === 'High').length,
        medium: riskScores.filter(r => r.level === 'Medium').length,
        low: riskScores.filter(r => r.level === 'Low').length,
    }), [riskScores]);

    // ── Export CSV ──
    const exportCSV = (data: any[], filename: string) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]);
        const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
        toast.success('Exported ✅');
    };

    const tabConfig = [
        { k: 'trends', l: '📈 Revenue Trends', icon: FiTrendingUp },
        { k: 'aging', l: '⏰ Fee Aging', icon: FiClock },
        { k: 'risk', l: '🛡️ Risk Scoring', icon: FiShield },
        { k: 'board', l: '📋 Board Report', icon: FiFileText },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📊</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Financial Intelligence…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #0c0a2a 0%, #1e1b4b 40%, #312e81 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiBarChart2 className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                📊 Financial Intelligence
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm">AI-POWERED</span>
                            </h1>
                            <p className="text-indigo-300 text-xs mt-0.5 font-medium">Revenue Analytics • Fee Aging • Defaulter Risk Scoring • Board Reports</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiPrinter size={13} /> Print
                        </button>
                        <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Collection Rate', value: `${collectionRate}%`, emoji: '📈', color: collectionRate >= 70 ? '#22c55e' : '#ef4444' },
                            { label: 'Term Revenue', value: fmt(termRevenue), emoji: '💰', color: '#6366f1' },
                            { label: 'Total Outstanding', value: fmt(Math.max(0, totalExpected - totalCollected)), emoji: '⚠️', color: '#ef4444', pulse: true },
                            { label: 'High Risk', value: String(riskCounts.high), emoji: '🔴', color: '#dc2626', pulse: riskCounts.high > 0 },
                            { label: 'Avg Days to Pay', value: `${avgDaysToPay}d`, emoji: '⏱️', color: '#f59e0b' },
                            { label: 'Active Students', value: String(students.length), emoji: '🎓', color: '#0891b2' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: card.color, transform: 'translate(30%, -30%)' }} />
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all relative overflow-hidden"
                            style={isActive ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {isActive && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.4), transparent 60%)' }} />}
                            <Icon size={15} />
                            <span className="relative">{t.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══ REVENUE TRENDS TAB ═══ */}
            {tab === 'trends' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiTrendingUp className="text-indigo-500" /> 12-Month Collection Trend</p>
                            <div style={{ height: 280 }}>
                                <Line data={{ labels: monthlyTrends.map(m => m.month), datasets: [{ label: 'Collections', data: monthlyTrends.map(m => m.amount), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1', borderWidth: 2.5 }] }}
                                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiPieChart className="text-green-500" /> Payment Methods</p>
                            <div style={{ height: 280 }}>
                                {Object.keys(methodBreakdown).length > 0 ? (
                                    <Doughnut data={{ labels: Object.keys(methodBreakdown), datasets: [{ data: Object.values(methodBreakdown), backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'], borderWidth: 0 }] }}
                                        options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 11 } } } } }} />
                                ) : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                            </div>
                        </div>
                    </div>

                    {/* Form-wise collection */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiUsers className="text-purple-500" /> Form-wise Revenue</p>
                            <button onClick={() => exportCSV(formBreakdown, 'form_revenue.csv')} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"><FiDownload size={12} /> Export</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    {['Form', 'Students', 'Expected', 'Collected', 'Balance', 'Rate'].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {formBreakdown.map(f => {
                                        const pct = f.expected > 0 ? Math.round((f.collected / f.expected) * 100) : 0;
                                        return (
                                            <tr key={f.name} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-bold text-gray-800">{f.name}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-indigo-600">{f.students}</td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-600">{fmt(f.expected)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(f.collected)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(f.balance)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }} /></div>
                                                        <span className="text-xs font-bold text-gray-600 w-10 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ FEE AGING TAB ═══ */}
            {tab === 'aging' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[
                            { label: 'Current (0-30d)', count: agingData.current.length, amount: agingData.current.reduce((s, d) => s + d.balance, 0), color: '#22c55e', bg: '#f0fdf4' },
                            { label: '31-60 Days', count: agingData.days30.length, amount: agingData.days30.reduce((s, d) => s + d.balance, 0), color: '#f59e0b', bg: '#fffbeb' },
                            { label: '61-90 Days', count: agingData.days60.length, amount: agingData.days60.reduce((s, d) => s + d.balance, 0), color: '#f97316', bg: '#fff7ed' },
                            { label: '91-120 Days', count: agingData.days90.length, amount: agingData.days90.reduce((s, d) => s + d.balance, 0), color: '#ef4444', bg: '#fef2f2' },
                            { label: '120+ Days', count: agingData.days90plus.length, amount: agingData.days90plus.reduce((s, d) => s + d.balance, 0), color: '#991b1b', bg: '#fef2f2' },
                        ].map((b, i) => (
                            <div key={i} className="rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md" style={{ background: b.bg, borderColor: b.color + '30', borderLeftWidth: 4, borderLeftColor: b.color }}>
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{b.label}</p>
                                <p className="text-2xl font-black mt-1" style={{ color: b.color }}>{b.count}</p>
                                <p className="text-xs font-semibold text-gray-500 mt-1">{fmt(b.amount)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Aging Chart */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Aging Distribution</p>
                        <div style={{ height: 200 }}>
                            <Bar data={{
                                labels: ['0-30d', '31-60d', '61-90d', '91-120d', '120+d'],
                                datasets: [{
                                    label: 'Amount', data: [
                                        agingData.current.reduce((s, d) => s + d.balance, 0),
                                        agingData.days30.reduce((s, d) => s + d.balance, 0),
                                        agingData.days60.reduce((s, d) => s + d.balance, 0),
                                        agingData.days90.reduce((s, d) => s + d.balance, 0),
                                        agingData.days90plus.reduce((s, d) => s + d.balance, 0),
                                    ], backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#991b1b'], borderRadius: 8
                                }]
                            }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                        </div>
                    </div>

                    {/* Aging Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overdue Students ({[...agingData.days30, ...agingData.days60, ...agingData.days90, ...agingData.days90plus].length})</p>
                            <button onClick={() => exportCSV([...agingData.days30, ...agingData.days60, ...agingData.days90, ...agingData.days90plus].map(d => ({ Name: `${d.first_name} ${d.last_name}`, Admission: d.admission_number || d.admission_no, Balance: d.balance, Days_Overdue: d.daysOverdue, Last_Payment: d.lastPaymentDate || 'Never' })), 'fee_aging.csv')}
                                className="text-xs text-indigo-600 font-semibold flex items-center gap-1"><FiDownload size={12} /> Export</button>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                    {['Student', 'Adm No', 'Balance', 'Days Overdue', 'Last Payment', 'Risk'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {[...agingData.days30, ...agingData.days60, ...agingData.days90, ...agingData.days90plus].sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 50).map((d, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2.5 font-semibold text-gray-800 text-sm">{d.first_name} {d.last_name}</td>
                                            <td className="px-4 py-2.5 text-xs font-mono text-blue-600">{d.admission_number || d.admission_no || '-'}</td>
                                            <td className="px-4 py-2.5 text-sm font-bold text-red-600">{fmt(d.balance)}</td>
                                            <td className="px-4 py-2.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.daysOverdue > 90 ? 'bg-red-100 text-red-700' : d.daysOverdue > 60 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{d.daysOverdue}d</span></td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{d.lastPaymentDate ? new Date(d.lastPaymentDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : 'Never'}</td>
                                            <td className="px-4 py-2.5"><span className={`w-2.5 h-2.5 rounded-full inline-block ${d.daysOverdue > 90 ? 'bg-red-500' : d.daysOverdue > 60 ? 'bg-orange-500' : 'bg-amber-500'}`} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ RISK SCORING TAB ═══ */}
            {tab === 'risk' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'High Risk (70-100)', count: riskCounts.high, color: '#dc2626', bg: '#fef2f2', icon: '🔴', action: 'Immediate follow-up needed' },
                            { label: 'Medium Risk (40-69)', count: riskCounts.medium, color: '#f59e0b', bg: '#fffbeb', icon: '🟡', action: 'Schedule reminder' },
                            { label: 'Low Risk (0-39)', count: riskCounts.low, color: '#22c55e', bg: '#f0fdf4', icon: '🟢', action: 'Monitor only' },
                        ].map((r, i) => (
                            <div key={i} className="rounded-2xl p-5 border shadow-sm" style={{ background: r.bg, borderColor: r.color + '30' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{r.icon}</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{r.label}</span>
                                </div>
                                <p className="text-3xl font-black" style={{ color: r.color }}>{r.count}</p>
                                <p className="text-[10px] text-gray-500 mt-1 font-semibold">{r.action}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🛡️ Defaulter Risk Assessment ({riskScores.length} students)</p>
                            <button onClick={() => exportCSV(riskScores.map(r => ({ Name: `${r.first_name} ${r.last_name}`, Risk_Score: r.riskScore, Level: r.level, Balance: r.balance, Days_Since_Payment: r.daysSinceLastPayment, Payment_Count: r.paymentCount, Paid_Pct: r.paidRatio })), 'risk_scores.csv')}
                                className="text-xs text-indigo-600 font-semibold flex items-center gap-1"><FiDownload size={12} /> Export</button>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                    {['Student', 'Risk Score', 'Level', 'Balance', 'Last Payment', 'Payments', 'Paid %', 'Action'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {riskScores.slice(0, 60).map((r, i) => (
                                        <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${r.level === 'High' ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 font-semibold text-sm text-gray-800">{r.first_name} {r.last_name}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${r.riskScore}%`, background: r.level === 'High' ? '#dc2626' : r.level === 'Medium' ? '#f59e0b' : '#22c55e' }} /></div>
                                                    <span className="text-xs font-black" style={{ color: r.level === 'High' ? '#dc2626' : r.level === 'Medium' ? '#f59e0b' : '#22c55e' }}>{r.riskScore}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.level === 'High' ? 'bg-red-100 text-red-700' : r.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.level}</span></td>
                                            <td className="px-3 py-2.5 font-bold text-red-600 text-sm">{fmt(r.balance)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{r.daysSinceLastPayment < 999 ? `${r.daysSinceLastPayment}d ago` : 'Never'}</td>
                                            <td className="px-3 py-2.5 text-center text-xs font-bold text-indigo-600">{r.paymentCount}</td>
                                            <td className="px-3 py-2.5"><span className={`text-xs font-bold ${r.paidRatio >= 70 ? 'text-green-600' : r.paidRatio >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{r.paidRatio}%</span></td>
                                            <td className="px-3 py-2.5 text-[10px] font-semibold text-gray-500">{r.level === 'High' ? '📞 Call now' : r.level === 'Medium' ? '📱 Send SMS' : '👁️ Monitor'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ BOARD REPORT TAB ═══ */}
            {tab === 'board' && (
                <div className="space-y-5 print-area">
                    <div className="flex items-center justify-between no-print">
                        <p className="text-sm font-bold text-gray-700">📋 Board Financial Report Preview</p>
                        <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}><FiPrinter size={13} /> Print Board Report</button>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-8 shadow-lg" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                        <div className="text-center border-b-2 border-indigo-700 pb-4 mb-6">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wider">Financial Status Report</h2>
                            <p className="text-sm text-gray-500 mt-1">{currentTerm?.term_name || 'Current Term'} — Generated {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="border border-gray-200 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Revenue Summary</h3>
                                <div className="space-y-2">
                                    {[
                                        ['Total Expected', fmt(totalExpected)],
                                        ['Total Collected', fmt(totalCollected)],
                                        ['Outstanding', fmt(Math.max(0, totalExpected - totalCollected))],
                                        ['Collection Rate', `${collectionRate}%`],
                                    ].map(([l, v]) => (
                                        <div key={l} className="flex justify-between text-sm"><span className="text-gray-600">{l}</span><span className="font-bold text-gray-900">{v}</span></div>
                                    ))}
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Risk Distribution</h3>
                                <div className="space-y-2">
                                    {[
                                        ['High Risk Students', `${riskCounts.high}`, '#dc2626'],
                                        ['Medium Risk Students', `${riskCounts.medium}`, '#f59e0b'],
                                        ['Low Risk Students', `${riskCounts.low}`, '#22c55e'],
                                        ['Total Defaulters', `${defaulters.length}`, '#6366f1'],
                                    ].map(([l, v, c]) => (
                                        <div key={l} className="flex justify-between text-sm items-center"><span className="text-gray-600">{l}</span><span className="font-bold" style={{ color: c as string }}>{v}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Form-wise Performance</h3>
                        <table className="w-full border-collapse border border-gray-300 mb-6">
                            <thead><tr className="bg-gray-100">
                                {['Form', 'Students', 'Expected', 'Collected', 'Balance', 'Rate'].map(h => (
                                    <th key={h} className="border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {formBreakdown.map(f => (
                                    <tr key={f.name}>
                                        <td className="border border-gray-300 px-3 py-2 font-bold text-sm">{f.name}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center text-sm">{f.students}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-sm">{fmt(f.expected)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-sm font-bold text-green-700">{fmt(f.collected)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-sm font-bold text-red-700">{fmt(f.balance)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold">{f.expected > 0 ? Math.round((f.collected / f.expected) * 100) : 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="text-center text-xs text-gray-400 mt-8 pt-4 border-t">
                            Report generated by APSIMS Ultra Financial Intelligence • {new Date().toLocaleString('en-KE')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

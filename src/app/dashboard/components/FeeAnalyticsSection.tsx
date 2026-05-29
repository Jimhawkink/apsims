'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Line } from 'react-chartjs-2';
import { FiDownload, FiFilter, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiBarChart2, FiList } from 'react-icons/fi';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

// CBC colour map
const GRADE_COLORS: Record<string, string> = {
    'Grade 10': '#6366f1', 'Grade 11': '#8b5cf6', 'Grade 12': '#a855f7',
    'Form 1': '#3b82f6',  'Form 2':  '#0ea5e9',  'Form 3':  '#06b6d4', 'Form 4': '#14b8a6',
};
const getColor = (name: string) => {
    const key = Object.keys(GRADE_COLORS).find(k => name?.includes(k.split(' ')[1]));
    return key ? GRADE_COLORS[key] : '#6366f1';
};

type ViewMode = 'chart' | 'grid';
type FeeView = 'term' | 'annual';

interface ClassFeeRow {
    formId: number;
    formName: string;
    formLevel: number;
    educationSystem: string;
    streams: { streamId: number; streamName: string; students: number; paid: number; outstanding: number; expected: number }[];
    totalStudents: number;
    termExpected: number;
    annualExpected: number;
    termPaid: number;
    annualPaid: number;
    term1Paid: number;
    term2Paid: number;
    term3Paid: number;
    outstanding: number;
    collectionRate: number;
}

export default function FeeAnalyticsSection() {
    const [rows, setRows] = useState<ClassFeeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [feeView, setFeeView] = useState<FeeView>('term');
    const [termFilter, setTermFilter] = useState<'1' | '2' | '3' | 'all'>('all');
    const [formFilter, setFormFilter] = useState<string>('all');
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const [refreshKey, setRefreshKey] = useState(0);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        loadData();
    }, [refreshKey]);

    async function loadData() {
        setLoading(true);
        try {
            const [
                { data: formData },
                { data: streamData },
                { data: studentData },
                { data: payData },
                { data: feeStructData },
                { data: termData },
            ] = await Promise.all([
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_streams').select('*'),
                supabase.from('school_students').select('id,form_id,stream_id,status').eq('status', 'Active'),
                supabase.from('school_fee_payments').select('student_id,amount,payment_date,form_id,term_id').order('payment_date', { ascending: false }),
                supabase.from('school_fee_structures').select('form_id,amount,term_id,year').eq('year', currentYear),
                supabase.from('school_terms').select('id,term_name,term_number').eq('year', currentYear).order('term_number'),
            ]);

            const forms = formData || [];
            const streams = streamData || [];
            const students = studentData || [];
            const payments = payData || [];
            const feeStructures = feeStructData || [];
            const terms = termData || [];

            // Build term number → term id map
            const termMap: Record<string, number> = {};
            (terms).forEach((t: any) => { termMap[String(t.term_number)] = t.id; });

            const built: ClassFeeRow[] = forms.map((f: any) => {
                const formStudents = students.filter((s: any) => s.form_id === f.id);
                const formPayments = payments.filter((p: any) => p.form_id === f.id || formStudents.some((s: any) => s.id === p.student_id));

                // Expected fees from structure
                const termStructures = feeStructures.filter((fs: any) => fs.form_id === f.id);
                const annualExpected = termStructures.reduce((sum: number, fs: any) => sum + Number(fs.amount || 0), 0) * formStudents.length;
                const termExpected = (annualExpected / 3) || 0;

                // Paid by term
                const getTermPaid = (termNo: string) => {
                    const tid = termMap[termNo];
                    return formPayments.filter((p: any) => p.term_id === tid).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                };
                const term1Paid = getTermPaid('1');
                const term2Paid = getTermPaid('2');
                const term3Paid = getTermPaid('3');
                const annualPaid = formPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

                // Current term paid (use most recent term with data or all)
                const termPaid = termFilter === '1' ? term1Paid : termFilter === '2' ? term2Paid : termFilter === '3' ? term3Paid : annualPaid;
                const effectiveExpected = feeView === 'annual' ? annualExpected : termExpected;
                const outstanding = Math.max(0, (feeView === 'annual' ? annualExpected : termExpected) - termPaid);

                // Per-stream breakdown
                const formStreams = streams.filter((s: any) => s.form_id === f.id);
                const streamRows = formStreams.map((st: any) => {
                    const stStudents = formStudents.filter((s: any) => s.stream_id === st.id);
                    const stPaid = formPayments.filter((p: any) => stStudents.some((s: any) => s.id === p.student_id)).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                    const stExpected = (termStructures.reduce((s: number, fs: any) => s + Number(fs.amount || 0), 0) || 0) * stStudents.length * (feeView === 'term' ? 1 / 3 : 1);
                    return { streamId: st.id, streamName: st.stream_name, students: stStudents.length, paid: stPaid, outstanding: Math.max(0, stExpected - stPaid), expected: stExpected };
                });

                return {
                    formId: f.id,
                    formName: f.form_name,
                    formLevel: f.form_level,
                    educationSystem: f.education_system || '8-4-4',
                    streams: streamRows,
                    totalStudents: formStudents.length,
                    termExpected,
                    annualExpected,
                    termPaid,
                    annualPaid,
                    term1Paid,
                    term2Paid,
                    term3Paid,
                    outstanding,
                    collectionRate: pct(termPaid, effectiveExpected),
                };
            });

            setRows(built);
        } catch (e) { console.error('FeeAnalytics error:', e); }
        setLoading(false);
    }

    const filteredRows = useMemo(() => {
        if (formFilter === 'all') return rows;
        return rows.filter(r => r.formName.toLowerCase().includes(formFilter.toLowerCase()) || r.educationSystem.toLowerCase().includes(formFilter.toLowerCase()));
    }, [rows, formFilter]);

    // Totals
    const totalStudents = filteredRows.reduce((s, r) => s + r.totalStudents, 0);
    const totalPaid    = filteredRows.reduce((s, r) => s + (feeView === 'annual' ? r.annualPaid : r.termPaid), 0);
    const totalExpected = filteredRows.reduce((s, r) => s + (feeView === 'annual' ? r.annualExpected : r.termExpected), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalPaid);
    const overallRate = pct(totalPaid, totalExpected);

    // Chart data
    const barChartData = {
        labels: filteredRows.map(r => r.formName),
        datasets: [
            {
                label: 'Paid (KES)',
                data: filteredRows.map(r => feeView === 'annual' ? r.annualPaid : r.termPaid),
                backgroundColor: filteredRows.map(r => `${getColor(r.formName)}cc`),
                borderRadius: 6,
                borderSkipped: false as const,
                barPercentage: 0.55,
            },
            {
                label: 'Outstanding (KES)',
                data: filteredRows.map(r => r.outstanding),
                backgroundColor: filteredRows.map(() => 'rgba(239,68,68,0.55)'),
                borderRadius: 6,
                borderSkipped: false as const,
                barPercentage: 0.55,
            },
        ],
    };

    const lineChartData = {
        labels: filteredRows.map(r => r.formName),
        datasets: [
            { label: 'Term 1', data: filteredRows.map(r => r.term1Paid), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 5, borderWidth: 2.5 },
            { label: 'Term 2', data: filteredRows.map(r => r.term2Paid), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointRadius: 5, borderWidth: 2.5 },
            { label: 'Term 3', data: filteredRows.map(r => r.term3Paid), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: true, tension: 0.4, pointRadius: 5, borderWidth: 2.5 },
        ],
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const, labels: { usePointStyle: true, font: { size: 11 }, padding: 16 } },
            tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K` } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
    };

    // Export to CSV/Excel
    const exportToExcel = () => {
        const headers = ['Class', 'Education System', 'Students', 'Term Expected', 'Annual Expected', 'Term 1 Paid', 'Term 2 Paid', 'Term 3 Paid', 'Total Paid', 'Outstanding', 'Collection Rate %'];
        const dataRows = filteredRows.map(r => [
            r.formName, r.educationSystem, r.totalStudents,
            r.termExpected, r.annualExpected,
            r.term1Paid, r.term2Paid, r.term3Paid,
            r.annualPaid, r.outstanding, r.collectionRate,
        ]);

        // Try xlsx, fallback to CSV
        try {
            const XLSX = require('xlsx');
            const wb = XLSX.utils.book_new();
            const wsData = [
                [`APSIMS Fee Analytics Report — ${currentYear}`],
                [`Generated: ${new Date().toLocaleString('en-KE')}`],
                [],
                headers,
                ...dataRows,
                [],
                ['TOTALS', '', totalStudents, '', totalExpected, '', '', '', totalPaid, totalOutstanding, overallRate],
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = headers.map(() => ({ wch: 18 }));
            XLSX.utils.book_append_sheet(wb, ws, 'Fee Analytics');
            XLSX.writeFile(wb, `Fee_Analytics_${currentYear}.xlsx`);
        } catch {
            // CSV fallback
            const csv = [headers.join(','), ...dataRows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Fee_Analytics_${currentYear}.csv`; a.click();
        }
    };

    if (loading) return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-400 font-semibold">Loading fee analytics...</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">📊</span>
                            <h2 className="text-base font-extrabold text-white">Fee Analytics & Class Intelligence</h2>
                            <span className="px-2 py-0.5 text-[9px] font-black bg-amber-400 text-amber-900 rounded-full uppercase">Live {currentYear}</span>
                        </div>
                        <p className="text-white/50 text-xs">Paid · Outstanding · Term & Annual · All Forms & Grades</p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* View toggle */}
                        <div className="flex rounded-lg overflow-hidden border border-white/20">
                            {([['grid', '📋 DataGrid'], ['chart', '📈 Charts']] as const).map(([k, l]) => (
                                <button key={k} onClick={() => setViewMode(k)}
                                    className={`px-3 py-1.5 text-[11px] font-bold transition-all ${viewMode === k ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Fee view */}
                        <div className="flex rounded-lg overflow-hidden border border-white/20">
                            {([['term', 'Per Term'], ['annual', 'Annual']] as const).map(([k, l]) => (
                                <button key={k} onClick={() => setFeeView(k)}
                                    className={`px-3 py-1.5 text-[11px] font-bold transition-all ${feeView === k ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Term filter */}
                        <div className="flex rounded-lg overflow-hidden border border-white/20">
                            {([['all', 'All Terms'], ['1', 'T1'], ['2', 'T2'], ['3', 'T3']] as const).map(([k, l]) => (
                                <button key={k} onClick={() => setTermFilter(k)}
                                    className={`px-3 py-1.5 text-[11px] font-bold transition-all ${termFilter === k ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Form filter */}
                        <select value={formFilter} onChange={e => setFormFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 text-white border border-white/20 focus:outline-none">
                            <option value="all">All Classes</option>
                            <option value="Form">8-4-4 Forms</option>
                            <option value="Grade">CBC Grades</option>
                            {rows.map(r => <option key={r.formId} value={r.formName}>{r.formName}</option>)}
                        </select>

                        <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition" title="Refresh"><FiRefreshCw size={14} /></button>
                        <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold transition shadow-md">
                            <FiDownload size={13} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* Summary KPIs in header */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-white/10">
                    {[
                        { label: 'Total Classes', value: filteredRows.length, icon: '🏫', color: 'text-blue-300' },
                        { label: 'Total Students', value: totalStudents.toLocaleString(), icon: '🎓', color: 'text-purple-300' },
                        { label: 'Expected', value: fmt(totalExpected), icon: '🎯', color: 'text-yellow-300' },
                        { label: 'Collected', value: fmt(totalPaid), icon: '✅', color: 'text-emerald-300' },
                        { label: 'Outstanding', value: fmt(totalOutstanding), icon: '⚠️', color: 'text-red-300' },
                    ].map((k, i) => (
                        <div key={i} className="text-center">
                            <span className="text-lg">{k.icon}</span>
                            <p className={`text-sm font-black mt-0.5 ${k.color}`}>{k.value}</p>
                            <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Collection Rate Bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Collection Rate — {feeView === 'annual' ? 'Annual' : `Term ${termFilter === 'all' ? 'All' : termFilter}`}</p>
                    <span className={`text-sm font-black ${overallRate >= 70 ? 'text-emerald-600' : overallRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{overallRate}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 rounded-full transition-all duration-1000 relative" style={{ width: `${overallRate}%`, background: overallRate >= 70 ? 'linear-gradient(90deg,#10b981,#059669)' : overallRate >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }}>
                        <span className="absolute right-2 top-0.5 text-[9px] font-black text-white">{overallRate}%</span>
                    </div>
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                    <span>0%</span><span className="text-amber-500 font-bold">40% — At Risk</span><span className="text-emerald-500 font-bold">70% — Good</span><span>100%</span>
                </div>
            </div>

            {/* ── DATAGRID VIEW ── */}
            {viewMode === 'grid' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                    {['#','Class / Grade','System','Streams','Students','Expected','T1 Paid','T2 Paid','T3 Paid','Total Paid','Outstanding','Rate'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, i) => {
                                    const isCBC = row.educationSystem === 'CBC_Senior_School' || row.formName.includes('Grade');
                                    const accentColor = getColor(row.formName);
                                    const rate = pct(row.annualPaid, row.annualExpected);
                                    return (
                                        <>
                                            {/* Form row */}
                                            <tr key={row.formId} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                                <td className="px-3 py-3 text-[11px] font-bold text-gray-400">{i + 1}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                                                        <div>
                                                            <p className="text-sm font-extrabold text-gray-900">{row.formName}</p>
                                                            <p className="text-[10px] text-gray-400">{row.streams.length} stream{row.streams.length !== 1 ? 's' : ''}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isCBC ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{isCBC ? 'CBC' : '8-4-4'}</span>
                                                </td>
                                                <td className="px-3 py-3 text-[11px] text-gray-500">{row.streams.map(s => s.streamName).join(', ') || '—'}</td>
                                                <td className="px-3 py-3 text-sm font-bold text-gray-800">{row.totalStudents}</td>
                                                <td className="px-3 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">{fmt(feeView === 'annual' ? row.annualExpected : row.termExpected)}</td>
                                                <td className="px-3 py-3 text-xs font-semibold text-indigo-700 whitespace-nowrap">{fmt(row.term1Paid)}</td>
                                                <td className="px-3 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap">{fmt(row.term2Paid)}</td>
                                                <td className="px-3 py-3 text-xs font-semibold text-cyan-700 whitespace-nowrap">{fmt(row.term3Paid)}</td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className="text-xs font-black text-emerald-700">{fmt(row.annualPaid)}</span>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className={`text-xs font-black ${row.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(row.outstanding)}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2 min-w-[80px]">
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                            <div className="h-2 rounded-full" style={{ width: `${rate}%`, background: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444' }} />
                                                        </div>
                                                        <span className={`text-[11px] font-black w-8 text-right ${rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Stream sub-rows */}
                                            {row.streams.map(st => (
                                                <tr key={st.streamId} className="border-b border-gray-50/50 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                                                    <td className="px-3 py-2 pl-6" />
                                                    <td className="px-3 py-2 pl-8" colSpan={2}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                                                            <span className="text-[11px] font-semibold text-gray-600">{row.formName} — {st.streamName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-[10px] text-gray-400">—</td>
                                                    <td className="px-3 py-2 text-[11px] font-semibold text-gray-700">{st.students}</td>
                                                    <td className="px-3 py-2 text-[11px] text-gray-500">{fmt(st.expected)}</td>
                                                    <td className="px-3 py-2" colSpan={3} />
                                                    <td className="px-3 py-2 text-[11px] font-bold text-emerald-600">{fmt(st.paid)}</td>
                                                    <td className="px-3 py-2 text-[11px] font-bold text-red-500">{fmt(st.outstanding)}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1.5 min-w-[70px]">
                                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                                <div className="h-1.5 rounded-full" style={{ width: `${pct(st.paid, st.expected)}%`, background: pct(st.paid, st.expected) >= 70 ? '#22c55e' : '#f59e0b' }} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-500">{pct(st.paid, st.expected)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    );
                                })}

                                {/* Totals row */}
                                <tr className="border-t-2 border-gray-200" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
                                    <td colSpan={4} className="px-3 py-3 text-sm font-extrabold text-gray-800">📊 GRAND TOTALS</td>
                                    <td className="px-3 py-3 text-sm font-extrabold text-gray-900">{totalStudents}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-gray-900 whitespace-nowrap">{fmt(totalExpected)}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-indigo-700 whitespace-nowrap">{fmt(filteredRows.reduce((s, r) => s + r.term1Paid, 0))}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-blue-700 whitespace-nowrap">{fmt(filteredRows.reduce((s, r) => s + r.term2Paid, 0))}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-cyan-700 whitespace-nowrap">{fmt(filteredRows.reduce((s, r) => s + r.term3Paid, 0))}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-emerald-700 whitespace-nowrap">{fmt(totalPaid)}</td>
                                    <td className="px-3 py-3 text-xs font-extrabold text-red-600 whitespace-nowrap">{fmt(totalOutstanding)}</td>
                                    <td className="px-3 py-3">
                                        <span className={`text-sm font-extrabold ${overallRate >= 70 ? 'text-emerald-700' : overallRate >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{overallRate}%</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── CHARTS VIEW ── */}
            {viewMode === 'chart' && (
                <div className="space-y-4">
                    {/* Chart type toggle */}
                    <div className="flex items-center gap-2">
                        {([['bar', '📊 Bar Chart'], ['line', '📈 Line Chart']] as const).map(([k, l]) => (
                            <button key={k} onClick={() => setChartType(k)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${chartType === k ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}>
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Paid vs Outstanding */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">💰 Paid vs Outstanding — Per Class</p>
                                <p className="text-xs text-gray-400 mt-0.5">{feeView === 'annual' ? 'Annual' : 'Term'} · {filteredRows.length} classes</p>
                            </div>
                            <div style={{ height: 280 }}>
                                <Bar data={barChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Term-by-term line chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📈 Term-by-Term Collections — Per Class</p>
                                <p className="text-xs text-gray-400 mt-0.5">Term 1 · Term 2 · Term 3 comparison</p>
                            </div>
                            <div style={{ height: 280 }}>
                                <Line data={lineChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Collection rate bar per class */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📊 Collection Rate by Class</p>
                        <div className="space-y-3">
                            {filteredRows.map(row => {
                                const rate = pct(row.annualPaid, row.annualExpected);
                                return (
                                    <div key={row.formId}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-800 w-24">{row.formName}</span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${row.educationSystem === 'CBC_Senior_School' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{row.educationSystem === 'CBC_Senior_School' ? 'CBC' : '8-4-4'}</span>
                                                <span className="text-[10px] text-gray-400">{row.totalStudents} students</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-extrabold ${rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                                                <span className="text-[10px] text-gray-400 ml-2">{fmt(row.outstanding)} outstanding</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-l-full transition-all duration-1000" style={{ width: `${rate}%`, background: rate >= 70 ? 'linear-gradient(90deg,#10b981,#059669)' : rate >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

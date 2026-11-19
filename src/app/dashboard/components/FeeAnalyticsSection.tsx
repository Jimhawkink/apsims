'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    FiDownload, FiRefreshCw, FiChevronRight,
    FiSearch, FiChevronLeft, FiLayers, FiDollarSign,
    FiTrendingUp, FiAlertTriangle, FiCheckCircle
} from 'react-icons/fi';
import { HiChartBar, HiChevronDown, HiChevronUp, HiArrowDownTray } from 'react-icons/hi2';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K` : `KES ${n}`;
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

// CBC colour map
const GRADE_COLORS: Record<string, string> = {
    'Grade 10': '#6366f1', 'Grade 11': '#8b5cf6', 'Grade 12': '#a855f7',
    'Form 1': '#3b82f6',  'Form 2':  '#0ea5e9',  'Form 3':  '#06b6d4', 'Form 4': '#14b8a6',
};
const getColor = (name: string) => {
    const key = Object.keys(GRADE_COLORS).find(k => name?.includes(k.split(' ')[1]));
    return key ? GRADE_COLORS[key] : '#3b82f6';
};

type ViewMode = 'panels' | 'chart';
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
    const [viewMode, setViewMode] = useState<ViewMode>('panels');
    const [feeView, setFeeView] = useState<FeeView>('term');
    const [termFilter, setTermFilter] = useState<'1' | '2' | '3' | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [expandedFormId, setExpandedFormId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(5);
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

            const termMap: Record<string, number> = {};
            (terms).forEach((t: any) => { termMap[String(t.term_number)] = t.id; });

            const built: ClassFeeRow[] = forms.map((f: any) => {
                const formStudents = students.filter((s: any) => s.form_id === f.id);
                const formPayments = payments.filter((p: any) => p.form_id === f.id || formStudents.some((s: any) => s.id === p.student_id));

                const termStructures = feeStructures.filter((fs: any) => fs.form_id === f.id);
                const annualExpected = termStructures.reduce((sum: number, fs: any) => sum + Number(fs.amount || 0), 0) * formStudents.length;
                const termExpected = (annualExpected / 3) || 0;

                const getTermPaid = (termNo: string) => {
                    const tid = termMap[termNo];
                    return formPayments.filter((p: any) => p.term_id === tid).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                };

                const term1Paid = getTermPaid('1');
                const term2Paid = getTermPaid('2');
                const term3Paid = getTermPaid('3');
                const annualPaid = formPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

                const termPaid = termFilter === '1' ? term1Paid : termFilter === '2' ? term2Paid : termFilter === '3' ? term3Paid : annualPaid;
                const effectiveExpected = feeView === 'annual' ? annualExpected : termExpected;
                const outstanding = Math.max(0, effectiveExpected - termPaid);

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
        let res = rows;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            res = res.filter(r => r.formName.toLowerCase().includes(q) || r.educationSystem.toLowerCase().includes(q));
        }
        return res;
    }, [rows, searchQuery]);

    // Totals
    const totalStudents = filteredRows.reduce((s, r) => s + r.totalStudents, 0);
    const totalPaid = filteredRows.reduce((s, r) => s + (feeView === 'annual' ? r.annualPaid : r.termPaid), 0);
    const totalExpected = filteredRows.reduce((s, r) => s + (feeView === 'annual' ? r.annualExpected : r.termExpected), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalPaid);
    const overallRate = pct(totalPaid, totalExpected);

    // Pagination calculations
    const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, currentPage, pageSize]);

    // Reset page if filtered results decrease
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(1);
    }, [totalPages, currentPage]);

    // Chart data
    const barChartData = {
        labels: filteredRows.map(r => r.formName),
        datasets: [
            {
                label: 'Paid (KES)',
                data: filteredRows.map(r => feeView === 'annual' ? r.annualPaid : r.termPaid),
                backgroundColor: filteredRows.map(r => `${getColor(r.formName)}dd`),
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

    const doughnutData = {
        labels: ['Collected', 'Outstanding'],
        datasets: [{
            data: [totalPaid || 1, totalOutstanding],
            backgroundColor: ['#22c55e', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const exportToExcel = () => {
        const headers = ['Class', 'Education System', 'Students', 'Term Expected', 'Annual Expected', 'Term 1 Paid', 'Term 2 Paid', 'Term 3 Paid', 'Total Paid', 'Outstanding', 'Collection Rate %'];
        const dataRows = filteredRows.map(r => [
            r.formName, r.educationSystem, r.totalStudents,
            r.termExpected, r.annualExpected,
            r.term1Paid, r.term2Paid, r.term3Paid,
            r.annualPaid, r.outstanding, r.collectionRate,
        ]);

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
            const csv = [headers.join(','), ...dataRows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Fee_Analytics_${currentYear}.csv`; a.click();
        }
    };

    if (loading) return (
        <div className="bg-white/85 backdrop-blur-xl rounded-[20px] border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06)] p-6 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-semibold">Loading fee intelligence...</p>
        </div>
    );

    return (
        <div className="space-y-3.5">
            {/* ── Top Header Strip: Filters & View Switcher ── */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] rounded-[20px] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                        <HiChartBar size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-black text-slate-800 tracking-tight">Fee Analytics &amp; Class Intelligence</h2>
                            <span className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase">
                                Live {currentYear}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Revenue distribution, collection efficiency &amp; class-level balances</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher: Side-by-Side Panels vs Full Chart */}
                    <div className="flex rounded-full overflow-hidden border border-slate-200 bg-slate-100/80 p-0.5">
                        <button
                            onClick={() => setViewMode('panels')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                viewMode === 'panels' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Side-by-Side Panels
                        </button>
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                viewMode === 'chart' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Full Chart
                        </button>
                    </div>

                    {/* Term vs Annual View */}
                    <div className="flex rounded-full overflow-hidden border border-slate-200 bg-slate-100/80 p-0.5">
                        {(['term', 'annual'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFeeView(mode)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all ${
                                    feeView === mode ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-600'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Term Filter */}
                    <div className="flex rounded-full overflow-hidden border border-slate-200 bg-slate-100/80 p-0.5">
                        {([['all', 'All'], ['1', 'T1'], ['2', 'T2'], ['3', 'T3']] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setTermFilter(val)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                                    termFilter === val ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh & Excel Export */}
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-all hover:scale-105"
                        title="Refresh Data"
                    >
                        <FiRefreshCw size={11} />
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-xs"
                    >
                        <HiArrowDownTray size={12} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SIDE-BY-SIDE PANELS (Left: Analytics / Right: Paginated DataGrid)
            ══════════════════════════════════════════════════════════════════ */}
            {viewMode === 'panels' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* ── LEFT PANEL (4 of 12 cols): Financial Intelligence & Collection Gauges ── */}
                    <div className="lg:col-span-5 bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] rounded-[22px] p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Financial Efficiency</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    overallRate >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                    {overallRate}% Collection Rate
                                </span>
                            </div>

                            {/* Donut Chart with Centered Metric */}
                            <div className="relative w-full h-40 flex items-center justify-center mb-3">
                                <Doughnut
                                    data={doughnutData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '74%',
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-slate-800 leading-none">{overallRate}%</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Efficiency</span>
                                </div>
                            </div>

                            {/* 3 Metric Pills */}
                            <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Expected</span>
                                    <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{fmtShort(totalExpected)}</p>
                                </div>
                                <div className="bg-emerald-50/60 rounded-xl p-2 border border-emerald-100">
                                    <span className="text-[9px] font-bold text-emerald-700 uppercase">Collected</span>
                                    <p className="text-xs font-black text-emerald-700 mt-0.5 truncate">{fmtShort(totalPaid)}</p>
                                </div>
                                <div className="bg-rose-50/60 rounded-xl p-2 border border-rose-100">
                                    <span className="text-[9px] font-bold text-rose-700 uppercase">Outstanding</span>
                                    <p className="text-xs font-black text-rose-700 mt-0.5 truncate">{fmtShort(totalOutstanding)}</p>
                                </div>
                            </div>

                            {/* Term-by-Term Comparative Breakdown */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Term Breakdown</span>
                                {[
                                    { label: 'Term 1 Paid', val: filteredRows.reduce((s, r) => s + r.term1Paid, 0), color: '#6366f1' },
                                    { label: 'Term 2 Paid', val: filteredRows.reduce((s, r) => s + r.term2Paid, 0), color: '#3b82f6' },
                                    { label: 'Term 3 Paid', val: filteredRows.reduce((s, r) => s + r.term3Paid, 0), color: '#06b6d4' },
                                ].map((t, idx) => {
                                    const share = totalPaid > 0 ? Math.round((t.val / totalPaid) * 100) : 0;
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-50">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                                                <span className="text-[11px] font-semibold text-slate-600">{t.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-800">{fmtShort(t.val)}</span>
                                                <span className="text-[9px] font-bold text-slate-400 w-8 text-right">{share}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bottom Status Tag */}
                        <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                                <FiCheckCircle className="text-emerald-500" />
                                <span>{totalStudents} Enrolled Students</span>
                            </span>
                            <span>{filteredRows.length} Total Forms</span>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL (7 of 12 cols): Ultra-Premium Paginated DataGrid ── */}
                    <div className="lg:col-span-7 bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] rounded-[22px] p-4 flex flex-col justify-between">
                        <div>
                            {/* Panel Header with Search & Count */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-xs font-black text-slate-800 tracking-tight">Class Revenue Performance</h3>
                                    <p className="text-[10px] text-slate-400">Showing page {currentPage} of {totalPages}</p>
                                </div>
                                <div className="relative">
                                    <FiSearch className="absolute left-2.5 top-2 text-slate-400" size={11} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search class..."
                                        className="pl-7 pr-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:border-blue-500 outline-none w-32 sm:w-40 transition-all"
                                    />
                                </div>
                            </div>

                            {/* High-Density Compact DataGrid */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="pb-2">Class</th>
                                            <th className="pb-2 text-center">Students</th>
                                            <th className="pb-2 text-right">Expected</th>
                                            <th className="pb-2 text-right">Collected</th>
                                            <th className="pb-2 text-right">Balance</th>
                                            <th className="pb-2 text-right">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRows.map(row => {
                                            const isExpanded = expandedFormId === row.formId;
                                            const rate = pct(feeView === 'annual' ? row.annualPaid : row.termPaid, feeView === 'annual' ? row.annualExpected : row.termExpected);
                                            return (
                                                <tr key={row.formId} className="group hover:bg-blue-50/40 transition-colors">
                                                    <td className="py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-6 rounded-full" style={{ background: getColor(row.formName) }}></div>
                                                            <div>
                                                                <button
                                                                    onClick={() => setExpandedFormId(isExpanded ? null : row.formId)}
                                                                    className="text-xs font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1 text-left"
                                                                >
                                                                    <span>{row.formName}</span>
                                                                    {row.streams.length > 0 && (
                                                                        <span className="text-[9px] text-slate-400">
                                                                            {isExpanded ? <HiChevronUp size={11} /> : <HiChevronDown size={11} />}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                                <span className="text-[9px] text-slate-400 font-medium">{row.streams.length} stream{row.streams.length !== 1 ? 's' : ''}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 text-center text-xs font-bold text-slate-700">
                                                        {row.totalStudents}
                                                    </td>
                                                    <td className="py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">
                                                        {fmtShort(feeView === 'annual' ? row.annualExpected : row.termExpected)}
                                                    </td>
                                                    <td className="py-2.5 text-right text-xs font-black text-emerald-700 whitespace-nowrap">
                                                        {fmtShort(feeView === 'annual' ? row.annualPaid : row.termPaid)}
                                                    </td>
                                                    <td className="py-2.5 text-right text-xs font-black whitespace-nowrap">
                                                        <span className={row.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                            {fmtShort(row.outstanding)}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-right">
                                                        <div className="inline-flex flex-col items-end">
                                                            <span className={`text-[10px] font-black ${rate >= 70 ? 'text-emerald-700' : rate >= 40 ? 'text-amber-700' : 'text-rose-600'}`}>
                                                                {rate}%
                                                            </span>
                                                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${Math.min(100, rate)}%`,
                                                                        background: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444',
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Stream Expansion Dropdown */}
                            {expandedFormId && (() => {
                                const selected = rows.find(r => r.formId === expandedFormId);
                                if (!selected || selected.streams.length === 0) return null;
                                return (
                                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                            {selected.formName} Streams Breakdown:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selected.streams.map(st => (
                                                <div key={st.streamId} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                                                    <div>
                                                        <span className="font-bold text-slate-800 text-[11px]">{st.streamName}</span>
                                                        <span className="text-[9px] text-slate-400 block">{st.students} students</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black text-emerald-600 text-[11px]">{fmtShort(st.paid)}</span>
                                                        <span className="text-[9px] text-slate-400 block">/ {fmtShort(st.expected)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── INTERACTIVE PAGINATION CONTROLS ── */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 font-bold outline-none text-[10px]"
                                >
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                    <option value={8}>8</option>
                                    <option value={10}>10</option>
                                </select>
                                <span className="hidden sm:inline">classes per page</span>
                            </div>

                            {/* Page Controls */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    title="Previous Page"
                                >
                                    <FiChevronLeft size={12} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                            currentPage === page
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    title="Next Page"
                                >
                                    <FiChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Full Chart View Option */
                <div className="bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06)] rounded-[22px] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-700">Class Fee Collections vs Outstanding</span>
                        <span className="text-[10px] text-slate-400">All Forms &amp; Grades</span>
                    </div>
                    <div style={{ height: 260 }}>
                        <Bar
                            data={barChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}K`, font: { size: 10 } } },
                                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                },
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

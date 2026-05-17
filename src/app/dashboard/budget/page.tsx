'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiDownload, FiEdit2, FiTrash2, FiRefreshCw, FiX,
    FiSave, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart,
    FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiAlertTriangle,
    FiCheckCircle, FiBarChart2, FiArrowLeft,
} from 'react-icons/fi';
import Link from 'next/link';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const calcPct = (actual: number, budget: number) => budget > 0 ? Math.round((actual / budget) * 100) : 0;

const VOTE_HEADS = [
    'Salaries & Wages','Teaching Staff Allowances','Non-Teaching Staff',
    'Tuition & Academic','Examinations','Library & ICT','Laboratory',
    'Sports & Co-curricular','Boarding & Catering','Transport',
    'Medical & Health','Utilities (Water & Electricity)','Maintenance & Repairs',
    'Infrastructure & Development','Procurement & Supplies','Administration',
    'Marketing & Outreach','Insurance','Contingency','Other',
];
const CATEGORIES = ['Personnel','Operations','Capital','Recurrent','Development'];

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Personnel:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    Operations:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    Capital:     { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
    Recurrent:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    Development: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
};

function pctColors(p: number) {
    if (p > 100) return { bar: '#ef4444', bg: '#fee2e2', text: '#b91c1c', label: 'OVER BUDGET' };
    if (p > 90)  return { bar: '#f97316', bg: '#ffedd5', text: '#c2410c', label: 'CRITICAL' };
    if (p > 75)  return { bar: '#f59e0b', bg: '#fef3c7', text: '#b45309', label: 'HIGH' };
    if (p > 50)  return { bar: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8', label: 'ON TRACK' };
    return { bar: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'GOOD' };
}

function CatBadge({ cat }: { cat: string }) {
    const c = CAT_COLORS[cat] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}>
            {cat}
        </span>
    );
}

function ProgressBar({ actual, budget }: { actual: number; budget: number }) {
    const p = calcPct(actual, budget);
    const c = pctColors(p);
    const width = Math.min(p, 100);
    return (
        <div className="space-y-1 min-w-[120px]">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black" style={{ color: c.text }}>{p}%</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>{c.label}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: c.bg }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, background: c.bar }} />
            </div>
        </div>
    );
}

export default function BudgetPage() {
    const [votes, setVotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [sortBy, setSortBy] = useState<'budget' | 'actual' | 'pct' | 'name'>('budget');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
    const [form, setForm] = useState({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
    const year = new Date().getFullYear();

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_budget_votes').select('*').eq('academic_year', year).order('budget_amount', { ascending: false });
        if (error) toast.error(error.message);
        setVotes(data || []);
        setLoading(false);
    }, [year]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openAdd = () => {
        setEditId(null);
        setForm({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
        setShowModal(true);
    };

    const openEdit = (v: any) => {
        setEditId(v.id);
        setForm({ vote_head: v.vote_head, category: v.category, budget_amount: String(v.budget_amount), actual_amount: String(v.actual_amount || 0), notes: v.notes || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.vote_head.trim()) return toast.error('Vote head is required');
        if (!form.budget_amount || Number(form.budget_amount) <= 0) return toast.error('Budget amount must be greater than 0');
        const payload = {
            vote_head: form.vote_head.trim(),
            category: form.category,
            budget_amount: Number(form.budget_amount),
            actual_amount: Number(form.actual_amount || 0),
            notes: form.notes.trim(),
            academic_year: year,
        };
        const tid = toast.loading(editId ? 'Updating…' : 'Saving…');
        const { error } = editId
            ? await supabase.from('school_budget_votes').update(payload).eq('id', editId)
            : await supabase.from('school_budget_votes').insert([payload]);
        toast.dismiss(tid);
        if (error) return toast.error(error.message);
        toast.success(editId ? '✅ Budget vote updated!' : '✅ Budget vote added!');
        setShowModal(false);
        fetchAll();
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const { error } = await supabase.from('school_budget_votes').delete().eq('id', id);
        if (error) return toast.error(error.message);
        toast.success('Deleted');
        fetchAll();
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...votes];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(v => v.vote_head?.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q) || v.notes?.toLowerCase().includes(q));
        }
        if (filterCat) list = list.filter(v => v.category === filterCat);
        list.sort((a, b) => {
            let va = 0, vb = 0;
            if (sortBy === 'budget') { va = Number(a.budget_amount); vb = Number(b.budget_amount); }
            else if (sortBy === 'actual') { va = Number(a.actual_amount); vb = Number(b.actual_amount); }
            else if (sortBy === 'pct') { va = calcPct(Number(a.actual_amount), Number(a.budget_amount)); vb = calcPct(Number(b.actual_amount), Number(b.budget_amount)); }
            else { return sortDir === 'asc' ? (a.vote_head || '').localeCompare(b.vote_head || '') : (b.vote_head || '').localeCompare(a.vote_head || ''); }
            return sortDir === 'asc' ? va - vb : vb - va;
        });
        return list;
    }, [votes, search, filterCat, sortBy, sortDir]);

    const totals = useMemo(() => {
        const budget = filtered.reduce((s, v) => s + Number(v.budget_amount || 0), 0);
        const actual = filtered.reduce((s, v) => s + Number(v.actual_amount || 0), 0);
        const variance = budget - actual;
        const utilization = calcPct(actual, budget);
        const overBudget = filtered.filter(v => Number(v.actual_amount) > Number(v.budget_amount)).length;
        const onTrack = filtered.filter(v => calcPct(Number(v.actual_amount), Number(v.budget_amount)) <= 75).length;
        return { budget, actual, variance, utilization, overBudget, onTrack };
    }, [filtered]);

    const toggleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }: { col: typeof sortBy }) => {
        if (sortBy !== col) return <FiChevronDown size={11} className="text-gray-300" />;
        return sortDir === 'asc' ? <FiChevronUp size={11} className="text-indigo-500" /> : <FiChevronDown size={11} className="text-indigo-500" />;
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = ['Vote Head', 'Category', 'Budget (KES)', 'Actual (KES)', '% Used', 'Variance (KES)', 'Status', 'Notes'];
        const rows = filtered.map(v => {
            const p = calcPct(Number(v.actual_amount), Number(v.budget_amount));
            const diff = Number(v.budget_amount) - Number(v.actual_amount);
            return [
                `"${v.vote_head}"`, v.category,
                v.budget_amount, v.actual_amount,
                `${p}%`, diff,
                p > 100 ? 'OVER BUDGET' : p > 90 ? 'CRITICAL' : p > 75 ? 'HIGH' : 'ON TRACK',
                `"${v.notes || ''}"`,
            ];
        });
        const csv = [
            `"ALPHA SCHOOL — BUDGET vs ACTUAL REPORT ${year}"`,
            `"Generated: ${new Date().toLocaleDateString('en-KE')} | Total Budget: ${fmt(totals.budget)} | Utilization: ${totals.utilization}%"`,
            '',
            headers.join(','),
            ...rows.map(r => r.join(',')),
            `"TOTALS","",${totals.budget},${totals.actual},${totals.utilization}%,${totals.variance},"",""`,
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AlphaSchool_Budget_${year}.csv`;
        a.click();
        toast.success('✅ Exported!');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>📊</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-400">Loading Budget Data…</p>
        </div>
    );

    return (
        <div className="space-y-5" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#1d4ed8 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle,#60a5fa 0%,transparent 70%)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                            <FiBarChart2 className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                📊 Budget vs Actual — {year}
                                {totals.overBudget > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                                        {totals.overBudget} OVER BUDGET
                                    </span>
                                )}
                            </h1>
                            <p className="text-blue-300 text-xs mt-0.5 font-medium">Track allocation, expenditure and variance by vote head · FY {year}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/fees" className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiArrowLeft size={13} /> Finance
                        </Link>
                        <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition" title="Refresh">
                            <FiRefreshCw size={15} />
                        </button>
                        <button onClick={exportCSV} className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                            <FiDownload size={13} /> Export CSV
                        </button>
                        <button onClick={openAdd} className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition hover:opacity-90 shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            <FiPlus size={13} /> Add Vote Head
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Budget', value: fmt(totals.budget), emoji: '💰', color: '#3b82f6' },
                            { label: 'Actual Spend', value: fmt(totals.actual), emoji: '💳', color: '#8b5cf6' },
                            { label: 'Utilization', value: `${totals.utilization}%`, emoji: '📈', color: totals.utilization > 90 ? '#ef4444' : totals.utilization > 75 ? '#f59e0b' : '#10b981', pulse: totals.utilization > 90 },
                            { label: 'Variance', value: fmt(Math.abs(totals.variance)), emoji: totals.variance >= 0 ? '✅' : '⚠️', color: totals.variance >= 0 ? '#10b981' : '#ef4444' },
                            { label: 'Over Budget', value: totals.overBudget, emoji: '🚨', color: '#ef4444', pulse: totals.overBudget > 0 },
                            { label: 'Vote Heads', value: votes.length, emoji: '📋', color: '#0891b2' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] ${(card as any).pulse ? 'ring-1 ring-red-400/40' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: card.color, transform: 'translate(30%,-30%)' }} />
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-lg font-black text-white leading-tight">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ UTILIZATION OVERVIEW BAR ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-bold text-gray-800">Overall Budget Utilization</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmt(totals.actual)} spent of {fmt(totals.budget)} budgeted</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black" style={{ color: pctColors(totals.utilization).text }}>{totals.utilization}%</p>
                        <p className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: pctColors(totals.utilization).bg, color: pctColors(totals.utilization).text }}>
                            {pctColors(totals.utilization).label}
                        </p>
                    </div>
                </div>
                <div className="h-4 rounded-full overflow-hidden bg-gray-100">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(totals.utilization, 100)}%`, background: `linear-gradient(90deg, ${pctColors(totals.utilization).bar}, ${pctColors(totals.utilization).bar}cc)` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                    <span>KES 0</span>
                    <span className="font-bold text-gray-600">{fmt(totals.actual)} spent</span>
                    <span>{fmt(totals.budget)}</span>
                </div>
            </div>

            {/* ═══ FILTER BAR ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vote heads, categories, notes…"
                            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={13} /></button>}
                    </div>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FiFilter size={13} />
                        <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{votes.length}</span> vote heads
                    </div>
                </div>
            </div>

            {/* ═══ DATA GRID ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-24">
                        <span className="text-6xl block mb-3">📊</span>
                        <p className="font-bold text-lg text-gray-400">No budget votes found</p>
                        <p className="text-sm text-gray-300 mt-1">Click &quot;Add Vote Head&quot; to create your first budget entry.</p>
                        <button onClick={openAdd} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            <FiPlus size={14} className="inline mr-1.5" /> Add Vote Head
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: '#', col: null, bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
                                        { label: 'Vote Head', col: 'name', bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
                                        { label: 'Category', col: null, bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
                                        { label: 'Budget (KES)', col: 'budget', bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
                                        { label: 'Actual (KES)', col: 'actual', bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
                                        { label: 'Variance', col: null, bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
                                        { label: 'Utilization', col: 'pct', bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
                                        { label: 'Notes', col: null, bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
                                        { label: 'Actions', col: null, bg: '#f8fafc', text: '#374151', head: '#e2e8f0' },
                                    ].map((h, i) => (
                                        <th key={i}
                                            className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-left whitespace-nowrap ${h.col ? 'cursor-pointer hover:opacity-80 select-none' : ''}`}
                                            style={{ background: h.head, color: h.text, borderBottom: `2px solid ${h.text}30` }}
                                            onClick={h.col ? () => toggleSort(h.col as any) : undefined}>
                                            <div className="flex items-center gap-1">
                                                {h.label}
                                                {h.col && <SortIcon col={h.col as any} />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((v, idx) => {
                                    const budget = Number(v.budget_amount || 0);
                                    const actual = Number(v.actual_amount || 0);
                                    const variance = budget - actual;
                                    const p = calcPct(actual, budget);
                                    const c = pctColors(p);
                                    const isEven = idx % 2 === 0;
                                    return (
                                        <tr key={v.id} className={`${isEven ? '' : 'bg-gray-50/40'} hover:bg-indigo-50/30 transition-colors group`}
                                            style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td className="px-3 py-3 text-center font-bold text-indigo-600" style={{ background: '#f5f3ff60' }}>{idx + 1}</td>
                                            <td className="px-3 py-3" style={{ background: '#f0fdfa60' }}>
                                                <p className="font-bold text-gray-800">{v.vote_head}</p>
                                            </td>
                                            <td className="px-3 py-3" style={{ background: '#eff6ff60' }}>
                                                <CatBadge cat={v.category} />
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-emerald-700" style={{ background: '#f0fdf460' }}>
                                                {fmt(budget)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold" style={{ background: '#fffbeb60', color: actual > budget ? '#b91c1c' : '#92400e' }}>
                                                {fmt(actual)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold" style={{ background: '#faf5ff60', color: variance >= 0 ? '#15803d' : '#b91c1c' }}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {variance >= 0 ? <FiTrendingDown size={12} className="text-emerald-500" /> : <FiTrendingUp size={12} className="text-red-500" />}
                                                    {fmt(Math.abs(variance))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3" style={{ background: '#fff7ed60' }}>
                                                <ProgressBar actual={actual} budget={budget} />
                                            </td>
                                            <td className="px-3 py-3 max-w-[160px]" style={{ background: '#f8fafc60' }}>
                                                <p className="text-gray-500 truncate text-[11px]">{v.notes || '—'}</p>
                                            </td>
                                            <td className="px-3 py-3" style={{ background: '#f8fafc60' }}>
                                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(v)}
                                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200" title="Edit">
                                                        <FiEdit2 size={12} />
                                                    </button>
                                                    <button onClick={() => handleDelete(v.id, v.vote_head)}
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition border border-red-200" title="Delete">
                                                        <FiTrash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', position: 'sticky', bottom: 0 }}>
                                    <td colSpan={3} className="px-4 py-3">
                                        <span className="text-xs font-black text-white/90">TOTALS — {filtered.length} vote head{filtered.length !== 1 ? 's' : ''}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-emerald-300">{fmt(totals.budget)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-amber-300">{fmt(totals.actual)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className={`text-xs font-black ${totals.variance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(Math.abs(totals.variance))}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="text-xs font-black text-white">{totals.utilization}% utilized</span>
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ CATEGORY BREAKDOWN CARDS ═══ */}
            {votes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {CATEGORIES.map(cat => {
                        const catVotes = votes.filter(v => v.category === cat);
                        if (catVotes.length === 0) return null;
                        const catBudget = catVotes.reduce((s, v) => s + Number(v.budget_amount || 0), 0);
                        const catActual = catVotes.reduce((s, v) => s + Number(v.actual_amount || 0), 0);
                        const catPct = calcPct(catActual, catBudget);
                        const c = pctColors(catPct);
                        const cc = CAT_COLORS[cat] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
                        return (
                            <div key={cat} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all" style={{ borderColor: cc.border }}>
                                <div className="flex items-center justify-between mb-3">
                                    <CatBadge cat={cat} />
                                    <span className="text-xs font-black" style={{ color: c.text }}>{catPct}%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{catVotes.length} vote head{catVotes.length !== 1 ? 's' : ''}</p>
                                <p className="text-sm font-black text-gray-800">{fmt(catBudget)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Spent: <span className="font-bold" style={{ color: c.text }}>{fmt(catActual)}</span></p>
                                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: c.bg }}>
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(catPct, 100)}%`, background: c.bar }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ ADD / EDIT MODAL ═══ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                    {editId ? <FiEdit2 size={16} className="text-white" /> : <FiPlus size={16} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{editId ? 'Edit Budget Vote' : 'Add Budget Vote Head'}</p>
                                    <p className="text-white/60 text-[10px]">FY {year}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition"><FiX size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Vote Head *</label>
                                <select value={form.vote_head} onChange={e => setForm({ ...form, vote_head: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all">
                                    <option value="">— Select Vote Head —</option>
                                    {VOTE_HEADS.map(h => <option key={h}>{h}</option>)}
                                </select>
                                <input type="text" value={form.vote_head} onChange={e => setForm({ ...form, vote_head: e.target.value })}
                                    placeholder="Or type a custom vote head…"
                                    className="w-full mt-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Category</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Budget Amount (KES) *</label>
                                    <input type="number" value={form.budget_amount} onChange={e => setForm({ ...form, budget_amount: e.target.value })} min="0"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="0" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Actual Amount Spent (KES)</label>
                                <input type="number" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: e.target.value })} min="0"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="0" />
                                {form.budget_amount && form.actual_amount && (
                                    <div className="mt-2 p-2.5 rounded-xl" style={{ background: pctColors(calcPct(Number(form.actual_amount), Number(form.budget_amount))).bg }}>
                                        <p className="text-xs font-bold" style={{ color: pctColors(calcPct(Number(form.actual_amount), Number(form.budget_amount))).text }}>
                                            {calcPct(Number(form.actual_amount), Number(form.budget_amount))}% utilized · Variance: {fmt(Number(form.budget_amount) - Number(form.actual_amount))}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
                                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                                    placeholder="Any additional notes…" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition shadow-md hover:opacity-90 flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}>
                                    <FiSave size={14} />
                                    {editId ? 'Update Vote' : 'Save Vote'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

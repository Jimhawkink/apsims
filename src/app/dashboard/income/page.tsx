'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiTrash2, FiX, FiSearch, FiDownload, FiRefreshCw,
    FiEdit2, FiTrendingUp, FiDollarSign, FiFilter,
    FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, LineElement,
    PointElement, ArcElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, BarElement, Title, Tooltip, Legend, Filler);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Income {
    id: number; income_date: string; source: string; description: string;
    amount: number; payment_method: string; reference_number?: string;
    received_by?: string; notes?: string; year: number;
}

// ─── Source Config ────────────────────────────────────────────────────────────
const SOURCES = [
    { name: 'Fees',             emoji: '💰', color: '#3b82f6', desc: 'Student fee collections' },
    { name: 'Government Grants',emoji: '🏛️', color: '#059669', desc: 'FDSE, NG-CDF, Capitation' },
    { name: 'Donations',        emoji: '🤝', color: '#7c3aed', desc: 'Alumni & NGO support' },
    { name: 'CDF',              emoji: '📋', color: '#0891b2', desc: 'Constituency Development Fund' },
    { name: 'Fundraising',      emoji: '🎗️', color: '#ec4899', desc: 'Events & campaigns' },
    { name: 'Rent',             emoji: '🏢', color: '#f97316', desc: 'Facility rentals' },
    { name: 'Projects',         emoji: '🔨', color: '#84cc16', desc: 'School projects' },
    { name: 'Sports',           emoji: '⚽', color: '#06b6d4', desc: 'Sports & competitions' },
    { name: 'Transport',        emoji: '🚌', color: '#8b5cf6', desc: 'Bus fees' },
    { name: 'Other',            emoji: '📦', color: '#6366f1', desc: 'Miscellaneous income' },
];

const METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'RTGS', 'EFT', 'Government Transfer', 'Mobile Banking'];

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);
const pct  = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IncomePage() {
    const [incomes, setIncomes]   = useState<Income[]>([]);
    const [prevYear, setPrevYear] = useState<Income[]>([]);
    const [schoolName, setSchoolName] = useState('School');
    const [loading, setLoading]   = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [filterMonth, setFilterMonth]   = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amt_desc' | 'amt_asc'>('date_desc');
    const currentYear = new Date().getFullYear();

    const blankForm = {
        income_date: new Date().toISOString().split('T')[0], source: 'Fees',
        description: '', amount: '', payment_method: 'Cash',
        reference_number: `INC-${Date.now().toString().slice(-6)}`,
        received_by: '', notes: '', grant_type: '',
    };
    const [form, setForm] = useState<Record<string, string>>(blankForm);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: cur }, { data: prev }, { data: school }] = await Promise.all([
            supabase.from('school_income').select('*').eq('year', currentYear).order('income_date', { ascending: false }),
            supabase.from('school_income').select('*').eq('year', currentYear - 1),
            supabase.from('school_details').select('school_name').limit(1).single(),
        ]);
        setIncomes(cur || []);
        setPrevYear(prev || []);
        setSchoolName(school?.school_name || 'School');
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Analytics ──────────────────────────────────────────────────────────────
    const total      = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalPrev  = prevYear.reduce((s, i) => s + Number(i.amount), 0);
    const yoyChange  = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;

    const currentMonth = new Date().getMonth();
    const thisMonthAmt = incomes.filter(i => { const d = new Date(i.income_date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((s, i) => s + Number(i.amount), 0);

    // Source totals
    const sourceTotals = useMemo(() =>
        SOURCES.map(src => ({
            ...src,
            total: incomes.filter(i => i.source === src.name).reduce((s, i) => s + Number(i.amount), 0),
            count: incomes.filter(i => i.source === src.name).length,
        })).filter(s => s.total > 0).sort((a, b) => b.total - a.total),
    [incomes]);

    const feesTotal   = incomes.filter(i => i.source === 'Fees').reduce((s, i) => s + Number(i.amount), 0);
    const grantsTotal = incomes.filter(i => ['Government Grants', 'CDF'].includes(i.source)).reduce((s, i) => s + Number(i.amount), 0);
    const donationsTotal = incomes.filter(i => i.source === 'Donations').reduce((s, i) => s + Number(i.amount), 0);
    const mpesaTotal  = incomes.filter(i => i.payment_method === 'M-Pesa').reduce((s, i) => s + Number(i.amount), 0);

    // Monthly trend (12 months)
    const monthlyTrend = useMemo(() => {
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const m = d.getMonth(), y = d.getFullYear();
            const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
            const curAmt = incomes.filter(inc => { const id = new Date(inc.income_date); return id.getMonth() === m && id.getFullYear() === y; }).reduce((s, inc) => s + Number(inc.amount), 0);
            const prvAmt = prevYear.filter(inc => { const id = new Date(inc.income_date); return id.getMonth() === m && id.getFullYear() === y - 0; }).reduce((s, inc) => s + Number(inc.amount), 0); // won't match but included for shape
            months.push({ label, curAmt, prvAmt });
        }
        return months;
    }, [incomes, prevYear]);

    // ── Filters ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...incomes];
        if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter(i => i.description.toLowerCase().includes(q) || (i.reference_number || '').toLowerCase().includes(q) || i.source.toLowerCase().includes(q)); }
        if (filterSource) list = list.filter(i => i.source === filterSource);
        if (filterMethod) list = list.filter(i => i.payment_method === filterMethod);
        if (filterMonth)  list = list.filter(i => i.income_date.startsWith(filterMonth));
        if (sortBy === 'date_desc') list.sort((a, b) => b.income_date.localeCompare(a.income_date));
        if (sortBy === 'date_asc')  list.sort((a, b) => a.income_date.localeCompare(b.income_date));
        if (sortBy === 'amt_desc')  list.sort((a, b) => b.amount - a.amount);
        if (sortBy === 'amt_asc')   list.sort((a, b) => a.amount - b.amount);
        return list;
    }, [incomes, searchTerm, filterSource, filterMethod, filterMonth, sortBy]);

    const getSourceConfig = (name: string) => SOURCES.find(s => s.name === name) || SOURCES[SOURCES.length - 1];

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!form.description || !form.amount || !form.source) { toast.error('Fill required fields'); return; }
        const payload = {
            income_date: form.income_date, source: form.source,
            description: form.description.trim(), amount: Number(form.amount),
            payment_method: form.payment_method, reference_number: form.reference_number || null,
            received_by: form.received_by || null, notes: form.notes || null, year: currentYear,
        };
        if (editingId) {
            const { error } = await supabase.from('school_income').update(payload).eq('id', editingId);
            if (error) { toast.error('Update failed'); return; }
            toast.success('✅ Income updated!');
        } else {
            const { error } = await supabase.from('school_income').insert([payload]);
            if (error) { toast.error('Failed to record income'); return; }
            toast.success('✅ Income recorded!');
        }
        setShowModal(false); setEditingId(null); setForm(blankForm); fetchData();
    };

    const openEdit = (inc: Income) => {
        setEditingId(inc.id);
        setForm({ income_date: inc.income_date, source: inc.source, description: inc.description, amount: String(inc.amount), payment_method: inc.payment_method, reference_number: inc.reference_number || '', received_by: inc.received_by || '', notes: inc.notes || '', grant_type: '' });
        setShowModal(true);
    };

    const deleteIncome = async (id: number) => {
        if (!confirm('Delete this income entry?')) return;
        await supabase.from('school_income').delete().eq('id', id);
        toast.success('Deleted'); fetchData();
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    const exportData = async () => {
        const tid = toast.loading('Generating export…');
        try {
            let xlsxLib: any = null;
            try { xlsxLib = await import('xlsx'); } catch { /* CSV fallback */ }
            if (xlsxLib) {
                const XLSX = xlsxLib;
                const wb = XLSX.utils.book_new();
                // Sheet 1: All income
                const wsData = [
                    [`${schoolName} — Income Report ${currentYear}`],
                    [`Generated: ${new Date().toLocaleDateString('en-KE')} | Total: ${fmt(total)}`],
                    [],
                    ['#', 'Date', 'Source', 'Description', 'Amount (KES)', 'Method', 'Reference', 'Received By'],
                    ...filtered.map((i, idx) => [idx + 1, i.income_date, i.source, i.description, Number(i.amount), i.payment_method, i.reference_number || '-', i.received_by || '-']),
                    ['TOTALS', '', '', `${filtered.length} entries`, filtered.reduce((s, i) => s + Number(i.amount), 0)],
                ];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 20 }, { wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
                ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
                XLSX.utils.book_append_sheet(wb, ws, 'Income Ledger');
                // Sheet 2: Source summary
                const ws2 = XLSX.utils.aoa_to_sheet([['Source', 'Transactions', 'Total (KES)', '% of Revenue'], ...sourceTotals.map(s => [s.name, s.count, s.total, `${pct(s.total, total)}%`]), ['TOTAL', incomes.length, total, '100%']]);
                XLSX.utils.book_append_sheet(wb, ws2, 'By Source');
                XLSX.writeFile(wb, `${schoolName.replace(/\s+/g, '_')}_Income_${currentYear}.xlsx`);
                toast.dismiss(tid); toast.success('✅ Excel exported!');
            } else {
                const csv = ['Date,Source,Description,Amount,Method,Reference', ...filtered.map(i => `${i.income_date},"${i.source}","${i.description}",${i.amount},${i.payment_method},${i.reference_number || ''}`)].join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Income_${currentYear}.csv`; a.click();
                toast.dismiss(tid); toast.success('✅ CSV exported!');
            }
        } catch (err: any) { toast.dismiss(tid); toast.error(`Export failed: ${err.message}`); }
    };

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(currentYear, i, 1);
        return { value: `${currentYear}-${String(i + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'long' }) };
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>📈</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-emerald-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Income Records…</p>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ═══ HERO HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#34d399,transparent 70%)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                <FiTrendingUp className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white">📈 Income & Revenue</h1>
                                <p className="text-white/50 text-xs mt-0.5">{schoolName} · Financial Year {currentYear} · {incomes.length} entries</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { fetchData(); toast.success('Refreshed!'); }} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><FiRefreshCw size={15} /></button>
                            <button onClick={exportData} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"><FiDownload size={14} />Export</button>
                            <button onClick={() => { setEditingId(null); setForm(blankForm); setShowModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                <FiPlus size={15} />Record Income
                            </button>
                        </div>
                    </div>
                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Revenue', value: fmt(total), emoji: '💰', color: '#10b981' },
                            { label: 'Fee Collections', value: fmt(feesTotal), emoji: '🏫', color: '#3b82f6' },
                            { label: 'Govt Grants', value: fmt(grantsTotal), emoji: '🏛️', color: '#059669' },
                            { label: 'Donations', value: fmt(donationsTotal), emoji: '🤝', color: '#7c3aed' },
                            { label: 'M-Pesa Received', value: fmt(mpesaTotal), emoji: '📱', color: '#06b6d4' },
                            { label: 'This Month', value: fmt(thisMonthAmt), emoji: '📅', color: '#f59e0b' },
                        ].map((c, i) => (
                            <div key={i} className="relative rounded-xl p-3 overflow-hidden group transition-all hover:scale-[1.02]"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20" style={{ background: c.color, transform: 'translate(30%,-30%)' }} />
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="text-sm">{c.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                                </div>
                                <p className="text-sm font-black text-white leading-tight truncate">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* YoY comparison */}
            {totalPrev > 0 && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${yoyChange >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    {yoyChange >= 0
                        ? <FiArrowUp className="text-emerald-600 flex-shrink-0" size={18} />
                        : <FiArrowDown className="text-red-600 flex-shrink-0" size={18} />}
                    <div>
                        <p className={`text-sm font-bold ${yoyChange >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                            Year-on-Year: {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}% vs {currentYear - 1}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{currentYear}: {fmt(total)} &nbsp;|&nbsp; {currentYear - 1}: {fmt(totalPrev)}</p>
                    </div>
                </div>
            )}

            {/* ═══ CHARTS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">📈 Monthly Revenue Trend (12 Months)</p>
                    <div style={{ height: 240 }}>
                        <Line data={{
                            labels: monthlyTrend.map(m => m.label),
                            datasets: [{
                                label: 'Revenue (KES)', data: monthlyTrend.map(m => m.curAmt),
                                borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
                                fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10b981',
                            }]
                        }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `KES ${(v / 1000).toFixed(0)}k` } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Revenue by Source</p>
                    {sourceTotals.length > 0 ? (
                        <div style={{ height: 240 }}>
                            <Doughnut data={{
                                labels: sourceTotals.map(s => `${s.emoji} ${s.name}`),
                                datasets: [{ data: sourceTotals.map(s => s.total), backgroundColor: sourceTotals.map(s => s.color), borderWidth: 0 }]
                            }} options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 8 } } } }} />
                        </div>
                    ) : <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">No data yet</div>}
                </div>
            </div>

            {/* ═══ SOURCE BREAKDOWN TABLE ═══ */}
            {sourceTotals.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue Source Breakdown</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['Source', 'Transactions', 'Total Amount', '% Revenue', 'Share'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {sourceTotals.map((s, i) => (
                                    <tr key={s.name} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-2 font-bold text-gray-800">
                                                <span>{s.emoji}</span>{s.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-semibold">{s.count}</td>
                                        <td className="px-4 py-3 font-black text-emerald-700">{fmt(s.total)}</td>
                                        <td className="px-4 py-3 font-bold" style={{ color: s.color }}>{pct(s.total, total)}%</td>
                                        <td className="px-4 py-3 w-48">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct(s.total, total)}%`, backgroundColor: s.color }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                                    <td className="px-4 py-3 font-black text-emerald-800">TOTAL</td>
                                    <td className="px-4 py-3 font-black text-emerald-800">{incomes.length}</td>
                                    <td className="px-4 py-3 font-black text-emerald-700 text-base">{fmt(total)}</td>
                                    <td className="px-4 py-3 font-black text-emerald-800">100%</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ GOVT GRANTS TRACKER ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">🏛️ Government Funding Tracker</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { name: 'FDSE (Free Day Secondary)', received: incomes.filter(i => i.source === 'Government Grants').reduce((s, i) => s + Number(i.amount), 0), expected: 0, color: '#059669' },
                        { name: 'NG-CDF Grants', received: incomes.filter(i => i.source === 'CDF').reduce((s, i) => s + Number(i.amount), 0), expected: 0, color: '#0891b2' },
                        { name: 'Donations & Bursaries', received: incomes.filter(i => i.source === 'Donations').reduce((s, i) => s + Number(i.amount), 0), expected: 0, color: '#7c3aed' },
                    ].map(g => (
                        <div key={g.name} className="p-4 rounded-xl border" style={{ borderColor: g.color + '33', backgroundColor: g.color + '08' }}>
                            <p className="text-xs font-bold text-gray-600 mb-2">{g.name}</p>
                            <p className="text-xl font-black" style={{ color: g.color }}>{fmt(g.received)}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{incomes.filter(i => ['Government Grants', 'CDF', 'Donations'].includes(i.source)).length} disbursements received</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ FILTERS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setFiltersOpen(o => !o)} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-2.5">
                        <FiFilter size={15} className="text-emerald-500" />
                        <span className="text-sm font-bold text-gray-700">Filters & Search</span>
                    </div>
                    {filtersOpen ? <FiChevronUp size={15} className="text-gray-400" /> : <FiChevronDown size={15} className="text-gray-400" />}
                </button>
                {filtersOpen && (
                    <div className="px-5 pb-5 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="relative lg:col-span-2">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search description, source, reference…"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 transition-all" />
                            </div>
                            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                <option value="">All Sources</option>
                                {SOURCES.map(s => <option key={s.name} value={s.name}>{s.emoji} {s.name}</option>)}
                            </select>
                            <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                <option value="">All Methods</option>
                                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                <option value="">All Months</option>
                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                <option value="date_desc">Date ↓ (Newest)</option>
                                <option value="date_asc">Date ↑ (Oldest)</option>
                                <option value="amt_desc">Amount ↓</option>
                                <option value="amt_asc">Amount ↑</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ INCOME TABLE ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {filtered.length} Entries · <span className="text-emerald-600">{fmt(filtered.reduce((s, i) => s + Number(i.amount), 0))}</span>
                    </p>
                </div>
                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <span className="text-5xl mb-3 block">📈</span>
                        <p className="font-bold text-gray-600">No income records found</p>
                        <p className="text-sm mt-1">Try adjusting filters or record income</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Source', 'Description', 'Amount', 'Method', 'Reference', 'Received By', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filtered.map((inc, i) => {
                                    const src = getSourceConfig(inc.source);
                                    return (
                                        <tr key={inc.id} className={`border-b border-gray-50 hover:bg-emerald-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                            <td className="px-4 py-3 text-xs text-gray-400 font-bold">{i + 1}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-semibold">
                                                {new Date(inc.income_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap"
                                                    style={{ backgroundColor: src.color + '15', color: src.color, borderColor: src.color + '44' }}>
                                                    {src.emoji} {inc.source}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-800 max-w-[220px]"><p className="truncate text-sm">{inc.description}</p></td>
                                            <td className="px-4 py-3 font-black text-emerald-700 whitespace-nowrap">{fmt(Number(inc.amount))}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{inc.payment_method}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">{inc.reference_number || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{inc.received_by || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => openEdit(inc)} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"><FiEdit2 size={13} /></button>
                                                    <button onClick={() => deleteIncome(inc.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"><FiTrash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                                    <td colSpan={4} className="px-4 py-3 text-sm font-black text-emerald-800">TOTALS ({filtered.length} entries)</td>
                                    <td className="px-4 py-3 font-black text-emerald-700 text-base">{fmt(filtered.reduce((s, i) => s + Number(i.amount), 0))}</td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ ADD / EDIT MODAL ═══ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            <div className="flex items-center gap-3">
                                <FiTrendingUp size={18} className="text-white" />
                                <div>
                                    <p className="text-base font-black text-white">{editingId ? '✏️ Edit Income' : '➕ Record Income'}</p>
                                    <p className="text-white/60 text-[10px]">All income sources</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Date *</label>
                                    <input type="date" value={form.income_date} onChange={e => setForm({ ...form, income_date: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Source *</label>
                                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                        {SOURCES.map(s => <option key={s.name} value={s.name}>{s.emoji} {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Description *</label>
                                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Describe this income…"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Amount (KES) *</label>
                                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Payment Method</label>
                                    <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all">
                                        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Reference Number</label>
                                    <input type="text" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-300 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Received By</label>
                                    <input type="text" value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} placeholder="Name of receiver"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all" />
                                </div>
                            </div>
                            {['Government Grants', 'CDF'].includes(form.source) && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Grant Type / Disbursement Reference</label>
                                    <input type="text" value={form.grant_type} onChange={e => setForm({ ...form, grant_type: e.target.value })} placeholder="e.g. FDSE Term 1 2024, NG-CDF Q1…"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 transition-all" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 transition-all" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-black text-white transition" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                    {editingId ? '✅ Update Income' : '📈 Record Income'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

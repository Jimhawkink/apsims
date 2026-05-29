'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiTrash2, FiX, FiSearch, FiDownload, FiRefreshCw,
    FiCheck, FiXCircle, FiEdit2, FiFilter, FiDollarSign,
    FiTrendingDown, FiCalendar, FiAlertTriangle, FiSend,
    FiMessageSquare, FiChevronDown, FiChevronUp, FiPrinter,
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Expense {
    id: number; expense_date: string; category_id: number; description: string;
    amount: number; payment_method: string; reference_number?: string;
    approved_by?: string; notes?: string; year: number;
    status?: 'pending' | 'approved' | 'rejected';
}
interface Category { id: number; category_name: string; icon: string; budget_amount?: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);
const monthKey = (d: Date) => d.toLocaleString('en', { month: 'short', year: '2-digit' });
const METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'RTGS', 'EFT', 'Mobile Banking'];

const STATUS_CONFIG = {
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
    rejected: { label: 'Rejected', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

function StatusBadge({ status }: { status?: string }) {
    const s = STATUS_CONFIG[(status as keyof typeof STATUS_CONFIG) || 'approved'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
}

// ─── Notification helper ───────────────────────────────────────────────────────
async function notifyApproval(type: 'approved' | 'rejected', expense: Expense, catName: string, principalPhone?: string) {
    if (!principalPhone) return;
    const action = type === 'approved' ? 'APPROVED ✅' : 'REJECTED ❌';
    const msg = `APSIMS Expense ${action}: ${expense.description} — ${fmt(expense.amount)} [${catName}] on ${new Date(expense.expense_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}. Ref: ${expense.reference_number || 'N/A'} — APSIMS Finance`;
    try {
        await Promise.allSettled([
            fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: principalPhone, message: msg }) }),
            fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: principalPhone, message: msg }) }),
        ]);
    } catch { /* silent */ }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [principalPhone, setPrincipalPhone] = useState('');
    const [schoolName, setSchoolName] = useState('School');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amt_desc' | 'amt_asc'>('date_desc');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const blankForm = {
        expense_date: new Date().toISOString().split('T')[0], category_id: '',
        description: '', amount: '', payment_method: 'Cash',
        reference_number: `EXP-${Date.now().toString().slice(-6)}`,
        approved_by: '', notes: '', status: 'approved',
    };
    const [form, setForm] = useState<Record<string, string>>(blankForm);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: exp }, { data: cats }, { data: school }] = await Promise.all([
            supabase.from('school_expenses').select('*').eq('year', currentYear).order('expense_date', { ascending: false }),
            supabase.from('school_expense_categories').select('*').order('category_name'),
            supabase.from('school_details').select('school_name, principal_phone, phone').limit(1).single(),
        ]);
        setExpenses((exp || []) as Expense[]);
        setCategories(cats || []);
        setPrincipalPhone(school?.principal_phone || school?.phone || '');
        setSchoolName(school?.school_name || 'School');
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Analytics ──────────────────────────────────────────────────────────────
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const approved = expenses.filter(e => (e.status || 'approved') === 'approved');
    const pending  = expenses.filter(e => e.status === 'pending');
    const rejected = expenses.filter(e => e.status === 'rejected');
    const totalApproved = approved.reduce((s, e) => s + Number(e.amount), 0);
    const totalPending  = pending.reduce((s, e) => s + Number(e.amount), 0);

    const thisMonthAmt = expenses.filter(e => {
        const d = new Date(e.expense_date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthAmt = expenses.filter(e => {
        const d = new Date(e.expense_date);
        const lm = currentMonth === 0 ? 11 : currentMonth - 1;
        const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === lm && d.getFullYear() === ly;
    }).reduce((s, e) => s + Number(e.amount), 0);

    const avgPerTx = expenses.length > 0 ? total / expenses.length : 0;

    const catTotals = useMemo(() => categories.map(c => ({
        ...c,
        total: expenses.filter(e => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [categories, expenses]);
    const topCat = catTotals[0];

    // Monthly trend (last 12 months)
    const monthlyTrend = useMemo(() => {
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const m = d.getMonth(), y = d.getFullYear();
            const amt = expenses.filter(e => { const ed = new Date(e.expense_date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + Number(e.amount), 0);
            months.push({ label: monthKey(d), amt });
        }
        return months;
    }, [expenses]);

    // ── Filters ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...expenses];
        if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter(e => e.description.toLowerCase().includes(q) || (e.reference_number || '').toLowerCase().includes(q)); }
        if (filterCat) list = list.filter(e => String(e.category_id) === filterCat);
        if (filterStatus) list = list.filter(e => (e.status || 'approved') === filterStatus);
        if (filterMonth) list = list.filter(e => e.expense_date.startsWith(filterMonth));
        if (sortBy === 'date_desc') list.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
        if (sortBy === 'date_asc')  list.sort((a, b) => a.expense_date.localeCompare(b.expense_date));
        if (sortBy === 'amt_desc')  list.sort((a, b) => b.amount - a.amount);
        if (sortBy === 'amt_asc')   list.sort((a, b) => a.amount - b.amount);
        return list;
    }, [expenses, searchTerm, filterCat, filterStatus, filterMonth, sortBy]);

    const getCat = (id: number) => categories.find(c => c.id === id);

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!form.description || !form.amount || !form.category_id) { toast.error('Fill required fields'); return; }
        const payload = {
            expense_date: form.expense_date, category_id: Number(form.category_id),
            description: form.description.trim(), amount: Number(form.amount),
            payment_method: form.payment_method, reference_number: form.reference_number || null,
            approved_by: form.approved_by || null, notes: form.notes || null,
            year: currentYear, status: form.status || 'approved',
        };
        if (editingId) {
            const { error } = await supabase.from('school_expenses').update(payload).eq('id', editingId);
            if (error) { toast.error('Update failed'); return; }
            toast.success('✅ Expense updated!');
        } else {
            const { error } = await supabase.from('school_expenses').insert([payload]);
            if (error) { toast.error('Failed to add expense'); return; }
            toast.success('✅ Expense recorded!');
        }
        setShowModal(false); setEditingId(null); setForm(blankForm); fetchData();
    };

    const openEdit = (e: Expense) => {
        setEditingId(e.id);
        setForm({
            expense_date: e.expense_date, category_id: String(e.category_id),
            description: e.description, amount: String(e.amount),
            payment_method: e.payment_method, reference_number: e.reference_number || '',
            approved_by: e.approved_by || '', notes: e.notes || '', status: e.status || 'approved',
        });
        setShowModal(true);
    };

    const deleteExpense = async (id: number) => {
        if (!confirm('Delete this expense record?')) return;
        await supabase.from('school_expenses').delete().eq('id', id);
        toast.success('Deleted'); fetchData();
    };

    const updateStatus = async (expense: Expense, status: 'approved' | 'rejected') => {
        const { error } = await supabase.from('school_expenses').update({ status }).eq('id', expense.id);
        if (error) { toast.error('Failed to update status'); return; }
        const catName = getCat(expense.category_id)?.category_name || '';
        toast.success(`${status === 'approved' ? '✅ Approved' : '❌ Rejected'}!`);
        notifyApproval(status, expense, catName, principalPhone);
        fetchData();
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
                const headers = ['#', 'Date', 'Category', 'Description', 'Amount (KES)', 'Method', 'Reference', 'Approved By', 'Status'];
                const rows = filtered.map((e, i) => [i + 1, e.expense_date, getCat(e.category_id)?.category_name || '-', e.description, Number(e.amount), e.payment_method, e.reference_number || '-', e.approved_by || '-', e.status || 'approved']);
                const wsData = [[`${schoolName} — Expenses Report ${currentYear}`], [`Generated: ${new Date().toLocaleDateString('en-KE')} | Total: ${fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}`], [], headers, ...rows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 20 }, { wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
                ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
                XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
                XLSX.writeFile(wb, `${schoolName.replace(/\s+/g, '_')}_Expenses_${currentYear}.xlsx`);
                toast.dismiss(tid); toast.success('✅ Excel exported!');
            } else {
                const csv = ['Date,Category,Description,Amount,Method,Reference,Status', ...filtered.map(e => `${e.expense_date},"${getCat(e.category_id)?.category_name || ''}","${e.description}",${e.amount},${e.payment_method},${e.reference_number || ''},${e.status || 'approved'}`)].join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Expenses_${currentYear}.csv`; a.click();
                toast.dismiss(tid); toast.success('✅ CSV exported!');
            }
        } catch (err: any) { toast.dismiss(tid); toast.error(`Export failed: ${err.message}`); }
    };

    // Month options for filter
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(currentYear, i, 1);
        return { value: `${currentYear}-${String(i + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'long' }) };
    });

    const CHART_COLORS = ['#6366f1','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#ec4899','#f97316','#14b8a6','#6366f1'];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>📉</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-red-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Expenses…</p>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ═══ HERO HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#ef4444,transparent 70%)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                <FiTrendingDown className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white">📉 Expenses Management</h1>
                                <p className="text-white/50 text-xs mt-0.5">{schoolName} · Financial Year {currentYear} · {expenses.length} transactions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition" title="Refresh"><FiRefreshCw size={15} /></button>
                            <button onClick={exportData} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"><FiDownload size={14} />Export</button>
                            <button onClick={() => { setEditingId(null); setForm(blankForm); setShowModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition"
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                <FiPlus size={15} />Add Expense
                            </button>
                        </div>
                    </div>
                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Expenses', value: fmt(total), emoji: '📉', color: '#ef4444' },
                            { label: 'This Month', value: fmt(thisMonthAmt), emoji: '📅', color: '#f97316' },
                            { label: 'Last Month', value: fmt(lastMonthAmt), emoji: '🗓️', color: '#f59e0b' },
                            { label: 'Top Category', value: topCat?.category_name || '—', emoji: topCat?.icon || '📦', color: '#8b5cf6' },
                            { label: 'Avg / Transaction', value: fmt(avgPerTx), emoji: '📊', color: '#06b6d4' },
                            { label: 'Pending Approval', value: pending.length.toString(), emoji: '⏳', color: '#d97706', pulse: pending.length > 0 },
                        ].map((c, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden group transition-all hover:scale-[1.02] ${c.pulse ? 'ring-1 ring-amber-400/40' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20" style={{ background: c.color, transform: 'translate(30%,-30%)' }} />
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="text-sm">{c.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                                </div>
                                <p className="text-sm font-black text-white leading-tight truncate">{c.value}</p>
                                {c.pulse && <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pending approval alert */}
            {pending.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                    <FiAlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">{pending.length} expense{pending.length > 1 ? 's' : ''} awaiting approval — {fmt(totalPending)} pending</p>
                        <p className="text-xs text-amber-600 mt-0.5">Review and approve or reject below</p>
                    </div>
                    <button onClick={() => setFilterStatus('pending')} className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-600 text-white hover:bg-amber-700 transition">Review</button>
                </div>
            )}

            {/* ═══ CHARTS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FiTrendingDown className="text-red-500" />Monthly Spending Trend (12 months)
                    </p>
                    <div style={{ height: 240 }}>
                        <Line data={{
                            labels: monthlyTrend.map(m => m.label),
                            datasets: [{
                                label: 'Expenses (KES)', data: monthlyTrend.map(m => m.amt),
                                borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
                                fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#ef4444',
                            }]
                        }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `KES ${(v / 1000).toFixed(0)}k` } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Category Breakdown</p>
                    {catTotals.length > 0 ? (
                        <div style={{ height: 240 }}>
                            <Doughnut data={{
                                labels: catTotals.map(c => `${c.icon} ${c.category_name}`),
                                datasets: [{ data: catTotals.map(c => c.total), backgroundColor: CHART_COLORS, borderWidth: 0 }]
                            }} options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 8 } } } }} />
                        </div>
                    ) : <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">No data</div>}
                </div>
            </div>

            {/* Category budget vs actual horizontal bars */}
            {catTotals.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Category Spending vs Budget</p>
                    <div className="space-y-3">
                        {catTotals.slice(0, 8).map((c, i) => {
                            const budget = c.budget_amount || 0;
                            const pct = budget > 0 ? Math.min(100, Math.round((c.total / budget) * 100)) : 0;
                            const overBudget = budget > 0 && c.total > budget;
                            return (
                                <div key={c.id} className="flex items-center gap-3">
                                    <span className="text-lg w-6 flex-shrink-0">{c.icon}</span>
                                    <div className="w-36 flex-shrink-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{c.category_name}</p>
                                        <p className="text-[10px] text-gray-400">{fmt(c.total)}</p>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                                        <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (c.total / (total || 1)) * 100 * 4)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    </div>
                                    <span className="text-xs font-black text-gray-600 w-16 text-right">{Math.round((c.total / (total || 1)) * 100)}%</span>
                                    {overBudget && <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">OVER</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ FILTERS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setFiltersOpen(o => !o)} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-2.5">
                        <FiFilter size={15} className="text-red-500" />
                        <span className="text-sm font-bold text-gray-700">Filters & Search</span>
                        {(searchTerm || filterCat || filterStatus || filterMonth) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">Active</span>
                        )}
                    </div>
                    {filtersOpen ? <FiChevronUp size={15} className="text-gray-400" /> : <FiChevronDown size={15} className="text-gray-400" />}
                </button>
                {filtersOpen && (
                    <div className="px-5 pb-5 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="relative lg:col-span-2">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search description, reference…"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all" />
                            </div>
                            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.category_name}</option>)}
                            </select>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                <option value="">All Statuses</option>
                                <option value="approved">✅ Approved</option>
                                <option value="pending">⏳ Pending</option>
                                <option value="rejected">❌ Rejected</option>
                            </select>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                <option value="">All Months</option>
                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                <option value="date_desc">Date ↓ (Newest)</option>
                                <option value="date_asc">Date ↑ (Oldest)</option>
                                <option value="amt_desc">Amount ↓ (Highest)</option>
                                <option value="amt_asc">Amount ↑ (Lowest)</option>
                            </select>
                            {(searchTerm || filterCat || filterStatus || filterMonth) && (
                                <button onClick={() => { setSearchTerm(''); setFilterCat(''); setFilterStatus(''); setFilterMonth(''); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
                                    <FiX size={13} />Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ TABLE ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {filtered.length} Records · Total: <span className="text-red-600">{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}</span>
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="text-emerald-600">✅ Approved: {fmt(filtered.filter(e => (e.status || 'approved') === 'approved').reduce((s, e) => s + Number(e.amount), 0))}</span>
                        {pending.length > 0 && <span className="text-amber-600">⏳ Pending: {fmt(filtered.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0))}</span>}
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <span className="text-5xl mb-3 block">📉</span>
                        <p className="font-bold text-gray-600">No expenses found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {['#', 'Date', 'Category', 'Description', 'Amount', 'Method', 'Reference', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, i) => {
                                    const cat = getCat(e.category_id);
                                    const status = (e.status || 'approved') as 'approved' | 'pending' | 'rejected';
                                    return (
                                        <tr key={e.id} className={`border-b border-gray-50 hover:bg-red-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                            <td className="px-4 py-3 text-xs text-gray-400 font-bold">{i + 1}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-semibold">
                                                {new Date(e.expense_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                                    {cat?.icon} {cat?.category_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-800 max-w-[200px]">
                                                <p className="truncate text-sm">{e.description}</p>
                                                {e.approved_by && <p className="text-[10px] text-gray-400 mt-0.5">By: {e.approved_by}</p>}
                                            </td>
                                            <td className="px-4 py-3 font-black text-red-600 whitespace-nowrap">{fmt(Number(e.amount))}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{e.payment_method}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">{e.reference_number || '—'}</td>
                                            <td className="px-4 py-3"><StatusBadge status={status} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {status === 'pending' && (
                                                        <>
                                                            <button onClick={() => updateStatus(e, 'approved')} title="Approve"
                                                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"><FiCheck size={13} /></button>
                                                            <button onClick={() => updateStatus(e, 'rejected')} title="Reject"
                                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"><FiXCircle size={13} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => openEdit(e)} title="Edit"
                                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"><FiEdit2 size={13} /></button>
                                                    <button onClick={() => deleteExpense(e.id)} title="Delete"
                                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"><FiTrash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 border-t-2 border-gray-300">
                                    <td colSpan={4} className="px-4 py-3 text-sm font-black text-gray-700">TOTALS ({filtered.length} records)</td>
                                    <td className="px-4 py-3 font-black text-red-700">{fmt(filtered.reduce((s, e) => s + Number(e.amount), 0))}</td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ ADD/EDIT MODAL ═══ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                            <div className="flex items-center gap-3">
                                <FiTrendingDown size={18} className="text-white" />
                                <div>
                                    <p className="text-base font-black text-white">{editingId ? '✏️ Edit Expense' : '➕ Add Expense'}</p>
                                    <p className="text-white/60 text-[10px]">Fill in all required fields</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Date *</label>
                                    <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Category *</label>
                                    <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.category_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Description *</label>
                                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
                                    placeholder="Describe this expense…"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Amount (KES) *</label>
                                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Payment Method</label>
                                    <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Reference Number</label>
                                    <input type="text" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-red-300 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Approved By</label>
                                    <input type="text" value={form.approved_by} onChange={e => setForm({ ...form, approved_by: e.target.value })}
                                        placeholder="Approver name"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300 transition-all">
                                    <option value="approved">✅ Approved</option>
                                    <option value="pending">⏳ Pending Approval</option>
                                    <option value="rejected">❌ Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-red-300 transition-all" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-black text-white transition" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                    {editingId ? '✅ Update Expense' : '📉 Record Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    function fetchAll() { fetchData(); toast.success('Refreshed!'); }
}

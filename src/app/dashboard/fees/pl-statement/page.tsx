'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertTriangle, FiPlus, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtShort = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const INCOME_CATS = ['School Fees', 'Capitation Grant', 'CDF Grant', 'Government Bursary', 'County Bursary', 'NGO/Donor Grants', 'Hiring Income', 'Canteen Income', 'Uniform Sales', 'Book Sales', 'Other Income'];
const EXPENSE_CATS = ['Teaching Staff Salaries', 'Non-Teaching Staff Salaries', 'NSSF', 'NHIF', 'PAYE', 'Housing Levy', 'Electricity & Water', 'Telephone & Internet', 'Fuel & Transport', 'Stationery & Printing', 'Repairs & Maintenance', 'Cleaning & Sanitation', 'Kitchen Provisions', 'Sports & Co-Curricular', 'Medical & First Aid', 'Furniture & Equipment', 'Books & Library', 'Bank Charges', 'Audit Fees', 'Advertisement', 'Petty Cash Expenses', 'Depreciation', 'Other Expenses'];

type PLEntry = { id?: number; entry_type: 'Income' | 'Expense'; category: string; description?: string; amount: number; academic_year?: string; term?: string; notes?: string; created_at?: string; };
const emptyEntry = (type: 'Income' | 'Expense' = 'Income'): PLEntry => ({ entry_type: type, category: type === 'Income' ? 'School Fees' : 'Teaching Staff Salaries', description: '', amount: 0, academic_year: new Date().getFullYear().toString(), term: 'Annual', notes: '' });

function StatCard({ label, value, sub, icon, color, textColor }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className={`text-lg font-extrabold ${textColor || 'text-gray-800'} truncate`}>{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function PLStatementPage() {
    const [entries, setEntries] = useState<PLEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'Income' | 'Expense'>('Income');
    const [editing, setEditing] = useState<PLEntry | null>(null);
    const [form, setForm] = useState<PLEntry>(emptyEntry());
    const [filterYear, setFilterYear] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_pl_statement').select('*').order('entry_type').order('category');
        if (error) toast.error('Failed to load P&L data');
        setEntries(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const years = useMemo(() => [...new Set(entries.map(e => e.academic_year).filter(Boolean))].sort().reverse() as string[], [entries]);

    const filtered = useMemo(() => {
        return entries.filter(e => {
            if (filterYear && e.academic_year !== filterYear) return false;
            if (filterTerm && e.term !== filterTerm) return false;
            return true;
        });
    }, [entries, filterYear, filterTerm]);

    const income = useMemo(() => filtered.filter(e => e.entry_type === 'Income'), [filtered]);
    const expenses = useMemo(() => filtered.filter(e => e.entry_type === 'Expense'), [filtered]);
    const totalIncome = useMemo(() => income.reduce((s, e) => s + Number(e.amount || 0), 0), [income]);
    const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
    const netSurplus = totalIncome - totalExpenses;

    const incomeByCategory = useMemo(() => {
        const g: Record<string, number> = {};
        for (const e of income) g[e.category] = (g[e.category] || 0) + Number(e.amount || 0);
        return g;
    }, [income]);
    const expenseByCategory = useMemo(() => {
        const g: Record<string, number> = {};
        for (const e of expenses) g[e.category] = (g[e.category] || 0) + Number(e.amount || 0);
        return g;
    }, [expenses]);

    const openAdd = (type: 'Income' | 'Expense') => { setModalType(type); setEditing(null); setForm(emptyEntry(type)); setShowModal(true); };
    const openEdit = (e: PLEntry) => { setEditing(e); setModalType(e.entry_type); setForm({ ...e }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); };

    const handleSave = async () => {
        if (!form.category) { toast.error('Select category'); return; }
        setSaving(true);
        const payload = { entry_type: form.entry_type, category: form.category, description: form.description, amount: Number(form.amount || 0), academic_year: form.academic_year, term: form.term, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_pl_statement').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_pl_statement').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Entry added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_pl_statement').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Type', 'Category', 'Description', 'Amount (KES)', 'Year', 'Term']];
        filtered.forEach(e => rows.push([e.entry_type, e.category, e.description || '', String(e.amount), e.academic_year || '', e.term || '']));
        rows.push(['', 'TOTAL INCOME', '', String(totalIncome), '', '']);
        rows.push(['', 'TOTAL EXPENSES', '', String(totalExpenses), '', '']);
        rows.push(['', 'NET SURPLUS/(DEFICIT)', '', String(netSurplus), '', '']);
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `pl_statement_${filterYear || 'all'}.csv`; a.click();
        toast.success('Exported!');
    };

    const printStatement = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>P&L Statement</title><style>
        @page{size:A4;margin:15mm} body{font-family:Arial,sans-serif;font-size:12px;color:#111}
        h1{text-align:center;font-size:18px;margin-bottom:4px} .sub{text-align:center;color:#666;font-size:11px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th{background:#1e3a5f;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
        td{padding:6px 10px;border-bottom:1px solid #eee}
        .section-header{background:#f0f4ff;font-weight:bold;font-size:11px;text-transform:uppercase;color:#1e3a5f;padding:8px 10px}
        .total-row{background:#e8f4e8;font-weight:bold} .deficit{background:#fee2e2;font-weight:bold}
        .grand-total{background:#1e3a5f;color:#fff;font-weight:bold;font-size:13px}
        .amount{text-align:right} .right{text-align:right}
        </style></head><body>
        <h1>APSIMS — Profit & Loss Statement</h1>
        <p class="sub">${filterYear || 'All Years'} ${filterTerm || ''} | Generated: ${new Date().toLocaleDateString('en-KE')}</p>
        <table><thead><tr><th>Category</th><th>Description</th><th class="right">Amount (KES)</th></tr></thead><tbody>
        <tr><td colspan="3" class="section-header">INCOME</td></tr>
        ${Object.entries(incomeByCategory).map(([cat, amt]) => `<tr><td>${cat}</td><td></td><td class="amount">${amt.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="2">TOTAL INCOME</td><td class="amount">${totalIncome.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td colspan="3" class="section-header">EXPENSES</td></tr>
        ${Object.entries(expenseByCategory).map(([cat, amt]) => `<tr><td>${cat}</td><td></td><td class="amount">${amt.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="2">TOTAL EXPENSES</td><td class="amount">${totalExpenses.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
        <tr class="${netSurplus >= 0 ? 'grand-total' : 'deficit'}"><td colspan="2">NET ${netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'}</td><td class="amount">${netSurplus.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
        </tbody></table></body></html>`);
        setTimeout(() => w.print(), 400);
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading P&L data...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiTrendingUp size={18} /></span>
                        P&amp;L Statement
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Profit &amp; Loss — Income vs Expenses &bull; Surplus/(Deficit) &bull; By Term/Year</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={printStatement} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={() => openAdd('Income')} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiPlus size={14} /> Add Income</button>
                    <button onClick={() => openAdd('Expense')} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}><FiPlus size={14} /> Add Expense</button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Terms</option><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length} entries</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Income" value={fmtShort(totalIncome)} icon={<FiTrendingUp size={18} />} color="linear-gradient(135deg,#059669,#047857)" textColor="text-emerald-700" />
                <StatCard label="Total Expenses" value={fmtShort(totalExpenses)} icon={<FiTrendingDown size={18} />} color="linear-gradient(135deg,#dc2626,#b91c1c)" textColor="text-red-600" />
                <StatCard label={netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit'} value={fmtShort(Math.abs(netSurplus))} icon={<FiDollarSign size={18} />} color={netSurplus >= 0 ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'linear-gradient(135deg,#ea580c,#c2410c)'} textColor={netSurplus >= 0 ? 'text-blue-700' : 'text-orange-600'} />
                <StatCard label="Expense Ratio" value={totalIncome > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}%` : 'N/A'} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#7c3aed,#5b21b6)" sub={totalIncome > 0 && totalExpenses / totalIncome > 0.8 ? '⚠️ High expenses!' : 'Healthy'} />
            </div>

            {/* Main P&L Table - Two panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* INCOME */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
                        <span className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2"><FiTrendingUp size={14} /> INCOME</span>
                        <span className="font-extrabold text-emerald-100">{fmt(totalIncome)}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.entries(incomeByCategory).length === 0 && <div className="py-8 text-center text-gray-400 text-sm"><p>No income entries</p><button onClick={() => openAdd('Income')} className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600">+ Add Income</button></div>}
                        {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                            const catEntries = income.filter(e => e.category === cat);
                            return (
                                <div key={cat} className="px-4 py-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-800">{cat}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-700">{fmt(amt)}</span>
                                            <button onClick={() => openAdd('Income')} className="p-1 rounded bg-emerald-50 text-emerald-600 text-xs"><FiPlus size={11} /></button>
                                        </div>
                                    </div>
                                    {catEntries.length > 1 && <p className="text-xs text-gray-400 mt-0.5">{catEntries.length} entries</p>}
                                    {catEntries.map(e => (
                                        <div key={e.id} className="flex items-center justify-between mt-1 pl-2 text-xs text-gray-500">
                                            <span>{e.description || e.category}</span>
                                            <div className="flex items-center gap-1">
                                                <span>{fmt(e.amount)}</span>
                                                <button onClick={() => openEdit(e)} className="p-0.5 rounded text-amber-500"><FiEdit2 size={10} /></button>
                                                <button onClick={() => setDeleteId(e.id!)} className="p-0.5 rounded text-red-400"><FiTrash2 size={10} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Bar */}
                                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: totalIncome > 0 ? `${(amt / totalIncome) * 100}%` : '0%' }} /></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="px-4 py-3 bg-emerald-50 border-t-2 border-emerald-300 flex justify-between">
                        <span className="font-extrabold text-emerald-800 text-sm uppercase">TOTAL INCOME</span>
                        <span className="font-extrabold text-emerald-700 text-lg">{fmt(totalIncome)}</span>
                    </div>
                </div>

                {/* EXPENSES */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-red-700 px-4 py-3 flex items-center justify-between">
                        <span className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2"><FiTrendingDown size={14} /> EXPENSES</span>
                        <span className="font-extrabold text-red-100">{fmt(totalExpenses)}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.entries(expenseByCategory).length === 0 && <div className="py-8 text-center text-gray-400 text-sm"><p>No expense entries</p><button onClick={() => openAdd('Expense')} className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600">+ Add Expense</button></div>}
                        {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                            const catEntries = expenses.filter(e => e.category === cat);
                            return (
                                <div key={cat} className="px-4 py-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-800">{cat}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-red-600">{fmt(amt)}</span>
                                            <button onClick={() => openAdd('Expense')} className="p-1 rounded bg-red-50 text-red-500 text-xs"><FiPlus size={11} /></button>
                                        </div>
                                    </div>
                                    {catEntries.length > 1 && <p className="text-xs text-gray-400 mt-0.5">{catEntries.length} entries</p>}
                                    {catEntries.map(e => (
                                        <div key={e.id} className="flex items-center justify-between mt-1 pl-2 text-xs text-gray-500">
                                            <span>{e.description || e.category}</span>
                                            <div className="flex items-center gap-1">
                                                <span>{fmt(e.amount)}</span>
                                                <button onClick={() => openEdit(e)} className="p-0.5 rounded text-amber-500"><FiEdit2 size={10} /></button>
                                                <button onClick={() => setDeleteId(e.id!)} className="p-0.5 rounded text-red-400"><FiTrash2 size={10} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: totalExpenses > 0 ? `${(amt / totalExpenses) * 100}%` : '0%' }} /></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="px-4 py-3 bg-red-50 border-t-2 border-red-300 flex justify-between">
                        <span className="font-extrabold text-red-800 text-sm uppercase">TOTAL EXPENSES</span>
                        <span className="font-extrabold text-red-700 text-lg">{fmt(totalExpenses)}</span>
                    </div>
                </div>
            </div>

            {/* NET SURPLUS / DEFICIT */}
            <div className={`rounded-xl p-5 border-2 ${netSurplus >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">NET {netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'}</p>
                        <p className={`text-3xl font-extrabold ${netSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(Math.abs(netSurplus))}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {netSurplus >= 0 ? `School earned ${fmt(netSurplus)} more than it spent` : `School spent ${fmt(Math.abs(netSurplus))} more than it earned`}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-[10px] font-bold text-gray-500 uppercase">Income</p><p className="font-extrabold text-emerald-700">{fmt(totalIncome)}</p></div>
                        <div><p className="text-[10px] font-bold text-gray-500 uppercase">Expenses</p><p className="font-extrabold text-red-600">{fmt(totalExpenses)}</p></div>
                        <div><p className="text-[10px] font-bold text-gray-500 uppercase">Margin</p><p className={`font-extrabold ${netSurplus >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{totalIncome > 0 ? `${((netSurplus / totalIncome) * 100).toFixed(1)}%` : 'N/A'}</p></div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Entry' : `Add ${modalType}`}</h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button onClick={() => { setModalType('Income'); setForm(f => ({ ...f, entry_type: 'Income', category: 'School Fees' })); }} className={`flex-1 py-2 rounded-xl font-bold text-sm ${form.entry_type === 'Income' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Income</button>
                                    <button onClick={() => { setModalType('Expense'); setForm(f => ({ ...f, entry_type: 'Expense', category: 'Teaching Staff Salaries' })); }} className={`flex-1 py-2 rounded-xl font-bold text-sm ${form.entry_type === 'Expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Expense</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">
                                        {(form.entry_type === 'Income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label><input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Term 1 school fees collection..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label><input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                                </div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className={`flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 ${form.entry_type === 'Income' ? 'bg-emerald-600' : 'bg-red-600'}`}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Entry?</h3><p className="text-center text-sm text-gray-400 mb-4">This P&L entry will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

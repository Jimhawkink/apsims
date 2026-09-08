'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiBarChart2, FiPlus, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

type BSEntry = {
    id?: number; section: string; subsection?: string; item_name: string;
    amount: number; academic_year?: string; term?: string; notes?: string; created_at?: string;
};

const SECTIONS = ['Fixed Assets', 'Current Assets', 'Current Liabilities', 'Long-term Liabilities', 'Capital & Reserves'];
const SUBSECTIONS: Record<string, string[]> = {
    'Fixed Assets': ['Land & Buildings', 'Furniture & Equipment', 'Motor Vehicles', 'Computers & Electronics', 'Other Fixed Assets'],
    'Current Assets': ['Cash at Hand', 'Cash at Bank', 'School Fees Receivable', 'Capitation Receivable', 'Prepaid Expenses', 'Inventory/Stores', 'Other Current Assets'],
    'Current Liabilities': ['Accounts Payable', 'PAYE Payable', 'NHIF Payable', 'NSSF Payable', 'Accrued Expenses', 'Student Fee Deposits', 'Other Current Liabilities'],
    'Long-term Liabilities': ['Bank Loans', 'Government Grants (Deferred)', 'Other Long-term Liabilities'],
    'Capital & Reserves': ['School Fund/Capital', 'Retained Surplus', 'Development Fund', 'Reserves'],
};

const SECTION_COLORS: Record<string, string> = {
    'Fixed Assets': '#1e40af',
    'Current Assets': '#0369a1',
    'Current Liabilities': '#b91c1c',
    'Long-term Liabilities': '#9f1239',
    'Capital & Reserves': '#4f46e5',
};

const emptyEntry = (): BSEntry => ({ section: 'Current Assets', subsection: 'Cash at Hand', item_name: '', amount: 0, academic_year: new Date().getFullYear().toString(), term: 'Annual', notes: '' });

export default function BalanceSheetPage() {
    const [entries, setEntries] = useState<BSEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<BSEntry | null>(null);
    const [form, setForm] = useState<BSEntry>(emptyEntry());
    const [filterYear, setFilterYear] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_balance_sheet').select('*').order('section').order('item_name');
        if (error) toast.error('Failed to load balance sheet');
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

    const grouped = useMemo(() => {
        const g: Record<string, BSEntry[]> = {};
        for (const e of filtered) {
            if (!g[e.section]) g[e.section] = [];
            g[e.section].push(e);
        }
        return g;
    }, [filtered]);

    const totals = useMemo(() => {
        const fixedAssets = (grouped['Fixed Assets'] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const currentAssets = (grouped['Current Assets'] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const currentLiabilities = (grouped['Current Liabilities'] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const longTermLiabilities = (grouped['Long-term Liabilities'] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const capital = (grouped['Capital & Reserves'] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalAssets = fixedAssets + currentAssets;
        const totalLiabilities = currentLiabilities + longTermLiabilities;
        const netAssets = totalAssets - totalLiabilities;
        const balanced = Math.abs(netAssets - capital) < 1;
        return { fixedAssets, currentAssets, currentLiabilities, longTermLiabilities, capital, totalAssets, totalLiabilities, netAssets, balanced };
    }, [grouped]);

    const openAdd = () => { setEditing(null); setForm(emptyEntry()); setShowModal(true); };
    const openEdit = (e: BSEntry) => { setEditing(e); setForm({ ...e }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyEntry()); };

    const handleSave = async () => {
        if (!form.item_name) { toast.error('Enter item name'); return; }
        setSaving(true);
        const payload = { section: form.section, subsection: form.subsection, item_name: form.item_name, amount: Number(form.amount || 0), academic_year: form.academic_year, term: form.term, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_balance_sheet').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_balance_sheet').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Entry added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_balance_sheet').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Section', 'Subsection', 'Item', 'Amount (KES)', 'Year', 'Term']];
        filtered.forEach(e => rows.push([e.section, e.subsection || '', e.item_name, String(e.amount), e.academic_year || '', e.term || '']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `balance_sheet_${filterYear || 'all'}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-blue-800 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading balance sheet...</p></div></div>;

    const SectionBlock = ({ section }: { section: string }) => {
        const items = grouped[section] || [];
        const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);
        return (
            <div className="mb-1">
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: `${SECTION_COLORS[section]}15` }}>
                    <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: SECTION_COLORS[section] }}>{section}</span>
                </div>
                {items.length === 0 && <div className="px-4 py-2 text-xs text-gray-400 italic">No entries. <button onClick={openAdd} className="underline">Add item</button></div>}
                {items.map(e => (
                    <div key={e.id} className="px-4 py-2 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50 group">
                        <div>
                            <p className="text-sm font-medium text-gray-800">{e.item_name}</p>
                            {e.subsection && <p className="text-xs text-gray-400">{e.subsection}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-700">{fmt(e.amount)}</span>
                            <div className="hidden group-hover:flex gap-1">
                                <button onClick={() => openEdit(e)} className="p-1 rounded bg-amber-50 text-amber-600"><FiEdit2 size={11} /></button>
                                <button onClick={() => setDeleteId(e.id!)} className="p-1 rounded bg-red-50 text-red-500"><FiTrash2 size={11} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                <div className="px-4 py-2 flex justify-between items-center bg-gray-50 border-t border-gray-200">
                    <span className="text-xs font-extrabold text-gray-600 uppercase">Total {section}</span>
                    <span className="font-extrabold" style={{ color: SECTION_COLORS[section] }}>{fmt(total)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#1d4ed8)' }}><FiBarChart2 size={18} /></span>
                        Balance Sheet
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Assets &bull; Liabilities &bull; Capital &bull; Net Position &bull; KRA Compliance</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={() => window.print()} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#1d4ed8)' }}>
                        <FiPlus size={16} /> Add Item
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Terms</option><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length} entries</span>
            </div>

            {/* Balance Sheet — Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT — Assets */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-900 px-4 py-3 flex items-center justify-between">
                        <span className="font-extrabold text-white text-sm uppercase tracking-wider">ASSETS</span>
                        <span className="font-extrabold text-blue-200 text-sm">{fmt(totals.totalAssets)}</span>
                    </div>
                    <SectionBlock section="Fixed Assets" />
                    <div className="px-4 py-2 flex justify-between items-center bg-blue-900/10 border-t-2 border-blue-900">
                        <span className="text-xs font-extrabold text-blue-900 uppercase">TOTAL FIXED ASSETS</span>
                        <span className="font-extrabold text-blue-900">{fmt(totals.fixedAssets)}</span>
                    </div>
                    <SectionBlock section="Current Assets" />
                    <div className="px-4 py-3 flex justify-between items-center bg-blue-900/10 border-t-2 border-blue-900">
                        <span className="text-xs font-extrabold text-blue-900 uppercase">TOTAL CURRENT ASSETS</span>
                        <span className="font-extrabold text-blue-900">{fmt(totals.currentAssets)}</span>
                    </div>
                    <div className="px-4 py-4 flex justify-between items-center bg-blue-900">
                        <span className="font-extrabold text-white uppercase tracking-wider">TOTAL ASSETS</span>
                        <span className="text-xl font-extrabold text-white">{fmt(totals.totalAssets)}</span>
                    </div>
                </div>

                {/* RIGHT — Liabilities + Capital */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-red-900 px-4 py-3 flex items-center justify-between">
                        <span className="font-extrabold text-white text-sm uppercase tracking-wider">LIABILITIES &amp; CAPITAL</span>
                        <span className="font-extrabold text-red-200 text-sm">{fmt(totals.totalLiabilities + totals.capital)}</span>
                    </div>
                    <SectionBlock section="Current Liabilities" />
                    <div className="px-4 py-2 flex justify-between items-center bg-red-50 border-t-2 border-red-700">
                        <span className="text-xs font-extrabold text-red-700 uppercase">TOTAL CURRENT LIABILITIES</span>
                        <span className="font-extrabold text-red-700">{fmt(totals.currentLiabilities)}</span>
                    </div>
                    <SectionBlock section="Long-term Liabilities" />
                    <div className="px-4 py-2 flex justify-between items-center bg-red-50 border-t-2 border-red-700">
                        <span className="text-xs font-extrabold text-red-700 uppercase">TOTAL LONG-TERM LIABILITIES</span>
                        <span className="font-extrabold text-red-700">{fmt(totals.longTermLiabilities)}</span>
                    </div>
                    <SectionBlock section="Capital & Reserves" />
                    <div className="px-4 py-4 flex justify-between items-center bg-red-900">
                        <span className="font-extrabold text-white uppercase tracking-wider">TOTAL LIAB. &amp; CAPITAL</span>
                        <span className="text-xl font-extrabold text-white">{fmt(totals.totalLiabilities + totals.capital)}</span>
                    </div>
                </div>
            </div>

            {/* Net Position Summary */}
            <div className={`rounded-xl p-5 border-2 ${totals.balanced ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Assets</p><p className="text-lg font-extrabold text-blue-700">{fmt(totals.totalAssets)}</p></div>
                    <div className="text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Liabilities</p><p className="text-lg font-extrabold text-red-600">{fmt(totals.totalLiabilities)}</p></div>
                    <div className="text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">Net Assets</p><p className={`text-lg font-extrabold ${totals.netAssets >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(totals.netAssets)}</p></div>
                    <div className="text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">Status</p><p className={`text-sm font-extrabold ${totals.balanced ? 'text-emerald-700' : 'text-red-700'}`}>{totals.balanced ? '✅ BALANCED' : '⚠️ NOT BALANCED'}</p></div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Item' : 'Add Balance Sheet Item'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Section *</label>
                                    <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value, subsection: SUBSECTIONS[e.target.value]?.[0] }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{SECTIONS.map(s => <option key={s}>{s}</option>)}</select>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subsection</label>
                                    <select value={form.subsection} onChange={e => setForm(f => ({ ...f, subsection: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{(SUBSECTIONS[form.section] || []).map(s => <option key={s}>{s}</option>)}</select>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name *</label><input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Cash at KCB Bank, School Bus..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Year</label><input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                                </div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#1e40af,#1d4ed8)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Item?</h3><p className="text-center text-sm text-gray-400 mb-4">This balance sheet entry will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

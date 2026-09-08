'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiDollarSign, FiTrendingUp, FiTrendingDown, FiX, FiSave, FiPrinter } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const CATEGORIES = ['Stationery', 'Meals/Tea', 'Transport', 'Repairs', 'Utilities', 'Office Supplies', 'Postage', 'Other'];
const TYPES = ['Expense', 'Receipt', 'Opening Balance'];
const TYPE_COLORS: Record<string, string> = { Expense: 'bg-red-100 text-red-700', Receipt: 'bg-emerald-100 text-emerald-700', 'Opening Balance': 'bg-blue-100 text-blue-700' };

type Entry = { id?: number; date: string; description: string; type: string; amount: number; category?: string; reference?: string; approved_by?: string; balance?: number; created_by?: string; created_at?: string; };

const emptyEntry = (): Entry => ({ date: new Date().toISOString().split('T')[0], description: '', type: 'Expense', amount: 0, category: 'Stationery', reference: '', approved_by: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function PettyCashPage() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Entry | null>(null);
    const [form, setForm] = useState<Entry>(emptyEntry());
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_petty_cash').select('*').order('date', { ascending: false }).order('id', { ascending: false });
        if (error) toast.error('Failed to load petty cash');
        setEntries(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return entries.filter(e => {
            if (filterType && e.type !== filterType) return false;
            if (filterCat && e.category !== filterCat) return false;
            if (q && !e.description.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [entries, search, filterType, filterCat]);

    // Running balance computed client-side
    const withBalance = useMemo(() => {
        const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.id || 0) - (b.id || 0));
        let running = 0;
        const map: Record<number, number> = {};
        for (const e of sorted) {
            if (e.type === 'Expense') running -= Number(e.amount || 0);
            else running += Number(e.amount || 0);
            if (e.id) map[e.id] = running;
        }
        return map;
    }, [entries]);

    const stats = useMemo(() => {
        const receipts = entries.filter(e => e.type !== 'Expense').reduce((s, e) => s + Number(e.amount || 0), 0);
        const expenses = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + Number(e.amount || 0), 0);
        return { receipts, expenses, balance: receipts - expenses, count: entries.length };
    }, [entries]);

    const openAdd = () => { setEditing(null); setForm(emptyEntry()); setShowModal(true); };
    const openEdit = (e: Entry) => { setEditing(e); setForm({ ...e }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyEntry()); };

    const handleSave = async () => {
        if (!form.description) { toast.error('Enter description'); return; }
        if (!form.amount) { toast.error('Enter amount'); return; }
        setSaving(true);
        const payload = { date: form.date, description: form.description, type: form.type, amount: Number(form.amount), category: form.category, reference: form.reference, approved_by: form.approved_by, created_by: form.created_by };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_petty_cash').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_petty_cash').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Entry added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_petty_cash').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Date', 'Description', 'Type', 'Category', 'Amount', 'Reference', 'Approved By']];
        filtered.forEach(e => rows.push([e.date, e.description, e.type, e.category || '', String(e.amount), e.reference || '', e.approved_by || '']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `petty_cash_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading petty cash...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}><FiDollarSign size={18} /></span>
                        Petty Cash / Cash Book
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Daily cash in/out &bull; Running balance &bull; Approval tracking</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                        <FiPlus size={16} /> New Entry
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Cash In" value={fmt(stats.receipts)} icon={<FiTrendingUp size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Cash Out" value={fmt(stats.expenses)} icon={<FiTrendingDown size={18} />} color="linear-gradient(135deg,#ef4444,#dc2626)" />
                <StatCard label="Closing Balance" value={fmt(stats.balance)} icon={<FiDollarSign size={18} />} color={stats.balance >= 0 ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#ef4444,#dc2626)'} />
                <StatCard label="Total Entries" value={String(stats.count)} icon={<FiSearch size={18} />} color="linear-gradient(135deg,#f97316,#ea580c)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, ref..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="">All Types</option>{TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} entries</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">{['Date', 'Description', 'Category', 'Type', 'Amount', 'Running Balance', 'Reference', 'Approved By', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-400"><FiDollarSign size={28} className="mx-auto mb-2 text-gray-300" /><p>No entries yet</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>Add First Entry</button></td></tr>}
                            {filtered.map(e => {
                                const bal = e.id ? withBalance[e.id] : undefined;
                                return (
                                    <tr key={e.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{e.description}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{e.category || '\u2014'}</td>
                                        <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${TYPE_COLORS[e.type] || 'bg-gray-100 text-gray-600'}`}>{e.type}</span></td>
                                        <td className={`px-4 py-3 font-bold ${e.type === 'Expense' ? 'text-red-600' : 'text-emerald-600'}`}>{e.type === 'Expense' ? '-' : '+'}{fmt(e.amount)}</td>
                                        <td className={`px-4 py-3 font-extrabold ${bal !== undefined ? (bal >= 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-400'}`}>{bal !== undefined ? fmt(bal) : '\u2014'}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-indigo-600">{e.reference || '\u2014'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{e.approved_by || '\u2014'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                                <button onClick={() => setDeleteId(e.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td colSpan={4} className="px-4 py-3 font-extrabold text-gray-600 text-sm">TOTALS ({filtered.length})</td>
                                <td className="px-4 py-3 font-extrabold">
                                    <span className="text-emerald-600">+{fmt(filtered.filter(e => e.type !== 'Expense').reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
                                    {' / '}
                                    <span className="text-red-600">-{fmt(filtered.filter(e => e.type === 'Expense').reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
                                </td>
                                <td colSpan={4}></td>
                            </tr></tfoot>
                        )}
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Entry' : 'New Petty Cash Entry'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type *</label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400">{TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description *</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was the cash for?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference / Receipt No</label><input value={form.reference || ''} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approved By</label><input value={form.approved_by || ''} onChange={e => setForm(f => ({ ...f, approved_by: e.target.value }))} placeholder="Name of approver" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-orange-400" /></div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                                <FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div>
                        <h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Entry?</h3>
                        <p className="text-center text-sm text-gray-400 mb-4">This petty cash entry will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

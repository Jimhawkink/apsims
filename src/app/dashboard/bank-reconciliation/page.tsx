'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiPlus, FiDownload, FiRefreshCw, FiX, FiEdit2, FiTrash2,
    FiCheckCircle, FiAlertTriangle, FiClock, FiDollarSign,
    FiTrendingUp, FiSearch, FiPrinter,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-all';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const EMPTY_FORM = { bank_name: '', account_number: '', account_name: '', account_type: 'Current', book_balance: '', bank_balance: '', reconciliation_status: 'Pending', notes: '' };

const BANKS = ['KCB', 'Equity', 'Co-operative', 'Absa', 'Standard Chartered', 'NCBA', 'DTB', 'Family Bank', 'Stanbic', 'I&M', 'Other'];

export default function BankReconciliationPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editId, setEditId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('school_bank_accounts').select('*').order('bank_name');
        setAccounts(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openNew = () => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
    const openEdit = (a: any) => {
        setForm({
            bank_name: a.bank_name, account_number: a.account_number,
            account_name: a.account_name || '', account_type: a.account_type,
            book_balance: String(a.book_balance || ''), bank_balance: String(a.bank_balance || ''),
            reconciliation_status: a.reconciliation_status, notes: a.notes || '',
        });
        setEditId(a.id); setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.bank_name.trim()) return toast.error('Bank name is required');
        if (!form.account_number.trim()) return toast.error('Account number is required');
        setSaving(true);
        const payload = {
            ...form,
            book_balance: Number(form.book_balance || 0),
            bank_balance: Number(form.bank_balance || 0),
            last_reconciled_at: form.reconciliation_status === 'Reconciled' ? new Date().toISOString() : null,
        };
        const { error } = editId
            ? await supabase.from('school_bank_accounts').update(payload).eq('id', editId)
            : await supabase.from('school_bank_accounts').insert([payload]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editId ? '✅ Account updated!' : '✅ Bank account added!');
        setShowModal(false); setEditId(null); setForm({ ...EMPTY_FORM });
        fetchAll(); setSaving(false);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const { error } = await supabase.from('school_bank_accounts').delete().eq('id', id);
        if (error) return toast.error(error.message);
        toast.success('Account deleted'); fetchAll();
    };

    const filtered = useMemo(() => {
        let list = accounts;
        if (search) { const q = search.toLowerCase(); list = list.filter(a => (a.bank_name + a.account_number + a.account_name).toLowerCase().includes(q)); }
        if (filterStatus) list = list.filter(a => a.reconciliation_status === filterStatus);
        return list;
    }, [accounts, search, filterStatus]);

    const totalBook = accounts.reduce((s, a) => s + Number(a.book_balance || 0), 0);
    const totalBank = accounts.reduce((s, a) => s + Number(a.bank_balance || 0), 0);
    const totalDiff = totalBank - totalBook;
    const reconciled = accounts.filter(a => a.reconciliation_status === 'Reconciled').length;
    const unreconciled = accounts.filter(a => a.reconciliation_status !== 'Reconciled').length;
    const reconPct = accounts.length > 0 ? Math.round((reconciled / accounts.length) * 100) : 0;

    const statusCfg = (s: string) => ({
        Reconciled: { cls: 'bg-emerald-100 text-emerald-700', icon: FiCheckCircle, dot: 'bg-emerald-500' },
        Pending: { cls: 'bg-amber-100 text-amber-700', icon: FiClock, dot: 'bg-amber-400' },
        Unreconciled: { cls: 'bg-red-100 text-red-700', icon: FiAlertTriangle, dot: 'bg-red-500' },
    }[s] || { cls: 'bg-gray-100 text-gray-600', icon: FiClock, dot: 'bg-gray-400' });

    const exportCSV = () => {
        const rows = [
            ['Bank', 'Account No', 'Account Name', 'Type', 'Book Balance', 'Bank Balance', 'Difference', 'Status', 'Last Reconciled'],
            ...accounts.map(a => {
                const diff = Number(a.bank_balance || 0) - Number(a.book_balance || 0);
                return [a.bank_name, a.account_number, a.account_name || '', a.account_type, a.book_balance || 0, a.bank_balance || 0, diff, a.reconciliation_status, a.last_reconciled_at ? new Date(a.last_reconciled_at).toLocaleDateString('en-KE') : ''];
            })
        ].map(r => r.join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
        a.download = `bank_reconciliation_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    <FiDollarSign className="absolute inset-0 m-auto text-emerald-500" size={18} />
                </div>
                <p className="text-sm font-semibold text-gray-500">Loading bank accounts…</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ── Premium Header ── */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #10b981 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-black flex items-center gap-2">🔄 Bank Reconciliation</h1>
                            <p className="text-emerald-200 text-sm mt-0.5">Match book balances with bank statements · identify discrepancies</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                                <FiDownload size={13} /> Export
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                                <FiPrinter size={13} /> Print
                            </button>
                            <button onClick={fetchAll} className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition">
                                <FiRefreshCw size={14} />
                            </button>
                            <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-black shadow-lg hover:shadow-xl transition">
                                <FiPlus size={14} /> Add Account
                            </button>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { label: 'Book Balance', val: fmt(totalBook), color: '#86efac' },
                            { label: 'Bank Balance', val: fmt(totalBank), color: '#a5b4fc' },
                            { label: 'Difference', val: fmt(Math.abs(totalDiff)), color: totalDiff === 0 ? '#86efac' : '#fca5a5' },
                            { label: 'Reconciled', val: `${reconciled} / ${accounts.length}`, color: '#86efac' },
                            { label: 'Recon. Rate', val: `${reconPct}%`, color: reconPct === 100 ? '#86efac' : reconPct >= 50 ? '#fcd34d' : '#fca5a5' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white/10 rounded-xl p-3">
                                <p className="text-emerald-200 text-[10px] font-bold uppercase">{k.label}</p>
                                <p className="font-black text-lg mt-1 truncate" style={{ color: k.color }}>{k.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Reconciliation progress bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-emerald-200 mb-1">
                            <span>Reconciliation Progress</span>
                            <span>{reconPct}%</span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${reconPct}%`, background: 'linear-gradient(90deg, #34d399, #10b981)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Alert if unreconciled ── */}
            {unreconciled > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <FiAlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">
                            {unreconciled} account{unreconciled !== 1 ? 's' : ''} pending reconciliation
                        </p>
                        <p className="text-xs text-amber-600">Update book and bank balances then mark as Reconciled.</p>
                    </div>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <FiSearch size={13} className="text-gray-400 flex-shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search bank, account no..." className="text-sm outline-none bg-transparent flex-1" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="">All Statuses</option>
                    <option>Reconciled</option>
                    <option>Pending</option>
                    <option>Unreconciled</option>
                </select>
                <span className="text-xs text-gray-400">{filtered.length} accounts</span>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🏦 Bank Accounts</p>
                    <span className="text-xs text-gray-400">{accounts.length} total</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                        <thead>
                            <tr>
                                {['Bank', 'Account No', 'Account Name', 'Type', 'Book Balance', 'Bank Balance', 'Difference', 'Last Reconciled', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                        style={{ background: '#f0fdf4', color: '#065f46', borderBottom: '2px solid #bbf7d0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={10} className="px-4 py-16 text-center">
                                    <p className="text-3xl mb-3">🏦</p>
                                    <p className="font-semibold text-gray-500">No bank accounts yet</p>
                                    <button onClick={openNew} className="mt-3 px-4 py-2 text-sm font-bold text-white rounded-xl"
                                        style={{ background: 'linear-gradient(135deg,#10b981,#065f46)' }}>
                                        Add First Account
                                    </button>
                                </td></tr>
                            ) : filtered.map(a => {
                                const diff = Number(a.bank_balance || 0) - Number(a.book_balance || 0);
                                const scfg = statusCfg(a.reconciliation_status);
                                const StatusIcon = scfg.icon;
                                return (
                                    <tr key={a.id} className="hover:bg-emerald-50/20 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-black flex-shrink-0">
                                                    {a.bank_name?.charAt(0)}
                                                </div>
                                                <span className="font-bold text-gray-800">{a.bank_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 bg-blue-50/50">
                                            {a.account_number}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{a.account_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                {a.account_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-700">{fmt(a.book_balance)}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-700">{fmt(a.bank_balance)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`font-black text-sm ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {diff === 0 ? '✓ Balanced' : `${diff > 0 ? '+' : ''}${fmt(diff)}`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {a.last_reconciled_at
                                                ? new Date(a.last_reconciled_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${scfg.cls}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                                                {a.reconciliation_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => openEdit(a)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                                    <FiEdit2 size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(a.id, a.bank_name)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid #d1fae5', background: '#f0fdf4' }}>
                                    <td className="px-4 py-3 font-black text-emerald-800 text-xs" colSpan={4}>TOTALS</td>
                                    <td className="px-4 py-3 font-black text-gray-800 text-xs">{fmt(totalBook)}</td>
                                    <td className="px-4 py-3 font-black text-gray-800 text-xs">{fmt(totalBank)}</td>
                                    <td className={`px-4 py-3 font-black text-sm ${totalDiff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {totalDiff === 0 ? '✓ Balanced' : fmt(totalDiff)}
                                    </td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, #064e3b, #10b981)' }}>
                            <h2 className="text-lg font-bold text-white">
                                {editId ? 'Edit Bank Account' : 'Add Bank Account'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div>
                                <label className={lbl}>Bank Name *</label>
                                <select value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className={inp}>
                                    <option value="">-- Select Bank --</option>
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Account Number *</label>
                                <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })}
                                    className={inp} placeholder="e.g. 1120123456" />
                            </div>
                            <div>
                                <label className={lbl}>Account Name</label>
                                <input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })}
                                    className={inp} placeholder="School official name" />
                            </div>
                            <div>
                                <label className={lbl}>Account Type</label>
                                <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} className={inp}>
                                    <option>Current</option>
                                    <option>Savings</option>
                                    <option>M-Pesa</option>
                                    <option>Fixed Deposit</option>
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Book Balance (KES)</label>
                                <input type="number" value={form.book_balance} onChange={e => setForm({ ...form, book_balance: e.target.value })}
                                    className={inp} placeholder="0" />
                            </div>
                            <div>
                                <label className={lbl}>Bank Balance (KES)</label>
                                <input type="number" value={form.bank_balance} onChange={e => setForm({ ...form, bank_balance: e.target.value })}
                                    className={inp} placeholder="0" />
                            </div>
                            <div>
                                <label className={lbl}>Reconciliation Status</label>
                                <select value={form.reconciliation_status} onChange={e => setForm({ ...form, reconciliation_status: e.target.value })} className={inp}>
                                    <option>Pending</option>
                                    <option>Reconciled</option>
                                    <option>Unreconciled</option>
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Notes</label>
                                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className={inp} placeholder="Optional notes..." />
                            </div>
                            {/* Live difference preview */}
                            {form.book_balance && form.bank_balance && (
                                <div className="col-span-2 p-3 rounded-xl border" style={{
                                    background: Math.abs(Number(form.bank_balance) - Number(form.book_balance)) === 0 ? '#f0fdf4' : '#fef2f2',
                                    borderColor: Math.abs(Number(form.bank_balance) - Number(form.book_balance)) === 0 ? '#bbf7d0' : '#fecaca',
                                }}>
                                    <p className="text-xs font-bold text-gray-600">Difference Preview</p>
                                    <p className={`text-xl font-black mt-1 ${Number(form.bank_balance) - Number(form.book_balance) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {fmt(Number(form.bank_balance) - Number(form.book_balance))}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#10b981,#065f46)' }}>
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
                                {editId ? 'Update Account' : 'Add Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiBarChart2, FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch } from 'react-icons/fi';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Account categories for a school trial balance
const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const ACCOUNT_CATEGORIES: Record<string, string[]> = {
    Asset: ['Current Asset', 'Fixed Asset', 'Cash & Bank', 'Receivables', 'Prepayments'],
    Liability: ['Current Liability', 'Long-term Liability', 'Payables', 'Deferred Income'],
    Equity: ['Capital', 'Retained Earnings', 'Reserves'],
    Income: ['School Fees', 'Capitation', 'Grants', 'Other Income'],
    Expense: ['Staff Costs', 'Utilities', 'Stationery', 'Repairs', 'Transport', 'Other Expense'],
};

type Account = { id?: number; account_code: string; account_name: string; account_type: string; account_category?: string; debit_balance: number; credit_balance: number; academic_year?: string; term?: string; notes?: string; created_at?: string; };
const emptyAccount = (): Account => ({ account_code: '', account_name: '', account_type: 'Asset', account_category: 'Current Asset', debit_balance: 0, credit_balance: 0, academic_year: new Date().getFullYear().toString(), term: 'Term 1', notes: '' });

export default function TrialBalancePage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [form, setForm] = useState<Account>(emptyAccount());
    const [filterYear, setFilterYear] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_trial_balance').select('*').order('account_type').order('account_code');
        if (error) toast.error('Failed to load trial balance');
        setAccounts(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const years = useMemo(() => [...new Set(accounts.map(a => a.academic_year).filter(Boolean))].sort().reverse() as string[], [accounts]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return accounts.filter(a => {
            if (filterYear && a.academic_year !== filterYear) return false;
            if (filterTerm && a.term !== filterTerm) return false;
            if (q && !a.account_name.toLowerCase().includes(q) && !a.account_code.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [accounts, search, filterYear, filterTerm]);

    const totals = useMemo(() => {
        const totalDebit = filtered.reduce((s, a) => s + Number(a.debit_balance || 0), 0);
        const totalCredit = filtered.reduce((s, a) => s + Number(a.credit_balance || 0), 0);
        const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
        return { totalDebit, totalCredit, balanced };
    }, [filtered]);

    const grouped = useMemo(() => {
        const groups: Record<string, Account[]> = {};
        for (const a of filtered) {
            if (!groups[a.account_type]) groups[a.account_type] = [];
            groups[a.account_type].push(a);
        }
        return groups;
    }, [filtered]);

    const openAdd = () => { setEditing(null); setForm(emptyAccount()); setShowModal(true); };
    const openEdit = (a: Account) => { setEditing(a); setForm({ ...a }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyAccount()); };

    const handleSave = async () => {
        if (!form.account_name) { toast.error('Enter account name'); return; }
        setSaving(true);
        const payload = { account_code: form.account_code, account_name: form.account_name, account_type: form.account_type, account_category: form.account_category, debit_balance: Number(form.debit_balance || 0), credit_balance: Number(form.credit_balance || 0), academic_year: form.academic_year, term: form.term, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_trial_balance').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_trial_balance').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Account added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_trial_balance').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Code', 'Account Name', 'Type', 'Category', 'Debit (KES)', 'Credit (KES)', 'Year', 'Term']];
        filtered.forEach(a => rows.push([a.account_code, a.account_name, a.account_type, a.account_category || '', String(a.debit_balance), String(a.credit_balance), a.academic_year || '', a.term || '']));
        rows.push(['', 'TOTAL', '', '', String(totals.totalDebit), String(totals.totalCredit), '', '']);
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `trial_balance_${filterYear || 'all'}_${filterTerm || 'all'}.csv`; a.click();
        toast.success('Exported!');
    };

    const print = () => window.print();

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-slate-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading trial balance...</p></div></div>;

    const TYPE_COLORS: Record<string, string> = { Asset: 'bg-blue-600', Liability: 'bg-red-500', Equity: 'bg-purple-600', Income: 'bg-emerald-600', Expense: 'bg-orange-500' };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}><FiBarChart2 size={18} /></span>
                        Trial Balance
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">All accounts &bull; Debit &amp; Credit balances &bull; Balanced check &bull; Export to CSV</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={print} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                        <FiPlus size={16} /> Add Account
                    </button>
                </div>
            </div>

            {/* Balanced indicator */}
            <div className={`rounded-xl p-4 flex items-center justify-between ${totals.balanced ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <div>
                    <p className={`text-sm font-extrabold ${totals.balanced ? 'text-emerald-800' : 'text-red-800'}`}>
                        {totals.balanced ? '✅ Trial Balance is BALANCED' : '⚠️ Trial Balance is NOT BALANCED'}
                    </p>
                    <p className={`text-xs mt-0.5 ${totals.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
                        {!totals.balanced && `Difference: KES ${fmt(Math.abs(totals.totalDebit - totals.totalCredit))}`}
                        {totals.balanced && 'Total Debits = Total Credits — accounts are balanced'}
                    </p>
                </div>
                <div className="flex gap-6 text-right">
                    <div><p className="text-[10px] font-bold text-gray-500 uppercase">Total Debit</p><p className="text-lg font-extrabold text-blue-700">KES {fmt(totals.totalDebit)}</p></div>
                    <div><p className="text-[10px] font-bold text-gray-500 uppercase">Total Credit</p><p className="text-lg font-extrabold text-red-700">KES {fmt(totals.totalCredit)}</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search account name/code..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Terms</option><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} accounts</span>
            </div>

            {/* Table grouped by type */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none">
                {/* Print header */}
                <div className="hidden print:block p-4 text-center border-b border-gray-200">
                    <h2 className="text-xl font-extrabold">APSIMS — Trial Balance</h2>
                    <p className="text-sm text-gray-500">{filterYear || 'All Years'} {filterTerm || ''} &bull; Generated {new Date().toLocaleDateString('en-KE')}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Code</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Account Name</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Debit (KES)</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Credit (KES)</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                    <FiBarChart2 size={36} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">No accounts yet</p>
                                    <p className="text-xs mt-1">Add income, expense, asset and liability accounts to build your trial balance</p>
                                    <button onClick={openAdd} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>Add First Account</button>
                                </td></tr>
                            )}
                            {ACCOUNT_TYPES.map(type => {
                                const group = grouped[type];
                                if (!group || group.length === 0) return null;
                                const subtotalDebit = group.reduce((s, a) => s + Number(a.debit_balance || 0), 0);
                                const subtotalCredit = group.reduce((s, a) => s + Number(a.credit_balance || 0), 0);
                                return (
                                    <>
                                        <tr key={`header-${type}`} className="bg-gray-100">
                                            <td colSpan={6} className="px-4 py-2">
                                                <span className={`text-xs font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider ${TYPE_COLORS[type] || 'bg-gray-500'}`}>{type} Accounts</span>
                                            </td>
                                        </tr>
                                        {group.map(a => (
                                            <tr key={a.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                                                <td className="px-4 py-2.5 font-mono text-xs text-indigo-600 font-bold">{a.account_code || '\u2014'}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-800">{a.account_name}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{a.account_category}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-blue-700">{a.debit_balance ? fmt(a.debit_balance) : '\u2014'}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-red-600">{a.credit_balance ? fmt(a.credit_balance) : '\u2014'}</td>
                                                <td className="px-4 py-2.5 print:hidden"><div className="flex gap-1"><button onClick={() => openEdit(a)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={12} /></button><button onClick={() => setDeleteId(a.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={12} /></button></div></td>
                                            </tr>
                                        ))}
                                        <tr key={`sub-${type}`} className="bg-gray-50 border-t border-gray-200">
                                            <td colSpan={3} className="px-4 py-2 font-extrabold text-gray-600 text-xs uppercase">{type} Subtotal</td>
                                            <td className="px-4 py-2 text-right font-extrabold text-blue-700">{fmt(subtotalDebit)}</td>
                                            <td className="px-4 py-2 text-right font-extrabold text-red-600">{fmt(subtotalCredit)}</td>
                                            <td className="print:hidden"></td>
                                        </tr>
                                    </>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-900 text-white">
                                <td colSpan={3} className="px-4 py-4 font-extrabold text-sm uppercase tracking-wider">GRAND TOTAL</td>
                                <td className="px-4 py-4 text-right font-extrabold text-lg">KES {fmt(totals.totalDebit)}</td>
                                <td className="px-4 py-4 text-right font-extrabold text-lg">KES {fmt(totals.totalCredit)}</td>
                                <td className="print:hidden"></td>
                            </tr>
                            <tr className={totals.balanced ? 'bg-emerald-600' : 'bg-red-600'}>
                                <td colSpan={6} className="px-4 py-2 text-center font-extrabold text-white text-sm">
                                    {totals.balanced ? '✅ BALANCED — Total Debits equal Total Credits' : `⚠️ NOT BALANCED — Difference: KES ${fmt(Math.abs(totals.totalDebit - totals.totalCredit))}`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Account' : 'Add Account'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Account Code</label><input value={form.account_code} onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))} placeholder="e.g. 1001" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Account Type</label>
                                    <select value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value, account_category: ACCOUNT_CATEGORIES[e.target.value]?.[0] }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">{ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Account Name *</label><input value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. Cash at Hand, School Fees Receivable..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                                    <select value={form.account_category} onChange={e => setForm(f => ({ ...f, account_category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">{(ACCOUNT_CATEGORIES[form.account_type] || []).map(c => <option key={c}>{c}</option>)}</select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label><input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2024" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Debit Balance (KES)</label><input type="number" value={form.debit_balance} onChange={e => setForm(f => ({ ...f, debit_balance: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Credit Balance (KES)</label><input type="number" value={form.credit_balance} onChange={e => setForm(f => ({ ...f, credit_balance: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option></select>
                                </div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Account?</h3><p className="text-center text-sm text-gray-400 mb-4">This account entry will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

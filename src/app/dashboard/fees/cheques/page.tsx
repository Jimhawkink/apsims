'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiFileText, FiAlertTriangle, FiCheck, FiX, FiSave } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const STATUSES = ['Issued', 'Cleared', 'Bounced', 'Cancelled', 'Stale'];
const STATUS_COLORS: Record<string, string> = { Issued: 'bg-blue-100 text-blue-700', Cleared: 'bg-emerald-100 text-emerald-700', Bounced: 'bg-red-100 text-red-700', Cancelled: 'bg-gray-100 text-gray-600', Stale: 'bg-yellow-100 text-yellow-700' };

type Cheque = { id?: number; cheque_number: string; payee: string; amount: number; issue_date?: string; clearance_date?: string; bank_name?: string; account_number?: string; status: string; purpose?: string; notes?: string; created_at?: string; };
const emptyCheque = (): Cheque => ({ cheque_number: '', payee: '', amount: 0, issue_date: new Date().toISOString().split('T')[0], status: 'Issued', bank_name: '', purpose: '', notes: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function ChequesPage() {
    const [cheques, setCheques] = useState<Cheque[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Cheque | null>(null);
    const [form, setForm] = useState<Cheque>(emptyCheque());
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_cheques').select('*').order('issue_date', { ascending: false });
        if (error) toast.error('Failed to load cheques');
        setCheques(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return cheques.filter(c => {
            if (filterStatus && c.status !== filterStatus) return false;
            if (q && !c.cheque_number.toLowerCase().includes(q) && !c.payee.toLowerCase().includes(q) && !c.purpose?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [cheques, search, filterStatus]);

    const stats = useMemo(() => {
        const issued = cheques.filter(c => c.status === 'Issued').reduce((s, c) => s + Number(c.amount || 0), 0);
        const cleared = cheques.filter(c => c.status === 'Cleared').reduce((s, c) => s + Number(c.amount || 0), 0);
        const bounced = cheques.filter(c => c.status === 'Bounced').length;
        const total = cheques.reduce((s, c) => s + Number(c.amount || 0), 0);
        return { issued, cleared, bounced, total };
    }, [cheques]);

    const openAdd = () => { setEditing(null); setForm(emptyCheque()); setShowModal(true); };
    const openEdit = (c: Cheque) => { setEditing(c); setForm({ ...c }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyCheque()); };

    const handleSave = async () => {
        if (!form.cheque_number) { toast.error('Enter cheque number'); return; }
        if (!form.payee) { toast.error('Enter payee'); return; }
        setSaving(true);
        const payload = { cheque_number: form.cheque_number, payee: form.payee, amount: Number(form.amount), issue_date: form.issue_date || null, clearance_date: form.clearance_date || null, bank_name: form.bank_name, account_number: form.account_number, status: form.status, purpose: form.purpose, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_cheques').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_cheques').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Cheque added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_cheques').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const markCleared = async (c: Cheque) => {
        const { error } = await supabase.from('school_cheques').update({ status: 'Cleared', clearance_date: new Date().toISOString().split('T')[0] }).eq('id', c.id!);
        if (error) toast.error(error.message); else { toast.success('Marked Cleared!'); fetchAll(); }
    };

    const markBounced = async (c: Cheque) => {
        const { error } = await supabase.from('school_cheques').update({ status: 'Bounced' }).eq('id', c.id!);
        if (error) toast.error(error.message); else { toast.success('Marked Bounced!'); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Cheque No', 'Payee', 'Amount', 'Bank', 'Issue Date', 'Clearance Date', 'Status', 'Purpose']];
        filtered.forEach(c => rows.push([c.cheque_number, c.payee, String(c.amount), c.bank_name || '', c.issue_date || '', c.clearance_date || '', c.status, c.purpose || '']));
        const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `cheques_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading cheques...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}><FiFileText size={18} /></span>
                        Cheque Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Issue cheques &bull; Track clearance &bull; Bounced cheque alerts</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                        <FiPlus size={16} /> New Cheque
                    </button>
                </div>
            </div>

            {stats.bounced > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><FiAlertTriangle className="text-red-500 shrink-0" size={20} /><p className="text-sm font-bold text-red-800">{stats.bounced} bounced cheque{stats.bounced > 1 ? 's' : ''} require immediate attention!</p></div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Cheques" value={String(cheques.length)} icon={<FiFileText size={18} />} color="linear-gradient(135deg,#7c3aed,#5b21b6)" sub={`${stats.bounced} bounced`} />
                <StatCard label="Total Value" value={fmt(stats.total)} icon={<FiFileText size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Issued (Uncleared)" value={fmt(stats.issued)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#3b82f6,#2563eb)" />
                <StatCard label="Cleared" value={fmt(stats.cleared)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cheque no, payee..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} cheques</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">{['Cheque No', 'Payee', 'Amount', 'Bank', 'Issued', 'Cleared', 'Status', 'Purpose', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-400"><FiFileText size={28} className="mx-auto mb-2 text-gray-300" /><p>No cheques found</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>Add First Cheque</button></td></tr>}
                            {filtered.map(c => (
                                <tr key={c.id} className={`border-b border-gray-50 hover:bg-violet-50/20 transition-colors ${c.status === 'Bounced' ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-4 py-3 font-mono font-bold text-gray-800">{c.cheque_number}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{c.payee}</td>
                                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(c.amount)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{c.bank_name || '\u2014'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.issue_date || '')}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.clearance_date || '')}</td>
                                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{c.purpose || '\u2014'}</td>
                                    <td className="px-4 py-3"><div className="flex gap-1">
                                        {c.status === 'Issued' && <button onClick={() => markCleared(c)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mark Cleared"><FiCheck size={13} /></button>}
                                        {c.status === 'Issued' && <button onClick={() => markBounced(c)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Mark Bounced"><FiAlertTriangle size={13} /></button>}
                                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                        <button onClick={() => setDeleteId(c.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200"><td colSpan={2} className="px-4 py-3 font-extrabold text-gray-600 text-sm">TOTAL ({filtered.length})</td><td className="px-4 py-3 font-extrabold text-gray-700">{fmt(filtered.reduce((s, c) => s + Number(c.amount || 0), 0))}</td><td colSpan={6}></td></tr></tfoot>}
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Cheque' : 'New Cheque'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cheque Number *</label><input value={form.cheque_number} onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payee *</label><input value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} placeholder="Pay to the order of..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bank Name</label><input value={form.bank_name || ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Account Number</label><input value={form.account_number || ''} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Issue Date</label><input type="date" value={form.issue_date || ''} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Clearance Date</label><input type="date" value={form.clearance_date || ''} onChange={e => setForm(f => ({ ...f, clearance_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Purpose</label><input value={form.purpose || ''} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="What was the payment for?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400 resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Cheque?</h3><p className="text-center text-sm text-gray-400 mb-4">This cheque record will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

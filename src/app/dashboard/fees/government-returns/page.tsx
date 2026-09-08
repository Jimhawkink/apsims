'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiShield, FiAlertTriangle, FiCheck, FiX, FiSave, FiFileText } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const RETURN_TYPES = ['PAYE', 'NHIF', 'NSSF', 'VAT', 'NITA Levy', 'Withholding Tax', 'Housing Levy', 'HELB'];
const STATUSES = ['Pending', 'Filed', 'Paid', 'Overdue', 'Exempted'];
const STATUS_COLORS: Record<string, string> = { Pending: 'bg-yellow-100 text-yellow-700', Filed: 'bg-blue-100 text-blue-700', Paid: 'bg-emerald-100 text-emerald-700', Overdue: 'bg-red-100 text-red-700', Exempted: 'bg-gray-100 text-gray-600' };
const PERIODS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

type Return = { id?: number; return_type: string; period: string; year: string; due_date?: string; filing_date?: string; payment_date?: string; amount_due: number; amount_paid: number; penalty?: number; reference_number?: string; status: string; notes?: string; created_at?: string; };
const emptyReturn = (): Return => ({ return_type: 'PAYE', period: new Date().toLocaleString('default', { month: 'long' }), year: new Date().getFullYear().toString(), amount_due: 0, amount_paid: 0, penalty: 0, status: 'Pending', reference_number: '', notes: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function GovernmentReturnsPage() {
    const [records, setRecords] = useState<Return[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Return | null>(null);
    const [form, setForm] = useState<Return>(emptyReturn());
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_government_returns').select('*').order('year', { ascending: false }).order('id', { ascending: false });
        if (error) toast.error('Failed to load returns');
        // Auto-flag overdue
        const today = new Date();
        const updated = (data || []).map((r: Return) => {
            if (r.due_date && r.status === 'Pending') {
                const due = new Date(r.due_date);
                if (due < today) return { ...r, status: 'Overdue' };
            }
            return r;
        });
        setRecords(updated);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return records.filter(r => {
            if (filterType && r.return_type !== filterType) return false;
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterYear && r.year !== filterYear) return false;
            if (q && !r.return_type.toLowerCase().includes(q) && !r.period.toLowerCase().includes(q) && !r.reference_number?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [records, search, filterType, filterStatus, filterYear]);

    const stats = useMemo(() => {
        const totalDue = records.reduce((s, r) => s + Number(r.amount_due || 0), 0);
        const totalPaid = records.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
        const totalPenalty = records.reduce((s, r) => s + Number(r.penalty || 0), 0);
        const overdue = records.filter(r => r.status === 'Overdue').length;
        return { totalDue, totalPaid, totalPenalty, overdue };
    }, [records]);

    const years = useMemo(() => [...new Set(records.map(r => r.year).filter(Boolean))].sort().reverse(), [records]);

    const openAdd = () => { setEditing(null); setForm(emptyReturn()); setShowModal(true); };
    const openEdit = (r: Return) => { setEditing(r); setForm({ ...r }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyReturn()); };

    const handleSave = async () => {
        if (!form.return_type) { toast.error('Select return type'); return; }
        setSaving(true);
        const payload = { return_type: form.return_type, period: form.period, year: form.year, due_date: form.due_date || null, filing_date: form.filing_date || null, payment_date: form.payment_date || null, amount_due: Number(form.amount_due || 0), amount_paid: Number(form.amount_paid || 0), penalty: Number(form.penalty || 0), reference_number: form.reference_number, status: form.status, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_government_returns').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_government_returns').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Return recorded!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_government_returns').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const markPaid = async (r: Return) => {
        const { error } = await supabase.from('school_government_returns').update({ status: 'Paid', amount_paid: r.amount_due, payment_date: new Date().toISOString().split('T')[0] }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Marked Paid!'); fetchAll(); }
    };

    const markFiled = async (r: Return) => {
        const { error } = await supabase.from('school_government_returns').update({ status: 'Filed', filing_date: new Date().toISOString().split('T')[0] }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Marked Filed!'); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Type', 'Period', 'Year', 'Amount Due', 'Amount Paid', 'Penalty', 'Status', 'Due Date', 'Payment Date', 'Reference']];
        filtered.forEach(r => rows.push([r.return_type, r.period, r.year, String(r.amount_due), String(r.amount_paid), String(r.penalty || 0), r.status, r.due_date || '', r.payment_date || '', r.reference_number || '']));
        const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `govt_returns_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading returns...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)' }}><FiShield size={18} /></span>
                        Government Returns
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">PAYE &bull; NHIF &bull; NSSF &bull; VAT &bull; Housing Levy &bull; HELB &bull; Filing &amp; Payment tracker</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)' }}>
                        <FiPlus size={16} /> New Return
                    </button>
                </div>
            </div>

            {stats.overdue > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><FiAlertTriangle className="text-red-500 shrink-0" size={20} /><p className="text-sm font-bold text-red-800">{stats.overdue} overdue return{stats.overdue > 1 ? 's' : ''} — file immediately to avoid KRA penalties!</p></div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Due" value={fmt(stats.totalDue)} icon={<FiFileText size={18} />} color="linear-gradient(135deg,#e11d48,#be123c)" sub={`${stats.overdue} overdue`} />
                <StatCard label="Total Paid" value={fmt(stats.totalPaid)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Outstanding" value={fmt(stats.totalDue - stats.totalPaid)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Penalties" value={fmt(stats.totalPenalty)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#6b7280,#4b5563)" />
            </div>

            {/* Summary by type */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-sm font-extrabold text-gray-700 mb-3">Summary by Return Type</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {RETURN_TYPES.map(type => {
                        const typeRecords = records.filter(r => r.return_type === type);
                        if (typeRecords.length === 0) return null;
                        const due = typeRecords.reduce((s, r) => s + Number(r.amount_due || 0), 0);
                        const paid = typeRecords.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
                        const hasOverdue = typeRecords.some(r => r.status === 'Overdue');
                        return (
                            <div key={type} className={`rounded-xl p-3 border ${hasOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                                <p className="text-xs font-extrabold text-gray-600 mb-1">{type}</p>
                                <p className="text-sm font-bold text-gray-800">{fmt(due)}</p>
                                <p className="text-xs text-emerald-600">Paid: {fmt(paid)}</p>
                                {hasOverdue && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">OVERDUE</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search type, period, ref..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...RETURN_TYPES].map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...years].map(y => <option key={y} value={y}>{y || 'All Years'}</option>)}</select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} records</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">{['Type', 'Period/Year', 'Amount Due', 'Amount Paid', 'Penalty', 'Due Date', 'Filed', 'Paid', 'Status', 'Reference', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={11} className="py-12 text-center text-gray-400"><FiShield size={28} className="mx-auto mb-2 text-gray-300" /><p>No returns found</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)' }}>Add First Return</button></td></tr>}
                            {filtered.map(r => (
                                <tr key={r.id} className={`border-b border-gray-50 hover:bg-rose-50/20 transition-colors ${r.status === 'Overdue' ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-3 py-3"><span className="text-xs font-extrabold bg-rose-50 text-rose-700 px-2 py-1 rounded-full">{r.return_type}</span></td>
                                    <td className="px-3 py-3 text-xs font-medium text-gray-700">{r.period}<br /><span className="text-gray-400">{r.year}</span></td>
                                    <td className="px-3 py-3 font-bold text-gray-700">{fmt(r.amount_due)}</td>
                                    <td className="px-3 py-3 font-bold text-emerald-600">{fmt(r.amount_paid)}</td>
                                    <td className="px-3 py-3 font-bold text-red-500">{r.penalty ? fmt(r.penalty) : '\u2014'}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{fmtDate(r.due_date || '')}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{fmtDate(r.filing_date || '')}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{fmtDate(r.payment_date || '')}</td>
                                    <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                                    <td className="px-3 py-3 text-xs font-mono text-indigo-600">{r.reference_number || '\u2014'}</td>
                                    <td className="px-3 py-3"><div className="flex gap-1">
                                        {(r.status === 'Pending' || r.status === 'Overdue') && <button onClick={() => markFiled(r)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Mark Filed"><FiFileText size={13} /></button>}
                                        {(r.status === 'Filed' || r.status === 'Pending' || r.status === 'Overdue') && <button onClick={() => markPaid(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mark Paid"><FiCheck size={13} /></button>}
                                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                        <button onClick={() => setDeleteId(r.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Return' : 'New Government Return'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Return Type *</label><select value={form.return_type} onChange={e => setForm(f => ({ ...f, return_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400">{RETURN_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Period</label><select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400">{PERIODS.map(p => <option key={p}>{p}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Year</label><input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Due (KES)</label><input type="number" value={form.amount_due} onChange={e => setForm(f => ({ ...f, amount_due: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Paid (KES)</label><input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Penalty (KES)</label><input type="number" value={form.penalty || ''} onChange={e => setForm(f => ({ ...f, penalty: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date</label><input type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Filing Date</label><input type="date" value={form.filing_date || ''} onChange={e => setForm(f => ({ ...f, filing_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Date</label><input type="date" value={form.payment_date || ''} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference / Receipt No</label><input value={form.reference_number || ''} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400" /></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-rose-400 resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Return?</h3><p className="text-center text-sm text-gray-400 mb-4">This return record will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

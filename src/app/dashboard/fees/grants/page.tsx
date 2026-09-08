'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiDollarSign, FiCheck, FiAlertTriangle, FiX, FiSave, FiTrendingUp } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';
const TYPES = ['CDF', 'County Bursary', 'NGO', 'World Bank', 'UNICEF', 'Government', 'Donor', 'Other'];
const STATUSES = ['Active', 'Completed', 'Suspended', 'Pending'];
const STATUS_COLORS: Record<string, string> = { Active: 'bg-emerald-100 text-emerald-700', Completed: 'bg-blue-100 text-blue-700', Suspended: 'bg-red-100 text-red-700', Pending: 'bg-yellow-100 text-yellow-700' };

type Grant = { id?: number; grant_name: string; donor?: string; grant_type: string; total_amount: number; received_amount: number; disbursed_amount: number; start_date?: string; end_date?: string; status: string; conditions?: string; notes?: string; reference?: string; created_at?: string; };
const emptyGrant = (): Grant => ({ grant_name: '', donor: '', grant_type: 'CDF', total_amount: 0, received_amount: 0, disbursed_amount: 0, status: 'Active', conditions: '', notes: '', reference: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function GrantsPage() {
    const [grants, setGrants] = useState<Grant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Grant | null>(null);
    const [form, setForm] = useState<Grant>(emptyGrant());
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_grants').select('*').order('created_at', { ascending: false });
        if (error) toast.error('Failed to load grants');
        setGrants(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return grants.filter(g => {
            if (filterType && g.grant_type !== filterType) return false;
            if (filterStatus && g.status !== filterStatus) return false;
            if (q && !g.grant_name.toLowerCase().includes(q) && !g.donor?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [grants, search, filterType, filterStatus]);

    const stats = useMemo(() => {
        const totalGranted = grants.reduce((s, g) => s + Number(g.total_amount || 0), 0);
        const totalReceived = grants.reduce((s, g) => s + Number(g.received_amount || 0), 0);
        const totalDisbursed = grants.reduce((s, g) => s + Number(g.disbursed_amount || 0), 0);
        return { totalGranted, totalReceived, totalDisbursed, active: grants.filter(g => g.status === 'Active').length };
    }, [grants]);

    const openAdd = () => { setEditing(null); setForm(emptyGrant()); setShowModal(true); };
    const openEdit = (g: Grant) => { setEditing(g); setForm({ ...g }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyGrant()); };

    const handleSave = async () => {
        if (!form.grant_name) { toast.error('Enter grant name'); return; }
        setSaving(true);
        const payload = { grant_name: form.grant_name, donor: form.donor, grant_type: form.grant_type, total_amount: Number(form.total_amount), received_amount: Number(form.received_amount || 0), disbursed_amount: Number(form.disbursed_amount || 0), start_date: form.start_date || null, end_date: form.end_date || null, status: form.status, conditions: form.conditions, notes: form.notes, reference: form.reference };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_grants').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_grants').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Grant added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_grants').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Grant Name', 'Donor', 'Type', 'Total', 'Received', 'Disbursed', 'Status', 'Start', 'End']];
        filtered.forEach(g => rows.push([g.grant_name, g.donor || '', g.grant_type, String(g.total_amount), String(g.received_amount), String(g.disbursed_amount), g.status, g.start_date || '', g.end_date || '']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `grants_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading grants...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}><FiTrendingUp size={18} /></span>
                        Grant Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">CDF &bull; NGO &bull; Donor &bull; County &bull; Track conditions &amp; disbursements</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}>
                        <FiPlus size={16} /> New Grant
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Grants" value={String(grants.length)} icon={<FiTrendingUp size={18} />} color="linear-gradient(135deg,#0d9488,#0f766e)" sub={`${stats.active} active`} />
                <StatCard label="Total Granted" value={fmt(stats.totalGranted)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Received" value={fmt(stats.totalReceived)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Disbursed" value={fmt(stats.totalDisbursed)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#3b82f6,#2563eb)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search grant, donor..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...TYPES].map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} grants</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">{['Grant Name', 'Donor', 'Type', 'Total', 'Received', 'Disbursed', 'Period', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-400"><FiTrendingUp size={28} className="mx-auto mb-2 text-gray-300" /><p>No grants found</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}>Add First Grant</button></td></tr>}
                            {filtered.map(g => (
                                <tr key={g.id} className="border-b border-gray-50 hover:bg-teal-50/20 transition-colors">
                                    <td className="px-4 py-3"><p className="font-bold text-gray-800">{g.grant_name}</p>{g.reference && <p className="text-xs font-mono text-indigo-600">{g.reference}</p>}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{g.donor || '\u2014'}</td>
                                    <td className="px-4 py-3"><span className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{g.grant_type}</span></td>
                                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(g.total_amount)}</td>
                                    <td className="px-4 py-3 font-bold text-blue-600">{fmt(g.received_amount)}</td>
                                    <td className="px-4 py-3 font-bold text-emerald-600">{fmt(g.disbursed_amount)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(g.start_date || '')}<br />{fmtDate(g.end_date || '')}</td>
                                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-600'}`}>{g.status}</span></td>
                                    <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(g)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button><button onClick={() => setDeleteId(g.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Grant' : 'New Grant'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Grant Name *</label><input value={form.grant_name} onChange={e => setForm(f => ({ ...f, grant_name: e.target.value }))} placeholder="e.g. CDF Bursary 2024" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label><select value={form.grant_type} onChange={e => setForm(f => ({ ...f, grant_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400">{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Donor / Source</label><input value={form.donor || ''} onChange={e => setForm(f => ({ ...f, donor: e.target.value }))} placeholder="Donor name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Amount (KES)</label><input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Received Amount (KES)</label><input type="number" value={form.received_amount} onChange={e => setForm(f => ({ ...f, received_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursed Amount (KES)</label><input type="number" value={form.disbursed_amount} onChange={e => setForm(f => ({ ...f, disbursed_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference No.</label><input value={form.reference || ''} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400" /></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Conditions</label><textarea value={form.conditions || ''} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400 resize-none" /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-teal-400 resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Grant?</h3><p className="text-center text-sm text-gray-400 mb-4">This grant record will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

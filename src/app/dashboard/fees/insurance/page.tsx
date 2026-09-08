'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiShield, FiAlertTriangle, FiCheck, FiX, FiSave, FiCalendar } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const CATEGORIES = ['Fire & Perils', 'Motor Vehicle', 'Staff Medical', 'Students Personal Accident', 'Public Liability', 'Professional Indemnity', 'Group Life', 'Other'];
const STATUSES = ['Active', 'Expired', 'Renewal Due', 'Cancelled', 'Claim Pending'];
const STATUS_COLORS: Record<string, string> = { Active: 'bg-emerald-100 text-emerald-700', Expired: 'bg-red-100 text-red-700', 'Renewal Due': 'bg-yellow-100 text-yellow-700', Cancelled: 'bg-gray-100 text-gray-600', 'Claim Pending': 'bg-purple-100 text-purple-700' };

type Policy = { id?: number; policy_name: string; insurer?: string; policy_number?: string; category?: string; premium_amount: number; cover_amount: number; start_date?: string; end_date?: string; status: string; notes?: string; created_at?: string; };
const emptyPolicy = (): Policy => ({ policy_name: '', insurer: '', policy_number: '', category: 'Fire & Perils', premium_amount: 0, cover_amount: 0, status: 'Active', notes: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function InsurancePage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Policy | null>(null);
    const [form, setForm] = useState<Policy>(emptyPolicy());
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_insurance').select('*').order('end_date', { ascending: true });
        if (error) toast.error('Failed to load insurance');
        // Flag renewal due
        const today = new Date();
        const updated = (data || []).map((p: Policy) => {
            if (p.end_date && p.status === 'Active') {
                const end = new Date(p.end_date);
                const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 0) return { ...p, status: 'Expired' };
                if (daysLeft <= 30) return { ...p, status: 'Renewal Due' };
            }
            return p;
        });
        setPolicies(updated);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return policies.filter(p => {
            if (filterCat && p.category !== filterCat) return false;
            if (filterStatus && p.status !== filterStatus) return false;
            if (q && !p.policy_name.toLowerCase().includes(q) && !p.insurer?.toLowerCase().includes(q) && !p.policy_number?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [policies, search, filterCat, filterStatus]);

    const stats = useMemo(() => {
        const active = policies.filter(p => p.status === 'Active').length;
        const expiring = policies.filter(p => p.status === 'Renewal Due').length;
        const totalPremium = policies.filter(p => p.status === 'Active').reduce((s, p) => s + Number(p.premium_amount || 0), 0);
        const totalCover = policies.filter(p => p.status === 'Active').reduce((s, p) => s + Number(p.cover_amount || 0), 0);
        return { active, expiring, totalPremium, totalCover };
    }, [policies]);

    const getDaysLeft = (end?: string) => {
        if (!end) return null;
        const days = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const openAdd = () => { setEditing(null); setForm(emptyPolicy()); setShowModal(true); };
    const openEdit = (p: Policy) => { setEditing(p); setForm({ ...p }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyPolicy()); };

    const handleSave = async () => {
        if (!form.policy_name) { toast.error('Enter policy name'); return; }
        setSaving(true);
        const payload = { policy_name: form.policy_name, insurer: form.insurer, policy_number: form.policy_number, category: form.category, premium_amount: Number(form.premium_amount || 0), cover_amount: Number(form.cover_amount || 0), start_date: form.start_date || null, end_date: form.end_date || null, status: form.status, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_insurance').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_insurance').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Policy added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_insurance').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading insurance policies...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}><FiShield size={18} /></span>
                        Insurance Tracker
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">School policies &bull; Premium tracking &bull; Expiry alerts &bull; Cover amounts</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}>
                        <FiPlus size={16} /> New Policy
                    </button>
                </div>
            </div>

            {stats.expiring > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                    <FiAlertTriangle className="text-yellow-500 shrink-0" size={20} />
                    <p className="text-sm font-bold text-yellow-800">{stats.expiring} policy{stats.expiring > 1 ? 'ies' : ''} expiring within 30 days — action required!</p>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Active Policies" value={String(stats.active)} icon={<FiShield size={18} />} color="linear-gradient(135deg,#4f46e5,#4338ca)" sub={`${stats.expiring} expiring soon`} />
                <StatCard label="Annual Premium" value={fmt(stats.totalPremium)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Total Cover" value={fmt(stats.totalCover)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Total Policies" value={String(policies.length)} icon={<FiSearch size={18} />} color="linear-gradient(135deg,#6366f1,#5b21b6)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policy, insurer..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...CATEGORIES].map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 && <div className="col-span-3 py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-200"><FiShield size={32} className="mx-auto mb-2 text-gray-300" /><p>No policies found</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}>Add First Policy</button></div>}
                {filtered.map(p => {
                    const days = getDaysLeft(p.end_date);
                    const isExpiring = days !== null && days <= 30 && days >= 0;
                    const isExpired = days !== null && days < 0;
                    return (
                        <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 ${isExpiring ? 'border-yellow-300' : isExpired ? 'border-red-300' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-gray-900 text-sm leading-tight">{p.policy_name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{p.insurer} {p.policy_number ? `\u2022 ${p.policy_number}` : ''}</p>
                                </div>
                                <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{p.category}</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-red-50 rounded-lg p-2"><p className="text-[9px] font-bold text-gray-400 uppercase">Annual Premium</p><p className="font-extrabold text-red-600 text-sm">{fmt(p.premium_amount)}</p></div>
                                <div className="bg-emerald-50 rounded-lg p-2"><p className="text-[9px] font-bold text-gray-400 uppercase">Cover Amount</p><p className="font-extrabold text-emerald-600 text-sm">{fmt(p.cover_amount)}</p></div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span><FiCalendar size={11} className="inline mr-1" />{fmtDate(p.start_date || '')} \u2014 {fmtDate(p.end_date || '')}</span>
                                {days !== null && <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-emerald-600'}`}>{isExpired ? `${Math.abs(days)}d expired` : `${days}d left`}</span>}
                            </div>
                            {p.notes && <p className="text-xs text-gray-400 italic border-t border-gray-50 pt-2">{p.notes}</p>}
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => openEdit(p)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center gap-1"><FiEdit2 size={11} /> Edit</button>
                                <button onClick={() => setDeleteId(p.id!)} className="py-1.5 px-3 rounded-lg text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={11} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Policy' : 'New Insurance Policy'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Policy Name *</label><input value={form.policy_name} onChange={e => setForm(f => ({ ...f, policy_name: e.target.value }))} placeholder="e.g. Fire & Perils Insurance" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Insurer</label><input value={form.insurer || ''} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))} placeholder="Insurance company" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Policy Number</label><input value={form.policy_number || ''} onChange={e => setForm(f => ({ ...f, policy_number: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Annual Premium (KES)</label><input type="number" value={form.premium_amount} onChange={e => setForm(f => ({ ...f, premium_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cover Amount (KES)</label><input type="number" value={form.cover_amount} onChange={e => setForm(f => ({ ...f, cover_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Date / Expiry</label><input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400" /></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-indigo-400 resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#4f46e5,#4338ca)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Policy?</h3><p className="text-center text-sm text-gray-400 mb-4">This insurance policy will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiX, FiSave, FiCheck, FiAlertTriangle, FiShield } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const WAIVER_TYPES = ['Full Waiver', 'Partial Waiver', 'Scholarship', 'Bursary Discount', 'Staff Child Waiver', 'BOG Directive', 'Hardship Waiver', 'Other'];
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Applied'];
const STATUS_COLORS: Record<string, string> = { Pending: 'bg-yellow-100 text-yellow-700', Approved: 'bg-blue-100 text-blue-700', Rejected: 'bg-red-100 text-red-700', Applied: 'bg-emerald-100 text-emerald-700' };
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'All Terms'];

type Waiver = {
    id?: number; student_name: string; admission_no?: string; class_name?: string;
    waiver_type: string; fee_amount: number; waiver_amount: number; waiver_percent?: number;
    reason: string; status: string; academic_year?: string; term?: string;
    requested_by?: string; approved_by?: string; applied_date?: string; notes?: string; created_at?: string;
};
const emptyWaiver = (): Waiver => ({ student_name: '', waiver_type: 'Partial Waiver', fee_amount: 0, waiver_amount: 0, waiver_percent: 0, reason: '', status: 'Pending', academic_year: new Date().getFullYear().toString(), term: 'Term 1' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function FeeWaiverPage() {
    const [waivers, setWaivers] = useState<Waiver[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Waiver | null>(null);
    const [form, setForm] = useState<Waiver>(emptyWaiver());
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_fee_waivers').select('*').order('created_at', { ascending: false });
        if (error) toast.error('Failed to load waivers');
        setWaivers(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return waivers.filter(w => {
            if (filterStatus && w.status !== filterStatus) return false;
            if (filterTerm && w.term !== filterTerm) return false;
            if (q && !w.student_name.toLowerCase().includes(q) && !w.admission_no?.toLowerCase().includes(q) && !w.waiver_type.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [waivers, search, filterStatus, filterTerm]);

    const stats = useMemo(() => {
        const pending = waivers.filter(w => w.status === 'Pending').length;
        const totalWaived = waivers.filter(w => w.status === 'Applied').reduce((s, w) => s + Number(w.waiver_amount || 0), 0);
        const approved = waivers.filter(w => w.status === 'Approved').length;
        return { pending, totalWaived, approved, total: waivers.length };
    }, [waivers]);

    const openAdd = () => { setEditing(null); setForm(emptyWaiver()); setShowModal(true); };
    const openEdit = (w: Waiver) => { setEditing(w); setForm({ ...w }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyWaiver()); };

    // Auto-compute waiver amount from percent
    const handlePercentChange = (pct: number) => {
        const amt = (Number(form.fee_amount) * pct) / 100;
        setForm(f => ({ ...f, waiver_percent: pct, waiver_amount: Math.round(amt) }));
    };
    const handleAmountChange = (amt: number) => {
        const pct = form.fee_amount > 0 ? (amt / Number(form.fee_amount)) * 100 : 0;
        setForm(f => ({ ...f, waiver_amount: amt, waiver_percent: Math.round(pct * 10) / 10 }));
    };

    const handleSave = async () => {
        if (!form.student_name) { toast.error('Enter student name'); return; }
        if (!form.reason) { toast.error('Enter reason for waiver'); return; }
        setSaving(true);
        const payload = { student_name: form.student_name, admission_no: form.admission_no, class_name: form.class_name, waiver_type: form.waiver_type, fee_amount: Number(form.fee_amount), waiver_amount: Number(form.waiver_amount), waiver_percent: Number(form.waiver_percent || 0), reason: form.reason, status: form.status, academic_year: form.academic_year, term: form.term, requested_by: form.requested_by, approved_by: form.approved_by, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_fee_waivers').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_fee_waivers').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Waiver request added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_fee_waivers').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const approveWaiver = async (w: Waiver) => {
        const { error } = await supabase.from('school_fee_waivers').update({ status: 'Approved', approved_by: 'Principal' }).eq('id', w.id!);
        if (error) toast.error(error.message); else { toast.success('Waiver Approved!'); fetchAll(); }
    };

    const applyWaiver = async (w: Waiver) => {
        const { error } = await supabase.from('school_fee_waivers').update({ status: 'Applied', applied_date: new Date().toISOString().split('T')[0] }).eq('id', w.id!);
        if (error) toast.error(error.message); else { toast.success('Waiver Applied to student account!'); fetchAll(); }
    };

    const rejectWaiver = async (w: Waiver) => {
        const { error } = await supabase.from('school_fee_waivers').update({ status: 'Rejected' }).eq('id', w.id!);
        if (error) toast.error(error.message); else { toast.success('Waiver Rejected'); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Student', 'Adm No', 'Class', 'Type', 'Fee Amount', 'Waiver Amount', 'Waiver %', 'Status', 'Year', 'Term', 'Reason']];
        filtered.forEach(w => rows.push([w.student_name, w.admission_no || '', w.class_name || '', w.waiver_type, String(w.fee_amount), String(w.waiver_amount), String(w.waiver_percent || ''), w.status, w.academic_year || '', w.term || '', w.reason]));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `fee_waivers_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading waivers...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}><FiShield size={18} /></span>
                        Fee Waiver Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Waivers &bull; Scholarships &bull; Hardship &bull; Approval workflow &bull; Apply to accounts</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}>
                        <FiPlus size={16} /> New Waiver
                    </button>
                </div>
            </div>

            {stats.pending > 0 && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-3"><FiAlertTriangle className="text-yellow-500 shrink-0" size={18} /><p className="text-sm font-bold text-yellow-800">{stats.pending} waiver request{stats.pending > 1 ? 's' : ''} awaiting approval</p></div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Requests" value={String(stats.total)} icon={<FiShield size={18} />} color="linear-gradient(135deg,#db2777,#be185d)" sub={`${stats.pending} pending`} />
                <StatCard label="Approved" value={String(stats.approved)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#2563eb,#1d4ed8)" />
                <StatCard label="Total Waived" value={fmt(stats.totalWaived)} icon={<FiShield size={18} />} color="linear-gradient(135deg,#059669,#047857)" sub="Applied to accounts" />
                <StatCard label="Pending" value={String(stats.pending)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#d97706,#b45309)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, adm no, type..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...TERMS].map(t => <option key={t} value={t}>{t || 'All Terms'}</option>)}</select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} waivers</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">{['Student', 'Class', 'Type', 'Fee Amount', 'Waiver', '%', 'Status', 'Term/Year', 'Reason', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={10} className="py-14 text-center text-gray-400"><FiShield size={32} className="mx-auto mb-3 text-gray-300" /><p>No waiver requests</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}>New Waiver Request</button></td></tr>}
                            {filtered.map(w => (
                                <tr key={w.id} className="border-b border-gray-50 hover:bg-pink-50/20">
                                    <td className="px-3 py-3"><p className="font-bold text-gray-800">{w.student_name}</p>{w.admission_no && <p className="text-xs text-gray-400">{w.admission_no}</p>}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{w.class_name || '—'}</td>
                                    <td className="px-3 py-3 text-xs font-bold text-pink-700">{w.waiver_type}</td>
                                    <td className="px-3 py-3 font-bold text-gray-700">{fmt(w.fee_amount)}</td>
                                    <td className="px-3 py-3 font-bold text-emerald-600">{fmt(w.waiver_amount)}</td>
                                    <td className="px-3 py-3 text-xs font-bold text-gray-500">{w.waiver_percent ? `${w.waiver_percent}%` : '—'}</td>
                                    <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[w.status] || 'bg-gray-100'}`}>{w.status}</span></td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{w.term}<br />{w.academic_year}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500 max-w-[140px] truncate">{w.reason}</td>
                                    <td className="px-3 py-3"><div className="flex gap-1 flex-wrap">
                                        {w.status === 'Pending' && <button onClick={() => approveWaiver(w)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold" title="Approve"><FiCheck size={12} /></button>}
                                        {w.status === 'Pending' && <button onClick={() => rejectWaiver(w)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Reject"><FiX size={12} /></button>}
                                        {w.status === 'Approved' && <button onClick={() => applyWaiver(w)} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold">Apply</button>}
                                        <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={12} /></button>
                                        <button onClick={() => setDeleteId(w.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={12} /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && <tfoot>
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td colSpan={3} className="px-3 py-2 font-extrabold text-xs text-gray-600 uppercase">Total ({filtered.length})</td>
                                <td className="px-3 py-2 font-extrabold text-gray-700">{fmt(filtered.reduce((s, w) => s + Number(w.fee_amount || 0), 0))}</td>
                                <td className="px-3 py-2 font-extrabold text-emerald-600">{fmt(filtered.reduce((s, w) => s + Number(w.waiver_amount || 0), 0))}</td>
                                <td colSpan={5}></td>
                            </tr>
                        </tfoot>}
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Waiver' : 'New Waiver Request'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Student Name *</label><input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} placeholder="Full name of student" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-pink-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Admission No</label><input value={form.admission_no || ''} onChange={e => setForm(f => ({ ...f, admission_no: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-pink-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Class</label><input value={form.class_name || ''} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. Form 3A" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-pink-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Waiver Type</label><select value={form.waiver_type} onChange={e => setForm(f => ({ ...f, waiver_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{WAIVER_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Fee Amount</label><input type="number" value={form.fee_amount} onChange={e => setForm(f => ({ ...f, fee_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Waiver % (auto-calc)</label><input type="number" max="100" value={form.waiver_percent || 0} onChange={e => handlePercentChange(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Waiver Amount (KES)</label><input type="number" value={form.waiver_amount} onChange={e => handleAmountChange(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label><input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label><select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{TERMS.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Requested By</label><input value={form.requested_by || ''} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approved By</label><input value={form.approved_by || ''} onChange={e => setForm(f => ({ ...f, approved_by: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reason for Waiver *</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Explain why this student qualifies for a waiver..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Submit Waiver'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Waiver?</h3><p className="text-center text-sm text-gray-400 mb-4">This waiver record will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

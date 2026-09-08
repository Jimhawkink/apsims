'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle, FiX, FiSave, FiLayers } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: string) => d ? new Date(d).toLocaleString('en-KE') : '—';

const REQUEST_TYPES = ['Expense Request', 'Payment Request', 'Purchase Order', 'Petty Cash Reimbursement', 'Budget Transfer', 'Emergency Funds', 'Staff Advance', 'Capital Expenditure', 'Maintenance Request', 'Other'];
const PRIORITIES = ['Normal', 'Urgent', 'Critical'];
const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Paid'];
const STATUS_COLORS: Record<string, string> = { Pending: 'bg-yellow-100 text-yellow-700', 'Under Review': 'bg-blue-100 text-blue-700', Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', Paid: 'bg-purple-100 text-purple-700' };
const PRIORITY_COLORS: Record<string, string> = { Normal: 'bg-gray-100 text-gray-600', Urgent: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' };

type ApprovalRequest = {
    id?: number; request_type: string; description: string; amount: number;
    requested_by: string; reviewed_by?: string; approved_by?: string; rejected_reason?: string;
    status: string; priority: string; department?: string; budget_line?: string;
    supporting_doc?: string; due_date?: string; notes?: string;
    created_at?: string; updated_at?: string;
};
const emptyReq = (): ApprovalRequest => ({ request_type: 'Expense Request', description: '', amount: 0, requested_by: '', status: 'Pending', priority: 'Normal', department: '' });

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function ApprovalWorkflowPage() {
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ApprovalRequest | null>(null);
    const [form, setForm] = useState<ApprovalRequest>(emptyReq());
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [rejectModal, setRejectModal] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_finance_approvals').select('*').order('created_at', { ascending: false });
        if (error) toast.error('Failed to load requests');
        setRequests(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return requests.filter(r => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterPriority && r.priority !== filterPriority) return false;
            if (q && !r.description.toLowerCase().includes(q) && !r.requested_by.toLowerCase().includes(q) && !r.request_type.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [requests, search, filterStatus, filterPriority]);

    const stats = useMemo(() => {
        const pending = requests.filter(r => r.status === 'Pending' || r.status === 'Under Review').length;
        const approved = requests.filter(r => r.status === 'Approved').length;
        const critical = requests.filter(r => r.priority === 'Critical' && r.status === 'Pending').length;
        const totalApproved = requests.filter(r => r.status === 'Approved' || r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
        return { pending, approved, critical, totalApproved };
    }, [requests]);

    const openAdd = () => { setEditing(null); setForm(emptyReq()); setShowModal(true); };
    const openEdit = (r: ApprovalRequest) => { setEditing(r); setForm({ ...r }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyReq()); };

    const handleSave = async () => {
        if (!form.description) { toast.error('Enter description'); return; }
        if (!form.requested_by) { toast.error('Enter requester name'); return; }
        setSaving(true);
        const payload = { request_type: form.request_type, description: form.description, amount: Number(form.amount || 0), requested_by: form.requested_by, reviewed_by: form.reviewed_by, approved_by: form.approved_by, status: form.status, priority: form.priority, department: form.department, budget_line: form.budget_line, due_date: form.due_date || null, notes: form.notes, updated_at: new Date().toISOString() };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_finance_approvals').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_finance_approvals').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Request submitted!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_finance_approvals').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const approveRequest = async (r: ApprovalRequest) => {
        const { error } = await supabase.from('school_finance_approvals').update({ status: 'Approved', approved_by: 'Principal', updated_at: new Date().toISOString() }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('✅ Request Approved!'); fetchAll(); }
    };

    const markUnderReview = async (r: ApprovalRequest) => {
        const { error } = await supabase.from('school_finance_approvals').update({ status: 'Under Review', updated_at: new Date().toISOString() }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Moved to Under Review'); fetchAll(); }
    };

    const markPaid = async (r: ApprovalRequest) => {
        const { error } = await supabase.from('school_finance_approvals').update({ status: 'Paid', updated_at: new Date().toISOString() }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Marked as Paid!'); fetchAll(); }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        const { error } = await supabase.from('school_finance_approvals').update({ status: 'Rejected', rejected_reason: rejectReason, updated_at: new Date().toISOString() }).eq('id', rejectModal);
        if (error) toast.error(error.message);
        else { toast.success('Request Rejected'); setRejectModal(null); setRejectReason(''); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Type', 'Description', 'Amount', 'Priority', 'Status', 'Requested By', 'Approved By', 'Dept', 'Date']];
        filtered.forEach(r => rows.push([r.request_type, r.description, String(r.amount), r.priority, r.status, r.requested_by, r.approved_by || '', r.department || '', fmtDate(r.created_at || '')]));
        const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `approvals_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading approvals...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#3730a3)' }}><FiLayers size={18} /></span>
                        Finance Approval Workflow
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Submit requests &bull; Review &bull; Approve or Reject &bull; Track status &bull; Audit trail</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#3730a3)' }}>
                        <FiPlus size={16} /> New Request
                    </button>
                </div>
            </div>

            {stats.critical > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 animate-pulse"><FiAlertTriangle className="text-red-500 shrink-0" size={18} /><p className="text-sm font-bold text-red-800">{stats.critical} CRITICAL request{stats.critical > 1 ? 's' : ''} pending immediate approval!</p></div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Pending / Review" value={String(stats.pending)} icon={<FiClock size={18} />} color="linear-gradient(135deg,#d97706,#b45309)" sub={`${stats.critical} critical`} />
                <StatCard label="Approved" value={String(stats.approved)} icon={<FiCheckCircle size={18} />} color="linear-gradient(135deg,#059669,#047857)" />
                <StatCard label="Total Approved Amount" value={fmt(stats.totalApproved)} icon={<FiLayers size={18} />} color="linear-gradient(135deg,#4f46e5,#3730a3)" />
                <StatCard label="All Requests" value={String(requests.length)} icon={<FiLayers size={18} />} color="linear-gradient(135deg,#0369a1,#0284c7)" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, requester..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...STATUSES].map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}</select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">{['', ...PRIORITIES].map(p => <option key={p} value={p}>{p || 'All Priority'}</option>)}</select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} requests</span>
            </div>

            <div className="space-y-3">
                {filtered.length === 0 && <div className="bg-white rounded-xl border border-gray-200 py-14 text-center text-gray-400"><FiLayers size={32} className="mx-auto mb-3 text-gray-300" /><p>No approval requests</p><button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#3730a3)' }}>Submit First Request</button></div>}
                {filtered.map(r => (
                    <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 ${r.priority === 'Critical' ? 'border-red-300 bg-red-50/20' : r.priority === 'Urgent' ? 'border-orange-200' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                                    <span className="text-[10px] text-gray-400 font-bold">{r.request_type}</span>
                                    {r.department && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{r.department}</span>}
                                </div>
                                <p className="font-bold text-gray-800">{r.description}</p>
                                <p className="text-xl font-extrabold text-indigo-700 mt-0.5">{fmt(r.amount)}</p>
                                <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                                    <span>👤 Requested by: <b className="text-gray-700">{r.requested_by}</b></span>
                                    {r.approved_by && <span>✅ Approved by: <b className="text-gray-700">{r.approved_by}</b></span>}
                                    {r.due_date && <span>📅 Due: <b className="text-gray-700">{fmtDate(r.due_date)}</b></span>}
                                    <span>🕐 {fmtDate(r.created_at || '')}</span>
                                </div>
                                {r.rejected_reason && <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">Rejected: {r.rejected_reason}</p>}
                                {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                            </div>
                            <div className="flex gap-1.5 flex-wrap shrink-0">
                                {r.status === 'Pending' && <button onClick={() => markUnderReview(r)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100">Review</button>}
                                {(r.status === 'Pending' || r.status === 'Under Review') && <button onClick={() => approveRequest(r)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"><FiCheckCircle size={11} /> Approve</button>}
                                {r.status === 'Approved' && <button onClick={() => markPaid(r)} className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold hover:bg-purple-100">Mark Paid</button>}
                                {(r.status === 'Pending' || r.status === 'Under Review') && <button onClick={() => { setRejectModal(r.id!); setRejectReason(''); }} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 flex items-center gap-1"><FiXCircle size={11} /> Reject</button>}
                                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                <button onClick={() => setDeleteId(r.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Request' : 'New Approval Request'}</h2><button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button></div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Request Type</label><select value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                                    <div className="flex gap-1">{PRIORITIES.map(p => <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.priority === p ? p === 'Critical' ? 'bg-red-600 text-white' : p === 'Urgent' ? 'bg-orange-500 text-white' : 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{p}</button>)}
                                    </div>
                                </div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What is this request for?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (KES)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Requested By *</label><input value={form.requested_by} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label><input value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Science, Admin..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Budget Line</label><input value={form.budget_line || ''} onChange={e => setForm(f => ({ ...f, budget_line: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date</label><input type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#4f46e5,#3730a3)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Submit'}</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reject modal */}
            {rejectModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"><h3 className="text-lg font-extrabold text-gray-900 mb-3">Reject Request</h3><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reason for Rejection</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Explain why this request is rejected..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none mb-4" /><div className="flex gap-3"><button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleReject} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Reject</button></div></div></div>}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Request?</h3><p className="text-center text-sm text-gray-400 mb-4">This approval request will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

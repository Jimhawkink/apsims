'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw,
    FiDollarSign, FiCheck, FiAlertTriangle, FiFileText, FiX, FiSave,
    FiCalendar, FiTrendingUp, FiGrid,
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const SOURCES = ['Ministry of Education (MoE)', 'County Government', 'CDF', 'NGO/Donor', 'World Bank', 'Other'];
const STATUSES = ['Expected', 'Received', 'Partial', 'Overdue', 'Cancelled'];
const STATUS_COLORS: Record<string, string> = {
    Expected: 'bg-blue-100 text-blue-700',
    Received: 'bg-emerald-100 text-emerald-700',
    Partial: 'bg-yellow-100 text-yellow-700',
    Overdue: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
};

type Capitation = {
    id?: number;
    form_id?: number;
    stream_id?: number;
    headcount?: number;
    rate_per_student?: number;
    amount: number;
    received_amount?: number;
    source: string;
    disbursement_date?: string;
    expected_date?: string;
    status: string;
    reference_number?: string;
    academic_year?: string;
    term?: string;
    notes?: string;
    created_at?: string;
};

type Form = { id: number; form_name?: string; form_level?: number; grade?: string; };
type Stream = { id: number; stream_name: string; };

const emptyForm = (): Capitation => ({
    source: 'Ministry of Education (MoE)',
    amount: 0,
    received_amount: 0,
    status: 'Expected',
    academic_year: new Date().getFullYear().toString(),
    term: 'Term 1',
    expected_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
    headcount: 0,
    rate_per_student: 0,
});

function StatCard({ label, value, color, icon, sub }: { label: string; value: string; color: string; icon: React.ReactNode; sub?: string }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
        </div>
    );
}

export default function CapitationPage() {
    const [records, setRecords] = useState<Capitation[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Capitation | null>(null);
    const [form, setForm] = useState<Capitation>(emptyForm());
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [{ data: r, error }, { data: f }, { data: s }] = await Promise.all([
            supabase.from('school_capitation').select('*').order('created_at', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
        ]);
        if (error) toast.error('Failed to load capitation records');
        setRecords(r || []);
        setForms(f || []);
        setStreams(s || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (fid?: number) => {
        if (!fid) return 'All Forms';
        const f = forms.find(x => x.id === fid);
        return f?.form_name || f?.grade || `Form ${f?.form_level || fid}`;
    };
    const getStreamName = (sid?: number) => {
        if (!sid) return 'All Streams';
        return streams.find(x => x.id === sid)?.stream_name || '\u2014';
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return records.filter(r => {
            if (filterSource && r.source !== filterSource) return false;
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterYear && r.academic_year !== filterYear) return false;
            if (q && !r.source?.toLowerCase().includes(q) && !r.reference_number?.toLowerCase().includes(q) && !r.notes?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [records, search, filterSource, filterStatus, filterYear]);

    const stats = useMemo(() => {
        const total = records.length;
        const totalExpected = records.reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalReceived = records.reduce((s, r) => s + Number(r.received_amount || 0), 0);
        const outstanding = totalExpected - totalReceived;
        const overdue = records.filter(r => r.status === 'Overdue').length;
        return { total, totalExpected, totalReceived, outstanding, overdue };
    }, [records]);

    const years = useMemo(() => [...new Set(records.map(r => r.academic_year).filter(Boolean))].sort().reverse(), [records]);

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
    const openEdit = (r: Capitation) => { setEditing(r); setForm({ ...r }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm()); };

    // Auto-calculate amount from headcount * rate
    const updateAmount = (headcount: number, rate: number) => {
        setForm(f => ({ ...f, headcount, rate_per_student: rate, amount: headcount * rate }));
    };

    const handleSave = async () => {
        if (!form.amount) { toast.error('Enter capitation amount'); return; }
        setSaving(true);
        const payload = {
            form_id: form.form_id || null,
            stream_id: form.stream_id || null,
            headcount: Number(form.headcount || 0),
            rate_per_student: Number(form.rate_per_student || 0),
            amount: Number(form.amount),
            received_amount: Number(form.received_amount || 0),
            source: form.source,
            disbursement_date: form.disbursement_date || null,
            expected_date: form.expected_date || null,
            status: form.status,
            reference_number: form.reference_number,
            academic_year: form.academic_year,
            term: form.term,
            notes: form.notes,
        };
        let error;
        if (editing?.id) {
            ({ error } = await supabase.from('school_capitation').update(payload).eq('id', editing.id));
        } else {
            ({ error } = await supabase.from('school_capitation').insert(payload));
        }
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Capitation record added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_capitation').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const markReceived = async (r: Capitation) => {
        const { error } = await supabase.from('school_capitation').update({ status: 'Received', received_amount: r.amount, disbursement_date: new Date().toISOString().split('T')[0] }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Marked as Received!'); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Source', 'Form', 'Headcount', 'Rate', 'Expected', 'Received', 'Status', 'Year', 'Term', 'Date', 'Ref']];
        filtered.forEach(r => rows.push([r.source, getFormName(r.form_id), String(r.headcount || ''), String(r.rate_per_student || ''), String(r.amount), String(r.received_amount || 0), r.status, r.academic_year || '', r.term || '', r.expected_date || '', r.reference_number || '']));
        const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `capitation_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading capitation grants...</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                            <FiGrid size={18} />
                        </span>
                        Capitation Grants
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">MoE &bull; County &bull; CDF &bull; Track disbursements &bull; Headcount-based calculation</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5 hover:bg-emerald-700">
                        <FiDownload size={14} /> Export
                    </button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <FiRefreshCw size={14} />
                    </button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                        <FiPlus size={16} /> New Grant
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Records" value={String(stats.total)} icon={<FiFileText size={18} />} color="linear-gradient(135deg,#3b82f6,#2563eb)" sub={`${stats.overdue} overdue`} />
                <StatCard label="Total Expected" value={fmt(stats.totalExpected)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Total Received" value={fmt(stats.totalReceived)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Outstanding" value={fmt(stats.outstanding)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#ef4444,#dc2626)" />
            </div>

            {/* Progress bar */}
            {stats.totalExpected > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700">Collection Rate</span>
                        <span className="text-sm font-extrabold text-blue-600">{((stats.totalReceived / stats.totalExpected) * 100).toFixed(1)}% received</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (stats.totalReceived / stats.totalExpected) * 100)}%`, background: 'linear-gradient(90deg,#3b82f6,#10b981)' }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Received: {fmt(stats.totalReceived)}</span>
                        <span>Expected: {fmt(stats.totalExpected)}</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]">
                    <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search source, ref..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-400" />
                </div>
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="">All Sources</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="">All Status</option>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="">All Years</option>
                    {years.map(y => <option key={y!}>{y}</option>)}
                </select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} records</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {['Source', 'Form / Stream', 'Headcount', 'Rate', 'Expected', 'Received', 'Gap', 'Year/Term', 'Status', 'Exp. Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                                    <FiGrid size={28} className="mx-auto mb-2 text-gray-300" />
                                    <p>No capitation records found</p>
                                    <button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>Add First Record</button>
                                </td></tr>
                            )}
                            {filtered.map(r => {
                                const gap = Number(r.amount || 0) - Number(r.received_amount || 0);
                                return (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-800 text-sm leading-tight">{r.source}</p>
                                            {r.reference_number && <p className="text-xs font-mono text-indigo-600">{r.reference_number}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{getFormName(r.form_id)}<br />{r.stream_id ? getStreamName(r.stream_id) : ''}</td>
                                        <td className="px-4 py-3 font-bold text-gray-700">{r.headcount || '\u2014'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{r.rate_per_student ? fmt(r.rate_per_student) : '\u2014'}</td>
                                        <td className="px-4 py-3 font-bold text-gray-700">{fmt(r.amount)}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600">{fmt(r.received_amount || 0)}</td>
                                        <td className={`px-4 py-3 font-bold ${gap > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{gap > 0 ? fmt(gap) : 'Cleared'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{r.academic_year}<br />{r.term}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(r.expected_date || '')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {(r.status === 'Expected' || r.status === 'Partial' || r.status === 'Overdue') && (
                                                    <button onClick={() => markReceived(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mark Received"><FiCheck size={13} /></button>
                                                )}
                                                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                                <button onClick={() => setDeleteId(r.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={4} className="px-4 py-3 font-extrabold text-gray-600 text-sm">TOTALS ({filtered.length})</td>
                                    <td className="px-4 py-3 font-extrabold text-gray-700">{fmt(filtered.reduce((s, r) => s + Number(r.amount || 0), 0))}</td>
                                    <td className="px-4 py-3 font-extrabold text-emerald-600">{fmt(filtered.reduce((s, r) => s + Number(r.received_amount || 0), 0))}</td>
                                    <td colSpan={5}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Grant' : 'New Capitation Grant'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Source *</label>
                                    <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">
                                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Form</label>
                                    <select value={form.form_id || ''} onChange={e => setForm(f => ({ ...f, form_id: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">
                                        <option value="">All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name || f.grade}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Stream</label>
                                    <select value={form.stream_id || ''} onChange={e => setForm(f => ({ ...f, stream_id: e.target.value ? Number(e.target.value) : undefined }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">
                                        <option value="">All Streams</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Headcount</label>
                                    <input type="number" value={form.headcount || ''} onChange={e => updateAmount(Number(e.target.value), Number(form.rate_per_student || 0))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rate Per Student (KES)</label>
                                    <input type="number" value={form.rate_per_student || ''} onChange={e => updateAmount(Number(form.headcount || 0), Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expected Amount (KES) *</label>
                                    <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                    {form.headcount && form.rate_per_student ? <p className="text-xs text-blue-500 mt-1">Auto: {form.headcount} x {fmt(form.rate_per_student)} = {fmt(Number(form.headcount) * Number(form.rate_per_student))}</p> : null}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Received Amount (KES)</label>
                                    <input type="number" value={form.received_amount || ''} onChange={e => setForm(f => ({ ...f, received_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">
                                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label>
                                    <input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2024" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400">
                                        <option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expected Date</label>
                                    <input type="date" value={form.expected_date || ''} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursement Date</label>
                                    <input type="date" value={form.disbursement_date || ''} onChange={e => setForm(f => ({ ...f, disbursement_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference Number</label>
                                    <input value={form.reference_number || ''} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="MoE Ref / Voucher No" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                                <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                <FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div>
                        <h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Record?</h3>
                        <p className="text-center text-sm text-gray-400 mb-4">This capitation record will be permanently deleted.</p>
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

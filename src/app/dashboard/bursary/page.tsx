'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw,
    FiDollarSign, FiUser, FiCheck, FiAlertTriangle, FiFilter,
    FiFileText, FiSend, FiX, FiSave, FiCalendar, FiTrendingUp,
    FiMessageCircle, FiPrinter,
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

const TYPES = ['HELB', 'County Bursary', 'CDF', 'NGO', 'Government', 'Scholarship', 'Other'];
const STATUSES = ['Pending', 'Approved', 'Credited', 'Queued', 'Disbursed', 'Rejected'];
const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-blue-100 text-blue-700',
    Credited: 'bg-emerald-100 text-emerald-700',
    Queued: 'bg-purple-100 text-purple-700',
    Disbursed: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
};

type Bursary = {
    id?: number;
    student_id?: number;
    student_name?: string;
    admission_no?: string;
    bursary_type: string;
    donor?: string;
    applied_amount: number;
    approved_amount: number;
    disbursed_amount: number;
    academic_year?: string;
    term?: string;
    status: string;
    application_date?: string;
    approval_date?: string;
    disbursement_date?: string;
    reference?: string;
    conditions?: string;
    notes?: string;
    created_at?: string;
};

type Student = { id: number; first_name: string; last_name: string; admission_no?: string; admission_number?: string; form_id?: number; };
type Form = { id: number; form_name?: string; form_level?: number; grade?: string; };

const emptyForm = (): Bursary => ({
    bursary_type: 'CDF',
    donor: '',
    applied_amount: 0,
    approved_amount: 0,
    disbursed_amount: 0,
    status: 'Pending',
    academic_year: new Date().getFullYear().toString(),
    term: 'Term 1',
    application_date: new Date().toISOString().split('T')[0],
    conditions: '',
    notes: '',
    reference: '',
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

export default function BursaryPage() {
    const [records, setRecords] = useState<Bursary[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Bursary | null>(null);
    const [form, setForm] = useState<Bursary>(emptyForm());
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentDrop, setShowStudentDrop] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [{ data: r, error }, { data: s }, { data: f }] = await Promise.all([
            supabase.from('school_bursary_records').select('*').order('created_at', { ascending: false }),
            supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        if (error) toast.error('Failed to load bursary records');
        setRecords(r || []);
        setStudents(s || []);
        setForms(f || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const admNo = (s: Student) => s.admission_no || s.admission_number || '';
    const sFullName = (s: Student) => `${s.first_name} ${s.last_name}`.trim();
    const getFormName = (fid?: number) => {
        if (!fid) return '';
        const f = forms.find(x => x.id === fid);
        return f?.form_name || f?.grade || '';
    };

    const filteredStudents = useMemo(() => {
        const q = studentSearch.toLowerCase();
        if (!q) return students.slice(0, 8);
        return students.filter(s => sFullName(s).toLowerCase().includes(q) || admNo(s).toLowerCase().includes(q)).slice(0, 8);
    }, [students, studentSearch]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return records.filter(r => {
            if (filterType && r.bursary_type !== filterType) return false;
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterYear && r.academic_year !== filterYear) return false;
            if (q && !r.student_name?.toLowerCase().includes(q) && !r.admission_no?.toLowerCase().includes(q) && !r.donor?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [records, search, filterType, filterStatus, filterYear]);

    const stats = useMemo(() => {
        const total = records.length;
        const totalApplied = records.reduce((s, r) => s + Number(r.applied_amount || 0), 0);
        const totalApproved = records.reduce((s, r) => s + Number(r.approved_amount || 0), 0);
        const totalDisbursed = records.reduce((s, r) => s + Number(r.disbursed_amount || 0), 0);
        const pending = records.filter(r => r.status === 'Pending').length;
        return { total, totalApplied, totalApproved, totalDisbursed, pending };
    }, [records]);

    const years = useMemo(() => [...new Set(records.map(r => r.academic_year).filter(Boolean))].sort().reverse(), [records]);

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setStudentSearch(''); setShowModal(true); };
    const openEdit = (r: Bursary) => {
        setEditing(r);
        setForm({ ...r });
        setStudentSearch(r.student_name || '');
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm()); setStudentSearch(''); setShowStudentDrop(false); };

    const handleSave = async () => {
        if (!form.student_name && !form.student_id) { toast.error('Select a student'); return; }
        if (!form.applied_amount) { toast.error('Enter applied amount'); return; }
        setSaving(true);
        const payload: any = {
            student_id: form.student_id,
            student_name: form.student_name,
            admission_no: form.admission_no,
            bursary_type: form.bursary_type,
            donor: form.donor,
            applied_amount: Number(form.applied_amount),
            approved_amount: Number(form.approved_amount || 0),
            disbursed_amount: Number(form.disbursed_amount || 0),
            academic_year: form.academic_year,
            term: form.term,
            status: form.status,
            application_date: form.application_date || null,
            approval_date: form.approval_date || null,
            disbursement_date: form.disbursement_date || null,
            reference: form.reference,
            conditions: form.conditions,
            notes: form.notes,
        };
        let error;
        if (editing?.id) {
            ({ error } = await supabase.from('school_bursary_records').update(payload).eq('id', editing.id));
        } else {
            ({ error } = await supabase.from('school_bursary_records').insert(payload));
        }
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Bursary record added!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_bursary_records').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const handleApprove = async (r: Bursary) => {
        const { error } = await supabase.from('school_bursary_records').update({ status: 'Approved', approved_amount: r.applied_amount, approval_date: new Date().toISOString().split('T')[0] }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Approved!'); fetchAll(); }
    };

    const handleDisburse = async (r: Bursary) => {
        const { error } = await supabase.from('school_bursary_records').update({ status: 'Disbursed', disbursed_amount: r.approved_amount, disbursement_date: new Date().toISOString().split('T')[0] }).eq('id', r.id!);
        if (error) toast.error(error.message); else { toast.success('Marked as Disbursed!'); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Student', 'Adm No', 'Type', 'Donor', 'Applied', 'Approved', 'Disbursed', 'Status', 'Year', 'Term', 'Date']];
        filtered.forEach(r => rows.push([r.student_name || '', r.admission_no || '', r.bursary_type, r.donor || '', String(r.applied_amount), String(r.approved_amount), String(r.disbursed_amount), r.status, r.academic_year || '', r.term || '', r.application_date || '']));
        const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `bursary_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading bursary records...</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                            <FiUser size={18} />
                        </span>
                        HELB &amp; Bursary Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">CDF &bull; County &bull; NGO &bull; HELB &bull; Scholarships &bull; Full workflow management</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5 hover:bg-emerald-700">
                        <FiDownload size={14} /> Export
                    </button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <FiRefreshCw size={14} />
                    </button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                        <FiPlus size={16} /> New Bursary
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Records" value={String(stats.total)} icon={<FiFileText size={18} />} color="linear-gradient(135deg,#7c3aed,#6d28d9)" sub={`${stats.pending} pending`} />
                <StatCard label="Total Applied" value={fmt(stats.totalApplied)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Total Approved" value={fmt(stats.totalApproved)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#3b82f6,#2563eb)" />
                <StatCard label="Total Disbursed" value={fmt(stats.totalDisbursed)} icon={<FiTrendingUp size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[180px]">
                    <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, donor..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-purple-400" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none min-w-[130px]">
                    <option value="">All Types</option>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none min-w-[120px]">
                    <option value="">All Status</option>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none min-w-[110px]">
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
                                {['Student', 'Type / Donor', 'Applied', 'Approved', 'Disbursed', 'Year/Term', 'Status', 'Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                    <FiUser size={28} className="mx-auto mb-2 text-gray-300" />
                                    <p>No bursary records found</p>
                                    <button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>Add First Record</button>
                                </td></tr>
                            )}
                            {filtered.map(r => (
                                <tr key={r.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800 text-sm">{r.student_name || '\u2014'}</p>
                                        <p className="text-xs text-indigo-600 font-mono">{r.admission_no}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{r.bursary_type}</span>
                                        {r.donor && <p className="text-xs text-gray-400 mt-0.5">{r.donor}</p>}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(r.applied_amount)}</td>
                                    <td className="px-4 py-3 font-bold text-blue-600">{fmt(r.approved_amount)}</td>
                                    <td className="px-4 py-3 font-bold text-emerald-600">{fmt(r.disbursed_amount)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{r.academic_year}<br />{r.term}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(r.application_date || '')}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {r.status === 'Pending' && (
                                                <button onClick={() => handleApprove(r)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Approve"><FiCheck size={13} /></button>
                                            )}
                                            {r.status === 'Approved' && (
                                                <button onClick={() => handleDisburse(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mark Disbursed"><FiTrendingUp size={13} /></button>
                                            )}
                                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={13} /></button>
                                            <button onClick={() => setDeleteId(r.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={2} className="px-4 py-3 font-extrabold text-gray-600 text-sm">TOTALS ({filtered.length} records)</td>
                                    <td className="px-4 py-3 font-extrabold text-gray-700">{fmt(filtered.reduce((s, r) => s + Number(r.applied_amount || 0), 0))}</td>
                                    <td className="px-4 py-3 font-extrabold text-blue-600">{fmt(filtered.reduce((s, r) => s + Number(r.approved_amount || 0), 0))}</td>
                                    <td className="px-4 py-3 font-extrabold text-emerald-600">{fmt(filtered.reduce((s, r) => s + Number(r.disbursed_amount || 0), 0))}</td>
                                    <td colSpan={4}></td>
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
                            <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Bursary Record' : 'New Bursary Application'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Student search */}
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Student *</label>
                                <div className="relative">
                                    <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setShowStudentDrop(true); }} onFocus={() => setShowStudentDrop(true)}
                                        placeholder="Search student name or admission no..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                {showStudentDrop && filteredStudents.length > 0 && (
                                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto">
                                        {filteredStudents.map(s => (
                                            <div key={s.id} onClick={() => {
                                                setForm(f => ({ ...f, student_id: s.id, student_name: sFullName(s), admission_no: admNo(s) }));
                                                setStudentSearch(sFullName(s)); setShowStudentDrop(false);
                                            }} className="px-3 py-2.5 hover:bg-purple-50 cursor-pointer border-b border-gray-50 flex items-center justify-between">
                                                <span className="font-medium text-sm text-gray-800">{sFullName(s)}</span>
                                                <span className="text-xs text-indigo-600 font-mono">{admNo(s)} {s.form_id ? `\u2022 ${getFormName(s.form_id)}` : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bursary Type *</label>
                                    <select value={form.bursary_type} onChange={e => setForm(f => ({ ...f, bursary_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400">
                                        {TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Donor / Source</label>
                                    <input value={form.donor || ''} onChange={e => setForm(f => ({ ...f, donor: e.target.value }))} placeholder="e.g. Kiambu County, CDF Gatundu" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Applied Amount (KES) *</label>
                                    <input type="number" value={form.applied_amount} onChange={e => setForm(f => ({ ...f, applied_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approved Amount (KES)</label>
                                    <input type="number" value={form.approved_amount} onChange={e => setForm(f => ({ ...f, approved_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursed Amount (KES)</label>
                                    <input type="number" value={form.disbursed_amount} onChange={e => setForm(f => ({ ...f, disbursed_amount: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400">
                                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label>
                                    <input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2024" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400">
                                        <option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Annual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Application Date</label>
                                    <input type="date" value={form.application_date || ''} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approval Date</label>
                                    <input type="date" value={form.approval_date || ''} onChange={e => setForm(f => ({ ...f, approval_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Disbursement Date</label>
                                    <input type="date" value={form.disbursement_date || ''} onChange={e => setForm(f => ({ ...f, disbursement_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference No.</label>
                                    <input value={form.reference || ''} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ref / Voucher number" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Conditions / Requirements</label>
                                <textarea value={form.conditions || ''} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={2} placeholder="e.g. Must maintain B plain, financial need..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400 resize-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                                <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
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
                        <p className="text-center text-sm text-gray-400 mb-4">This bursary record will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

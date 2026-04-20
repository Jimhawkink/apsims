'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUsers, FiUserPlus, FiSearch, FiDownload, FiEdit2, FiTrash2,
    FiX, FiSave, FiPhone, FiMail, FiFilter, FiRefreshCw, FiEye,
    FiChevronLeft, FiChevronRight, FiBriefcase, FiUserCheck
} from 'react-icons/fi';

type StaffType = 'teacher' | 'support' | 'subordinate';

interface StaffMember {
    id: number;
    staff_no?: string;
    tsc_number?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    gender: string;
    id_number?: string;
    qualification?: string;
    department?: string;
    designation?: string;
    role?: string;
    basic_salary: number;
    status: string;
    date_of_employment?: string;
    date_hired?: string;
    employment_date?: string;
    contract_type?: string;
    bank_name?: string;
    bank_account?: string;
    kra_pin?: string;
    nhif_no?: string;
    nssf_no?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
    created_at: string;
    _type: StaffType;
    _typeLabel: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '', gender: 'Male',
    id_number: '', qualification: '', department: '', designation: '',
    role: '', basic_salary: 0, status: 'Active', staff_no: '', tsc_number: '',
    date_of_employment: '', contract_type: 'Permanent',
    bank_name: '', bank_account: '', kra_pin: '', nhif_no: '', nssf_no: '',
    emergency_contact_name: '', emergency_contact_phone: '', notes: '',
};

export default function StaffDirectoryPage() {
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | StaffType>('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGender, setFilterGender] = useState('all');

    // Pagination
    const [page, setPage] = useState(1);
    const perPage = 15;

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<StaffType>('teacher');
    const [newStaffType, setNewStaffType] = useState<StaffType>('teacher');
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const [teachersRes, supportRes, subRes] = await Promise.all([
                supabase.from('school_teachers').select('*').order('first_name'),
                supabase.from('school_support_teachers').select('*').order('first_name'),
                supabase.from('school_subordinate_staff').select('*').order('first_name'),
            ]);

            const teachers: StaffMember[] = (teachersRes.data || []).map(t => ({ ...t, basic_salary: Number(t.basic_salary || 0), _type: 'teacher' as StaffType, _typeLabel: 'TSC Teacher' }));
            const support: StaffMember[] = (supportRes.data || []).map(s => ({ ...s, basic_salary: Number(s.basic_salary || 0), _type: 'support' as StaffType, _typeLabel: 'Support Teacher' }));
            const subordinate: StaffMember[] = (subRes.data || []).map(s => ({ ...s, basic_salary: Number(s.basic_salary || 0), _type: 'subordinate' as StaffType, _typeLabel: 'Support Staff' }));

            setAllStaff([...teachers, ...support, ...subordinate]);
        } catch (e) { console.error(e); toast.error('Failed to load staff'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // Filter + search
    const filtered = allStaff.filter(s => {
        if (filterType !== 'all' && s._type !== filterType) return false;
        if (filterStatus !== 'all' && s.status !== filterStatus) return false;
        if (filterGender !== 'all' && s.gender !== filterGender) return false;
        if (search) {
            const q = search.toLowerCase();
            return (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) ||
                (s.staff_no || '').toLowerCase().includes(q) ||
                (s.tsc_number || '').toLowerCase().includes(q) ||
                (s.phone || '').includes(q) ||
                (s.id_number || '').includes(q);
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    // Stats
    const totalActive = allStaff.filter(s => s.status === 'Active').length;
    const totalTeachers = allStaff.filter(s => s._type === 'teacher').length;
    const totalSupport = allStaff.filter(s => s._type === 'support').length;
    const totalSubordinate = allStaff.filter(s => s._type === 'subordinate').length;

    const getTableName = (type: StaffType) => {
        if (type === 'teacher') return 'school_teachers';
        if (type === 'support') return 'school_support_teachers';
        return 'school_subordinate_staff';
    };

    const openAddModal = (type: StaffType) => {
        setEditingId(null);
        setNewStaffType(type);
        setEditingType(type);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    const openEditModal = (staff: StaffMember) => {
        setEditingId(staff.id);
        setEditingType(staff._type);
        setNewStaffType(staff._type);
        setForm({
            first_name: staff.first_name || '', last_name: staff.last_name || '',
            email: staff.email || '', phone: staff.phone || '', gender: staff.gender || 'Male',
            id_number: staff.id_number || '', qualification: staff.qualification || '',
            department: staff.department || '', designation: staff.designation || '',
            role: staff.role || '', basic_salary: staff.basic_salary || 0,
            status: staff.status || 'Active', staff_no: staff.staff_no || '',
            tsc_number: staff.tsc_number || '',
            date_of_employment: staff.date_of_employment || staff.date_hired || staff.employment_date || '',
            contract_type: staff.contract_type || 'Permanent',
            bank_name: staff.bank_name || '', bank_account: staff.bank_account || '',
            kra_pin: staff.kra_pin || '', nhif_no: staff.nhif_no || '', nssf_no: staff.nssf_no || '',
            emergency_contact_name: staff.emergency_contact_name || '',
            emergency_contact_phone: staff.emergency_contact_phone || '',
            notes: staff.notes || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('First and Last name required'); return; }
        setSaving(true);
        try {
            const table = getTableName(newStaffType);
            const payload: Record<string, any> = {
                first_name: form.first_name.trim(), last_name: form.last_name.trim(),
                email: form.email || null, phone: form.phone || null,
                gender: form.gender, id_number: form.id_number || null,
                qualification: form.qualification || null,
                basic_salary: Number(form.basic_salary) || 0,
                status: form.status, staff_no: form.staff_no || null,
                notes: form.notes || null,
            };

            if (newStaffType === 'teacher') {
                payload.tsc_number = form.tsc_number || null;
                payload.department = form.department || null;
                payload.designation = form.designation || null;
                payload.employment_date = form.date_of_employment || null;
                payload.bank_name = form.bank_name || null;
                payload.bank_account = form.bank_account || null;
                payload.kra_pin = form.kra_pin || null;
                payload.nhif_no = form.nhif_no || null;
                payload.nssf_no = form.nssf_no || null;
                payload.emergency_contact_name = form.emergency_contact_name || null;
                payload.emergency_contact_phone = form.emergency_contact_phone || null;
            } else if (newStaffType === 'support') {
                payload.contract_type = form.contract_type || 'Contract';
                payload.date_hired = form.date_of_employment || null;
            } else {
                payload.role = form.role || null;
                payload.department = form.department || null;
                payload.date_hired = form.date_of_employment || null;
            }

            let error;
            if (editingId && editingType === newStaffType) {
                ({ error } = await supabase.from(table).update(payload).eq('id', editingId));
            } else {
                ({ error } = await supabase.from(table).insert([payload]));
            }

            if (error) throw error;
            toast.success(editingId ? 'Staff updated ✅' : 'Staff added ✅');
            setShowModal(false);
            fetchStaff();
        } catch (e: any) {
            toast.error(e.message || 'Failed to save');
        }
        setSaving(false);
    };

    const handleDelete = async (staff: StaffMember) => {
        if (!confirm(`Delete ${staff.first_name} ${staff.last_name}? This cannot be undone.`)) return;
        const table = getTableName(staff._type);
        const { error } = await supabase.from(table).delete().eq('id', staff.id);
        if (error) { toast.error('Delete failed'); return; }
        toast.success('Staff deleted');
        fetchStaff();
    };

    const exportCSV = () => {
        if (filtered.length === 0) return;
        const headers = ['#', 'Staff No', 'Name', 'Type', 'Gender', 'Phone', 'ID No', 'Salary', 'Status'];
        const rows = filtered.map((s, i) => [
            i + 1, s.staff_no || '', `${s.first_name} ${s.last_name}`, s._typeLabel,
            s.gender, s.phone || '', s.id_number || '', s.basic_salary, s.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `staff_directory_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Staff Directory...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiUsers className="text-indigo-500" /> Staff Directory
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all teaching and non-teaching staff records</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FiDownload size={14} /> Export</button>
                    <div className="relative group">
                        <button className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiUserPlus size={14} /> Add Staff
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <button onClick={() => openAddModal('teacher')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-all flex items-center gap-2">
                                <FiUserCheck size={14} className="text-blue-500" /> TSC Teacher
                            </button>
                            <button onClick={() => openAddModal('support')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-all flex items-center gap-2">
                                <FiUsers size={14} className="text-purple-500" /> Support Teacher
                            </button>
                            <button onClick={() => openAddModal('subordinate')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all flex items-center gap-2">
                                <FiBriefcase size={14} className="text-amber-500" /> Support Staff
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'All Staff', value: allStaff.length, color: '#6366f1', active: filterType === 'all', onClick: () => setFilterType('all') },
                    { label: 'TSC Teachers', value: totalTeachers, color: '#3b82f6', active: filterType === 'teacher', onClick: () => setFilterType(filterType === 'teacher' ? 'all' : 'teacher') },
                    { label: 'Support Teachers', value: totalSupport, color: '#8b5cf6', active: filterType === 'support', onClick: () => setFilterType(filterType === 'support' ? 'all' : 'support') },
                    { label: 'Support Staff', value: totalSubordinate, color: '#f59e0b', active: filterType === 'subordinate', onClick: () => setFilterType(filterType === 'subordinate' ? 'all' : 'subordinate') },
                    { label: 'Active', value: totalActive, color: '#22c55e', active: false, onClick: () => setFilterStatus(filterStatus === 'Active' ? 'all' : 'Active') },
                ].map((s, i) => (
                    <button key={i} onClick={s.onClick}
                        className={`bg-white rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${s.active ? 'border-indigo-400 shadow-md' : 'border-gray-200'}`}>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search by name, staff no, TSC no, phone, ID..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none transition-all" />
                    </div>
                    <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none">
                        <option value="all">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none">
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Showing <span className="font-bold">{filtered.length}</span> staff members</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Staff No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Full Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Gender</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Salary</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={10} className="text-center py-16 text-gray-400">No staff found matching your criteria</td></tr>
                            ) : paginated.map((s, i) => (
                                <tr key={`${s._type}-${s.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-indigo-600">{s.staff_no || s.tsc_number || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: s._type === 'teacher' ? '#3b82f6' : s._type === 'support' ? '#8b5cf6' : '#f59e0b' }}>
                                                {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                                {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><span className={`badge ${s._type === 'teacher' ? 'badge-blue' : s._type === 'support' ? 'badge-purple' : 'badge-warning'}`}>{s._typeLabel}</span></td>
                                    <td className="px-4 py-3"><span className={`badge ${s.gender === 'Male' ? 'badge-blue' : 'badge-pink'}`}>{s.gender}</span></td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.phone || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{s.department || s.designation || s.role || '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(s.basic_salary)}</td>
                                    <td className="px-4 py-3 text-center"><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => { setViewStaff(s); setShowDetailModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="View"><FiEye size={14} /></button>
                                            <button onClick={() => openEditModal(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Edit"><FiEdit2 size={14} /></button>
                                            <button onClick={() => handleDelete(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete"><FiTrash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronLeft size={16} /></button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pn = page <= 3 ? i + 1 : page + i - 2;
                                if (pn < 1 || pn > totalPages) return null;
                                return (
                                    <button key={pn} onClick={() => setPage(pn)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${pn === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{pn}</button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail View Modal */}
            {showDetailModal && viewStaff && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiEye /> Staff Profile</h2>
                            <button onClick={() => setShowDetailModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: viewStaff._type === 'teacher' ? '#3b82f6' : viewStaff._type === 'support' ? '#8b5cf6' : '#f59e0b' }}>
                                    {viewStaff.first_name?.charAt(0)}{viewStaff.last_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{viewStaff.first_name} {viewStaff.last_name}</h3>
                                    <p className="text-sm text-gray-500">{viewStaff._typeLabel} • {viewStaff.department || viewStaff.designation || viewStaff.role || 'N/A'}</p>
                                    <span className={`badge mt-1 ${viewStaff.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{viewStaff.status}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Staff No', value: viewStaff.staff_no },
                                    { label: 'TSC Number', value: viewStaff.tsc_number },
                                    { label: 'ID Number', value: viewStaff.id_number },
                                    { label: 'Gender', value: viewStaff.gender },
                                    { label: 'Phone', value: viewStaff.phone },
                                    { label: 'Email', value: viewStaff.email },
                                    { label: 'Qualification', value: viewStaff.qualification },
                                    { label: 'Basic Salary', value: fmt(viewStaff.basic_salary) },
                                    { label: 'Bank', value: viewStaff.bank_name },
                                    { label: 'Bank Account', value: viewStaff.bank_account },
                                    { label: 'KRA PIN', value: viewStaff.kra_pin },
                                    { label: 'NHIF No', value: viewStaff.nhif_no },
                                    { label: 'NSSF No', value: viewStaff.nssf_no },
                                    { label: 'Emergency Contact', value: viewStaff.emergency_contact_name },
                                    { label: 'Emergency Phone', value: viewStaff.emergency_contact_phone },
                                ].filter(f => f.value).map((f, i) => (
                                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-400 font-semibold uppercase">{f.label}</p>
                                        <p className="text-sm font-medium text-gray-800 mt-1">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                            {viewStaff.notes && (
                                <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
                                    <p className="text-xs text-amber-600 font-semibold uppercase mb-1">Notes</p>
                                    <p className="text-sm text-gray-700">{viewStaff.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {editingId ? <><FiEdit2 /> Edit Staff</> : <><FiUserPlus /> Add New Staff</>}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Staff Type Selector */}
                            {!editingId && (
                                <div>
                                    <label className={labelCls}>Staff Category</label>
                                    <div className="flex gap-2">
                                        {[
                                            { v: 'teacher' as StaffType, label: 'TSC Teacher', color: '#3b82f6' },
                                            { v: 'support' as StaffType, label: 'Support Teacher', color: '#8b5cf6' },
                                            { v: 'subordinate' as StaffType, label: 'Support Staff', color: '#f59e0b' },
                                        ].map(t => (
                                            <button key={t.v} onClick={() => setNewStaffType(t.v)}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${newStaffType === t.v ? 'text-white shadow-md' : 'text-gray-600 border-gray-200 bg-white'}`}
                                                style={newStaffType === t.v ? { background: t.color, borderColor: t.color } : {}}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Personal Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Personal Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div><label className={labelCls}>First Name *</label><input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Last Name *</label><input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Gender</label><select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputCls}><option>Male</option><option>Female</option></select></div>
                                    <div><label className={labelCls}>ID Number</label><input type="text" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Phone</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></div>
                                </div>
                            </div>

                            {/* Employment Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Employment Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div><label className={labelCls}>Staff No</label><input type="text" value={form.staff_no} onChange={e => setForm({ ...form, staff_no: e.target.value })} className={inputCls} /></div>
                                    {newStaffType === 'teacher' && (
                                        <div><label className={labelCls}>TSC Number</label><input type="text" value={form.tsc_number} onChange={e => setForm({ ...form, tsc_number: e.target.value })} className={inputCls} /></div>
                                    )}
                                    <div><label className={labelCls}>Qualification</label><input type="text" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} className={inputCls} placeholder="e.g. B.Ed, Diploma" /></div>
                                    <div><label className={labelCls}>{newStaffType === 'subordinate' ? 'Role' : 'Department'}</label><input type="text" value={newStaffType === 'subordinate' ? form.role : form.department} onChange={e => setForm(newStaffType === 'subordinate' ? { ...form, role: e.target.value } : { ...form, department: e.target.value })} className={inputCls} /></div>
                                    {newStaffType === 'teacher' && (
                                        <div><label className={labelCls}>Designation</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className={inputCls} placeholder="e.g. HOD, Class Teacher" /></div>
                                    )}
                                    {newStaffType === 'support' && (
                                        <div><label className={labelCls}>Contract Type</label><select value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} className={inputCls}><option>Contract</option><option>Part-time</option></select></div>
                                    )}
                                    <div><label className={labelCls}>Date Employed</label><input type="date" value={form.date_of_employment} onChange={e => setForm({ ...form, date_of_employment: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Active</option><option>Inactive</option><option>On Leave</option><option>Terminated</option></select></div>
                                </div>
                            </div>

                            {/* Financial Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Salary & Banking</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div><label className={labelCls}>Basic Salary (KES)</label><input type="number" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: Number(e.target.value) })} className={inputCls} /></div>
                                    {newStaffType === 'teacher' && (
                                        <>
                                            <div><label className={labelCls}>Bank Name</label><input type="text" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className={inputCls} /></div>
                                            <div><label className={labelCls}>Bank Account</label><input type="text" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} className={inputCls} /></div>
                                            <div><label className={labelCls}>KRA PIN</label><input type="text" value={form.kra_pin} onChange={e => setForm({ ...form, kra_pin: e.target.value })} className={inputCls} /></div>
                                            <div><label className={labelCls}>NHIF No</label><input type="text" value={form.nhif_no} onChange={e => setForm({ ...form, nhif_no: e.target.value })} className={inputCls} /></div>
                                            <div><label className={labelCls}>NSSF No</label><input type="text" value={form.nssf_no} onChange={e => setForm({ ...form, nssf_no: e.target.value })} className={inputCls} /></div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Emergency + Notes */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Emergency Contact & Notes</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className={labelCls}>Emergency Contact Name</label><input type="text" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} className={inputCls} /></div>
                                    <div><label className={labelCls}>Emergency Contact Phone</label><input type="text" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} className={inputCls} /></div>
                                </div>
                                <div className="mt-3"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={3} /></div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={14} /> {editingId ? 'Update Staff' : 'Add Staff'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

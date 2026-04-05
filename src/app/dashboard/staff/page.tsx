'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch, FiDownload, FiUpload } from 'react-icons/fi';
import { KENYAN_COUNTIES, COUNTY_NAMES, NATIONALITIES } from '@/lib/kenyan-data';

type StaffType = 'Teaching' | 'Non-Teaching' | 'Subordinate';

interface Teacher {
    id?: number; staff_type: StaffType; tsc_number: string; first_name: string; last_name: string; middle_name: string;
    gender: string; date_of_birth: string; id_number: string; phone: string; email: string;
    nationality: string; county: string; sub_county: string;
    qualification: string; specialization: string; employment_date: string; employment_type: string;
    designation: string; department: string; status: string;
    bank_name: string; bank_account: string; kra_pin: string; nhif_no: string; nssf_no: string;
    emergency_contact_name: string; emergency_contact_phone: string;
    notes: string;
}

const defaultTeacher: Teacher = {
    staff_type: 'Teaching', tsc_number: '', first_name: '', last_name: '', middle_name: '',
    gender: 'Male', date_of_birth: '', id_number: '', phone: '', email: '',
    nationality: 'Kenyan', county: '', sub_county: '',
    qualification: '', specialization: '', employment_date: new Date().toISOString().split('T')[0], employment_type: 'Permanent',
    designation: '', department: '', status: 'Active',
    bank_name: '', bank_account: '', kra_pin: '', nhif_no: '', nssf_no: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    notes: '',
};

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Teacher>({ ...defaultTeacher });
    const [modalTab, setModalTab] = useState(0);
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, su] = await Promise.all([
            supabase.from('school_teachers').select('*').order('first_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
        ]);
        setStaff(s.data || []);
        setSubjects(su.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = staff.filter(s => {
        const matchSearch = `${s.first_name} ${s.last_name} ${s.tsc_number || ''} ${s.id_number || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || s.staff_type === filterType;
        const matchStatus = !filterStatus || s.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const openAdd = () => { setEditId(null); setFormData({ ...defaultTeacher }); setSelectedSubjects([]); setModalTab(0); setShowModal(true); };
    const openEdit = async (item: any) => {
        setEditId(item.id);
        setFormData({ ...defaultTeacher, ...item });
        // Fetch linked subjects
        try {
            const { data } = await supabase.from('school_subject_teachers').select('subject_id').eq('teacher_id', item.id);
            setSelectedSubjects(data?.map(d => d.subject_id) || []);
        } catch { setSelectedSubjects([]); }
        setModalTab(0); setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.first_name || !formData.last_name) { toast.error('First name and last name are required'); return; }
        if (formData.staff_type === 'Teaching' && !formData.tsc_number) { toast.error('TSC Number is required for teaching staff'); return; }
        const payload: any = { ...formData };
        delete payload.id;
        let error, teacherId = editId;
        if (editId) {
            ({ error } = await supabase.from('school_teachers').update(payload).eq('id', editId));
        } else {
            const res = await supabase.from('school_teachers').insert([payload]).select('id').single();
            error = res.error;
            teacherId = res.data?.id;
        }
        if (error) { toast.error(error.message || 'Failed to save'); return; }

        // Update subject links for teaching staff
        if (formData.staff_type === 'Teaching' && teacherId) {
            await supabase.from('school_subject_teachers').delete().eq('teacher_id', teacherId);
            if (selectedSubjects.length > 0) {
                const links = selectedSubjects.map(sid => ({ teacher_id: teacherId, subject_id: sid }));
                await supabase.from('school_subject_teachers').insert(links);
            }
        }

        toast.success(editId ? 'Staff updated ✅' : 'Staff added ✅');
        setShowModal(false); fetchAll();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this staff member?')) return;
        await supabase.from('school_subject_teachers').delete().eq('teacher_id', id);
        const { error } = await supabase.from('school_teachers').delete().eq('id', id);
        if (error) { toast.error('Cannot delete this staff member'); return; }
        toast.success('Staff removed'); fetchAll();
    };

    const exportCSV = () => {
        const headers = ['Staff Type', 'TSC No', 'First Name', 'Last Name', 'Gender', 'ID No', 'Phone', 'Email', 'Qualification', 'Designation', 'Status'];
        const rows = filtered.map(s => [s.staff_type, s.tsc_number || '', s.first_name, s.last_name, s.gender, s.id_number || '', s.phone || '', s.email || '', s.qualification || '', s.designation || '', s.status]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `APSIMS_Staff_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Staff exported ✅');
    };

    const toggleSubject = (id: number) => {
        setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const subCounties = formData.county ? KENYAN_COUNTIES[formData.county] || [] : [];
    const modalTabs = ['📋 Personal', '🏠 Location', '🎓 Professional', '🏦 Payroll', '📚 Subjects'];

    const teachingCount = staff.filter(s => s.staff_type === 'Teaching').length;
    const nonTeachingCount = staff.filter(s => s.staff_type === 'Non-Teaching').length;
    const subordinateCount = staff.filter(s => s.staff_type === 'Subordinate').length;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">👨‍🏫 Staff Management</h1>
                    <p className="text-sm text-gray-500 mt-1">{staff.length} total • {teachingCount} Teaching • {nonTeachingCount} Non-Teaching • {subordinateCount} Subordinate</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportCSV} className="btn-outline flex items-center gap-1.5 text-sm"><FiDownload size={14} /> Export</button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm"><FiPlus size={16} /> Add Staff</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'All Staff', count: staff.length, icon: '👥', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
                    { label: 'Teaching', count: teachingCount, icon: '👨‍🏫', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
                    { label: 'Non-Teaching', count: nonTeachingCount, icon: '👔', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                    { label: 'Subordinate', count: subordinateCount, icon: '🔧', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
                ].map((c, i) => (
                    <div key={i} className="rounded-2xl p-4 text-white" style={{ background: c.gradient }}>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl">{c.icon}</span>
                            <span className="text-2xl font-bold">{c.count}</span>
                        </div>
                        <p className="text-xs mt-2 opacity-90 font-semibold">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, TSC No, ID No..."
                        className="input-modern pl-10 py-2.5 text-sm" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                    <option value="">All Types</option>
                    <option value="Teaching">👨‍🏫 Teaching</option>
                    <option value="Non-Teaching">👔 Non-Teaching</option>
                    <option value="Subordinate">🔧 Subordinate</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[120px]">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Terminated">Terminated</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">👨‍🏫</span><p className="font-medium">No staff found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Type</th><th>TSC No</th><th>Staff Name</th><th>Gender</th><th>Phone</th><th>Designation</th><th>Qualification</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((s, i) => (
                                        <tr key={s.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(s)}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td><span className={`badge ${s.staff_type === 'Teaching' ? 'badge-success' : s.staff_type === 'Non-Teaching' ? 'badge-warning' : 'badge-danger'}`}>
                                                {s.staff_type === 'Teaching' ? '👨‍🏫' : s.staff_type === 'Non-Teaching' ? '👔' : '🔧'} {s.staff_type}
                                            </span></td>
                                            <td className="font-bold text-blue-600">{s.tsc_number || '-'}</td>
                                            <td className="font-semibold">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</td>
                                            <td><span className={`badge ${s.gender === 'Male' ? 'badge-blue' : 'badge-pink'}`}>{s.gender}</span></td>
                                            <td className="text-sm">{s.phone || '-'}</td>
                                            <td className="text-sm">{s.designation || '-'}</td>
                                            <td className="text-sm">{s.qualification || '-'}</td>
                                            <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                                            <td>
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button>
                                                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Staff Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 pt-6 pb-3">
                            <h3 className="text-lg font-bold text-gray-800">{editId ? '✏️ Edit Staff' : '➕ Add New Staff'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 pb-3 overflow-x-auto">
                            {modalTabs.map((t, i) => (
                                <button key={i} onClick={() => setModalTab(i)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${modalTab === i ? 'text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                                    style={modalTab === i ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {/* Tab 0: Personal */}
                            {modalTab === 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="lbl">Staff Type *</label>
                                        <div className="flex gap-2">
                                            {(['Teaching', 'Non-Teaching', 'Subordinate'] as StaffType[]).map(type => (
                                                <button key={type} onClick={() => setFormData({ ...formData, staff_type: type })}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${formData.staff_type === type ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                    style={formData.staff_type === type ? { background: type === 'Teaching' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : type === 'Non-Teaching' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)' } : {}}>
                                                    {type === 'Teaching' ? '👨‍🏫' : type === 'Non-Teaching' ? '👔' : '🔧'} {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {formData.staff_type === 'Teaching' && (
                                        <div><label className="lbl">TSC Number *</label><input type="text" value={formData.tsc_number} onChange={e => setFormData({ ...formData, tsc_number: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. TSC/123456" /></div>
                                    )}
                                    <div><label className="lbl">First Name *</label><input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Middle Name</label><input type="text" value={formData.middle_name} onChange={e => setFormData({ ...formData, middle_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Last Name *</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Gender</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="select-modern w-full"><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                    <div><label className="lbl">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">ID Number</label><input type="text" value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Phone</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="0712345678" /></div>
                                    <div><label className="lbl">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="select-modern w-full"><option value="Active">✅ Active</option><option value="On Leave">📋 On Leave</option><option value="Suspended">⚠️ Suspended</option><option value="Terminated">❌ Terminated</option></select></div>
                                </div>
                            )}

                            {/* Tab 1: Location */}
                            {modalTab === 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Nationality</label><select value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className="select-modern w-full">{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                                    <div><label className="lbl">County</label><select value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value, sub_county: '' })} className="select-modern w-full"><option value="">Select County</option>{COUNTY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div><label className="lbl">Sub-County</label><select value={formData.sub_county} onChange={e => setFormData({ ...formData, sub_county: e.target.value })} className="select-modern w-full" disabled={!formData.county}><option value="">Select Sub-County</option>{subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></div>
                                    <div className="sm:col-span-2"><label className="lbl">Emergency Contact</label><div className="grid grid-cols-2 gap-3"><input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="Contact name" /><input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="Phone" /></div></div>
                                </div>
                            )}

                            {/* Tab 2: Professional */}
                            {modalTab === 2 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Qualification</label><select value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} className="select-modern w-full"><option value="">Select</option><option value="PhD">PhD</option><option value="Masters">Masters</option><option value="Bachelors">Bachelors / B.Ed</option><option value="Diploma">Diploma</option><option value="Certificate">Certificate</option><option value="KCSE">KCSE</option><option value="KCPE">KCPE</option><option value="Other">Other</option></select></div>
                                    <div><label className="lbl">Specialization</label><input type="text" value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Mathematics" /></div>
                                    <div><label className="lbl">Employment Date</label><input type="date" value={formData.employment_date} onChange={e => setFormData({ ...formData, employment_date: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Employment Type</label><select value={formData.employment_type} onChange={e => setFormData({ ...formData, employment_type: e.target.value })} className="select-modern w-full"><option value="Permanent">Permanent (P&P)</option><option value="Contract">Contract</option><option value="Intern">Intern</option><option value="BOM">BOM</option><option value="Casual">Casual</option></select></div>
                                    <div><label className="lbl">Designation</label><input type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Senior Teacher" /></div>
                                    <div><label className="lbl">Department</label><input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Science" /></div>
                                </div>
                            )}

                            {/* Tab 3: Payroll */}
                            {modalTab === 3 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium">🏦 Payroll & Statutory Deductions</div>
                                    <div><label className="lbl">Bank Name</label><input type="text" value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. KCB, Equity" /></div>
                                    <div><label className="lbl">Bank Account No</label><input type="text" value={formData.bank_account} onChange={e => setFormData({ ...formData, bank_account: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">KRA PIN</label><input type="text" value={formData.kra_pin} onChange={e => setFormData({ ...formData, kra_pin: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. A000000000A" /></div>
                                    <div><label className="lbl">NHIF No</label><input type="text" value={formData.nhif_no} onChange={e => setFormData({ ...formData, nhif_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">NSSF No</label><input type="text" value={formData.nssf_no} onChange={e => setFormData({ ...formData, nssf_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                </div>
                            )}

                            {/* Tab 4: Subjects */}
                            {modalTab === 4 && (
                                <div className="space-y-4">
                                    {formData.staff_type === 'Teaching' ? (
                                        <>
                                            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-700 font-medium">📚 Select subjects this teacher handles (click to toggle)</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {subjects.map(sub => (
                                                    <button key={sub.id} onClick={() => toggleSubject(sub.id)}
                                                        className={`p-3 rounded-xl text-sm font-semibold transition-all border-2 text-left ${selectedSubjects.includes(sub.id) ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                                                        <span className="text-base mr-1">{selectedSubjects.includes(sub.id) ? '✅' : '⬜'}</span>
                                                        {sub.subject_name}
                                                        {sub.subject_code && <span className="block text-[10px] text-gray-400 mt-0.5">{sub.subject_code}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                            {subjects.length === 0 && (
                                                <p className="text-center text-gray-400 text-sm py-8">No subjects created yet. Go to Settings → Subjects to add them first.</p>
                                            )}
                                            <p className="text-xs text-gray-500">{selectedSubjects.length} subject(s) selected</p>
                                        </>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <span className="text-4xl block mb-3">📚</span>
                                            <p className="font-medium">Subject linking is only for Teaching staff</p>
                                            <p className="text-sm mt-1">Change staff type to {`"Teaching"`} to assign subjects</p>
                                        </div>
                                    )}
                                    <div><label className="lbl">Additional Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-modern pl-4 py-2.5 text-sm min-h-[80px]" /></div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex gap-2">
                                {modalTab > 0 && <button onClick={() => setModalTab(modalTab - 1)} className="btn-outline text-sm">← Previous</button>}
                            </div>
                            <div className="flex gap-2">
                                {modalTab < modalTabs.length - 1 ? (
                                    <button onClick={() => setModalTab(modalTab + 1)} className="btn-primary text-sm">Next →</button>
                                ) : (
                                    <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> {editId ? 'Update Staff' : 'Add Staff'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

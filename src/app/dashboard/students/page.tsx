'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch, FiDownload, FiUpload, FiFilter } from 'react-icons/fi';
import { KENYAN_COUNTIES, COUNTY_NAMES, NATIONALITIES } from '@/lib/kenyan-data';

interface Student {
    id?: number; admission_no: string; first_name: string; last_name: string; middle_name: string;
    gender: string; date_of_birth: string; form_id: number | null; stream_id: number | null;
    admission_date: string; status: string;
    nationality: string; county: string; sub_county: string; village: string;
    guardian_name: string; guardian_phone: string; guardian_email: string; guardian_relationship: string; guardian_id_no: string; guardian_occupation: string;
    emergency_contact_name: string; emergency_contact_phone: string;
    blood_group: string; medical_conditions: string; special_needs: string;
    previous_school: string; kcpe_marks: string; birth_cert_no: string; nemis_no: string;
    religion: string; notes: string;
}

const defaultStudent: Student = {
    admission_no: '', first_name: '', last_name: '', middle_name: '', gender: 'Male',
    date_of_birth: '', form_id: null, stream_id: null, admission_date: new Date().toISOString().split('T')[0],
    status: 'Active', nationality: 'Kenyan', county: '', sub_county: '', village: '',
    guardian_name: '', guardian_phone: '', guardian_email: '', guardian_relationship: 'Parent', guardian_id_no: '', guardian_occupation: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    blood_group: '', medical_conditions: '', special_needs: '',
    previous_school: '', kcpe_marks: '', birth_cert_no: '', nemis_no: '',
    religion: '', notes: '',
};

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Student>({ ...defaultStudent });
    const [modalTab, setModalTab] = useState(0);
    const [showImport, setShowImport] = useState(false);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const [s, f, st] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    const filtered = students.filter(s => {
        const matchSearch = `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchForm = !filterForm || String(s.form_id) === filterForm;
        const matchStream = !filterStream || String(s.stream_id) === filterStream;
        const matchStatus = !filterStatus || s.status === filterStatus;
        return matchSearch && matchForm && matchStream && matchStatus;
    });

    const getNextAdmNo = () => {
        let max = 100;
        students.forEach(s => {
            const num = parseInt(s.admission_no || s.admission_number || '0', 10);
            if (!isNaN(num) && num > max) max = num;
        });
        return String(max + 1);
    };

    const openAdd = () => { setEditId(null); setFormData({ ...defaultStudent, admission_no: getNextAdmNo() }); setModalTab(0); setShowModal(true); };
    const openEdit = (s: any) => {
        setEditId(s.id);
        setFormData({
            ...defaultStudent, ...s,
            admission_no: s.admission_no || s.admission_number || '',
            middle_name: s.middle_name || s.other_name || '',
            medical_conditions: s.medical_conditions || s.medical_info || '',
            form_id: s.form_id || null,
            stream_id: s.stream_id || null,
        });
        setModalTab(0); setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.admission_no || !formData.first_name || !formData.last_name) { toast.error('Please fill admission number, first name and last name'); return; }
        // Map frontend field names to database column names
        const payload: any = {
            admission_number: formData.admission_no,
            admission_no: formData.admission_no,
            first_name: formData.first_name,
            last_name: formData.last_name,
            other_name: formData.middle_name || null,
            middle_name: formData.middle_name || null,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth || null,
            form_id: formData.form_id ? Number(formData.form_id) : null,
            stream_id: formData.stream_id ? Number(formData.stream_id) : null,
            admission_date: formData.admission_date || null,
            status: formData.status,
            nationality: formData.nationality || null,
            county: formData.county || null,
            sub_county: formData.sub_county || null,
            village: formData.village || null,
            guardian_name: formData.guardian_name || null,
            guardian_phone: formData.guardian_phone || null,
            guardian_email: formData.guardian_email || null,
            guardian_relationship: formData.guardian_relationship || null,
            guardian_id_no: formData.guardian_id_no || null,
            guardian_occupation: formData.guardian_occupation || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            blood_group: formData.blood_group || null,
            medical_info: formData.medical_conditions || null,
            medical_conditions: formData.medical_conditions || null,
            special_needs: formData.special_needs || null,
            previous_school: formData.previous_school || null,
            kcpe_marks: formData.kcpe_marks ? Number(formData.kcpe_marks) : null,
            birth_cert_no: formData.birth_cert_no || null,
            nemis_no: formData.nemis_no || null,
            religion: formData.religion || null,
            notes: formData.notes || null,
        };

        let error;
        if (editId) ({ error } = await supabase.from('school_students').update(payload).eq('id', editId));
        else ({ error } = await supabase.from('school_students').insert([payload]));
        if (error) { toast.error(error.message || 'Failed to save'); return; }
        toast.success(editId ? 'Student updated ✅' : 'Student enrolled ✅');
        setShowModal(false); fetchStudents();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        const { error } = await supabase.from('school_students').delete().eq('id', id);
        if (error) { toast.error('Cannot delete this student'); return; }
        toast.success('Student removed'); fetchStudents();
    };

    // Excel Export
    const exportToExcel = () => {
        const headers = ['Adm No', 'First Name', 'Last Name', 'Middle Name', 'Gender', 'DOB', 'Form', 'Stream', 'Status', 'Nationality', 'County', 'Sub-County', 'Village', 'Guardian', 'Guardian Phone', 'Guardian Email', 'Guardian Relationship', 'KCPE Marks', 'Previous School', 'NEMIS No', 'Birth Cert No', 'Religion', 'Blood Group', 'Special Needs'];
        const rows = filtered.map(s => [
            s.admission_no, s.first_name, s.last_name, s.middle_name || '', s.gender,
            s.date_of_birth || '', getFormName(s.form_id), getStreamName(s.stream_id), s.status,
            s.nationality || '', s.county || '', s.sub_county || '', s.village || '',
            s.guardian_name || '', s.guardian_phone || '', s.guardian_email || '', s.guardian_relationship || '',
            s.kcpe_marks || '', s.previous_school || '', s.nemis_no || '', s.birth_cert_no || '',
            s.religion || '', s.blood_group || '', s.special_needs || '',
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `APSIMS_Students_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Students exported to CSV ✅');
    };

    // Excel Import
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { toast.error('Invalid file or no data rows'); return; }
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
            const admIdx = headers.indexOf('adm no');
            const fnIdx = headers.indexOf('first name');
            const lnIdx = headers.indexOf('last name');
            if (admIdx === -1 || fnIdx === -1 || lnIdx === -1) { toast.error('CSV must have columns: Adm No, First Name, Last Name'); return; }
            let imported = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (!cols[admIdx] || !cols[fnIdx] || !cols[lnIdx]) continue;
                const genderIdx = headers.indexOf('gender');
                const payload: any = {
                    admission_number: cols[admIdx], admission_no: cols[admIdx],
                    first_name: cols[fnIdx], last_name: cols[lnIdx],
                    other_name: cols[headers.indexOf('middle name')] || '',
                    middle_name: cols[headers.indexOf('middle name')] || '',
                    gender: genderIdx >= 0 ? cols[genderIdx] : 'Male',
                    status: 'Active',
                };
                const { error } = await supabase.from('school_students').insert([payload]);
                if (!error) imported++;
            }
            toast.success(`${imported} students imported ✅`);
            setShowImport(false); fetchStudents();
        };
        reader.readAsText(file);
    };

    const subCounties = formData.county ? KENYAN_COUNTIES[formData.county] || [] : [];

    const modalTabs = ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic'];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">👨‍🎓 Students</h1>
                    <p className="text-sm text-gray-500 mt-1">{students.length} students enrolled • {filtered.length} shown</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowImport(true)} className="btn-outline flex items-center gap-1.5 text-sm"><FiUpload size={14} /> Import</button>
                    <button onClick={exportToExcel} className="btn-outline flex items-center gap-1.5 text-sm"><FiDownload size={14} /> Export</button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm"><FiPlus size={16} /> Add Student</button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or adm no..."
                        className="input-modern pl-10 py-2.5 text-sm" />
                </div>
                <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[120px]">
                    <option value="">All Forms</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={filterStream} onChange={e => setFilterStream(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[120px]">
                    <option value="">All Streams</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[120px]">
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Suspended">Suspended</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">👨‍🎓</span><p className="font-medium">No students found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th><th>Form</th><th>Stream</th><th>Status</th><th>Guardian</th><th>Phone</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((s, i) => (
                                        <tr key={s.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(s)}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                            <td className="font-semibold">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</td>
                                            <td><span className={`badge ${s.gender === 'Male' ? 'badge-blue' : 'badge-pink'}`}>{s.gender === 'Male' ? '👦' : '👧'} {s.gender}</span></td>
                                            <td>{getFormName(s.form_id)}</td>
                                            <td>{getStreamName(s.stream_id)}</td>
                                            <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : s.status === 'Graduated' ? 'badge-blue' : 'badge-danger'}`}>{s.status}</span></td>
                                            <td className="text-sm">{s.guardian_name || '-'}</td>
                                            <td className="text-sm">{s.guardian_phone || '-'}</td>
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

            {/* Import Modal */}
            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal-content w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">📥 Import Students from CSV</h3>
                            <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                                <p className="font-semibold mb-1">📋 Required CSV Columns:</p>
                                <p className="text-xs">Adm No, First Name, Last Name, Middle Name, Gender, DOB, Status</p>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input type="file" accept=".csv,.xlsx" onChange={handleImportFile} className="hidden" id="csv-upload" />
                                <label htmlFor="csv-upload" className="cursor-pointer">
                                    <div className="text-4xl mb-3">📁</div>
                                    <p className="font-semibold text-gray-600">Click to upload CSV file</p>
                                    <p className="text-xs text-gray-400 mt-1">Supports .csv format</p>
                                </label>
                            </div>
                            <button onClick={() => {
                                const template = 'Adm No,First Name,Last Name,Middle Name,Gender,DOB,Status\n"001","John","Doe","","Male","2010-01-15","Active"';
                                const blob = new Blob([template], { type: 'text/csv' });
                                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'student_import_template.csv'; a.click();
                            }} className="btn-outline w-full flex items-center justify-center gap-2"><FiDownload size={14} /> Download Template</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-3">
                            <h3 className="text-lg font-bold text-gray-800">{editId ? '✏️ Edit Student' : '➕ Enroll New Student'}</h3>
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

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {/* Tab 0: Basic Info */}
                            {modalTab === 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Admission No *</label><input type="text" value={formData.admission_no} onChange={e => setFormData({ ...formData, admission_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. 2026/001" /></div>
                                    <div><label className="lbl">First Name *</label><input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Middle Name</label><input type="text" value={formData.middle_name} onChange={e => setFormData({ ...formData, middle_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Last Name *</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Gender *</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="select-modern w-full"><option value="Male">👦 Male</option><option value="Female">👧 Female</option></select></div>
                                    <div><label className="lbl">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Form</label><select value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value ? Number(e.target.value) : null })} className="select-modern w-full"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                                    <div><label className="lbl">Stream</label><select value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value ? Number(e.target.value) : null })} className="select-modern w-full"><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                                    <div><label className="lbl">Admission Date</label><input type="date" value={formData.admission_date} onChange={e => setFormData({ ...formData, admission_date: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="select-modern w-full"><option value="Active">✅ Active</option><option value="Inactive">❌ Inactive</option><option value="Transferred">🔄 Transferred</option><option value="Graduated">🎓 Graduated</option><option value="Suspended">⚠️ Suspended</option></select></div>
                                    <div><label className="lbl">Religion</label><select value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className="select-modern w-full"><option value="">Select</option><option value="Christian">Christian</option><option value="Muslim">Muslim</option><option value="Hindu">Hindu</option><option value="Traditional">Traditional</option><option value="Other">Other</option></select></div>
                                </div>
                            )}

                            {/* Tab 1: Location */}
                            {modalTab === 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Nationality</label><select value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className="select-modern w-full">{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                                    <div><label className="lbl">County</label><select value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value, sub_county: '' })} className="select-modern w-full"><option value="">Select County</option>{COUNTY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div><label className="lbl">Sub-County</label><select value={formData.sub_county} onChange={e => setFormData({ ...formData, sub_county: e.target.value })} className="select-modern w-full" disabled={!formData.county}><option value="">Select Sub-County</option>{subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></div>
                                    <div><label className="lbl">Village / Estate</label><input type="text" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                </div>
                            )}

                            {/* Tab 2: Guardian */}
                            {modalTab === 2 && (
                                <div className="space-y-5">
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium">👨‍👩‍👦 Primary Guardian / Parent Information</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="lbl">Guardian Full Name *</label><input type="text" value={formData.guardian_name} onChange={e => setFormData({ ...formData, guardian_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                        <div><label className="lbl">Phone Number *</label><input type="tel" value={formData.guardian_phone} onChange={e => setFormData({ ...formData, guardian_phone: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. 0712345678" /></div>
                                        <div><label className="lbl">Email</label><input type="email" value={formData.guardian_email} onChange={e => setFormData({ ...formData, guardian_email: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                        <div><label className="lbl">Relationship</label><select value={formData.guardian_relationship} onChange={e => setFormData({ ...formData, guardian_relationship: e.target.value })} className="select-modern w-full"><option value="Parent">Parent</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Guardian">Guardian</option><option value="Uncle">Uncle</option><option value="Aunt">Aunt</option><option value="Grandparent">Grandparent</option><option value="Sibling">Sibling</option><option value="Other">Other</option></select></div>
                                        <div><label className="lbl">ID Number</label><input type="text" value={formData.guardian_id_no} onChange={e => setFormData({ ...formData, guardian_id_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                        <div><label className="lbl">Occupation</label><input type="text" value={formData.guardian_occupation} onChange={e => setFormData({ ...formData, guardian_occupation: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">🚨 Emergency Contact</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="lbl">Emergency Contact Name</label><input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                        <div><label className="lbl">Emergency Phone</label><input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Medical */}
                            {modalTab === 3 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Blood Group</label><select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className="select-modern w-full"><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                                    <div className="sm:col-span-2"><label className="lbl">Medical Conditions</label><textarea value={formData.medical_conditions} onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })} className="input-modern pl-4 py-2.5 text-sm min-h-[80px]" placeholder="e.g. Asthma, allergies..." /></div>
                                    <div className="sm:col-span-2"><label className="lbl">Special Needs / Disability</label><textarea value={formData.special_needs} onChange={e => setFormData({ ...formData, special_needs: e.target.value })} className="input-modern pl-4 py-2.5 text-sm min-h-[80px]" placeholder="Any special needs or accommodations" /></div>
                                </div>
                            )}

                            {/* Tab 4: Academic */}
                            {modalTab === 4 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="lbl">Previous School</label><input type="text" value={formData.previous_school} onChange={e => setFormData({ ...formData, previous_school: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">KCPE Marks</label><input type="text" value={formData.kcpe_marks} onChange={e => setFormData({ ...formData, kcpe_marks: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. 350" /></div>
                                    <div><label className="lbl">Birth Certificate No</label><input type="text" value={formData.birth_cert_no} onChange={e => setFormData({ ...formData, birth_cert_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div><label className="lbl">NEMIS / UPI Number</label><input type="text" value={formData.nemis_no} onChange={e => setFormData({ ...formData, nemis_no: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                    <div className="sm:col-span-2"><label className="lbl">Additional Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-modern pl-4 py-2.5 text-sm min-h-[80px]" /></div>
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
                                    <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> {editId ? 'Update Student' : 'Enroll Student'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

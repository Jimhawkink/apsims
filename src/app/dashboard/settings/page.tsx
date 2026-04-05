'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLink, FiUsers, FiInfo } from 'react-icons/fi';
import { counties, getSubCounties, nationalities } from '@/lib/kenyan-data';

type Tab = 'forms' | 'streams' | 'subjects' | 'classes' | 'subject-teachers' | 'school-details';

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>('school-details');
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]); // form-stream combos
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]); // subject-teacher links
    const [schoolDetails, setSchoolDetails] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<any>({});

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, su, t] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_teachers').select('id, first_name, last_name, tsc_number').order('first_name'),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(su.data || []);
        setTeachers(t.data || []);

        // Fetch classes (form-stream linking)
        try {
            const { data } = await supabase.from('school_classes').select('*');
            setClasses(data || []);
        } catch { setClasses([]); }

        // Fetch subject-teacher links
        try {
            const { data } = await supabase.from('school_subject_teachers').select('*');
            setSubjectTeachers(data || []);
        } catch { setSubjectTeachers([]); }

        // Fetch school details
        try {
            const { data } = await supabase.from('school_details').select('*').limit(1).single();
            if (data) setSchoolDetails(data);
        } catch { }

        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ====================== FORMS CRUD ======================
    const openAddForm = () => { setEditId(null); setFormData({ form_name: '', form_level: '', description: '' }); setShowModal(true); };
    const openEditForm = (item: any) => { setEditId(item.id); setFormData({ form_name: item.form_name, form_level: item.form_level, description: item.description || '' }); setShowModal(true); };
    const saveForm = async () => {
        if (!formData.form_name || !formData.form_level) { toast.error('Fill all required fields'); return; }
        const payload = { form_name: formData.form_name.trim(), form_level: Number(formData.form_level), description: formData.description || null };
        const { error } = editId ? await supabase.from('school_forms').update(payload).eq('id', editId) : await supabase.from('school_forms').insert([payload]);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Form updated ✅' : 'Form added ✅'); setShowModal(false); fetchAll();
    };
    const deleteForm = async (id: number) => { if (!confirm('Delete this form?')) return; const { error } = await supabase.from('school_forms').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

    // ====================== STREAMS CRUD ======================
    const openAddStream = () => { setEditId(null); setFormData({ stream_name: '', description: '' }); setShowModal(true); };
    const openEditStream = (item: any) => { setEditId(item.id); setFormData({ stream_name: item.stream_name, description: item.description || '' }); setShowModal(true); };
    const saveStream = async () => {
        if (!formData.stream_name) { toast.error('Stream name required'); return; }
        const payload = { stream_name: formData.stream_name.trim(), description: formData.description || null };
        const { error } = editId ? await supabase.from('school_streams').update(payload).eq('id', editId) : await supabase.from('school_streams').insert([payload]);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Stream updated ✅' : 'Stream added ✅'); setShowModal(false); fetchAll();
    };
    const deleteStream = async (id: number) => { if (!confirm('Delete this stream?')) return; const { error } = await supabase.from('school_streams').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

    // ====================== SUBJECTS CRUD ======================
    const openAddSubject = () => { setEditId(null); setFormData({ subject_name: '', subject_code: '', category: 'Core' }); setShowModal(true); };
    const openEditSubject = (item: any) => { setEditId(item.id); setFormData({ subject_name: item.subject_name, subject_code: item.subject_code || '', category: item.category || 'Core' }); setShowModal(true); };
    const saveSubject = async () => {
        if (!formData.subject_name) { toast.error('Subject name required'); return; }
        const payload = { subject_name: formData.subject_name.trim(), subject_code: formData.subject_code || null, category: formData.category };
        const { error } = editId ? await supabase.from('school_subjects').update(payload).eq('id', editId) : await supabase.from('school_subjects').insert([payload]);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Subject updated ✅' : 'Subject added ✅'); setShowModal(false); fetchAll();
    };
    const deleteSubject = async (id: number) => { if (!confirm('Delete this subject?')) return; const { error } = await supabase.from('school_subjects').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

    // ====================== CLASSES (Form-Stream + Class Teacher) ======================
    const openAddClass = () => { setEditId(null); setFormData({ form_id: '', stream_id: '', teacher_id: '', year: new Date().getFullYear() }); setShowModal(true); };
    const openEditClass = (item: any) => { setEditId(item.id); setFormData({ form_id: item.form_id, stream_id: item.stream_id, teacher_id: item.teacher_id || '', year: item.year || new Date().getFullYear() }); setShowModal(true); };
    const saveClass = async () => {
        if (!formData.form_id || !formData.stream_id) { toast.error('Select both form and stream'); return; }
        const payload = { form_id: Number(formData.form_id), stream_id: Number(formData.stream_id), teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null, year: Number(formData.year) };
        const { error } = editId ? await supabase.from('school_classes').update(payload).eq('id', editId) : await supabase.from('school_classes').insert([payload]);
        if (error) { toast.error(error.message || 'Failed — class may already exist'); return; }
        toast.success(editId ? 'Class updated ✅' : 'Class created ✅'); setShowModal(false); fetchAll();
    };
    const deleteClass = async (id: number) => { if (!confirm('Remove this class?')) return; const { error } = await supabase.from('school_classes').delete().eq('id', id); if (error) { toast.error('Cannot delete'); return; } toast.success('Removed'); fetchAll(); };

    // ====================== SUBJECT-TEACHER LINKING ======================
    const openAddSubjectTeacher = () => { setEditId(null); setFormData({ subject_id: '', teacher_id: '', form_id: '' }); setShowModal(true); };
    const openEditSubjectTeacher = (item: any) => { setEditId(item.id); setFormData({ subject_id: item.subject_id, teacher_id: item.teacher_id, form_id: item.form_id || '' }); setShowModal(true); };
    const saveSubjectTeacher = async () => {
        if (!formData.subject_id || !formData.teacher_id) { toast.error('Select both subject and teacher'); return; }
        const payload = { subject_id: Number(formData.subject_id), teacher_id: Number(formData.teacher_id), form_id: formData.form_id ? Number(formData.form_id) : null };
        const { error } = editId ? await supabase.from('school_subject_teachers').update(payload).eq('id', editId) : await supabase.from('school_subject_teachers').insert([payload]);
        if (error) { toast.error(error.message || 'Failed — link may already exist'); return; }
        toast.success(editId ? 'Link updated ✅' : 'Subject linked to teacher ✅'); setShowModal(false); fetchAll();
    };
    const deleteSubjectTeacher = async (id: number) => { if (!confirm('Remove this link?')) return; const { error } = await supabase.from('school_subject_teachers').delete().eq('id', id); if (error) { toast.error('Cannot delete'); return; } toast.success('Removed'); fetchAll(); };

    // Helpers
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '-';
    const getTeacherName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '-'; };

    // ====================== SCHOOL DETAILS ======================
    const saveSchoolDetails = async () => {
        if (!schoolDetails.school_name?.trim()) {
            toast.error('School name is required');
            return;
        }
        setSavingInfo(true);
        // Clean payload: remove id/timestamps, convert empty strings to null
        const payload: any = {};
        const skipKeys = ['id', 'created_at', 'updated_at'];
        Object.keys(schoolDetails).forEach(key => {
            if (skipKeys.includes(key)) return;
            const val = schoolDetails[key];
            payload[key] = (typeof val === 'string' && val.trim() === '') ? null : val;
        });
        payload.updated_at = new Date().toISOString();

        let error;
        if (schoolDetails.id) {
            ({ error } = await supabase.from('school_details').update(payload).eq('id', schoolDetails.id));
        } else {
            ({ error } = await supabase.from('school_details').insert([payload]));
        }
        setSavingInfo(false);
        if (error) { toast.error(error.message || 'Failed to save'); return; }
        toast.success('School details saved ✅'); fetchAll();
    };

    const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
        { key: 'school-details', label: 'School Info', icon: '🏫', count: 0 },
        { key: 'forms', label: 'Forms', icon: '📋', count: forms.length },
        { key: 'streams', label: 'Streams', icon: '🏷️', count: streams.length },
        { key: 'subjects', label: 'Subjects', icon: '📚', count: subjects.length },
        { key: 'classes', label: 'Classes', icon: '🏫', count: classes.length },
        { key: 'subject-teachers', label: 'Subject-Teacher', icon: '🔗', count: subjectTeachers.length },
    ];

    const openAdd = () => { if (tab === 'school-details') return; if (tab === 'forms') openAddForm(); else if (tab === 'streams') openAddStream(); else if (tab === 'subjects') openAddSubject(); else if (tab === 'classes') openAddClass(); else openAddSubjectTeacher(); };
    const handleSave = () => { if (tab === 'forms') saveForm(); else if (tab === 'streams') saveStream(); else if (tab === 'subjects') saveSubject(); else if (tab === 'classes') saveClass(); else saveSubjectTeacher(); };

    const addLabel = tab === 'forms' ? 'Form' : tab === 'streams' ? 'Stream' : tab === 'subjects' ? 'Subject' : tab === 'classes' ? 'Class' : 'Link';

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">⚙️ School Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage forms, streams, subjects, classes & teacher assignments</p>
                </div>
                {tab !== 'school-details' && <button onClick={openAdd} className="btn-primary flex items-center gap-2 self-start"><FiPlus size={16} /> Add {addLabel}</button>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-gray-200 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${tab === t.key ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        style={tab === t.key ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                        <span>{t.icon}</span> {t.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.key ? 'bg-white/20' : 'bg-gray-200'}`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* ========== SCHOOL DETAILS ========== */}
                    {tab === 'school-details' && (
                        <div className="p-6 space-y-8">
                            <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200" style={{ borderRadius: 8 }}>
                                <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-1 text-base"><FiInfo size={18} /> School Information</h3>
                                <p className="text-sm text-indigo-600">Configure your school&apos;s details, contact information, and bank accounts</p>
                            </div>

                            {/* Basic Info Section */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #6366f1' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">🏫 Basic Information</h4>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">School Name <span className="text-red-500">*</span></label>
                                        <input type="text" value={schoolDetails.school_name || ''} onChange={e => setSchoolDetails({ ...schoolDetails, school_name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="Enter school name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Motto</label>
                                        <input type="text" value={schoolDetails.motto || ''} onChange={e => setSchoolDetails({ ...schoolDetails, motto: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="School motto" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Registration No.</label>
                                        <input type="text" value={schoolDetails.registration_number || ''} onChange={e => setSchoolDetails({ ...schoolDetails, registration_number: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="e.g. SCH/2025/001" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">TSC Code</label>
                                        <input type="text" value={schoolDetails.tsc_code || ''} onChange={e => setSchoolDetails({ ...schoolDetails, tsc_code: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="TSC code" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">KNEC Code</label>
                                        <input type="text" value={schoolDetails.knec_code || ''} onChange={e => setSchoolDetails({ ...schoolDetails, knec_code: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="KNEC code" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sub-County Code</label>
                                        <input type="text" value={schoolDetails.sub_county_code || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sub_county_code: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="Sub-county code" />
                                    </div>
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #22c55e' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">📍 Location &amp; Address</h4>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Postal Address</label>
                                        <input type="text" value={schoolDetails.postal_address || ''} onChange={e => setSchoolDetails({ ...schoolDetails, postal_address: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="P.O. Box 123" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Physical Address</label>
                                        <input type="text" value={schoolDetails.physical_address || ''} onChange={e => setSchoolDetails({ ...schoolDetails, physical_address: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="e.g. Nairobi" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">County</label>
                                        <select value={schoolDetails.county || ''} onChange={e => setSchoolDetails({ ...schoolDetails, county: e.target.value, sub_county: '' })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all appearance-none cursor-pointer"
                                            style={{ borderRadius: 6, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M3 5l3 3 3-3\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                                            <option value="">— Select County —</option>
                                            {counties.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sub-County</label>
                                        <select value={schoolDetails.sub_county || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sub_county: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all appearance-none cursor-pointer"
                                            style={{ borderRadius: 6, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M3 5l3 3 3-3\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                                            <option value="">— Select Sub-County —</option>
                                            {schoolDetails.county && getSubCounties(schoolDetails.county).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">📞 Contact Details</h4>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Phone 1</label>
                                        <input type="tel" value={schoolDetails.phone1 || ''} onChange={e => setSchoolDetails({ ...schoolDetails, phone1: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="0712 345 678" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Phone 2</label>
                                        <input type="tel" value={schoolDetails.phone2 || ''} onChange={e => setSchoolDetails({ ...schoolDetails, phone2: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Email</label>
                                        <input type="email" value={schoolDetails.email || ''} onChange={e => setSchoolDetails({ ...schoolDetails, email: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="school@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Website</label>
                                        <input type="url" value={schoolDetails.website || ''} onChange={e => setSchoolDetails({ ...schoolDetails, website: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="https://" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Principal Name</label>
                                        <input type="text" value={schoolDetails.principal_name || ''} onChange={e => setSchoolDetails({ ...schoolDetails, principal_name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Principal Phone</label>
                                        <input type="tel" value={schoolDetails.principal_phone || ''} onChange={e => setSchoolDetails({ ...schoolDetails, principal_phone: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Section */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #3b82f6' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">🏦 Bank &amp; Payment Details</h4>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Bank Name</label>
                                        <input type="text" value={schoolDetails.bank_name || ''} onChange={e => setSchoolDetails({ ...schoolDetails, bank_name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} placeholder="e.g. KCB, Equity" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Account Name</label>
                                        <input type="text" value={schoolDetails.bank_account_name || ''} onChange={e => setSchoolDetails({ ...schoolDetails, bank_account_name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Account Number</label>
                                        <input type="text" value={schoolDetails.bank_account_number || ''} onChange={e => setSchoolDetails({ ...schoolDetails, bank_account_number: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Bank Branch</label>
                                        <input type="text" value={schoolDetails.bank_branch || ''} onChange={e => setSchoolDetails({ ...schoolDetails, bank_branch: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">M-Pesa Paybill</label>
                                        <input type="text" value={schoolDetails.mpesa_paybill || ''} onChange={e => setSchoolDetails({ ...schoolDetails, mpesa_paybill: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">M-Pesa Account Name</label>
                                        <input type="text" value={schoolDetails.mpesa_account_name || ''} onChange={e => setSchoolDetails({ ...schoolDetails, mpesa_account_name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                                            style={{ borderRadius: 6 }} />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="pt-2 flex justify-end">
                                <button onClick={saveSchoolDetails} disabled={savingInfo}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
                                    style={{ borderRadius: 6, background: savingInfo ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    {savingInfo ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><FiSave size={16} /> Save School Details</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}


                    {/* ========== FORMS TABLE ========== */}
                    {tab === 'forms' && (forms.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">📋</span><p className="font-medium">No forms yet</p></div>
                    ) : (
                        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Form Name</th><th>Level</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {forms.map((item, i) => (
                                <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td><td className="font-semibold">{item.form_name}</td><td className="font-bold text-blue-600">{item.form_level}</td><td className="text-sm">{item.description || '-'}</td><td><span className="badge badge-success">Active</span></td><td><div className="flex gap-1"><button onClick={() => openEditForm(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteForm(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                            ))}
                        </tbody></table></div>
                    ))}

                    {/* ========== STREAMS TABLE ========== */}
                    {tab === 'streams' && (streams.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">🏷️</span><p className="font-medium">No streams yet</p></div>
                    ) : (
                        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Stream Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {streams.map((item, i) => (
                                <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td><td className="font-semibold">{item.stream_name}</td><td className="text-sm">{item.description || '-'}</td><td><span className="badge badge-success">Active</span></td><td><div className="flex gap-1"><button onClick={() => openEditStream(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteStream(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                            ))}
                        </tbody></table></div>
                    ))}

                    {/* ========== SUBJECTS TABLE ========== */}
                    {tab === 'subjects' && (subjects.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">📚</span><p className="font-medium">No subjects yet</p></div>
                    ) : (
                        <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {subjects.map((item, i) => (
                                <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td><td className="font-semibold">{item.subject_name}</td><td className="font-bold text-blue-600">{item.subject_code || '-'}</td><td><span className={`badge ${item.category === 'Core' ? 'badge-purple' : item.category === 'Elective' ? 'badge-blue' : 'badge-orange'}`}>{item.category}</span></td><td><span className="badge badge-success">Active</span></td><td><div className="flex gap-1"><button onClick={() => openEditSubject(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteSubject(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                            ))}
                        </tbody></table></div>
                    ))}

                    {/* ========== CLASSES (Form + Stream + Class Teacher) ========== */}
                    {tab === 'classes' && (
                        <>
                            <div className="p-4 bg-blue-50 border-b border-blue-200">
                                <p className="text-sm text-blue-700 font-semibold flex items-center gap-2">🏫 Classes = Form + Stream + Class Teacher</p>
                                <p className="text-xs text-blue-500 mt-0.5">Link forms with streams and assign a class teacher to each class</p>
                            </div>
                            {classes.length === 0 ? (
                                <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">🏫</span><p className="font-medium">No classes created yet</p><p className="text-sm mt-1">Link forms with streams and assign class teachers</p></div>
                            ) : (
                                <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Form</th><th>Stream</th><th>Class Name</th><th>Class Teacher</th><th>Year</th><th>Actions</th></tr></thead><tbody>
                                    {classes.map((item, i) => (
                                        <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td><td className="font-semibold">{getFormName(item.form_id)}</td><td className="font-semibold">{getStreamName(item.stream_id)}</td>
                                            <td><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', color: '#4338ca' }}>{getFormName(item.form_id)} {getStreamName(item.stream_id)}</span></td>
                                            <td>{item.teacher_id ? <span className="flex items-center gap-1.5"><FiUsers size={13} className="text-green-600" /><span className="font-medium text-green-700">{getTeacherName(item.teacher_id)}</span></span> : <span className="text-gray-400 text-sm italic">Not assigned</span>}</td>
                                            <td className="font-bold">{item.year}</td>
                                            <td><div className="flex gap-1"><button onClick={() => openEditClass(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteClass(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                                    ))}
                                </tbody></table></div>
                            )}
                        </>
                    )}

                    {/* ========== SUBJECT-TEACHER LINKING ========== */}
                    {tab === 'subject-teachers' && (
                        <>
                            <div className="p-4 bg-purple-50 border-b border-purple-200">
                                <p className="text-sm text-purple-700 font-semibold flex items-center gap-2">🔗 Subject-Teacher Assignments</p>
                                <p className="text-xs text-purple-500 mt-0.5">Link subjects to teachers — optionally specify which form the teacher handles</p>
                            </div>
                            {subjectTeachers.length === 0 ? (
                                <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">🔗</span><p className="font-medium">No subject-teacher links yet</p><p className="text-sm mt-1">Assign teachers to their subjects</p></div>
                            ) : (
                                <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Subject</th><th>Teacher</th><th>TSC No</th><th>Form (optional)</th><th>Actions</th></tr></thead><tbody>
                                    {subjectTeachers.map((item, i) => {
                                        const teacher = teachers.find(t => t.id === item.teacher_id);
                                        return (
                                            <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td>
                                                <td><span className="badge badge-purple">{getSubjectName(item.subject_id)}</span></td>
                                                <td className="font-semibold">{getTeacherName(item.teacher_id)}</td>
                                                <td className="text-sm text-gray-500">{teacher?.tsc_number || '-'}</td>
                                                <td>{item.form_id ? <span className="badge badge-blue">{getFormName(item.form_id)}</span> : <span className="text-gray-400 text-xs">All forms</span>}</td>
                                                <td><div className="flex gap-1"><button onClick={() => openEditSubjectTeacher(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteSubjectTeacher(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                                        );
                                    })}
                                </tbody></table></div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ========== MODAL ========== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editId ? '✏️ Edit' : '➕ Add'} {addLabel}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* FORM fields */}
                            {tab === 'forms' && <>
                                <div><label className="lbl">Form Name *</label><input type="text" value={formData.form_name} onChange={e => setFormData({ ...formData, form_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Form 1" /></div>
                                <div><label className="lbl">Form Level *</label><input type="number" value={formData.form_level} onChange={e => setFormData({ ...formData, form_level: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="1" min="1" max="6" /></div>
                                <div><label className="lbl">Description</label><input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            </>}

                            {/* STREAM fields */}
                            {tab === 'streams' && <>
                                <div><label className="lbl">Stream Name *</label><input type="text" value={formData.stream_name} onChange={e => setFormData({ ...formData, stream_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. East" /></div>
                                <div><label className="lbl">Description</label><input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            </>}

                            {/* SUBJECT fields */}
                            {tab === 'subjects' && <>
                                <div><label className="lbl">Subject Name *</label><input type="text" value={formData.subject_name} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Mathematics" /></div>
                                <div><label className="lbl">Subject Code</label><input type="text" value={formData.subject_code} onChange={e => setFormData({ ...formData, subject_code: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. MATH" /></div>
                                <div><label className="lbl">Category</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="select-modern w-full"><option value="Core">Core</option><option value="Elective">Elective</option><option value="Technical">Technical</option></select></div>
                            </>}

                            {/* CLASS fields (Form-Stream + Class Teacher) */}
                            {tab === 'classes' && <>
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-600 font-medium">🏫 A class is a combination of a Form + Stream + Class Teacher</div>
                                <div><label className="lbl">Form *</label><select value={formData.form_id} onChange={e => setFormData({ ...formData, form_id: e.target.value })} className="select-modern w-full"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                                <div><label className="lbl">Stream *</label><select value={formData.stream_id} onChange={e => setFormData({ ...formData, stream_id: e.target.value })} className="select-modern w-full"><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                                <div><label className="lbl">Class Teacher (optional)</label><select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="select-modern w-full"><option value="">No Teacher Assigned</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>)}</select></div>
                                <div><label className="lbl">Academic Year</label><input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="2026" /></div>
                            </>}

                            {/* SUBJECT-TEACHER fields */}
                            {tab === 'subject-teachers' && <>
                                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-600 font-medium">🔗 Link a subject to a teacher for specific forms</div>
                                <div><label className="lbl">Subject *</label><select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="select-modern w-full"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} {s.subject_code ? `(${s.subject_code})` : ''}</option>)}</select></div>
                                <div><label className="lbl">Teacher *</label><select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="select-modern w-full"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>)}</select></div>
                                <div><label className="lbl">Form (optional — leave empty for all forms)</label><select value={formData.form_id} onChange={e => setFormData({ ...formData, form_id: e.target.value })} className="select-modern w-full"><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                            </>}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                                <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2"><FiSave size={14} /> Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

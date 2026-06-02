'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLink, FiUsers, FiInfo, FiMessageCircle, FiEye, FiEyeOff, FiCopy, FiCheckCircle, FiRefreshCw, FiZap, FiSend } from 'react-icons/fi';
import { counties, getSubCounties, nationalities } from '@/lib/kenyan-data';
import RubricLevelBadge from '@/components/cbc/RubricLevelBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import { countElectivesForPathway } from '@/lib/cbc-utils';

type Tab = 'forms' | 'streams' | 'subjects' | 'classes' | 'subject-teachers' | 'school-details' | 'cbc-pathways' | 'cbc-grading' | 'sms' | 'mpesa' | 'whatsapp';

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>('school-details');
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]); // form-stream combos
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]); // subject-teacher links
    const [schoolDetails, setSchoolDetails] = useState<any>({});
    // CBC state
    const [cbcPathways, setCbcPathways] = useState<any[]>([]);
    const [cbcPathwaySubjects, setCbcPathwaySubjects] = useState<any[]>([]);
    const [cbcRubricConfig, setCbcRubricConfig] = useState<any[]>([]);
    const [selectedPathwayForEdit, setSelectedPathwayForEdit] = useState<number | null>(null);
    const [pathwaySubjectDraft, setPathwaySubjectDraft] = useState<number[]>([]); // subject IDs checked as electives for selected pathway
    const [savingPathway, setSavingPathway] = useState(false);
    const [savingRubric, setSavingRubric] = useState(false);
    const [rubricDraft, setRubricDraft] = useState<any[]>([]); // editable copy of rubric config
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingSMS, setSavingSMS] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
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

        // Fetch CBC pathways
        try {
            const { data } = await supabase.from('cbc_pathways').select('*').order('id');
            setCbcPathways(data || []);
        } catch { setCbcPathways([]); }

        // Fetch CBC pathway subjects (with subject join)
        try {
            const { data } = await supabase
                .from('cbc_pathway_subjects')
                .select('*, school_subjects(id, subject_name, subject_code)');
            setCbcPathwaySubjects(data || []);
        } catch { setCbcPathwaySubjects([]); }

        // Fetch CBC rubric config
        try {
            const { data } = await supabase.from('cbc_rubric_config').select('*').order('sort_order');
            if (data && data.length > 0) {
                setCbcRubricConfig(data);
                setRubricDraft(data.map(r => ({ ...r })));
            }
        } catch { setCbcRubricConfig([]); }

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
    const openAddSubjectTeacher = () => { setEditId(null); setFormData({ subject_id: '', teacher_id: '', form_id: '', stream_id: '' }); setShowModal(true); };
    const openEditSubjectTeacher = (item: any) => { setEditId(item.id); setFormData({ subject_id: item.subject_id, teacher_id: item.teacher_id, form_id: item.form_id || '', stream_id: item.stream_id || '' }); setShowModal(true); };
    const saveSubjectTeacher = async () => {
        if (!formData.subject_id || !formData.teacher_id) { toast.error('Select both subject and teacher'); return; }
        const payload = {
            subject_id: Number(formData.subject_id),
            teacher_id: Number(formData.teacher_id),
            form_id: formData.form_id ? Number(formData.form_id) : null,
            stream_id: formData.stream_id ? Number(formData.stream_id) : null,
        };
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

    // ====================== CBC PATHWAYS ======================
    const handleSelectPathwayForEdit = (pathwayId: number) => {
        setSelectedPathwayForEdit(pathwayId);
        // Pre-populate draft with current elective subject IDs for this pathway
        const currentElectives = cbcPathwaySubjects
            .filter(ps => ps.pathway_id === pathwayId && !ps.is_compulsory)
            .map(ps => ps.subject_id);
        setPathwaySubjectDraft(currentElectives);
    };

    const toggleElectiveSubject = (subjectId: number) => {
        setPathwaySubjectDraft(prev =>
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    const savePathwaySubjects = async () => {
        if (!selectedPathwayForEdit) return;

        // Validation: prevent assigning a non-compulsory subject to more than one pathway
        for (const subjectId of pathwaySubjectDraft) {
            const existingInOtherPathway = cbcPathwaySubjects.find(
                ps => ps.subject_id === subjectId && ps.pathway_id !== selectedPathwayForEdit && !ps.is_compulsory
            );
            if (existingInOtherPathway) {
                const subjectName = subjects.find(s => s.id === subjectId)?.subject_name || `Subject #${subjectId}`;
                const otherPathway = cbcPathways.find(p => p.id === existingInOtherPathway.pathway_id)?.pathway_name || 'another pathway';
                toast.error(`"${subjectName}" is already assigned as an elective in ${otherPathway}. A non-compulsory subject can only belong to one pathway.`);
                return;
            }
        }

        setSavingPathway(true);
        try {
            // Get current elective rows for this pathway
            const currentElectiveRows = cbcPathwaySubjects.filter(
                ps => ps.pathway_id === selectedPathwayForEdit && !ps.is_compulsory
            );
            const currentIds = currentElectiveRows.map(ps => ps.subject_id);

            // Determine rows to delete (unchecked) and rows to insert (newly checked)
            const toDelete = currentIds.filter(id => !pathwaySubjectDraft.includes(id));
            const toInsert = pathwaySubjectDraft.filter(id => !currentIds.includes(id));

            // Delete removed electives
            if (toDelete.length > 0) {
                const { error } = await supabase
                    .from('cbc_pathway_subjects')
                    .delete()
                    .eq('pathway_id', selectedPathwayForEdit)
                    .in('subject_id', toDelete)
                    .eq('is_compulsory', false);
                if (error) throw error;
            }

            // Insert new electives
            if (toInsert.length > 0) {
                const rows = toInsert.map(subject_id => ({
                    pathway_id: selectedPathwayForEdit,
                    subject_id,
                    is_compulsory: false,
                }));
                const { error } = await supabase.from('cbc_pathway_subjects').insert(rows);
                if (error) throw error;
            }

            toast.success('Pathway subjects saved ✅');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save pathway subjects');
        } finally {
            setSavingPathway(false);
        }
    };

    // ====================== CBC GRADING ======================
    const updateRubricDraft = (levelCode: string, field: string, value: string) => {
        setRubricDraft(prev => prev.map(r => r.level_code === levelCode ? { ...r, [field]: value } : r));
    };

    const saveRubricConfig = async () => {
        setSavingRubric(true);
        try {
            for (const row of rubricDraft) {
                const { error } = await supabase
                    .from('cbc_rubric_config')
                    .update({
                        level_label: row.level_label,
                        color_hex: row.color_hex,
                        bg_hex: row.bg_hex,
                    })
                    .eq('level_code', row.level_code);
                if (error) throw error;
            }
            toast.success('Rubric config saved ✅');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save rubric config');
        } finally {
            setSavingRubric(false);
        }
    };

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
        { key: 'cbc-pathways', label: 'CBC Pathways', icon: '🛤️', count: cbcPathways.length },
        { key: 'cbc-grading', label: 'CBC Grading', icon: '📊', count: cbcRubricConfig.length },
        { key: 'sms', label: 'SMS Config', icon: '💬', count: 0 },
        { key: 'mpesa', label: 'M-Pesa STK', icon: '📲', count: 0 },
        { key: 'whatsapp', label: 'WhatsApp', icon: '💚', count: 0 },
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
                                <div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Subject</th><th>Teacher</th><th>TSC No</th><th>Form</th><th>Stream</th><th>Scope</th><th>Actions</th></tr></thead><tbody>
                                    {subjectTeachers.map((item, i) => {
                                        const teacher = teachers.find(t => t.id === item.teacher_id);
                                        const scopeLabel = !item.form_id ? 'All Forms' : !item.stream_id ? `${getFormName(item.form_id)} — All Streams` : `${getFormName(item.form_id)} ${getStreamName(item.stream_id)}`;
                                        return (
                                            <tr key={item.id}><td className="text-xs text-gray-400">{i + 1}</td>
                                                <td><span className="badge badge-purple">{getSubjectName(item.subject_id)}</span></td>
                                                <td className="font-semibold">{getTeacherName(item.teacher_id)}</td>
                                                <td className="text-sm text-gray-500">{teacher?.tsc_number || '-'}</td>
                                                <td>{item.form_id ? <span className="badge badge-blue">{getFormName(item.form_id)}</span> : <span className="text-gray-400 text-xs">All</span>}</td>
                                                <td>{item.stream_id ? <span className="badge badge-orange">{getStreamName(item.stream_id)}</span> : <span className="text-gray-400 text-xs">All</span>}</td>
                                                <td><span className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700">{scopeLabel}</span></td>
                                                <td><div className="flex gap-1"><button onClick={() => openEditSubjectTeacher(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button><button onClick={() => deleteSubjectTeacher(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></div></td></tr>
                                        );
                                    })}
                                </tbody></table></div>
                            )}
                        </>
                    )}
                    {/* ========== CBC PATHWAYS ========== */}
                    {tab === 'cbc-pathways' && (
                        <div className="p-6 space-y-6">
                            <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200" style={{ borderRadius: 8 }}>
                                <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-1 text-base">🛤️ CBC Pathways</h3>
                                <p className="text-sm text-indigo-600">Assign elective subjects to each CBC Senior School pathway. Each non-compulsory subject may belong to only one pathway.</p>
                            </div>

                            {cbcPathways.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <span className="text-4xl mb-3 block">🛤️</span>
                                    <p className="font-medium">No pathways found</p>
                                    <p className="text-sm mt-1">Run the CBC migration SQL to seed the three pathways.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Pathway Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {cbcPathways.map(pathway => {
                                            const electiveCount = countElectivesForPathway(pathway.id, cbcPathwaySubjects);
                                            const isSelected = selectedPathwayForEdit === pathway.id;
                                            return (
                                                <button
                                                    key={pathway.id}
                                                    onClick={() => handleSelectPathwayForEdit(pathway.id)}
                                                    className={`text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
                                                        {electiveCount < 3 && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                                                ⚠️ {electiveCount} elective{electiveCount !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-gray-800 text-sm mt-1">{pathway.pathway_name}</p>
                                                    {pathway.description && <p className="text-xs text-gray-500 mt-0.5">{pathway.description}</p>}
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        <span className={`font-semibold ${electiveCount >= 3 ? 'text-green-600' : 'text-amber-600'}`}>{electiveCount}</span> elective subject{electiveCount !== 1 ? 's' : ''} assigned
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Subject Assignment Panel */}
                                    {selectedPathwayForEdit !== null && (() => {
                                        const pathway = cbcPathways.find(p => p.id === selectedPathwayForEdit);
                                        const compulsorySubjectIds = cbcPathwaySubjects
                                            .filter(ps => ps.is_compulsory)
                                            .map(ps => ps.subject_id);
                                        const compulsorySubjects = subjects.filter(s => compulsorySubjectIds.includes(s.id));
                                        const nonCompulsorySubjects = subjects.filter(s => !compulsorySubjectIds.includes(s.id));

                                        return (
                                            <div className="border border-indigo-200 rounded-xl overflow-hidden">
                                                <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-200 flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                                                            ✏️ Editing: {pathway?.pathway_name}
                                                        </h4>
                                                        <p className="text-xs text-indigo-600 mt-0.5">Check subjects to assign as electives for this pathway</p>
                                                    </div>
                                                    <button
                                                        onClick={savePathwaySubjects}
                                                        disabled={savingPathway}
                                                        className="flex items-center gap-2 px-5 py-2 text-white font-bold text-sm rounded-lg transition-all shadow disabled:opacity-60"
                                                        style={{ background: savingPathway ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                                    >
                                                        {savingPathway ? (
                                                            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                                        ) : (
                                                            <><FiSave size={14} /> Save Pathway</>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="p-5 space-y-5">
                                                    {/* Compulsory subjects — read-only */}
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Compulsory Subjects (all pathways)</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {compulsorySubjects.length === 0 ? (
                                                                <span className="text-xs text-gray-400 italic">No compulsory subjects configured</span>
                                                            ) : compulsorySubjects.map(s => (
                                                                <span key={s.id} className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                                                                    🔒 {s.subject_name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Elective subjects — checkboxes */}
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Elective Subjects</p>
                                                        {nonCompulsorySubjects.length === 0 ? (
                                                            <p className="text-sm text-gray-400 italic">No elective subjects available. Add subjects in the Subjects tab first.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {nonCompulsorySubjects.map(s => {
                                                                    const isChecked = pathwaySubjectDraft.includes(s.id);
                                                                    // Check if assigned to a different pathway
                                                                    const assignedElsewhere = cbcPathwaySubjects.find(
                                                                        ps => ps.subject_id === s.id && ps.pathway_id !== selectedPathwayForEdit && !ps.is_compulsory
                                                                    );
                                                                    const otherPathwayName = assignedElsewhere
                                                                        ? cbcPathways.find(p => p.id === assignedElsewhere.pathway_id)?.pathway_name
                                                                        : null;
                                                                    return (
                                                                        <label
                                                                            key={s.id}
                                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'} ${assignedElsewhere && !isChecked ? 'opacity-50' : ''}`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => toggleElectiveSubject(s.id)}
                                                                                className="w-4 h-4 accent-indigo-600"
                                                                            />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-semibold text-gray-800 truncate">{s.subject_name}</p>
                                                                                {s.subject_code && <p className="text-[10px] text-gray-400">{s.subject_code}</p>}
                                                                                {otherPathwayName && !isChecked && (
                                                                                    <p className="text-[10px] text-amber-600 font-medium">In: {otherPathwayName}</p>
                                                                                )}
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== CBC GRADING ========== */}
                    {tab === 'cbc-grading' && (
                        <div className="p-6 space-y-6">
                            <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200" style={{ borderRadius: 8 }}>
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2 mb-1 text-base">📊 CBC Grading Configuration</h3>
                                <p className="text-sm text-emerald-600">Customize the labels and colors for each CBC rubric level. These settings affect all report cards and marks displays.</p>
                            </div>

                            {/* Info note — no delete */}
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <FiInfo size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-700">The four rubric levels (EE, ME, AE, BE) are fixed and cannot be deleted. You can only update their labels and colors.</p>
                            </div>

                            {rubricDraft.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <span className="text-4xl mb-3 block">📊</span>
                                    <p className="font-medium">No rubric config found</p>
                                    <p className="text-sm mt-1">Run the CBC migration SQL to seed the rubric levels.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Rubric level rows */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                            <h4 className="font-bold text-gray-800 text-sm">Rubric Level Settings</h4>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {rubricDraft.map(row => (
                                                <div key={row.level_code} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                                    {/* Level code badge */}
                                                    <div className="flex-shrink-0 w-16">
                                                        <RubricLevelBadge level={row.level_code} rubricConfig={rubricDraft} size="md" />
                                                    </div>

                                                    {/* Label input */}
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Label</label>
                                                        <input
                                                            type="text"
                                                            value={row.level_label || ''}
                                                            onChange={e => updateRubricDraft(row.level_code, 'level_label', e.target.value)}
                                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                            placeholder="e.g. Exceeds Expectation"
                                                        />
                                                    </div>

                                                    {/* Color hex input + swatch */}
                                                    <div className="w-40">
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Text Color</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={row.color_hex || ''}
                                                                onChange={e => updateRubricDraft(row.level_code, 'color_hex', e.target.value)}
                                                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-mono text-gray-800 bg-white focus:border-indigo-400 outline-none transition-all"
                                                                placeholder="#15803d"
                                                                maxLength={7}
                                                            />
                                                            <div
                                                                className="w-8 h-8 rounded-lg border-2 border-gray-200 flex-shrink-0 cursor-pointer"
                                                                style={{ backgroundColor: row.color_hex || '#6b7280' }}
                                                                title={row.color_hex}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* BG hex input + swatch */}
                                                    <div className="w-40">
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Background</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={row.bg_hex || ''}
                                                                onChange={e => updateRubricDraft(row.level_code, 'bg_hex', e.target.value)}
                                                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-mono text-gray-800 bg-white focus:border-indigo-400 outline-none transition-all"
                                                                placeholder="#f0fdf4"
                                                                maxLength={7}
                                                            />
                                                            <div
                                                                className="w-8 h-8 rounded-lg border-2 border-gray-200 flex-shrink-0 cursor-pointer"
                                                                style={{ backgroundColor: row.bg_hex || '#f3f4f6' }}
                                                                title={row.bg_hex}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preview section */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                            <h4 className="font-bold text-gray-800 text-sm">Preview</h4>
                                        </div>
                                        <div className="p-5 flex flex-wrap gap-3 items-center">
                                            {rubricDraft.map(row => (
                                                <div key={row.level_code} className="flex flex-col items-center gap-1.5">
                                                    <RubricLevelBadge level={row.level_code} rubricConfig={rubricDraft} size="md" />
                                                    <span className="text-[10px] text-gray-500 text-center max-w-[80px] leading-tight">{row.level_label || row.level_code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Save button */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={saveRubricConfig}
                                            disabled={savingRubric}
                                            className="flex items-center gap-2 px-8 py-3 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
                                            style={{ borderRadius: 6, background: savingRubric ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)' }}
                                        >
                                            {savingRubric ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                            ) : (
                                                <><FiSave size={16} /> Save Grading Config</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== SMS & NOTIFICATIONS (copied from ARMS pattern) ========== */}
                    {tab === 'sms' && (
                        <div className="p-6 space-y-8">
                            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200" style={{ borderRadius: 8 }}>
                                <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-1 text-base"><FiMessageCircle size={18} /> SMS & Notifications</h3>
                                <p className="text-sm text-amber-600">Configure Africa&apos;s Talking SMS gateway for sending leave-out notifications, fee reminders, and bulk communication to parents</p>
                            </div>

                            {/* SMS Provider Config */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">💬 Africa&apos;s Talking Configuration</h4>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">SMS Enabled</label>
                                        <select value={schoolDetails.sms_enabled ? 'true' : 'false'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_enabled: e.target.value === 'true' })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }}>
                                            <option value="false">Disabled</option>
                                            <option value="true">Enabled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Provider</label>
                                        <input type="text" value={schoolDetails.sms_provider || 'AfricasTalking'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_provider: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }} placeholder="AfricasTalking" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">SMS Username</label>
                                        <input type="text" value={schoolDetails.sms_username || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_username: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }} placeholder="sandbox or your AT username" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">🔑 SMS API Key</label>
                                        <div className="relative">
                                            <input type={showApiKey ? 'text' : 'password'} value={schoolDetails.sms_api_key || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_api_key: e.target.value })}
                                                className="w-full px-4 py-3 pr-20 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }} placeholder="Your API Key" />
                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                {schoolDetails.sms_api_key && (
                                                    <button onClick={() => { navigator.clipboard.writeText(schoolDetails.sms_api_key); toast.success('Copied!'); }}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition"><FiCopy size={13} /></button>
                                                )}
                                                <button onClick={() => setShowApiKey(!showApiKey)} className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition">
                                                    {showApiKey ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sender ID</label>
                                        <input type="text" value={schoolDetails.sms_sender_id || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_sender_id: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }} placeholder="APSIMS" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Environment</label>
                                        <select value={schoolDetails.sms_is_sandbox ? 'true' : 'false'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_is_sandbox: e.target.value === 'true' })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm font-medium text-gray-800 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" style={{ borderRadius: 6 }}>
                                            <option value="true">🧪 Sandbox (Testing)</option>
                                            <option value="false">🚀 Production (Live)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Test SMS Panel */}
                            <div className="border border-gray-200 overflow-hidden" style={{ borderRadius: 8, borderLeft: '4px solid #22c55e' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">🧪 Test SMS</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Send a test message to verify your configuration</p>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                                            <input type="text" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="0712345678"
                                                className="w-full px-4 py-2.5 border-2 border-gray-200 text-sm bg-white focus:border-green-400 outline-none transition-all" style={{ borderRadius: 6 }} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
                                            <input type="text" value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Test SMS from APSIMS"
                                                className="w-full px-4 py-2.5 border-2 border-gray-200 text-sm bg-white focus:border-green-400 outline-none transition-all" style={{ borderRadius: 6 }} />
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        if (!testPhone || !testMessage) { toast.error('Enter phone and message'); return; }
                                        setSendingTest(true); setTestResult(null);
                                        try {
                                            const res = await fetch('/api/send-sms', {
                                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ phone: testPhone, message: testMessage })
                                            });
                                            const data = await res.json();
                                            setTestResult(data);
                                            if (data.success) toast.success('✅ Test SMS sent!'); else toast.error(data.error || 'Failed');
                                        } catch (e: any) { toast.error(e.message); setTestResult({ error: e.message }); }
                                        setSendingTest(false);
                                    }} disabled={sendingTest}
                                        className="flex items-center gap-2 px-5 py-2.5 font-bold text-sm text-white transition-all shadow hover:shadow-lg disabled:opacity-60"
                                        style={{ borderRadius: 6, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                        {sendingTest ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSend size={14} />}
                                        {sendingTest ? 'Sending...' : 'Send Test SMS'}
                                    </button>
                                    {testResult && (
                                        <div className={`px-4 py-3 rounded-xl text-xs font-mono ${testResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            {JSON.stringify(testResult, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SMS Info */}
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <FiInfo size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">How SMS works in APSIMS</p>
                                    <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                                        <li>Leave-out notifications auto-send to parents when a student is issued a leave pass</li>
                                        <li>Fee reminders and demand letters can be sent via the Communication page</li>
                                        <li>All sent messages are logged in the SMS Logs table</li>
                                        <li>Use &apos;sandbox&apos; mode for testing — no real SMS is sent</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Save SMS Settings Button */}
                            <div className="pt-2 flex justify-end">
                                <button onClick={saveSchoolDetails} disabled={savingInfo}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
                                    style={{ borderRadius: 6, background: savingInfo ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                    {savingInfo ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><FiSave size={16} /> Save SMS Settings</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========== M-PESA STK CONFIG ========== */}
                    {tab === 'mpesa' && (
                        <div className="p-6 space-y-6">
                            <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                <h3 className="font-bold text-green-800 flex items-center gap-2 mb-1 text-base">📲 M-Pesa STK Push Configuration</h3>
                                <p className="text-sm text-green-600">Configure Safaricom Daraja API for STK Push payments. Parents can pay directly from their phones.</p>
                            </div>
                            <div className="border border-gray-200 overflow-hidden rounded-xl" style={{ borderLeft: '4px solid #16a34a' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm">🔑 Daraja API Credentials</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Get these from <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer" className="text-green-600 underline">developer.safaricom.co.ke</a></p>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {[
                                        { key: 'mpesa_consumer_key', label: 'Consumer Key', placeholder: 'Daraja Consumer Key', secret: false },
                                        { key: 'mpesa_consumer_secret', label: 'Consumer Secret', placeholder: 'Daraja Consumer Secret', secret: true },
                                        { key: 'mpesa_shortcode', label: 'Business Shortcode', placeholder: '174379' },
                                        { key: 'mpesa_passkey', label: 'Lipa Na M-Pesa Passkey', placeholder: 'Online passkey', secret: true },
                                        { key: 'mpesa_callback_url', label: 'Callback URL', placeholder: 'https://yourschool.com/api/mpesa/callback' },
                                        { key: 'mpesa_environment', label: 'Environment', placeholder: 'sandbox or production' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{f.label}</label>
                                            <input type={(f as any).secret ? 'password' : 'text'}
                                                value={(schoolDetails as any)[f.key] || ''}
                                                onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 text-sm bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all rounded-lg"
                                                placeholder={f.placeholder} />
                                        </div>
                                    ))}
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Account Reference Prefix</label>
                                        <input type="text" value={schoolDetails.mpesa_account_prefix || 'FEE'}
                                            onChange={e => setSchoolDetails({ ...schoolDetails, mpesa_account_prefix: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm bg-white focus:border-green-400 outline-none transition-all rounded-lg"
                                            placeholder="e.g. FEE or ADM" />
                                        <p className="text-xs text-gray-400 mt-1">This prefix + student admission no becomes the M-Pesa account reference (e.g. FEE-2024001)</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                                <p className="font-bold mb-1">✅ How M-Pesa STK Push works in APSIMS:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Admin clicks &quot;Collect Fee via M-Pesa&quot; from the student fee page</li>
                                    <li>APSIMS sends an STK Push prompt to the parent&apos;s phone</li>
                                    <li>Parent enters M-Pesa PIN to confirm payment</li>
                                    <li>Safaricom callback fires to your server and fee is automatically recorded</li>
                                    <li>Parent receives SMS receipt automatically</li>
                                </ol>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button onClick={saveSchoolDetails} disabled={savingInfo}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                    {savingInfo ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={16} /> Save M-Pesa Config</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========== WHATSAPP CONFIG ========== */}
                    {tab === 'whatsapp' && (
                        <div className="p-6 space-y-6">
                            <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2 mb-1 text-base">💚 WhatsApp Integration</h3>
                                <p className="text-sm text-emerald-600">Configure WhatsApp API to send report cards, fee reminders and attendance alerts to parents</p>
                            </div>
                            <div className="border border-gray-200 overflow-hidden rounded-xl" style={{ borderLeft: '4px solid #25d366' }}>
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                    <h4 className="font-bold text-gray-800 text-sm">⚙️ WhatsApp API Settings</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Supports UltraMsg, WhatsMate, Twilio, and official WhatsApp Business API</p>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Provider</label>
                                        <select value={schoolDetails.whatsapp_provider || 'ultramsg'}
                                            onChange={e => setSchoolDetails({ ...schoolDetails, whatsapp_provider: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 text-sm bg-white focus:border-emerald-400 outline-none rounded-lg">
                                            <option value="ultramsg">UltraMsg (Recommended)</option>
                                            <option value="whatsapp-business">Official WhatsApp Business API</option>
                                            <option value="twilio">Twilio WhatsApp</option>
                                            <option value="whatsmate">WhatsMate</option>
                                            <option value="africas-talking">Africa&apos;s Talking</option>
                                        </select>
                                    </div>
                                    {[
                                        { key: 'whatsapp_api_url', label: 'API Base URL', placeholder: 'https://api.ultramsg.com/instanceXXX' },
                                        { key: 'whatsapp_api_key', label: 'API Key / Token', placeholder: 'Your auth token', secret: true },
                                        { key: 'whatsapp_instance_id', label: 'Instance ID', placeholder: 'Instance identifier' },
                                        { key: 'whatsapp_from_name', label: 'Sender Name', placeholder: 'Your School Name' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{f.label}</label>
                                            <input type={(f as any).secret ? 'password' : 'text'}
                                                value={(schoolDetails as any)[f.key] || ''}
                                                onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all rounded-lg"
                                                placeholder={f.placeholder} />
                                        </div>
                                    ))}
                                    <div className="sm:col-span-2 flex items-center gap-3">
                                        <input type="checkbox" id="wa_enabled"
                                            checked={!!schoolDetails.whatsapp_enabled}
                                            onChange={e => setSchoolDetails({ ...schoolDetails, whatsapp_enabled: e.target.checked })}
                                            className="w-4 h-4 accent-emerald-600" />
                                        <label htmlFor="wa_enabled" className="text-sm font-semibold text-gray-700 cursor-pointer">Enable WhatsApp notifications globally</label>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                                <p className="font-bold mb-1">💡 What WhatsApp is used for in APSIMS:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Bulk fee reminder campaigns (Communication → WhatsApp Reports)</li>
                                    <li>Digital report card delivery with QR verification</li>
                                    <li>Attendance alerts when a student is absent</li>
                                    <li>Payment receipts after M-Pesa STK push confirmation</li>
                                </ul>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button onClick={saveSchoolDetails} disabled={savingInfo}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                                    {savingInfo ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={16} /> Save WhatsApp Config</>}
                                </button>
                            </div>
                        </div>
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
                                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-600 font-medium">🔗 Link a subject to a teacher. Optionally scope to a specific form and/or stream.</div>
                                <div><label className="lbl">Subject *</label><select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="select-modern w-full"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} {s.subject_code ? `(${s.subject_code})` : ''}</option>)}</select></div>
                                <div><label className="lbl">Teacher *</label><select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="select-modern w-full"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>)}</select></div>
                                <div>
                                    <label className="lbl">Form <span className="text-gray-400 font-normal">(optional — leave empty for all forms)</span></label>
                                    <select value={formData.form_id} onChange={e => setFormData({ ...formData, form_id: e.target.value, stream_id: '' })} className="select-modern w-full">
                                        <option value="">All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="lbl">Stream <span className="text-gray-400 font-normal">(optional — leave empty for all streams in selected form)</span></label>
                                    <select value={formData.stream_id} onChange={e => setFormData({ ...formData, stream_id: e.target.value })} className="select-modern w-full" disabled={!formData.form_id}>
                                        <option value="">{formData.form_id ? 'All Streams' : 'Select a form first'}</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                    </select>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                                    <strong>Scope preview:</strong>{' '}
                                    {!formData.form_id ? '📚 All Forms — All Streams' :
                                     !formData.stream_id ? `📋 ${getFormName(Number(formData.form_id))} — All Streams` :
                                     `🏷️ ${getFormName(Number(formData.form_id))} ${getStreamName(Number(formData.stream_id))}`}
                                </div>
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

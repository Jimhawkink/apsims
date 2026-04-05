'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch, FiLink, FiUsers } from 'react-icons/fi';

// Kenyan KCSE 2025/2026 Subject Data
const KENYAN_SUBJECTS = [
    // Core / Compulsory
    { name: 'Mathematics', code: '121', category: 'Compulsory', max_score: 100, group: 1 },
    { name: 'English', code: '101', category: 'Compulsory', max_score: 100, group: 1 },
    { name: 'Kiswahili', code: '102', category: 'Compulsory', max_score: 100, group: 1 },
    // Group II – Sciences
    { name: 'Biology', code: '231', category: 'Science', max_score: 100, group: 2 },
    { name: 'Physics', code: '232', category: 'Science', max_score: 100, group: 2 },
    { name: 'Chemistry', code: '233', category: 'Science', max_score: 100, group: 2 },
    // Group III – Humanities
    { name: 'History & Government', code: '311', category: 'Humanities', max_score: 100, group: 3 },
    { name: 'Geography', code: '312', category: 'Humanities', max_score: 100, group: 3 },
    { name: 'CRE', code: '313', category: 'Humanities', max_score: 100, group: 3 },
    { name: 'IRE', code: '314', category: 'Humanities', max_score: 100, group: 3 },
    { name: 'HRE', code: '315', category: 'Humanities', max_score: 100, group: 3 },
    // Group IV – Technical/Applied
    { name: 'Home Science', code: '441', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Art & Design', code: '442', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Agriculture', code: '443', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Woodwork', code: '444', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Metalwork', code: '445', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Building Construction', code: '446', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Power Mechanics', code: '447', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Electricity', code: '448', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Drawing & Design', code: '449', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Aviation Technology', code: '450', category: 'Technical', max_score: 100, group: 4 },
    { name: 'Computer Studies', code: '451', category: 'Technical', max_score: 100, group: 4 },
    // Group V – Creative/Languages
    { name: 'French', code: '501', category: 'Languages', max_score: 100, group: 5 },
    { name: 'German', code: '502', category: 'Languages', max_score: 100, group: 5 },
    { name: 'Arabic', code: '503', category: 'Languages', max_score: 100, group: 5 },
    { name: 'Kenya Sign Language', code: '504', category: 'Languages', max_score: 100, group: 5 },
    { name: 'Music', code: '511', category: 'Creative', max_score: 100, group: 5 },
    { name: 'Business Studies', code: '565', category: 'Applied', max_score: 100, group: 5 },
];

interface Subject {
    id?: number;
    subject_name: string;
    subject_code: string;
    category: string;
    max_score: number;
    group_number: number;
    is_active: boolean;
    initials: string; // Short code for reports e.g. MATH, ENG
}

interface SubjectTeacherLink {
    id?: number;
    subject_id: number;
    teacher_id: number;
    form_id: number | null;
    stream_id: number | null;
    teacher_initials: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Compulsory': 'bg-red-100 text-red-700 border-red-200',
    'Science': 'bg-blue-100 text-blue-700 border-blue-200',
    'Humanities': 'bg-green-100 text-green-700 border-green-200',
    'Technical': 'bg-orange-100 text-orange-700 border-orange-200',
    'Languages': 'bg-purple-100 text-purple-700 border-purple-200',
    'Creative': 'bg-pink-100 text-pink-700 border-pink-200',
    'Applied': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Core': 'bg-red-100 text-red-700 border-red-200',
    'Elective': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const GROUP_LABELS: Record<number, string> = {
    1: 'Group I – Compulsory',
    2: 'Group II – Sciences',
    3: 'Group III – Humanities',
    4: 'Group IV – Technical/Applied',
    5: 'Group V – Creative/Languages',
};

export default function SubjectsPage() {
    const [activeTab, setActiveTab] = useState<'subjects' | 'assignments'>('subjects');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Subject Modal
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editSubject, setEditSubject] = useState<any>(null);
    const [subjectForm, setSubjectForm] = useState({ subject_name: '', subject_code: '', category: 'Compulsory', max_score: 100, is_active: true, initials: '' });

    // Assignment Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ subject_id: 0, teacher_id: 0, form_id: 0, stream_id: 0, teacher_initials: '' });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [subRes, teachRes, formRes, streamRes, assignRes] = await Promise.all([
            supabase.from('school_subjects').select('*').order('subject_code'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').eq('is_active', true).order('form_level'),
            supabase.from('school_streams').select('*').eq('is_active', true).order('stream_name'),
            supabase.from('school_subject_teachers').select('*, school_subjects(subject_name, subject_code), school_teachers(first_name, last_name, middle_name), school_forms(form_name)').order('id'),
        ]);
        setSubjects(subRes.data || []);
        setTeachers(teachRes.data || []);
        setForms(formRes.data || []);
        setStreams(streamRes.data || []);
        setAssignments(assignRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Generate teacher initials from name
    const generateInitials = (teacher: any) => {
        const parts = [teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean);
        return parts.map((p: string) => p.charAt(0).toUpperCase()).join('');
    };

    // ===== SUBJECTS CRUD =====
    const filteredSubjects = subjects.filter(s => {
        const matchSearch = `${s.subject_name} ${s.subject_code || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategory || s.category === filterCategory;
        return matchSearch && matchCat;
    });

    const categories = Array.from(new Set(subjects.map(s => s.category).filter(Boolean)));

    const openAddSubject = () => {
        setEditSubject(null);
        setSubjectForm({ subject_name: '', subject_code: '', category: 'Compulsory', max_score: 100, is_active: true, initials: '' });
        setShowSubjectModal(true);
    };

    const openEditSubject = (sub: any) => {
        setEditSubject(sub);
        setSubjectForm({
            subject_name: sub.subject_name, subject_code: sub.subject_code || '',
            category: sub.category || 'Core', max_score: sub.max_score || 100,
            is_active: sub.is_active !== false, initials: sub.initials || sub.subject_code || '',
        });
        setShowSubjectModal(true);
    };

    const handleSaveSubject = async () => {
        if (!subjectForm.subject_name) { toast.error('Subject name is required'); return; }
        const payload = {
            subject_name: subjectForm.subject_name,
            subject_code: subjectForm.subject_code || subjectForm.initials,
            category: subjectForm.category,
            max_score: subjectForm.max_score,
            is_active: subjectForm.is_active,
            initials: subjectForm.initials || subjectForm.subject_code,
        };

        let error;
        if (editSubject?.id) {
            ({ error } = await supabase.from('school_subjects').update(payload).eq('id', editSubject.id));
        } else {
            ({ error } = await supabase.from('school_subjects').insert([payload]));
        }
        if (error) { toast.error(error.message); return; }
        toast.success(editSubject ? 'Subject updated ✅' : 'Subject added ✅');
        setShowSubjectModal(false);
        fetchAll();
    };

    const handleDeleteSubject = async (id: number) => {
        if (!confirm('Delete this subject? All teacher assignments will also be removed.')) return;
        await supabase.from('school_subject_teachers').delete().eq('subject_id', id);
        const { error } = await supabase.from('school_subjects').delete().eq('id', id);
        if (error) { toast.error('Cannot delete this subject'); return; }
        toast.success('Subject removed');
        fetchAll();
    };

    const seedKenyanSubjects = async () => {
        if (!confirm(`This will add ${KENYAN_SUBJECTS.length} Kenyan KCSE subjects (2025/2026). Existing subjects won't be duplicated. Continue?`)) return;
        let added = 0;
        for (const sub of KENYAN_SUBJECTS) {
            const existing = subjects.find(s => s.subject_code === sub.code || s.subject_name === sub.name);
            if (!existing) {
                const { error } = await supabase.from('school_subjects').insert([{
                    subject_name: sub.name, subject_code: sub.code,
                    category: sub.category, max_score: sub.max_score,
                    is_active: true, initials: sub.code,
                }]);
                if (!error) added++;
            }
        }
        toast.success(`Added ${added} new subjects ✅`);
        fetchAll();
    };

    // ===== TEACHER-SUBJECT ASSIGNMENTS =====
    const openAddAssignment = () => {
        setAssignForm({ subject_id: 0, teacher_id: 0, form_id: 0, stream_id: 0, teacher_initials: '' });
        setShowAssignModal(true);
    };

    const handleSaveAssignment = async () => {
        if (!assignForm.subject_id || !assignForm.teacher_id) { toast.error('Select both subject and teacher'); return; }
        const teacher = teachers.find(t => t.id === assignForm.teacher_id);
        const initials = assignForm.teacher_initials || (teacher ? generateInitials(teacher) : '');

        const payload: any = {
            subject_id: assignForm.subject_id,
            teacher_id: assignForm.teacher_id,
            form_id: assignForm.form_id || null,
            stream_id: assignForm.stream_id || null,
            teacher_initials: initials,
        };

        const { error } = await supabase.from('school_subject_teachers').insert([payload]);
        if (error) {
            if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
                toast.error('This assignment already exists');
            } else {
                toast.error(error.message);
            }
            return;
        }
        toast.success('Assignment added ✅');
        setShowAssignModal(false);
        fetchAll();
    };

    const handleDeleteAssignment = async (id: number) => {
        if (!confirm('Remove this teacher-subject assignment?')) return;
        await supabase.from('school_subject_teachers').delete().eq('id', id);
        toast.success('Assignment removed');
        fetchAll();
    };

    // Group subjects by category for display
    const groupedSubjects: Record<string, any[]> = {};
    filteredSubjects.forEach(s => {
        const cat = s.category || 'Other';
        if (!groupedSubjects[cat]) groupedSubjects[cat] = [];
        groupedSubjects[cat].push(s);
    });

    const activeSubjects = subjects.filter(s => s.is_active !== false);

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📚 Subjects & Assignments</h1>
                    <p className="text-sm text-gray-500 mt-1">{subjects.length} subjects • {activeSubjects.length} active • {assignments.length} teacher assignments</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'All Subjects', count: subjects.length, icon: '📚', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
                    { label: 'Compulsory', count: subjects.filter(s => s.category === 'Compulsory' || s.category === 'Core').length, icon: '📕', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
                    { label: 'Sciences', count: subjects.filter(s => s.category === 'Science').length, icon: '🔬', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                    { label: 'Humanities', count: subjects.filter(s => s.category === 'Humanities').length, icon: '🌍', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
                    { label: 'Assignments', count: assignments.length, icon: '🔗', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
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

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
                <button onClick={() => setActiveTab('subjects')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'subjects' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    📚 Subjects List
                </button>
                <button onClick={() => setActiveTab('assignments')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'assignments' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    🔗 Teacher-Subject Assignments
                </button>
            </div>

            {/* ==================== SUBJECTS TAB ==================== */}
            {activeTab === 'subjects' && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..."
                                className="input-modern pl-10 py-2.5 text-sm" />
                        </div>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={seedKenyanSubjects} className="btn-outline flex items-center gap-1.5 text-sm">🇰🇪 Seed KCSE Subjects</button>
                        <button onClick={openAddSubject} className="btn-primary flex items-center gap-1.5 text-sm"><FiPlus size={16} /> Add Subject</button>
                    </div>

                    {/* Subjects Table */}
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {filteredSubjects.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <span className="text-4xl mb-3 block">📚</span>
                                    <p className="font-medium">No subjects found</p>
                                    <p className="text-sm mt-1">Click &quot;Seed KCSE Subjects&quot; to auto-load all Kenyan subjects</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Code</th>
                                                <th>Subject Name</th>
                                                <th>Initials</th>
                                                <th>Category</th>
                                                <th>Max Score</th>
                                                <th>Teachers</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubjects.map((s, i) => {
                                                const teacherCount = assignments.filter(a => a.subject_id === s.id).length;
                                                return (
                                                    <tr key={s.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openEditSubject(s)}>
                                                        <td className="text-xs text-gray-400">{i + 1}</td>
                                                        <td><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-xs">{s.subject_code || '-'}</span></td>
                                                        <td className="font-semibold">{s.subject_name}</td>
                                                        <td><span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{s.initials || s.subject_code || '-'}</span></td>
                                                        <td>
                                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                                {s.category}
                                                            </span>
                                                        </td>
                                                        <td className="font-semibold">{s.max_score || 100}</td>
                                                        <td>
                                                            {teacherCount > 0 ? (
                                                                <span className="badge badge-success">{teacherCount} teacher{teacherCount > 1 ? 's' : ''}</span>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">No teachers</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${s.is_active !== false ? 'badge-success' : 'badge-danger'}`}>
                                                                {s.is_active !== false ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => openEditSubject(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteSubject(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* KCSE Grading Reference */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">📊 KCSE Grading System (Kenya 2025/2026)</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                            {[
                                { grade: 'A', range: '80-100', pts: 12, color: '#16a34a' },
                                { grade: 'A-', range: '75-79', pts: 11, color: '#22c55e' },
                                { grade: 'B+', range: '70-74', pts: 10, color: '#4ade80' },
                                { grade: 'B', range: '65-69', pts: 9, color: '#3b82f6' },
                                { grade: 'B-', range: '60-64', pts: 8, color: '#60a5fa' },
                                { grade: 'C+', range: '55-59', pts: 7, color: '#818cf8' },
                                { grade: 'C', range: '50-54', pts: 6, color: '#f59e0b' },
                                { grade: 'C-', range: '45-49', pts: 5, color: '#fbbf24' },
                                { grade: 'D+', range: '40-44', pts: 4, color: '#f97316' },
                                { grade: 'D', range: '35-39', pts: 3, color: '#fb923c' },
                                { grade: 'D-', range: '30-34', pts: 2, color: '#ef4444' },
                                { grade: 'E', range: '0-29', pts: 1, color: '#dc2626' },
                            ].map(g => (
                                <div key={g.grade} className="text-center p-2 rounded-xl border border-gray-100" style={{ background: `${g.color}10` }}>
                                    <div className="text-lg font-bold" style={{ color: g.color }}>{g.grade}</div>
                                    <div className="text-[10px] text-gray-500">{g.range}</div>
                                    <div className="text-[10px] font-semibold text-gray-600">{g.pts} pts</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ==================== ASSIGNMENTS TAB ==================== */}
            {activeTab === 'assignments' && (
                <>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..."
                                className="input-modern pl-10 py-2.5 text-sm" />
                        </div>
                        <button onClick={openAddAssignment} className="btn-primary flex items-center gap-1.5 text-sm"><FiLink size={16} /> Assign Teacher to Subject</button>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-700">
                        <p className="font-semibold">🔗 Teacher-Subject-Form-Stream Assignments</p>
                        <p className="mt-1 text-xs">Link teachers to subjects they teach, specifying which form and stream. Teacher initials (e.g. JKM) appear on mark sheets and report forms.</p>
                    </div>

                    {/* Assignments Table */}
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            {assignments.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <span className="text-4xl mb-3 block">🔗</span>
                                    <p className="font-medium">No teacher assignments yet</p>
                                    <p className="text-sm mt-1">Click &quot;Assign Teacher to Subject&quot; to link teachers to subjects per form/stream</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Subject</th>
                                                <th>Code</th>
                                                <th>Teacher</th>
                                                <th>Initials</th>
                                                <th>Form</th>
                                                <th>Stream</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments
                                                .filter(a => {
                                                    if (!search) return true;
                                                    const subName = a.school_subjects?.subject_name || '';
                                                    const teachName = `${a.school_teachers?.first_name || ''} ${a.school_teachers?.last_name || ''}`;
                                                    return `${subName} ${teachName}`.toLowerCase().includes(search.toLowerCase());
                                                })
                                                .map((a, i) => {
                                                    const form = forms.find(f => f.id === a.form_id);
                                                    const stream = streams.find(s => s.id === a.stream_id);
                                                    return (
                                                        <tr key={a.id} className="hover:bg-gray-50/50">
                                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                                            <td className="font-semibold">{a.school_subjects?.subject_name || 'N/A'}</td>
                                                            <td><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-xs">{a.school_subjects?.subject_code || '-'}</span></td>
                                                            <td className="font-medium">{a.school_teachers?.first_name || ''} {a.school_teachers?.last_name || ''}</td>
                                                            <td>
                                                                <span className="text-sm font-bold font-mono bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg">
                                                                    {a.teacher_initials || '-'}
                                                                </span>
                                                            </td>
                                                            <td>{form?.form_name || <span className="text-gray-400 text-xs">All Forms</span>}</td>
                                                            <td>{stream?.stream_name || <span className="text-gray-400 text-xs">All Streams</span>}</td>
                                                            <td>
                                                                <button onClick={() => handleDeleteAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ===== SUBJECT ADD/EDIT MODAL ===== */}
            {showSubjectModal && (
                <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 pt-6 pb-3">
                            <h3 className="text-lg font-bold text-gray-800">{editSubject ? '✏️ Edit Subject' : '➕ Add Subject'}</h3>
                            <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            {/* Quick-fill from Kenyan subjects */}
                            {!editSubject && (
                                <div>
                                    <label className="lbl">Quick Fill (Kenyan KCSE)</label>
                                    <select className="select-modern w-full" onChange={e => {
                                        const sub = KENYAN_SUBJECTS.find(s => s.code === e.target.value);
                                        if (sub) setSubjectForm({ ...subjectForm, subject_name: sub.name, subject_code: sub.code, category: sub.category, max_score: sub.max_score, initials: sub.code });
                                    }}>
                                        <option value="">Select a subject to auto-fill...</option>
                                        {KENYAN_SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name} ({s.category})</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="lbl">Subject Name *</label><input type="text" value={subjectForm.subject_name} onChange={e => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Mathematics" /></div>
                                <div><label className="lbl">KNEC Code</label><input type="text" value={subjectForm.subject_code} onChange={e => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. 121" /></div>
                                <div><label className="lbl">Initials (for reports)</label><input type="text" value={subjectForm.initials} onChange={e => setSubjectForm({ ...subjectForm, initials: e.target.value.toUpperCase() })} className="input-modern pl-4 py-2.5 text-sm font-mono" placeholder="e.g. MATH" maxLength={10} /></div>
                                <div>
                                    <label className="lbl">Category</label>
                                    <select value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })} className="select-modern w-full">
                                        <option value="Compulsory">Compulsory (Group I)</option>
                                        <option value="Science">Science (Group II)</option>
                                        <option value="Humanities">Humanities (Group III)</option>
                                        <option value="Technical">Technical (Group IV)</option>
                                        <option value="Languages">Languages (Group V)</option>
                                        <option value="Creative">Creative (Group V)</option>
                                        <option value="Applied">Applied (Group V)</option>
                                        <option value="Core">Core</option>
                                        <option value="Elective">Elective</option>
                                    </select>
                                </div>
                                <div><label className="lbl">Max Score</label><input type="number" value={subjectForm.max_score} onChange={e => setSubjectForm({ ...subjectForm, max_score: Number(e.target.value) })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="lbl mb-0">Active</label>
                                <button onClick={() => setSubjectForm({ ...subjectForm, is_active: !subjectForm.is_active })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${subjectForm.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${subjectForm.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={() => setShowSubjectModal(false)} className="btn-outline text-sm">Cancel</button>
                            <button onClick={handleSaveSubject} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> {editSubject ? 'Update' : 'Add Subject'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ASSIGNMENT MODAL ===== */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 pt-6 pb-3">
                            <h3 className="text-lg font-bold text-gray-800">🔗 Assign Teacher to Subject</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                💡 Link a teacher to a specific subject, form, and stream. The teacher&apos;s initials will appear on mark sheets and report forms.
                            </div>
                            <div>
                                <label className="lbl">Subject *</label>
                                <select value={assignForm.subject_id} onChange={e => setAssignForm({ ...assignForm, subject_id: Number(e.target.value) })} className="select-modern w-full">
                                    <option value={0}>Select Subject...</option>
                                    {subjects.filter(s => s.is_active !== false).map(s => (
                                        <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Teacher *</label>
                                <select value={assignForm.teacher_id} onChange={e => {
                                    const tid = Number(e.target.value);
                                    const teacher = teachers.find(t => t.id === tid);
                                    setAssignForm({
                                        ...assignForm,
                                        teacher_id: tid,
                                        teacher_initials: teacher ? generateInitials(teacher) : '',
                                    });
                                }} className="select-modern w-full">
                                    <option value={0}>Select Teacher...</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.first_name} {t.middle_name ? t.middle_name + ' ' : ''}{t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Teacher Initials (for mark sheets)</label>
                                <input type="text" value={assignForm.teacher_initials}
                                    onChange={e => setAssignForm({ ...assignForm, teacher_initials: e.target.value.toUpperCase() })}
                                    className="input-modern pl-4 py-2.5 text-sm font-mono font-bold tracking-wider" placeholder="e.g. JKM" maxLength={5} />
                                <p className="text-[10px] text-gray-400 mt-1">Auto-generated from teacher name. Edit to customize.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="lbl">Form (optional)</label>
                                    <select value={assignForm.form_id} onChange={e => setAssignForm({ ...assignForm, form_id: Number(e.target.value) })} className="select-modern w-full">
                                        <option value={0}>All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="lbl">Stream (optional)</label>
                                    <select value={assignForm.stream_id} onChange={e => setAssignForm({ ...assignForm, stream_id: Number(e.target.value) })} className="select-modern w-full">
                                        <option value={0}>All Streams</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={() => setShowAssignModal(false)} className="btn-outline text-sm">Cancel</button>
                            <button onClick={handleSaveAssignment} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> Save Assignment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

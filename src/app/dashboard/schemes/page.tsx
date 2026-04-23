'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiChevronDown, FiChevronRight, FiCheck, FiClock, FiDownload,
    FiRefreshCw, FiEye, FiZap, FiCalendar, FiUser, FiMessageSquare,
    FiArrowLeft, FiCopy, FiCheckCircle, FiLayers, FiFileText,
} from 'react-icons/fi';
import {
    getSchemesOfWork, getSchemeById, createScheme, updateScheme, deleteScheme,
    getSchemeWeeks, createSchemeWeeks, updateSchemeWeek,
    getSchemeLessons, getWeekLessons, createSchemeLesson, updateSchemeLesson, deleteSchemeLesson,
    getLessonResources, createSchemeResource, deleteSchemeResource,
    getSchemeRemarks, createSchemeRemark,
    getSubjects, getForms, getTerms, getTeachers,
    getStrands, getSubStrands, getTopics, getLearningAreas,
    autoGenerateScheme,
    type SchemeOfWork, type SchemeWeek, type SchemeLesson, type SchemeResource, type SchemeRemark,
} from '@/lib/schemes';

const CORE_COMPETENCIES = ['Communication & Collaboration', 'Critical Thinking & Problem Solving', 'Creativity & Imagination', 'Citizenship', 'Self-Efficacy', 'Digital Literacy', 'Learning to Learn'];
const CBC_VALUES = ['Love', 'Responsibility', 'Respect', 'Unity', 'Peace', 'Patriotism', 'Integrity'];
const RESOURCE_TYPES = ['Textbook', 'Worksheet', 'Digital Resource', 'Apparatus', 'Chart', 'Realia', 'Video', 'Reference Book', 'Past Papers', 'Manipulatives'];
const ASSESSMENT_METHODS = ['Observation', 'Oral Questions', 'Written Exercise', 'Practical Assessment', 'Project', 'Portfolio', 'Rubric', 'Peer Assessment', 'Self-Assessment', 'Test'];

const C = {
    subject: { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    form: { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    term: { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    status: { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    cbc: { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    lessons: { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    teacher: { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    actions: { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
};

type ViewMode = 'list' | 'detail' | 'create' | 'edit-lesson';

export default function SchemesPage() {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
    const [selectedScheme, setSelectedScheme] = useState<SchemeOfWork | null>(null);
    const [weeks, setWeeks] = useState<SchemeWeek[]>([]);
    const [lessons, setLessons] = useState<SchemeLesson[]>([]);
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const [editingLesson, setEditingLesson] = useState<SchemeLesson | null>(null);
    const [remarks, setRemarks] = useState<SchemeRemark[]>([]);
    const [lessonResources, setLessonResources] = useState<SchemeResource[]>([]);

    const [filterSubject, setFilterSubject] = useState<number | ''>('');
    const [filterForm, setFilterForm] = useState<number | ''>('');
    const [filterTerm, setFilterTerm] = useState<number | ''>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [subjects, setSubjects] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [strands, setStrands] = useState<any[]>([]);
    const [subStrands, setSubStrands] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [learningAreas, setLearningAreas] = useState<any[]>([]);

    // Create form
    const [createForm, setCreateForm] = useState({
        subject_id: 0, form_id: 0, term_id: 0, teacher_id: 0,
        curriculum_type: 'CBC' as 'CBC' | '8-4-4',
        strand_id: 0, topic_id: 0, weeksCount: 14, lessonsPerWeek: 3,
    });
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Lesson edit form
    const [lessonForm, setLessonForm] = useState<Partial<SchemeLesson>>({});

    // Remark form
    const [remarkText, setRemarkText] = useState('');
    const [remarkType, setRemarkType] = useState('weekly');

    const loadRefData = useCallback(async () => {
        try {
            const [s, f, t, tc, la] = await Promise.all([getSubjects(), getForms(), getTerms(), getTeachers(), getLearningAreas()]);
            setSubjects(s); setForms(f); setTerms(t); setTeachers(tc); setLearningAreas(la);
        } catch { toast.error('Failed to load reference data'); }
    }, []);

    const loadSchemes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSchemesOfWork({
                subject_id: filterSubject || undefined,
                form_id: filterForm || undefined,
                term_id: filterTerm || undefined,
            } as any);
            setSchemes(data);
        } catch { toast.error('Failed to load schemes'); }
        setLoading(false);
    }, [filterSubject, filterForm, filterTerm]);

    useEffect(() => { loadRefData(); loadSchemes(); }, []);

    useEffect(() => { loadSchemes(); }, [filterSubject, filterForm, filterTerm]);

    const loadDetail = async (schemeId: number) => {
        try {
            const [scheme, w, l, r] = await Promise.all([
                getSchemeById(schemeId), getSchemeWeeks(schemeId),
                getSchemeLessons(schemeId), getSchemeRemarks(schemeId),
            ]);
            setSelectedScheme(scheme); setWeeks(w); setLessons(l); setRemarks(r);
            setViewMode('detail');
        } catch { toast.error('Failed to load scheme detail'); }
    };

    const handleStrandChange = async (strandId: number) => {
        setCreateForm(f => ({ ...f, strand_id: strandId }));
        if (strandId) {
            const ss = await getSubStrands(strandId);
            setSubStrands(ss);
        }
    };

    const handleSubjectChange = async (subjectId: number) => {
        setCreateForm(f => ({ ...f, subject_id: subjectId, strand_id: 0, topic_id: 0 }));
        if (createForm.curriculum_type === 'CBC') {
            const st = await getStrands();
            setStrands(st);
        } else {
            const tp = await getTopics(subjectId, createForm.form_id || undefined);
            setTopics(tp);
        }
    };

    const handleAutoGenerate = async () => {
        if (!createForm.subject_id || !createForm.form_id || !createForm.term_id) {
            toast.error('Subject, Form & Term are required'); return;
        }
        setGenerating(true);
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            await autoGenerateScheme({
                subjectId: createForm.subject_id,
                formId: createForm.form_id,
                termId: createForm.term_id,
                curriculumType: createForm.curriculum_type,
                teacherId: createForm.teacher_id || undefined,
                createdBy: user.full_name || user.username,
                strandId: createForm.strand_id || undefined,
                weeksCount: createForm.weeksCount,
                lessonsPerWeek: createForm.lessonsPerWeek,
            });
            toast.success('Scheme auto-generated with weeks & lessons!');
            setViewMode('list');
            loadSchemes();
        } catch (err: any) { toast.error(err.message || 'Generation failed'); }
        setGenerating(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this scheme and all its weeks/lessons?')) return;
        try { await deleteScheme(id); toast.success('Deleted'); loadSchemes(); } catch { toast.error('Delete failed'); }
    };

    const handleStatusChange = async (id: number, status: string) => {
        try { await updateScheme(id, { status } as any); toast.success(`Status → ${status}`); loadDetail(id); } catch { toast.error('Failed'); }
    };

    const openEditLesson = (lesson: SchemeLesson) => {
        setEditingLesson(lesson);
        setLessonForm({ ...lesson });
        setViewMode('edit-lesson');
        loadLessonResources(lesson.id!);
    };

    const loadLessonResources = async (lessonId: number) => {
        try { const r = await getLessonResources(lessonId); setLessonResources(r); } catch { }
    };

    const handleSaveLesson = async () => {
        if (!editingLesson?.id || !lessonForm.lesson_title) { toast.error('Title required'); return; }
        setSaving(true);
        try {
            await updateSchemeLesson(editingLesson.id, lessonForm);
            toast.success('Lesson updated!');
            loadDetail(selectedScheme!.id!);
            setViewMode('detail');
        } catch (err: any) { toast.error(err.message || 'Save failed'); }
        setSaving(false);
    };

    const handleAddRemark = async () => {
        if (!remarkText.trim() || !selectedScheme?.id) return;
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            await createSchemeRemark({
                scheme_id: selectedScheme.id!,
                week_id: expandedWeek || undefined,
                remark_type: remarkType,
                remark_text: remarkText,
                recorded_by: user.full_name || user.username,
            });
            toast.success('Remark added');
            setRemarkText('');
            const r = await getSchemeRemarks(selectedScheme.id!);
            setRemarks(r);
        } catch { toast.error('Failed to add remark'); }
    };

    const handleAddResource = async (lessonId: number) => {
        const title = prompt('Resource title:');
        if (!title) return;
        const type = prompt('Resource type (Textbook, Worksheet, Digital, etc.):', 'Textbook');
        try {
            await createSchemeResource({ lesson_id: lessonId, resource_type: type || 'Textbook', resource_title: title });
            toast.success('Resource added');
            loadLessonResources(lessonId);
        } catch { toast.error('Failed'); }
    };

    const handleMarkComplete = async (lesson: SchemeLesson) => {
        try {
            await updateSchemeLesson(lesson.id!, { is_completed: true, completed_at: new Date().toISOString(), completion_notes: 'Completed in class' });
            toast.success('Lesson marked complete ✓');
            loadDetail(selectedScheme!.id!);
        } catch { toast.error('Failed'); }
    };

    const filtered = schemes.filter(s => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (s.subject_name || '').toLowerCase().includes(q) || (s.form_name || '').toLowerCase().includes(q) || (s.strand_name || s.topic_name || '').toLowerCase().includes(q);
        }
        return true;
    });

    const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
            Draft: { bg: '#fefce8', text: '#a16207', border: '#fde68a', label: '📝 Draft' },
            Active: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: '✅ Active' },
            Completed: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: '🏁 Completed' },
            Archived: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', label: '📦 Archived' },
        };
        const s = map[status] || map.Draft;
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>{s.label}</span>;
    };

    const curriculumBadge = (type: string) => type === 'CBC'
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: '#faf5ff', color: '#7c3aed', borderColor: '#e9d5ff' }}>🇰🇪 CBC</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>📖 8-4-4</span>;

    const completedLessons = lessons.filter(l => l.is_completed).length;
    const totalLessons = lessons.length;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>📚</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading schemes…</p>
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // LIST VIEW
    // ════════════════════════════════════════════════════════════
    if (viewMode === 'list') return (
        <div className="animate-fadeIn space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-title">📚 Schemes of Work</h1>
                    <p className="text-sm text-gray-500 mt-1">{schemes.length} schemes · Kenya CBC & 8-4-4 Syllabus</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => loadSchemes()} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition"><FiRefreshCw size={15} /></button>
                    <button onClick={() => setViewMode('create')} className="btn-primary flex items-center gap-2"><FiPlus size={15} /> New Scheme</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Schemes', value: schemes.length, emoji: '📚', color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Active', value: schemes.filter(s => s.status === 'Active').length, emoji: '✅', color: '#059669', bg: '#ecfdf5' },
                    { label: 'CBC', value: schemes.filter(s => s.curriculum_type === 'CBC').length, emoji: '🇰🇪', color: '#7c3aed', bg: '#faf5ff' },
                    { label: '8-4-4', value: schemes.filter(s => s.curriculum_type === '8-4-4').length, emoji: '📖', color: '#1d4ed8', bg: '#eef2ff' },
                ].map((k, i) => (
                    <div key={i} className="relative p-4 rounded-2xl border-2 overflow-hidden" style={{ background: k.bg, borderColor: k.color + '33' }}>
                        <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-6 translate-x-6 opacity-10" style={{ background: k.color }} />
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: k.color + '99' }}>{k.emoji} {k.label}</p>
                        <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search schemes…"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none" />
                </div>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value ? Number(e.target.value) : '')}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
                <select value={filterForm} onChange={e => setFilterForm(e.target.value ? Number(e.target.value) : '')}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Forms</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value ? Number(e.target.value) : '')}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">All Terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                </select>
            </div>

            {/* Schemes Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-5xl mb-3">📚</div>
                    <p className="text-gray-500 font-bold">No schemes found</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new scheme or adjust filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(s => (
                        <div key={s.id} className="relative p-5 rounded-2xl border-2 bg-white overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                            style={{ borderColor: '#e2e8f0' }}
                            onClick={() => loadDetail(s.id!)}>
                            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 opacity-5" style={{ background: s.curriculum_type === 'CBC' ? '#7c3aed' : '#1d4ed8' }} />
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {curriculumBadge(s.curriculum_type!)}
                                    {statusBadge(s.status || 'Draft')}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id!); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><FiTrash2 size={13} /></button>
                                </div>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm">{s.subject_name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{s.form_name} · {s.term_name}</p>
                            {s.strand_name && <p className="text-xs text-purple-600 mt-1 font-semibold">Strand: {s.strand_name}</p>}
                            {s.topic_name && <p className="text-xs text-blue-600 mt-1 font-semibold">Topic: {s.topic_name}</p>}
                            {s.teacher_name && <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><FiUser size={10} /> {s.teacher_name}</p>}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                <span className="text-[10px] font-bold text-blue-600">{s.total_lessons || 0} lessons</span>
                                <span className="text-[10px] font-bold text-amber-600">{s.total_weeks || 0} weeks</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // CREATE VIEW
    // ════════════════════════════════════════════════════════════
    if (viewMode === 'create') return (
        <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('list')} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"><FiArrowLeft size={16} /></button>
                <div>
                    <h1 className="page-title">✨ New Scheme of Work</h1>
                    <p className="text-sm text-gray-500">Auto-generate from Kenya CBC / 8-4-4 syllabus</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Curriculum</label>
                        <select value={createForm.curriculum_type} onChange={e => setCreateForm(f => ({ ...f, curriculum_type: e.target.value as any, strand_id: 0, topic_id: 0 }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">
                            <option value="CBC">🇰🇪 CBC (Competency Based)</option>
                            <option value="8-4-4">📖 8-4-4 (Legacy)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                        <select value={createForm.subject_id} onChange={e => handleSubjectChange(Number(e.target.value))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Form</label>
                        <select value={createForm.form_id} onChange={e => setCreateForm(f => ({ ...f, form_id: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Form</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Term</label>
                        <select value={createForm.term_id} onChange={e => setCreateForm(f => ({ ...f, term_id: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Term</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teacher</label>
                        <select value={createForm.teacher_id} onChange={e => setCreateForm(f => ({ ...f, teacher_id: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value={0}>Select Teacher</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                        </select>
                    </div>
                    {createForm.curriculum_type === 'CBC' ? (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Strand</label>
                            <select value={createForm.strand_id} onChange={e => handleStrandChange(Number(e.target.value))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                                <option value={0}>All Strands</option>
                                {strands.map(s => <option key={s.id} value={s.id}>{s.strand_name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Topic</label>
                            <select value={createForm.topic_id} onChange={e => setCreateForm(f => ({ ...f, topic_id: Number(e.target.value) }))}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                                <option value={0}>All Topics</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weeks</label>
                        <input type="number" value={createForm.weeksCount} onChange={e => setCreateForm(f => ({ ...f, weeksCount: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" min={1} max={20} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lessons/Week</label>
                        <input type="number" value={createForm.lessonsPerWeek} onChange={e => setCreateForm(f => ({ ...f, lessonsPerWeek: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" min={1} max={10} />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button onClick={handleAutoGenerate} disabled={generating}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
                        {generating ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <FiZap size={16} />}
                        {generating ? 'Generating…' : '⚡ Auto-Generate Scheme'}
                    </button>
                    <button onClick={() => setViewMode('list')} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
            </div>
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // DETAIL VIEW
    // ════════════════════════════════════════════════════════════
    if (viewMode === 'detail' && selectedScheme) return (
        <div className="animate-fadeIn space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => { setViewMode('list'); setSelectedScheme(null); }} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"><FiArrowLeft size={16} /></button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="page-title">{selectedScheme.subject_name}</h1>
                        {curriculumBadge(selectedScheme.curriculum_type!)}
                        {statusBadge(selectedScheme.status || 'Draft')}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{selectedScheme.form_name} · {selectedScheme.term_name} {selectedScheme.teacher_name && `· 👨‍🏫 ${selectedScheme.teacher_name}`}</p>
                </div>
                <div className="flex gap-2">
                    {selectedScheme.status === 'Draft' && <button onClick={() => handleStatusChange(selectedScheme.id!, 'Active')} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>✅ Activate</button>}
                    {selectedScheme.status === 'Active' && <button onClick={() => handleStatusChange(selectedScheme.id!, 'Completed')} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}>🏁 Complete</button>}
                </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500">Teaching Progress</span>
                    <span className="text-xs font-black" style={{ color: progressPct >= 75 ? '#059669' : progressPct >= 50 ? '#b45309' : '#dc2626' }}>{progressPct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct >= 75 ? 'linear-gradient(90deg,#059669,#10b981)' : progressPct >= 50 ? 'linear-gradient(90deg,#b45309,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)' }} />
                </div>
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-bold text-blue-600">{completedLessons}/{totalLessons} lessons done</span>
                    <span className="text-[10px] font-bold text-amber-600">{weeks.length} weeks</span>
                    {selectedScheme.strand_name && <span className="text-[10px] font-bold text-purple-600">Strand: {selectedScheme.strand_name}</span>}
                </div>
            </div>

            {/* Weeks & Lessons */}
            <div className="space-y-3">
                {weeks.map(w => {
                    const weekLessons = lessons.filter(l => l.week_id === w.id);
                    const weekCompleted = weekLessons.filter(l => l.is_completed).length;
                    const isExpanded = expandedWeek === w.id;
                    return (
                        <div key={w.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                            <button onClick={() => setExpandedWeek(isExpanded ? null : w.id!)}
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
                                <span className="text-lg">{w.is_midterm ? '🏖️' : '📅'}</span>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-bold text-gray-900">Week {w.week_number}: {w.week_title || '—'}</p>
                                    {w.is_midterm && <span className="text-[10px] font-bold text-amber-600">MID-TERM BREAK</span>}
                                    {!w.is_midterm && <p className="text-[10px] text-gray-400 mt-0.5">{weekCompleted}/{weekLessons.length} lessons completed</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!w.is_midterm && weekLessons.length > 0 && (
                                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${weekLessons.length > 0 ? (weekCompleted / weekLessons.length) * 100 : 0}%` }} />
                                        </div>
                                    )}
                                    {isExpanded ? <FiChevronDown size={14} className="text-gray-400" /> : <FiChevronRight size={14} className="text-gray-400" />}
                                </div>
                            </button>
                            {isExpanded && !w.is_midterm && (
                                <div className="px-5 pb-4 space-y-2">
                                    {weekLessons.map(l => (
                                        <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${l.is_completed ? 'border-green-200 bg-green-50/50' : 'border-gray-100 bg-gray-50/50 hover:border-blue-200'}`}
                                            onClick={() => openEditLesson(l)}>
                                            <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${l.is_completed ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                {l.is_completed ? '✓' : l.lesson_number}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold truncate ${l.is_completed ? 'text-green-700 line-through' : 'text-gray-800'}`}>{l.lesson_title}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{l.lesson_duration_minutes}min · {l.sub_strand_name || l.topic_name || '—'}</p>
                                            </div>
                                            {!l.is_completed && (
                                                <button onClick={e => { e.stopPropagation(); handleMarkComplete(l); }} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50" title="Mark complete">
                                                    <FiCheckCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {weekLessons.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No lessons scheduled</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2"><FiMessageSquare size={14} /> Remarks & Reflections</h3>
                <div className="flex gap-2 mb-3">
                    <select value={remarkType} onChange={e => setRemarkType(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs">
                        <option value="weekly">Weekly</option>
                        <option value="lesson">Lesson</option>
                        <option value="term">Term</option>
                        <option value="hod_review">HOD Review</option>
                    </select>
                    <input value={remarkText} onChange={e => setRemarkText(e.target.value)} placeholder="Add remark…"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                    <button onClick={handleAddRemark} className="btn-primary px-4 py-2 text-xs">Add</button>
                </div>
                {remarks.length === 0 ? <p className="text-xs text-gray-400 text-center py-3">No remarks yet</p> : (
                    <div className="space-y-2">
                        {remarks.map(r => (
                            <div key={r.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase">{r.remark_type}</span>
                                    <span className="text-[10px] text-gray-400">{r.recorded_by} · {new Date(r.created_at!).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-gray-700">{r.remark_text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ════════════════════════════════════════════════════════════
    // EDIT LESSON VIEW
    // ════════════════════════════════════════════════════════════
    if (viewMode === 'edit-lesson' && editingLesson) return (
        <div className="animate-fadeIn space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <button onClick={() => { setViewMode('detail'); setEditingLesson(null); }} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"><FiArrowLeft size={16} /></button>
                <div>
                    <h1 className="page-title">✏️ Edit Lesson</h1>
                    <p className="text-sm text-gray-500">Lesson {editingLesson.lesson_number}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lesson Title</label>
                    <input value={lessonForm.lesson_title || ''} onChange={e => setLessonForm(f => ({ ...f, lesson_title: e.target.value }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration (min)</label>
                        <input type="number" value={lessonForm.lesson_duration_minutes || 40} onChange={e => setLessonForm(f => ({ ...f, lesson_duration_minutes: Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Double Lesson</label>
                        <select value={lessonForm.is_double_lesson ? 'yes' : 'no'} onChange={e => setLessonForm(f => ({ ...f, is_double_lesson: e.target.value === 'yes' }))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learning Outcomes</label>
                    <textarea value={(lessonForm.learning_outcomes || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, learning_outcomes: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[60px]" placeholder="One outcome per line" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Key Inquiry Questions (CBC)</label>
                    <textarea value={(lessonForm.key_inquiry_questions || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, key_inquiry_questions: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[60px]" placeholder="One question per line" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learning Activities</label>
                    <textarea value={(lessonForm.learning_activities || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, learning_activities: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[60px]" placeholder="One activity per line" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learning Resources</label>
                    <textarea value={(lessonForm.learning_resources || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, learning_resources: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[60px]" placeholder="One resource per line" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessment Methods</label>
                    <textarea value={(lessonForm.assessment_methods || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, assessment_methods: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[60px]" placeholder="One method per line" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Core Competencies (CBC)</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {CORE_COMPETENCIES.map(c => (
                            <button key={c} type="button" onClick={() => {
                                const arr = lessonForm.core_competencies || [];
                                setLessonForm(f => ({ ...f, core_competencies: arr.includes(c) ? arr.filter(x => x !== c) : [...arr, c] }));
                            }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${(lessonForm.core_competencies || []).includes(c) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Values (CBC)</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {CBC_VALUES.map(v => (
                            <button key={v} type="button" onClick={() => {
                                const arr = lessonForm.values || [];
                                setLessonForm(f => ({ ...f, values: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }));
                            }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${(lessonForm.values || []).includes(v) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Links to Other Subjects</label>
                    <textarea value={(lessonForm.links_to_other_subjects || []).join('\n')} onChange={e => setLessonForm(f => ({ ...f, links_to_other_subjects: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs min-h-[40px]" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Community Service Learning</label>
                    <input value={lessonForm.community_service_learning || ''} onChange={e => setLessonForm(f => ({ ...f, community_service_learning: e.target.value }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Non-Formal Activity</label>
                    <input value={lessonForm.non_formal_activity || ''} onChange={e => setLessonForm(f => ({ ...f, non_formal_activity: e.target.value }))}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-xs" />
                </div>

                {/* Resources */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detailed Resources</label>
                        <button onClick={() => handleAddResource(editingLesson.id!)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><FiPlus size={10} /> Add</button>
                    </div>
                    {lessonResources.length === 0 ? <p className="text-[10px] text-gray-400">No detailed resources</p> : (
                        <div className="space-y-1">
                            {lessonResources.map(r => (
                                <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                                    <span className="text-[10px] font-bold text-purple-600">{r.resource_type}</span>
                                    <span className="text-xs text-gray-700 flex-1">{r.resource_title}</span>
                                    <button onClick={() => { deleteSchemeResource(r.id!); loadLessonResources(editingLesson.id!); }} className="text-gray-400 hover:text-red-500"><FiTrash2 size={11} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button onClick={handleSaveLesson} disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
                        {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <FiSave size={16} />}
                        {saving ? 'Saving…' : 'Save Lesson'}
                    </button>
                    <button onClick={() => { setViewMode('detail'); setEditingLesson(null); }} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
            </div>
        </div>
    );

    return null;
}

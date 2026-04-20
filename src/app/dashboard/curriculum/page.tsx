'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiSave, FiEdit2, FiTrash2, FiPlus, FiX,
    FiCheck, FiSettings, FiGrid, FiSearch, FiDownload,
    FiRefreshCw, FiAlertCircle, FiInfo, FiChevronDown
} from 'react-icons/fi';

type CurriculumType = '8-4-4' | 'CBC';

interface GradeEntry {
    id?: number;
    grade: string;
    min_score: number;
    max_score: number;
    points: number;
    remarks: string;
    curriculum_type: CurriculumType;
}

interface SubjectConfig {
    id: number;
    subject_name: string;
    subject_code: string;
    category: string;
    is_active: boolean;
    curriculum_type?: string;
    is_compulsory?: boolean;
}

export default function CurriculumPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'overview' | 'grading' | 'subjects' | 'settings'>('overview');
    const [activeCurriculum, setActiveCurriculum] = useState<CurriculumType>('8-4-4');

    // Grading
    const [grades844, setGrades844] = useState<GradeEntry[]>([]);
    const [gradesCBC, setGradesCBC] = useState<GradeEntry[]>([]);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
    const [gradeForm, setGradeForm] = useState<GradeEntry>({ grade: '', min_score: 0, max_score: 100, points: 0, remarks: '', curriculum_type: '8-4-4' });

    // Subjects
    const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState<SubjectConfig | null>(null);
    const [subjectForm, setSubjectForm] = useState({ subject_name: '', subject_code: '', category: 'Core', is_active: true, curriculum_type: '8-4-4', is_compulsory: true });
    const [subjectSearch, setSubjectSearch] = useState('');

    // Default CBC rubrics
    const defaultCBCGrades: GradeEntry[] = [
        { grade: 'EE', min_score: 80, max_score: 100, points: 4, remarks: 'Exceeding Expectations', curriculum_type: 'CBC' },
        { grade: 'ME', min_score: 60, max_score: 79, points: 3, remarks: 'Meeting Expectations', curriculum_type: 'CBC' },
        { grade: 'AE', min_score: 40, max_score: 59, points: 2, remarks: 'Approaching Expectations', curriculum_type: 'CBC' },
        { grade: 'BE', min_score: 0, max_score: 39, points: 1, remarks: 'Below Expectations', curriculum_type: 'CBC' },
    ];

    // Default 8-4-4 grades
    const default844Grades: GradeEntry[] = [
        { grade: 'A', min_score: 80, max_score: 100, points: 12, remarks: 'Excellent', curriculum_type: '8-4-4' },
        { grade: 'A-', min_score: 75, max_score: 79, points: 11, remarks: 'Very Good', curriculum_type: '8-4-4' },
        { grade: 'B+', min_score: 70, max_score: 74, points: 10, remarks: 'Good', curriculum_type: '8-4-4' },
        { grade: 'B', min_score: 65, max_score: 69, points: 9, remarks: 'Good', curriculum_type: '8-4-4' },
        { grade: 'B-', min_score: 60, max_score: 64, points: 8, remarks: 'Fairly Good', curriculum_type: '8-4-4' },
        { grade: 'C+', min_score: 55, max_score: 59, points: 7, remarks: 'Average', curriculum_type: '8-4-4' },
        { grade: 'C', min_score: 50, max_score: 54, points: 6, remarks: 'Average', curriculum_type: '8-4-4' },
        { grade: 'C-', min_score: 45, max_score: 49, points: 5, remarks: 'Below Average', curriculum_type: '8-4-4' },
        { grade: 'D+', min_score: 40, max_score: 44, points: 4, remarks: 'Below Average', curriculum_type: '8-4-4' },
        { grade: 'D', min_score: 35, max_score: 39, points: 3, remarks: 'Poor', curriculum_type: '8-4-4' },
        { grade: 'D-', min_score: 30, max_score: 34, points: 2, remarks: 'Very Poor', curriculum_type: '8-4-4' },
        { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor', curriculum_type: '8-4-4' },
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch grading system
            const { data: gradesData } = await supabase.from('school_grading_system').select('*').order('points', { ascending: false });
            const allGrades = gradesData || [];

            // Separate by curriculum type or default to 8-4-4
            setGrades844(allGrades.filter(g => !g.curriculum_type || g.curriculum_type === '8-4-4').map(g => ({ ...g, curriculum_type: '8-4-4' as CurriculumType })));

            // Check if CBC grades exist, otherwise show defaults
            const cbcGrades = allGrades.filter(g => g.curriculum_type === 'CBC');
            setGradesCBC(cbcGrades.length > 0 ? cbcGrades : defaultCBCGrades);

            // Fetch subjects
            const { data: subjectsData } = await supabase.from('school_subjects').select('*').order('subject_name');
            setSubjects(subjectsData || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Save grade
    const handleSaveGrade = async () => {
        if (!gradeForm.grade.trim()) { toast.error('Grade letter is required'); return; }
        setSaving(true);
        try {
            const payload = {
                grade: gradeForm.grade.trim(),
                min_score: gradeForm.min_score,
                max_score: gradeForm.max_score,
                points: gradeForm.points,
                remarks: gradeForm.remarks,
            };

            let error;
            if (editingGrade?.id) {
                ({ error } = await supabase.from('school_grading_system').update(payload).eq('id', editingGrade.id));
            } else {
                ({ error } = await supabase.from('school_grading_system').insert([payload]));
            }
            if (error) throw error;
            toast.success(editingGrade?.id ? 'Grade updated ✅' : 'Grade added ✅');
            setShowGradeModal(false);
            fetchData();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    // Delete grade
    const handleDeleteGrade = async (id: number) => {
        if (!confirm('Delete this grade entry?')) return;
        const { error } = await supabase.from('school_grading_system').delete().eq('id', id);
        if (error) { toast.error('Delete failed'); return; }
        toast.success('Grade deleted');
        fetchData();
    };

    // Save subject
    const handleSaveSubject = async () => {
        if (!subjectForm.subject_name.trim()) { toast.error('Subject name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                subject_name: subjectForm.subject_name.trim(),
                subject_code: subjectForm.subject_code.trim() || null,
                category: subjectForm.category,
                is_active: subjectForm.is_active,
            };

            let error;
            if (editingSubject) {
                ({ error } = await supabase.from('school_subjects').update(payload).eq('id', editingSubject.id));
            } else {
                ({ error } = await supabase.from('school_subjects').insert([payload]));
            }
            if (error) throw error;
            toast.success(editingSubject ? 'Subject updated ✅' : 'Subject added ✅');
            setShowSubjectModal(false);
            setEditingSubject(null);
            fetchData();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const handleDeleteSubject = async (id: number) => {
        if (!confirm('Delete this subject?')) return;
        const { error } = await supabase.from('school_subjects').delete().eq('id', id);
        if (error) { toast.error('Delete failed - subject may be in use'); return; }
        toast.success('Subject deleted');
        fetchData();
    };

    // Seed default 8-4-4 or CBC grades
    const seedDefaultGrades = async (type: CurriculumType) => {
        if (!confirm(`This will add default ${type} grade entries. Continue?`)) return;
        const defaults = type === '8-4-4' ? default844Grades : defaultCBCGrades;
        for (const g of defaults) {
            await supabase.from('school_grading_system').insert([{
                grade: g.grade, min_score: g.min_score, max_score: g.max_score,
                points: g.points, remarks: g.remarks,
            }]);
        }
        toast.success(`Default ${type} grades seeded ✅`);
        fetchData();
    };

    const currentGrades = activeCurriculum === '8-4-4' ? grades844 : gradesCBC;
    const activeSubjects = subjects.filter(s => s.is_active);
    const coreSubjects = activeSubjects.filter(s => s.category === 'Core');
    const electiveSubjects = activeSubjects.filter(s => s.category === 'Elective');
    const technicalSubjects = activeSubjects.filter(s => s.category === 'Technical');

    const filteredSubjects = subjects.filter(s => {
        if (subjectSearch) return s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) || (s.subject_code || '').toLowerCase().includes(subjectSearch.toLowerCase());
        return true;
    });

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Curriculum...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiBookOpen className="text-indigo-500" /> Curriculum & Grading
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Configure 8-4-4 and CBC curriculum grading systems, subjects, and assessment rules</p>
                </div>
            </div>

            {/* Curriculum Switcher */}
            <div className="flex gap-3">
                {[
                    { type: '8-4-4' as CurriculumType, label: '8-4-4 / KCSE', desc: 'Kenyan Secondary Education', color: '#3b82f6', active: activeCurriculum === '8-4-4' },
                    { type: 'CBC' as CurriculumType, label: 'CBC', desc: 'Competency Based Curriculum', color: '#22c55e', active: activeCurriculum === 'CBC' },
                ].map(c => (
                    <button key={c.type} onClick={() => setActiveCurriculum(c.type)}
                        className={`flex-1 sm:flex-none px-6 py-4 rounded-xl border-2 transition-all text-left ${c.active ? 'shadow-lg' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        style={c.active ? { borderColor: c.color, background: c.color + '10' } : {}}>
                        <p className="text-lg font-bold" style={{ color: c.active ? c.color : '#374151' }}>{c.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'overview', label: 'Overview', icon: FiGrid },
                    { key: 'grading', label: 'Grading System', icon: FiBookOpen },
                    { key: 'subjects', label: 'Subjects', icon: FiSettings },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === t.key ? 'bg-white shadow-md text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <p className="text-xs font-semibold opacity-80">ACTIVE CURRICULUM</p>
                            <p className="text-xl font-extrabold mt-1">{activeCurriculum}</p>
                        </div>
                        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                            <p className="text-xs font-semibold opacity-80">TOTAL SUBJECTS</p>
                            <p className="text-xl font-extrabold mt-1">{activeSubjects.length}</p>
                            <p className="text-[10px] opacity-70 mt-1">{subjects.filter(s => !s.is_active).length} inactive</p>
                        </div>
                        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <p className="text-xs font-semibold opacity-80">GRADE LEVELS</p>
                            <p className="text-xl font-extrabold mt-1">{currentGrades.length}</p>
                            <p className="text-[10px] opacity-70 mt-1">{activeCurriculum} grading</p>
                        </div>
                        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <p className="text-xs font-semibold opacity-80">CORE SUBJECTS</p>
                            <p className="text-xl font-extrabold mt-1">{coreSubjects.length}</p>
                            <p className="text-[10px] opacity-70 mt-1">{electiveSubjects.length} electives</p>
                        </div>
                    </div>

                    {/* Curriculum Info Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* 8-4-4 Info */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2"><FiBookOpen /> 8-4-4 / KCSE System</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <p className="text-xs font-bold text-blue-700 mb-2">Grading Scale</p>
                                    <div className="grid grid-cols-4 gap-1">
                                        {grades844.slice(0, 12).map(g => (
                                            <div key={g.grade} className="text-center bg-white rounded px-2 py-1">
                                                <p className="text-sm font-bold text-gray-800">{g.grade}</p>
                                                <p className="text-[10px] text-gray-400">{g.min_score}-{g.max_score}%</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 text-xs text-gray-600">
                                    <div className="flex items-start gap-2"><FiCheck className="text-blue-500 mt-0.5" size={12} /><span>12-point scale (A to E)</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-blue-500 mt-0.5" size={12} /><span>Mean grade calculated from best 7 subjects</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-blue-500 mt-0.5" size={12} /><span>Strict percentage-based grading thresholds</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-blue-500 mt-0.5" size={12} /><span>Subject clusters: Sciences, Humanities, Languages, Technical</span></div>
                                </div>
                            </div>
                        </div>

                        {/* CBC Info */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                                <h3 className="font-bold text-green-800 text-sm flex items-center gap-2"><FiBookOpen /> CBC System</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                    <p className="text-xs font-bold text-green-700 mb-2">Rubric Levels</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {defaultCBCGrades.map(g => (
                                            <div key={g.grade} className="flex items-center gap-2 bg-white rounded-lg p-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ background: g.grade === 'EE' ? '#22c55e' : g.grade === 'ME' ? '#3b82f6' : g.grade === 'AE' ? '#f59e0b' : '#ef4444' }}>
                                                    {g.grade}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">{g.remarks}</p>
                                                    <p className="text-[10px] text-gray-400">{g.min_score}-{g.max_score}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 text-xs text-gray-600">
                                    <div className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={12} /><span>4-level rubric assessment (EE, ME, AE, BE)</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={12} /><span>Competency-based evaluation over grade rankings</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={12} /><span>Formative and summative assessments</span></div>
                                    <div className="flex items-start gap-2"><FiCheck className="text-green-500 mt-0.5" size={12} /><span>Learning areas: Literacy, Numeracy, Science, Social Studies</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Tab */}
            {tab === 'grading' && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><FiBookOpen className="text-indigo-500" /> {activeCurriculum} Grading Scale</h3>
                        <div className="flex gap-2">
                            <button onClick={() => seedDefaultGrades(activeCurriculum)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-1">
                                <FiRefreshCw size={12} /> Reset Defaults
                            </button>
                            <button onClick={() => {
                                setEditingGrade(null);
                                setGradeForm({ grade: '', min_score: 0, max_score: 100, points: 0, remarks: '', curriculum_type: activeCurriculum });
                                setShowGradeModal(true);
                            }}
                                className="px-4 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1 shadow-md"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <FiPlus size={12} /> Add Grade
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Grade</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Min Score</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Max Score</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Points</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Remarks</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Visual</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentGrades.map((g, i) => {
                                    const pct = g.points / (activeCurriculum === '8-4-4' ? 12 : 4) * 100;
                                    return (
                                        <tr key={g.id || i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white font-bold text-sm"
                                                    style={{ background: pct >= 75 ? '#22c55e' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444' }}>
                                                    {g.grade}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{g.min_score}%</td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{g.max_score}%</td>
                                            <td className="px-4 py-3 text-center"><span className="badge badge-purple font-bold">{g.points}</span></td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{g.remarks}</td>
                                            <td className="px-4 py-3">
                                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 75 ? '#22c55e' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {g.id && (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => { setEditingGrade(g); setGradeForm(g); setShowGradeModal(true); }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><FiEdit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteGrade(g.id!)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><FiTrash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Subjects Tab */}
            {tab === 'subjects' && (
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 relative max-w-md">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" placeholder="Search subjects..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none" />
                        </div>
                        <button onClick={() => { setEditingSubject(null); setSubjectForm({ subject_name: '', subject_code: '', category: 'Core', is_active: true, curriculum_type: activeCurriculum, is_compulsory: true }); setShowSubjectModal(true); }}
                            className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiPlus size={14} /> Add Subject
                        </button>
                    </div>

                    {/* Subject Categories */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Core Subjects</p>
                            <p className="text-2xl font-extrabold text-blue-800">{coreSubjects.length}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-purple-700 uppercase mb-1">Elective Subjects</p>
                            <p className="text-2xl font-extrabold text-purple-800">{electiveSubjects.length}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Technical Subjects</p>
                            <p className="text-2xl font-extrabold text-amber-800">{technicalSubjects.length}</p>
                        </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubjects.map((s, i) => (
                                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{s.subject_name}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-indigo-600">{s.subject_code || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`badge ${s.category === 'Core' ? 'badge-blue' : s.category === 'Elective' ? 'badge-purple' : 'badge-warning'}`}>{s.category}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => {
                                                    setEditingSubject(s);
                                                    setSubjectForm({ subject_name: s.subject_name, subject_code: s.subject_code || '', category: s.category, is_active: s.is_active, curriculum_type: '8-4-4', is_compulsory: true });
                                                    setShowSubjectModal(true);
                                                }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><FiEdit2 size={14} /></button>
                                                <button onClick={() => handleDeleteSubject(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><FiTrash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Grade Modal */}
            {showGradeModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGradeModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <h2 className="text-lg font-bold text-white">{editingGrade ? 'Edit Grade' : 'Add Grade'}</h2>
                            <button onClick={() => setShowGradeModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Grade *</label><input type="text" value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} className={inputCls} placeholder="e.g. A, B+, EE" /></div>
                                <div><label className={labelCls}>Points</label><input type="number" value={gradeForm.points} onChange={e => setGradeForm({ ...gradeForm, points: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className={labelCls}>Min Score (%)</label><input type="number" value={gradeForm.min_score} onChange={e => setGradeForm({ ...gradeForm, min_score: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className={labelCls}>Max Score (%)</label><input type="number" value={gradeForm.max_score} onChange={e => setGradeForm({ ...gradeForm, max_score: Number(e.target.value) })} className={inputCls} /></div>
                            </div>
                            <div><label className={labelCls}>Remarks</label><input type="text" value={gradeForm.remarks} onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })} className={inputCls} placeholder="e.g. Excellent, Good" /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowGradeModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveGrade} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <FiSave size={14} /> {editingGrade ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Modal */}
            {showSubjectModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSubjectModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <h2 className="text-lg font-bold text-white">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
                            <button onClick={() => setShowSubjectModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Subject Name *</label><input type="text" value={subjectForm.subject_name} onChange={e => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} className={inputCls} placeholder="e.g. Mathematics" /></div>
                            <div><label className={labelCls}>Subject Code</label><input type="text" value={subjectForm.subject_code} onChange={e => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} className={inputCls} placeholder="e.g. MATH" /></div>
                            <div><label className={labelCls}>Category</label>
                                <select value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })} className={inputCls}>
                                    <option value="Core">Core</option><option value="Elective">Elective</option><option value="Technical">Technical</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={subjectForm.is_active} onChange={e => setSubjectForm({ ...subjectForm, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowSubjectModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveSubject} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <FiSave size={14} /> {editingSubject ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

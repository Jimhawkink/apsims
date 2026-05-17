'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSettings,
    FiCalendar, FiLock, FiUnlock, FiCheckCircle, FiClock,
    FiAlertCircle, FiBook, FiTarget, FiAward, FiSliders,
    FiRefreshCw, FiFilter, FiInfo
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

type CurriculumMode = '8-4-4' | 'CBC';
type CBCAssessmentCategory = 'Formative' | 'Summative' | 'SBA' | 'National';
type CBCRubricLevel = 'EE' | 'ME' | 'AE' | 'BE';

interface ExamType844 {
    id?: number;
    exam_name: string;
    exam_code: string;
    weight: number;
    term_id: number | null;
    year: number;
    description: string;
    is_active: boolean;
    max_score: number;
    is_combined: boolean;
}

interface CBCAssessmentForm {
    // maps to cbc_assessments table
    student_id: number | null;
    subject_id: number | null;
    term_id: number | null;
    assessment_type: 'Formative' | 'Summative';
    task_name: string;
    rubric_level: CBCRubricLevel;
    teacher_id: number | null;
    notes: string;
    raw_score: number | string;
}

interface CBCTaskTemplate {
    task_name: string;
    assessment_type: 'Formative' | 'Summative';
    category: CBCAssessmentCategory;
    description: string;
    icon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RUBRIC_CONFIG: Record<CBCRubricLevel, { label: string; color: string; bg: string; description: string; range: string }> = {
    EE: { label: 'Exceeds Expectations', color: '#059669', bg: '#ecfdf5', description: 'Outstanding performance beyond grade level', range: '80–100' },
    ME: { label: 'Meets Expectations', color: '#2563eb', bg: '#eff6ff', description: 'Achieves the required competency level', range: '60–79' },
    AE: { label: 'Approaching Expectations', color: '#d97706', bg: '#fffbeb', description: 'Developing towards the competency', range: '40–59' },
    BE: { label: 'Below Expectations', color: '#dc2626', bg: '#fef2f2', description: 'Requires targeted intervention support', range: '0–39' },
};

const CBC_TASK_TEMPLATES: CBCTaskTemplate[] = [
    { task_name: 'Written Test', assessment_type: 'Formative', category: 'Formative', description: 'Short classroom written assessment', icon: '✏️' },
    { task_name: 'Oral Questioning', assessment_type: 'Formative', category: 'Formative', description: 'Teacher-led oral question session', icon: '🗣️' },
    { task_name: 'Project Work', assessment_type: 'Formative', category: 'SBA', description: 'KNEC project-based assessment', icon: '🔬' },
    { task_name: 'Practical Task', assessment_type: 'Formative', category: 'SBA', description: 'Hands-on skill demonstration', icon: '🛠️' },
    { task_name: 'Portfolio Review', assessment_type: 'Formative', category: 'Formative', description: 'Student portfolio evidence collection', icon: '📁' },
    { task_name: 'Performance Task', assessment_type: 'Summative', category: 'SBA', description: 'KNEC standardised performance task', icon: '🎯' },
    { task_name: 'End-Term Assessment', assessment_type: 'Summative', category: 'Summative', description: 'End of term summative evaluation', icon: '📝' },
    { task_name: 'KNEC SBA Tool', assessment_type: 'Summative', category: 'SBA', description: 'Official KNEC CBA portal assessment', icon: '🏛️' },
];

const TEMPLATES_844 = [
    { name: 'CAT 1', code: 'CAT1', weight: 10, desc: 'Continuous Assessment Test 1', max_score: 30 },
    { name: 'CAT 2', code: 'CAT2', weight: 10, desc: 'Continuous Assessment Test 2', max_score: 30 },
    { name: 'Mid-Term', code: 'MID', weight: 20, desc: 'Mid-Term Examination', max_score: 100 },
    { name: 'End-Term', code: 'END', weight: 60, desc: 'End of Term Examination', max_score: 100 },
    { name: 'Mock', code: 'MOCK', weight: 100, desc: 'Mock Examination', max_score: 100 },
    { name: 'KCSE Trial', code: 'TRIAL', weight: 100, desc: 'KCSE Trial Examination', max_score: 100 },
];

const CATEGORY_COLORS: Record<CBCAssessmentCategory, string> = {
    Formative: '#6366f1',
    Summative: '#0ea5e9',
    SBA: '#8b5cf6',
    National: '#dc2626',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamManagerPage() {
    const [mode, setMode] = useState<CurriculumMode>('8-4-4');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Shared data
    const [terms, setTerms] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    // 8-4-4 state
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [marks844, setMarks844] = useState<any[]>([]);
    const [show844Modal, setShow844Modal] = useState(false);
    const [editing844, setEditing844] = useState<any>(null);
    const [form844, setForm844] = useState<ExamType844>({
        exam_name: '', exam_code: '', weight: 0, term_id: null,
        year: new Date().getFullYear(), description: '', is_active: true,
        max_score: 100, is_combined: false,
    });
    const [tab844, setTab844] = useState<'all' | 'active'>('all');

    // CBC state
    const [cbcAssessments, setCbcAssessments] = useState<any[]>([]);
    const [cbcSummaries, setCbcSummaries] = useState<any[]>([]);
    const [cbcInterventions, setCbcInterventions] = useState<any[]>([]);
    const [showCBCModal, setShowCBCModal] = useState(false);
    const [cbcForm, setCbcForm] = useState<CBCAssessmentForm>({
        student_id: null, subject_id: null, term_id: null,
        assessment_type: 'Formative', task_name: '', rubric_level: 'ME',
        teacher_id: null, notes: '', raw_score: '',
    });
    const [cbcTab, setCbcTab] = useState<'overview' | 'assessments' | 'interventions'>('overview');
    const [cbcFilter, setCbcFilter] = useState<'All' | 'Formative' | 'Summative'>('All');

    // ─── Data Fetching ─────────────────────────────────────────────────────────

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [etRes, termRes, mRes, cbcRes, summRes, intRes, subRes, teachRes] = await Promise.all([
                supabase.from('school_exam_types').select('*').order('id', { ascending: false }),
                supabase.from('school_terms').select('*').order('id', { ascending: false }),
                supabase.from('school_exam_marks').select('id, exam_type'),
                supabase.from('cbc_assessments').select('*, school_subjects(subject_name), school_terms(term_name), school_teachers(first_name, last_name)').order('assessed_at', { ascending: false }).limit(200),
                supabase.from('cbc_competency_summaries').select('*, school_subjects(subject_name), school_terms(term_name)').order('id', { ascending: false }).limit(100),
                supabase.from('cbc_intervention_flags').select('*, school_subjects(subject_name), school_terms(term_name)').eq('status', 'open').order('created_at', { ascending: false }),
                supabase.from('school_subjects').select('id, subject_name').eq('is_active', true).order('subject_name'),
                supabase.from('school_teachers').select('id, first_name, last_name').eq('status', 'Active').order('first_name'),
            ]);
            setExamTypes(etRes.data || []);
            setTerms(termRes.data || []);
            setMarks844(mRes.data || []);
            setCbcAssessments(cbcRes.data || []);
            setCbcSummaries(summRes.data || []);
            setCbcInterventions(intRes.data || []);
            setSubjects(subRes.data || []);
            setTeachers(teachRes.data || []);
        } catch (e: any) {
            toast.error('Failed to load data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── 8-4-4 Handlers ────────────────────────────────────────────────────────

    const handle844Save = async () => {
        if (!form844.exam_name.trim()) { toast.error('Exam name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                exam_name: form844.exam_name.trim(),
                exam_code: form844.exam_code.trim() || null,
                weight: form844.weight || 0,
                term_id: form844.term_id || null,
                year: form844.year || new Date().getFullYear(),
                description: form844.description || null,
                is_active: form844.is_active,
                max_score: form844.max_score || 100,
                is_combined: form844.is_combined,
            };
            let error;
            if (editing844?.id) {
                ({ error } = await supabase.from('school_exam_types').update(payload).eq('id', editing844.id));
            } else {
                ({ error } = await supabase.from('school_exam_types').insert([payload]));
            }
            if (error) throw error;
            toast.success(editing844 ? 'Exam type updated ✅' : 'Exam type created ✅');
            setShow844Modal(false);
            setEditing844(null);
            fetchAll();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const handle844Delete = async (id: number) => {
        if (!confirm('Delete this exam type? Cannot be undone.')) return;
        const { error } = await supabase.from('school_exam_types').delete().eq('id', id);
        if (error) { toast.error('Delete failed — exam may have marks linked'); return; }
        toast.success('Exam type deleted');
        fetchAll();
    };

    const handle844ToggleActive = async (exam: any) => {
        const { error } = await supabase.from('school_exam_types').update({ is_active: !exam.is_active }).eq('id', exam.id);
        if (error) { toast.error('Failed to update'); return; }
        toast.success(exam.is_active ? 'Exam deactivated' : 'Exam activated');
        fetchAll();
    };

    const open844Create = (template?: typeof TEMPLATES_844[0]) => {
        setEditing844(null);
        const currentTerm = terms.find(t => t.is_current);
        setForm844({
            exam_name: template?.name || '',
            exam_code: template?.code || '',
            weight: template?.weight || 0,
            term_id: currentTerm?.id || null,
            year: new Date().getFullYear(),
            description: template?.desc || '',
            is_active: true,
            max_score: template?.max_score || 100,
            is_combined: false,
        });
        setShow844Modal(true);
    };

    const open844Edit = (exam: any) => {
        setEditing844(exam);
        setForm844({
            exam_name: exam.exam_name,
            exam_code: exam.exam_code || '',
            weight: exam.weight || 0,
            term_id: exam.term_id,
            year: exam.year || new Date().getFullYear(),
            description: exam.description || '',
            is_active: exam.is_active,
            max_score: exam.max_score || 100,
            is_combined: exam.is_combined || false,
        });
        setShow844Modal(true);
    };

    // ─── CBC Handlers ──────────────────────────────────────────────────────────

    const handleCBCSave = async () => {
        if (!cbcForm.subject_id) { toast.error('Subject is required'); return; }
        if (!cbcForm.term_id) { toast.error('Term is required'); return; }
        if (!cbcForm.task_name.trim()) { toast.error('Task name is required'); return; }
        setSaving(true);
        try {
            // Determine rubric_level from raw_score if score provided
            let finalLevel: CBCRubricLevel = cbcForm.rubric_level;
            if (cbcForm.raw_score !== '' && cbcForm.raw_score !== null) {
                const score = Number(cbcForm.raw_score);
                if (score >= 80) finalLevel = 'EE';
                else if (score >= 60) finalLevel = 'ME';
                else if (score >= 40) finalLevel = 'AE';
                else finalLevel = 'BE';
            }

            const payload: any = {
                subject_id: cbcForm.subject_id,
                term_id: cbcForm.term_id,
                assessment_type: cbcForm.assessment_type,
                task_name: cbcForm.task_name.trim(),
                rubric_level: finalLevel,
                notes: cbcForm.notes || null,
                assessed_at: new Date().toISOString(),
            };
            if (cbcForm.student_id) payload.student_id = cbcForm.student_id;
            if (cbcForm.teacher_id) payload.teacher_id = cbcForm.teacher_id;
            if (cbcForm.raw_score !== '' && cbcForm.raw_score !== null) {
                payload.raw_score = Number(cbcForm.raw_score);
            }

            const { error } = await supabase.from('cbc_assessments').insert([payload]);
            if (error) throw error;

            // Auto-flag BE level for intervention
            if (finalLevel === 'BE' && cbcForm.student_id) {
                await supabase.from('cbc_intervention_flags').insert([{
                    student_id: cbcForm.student_id,
                    subject_id: cbcForm.subject_id,
                    term_id: cbcForm.term_id,
                    rubric_level_at_flag: 'BE',
                    raw_score_at_flag: cbcForm.raw_score !== '' ? Number(cbcForm.raw_score) : null,
                    flag_reason: `Auto-flagged: Below Expectation on ${cbcForm.task_name}`,
                    intervention_type: 'academic_support',
                    status: 'open',
                }]);
                toast.error('⚠️ Assessment saved & student auto-flagged for intervention');
            } else {
                toast.success(`CBC assessment saved — Level: ${finalLevel} ✅`);
            }

            // Update competency summary if student provided
            if (cbcForm.student_id) {
                try {
                    await supabase.rpc('update_cbc_competency_summary', {
                        p_student_id: cbcForm.student_id,
                        p_subject_id: cbcForm.subject_id,
                        p_term_id: cbcForm.term_id,
                    });
                } catch { /* non-critical */ }
            }

            setShowCBCModal(false);
            fetchAll();
        } catch (e: any) { toast.error(e.message || 'Failed to save CBC assessment'); }
        setSaving(false);
    };

    const handleResolveIntervention = async (id: number) => {
        const { error } = await supabase.from('cbc_intervention_flags').update({
            status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: 'Resolved via dashboard'
        }).eq('id', id);
        if (error) { toast.error('Failed to update'); return; }
        toast.success('Intervention marked as resolved ✅');
        fetchAll();
    };

    // ─── Helpers ───────────────────────────────────────────────────────────────

    const getTermName = (id: number) => {
        const t = terms.find(t => t.id === id);
        return t ? `${t.term_name} ${t.academic_year || t.year || ''}` : '-';
    };
    const getMarkCount844 = (name: string) => marks844.filter(m => m.exam_type === name).length;
    const filtered844 = tab844 === 'active' ? examTypes.filter(e => e.is_active) : examTypes;
    const totalWeight = examTypes.filter(e => e.is_active).reduce((a, e) => a + (e.weight || 0), 0);

    const filteredCBC = cbcFilter === 'All'
        ? cbcAssessments
        : cbcAssessments.filter(a => a.assessment_type === cbcFilter);

    const cbcStats = {
        total: cbcAssessments.length,
        EE: cbcAssessments.filter(a => a.rubric_level === 'EE').length,
        ME: cbcAssessments.filter(a => a.rubric_level === 'ME').length,
        AE: cbcAssessments.filter(a => a.rubric_level === 'AE').length,
        BE: cbcAssessments.filter(a => a.rubric_level === 'BE').length,
        openInterventions: cbcInterventions.length,
    };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    // ─── Loading ───────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
                <p className="text-gray-400 text-sm font-medium">Loading Assessment Manager...</p>
            </div>
        </div>
    );

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-fade-in max-w-7xl mx-auto">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <FiSettings className="text-indigo-500" />
                        Assessment Manager
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage <strong>8-4-4</strong> exam types & <strong>CBC</strong> competency assessments in one place
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="Refresh">
                        <FiRefreshCw size={16} />
                    </button>
                    {mode === '8-4-4' && (
                        <button onClick={() => open844Create()}
                            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <FiPlus size={16} /> New Exam Type
                        </button>
                    )}
                    {mode === 'CBC' && (
                        <button onClick={() => { setCbcForm({ student_id: null, subject_id: null, term_id: terms.find(t => t.is_current)?.id || null, assessment_type: 'Formative', task_name: '', rubric_level: 'ME', teacher_id: null, notes: '', raw_score: '' }); setShowCBCModal(true); }}
                            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                            <FiPlus size={16} /> Record Assessment
                        </button>
                    )}
                </div>
            </div>

            {/* ── Mode Toggle ── */}
            <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit">
                {(['8-4-4', 'CBC'] as CurriculumMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? 'bg-white shadow-md text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                        {m === '8-4-4' ? '📋 8-4-4 System' : '🌱 CBC System'}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ══  8-4-4 MODE  ════════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════ */}

            {mode === '8-4-4' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Exam Types', value: examTypes.length, color: 'text-gray-800' },
                            { label: 'Active', value: examTypes.filter(e => e.is_active).length, color: 'text-green-600' },
                            { label: 'Total Weight', value: `${totalWeight}%`, color: totalWeight === 100 ? 'text-green-600' : 'text-amber-600', sub: totalWeight !== 100 ? 'Should equal 100%' : undefined },
                            { label: 'Marks Entered', value: marks844.length, color: 'text-blue-600' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
                                <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                                {s.sub && <p className="text-[10px] text-amber-500 mt-0.5">{s.sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Quick Templates */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">⚡ Quick Create from Template</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {TEMPLATES_844.map(t => (
                                <button key={t.code} onClick={() => open844Create(t)}
                                    className="border border-gray-200 rounded-xl p-3 text-left hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">{t.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] font-bold text-indigo-500 font-mono">{t.code}</span>
                                        <span className="text-[10px] text-gray-400">{t.weight}%</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                        {[
                            { key: 'all', label: `All (${examTypes.length})` },
                            { key: 'active', label: `Active (${examTypes.filter(e => e.is_active).length})` },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab844(t.key as any)}
                                className={`py-2 px-5 rounded-lg text-sm font-semibold transition-all ${tab844 === t.key ? 'bg-white shadow-md text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    {filtered844.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">📋</span>
                            <p className="font-semibold text-lg">No exam types found</p>
                            <p className="text-sm mt-1">Use templates above or click "New Exam Type"</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(to right, #eef2ff, #f5f3ff)' }}>
                                            {['#', 'Exam Name', 'Code', 'Weight', 'Max Score', 'Term', 'Year', 'Marks', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide border-b-2 border-gray-200">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered844.map((exam, i) => {
                                            const markCount = getMarkCount844(exam.exam_name);
                                            const colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
                                            return (
                                                <tr key={exam.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!exam.is_active ? 'opacity-50' : ''}`}>
                                                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-8 rounded-full" style={{ background: colors[i % colors.length] }} />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">{exam.exam_name}</p>
                                                                {exam.description && <p className="text-[10px] text-gray-400">{exam.description}</p>}
                                                                {exam.is_combined && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">COMBINED</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold font-mono">{exam.exam_code || '-'}</span></td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-extrabold text-gray-800">{exam.weight || 0}%</span>
                                                            <div className="w-10 h-1.5 bg-gray-100 rounded-full mt-1">
                                                                <div className="h-full rounded-full" style={{ width: `${Math.min(exam.weight, 100)}%`, background: colors[i % colors.length] }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-600">{exam.max_score || 100}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{exam.term_id ? getTermName(exam.term_id) : '-'}</td>
                                                    <td className="px-4 py-3 text-center text-sm text-gray-600">{exam.year}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-sm font-bold ${markCount > 0 ? 'text-green-600' : 'text-gray-300'}`}>{markCount}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                            {exam.is_active ? <><FiCheckCircle size={10} />Active</> : <><FiAlertCircle size={10} />Inactive</>}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => open844Edit(exam)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Edit"><FiEdit2 size={14} /></button>
                                                            <button onClick={() => handle844ToggleActive(exam)} className={`p-1.5 rounded-md transition-all ${exam.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                                                title={exam.is_active ? 'Deactivate' : 'Activate'}>
                                                                {exam.is_active ? <FiLock size={14} /> : <FiUnlock size={14} />}
                                                            </button>
                                                            <button onClick={() => handle844Delete(exam.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete"><FiTrash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                                <span>{filtered844.length} exam types</span>
                                <span className={`font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                    Total Weight: {totalWeight}% {totalWeight === 100 ? '✅' : '⚠️'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Weight Distribution Bar */}
                    {examTypes.filter(e => e.is_active && e.weight > 0).length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Weight Distribution</p>
                            <div className="flex rounded-xl overflow-hidden h-8">
                                {examTypes.filter(e => e.is_active && e.weight > 0).map((e, i) => {
                                    const colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
                                    return (
                                        <div key={e.id} className="flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-80"
                                            style={{ width: `${(e.weight / Math.max(totalWeight, 1)) * 100}%`, background: colors[i % colors.length], minWidth: '20px' }}
                                            title={`${e.exam_name}: ${e.weight}%`}>
                                            {e.weight >= 10 && `${e.exam_code || e.exam_name.substring(0, 4)} ${e.weight}%`}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-3">
                                {examTypes.filter(e => e.is_active && e.weight > 0).map((e, i) => {
                                    const colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
                                    return (
                                        <div key={e.id} className="flex items-center gap-1.5 text-xs">
                                            <span className="w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
                                            <span className="font-semibold text-gray-700">{e.exam_name}</span>
                                            <span className="text-gray-400">({e.weight}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ══  CBC MODE  ══════════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════ */}

            {mode === 'CBC' && (
                <>
                    {/* CBC Info Banner */}
                    <div className="rounded-2xl border border-blue-200 p-4 flex gap-3" style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)' }}>
                        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                        <div className="text-sm text-blue-800">
                            <p className="font-bold mb-1">CBC Competency-Based Assessment</p>
                            <p className="text-blue-700 leading-relaxed">
                                CBC uses <strong>4 rubric levels</strong> (EE/ME/AE/BE) instead of percentage marks.
                                Assessments are <strong>Formative</strong> (continuous) or <strong>Summative</strong> (term-end).
                                SBA scores upload to the <strong>KNEC CBA Portal</strong> and contribute to Grade 10 placement.
                            </p>
                        </div>
                    </div>

                    {/* CBC Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                        <div className="col-span-2 sm:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total Assessments</p>
                            <p className="text-3xl font-extrabold text-gray-800 mt-1">{cbcStats.total}</p>
                        </div>
                        {(['EE', 'ME', 'AE', 'BE'] as CBCRubricLevel[]).map(level => (
                            <div key={level} className="bg-white rounded-xl border-2 p-4" style={{ borderColor: RUBRIC_CONFIG[level].color + '40', background: RUBRIC_CONFIG[level].bg }}>
                                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: RUBRIC_CONFIG[level].color }}>{level}</p>
                                <p className="text-2xl font-extrabold mt-1" style={{ color: RUBRIC_CONFIG[level].color }}>{cbcStats[level]}</p>
                                <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{RUBRIC_CONFIG[level].label.split(' ').slice(0, 2).join(' ')}</p>
                            </div>
                        ))}
                    </div>

                    {/* Intervention alert */}
                    {cbcStats.openInterventions > 0 && (
                        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                    <FiAlertCircle className="text-red-600" size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-red-800">{cbcStats.openInterventions} open intervention{cbcStats.openInterventions !== 1 ? 's' : ''} flagged</p>
                                    <p className="text-sm text-red-600">Students scored Below Expectations and need academic support</p>
                                </div>
                            </div>
                            <button onClick={() => setCbcTab('interventions')} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all">
                                View →
                            </button>
                        </div>
                    )}

                    {/* Rubric Reference Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📊 Rubric Performance Levels</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(Object.entries(RUBRIC_CONFIG) as [CBCRubricLevel, typeof RUBRIC_CONFIG.EE][]).map(([level, cfg]) => (
                                <div key={level} className="rounded-xl p-3 border-2" style={{ borderColor: cfg.color + '30', background: cfg.bg }}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-lg font-extrabold" style={{ color: cfg.color }}>{level}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>{cfg.range}</span>
                                    </div>
                                    <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">{cfg.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Templates */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">⚡ Quick Record from Task Template</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {CBC_TASK_TEMPLATES.map(t => (
                                <button key={t.task_name} onClick={() => {
                                    setCbcForm(prev => ({
                                        ...prev,
                                        task_name: t.task_name,
                                        assessment_type: t.assessment_type,
                                        term_id: terms.find(t => t.is_current)?.id || null,
                                    }));
                                    setShowCBCModal(true);
                                }} className="border border-gray-200 rounded-xl p-3 text-left hover:shadow-md transition-all group hover:border-blue-300 hover:bg-blue-50/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-lg">{t.icon}</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: CATEGORY_COLORS[t.category] }}>{t.category}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">{t.task_name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CBC Tabs */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {[
                            { key: 'overview', label: `📈 Overview (${cbcSummaries.length})` },
                            { key: 'assessments', label: `📝 Assessments (${cbcAssessments.length})` },
                            { key: 'interventions', label: `🚨 Interventions (${cbcInterventions.length})` },
                        ].map(t => (
                            <button key={t.key} onClick={() => setCbcTab(t.key as any)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${cbcTab === t.key ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── CBC Overview tab ── */}
                    {cbcTab === 'overview' && (
                        cbcSummaries.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                                <span className="text-5xl block mb-3">📊</span>
                                <p className="font-semibold">No competency summaries yet</p>
                                <p className="text-sm mt-1">Record assessments and summaries will auto-generate</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr style={{ background: 'linear-gradient(to right, #eff6ff, #f5f3ff)' }}>
                                                {['Subject', 'Term', 'Formative', 'Summative', 'Overall Level', 'Count'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide border-b-2 border-gray-200">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cbcSummaries.map(s => (
                                                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{s.school_subjects?.subject_name || `Subject #${s.subject_id}`}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{s.school_terms?.term_name || '-'}</td>
                                                    {(['formative_level', 'summative_level'] as const).map(f => (
                                                        <td key={f} className="px-4 py-3">
                                                            {s[f] ? (
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: RUBRIC_CONFIG[s[f] as CBCRubricLevel]?.color || '#6b7280' }}>
                                                                    {s[f]}
                                                                </span>
                                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3">
                                                        {s.overall_level ? (
                                                            <span className="px-3 py-1.5 rounded-xl text-sm font-extrabold border-2" style={{ color: RUBRIC_CONFIG[s.overall_level as CBCRubricLevel]?.color, borderColor: RUBRIC_CONFIG[s.overall_level as CBCRubricLevel]?.color + '50', background: RUBRIC_CONFIG[s.overall_level as CBCRubricLevel]?.bg }}>
                                                                {s.overall_level} — {RUBRIC_CONFIG[s.overall_level as CBCRubricLevel]?.label}
                                                            </span>
                                                        ) : <span className="text-gray-300 text-sm">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 font-semibold">{s.formative_count || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* ── CBC Assessments tab ── */}
                    {cbcTab === 'assessments' && (
                        <>
                            <div className="flex gap-2 items-center">
                                <FiFilter size={14} className="text-gray-400" />
                                {(['All', 'Formative', 'Summative'] as const).map(f => (
                                    <button key={f} onClick={() => setCbcFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${cbcFilter === f ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {filteredCBC.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                                    <span className="text-5xl block mb-3">📝</span>
                                    <p className="font-semibold">No assessments recorded yet</p>
                                    <p className="text-sm mt-1">Use the templates above or "Record Assessment" button</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr style={{ background: 'linear-gradient(to right, #eff6ff, #f5f3ff)' }}>
                                                    {['Task', 'Subject', 'Term', 'Type', 'Rubric Level', 'Score', 'Date'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide border-b-2 border-gray-200">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCBC.map(a => (
                                                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm font-bold text-gray-800">{a.task_name || '—'}</p>
                                                            {a.notes && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate">{a.notes}</p>}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{a.school_subjects?.subject_name || `#${a.subject_id}`}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">{a.school_terms?.term_name || '—'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: a.assessment_type === 'Formative' ? '#eff6ff' : '#f5f3ff', color: a.assessment_type === 'Formative' ? '#2563eb' : '#7c3aed' }}>
                                                                {a.assessment_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {a.rubric_level ? (
                                                                <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: RUBRIC_CONFIG[a.rubric_level as CBCRubricLevel]?.color || '#6b7280' }}>
                                                                    {a.rubric_level}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                                                            {a.raw_score !== null && a.raw_score !== undefined ? `${a.raw_score}%` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-400">
                                                            {a.assessed_at ? new Date(a.assessed_at).toLocaleDateString('en-KE') : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-400">
                                        {filteredCBC.length} assessment{filteredCBC.length !== 1 ? 's' : ''} shown
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CBC Interventions tab ── */}
                    {cbcTab === 'interventions' && (
                        cbcInterventions.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                                <span className="text-5xl block mb-3">✅</span>
                                <p className="font-semibold text-green-600">No open interventions</p>
                                <p className="text-sm mt-1">All students are at expected performance levels</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cbcInterventions.map(flag => (
                                    <div key={flag.id} className="bg-white rounded-xl border-2 border-red-100 p-5 flex items-start justify-between gap-4">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <FiAlertCircle className="text-red-600" size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-red-600">BE</span>
                                                    <p className="text-sm font-bold text-gray-800">Student #{flag.student_id}</p>
                                                    <span className="text-xs text-gray-400">·</span>
                                                    <p className="text-xs text-gray-500">{flag.school_subjects?.subject_name || `Subject #${flag.subject_id}`}</p>
                                                </div>
                                                <p className="text-sm text-gray-600">{flag.flag_reason}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700">{flag.intervention_type?.replace(/_/g, ' ').toUpperCase()}</span>
                                                    {flag.raw_score_at_flag !== null && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600">Score: {flag.raw_score_at_flag}%</span>}
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600">{flag.school_terms?.term_name || `Term #${flag.term_id}`}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleResolveIntervention(flag.id)}
                                            className="px-4 py-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all flex-shrink-0">
                                            <FiCheckCircle size={12} className="inline mr-1" />
                                            Resolve
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ══  8-4-4 MODAL  ═══════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════ */}

            {show844Modal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShow844Modal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">{editing844 ? 'Edit Exam Type' : 'Create Exam Type'}</h2>
                                <p className="text-xs text-indigo-200 mt-0.5">8-4-4 system — marks-based assessment</p>
                            </div>
                            <button onClick={() => setShow844Modal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Exam Name *</label>
                                    <input type="text" value={form844.exam_name} onChange={e => setForm844({ ...form844, exam_name: e.target.value })} className={inputCls} placeholder="e.g. CAT 1" />
                                </div>
                                <div>
                                    <label className={labelCls}>Code</label>
                                    <input type="text" value={form844.exam_code} onChange={e => setForm844({ ...form844, exam_code: e.target.value })} className={inputCls} placeholder="e.g. CAT1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>Weight (%)</label>
                                    <input type="number" value={form844.weight} onChange={e => setForm844({ ...form844, weight: Number(e.target.value) })} className={inputCls} min="0" max="100" />
                                </div>
                                <div>
                                    <label className={labelCls}>Max Score</label>
                                    <input type="number" value={form844.max_score} onChange={e => setForm844({ ...form844, max_score: Number(e.target.value) })} className={inputCls} min="1" />
                                </div>
                                <div>
                                    <label className={labelCls}>Year</label>
                                    <input type="number" value={form844.year} onChange={e => setForm844({ ...form844, year: Number(e.target.value) })} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Term</label>
                                <select value={form844.term_id || ''} onChange={e => setForm844({ ...form844, term_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                                    <option value="">Select Term</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Description</label>
                                <textarea value={form844.description} onChange={e => setForm844({ ...form844, description: e.target.value })} className={inputCls} rows={2} placeholder="Optional description" />
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form844.is_active} onChange={e => setForm844({ ...form844, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form844.is_combined} onChange={e => setForm844({ ...form844, is_combined: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Combined exam</span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShow844Modal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button onClick={handle844Save} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <FiSave size={14} /> {editing844 ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ══  CBC ASSESSMENT MODAL  ══════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════ */}

            {showCBCModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCBCModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Record CBC Assessment</h2>
                                <p className="text-xs text-blue-200 mt-0.5">Competency-Based — saves to cbc_assessments table</p>
                            </div>
                            <button onClick={() => setShowCBCModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">

                            {/* Assessment Type Toggle */}
                            <div>
                                <label className={labelCls}>Assessment Type</label>
                                <div className="flex gap-2">
                                    {(['Formative', 'Summative'] as const).map(t => (
                                        <button key={t} onClick={() => setCbcForm({ ...cbcForm, assessment_type: t })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${cbcForm.assessment_type === t ? 'text-white border-transparent shadow-md' : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'}`}
                                            style={cbcForm.assessment_type === t ? { background: t === 'Formative' ? '#2563eb' : '#7c3aed' } : {}}>
                                            {t === 'Formative' ? '📚 Formative (CA)' : '📝 Summative (SBA)'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                    {cbcForm.assessment_type === 'Formative'
                                        ? 'Continuous classroom assessment — teacher-designed tools, daily/weekly feedback'
                                        : 'School-Based Assessment (SBA) — KNEC tools, uploaded to CBA portal, counts towards placement'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Subject *</label>
                                    <select value={cbcForm.subject_id || ''} onChange={e => setCbcForm({ ...cbcForm, subject_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Term *</label>
                                    <select value={cbcForm.term_id || ''} onChange={e => setCbcForm({ ...cbcForm, term_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                                        <option value="">Select Term</option>
                                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}{t.is_current ? ' 🟢' : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Task Name *</label>
                                <input type="text" value={cbcForm.task_name} onChange={e => setCbcForm({ ...cbcForm, task_name: e.target.value })} className={inputCls} placeholder="e.g. Project Work, Oral Questioning, KNEC SBA Tool..." />
                            </div>

                            {/* Rubric Level Selector */}
                            <div>
                                <label className={labelCls}>Rubric Level *</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(Object.entries(RUBRIC_CONFIG) as [CBCRubricLevel, typeof RUBRIC_CONFIG.EE][]).map(([level, cfg]) => (
                                        <button key={level} onClick={() => setCbcForm({ ...cbcForm, rubric_level: level })}
                                            className={`py-3 rounded-xl border-2 transition-all text-center ${cbcForm.rubric_level === level ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                            style={cbcForm.rubric_level === level ? { borderColor: cfg.color, background: cfg.bg } : {}}>
                                            <p className="text-base font-extrabold" style={{ color: cfg.color }}>{level}</p>
                                            <p className="text-[9px] text-gray-500 mt-0.5 px-1 leading-tight">{cfg.range}</p>
                                        </button>
                                    ))}
                                </div>
                                {cbcForm.rubric_level && (
                                    <p className="text-xs mt-2 font-medium" style={{ color: RUBRIC_CONFIG[cbcForm.rubric_level].color }}>
                                        {RUBRIC_CONFIG[cbcForm.rubric_level].label} — {RUBRIC_CONFIG[cbcForm.rubric_level].description}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Raw Score (optional)</label>
                                    <input type="number" value={cbcForm.raw_score} onChange={e => {
                                        const val = e.target.value;
                                        let autoLevel: CBCRubricLevel = cbcForm.rubric_level;
                                        if (val !== '') {
                                            const n = Number(val);
                                            if (n >= 80) autoLevel = 'EE';
                                            else if (n >= 60) autoLevel = 'ME';
                                            else if (n >= 40) autoLevel = 'AE';
                                            else autoLevel = 'BE';
                                        }
                                        setCbcForm({ ...cbcForm, raw_score: val, rubric_level: autoLevel });
                                    }} className={inputCls} min="0" max="100" placeholder="0–100 (auto-sets level)" />
                                    <p className="text-[10px] text-gray-400 mt-1">Score auto-maps to rubric level</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Teacher</label>
                                    <select value={cbcForm.teacher_id || ''} onChange={e => setCbcForm({ ...cbcForm, teacher_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                                        <option value="">Select Teacher</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Notes / Evidence</label>
                                <textarea value={cbcForm.notes} onChange={e => setCbcForm({ ...cbcForm, notes: e.target.value })} className={inputCls} rows={2} placeholder="Evidence of learning, teacher observations, portfolio reference..." />
                            </div>

                            {cbcForm.rubric_level === 'BE' && (
                                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 flex gap-2 text-sm text-red-700">
                                    <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                                    <p><strong>Auto-flag:</strong> This BE result will automatically create an intervention flag for academic support tracking.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowCBCModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button onClick={handleCBCSave} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                                    <FiSave size={14} /> Save Assessment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

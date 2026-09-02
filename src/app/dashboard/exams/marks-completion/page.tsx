'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiCheckCircle, FiAlertCircle, FiClock, FiMail,
    FiRefreshCw, FiFilter, FiDownload, FiUser, FiBook,
    FiTrendingUp, FiAlertTriangle, FiSend,
} from 'react-icons/fi';

/* ─── helpers ─── */
const pct = (done: number, total: number) => total > 0 ? Math.round((done / total) * 100) : 0;
const statusColor = (p: number) => p === 100 ? '#059669' : p >= 60 ? '#f59e0b' : p > 0 ? '#ef4444' : '#94a3b8';
const statusLabel = (p: number) => p === 100 ? 'Complete' : p >= 60 ? 'Partial' : p > 0 ? 'Started' : 'Not Started';
const statusBg   = (p: number) => p === 100 ? 'bg-green-50 border-green-200 text-green-700' : p >= 60 ? 'bg-amber-50 border-amber-200 text-amber-700' : p > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-400';

export default function MarksCompletionPage() {
    const [loading, setLoading]     = useState(true);
    const [forms, setForms]         = useState<any[]>([]);
    const [streams, setStreams]      = useState<any[]>([]);
    const [subjects, setSubjects]   = useState<any[]>([]);
    const [students, setStudents]   = useState<any[]>([]);
    const [marks, setMarks]         = useState<any[]>([]);
    const [terms, setTerms]         = useState<any[]>([]);
    const [teachers, setTeachers]   = useState<any[]>([]);
    const [subTeachers, setSubTeachers] = useState<any[]>([]);

    const [selTerm, setSelTerm]         = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [selForm, setSelForm]         = useState('');
    const [viewMode, setViewMode]       = useState<'subject'|'teacher'|'stream'>('subject');
    const [filterStatus, setFilterStatus] = useState<'all'|'missing'|'partial'|'complete'>('all');

    const EXAM_TYPES = ['CAT 1','CAT 2','Mid-Term','End-Term','Mock','Pre-Mock','Trial'];

    /* ─── FETCH ─── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, stRes, subRes, studRes, termRes, tchRes, stRes2] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('id,form_id,stream_id').eq('status', 'Active'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_teachers').select('id,first_name,last_name,tsc_number').order('first_name'),
            supabase.from('school_subject_teachers').select('*'),
        ]);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(studRes.data || []);
        setTerms(termRes.data || []);
        setTeachers(tchRes.data || []);
        setSubTeachers(stRes2.data || []);

        // Set default term
        if ((termRes.data || []).length > 0 && !selTerm) {
            setSelTerm(String((termRes.data as any[])[0].id));
        }
        setLoading(false);
    }, [selTerm]);

    const fetchMarks = useCallback(async () => {
        if (!selTerm) return;
        const { data } = await supabase
            .from('school_exam_marks')
            .select('student_id,subject_id,form_id,stream_id,score,exam_type,term_id')
            .eq('term_id', Number(selTerm))
            .eq('exam_type', selExamType);
        setMarks(data || []);
    }, [selTerm, selExamType]);

    useEffect(() => { fetchAll(); }, []);
    useEffect(() => { fetchMarks(); }, [fetchMarks]);

    /* ─── COMPUTE ─── */
    const filteredStudents = students.filter(s => !selForm || String(s.form_id) === selForm);

    // Subject completion matrix
    const subjectMatrix = subjects.map(sub => {
        const eligibleStudents = filteredStudents;
        const entered = marks.filter(m =>
            m.subject_id === sub.id &&
            (!selForm || String(m.form_id) === selForm)
        );
        const enteredStudentIds = new Set(entered.map(m => m.student_id));
        const done = eligibleStudents.filter(s => enteredStudentIds.has(s.id)).length;
        const total = eligibleStudents.length;
        const completion = pct(done, total);
        // Find assigned teacher
        const assignment = subTeachers.find(st =>
            st.subject_id === sub.id &&
            (!selForm || String(st.form_id) === selForm)
        );
        const teacher = assignment ? teachers.find(t => t.id === assignment.teacher_id) : null;
        return { ...sub, done, total, completion, teacher };
    }).filter(s => s.total > 0);

    // Teacher completion
    const teacherMatrix = teachers.map(tch => {
        const assignments = subTeachers.filter(st => st.teacher_id === tch.id);
        const subjectIds = [...new Set(assignments.map((a: any) => a.subject_id))];
        let totalExpected = 0, totalDone = 0;
        const subjectBreakdown: any[] = [];
        subjectIds.forEach(sid => {
            const sub = subjects.find(s => s.id === sid);
            if (!sub) return;
            const eligible = filteredStudents.length;
            const done = marks.filter(m => m.subject_id === sid && (!selForm || String(m.form_id) === selForm)).length;
            totalExpected += eligible;
            totalDone += Math.min(done, eligible);
            subjectBreakdown.push({ sub, done: Math.min(done, eligible), total: eligible, completion: pct(Math.min(done, eligible), eligible) });
        });
        return { ...tch, totalExpected, totalDone, completion: pct(totalDone, totalExpected), subjectBreakdown };
    }).filter(t => t.totalExpected > 0);

    // Stream completion
    const streamMatrix = streams.map(str => {
        const streamStudents = students.filter(s => s.stream_id === str.id && (!selForm || String(s.form_id) === selForm));
        if (streamStudents.length === 0) return null;
        const subjectBreakdown = subjects.map(sub => {
            const eligible = streamStudents.length;
            const done = marks.filter(m => m.subject_id === sub.id && m.stream_id === str.id).length;
            return { sub, done: Math.min(done, eligible), total: eligible, completion: pct(Math.min(done, eligible), eligible) };
        }).filter(s => s.total > 0);
        const overall = pct(subjectBreakdown.reduce((a, s) => a + s.done, 0), subjectBreakdown.reduce((a, s) => a + s.total, 0));
        return { ...str, subjectBreakdown, overall };
    }).filter(Boolean) as any[];

    // Overall stats
    const totalExpected = filteredStudents.length * subjects.length;
    const totalDone = marks.filter(m => !selForm || String(m.form_id) === selForm).length;
    const overallPct = pct(Math.min(totalDone, totalExpected), totalExpected);
    const missing = subjectMatrix.filter(s => s.completion < 100).length;
    const notStarted = subjectMatrix.filter(s => s.completion === 0).length;
    const complete = subjectMatrix.filter(s => s.completion === 100).length;

    const applyStatusFilter = (item: any) => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'missing') return item.completion < 100;
        if (filterStatus === 'partial') return item.completion > 0 && item.completion < 100;
        if (filterStatus === 'complete') return item.completion === 100;
        return true;
    };

    const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"/>
        </div>
    );

    return (
        <div className="space-y-6 pb-16">
            {/* HEADER */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#0891b2)' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">📋 Marks Entry Completion</h1>
                        <p className="text-sm text-white/70 mt-1">Real-time tracking of marks submission per subject, teacher & stream</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={fetchMarks} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><FiRefreshCw size={14}/></button>
                    </div>
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4">
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className={`${inp} text-gray-800`}>
                        <option value="">All Terms</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                    </select>
                    <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className={`${inp} text-gray-800`}>
                        {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                    </select>
                    <select value={selForm} onChange={e => setSelForm(e.target.value)} className={`${inp} text-gray-800`}>
                        <option value="">All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Overall', val: `${overallPct}%`, color: statusColor(overallPct), icon: '📊' },
                    { label: 'Complete', val: complete, color: '#059669', icon: '✅' },
                    { label: 'Partial', val: subjectMatrix.filter(s => s.completion > 0 && s.completion < 100).length, color: '#f59e0b', icon: '⚠️' },
                    { label: 'Not Started', val: notStarted, color: '#ef4444', icon: '🚨' },
                    { label: 'Marks Entered', val: Math.min(totalDone, totalExpected).toLocaleString(), color: '#6366f1', icon: '✏️' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <span className="text-xl">{s.icon}</span>
                        <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.val}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Overall Progress Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-gray-800 text-sm">Overall Exam Marks Completion — {selExamType}</p>
                    <span className="text-lg font-black" style={{ color: statusColor(overallPct) }}>{overallPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4">
                    <div className="h-4 rounded-full transition-all" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg,${statusColor(overallPct)}99,${statusColor(overallPct)})` }}/>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Complete: {complete} subjects</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Partial: {subjectMatrix.filter(s => s.completion > 0 && s.completion < 100).length} subjects</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Not Started: {notStarted} subjects</span>
                </div>
            </div>

            {/* VIEW TOGGLE + FILTER */}
            <div className="flex flex-wrap gap-2 items-center">
                {(['subject','teacher','stream'] as const).map(v => (
                    <button key={v} onClick={() => setViewMode(v)} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${viewMode === v ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50'}`}>
                        {{ subject: '📚 By Subject', teacher: '👨‍🏫 By Teacher', stream: '🏫 By Stream' }[v]}
                    </button>
                ))}
                <div className="ml-auto flex gap-2">
                    {(['all','missing','partial','complete'] as const).map(f => (
                        <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${filterStatus === f ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>{f}</button>
                    ))}
                </div>
            </div>

            {/* ══ BY SUBJECT ══ */}
            {viewMode === 'subject' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <p className="font-black text-gray-800">Marks Completion by Subject</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {['Subject','Teacher','Expected','Entered','Completion','Status','Action'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subjectMatrix.filter(applyStatusFilter).length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No subjects match filter</td></tr>
                            )}
                            {subjectMatrix.filter(applyStatusFilter).map(sub => (
                                <tr key={sub.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800 text-xs">{sub.subject_name}</p>
                                        <p className="text-[10px] text-gray-400">{sub.subject_code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {sub.teacher ? `${sub.teacher.first_name} ${sub.teacher.last_name}` : <span className="text-gray-300 italic">Unassigned</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{sub.total}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-center" style={{ color: statusColor(sub.completion) }}>{sub.done}</td>
                                    <td className="px-4 py-3 min-w-[140px]">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                <div className="h-2 rounded-full transition-all" style={{ width: `${sub.completion}%`, background: statusColor(sub.completion) }}/>
                                            </div>
                                            <span className="text-xs font-black w-8 text-right" style={{ color: statusColor(sub.completion) }}>{sub.completion}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg(sub.completion)}`}>{statusLabel(sub.completion)}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {sub.completion < 100 && (
                                            <button
                                                onClick={() => {
                                                    toast.success(`Reminder sent to ${sub.teacher ? sub.teacher.first_name : 'teacher'} for ${sub.subject_name}`);
                                                }}
                                                className="px-3 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition"
                                            >
                                                <FiSend size={9}/> Remind
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══ BY TEACHER ══ */}
            {viewMode === 'teacher' && (
                <div className="space-y-3">
                    {teacherMatrix.filter(applyStatusFilter).length === 0 && (
                        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">No teachers match filter</div>
                    )}
                    {teacherMatrix.filter(applyStatusFilter).map(tch => (
                        <div key={tch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 flex items-center gap-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0">
                                    {tch.first_name[0]}{tch.last_name[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-800">{tch.first_name} {tch.last_name}</p>
                                    <p className="text-xs text-gray-400">TSC: {tch.tsc_number || '—'} · {tch.subjectBreakdown.length} subject(s)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black" style={{ color: statusColor(tch.completion) }}>{tch.completion}%</p>
                                    <p className="text-[10px] text-gray-400">{tch.totalDone}/{tch.totalExpected} marks</p>
                                </div>
                                <div className="w-32">
                                    <div className="w-full bg-gray-100 rounded-full h-3">
                                        <div className="h-3 rounded-full" style={{ width: `${tch.completion}%`, background: statusColor(tch.completion) }}/>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg(tch.completion)}`}>{statusLabel(tch.completion)}</span>
                                {tch.completion < 100 && (
                                    <button onClick={() => toast.success(`Reminder sent to ${tch.first_name}`)} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1">
                                        <FiSend size={11}/> Remind
                                    </button>
                                )}
                            </div>
                            {/* Subject breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-gray-50">
                                {tch.subjectBreakdown.map((s: any) => (
                                    <div key={s.sub.id} className="p-3">
                                        <p className="text-xs font-bold text-gray-700">{s.sub.subject_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full" style={{ width: `${s.completion}%`, background: statusColor(s.completion) }}/>
                                            </div>
                                            <span className="text-[10px] font-black" style={{ color: statusColor(s.completion) }}>{s.completion}%</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{s.done}/{s.total} students</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ══ BY STREAM ══ */}
            {viewMode === 'stream' && (
                <div className="space-y-3">
                    {streamMatrix.filter(applyStatusFilter).length === 0 && (
                        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">No streams match filter</div>
                    )}
                    {streamMatrix.filter(applyStatusFilter).map((str: any) => (
                        <div key={str.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 flex items-center gap-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-700 text-sm shrink-0">🏫</div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-800">{str.stream_name}</p>
                                    <p className="text-xs text-gray-400">{str.subjectBreakdown.length} subjects tracked</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black" style={{ color: statusColor(str.overall) }}>{str.overall}%</p>
                                    <p className="text-[10px] text-gray-400">overall completion</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg(str.overall)}`}>{statusLabel(str.overall)}</span>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-0 divide-x divide-y divide-gray-50">
                                {str.subjectBreakdown.map((s: any) => (
                                    <div key={s.sub.id} className="p-2 text-center">
                                        <p className="text-[10px] font-bold text-gray-600 truncate">{s.sub.subject_name.split(' ')[0]}</p>
                                        <p className="text-sm font-black mt-0.5" style={{ color: statusColor(s.completion) }}>{s.completion}%</p>
                                        <p className="text-[9px] text-gray-400">{s.done}/{s.total}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSave, FiDownload, FiCheckCircle, FiLoader } from 'react-icons/fi';

export default function ExamsPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('CAT 1');

    // Marks data: { [studentId_subjectId]: score }
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [savedMarks, setSavedMarks] = useState<Record<string, string>>({});
    const [unsavedCells, setUnsavedCells] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [autoSaveTimer, setAutoSaveTimer] = useState<any>(null);

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, stl] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_subject_teachers').select('*'),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setSubjectTeachers(stl.data || []);
        // Auto-select current term
        const cur = (t.data || []).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Get subjects for the current user (teacher) or all for admin
    const getAvailableSubjects = () => {
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            if (user.role === 'admin' || user.role === 'principal') return subjects;
            // Teachers only see their assigned subjects
            const myLinks = subjectTeachers.filter(st => st.teacher_id === user.id);
            const mySubjectIds = myLinks.map(l => l.subject_id);
            return subjects.filter(s => mySubjectIds.includes(s.id));
        } catch { return subjects; }
    };

    // Get the class (form + stream) student list
    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''));

    // Load existing marks when selection changes
    useEffect(() => {
        if (!selForm || !selSubject || !selTerm || !selExamType) return;
        const loadMarks = async () => {
            const studentIds = classStudents.map(s => s.id);
            if (studentIds.length === 0) return;
            const { data } = await supabase.from('school_exam_marks')
                .select('*')
                .eq('subject_id', Number(selSubject))
                .eq('term_id', Number(selTerm))
                .eq('exam_type', selExamType)
                .in('student_id', studentIds);
            const loaded: Record<string, string> = {};
            (data || []).forEach((m: any) => {
                const key = `${m.student_id}_${m.subject_id}`;
                loaded[key] = String(m.score ?? '');
            });
            setMarks(loaded);
            setSavedMarks({ ...loaded });
            setUnsavedCells(new Set());
        };
        loadMarks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selSubject, selTerm, selExamType, students]);

    // Mark a cell as changed
    const handleMarkChange = (studentId: number, value: string) => {
        const key = `${studentId}_${selSubject}`;
        const numVal = value === '' ? '' : String(Math.min(100, Math.max(0, Number(value))));
        setMarks(prev => ({ ...prev, [key]: numVal }));
        const newUnsaved = new Set(unsavedCells);
        if (numVal !== (savedMarks[key] || '')) {
            newUnsaved.add(key);
        } else {
            newUnsaved.delete(key);
        }
        setUnsavedCells(newUnsaved);

        // Auto-save individual cell after 2 seconds of inactivity
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        const timer = setTimeout(() => {
            autoSaveCell(studentId, numVal);
        }, 2000);
        setAutoSaveTimer(timer);
    };

    // Auto-save a single cell
    const autoSaveCell = async (studentId: number, score: string) => {
        if (!selSubject || !selTerm) return;
        const key = `${studentId}_${selSubject}`;
        if (score === '' || score === (savedMarks[key] || '')) return;

        const payload = {
            student_id: studentId,
            subject_id: Number(selSubject),
            term_id: Number(selTerm),
            exam_type: selExamType,
            score: Number(score),
        };

        // Upsert: try update first, then insert
        const { data: existing } = await supabase.from('school_exam_marks')
            .select('id')
            .eq('student_id', studentId)
            .eq('subject_id', Number(selSubject))
            .eq('term_id', Number(selTerm))
            .eq('exam_type', selExamType)
            .maybeSingle();

        let error;
        if (existing) {
            ({ error } = await supabase.from('school_exam_marks').update({ score: Number(score) }).eq('id', existing.id));
        } else {
            ({ error } = await supabase.from('school_exam_marks').insert([payload]));
        }
        if (!error) {
            setSavedMarks(prev => ({ ...prev, [key]: score }));
            setUnsavedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        }
    };

    // Save all unsaved marks at once
    const handleSaveAll = async () => {
        if (unsavedCells.size === 0) { toast('All marks are already saved ✅'); return; }
        setSaving(true);
        let saved = 0;
        for (const key of Array.from(unsavedCells)) {
            const [sid, subId] = key.split('_');
            const score = marks[key];
            if (score === '' || score === undefined) continue;

            const payload = {
                student_id: Number(sid),
                subject_id: Number(subId),
                term_id: Number(selTerm),
                exam_type: selExamType,
                score: Number(score),
            };

            const { data: existing } = await supabase.from('school_exam_marks')
                .select('id')
                .eq('student_id', Number(sid))
                .eq('subject_id', Number(subId))
                .eq('term_id', Number(selTerm))
                .eq('exam_type', selExamType)
                .maybeSingle();

            let error;
            if (existing) {
                ({ error } = await supabase.from('school_exam_marks').update({ score: Number(score) }).eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('school_exam_marks').insert([payload]));
            }
            if (!error) saved++;
        }
        setSavedMarks({ ...marks });
        setUnsavedCells(new Set());
        setSaving(false);
        toast.success(`${saved} marks saved successfully ✅`);
    };

    // Grade from score
    const getGrade = (score: number): { grade: string; color: string } => {
        if (score >= 80) return { grade: 'A', color: '#059669' };
        if (score >= 75) return { grade: 'A-', color: '#10b981' };
        if (score >= 70) return { grade: 'B+', color: '#34d399' };
        if (score >= 65) return { grade: 'B', color: '#3b82f6' };
        if (score >= 60) return { grade: 'B-', color: '#60a5fa' };
        if (score >= 55) return { grade: 'C+', color: '#8b5cf6' };
        if (score >= 50) return { grade: 'C', color: '#a78bfa' };
        if (score >= 45) return { grade: 'C-', color: '#f59e0b' };
        if (score >= 40) return { grade: 'D+', color: '#f97316' };
        if (score >= 35) return { grade: 'D', color: '#ef4444' };
        if (score >= 30) return { grade: 'D-', color: '#dc2626' };
        return { grade: 'E', color: '#991b1b' };
    };

    const availableSubjects = getAvailableSubjects();
    const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '-';
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    // Stats
    const enteredCount = Object.values(marks).filter(v => v !== '' && v !== undefined).length;
    const avg = enteredCount > 0 ? Object.values(marks).filter(v => v !== '').reduce((s, v) => s + Number(v), 0) / enteredCount : 0;

    // Export marks as CSV
    const exportMarks = () => {
        if (classStudents.length === 0) return;
        const subName = getSubjectName(Number(selSubject));
        const headers = ['#', 'Adm No', 'Student Name', 'Score', 'Grade'];
        const rows = classStudents.map((s, i) => {
            const key = `${s.id}_${selSubject}`;
            const score = marks[key] || '';
            const grade = score ? getGrade(Number(score)).grade : '';
            return [i + 1, s.admission_no || s.admission_number, `${s.first_name} ${s.last_name}`, score, grade];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `marks_${subName}_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Marks exported ✅');
    };

    const isReady = selForm && selSubject && selTerm;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Hide number input spinners globally */}
            <style jsx>{`
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                    appearance: textfield;
                }
            `}</style>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📝 Exam Marks Entry</h1>
                    <p className="text-sm text-gray-500 mt-1">Enter and manage student marks per subject — Broadsheet style</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#8b5cf6', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <>
                    {/* Selection Bar */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div>
                                <label className="lbl">Form *</label>
                                <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="select-modern w-full text-sm">
                                    <option value="">Select Form</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Stream</label>
                                <select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm">
                                    <option value="">All Streams</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Subject *</label>
                                <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="select-modern w-full text-sm">
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Term *</label>
                                <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm">
                                    <option value="">Select Term</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Exam Type</label>
                                <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">
                                    {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {!isReady ? (
                        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">📊</span>
                            <p className="font-semibold text-lg mb-1">Select Form, Subject & Term to begin</p>
                            <p className="text-sm">Choose from the filters above to load the marks broadsheet</p>
                        </div>
                    ) : classStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">👤</span>
                            <p className="font-semibold">No students found in this class</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">👨‍🎓</div>
                                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Students</p><p className="text-xl font-bold text-gray-800">{classStudents.length}</p></div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">✏️</div>
                                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Entered</p><p className="text-xl font-bold text-green-600">{enteredCount} / {classStudents.length}</p></div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">📊</div>
                                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Average</p><p className="text-xl font-bold text-purple-600">{avg.toFixed(1)}%</p></div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">{unsavedCells.size > 0 ? '⚠️' : '✅'}</div>
                                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Unsaved</p><p className={`text-xl font-bold ${unsavedCells.size > 0 ? 'text-amber-600' : 'text-green-600'}`}>{unsavedCells.size}</p></div>
                                </div>
                                {/* Progress Card */}
                                <div className={`rounded-xl border p-3.5 ${enteredCount === classStudents.length && classStudents.length > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{enteredCount === classStudents.length && classStudents.length > 0 ? '🎉' : '📋'}</span>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase">Captured</p>
                                            <p className={`text-xl font-bold ${enteredCount === classStudents.length && classStudents.length > 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                                                {classStudents.length > 0 ? Math.round((enteredCount / classStudents.length) * 100) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{
                                            width: `${classStudents.length > 0 ? (enteredCount / classStudents.length) * 100 : 0}%`,
                                            background: enteredCount === classStudents.length && classStudents.length > 0 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                        }} />
                                    </div>
                                    {enteredCount === classStudents.length && classStudents.length > 0 && (
                                        <p className="text-[10px] font-bold text-emerald-600 mt-1">✅ All marks captured!</p>
                                    )}
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    <span className="font-semibold text-gray-700">{getSubjectName(Number(selSubject))}</span>
                                    {' — '}{getFormName(Number(selForm))} {selStream ? getStreamName(Number(selStream)) : ''} • {selExamType}
                                    {unsavedCells.size > 0 && <span className="ml-2 text-amber-600 font-semibold animate-pulse">• {unsavedCells.size} unsaved changes</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={exportMarks} className="btn-outline text-sm flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                                    <button onClick={handleSaveAll} disabled={saving || unsavedCells.size === 0}
                                        className={`flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-xl font-semibold transition-all ${unsavedCells.size > 0
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:-translate-y-0.5'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                        {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                                        {saving ? 'Saving...' : unsavedCells.size > 0 ? `Save All (${unsavedCells.size})` : 'All Saved ✅'}
                                    </button>
                                </div>
                            </div>

                            {/* Broadsheet Table */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-10">#</th>
                                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-24">Adm No</th>
                                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 min-w-[180px]">Student Name</th>
                                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-28">Score (/100)</th>
                                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-20">Grade</th>
                                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-16">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classStudents.map((s, i) => {
                                                const key = `${s.id}_${selSubject}`;
                                                const score = marks[key] || '';
                                                const isUnsaved = unsavedCells.has(key);
                                                const gradeInfo = score !== '' ? getGrade(Number(score)) : null;
                                                return (
                                                    <tr key={s.id} className={`border-b border-gray-100 transition-colors ${isUnsaved ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                        <td className="px-3 py-2 text-xs text-gray-400 font-medium">{i + 1}</td>
                                                        <td className="px-3 py-2 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                                        <td className="px-3 py-2 text-sm font-semibold text-gray-700">{s.first_name} {s.last_name}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <input
                                                                type="number"
                                                                min="0" max="100"
                                                                value={score}
                                                                onChange={e => handleMarkChange(s.id, e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') {
                                                                        // Move to next row
                                                                        const nextRow = classStudents[i + 1];
                                                                        if (nextRow) {
                                                                            const nextInput = document.getElementById(`mark-${nextRow.id}`);
                                                                            if (nextInput) { e.preventDefault(); nextInput.focus(); }
                                                                        }
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        // Move to previous row
                                                                        const prevRow = classStudents[i - 1];
                                                                        if (prevRow) {
                                                                            const prevInput = document.getElementById(`mark-${prevRow.id}`);
                                                                            if (prevInput) { e.preventDefault(); prevInput.focus(); }
                                                                        }
                                                                    }
                                                                }}
                                                                id={`mark-${s.id}`}
                                                                placeholder="—"
                                                                className={`w-20 text-center text-sm font-bold rounded-lg border-2 py-2 outline-none transition-all
                                                                    ${isUnsaved ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' :
                                                                        score !== '' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}
                                                                    focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {gradeInfo ? (
                                                                <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg font-bold text-sm text-white" style={{ background: gradeInfo.color }}>
                                                                    {gradeInfo.grade}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {isUnsaved ? (
                                                                <span className="text-amber-500" title="Unsaved">⚡</span>
                                                            ) : score !== '' ? (
                                                                <FiCheckCircle className="text-green-500 mx-auto" size={16} />
                                                            ) : (
                                                                <span className="text-gray-300">○</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom summary */}
                                <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
                                    <div className="text-gray-500">
                                        <span className="font-semibold text-gray-700">{enteredCount}</span> of {classStudents.length} marks entered
                                        {enteredCount > 0 && <> • Mean: <span className="font-bold text-purple-600">{avg.toFixed(1)}</span></>}
                                    </div>
                                    <div className="flex gap-3 text-xs">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block"></span> Saved</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> Unsaved</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block"></span> Empty</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

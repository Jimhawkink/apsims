'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiPrinter, FiGrid, FiFilter } from 'react-icons/fi';

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function BroadsheetPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'total'>('rank');

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setGrading(gr.data || []);
        const cur = (t.data || []).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchBase(); }, [fetchBase]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream);

    // Fetch marks when filters change
    useEffect(() => {
        if (!selForm || !selTerm || !selExamType) { setMarks([]); return; }
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length === 0) { setMarks([]); return; }
        const load = async () => {
            setLoadingMarks(true);
            const { data } = await supabase.from('school_exam_marks').select('*')
                .eq('term_id', Number(selTerm)).eq('exam_type', selExamType)
                .in('student_id', studentIds);
            setMarks(data || []);
            setLoadingMarks(false);
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selTerm, selExamType, students]);

    // Build broadsheet data
    const broadsheetData = classStudents.map(student => {
        const studentMarks = marks.filter(m => m.student_id === student.id);
        const subjectScores: Record<number, { score: number; grade: string; points: number }> = {};
        let totalScore = 0;
        let totalPoints = 0;
        let subjectCount = 0;

        subjects.forEach(sub => {
            const mark = studentMarks.find(m => m.subject_id === sub.id);
            if (mark) {
                const g = getGrade(Number(mark.score));
                subjectScores[sub.id] = { score: Number(mark.score), grade: g.grade, points: g.points };
                totalScore += Number(mark.score);
                totalPoints += g.points;
                subjectCount++;
            }
        });

        const avgScore = subjectCount > 0 ? totalScore / subjectCount : 0;
        const meanGrade = getGrade(avgScore);

        return {
            student,
            subjectScores,
            totalScore,
            totalPoints,
            subjectCount,
            avgScore,
            meanGrade,
        };
    });

    // Sort and rank
    const sorted = [...broadsheetData].sort((a, b) => {
        if (sortBy === 'name') return `${a.student.first_name}`.localeCompare(`${b.student.first_name}`);
        if (sortBy === 'total') return b.totalScore - a.totalScore;
        return b.totalPoints - a.totalPoints || b.totalScore - a.totalScore;
    });

    // Assign ranks
    sorted.forEach((row, i) => {
        if (i === 0 || row.totalPoints !== sorted[i - 1].totalPoints || row.totalScore !== sorted[i - 1].totalScore) {
            (row as any).rank = i + 1;
        } else {
            (row as any).rank = (sorted[i - 1] as any).rank;
        }
    });

    const activeSubjects = subjects.filter(sub => marks.some(m => m.subject_id === sub.id));
    const isReady = selForm && selTerm && selExamType;

    // Export
    const exportBroadsheet = () => {
        const headers = ['#', 'Adm No', 'Name', ...activeSubjects.map(s => s.subject_code || s.subject_name), 'Total', 'Avg', 'Grade', 'Points', 'Rank'];
        const rows = sorted.map(row => [
            (row as any).rank,
            row.student.admission_no || row.student.admission_number,
            `${row.student.first_name} ${row.student.last_name}`,
            ...activeSubjects.map(sub => {
                const s = row.subjectScores[sub.id];
                return s ? `${s.score}(${s.grade})` : '-';
            }),
            row.totalScore || '-',
            row.avgScore > 0 ? row.avgScore.toFixed(1) : '-',
            row.meanGrade.grade,
            row.totalPoints,
            (row as any).rank,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `broadsheet_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Broadsheet exported ✅');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Broadsheet...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiGrid className="text-purple-500" /> Full Broadsheet</h1>
                    <p className="text-sm text-gray-500 mt-1">All subjects per class — Scores, grades, rankings & summary</p>
                </div>
                {isReady && sorted.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="btn-outline text-sm flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                        <button onClick={exportBroadsheet} className="btn-outline text-sm flex items-center gap-1.5"><FiDownload size={14} /> Export CSV</button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    <div><label className="lbl">Form *</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="select-modern w-full text-sm"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Term *</label><select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm"><option value="">Select Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                    <div><label className="lbl">Exam Type *</label><select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    <div><label className="lbl">Sort By</label><select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="select-modern w-full text-sm"><option value="rank">Rank (Points)</option><option value="total">Total Score</option><option value="name">Name</option></select></div>
                </div>
            </div>

            {!isReady ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">📋</span>
                    <p className="font-semibold text-lg">Select Form, Term & Exam Type</p>
                </div>
            ) : loadingMarks ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                    <p className="text-gray-400 text-sm">Loading marks...</p>
                </div>
            ) : sorted.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">📊</span>
                    <p className="font-semibold">No students or marks found</p>
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">👨‍🎓</div>
                            <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Students</p><p className="text-xl font-bold text-gray-800">{sorted.length}</p></div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">📚</div>
                            <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Subjects</p><p className="text-xl font-bold text-purple-600">{activeSubjects.length}</p></div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">📊</div>
                            <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Class Avg</p><p className="text-xl font-bold text-green-600">
                                {sorted.length > 0 ? (sorted.reduce((a, r) => a + r.avgScore, 0) / sorted.length).toFixed(1) : '--'}%
                            </p></div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">🏆</div>
                            <div><p className="text-[10px] font-semibold text-gray-400 uppercase">Top Score</p><p className="text-xl font-bold text-amber-600">
                                {sorted.length > 0 ? Math.max(...sorted.map(r => r.avgScore)).toFixed(1) : '--'}%
                            </p></div>
                        </div>
                    </div>

                    {/* Broadsheet Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                        <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-0 bg-indigo-50 z-10 w-10">Pos</th>
                                        <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-10 bg-indigo-50 z-10 w-16">Adm</th>
                                        <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-[88px] bg-indigo-50 z-10 min-w-[140px]">Name</th>
                                        {activeSubjects.map(sub => (
                                            <th key={sub.id} className="px-1.5 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 min-w-[55px]" title={sub.subject_name}>
                                                {sub.subject_code || sub.subject_name.substring(0, 4)}
                                            </th>
                                        ))}
                                        <th className="px-2 py-3 text-center font-bold text-blue-600 uppercase border-b-2 border-blue-200 bg-blue-50 min-w-[50px]">Tot</th>
                                        <th className="px-2 py-3 text-center font-bold text-purple-600 uppercase border-b-2 border-purple-200 bg-purple-50 min-w-[50px]">Avg</th>
                                        <th className="px-2 py-3 text-center font-bold text-green-600 uppercase border-b-2 border-green-200 bg-green-50 min-w-[40px]">Grd</th>
                                        <th className="px-2 py-3 text-center font-bold text-amber-600 uppercase border-b-2 border-amber-200 bg-amber-50 min-w-[40px]">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((row, i) => (
                                        <tr key={row.student.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                            <td className="px-2 py-2 text-center font-bold text-gray-700 sticky left-0 bg-white z-10">{(row as any).rank}</td>
                                            <td className="px-2 py-2 text-left font-mono text-blue-600 font-bold sticky left-10 bg-white z-10 text-[10px]">{row.student.admission_no || row.student.admission_number}</td>
                                            <td className="px-2 py-2 text-left font-semibold text-gray-800 sticky left-[88px] bg-white z-10 whitespace-nowrap">{row.student.first_name} {row.student.last_name}</td>
                                            {activeSubjects.map(sub => {
                                                const s = row.subjectScores[sub.id];
                                                return (
                                                    <td key={sub.id} className="px-1 py-2 text-center">
                                                        {s ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-bold text-gray-800">{s.score}</span>
                                                                <span className="text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full text-white" style={{ background: gradeColors[s.grade] || '#94a3b8' }}>{s.grade}</span>
                                                            </div>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-2 text-center font-extrabold text-blue-700 bg-blue-50/50">{row.totalScore || '-'}</td>
                                            <td className="px-2 py-2 text-center font-bold text-purple-700 bg-purple-50/50">{row.avgScore > 0 ? row.avgScore.toFixed(1) : '-'}</td>
                                            <td className="px-2 py-2 text-center bg-green-50/50">
                                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-white font-bold text-[10px]"
                                                    style={{ background: gradeColors[row.meanGrade.grade] || '#94a3b8' }}>{row.meanGrade.grade}</span>
                                            </td>
                                            <td className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/50">{row.totalPoints}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300">
                                        <td colSpan={3} className="px-3 py-3 text-xs font-bold text-gray-600 sticky left-0 bg-gray-100 z-10">CLASS AVERAGE</td>
                                        {activeSubjects.map(sub => {
                                            const subMarks = sorted.filter(r => r.subjectScores[sub.id]).map(r => r.subjectScores[sub.id].score);
                                            const avg = subMarks.length > 0 ? subMarks.reduce((a, b) => a + b, 0) / subMarks.length : 0;
                                            const g = getGrade(avg);
                                            return (
                                                <td key={sub.id} className="px-1 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-gray-700">{avg > 0 ? avg.toFixed(0) : '-'}</span>
                                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded text-white mt-0.5" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50/50">—</td>
                                        <td className="px-2 py-3 text-center font-bold text-purple-700 bg-purple-50/50">
                                            {sorted.length > 0 ? (sorted.reduce((a, r) => a + r.avgScore, 0) / sorted.length).toFixed(1) : '-'}
                                        </td>
                                        <td className="px-2 py-3 text-center bg-green-50/50">
                                            {(() => { const a = sorted.length > 0 ? sorted.reduce((a, r) => a + r.avgScore, 0) / sorted.length : 0; const g = getGrade(a); return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>; })()}
                                        </td>
                                        <td className="px-2 py-3 text-center font-bold text-amber-700 bg-amber-50/50">—</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiAward, FiTrendingUp, FiTrendingDown, FiMinus, FiFilter } from 'react-icons/fi';

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function MeritListPage() {
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
    const [filterGrade, setFilterGrade] = useState('');
    const [showBest7, setShowBest7] = useState(true);

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

    // Build merit data
    const meritData = classStudents.map(student => {
        const studentMarks = marks.filter(m => m.student_id === student.id);
        const subjectResults: { subId: number; score: number; grade: string; points: number }[] = [];

        subjects.forEach(sub => {
            const mark = studentMarks.find(m => m.subject_id === sub.id);
            if (mark) {
                const g = getGrade(Number(mark.score));
                subjectResults.push({ subId: sub.id, score: Number(mark.score), grade: g.grade, points: g.points });
            }
        });

        // Best 7 subjects calculation (KCSE-style)
        const sortedByPoints = [...subjectResults].sort((a, b) => b.points - a.points || b.score - a.score);
        const best7 = showBest7 ? sortedByPoints.slice(0, 7) : sortedByPoints;

        const totalPoints = best7.reduce((a, b) => a + b.points, 0);
        const totalScore = best7.reduce((a, b) => a + b.score, 0);
        const avgScore = best7.length > 0 ? totalScore / best7.length : 0;
        const meanGrade = getGrade(avgScore);

        return {
            student,
            subjectResults,
            best7,
            totalPoints,
            totalScore,
            avgScore,
            meanGrade,
            subjectCount: subjectResults.length,
        };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalScore - a.totalScore);

    // Assign ranks
    meritData.forEach((row, i) => {
        if (i === 0 || row.totalPoints !== meritData[i - 1].totalPoints || row.totalScore !== meritData[i - 1].totalScore) {
            (row as any).rank = i + 1;
        } else {
            (row as any).rank = (meritData[i - 1] as any).rank;
        }
    });

    // Filter by grade
    const filtered = filterGrade ? meritData.filter(r => r.meanGrade.grade === filterGrade) : meritData;

    // Grade distribution
    const gradeDist: Record<string, number> = {};
    grading.forEach(g => { gradeDist[g.grade] = 0; });
    meritData.forEach(r => { gradeDist[r.meanGrade.grade] = (gradeDist[r.meanGrade.grade] || 0) + 1; });

    const isReady = selForm && selTerm && selExamType;

    const exportMeritList = () => {
        const headers = ['Rank', 'Adm No', 'Name', 'Stream', 'Subjects', showBest7 ? 'Best 7 Points' : 'Total Points', 'Avg Score', 'Mean Grade'];
        const rows = filtered.map(row => [
            (row as any).rank,
            row.student.admission_no || row.student.admission_number,
            `${row.student.first_name} ${row.student.last_name}`,
            streams.find(s => s.id === row.student.stream_id)?.stream_name || '-',
            row.subjectCount,
            row.totalPoints,
            row.avgScore.toFixed(1),
            row.meanGrade.grade,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `merit_list_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Merit list exported ✅');
    };

    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Merit List...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiAward className="text-amber-500" /> Merit List</h1>
                    <p className="text-sm text-gray-500 mt-1">Ranked student performance with KCSE-style best 7 subjects calculation</p>
                </div>
                {isReady && filtered.length > 0 && (
                    <button onClick={exportMeritList} className="btn-outline text-sm flex items-center gap-1.5"><FiDownload size={14} /> Export CSV</button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div><label className="lbl">Form *</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="select-modern w-full text-sm"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Term *</label><select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm"><option value="">Select Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                    <div><label className="lbl">Exam Type *</label><select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    <div><label className="lbl">Filter Grade</label><select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="select-modern w-full text-sm"><option value="">All Grades</option>{grading.map(g => <option key={g.grade} value={g.grade}>{g.grade} ({g.remarks})</option>)}</select></div>
                    <div>
                        <label className="lbl">Method</label>
                        <div className="flex items-center gap-2 mt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={showBest7} onChange={e => setShowBest7(e.target.checked)} className="w-4 h-4 rounded" />
                                <span className="text-xs font-semibold text-gray-600">Best 7 Only</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {!isReady ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">🏆</span>
                    <p className="font-semibold text-lg">Select Form, Term & Exam Type</p>
                </div>
            ) : loadingMarks ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">📊</span><p className="font-semibold">No data found</p>
                </div>
            ) : (
                <>
                    {/* Grade Distribution */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Grade Distribution</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(gradeDist).filter(([, v]) => v > 0).map(([grade, count]) => (
                                <div key={grade} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200" 
                                    style={{ background: (gradeColors[grade] || '#94a3b8') + '15' }}>
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white font-bold text-[10px]"
                                        style={{ background: gradeColors[grade] || '#94a3b8' }}>{grade}</span>
                                    <span className="text-sm font-bold text-gray-700">{count}</span>
                                    <span className="text-[10px] text-gray-400">({meritData.length > 0 ? ((count / meritData.length) * 100).toFixed(0) : 0}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top 3 Podium */}
                    {filtered.length >= 3 && (
                        <div className="grid grid-cols-3 gap-4">
                            {[filtered[1], filtered[0], filtered[2]].map((row, podiumIdx) => {
                                const position = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                                const colors = { 1: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '#fbbf24', icon: '🥇' }, 2: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', border: '#94a3b8', icon: '🥈' }, 3: { bg: 'linear-gradient(135deg, #cd7f32, #b8860b)', border: '#cd7f32', icon: '🥉' } };
                                const c = colors[position as 1 | 2 | 3];
                                return (
                                    <div key={row.student.id} className={`rounded-2xl border-2 p-5 text-center ${position === 1 ? 'transform sm:-translate-y-2' : ''}`} style={{ borderColor: c.border }}>
                                        <span className="text-3xl block mb-2">{c.icon}</span>
                                        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xl mb-2" style={{ background: c.bg }}>{position}</div>
                                        <p className="font-bold text-gray-800 text-sm">{row.student.first_name} {row.student.last_name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{row.student.admission_no || row.student.admission_number}</p>
                                        <div className="flex items-center justify-center gap-3 mt-3">
                                            <div><p className="text-xs text-gray-400">Points</p><p className="text-xl font-extrabold text-gray-800">{row.totalPoints}</p></div>
                                            <div className="w-px h-8 bg-gray-200" />
                                            <div><p className="text-xs text-gray-400">Avg</p><p className="text-xl font-extrabold text-gray-800">{row.avgScore.toFixed(1)}%</p></div>
                                            <div className="w-px h-8 bg-gray-200" />
                                            <div><p className="text-xs text-gray-400">Grade</p>
                                                <span className="inline-flex items-center justify-center w-9 h-8 rounded-lg text-white font-bold text-sm mt-0.5" style={{ background: gradeColors[row.meanGrade.grade] || '#94a3b8' }}>{row.meanGrade.grade}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Merit Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-amber-50 to-yellow-50">
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-16">Rank</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-24">Adm No</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 min-w-[180px]">Student Name</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-20">Stream</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-16">Subj</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-20">{showBest7 ? 'B7 Pts' : 'Points'}</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-20">Avg Score</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-20">Grade</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row, i) => (
                                        <tr key={row.student.id} className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${i < 3 ? 'bg-amber-50/30' : i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                                    (row as any).rank <= 3 ? 'text-white' : 'text-gray-600 bg-gray-100'
                                                }`} style={(row as any).rank <= 3 ? { background: (row as any).rank === 1 ? '#f59e0b' : (row as any).rank === 2 ? '#94a3b8' : '#cd7f32' } : {}}>
                                                    {(row as any).rank}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm font-bold text-blue-600">{row.student.admission_no || row.student.admission_number}</td>
                                            <td className="px-3 py-3 text-sm font-semibold text-gray-800">{row.student.first_name} {row.student.last_name}</td>
                                            <td className="px-3 py-3 text-center text-xs text-gray-500">{getStreamName(row.student.stream_id)}</td>
                                            <td className="px-3 py-3 text-center text-sm font-medium text-gray-600">{row.subjectCount}</td>
                                            <td className="px-3 py-3 text-center text-sm font-extrabold text-gray-800">{row.totalPoints}</td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-purple-600">{row.avgScore.toFixed(1)}%</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-white font-bold text-sm"
                                                    style={{ background: gradeColors[row.meanGrade.grade] || '#94a3b8' }}>{row.meanGrade.grade}</span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-500">{row.meanGrade.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
                            <span>Showing {filtered.length} of {meritData.length} students</span>
                            <span className="font-semibold">{showBest7 ? 'Best 7 Subjects' : 'All Subjects'} • {selExamType}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

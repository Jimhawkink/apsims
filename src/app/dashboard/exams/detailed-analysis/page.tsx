'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiBarChart2, FiTrendingUp, FiPieChart, FiAward, FiUsers, FiTarget, FiAlertTriangle, FiCheckCircle, FiBookOpen } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

const gradeColors: Record<string, string> = {
    'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
    'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444', 'D-': '#dc2626', 'E': '#991b1b',
};

export default function DetailedAnalysisPage() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'grade_dist' | 'subject_comp' | 'longitudinal' | 'stream_comp' | 'teacher_perf' | 'kcse_pred' | 'at_risk'>('grade_dist');
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [selSubject, setSelSubject] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [gRes, mRes, sRes, subRes, etRes, tRes, fRes, stRes, tchRes, stchrRes, attRes] = await Promise.all([
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_exam_types').select('*').eq('is_active', true),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active'),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_attendance').select('*'),
        ]);
        setGrading(gRes.data || []);
        setMarks(mRes.data || []);
        setStudents(sRes.data || []);
        setSubjects(subRes.data || []);
        setExamTypes(etRes.data || []);
        setTerms(tRes.data || []);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setTeachers(tchRes.data || []);
        setSubjectTeachers(stchrRes.data || []);
        setAttendance(attRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const termMarks = marks.filter(m => !selTerm || String(m.term_id) === selTerm);
    const formMarks = termMarks.filter(m => {
        if (!selForm) return true;
        const student = students.find(s => s.id === m.student_id);
        return student?.form_id === Number(selForm);
    });

    // ─── GRADE DISTRIBUTION ───
    const getGradeDistribution = () => {
        const dist: Record<string, number> = {};
        grading.forEach(g => { dist[g.grade] = 0; });
        const filtered = selSubject ? formMarks.filter(m => m.subject_id === Number(selSubject)) : formMarks;
        filtered.forEach(m => {
            const g = getGrade(Number(m.combined_score || m.score || 0));
            dist[g.grade] = (dist[g.grade] || 0) + 1;
        });
        return dist;
    };
    const gradeDistData = getGradeDistribution();

    // ─── SUBJECT COMPARISON ───
    const subjectAvgs = subjects.map(sub => {
        const subMarks = formMarks.filter(m => m.subject_id === sub.id);
        const avg = subMarks.length > 0 ? subMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0) / subMarks.length : 0;
        const passCount = subMarks.filter(m => Number(m.combined_score || m.score || 0) >= 30).length;
        return { name: sub.subject_name, avg, count: subMarks.length, passRate: subMarks.length > 0 ? (passCount / subMarks.length) * 100 : 0, failRate: subMarks.length > 0 ? ((subMarks.length - passCount) / subMarks.length) * 100 : 0 };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    // ─── LONGITUDINAL ───
    const getLongitudinalData = () => {
        if (!selSubject || !selForm) return { labels: [], datasets: [] };
        const subject = subjects.find(s => s.id === Number(selSubject));
        const formStudentIds = students.filter(s => s.form_id === Number(selForm)).map(s => s.id);
        const sortedTerms = [...terms].sort((a, b) => (a.year * 10 + a.term_number) - (b.year * 10 + b.term_number));
        const termAvgs = sortedTerms.map(t => {
            const tMarks = marks.filter(m => m.term_id === t.id && m.subject_id === Number(selSubject) && formStudentIds.includes(m.student_id));
            const avg = tMarks.length > 0 ? tMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0) / tMarks.length : null;
            return { term: t.term_name + ' ' + (t.academic_year || t.year), avg };
        }).filter(t => t.avg !== null);
        return {
            labels: termAvgs.map(t => t.term),
            datasets: [{ label: subject?.subject_name || 'Subject', data: termAvgs.map(t => Math.round(t.avg! * 10) / 10), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#3b82f6' }],
        };
    };

    // ─── STREAM COMPARISON ───
    const streamComparison = streams.map(stream => {
        const streamStudentIds = students.filter(s => s.stream_id === stream.id && (!selForm || s.form_id === Number(selForm))).map(s => s.id);
        const sMarks = formMarks.filter(m => streamStudentIds.includes(m.student_id));
        const avg = sMarks.length > 0 ? sMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0) / sMarks.length : 0;
        return { name: stream.stream_name, avg, count: sMarks.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    // ─── TEACHER PERFORMANCE ───
    const teacherPerformance = subjectTeachers.map(st => {
        const teacher = teachers.find(t => t.id === st.teacher_id);
        const subject = subjects.find(s => s.id === st.subject_id);
        const form = forms.find(f => f.id === st.form_id);
        const formStudentIds = students.filter(s => s.form_id === st.form_id).map(s => s.id);
        const tMarks = formMarks.filter(m => m.subject_id === st.subject_id && formStudentIds.includes(m.student_id));
        const avg = tMarks.length > 0 ? tMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0) / tMarks.length : 0;
        const passRate = tMarks.length > 0 ? tMarks.filter(m => Number(m.combined_score || m.score || 0) >= 30).length / tMarks.length * 100 : 0;
        return { teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown', subject: subject?.subject_name || 'Unknown', form: form?.form_name || 'Unknown', avg, count: tMarks.length, passRate };
    }).filter(t => t.count > 0).sort((a, b) => b.avg - a.avg);

    // ─── KCSE PREDICTION ───
    const getKCSEPredictions = () => {
        if (!selForm) return [];
        const formStudents = students.filter(s => s.form_id === Number(selForm));
        return formStudents.map(student => {
            const studentMarks = formMarks.filter(m => m.student_id === student.id);
            if (studentMarks.length === 0) return null;
            const subjectGrades: { subject_id: number; points: number; grade: string; }[] = [];
            for (const mark of studentMarks) {
                if (!subjectGrades.find(sg => sg.subject_id === mark.subject_id)) {
                    const score = Number(mark.combined_score || mark.score || 0);
                    const g = getGrade(score);
                    subjectGrades.push({ subject_id: mark.subject_id, points: g.points, grade: g.grade });
                }
            }
            const maths = subjectGrades.find(sg => { const sub = subjects.find(s => s.id === sg.subject_id); return sub?.subject_name?.toLowerCase().includes('math'); });
            const english = subjectGrades.find(sg => { const sub = subjects.find(s => s.id === sg.subject_id); return sub?.subject_name?.toLowerCase().includes('english'); });
            const others = subjectGrades.filter(sg => { const sub = subjects.find(s => s.id === sg.subject_id); return !sub?.subject_name?.toLowerCase().includes('math') && !sub?.subject_name?.toLowerCase().includes('english'); }).sort((a, b) => b.points - a.points).slice(0, 5);
            const compulsory = [maths, english].filter(Boolean) as typeof subjectGrades;
            const best7 = [...compulsory, ...others].slice(0, 7);
            const totalPoints = best7.reduce((s, g) => s + g.points, 0);
            const meanPoints = best7.length > 0 ? totalPoints / best7.length : 0;
            const predictedGrade = getGrade(meanPoints * 6.25);
            return { student, totalPoints, meanPoints: Math.round(meanPoints * 100) / 100, predictedGrade: predictedGrade.grade, subjectsCount: best7.length, topSubject: best7.sort((a, b) => b.points - a.points)[0], weakSubject: best7.sort((a, b) => a.points - b.points)[0] };
        }).filter(Boolean).sort((a: any, b: any) => b.meanPoints - a.meanPoints);
    };

    // ─── AT-RISK ───
    const getAtRiskStudents = () => {
        if (!selForm) return [];
        const formStudents = students.filter(s => s.form_id === Number(selForm));
        return formStudents.map(student => {
            const studentMarks = formMarks.filter(m => m.student_id === student.id);
            const avgScore = studentMarks.length > 0 ? studentMarks.reduce((a, m) => a + Number(m.combined_score || m.score || 0), 0) / studentMarks.length : 0;
            const failedSubjects = new Set(studentMarks.filter(m => Number(m.combined_score || m.score || 0) < 30).map(m => m.subject_id)).size;
            const studentAtt = attendance.filter(a => a.student_id === student.id);
            const absentDays = studentAtt.filter(a => a.status === 'Absent').length;
            const totalAttDays = studentAtt.length || 1;
            const attendanceRate = ((totalAttDays - absentDays) / totalAttDays) * 100;
            const riskFactors: string[] = [];
            if (avgScore < 40) riskFactors.push('Low mean score');
            if (failedSubjects >= 3) riskFactors.push(`${failedSubjects} subjects failed`);
            if (attendanceRate < 80) riskFactors.push('Poor attendance');
            const riskLevel = riskFactors.length >= 3 ? 'Critical' : riskFactors.length >= 2 ? 'High' : riskFactors.length >= 1 ? 'Medium' : 'Low';
            return { student, avgScore, failedSubjects, attendanceRate, riskFactors, riskLevel };
        }).filter(s => s.riskLevel !== 'Low').sort((a, b) => {
            const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2 };
            return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
        });
    };

    const tabs = [
        { key: 'grade_dist', label: 'Grade Distribution', icon: FiPieChart },
        { key: 'subject_comp', label: 'Subject Comparison', icon: FiBarChart2 },
        { key: 'longitudinal', label: 'Longitudinal Trend', icon: FiTrendingUp },
        { key: 'stream_comp', label: 'Stream Comparison', icon: FiUsers },
        { key: 'teacher_perf', label: 'Teacher Performance', icon: FiBookOpen },
        { key: 'kcse_pred', label: 'KCSE Prediction', icon: FiTarget },
        { key: 'at_risk', label: 'At-Risk Students', icon: FiAlertTriangle },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📊</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Detailed Analysis…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">📊 Detailed Exam Analysis</h1>
                    <p className="text-sm text-gray-500 mt-1">Grade distribution, longitudinal trends, KCSE prediction & at-risk detection</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Terms</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                    <select value={selForm} onChange={e => setSelForm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(t => { const Icon = t.icon; return (
                    <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? 'text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        style={tab === t.key ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                        <Icon size={14} /> {t.label}
                    </button>
                ); })}
            </div>

            {/* GRADE DISTRIBUTION */}
            {tab === 'grade_dist' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📊 Grade Distribution {selSubject ? `— ${subjects.find(s => s.id === Number(selSubject))?.subject_name}` : ''}</p></div>
                        <div className="p-5">
                            {Object.values(gradeDistData).some(v => v > 0) ? (
                                <div className="h-[300px] flex items-center justify-center">
                                    <Doughnut data={{ labels: Object.keys(gradeDistData), datasets: [{ data: Object.values(gradeDistData), backgroundColor: Object.keys(gradeDistData).map(g => gradeColors[g] || '#94a3b8'), borderWidth: 0, borderRadius: 4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 6, font: { size: 11, weight: 'bold' as const } } } }, cutout: '55%' }} />
                                </div>
                            ) : <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📈 Grade Count Breakdown</p></div>
                        <div className="p-5 space-y-2">
                            {Object.entries(gradeDistData).map(([grade, count]) => {
                                const total = Object.values(gradeDistData).reduce((s, v) => s + v, 0) || 1;
                                const pct = (count / total) * 100;
                                return (
                                    <div key={grade} className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: gradeColors[grade] || '#94a3b8' }}>{grade}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                            <div className="h-6 rounded-full flex items-center px-2 transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: gradeColors[grade] || '#94a3b8', opacity: 0.8 }}>
                                                {pct >= 8 && <span className="text-white text-[10px] font-bold">{pct.toFixed(0)}%</span>}
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* SUBJECT COMPARISON */}
            {tab === 'subject_comp' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest">Subject Performance Ranking</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Subject</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Mean</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Grade</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Entries</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Pass %</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Fail %</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Bar</th>
                            </tr></thead>
                            <tbody>
                                {subjectAvgs.map((s, i) => { const g = getGrade(s.avg); return (
                                    <tr key={s.name} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i+1}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{s.name}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{s.avg.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-9 h-7 rounded-md text-white font-bold text-xs" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span></td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{s.count}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-green-600">{s.passRate.toFixed(0)}%</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-red-500">{s.failRate.toFixed(0)}%</td>
                                        <td className="px-4 py-3"><div className="w-32 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${s.avg}%`, background: s.avg >= 50 ? '#22c55e' : s.avg >= 30 ? '#f59e0b' : '#ef4444' }} /></div></td>
                                    </tr>
                                ); })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* LONGITUDINAL */}
            {tab === 'longitudinal' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest">Longitudinal Performance Trend</h3><p className="text-xs text-gray-400 mt-1">Select a specific subject and form</p></div>
                    <div className="p-5">
                        {selSubject && selForm ? (
                            <div className="h-[350px]"><Line data={getLongitudinalData()} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'top' } } }} /></div>
                        ) : <div className="h-[350px] flex items-center justify-center text-gray-400 text-sm">Select a Form and Subject above</div>}
                    </div>
                </div>
            )}

            {/* STREAM COMPARISON */}
            {tab === 'stream_comp' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest">Stream Performance Comparison</h3></div>
                    <div className="p-5">
                        {streamComparison.length > 0 ? (
                            <div className="h-[300px]"><Bar data={{ labels: streamComparison.map(s => s.name), datasets: [{ label: 'Mean Score', data: streamComparison.map(s => Math.round(s.avg * 10) / 10), backgroundColor: streamComparison.map((_, i) => ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'][i % 5]), borderWidth: 0, borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /></div>
                        ) : <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No stream data</div>}
                    </div>
                </div>
            )}

            {/* TEACHER PERFORMANCE */}
            {tab === 'teacher_perf' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest">Teacher Performance Report</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Teacher</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Subject</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Form</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Mean</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Grade</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Pass %</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Rating</th>
                            </tr></thead>
                            <tbody>
                                {teacherPerformance.map((t, i) => { const g = getGrade(t.avg); const rating = t.avg >= 70 ? 'Excellent' : t.avg >= 50 ? 'Good' : t.avg >= 30 ? 'Needs Improvement' : 'Concerning'; const rc = t.avg >= 70 ? '#059669' : t.avg >= 50 ? '#3b82f6' : t.avg >= 30 ? '#f59e0b' : '#ef4444'; return (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t.teacherName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{t.subject}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{t.form}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{t.avg.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-9 h-7 rounded-md text-white font-bold text-xs" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span></td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-green-600">{t.passRate.toFixed(0)}%</td>
                                        <td className="px-4 py-3"><span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: rc }}>{rating}</span></td>
                                    </tr>
                                ); })}
                                {teacherPerformance.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No teacher-subject assignments found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* KCSE PREDICTION */}
            {tab === 'kcse_pred' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiTarget className="text-red-500" /> KCSE Grade Prediction</h3><p className="text-xs text-gray-400 mt-1">Best 7 subjects (Maths + English compulsory + best 5 others)</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Student</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Mean Pts</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Predicted</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Subj.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Strongest</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Weakest</th>
                            </tr></thead>
                            <tbody>
                                {getKCSEPredictions().map((pred: any, i: number) => (
                                    <tr key={pred.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i+1}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{pred.student.first_name} {pred.student.last_name}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{pred.meanPoints}</td>
                                        <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-white font-bold text-sm" style={{ background: gradeColors[pred.predictedGrade] || '#94a3b8' }}>{pred.predictedGrade}</span></td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">{pred.subjectsCount}/7</td>
                                        <td className="px-4 py-3 text-sm text-green-600 font-medium">{pred.topSubject ? `${subjects.find((s:any) => s.id === pred.topSubject.subject_id)?.subject_name || 'N/A'} (${pred.topSubject.grade})` : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-red-500 font-medium">{pred.weakSubject ? `${subjects.find((s:any) => s.id === pred.weakSubject.subject_id)?.subject_name || 'N/A'} (${pred.weakSubject.grade})` : '-'}</td>
                                    </tr>
                                ))}
                                {getKCSEPredictions().length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Select a form to view KCSE predictions</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* AT-RISK */}
            {tab === 'at_risk' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiAlertTriangle className="text-amber-500" /> At-Risk Student Early Warning</h3><p className="text-xs text-gray-400 mt-1">Flagged by low scores, multiple failures, or poor attendance</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Student</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Mean</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Failed</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Attend.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Risk Factors</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Level</th>
                            </tr></thead>
                            <tbody>
                                {getAtRiskStudents().map((s: any) => { const rc: Record<string,string> = { Critical: '#dc2626', High: '#ef4444', Medium: '#f59e0b' }; return (
                                    <tr key={s.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{s.student.first_name} {s.student.last_name}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{s.avgScore.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-red-500">{s.failedSubjects}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-600">{s.attendanceRate.toFixed(0)}%</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{s.riskFactors.join(', ')}</td>
                                        <td className="px-4 py-3 text-center"><span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: rc[s.riskLevel] || '#94a3b8' }}>{s.riskLevel}</span></td>
                                    </tr>
                                ); })}
                                {getAtRiskStudents().length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">{selForm ? 'No at-risk students — great!' : 'Select a form to detect at-risk students'}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

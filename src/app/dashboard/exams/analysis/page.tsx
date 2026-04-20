'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiBarChart2, FiTrendingUp, FiUsers, FiFilter } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function AnalysisPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [allMarks, setAllMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [selStudent, setSelStudent] = useState('');
    const [tab, setTab] = useState<'overview' | 'subjects' | 'streams' | 'trends' | 'individual'>('overview');

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'];

    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr, am] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_exam_marks').select('*'),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setGrading(gr.data || []);
        setAllMarks(am.data || []);
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
        .filter(s => !selForm || String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream);

    const termMarks = allMarks.filter(m => {
        if (selTerm && String(m.term_id) !== selTerm) return false;
        if (selExamType && m.exam_type !== selExamType) return false;
        const studentIds = classStudents.map(s => s.id);
        return studentIds.includes(m.student_id);
    });

    // Grade Distribution Data
    const gradeDist: Record<string, number> = {};
    grading.forEach(g => { gradeDist[g.grade] = 0; });
    termMarks.forEach(m => { const g = getGrade(Number(m.score)); gradeDist[g.grade] = (gradeDist[g.grade] || 0) + 1; });

    const gradeDistChart = {
        labels: Object.keys(gradeDist),
        datasets: [{ data: Object.values(gradeDist), backgroundColor: Object.keys(gradeDist).map(g => gradeColors[g] || '#94a3b8'), borderWidth: 0, borderRadius: 6 }],
    };

    // Subject Performance
    const subjectPerf = subjects.map(sub => {
        const sm = termMarks.filter(m => m.subject_id === sub.id);
        const avg = sm.length > 0 ? sm.reduce((a, m) => a + Number(m.score), 0) / sm.length : 0;
        const passRate = sm.length > 0 ? (sm.filter(m => Number(m.score) >= 50).length / sm.length * 100) : 0;
        return { ...sub, avg, passRate, count: sm.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    const subjectChartData = {
        labels: subjectPerf.map(s => s.subject_code || s.subject_name.substring(0, 8)),
        datasets: [{
            label: 'Average Score',
            data: subjectPerf.map(s => Math.round(s.avg * 10) / 10),
            backgroundColor: subjectPerf.map((s, i) => chartColors[i % chartColors.length]),
            borderWidth: 0, borderRadius: 8,
        }],
    };

    const passRateChart = {
        labels: subjectPerf.map(s => s.subject_code || s.subject_name.substring(0, 8)),
        datasets: [{
            label: 'Pass Rate (%)',
            data: subjectPerf.map(s => Math.round(s.passRate * 10) / 10),
            backgroundColor: subjectPerf.map(s => s.passRate >= 70 ? '#22c55e' : s.passRate >= 50 ? '#3b82f6' : s.passRate >= 30 ? '#f59e0b' : '#ef4444'),
            borderWidth: 0, borderRadius: 8,
        }],
    };

    // Stream Comparison
    const streamPerf = streams.map(stream => {
        const streamStudentIds = students.filter(s => s.stream_id === stream.id && (!selForm || String(s.form_id) === selForm)).map(s => s.id);
        const sm = termMarks.filter(m => streamStudentIds.includes(m.student_id));
        const avg = sm.length > 0 ? sm.reduce((a, m) => a + Number(m.score), 0) / sm.length : 0;
        return { ...stream, avg, count: sm.length };
    }).filter(s => s.count > 0);

    const streamChartData = {
        labels: streamPerf.map(s => s.stream_name),
        datasets: [{
            label: 'Stream Average',
            data: streamPerf.map(s => Math.round(s.avg * 10) / 10),
            backgroundColor: streamPerf.map((_, i) => chartColors[i % chartColors.length]),
            borderWidth: 0, borderRadius: 8,
        }],
    };

    // Trend Data (across terms)
    const trendData = terms.slice(0, 6).reverse().map(term => {
        const tm = allMarks.filter(m => {
            if (String(m.term_id) !== String(term.id)) return false;
            if (selExamType && m.exam_type !== selExamType) return false;
            const sIds = classStudents.map(s => s.id);
            return sIds.includes(m.student_id);
        });
        const avg = tm.length > 0 ? tm.reduce((a, m) => a + Number(m.score), 0) / tm.length : 0;
        return { term: term.term_name + (term.academic_year ? ` ${term.academic_year}` : ''), avg, count: tm.length };
    }).filter(t => t.count > 0);

    const trendChartData = {
        labels: trendData.map(t => t.term),
        datasets: [{
            label: 'Mean Score',
            data: trendData.map(t => Math.round(t.avg * 10) / 10),
            borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#3b82f6', pointBorderColor: '#fff', pointBorderWidth: 2,
        }],
    };

    // Individual student data
    const individualStudent = selStudent ? students.find(s => s.id === Number(selStudent)) : null;
    const individualMarks = selStudent ? allMarks.filter(m => m.student_id === Number(selStudent) && m.exam_type === selExamType) : [];
    const individualPerTerm = terms.slice(0, 6).reverse().map(term => {
        const tm = individualMarks.filter(m => String(m.term_id) === String(term.id));
        const avg = tm.length > 0 ? tm.reduce((a, m) => a + Number(m.score), 0) / tm.length : 0;
        return { term: term.term_name, avg, count: tm.length };
    }).filter(t => t.count > 0);

    const individualTrend = {
        labels: individualPerTerm.map(t => t.term),
        datasets: [{
            label: individualStudent ? `${individualStudent.first_name} ${individualStudent.last_name}` : 'Student',
            data: individualPerTerm.map(t => Math.round(t.avg * 10) / 10),
            borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#8b5cf6', pointBorderColor: '#fff', pointBorderWidth: 2,
        }],
    };

    const individualSubjects = subjects.map(sub => {
        const m = individualMarks.find(mk => mk.subject_id === sub.id && (selTerm ? String(mk.term_id) === selTerm : true));
        return m ? { subject: sub.subject_name, score: Number(m.score), grade: getGrade(Number(m.score)) } : null;
    }).filter(Boolean) as { subject: string; score: number; grade: GradeEntry }[];

    // Top/Bottom Performers
    const studentAvgs = classStudents.map(student => {
        const sm = termMarks.filter(m => m.student_id === student.id);
        const avg = sm.length > 0 ? sm.reduce((a, m) => a + Number(m.score), 0) / sm.length : 0;
        return { student, avg, count: sm.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    const topPerformers = studentAvgs.slice(0, 5);
    const bottomPerformers = studentAvgs.slice(-5).reverse();

    const overallAvg = termMarks.length > 0 ? termMarks.reduce((a, m) => a + Number(m.score), 0) / termMarks.length : 0;

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Analysis...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiBarChart2 className="text-red-500" /> Performance Analysis</h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive analytics — Grades, subjects, streams, trends & individual tracking</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div><label className="lbl">Form</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="select-modern w-full text-sm"><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Term</label><select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm"><option value="">All Terms</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                    <div><label className="lbl">Exam Type</label><select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    {tab === 'individual' && (
                        <div><label className="lbl">Student</label><select value={selStudent} onChange={e => setSelStudent(e.target.value)} className="select-modern w-full text-sm"><option value="">Select Student</option>{classStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {[
                    { key: 'overview', label: 'Overview', icon: '📊' },
                    { key: 'subjects', label: 'Subject Analysis', icon: '📚' },
                    { key: 'streams', label: 'Stream Comparison', icon: '🏫' },
                    { key: 'trends', label: 'Trend Analysis', icon: '📈' },
                    { key: 'individual', label: 'Student Tracker', icon: '👤' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${tab === t.key ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Marks', value: termMarks.length, color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                            { label: 'Mean Score', value: overallAvg > 0 ? `${overallAvg.toFixed(1)}%` : '--', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)' },
                            { label: 'Mean Grade', value: termMarks.length > 0 ? getGrade(overallAvg).grade : '--', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
                            { label: 'Pass Rate', value: termMarks.length > 0 ? `${(termMarks.filter(m => Number(m.score) >= 50).length / termMarks.length * 100).toFixed(0)}%` : '--', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                        ].map((s, i) => (
                            <div key={i} className="rounded-2xl p-5 text-white shadow-lg" style={{ background: s.bg }}>
                                <p className="text-xs font-semibold opacity-80 uppercase">{s.label}</p>
                                <p className="text-3xl font-extrabold mt-2">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Grade Distribution</h3></div>
                            <div className="p-5 h-[300px] flex items-center justify-center">
                                {termMarks.length > 0 ? <Doughnut data={gradeDistChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } }, cutout: '60%' }} /> : <span className="text-gray-400 text-sm">No data</span>}
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Top 5 Performers</h3></div>
                            <div className="p-4">
                                {topPerformers.length > 0 ? topPerformers.map((s, i) => {
                                    const g = getGrade(s.avg);
                                    return (
                                        <div key={s.student.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${i < 3 ? 'text-white' : 'text-gray-600 bg-gray-100'}`}
                                                style={i < 3 ? { background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32' } : {}}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800">{s.student.first_name} {s.student.last_name}</p>
                                                <p className="text-[10px] text-gray-400">{s.student.admission_no || s.student.admission_number}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-800">{s.avg.toFixed(1)}%</p>
                                                <span className="inline-flex items-center justify-center w-7 h-5 rounded text-white font-bold text-[9px]" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>
                                            </div>
                                        </div>
                                    );
                                }) : <p className="text-gray-400 text-sm text-center py-8">No data</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Subjects Tab */}
            {tab === 'subjects' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Average Score by Subject</h3></div>
                            <div className="p-5 h-[350px]">
                                {subjectPerf.length > 0 ? <Bar data={subjectChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 100, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Pass Rate by Subject (≥50%)</h3></div>
                            <div className="p-5 h-[350px]">
                                {subjectPerf.length > 0 ? <Bar data={passRateChart} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 100, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>}
                            </div>
                        </div>
                    </div>

                    {/* Subject Detail Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Subject Performance Summary</h3></div>
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Entries</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Avg Score</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Grade</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Pass Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Performance</th>
                            </tr></thead>
                            <tbody>
                                {subjectPerf.map((s, i) => {
                                    const g = getGrade(s.avg);
                                    return (
                                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{s.subject_name}</td>
                                            <td className="px-4 py-2.5 text-center text-sm text-gray-600">{s.count}</td>
                                            <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-800">{s.avg.toFixed(1)}%</td>
                                            <td className="px-4 py-2.5 text-center"><span className="inline-flex items-center justify-center w-8 h-6 rounded text-white font-bold text-xs" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span></td>
                                            <td className="px-4 py-2.5 text-center text-sm font-semibold" style={{ color: s.passRate >= 70 ? '#059669' : s.passRate >= 50 ? '#3b82f6' : '#ef4444' }}>{s.passRate.toFixed(0)}%</td>
                                            <td className="px-4 py-2.5"><div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(s.avg, 100)}%`, background: gradeColors[g.grade] || '#94a3b8' }} /></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Streams Tab */}
            {tab === 'streams' && (
                <div className="space-y-5">
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Stream Comparison — Average Scores</h3></div>
                        <div className="p-5 h-[350px]">
                            {streamPerf.length > 0 ? <Bar data={streamChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">No stream data</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {streamPerf.map((s, i) => {
                            const g = getGrade(s.avg);
                            return (
                                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-bold text-gray-800">{s.stream_name}</p>
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-xs" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>
                                    </div>
                                    <p className="text-2xl font-extrabold text-gray-800">{s.avg.toFixed(1)}%</p>
                                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(s.avg, 100)}%`, background: chartColors[i % chartColors.length] }} /></div>
                                    <p className="text-[10px] text-gray-400 mt-1.5">{s.count} mark entries</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Trends Tab */}
            {tab === 'trends' && (
                <div className="space-y-5">
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Mean Score Trend Across Terms ({selExamType})</h3></div>
                        <div className="p-5 h-[400px]">
                            {trendData.length > 1 ? <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need at least 2 terms of data for trend analysis</div>}
                        </div>
                    </div>

                    {/* Exam Comparison */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Exam Type Comparison (Current Term)</h3></div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {examTypes.map(et => {
                                    const etMarks = allMarks.filter(m => {
                                        if (selTerm && String(m.term_id) !== selTerm) return false;
                                        if (m.exam_type !== et) return false;
                                        return classStudents.map(s => s.id).includes(m.student_id);
                                    });
                                    const avg = etMarks.length > 0 ? etMarks.reduce((a, m) => a + Number(m.score), 0) / etMarks.length : 0;
                                    const g = getGrade(avg);
                                    return (
                                        <div key={et} className={`border rounded-xl p-3 text-center transition-all ${et === selExamType ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-md'}`}>
                                            <p className="text-xs font-bold text-gray-500 uppercase">{et}</p>
                                            <p className="text-xl font-extrabold text-gray-800 mt-1">{avg > 0 ? avg.toFixed(1) : '--'}%</p>
                                            {avg > 0 && <span className="inline-flex items-center justify-center w-7 h-5 rounded text-white font-bold text-[9px] mt-1" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>}
                                            <p className="text-[10px] text-gray-400 mt-1">{etMarks.length} entries</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Tab */}
            {tab === 'individual' && (
                <div className="space-y-5">
                    {!selStudent ? (
                        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">👤</span>
                            <p className="font-semibold text-lg">Select a student to view individual performance</p>
                        </div>
                    ) : (
                        <>
                            {/* Student Header */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                                    {individualStudent?.first_name?.charAt(0)}{individualStudent?.last_name?.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{individualStudent?.first_name} {individualStudent?.last_name}</h2>
                                    <p className="text-sm text-gray-500">{individualStudent?.admission_no || individualStudent?.admission_number} • {forms.find(f => f.id === individualStudent?.form_id)?.form_name} {streams.find(s => s.id === individualStudent?.stream_id)?.stream_name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Performance Trend */}
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Performance Trend</h3></div>
                                    <div className="p-5 h-[280px]">
                                        {individualPerTerm.length > 1 ? <Line data={individualTrend} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Need 2+ terms</div>}
                                    </div>
                                </div>

                                {/* Subject Breakdown */}
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">Subject Scores</h3></div>
                                    <div className="p-4 max-h-[340px] overflow-y-auto">
                                        {individualSubjects.length > 0 ? individualSubjects.sort((a, b) => b.score - a.score).map(s => (
                                            <div key={s.subject} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                                                <span className="text-sm font-semibold text-gray-800 w-32 truncate">{s.subject}</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full" style={{ width: `${s.score}%`, background: gradeColors[s.grade.grade] || '#94a3b8' }} /></div>
                                                <span className="text-sm font-bold text-gray-800 w-12 text-right">{s.score}%</span>
                                                <span className="inline-flex items-center justify-center w-7 h-5 rounded text-white font-bold text-[9px]" style={{ background: gradeColors[s.grade.grade] || '#94a3b8' }}>{s.grade.grade}</span>
                                            </div>
                                        )) : <p className="text-gray-400 text-sm text-center py-8">No marks found</p>}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

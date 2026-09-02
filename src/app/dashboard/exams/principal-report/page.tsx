'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPrinter, FiDownload, FiRefreshCw, FiTrendingUp, FiTrendingDown,
    FiAward, FiAlertTriangle, FiUsers, FiBook, FiBarChart2, FiCheckCircle,
    FiStar, FiTarget, FiZap, FiGrid, FiShield,
} from 'react-icons/fi';
import { HiAcademicCap, HiSparkles, HiDocumentReport } from 'react-icons/hi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

/* ─── GRADE SCALE ─── */
const GRADE_SCALE = [
    { min: 75, grade: 'A',  pts: 12, color: '#059669' },
    { min: 70, grade: 'A-', pts: 11, color: '#10b981' },
    { min: 65, grade: 'B+', pts: 10, color: '#0891b2' },
    { min: 60, grade: 'B',  pts:  9, color: '#2563eb' },
    { min: 55, grade: 'B-', pts:  8, color: '#4f46e5' },
    { min: 50, grade: 'C+', pts:  7, color: '#7c3aed' },
    { min: 45, grade: 'C',  pts:  6, color: '#d97706' },
    { min: 40, grade: 'C-', pts:  5, color: '#f59e0b' },
    { min: 35, grade: 'D+', pts:  4, color: '#ea580c' },
    { min: 30, grade: 'D',  pts:  3, color: '#dc2626' },
    { min: 25, grade: 'D-', pts:  2, color: '#b91c1c' },
    { min:  0, grade: 'E',  pts:  1, color: '#7f1d1d' },
];
const grd = (s: number) => GRADE_SCALE.find(g => s >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
const pct = (a: number, b: number) => b > 0 ? parseFloat((a / b * 100).toFixed(1)) : 0;
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

function GradePill({ grade, size = 'sm' }: { grade: string; size?: 'xs' | 'sm' | 'md' }) {
    const g = GRADE_SCALE.find(gs => gs.grade === grade);
    const sz = { xs: 'text-[9px] px-1.5 py-0.5', sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-3 py-1' }[size];
    return <span className={`${sz} font-black rounded-lg inline-block`} style={{ background: `${g?.color}20`, color: g?.color || '#94a3b8', border: `1px solid ${g?.color || '#94a3b8'}30` }}>{grade}</span>;
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
    const pct = Math.min((score / max) * 100, 100);
    const g = grd(score);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: g.color }} />
            </div>
            <span className="text-xs font-black w-10 text-right tabular-nums" style={{ color: g.color }}>{score.toFixed(1)}%</span>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export default function PrincipalReportPage() {
    const printRef = useRef<HTMLDivElement>(null);

    /* ─── State ─── */
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [terms, setTerms]         = useState<any[]>([]);
    const [forms, setForms]         = useState<any[]>([]);
    const [streams, setStreams]     = useState<any[]>([]);
    const [subjects, setSubjects]   = useState<any[]>([]);
    const [students, setStudents]   = useState<any[]>([]);
    const [teachers, setTeachers]   = useState<any[]>([]);
    const [marks, setMarks]         = useState<any[]>([]);
    const [allMarks, setAllMarks]   = useState<any[]>([]);
    const [subTeachers, setSubTeachers] = useState<any[]>([]);
    const [discipline, setDiscipline]   = useState<any[]>([]);
    const [attendance, setAttendance]   = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo]   = useState<any>(null);

    const [selTerm, setSelTerm]         = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [showReport, setShowReport]   = useState(false);
    const [activeSection, setActiveSection] = useState<string>('executive');

    const EXAM_TYPES = ['CAT 1','CAT 2','Mid-Term','End-Term','Mock','Pre-Mock','Trial'];

    /* ─── FETCH BASE ─── */
    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [tRes, fRes, stRes, subRes, studRes, tchRes, stRes2, discRes, attRes, schoolRes] = await Promise.all([
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,gender').eq('status', 'Active').order('first_name'),
            supabase.from('school_teachers').select('id,first_name,last_name,tsc_number').order('first_name'),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_discipline_records').select('*').order('incident_date', { ascending: false }),
            supabase.from('school_attendance').select('student_id,status,attendance_date').order('attendance_date', { ascending: false }).limit(5000),
            supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        ]);
        setTerms(tRes.data || []);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(studRes.data || []);
        setTeachers(tchRes.data || []);
        setSubTeachers(stRes2.data || []);
        setDiscipline(discRes.data || []);
        setAttendance(attRes.data || []);
        setSchoolInfo(schoolRes.data);
        if ((tRes.data || []).length > 0) setSelTerm(String((tRes.data as any[])[0].id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchBase(); }, []);

    /* ─── GENERATE REPORT ─── */
    const generateReport = useCallback(async () => {
        if (!selTerm) { toast.error('Select a term'); return; }
        setGenerating(true);
        const { data: termMarks } = await supabase
            .from('school_exam_marks')
            .select('*')
            .eq('term_id', Number(selTerm))
            .eq('exam_type', selExamType);
        const { data: prevTermMarks } = await Promise.resolve(
            terms.length > 1
                ? supabase.from('school_exam_marks').select('*').eq('term_id', terms[1]?.id).eq('exam_type', selExamType)
                : { data: [] }
        );
        setMarks(termMarks || []);
        setAllMarks(prevTermMarks || []);
        setShowReport(true);
        setGenerating(false);
        toast.success('📊 Report generated!');
    }, [selTerm, selExamType, terms]);

    /* ─── HELPERS ─── */
    const getTerm    = () => terms.find(t => String(t.id) === selTerm);
    const getPrevTerm = () => terms[1];
    const getForm    = (id: any) => forms.find(f => f.id === id)?.form_name || '—';
    const getStream  = (id: any) => streams.find(s => s.id === id)?.stream_name || '—';
    const getSub     = (id: any) => subjects.find(s => s.id === id);
    const getTeacher = (id: any) => teachers.find(t => t.id === id);

    /* ─── COMPUTED ─── */
    // Overall stats
    const scores       = marks.map(m => Number(m.score));
    const schoolAvg    = avg(scores);
    const passCount    = scores.filter(s => s >= 50).length;
    const passRate     = pct(passCount, scores.length);
    const aRate        = pct(scores.filter(s => s >= 70).length, scores.length);
    const failRate     = pct(scores.filter(s => s < 40).length, scores.length);

    // Previous term
    const prevScores   = (allMarks || []).map((m: any) => Number(m.score));
    const prevAvg      = avg(prevScores);
    const avgChange    = schoolAvg - prevAvg;

    // Grade distribution
    const gradeDist = GRADE_SCALE.map(g => {
        const count = scores.filter(s => s >= g.min && (g.grade === 'E' || s < (GRADE_SCALE[GRADE_SCALE.indexOf(g) - 1]?.min ?? 200))).length;
        return { ...g, count };
    });

    // Per-form performance
    const formPerf = forms.map(f => {
        const formStudents = students.filter(s => s.form_id === f.id);
        const formMarks = marks.filter(m => formStudents.some(s => s.id === m.student_id));
        const formScores = formMarks.map(m => Number(m.score));
        const fAvg = avg(formScores);
        const fPass = pct(formScores.filter(s => s >= 50).length, formScores.length);
        const fPrev = (allMarks || []).filter((m: any) => formStudents.some(s => s.id === m.student_id));
        const fPrevAvg = avg(fPrev.map((m: any) => Number(m.score)));
        return { form: f, avg: fAvg, passRate: fPass, count: formStudents.length, markCount: formMarks.length, change: fAvg - fPrevAvg };
    }).filter(f => f.markCount > 0);

    // Per-subject performance
    const subjectPerf = subjects.map(sub => {
        const subMarks = marks.filter(m => m.subject_id === sub.id);
        if (subMarks.length === 0) return null;
        const subScores = subMarks.map(m => Number(m.score));
        const sAvg = avg(subScores);
        const sPass = pct(subScores.filter(s => s >= 50).length, subScores.length);
        const assignment = subTeachers.find(st => st.subject_id === sub.id);
        const teacher = assignment ? getTeacher(assignment.teacher_id) : null;
        const prevSubMarks = (allMarks || []).filter((m: any) => m.subject_id === sub.id);
        const prevAvgSub = avg(prevSubMarks.map((m: any) => Number(m.score)));
        return { sub, avg: sAvg, passRate: sPass, count: subMarks.length, teacher, change: sAvg - prevAvgSub };
    }).filter(Boolean) as any[];
    subjectPerf.sort((a, b) => b.avg - a.avg);

    // Stream performance
    const streamPerf = streams.map(str => {
        const strStudents = students.filter(s => s.stream_id === str.id);
        const strMarks = marks.filter(m => strStudents.some(s => s.id === m.student_id));
        if (strMarks.length === 0) return null;
        const strScores = strMarks.map(m => Number(m.score));
        const sAvg = avg(strScores);
        const sPass = pct(strScores.filter(s => s >= 50).length, strScores.length);
        const formId = strStudents[0]?.form_id;
        return { stream: str, avg: sAvg, passRate: sPass, count: strStudents.length, formId };
    }).filter(Boolean) as any[];
    streamPerf.sort((a, b) => b.avg - a.avg);

    // Teacher performance
    const teacherPerf = teachers.map(tch => {
        const assignments = subTeachers.filter((st: any) => st.teacher_id === tch.id);
        const tchMarks = marks.filter(m => assignments.some((a: any) => a.subject_id === m.subject_id));
        if (tchMarks.length === 0) return null;
        const tchScores = tchMarks.map(m => Number(m.score));
        const tAvg = avg(tchScores);
        const tPass = pct(tchScores.filter(s => s >= 50).length, tchScores.length);
        const tSubjects = [...new Set(assignments.map((a: any) => a.subject_id))].map(id => getSub(id)?.subject_name).filter(Boolean);
        return { teacher: tch, avg: tAvg, passRate: tPass, count: tchScores.length, subjects: tSubjects };
    }).filter(Boolean) as any[];
    teacherPerf.sort((a, b) => b.avg - a.avg);

    // Top 10 students
    const studentPerf = students.map(s => {
        const sMarks = marks.filter(m => m.student_id === s.id);
        if (sMarks.length === 0) return null;
        const sScores = sMarks.map(m => Number(m.score));
        const sAvg = avg(sScores);
        const best7Pts = [...sMarks].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 7).reduce((a, m) => a + (Number(m.points) || grd(Number(m.score)).pts), 0);
        const meanGrade = GRADE_SCALE.find(g => g.pts <= Math.round(best7Pts / Math.min(7, sMarks.length)))?.grade || 'E';
        return { student: s, avg: sAvg, best7Pts, meanGrade, count: sMarks.length };
    }).filter(Boolean) as any[];
    studentPerf.sort((a, b) => b.avg - a.avg);

    // At-risk students
    const atRiskStudents = studentPerf.filter(sp => sp.avg < 40);

    // Discipline stats
    const currentTermDisc = discipline.filter(d => {
        const termObj = getTerm();
        return termObj && d.incident_date >= (termObj.start_date || '2000-01-01');
    });

    // Attendance
    const attPresent = attendance.filter(a => a.status === 'Present').length;
    const attTotal   = attendance.length;
    const attRate    = pct(attPresent, attTotal);

    // Chart data
    const formChart = {
        labels: formPerf.map(f => f.form.form_name),
        datasets: [{
            label: 'Average %',
            data: formPerf.map(f => f.avg.toFixed(1)),
            backgroundColor: ['#6366f1','#0891b2','#059669','#f59e0b'].slice(0, formPerf.length),
            borderRadius: 8,
        }],
    };
    const subjectTopChart = {
        labels: subjectPerf.slice(0, 10).map(s => s.sub.subject_name.length > 12 ? s.sub.subject_name.slice(0, 12) + '…' : s.sub.subject_name),
        datasets: [{
            label: 'Avg %',
            data: subjectPerf.slice(0, 10).map(s => s.avg.toFixed(1)),
            backgroundColor: subjectPerf.slice(0, 10).map(s => `${grd(s.avg).color}cc`),
            borderRadius: 6,
        }],
    };
    const gradeChart = {
        labels: gradeDist.filter(g => g.count > 0).map(g => g.grade),
        datasets: [{
            data: gradeDist.filter(g => g.count > 0).map(g => g.count),
            backgroundColor: gradeDist.filter(g => g.count > 0).map(g => `${g.color}cc`),
        }],
    };

    const secBtn = (key: string, label: string, icon: any) => (
        <button onClick={() => setActiveSection(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${activeSection === key ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50'}`}>
            {icon} {label}
        </button>
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/>
        </div>
    );

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">
                            <HiDocumentReport size={24}/> Principal's Term Report Generator
                        </h1>
                        <p className="text-sm text-white/70 mt-1">
                            Auto-generated executive performance report ready for Board of Governors & Ministry inspection
                        </p>
                    </div>
                    {showReport && (
                        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow">
                            <FiPrinter size={12}/> Print Full Report
                        </button>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mt-5">
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Academic Term</p>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                            className="border-0 rounded-xl px-3 py-2 text-sm bg-white/15 text-white focus:ring-2 focus:ring-white/30 focus:outline-none backdrop-blur-sm min-w-[180px]">
                            <option value="">— Select Term —</option>
                            {terms.map(t => <option key={t.id} value={t.id} className="text-gray-800">{t.term_name} {t.year || ''}{t.is_current ? ' (Current)' : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Exam Type</p>
                        <select value={selExamType} onChange={e => setSelExamType(e.target.value)}
                            className="border-0 rounded-xl px-3 py-2 text-sm bg-white/15 text-white focus:ring-2 focus:ring-white/30 focus:outline-none backdrop-blur-sm">
                            {EXAM_TYPES.map(e => <option key={e} className="text-gray-800">{e}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={generateReport} disabled={generating || !selTerm}
                            className="px-6 py-2 rounded-xl text-sm font-black bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 shadow-lg transition">
                            {generating ? <><div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"/>Generating…</> : <><HiSparkles size={14}/>Generate Report</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ NO REPORT YET ═══ */}
            {!showReport && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <HiDocumentReport size={56} className="text-indigo-200 mx-auto mb-4"/>
                    <p className="text-lg font-black text-gray-400">Select a term and click "Generate Report"</p>
                    <p className="text-sm text-gray-300 mt-1">The full Principal's report will be created automatically from your academic data</p>
                </div>
            )}

            {/* ═══════════ FULL REPORT ═══════════ */}
            {showReport && (
                <div ref={printRef} className="space-y-6">
                    {/* Report Title */}
                    <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
                        <div className="h-2" style={{ background: 'linear-gradient(90deg,#1e1b4b,#4f46e5,#0891b2,#059669,#f59e0b,#ef4444)' }}/>
                        <div className="p-6 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {schoolInfo?.school_name || 'APSIMS School'} — Academic Performance Report
                            </p>
                            <h2 className="text-2xl font-black text-gray-800 mt-2">
                                {getTerm()?.term_name || '—'} {getTerm()?.year || ''} — {selExamType} Examination
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {secBtn('executive', 'Executive Summary', <HiSparkles size={11}/>)}
                        {secBtn('forms',     'Form Analysis',     <FiGrid size={11}/>)}
                        {secBtn('subjects',  'Subject Analysis',  <FiBook size={11}/>)}
                        {secBtn('streams',   'Stream Battle',     <FiBarChart2 size={11}/>)}
                        {secBtn('teachers',  'Teacher Performance', <FiUsers size={11}/>)}
                        {secBtn('students',  'Top & At-Risk',     <FiAward size={11}/>)}
                        {secBtn('welfare',   'Welfare & Conduct', <FiShield size={11}/>)}
                        {secBtn('narrative', 'AI Narrative',      <HiDocumentReport size={11}/>)}
                    </div>

                    {/* ══ EXECUTIVE SUMMARY ══ */}
                    {activeSection === 'executive' && (
                        <div className="space-y-4">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'School Average', val: `${schoolAvg.toFixed(1)}%`, sub: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}% vs prev`, color: grd(schoolAvg).color, icon: '📊', up: avgChange >= 0 },
                                    { label: 'Pass Rate', val: `${passRate}%`, sub: `${passCount} students passing`, color: passRate >= 50 ? '#059669' : '#ef4444', icon: '✅', up: passRate >= 50 },
                                    { label: 'A Grade Rate', val: `${aRate}%`, sub: `${scores.filter(s => s >= 70).length} A/A-`, color: '#6366f1', icon: '🏆', up: aRate > 10 },
                                    { label: 'Total Students', val: students.length, sub: `${marks.length} marks entered`, color: '#0891b2', icon: '👥', up: true },
                                ].map(k => (
                                    <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-2xl">{k.icon}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {k.up ? '↑' : '↓'}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: k.color }}>{k.val}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">{k.label}</p>
                                        <p className="text-[10px] text-gray-400">{k.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Charts row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Form-wise Average Score</p>
                                    {formPerf.length > 0 ? (
                                        <div style={{ height: 220 }}>
                                            <Bar data={formChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, x: { grid: { display: false } } } }}/>
                                        </div>
                                    ) : <p className="text-center text-gray-400 py-20 text-sm">No form data</p>}
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Grade Distribution</p>
                                    {gradeDist.some(g => g.count > 0) ? (
                                        <div style={{ height: 220 }}>
                                            <Doughnut data={gradeChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 8 } } } }}/>
                                        </div>
                                    ) : <p className="text-center text-gray-400 py-20 text-sm">No grade data</p>}
                                </div>
                            </div>

                            {/* Grade dist table */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Grade Distribution Table</p>
                                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                                    {gradeDist.map(g => (
                                        <div key={g.grade} className="text-center p-3 rounded-xl" style={{ background: `${g.color}15`, border: `1px solid ${g.color}30` }}>
                                            <p className="text-sm font-black" style={{ color: g.color }}>{g.grade}</p>
                                            <p className="text-lg font-black text-gray-800">{g.count}</p>
                                            <p className="text-[9px] text-gray-400">{pct(g.count, scores.length)}%</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ FORM ANALYSIS ══ */}
                    {activeSection === 'forms' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formPerf.map(f => {
                                    const formStudents = students.filter(s => s.form_id === f.form.id);
                                    const formMarks = marks.filter(m => formStudents.some(s => s.id === m.student_id));
                                    const formGradeDist = GRADE_SCALE.map(g => {
                                        const count = formMarks.filter(m => {
                                            const s = Number(m.score);
                                            const idx = GRADE_SCALE.indexOf(g);
                                            return s >= g.min && (idx === 0 || s < GRADE_SCALE[idx - 1].min);
                                        }).length;
                                        return { ...g, count };
                                    });
                                    const formStreams = streams.filter(st => formStudents.some(s => s.stream_id === st.id));
                                    return (
                                        <div key={f.form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="p-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                                <div>
                                                    <p className="font-black text-gray-800 text-lg">{f.form.form_name}</p>
                                                    <p className="text-xs text-gray-400">{f.count} students · {formStreams.length} stream(s)</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black" style={{ color: grd(f.avg).color }}>{f.avg.toFixed(1)}%</p>
                                                    <GradePill grade={grd(f.avg).grade}/>
                                                    {f.change !== 0 && <p className={`text-[10px] font-bold mt-0.5 ${f.change > 0 ? 'text-green-600' : 'text-red-500'}`}>{f.change > 0 ? '+' : ''}{f.change.toFixed(1)}% vs prev</p>}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {[
                                                        { l: 'Pass Rate', v: `${f.passRate}%`, c: f.passRate >= 50 ? '#059669' : '#ef4444' },
                                                        { l: 'Students', v: f.count, c: '#6366f1' },
                                                        { l: 'Avg Marks', v: f.markCount, c: '#0891b2' },
                                                    ].map(k => (
                                                        <div key={k.l} className="bg-gray-50 rounded-xl p-2 text-center">
                                                            <p className="text-base font-black" style={{ color: k.c }}>{k.v}</p>
                                                            <p className="text-[9px] text-gray-400 uppercase">{k.l}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Mini grade dist */}
                                                <div className="flex gap-1 mt-2">
                                                    {formGradeDist.filter(g => g.count > 0).map(g => (
                                                        <div key={g.grade} title={`${g.grade}: ${g.count}`} className="flex-1 text-center">
                                                            <div className="h-8 rounded-sm flex items-end justify-center" style={{ background: `${g.color}20` }}>
                                                                <div className="rounded-sm w-full" style={{ height: `${Math.max((g.count / Math.max(...formGradeDist.map(g => g.count))) * 100, 5)}%`, background: g.color }}/>
                                                            </div>
                                                            <p className="text-[8px] font-black mt-0.5" style={{ color: g.color }}>{g.grade}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ══ SUBJECT ANALYSIS ══ */}
                    {activeSection === 'subjects' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <p className="font-black text-gray-800">Subject Performance Ranking — {selExamType}</p>
                                <p className="text-xs text-gray-400">{subjectPerf.length} subjects</p>
                            </div>
                            <div style={{ height: 280 }} className="p-5">
                                {subjectPerf.length > 0 ? (
                                    <Bar data={subjectTopChart} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }}/>
                                ) : <p className="text-center text-gray-400 text-sm">No data</p>}
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {['Rank','Subject','Teacher','Avg Score','Pass Rate','Grade','Change','Status'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {subjectPerf.map((s, i) => (
                                        <tr key={s.sub.id} className={`hover:bg-gray-50 transition ${s.avg < 40 ? 'bg-red-50/40' : ''}`}>
                                            <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="font-bold text-gray-800 text-xs">{s.sub.subject_name}</p>
                                                <p className="text-[10px] text-gray-400">{s.sub.subject_code}</p>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{s.teacher ? `${s.teacher.first_name} ${s.teacher.last_name}` : <span className="text-gray-300 italic">Unassigned</span>}</td>
                                            <td className="px-4 py-2.5 min-w-[120px]"><ScoreBar score={s.avg}/></td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-xs font-bold ${s.passRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{s.passRate}%</span>
                                            </td>
                                            <td className="px-4 py-2.5"><GradePill grade={grd(s.avg).grade}/></td>
                                            <td className="px-4 py-2.5">
                                                {s.change !== 0 && (
                                                    <span className={`text-xs font-bold flex items-center gap-0.5 ${s.change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {s.change > 0 ? <FiTrendingUp size={10}/> : <FiTrendingDown size={10}/>}
                                                        {s.change > 0 ? '+' : ''}{s.change.toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.passRate >= 50 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                    {s.passRate >= 70 ? 'Excellent' : s.passRate >= 50 ? 'Passing' : s.passRate >= 30 ? 'At Risk' : 'Failing'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ══ STREAM BATTLE ══ */}
                    {activeSection === 'streams' && (
                        <div className="space-y-3">
                            {streamPerf.map((s, i) => (
                                <div key={s.stream.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: ['#6366f1','#0891b2','#059669','#f59e0b','#ef4444'][i % 5] }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-gray-800">{s.stream.stream_name} <span className="text-xs text-gray-400 font-normal">· {getForm(s.formId)}</span></p>
                                        <ScoreBar score={s.avg}/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        {[
                                            { l: 'Avg', v: `${s.avg.toFixed(1)}%`, c: grd(s.avg).color },
                                            { l: 'Pass', v: `${s.passRate}%`, c: s.passRate >= 50 ? '#059669' : '#ef4444' },
                                            { l: 'Students', v: s.count, c: '#6366f1' },
                                        ].map(k => (
                                            <div key={k.l}>
                                                <p className="text-base font-black" style={{ color: k.c }}>{k.v}</p>
                                                <p className="text-[9px] text-gray-400 uppercase">{k.l}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <GradePill grade={grd(s.avg).grade} size="md"/>
                                    {i === 0 && <span className="text-lg">🏆</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ══ TEACHER PERFORMANCE ══ */}
                    {activeSection === 'teachers' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <p className="font-black text-gray-800">Teacher Performance Index (TPI)</p>
                                <p className="text-xs text-gray-400 mt-0.5">Based on average student score in subjects taught this {selExamType}</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {['Rank','Teacher','TSC No','Subjects Taught','Students','Avg Score','Pass Rate','Grade','TPI Rating'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {teacherPerf.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-400">No teacher data</td></tr>}
                                    {teacherPerf.map((t, i) => (
                                        <tr key={t.teacher.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700">{t.teacher.first_name[0]}{t.teacher.last_name[0]}</div>
                                                    <p className="font-bold text-gray-800 text-xs">{t.teacher.first_name} {t.teacher.last_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">{t.teacher.tsc_number || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">{t.subjects.slice(0, 3).join(', ')}{t.subjects.length > 3 ? ` +${t.subjects.length - 3}` : ''}</td>
                                            <td className="px-4 py-3 text-xs text-center text-gray-600">{t.count}</td>
                                            <td className="px-4 py-3 min-w-[120px]"><ScoreBar score={t.avg}/></td>
                                            <td className="px-4 py-3 text-xs font-bold" style={{ color: t.passRate >= 50 ? '#059669' : '#ef4444' }}>{t.passRate}%</td>
                                            <td className="px-4 py-3"><GradePill grade={grd(t.avg).grade}/></td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.avg >= 70 ? 'bg-green-50 border-green-200 text-green-700' : t.avg >= 50 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                    {t.avg >= 70 ? '⭐ Excellent' : t.avg >= 60 ? '✅ Good' : t.avg >= 50 ? '⚠️ Average' : '🚨 Needs Support'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ══ TOP & AT-RISK STUDENTS ══ */}
                    {activeSection === 'students' && (
                        <div className="space-y-4">
                            {/* Top 10 */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                                    <FiAward className="text-amber-500"/>
                                    <p className="font-black text-gray-800">Top 10 Students — {selExamType}</p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Rank','Student','Adm No','Form','Stream','Avg Score','Mean Grade'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {studentPerf.slice(0, 10).map((sp, i) => (
                                            <tr key={sp.student.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5">
                                                    <span className="text-lg">{['🥇','🥈','🥉'][i] || i + 1}</span>
                                                </td>
                                                <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{sp.student.first_name} {sp.student.last_name}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{sp.student.admission_no || sp.student.admission_number}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{getForm(sp.student.form_id)}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{getStream(sp.student.stream_id)}</td>
                                                <td className="px-4 py-2.5 min-w-[120px]"><ScoreBar score={sp.avg}/></td>
                                                <td className="px-4 py-2.5"><GradePill grade={sp.meanGrade}/></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* At-Risk */}
                            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-red-100 flex items-center gap-2">
                                    <FiAlertTriangle className="text-red-500"/>
                                    <p className="font-black text-red-700">🚨 At-Risk Students (Avg &lt; 40%) — {atRiskStudents.length} students</p>
                                </div>
                                {atRiskStudents.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <FiCheckCircle size={28} className="text-green-400 mx-auto mb-2"/>
                                        <p className="text-green-600 font-bold">No students scoring below 40% — Great news!</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-red-50 border-b border-red-100">
                                                {['Student','Adm No','Form','Stream','Avg Score','Grade','Risk Level','Action'].map(h => (
                                                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-red-500 uppercase whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-50">
                                            {atRiskStudents.map(sp => (
                                                <tr key={sp.student.id} className="hover:bg-red-50/50">
                                                    <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{sp.student.first_name} {sp.student.last_name}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-400">{sp.student.admission_no || sp.student.admission_number}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500">{getForm(sp.student.form_id)}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500">{getStream(sp.student.stream_id)}</td>
                                                    <td className="px-4 py-2.5 min-w-[120px]"><ScoreBar score={sp.avg}/></td>
                                                    <td className="px-4 py-2.5"><GradePill grade={sp.meanGrade}/></td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sp.avg < 25 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                                                            {sp.avg < 25 ? '🔴 Critical' : '🟠 High Risk'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-indigo-600 font-bold">Intervention Needed</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══ WELFARE & CONDUCT ══ */}
                    {activeSection === 'welfare' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiCheckCircle className="text-green-500"/>📅 Attendance Overview</p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {[
                                        { l: 'Attendance Rate', v: `${attRate}%`, c: attRate >= 80 ? '#059669' : '#ef4444' },
                                        { l: 'Days Present', v: attPresent.toLocaleString(), c: '#059669' },
                                        { l: 'Total Records', v: attTotal.toLocaleString(), c: '#6366f1' },
                                    ].map(k => (
                                        <div key={k.l} className="bg-gray-50 rounded-xl p-3 text-center">
                                            <p className="text-xl font-black" style={{ color: k.c }}>{k.v}</p>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">{k.l}</p>
                                        </div>
                                    ))}
                                </div>
                                {attRate < 80 && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-red-700">⚠️ Attendance below 80% threshold. Ministry requires 80%+ for exam eligibility.</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FiShield className="text-indigo-500"/>🚨 Discipline Summary</p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {[
                                        { l: 'Total Incidents', v: discipline.length, c: discipline.length > 5 ? '#ef4444' : '#059669' },
                                        { l: 'This Term', v: currentTermDisc.length, c: '#f59e0b' },
                                        { l: 'Open Cases', v: discipline.filter(d => d.status === 'Open').length, c: '#dc2626' },
                                    ].map(k => (
                                        <div key={k.l} className="bg-gray-50 rounded-xl p-3 text-center">
                                            <p className="text-xl font-black" style={{ color: k.c }}>{k.v}</p>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">{k.l}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Incident categories */}
                                {['Bullying','Truancy / Lateness','Substance Abuse','Violence','Academic Dishonesty'].map(cat => {
                                    const count = discipline.filter(d => d.category === cat).length;
                                    if (!count) return null;
                                    return (
                                        <div key={cat} className="flex items-center gap-2 mb-1.5">
                                            <p className="text-xs text-gray-600 flex-1">{cat}</p>
                                            <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.min((count / Math.max(discipline.length, 1)) * 100, 100)}%` }}/>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 w-6">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ══ AI NARRATIVE ══ */}
                    {activeSection === 'narrative' && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm p-6">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"><HiSparkles size={12}/>Auto-Generated Principal's Narrative</p>
                                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                                    <p><strong>1. Executive Summary</strong></p>
                                    <p>
                                        The {getTerm()?.term_name || '—'} {selExamType} examination results for {schoolInfo?.school_name || 'our school'} have been compiled and analysed. A total of <strong>{students.length} active students</strong> sat for <strong>{subjectPerf.length} subjects</strong>, recording a school mean average of <strong>{schoolAvg.toFixed(1)}%</strong>
                                        {avgChange !== 0 ? `, representing a ${avgChange > 0 ? 'positive' : 'negative'} change of ${Math.abs(avgChange).toFixed(1)}% compared to the previous examination period.` : '.'}
                                    </p>
                                    <p><strong>2. Academic Performance</strong></p>
                                    <p>
                                        The overall pass rate stands at <strong>{passRate}%</strong> ({passCount} students scoring 50% and above), with <strong>{aRate}% of entries earning A-grade</strong> (70%+). The weakest performance was recorded in {subjectPerf[subjectPerf.length - 1]?.sub.subject_name || '—'} ({subjectPerf[subjectPerf.length - 1]?.avg.toFixed(1) || '—'}%), requiring urgent departmental review and additional resource allocation.
                                        {formPerf.length > 0 && ` The best-performing class is ${formPerf.sort((a, b) => b.avg - a.avg)[0]?.form.form_name} with a mean of ${formPerf.sort((a, b) => b.avg - a.avg)[0]?.avg.toFixed(1)}%.`}
                                    </p>
                                    <p><strong>3. Teacher Effectiveness</strong></p>
                                    <p>
                                        {teacherPerf.length > 0 ? `The top-performing teacher this term is ${teacherPerf[0]?.teacher.first_name} ${teacherPerf[0]?.teacher.last_name} with a mean student score of ${teacherPerf[0]?.avg.toFixed(1)}% in ${teacherPerf[0]?.subjects.join(', ')}. ` : ''}
                                        {teacherPerf.filter(t => t.avg < 50).length > 0 ? `${teacherPerf.filter(t => t.avg < 50).length} teacher(s) require professional development support as their classes scored below the 50% threshold.` : 'All teachers recorded acceptable performance levels above 50%.'}
                                    </p>
                                    <p><strong>4. At-Risk Students</strong></p>
                                    <p>
                                        {atRiskStudents.length > 0
                                            ? `A total of ${atRiskStudents.length} student(s) scored below 40%, placing them in the critical at-risk category. These students require immediate intervention including additional classes, parental engagement, and guidance counselling. The administration should prioritise structured support programmes for these learners before the next examination period.`
                                            : 'No students were identified in the critical at-risk category (below 40%). This is a positive indicator of the school\'s academic support systems.'}
                                    </p>
                                    <p><strong>5. Recommendations</strong></p>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                                        {subjectPerf.filter(s => s.passRate < 50).length > 0 && (
                                            <li>Convene subject HOD meetings for {subjectPerf.filter(s => s.passRate < 50).map(s => s.sub.subject_name).join(', ')} to address below-average performance.</li>
                                        )}
                                        {atRiskStudents.length > 0 && <li>Implement structured intervention programme for {atRiskStudents.length} at-risk students.</li>}
                                        {attRate < 80 && <li>Address attendance challenges — current rate of {attRate}% is below the 80% Ministry requirement.</li>}
                                        {discipline.filter(d => d.status === 'Open').length > 0 && <li>Resolve {discipline.filter(d => d.status === 'Open').length} open discipline cases before term ends.</li>}
                                        <li>Organise a prize-giving ceremony to recognise top-performing students and motivate the student body.</li>
                                        <li>Share individual student report cards with parents/guardians within two weeks of results.</li>
                                    </ul>
                                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-200">
                                        Report prepared by APSIMS — Alpha School Information Management System · {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


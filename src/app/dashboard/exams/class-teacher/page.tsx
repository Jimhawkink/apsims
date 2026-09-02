'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUsers, FiBook, FiAlertTriangle, FiCheckCircle, FiRefreshCw,
    FiBarChart2, FiTrendingUp, FiTrendingDown, FiPrinter, FiSearch,
    FiMail, FiPhone, FiTarget, FiAward, FiStar, FiEye, FiMessageSquare,
} from 'react-icons/fi';
import { HiAcademicCap, HiSparkles } from 'react-icons/hi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
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
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function GradePill({ grade }: { grade: string }) {
    const g = GRADE_SCALE.find(gs => gs.grade === grade);
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-lg inline-block" style={{ background: `${g?.color || '#94a3b8'}20`, color: g?.color || '#94a3b8', border: `1px solid ${g?.color || '#94a3b8'}30` }}>{grade}</span>;
}
function ScoreBar({ score }: { score: number }) {
    const g = grd(score);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(score, 100)}%`, background: g.color }}/></div>
            <span className="text-xs font-black w-9 text-right tabular-nums" style={{ color: g.color }}>{score.toFixed(1)}%</span>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export default function ClassTeacherDashboard() {
    /* ─── State ─── */
    const [loading, setLoading]   = useState(true);
    const [forms, setForms]       = useState<any[]>([]);
    const [streams, setStreams]   = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [terms, setTerms]       = useState<any[]>([]);
    const [marks, setMarks]       = useState<any[]>([]);
    const [subTeachers, setSubTeachers] = useState<any[]>([]);
    const [attendance, setAttendance]   = useState<any[]>([]);
    const [discipline, setDiscipline]   = useState<any[]>([]);

    /* Filters */
    const [selTeacher, setSelTeacher] = useState('');
    const [selForm, setSelForm]       = useState('');
    const [selStream, setSelStream]   = useState('');
    const [selTerm, setSelTerm]       = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [activeTab, setActiveTab]   = useState<'overview'|'students'|'subjects'|'attendance'|'marks-entry'|'comms'>('overview');
    const [studentSearch, setStudentSearch] = useState('');
    const [viewStudent, setViewStudent]     = useState<any>(null);

    const EXAM_TYPES = ['CAT 1','CAT 2','Mid-Term','End-Term','Mock','Pre-Mock','Trial'];

    /* ─── FETCH ─── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, stRes, subRes, studRes, tchRes, termRes, stRes2, attRes, discRes] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_attendance').select('student_id,status,attendance_date').limit(10000),
            supabase.from('school_discipline_records').select('student_id,category,severity,status,incident_date').order('incident_date', { ascending: false }),
        ]);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(studRes.data || []);
        setTeachers(tchRes.data || []);
        setTerms(termRes.data || []);
        setSubTeachers(stRes2.data || []);
        setAttendance(attRes.data || []);
        setDiscipline(discRes.data || []);
        if ((termRes.data || []).length > 0 && !selTerm) setSelTerm(String((termRes.data as any[])[0].id));
        setLoading(false);
    }, [selTerm]);

    const fetchMarks = useCallback(async () => {
        if (!selTerm) return;
        const { data } = await supabase.from('school_exam_marks').select('*').eq('term_id', Number(selTerm)).eq('exam_type', selExamType);
        setMarks(data || []);
    }, [selTerm, selExamType]);

    useEffect(() => { fetchAll(); }, []);
    useEffect(() => { fetchMarks(); }, [fetchMarks]);

    /* ─── HELPERS ─── */
    const getForm   = (id: any) => forms.find(f => f.id === id)?.form_name || '—';
    const getStream = (id: any) => streams.find(s => s.id === id)?.stream_name || '—';
    const getSub    = (id: any) => subjects.find(s => s.id === id);

    /* Teacher's assigned subjects & classes */
    const teacherAssignments = selTeacher
        ? subTeachers.filter((st: any) => String(st.teacher_id) === selTeacher)
        : [];
    const teacherSubjectIds  = [...new Set(teacherAssignments.map((a: any) => a.subject_id))];
    const teacherFormIds     = [...new Set(teacherAssignments.map((a: any) => a.form_id).filter(Boolean))];
    const teacherStreamIds   = [...new Set(teacherAssignments.map((a: any) => a.stream_id).filter(Boolean))];

    /* Class students */
    const classStudents = students.filter(s => {
        const byForm   = !selForm   || String(s.form_id)   === selForm;
        const byStream = !selStream || String(s.stream_id) === selStream;
        return byForm && byStream;
    });

    const filtStudents = classStudents.filter(s =>
        !studentSearch || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

    /* ─── PER-STUDENT STATS ─── */
    const studentStats = classStudents.map(s => {
        const sMarks   = marks.filter(m => m.student_id === s.id);
        const sScores  = sMarks.map(m => Number(m.score));
        const sAvg     = avg(sScores);
        const passRate = pct(sScores.filter(sc => sc >= 50).length, sScores.length);
        const best7Pts = [...sMarks].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 7).reduce((a, m) => a + (Number(m.points) || grd(Number(m.score)).pts), 0);
        const meanGrade = GRADE_SCALE.find(g => g.pts <= Math.round(best7Pts / Math.max(1, Math.min(7, sMarks.length))))?.grade || (sMarks.length === 0 ? '—' : 'E');
        const sAtt     = attendance.filter(a => a.student_id === s.id);
        const attRate  = pct(sAtt.filter(a => a.status === 'Present').length, sAtt.length);
        const discCount = discipline.filter(d => d.student_id === s.id).length;
        const missing  = teacherSubjectIds.filter(sid => !sMarks.some(m => m.subject_id === sid)).length;
        return { student: s, sAvg, passRate, meanGrade, attRate, discCount, missing, markCount: sMarks.length, sMarks, best7Pts };
    }).sort((a, b) => b.sAvg - a.sAvg);

    /* ─── CLASS STATS ─── */
    const classScores  = studentStats.map(s => s.sAvg).filter(s => s > 0);
    const classAvg     = avg(classScores);
    const classPass    = pct(classScores.filter(s => s >= 50).length, classScores.length);
    const atRisk       = studentStats.filter(s => s.sAvg < 40 && s.markCount > 0);
    const excellent    = studentStats.filter(s => s.sAvg >= 70);
    const missingMarks = studentStats.filter(s => s.missing > 0);

    /* ─── SUBJECT PERFORMANCE (for this class) ─── */
    const subjectStats = subjects.map(sub => {
        const subMarks = marks.filter(m => m.subject_id === sub.id && classStudents.some(s => s.id === m.student_id));
        if (subMarks.length === 0) return null;
        const subScores = subMarks.map(m => Number(m.score));
        const sAvg = avg(subScores);
        const sPass = pct(subScores.filter(s => s >= 50).length, subScores.length);
        const isTaught = teacherSubjectIds.includes(sub.id);
        const submitted = classStudents.filter(s => subMarks.some(m => m.student_id === s.id)).length;
        const completion = pct(submitted, classStudents.length);
        return { sub, avg: sAvg, passRate: sPass, count: subMarks.length, submitted, completion, isTaught };
    }).filter(Boolean) as any[];
    subjectStats.sort((a, b) => b.avg - a.avg);

    /* ─── ATTENDANCE ─── */
    const termAtt = attendance.filter(a => classStudents.some(s => s.id === a.student_id));
    const classAttRate = pct(termAtt.filter(a => a.status === 'Present').length, termAtt.length);

    /* ─── CHARTS ─── */
    const gradeDistChart = {
        labels: GRADE_SCALE.map(g => g.grade),
        datasets: [{
            data: GRADE_SCALE.map(g => {
                const scores = studentStats.map(s => s.sAvg);
                const idx = GRADE_SCALE.indexOf(g);
                return scores.filter(sc => sc >= g.min && (idx === 0 || sc < GRADE_SCALE[idx - 1].min)).length;
            }),
            backgroundColor: GRADE_SCALE.map(g => `${g.color}cc`),
        }],
    };

    const subjectBarChart = {
        labels: subjectStats.slice(0, 10).map(s => s.sub.subject_name.length > 12 ? s.sub.subject_name.slice(0, 12) + '…' : s.sub.subject_name),
        datasets: [{
            label: 'Avg %', data: subjectStats.slice(0, 10).map(s => s.avg.toFixed(1)),
            backgroundColor: subjectStats.slice(0, 10).map(s => `${grd(s.avg).color}cc`), borderRadius: 8,
        }],
    };

    const tabBtn = (key: typeof activeTab, label: string, icon: any, badge?: number) => (
        <button onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === key ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50'}`}>
            {icon}{label}
            {badge !== undefined && badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">{badge}</span>}
        </button>
    );

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#064e3b,#059669,#0891b2)' }}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2"><HiAcademicCap size={24}/> Class Teacher Dashboard</h1>
                        <p className="text-sm text-white/70 mt-1">Full oversight of your class — marks, attendance, at-risk alerts & parent communication</p>
                    </div>
                    <button onClick={() => { fetchAll(); fetchMarks(); }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition self-start"><FiRefreshCw size={14}/></button>
                </div>

                {/* ─── FILTERS ─── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                    {[
                        { label: 'Teacher', node: <select value={selTeacher} onChange={e => setSelTeacher(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-300 focus:outline-none"><option value="">— All Teachers —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select> },
                        { label: 'Form', node: <select value={selForm} onChange={e => setSelForm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-300 focus:outline-none"><option value="">— All Forms —</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select> },
                        { label: 'Stream', node: <select value={selStream} onChange={e => setSelStream(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-300 focus:outline-none"><option value="">— All Streams —</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select> },
                        { label: 'Term', node: <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-300 focus:outline-none"><option value="">— Term —</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year || ''}</option>)}</select> },
                        { label: 'Exam', node: <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-emerald-300 focus:outline-none">{EXAM_TYPES.map(e => <option key={e}>{e}</option>)}</select> },
                    ].map(f => (
                        <div key={f.label}>
                            <p className="text-[10px] text-white/60 font-bold uppercase mb-1">{f.label}</p>
                            {f.node}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ KPI CARDS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                    { label: 'Class Students', val: classStudents.length, color: '#0891b2', icon: '👥' },
                    { label: 'Class Average', val: `${classAvg.toFixed(1)}%`, color: grd(classAvg).color, icon: '📊' },
                    { label: 'Pass Rate', val: `${classPass}%`, color: classPass >= 50 ? '#059669' : '#ef4444', icon: '✅' },
                    { label: 'Excellent (≥70%)', val: excellent.length, color: '#059669', icon: '🏆' },
                    { label: 'At-Risk (<40%)', val: atRisk.length, color: atRisk.length > 0 ? '#ef4444' : '#059669', icon: '🚨' },
                    { label: 'Missing Marks', val: missingMarks.length, color: missingMarks.length > 0 ? '#f59e0b' : '#059669', icon: '⚠️' },
                ].map(k => (
                    <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <span className="text-xl">{k.icon}</span>
                        <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.val}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* ═══ ALERT BANNERS ═══ */}
            {atRisk.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                    <FiAlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-black text-red-700 text-sm">🚨 {atRisk.length} Student(s) Critically At-Risk (Avg &lt; 40%)</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {atRisk.map(s => (
                                <button key={s.student.id} onClick={() => { setViewStudent(s); setActiveTab('students'); }}
                                    className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition">
                                    {s.student.first_name} {s.student.last_name} ({s.sAvg.toFixed(1)}%)
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {missingMarks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <FiAlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                    <div>
                        <p className="font-black text-amber-700 text-sm">⚠️ {missingMarks.length} Student(s) Have Missing Subject Marks</p>
                        <p className="text-xs text-amber-600 mt-1">Ensure all subject teachers have entered marks before the deadline.</p>
                    </div>
                </div>
            )}

            {/* ═══ TABS ═══ */}
            <div className="flex gap-2 flex-wrap">
                {tabBtn('overview',    'Overview',      <FiBarChart2 size={11}/>)}
                {tabBtn('students',    'Class List',    <FiUsers size={11}/>, atRisk.length)}
                {tabBtn('subjects',    'Subjects',      <FiBook size={11}/>, subjectStats.filter(s => s.avg < 50).length)}
                {tabBtn('attendance',  'Attendance',    <FiCheckCircle size={11}/>)}
                {tabBtn('marks-entry', 'Marks Tracker', <FiTarget size={11}/>, missingMarks.length)}
                {tabBtn('comms',       'Parent Comms',  <FiMessageSquare size={11}/>)}
            </div>

            {/* ══════ OVERVIEW ══════ */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Subject Bar Chart */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📚 Subject Performance — {selExamType}</p>
                            {subjectStats.length > 0 ? (
                                <div style={{ height: 240 }}>
                                    <Bar data={subjectBarChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 9 } } } } }}/>
                                </div>
                            ) : <p className="text-center text-gray-400 py-20 text-sm">No marks data yet for this class</p>}
                        </div>

                        {/* Grade Doughnut */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🎓 Grade Distribution</p>
                            {classScores.length > 0 ? (
                                <div style={{ height: 240 }}>
                                    <Doughnut data={gradeDistChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 8 } } } }}/>
                                </div>
                            ) : <p className="text-center text-gray-400 py-20 text-sm">No data</p>}
                        </div>
                    </div>

                    {/* Top 5 + Bottom 5 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4">🏆 Top 5 Students</p>
                            {studentStats.filter(s => s.markCount > 0).slice(0, 5).map((s, i) => (
                                <div key={s.student.id} className="flex items-center gap-3 mb-3">
                                    <span className="text-base">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-800">{s.student.first_name} {s.student.last_name}</p>
                                        <ScoreBar score={s.sAvg}/>
                                    </div>
                                    <GradePill grade={s.meanGrade}/>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">⚠️ Needs Attention</p>
                            {studentStats.filter(s => s.markCount > 0).slice(-5).reverse().map(s => (
                                <div key={s.student.id} className="flex items-center gap-3 mb-3">
                                    <FiAlertTriangle size={14} className="text-red-400 shrink-0"/>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-800">{s.student.first_name} {s.student.last_name}</p>
                                        <ScoreBar score={s.sAvg}/>
                                    </div>
                                    <GradePill grade={s.meanGrade}/>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Narrative for class */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1"><HiSparkles size={12}/>Class Intelligence Summary</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {selForm ? `${getForm(Number(selForm))} ${selStream ? getStream(Number(selStream)) : ''}` : 'Selected class'} has <strong>{classStudents.length} active students</strong> with a class average of <strong>{classAvg.toFixed(1)}%</strong> ({grd(classAvg).grade} grade).
                            {classPass >= 50 ? ` ${classPass}% of students are passing — above the 50% threshold.` : ` Only ${classPass}% of students are passing — class intervention is urgently needed.`}
                            {excellent.length > 0 && ` ${excellent.length} student(s) are performing excellently (≥70%).`}
                            {atRisk.length > 0 && ` ⚠️ ${atRisk.length} student(s) are at critical risk — immediate parent notification and remedial classes recommended.`}
                            {classAttRate < 80 && ` Class attendance rate is ${classAttRate}% — below the recommended 80%.`}
                        </p>
                    </div>
                </div>
            )}

            {/* ══════ CLASS LIST ══════ */}
            {activeTab === 'students' && (
                <div className="space-y-3">
                    {viewStudent && (
                        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-indigo-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#eef2ff,#e0f2fe)' }}>
                                <p className="font-black text-gray-800">🔍 {viewStudent.student.first_name} {viewStudent.student.last_name} — Detailed View</p>
                                <button onClick={() => setViewStudent(null)} className="text-xs text-gray-500 hover:text-red-500 font-bold">✕ Close</button>
                            </div>
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { l: 'Average Score', v: `${viewStudent.sAvg.toFixed(1)}%`, c: grd(viewStudent.sAvg).color },
                                    { l: 'Mean Grade', v: viewStudent.meanGrade, c: '#6366f1' },
                                    { l: 'Pass Rate', v: `${viewStudent.passRate}%`, c: viewStudent.passRate >= 50 ? '#059669' : '#ef4444' },
                                    { l: 'Attendance', v: `${viewStudent.attRate}%`, c: viewStudent.attRate >= 80 ? '#059669' : '#f59e0b' },
                                    { l: 'Marks Entered', v: viewStudent.markCount, c: '#0891b2' },
                                    { l: 'Missing Marks', v: viewStudent.missing, c: viewStudent.missing > 0 ? '#f59e0b' : '#059669' },
                                    { l: 'Discipline', v: viewStudent.discCount, c: viewStudent.discCount > 0 ? '#ef4444' : '#059669' },
                                    { l: 'Guardian', v: viewStudent.student.guardian_name || '—', c: '#374151' },
                                ].map(k => (
                                    <div key={k.l} className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-black" style={{ color: k.c }}>{k.v}</p>
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">{k.l}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Subject breakdown for this student */}
                            <div className="px-5 pb-5">
                                <p className="text-xs font-black text-gray-600 mb-2">Subject Marks This Term</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {viewStudent.sMarks.map((m: any) => {
                                        const sub = getSub(m.subject_id);
                                        const g = grd(Number(m.score));
                                        return (
                                            <div key={m.id} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                                                <p className="text-[10px] text-gray-500 truncate">{sub?.subject_name || '—'}</p>
                                                <p className="text-sm font-black" style={{ color: g.color }}>{Number(m.score).toFixed(1)}%</p>
                                                <GradePill grade={m.grade || g.grade}/>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="relative flex-1 max-w-xs">
                                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13}/>
                                <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students…" className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
                            </div>
                            <p className="text-xs text-gray-400 ml-auto">{filtStudents.length} students</p>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['#','Student','Adm No','Avg Score','Grade','Pass Rate','Attendance','Discipline','Missing','Action'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentStats.filter(s => filtStudents.some(f => f.id === s.student.id)).map((s, i) => (
                                    <tr key={s.student.id} className={`hover:bg-gray-50 transition ${s.sAvg < 40 && s.markCount > 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700">{s.student.first_name?.[0]}{s.student.last_name?.[0]}</div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-xs">{s.student.first_name} {s.student.last_name}</p>
                                                    <p className="text-[9px] text-gray-400">{s.student.gender}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{s.student.admission_no || s.student.admission_number}</td>
                                        <td className="px-3 py-2.5 min-w-[110px]">
                                            {s.markCount > 0 ? <ScoreBar score={s.sAvg}/> : <span className="text-[10px] text-gray-300 italic">No marks</span>}
                                        </td>
                                        <td className="px-3 py-2.5">{s.markCount > 0 && <GradePill grade={s.meanGrade}/>}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold" style={{ color: s.passRate >= 50 ? '#059669' : '#ef4444' }}>{s.markCount > 0 ? `${s.passRate}%` : '—'}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.attRate >= 80 ? 'bg-green-100 text-green-700' : s.attRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                                {s.attRate > 0 ? `${s.attRate}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {s.discCount > 0 ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{s.discCount}</span> : <span className="text-gray-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {s.missing > 0 ? <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">{s.missing} missing</span> : <FiCheckCircle size={12} className="text-green-500 mx-auto"/>}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => setViewStudent(s)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><FiEye size={12}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ SUBJECTS ══════ */}
            {activeTab === 'subjects' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Subject Performance — {getForm(Number(selForm)) || 'All Forms'} {getStream(Number(selStream))}</p></div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {['Rank','Subject','Your Subject?','Avg Score','Pass Rate','Grade','Submitted','Completion','Status'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subjectStats.map((s, i) => (
                                <tr key={s.sub.id} className={`hover:bg-gray-50 transition ${s.isTaught ? 'bg-emerald-50/20' : ''}`}>
                                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3"><p className="font-bold text-gray-800 text-xs">{s.sub.subject_name}</p><p className="text-[10px] text-gray-400">{s.sub.subject_code}</p></td>
                                    <td className="px-4 py-3 text-center">{s.isTaught ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Yes</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                                    <td className="px-4 py-3 min-w-[120px]"><ScoreBar score={s.avg}/></td>
                                    <td className="px-4 py-3 text-xs font-bold" style={{ color: s.passRate >= 50 ? '#059669' : '#ef4444' }}>{s.passRate}%</td>
                                    <td className="px-4 py-3"><GradePill grade={grd(s.avg).grade}/></td>
                                    <td className="px-4 py-3 text-xs text-gray-600 text-center">{s.submitted}/{classStudents.length}</td>
                                    <td className="px-4 py-3 min-w-[100px]">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${s.completion}%`, background: s.completion === 100 ? '#059669' : s.completion >= 60 ? '#f59e0b' : '#ef4444' }}/></div>
                                            <span className="text-[10px] font-black w-7 text-right">{s.completion}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.passRate >= 70 ? 'bg-green-50 border-green-200 text-green-700' : s.passRate >= 50 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                            {s.passRate >= 70 ? 'Excellent' : s.passRate >= 50 ? 'Passing' : 'Failing'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════ ATTENDANCE ══════ */}
            {activeTab === 'attendance' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { l: 'Class Att. Rate', v: `${classAttRate}%`, c: classAttRate >= 80 ? '#059669' : '#ef4444', icon: '📅' },
                            { l: 'Students < 80%', v: studentStats.filter(s => s.attRate > 0 && s.attRate < 80).length, c: '#ef4444', icon: '⚠️' },
                            { l: 'Perfect Attendance', v: studentStats.filter(s => s.attRate === 100).length, c: '#059669', icon: '⭐' },
                            { l: 'Records Tracked', v: termAtt.length, c: '#6366f1', icon: '📋' },
                        ].map(k => (
                            <div key={k.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <span className="text-2xl">{k.icon}</span>
                                <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Student Attendance Rates</p></div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Student','Attendance Rate','Status','Guardian Phone'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentStats.sort((a, b) => a.attRate - b.attRate).map(s => (
                                    <tr key={s.student.id} className={`hover:bg-gray-50 ${s.attRate < 60 && s.attRate > 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{s.student.first_name} {s.student.last_name}</td>
                                        <td className="px-4 py-2.5 min-w-[160px]">
                                            {s.attRate > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                        <div className="h-2 rounded-full" style={{ width: `${s.attRate}%`, background: s.attRate >= 80 ? '#059669' : s.attRate >= 60 ? '#f59e0b' : '#ef4444' }}/>
                                                    </div>
                                                    <span className="text-xs font-black w-9" style={{ color: s.attRate >= 80 ? '#059669' : '#ef4444' }}>{s.attRate}%</span>
                                                </div>
                                            ) : <span className="text-gray-300 text-xs">No records</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.attRate >= 80 ? 'bg-green-100 text-green-700' : s.attRate >= 60 ? 'bg-amber-100 text-amber-700' : s.attRate > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {s.attRate >= 80 ? '✅ Good' : s.attRate >= 60 ? '⚠️ Low' : s.attRate > 0 ? '🚨 Critical' : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{s.student.guardian_phone || s.student.emergency_contact_phone || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ MARKS TRACKER ══════ */}
            {activeTab === 'marks-entry' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">📝 Marks Entry Status — {selExamType}</p><p className="text-xs text-gray-400 mt-0.5">Which students are still missing subject marks</p></div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Student</th>
                                {subjects.slice(0, 8).map(sub => (
                                    <th key={sub.id} className="px-2 py-3 text-center text-[9px] font-black text-gray-500 uppercase whitespace-nowrap max-w-[60px]">{sub.subject_name.split(' ')[0]}</th>
                                ))}
                                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase">Completion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {studentStats.map(s => {
                                const done = subjects.slice(0, 8).filter(sub => s.sMarks.some(m => m.subject_id === sub.id)).length;
                                const total = Math.min(subjects.length, 8);
                                const comp = pct(done, total);
                                return (
                                    <tr key={s.student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2.5 font-bold text-gray-800 text-xs whitespace-nowrap">{s.student.first_name} {s.student.last_name}</td>
                                        {subjects.slice(0, 8).map(sub => {
                                            const mark = s.sMarks.find(m => m.subject_id === sub.id);
                                            const g = mark ? grd(Number(mark.score)) : null;
                                            return (
                                                <td key={sub.id} className="px-2 py-2.5 text-center">
                                                    {mark ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-black" style={{ color: g?.color }}>{Number(mark.score).toFixed(0)}</span>
                                                            <span className="text-[8px] font-bold" style={{ color: g?.color }}>{mark.grade || g?.grade}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-red-400 font-bold">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${comp}%`, background: comp === 100 ? '#059669' : comp >= 60 ? '#f59e0b' : '#ef4444' }}/></div>
                                                <span className="text-[10px] font-black" style={{ color: comp === 100 ? '#059669' : '#ef4444' }}>{comp}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════ PARENT COMMS ══════ */}
            {activeTab === 'comms' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
                        <p className="font-black text-gray-800 mb-1">📬 Parent Communication Centre</p>
                        <p className="text-xs text-gray-500">Click a student to prepare a personalised message for their parent/guardian</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Student','Guardian Name','Phone','Email','Performance','Alert Level','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentStats.map(s => {
                                    const alertLevel = s.sAvg < 40 && s.markCount > 0 ? 'critical' : s.attRate < 70 && s.attRate > 0 ? 'attendance' : s.discCount > 0 ? 'discipline' : 'good';
                                    const message = alertLevel === 'critical'
                                        ? `Dear ${s.student.guardian_name || 'Parent'}, your child ${s.student.first_name} is scoring ${s.sAvg.toFixed(1)}% which is below the pass mark. Urgent academic support is needed.`
                                        : alertLevel === 'attendance'
                                        ? `Dear ${s.student.guardian_name || 'Parent'}, ${s.student.first_name}'s attendance is at ${s.attRate}%, which is below the required 80%. Please ensure regular attendance.`
                                        : `Dear ${s.student.guardian_name || 'Parent'}, ${s.student.first_name} is performing well with an average of ${s.sAvg.toFixed(1)}%. Keep up the good work!`;
                                    return (
                                        <tr key={s.student.id} className={`hover:bg-gray-50 transition ${alertLevel === 'critical' ? 'bg-red-50/20' : ''}`}>
                                            <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{s.student.first_name} {s.student.last_name}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-600">{s.student.guardian_name || '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{s.student.guardian_phone || s.student.emergency_contact_phone || '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{s.student.guardian_email || '—'}</td>
                                            <td className="px-4 py-2.5">
                                                {s.markCount > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-black" style={{ color: grd(s.sAvg).color }}>{s.sAvg.toFixed(1)}%</span>
                                                        <GradePill grade={s.meanGrade}/>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">No marks</span>}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alertLevel === 'critical' ? 'bg-red-100 text-red-700' : alertLevel === 'attendance' ? 'bg-amber-100 text-amber-700' : alertLevel === 'discipline' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                    {alertLevel === 'critical' ? '🚨 Academic Risk' : alertLevel === 'attendance' ? '⚠️ Low Attendance' : alertLevel === 'discipline' ? '⚠️ Discipline' : '✅ Good'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => { navigator.clipboard?.writeText(message); toast.success(`Message copied for ${s.student.first_name}`); }}
                                                    className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1">
                                                    <FiMessageSquare size={9}/> Copy Message
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

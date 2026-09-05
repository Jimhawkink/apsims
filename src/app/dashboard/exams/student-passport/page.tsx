'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUser, FiSearch, FiPrinter, FiTrendingUp, FiTrendingDown, FiMinus,
    FiBook, FiAlertTriangle, FiCheckCircle, FiAward, FiCalendar,
    FiPhone, FiMail, FiMapPin, FiShield, FiTarget, FiBarChart2,
    FiChevronUp, FiChevronDown, FiDownload, FiRefreshCw, FiStar,
} from 'react-icons/fi';
import { HiAcademicCap, HiSparkles } from 'react-icons/hi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

/* ─── GRADE UTILS ─── */
const GRADE_SCALE = [
    { min: 75, grade: 'A',   pts: 12, color: '#059669', bg: '#ecfdf5' },
    { min: 70, grade: 'A-',  pts: 11, color: '#10b981', bg: '#d1fae5' },
    { min: 65, grade: 'B+',  pts: 10, color: '#0891b2', bg: '#e0f2fe' },
    { min: 60, grade: 'B',   pts:  9, color: '#2563eb', bg: '#dbeafe' },
    { min: 55, grade: 'B-',  pts:  8, color: '#4f46e5', bg: '#ede9fe' },
    { min: 50, grade: 'C+',  pts:  7, color: '#7c3aed', bg: '#f3e8ff' },
    { min: 45, grade: 'C',   pts:  6, color: '#d97706', bg: '#fef3c7' },
    { min: 40, grade: 'C-',  pts:  5, color: '#f59e0b', bg: '#fffbeb' },
    { min: 35, grade: 'D+',  pts:  4, color: '#ea580c', bg: '#fff7ed' },
    { min: 30, grade: 'D',   pts:  3, color: '#dc2626', bg: '#fef2f2' },
    { min: 25, grade: 'D-',  pts:  2, color: '#b91c1c', bg: '#fee2e2' },
    { min:  0, grade: 'E',   pts:  1, color: '#7f1d1d', bg: '#fecaca' },
];
const getGrade = (score: number) => GRADE_SCALE.find(g => score >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
const meanGradeFromPoints = (pts: number) => {
    const g = GRADE_SCALE.find(g => g.pts <= pts);
    return g?.grade || 'E';
};
const getAge = (dob: string) => dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)}` : '—';
const fmt  = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtShort = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '';

/* ─── TREND ARROW ─── */
function TrendIcon({ val }: { val: number }) {
    if (val > 2) return <span className="text-green-500 font-black">↑↑</span>;
    if (val > 0) return <span className="text-green-400">↑</span>;
    if (val < -2) return <span className="text-red-500 font-black">↓↓</span>;
    if (val < 0) return <span className="text-red-400">↓</span>;
    return <span className="text-gray-400">→</span>;
}

/* ─── GRADE PILL ─── */
function GradePill({ grade, size = 'md' }: { grade: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
    const g = GRADE_SCALE.find(g => g.grade === grade) || GRADE_SCALE[GRADE_SCALE.length - 1];
    const sz = { xs: 'text-[9px] px-1.5 py-0.5', sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-2.5 py-1', lg: 'text-sm px-3 py-1.5' }[size];
    return (
        <span className={`${sz} font-black rounded-lg inline-block`} style={{ background: g.bg, color: g.color, border: `1px solid ${g.color}30` }}>
            {grade}
        </span>
    );
}

/* ─── SCORE BAR ─── */
function ScoreBar({ score }: { score: number }) {
    const g = getGrade(score);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, background: g.color }}/>
            </div>
            <span className="text-xs font-black w-8 text-right" style={{ color: g.color }}>{score.toFixed(0)}%</span>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export default function StudentPassportPage() {
    /* ─── State ─── */
    const [loading, setLoading]         = useState(false);
    const [baseLoading, setBaseLoading] = useState(true);
    const [students, setStudents]       = useState<any[]>([]);
    const [forms, setForms]             = useState<any[]>([]);
    const [streams, setStreams]         = useState<any[]>([]);
    const [subjects, setSubjects]       = useState<any[]>([]);
    const [terms, setTerms]             = useState<any[]>([]);
    const [grading, setGrading]         = useState<any[]>([]);

    const [searchQ, setSearchQ]         = useState('');
    const [showDrop, setShowDrop]       = useState(false);
    const [selStudent, setSelStudent]   = useState<any>(null);

    /* Per-student data */
    const [allMarks, setAllMarks]       = useState<any[]>([]);
    const [attendance, setAttendance]   = useState<any[]>([]);
    const [discipline, setDiscipline]   = useState<any[]>([]);
    const [studentPathway, setStudentPathway] = useState<any>(null);
    const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
    const [activeTab, setActiveTab]     = useState<'overview'|'subjects'|'terms'|'attendance'|'discipline'|'prediction'|'print'>('overview');

    const printRef = useRef<HTMLDivElement>(null);

    /* ─── FETCH BASE ─── */
    useEffect(() => {
        (async () => {
            setBaseLoading(true);
            const [fRes, stRes, subRes, studRes, termRes, gradRes] = await Promise.all([
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_streams').select('*').order('stream_name'),
                supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
                supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
                supabase.from('school_terms').select('*').order('id', { ascending: true }),
                supabase.from('school_grading_system').select('*').order('min_score', { ascending: false }),
            ]);
            setForms(fRes.data || []);
            setStreams(stRes.data || []);
            setSubjects(subRes.data || []);
            setStudents(studRes.data || []);
            setTerms(termRes.data || []);
            setGrading(gradRes.data?.length ? gradRes.data : GRADE_SCALE.map(g => ({ grade: g.grade, min_score: g.min, max_score: g.min + 4, points: g.pts, color: g.color })));
            setBaseLoading(false);
        })();
    }, []);

    /* ─── FETCH STUDENT DATA ─── */
    const fetchStudentData = useCallback(async (student: any) => {
        setLoading(true);
        const [marksRes, attRes, discRes] = await Promise.all([
            supabase.from('school_exam_marks').select('*').eq('student_id', student.id).order('term_id', { ascending: true }),
            supabase.from('school_attendance').select('*').eq('student_id', student.id).order('attendance_date', { ascending: false }),
            supabase.from('school_discipline_records').select('*').eq('student_id', student.id).order('incident_date', { ascending: false }),
        ]);
        setAllMarks(marksRes.data || []);
        setAttendance(attRes.data || []);
        setDiscipline(discRes.data || []);

        // ── CBC Pathway + subjects (separate queries — avoids PostgREST join cache issue) ──
        try {
            const { data: cssRows } = await supabase
                .from('cbc_student_subjects')
                .select('id, student_id, pathway_id, subject_id, is_elective')
                .eq('student_id', student.id);

            if (cssRows && cssRows.length > 0) {
                // Fetch pathway details
                const pathwayId = cssRows.find((r: any) => r.pathway_id)?.pathway_id;
                const subjectIds = [...new Set(cssRows.map((r: any) => r.subject_id).filter(Boolean))];

                const [pwRes, subRes] = await Promise.all([
                    pathwayId ? supabase.from('cbc_pathways').select('id,pathway_name,pathway_code,color_hex,icon').eq('id', pathwayId).single() : Promise.resolve({ data: null }),
                    subjectIds.length > 0 ? supabase.from('school_subjects').select('id,subject_name,subject_code,initials').in('id', subjectIds) : Promise.resolve({ data: [] }),
                ]);

                const pathway = pwRes.data || null;
                const subjectMap: Record<number, any> = {};
                (subRes.data || []).forEach((s: any) => { subjectMap[s.id] = s; });

                const enriched = cssRows.map((r: any) => ({
                    ...r,
                    school_subjects: subjectMap[r.subject_id] || null,
                    cbc_pathways: pathway,
                }));
                setStudentSubjects(enriched);
                setStudentPathway(pathway);
            } else {
                setStudentSubjects([]);
                setStudentPathway(null);
            }
        } catch (_) {
            setStudentSubjects([]);
            setStudentPathway(null);
        }

        setLoading(false);
    }, []);

    const selectStudent = (s: any) => {
        setSelStudent(s);
        setShowDrop(false);
        setSearchQ(`${s.first_name} ${s.last_name}`);
        setActiveTab('overview');
        fetchStudentData(s);
    };

    /* ─── HELPERS ─── */
    const getForm   = (id: any) => forms.find(f => f.id === id)?.form_name || '—';
    const getStream = (id: any) => streams.find(s => s.id === id)?.stream_name || '—';
    const getSub    = (id: any) => subjects.find(s => s.id === id);
    const getTerm   = (id: any) => terms.find(t => t.id === id);
    const gradeLookup = (score: number) => {
        const g = grading.find((gr: any) => score >= gr.min_score);
        return g || getGrade(score);
    };

    const filteredStudents = students.filter(s =>
        !searchQ.trim() || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''} ${s.guardian_name || ''}`.toLowerCase().includes(searchQ.toLowerCase())
    ).slice(0, 15);

    /* ─── COMPUTED ─── */
    // Per-subject performance across all terms
    const subjectPerformance = subjects.map(sub => {
        const subMarks = allMarks.filter(m => m.subject_id === sub.id);
        if (subMarks.length === 0) return null;
        const avg = subMarks.reduce((a, m) => a + Number(m.score), 0) / subMarks.length;
        const sortedByTerm = [...subMarks].sort((a, b) => a.term_id - b.term_id);
        const latest = sortedByTerm[sortedByTerm.length - 1];
        const prev   = sortedByTerm[sortedByTerm.length - 2];
        const trend  = latest && prev ? Number(latest.score) - Number(prev.score) : 0;
        const bestScore = Math.max(...subMarks.map(m => Number(m.score)));
        const worstScore = Math.min(...subMarks.map(m => Number(m.score)));
        const termHistory = terms.map(t => {
            const mark = subMarks.find(m => m.term_id === t.id);
            return { term: t, mark: mark || null };
        }).filter(th => th.mark);
        return { sub, avg, latest, prev, trend, bestScore, worstScore, termHistory, count: subMarks.length };
    }).filter(Boolean) as any[];

    subjectPerformance.sort((a, b) => b.avg - a.avg);
    const topSubjects    = subjectPerformance.slice(0, 3);
    const weakSubjects   = [...subjectPerformance].sort((a, b) => a.avg - b.avg).slice(0, 3);

    // Per-term performance
    const termPerformance = terms.map(t => {
        const termMarks = allMarks.filter(m => m.term_id === t.id);
        if (termMarks.length === 0) return null;
        const avg = termMarks.reduce((a, m) => a + Number(m.score), 0) / termMarks.length;
        const totalPts = termMarks.reduce((a, m) => a + (Number(m.points) || gradeLookup(Number(m.score)).pts || 0), 0);
        const best7Pts = [...termMarks].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).slice(0, 7).reduce((a, m) => a + (Number(m.points) || 0), 0);
        const meanGrade = meanGradeFromPoints(Math.round(best7Pts / Math.min(7, termMarks.length)));
        return { term: t, avg, totalPts, best7Pts, meanGrade, count: termMarks.length };
    }).filter(Boolean) as any[];

    // Overall stats
    const overallAvg   = allMarks.length > 0 ? allMarks.reduce((a, m) => a + Number(m.score), 0) / allMarks.length : 0;
    const latestTerm   = termPerformance[termPerformance.length - 1];
    const prevTerm     = termPerformance[termPerformance.length - 2];
    const overallTrend = latestTerm && prevTerm ? latestTerm.avg - prevTerm.avg : 0;
    const passCount    = allMarks.filter(m => Number(m.score) >= 50).length;
    const passRate     = allMarks.length > 0 ? Math.round((passCount / allMarks.length) * 100) : 0;

    // Attendance stats
    const attPresent = attendance.filter(a => a.status === 'Present').length;
    const attAbsent  = attendance.filter(a => a.status === 'Absent').length;
    const attRate    = attendance.length > 0 ? Math.round((attPresent / attendance.length) * 100) : 0;

    // KCSE Prediction (based on current trajectory and best 7 subjects)
    const best7Latest = latestTerm?.best7Pts || 0;
    const best7Subjects = subjectPerformance.slice(0, 7);
    const predictedMeanPts = best7Subjects.length > 0
        ? Math.round(best7Subjects.reduce((a, s) => a + (gradeLookup(s.avg).pts || s.avg / 10), 0) / best7Subjects.length)
        : 0;
    const predictedGrade = predictedMeanPts > 0 ? meanGradeFromPoints(predictedMeanPts) : '—';

    // Trend chart data
    const trendChartData = {
        labels: termPerformance.map(t => t.term.term_name),
        datasets: [
            {
                label: 'Average Score',
                data: termPerformance.map(t => t.avg.toFixed(1)),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 5, borderWidth: 2.5,
            },
            {
                label: 'Pass Threshold (50%)',
                data: termPerformance.map(() => 50),
                borderColor: '#ef4444',
                borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, backgroundColor: 'transparent',
            },
        ],
    };

    // Subject radar chart
    const radarSubjects = subjectPerformance.slice(0, 8);
    const radarData = {
        labels: radarSubjects.map(s => s.sub.subject_name.length > 10 ? s.sub.subject_name.slice(0, 10) + '…' : s.sub.subject_name),
        datasets: [{
            label: 'Score %',
            data: radarSubjects.map(s => s.avg.toFixed(1)),
            backgroundColor: 'rgba(99,102,241,0.2)',
            borderColor: '#6366f1', borderWidth: 2,
            pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#6366f1',
        }],
    };

    const tab = (key: typeof activeTab, label: string, icon: any, badge?: number) => (
        <button onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === key ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50'}`}>
            {icon} {label}
            {badge !== undefined && badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">{badge}</span>}
        </button>
    );

    const gradeColor = (g: string) => GRADE_SCALE.find(gs => gs.grade === g)?.color || '#94a3b8';

    const printPassport = () => {
        window.print();
    };

    if (baseLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/>
        </div>
    );

    return (
        <div className="space-y-6 pb-16">
            {/* ══ HEADER ══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5,#0891b2)' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">
                            <HiAcademicCap size={24}/> Student Academic Passport
                        </h1>
                        <p className="text-sm text-white/70 mt-1">Full academic journey — scores, trends, attendance, discipline & KCSE prediction</p>
                    </div>
                    {selStudent && (
                        <div className="flex gap-2">
                            <button onClick={printPassport} className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow">
                                <FiPrinter size={12}/> Print Passport
                            </button>
                        </div>
                    )}
                </div>

                {/* STUDENT SEARCH */}
                <div className="relative mt-4 max-w-lg">
                    <FiSearch className="absolute left-3 top-3.5 text-gray-400" size={14}/>
                    <input
                        value={searchQ}
                        onChange={e => { setSearchQ(e.target.value); setShowDrop(true); setSelStudent(null); }}
                        onFocus={() => setShowDrop(true)}
                        onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
                        placeholder="Search student by name, admission number or guardian…"
                    />
                    {showDrop && !selStudent && searchQ.trim() && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-64 overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No students found</p>
                            ) : filteredStudents.map(s => (
                                <button key={s.id} type="button" onMouseDown={() => selectStudent(s)}
                                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-0 border-gray-100 flex items-center gap-3 transition">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-700 shrink-0">
                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{s.first_name} {s.middle_name || ''} {s.last_name}</p>
                                        <p className="text-xs text-gray-400">{s.admission_no || s.admission_number} · {getForm(s.form_id)} {getStream(s.stream_id)} · {s.gender}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ NO STUDENT SELECTED ══ */}
            {!selStudent && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <HiAcademicCap size={48} className="text-indigo-200 mx-auto mb-4"/>
                    <p className="text-lg font-black text-gray-400">Search for a student above</p>
                    <p className="text-sm text-gray-300 mt-1">Their complete academic passport will appear here</p>
                </div>
            )}

            {/* ══ LOADING ══ */}
            {selStudent && loading && (
                <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mx-auto mb-3"/>
                        <p className="text-sm text-gray-500">Loading academic passport…</p>
                    </div>
                </div>
            )}

            {/* ══ PASSPORT CONTENT ══ */}
            {selStudent && !loading && (
                <div ref={printRef} className="space-y-6">
                    {/* ── STUDENT PROFILE CARD ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg,#312e81,#4f46e5,#0891b2,#059669)' }}/>
                        <div className="p-6 flex flex-col md:flex-row gap-6">
                            {/* Avatar */}
                            <div className="shrink-0">
                                {selStudent.photo_url ? (
                                    <img src={selStudent.photo_url} alt="Photo" className="w-24 h-24 rounded-2xl object-cover border-4 border-indigo-100 shadow"/>
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-3xl font-black text-white shadow">
                                        {selStudent.first_name?.[0]}{selStudent.last_name?.[0]}
                                    </div>
                                )}
                                <div className="mt-2 text-center">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selStudent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {selStudent.status || 'Active'}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student Name</p>
                                    <p className="text-lg font-black text-gray-800">{selStudent.first_name} {selStudent.middle_name || ''} {selStudent.last_name}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{selStudent.admission_no || selStudent.admission_number}</p>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700">{getForm(selStudent.form_id)}</span>
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">{getStream(selStudent.stream_id)}</span>
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">{selStudent.gender}</span>
                                        {studentPathway && (
                                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold text-white" style={{ background: studentPathway.color_hex || '#6366f1' }}>
                                                {studentPathway.icon} {studentPathway.pathway_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Personal Details</p>
                                    {[
                                        { icon: <FiCalendar size={11}/>, label: 'DOB', val: `${fmt(selStudent.date_of_birth)} (Age ${getAge(selStudent.date_of_birth)})` },
                                        { icon: <FiMapPin size={11}/>, label: 'County', val: selStudent.county || '—' },
                                        { icon: <FiUser size={11}/>, label: 'Religion', val: selStudent.religion || '—' },
                                        { icon: <FiCalendar size={11}/>, label: 'Admitted', val: fmt(selStudent.admission_date) },
                                    ].map(r => (
                                        <div key={r.label} className="flex items-center gap-2 text-xs text-gray-600">
                                            <span className="text-gray-400">{r.icon}</span>
                                            <span className="text-gray-400 w-14">{r.label}:</span>
                                            <span className="font-medium">{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Parent / Guardian</p>
                                    {[
                                        { icon: <FiUser size={11}/>, label: 'Name', val: selStudent.guardian_name || '—' },
                                        { icon: <FiPhone size={11}/>, label: 'Phone', val: selStudent.guardian_phone || '—' },
                                        { icon: <FiMail size={11}/>, label: 'Email', val: selStudent.guardian_email || '—' },
                                        { icon: <FiUser size={11}/>, label: 'Relation', val: selStudent.guardian_relationship || '—' },
                                    ].map(r => (
                                        <div key={r.label} className="flex items-center gap-2 text-xs text-gray-600">
                                            <span className="text-gray-400">{r.icon}</span>
                                            <span className="text-gray-400 w-14">{r.label}:</span>
                                            <span className="font-medium truncate">{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick KPIs */}
                            <div className="shrink-0 grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Avg Score', val: `${overallAvg.toFixed(1)}%`, color: getGrade(overallAvg).color, icon: '📊' },
                                    { label: 'Mean Grade', val: latestTerm?.meanGrade || '—', color: gradeColor(latestTerm?.meanGrade || ''), icon: '🎓' },
                                    { label: 'Pass Rate', val: `${passRate}%`, color: passRate >= 50 ? '#059669' : '#ef4444', icon: '✅' },
                                    { label: 'Attendance', val: `${attRate}%`, color: attRate >= 80 ? '#059669' : attRate >= 60 ? '#f59e0b' : '#ef4444', icon: '📅' },
                                    { label: 'Exams Done', val: allMarks.length, color: '#6366f1', icon: '📝' },
                                    { label: 'Predicted', val: predictedGrade, color: gradeColor(predictedGrade), icon: '🎯' },
                                ].map(k => (
                                    <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                                        <p className="text-lg font-black" style={{ color: k.color }}>{k.val}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{k.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── TABS ── */}
                    <div className="flex gap-2 flex-wrap">
                        {tab('overview',    'Overview',     <FiBarChart2 size={11}/>)}
                        {tab('subjects',    'All Subjects', <FiBook size={11}/>, subjectPerformance.filter(s => s.avg < 50).length)}
                        {tab('terms',       'Term History', <FiCalendar size={11}/>)}
                        {tab('attendance',  'Attendance',   <FiCheckCircle size={11}/>)}
                        {tab('discipline',  'Discipline',   <FiShield size={11}/>, discipline.length)}
                        {tab('prediction',  'KCSE Prediction', <FiTarget size={11}/>)}
                        {tab('print',       'Print View',   <FiPrinter size={11}/>)}
                    </div>

                    {/* ══════ OVERVIEW TAB ══════ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {/* CBC Pathway & Subjects Card */}
                            {studentPathway && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-xl">{studentPathway.icon}</span>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CBC Pathway</p>
                                            <p className="font-black text-gray-800 text-sm">{studentPathway.pathway_name}</p>
                                        </div>
                                        <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: studentPathway.color_hex || '#6366f1' }}>
                                            {studentPathway.pathway_code}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Compulsory Subjects</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {studentSubjects.filter((s: any) => !s.is_elective).map((s: any) => (
                                                    <span key={s.id} className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                        {s.school_subjects?.subject_name || s.school_subjects?.initials}
                                                    </span>
                                                ))}
                                                {studentSubjects.filter((s: any) => !s.is_elective).length === 0 && <span className="text-xs text-gray-400">—</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Elective Subjects (3)</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {studentSubjects.filter((s: any) => s.is_elective).map((s: any) => (
                                                    <span key={s.id} className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: studentPathway.color_hex || '#6366f1' }}>
                                                        {s.school_subjects?.subject_name || s.school_subjects?.initials}
                                                    </span>
                                                ))}
                                                {studentSubjects.filter((s: any) => s.is_elective).length === 0 && <span className="text-xs text-gray-400">No electives selected</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Trend Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📈 Performance Trend — All Terms</p>
                                    {termPerformance.length > 0 ? (
                                        <div style={{ height: 220 }}>
                                            <Line data={trendChartData} options={{
                                                responsive: true, maintainAspectRatio: false,
                                                plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } } },
                                                scales: {
                                                    y: { beginAtZero: false, min: 0, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } } },
                                                    x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                                                },
                                            }}/>
                                        </div>
                                    ) : <p className="text-center text-gray-400 text-sm py-16">No term data yet</p>}
                                </div>

                                {/* Radar */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🕸️ Subject Radar</p>
                                    {radarSubjects.length > 0 ? (
                                        <div style={{ height: 220 }}>
                                            <Radar data={radarData} options={{
                                                responsive: true, maintainAspectRatio: false,
                                                scales: { r: { beginAtZero: true, min: 0, max: 100, ticks: { font: { size: 8 }, stepSize: 25 }, pointLabels: { font: { size: 8 } } } },
                                                plugins: { legend: { display: false } },
                                            }}/>
                                        </div>
                                    ) : <p className="text-center text-gray-400 text-sm py-16">No subject data</p>}
                                </div>
                            </div>

                            {/* Strengths & Weaknesses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FiStar size={11} className="text-green-500"/> 🏆 Top Performing Subjects
                                    </p>
                                    {topSubjects.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : topSubjects.map((s, i) => (
                                        <div key={s.sub.id} className="flex items-center gap-3 mb-3">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: ['#fef3c7', '#f0f9ff', '#f0fdf4'][i], color: ['#d97706', '#0891b2', '#059669'][i] }}>
                                                {['🥇', '🥈', '🥉'][i]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-800">{s.sub.subject_name}</p>
                                                <ScoreBar score={s.avg}/>
                                            </div>
                                            <GradePill grade={gradeLookup(s.avg).grade} size="sm"/>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FiAlertTriangle size={11} className="text-red-500"/> ⚠️ Needs Improvement
                                    </p>
                                    {weakSubjects.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : weakSubjects.map((s) => (
                                        <div key={s.sub.id} className="flex items-center gap-3 mb-3">
                                            <FiAlertTriangle size={14} className="text-red-400 shrink-0"/>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-800">{s.sub.subject_name}</p>
                                                <ScoreBar score={s.avg}/>
                                            </div>
                                            <GradePill grade={gradeLookup(s.avg).grade} size="sm"/>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Narrative */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm p-5">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <HiSparkles size={12}/> AI Academic Narrative
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    <strong>{selStudent.first_name} {selStudent.last_name}</strong> ({getForm(selStudent.form_id)}, {getStream(selStudent.stream_id)}) has an overall average of <strong>{overallAvg.toFixed(1)}%</strong> across {allMarks.length} recorded marks spanning {termPerformance.length} term(s).
                                    {overallTrend > 0 ? ` Performance shows a positive upward trend of +${overallTrend.toFixed(1)}% from the previous term — this student is improving.` : overallTrend < 0 ? ` There is a concerning downward trend of ${overallTrend.toFixed(1)}% from the previous term — intervention may be needed.` : ' Performance is consistent across terms.'}
                                    {topSubjects.length > 0 && ` Top performing subject: ${topSubjects[0].sub.subject_name} (${topSubjects[0].avg.toFixed(1)}% — ${gradeLookup(topSubjects[0].avg).grade}).`}
                                    {weakSubjects.length > 0 && weakSubjects[0].avg < 50 && ` Subject requiring urgent attention: ${weakSubjects[0].sub.subject_name} (${weakSubjects[0].avg.toFixed(1)}% — failing).`}
                                    {attRate < 80 && ` Attendance is below optimal at ${attRate}% — this may be impacting academic performance.`}
                                    {discipline.length > 0 && ` ${discipline.length} discipline incident(s) recorded — guidance counselling recommended.`}
                                    {` Current KCSE predicted grade: ${predictedGrade}.`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ══════ SUBJECTS TAB ══════ */}
                    {activeTab === 'subjects' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <p className="font-black text-gray-800">All Subjects Performance — Lifetime Average</p>
                                <p className="text-xs text-gray-400 mt-0.5">{subjectPerformance.length} subjects tracked · All terms combined</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {['#','Subject','Avg Score','Grade','Best','Worst','Exams','Trend','Term History'].map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {subjectPerformance.length === 0 && (
                                        <tr><td colSpan={9} className="text-center py-12 text-gray-400">No marks recorded yet</td></tr>
                                    )}
                                    {subjectPerformance.map((s, i) => (
                                        <tr key={s.sub.id} className={`hover:bg-gray-50 transition ${s.avg < 50 ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                                            <td className="px-3 py-3">
                                                <p className="font-bold text-gray-800 text-xs">{s.sub.subject_name}</p>
                                                <p className="text-[10px] text-gray-400">{s.sub.subject_code}</p>
                                            </td>
                                            <td className="px-3 py-3 min-w-[120px]">
                                                <ScoreBar score={s.avg}/>
                                            </td>
                                            <td className="px-3 py-3"><GradePill grade={gradeLookup(s.avg).grade} size="sm"/></td>
                                            <td className="px-3 py-3 text-xs font-bold text-green-600">{s.bestScore.toFixed(0)}%</td>
                                            <td className="px-3 py-3 text-xs font-bold text-red-500">{s.worstScore.toFixed(0)}%</td>
                                            <td className="px-3 py-3 text-xs text-gray-500 text-center">{s.count}</td>
                                            <td className="px-3 py-3 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <TrendIcon val={s.trend}/>
                                                    {s.trend !== 0 && <span className={`text-[10px] ${s.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>{s.trend > 0 ? '+' : ''}{s.trend.toFixed(1)}</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex gap-1">
                                                    {s.termHistory.slice(-6).map((th: any) => {
                                                        const g = gradeLookup(Number(th.mark.score));
                                                        return (
                                                            <div key={th.term.id} title={`${th.term.term_name}: ${th.mark.score}% (${g.grade})`}
                                                                className="w-6 h-6 rounded text-[9px] font-black flex items-center justify-center text-white"
                                                                style={{ background: g.color }}>
                                                                {g.grade}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ══════ TERMS TAB ══════ */}
                    {activeTab === 'terms' && (
                        <div className="space-y-4">
                            {termPerformance.length === 0 && (
                                <div className="bg-white rounded-2xl p-12 text-center text-gray-400">No term records found</div>
                            )}
                            {termPerformance.map((tp, idx) => {
                                const termMarks = allMarks.filter(m => m.term_id === tp.term.id);
                                const prevTp = termPerformance[idx - 1];
                                const change = prevTp ? tp.avg - prevTp.avg : 0;
                                return (
                                    <div key={tp.term.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="p-4 flex items-center gap-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                            <div>
                                                <p className="font-black text-gray-800">{tp.term.term_name}</p>
                                                <p className="text-xs text-gray-400">{tp.term.year || ''} · {tp.count} subjects</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-4">
                                                {change !== 0 && (
                                                    <div className={`text-xs font-bold flex items-center gap-1 ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {change > 0 ? <FiChevronUp size={12}/> : <FiChevronDown size={12}/>}
                                                        {change > 0 ? '+' : ''}{change.toFixed(1)}% vs prev term
                                                    </div>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-2xl font-black" style={{ color: getGrade(tp.avg).color }}>{tp.avg.toFixed(1)}%</p>
                                                    <p className="text-[10px] text-gray-400">average</p>
                                                </div>
                                                <GradePill grade={tp.meanGrade} size="lg"/>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        {['Subject','Exam Type','Score','Grade','Points','Remarks'].map(h => (
                                                            <th key={h} className="px-4 py-2 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {termMarks.sort((a, b) => Number(b.score) - Number(a.score)).map(m => {
                                                        const sub = getSub(m.subject_id);
                                                        const g = gradeLookup(Number(m.score));
                                                        return (
                                                            <tr key={m.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2 font-bold text-gray-800">{sub?.subject_name || '—'}</td>
                                                                <td className="px-4 py-2 text-gray-500">{m.exam_type}</td>
                                                                <td className="px-4 py-2">
                                                                    <span className="font-black text-gray-800">{Number(m.score).toFixed(1)}%</span>
                                                                    <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                                                                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(Number(m.score), 100)}%`, background: g.color }}/>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2"><GradePill grade={m.grade || g.grade} size="xs"/></td>
                                                                <td className="px-4 py-2 font-bold" style={{ color: g.color }}>{m.points || g.pts}</td>
                                                                <td className="px-4 py-2 text-gray-400 italic">{m.remarks || m.teacher_notes || '—'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ══════ ATTENDANCE TAB ══════ */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Attendance Rate', val: `${attRate}%`, color: attRate >= 80 ? '#059669' : '#ef4444', icon: '📅' },
                                    { label: 'Days Present', val: attPresent, color: '#059669', icon: '✅' },
                                    { label: 'Days Absent', val: attAbsent, color: '#ef4444', icon: '❌' },
                                    { label: 'Total Records', val: attendance.length, color: '#6366f1', icon: '📋' },
                                ].map(k => (
                                    <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                        <span className="text-2xl">{k.icon}</span>
                                        <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.val}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{k.label}</p>
                                    </div>
                                ))}
                            </div>
                            {attRate < 80 && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                                    <FiAlertTriangle size={20} className="text-red-500 shrink-0"/>
                                    <div>
                                        <p className="font-bold text-red-700 text-sm">⚠️ Attendance Below Threshold</p>
                                        <p className="text-xs text-red-600">Attendance of {attRate}% is below the recommended 80%. This is likely impacting academic performance. Parent notification recommended.</p>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Attendance Records ({attendance.length})</p></div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Date','Session','Status','Notes'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {attendance.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-400">No attendance records</td></tr>}
                                        {attendance.slice(0, 50).map((a, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmt(a.attendance_date)}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{a.session || 'Full Day'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'Present' ? 'bg-green-100 text-green-700' : a.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{a.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ══════ DISCIPLINE TAB ══════ */}
                    {activeTab === 'discipline' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Incidents', val: discipline.length, color: discipline.length > 0 ? '#ef4444' : '#059669', icon: '🚨' },
                                    { label: 'Open Cases', val: discipline.filter(d => d.status === 'Open').length, color: '#f59e0b', icon: '⏳' },
                                    { label: 'Resolved', val: discipline.filter(d => d.status === 'Resolved').length, color: '#059669', icon: '✅' },
                                ].map(k => (
                                    <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                        <span className="text-2xl">{k.icon}</span>
                                        <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.val}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{k.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Discipline History</p></div>
                                {discipline.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <FiCheckCircle size={32} className="text-green-300 mx-auto mb-2"/>
                                        <p className="text-gray-400">No discipline records — excellent conduct! ✅</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                {['Date','Category','Severity','Description','Action Taken','Status'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {discipline.map((d, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{fmt(d.incident_date)}</td>
                                                    <td className="px-4 py-2.5 text-xs font-bold text-gray-700">{d.category}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.severity === 'Critical' ? 'bg-red-600 text-white' : d.severity === 'Major' ? 'bg-red-100 text-red-700' : d.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {d.severity}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{d.description}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-600">{d.action_taken}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === 'Resolved' ? 'bg-green-100 text-green-700' : d.status === 'Escalated' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {d.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════ PREDICTION TAB ══════ */}
                    {activeTab === 'prediction' && (
                        <div className="space-y-4">
                            {/* Predicted Grade Banner */}
                            <div className="rounded-2xl p-6 text-white text-center" style={{ background: `linear-gradient(135deg,${gradeColor(predictedGrade) || '#6366f1'},#0891b2)` }}>
                                <p className="text-sm font-black text-white/70 uppercase tracking-widest mb-2">🎯 Predicted KCSE Mean Grade</p>
                                <p className="text-7xl font-black">{predictedGrade}</p>
                                <p className="text-sm text-white/70 mt-2">Based on {best7Subjects.length} best subjects · Mean points: {predictedMeanPts}</p>
                                <p className="text-xs text-white/50 mt-1">Prediction based on current average scores if maintained through KCSE</p>
                            </div>

                            {/* Best 7 subjects */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="font-black text-gray-800 mb-4">📚 Best 7 Subjects — KCSE Calculation</p>
                                {best7Subjects.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No subject data available</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 rounded-xl">
                                                {['#','Subject','Avg Score','Predicted Grade','Points'].map(h => (
                                                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {best7Subjects.map((s, i) => {
                                                const g = gradeLookup(s.avg);
                                                return (
                                                    <tr key={s.sub.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                                        <td className="px-4 py-3 font-bold text-gray-800 text-xs">{s.sub.subject_name}</td>
                                                        <td className="px-4 py-3 min-w-[140px]"><ScoreBar score={s.avg}/></td>
                                                        <td className="px-4 py-3"><GradePill grade={g.grade} size="sm"/></td>
                                                        <td className="px-4 py-3 font-black text-lg" style={{ color: g.color }}>{g.pts}</td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Total */}
                                            <tr className="bg-indigo-50 font-black">
                                                <td colSpan={3} className="px-4 py-3 text-xs font-black text-indigo-700">TOTAL POINTS ({best7Subjects.length} subjects)</td>
                                                <td className="px-4 py-3"><GradePill grade={predictedGrade} size="sm"/></td>
                                                <td className="px-4 py-3 text-xl font-black text-indigo-700">{best7Subjects.reduce((a, s) => a + (gradeLookup(s.avg).pts || 0), 0)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* What-if Scenarios */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="font-black text-gray-800 mb-4">💡 Grade Improvement Scenarios</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { label: 'If all weak subjects improve by 10%', change: 10 },
                                        { label: 'If all weak subjects improve by 20%', change: 20 },
                                        { label: 'If all subjects maintained current trend', change: Math.max(0, overallTrend) },
                                    ].map((scenario, i) => {
                                        const improved = best7Subjects.map(s => Math.min(100, s.avg + scenario.change));
                                        const improvedPts = Math.round(improved.reduce((a, sc) => a + (gradeLookup(sc).pts || 0), 0) / best7Subjects.length || 0);
                                        const improvedGrade = meanGradeFromPoints(improvedPts);
                                        const g = GRADE_SCALE.find(gs => gs.grade === improvedGrade);
                                        return (
                                            <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                                <p className="text-[10px] text-gray-500 mb-3">{scenario.label}</p>
                                                <p className="text-3xl font-black" style={{ color: g?.color || '#6366f1' }}>{improvedGrade}</p>
                                                <p className="text-xs text-gray-400 mt-1">{improvedPts} mean pts</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════ PRINT TAB ══════ */}
                    {activeTab === 'print' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                                <div>
                                    <p className="font-black text-gray-800">Print Academic Passport</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Generates a clean printable view of all academic data for {selStudent.first_name} {selStudent.last_name}</p>
                                </div>
                                <button onClick={printPassport} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow" style={{ background: 'linear-gradient(135deg,#4f46e5,#0891b2)' }}>
                                    <FiPrinter size={14}/> Print Now
                                </button>
                            </div>
                            {/* Summary for print */}
                            <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div>
                                        <p className="text-xl font-black text-gray-800">{selStudent.first_name} {selStudent.middle_name || ''} {selStudent.last_name}</p>
                                        <p className="text-sm text-gray-500">{selStudent.admission_no || selStudent.admission_number} · {getForm(selStudent.form_id)} · {getStream(selStudent.stream_id)}</p>
                                    </div>
                                    <div className="text-right">
                                        <GradePill grade={latestTerm?.meanGrade || '—'} size="lg"/>
                                        <p className="text-xs text-gray-400 mt-1">Current Mean Grade</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { l: 'Overall Avg', v: `${overallAvg.toFixed(1)}%` },
                                        { l: 'Pass Rate', v: `${passRate}%` },
                                        { l: 'Attendance', v: `${attRate}%` },
                                        { l: 'KCSE Prediction', v: predictedGrade },
                                    ].map(k => (
                                        <div key={k.l} className="bg-gray-50 rounded-xl p-3 text-center">
                                            <p className="text-lg font-black text-gray-800">{k.v}</p>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">{k.l}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 text-center pt-2">APSIMS Academic Passport · Generated {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

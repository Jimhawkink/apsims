'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiUsers, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiAward,
    FiRefreshCw, FiBarChart2, FiTarget, FiCheckCircle, FiCalendar,
    FiBook, FiFilter, FiChevronUp, FiChevronDown,
} from 'react-icons/fi';
import { HiAcademicCap, HiSparkles } from 'react-icons/hi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

/* ─── CONSTANTS ─── */
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

// CBC Competency levels (1–4 scale)
const CBC_LEVELS = [
    { min: 4, label: 'EE', desc: 'Exceeds Expectation', color: '#059669', bg: '#ecfdf5' },
    { min: 3, label: 'ME', desc: 'Meets Expectation',   color: '#2563eb', bg: '#dbeafe' },
    { min: 2, label: 'AE', desc: 'Approaches Expectation', color: '#f59e0b', bg: '#fef3c7' },
    { min: 1, label: 'BE', desc: 'Below Expectation',   color: '#ef4444', bg: '#fef2f2' },
];

// 8-4-4 cohort progression
const KE_844_STAGES = [
    { key: 'form1', label: 'Form 1', year_offset: 0, system: '844' },
    { key: 'form2', label: 'Form 2', year_offset: 1, system: '844' },
    { key: 'form3', label: 'Form 3', year_offset: 2, system: '844' },
    { key: 'form4', label: 'Form 4 (KCSE)', year_offset: 3, system: '844' },
];

// CBC cohort progression
const CBC_STAGES = [
    { key: 'g7',  label: 'Grade 7 (JSS)', year_offset: 0, system: 'CBC' },
    { key: 'g8',  label: 'Grade 8 (JSS)', year_offset: 1, system: 'CBC' },
    { key: 'g9',  label: 'Grade 9 (JSS → KJSEA)', year_offset: 2, system: 'CBC' },
    { key: 'g10', label: 'Grade 10 (Senior)',  year_offset: 3, system: 'CBC' },
    { key: 'g11', label: 'Grade 11 (Senior)',  year_offset: 4, system: 'CBC' },
    { key: 'g12', label: 'Grade 12 (KCSE-E)', year_offset: 5, system: 'CBC' },
];

const grd  = (s: number) => GRADE_SCALE.find(g => s >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
const cbcL = (pts: number) => CBC_LEVELS.find(l => pts >= l.min) || CBC_LEVELS[CBC_LEVELS.length - 1];
const avg  = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const pct  = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const COLORS_PALETTE = ['#6366f1','#0891b2','#059669','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

function GradePill({ grade, size = 'sm' }: { grade: string; size?: 'xs'|'sm'|'md' }) {
    const g = GRADE_SCALE.find(gs => gs.grade === grade);
    const sz = { xs:'text-[9px] px-1.5 py-0.5', sm:'text-[10px] px-2 py-0.5', md:'text-xs px-3 py-1' }[size];
    return <span className={`${sz} font-black rounded-lg inline-block`} style={{ background:`${g?.color||'#94a3b8'}20`, color:g?.color||'#94a3b8', border:`1px solid ${g?.color||'#94a3b8'}30` }}>{grade}</span>;
}

function CbcPill({ level }: { level: string }) {
    const l = CBC_LEVELS.find(lv => lv.label === level) || CBC_LEVELS[CBC_LEVELS.length - 1];
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-lg inline-block" style={{ background: l.bg, color: l.color, border:`1px solid ${l.color}30` }} title={l.desc}>{level}</span>;
}

function TrendArrow({ val }: { val: number }) {
    if (val > 3) return <span className="text-green-600 font-black text-xs">↑↑ +{val.toFixed(1)}</span>;
    if (val > 0) return <span className="text-green-500 text-xs">↑ +{val.toFixed(1)}</span>;
    if (val < -3) return <span className="text-red-600 font-black text-xs">↓↓ {val.toFixed(1)}</span>;
    if (val < 0) return <span className="text-red-400 text-xs">↓ {val.toFixed(1)}</span>;
    return <span className="text-gray-400 text-xs">→ 0</span>;
}

/* ══════════════════════════════════════════════════════════════ */
export default function CohortTrackerPage() {
    /* ─── State ─── */
    const [loading, setLoading]   = useState(true);
    const [mode, setMode]         = useState<'844'|'CBC'>('844');
    const [forms, setForms]       = useState<any[]>([]);
    const [streams, setStreams]   = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms]       = useState<any[]>([]);
    const [allMarks, setAllMarks] = useState<any[]>([]);
    const [cbcMarks, setCbcMarks] = useState<any[]>([]);

    /* Cohort config */
    const [cohortYear, setCohortYear] = useState(String(new Date().getFullYear() - 3));
    const [cohortStream, setCohortStream] = useState('');
    const [activeTab, setActiveTab] = useState<'trajectory'|'students'|'subjects'|'gender'|'at-risk'|'prediction'>('trajectory');
    const [examType, setExamType]   = useState('End-Term');
    const [studentSearch, setStudentSearch] = useState('');

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 8 }, (_, i) => String(currentYear - 7 + i));
    const EXAM_TYPES = ['End-Term','Mid-Term','CAT 1','CAT 2','Mock'];

    /* ─── FETCH ─── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, stRes, subRes, studRes, termRes, markRes, cbcRes] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: true }),
            supabase.from('school_exam_marks').select('student_id,subject_id,term_id,exam_type,score,points,grade').eq('exam_type', examType),
            supabase.from('school_cbc_marks').select('*').limit(5000).then(r => r).catch(() => ({ data: [] })),
        ]);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(studRes.data || []);
        setTerms(termRes.data || []);
        setAllMarks(markRes.data || []);
        setCbcMarks((cbcRes as any)?.data || []);
        setLoading(false);
    }, [examType]);

    useEffect(() => { fetchAll(); }, [examType]);

    /* ─── HELPERS ─── */
    const getForm   = (id: any) => forms.find(f => f.id === id)?.form_name || '';
    const getStream = (id: any) => streams.find(s => s.id === id)?.stream_name || '';
    const getSub    = (id: any) => subjects.find(s => s.id === id);

    /* ─── COHORT STUDENTS ─── */
    // 8-4-4: Students who enrolled in Form 1 in cohortYear
    // We identify by admission_date year OR by current form and back-calculate
    const cohortStudents844 = students.filter(s => {
        if (!s.admission_date) return false;
        const admYear = new Date(s.admission_date).getFullYear();
        const byStream = !cohortStream || String(s.stream_id) === cohortStream;
        return admYear === Number(cohortYear) && byStream;
    });

    // CBC: Grade 7 students who started in cohortYear
    const cohortStudentsCBC = students.filter(s => {
        if (!s.admission_date) return false;
        const admYear = new Date(s.admission_date).getFullYear();
        const isCBC = s.curriculum_type === 'CBC' || getForm(s.form_id).toLowerCase().includes('grade') || getForm(s.form_id).toLowerCase().includes('jss');
        const byStream = !cohortStream || String(s.stream_id) === cohortStream;
        return admYear === Number(cohortYear) && byStream && (isCBC || mode === 'CBC');
    });

    const cohortStudents = mode === '844' ? cohortStudents844 : cohortStudentsCBC;
    const filteredCohort = cohortStudents.filter(s =>
        !studentSearch || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

    /* ─── 8-4-4 TRAJECTORY ─── */
    const stages844 = KE_844_STAGES.map(stage => {
        const stageYear = Number(cohortYear) + stage.year_offset;
        const termIds = terms.filter(t => (t.year || '') === String(stageYear) || String(t.year) === String(stageYear)).map((t: any) => t.id);
        const stageMarks = allMarks.filter(m =>
            cohortStudents.some(s => s.id === m.student_id) &&
            termIds.includes(m.term_id)
        );
        const scores = stageMarks.map(m => Number(m.score));
        const stageAvg = avg(scores);
        const passRate = pct(scores.filter(s => s >= 50).length, scores.length);
        const aRate    = pct(scores.filter(s => s >= 70).length, scores.length);
        const atRisk   = cohortStudents.filter(s => {
            const sm = stageMarks.filter(m => m.student_id === s.id);
            return sm.length > 0 && avg(sm.map(m => Number(m.score))) < 40;
        }).length;
        // Per-student averages for this stage
        const studentAvgs = cohortStudents.map(s => {
            const sm = stageMarks.filter(m => m.student_id === s.id);
            return { student: s, avg: avg(sm.map(m => Number(m.score))), markCount: sm.length };
        });
        return { ...stage, stageYear, stageAvg, passRate, aRate, atRisk, studentAvgs, markCount: stageMarks.length };
    });

    /* ─── CBC TRAJECTORY ─── */
    const stagesCBC = CBC_STAGES.map(stage => {
        const stageYear = Number(cohortYear) + stage.year_offset;
        const termIds = terms.filter(t => String(t.year) === String(stageYear)).map((t: any) => t.id);
        // CBC marks use competency points (1-4)
        const stageCbcMarks = cbcMarks.filter((m: any) =>
            cohortStudents.some(s => s.id === m.student_id) &&
            termIds.includes(m.term_id)
        );
        // Also pull from school_exam_marks for hybrid grading
        const stage844Marks = allMarks.filter(m =>
            cohortStudents.some(s => s.id === m.student_id) &&
            termIds.includes(m.term_id)
        );
        const cbcScores = stageCbcMarks.map((m: any) => Number(m.competency_level || m.level || m.score || 2));
        const scores844 = stage844Marks.map(m => Number(m.score));
        const combinedScores = scores844; // fallback to 8-4-4 scores if CBC not populated
        const stageAvg = avg(combinedScores);
        const cbcAvgLevel = avg(cbcScores);
        const passRate = pct(combinedScores.filter(s => s >= 50).length, combinedScores.length);
        const atRisk   = cohortStudents.filter(s => {
            const sm = stage844Marks.filter(m => m.student_id === s.id);
            return sm.length > 0 && avg(sm.map(m => Number(m.score))) < 40;
        }).length;
        const eeCount = cbcScores.filter(s => s >= 4).length;
        const meCount = cbcScores.filter(s => s >= 3 && s < 4).length;
        const aeCount = cbcScores.filter(s => s >= 2 && s < 3).length;
        const beCount = cbcScores.filter(s => s < 2).length;
        return { ...stage, stageYear, stageAvg, cbcAvgLevel, passRate, atRisk, markCount: combinedScores.length, eeCount, meCount, aeCount, beCount };
    });

    const activeStages = mode === '844' ? stages844 : stagesCBC;

    /* ─── PER-STUDENT LIFETIME TRAJECTORY ─── */
    const studentTrajectory = cohortStudents.map(s => {
        const stages = (mode === '844' ? stages844 : stagesCBC).map(st => {
            const avg844 = st.studentAvgs?.find((sv: any) => sv.student.id === s.id)?.avg || 0;
            return { stage: st, avg: avg844 };
        });
        const avgScores = stages.map(st => st.avg).filter(a => a > 0);
        const overallAvg = avg(avgScores);
        const trend = stages.length >= 2
            ? (stages[stages.length - 1].avg || 0) - (stages[0].avg || 0)
            : 0;
        const latestAvg = stages.filter(st => st.avg > 0).pop()?.avg || 0;
        return { student: s, stages, overallAvg, trend, latestAvg };
    }).sort((a, b) => b.overallAvg - a.overallAvg);

    /* ─── TREND CHART (school-wide cohort avg per stage) ─── */
    const trendChart = {
        labels: activeStages.map(s => s.label),
        datasets: [
            {
                label: 'Cohort Average %',
                data: activeStages.map(s => s.stageAvg > 0 ? s.stageAvg.toFixed(1) : null),
                borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)',
                fill: true, tension: 0.4, pointBackgroundColor: '#6366f1',
                pointRadius: 6, borderWidth: 2.5,
            },
            {
                label: 'Pass Threshold (50%)',
                data: activeStages.map(() => 50),
                borderColor: '#ef4444', borderDash: [6, 4], borderWidth: 1.5,
                pointRadius: 0, backgroundColor: 'transparent',
            },
        ],
    };

    /* ─── GENDER BREAKDOWN ─── */
    const maleStudents   = cohortStudents.filter(s => s.gender?.toLowerCase() === 'male');
    const femaleStudents = cohortStudents.filter(s => s.gender?.toLowerCase() === 'female');
    const genderChart = {
        labels: activeStages.map(s => s.label),
        datasets: [
            {
                label: 'Male Avg %',
                data: activeStages.map(s => {
                    const mMarks = s.studentAvgs?.filter((sv: any) => maleStudents.some(m => m.id === sv.student.id));
                    return mMarks?.length ? avg(mMarks.map((m: any) => m.avg)).toFixed(1) : null;
                }),
                borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
                fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
            },
            {
                label: 'Female Avg %',
                data: activeStages.map(s => {
                    const fMarks = s.studentAvgs?.filter((sv: any) => femaleStudents.some(f => f.id === sv.student.id));
                    return fMarks?.length ? avg(fMarks.map((m: any) => m.avg)).toFixed(1) : null;
                }),
                borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)',
                fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
            },
        ],
    };

    /* ─── AT-RISK ACROSS STAGES ─── */
    const atRiskAllStages = studentTrajectory.filter(st => st.overallAvg < 40 && st.overallAvg > 0);
    const improving = studentTrajectory.filter(st => st.trend > 5 && st.overallAvg > 0);
    const declining = studentTrajectory.filter(st => st.trend < -5 && st.overallAvg > 0);

    /* ─── SUBJECT LONGITUDINAL PERFORMANCE ─── */
    const subjectLongitudinal = subjects.slice(0, 12).map(sub => {
        const stageAvgs = (mode === '844' ? stages844 : stagesCBC).map(st => {
            const stageMarks = allMarks.filter(m =>
                m.subject_id === sub.id &&
                cohortStudents.some(s => s.id === m.student_id)
            );
            return stageMarks.length > 0 ? avg(stageMarks.map(m => Number(m.score))) : 0;
        });
        const firstAvg = stageAvgs.find(a => a > 0) || 0;
        const lastAvg  = [...stageAvgs].reverse().find(a => a > 0) || 0;
        const trend    = lastAvg - firstAvg;
        return { sub, stageAvgs, firstAvg, lastAvg, trend, overallAvg: avg(stageAvgs.filter(a => a > 0)) };
    }).filter(s => s.overallAvg > 0).sort((a, b) => b.overallAvg - a.overallAvg);

    /* ─── KCSE PREDICTION (844 only) ─── */
    const kcsePredictions = mode === '844' ? studentTrajectory.map(st => {
        const latestStage = stages844.filter(s => s.stageAvg > 0).pop();
        const currentAvg = st.latestAvg;
        const projectedFinal = Math.min(100, currentAvg + (st.trend * 0.5));
        const best7Pts = Math.round(projectedFinal / 8);
        const predictedGrade = GRADE_SCALE.find(g => g.pts <= best7Pts)?.grade || 'E';
        return { ...st, currentAvg, projectedFinal, predictedGrade, best7Pts };
    }) : [];

    const tabBtn = (key: typeof activeTab, label: string, icon: any, badge?: number) => (
        <button onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === key ? (mode === '844' ? 'bg-indigo-600 text-white shadow' : 'bg-teal-600 text-white shadow') : 'bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50'}`}>
            {icon}{label}
            {badge !== undefined && badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">{badge}</span>}
        </button>
    );

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background: mode === '844' ? 'linear-gradient(135deg,#312e81,#4f46e5,#0891b2)' : 'linear-gradient(135deg,#134e4a,#0d9488,#0891b2)' }}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">
                            <HiAcademicCap size={24}/> Cohort Longitudinal Tracker
                        </h1>
                        <p className="text-sm text-white/70 mt-1">
                            Track one group of students from entry to exit — {mode === '844' ? 'Form 1 → Form 4 (8-4-4)' : 'Grade 7 → Grade 12 (CBC)'}
                        </p>
                    </div>
                    <button onClick={fetchAll} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 self-start"><FiRefreshCw size={14}/></button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mt-4">
                    {(['844','CBC'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                            className={`px-5 py-2 rounded-xl text-sm font-black transition ${mode === m ? 'bg-white text-indigo-700 shadow' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {m === '844' ? '📚 8-4-4 System' : '🌿 CBC System'}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                        { label: 'Cohort Entry Year', node: (
                            <select value={cohortYear} onChange={e => setCohortYear(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                                {yearOptions.map(y => <option key={y}>{y}</option>)}
                            </select>
                        )},
                        { label: 'Stream Filter', node: (
                            <select value={cohortStream} onChange={e => setCohortStream(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                                <option value="">— All Streams —</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        )},
                        { label: 'Exam Type', node: (
                            <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                                {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                            </select>
                        )},
                        { label: 'Cohort Size', node: (
                            <div className="rounded-xl px-3 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white">
                                <p className="text-lg font-black">{cohortStudents.length}</p>
                                <p className="text-[10px] text-white/60">students in cohort</p>
                            </div>
                        )},
                    ].map(f => (
                        <div key={f.label}>
                            <p className="text-[10px] text-white/60 font-bold uppercase mb-1">{f.label}</p>
                            {f.node}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ STAGE CARDS ═══ */}
            <div className={`grid gap-3 ${mode === '844' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
                {activeStages.map((stage, i) => {
                    const hasData = stage.stageAvg > 0;
                    const prev = i > 0 ? activeStages[i - 1] : null;
                    const change = prev && prev.stageAvg > 0 ? stage.stageAvg - prev.stageAvg : 0;
                    return (
                        <div key={stage.key} className={`bg-white rounded-2xl border shadow-sm p-4 ${hasData ? 'border-indigo-100' : 'border-gray-100 opacity-60'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs" style={{ background: COLORS_PALETTE[i % COLORS_PALETTE.length] }}>
                                    {i + 1}
                                </div>
                                {hasData && stage.atRisk > 0 && (
                                    <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{stage.atRisk} at-risk</span>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">{stage.label}</p>
                            <p className="text-xs text-gray-400">{stage.stageYear}</p>
                            {hasData ? (
                                <>
                                    <p className="text-2xl font-black mt-2" style={{ color: grd(stage.stageAvg).color }}>{stage.stageAvg.toFixed(1)}%</p>
                                    <p className="text-[10px] text-gray-400">Pass: {stage.passRate}%</p>
                                    {change !== 0 && (
                                        <p className={`text-[10px] font-bold mt-1 ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs prev
                                        </p>
                                    )}
                                    {/* CBC specific */}
                                    {mode === 'CBC' && (
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                            {[['EE', stage.eeCount, '#059669'], ['ME', stage.meCount, '#2563eb'], ['AE', stage.aeCount, '#f59e0b'], ['BE', stage.beCount, '#ef4444']].map(([l, c, col]) =>
                                                (c as number) > 0 ? (
                                                    <span key={l as string} className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background:`${col}20`, color:col as string }}>{l}:{c}</span>
                                                ) : null
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-300 mt-2 italic">No data yet</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ═══ QUICK STATS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { l: 'Cohort Size', v: cohortStudents.length, c: '#6366f1', i: '👥' },
                    { l: 'Improving', v: improving.length, c: '#059669', i: '📈' },
                    { l: 'Declining', v: declining.length, c: '#ef4444', i: '📉' },
                    { l: 'At-Risk (<40%)', v: atRiskAllStages.length, c: '#ef4444', i: '🚨' },
                    { l: 'A-Grade Students', v: studentTrajectory.filter(st => st.overallAvg >= 70).length, c: '#059669', i: '🏆' },
                ].map(k => (
                    <div key={k.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <span className="text-xl">{k.i}</span>
                        <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{k.l}</p>
                    </div>
                ))}
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-2 flex-wrap">
                {tabBtn('trajectory', 'Trend Chart',      <FiTrendingUp size={11}/>)}
                {tabBtn('students',   'All Students',     <FiUsers size={11}/>, atRiskAllStages.length)}
                {tabBtn('subjects',   'Subject Tracking', <FiBook size={11}/>)}
                {tabBtn('gender',     'Gender Analysis',  <FiBarChart2 size={11}/>)}
                {tabBtn('at-risk',    'At-Risk Watch',    <FiAlertTriangle size={11}/>, atRiskAllStages.length)}
                {mode === '844' && tabBtn('prediction', 'KCSE Prediction', <FiTarget size={11}/>)}
            </div>

            {/* ══════ TRAJECTORY CHART ══════ */}
            {activeTab === 'trajectory' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                            📈 Cohort Average Trajectory — {cohortYear} Entry · {mode === '844' ? 'Form 1 → 4' : 'Grade 7 → 12'}
                        </p>
                        {activeStages.some(s => s.stageAvg > 0) ? (
                            <div style={{ height: 280 }}>
                                <Line data={trendChart} options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
                                    scales: {
                                        y: { beginAtZero: false, min: 0, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } } },
                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                    },
                                }}/>
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                                <FiBarChart2 size={32} className="mb-2 text-gray-200"/>
                                <p className="text-sm">No marks data found for {cohortYear} cohort</p>
                                <p className="text-xs text-gray-300 mt-1">Check that admission dates match the selected entry year</p>
                            </div>
                        )}
                    </div>

                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-5">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><HiSparkles size={12}/>Cohort Intelligence Summary</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            The <strong>{cohortYear} cohort</strong> consists of <strong>{cohortStudents.length} students</strong> tracked across the {mode === '844' ? '8-4-4 (Form 1–4)' : 'CBC (Grade 7–12)'} curriculum.
                            {activeStages.filter(s => s.stageAvg > 0).length > 0 && ` Data is available for ${activeStages.filter(s => s.stageAvg > 0).length} stage(s).`}
                            {improving.length > 0 && ` 📈 ${improving.length} student(s) show significant improvement (+5% or more).`}
                            {declining.length > 0 && ` 📉 ${declining.length} student(s) are showing a declining trend — intervention recommended.`}
                            {atRiskAllStages.length > 0 && ` 🚨 ${atRiskAllStages.length} student(s) are at critical risk (below 40% overall) and need urgent academic support.`}
                            {mode === '844' && kcsePredictions.filter(p => p.predictedGrade === 'A' || p.predictedGrade === 'A-').length > 0 && ` 🏆 ${kcsePredictions.filter(p => p.predictedGrade === 'A' || p.predictedGrade === 'A-').length} student(s) are on track for A/A- in KCSE.`}
                        </p>
                    </div>

                    {/* Stage-by-stage comparison table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Stage-by-Stage Performance Summary</p></div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Stage','Year','Avg Score','Pass Rate','A-Grade %','At-Risk','Change','Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {activeStages.map((s, i) => {
                                    const prev = i > 0 ? activeStages[i - 1] : null;
                                    const change = prev && prev.stageAvg > 0 && s.stageAvg > 0 ? s.stageAvg - prev.stageAvg : null;
                                    return (
                                        <tr key={s.key} className={`hover:bg-gray-50 ${!s.stageAvg ? 'opacity-40' : ''}`}>
                                            <td className="px-4 py-3 font-bold text-gray-800 text-xs">{s.label}</td>
                                            <td className="px-4 py-3 text-xs text-gray-400">{s.stageYear}</td>
                                            <td className="px-4 py-3">
                                                {s.stageAvg > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${s.stageAvg}%`, background: grd(s.stageAvg).color }}/></div>
                                                        <span className="text-xs font-black" style={{ color: grd(s.stageAvg).color }}>{s.stageAvg.toFixed(1)}%</span>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold" style={{ color: s.passRate >= 50 ? '#059669' : s.passRate > 0 ? '#ef4444' : '#94a3b8' }}>{s.stageAvg > 0 ? `${s.passRate}%` : '—'}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-600">{s.stageAvg > 0 ? `${s.aRate}%` : '—'}</td>
                                            <td className="px-4 py-3 text-center">{s.stageAvg > 0 && s.atRisk > 0 ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{s.atRisk}</span> : s.stageAvg > 0 ? <FiCheckCircle size={12} className="text-green-500 mx-auto"/> : <span className="text-gray-300">—</span>}</td>
                                            <td className="px-4 py-3">{change !== null ? <TrendArrow val={change}/> : <span className="text-gray-300 text-xs">—</span>}</td>
                                            <td className="px-4 py-3">
                                                {s.stageAvg > 0 ? (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.passRate >= 70 ? 'bg-green-50 border-green-200 text-green-700' : s.passRate >= 50 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                        {s.passRate >= 70 ? '🌟 Excellent' : s.passRate >= 50 ? '✅ Passing' : '🚨 Intervention Needed'}
                                                    </span>
                                                ) : <span className="text-[10px] text-gray-300 italic">Future stage</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ ALL STUDENTS ══════ */}
            {activeTab === 'students' && (
                <div className="space-y-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <FiFilter className="absolute left-3 top-2.5 text-gray-400" size={13}/>
                            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student…" className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                        </div>
                        <p className="text-xs text-gray-400 ml-auto">{filteredCohort.length} students in cohort</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase sticky left-0 bg-gray-50">Student</th>
                                    {activeStages.map(s => (
                                        <th key={s.key} className="px-3 py-3 text-center text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{s.label.split(' ')[0]}{' '}{s.label.split(' ')[1] || ''}</th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase">Overall</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentTrajectory.filter(st => filteredCohort.some(f => f.id === st.student.id)).map((st, i) => (
                                    <tr key={st.student.id} className={`hover:bg-gray-50 transition ${st.overallAvg < 40 && st.overallAvg > 0 ? 'bg-red-50/20' : ''}`}>
                                        <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-gray-50">
                                            <div className="flex items-center gap-2 min-w-[160px]">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: COLORS_PALETTE[i % COLORS_PALETTE.length] }}>
                                                    {st.student.first_name?.[0]}{st.student.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-xs">{st.student.first_name} {st.student.last_name}</p>
                                                    <p className="text-[9px] text-gray-400">{st.student.admission_no || st.student.admission_number} · {st.student.gender}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {st.stages.map((s, si) => (
                                            <td key={si} className="px-3 py-2.5 text-center">
                                                {s.avg > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black" style={{ color: grd(s.avg).color }}>{s.avg.toFixed(0)}%</span>
                                                        <GradePill grade={grd(s.avg).grade} size="xs"/>
                                                    </div>
                                                ) : <span className="text-gray-200 text-xs">—</span>}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2.5 text-center">
                                            {st.overallAvg > 0 ? (
                                                <div>
                                                    <span className="text-xs font-black" style={{ color: grd(st.overallAvg).color }}>{st.overallAvg.toFixed(1)}%</span>
                                                    <div><GradePill grade={grd(st.overallAvg).grade} size="xs"/></div>
                                                </div>
                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {st.overallAvg > 0 ? <TrendArrow val={st.trend}/> : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ SUBJECT TRACKING ══════ */}
            {activeTab === 'subjects' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">Subject Performance Across Cohort Stages</p><p className="text-xs text-gray-400">How each subject average changes from stage to stage for this cohort</p></div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Subject</th>
                                {activeStages.map(s => <th key={s.key} className="px-3 py-3 text-center text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{s.label.split('(')[0].trim()}</th>)}
                                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase">Overall</th>
                                <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subjectLongitudinal.map(sub => (
                                <tr key={sub.sub.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800 text-xs">{sub.sub.subject_name}</p>
                                        <p className="text-[10px] text-gray-400">{sub.sub.subject_code}</p>
                                    </td>
                                    {sub.stageAvgs.map((sa: number, i: number) => (
                                        <td key={i} className="px-3 py-3 text-center">
                                            {sa > 0 ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-xs font-black" style={{ color: grd(sa).color }}>{sa.toFixed(1)}%</span>
                                                    <GradePill grade={grd(sa).grade} size="xs"/>
                                                </div>
                                            ) : <span className="text-gray-200 text-xs">—</span>}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs font-black" style={{ color: grd(sub.overallAvg).color }}>{sub.overallAvg.toFixed(1)}%</span>
                                    </td>
                                    <td className="px-4 py-3 text-center"><TrendArrow val={sub.trend}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════ GENDER ANALYSIS ══════ */}
            {activeTab === 'gender' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { l: 'Male Students', v: maleStudents.length, c: '#3b82f6', i: '👦' },
                            { l: 'Female Students', v: femaleStudents.length, c: '#ec4899', i: '👧' },
                            { l: 'Male Avg (Overall)', v: `${avg(studentTrajectory.filter(st => st.student.gender?.toLowerCase() === 'male' && st.overallAvg > 0).map(st => st.overallAvg)).toFixed(1)}%`, c: '#3b82f6', i: '📊' },
                            { l: 'Female Avg (Overall)', v: `${avg(studentTrajectory.filter(st => st.student.gender?.toLowerCase() === 'female' && st.overallAvg > 0).map(st => st.overallAvg)).toFixed(1)}%`, c: '#ec4899', i: '📊' },
                        ].map(k => (
                            <div key={k.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <span className="text-2xl">{k.i}</span>
                                <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📊 Male vs Female Trajectory Comparison</p>
                        {activeStages.some(s => s.stageAvg > 0) ? (
                            <div style={{ height: 280 }}>
                                <Line data={genderChart} options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
                                    scales: {
                                        y: { beginAtZero: false, min: 0, max: 100, grid: { color: '#f8fafc' }, ticks: { callback: (v: any) => `${v}%` } },
                                        x: { grid: { display: false } },
                                    },
                                }}/>
                            </div>
                        ) : <p className="text-center text-gray-400 py-20">No data yet for this cohort</p>}
                    </div>
                </div>
            )}

            {/* ══════ AT-RISK WATCH ══════ */}
            {activeTab === 'at-risk' && (
                <div className="space-y-4">
                    {atRiskAllStages.length === 0 ? (
                        <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
                            <FiCheckCircle size={36} className="text-green-400 mx-auto mb-2"/>
                            <p className="font-bold text-green-600">No students at critical risk in this cohort! 🎉</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                                <p className="font-black text-red-700 text-sm flex items-center gap-2"><FiAlertTriangle size={14}/>🚨 {atRiskAllStages.length} Students Chronically At-Risk (Overall Avg &lt; 40%)</p>
                                <p className="text-xs text-red-600 mt-1">These students have been struggling throughout the cohort journey. Immediate multi-stage intervention is required.</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-red-50 border-b border-red-100">
                                            {['Student','Adm No','Gender','Overall Avg','Trend','Guardian Phone','Intervention Recommended'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-red-500 uppercase whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50">
                                        {atRiskAllStages.map(st => (
                                            <tr key={st.student.id} className="hover:bg-red-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-black text-red-700">{st.student.first_name?.[0]}{st.student.last_name?.[0]}</div>
                                                        <p className="font-bold text-gray-800 text-xs">{st.student.first_name} {st.student.last_name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{st.student.admission_no || st.student.admission_number}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{st.student.gender}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-black text-red-600">{st.overallAvg.toFixed(1)}%</span>
                                                    <div><GradePill grade={grd(st.overallAvg).grade} size="xs"/></div>
                                                </td>
                                                <td className="px-4 py-3"><TrendArrow val={st.trend}/></td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{st.student.guardian_phone || st.student.emergency_contact_phone || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[9px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full block">📚 Remedial Classes</span>
                                                        <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full block">🫶 Guidance Referral</span>
                                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full block">📞 Parent Meeting</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Declining students */}
                    {declining.length > 0 && (
                        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-amber-100 flex items-center gap-2">
                                <FiTrendingDown className="text-amber-500"/>
                                <p className="font-black text-amber-700">📉 Declining Students (Drop &gt; 5%) — {declining.length} students</p>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {declining.map(st => (
                                    <div key={st.student.id} className="px-4 py-3 flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-black text-amber-700">{st.student.first_name?.[0]}{st.student.last_name?.[0]}</div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 text-xs">{st.student.first_name} {st.student.last_name}</p>
                                            <p className="text-[10px] text-gray-400">Started: {st.stages.find(s => s.avg > 0)?.avg.toFixed(1) || '—'}% → Now: {st.latestAvg.toFixed(1)}%</p>
                                        </div>
                                        <TrendArrow val={st.trend}/>
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Needs Support</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ KCSE PREDICTION (844 only) ══════ */}
            {activeTab === 'prediction' && mode === '844' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
                        <p className="font-black text-gray-800 mb-1">🎯 KCSE Grade Predictions — {cohortYear} Cohort</p>
                        <p className="text-xs text-gray-500">Based on current trajectory and trend analysis. Predictions improve as more term data is available.</p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                        {['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'].map(grade => {
                            const count = kcsePredictions.filter(p => p.predictedGrade === grade).length;
                            const g = GRADE_SCALE.find(gs => gs.grade === grade);
                            if (!count) return null;
                            return (
                                <div key={grade} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                                    <p className="text-2xl font-black" style={{ color: g?.color }}>{count}</p>
                                    <GradePill grade={grade} size="sm"/>
                                </div>
                            );
                        })}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['#','Student','Current Avg','Trend','Projected KCSE %','Predicted Grade','Confidence'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {kcsePredictions.sort((a, b) => b.projectedFinal - a.projectedFinal).map((p, i) => (
                                    <tr key={p.student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-800 text-xs">{p.student.first_name} {p.student.last_name}</p>
                                            <p className="text-[10px] text-gray-400">{p.student.admission_no || p.student.admission_number}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold" style={{ color: grd(p.currentAvg).color }}>{p.currentAvg > 0 ? `${p.currentAvg.toFixed(1)}%` : '—'}</td>
                                        <td className="px-4 py-3">{p.overallAvg > 0 ? <TrendArrow val={p.trend}/> : '—'}</td>
                                        <td className="px-4 py-3">
                                            {p.projectedFinal > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${p.projectedFinal}%`, background: grd(p.projectedFinal).color }}/></div>
                                                    <span className="text-xs font-black" style={{ color: grd(p.projectedFinal).color }}>{p.projectedFinal.toFixed(1)}%</span>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">{p.predictedGrade !== 'E' || p.projectedFinal > 0 ? <GradePill grade={p.predictedGrade}/> : '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeStages.filter(s => s.stageAvg > 0).length >= 3 ? 'bg-green-100 text-green-700' : activeStages.filter(s => s.stageAvg > 0).length >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {activeStages.filter(s => s.stageAvg > 0).length >= 3 ? '🟢 High' : activeStages.filter(s => s.stageAvg > 0).length >= 2 ? '🟡 Medium' : '🔴 Low'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

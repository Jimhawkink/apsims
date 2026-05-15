// ════════════════════════════════════════════════════════════════════════════
//  ALPHA ANALYSIS — COMPLETE page.tsx
//  Combined from PART1 (types + hooks) + PART2 (components) + PART3 (main page)
// ════════════════════════════════════════════════════════════════════════════
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiBarChart2, FiTrendingUp, FiTrendingDown, FiMinus, FiUsers,
    FiBook, FiTarget, FiZap, FiDownload, FiRefreshCw, FiFilter,
    FiActivity, FiAward, FiAlertTriangle, FiCheckCircle, FiSearch,
    FiChevronUp, FiChevronDown, FiPrinter, FiEye,
} from 'react-icons/fi';
import { HiSparkles, HiAcademicCap } from 'react-icons/hi2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement, PointElement, LineElement,
    Filler, RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, Filler, RadialLinearScale,
);

// ════════════════════════════════════════════════════════════════════════════
//  PART 1 — TYPES, CONSTANTS, DATA HOOKS
// ════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GradeEntry {
    grade: string; min_score: number; max_score: number; points: number; remarks: string;
}
export interface SubjectPerf {
    id: number; subject_name: string; subject_code: string;
    avg: number; passRate: number; count: number; highest: number; lowest: number;
    stdDev: number; aRate: number; eRate: number; meanGrade: GradeEntry;
    gradeBreakdown: Record<string, number>;
}
export interface StudentPerf {
    student: any; avg: number; totalPoints: number; best7Points: number;
    subjectCount: number; meanGrade: GradeEntry; count: number;
    highestSubject: string; lowestSubject: string;
    subjectScores: Record<number, number>;
}
export interface StreamPerf {
    id: number; stream_name: string; avg: number; count: number;
    passRate: number; meanGrade: GradeEntry; studentCount: number;
}
export type TabKey = 'overview' | 'subjects' | 'streams' | 'trends' | 'individual' | 'comparison' | 'gradesheet' | 'atrisk' | 'cbc';

// ─── Constants ────────────────────────────────────────────────────────────────
export const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

export const GRADE_COLORS: Record<string, { bg: string; text: string; light: string }> = {
    'A':  { bg: '#059669', text: '#fff', light: '#d1fae5' },
    'A-': { bg: '#10b981', text: '#fff', light: '#d1fae5' },
    'B+': { bg: '#0ea5e9', text: '#fff', light: '#e0f2fe' },
    'B':  { bg: '#3b82f6', text: '#fff', light: '#dbeafe' },
    'B-': { bg: '#6366f1', text: '#fff', light: '#e0e7ff' },
    'C+': { bg: '#8b5cf6', text: '#fff', light: '#ede9fe' },
    'C':  { bg: '#a78bfa', text: '#fff', light: '#ede9fe' },
    'C-': { bg: '#f59e0b', text: '#fff', light: '#fef3c7' },
    'D+': { bg: '#f97316', text: '#fff', light: '#ffedd5' },
    'D':  { bg: '#ef4444', text: '#fff', light: '#fee2e2' },
    'D-': { bg: '#dc2626', text: '#fff', light: '#fee2e2' },
    'E':  { bg: '#991b1b', text: '#fff', light: '#fee2e2' },
};
export const gc = (g: string) => GRADE_COLORS[g] || { bg: '#64748b', text: '#fff', light: '#f1f5f9' };

export const CHART_PALETTE = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1',
    '#84cc16','#a855f7',
];

// ─── Helper: standard deviation ───────────────────────────────────────────────
function stdDev(nums: number[]): number {
    if (nums.length < 2) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
    return Math.sqrt(variance);
}

// ─── Main hook: all data computation ─────────────────────────────────────────
export function useAnalysisData() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [allMarks, setAllMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Filter state
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [selStudent, setSelStudent] = useState('');
    const [tab, setTab] = useState<TabKey>('overview');
    const [compareExamType, setCompareExamType] = useState('Mid-Term');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [sortField, setSortField] = useState<string>('avg');
    const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
    const [showBest7, setShowBest7] = useState(true);
    const [curriculumMode, setCurriculumMode] = useState<'844'|'CBC'>('844');

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
        const cur = ((t.data || []) as any[]).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, [refreshKey]);

    useEffect(() => { fetchBase(); }, [fetchBase]);

    const getGrade = useCallback((score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score)
            || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    }, [grading]);

    // ── Filtered students ──────────────────────────────────────────────────────
    const classStudents = useMemo(() => students
        .filter(s => !selForm || String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream),
        [students, selForm, selStream]);

    const classStudentIds = useMemo(() => new Set(classStudents.map(s => s.id)), [classStudents]);

    // ── Filtered marks ──────────────────────────────────────────────────────────
    const termMarks = useMemo(() => allMarks.filter(m => {
        if (selTerm && String(m.term_id) !== selTerm) return false;
        if (selExamType && m.exam_type !== selExamType) return false;
        return classStudentIds.has(m.student_id);
    }), [allMarks, selTerm, selExamType, classStudentIds]);

    // ── Subject performance ────────────────────────────────────────────────────
    const subjectPerf: SubjectPerf[] = useMemo(() => subjects
        .map(sub => {
            const sm = termMarks.filter(m => m.subject_id === sub.id);
            if (sm.length === 0) return null;
            const scores = sm.map(m => Number(m.score));
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const passRate = (scores.filter(s => s >= 50).length / scores.length) * 100;
            const aRate = (scores.filter(s => s >= 75).length / scores.length) * 100;
            const eRate = (scores.filter(s => s < 30).length / scores.length) * 100;
            const gradeBreakdown: Record<string, number> = {};
            grading.forEach(g => { gradeBreakdown[g.grade] = 0; });
            scores.forEach(sc => {
                const g = getGrade(sc);
                gradeBreakdown[g.grade] = (gradeBreakdown[g.grade] || 0) + 1;
            });
            return {
                id: sub.id, subject_name: sub.subject_name, subject_code: sub.subject_code || sub.subject_name.slice(0, 5),
                avg, passRate, count: scores.length, highest: Math.max(...scores), lowest: Math.min(...scores),
                stdDev: stdDev(scores), aRate, eRate, meanGrade: getGrade(avg), gradeBreakdown,
            };
        })
        .filter(Boolean) as SubjectPerf[],
        [subjects, termMarks, grading, getGrade]);

    // ── Student performance ────────────────────────────────────────────────────
    const studentPerf: StudentPerf[] = useMemo(() => {
        return classStudents.map(student => {
            const sm = termMarks.filter(m => m.student_id === student.id);
            if (sm.length === 0) return null;
            const subjectScores: Record<number, number> = {};
            sm.forEach(m => { subjectScores[m.subject_id] = Number(m.score); });
            const scores = Object.values(subjectScores);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            // Best 7 for KCSE
            const sortedResults = sm.map(m => ({
                subId: m.subject_id, score: Number(m.score), points: getGrade(Number(m.score)).points
            })).sort((a, b) => b.points - a.points || b.score - a.score);
            const best7 = showBest7 ? sortedResults.slice(0, 7) : sortedResults;
            const totalPoints = best7.reduce((a, b) => a + b.points, 0);
            const subjectIds = Object.keys(subjectScores).map(Number);
            const highestId = subjectIds.reduce((a, b) => subjectScores[a] > subjectScores[b] ? a : b, subjectIds[0]);
            const lowestId = subjectIds.reduce((a, b) => subjectScores[a] < subjectScores[b] ? a : b, subjectIds[0]);
            const highSub = subjects.find(s => s.id === highestId);
            const lowSub = subjects.find(s => s.id === lowestId);
            return {
                student, avg, totalPoints, best7Points: totalPoints,
                subjectCount: scores.length, meanGrade: getGrade(avg), count: sm.length,
                highestSubject: highSub ? `${highSub.subject_name} (${subjectScores[highestId]})` : '',
                lowestSubject: lowSub ? `${lowSub.subject_name} (${subjectScores[lowestId]})` : '',
                subjectScores,
            };
        }).filter(Boolean) as StudentPerf[];
    }, [classStudents, termMarks, subjects, getGrade, showBest7]);

    // ── Stream performance ─────────────────────────────────────────────────────
    const streamPerf: StreamPerf[] = useMemo(() => streams.map(stream => {
        const sids = students.filter(s => s.stream_id === stream.id && (!selForm || String(s.form_id) === selForm)).map(s => s.id);
        const sm = termMarks.filter(m => sids.includes(m.student_id));
        if (sm.length === 0) return null;
        const scores = sm.map(m => Number(m.score));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passRate = (scores.filter(s => s >= 50).length / scores.length) * 100;
        return { ...stream, avg, count: sm.length, passRate, meanGrade: getGrade(avg), studentCount: sids.length };
    }).filter(Boolean) as StreamPerf[], [streams, students, termMarks, selForm, getGrade]);

    // ── Overall stats ──────────────────────────────────────────────────────────
    const overallStats = useMemo(() => {
        const n = termMarks.length;
        if (n === 0) return null;
        const scores = termMarks.map(m => Number(m.score));
        const avg = scores.reduce((a, b) => a + b, 0) / n;
        const passCount = scores.filter(s => s >= 50).length;
        const aCount = scores.filter(s => s >= 75).length;
        const eCount = scores.filter(s => s < 30).length;
        const gradeDist: Record<string, number> = {};
        grading.forEach(g => { gradeDist[g.grade] = 0; });
        scores.forEach(sc => {
            const g = getGrade(sc);
            gradeDist[g.grade] = (gradeDist[g.grade] || 0) + 1;
        });
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);
        const sd = stdDev(scores);
        const uniqueStudents = new Set(termMarks.map(m => m.student_id)).size;
        return { n, avg, passCount, aCount, eCount, passRate: (passCount / n) * 100, aRate: (aCount / n) * 100, eRate: (eCount / n) * 100, gradeDist, highest, lowest, sd, uniqueStudents, meanGrade: getGrade(avg) };
    }, [termMarks, grading, getGrade]);

    // ── Trend data (across terms) ──────────────────────────────────────────────
    const trendData = useMemo(() => [...terms].reverse().slice(0, 8).map(term => {
        const tm = allMarks.filter(m => {
            if (String(m.term_id) !== String(term.id)) return false;
            if (selExamType && m.exam_type !== selExamType) return false;
            return classStudentIds.has(m.student_id);
        });
        if (tm.length === 0) return null;
        const scores = tm.map(m => Number(m.score));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passRate = (scores.filter(s => s >= 50).length / scores.length) * 100;
        return { term: term.term_name, termId: term.id, avg, passRate, count: tm.length };
    }).filter(Boolean) as { term: string; termId: number; avg: number; passRate: number; count: number }[],
    [terms, allMarks, selExamType, classStudentIds]);

    // ── Exam type comparison (same term) ──────────────────────────────────────
    const examTypeComparison = useMemo(() => EXAM_TYPES.map(et => {
        const etm = allMarks.filter(m => {
            if (selTerm && String(m.term_id) !== selTerm) return false;
            if (m.exam_type !== et) return false;
            return classStudentIds.has(m.student_id);
        });
        if (etm.length === 0) return { examType: et, avg: 0, count: 0, passRate: 0 };
        const scores = etm.map(m => Number(m.score));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return { examType: et, avg, count: etm.length, passRate: (scores.filter(s => s >= 50).length / scores.length) * 100 };
    }), [allMarks, selTerm, classStudentIds]);

    // ── Individual student data ────────────────────────────────────────────────
    const individualStudent = useMemo(() =>
        selStudent ? students.find(s => s.id === Number(selStudent)) : null,
        [selStudent, students]);

    const individualData = useMemo(() => {
        if (!selStudent) return null;
        const sid = Number(selStudent);
        const myMarks = allMarks.filter(m => m.student_id === sid);
        // Per-term trend
        const perTerm = [...terms].reverse().map(term => {
            const tm = myMarks.filter(m => String(m.term_id) === String(term.id) && m.exam_type === selExamType);
            if (tm.length === 0) return null;
            const scores = tm.map(m => Number(m.score));
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            return { term: term.term_name, avg, count: tm.length };
        }).filter(Boolean) as { term: string; avg: number; count: number }[];
        // Per-exam-type this term
        const perExamType = EXAM_TYPES.map(et => {
            const em = myMarks.filter(m => m.exam_type === et && (selTerm ? String(m.term_id) === selTerm : true));
            if (em.length === 0) return { et, avg: 0, count: 0 };
            const sc = em.map(m => Number(m.score));
            return { et, avg: sc.reduce((a, b) => a + b, 0) / sc.length, count: em.length };
        });
        // Subject scores (current term + exam type)
        const subjectScores = subjects.map(sub => {
            const m = myMarks.find(mk => mk.subject_id === sub.id && (selTerm ? String(mk.term_id) === selTerm : true) && mk.exam_type === selExamType);
            return m ? { subjectName: sub.subject_name, score: Number(m.score), grade: getGrade(Number(m.score)) } : null;
        }).filter(Boolean) as { subjectName: string; score: number; grade: GradeEntry }[];
        // Class rank
        const sorted = [...studentPerf].sort((a, b) => b.avg - a.avg);
        const rank = sorted.findIndex(sp => sp.student.id === sid) + 1;
        const classAvg = overallStats?.avg || 0;
        const me = studentPerf.find(sp => sp.student.id === sid);
        return { perTerm, perExamType, subjectScores, rank, classAvg, totalStudents: sorted.length, me };
    }, [selStudent, allMarks, terms, selExamType, selTerm, subjects, getGrade, studentPerf, overallStats]);

    // ── Grade sheet (per student per subject grid) ─────────────────────────────
    const gradeSheetData = useMemo(() => {
        const activeSubjects = subjectPerf.map(sp => subjects.find(s => s.id === sp.id)).filter(Boolean);
        const rows = studentPerf.sort((a, b) => b.avg - a.avg);
        return { activeSubjects, rows };
    }, [subjectPerf, subjects, studentPerf]);

    // ── Top/bottom performers ──────────────────────────────────────────────────
    const topPerformers = useMemo(() => [...studentPerf].sort((a, b) => b.avg - a.avg).slice(0, 10), [studentPerf]);
    const bottomPerformers = useMemo(() => [...studentPerf].sort((a, b) => a.avg - b.avg).slice(0, 10), [studentPerf]);
    const atRiskStudents = useMemo(() => studentPerf.filter(sp => sp.avg < 40), [studentPerf]);

    // ── Export CSV ─────────────────────────────────────────────────────────────
    const exportCSV = useCallback((data: any[], filename: string) => {
        if (data.length === 0) return;
        const keys = Object.keys(data[0]);
        const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AlphaSchool_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }, []);

    return {
        // Raw data
        forms, streams, subjects, students, terms, grading, allMarks, loading,
        // Filter state
        selForm, setSelForm, selStream, setSelStream, selTerm, setSelTerm,
        selExamType, setSelExamType, selStudent, setSelStudent,
        tab, setTab, compareExamType, setCompareExamType,
        subjectSearch, setSubjectSearch, studentSearch, setStudentSearch,
        sortField, setSortField, sortDir, setSortDir,
        showBest7, setShowBest7, curriculumMode, setCurriculumMode,
        // Computed
        classStudents, termMarks, subjectPerf, studentPerf, streamPerf,
        overallStats, trendData, examTypeComparison,
        individualStudent, individualData,
        gradeSheetData, topPerformers, bottomPerformers, atRiskStudents,
        // Helpers
        getGrade, exportCSV,
        refresh: () => setRefreshKey(k => k + 1),
    };
}

// ════════════════════════════════════════════════════════════════════════════
//  PART 2 — ALL UI COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
    icon, label, value, sub, accent, trend, trendVal,
}: {
    icon: React.ReactNode; label: string; value: string | number | React.ReactNode;
    sub?: string; accent?: string; trend?: 'up'|'down'|'flat'; trendVal?: string;
}) {
    const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#94a3b8';
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8,
            borderLeft: accent ? `4px solid ${accent}` : undefined, minWidth: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: accent ? `${accent}18` : '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accent || '#64748b', flexShrink: 0,
                }}>{icon}</div>
                {trend && trendVal && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {trend === 'up' ? <FiTrendingUp size={11} /> : trend === 'down' ? <FiTrendingDown size={11} /> : <FiMinus size={11} />}
                        {trendVal}
                    </span>
                )}
            </div>
            <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '3px 0 0', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
                {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── GRADE BADGE ──────────────────────────────────────────────────────────────
function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'xs'|'sm'|'md'|'lg' }) {
    const c = gc(grade);
    const s = { xs: { w:22,h:16,fs:8 }, sm: { w:28,h:20,fs:9 }, md: { w:36,h:26,fs:11 }, lg: { w:46,h:34,fs:15 } }[size];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: s.w, height: s.h, borderRadius: 5, background: c.bg, color: c.text,
            fontWeight: 800, fontSize: s.fs, fontFamily: "'DM Mono','Courier New',monospace",
            letterSpacing: '0.02em', flexShrink: 0,
        }}>{grade}</span>
    );
}

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
    const pct = Math.min((value / max) * 100, 100);
    const col = color || (value >= 50 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444');
    return (
        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
    );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({
    title, subtitle, action, children, noPad = false,
}: {
    title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
                    {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{subtitle}</p>}
                </div>
                {action}
            </div>
            <div style={noPad ? {} : { padding: '16px 20px' }}>{children}</div>
        </div>
    );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function TabBar({
    tabs, active, onChange,
}: {
    tabs: { key: string; label: string; icon: React.ReactNode; badge?: number }[];
    active: string;
    onChange: (k: string) => void;
}) {
    return (
        <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 14, padding: 4, overflowX: 'auto', flexShrink: 0 }}>
            {tabs.map(t => (
                <button key={t.key} onClick={() => onChange(t.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                    borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.18s',
                    background: active === t.key ? '#fff' : 'transparent',
                    color: active === t.key ? '#1e293b' : '#64748b',
                    boxShadow: active === t.key ? '0 1px 6px rgba(0,0,0,.08)' : 'none',
                }}>
                    {t.icon}
                    {t.label}
                    {t.badge !== undefined && t.badge > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 800, padding: '1px 5px', minWidth: 16 }}>{t.badge}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ─── INSIGHT ROW ──────────────────────────────────────────────────────────────
function InsightRow({ color, icon, title, desc }: { color: string; icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ color, marginTop: 1, flexShrink: 0 }}>{icon}</div>
            <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', lineHeight: 1.5 }}>{desc}</p>
            </div>
        </div>
    );
}

// ─── SUBJECT PERFORMANCE TABLE ────────────────────────────────────────────────
function SubjectTable({
    data, getGrade, search, onSearch, sortField, sortDir, onSort,
}: {
    data: SubjectPerf[]; getGrade: (s: number) => GradeEntry;
    search: string; onSearch: (v: string) => void;
    sortField: string; sortDir: 'asc'|'desc'; onSort: (f: string) => void;
}) {
    const filtered = data.filter(s => s.subject_name.toLowerCase().includes(search.toLowerCase()));
    const sorted = [...filtered].sort((a: any, b: any) => {
        const va = a[sortField], vb = b[sortField];
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === 'asc' ? va - vb : vb - va;
    });
    const SortBtn = ({ field, label }: { field: string; label: string }) => (
        <span onClick={() => onSort(field)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, userSelect: 'none' }}>
            {label}
            {sortField === field ? (sortDir === 'asc' ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />) : null}
        </span>
    );
    return (
        <div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <FiSearch size={12} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search subject…"
                        style={{ width: '100%', padding: '7px 10px 7px 28px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{sorted.length} subjects</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {[
                                ['#', '#', 36], ['subject_name', 'Subject', 180], ['count', 'Entries', 70],
                                ['avg', 'Avg Score', 90], ['meanGrade', 'Grade', 70], ['highest', 'Highest', 80],
                                ['lowest', 'Lowest', 70], ['passRate', 'Pass Rate', 90], ['aRate', 'A Rate', 80],
                                ['eRate', 'Fail Rate', 80], ['stdDev', 'Std Dev', 80],
                            ].map(([field, label, w]) => (
                                <th key={field as string} style={{
                                    padding: '10px 12px', textAlign: field === 'subject_name' ? 'left' : 'center',
                                    fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                                    letterSpacing: '0.06em', width: Number(w), cursor: field !== '#' ? 'pointer' : 'default',
                                    borderBottom: '2px solid #e2e8f0',
                                }}>
                                    {field !== '#' ? <SortBtn field={field as string} label={label as string} /> : label}
                                </th>
                            ))}
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>
                                Performance Bar
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s, i) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff', transition: 'background .15s' }}>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.subject_name}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>{s.count}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{s.avg.toFixed(1)}%</span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}><GradeBadge grade={s.meanGrade.grade} size="sm" /></td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#10b981' }}>{s.highest}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{s.lowest}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: s.passRate >= 70 ? '#10b981' : s.passRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                                        {s.passRate.toFixed(0)}%
                                    </span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#10b981', fontWeight: 600 }}>{s.aRate.toFixed(0)}%</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{s.eRate.toFixed(0)}%</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>±{s.stdDev.toFixed(1)}</td>
                                <td style={{ padding: '10px 12px', minWidth: 120 }}>
                                    <ScoreBar value={s.avg} color={gc(s.meanGrade.grade).bg} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sorted.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No subjects match your search</div>
            )}
        </div>
    );
}

// ─── STUDENT TABLE (top/bottom/at-risk) ───────────────────────────────────────
function StudentTable({
    data, title, color, streams, forms, onSelectStudent,
}: {
    data: StudentPerf[]; title: string; color: string;
    streams: any[]; forms: any[]; onSelectStudent?: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = data.filter(sp =>
        `${sp.student.first_name} ${sp.student.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (sp.student.admission_no || sp.student.admission_number || '').toLowerCase().includes(search.toLowerCase())
    );
    return (
        <SectionCard
            title={title}
            subtitle={`${filtered.length} students`}
            action={
                <div style={{ position: 'relative' }}>
                    <FiSearch size={12} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                        style={{ padding: '6px 8px 6px 24px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', width: 140 }} />
                </div>
            }
            noPad
        >
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['Rank','Student','Adm No','Form','Stream','Avg','Grade','Best Subject','Weak Subject','Action'].map(h => (
                                <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Student' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((sp, i) => {
                            const formName = forms.find(f => f.id === sp.student.form_id)?.form_name || '-';
                            const streamName = streams.find(s => s.id === sp.student.stream_id)?.stream_name || '-';
                            return (
                                <tr key={sp.student.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 26, height: 26, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                                            background: i < 3 ? (i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32') : '#f1f5f9',
                                            color: i < 3 ? '#fff' : '#475569',
                                        }}>{i + 1}</span>
                                    </td>
                                    <td style={{ padding: '9px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                background: `hsl(${(sp.student.id * 47) % 360},65%,85%)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, fontWeight: 800, color: `hsl(${(sp.student.id * 47) % 360},45%,35%)`,
                                            }}>{sp.student.first_name?.[0]}{sp.student.last_name?.[0]}</div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                                {sp.student.first_name} {sp.student.last_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>
                                        {sp.student.admission_no || sp.student.admission_number}
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{formName}</td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{streamName}</td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: color }}>{sp.avg.toFixed(1)}%</span>
                                        <ScoreBar value={sp.avg} color={color} />
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center' }}><GradeBadge grade={sp.meanGrade.grade} size="sm" /></td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, color: '#10b981', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.highestSubject}</td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, color: '#ef4444', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.lowestSubject}</td>
                                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                        {onSelectStudent && (
                                            <button onClick={() => onSelectStudent(String(sp.student.id))}
                                                style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                                                <FiEye size={10} style={{ verticalAlign: 'middle' }} /> View
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No results</div>}
            </div>
        </SectionCard>
    );
}

// ─── GRADE DISTRIBUTION VISUAL BARS ──────────────────────────────────────────
function GradeDistBars({
    gradeDist, total, filterGrade, onFilter,
}: {
    gradeDist: Record<string, number>; total: number; filterGrade: string; onFilter: (g: string) => void;
}) {
    const entries = Object.entries(gradeDist).filter(([, v]) => v > 0);
    const maxCount = Math.max(...entries.map(([, v]) => v), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {entries.map(([grade, count]) => {
                const c = gc(grade);
                const barH = Math.max(10, (count / maxCount) * 72);
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                const isActive = filterGrade === grade;
                return (
                    <button key={grade} onClick={() => onFilter(isActive ? '' : grade)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                        borderRadius: 8, outline: isActive ? `2px solid ${c.bg}` : 'none',
                        outlineOffset: 2, transition: 'all 0.2s',
                    }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: c.bg }}>{pct}%</span>
                        <div style={{ width: 30, height: barH, background: c.bg, borderRadius: '4px 4px 2px 2px', opacity: isActive || !filterGrade ? 1 : 0.35 }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 19, borderRadius: 4, background: c.bg, color: c.text, fontWeight: 800, fontSize: 9 }}>{grade}</span>
                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── STREAM COMPARISON CARDS ──────────────────────────────────────────────────
function StreamCards({ data }: { data: StreamPerf[] }) {
    if (data.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No stream data available</p>;
    const best = [...data].sort((a, b) => b.avg - a.avg)[0];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {data.sort((a, b) => b.avg - a.avg).map((s, i) => {
                const isBest = s.id === best.id;
                return (
                    <div key={s.id} style={{
                        background: '#fff', border: `1px solid ${isBest ? '#f59e0b' : '#e2e8f0'}`,
                        borderRadius: 14, padding: '14px 16px',
                        borderTop: `3px solid ${CHART_PALETTE[i % CHART_PALETTE.length]}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{s.stream_name}</span>
                            <GradeBadge grade={s.meanGrade.grade} size="sm" />
                        </div>
                        <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{s.avg.toFixed(1)}%</p>
                        <ScoreBar value={s.avg} color={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: '#94a3b8' }}>
                            <span>Pass: <strong style={{ color: s.passRate >= 50 ? '#10b981' : '#ef4444' }}>{s.passRate.toFixed(0)}%</strong></span>
                            <span>{s.studentCount} students</span>
                        </div>
                        {isBest && <span style={{ fontSize: 9, background: '#fef3c7', color: '#d97706', borderRadius: 4, padding: '2px 6px', fontWeight: 700, marginTop: 6, display: 'inline-block' }}>🏆 Top Stream</span>}
                    </div>
                );
            })}
        </div>
    );
}

// ─── INDIVIDUAL STUDENT HEADER ────────────────────────────────────────────────
function IndividualHeader({
    student, forms, streams, rank, totalStudents, avg, meanGrade,
}: {
    student: any; forms: any[]; streams: any[]; rank: number; totalStudents: number; avg: number; meanGrade: GradeEntry;
}) {
    const formName = forms.find(f => f.id === student.form_id)?.form_name || '-';
    const streamName = streams.find(s => s.id === student.stream_id)?.stream_name || '-';
    const c = gc(meanGrade.grade);
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{
                    width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${(student.id * 47) % 360},60%,82%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 900, color: `hsl(${(student.id * 47) % 360},45%,30%)`,
                    border: `3px solid ${c.bg}`,
                }}>{student.first_name?.[0]}{student.last_name?.[0]}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{student.first_name} {student.last_name}</h2>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                        {student.admission_no || student.admission_number} · {formName} {streamName}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Class Rank', value: `#${rank}`, sub: `of ${totalStudents}`, color: '#f59e0b' },
                        { label: 'Mean Score', value: `${avg.toFixed(1)}%`, sub: meanGrade.remarks, color: '#6366f1' },
                        { label: 'Mean Grade', value: <GradeBadge grade={meanGrade.grade} size="lg" />, sub: '', color: c.bg },
                    ].map((item, i) => (
                        <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>{item.label}</p>
                            <div style={{ fontSize: 20, fontWeight: 900, color: item.color, margin: '4px 0 2px' }}>{item.value}</div>
                            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{item.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── GRADE SHEET GRID ─────────────────────────────────────────────────────────
function GradeSheetGrid({
    rows, subjects, getGrade, onExport,
}: {
    rows: StudentPerf[]; subjects: any[]; getGrade: (s: number) => GradeEntry; onExport: () => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = rows.filter(r =>
        `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (r.student.admission_no || '').toLowerCase().includes(search.toLowerCase())
    );
    return (
        <SectionCard
            title="Full Grade Sheet"
            subtitle="All students × all subjects — click Export to download"
            noPad
            action={
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch size={11} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                            style={{ padding: '6px 8px 6px 24px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, outline: 'none', fontFamily: 'inherit', width: 130 }} />
                    </div>
                    <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                        <FiDownload size={12} /> Export
                    </button>
                </div>
            }
        >
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr style={{ background: 'linear-gradient(90deg,#fffbeb,#fef3c7)' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', position: 'sticky', left: 0, background: '#fef3c7', minWidth: 160 }}>Student</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', minWidth: 50 }}>Avg</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', minWidth: 50 }}>Grade</th>
                            {subjects.map((sub: any) => (
                                <th key={sub.id} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', minWidth: 52, maxWidth: 70, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {sub.subject_code || sub.subject_name.slice(0, 6)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((sp, i) => (
                            <tr key={sp.student.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                                <td style={{ padding: '8px 12px', position: 'sticky', left: 0, background: i % 2 === 0 ? '#fff' : '#fafbff', zIndex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{sp.student.first_name} {sp.student.last_name}</p>
                                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>{sp.student.admission_no || sp.student.admission_number}</p>
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#6366f1' }}>{sp.avg.toFixed(1)}</td>
                                <td style={{ padding: '8px 8px', textAlign: 'center' }}><GradeBadge grade={sp.meanGrade.grade} size="xs" /></td>
                                {subjects.map((sub: any) => {
                                    const score = sp.subjectScores[sub.id];
                                    const g = score !== undefined ? getGrade(score) : null;
                                    return (
                                        <td key={sub.id} style={{
                                            padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                                            background: g ? `${gc(g.grade).light}` : 'transparent',
                                            color: g ? gc(g.grade).bg : '#d1d5db',
                                        }}>
                                            {score !== undefined ? score : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No students match search</div>}
            </div>
        </SectionCard>
    );
}

// ─── EXAM COMPARISON TABLE ────────────────────────────────────────────────────
function ExamComparisonTable({
    data, selExamType,
}: {
    data: { examType: string; avg: number; count: number; passRate: number }[];
    selExamType: string;
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {data.map(item => {
                const isActive = item.examType === selExamType;
                const hasData = item.count > 0;
                return (
                    <div key={item.examType} style={{
                        border: `1px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: 12, padding: '12px 14px', textAlign: 'center',
                        background: isActive ? '#eff6ff' : '#fff',
                        borderTop: `3px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                    }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{item.examType}</p>
                        <p style={{ fontSize: 22, fontWeight: 900, color: hasData ? '#0f172a' : '#d1d5db', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
                            {hasData ? `${item.avg.toFixed(1)}%` : '—'}
                        </p>
                        {hasData && <p style={{ fontSize: 10, color: item.passRate >= 50 ? '#10b981' : '#ef4444', fontWeight: 700, margin: 0 }}>Pass: {item.passRate.toFixed(0)}%</p>}
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>{item.count} entries</p>
                    </div>
                );
            })}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  PART 3 — CBC MAPPER, PRINT STYLES, PANELS, TABS, MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

// ── CBC Strand Mapper ─────────────────────────────────────────────────────────
const CBC_AREA_MAP: Record<string, string> = {
    mathematics: 'STEM', maths: 'STEM', math: 'STEM',
    physics: 'STEM', chemistry: 'STEM', biology: 'STEM', science: 'STEM',
    english: 'Languages', kiswahili: 'Languages', french: 'Languages', german: 'Languages', arabic: 'Languages',
    history: 'Humanities', geography: 'Humanities', cre: 'Humanities', ire: 'Humanities', 'social studies': 'Humanities',
    art: 'Creative Arts', music: 'Creative Arts', drama: 'Creative Arts',
    'home science': 'Applied', agriculture: 'Applied', 'business studies': 'Applied',
    ict: 'Applied', computer: 'Applied',
};
function getCBCArea(subjectName: string): string {
    const lower = subjectName.toLowerCase();
    for (const [key, area] of Object.entries(CBC_AREA_MAP)) {
        if (lower.includes(key)) return area;
    }
    return 'Other';
}
const CBC_AREA_COLORS: Record<string, string> = {
    STEM: '#3b82f6', Languages: '#10b981', Humanities: '#f59e0b',
    'Creative Arts': '#ec4899', Applied: '#8b5cf6', Other: '#64748b',
};

// ── Print style injection ─────────────────────────────────────────────────────
function injectPrintStyles() {
    const id = 'alpha-print-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #alpha-printzone, #alpha-printzone * { visibility: visible !important; }
      #alpha-printzone { position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
      .no-print { display: none !important; }
    }`;
    document.head.appendChild(style);
}

// ── CBC Performance Panel ─────────────────────────────────────────────────────
function CBCPanel({ subjectPerf, subjects, overallStats, getGrade, studentPerf }: {
    subjectPerf: SubjectPerf[]; subjects: any[]; overallStats: any;
    getGrade: (s: number) => GradeEntry; studentPerf: StudentPerf[];
}) {
    const areaMap: Record<string, SubjectPerf[]> = {};
    subjectPerf.forEach(sp => {
        const area = getCBCArea(sp.subject_name);
        if (!areaMap[area]) areaMap[area] = [];
        areaMap[area].push(sp);
    });

    function getCBCLevel(score: number) {
        if (score >= 75) return { label: 'Exceeding', color: '#059669', short: 'EE' };
        if (score >= 50) return { label: 'Meeting', color: '#3b82f6', short: 'ME' };
        if (score >= 30) return { label: 'Approaching', color: '#f59e0b', short: 'AE' };
        return { label: 'Below', color: '#ef4444', short: 'BE' };
    }

    const competencyDist = { EE: 0, ME: 0, AE: 0, BE: 0 };
    studentPerf.forEach(sp => {
        const lvl = getCBCLevel(sp.avg);
        (competencyDist as any)[lvl.short]++;
    });
    const total = studentPerf.length || 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* CBC Competency Overview */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(90deg,#f0fdf4,#ecfdf5)' }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>CBC Competency Distribution</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Kenya CBC 4-level competency framework (EE / ME / AE / BE)</p>
                </div>
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                        {[
                            { key: 'EE', label: 'Exceeding Expectations', color: '#059669', desc: '≥ 75%' },
                            { key: 'ME', label: 'Meeting Expectations', color: '#3b82f6', desc: '50–74%' },
                            { key: 'AE', label: 'Approaching Expectations', color: '#f59e0b', desc: '30–49%' },
                            { key: 'BE', label: 'Below Expectations', color: '#ef4444', desc: '< 30%' },
                        ].map(item => {
                            const count = (competencyDist as any)[item.key];
                            const pct = ((count / total) * 100).toFixed(0);
                            return (
                                <div key={item.key} style={{ border: `1px solid ${item.color}33`, borderRadius: 12, padding: '14px 16px', background: `${item.color}08`, textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: item.color, letterSpacing: '-0.03em' }}>{pct}%</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: item.color, marginTop: 2 }}>{count}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{item.key}</div>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{item.label}</div>
                                    <div style={{ fontSize: 10, color: item.color, fontWeight: 700, marginTop: 4 }}>{item.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Stacked bar */}
                    <div style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', gap: 1 }}>
                        {[
                            { key: 'EE', color: '#059669' }, { key: 'ME', color: '#3b82f6' },
                            { key: 'AE', color: '#f59e0b' }, { key: 'BE', color: '#ef4444' },
                        ].map(item => {
                            const pct = ((competencyDist as any)[item.key] / total) * 100;
                            return pct > 0 ? (
                                <div key={item.key} style={{ height: '100%', width: `${pct}%`, background: item.color, transition: 'width 0.6s ease' }} />
                            ) : null;
                        })}
                    </div>
                </div>
            </div>

            {/* Learning Area Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {Object.entries(areaMap).map(([area, subs]) => {
                    const areaAvg = subs.reduce((a, s) => a + s.avg, 0) / subs.length;
                    const areaColor = CBC_AREA_COLORS[area] || '#64748b';
                    return (
                        <div key={area} style={{ background: '#fff', border: `1px solid ${areaColor}33`, borderRadius: 16, overflow: 'hidden', borderTop: `3px solid ${areaColor}` }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: areaColor }}>{area}</span>
                                    <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8 }}>{subs.length} subject{subs.length > 1 ? 's' : ''}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{areaAvg.toFixed(1)}%</span>
                                    <div style={{ fontSize: 9, color: getCBCLevel(areaAvg).color, fontWeight: 700 }}>{getCBCLevel(areaAvg).label}</div>
                                </div>
                            </div>
                            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {subs.map(sub => {
                                    const lvl = getCBCLevel(sub.avg);
                                    return (
                                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject_name}</span>
                                            <div style={{ flex: 2, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${sub.avg}%`, background: lvl.color, borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: lvl.color, width: 38, textAlign: 'right', flexShrink: 0 }}>{sub.avg.toFixed(0)}%</span>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: lvl.color, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{lvl.short}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CBC Radar per learning area */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Learning Area Spider Chart</h3>
                </div>
                <div style={{ padding: '16px 20px', height: 340 }}>
                    <Radar
                        data={{
                            labels: Object.keys(areaMap),
                            datasets: [{
                                label: 'Average Score',
                                data: Object.entries(areaMap).map(([, subs]) => subs.reduce((a, s) => a + s.avg, 0) / subs.length),
                                backgroundColor: 'rgba(99,102,241,0.15)',
                                borderColor: '#6366f1',
                                borderWidth: 2,
                                pointBackgroundColor: '#6366f1',
                                pointRadius: 4,
                            }],
                        }}
                        options={{
                            responsive: true, maintainAspectRatio: false,
                            scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 10 } }, grid: { color: '#f1f5f9' }, pointLabels: { font: { size: 11, weight: 'bold' } } } },
                            plugins: { legend: { display: false } },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ── At-Risk Panel ─────────────────────────────────────────────────────────────
function AtRiskPanel({ atRiskStudents, studentPerf, forms, streams, subjects, getGrade, onSelectStudent }: {
    atRiskStudents: StudentPerf[]; studentPerf: StudentPerf[];
    forms: any[]; streams: any[]; subjects: any[];
    getGrade: (s: number) => GradeEntry;
    onSelectStudent: (id: string) => void;
}) {
    const [riskSearch, setRiskSearch] = useState('');
    const [riskSort, setRiskSort] = useState<'avg'|'count'>('avg');

    const filtered = atRiskStudents
        .filter(sp => `${sp.student.first_name} ${sp.student.last_name}`.toLowerCase().includes(riskSearch.toLowerCase()))
        .sort((a, b) => riskSort === 'avg' ? a.avg - b.avg : b.subjectCount - a.subjectCount);

    const critical = atRiskStudents.filter(sp => sp.avg < 25);
    const serious = atRiskStudents.filter(sp => sp.avg >= 25 && sp.avg < 35);
    const moderate = atRiskStudents.filter(sp => sp.avg >= 35 && sp.avg < 40);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Risk summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {[
                    { label: 'CRITICAL', sub: 'Below 25%', count: critical.length, color: '#991b1b', bg: '#fee2e2' },
                    { label: 'SERIOUS', sub: '25–34%', count: serious.length, color: '#c2410c', bg: '#ffedd5' },
                    { label: 'MODERATE', sub: '35–39%', count: moderate.length, color: '#b45309', bg: '#fef3c7' },
                ].map(tier => (
                    <div key={tier.label} style={{ background: tier.bg, border: `1px solid ${tier.color}33`, borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tier.label}</div>
                        <div style={{ fontSize: 34, fontWeight: 900, color: tier.color, letterSpacing: '-0.03em', margin: '6px 0' }}>{tier.count}</div>
                        <div style={{ fontSize: 10, color: tier.color }}>{tier.sub}</div>
                    </div>
                ))}
            </div>

            {/* List */}
            <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #fee2e2', background: '#fff5f5', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <FiAlertTriangle size={14} color="#ef4444" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', flex: 1 }}>Students Requiring Immediate Intervention ({filtered.length})</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ position: 'relative' }}>
                            <FiSearch size={11} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                            <input value={riskSearch} onChange={e => setRiskSearch(e.target.value)} placeholder="Search…"
                                style={{ padding: '5px 8px 5px 24px', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 11, outline: 'none', fontFamily: 'inherit', width: 130 }} />
                        </div>
                        <select value={riskSort} onChange={e => setRiskSort(e.target.value as any)}
                            style={{ padding: '5px 8px', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                            <option value="avg">Lowest first</option>
                            <option value="count">Most subjects</option>
                        </select>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                        <thead>
                            <tr style={{ background: '#fef2f2' }}>
                                {['#', 'Student', 'Adm No', 'Form/Stream', 'Avg Score', 'Grade', 'Risk Level', 'Worst Subject', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Student' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #fecaca' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((sp, i) => {
                                const tier = sp.avg < 25 ? { label: 'CRITICAL', color: '#991b1b', bg: '#fee2e2' } :
                                    sp.avg < 35 ? { label: 'SERIOUS', color: '#c2410c', bg: '#ffedd5' } :
                                    { label: 'MODERATE', color: '#b45309', bg: '#fef3c7' };
                                const formName = forms.find(f => f.id === sp.student.form_id)?.form_name || '-';
                                const streamName = streams.find(s => s.id === sp.student.stream_id)?.stream_name || '-';
                                return (
                                    <tr key={sp.student.id} style={{ borderBottom: '1px solid #fee2e2', background: i % 2 === 0 ? '#fff' : '#fffbfb' }}>
                                        <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                        <td style={{ padding: '9px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>
                                                    {sp.student.first_name?.[0]}{sp.student.last_name?.[0]}
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sp.student.first_name} {sp.student.last_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{sp.student.admission_no || sp.student.admission_number || '—'}</td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{formName} {streamName}</td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: '#ef4444' }}>{sp.avg.toFixed(1)}%</span>
                                            <div style={{ height: 4, background: '#fee2e2', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
                                                <div style={{ height: '100%', width: `${sp.avg}%`, background: '#ef4444', borderRadius: 2 }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center' }}><GradeBadge grade={sp.meanGrade.grade} size="sm" /></td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: tier.color, background: tier.bg, borderRadius: 6, padding: '3px 8px' }}>{tier.label}</span>
                                        </td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, color: '#ef4444', fontWeight: 600 }}>{sp.lowestSubject || '—'}</td>
                                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                            <button onClick={() => onSelectStudent(String(sp.student.id))}
                                                style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                                <FiEye size={10} style={{ verticalAlign: 'middle' }} /> Profile
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                            {atRiskStudents.length === 0 ? '🎉 No at-risk students — great performance!' : 'No results match search'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Advanced Comparison Tab ───────────────────────────────────────────────────
function AdvancedComparisonTab({ examTypeComparison, subjectPerf, trendData, streamPerf, overallStats }: {
    examTypeComparison: any[]; subjectPerf: SubjectPerf[];
    trendData: any[]; streamPerf: StreamPerf[]; overallStats: any;
}) {
    const [compView, setCompView] = useState<'examtype'|'subject_rank'|'distribution'>('examtype');
    const top5 = [...subjectPerf].sort((a, b) => b.avg - a.avg).slice(0, 5);
    const bottom5 = [...subjectPerf].sort((a, b) => a.avg - b.avg).slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sub-nav */}
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {[
                    { key: 'examtype', label: '📋 Exam Types' },
                    { key: 'subject_rank', label: '🏆 Subject Ranking' },
                    { key: 'distribution', label: '📊 Score Distribution' },
                ].map(v => (
                    <button key={v.key} onClick={() => setCompView(v.key as any)} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                        background: compView === v.key ? '#fff' : 'transparent',
                        color: compView === v.key ? '#1e293b' : '#64748b',
                        boxShadow: compView === v.key ? '0 1px 6px rgba(0,0,0,.08)' : 'none',
                    }}>{v.label}</button>
                ))}
            </div>

            {compView === 'examtype' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <ExamComparisonTable data={examTypeComparison} selExamType="" />
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Exam Type Performance — Avg vs Pass Rate</h3>
                        </div>
                        <div style={{ padding: '16px 20px', height: 320 }}>
                            <Bar
                                data={{
                                    labels: examTypeComparison.filter(e => e.count > 0).map(e => e.examType),
                                    datasets: [
                                        { label: 'Average Score (%)', data: examTypeComparison.filter(e => e.count > 0).map(e => e.avg), backgroundColor: CHART_PALETTE.slice(0, 6), borderRadius: 8, borderWidth: 0 },
                                        { label: 'Pass Rate (%)', data: examTypeComparison.filter(e => e.count > 0).map(e => e.passRate), backgroundColor: examTypeComparison.filter(e => e.count > 0).map(e => e.passRate >= 50 ? '#10b98155' : '#ef444455'), borderRadius: 8, borderWidth: 0 },
                                    ],
                                }}
                                options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                            />
                        </div>
                    </div>
                    {trendData.length >= 2 && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>School Mean Score — Historical Trend</h3>
                            </div>
                            <div style={{ padding: '16px 20px', height: 280 }}>
                                <Line
                                    data={{
                                        labels: trendData.map(t => t.term),
                                        datasets: [
                                            { label: 'Mean Score', data: trendData.map(t => t.avg), borderColor: '#3b82f6', backgroundColor: '#3b82f615', tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#3b82f6' },
                                            { label: 'Pass Rate', data: trendData.map(t => t.passRate), borderColor: '#10b981', backgroundColor: '#10b98115', tension: 0.4, fill: false, pointRadius: 5, pointBackgroundColor: '#10b981', borderDash: [4, 3] },
                                        ],
                                    }}
                                    options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {compView === 'subject_rank' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 18, overflow: 'hidden', borderTop: '3px solid #10b981' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#064e3b' }}>🏆 Top 5 Subjects</h3>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {top5.map((sub, i) => (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? '#f59e0b' : '#94a3b8', width: 24 }}>{['🥇','🥈','🥉','4th','5th'][i]}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sub.subject_name}</span>
                                            <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>{sub.avg.toFixed(1)}%</span>
                                        </div>
                                        <ScoreBar value={sub.avg} color="#10b981" />
                                    </div>
                                    <GradeBadge grade={sub.meanGrade.grade} size="sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 18, overflow: 'hidden', borderTop: '3px solid #ef4444' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#7f1d1d' }}>⚠️ Needs Attention</h3>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {bottom5.map((sub, i) => (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', width: 24 }}>{i + 1}.</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sub.subject_name}</span>
                                            <span style={{ fontSize: 13, fontWeight: 900, color: '#ef4444' }}>{sub.avg.toFixed(1)}%</span>
                                        </div>
                                        <ScoreBar value={sub.avg} color="#ef4444" />
                                    </div>
                                    <GradeBadge grade={sub.meanGrade.grade} size="sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {subjectPerf.length > 0 && (
                        <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>All Subjects — Performance Comparison</h3>
                            </div>
                            <div style={{ padding: '16px 20px', height: Math.max(300, subjectPerf.length * 32) }}>
                                <Bar
                                    data={{
                                        labels: [...subjectPerf].sort((a, b) => b.avg - a.avg).map(s => s.subject_name),
                                        datasets: [{
                                            label: 'Average Score',
                                            data: [...subjectPerf].sort((a, b) => b.avg - a.avg).map(s => s.avg),
                                            backgroundColor: [...subjectPerf].sort((a, b) => b.avg - a.avg).map(s => gc(s.meanGrade.grade).bg),
                                            borderRadius: 6, borderWidth: 0,
                                        }],
                                    }}
                                    options={{
                                        indexAxis: 'y' as const,
                                        responsive: true, maintainAspectRatio: false,
                                        scales: { x: { max: 100, grid: { color: '#f1f5f9' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } },
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {compView === 'distribution' && overallStats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Score Frequency Distribution</h3>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Number of marks per 10-point score band</p>
                        </div>
                        <div style={{ padding: '16px 20px', height: 300 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: '100%' }}>
                                <div>
                                    <Doughnut
                                        data={{
                                            labels: Object.keys(overallStats.gradeDist || {}).filter(k => (overallStats.gradeDist[k] || 0) > 0),
                                            datasets: [{
                                                data: Object.entries(overallStats.gradeDist || {}).filter(([, v]) => (v as number) > 0).map(([, v]) => v as number),
                                                backgroundColor: Object.keys(overallStats.gradeDist || {}).filter(k => (overallStats.gradeDist[k] || 0) > 0).map(k => gc(k).bg),
                                                borderWidth: 2, borderColor: '#fff',
                                            }],
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } } }, cutout: '60%' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                                    {[
                                        { label: 'Mean Score', value: `${overallStats.avg.toFixed(1)}%`, color: '#6366f1' },
                                        { label: 'Highest Score', value: `${overallStats.highest}%`, color: '#10b981' },
                                        { label: 'Lowest Score', value: `${overallStats.lowest}%`, color: '#ef4444' },
                                        { label: 'Std Deviation', value: `±${overallStats.sd.toFixed(1)}`, color: '#f59e0b' },
                                        { label: 'Total Entries', value: overallStats.n, color: '#3b82f6' },
                                        { label: 'Unique Students', value: overallStats.uniqueStudents, color: '#8b5cf6' },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#f8fafc', borderRadius: 8 }}>
                                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: item.color }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Grade Distribution — All Grades</h3>
                        </div>
                        <div style={{ padding: '20px 24px' }}>
                            <GradeDistBars gradeDist={overallStats.gradeDist} total={overallStats.n} filterGrade="" onFilter={() => {}} />
                        </div>
                    </div>
                    {streamPerf.length >= 3 && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Stream Comparison Radar</h3>
                            </div>
                            <div style={{ padding: '16px', height: 320 }}>
                                <Radar
                                    data={{
                                        labels: ['Avg Score', 'Pass Rate', 'Student Count', 'Top Grade Rate'],
                                        datasets: streamPerf.slice(0, 6).map((s, i) => ({
                                            label: s.stream_name,
                                            data: [s.avg, s.passRate, Math.min(s.studentCount * 2, 100), s.avg >= 70 ? 80 : s.avg >= 50 ? 50 : 20],
                                            backgroundColor: `${CHART_PALETTE[i]}22`,
                                            borderColor: CHART_PALETTE[i],
                                            borderWidth: 2, pointRadius: 3,
                                        })),
                                    }}
                                    options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 } }, grid: { color: '#f1f5f9' } } }, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ overallStats, subjectPerf, streamPerf, topPerformers, atRiskStudents, trendData, getGrade, forms, streams, onSelectStudent }: any) {
    const [filterGrade, setFilterGrade] = useState('');

    if (!overallStats) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <HiSparkles size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>No data for the selected filters</p>
                <p style={{ fontSize: 12 }}>Try selecting a different form, term, or exam type</p>
            </div>
        );
    }

    const insights: { color: string; icon: React.ReactNode; title: string; desc: string }[] = [];
    if (overallStats.passRate >= 70) insights.push({ color: '#10b981', icon: <FiCheckCircle size={14} />, title: 'Strong Pass Rate', desc: `${overallStats.passRate.toFixed(0)}% of students passed — above the 70% target.` });
    if (overallStats.passRate < 50) insights.push({ color: '#ef4444', icon: <FiAlertTriangle size={14} />, title: 'Low Pass Rate', desc: `Only ${overallStats.passRate.toFixed(0)}% passed. Urgent intervention recommended.` });
    if (overallStats.aRate >= 20) insights.push({ color: '#3b82f6', icon: <FiAward size={14} />, title: 'High Achievers', desc: `${overallStats.aRate.toFixed(0)}% of marks are A-grade — exceptional performance.` });
    if (overallStats.eRate > 15) insights.push({ color: '#f97316', icon: <FiAlertTriangle size={14} />, title: 'High Failure Rate', desc: `${overallStats.eRate.toFixed(0)}% scored below 30% — requires remedial programs.` });
    if (overallStats.sd > 18) insights.push({ color: '#8b5cf6', icon: <FiActivity size={14} />, title: 'High Score Variance', desc: `Standard deviation of ${overallStats.sd.toFixed(1)} indicates uneven performance. Review weaker streams.` });
    if (atRiskStudents.length > 0) insights.push({ color: '#ef4444', icon: <FiAlertTriangle size={14} />, title: `${atRiskStudents.length} At-Risk Students`, desc: `Students averaging below 40% need immediate teacher attention.` });

    const sortedSubs = [...subjectPerf].sort((a, b) => b.avg - a.avg);
    const bestSub = sortedSubs.length > 0 ? sortedSubs[0] : null;
    const worstSub = sortedSubs.length > 0 ? sortedSubs[sortedSubs.length - 1] : null;
    if (bestSub) insights.push({ color: '#10b981', icon: <FiZap size={14} />, title: `Best: ${bestSub.subject_name}`, desc: `Mean score ${bestSub.avg.toFixed(1)}%, pass rate ${bestSub.passRate.toFixed(0)}%` });
    if (worstSub && worstSub.id !== bestSub?.id) insights.push({ color: '#f59e0b', icon: <FiBook size={14} />, title: `Weakest: ${worstSub.subject_name}`, desc: `Mean score ${worstSub.avg.toFixed(1)}% — additional support needed.` });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                <StatCard icon={<FiBarChart2 size={16} />} label="Mean Score" value={`${overallStats.avg.toFixed(1)}%`} sub={overallStats.meanGrade.remarks} accent="#6366f1" trend={overallStats.avg >= 50 ? 'up' : 'down'} trendVal={`${overallStats.avg.toFixed(0)}%`} />
                <StatCard icon={<FiUsers size={16} />} label="Students" value={overallStats.uniqueStudents} sub={`${overallStats.n} total entries`} accent="#3b82f6" />
                <StatCard icon={<FiCheckCircle size={16} />} label="Pass Rate" value={`${overallStats.passRate.toFixed(0)}%`} sub={`${overallStats.passCount} passed`} accent="#10b981" trend={overallStats.passRate >= 50 ? 'up' : 'down'} trendVal={`${overallStats.passRate.toFixed(0)}%`} />
                <StatCard icon={<FiAward size={16} />} label="A Grades" value={`${overallStats.aRate.toFixed(0)}%`} sub={`${overallStats.aCount} entries`} accent="#f59e0b" />
                <StatCard icon={<FiAlertTriangle size={16} />} label="Below 30%" value={`${overallStats.eRate.toFixed(0)}%`} sub={`${overallStats.eCount} entries`} accent="#ef4444" />
                <StatCard icon={<FiActivity size={16} />} label="Std Deviation" value={`±${overallStats.sd.toFixed(1)}`} sub={`Range: ${overallStats.lowest}–${overallStats.highest}`} accent="#8b5cf6" />
                <StatCard icon={<HiAcademicCap size={16} />} label="Mean Grade" value={<GradeBadge grade={overallStats.meanGrade.grade} size="lg" />} sub={overallStats.meanGrade.remarks} accent={gc(overallStats.meanGrade.grade).bg} />
            </div>

            {/* Grade distribution + donut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionCard title="Grade Distribution" subtitle="Click a grade to filter">
                    <GradeDistBars gradeDist={overallStats.gradeDist} total={overallStats.n} filterGrade={filterGrade} onFilter={setFilterGrade} />
                </SectionCard>
                <SectionCard title="Grade Donut" subtitle="Visual proportion">
                    <div style={{ height: 200 }}>
                        <Doughnut
                            data={{
                                labels: Object.keys(overallStats.gradeDist).filter(k => overallStats.gradeDist[k] > 0),
                                datasets: [{
                                    data: Object.entries(overallStats.gradeDist).filter(([, v]) => (v as number) > 0).map(([, v]) => v as number),
                                    backgroundColor: Object.keys(overallStats.gradeDist).filter(k => overallStats.gradeDist[k] > 0).map(k => gc(k).bg),
                                    borderWidth: 2, borderColor: '#fff',
                                }],
                            }}
                            options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { font: { size: 10 }, padding: 8 } } } }}
                        />
                    </div>
                </SectionCard>
            </div>

            {/* Subject averages chart */}
            {subjectPerf.length > 0 && (
                <SectionCard title="Subject Performance Overview" subtitle="Avg scores and pass rates — sorted by performance">
                    <div style={{ height: 300 }}>
                        <Bar
                            data={{
                                labels: subjectPerf.map((s: SubjectPerf) => s.subject_code || s.subject_name.substring(0, 8)),
                                datasets: [
                                    { label: 'Avg Score', data: subjectPerf.map((s: SubjectPerf) => s.avg), backgroundColor: CHART_PALETTE, borderRadius: 6, borderWidth: 0 },
                                    { label: 'Pass Rate', data: subjectPerf.map((s: SubjectPerf) => s.passRate), backgroundColor: subjectPerf.map((s: SubjectPerf) => s.passRate >= 50 ? '#10b98155' : '#ef444455'), borderRadius: 6, borderWidth: 0 },
                                ],
                            }}
                            options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                        />
                    </div>
                </SectionCard>
            )}

            {/* Top performers + insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionCard title="🏆 Top 5 Students" subtitle="Highest average scores">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topPerformers.slice(0, 5).map((sp: StudentPerf, i: number) => (
                            <div key={sp.student.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 16, width: 26 }}>{['🥇','🥈','🥉','4','5'][i]}</span>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${sp.student.id * 47 % 360},60%,82%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: `hsl(${sp.student.id * 47 % 360},45%,30%)`, flexShrink: 0 }}>
                                    {sp.student.first_name?.[0]}{sp.student.last_name?.[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sp.student.first_name} {sp.student.last_name}</span>
                                    <ScoreBar value={sp.avg} color="#10b981" />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981', flexShrink: 0 }}>{sp.avg.toFixed(1)}%</span>
                                <GradeBadge grade={sp.meanGrade.grade} size="sm" />
                            </div>
                        ))}
                    </div>
                </SectionCard>
                <SectionCard title="💡 Smart Insights" subtitle="Auto-generated from your data">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {insights.slice(0, 6).map((ins, i) => (
                            <InsightRow key={i} color={ins.color} icon={ins.icon} title={ins.title} desc={ins.desc} />
                        ))}
                        {insights.length === 0 && <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No critical insights — data looks balanced.</p>}
                    </div>
                </SectionCard>
            </div>

            {/* Stream summary */}
            {streamPerf.length > 0 && (
                <SectionCard title="Stream Overview">
                    <StreamCards data={streamPerf} />
                </SectionCard>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE — DEFAULT EXPORT
// ════════════════════════════════════════════════════════════════════════════
export default function AnalysisPage() {
    const D = useAnalysisData();

    const [filterGrade, setFilterGrade] = useState('');
    const [printReady, setPrintReady] = useState(false);
    const [showAtRisk, setShowAtRisk] = useState(false);
    const [cbcSubTab, setCbcSubTab] = useState<'overview'|'cbc'>('overview');

    const selTermLabel = D.terms.find((t: any) => String(t.id) === D.selTerm)?.term_name || 'All Terms';
    const selFormLabel = D.forms.find((f: any) => String(f.id) === D.selForm)?.form_name || 'All Forms';

    function handlePrint() {
        injectPrintStyles();
        setTimeout(() => window.print(), 100);
    }

    function exportGradeSheet() {
        const { rows, activeSubjects } = D.gradeSheetData;
        const data = rows.map((sp, i) => {
            const row: any = {
                rank: i + 1, name: `${sp.student.first_name} ${sp.student.last_name}`,
                admission: sp.student.admission_no || sp.student.admission_number || '',
                avg: sp.avg.toFixed(1), grade: sp.meanGrade.grade, points: sp.totalPoints,
            };
            activeSubjects.forEach((sub: any) => {
                row[sub.subject_code || sub.subject_name] = sp.subjectScores[sub.id] ?? '';
            });
            return row;
        });
        D.exportCSV(data, `GradeSheet_${selFormLabel}_${selTermLabel}_${D.selExamType}`);
    }

    const TABS = [
        { key: 'overview', label: 'Overview', icon: <FiBarChart2 size={13} /> },
        { key: 'subjects', label: 'Subjects', icon: <FiBook size={13} />, badge: D.subjectPerf.filter(s => s.passRate < 50).length },
        { key: 'streams', label: 'Streams', icon: <FiUsers size={13} /> },
        { key: 'trends', label: 'Trends', icon: <FiTrendingUp size={13} /> },
        { key: 'individual', label: 'Individual', icon: <FiTarget size={13} /> },
        { key: 'comparison', label: 'Comparison', icon: <FiActivity size={13} /> },
        { key: 'gradesheet', label: 'Grade Sheet', icon: <FiPrinter size={13} /> },
        { key: 'atrisk', label: 'At-Risk', icon: <FiAlertTriangle size={13} />, badge: D.atRiskStudents.length },
        { key: 'cbc', label: 'CBC Mode', icon: <HiAcademicCap size={13} /> },
    ];

    if (D.loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiRefreshCw size={24} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Loading Analysis Engine…</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>Fetching marks, students, and grading data</p>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
        );
    }

    return (
        <div id="alpha-printzone" style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* ── TOP HEADER ── */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e293b 100%)', padding: '20px 28px', color: '#fff' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <HiAcademicCap size={22} color="#a5b4fc" />
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>Alpha Academic Analysis</h1>
                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Powered by AlphaSchool ERP · {D.curriculumMode} Curriculum</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { label: selFormLabel, color: '#6366f1' },
                                    { label: selTermLabel, color: '#3b82f6' },
                                    { label: D.selExamType, color: '#10b981' },
                                    { label: `${D.classStudents.length} students`, color: '#f59e0b' },
                                    { label: `${D.subjectPerf.length} subjects`, color: '#8b5cf6' },
                                ].map(tag => (
                                    <span key={tag.label} style={{ fontSize: 10, fontWeight: 700, color: tag.color, background: `${tag.color}22`, borderRadius: 20, padding: '3px 10px', border: `1px solid ${tag.color}44` }}>
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Action buttons */}
                        <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <button onClick={D.refresh} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                                <FiRefreshCw size={13} /> Refresh
                            </button>
                            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                                <FiPrinter size={13} /> Print Report
                            </button>
                            <button onClick={exportGradeSheet} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #3b82f666', background: '#3b82f622', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                                <FiDownload size={13} /> Export CSV
                            </button>
                            {/* Curriculum toggle */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                                {(['844', 'CBC'] as const).map(mode => (
                                    <button key={mode} onClick={() => D.setCurriculumMode(mode)} style={{
                                        padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                                        background: D.curriculumMode === mode ? '#6366f1' : 'transparent',
                                        color: D.curriculumMode === mode ? '#fff' : '#94a3b8', transition: 'all 0.15s',
                                    }}>{mode}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FILTER BAR ── */}
            <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 28px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FiFilter size={14} color="#94a3b8" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filters:</span>

                    <select value={D.selForm} onChange={e => D.setSelForm(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', fontWeight: 600 }}>
                        <option value="">All Forms</option>
                        {D.forms.map((f: any) => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                    </select>

                    <select value={D.selStream} onChange={e => D.setSelStream(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', fontWeight: 600 }}>
                        <option value="">All Streams</option>
                        {D.streams.map((s: any) => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
                    </select>

                    <select value={D.selTerm} onChange={e => D.setSelTerm(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', fontWeight: 600 }}>
                        <option value="">All Terms</option>
                        {D.terms.map((t: any) => <option key={t.id} value={String(t.id)}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}
                    </select>

                    <select value={D.selExamType} onChange={e => D.setSelExamType(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', fontWeight: 600 }}>
                        <option value="">All Exam Types</option>
                        {EXAM_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                    </select>

                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                        <FiSearch size={12} color="#94a3b8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                        <select value={D.selStudent} onChange={e => { D.setSelStudent(e.target.value); if (e.target.value) D.setTab('individual'); }}
                            style={{ padding: '7px 12px 7px 26px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: D.selStudent ? '#6366f1' : '#94a3b8', fontWeight: 600, minWidth: 160 }}>
                            <option value="">Select Student…</option>
                            {D.classStudents.map((s: any) => <option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</option>)}
                        </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', userSelect: 'none' }}>
                        <input type="checkbox" checked={D.showBest7} onChange={e => D.setShowBest7(e.target.checked)}
                            style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
                        Best 7 (KCSE)
                    </label>
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px' }}>
                {/* TAB BAR */}
                <div className="no-print" style={{ marginBottom: 20 }}>
                    <TabBar tabs={TABS} active={D.tab} onChange={k => D.setTab(k as TabKey)} />
                </div>

                {/* ──────────────── TAB: OVERVIEW ──────────────── */}
                {D.tab === 'overview' && (
                    <OverviewTab
                        overallStats={D.overallStats}
                        subjectPerf={D.subjectPerf}
                        streamPerf={D.streamPerf}
                        topPerformers={D.topPerformers}
                        atRiskStudents={D.atRiskStudents}
                        trendData={D.trendData}
                        getGrade={D.getGrade}
                        forms={D.forms}
                        streams={D.streams}
                        onSelectStudent={(id: string) => { D.setSelStudent(id); D.setTab('individual'); }}
                    />
                )}

                {/* ──────────────── TAB: SUBJECTS ──────────────── */}
                {D.tab === 'subjects' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {D.subjectPerf.length > 0 && (
                            <SectionCard title="Subject Averages & Pass Rates" subtitle="Sorted best to worst">
                                <div style={{ height: 320 }}>
                                    <Bar
                                        data={{
                                            labels: D.subjectPerf.map(s => s.subject_code || s.subject_name.substring(0, 10)),
                                            datasets: [
                                                { label: 'Avg Score', data: D.subjectPerf.map(s => s.avg), backgroundColor: CHART_PALETTE, borderRadius: 8, borderWidth: 0 },
                                                { label: 'Pass Rate', data: D.subjectPerf.map(s => s.passRate), backgroundColor: D.subjectPerf.map(s => s.passRate >= 50 ? '#10b98166' : '#ef444466'), borderRadius: 8, borderWidth: 0 },
                                            ],
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                                    />
                                </div>
                            </SectionCard>
                        )}
                        {D.subjectPerf.length > 0 && (
                            <SectionCard title="Grade Breakdown per Subject" subtitle="Stacked by grade category">
                                <div style={{ height: 300 }}>
                                    <Bar
                                        data={{
                                            labels: D.subjectPerf.map(s => s.subject_code || s.subject_name.substring(0, 8)),
                                            datasets: ['A', 'B', 'C', 'D', 'E'].map((grp, gi) => ({
                                                label: grp + ' grades',
                                                data: D.subjectPerf.map(s => {
                                                    const keys = Object.keys(s.gradeBreakdown || {}).filter(k => k.startsWith(grp));
                                                    return keys.reduce((a, k) => a + (s.gradeBreakdown[k] || 0), 0);
                                                }),
                                                backgroundColor: [GRADE_COLORS['A'].bg, GRADE_COLORS['B'].bg, GRADE_COLORS['C'].bg, GRADE_COLORS['D'].bg, GRADE_COLORS['E'].bg][gi],
                                                borderWidth: 0, stack: 'grades',
                                            })),
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#f1f5f9' } } }, plugins: { legend: { position: 'top' } } }}
                                    />
                                </div>
                            </SectionCard>
                        )}
                        <SectionCard title="Subject Performance Table" subtitle="Click column headers to sort" noPad>
                            <SubjectTable
                                data={D.subjectPerf} getGrade={D.getGrade}
                                search={D.subjectSearch} onSearch={D.setSubjectSearch}
                                sortField={D.sortField} sortDir={D.sortDir}
                                onSort={(f: string) => { if (D.sortField === f) D.setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { D.setSortField(f); D.setSortDir('desc'); } }}
                            />
                        </SectionCard>
                    </div>
                )}

                {/* ──────────────── TAB: STREAMS ──────────────── */}
                {D.tab === 'streams' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <SectionCard title="Stream Performance Summary">
                            <StreamCards data={D.streamPerf} />
                        </SectionCard>
                        {D.streamPerf.length > 0 && (
                            <SectionCard title="Stream Comparison Chart" subtitle="Average scores per stream">
                                <div style={{ height: 340 }}>
                                    <Bar
                                        data={{
                                            labels: D.streamPerf.map(s => s.stream_name),
                                            datasets: [
                                                { label: 'Avg Score', data: D.streamPerf.map(s => s.avg), backgroundColor: CHART_PALETTE, borderRadius: 10, borderWidth: 0 },
                                                { label: 'Pass Rate', data: D.streamPerf.map(s => s.passRate), backgroundColor: D.streamPerf.map(s => `${s.passRate >= 50 ? '#10b981' : '#ef4444'}55`), borderRadius: 10, borderWidth: 0 },
                                            ],
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                                    />
                                </div>
                            </SectionCard>
                        )}
                        {D.streamPerf.length >= 3 && (
                            <SectionCard title="Stream Radar — Multi-Metric">
                                <div style={{ height: 340 }}>
                                    <Radar
                                        data={{
                                            labels: ['Avg Score', 'Pass Rate', 'A-Grade Rate', 'Student Density'],
                                            datasets: D.streamPerf.slice(0, 6).map((s, i) => ({
                                                label: s.stream_name,
                                                data: [s.avg, s.passRate, (s.avg >= 70 ? 70 : s.avg * 0.8), Math.min(s.studentCount * 3, 100)],
                                                backgroundColor: `${CHART_PALETTE[i]}22`, borderColor: CHART_PALETTE[i], borderWidth: 2, pointRadius: 4,
                                            })),
                                        }}
                                        options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 } } } }, plugins: { legend: { position: 'bottom' } } }}
                                    />
                                </div>
                            </SectionCard>
                        )}
                        {/* Top 3 per stream */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                            {D.streamPerf.map((stream: StreamPerf, si: number) => {
                                const streamStudents = D.studentPerf.filter(sp => sp.student.stream_id === stream.id).sort((a, b) => b.avg - a.avg).slice(0, 3);
                                return (
                                    <SectionCard key={stream.id} title={`${stream.stream_name} — Top 3`} subtitle={`Mean: ${stream.avg.toFixed(1)}%`}>
                                        {streamStudents.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 12 }}>No data</p> : streamStudents.map((sp, i) => (
                                            <div key={sp.student.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                                                <span style={{ fontSize: 14, width: 22 }}>{['🥇','🥈','🥉'][i]}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1 }}>{sp.student.first_name} {sp.student.last_name}</span>
                                                <span style={{ fontSize: 13, fontWeight: 900, color: CHART_PALETTE[si] }}>{sp.avg.toFixed(1)}%</span>
                                                <GradeBadge grade={sp.meanGrade.grade} size="xs" />
                                            </div>
                                        ))}
                                    </SectionCard>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ──────────────── TAB: TRENDS ──────────────── */}
                {D.tab === 'trends' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {D.trendData.length >= 2 ? (
                            <>
                                <SectionCard title={`Mean Score Trend — ${D.selExamType}`} subtitle="Historical across all terms">
                                    <div style={{ height: 360 }}>
                                        <Line
                                            data={{
                                                labels: D.trendData.map(t => t.term),
                                                datasets: [
                                                    { label: 'Mean Score', data: D.trendData.map(t => t.avg), borderColor: '#3b82f6', backgroundColor: '#3b82f615', tension: 0.4, fill: true, pointRadius: 6, pointBackgroundColor: '#3b82f6', pointBorderColor: '#fff', pointBorderWidth: 2 },
                                                    { label: 'Pass Rate', data: D.trendData.map(t => t.passRate), borderColor: '#10b981', backgroundColor: '#10b98115', tension: 0.4, fill: false, pointRadius: 6, pointBackgroundColor: '#10b981', borderDash: [5, 4] },
                                                ],
                                            }}
                                            options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }}
                                        />
                                    </div>
                                </SectionCard>
                                <SectionCard title="Term-by-Term Stats" subtitle="Detailed breakdown per term">
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc' }}>
                                                    {['Term', 'Mean Score', 'Pass Rate', 'Entries', 'Trend'].map(h => (
                                                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Term' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {D.trendData.map((t, i) => {
                                                    const prev = D.trendData[i - 1];
                                                    const delta = prev ? t.avg - prev.avg : null;
                                                    return (
                                                        <tr key={t.termId} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                                                            <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{t.term}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 900, fontSize: 14, color: '#6366f1' }}>{t.avg.toFixed(1)}%</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: t.passRate >= 50 ? '#10b981' : '#ef4444' }}>{t.passRate.toFixed(0)}%</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>{t.count}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                {delta !== null ? (
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                                                        {delta > 0 ? <FiTrendingUp size={12} /> : delta < 0 ? <FiTrendingDown size={12} /> : <FiMinus size={12} />}
                                                                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                                                    </span>
                                                                ) : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </>
                        ) : (
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                <FiTrendingUp size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>At least 2 terms of data needed for trend analysis</p>
                            </div>
                        )}
                        <SectionCard title="Exam Type Comparison — This Term" subtitle="How different exams compare">
                            <ExamComparisonTable data={D.examTypeComparison} selExamType={D.selExamType} />
                        </SectionCard>
                    </div>
                )}

                {/* ──────────────── TAB: INDIVIDUAL ──────────────── */}
                {D.tab === 'individual' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {!D.selStudent ? (
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '60px', textAlign: 'center' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                                <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Select a student to view their full academic profile</p>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Use the student dropdown in the filter bar above, or click "View" in any student table</p>
                                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                                    {D.classStudents.slice(0, 20).map((s: any) => (
                                        <button key={s.id} onClick={() => D.setSelStudent(String(s.id))}
                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${s.id * 47 % 360},60%,82%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: `hsl(${s.id * 47 % 360},45%,30%)`, flexShrink: 0 }}>
                                                {s.first_name?.[0]}{s.last_name?.[0]}
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{s.first_name} {s.last_name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : D.individualData ? (
                            <>
                                <IndividualHeader
                                    student={D.individualStudent}
                                    forms={D.forms} streams={D.streams}
                                    rank={D.individualData.rank}
                                    totalStudents={D.individualData.totalStudents}
                                    avg={D.individualData.me?.avg || 0}
                                    meanGrade={D.individualData.me?.meanGrade || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'N/A' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <SectionCard title="Performance Trend" subtitle="Avg score per term">
                                        <div style={{ height: 260 }}>
                                            {D.individualData.perTerm.length >= 2 ? (
                                                <Line
                                                    data={{
                                                        labels: D.individualData.perTerm.map((t: any) => t.term),
                                                        datasets: [{
                                                            label: 'Mean Score', data: D.individualData.perTerm.map((t: any) => t.avg),
                                                            borderColor: '#6366f1', backgroundColor: '#6366f115', tension: 0.4, fill: true, pointRadius: 6, pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 2,
                                                        }],
                                                    }}
                                                    options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }}
                                                />
                                            ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13 }}>Need 2+ terms</div>}
                                        </div>
                                    </SectionCard>
                                    <SectionCard title="Exam Type Scores" subtitle="This term">
                                        <div style={{ height: 260 }}>
                                            <Bar
                                                data={{
                                                    labels: D.individualData.perExamType.filter((e: any) => e.count > 0).map((e: any) => e.et),
                                                    datasets: [{
                                                        label: 'Avg', data: D.individualData.perExamType.filter((e: any) => e.count > 0).map((e: any) => e.avg),
                                                        backgroundColor: CHART_PALETTE, borderRadius: 8, borderWidth: 0,
                                                    }],
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, scales: { y: { max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }}
                                            />
                                        </div>
                                    </SectionCard>
                                </div>

                                <SectionCard title="Subject-by-Subject Performance" subtitle="Current term, sorted best to worst">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {D.individualData.subjectScores.sort((a: any, b: any) => b.score - a.score).map((s: any) => (
                                            <div key={s.subjectName} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: `${gc(s.grade.grade).light}88`, borderRadius: 10 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1, minWidth: 120 }}>{s.subjectName}</span>
                                                <div style={{ flex: 3, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${s.score}%`, background: gc(s.grade.grade).bg, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                </div>
                                                <span style={{ fontSize: 14, fontWeight: 900, color: gc(s.grade.grade).bg, width: 46, textAlign: 'right' }}>{s.score}%</span>
                                                <GradeBadge grade={s.grade.grade} size="sm" />
                                                <span style={{ fontSize: 10, color: '#94a3b8', width: 60, textAlign: 'right' }}>{s.grade.remarks}</span>
                                            </div>
                                        ))}
                                        {D.individualData.subjectScores.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>No marks found for selected filters</p>}
                                    </div>
                                </SectionCard>

                                {D.individualData.subjectScores.length >= 3 && (
                                    <SectionCard title="Subject Spider Chart" subtitle="Visual competency map">
                                        <div style={{ height: 320 }}>
                                            <Radar
                                                data={{
                                                    labels: D.individualData.subjectScores.map((s: any) => s.subjectName.substring(0, 12)),
                                                    datasets: [
                                                        { label: 'Score', data: D.individualData.subjectScores.map((s: any) => s.score), backgroundColor: 'rgba(99,102,241,0.18)', borderColor: '#6366f1', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#6366f1' },
                                                        { label: 'Class Avg', data: D.individualData.subjectScores.map(() => D.individualData!.classAvg), backgroundColor: 'rgba(16,185,129,0.08)', borderColor: '#10b981', borderWidth: 1, borderDash: [4, 3], pointRadius: 2 },
                                                    ],
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 } } } }, plugins: { legend: { position: 'bottom' } } }}
                                            />
                                        </div>
                                    </SectionCard>
                                )}

                                <SectionCard title="Class Position Context" subtitle="Where this student sits among peers">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                                        {[
                                            { label: 'Class Rank', value: `#${D.individualData.rank}`, sub: `of ${D.individualData.totalStudents} students`, color: '#f59e0b' },
                                            { label: 'Student Avg', value: `${(D.individualData.me?.avg || 0).toFixed(1)}%`, sub: D.individualData.me?.meanGrade.remarks || '', color: '#6366f1' },
                                            { label: 'Class Avg', value: `${D.individualData.classAvg.toFixed(1)}%`, sub: (D.individualData.me?.avg || 0) >= D.individualData.classAvg ? '▲ Above class' : '▼ Below class', color: (D.individualData.me?.avg || 0) >= D.individualData.classAvg ? '#10b981' : '#ef4444' },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
                                                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{item.label}</p>
                                                <p style={{ fontSize: 26, fontWeight: 900, color: item.color, margin: '8px 0 4px', letterSpacing: '-0.02em' }}>{item.value}</p>
                                                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{item.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0' }}>No data for this student in selected filters</div>
                        )}
                    </div>
                )}

                {/* ──────────────── TAB: COMPARISON ──────────────── */}
                {D.tab === 'comparison' && (
                    <AdvancedComparisonTab
                        examTypeComparison={D.examTypeComparison}
                        subjectPerf={D.subjectPerf}
                        trendData={D.trendData}
                        streamPerf={D.streamPerf}
                        overallStats={D.overallStats}
                    />
                )}

                {/* ──────────────── TAB: GRADE SHEET ──────────────── */}
                {D.tab === 'gradesheet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            <FiPrinter size={18} color="#6366f1" />
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Grade Sheet — {selFormLabel} · {selTermLabel} · {D.selExamType}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Full student × subject grid with grades. Print or export below.</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={exportGradeSheet} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #3b82f6', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                                    <FiDownload size={13} /> Export CSV
                                </button>
                                <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #6366f1', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                                    <FiPrinter size={13} /> Print
                                </button>
                            </div>
                        </div>

                        <GradeSheetGrid
                            rows={D.gradeSheetData.rows}
                            subjects={D.gradeSheetData.activeSubjects}
                            getGrade={D.getGrade}
                            onExport={exportGradeSheet}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <StudentTable
                                data={D.topPerformers} title="🏆 Top 10 Students" color="#10b981"
                                streams={D.streams} forms={D.forms}
                                onSelectStudent={(id: string) => { D.setSelStudent(id); D.setTab('individual'); }}
                            />
                            <StudentTable
                                data={D.bottomPerformers} title="⚠️ Bottom 10 Students" color="#ef4444"
                                streams={D.streams} forms={D.forms}
                                onSelectStudent={(id: string) => { D.setSelStudent(id); D.setTab('individual'); }}
                            />
                        </div>
                    </div>
                )}

                {/* ──────────────── TAB: AT-RISK ──────────────── */}
                {D.tab === 'atrisk' && (
                    <AtRiskPanel
                        atRiskStudents={D.atRiskStudents}
                        studentPerf={D.studentPerf}
                        forms={D.forms} streams={D.streams} subjects={D.subjects}
                        getGrade={D.getGrade}
                        onSelectStudent={(id: string) => { D.setSelStudent(id); D.setTab('individual'); }}
                    />
                )}

                {/* ──────────────── TAB: CBC MODE ──────────────── */}
                {D.tab === 'cbc' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '1px solid #6ee7b7', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <HiAcademicCap size={28} color="#059669" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#064e3b' }}>CBC (Competency-Based Curriculum) Mode</p>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#065f46' }}>
                                    Kenya CBC uses 4 competency levels: <strong>EE</strong> (≥75%) · <strong>ME</strong> (50–74%) · <strong>AE</strong> (30–49%) · <strong>BE</strong> (&lt;30%).
                                    Subjects are grouped into Learning Areas for holistic assessment.
                                </p>
                            </div>
                        </div>
                        <CBCPanel
                            subjectPerf={D.subjectPerf}
                            subjects={D.subjects}
                            overallStats={D.overallStats}
                            getGrade={D.getGrade}
                            studentPerf={D.studentPerf}
                        />
                    </div>
                )}

                {/* ── FOOTER ── */}
                <div style={{ marginTop: 32, padding: '16px 0', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Alpha Academic Analysis Engine · AlphaSchool ERP</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Generated: {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
                </div>
            </div>

            {/* Spin animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    );
}

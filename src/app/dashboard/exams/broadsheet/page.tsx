'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiDownload, FiPrinter, FiGrid, FiBarChart2, FiTrendingUp,
    FiTrendingDown, FiUsers, FiBookOpen, FiAward, FiActivity,
    FiAlertCircle, FiCheckCircle, FiInfo, FiRefreshCw,
    FiChevronUp, FiChevronDown, FiMinus, FiTarget, FiZap,
    FiStar, FiLayers, FiEye, FiFilter, FiSearch
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }
interface Student { id: number; first_name: string; last_name: string; admission_no?: string; admission_number?: string; form_id: number; stream_id?: number; gender?: string; status: string; }
interface Subject { id: number; subject_name: string; subject_code?: string; is_active: boolean; teacher_id?: number; category?: string; }
interface Mark { student_id: number; subject_id: number; score: number; term_id: number; exam_type: string; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; form_id?: number; }
interface Term { id: number; term_name: string; is_current: boolean; }
interface Staff { id: number; first_name: string; last_name: string; }

interface StudentRow {
    student: Student;
    subjectScores: Record<number, { score: number; grade: string; points: number }>;
    totalScore: number;
    totalPoints: number;
    subjectCount: number;
    avgScore: number;
    meanGrade: GradeEntry;
    rank?: number;
}

// ─── Grade color mapping ───────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, { bg: string; text: string; light: string }> = {
    'A':  { bg: '#059669', text: '#fff', light: '#d1fae5' },
    'A-': { bg: '#10b981', text: '#fff', light: '#d1fae5' },
    'B+': { bg: '#3b82f6', text: '#fff', light: '#dbeafe' },
    'B':  { bg: '#6366f1', text: '#fff', light: '#e0e7ff' },
    'B-': { bg: '#8b5cf6', text: '#fff', light: '#ede9fe' },
    'C+': { bg: '#ec4899', text: '#fff', light: '#fce7f3' },
    'C':  { bg: '#f97316', text: '#fff', light: '#ffedd5' },
    'C-': { bg: '#f59e0b', text: '#fff', light: '#fef3c7' },
    'D+': { bg: '#ef4444', text: '#fff', light: '#fee2e2' },
    'D':  { bg: '#dc2626', text: '#fff', light: '#fee2e2' },
    'D-': { bg: '#b91c1c', text: '#fff', light: '#fee2e2' },
    'E':  { bg: '#7f1d1d', text: '#fff', light: '#fee2e2' },
};

const getGradeColor = (grade: string) => GRADE_COLORS[grade] || { bg: '#94a3b8', text: '#fff', light: '#f1f5f9' };

// ─── Tab Definition ────────────────────────────────────────────────────────────
const TABS = [
    { key: 'broadsheet', label: 'Broadsheet', icon: FiGrid },
    { key: 'subject',    label: 'Subject Analysis', icon: FiBookOpen },
    { key: 'class',      label: 'Class Analysis', icon: FiBarChart2 },
    { key: 'stream',     label: 'Stream Analysis', icon: FiLayers },
    { key: 'form',       label: 'Form Analysis', icon: FiUsers },
    { key: 'school',     label: 'School Overview', icon: FiActivity },
] as const;
type TabKey = typeof TABS[number]['key'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pct = (n: number) => `${n.toFixed(1)}%`;
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

function GradeBadge({ grade, small }: { grade: string; small?: boolean }) {
    const c = getGradeColor(grade);
    return (
        <span style={{ background: c.bg, color: c.text }}
            className={`inline-flex items-center justify-center font-bold rounded ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1 min-w-[28px]'}`}>
            {grade}
        </span>
    );
}

function StatCard({ label, value, sub, color = 'blue', icon: Icon, trend }: {
    label: string; value: string | number; sub?: string; color?: string; icon?: any; trend?: 'up' | 'down' | 'flat';
}) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600', cyan: 'bg-cyan-50 text-cyan-600',
        pink: 'bg-pink-50 text-pink-600', indigo: 'bg-indigo-50 text-indigo-600',
    };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            {Icon && <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}><Icon size={18} /></div>}
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                    {trend && (
                        trend === 'up' ? <FiTrendingUp size={13} className="text-green-500" /> :
                        trend === 'down' ? <FiTrendingDown size={13} className="text-red-500" /> :
                        <FiMinus size={13} className="text-gray-400" />
                    )}
                </div>
                {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
            </div>
        </div>
    );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Grade distribution bar ────────────────────────────────────────────────────
function GradeDistBar({ data, total }: { data: Record<string, number>; total: number }) {
    const order = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
    return (
        <div>
            <div className="flex h-6 rounded-lg overflow-hidden w-full">
                {order.map(g => {
                    const cnt = data[g] || 0;
                    const w = total > 0 ? (cnt / total) * 100 : 0;
                    if (w === 0) return null;
                    return (
                        <div key={g} style={{ width: `${w}%`, background: getGradeColor(g).bg }}
                            className="flex items-center justify-center text-white text-[9px] font-bold overflow-hidden hover:opacity-90 transition-opacity cursor-default"
                            title={`${g}: ${cnt} (${pct(w)})`}>
                            {w > 5 ? g : ''}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {order.filter(g => (data[g] || 0) > 0).map(g => (
                    <span key={g} className="flex items-center gap-1 text-[10px] text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: getGradeColor(g).bg }}></span>
                        {g}: {data[g]}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Insight chip ──────────────────────────────────────────────────────────────
function Insight({ type, text }: { type: 'good' | 'warn' | 'info' | 'bad'; text: string }) {
    const map = {
        good: { cls: 'bg-green-50 border-green-200 text-green-800', Icon: FiCheckCircle, ic: 'text-green-500' },
        warn: { cls: 'bg-amber-50 border-amber-200 text-amber-800', Icon: FiAlertCircle, ic: 'text-amber-500' },
        bad:  { cls: 'bg-red-50 border-red-200 text-red-800', Icon: FiAlertCircle, ic: 'text-red-500' },
        info: { cls: 'bg-blue-50 border-blue-200 text-blue-800', Icon: FiInfo, ic: 'text-blue-500' },
    };
    const { cls, Icon, ic } = map[type];
    return (
        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-medium ${cls}`}>
            <Icon size={13} className={`mt-0.5 flex-shrink-0 ${ic}`} />
            <span>{text}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function UltraBroadsheetPage() {
    // ─── State ────────────────────────────────────────────────────────────────
    const [forms, setForms] = useState<Form[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [allMarks, setAllMarks] = useState<Mark[]>([]); // school-wide marks for overview
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('broadsheet');
    const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'total'>('rank');
    const [genderFilter, setGenderFilter] = useState('');
    const [showTopN, setShowTopN] = useState(0); // 0 = all
    const [searchQ, setSearchQ] = useState('');

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    // ─── Fetch base data ──────────────────────────────────────────────────────
    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr, sf] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_staff').select('id,first_name,last_name').limit(200),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setGrading(gr.data || []);
        setStaff(sf.data || []);
        const cur = ((t.data || []) as any[]).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchBase(); }, [fetchBase]);

    // ─── Grade calculator ─────────────────────────────────────────────────────
    const getGrade = useCallback((score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score)
            || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    }, [grading]);

    // ─── Students in selected class ───────────────────────────────────────────
    const classStudents = useMemo(() => students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .filter(s => !genderFilter || s.gender === genderFilter),
    [students, selForm, selStream, genderFilter]);

    // ─── Fetch marks when filters change ─────────────────────────────────────
    useEffect(() => {
        if (!selForm || !selTerm || !selExamType) { setMarks([]); return; }
        const studentIds = students
            .filter(s => String(s.form_id) === selForm)
            .filter(s => !selStream || String(s.stream_id) === selStream)
            .map(s => s.id);
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
    }, [selForm, selStream, selTerm, selExamType, students]);

    // ─── Fetch ALL marks for school overview ──────────────────────────────────
    useEffect(() => {
        if (!selTerm || !selExamType) { setAllMarks([]); return; }
        const load = async () => {
            const { data } = await supabase.from('school_exam_marks').select('*')
                .eq('term_id', Number(selTerm)).eq('exam_type', selExamType);
            setAllMarks(data || []);
        };
        load();
    }, [selTerm, selExamType]);

    // ─── Build broadsheet rows ────────────────────────────────────────────────
    const broadsheetData: StudentRow[] = useMemo(() => {
        return classStudents.map(student => {
            const studentMarks = marks.filter(m => m.student_id === student.id);
            const subjectScores: Record<number, { score: number; grade: string; points: number }> = {};
            let totalScore = 0, totalPoints = 0, subjectCount = 0;
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
            return { student, subjectScores, totalScore, totalPoints, subjectCount, avgScore, meanGrade: getGrade(avgScore) };
        });
    }, [classStudents, marks, subjects, getGrade]);

    // ─── Sort & rank ──────────────────────────────────────────────────────────
    const sorted: StudentRow[] = useMemo(() => {
        let arr = [...broadsheetData];
        if (searchQ.trim()) {
            const q = searchQ.toLowerCase();
            arr = arr.filter(r =>
                `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(q) ||
                (r.student.admission_no || r.student.admission_number || '').toLowerCase().includes(q)
            );
        }
        arr.sort((a, b) => {
            if (sortBy === 'name') return a.student.first_name.localeCompare(b.student.first_name);
            if (sortBy === 'total') return b.totalScore - a.totalScore;
            return b.totalPoints - a.totalPoints || b.totalScore - a.totalScore;
        });
        arr.forEach((row, i) => {
            if (i === 0 || row.totalPoints !== arr[i - 1].totalPoints || row.totalScore !== arr[i - 1].totalScore) {
                row.rank = i + 1;
            } else {
                row.rank = arr[i - 1].rank;
            }
        });
        if (showTopN > 0) arr = arr.slice(0, showTopN);
        return arr;
    }, [broadsheetData, sortBy, searchQ, showTopN]);

    const activeSubjects = useMemo(() =>
        subjects.filter(sub => marks.some(m => m.subject_id === sub.id)),
    [subjects, marks]);

    const isReady = selForm && selTerm && selExamType;

    // ─── Computed analytics ───────────────────────────────────────────────────
    const classAvg = useMemo(() => avg(sorted.filter(r => r.avgScore > 0).map(r => r.avgScore)), [sorted]);
    const classAvgGrade = useMemo(() => getGrade(classAvg), [classAvg, getGrade]);
    const topStudent = useMemo(() => sorted[0], [sorted]);
    const passCount = useMemo(() => sorted.filter(r => r.avgScore >= 50).length, [sorted]);
    const failCount = useMemo(() => sorted.filter(r => r.avgScore > 0 && r.avgScore < 50).length, [sorted]);
    const absentCount = useMemo(() => sorted.filter(r => r.avgScore === 0).length, [sorted]);
    const passRate = sorted.length > 0 ? (passCount / sorted.filter(r => r.avgScore > 0).length) * 100 : 0;

    // Grade distribution for entire class
    const classGradeDist = useMemo(() => {
        const dist: Record<string, number> = {};
        sorted.forEach(r => {
            if (r.avgScore > 0) {
                const g = r.meanGrade.grade;
                dist[g] = (dist[g] || 0) + 1;
            }
        });
        return dist;
    }, [sorted]);

    // Per-subject stats
    const subjectStats = useMemo(() => activeSubjects.map(sub => {
        const scores = sorted.map(r => r.subjectScores[sub.id]?.score).filter(s => s !== undefined) as number[];
        const avgSc = avg(scores);
        const g = getGrade(avgSc);
        const dist: Record<string, number> = {};
        sorted.forEach(r => {
            const sc = r.subjectScores[sub.id];
            if (sc) dist[sc.grade] = (dist[sc.grade] || 0) + 1;
        });
        const passes = scores.filter(s => s >= 50).length;
        const highest = scores.length ? Math.max(...scores) : 0;
        const lowest = scores.length ? Math.min(...scores) : 0;
        return { subject: sub, avg: avgSc, grade: g, dist, passes, total: scores.length, highest, lowest, scores };
    }), [activeSubjects, sorted, getGrade]);

    // Gender split
    const genderStats = useMemo(() => {
        const boys = sorted.filter(r => r.student.gender === 'Male' || r.student.gender === 'M');
        const girls = sorted.filter(r => r.student.gender === 'Female' || r.student.gender === 'F');
        return {
            boys: { count: boys.length, avg: avg(boys.filter(r => r.avgScore > 0).map(r => r.avgScore)) },
            girls: { count: girls.length, avg: avg(girls.filter(r => r.avgScore > 0).map(r => r.avgScore)) },
        };
    }, [sorted]);

    // Stream comparison (using allMarks)
    const streamStats = useMemo(() => {
        return streams.map(stream => {
            const streamStudents = students.filter(s => String(s.form_id) === selForm && String(s.stream_id) === String(stream.id));
            const streamMarks = allMarks.filter(m => streamStudents.map(s => s.id).includes(m.student_id));
            if (streamStudents.length === 0) return null;
            const avgScores = streamStudents.map(student => {
                const sMarks = streamMarks.filter(m => m.student_id === student.id);
                if (sMarks.length === 0) return 0;
                return avg(sMarks.map(m => Number(m.score)));
            }).filter(s => s > 0);
            const streamAvg = avg(avgScores);
            const g = getGrade(streamAvg);
            return { stream, count: streamStudents.length, avg: streamAvg, grade: g };
        }).filter(Boolean);
    }, [streams, students, allMarks, selForm, getGrade]);

    // Form analysis (all forms this term)
    const formStats = useMemo(() => {
        return forms.map(form => {
            const formStudents = students.filter(s => String(s.form_id) === String(form.id));
            const formMarks = allMarks.filter(m => formStudents.map(s => s.id).includes(m.student_id));
            if (formStudents.length === 0) return null;
            const avgScores = formStudents.map(student => {
                const sMarks = formMarks.filter(m => m.student_id === student.id);
                if (sMarks.length === 0) return 0;
                return avg(sMarks.map(m => Number(m.score)));
            }).filter(s => s > 0);
            const formAvg = avg(avgScores);
            const g = getGrade(formAvg);
            const passes = avgScores.filter(s => s >= 50).length;
            return { form, count: formStudents.length, avg: formAvg, grade: g, passes, scored: avgScores.length };
        }).filter(Boolean);
    }, [forms, students, allMarks, getGrade]);

    // School-wide subject leaderboard
    const schoolSubjectStats = useMemo(() => {
        return subjects.map(sub => {
            const subMarks = allMarks.filter(m => m.subject_id === sub.id).map(m => Number(m.score));
            if (subMarks.length === 0) return null;
            const avgSc = avg(subMarks);
            const g = getGrade(avgSc);
            const passes = subMarks.filter(s => s >= 50).length;
            return { subject: sub, avg: avgSc, grade: g, passes, total: subMarks.length, passRate: (passes / subMarks.length) * 100 };
        }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
    }, [subjects, allMarks, getGrade]);

    // School-wide summary
    const schoolAvg = useMemo(() => {
        const all = allMarks.map(m => Number(m.score)).filter(s => s > 0);
        return avg(all);
    }, [allMarks]);

    // ─── Export ───────────────────────────────────────────────────────────────
    const exportBroadsheet = () => {
        const headers = ['Rank', 'Adm No', 'Name', 'Gender', ...activeSubjects.map(s => s.subject_code || s.subject_name), 'Total', 'Avg', 'Grade', 'Points'];
        const rows = sorted.map(row => [
            row.rank,
            row.student.admission_no || row.student.admission_number || '',
            `${row.student.first_name} ${row.student.last_name}`,
            row.student.gender || '',
            ...activeSubjects.map(sub => {
                const s = row.subjectScores[sub.id];
                return s ? `${s.score}(${s.grade})` : '-';
            }),
            row.totalScore || '-',
            row.avgScore > 0 ? row.avgScore.toFixed(1) : '-',
            row.meanGrade.grade,
            row.totalPoints,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const termName = terms.find(t => String(t.id) === selTerm)?.term_name || selTerm;
        const formName = forms.find(f => String(f.id) === selForm)?.form_name || selForm;
        a.download = `broadsheet_${formName}_${termName}_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Broadsheet exported ✅');
    };

    // ─── Smart insights ───────────────────────────────────────────────────────
    const insights = useMemo(() => {
        const list: { type: 'good' | 'warn' | 'info' | 'bad'; text: string }[] = [];
        if (sorted.length === 0) return list;
        if (passRate >= 80) list.push({ type: 'good', text: `Excellent! ${passRate.toFixed(0)}% of students scored above 50%. Class is performing well.` });
        else if (passRate >= 60) list.push({ type: 'info', text: `${passRate.toFixed(0)}% pass rate. Moderate performance — targeted remediation could boost results.` });
        else list.push({ type: 'bad', text: `⚠️ Only ${passRate.toFixed(0)}% of students passed. Urgent intervention required.` });

        if (genderStats.boys.count > 0 && genderStats.girls.count > 0) {
            const diff = Math.abs(genderStats.boys.avg - genderStats.girls.avg);
            if (diff > 10) {
                const better = genderStats.boys.avg > genderStats.girls.avg ? 'Boys' : 'Girls';
                list.push({ type: 'warn', text: `Gender gap detected: ${better} outperform by ${diff.toFixed(1)} points on average. Consider targeted support.` });
            }
        }

        const weakSubjects = subjectStats.filter(s => s.avg < 40 && s.total > 0);
        if (weakSubjects.length > 0) {
            list.push({ type: 'bad', text: `Weak subjects: ${weakSubjects.map(s => s.subject.subject_name).join(', ')} — class average below 40. Immediate attention needed.` });
        }

        const strongSubjects = subjectStats.filter(s => s.avg >= 70 && s.total > 0);
        if (strongSubjects.length > 0) {
            list.push({ type: 'good', text: `Strong performance in: ${strongSubjects.map(s => s.subject.subject_name).join(', ')}.` });
        }

        if (absentCount > 0) {
            list.push({ type: 'warn', text: `${absentCount} student(s) have no marks recorded — verify exam attendance.` });
        }

        if (topStudent) {
            list.push({ type: 'info', text: `Top student: ${topStudent.student.first_name} ${topStudent.student.last_name} — Avg ${topStudent.avgScore.toFixed(1)}%, Grade ${topStudent.meanGrade.grade}.` });
        }

        return list;
    }, [sorted, passRate, genderStats, subjectStats, absentCount, topStudent]);

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Loading Broadsheet Engine...</p>
                <p className="text-gray-400 text-xs mt-1">Fetching students, subjects, grading system</p>
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <FiGrid size={18} />
                        </span>
                        Ultra Broadsheet
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Full academic analysis — scores, grades, rankings, subject & class intelligence
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={fetchBase} className="btn-outline text-xs flex items-center gap-1.5 py-2 px-3">
                        <FiRefreshCw size={13} /> Refresh
                    </button>
                    {isReady && sorted.length > 0 && (
                        <>
                            <button onClick={() => window.print()} className="btn-outline text-sm flex items-center gap-1.5">
                                <FiPrinter size={14} /> Print
                            </button>
                            <button onClick={exportBroadsheet} className="btn-primary text-sm flex items-center gap-1.5">
                                <FiDownload size={14} /> Export CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Filters ────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <FiFilter size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="lbl">Form *</label>
                        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }}
                            className="select-modern w-full text-sm">
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
                        <label className="lbl">Term *</label>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm">
                            <option value="">Select Term</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="lbl">Exam Type *</label>
                        <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">
                            {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="lbl">Gender</label>
                        <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="select-modern w-full text-sm">
                            <option value="">All Genders</option>
                            <option value="Male">Boys</option>
                            <option value="Female">Girls</option>
                        </select>
                    </div>
                    <div>
                        <label className="lbl">Sort By</label>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="select-modern w-full text-sm">
                            <option value="rank">Rank (Points)</option>
                            <option value="total">Total Score</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Not Ready ──────────────────────────────────────────────────── */}
            {!isReady ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-24 text-gray-400">
                    <FiGrid size={40} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-semibold text-lg text-gray-500">Select Form, Term & Exam Type to load broadsheet</p>
                    <p className="text-sm mt-1">Use the filters above to get started</p>
                </div>
            ) : loadingMarks ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading marks...</p>
                </div>
            ) : (
                <>
                    {/* ── Summary Stat Cards ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        <StatCard label="Students" value={sorted.length} icon={FiUsers} color="blue" />
                        <StatCard label="Subjects" value={activeSubjects.length} icon={FiBookOpen} color="purple" />
                        <StatCard label="Class Avg" value={classAvg > 0 ? pct(classAvg) : '--'} icon={FiBarChart2} color="indigo" />
                        <StatCard label="Mean Grade" value={classAvg > 0 ? classAvgGrade.grade : '--'} icon={FiAward} color="cyan" />
                        <StatCard label="Pass Rate" value={passRate > 0 ? pct(passRate) : '--'} icon={FiCheckCircle} color={passRate >= 70 ? 'green' : passRate >= 50 ? 'amber' : 'red'} trend={passRate >= 70 ? 'up' : passRate < 50 ? 'down' : 'flat'} />
                        <StatCard label="Top Score" value={sorted.length > 0 && sorted[0]?.avgScore > 0 ? pct(sorted[0].avgScore) : '--'} icon={FiStar} color="amber" />
                        <StatCard label="Boys" value={genderStats.boys.count} sub={genderStats.boys.avg > 0 ? `Avg ${pct(genderStats.boys.avg)}` : undefined} icon={FiUsers} color="blue" />
                        <StatCard label="Girls" value={genderStats.girls.count} sub={genderStats.girls.avg > 0 ? `Avg ${pct(genderStats.girls.avg)}` : undefined} icon={FiUsers} color="pink" />
                    </div>

                    {/* ── Insights ───────────────────────────────────────────── */}
                    {insights.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <FiZap size={14} className="text-amber-500" />
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">AI Insights</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {insights.map((ins, i) => <Insight key={i} type={ins.type} text={ins.text} />)}
                            </div>
                        </div>
                    )}

                    {/* ── Tabs ───────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Tab Bar */}
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <div className="flex min-w-max">
                                {TABS.map(tab => {
                                    const Icon = tab.icon;
                                    const active = activeTab === tab.key;
                                    return (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap
                                            ${active ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                                            <Icon size={14} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Tab: BROADSHEET ──────────────────────────────────── */}
                        {activeTab === 'broadsheet' && (
                            <div className="p-4">
                                {/* Search + Top-N */}
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="Search student..." value={searchQ}
                                            onChange={e => setSearchQ(e.target.value)}
                                            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
                                    </div>
                                    <select value={showTopN} onChange={e => setShowTopN(Number(e.target.value))}
                                        className="select-modern text-sm py-2">
                                        <option value={0}>All Students</option>
                                        <option value={5}>Top 5</option>
                                        <option value={10}>Top 10</option>
                                        <option value={20}>Top 20</option>
                                    </select>
                                </div>

                                {sorted.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <FiBarChart2 size={36} className="mx-auto mb-3 text-gray-300" />
                                        <p className="font-semibold">No students or marks found</p>
                                        <p className="text-sm mt-1">Enter marks via Mark Entry first</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                                    <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-0 bg-indigo-50 z-10 w-10">#</th>
                                                    <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-10 bg-indigo-50 z-10 w-20">Adm</th>
                                                    <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-[88px] bg-indigo-50 z-10 min-w-[150px]">Name</th>
                                                    <th className="px-1.5 py-3 text-center font-bold text-gray-400 uppercase border-b-2 border-gray-200 w-12">Sex</th>
                                                    {activeSubjects.map(sub => (
                                                        <th key={sub.id} className="px-1.5 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 min-w-[54px]"
                                                            title={sub.subject_name}>
                                                            {sub.subject_code || sub.subject_name.substring(0, 4)}
                                                        </th>
                                                    ))}
                                                    <th className="px-2 py-3 text-center font-bold text-blue-600 uppercase border-b-2 border-blue-200 bg-blue-50 min-w-[52px]">Tot</th>
                                                    <th className="px-2 py-3 text-center font-bold text-purple-600 uppercase border-b-2 border-purple-200 bg-purple-50 min-w-[52px]">Avg%</th>
                                                    <th className="px-2 py-3 text-center font-bold text-green-600 uppercase border-b-2 border-green-200 bg-green-50 min-w-[44px]">Grd</th>
                                                    <th className="px-2 py-3 text-center font-bold text-amber-600 uppercase border-b-2 border-amber-200 bg-amber-50 min-w-[40px]">Pts</th>
                                                    <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-12">Rmks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sorted.map((row, i) => {
                                                    const isExpanded = expandedStudent === row.student.id;
                                                    return (
                                                        <>
                                                            <tr key={row.student.id}
                                                                className={`border-b border-gray-100 transition-colors cursor-pointer
                                                                    ${i % 2 === 0 ? 'hover:bg-indigo-50/30' : 'bg-gray-50/40 hover:bg-indigo-50/30'}
                                                                    ${row.rank === 1 ? 'bg-amber-50/50' : ''}
                                                                `}
                                                                onClick={() => setExpandedStudent(isExpanded ? null : row.student.id)}>
                                                                <td className="px-2 py-2 text-center sticky left-0 bg-inherit z-10">
                                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold
                                                                        ${row.rank === 1 ? 'bg-amber-400 text-white' : row.rank === 2 ? 'bg-gray-400 text-white' : row.rank === 3 ? 'bg-orange-400 text-white' : 'text-gray-600'}`}>
                                                                        {row.rank}
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2 font-mono text-blue-600 font-bold sticky left-10 bg-inherit z-10 text-[10px]">
                                                                    {row.student.admission_no || row.student.admission_number}
                                                                </td>
                                                                <td className="px-2 py-2 font-semibold text-gray-800 sticky left-[88px] bg-inherit z-10 whitespace-nowrap">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(row.student.gender === 'Male' || row.student.gender === 'M') ? 'bg-blue-400' : 'bg-pink-400'}`}></span>
                                                                        {row.student.first_name} {row.student.last_name}
                                                                        {isExpanded ? <FiChevronUp size={10} className="text-gray-400 ml-1" /> : <FiChevronDown size={10} className="text-gray-300 ml-1" />}
                                                                    </div>
                                                                </td>
                                                                <td className="px-1 py-2 text-center text-[10px] text-gray-400">
                                                                    {(row.student.gender === 'Male' || row.student.gender === 'M') ? 'M' : (row.student.gender === 'Female' || row.student.gender === 'F') ? 'F' : '-'}
                                                                </td>
                                                                {activeSubjects.map(sub => {
                                                                    const s = row.subjectScores[sub.id];
                                                                    return (
                                                                        <td key={sub.id} className="px-1 py-2 text-center">
                                                                            {s ? (
                                                                                <div className="flex flex-col items-center gap-0.5">
                                                                                    <span className="font-bold text-gray-800 text-[12px]">{s.score}</span>
                                                                                    <GradeBadge grade={s.grade} small />
                                                                                </div>
                                                                            ) : <span className="text-gray-300">–</span>}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-2 py-2 text-center font-extrabold text-blue-700 bg-blue-50/50">{row.totalScore || '–'}</td>
                                                                <td className="px-2 py-2 text-center font-bold text-purple-700 bg-purple-50/50">{row.avgScore > 0 ? row.avgScore.toFixed(1) : '–'}</td>
                                                                <td className="px-2 py-2 text-center bg-green-50/50">
                                                                    {row.avgScore > 0 ? <GradeBadge grade={row.meanGrade.grade} /> : <span className="text-gray-300">–</span>}
                                                                </td>
                                                                <td className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/50">{row.totalPoints || '–'}</td>
                                                                <td className="px-2 py-2 text-center text-[10px] text-gray-500">
                                                                    {row.avgScore > 0 ? row.meanGrade.remarks?.split(' ').slice(0, 1).join('') : '–'}
                                                                </td>
                                                            </tr>
                                                            {/* Expanded student detail row */}
                                                            {isExpanded && (
                                                                <tr key={`${row.student.id}-detail`} className="bg-indigo-50/60 border-b border-indigo-100">
                                                                    <td colSpan={4 + activeSubjects.length + 5} className="px-4 py-3">
                                                                        <div className="flex flex-wrap gap-3">
                                                                            <div className="text-xs text-gray-600 font-semibold">
                                                                                Subject breakdown for <span className="text-indigo-700">{row.student.first_name} {row.student.last_name}</span>:
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {activeSubjects.map(sub => {
                                                                                    const s = row.subjectScores[sub.id];
                                                                                    const subAvg = subjectStats.find(ss => ss.subject.id === sub.id)?.avg || 0;
                                                                                    const diff = s ? s.score - subAvg : null;
                                                                                    if (!s) return null;
                                                                                    return (
                                                                                        <div key={sub.id} className="bg-white rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs">
                                                                                            <div className="font-semibold text-gray-700">{sub.subject_code || sub.subject_name.substring(0, 6)}</div>
                                                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                                                <span className="font-bold text-gray-900">{s.score}</span>
                                                                                                <GradeBadge grade={s.grade} small />
                                                                                                {diff !== null && (
                                                                                                    <span className={`text-[9px] font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                                        {diff >= 0 ? '+' : ''}{diff.toFixed(0)} vs avg
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300">
                                                    <td colSpan={4} className="px-3 py-3 text-xs font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">CLASS AVERAGE</td>
                                                    {activeSubjects.map(sub => {
                                                        const ss = subjectStats.find(s => s.subject.id === sub.id);
                                                        return (
                                                            <td key={sub.id} className="px-1 py-3 text-center">
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="font-bold text-gray-700 text-[11px]">{ss && ss.avg > 0 ? ss.avg.toFixed(0) : '–'}</span>
                                                                    {ss && ss.avg > 0 && <GradeBadge grade={ss.grade.grade} small />}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50/50 text-xs">–</td>
                                                    <td className="px-2 py-3 text-center font-bold text-purple-700 bg-purple-50/50 text-xs">
                                                        {classAvg > 0 ? classAvg.toFixed(1) : '–'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center bg-green-50/50">
                                                        {classAvg > 0 ? <GradeBadge grade={classAvgGrade.grade} /> : '–'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-bold text-amber-700 bg-amber-50/50 text-xs">–</td>
                                                    <td className="px-2 py-3"></td>
                                                </tr>
                                                {/* Grade distribution footer */}
                                                <tr className="bg-white border-t border-gray-100">
                                                    <td colSpan={4} className="px-3 py-3 text-xs font-bold text-gray-500 sticky left-0 bg-white z-10">GRADE DIST.</td>
                                                    {activeSubjects.map(sub => {
                                                        const ss = subjectStats.find(s => s.subject.id === sub.id);
                                                        const topGrade = ss ? Object.entries(ss.dist).sort((a, b) => b[1] - a[1])[0] : null;
                                                        return (
                                                            <td key={sub.id} className="px-1 py-2 text-center text-[9px] text-gray-500">
                                                                {topGrade ? <><GradeBadge grade={topGrade[0]} small /><div className="mt-0.5">{topGrade[1]}</div></> : '–'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td colSpan={5} className="px-3 py-2 text-xs text-gray-500">
                                                        {passCount > 0 && <span className="text-green-600 font-semibold">{passCount} pass</span>}
                                                        {failCount > 0 && <span className="text-red-500 font-semibold ml-2">{failCount} fail</span>}
                                                        {absentCount > 0 && <span className="text-gray-400 font-semibold ml-2">{absentCount} absent</span>}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}

                                {/* Grade Distribution Bar */}
                                {sorted.length > 0 && (
                                    <div className="mt-5 bg-gray-50 rounded-xl border border-gray-200 p-4">
                                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Mean Grade Distribution — {sorted.filter(r => r.avgScore > 0).length} students</p>
                                        <GradeDistBar data={classGradeDist} total={sorted.filter(r => r.avgScore > 0).length} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: SUBJECT ANALYSIS ─────────────────────────────── */}
                        {activeTab === 'subject' && (
                            <div className="p-4">
                                <SectionHeader title="Subject-by-Subject Analysis" sub="Performance breakdown per subject — averages, grade distribution, pass rates" />
                                {subjectStats.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <FiBookOpen size={32} className="mx-auto mb-3 text-gray-300" />
                                        <p>No subject data available</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Subject leaderboard table */}
                                        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-5">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
                                                        <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Subject</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Sat</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Avg Score</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Grade</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Highest</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Lowest</th>
                                                        <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Pass Rate</th>
                                                        <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase min-w-[200px]">Grade Dist.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectStats.sort((a, b) => b.avg - a.avg).map((ss, i) => {
                                                        const subPassRate = ss.total > 0 ? (ss.passes / ss.total) * 100 : 0;
                                                        return (
                                                            <tr key={ss.subject.id} className={`border-b border-gray-100 hover:bg-blue-50/20 transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                                                <td className="px-3 py-3 font-semibold text-gray-800">
                                                                    <div>{ss.subject.subject_name}</div>
                                                                    {ss.subject.subject_code && <div className="text-[10px] text-gray-400 font-mono">{ss.subject.subject_code}</div>}
                                                                </td>
                                                                <td className="px-3 py-3 text-center font-semibold text-gray-700">{ss.total}</td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <span className="font-bold text-gray-900 text-sm">{ss.avg > 0 ? ss.avg.toFixed(1) : '–'}</span>
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    {ss.avg > 0 ? <GradeBadge grade={ss.grade.grade} /> : '–'}
                                                                </td>
                                                                <td className="px-3 py-3 text-center text-green-700 font-bold">{ss.highest || '–'}</td>
                                                                <td className="px-3 py-3 text-center text-red-500 font-bold">{ss.lowest || '–'}</td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className={`font-bold text-[13px] ${subPassRate >= 70 ? 'text-green-600' : subPassRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                                            {ss.total > 0 ? pct(subPassRate) : '–'}
                                                                        </span>
                                                                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${subPassRate >= 70 ? 'bg-green-500' : subPassRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                                style={{ width: `${subPassRate}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    <GradeDistBar data={ss.dist} total={ss.total} />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Top & Bottom students per subject */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-700 mb-3">Top & Bottom Performers Per Subject</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {subjectStats.map(ss => {
                                                    const withScores = sorted.filter(r => r.subjectScores[ss.subject.id]);
                                                    const topS = [...withScores].sort((a, b) => (b.subjectScores[ss.subject.id]?.score || 0) - (a.subjectScores[ss.subject.id]?.score || 0)).slice(0, 3);
                                                    const bottomS = [...withScores].sort((a, b) => (a.subjectScores[ss.subject.id]?.score || 0) - (b.subjectScores[ss.subject.id]?.score || 0)).slice(0, 3);
                                                    return (
                                                        <div key={ss.subject.id} className="bg-white rounded-xl border border-gray-200 p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-xs font-bold text-gray-800 truncate">{ss.subject.subject_name}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] text-gray-500">{ss.avg > 0 ? ss.avg.toFixed(1) : '–'}</span>
                                                                    {ss.avg > 0 && <GradeBadge grade={ss.grade.grade} small />}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Top 3</p>
                                                                    {topS.map(r => (
                                                                        <div key={r.student.id} className="flex items-center justify-between text-[10px] py-0.5">
                                                                            <span className="text-gray-600 truncate pr-1">{r.student.first_name}</span>
                                                                            <span className="font-bold text-green-700">{r.subjectScores[ss.subject.id]?.score}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-red-500 uppercase mb-1">Bottom 3</p>
                                                                    {bottomS.map(r => (
                                                                        <div key={r.student.id} className="flex items-center justify-between text-[10px] py-0.5">
                                                                            <span className="text-gray-600 truncate pr-1">{r.student.first_name}</span>
                                                                            <span className="font-bold text-red-500">{r.subjectScores[ss.subject.id]?.score}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab: CLASS ANALYSIS ───────────────────────────────── */}
                        {activeTab === 'class' && (
                            <div className="p-4 space-y-5">
                                <SectionHeader title="Class Performance Analysis" sub="Detailed breakdown of class results, gender split, and performance tiers" />

                                {sorted.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <FiUsers size={32} className="mx-auto mb-3 text-gray-300" />
                                        <p>No data for this class</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Performance tier breakdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Distinction (A/A-)', count: sorted.filter(r => ['A', 'A-'].includes(r.meanGrade.grade)).length, color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50' },
                                                { label: 'Credit (B+–B-)', count: sorted.filter(r => ['B+', 'B', 'B-'].includes(r.meanGrade.grade)).length, color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50' },
                                                { label: 'Pass (C+–C-)', count: sorted.filter(r => ['C+', 'C', 'C-'].includes(r.meanGrade.grade)).length, color: 'bg-amber-500', textColor: 'text-amber-700', bg: 'bg-amber-50' },
                                                { label: 'Below Pass (D+–E)', count: sorted.filter(r => ['D+', 'D', 'D-', 'E'].includes(r.meanGrade.grade)).length, color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50' },
                                            ].map(tier => (
                                                <div key={tier.label} className={`${tier.bg} rounded-xl border border-gray-200 p-4`}>
                                                    <p className="text-xs text-gray-500 font-semibold mb-1">{tier.label}</p>
                                                    <p className={`text-3xl font-extrabold ${tier.textColor}`}>{tier.count}</p>
                                                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${tier.color}`}
                                                            style={{ width: `${sorted.length > 0 ? (tier.count / sorted.filter(r => r.avgScore > 0).length) * 100 : 0}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-1">{sorted.filter(r => r.avgScore > 0).length > 0 ? pct((tier.count / sorted.filter(r => r.avgScore > 0).length) * 100) : '–'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Gender comparison */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiUsers size={14} className="text-indigo-500" /> Gender Performance Comparison</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {[
                                                    { label: 'Boys', data: genderStats.boys, color: 'blue' },
                                                    { label: 'Girls', data: genderStats.girls, color: 'pink' },
                                                ].map(g => (
                                                    <div key={g.label} className={`bg-${g.color}-50 rounded-xl p-4`}>
                                                        <div className={`text-lg font-bold text-${g.color}-700 mb-1`}>{g.label}</div>
                                                        <div className="text-3xl font-extrabold text-gray-800 mb-2">{g.data.count}</div>
                                                        <div className="space-y-1 text-xs">
                                                            <div className="flex justify-between text-gray-600">
                                                                <span>Average Score</span>
                                                                <span className="font-bold">{g.data.avg > 0 ? pct(g.data.avg) : '–'}</span>
                                                            </div>
                                                            <div className="flex justify-between text-gray-600">
                                                                <span>Mean Grade</span>
                                                                <span className="font-bold">{g.data.avg > 0 ? getGrade(g.data.avg).grade : '–'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Score distribution bands */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3">Score Band Distribution</h3>
                                            {[
                                                { label: '80–100 (Excellent)', min: 80, max: 100, color: 'bg-green-500' },
                                                { label: '60–79 (Good)', min: 60, max: 79, color: 'bg-blue-500' },
                                                { label: '50–59 (Average)', min: 50, max: 59, color: 'bg-amber-500' },
                                                { label: '40–49 (Below Avg)', min: 40, max: 49, color: 'bg-orange-500' },
                                                { label: '0–39 (Poor)', min: 0, max: 39, color: 'bg-red-500' },
                                            ].map(band => {
                                                const cnt = sorted.filter(r => r.avgScore >= band.min && r.avgScore <= band.max).length;
                                                const scored = sorted.filter(r => r.avgScore > 0).length;
                                                const w = scored > 0 ? (cnt / scored) * 100 : 0;
                                                return (
                                                    <div key={band.label} className="flex items-center gap-3 mb-2">
                                                        <div className="text-xs text-gray-600 w-36 flex-shrink-0">{band.label}</div>
                                                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${band.color} transition-all`} style={{ width: `${w}%` }} />
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-700 w-12 text-right">{cnt} ({w.toFixed(0)}%)</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Top 10 students */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiStar size={14} className="text-amber-500" /> Top 10 Students</h3>
                                            <div className="space-y-1.5">
                                                {sorted.filter(r => r.avgScore > 0).slice(0, 10).map((row, i) => (
                                                    <div key={row.student.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0
                                                            ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-xs font-semibold text-gray-800 flex-1">{row.student.first_name} {row.student.last_name}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">{row.student.admission_no || row.student.admission_number}</span>
                                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.avgScore}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700 w-12 text-right">{row.avgScore.toFixed(1)}%</span>
                                                        <GradeBadge grade={row.meanGrade.grade} small />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Students needing attention */}
                                        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                                            <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2"><FiAlertCircle size={14} /> Students Needing Attention (below 50%)</h3>
                                            {sorted.filter(r => r.avgScore > 0 && r.avgScore < 50).length === 0 ? (
                                                <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5"><FiCheckCircle size={12} /> All students passed!</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {sorted.filter(r => r.avgScore > 0 && r.avgScore < 50).map(row => (
                                                        <div key={row.student.id} className="flex items-center gap-3 py-1 text-xs">
                                                            <span className="font-semibold text-gray-700 flex-1">{row.student.first_name} {row.student.last_name}</span>
                                                            <span className="text-gray-500 font-mono">{row.student.admission_no || row.student.admission_number}</span>
                                                            <span className="font-bold text-red-600">{row.avgScore.toFixed(1)}%</span>
                                                            <GradeBadge grade={row.meanGrade.grade} small />
                                                            <span className="text-gray-500">Rank: {row.rank}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab: STREAM ANALYSIS ──────────────────────────────── */}
                        {activeTab === 'stream' && (
                            <div className="p-4 space-y-5">
                                <SectionHeader title="Stream Comparison" sub={`Comparing streams in ${forms.find(f => String(f.id) === selForm)?.form_name || 'selected form'} — ${selExamType}`} />

                                {streamStats.filter((ss: any) => ss?.count > 0).length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <FiLayers size={32} className="mx-auto mb-3 text-gray-300" />
                                        <p>No stream data available for this form</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(streamStats as any[]).filter(ss => ss?.count > 0).map((ss: any) => (
                                                <div key={ss.stream.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <h3 className="font-bold text-gray-800 text-sm">{ss.stream.stream_name}</h3>
                                                            <p className="text-[10px] text-gray-400">{ss.count} students</p>
                                                        </div>
                                                        {ss.avg > 0 && <GradeBadge grade={ss.grade.grade} />}
                                                    </div>
                                                    <div className="space-y-2 text-xs">
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>Average Score</span>
                                                            <span className="font-bold text-gray-900">{ss.avg > 0 ? pct(ss.avg) : '–'}</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${ss.avg}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-gray-500">
                                                            <span>Mean Grade</span>
                                                            <span className="font-semibold">{ss.avg > 0 ? ss.grade.grade : '–'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Stream ranking table */}
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Stream Ranking</h3>
                                            </div>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100">
                                                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Rank</th>
                                                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Stream</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Students</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Avg Score</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Grade</th>
                                                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Performance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(streamStats as any[]).filter(ss => ss?.avg > 0).sort((a: any, b: any) => b.avg - a.avg).map((ss: any, i) => (
                                                        <tr key={ss.stream.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                            <td className="px-3 py-2.5">
                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                                                                    ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {i + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 font-semibold text-gray-800">{ss.stream.stream_name}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-700">{ss.count}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-gray-900">{pct(ss.avg)}</td>
                                                            <td className="px-3 py-2.5 text-center"><GradeBadge grade={ss.grade.grade} /></td>
                                                            <td className="px-3 py-2.5 w-40">
                                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${ss.avg >= 70 ? 'bg-green-500' : ss.avg >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${ss.avg}%` }} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab: FORM ANALYSIS ───────────────────────────────── */}
                        {activeTab === 'form' && (
                            <div className="p-4 space-y-5">
                                <SectionHeader title="Form-Level Analysis" sub={`All forms — ${selExamType} performance this ${terms.find(t => String(t.id) === selTerm)?.term_name || 'term'}`} />

                                {formStats.filter((fs: any) => fs?.avg > 0).length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <FiUsers size={32} className="mx-auto mb-3 text-gray-300" />
                                        <p>No form data available</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {(formStats as any[]).filter(fs => fs?.count > 0).map((fs: any) => (
                                                <div key={fs.form.id} className={`rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md
                                                    ${String(fs.form.id) === selForm ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                                                    onClick={() => setSelForm(String(fs.form.id))}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-bold text-gray-800">{fs.form.form_name}</h3>
                                                        {fs.avg > 0 && <GradeBadge grade={fs.grade.grade} />}
                                                    </div>
                                                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{fs.avg > 0 ? pct(fs.avg) : '–'}</div>
                                                    <p className="text-[10px] text-gray-500">{fs.scored}/{fs.count} students scored</p>
                                                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${fs.avg >= 70 ? 'bg-green-500' : fs.avg >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                            style={{ width: `${fs.avg}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-1">Pass rate: {fs.scored > 0 ? pct((fs.passes / fs.scored) * 100) : '–'}</p>
                                                    {String(fs.form.id) === selForm && (
                                                        <div className="mt-2 text-[10px] text-indigo-600 font-semibold">Currently viewing ✓</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Form ranking */}
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Form Ranking by Average</h3>
                                            </div>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Rank</th>
                                                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Form</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Enrolled</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Sat Exam</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Avg Score</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Grade</th>
                                                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Pass Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(formStats as any[]).filter(fs => fs?.avg > 0).sort((a: any, b: any) => b.avg - a.avg).map((fs: any, i) => (
                                                        <tr key={fs.form.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${String(fs.form.id) === selForm ? 'bg-indigo-50/50' : ''}`}>
                                                            <td className="px-3 py-2.5">
                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                                                                    ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {i + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 font-semibold text-gray-800">{fs.form.form_name}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600">{fs.count}</td>
                                                            <td className="px-3 py-2.5 text-center text-gray-600">{fs.scored}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-gray-900">{pct(fs.avg)}</td>
                                                            <td className="px-3 py-2.5 text-center"><GradeBadge grade={fs.grade.grade} /></td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className={`font-bold ${(fs.passes / fs.scored) * 100 >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                                                                    {fs.scored > 0 ? pct((fs.passes / fs.scored) * 100) : '–'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab: SCHOOL OVERVIEW ─────────────────────────────── */}
                        {activeTab === 'school' && (
                            <div className="p-4 space-y-5">
                                <SectionHeader title="School-Wide Performance Overview" sub={`Aggregate intelligence across all forms — ${selExamType}, ${terms.find(t => String(t.id) === selTerm)?.term_name || 'current term'}`} />

                                {/* School summary stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatCard label="Total Students" value={students.length} icon={FiUsers} color="blue" />
                                    <StatCard label="School Avg" value={schoolAvg > 0 ? pct(schoolAvg) : '--'} icon={FiBarChart2} color="indigo" />
                                    <StatCard label="School Grade" value={schoolAvg > 0 ? getGrade(schoolAvg).grade : '--'} icon={FiAward} color="green" />
                                    <StatCard label="Total Marks Entered" value={allMarks.length} icon={FiActivity} color="cyan" />
                                </div>

                                {/* Subject performance school-wide */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Subject Performance — School Wide</h3>
                                    </div>
                                    {schoolSubjectStats.filter((ss: any) => ss?.total > 0).length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-xs">No data available</div>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Subject</th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Total Entries</th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">School Avg</th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Grade</th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase">Pass Rate</th>
                                                    <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase">Bar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(schoolSubjectStats as any[]).filter(ss => ss?.total > 0).map((ss: any, i) => (
                                                    <tr key={ss.subject.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                                        <td className="px-3 py-2.5 font-semibold text-gray-800">
                                                            {ss.subject.subject_name}
                                                            {ss.subject.subject_code && <span className="text-[10px] text-gray-400 font-mono ml-1">({ss.subject.subject_code})</span>}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center text-gray-600">{ss.total}</td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-gray-900">{ss.avg > 0 ? ss.avg.toFixed(1) : '–'}</td>
                                                        <td className="px-3 py-2.5 text-center"><GradeBadge grade={ss.grade.grade} /></td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`font-bold ${ss.passRate >= 70 ? 'text-green-600' : ss.passRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                                {pct(ss.passRate)}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 w-36">
                                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all ${ss.avg >= 70 ? 'bg-green-500' : ss.avg >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${ss.avg}%` }} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* CBC Note */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-indigo-200 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <FiInfo size={18} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-indigo-800 mb-1">CBC Broadsheet Note</h3>
                                            <p className="text-xs text-indigo-700 leading-relaxed">
                                                Under Kenya's Competency-Based Curriculum (CBC), traditional numerical broadsheets apply to the 8-4-4 remnant cohorts (Forms 1–4).
                                                CBC assessments use competency levels: <strong>Exceeds Expectation (EE)</strong>, <strong>Meets Expectation (ME)</strong>,
                                                <strong> Approaches Expectation (AE)</strong>, and <strong>Below Expectation (BE)</strong> — rather than letter grades.
                                                Use <strong>CBC Mark Entry</strong> and <strong>CBC Report Cards</strong> pages for Junior Secondary (Grade 7–9) students.
                                                This broadsheet is designed for the 8-4-4 system with letter grade output compatible with KNEC grading.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* School-wide form summary */}
                                {(formStats as any[]).filter(fs => fs?.count > 0).length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">Form Performance Summary</h3>
                                        <div className="space-y-2">
                                            {(formStats as any[]).filter(fs => fs?.count > 0 && fs?.avg > 0).sort((a: any, b: any) => b.avg - a.avg).map((fs: any) => (
                                                <div key={fs.form.id} className="flex items-center gap-3 py-1.5">
                                                    <span className="text-xs font-bold text-gray-700 w-20">{fs.form.form_name}</span>
                                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${fs.avg >= 70 ? 'bg-green-500' : fs.avg >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${fs.avg}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-800 w-14 text-right">{pct(fs.avg)}</span>
                                                    <GradeBadge grade={fs.grade.grade} small />
                                                    <span className="text-[10px] text-gray-400">{fs.count} students</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

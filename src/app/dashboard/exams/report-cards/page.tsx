'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiPrinter, FiUsers, FiUser, FiChevronLeft, FiChevronRight,
    FiFileText, FiAlertTriangle, FiExternalLink, FiTrendingUp,
    FiTrendingDown, FiMinus, FiAward, FiShield, FiDollarSign,
    FiCalendar, FiBarChart2, FiStar
} from 'react-icons/fi';

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

const GRADE_COLORS: Record<string, string> = {
    'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
    'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
    'D-': '#dc2626', 'E': '#991b1b',
};

// ─── Small sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ values, color = '#3b82f6', height = 32, width = 90 }: { values: number[]; color?: string; height?: number; width?: number }) {
    if (values.length < 2) return <span className="text-[10px] text-gray-400">No data</span>;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * (width - 4) + 2;
        const y = height - 4 - ((v - min) / range) * (height - 8);
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => {
                const x = (i / (values.length - 1)) * (width - 4) + 2;
                const y = height - 4 - ((v - min) / range) * (height - 8);
                return <circle key={i} cx={x} cy={y} r="2.2" fill={color} />;
            })}
        </svg>
    );
}

// ─── Grade Badge ──────────────────────────────────────────────────────────────
function GradeBadge({ grade, size = 'sm' }: { grade: string; size?: 'xs' | 'sm' | 'md' }) {
    const cls = size === 'xs' ? 'w-7 h-5 text-[9px]' : size === 'sm' ? 'w-8 h-6 text-[10px]' : 'w-10 h-7 text-xs';
    return (
        <span className={`inline-flex items-center justify-center rounded font-extrabold text-white ${cls}`}
            style={{ background: GRADE_COLORS[grade] || '#64748b' }}>
            {grade}
        </span>
    );
}

// ─── Position Badge ────────────────────────────────────────────────────────────
function PosBadge({ pos, total, color = '#f59e0b' }: { pos: number; total: number; color?: string }) {
    return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
            style={{ background: color }}>
            {pos}/{total}
        </span>
    );
}

export default function ReportCardsPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);

    // All exam marks across CAT1, CAT2, End-Term for current selection
    const [cat1Marks, setCat1Marks] = useState<any[]>([]);
    const [cat2Marks, setCat2Marks] = useState<any[]>([]);
    const [endTermMarks, setEndTermMarks] = useState<any[]>([]);

    // Historical marks for trend (all terms, End-Term only)
    const [historicalMarks, setHistoricalMarks] = useState<any[]>([]);

    // Discipline records
    const [disciplineRecords, setDisciplineRecords] = useState<any[]>([]);

    // Subject teachers (for initials)
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);

    // Fee data
    const [feeStructure, setFeeStructure] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [nextTermData, setNextTermData] = useState<any>(null);
    const [nextTermFeeStructure, setNextTermFeeStructure] = useState<any[]>([]);

    // Comments stored per student
    const [comments, setComments] = useState<Record<number, { classTeacher: string; principal: string }>>({});

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selStudent, setSelStudent] = useState('');
    const [currentStudentIdx, setCurrentStudentIdx] = useState(0);

    const printRef = useRef<HTMLDivElement>(null);

    // ── Fetch base data ────────────────────────────────────────────────────────
    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr, sd] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('year,term_number'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_details').select('*').limit(1).maybeSingle(),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setGrading(gr.data || []);
        setSchoolDetails(sd.data);
        const cur = (t.data || []).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchBase(); }, [fetchBase]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) ||
            { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .sort((a, b) => (a.admission_number || a.admission_no || '').localeCompare(b.admission_number || b.admission_no || ''));

    // ── Load all 3 exam types + historical + discipline + fees ─────────────────
    useEffect(() => {
        if (!selForm || !selTerm) {
            setCat1Marks([]); setCat2Marks([]); setEndTermMarks([]);
            return;
        }
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length === 0) { setCat1Marks([]); setCat2Marks([]); setEndTermMarks([]); return; }

        const load = async () => {
            setLoadingMarks(true);
            // Build subject teachers query — filter by form, and stream if selected
            let stQuery = supabase.from('school_subject_teachers').select('*').eq('form_id', Number(selForm));
            if (selStream) stQuery = stQuery.eq('stream_id', Number(selStream));

            const [c1, c2, et, st] = await Promise.all([
                supabase.from('school_exam_marks').select('*').eq('term_id', Number(selTerm)).eq('exam_type', 'CAT 1').in('student_id', studentIds),
                supabase.from('school_exam_marks').select('*').eq('term_id', Number(selTerm)).eq('exam_type', 'CAT 2').in('student_id', studentIds),
                supabase.from('school_exam_marks').select('*').eq('term_id', Number(selTerm)).eq('exam_type', 'End-Term').in('student_id', studentIds),
                stQuery,
            ]);
            setCat1Marks(c1.data || []);
            setCat2Marks(c2.data || []);
            setEndTermMarks(et.data || []);
            setSubjectTeachers(st.data || []);
            setLoadingMarks(false);
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selTerm, students]);

    // ── Load historical + discipline + fees when a student is selected ────────
    useEffect(() => {
        if (!selStudent || !selForm) return;
        const studentId = Number(selStudent);
        const load = async () => {
            const [hist, disc, fp, fs] = await Promise.all([
                supabase.from('school_exam_marks').select('*').eq('student_id', studentId).eq('exam_type', 'End-Term').order('term_id'),
                supabase.from('school_discipline_records').select('*').eq('student_id', studentId).order('incident_date', { ascending: false }).limit(5),
                supabase.from('school_fee_payments').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }),
                supabase.from('school_fee_structures').select('*').eq('form_id', Number(selForm)).eq('term_id', Number(selTerm)),
            ]);
            setHistoricalMarks(hist.data || []);
            setDisciplineRecords(disc.data || []);
            setFeePayments(fp.data || []);
            setFeeStructure(fs.data || []);

            // Next term
            const currentTerm = terms.find(t => String(t.id) === selTerm);
            if (currentTerm) {
                const nextT = terms.find(t => t.year === currentTerm.year && t.term_number === currentTerm.term_number + 1)
                    || terms.find(t => t.year === currentTerm.year + 1 && t.term_number === 1);
                if (nextT) {
                    setNextTermData(nextT);
                    const ntfs = await supabase.from('school_fee_structures').select('*').eq('form_id', Number(selForm)).eq('term_id', nextT.id);
                    setNextTermFeeStructure(ntfs.data || []);
                }
            }
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selStudent, selForm, selTerm]);

    // ── Build student data with CAT1 + CAT2 + EndTerm merged ─────────────────
    const buildStudentResults = (studentId: number) => {
        const subjectResults: {
            subId: number; subName: string;
            cat1: number | null; cat2: number | null; endTerm: number | null;
            cat1Grade: string; cat2Grade: string; endTermGrade: string;
            cat1Points: number; cat2Points: number; endTermPoints: number;
            // weighted combined (CAT1 30% + CAT2 30% + EndTerm 40% → out of 100)
            combined: number; combinedGrade: string; combinedPoints: number;
            remarks: string;
            subjectTeacherRemark: string;
            teacherInitial: string;
        }[] = [];

        subjects.forEach(sub => {
            const c1 = cat1Marks.find(m => m.student_id === studentId && m.subject_id === sub.id);
            const c2 = cat2Marks.find(m => m.student_id === studentId && m.subject_id === sub.id);
            const et = endTermMarks.find(m => m.student_id === studentId && m.subject_id === sub.id);

            if (!c1 && !c2 && !et) return;

            const c1Score = c1 ? Number(c1.score) : null;
            const c2Score = c2 ? Number(c2.score) : null;
            const etScore = et ? Number(et.score) : null;

            const c1g = c1Score !== null ? getGrade(c1Score) : { grade: '-', points: 0, remarks: '' };
            const c2g = c2Score !== null ? getGrade(c2Score) : { grade: '-', points: 0, remarks: '' };
            const etg = etScore !== null ? getGrade(etScore) : { grade: '-', points: 0, remarks: '' };

            // Combined: use pre-computed combined_score if exists, else weighted
            let combined = 0;
            let count = 0;
            if (c1Score !== null) { combined += c1Score * 0.3; count++; }
            if (c2Score !== null) { combined += c2Score * 0.3; count++; }
            if (etScore !== null) { combined += etScore * 0.4; count++; }
            // If only some exist, normalize
            if (count === 1) combined = (c1Score ?? c2Score ?? etScore)!;
            else if (count === 2) combined = combined / (count === 2 && c1Score !== null && c2Score !== null ? 0.6 : count === 2 && etScore !== null ? 0.7 : 0.6) * 0.6;

            // Use End-Term combined_score if database has it
            const dbCombined = et?.combined_score ? Number(et.combined_score) : null;
            const finalCombined = dbCombined || combined;
            const combinedG = getGrade(finalCombined);

            // Resolve teacher initial from school_subject_teachers
            const stEntry = subjectTeachers.find(st => st.subject_id === sub.id);
            const teacherInitial = stEntry?.teacher_initials || '';

            subjectResults.push({
                subId: sub.id, subName: sub.subject_name,
                cat1: c1Score, cat2: c2Score, endTerm: etScore,
                cat1Grade: c1g.grade, cat2Grade: c2g.grade, endTermGrade: etg.grade,
                cat1Points: c1g.points, cat2Points: c2g.points, endTermPoints: etg.points,
                combined: finalCombined, combinedGrade: combinedG.grade,
                combinedPoints: combinedG.points, remarks: combinedG.remarks,
                subjectTeacherRemark: et?.subject_teacher_remark || '',
                teacherInitial,
            });
        });

        return subjectResults;
    };

    // ── Build all students rankings ────────────────────────────────────────────
    const allStudentData = classStudents.map(student => {
        const subjectResults = buildStudentResults(student.id);
        let totalPoints = 0, totalCombined = 0, subjectCount = 0;
        subjectResults.forEach(r => {
            totalPoints += r.combinedPoints;
            totalCombined += r.combined;
            subjectCount++;
        });
        const avgCombined = subjectCount > 0 ? totalCombined / subjectCount : 0;
        const meanGrade = getGrade(avgCombined);
        return { student, subjectResults, totalPoints, avgCombined, meanGrade, subjectCount };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.avgCombined - a.avgCombined);

    // Assign form ranks
    allStudentData.forEach((row, i) => {
        if (i === 0 || row.totalPoints !== allStudentData[i - 1].totalPoints) {
            (row as any).formRank = i + 1;
        } else {
            (row as any).formRank = (allStudentData[i - 1] as any).formRank;
        }
    });

    // Stream ranks (within same stream)
    const streamGroups: Record<string, typeof allStudentData> = {};
    allStudentData.forEach(row => {
        const sid = String(row.student.stream_id || 'none');
        if (!streamGroups[sid]) streamGroups[sid] = [];
        streamGroups[sid].push(row);
    });
    Object.values(streamGroups).forEach(group => {
        group.sort((a, b) => b.totalPoints - a.totalPoints || b.avgCombined - a.avgCombined);
        group.forEach((row, i) => {
            if (i === 0 || row.totalPoints !== group[i - 1].totalPoints) {
                (row as any).streamRank = i + 1;
            } else {
                (row as any).streamRank = (group[i - 1] as any).streamRank;
            }
        });
    });

    // Per-subject stream & form positions
    const buildSubjectPositions = () => {
        const pos: Record<number, { formPos: Record<number, number>; streamPos: Record<number, number> }> = {};
        subjects.forEach(sub => {
            const formScores = allStudentData
                .map(sd => ({ sid: sd.student.id, combined: sd.subjectResults.find(r => r.subId === sub.id)?.combined ?? -1 }))
                .filter(x => x.combined >= 0)
                .sort((a, b) => b.combined - a.combined);
            formScores.forEach((x, i) => {
                if (!pos[x.sid]) pos[x.sid] = { formPos: {}, streamPos: {} };
                pos[x.sid].formPos[sub.id] = i + 1;
            });

            Object.entries(streamGroups).forEach(([, grp]) => {
                const sScores = grp
                    .map(sd => ({ sid: sd.student.id, combined: sd.subjectResults.find(r => r.subId === sub.id)?.combined ?? -1 }))
                    .filter(x => x.combined >= 0)
                    .sort((a, b) => b.combined - a.combined);
                sScores.forEach((x, i) => {
                    if (!pos[x.sid]) pos[x.sid] = { formPos: {}, streamPos: {} };
                    pos[x.sid].streamPos[sub.id] = i + 1;
                });
            });
        });
        return pos;
    };
    const subjectPositions = buildSubjectPositions();

    const selectedStudentData = selStudent
        ? allStudentData.find(d => d.student.id === Number(selStudent))
        : (classStudents.length > 0 ? allStudentData[currentStudentIdx] : null);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '';
    const getTermName = (id: string) => terms.find(t => String(t.id) === id)?.term_name || '-';

    // ── Value Added Analysis ───────────────────────────────────────────────────
    const computeValueAdd = () => {
        if (!selectedStudentData) return null;
        const kcpe = selectedStudentData.student.kcpe_marks;
        const avg = selectedStudentData.avgCombined;
        if (!kcpe) return null;
        // KCPE max is 500, convert to 100 scale
        const kcpeNorm = (kcpe / 500) * 100;
        const dev = avg - kcpeNorm;
        return { kcpeNorm: kcpeNorm.toFixed(1), current: avg.toFixed(1), deviation: dev.toFixed(1) };
    };
    const valueAdd = computeValueAdd();

    // ── Trend data across terms ────────────────────────────────────────────────
    const trendData = (() => {
        if (!selectedStudentData || historicalMarks.length === 0) return [];
        const byTerm: Record<number, number[]> = {};
        historicalMarks.forEach(m => {
            if (!byTerm[m.term_id]) byTerm[m.term_id] = [];
            byTerm[m.term_id].push(Number(m.score));
        });
        return Object.entries(byTerm).map(([tid, scores]) => {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const termObj = terms.find(t => t.id === Number(tid));
            return { label: termObj?.term_name || `T${tid}`, avg: parseFloat(avg.toFixed(1)) };
        });
    })();

    // ── Fee computations ──────────────────────────────────────────────────────
    const totalFeeCharged = feeStructure.reduce((s, f) => s + Number(f.amount), 0);
    const totalFeePaid = feePayments
        .filter(p => String(p.term_id) === selTerm)
        .reduce((s, p) => s + Number(p.amount), 0);
    const currentBalance = totalFeeCharged - totalFeePaid;
    const nextTermFeeTotal = nextTermFeeStructure.reduce((s, f) => s + Number(f.amount), 0);
    const totalDue = currentBalance + nextTermFeeTotal;

    // ── Attendance from discipline (proxy) ─────────────────────────────────────
    const disciplineSummary = {
        total: disciplineRecords.length,
        open: disciplineRecords.filter(d => d.status === 'Open').length,
        resolved: disciplineRecords.filter(d => d.status === 'Resolved' || d.status === 'Closed').length,
    };

    const streamStudentCount = selStream
        ? classStudents.filter(s => String(s.stream_id) === selStream).length
        : classStudents.length;

    const isReady = selForm && selTerm;

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-[3px] border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading Report Cards...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ── Print Styles ── */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 8mm; }
                    .page-break { page-break-after: always; }
                }
                .rc-table thead th { position: sticky; top: 0; }
                .discipline-badge-open { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
                .discipline-badge-resolved { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
                .discipline-badge-pending { background: #fffbeb; color: #d97706; border: 1px solid #fcd34d; }
            `}</style>

            {/* ── Header ── */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiFileText className="text-emerald-500" /> Report Cards
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">8-4-4 Ultra Premium</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive student progress reports with analytics — Individual or bulk printing</p>
                </div>
                {selectedStudentData && (
                    <button onClick={() => window.print()}
                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <FiPrinter size={14} /> Print Report Card
                    </button>
                )}
            </div>

            {/* ── Filters ── */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Form *</label>
                        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelStudent(''); }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                            <option value="">Select Form</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Stream</label>
                        <select value={selStream} onChange={e => { setSelStream(e.target.value); setSelStudent(''); }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Term *</label>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                            <option value="">Select Term</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Student</label>
                        <select value={selStudent} onChange={e => {
                            setSelStudent(e.target.value);
                            const idx = classStudents.findIndex(s => s.id === Number(e.target.value));
                            if (idx >= 0) setCurrentStudentIdx(idx);
                        }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                            <option value="">Navigate (arrows)</option>
                            {classStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Student Navigator */}
                {isReady && classStudents.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <button onClick={() => {
                            const i = Math.max(0, currentStudentIdx - 1);
                            setCurrentStudentIdx(i);
                            setSelStudent(String(classStudents[i]?.id || ''));
                        }} disabled={currentStudentIdx === 0}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1">
                            <FiChevronLeft size={14} /> Previous
                        </button>
                        <div className="text-center">
                            <span className="text-sm font-bold text-gray-700">{currentStudentIdx + 1} of {classStudents.length} students</span>
                            {loadingMarks && <span className="ml-2 text-xs text-emerald-500 animate-pulse">Loading marks...</span>}
                        </div>
                        <button onClick={() => {
                            const i = Math.min(classStudents.length - 1, currentStudentIdx + 1);
                            setCurrentStudentIdx(i);
                            setSelStudent(String(classStudents[i]?.id || ''));
                        }} disabled={currentStudentIdx >= classStudents.length - 1}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1">
                            Next <FiChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Guards ── */}
            {!isReady ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400 no-print">
                    <span className="text-5xl block mb-4">🎓</span>
                    <p className="font-semibold text-lg">Select Form & Term to generate report cards</p>
                    <p className="text-sm mt-1 text-gray-300">CAT 1 · CAT 2 · End-Term marks will be automatically combined</p>
                </div>
            ) : selForm && getEducationSystem(Number(selForm), forms) === 'CBC_Senior_School' ? (
                <div className="no-print flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">This is a CBC class.</p>
                        <p className="text-sm text-amber-700 mt-0.5">Use CBC Report Cards for competency-based assessment.</p>
                    </div>
                    <Link href="/dashboard/exams/cbc-report-cards"
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 flex-shrink-0">
                        <FiExternalLink size={13} /> CBC Report Cards
                    </Link>
                </div>
            ) : loadingMarks ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 no-print">
                    <div className="w-8 h-8 border-[3px] border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading marks from all exam types...</p>
                </div>
            ) : !selectedStudentData ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400 no-print">
                    <span className="text-5xl block mb-4">👤</span>
                    <p className="font-semibold">No student data available</p>
                </div>
            ) : (

                /* ════════════════════════════════════════════════════════════
                   ULTRA PREMIUM REPORT CARD
                ════════════════════════════════════════════════════════════ */
                <div className="print-area" ref={printRef}>
                    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden max-w-[860px] mx-auto shadow-2xl"
                        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>

                        {/* ── School Header ── */}
                        <div className="relative overflow-hidden border-b-4 border-blue-700" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 70%, #1e40af 100%)' }}>
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
                            <div className="relative z-10 p-6 text-center">
                                {schoolDetails?.logo_url && (
                                    <img src={schoolDetails.logo_url} alt="Logo" className="w-16 h-16 mx-auto mb-3 object-contain rounded-full border-2 border-white/40 shadow-lg" />
                                )}
                                <h1 className="text-2xl font-extrabold text-white uppercase tracking-widest drop-shadow">
                                    {schoolDetails?.school_name || 'ALPHA SCHOOL'}
                                </h1>
                                {schoolDetails?.motto && (
                                    <p className="text-blue-200 text-sm italic mt-1">"{schoolDetails.motto}"</p>
                                )}
                                <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-blue-200 mt-2">
                                    {schoolDetails?.postal_address && <span>📬 P.O. Box {schoolDetails.postal_address}</span>}
                                    {schoolDetails?.phone1 && <span>📞 {schoolDetails.phone1}</span>}
                                    {schoolDetails?.email && <span>✉ {schoolDetails.email}</span>}
                                    {schoolDetails?.county && <span>📍 {schoolDetails.county}</span>}
                                </div>
                                <div className="mt-4 inline-block">
                                    <div className="bg-white/15 border border-white/30 rounded-xl px-8 py-2 backdrop-blur-sm">
                                        <p className="text-white font-black text-base uppercase tracking-[0.25em]">Student Progress Report</p>
                                        <p className="text-blue-200 text-xs mt-0.5">{getTermName(selTerm)} · 8-4-4 Curriculum</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Top Summary Bar: Stream Pos / Form Pos / Stream Grade / Form Grade ── */}
                        <div className="grid grid-cols-4 divide-x divide-gray-200 border-b-2 border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50">
                            {[
                                {
                                    icon: '🏅', label: 'Stream Position',
                                    value: `${(selectedStudentData as any).streamRank ?? '-'}`,
                                    sub: `of ${streamStudentCount} (${getStreamName(selectedStudentData.student.stream_id)})`,
                                    color: '#f59e0b'
                                },
                                {
                                    icon: '🏆', label: 'Form Position',
                                    value: `${(selectedStudentData as any).formRank ?? '-'}`,
                                    sub: `of ${classStudents.length} students`,
                                    color: '#10b981'
                                },
                                {
                                    icon: '📊', label: 'Stream Grade',
                                    value: selectedStudentData.meanGrade.grade,
                                    sub: selectedStudentData.meanGrade.remarks,
                                    color: GRADE_COLORS[selectedStudentData.meanGrade.grade] || '#64748b',
                                    isGrade: true
                                },
                                {
                                    icon: '🎯', label: 'Mean Score',
                                    value: `${selectedStudentData.avgCombined.toFixed(1)}%`,
                                    sub: `${selectedStudentData.totalPoints} pts · ${selectedStudentData.subjectCount} subjects`,
                                    color: '#6366f1'
                                },
                            ].map((s, i) => (
                                <div key={i} className="py-3 px-3 text-center">
                                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">{s.icon} {s.label}</p>
                                    {s.isGrade ? (
                                        <div className="mt-1 flex justify-center">
                                            <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-white font-black text-lg"
                                                style={{ background: s.color }}>{s.value}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
                                    )}
                                    <p className="text-[9px] text-gray-400 mt-0.5">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Student Info ── */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 px-6 py-4 bg-gray-50 border-b border-gray-200 text-[12px]">
                            {[
                                ['Student Name', `${selectedStudentData.student.first_name} ${selectedStudentData.student.other_name || selectedStudentData.student.middle_name || ''} ${selectedStudentData.student.last_name}`.trim()],
                                ['Adm Number', selectedStudentData.student.admission_number || selectedStudentData.student.admission_no],
                                ['Form / Class', `${getFormName(selectedStudentData.student.form_id)} ${getStreamName(selectedStudentData.student.stream_id)}`],
                                ['Term', `${getTermName(selTerm)}`],
                                ['KCPE Marks', selectedStudentData.student.kcpe_marks ? `${selectedStudentData.student.kcpe_marks} / 500` : '-'],
                                ['Guardian', selectedStudentData.student.guardian_name || '-'],
                            ].map(([label, val]) => (
                                <div key={label} className="flex gap-2">
                                    <span className="font-bold text-gray-500 w-28 shrink-0">{label}:</span>
                                    <span className="font-semibold text-gray-900">{val}</span>
                                </div>
                            ))}
                        </div>

                        {/* ── MAIN MARKS GRID ── */}
                        <div className="px-4 py-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                                <FiBarChart2 size={11} /> Academic Performance — Combined Assessment (CAT 1 · CAT 2 · End-Term)
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                <table className="w-full border-collapse text-[11px] rc-table min-w-[700px]">
                                    <thead>
                                        {/* ── Header row 1: group labels ── */}
                                        <tr style={{ background: '#1e3a8a' }}>
                                            <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-left text-white font-bold text-[10px] w-6">#</th>
                                            <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-left text-white font-bold text-[10px]">SUBJECT</th>
                                            <th colSpan={3} className="border border-blue-600 px-2 py-1.5 text-center text-blue-200 font-bold text-[10px] uppercase">CAT 1 (30%)</th>
                                            <th colSpan={3} className="border border-blue-600 px-2 py-1.5 text-center text-blue-200 font-bold text-[10px] uppercase">CAT 2 (30%)</th>
                                            <th colSpan={3} className="border border-blue-600 px-2 py-1.5 text-center text-blue-200 font-bold text-[10px] uppercase">END-TERM (40%)</th>
                                            <th colSpan={4} className="border border-yellow-500 bg-yellow-600 px-2 py-1.5 text-center text-yellow-100 font-bold text-[10px] uppercase">OVERALL / COMBINED</th>
                                            <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-center text-white font-bold text-[10px]">REMARKS</th>
                                            <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-center text-white font-bold text-[10px]">INITIAL</th>
                                        </tr>
                                        <tr style={{ background: '#1e40af' }}>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">MKS</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">GR</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">STR</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">MKS</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">GR</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">STR</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">MKS</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">GR</th>
                                            <th className="border border-blue-600 px-1.5 py-1.5 text-center text-blue-200 font-bold text-[9px]">STR</th>
                                            <th className="border border-yellow-500 bg-yellow-600/80 px-1.5 py-1.5 text-center text-yellow-100 font-bold text-[9px]">SCORE</th>
                                            <th className="border border-yellow-500 bg-yellow-600/80 px-1.5 py-1.5 text-center text-yellow-100 font-bold text-[9px]">GR</th>
                                            <th className="border border-yellow-500 bg-yellow-600/80 px-1.5 py-1.5 text-center text-yellow-100 font-bold text-[9px]">STR</th>
                                            <th className="border border-yellow-500 bg-yellow-600/80 px-1.5 py-1.5 text-center text-yellow-100 font-bold text-[9px]">FRM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedStudentData.subjectResults.map((r, i) => {
                                            const sPos = subjectPositions[selectedStudentData.student.id];
                                            const streamStudentsWithSubject = streamGroups[String(selectedStudentData.student.stream_id || 'none')]?.length || classStudents.length;
                                            const formStudentsWithSubject = classStudents.length;
                                            return (
                                                <tr key={r.subId} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}>
                                                    <td className="border border-gray-200 px-2 py-1.5 text-gray-400 text-[10px]">{i + 1}</td>
                                                    <td className="border border-gray-200 px-2 py-1.5 font-semibold text-gray-800 text-[11px]">{r.subName}</td>
                                                    {/* CAT 1 */}
                                                    <td className="border border-gray-200 px-1.5 py-1.5 text-center font-bold text-gray-700">
                                                        {r.cat1 !== null ? r.cat1 : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center">
                                                        {r.cat1 !== null ? <GradeBadge grade={r.cat1Grade} size="xs" /> : <span className="text-gray-300 text-[9px]">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center text-[9px] text-gray-500">-</td>
                                                    {/* CAT 2 */}
                                                    <td className="border border-gray-200 px-1.5 py-1.5 text-center font-bold text-gray-700">
                                                        {r.cat2 !== null ? r.cat2 : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center">
                                                        {r.cat2 !== null ? <GradeBadge grade={r.cat2Grade} size="xs" /> : <span className="text-gray-300 text-[9px]">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center text-[9px] text-gray-500">-</td>
                                                    {/* End-Term */}
                                                    <td className="border border-gray-200 px-1.5 py-1.5 text-center font-bold text-gray-700">
                                                        {r.endTerm !== null ? r.endTerm : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center">
                                                        {r.endTerm !== null ? <GradeBadge grade={r.endTermGrade} size="xs" /> : <span className="text-gray-300 text-[9px]">-</span>}
                                                    </td>
                                                    <td className="border border-gray-200 px-1 py-1 text-center text-[9px] text-gray-500">-</td>
                                                    {/* Combined */}
                                                    <td className="border border-yellow-200 bg-yellow-50 px-1.5 py-1.5 text-center font-black text-gray-800">
                                                        {r.combined.toFixed(1)}
                                                    </td>
                                                    <td className="border border-yellow-200 bg-yellow-50 px-1 py-1 text-center">
                                                        <GradeBadge grade={r.combinedGrade} size="xs" />
                                                    </td>
                                                    <td className="border border-yellow-200 bg-yellow-50 px-1 py-1 text-center">
                                                        {sPos ? <PosBadge pos={sPos.streamPos[r.subId] || 1} total={streamStudentsWithSubject} color="#6366f1" /> : '-'}
                                                    </td>
                                                    <td className="border border-yellow-200 bg-yellow-50 px-1 py-1 text-center">
                                                        {sPos ? <PosBadge pos={sPos.formPos[r.subId] || 1} total={formStudentsWithSubject} color="#10b981" /> : '-'}
                                                    </td>
                                                    {/* Remarks / Teacher remark */}
                                                    <td className="border border-gray-200 px-1.5 py-1.5 text-[9px] text-gray-600 max-w-[120px]">
                                                        {r.subjectTeacherRemark
                                                            ? <span className="text-blue-700 font-semibold italic">{r.subjectTeacherRemark}</span>
                                                            : <span className="text-gray-400">{r.remarks}</span>
                                                        }
                                                    </td>
                                                    {/* Teacher Initial */}
                                                    <td className="border border-gray-200 px-1 py-1.5 text-center">
                                                        {r.teacherInitial
                                                            ? <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-blue-700 text-white text-[10px] font-black tracking-wide">{r.teacherInitial}</span>
                                                            : <span className="text-gray-300 text-[9px]">—</span>
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-black border-t-2 border-blue-300" style={{ background: 'linear-gradient(90deg, #eff6ff, #dbeafe)' }}>
                                            <td colSpan={2} className="border border-blue-300 px-2 py-2.5 text-sm text-blue-900 uppercase font-black tracking-wide">TOTAL / MEAN</td>
                                            <td colSpan={3} className="border border-blue-300 px-2 py-2 text-center text-[10px] text-blue-600 font-bold">—</td>
                                            <td colSpan={3} className="border border-blue-300 px-2 py-2 text-center text-[10px] text-blue-600 font-bold">—</td>
                                            <td colSpan={3} className="border border-blue-300 px-2 py-2 text-center text-[10px] text-blue-600 font-bold">—</td>
                                            <td className="border border-yellow-300 bg-yellow-100 px-2 py-2 text-center text-sm font-black text-blue-900">
                                                {selectedStudentData.avgCombined.toFixed(1)}
                                            </td>
                                            <td className="border border-yellow-300 bg-yellow-100 px-2 py-2 text-center">
                                                <GradeBadge grade={selectedStudentData.meanGrade.grade} size="md" />
                                            </td>
                                            <td className="border border-yellow-300 bg-yellow-100 px-1 py-2 text-center">
                                                <PosBadge pos={(selectedStudentData as any).streamRank || 1} total={streamStudentCount} color="#6366f1" />
                                            </td>
                                            <td className="border border-yellow-300 bg-yellow-100 px-1 py-2 text-center">
                                                <PosBadge pos={(selectedStudentData as any).formRank || 1} total={classStudents.length} color="#10b981" />
                                            </td>
                                            <td className="border border-blue-300 px-2 py-2 text-[10px] text-blue-700 font-bold">{selectedStudentData.meanGrade.remarks}</td>
                                            <td className="border border-blue-300 px-2 py-2 text-center text-[10px] text-gray-400">—</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ── Summary Stat Cards ── */}
                        <div className="grid grid-cols-4 gap-3 px-4 mb-4">
                            {[
                                { label: 'Total Subjects', value: selectedStudentData.subjectCount, color: '#3b82f6', icon: '📚' },
                                { label: 'Total Points', value: selectedStudentData.totalPoints, color: '#8b5cf6', icon: '⭐' },
                                { label: 'Mean Score', value: `${selectedStudentData.avgCombined.toFixed(1)}%`, color: '#10b981', icon: '📈' },
                                { label: 'Overall Grade', value: selectedStudentData.meanGrade.grade, color: GRADE_COLORS[selectedStudentData.meanGrade.grade] || '#64748b', icon: '🏆' },
                            ].map((s, i) => (
                                <div key={i} className="text-center p-3 rounded-xl border-2 shadow-sm"
                                    style={{ borderColor: s.color + '40', background: `linear-gradient(135deg, ${s.color}08, ${s.color}15)` }}>
                                    <p className="text-lg">{s.icon}</p>
                                    <p className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5" style={{ color: s.color }}>{s.label}</p>
                                    <p className="text-lg font-black text-gray-800 mt-0.5" style={{ color: s.color }}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Analytics Section ── */}
                        <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                            {/* Value Add Analysis */}
                            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1">
                                    <FiTrendingUp size={11} /> Value Added Analysis
                                </p>
                                {valueAdd ? (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-500">KCPE Baseline</span>
                                            <span className="font-bold text-gray-700">{valueAdd.kcpeNorm}%</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-500">Current Mean</span>
                                            <span className="font-bold text-blue-700">{valueAdd.current}%</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] border-t border-emerald-200 pt-1.5">
                                            <span className="font-bold text-gray-600">Value Added</span>
                                            <span className={`font-black text-sm flex items-center gap-1 ${Number(valueAdd.deviation) > 0 ? 'text-emerald-600' : Number(valueAdd.deviation) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                {Number(valueAdd.deviation) > 0 ? <FiTrendingUp size={12} /> : Number(valueAdd.deviation) < 0 ? <FiTrendingDown size={12} /> : <FiMinus size={12} />}
                                                {Number(valueAdd.deviation) > 0 ? '+' : ''}{valueAdd.deviation}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                                            <div className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, Number(valueAdd.current)))}%`,
                                                    background: Number(valueAdd.deviation) >= 0 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f87171, #ef4444)'
                                                }} />
                                        </div>
                                        <p className="text-[9px] text-gray-400 text-center">
                                            {Number(valueAdd.deviation) > 5 ? '🌟 Excellent Progress' : Number(valueAdd.deviation) > 0 ? '✅ Good Progress' : Number(valueAdd.deviation) === 0 ? '➡️ On Track' : '⚠️ Needs Improvement'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-400 mt-1">KCPE marks needed for value-add analysis</p>
                                )}
                            </div>

                            {/* Trend Sparkline */}
                            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1">
                                    <FiBarChart2 size={11} /> Performance Trend
                                </p>
                                {trendData.length >= 2 ? (
                                    <div>
                                        <div className="flex justify-center">
                                            <Sparkline values={trendData.map(t => t.avg)} color="#3b82f6" height={40} width={130} />
                                        </div>
                                        <div className="flex justify-between mt-1 px-1">
                                            {trendData.map((t, i) => (
                                                <div key={i} className="text-center">
                                                    <p className="text-[8px] text-gray-400">{t.label.replace('Term ', 'T')}</p>
                                                    <p className="text-[9px] font-bold text-blue-700">{t.avg}%</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-center">
                                            {trendData.length >= 2 && (
                                                <p className="text-[9px] text-gray-500">
                                                    {trendData[trendData.length - 1].avg > trendData[0].avg
                                                        ? `📈 +${(trendData[trendData.length - 1].avg - trendData[0].avg).toFixed(1)}% overall growth`
                                                        : `📉 ${(trendData[trendData.length - 1].avg - trendData[0].avg).toFixed(1)}% change`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">Not enough history for trend</p>
                                )}
                            </div>
                        </div>

                        {/* ── Subject Performance Mini Bar Chart ── */}
                        {selectedStudentData.subjectResults.length > 0 && (
                            <div className="px-4 pb-4">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                                    <FiStar size={11} /> Subject Performance Profile
                                </p>
                                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                                    <div className="space-y-1.5">
                                        {selectedStudentData.subjectResults
                                            .sort((a, b) => b.combined - a.combined)
                                            .map(r => (
                                                <div key={r.subId} className="flex items-center gap-2 text-[10px]">
                                                    <span className="w-28 font-semibold text-gray-600 truncate shrink-0">{r.subName}</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-3.5 overflow-hidden">
                                                        <div className="h-full rounded-full transition-all flex items-center justify-end pr-1"
                                                            style={{
                                                                width: `${Math.min(100, r.combined)}%`,
                                                                background: `linear-gradient(90deg, ${GRADE_COLORS[r.combinedGrade] || '#64748b'}88, ${GRADE_COLORS[r.combinedGrade] || '#64748b'})`
                                                            }}>
                                                        </div>
                                                    </div>
                                                    <span className="w-10 text-right font-black" style={{ color: GRADE_COLORS[r.combinedGrade] || '#64748b' }}>{r.combined.toFixed(0)}%</span>
                                                    <GradeBadge grade={r.combinedGrade} size="xs" />
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Bottom Sections: Discipline | Fees ── */}
                        <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                            {/* Discipline */}
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 mb-2 flex items-center gap-1">
                                    <FiShield size={11} /> Student Discipline
                                </p>
                                {disciplineRecords.length === 0 ? (
                                    <div className="text-center py-2">
                                        <p className="text-2xl">✅</p>
                                        <p className="text-[10px] text-green-600 font-bold mt-1">Excellent Conduct</p>
                                        <p className="text-[9px] text-gray-400">No discipline issues recorded</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex gap-3 mb-2">
                                            <div className="text-center">
                                                <p className="text-lg font-black text-orange-600">{disciplineSummary.total}</p>
                                                <p className="text-[8px] text-gray-400">Total</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-black text-red-600">{disciplineSummary.open}</p>
                                                <p className="text-[8px] text-gray-400">Open</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-black text-green-600">{disciplineSummary.resolved}</p>
                                                <p className="text-[8px] text-gray-400">Resolved</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {disciplineRecords.slice(0, 3).map(d => (
                                                <div key={d.id} className="flex items-center gap-1.5 text-[9px]">
                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${d.status === 'Open' ? 'discipline-badge-open' : 'discipline-badge-resolved'}`}>
                                                        {d.severity}
                                                    </span>
                                                    <span className="text-gray-600 truncate">{d.category} — {d.action_taken}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fees */}
                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 mb-2 flex items-center gap-1">
                                    <FiDollarSign size={11} /> Fee Statement
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Term Fee Charged</span>
                                        <span className="font-bold text-gray-800">KES {totalFeeCharged.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Amount Paid</span>
                                        <span className="font-bold text-green-700">KES {totalFeePaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-purple-200 pt-1.5">
                                        <span className="font-bold text-gray-600">Current Balance</span>
                                        <span className={`font-black ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            KES {Math.abs(currentBalance).toLocaleString()}
                                            {currentBalance > 0 ? ' (OWE)' : currentBalance < 0 ? ' (CR)' : ' ✓'}
                                        </span>
                                    </div>
                                    {nextTermFeeTotal > 0 && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Next Term Fee</span>
                                                <span className="font-bold text-blue-700">KES {nextTermFeeTotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between border-t-2 border-purple-300 pt-1.5 bg-purple-100 px-1 rounded">
                                                <span className="font-black text-purple-800">Total Due</span>
                                                <span className="font-black text-purple-900">KES {Math.max(0, totalDue).toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Next Term Opening Date ── */}
                        {nextTermData && (
                            <div className="mx-4 mb-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 flex items-center gap-3">
                                <FiCalendar size={20} className="text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wide">Next Term Opening Date</p>
                                    <p className="text-sm font-black text-blue-900 mt-0.5">
                                        {nextTermData.term_name} —{' '}
                                        {nextTermData.start_date
                                            ? new Date(nextTermData.start_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'To be announced'}
                                    </p>
                                </div>
                                {nextTermData.start_date && (
                                    <div className="ml-auto text-right">
                                        <p className="text-[9px] text-blue-400">Days remaining</p>
                                        <p className="text-xl font-black text-blue-700">
                                            {Math.max(0, Math.ceil((new Date(nextTermData.start_date).getTime() - Date.now()) / 86400000))}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Comments Section ── */}
                        <div className="px-4 pb-4 space-y-3">
                            <div className="border border-gray-300 rounded-xl p-3">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-1">Class Teacher's Comment</p>
                                <div className="min-h-[32px] border-b border-dashed border-gray-300" />
                            </div>
                            <div className="border border-gray-300 rounded-xl p-3">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-1">Principal's Comment</p>
                                <div className="min-h-[32px] border-b border-dashed border-gray-300" />
                            </div>
                        </div>

                        {/* ── Signature Lines ── */}
                        <div className="grid grid-cols-3 gap-4 px-6 pb-6">
                            {['Class Teacher', 'Principal', 'Parent / Guardian'].map(role => (
                                <div key={role} className="text-center">
                                    <div className="border-b-2 border-gray-400 mb-1.5 h-10" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{role}'s Signature</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-6 py-3 text-center border-t-4 border-blue-700" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
                            <p className="text-[10px] text-blue-200 font-semibold">
                                This report card is computer-generated by {schoolDetails?.school_name || 'Alpha School'} Management System (APSIMS)
                            </p>
                            <p className="text-[9px] text-blue-400 mt-0.5">
                                Printed on {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · Powered by APSIMS — Kenya's Leading School Management Platform
                            </p>
                        </div>
                    </div>

                    {/* ── Grading Scale Reference (no-print hidden on actual card) ── */}
                    <div className="no-print mt-5 bg-white rounded-2xl border border-gray-200 p-4 max-w-[860px] mx-auto">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-3">Grading Scale Reference</p>
                        <div className="flex flex-wrap gap-2">
                            {grading.map(g => (
                                <div key={g.grade} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-xs">
                                    <GradeBadge grade={g.grade} size="xs" />
                                    <span className="text-gray-600">{g.min_score}-{g.max_score}%</span>
                                    <span className="text-gray-400">({g.points}pts)</span>
                                    <span className="text-gray-400 hidden sm:inline">· {g.remarks}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

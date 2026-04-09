'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiPrinter, FiSearch, FiFilter, FiFileText, FiBarChart2, FiGrid, FiTrendingUp, FiAward, FiDollarSign, FiCalendar, FiBookOpen, FiCheckSquare, FiSquare } from 'react-icons/fi';

type ReportTab = 'marksheet' | 'subject-analysis' | 'class-analysis' | 'progressive' | 'report-card' | 'merit-list' | 'fee-reports' | 'attendance-report';

const REPORT_TABS: { key: ReportTab; label: string; icon: string; desc: string }[] = [
    { key: 'marksheet', label: 'Mark Sheet', icon: 'file', desc: 'Subject mark entry sheets per class' },
    { key: 'subject-analysis', label: 'Subject Analysis', icon: 'bar', desc: 'Performance breakdown by subject' },
    { key: 'class-analysis', label: 'Class/Form Analysis', icon: 'grid', desc: 'Class & form-level performance' },
    { key: 'progressive', label: 'Progressive Report', icon: 'trend', desc: 'Student progress across terms' },
    { key: 'report-card', label: 'Report Cards', icon: 'book', desc: 'End of term student reports' },
    { key: 'merit-list', label: 'Merit List', icon: 'award', desc: 'Ranked student performance' },
    { key: 'fee-reports', label: 'Fee Reports', icon: 'dollar', desc: 'Fee collection & balance reports' },
    { key: 'attendance-report', label: 'Attendance Report', icon: 'cal', desc: 'Student attendance summaries' },
];
const TAB_ICONS: Record<string, any> = { file: FiFileText, bar: FiBarChart2, grid: FiGrid, trend: FiTrendingUp, book: FiBookOpen, award: FiAward, dollar: FiDollarSign, cal: FiCalendar };

const KCSE_GRADES = [
    { grade: 'A', min: 80, max: 100, pts: 12 }, { grade: 'A-', min: 75, max: 79, pts: 11 },
    { grade: 'B+', min: 70, max: 74, pts: 10 }, { grade: 'B', min: 65, max: 69, pts: 9 },
    { grade: 'B-', min: 60, max: 64, pts: 8 }, { grade: 'C+', min: 55, max: 59, pts: 7 },
    { grade: 'C', min: 50, max: 54, pts: 6 }, { grade: 'C-', min: 45, max: 49, pts: 5 },
    { grade: 'D+', min: 40, max: 44, pts: 4 }, { grade: 'D', min: 35, max: 39, pts: 3 },
    { grade: 'D-', min: 30, max: 34, pts: 2 }, { grade: 'E', min: 0, max: 29, pts: 1 },
];

function getGrade(score: number) {
    return KCSE_GRADES.find(g => score >= g.min && score <= g.max) || { grade: 'E', pts: 1 };
}

function ReportsContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as ReportTab | null;
    const [activeTab, setActiveTab] = useState<ReportTab>(tabParam || 'marksheet');
    const [loading, setLoading] = useState(true);

    // Data
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    // Filters
    const [selForm, setSelForm] = useState(0);
    const [selStream, setSelStream] = useState(0);
    const [selExam, setSelExam] = useState('');
    const [selSubject, setSelSubject] = useState(0);
    const [selTerm, setSelTerm] = useState('');
    const [selYear, setSelYear] = useState(new Date().getFullYear());
    const [selStudent, setSelStudent] = useState(0);
    const [search, setSearch] = useState('');
    const [selExams, setSelExams] = useState<string[]>([]);

    const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    useEffect(() => {
        if (tabParam) setActiveTab(tabParam);
    }, [tabParam]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, sRes, subRes, stRes, mRes, tRes, stRes2, termRes] = await Promise.all([
            supabase.from('school_forms').select('*').eq('is_active', true).order('form_level'),
            supabase.from('school_streams').select('*').eq('is_active', true).order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_teachers').select('*').eq('status', 'Active'),
            supabase.from('school_subject_teachers').select('*, school_subjects(subject_name, subject_code), school_teachers(first_name, last_name)'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setForms(fRes.data || []);
        setStreams(sRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(stRes.data || []);
        setTeachers(tRes.data || []);
        setSubjectTeachers(stRes2.data || []);
        setTerms(termRes.data || []);

        // Build marks with a virtual exam_id from term_id + exam_type
        const rawMarks = mRes.data || [];
        const examMap = new Map<string, any>();
        rawMarks.forEach((m: any) => {
            const key = `${m.term_id}_${m.exam_type}`;
            if (!examMap.has(key)) {
                const term = (termRes.data || []).find((t: any) => t.id === m.term_id);
                examMap.set(key, {
                    id: key,
                    exam_name: m.exam_type,
                    term: term?.term_name || `Term ${m.term_id}`,
                    year: term?.year || new Date().getFullYear(),
                    term_id: m.term_id,
                    exam_type: m.exam_type,
                });
            }
        });
        // Also add all term  exam_type combos for completeness
        (termRes.data || []).forEach((t: any) => {
            EXAM_TYPES.forEach(et => {
                const key = `${t.id}_${et}`;
                if (!examMap.has(key)) {
                    examMap.set(key, { id: key, exam_name: et, term: t.term_name, year: t.year, term_id: t.id, exam_type: et });
                }
            });
        });
        setExams(Array.from(examMap.values()));

        // Normalize marks to use the virtual exam_id
        const normalizedMarks = rawMarks.map((m: any) => ({
            ...m,
            exam_id: `${m.term_id}_${m.exam_type}`,
        }));
        setMarks(normalizedMarks);
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Helpers
    const filteredStudents = students.filter(s => {
        if (selForm && s.form_id !== selForm) return false;
        if (selStream && s.stream_id !== selStream) return false;
        if (search && !`${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
        return s.status === 'Active';
    });

    const getStudentMarks = (studentId: number, examId: string) => marks.filter(m => m.student_id === studentId && m.exam_id === examId);
    const getSubjectAvg = (subjectId: number, examId: string) => {
        const subMarks = marks.filter(m => m.subject_id === subjectId && m.exam_id === examId && m.score != null);
        if (subMarks.length === 0) return 0;
        return Math.round(subMarks.reduce((sum, m) => sum + m.score, 0) / subMarks.length);
    };

    const printReport = () => {
        const printArea = document.getElementById('report-print-area');
        if (printArea) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write(`<html><head><title>APSIMS Report</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1a1a1a; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
                    th { background: #f3f4f6; font-weight: 700; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    h2 { font-size: 14px; color: #6366f1; margin: 16px 0 8px; }
                    .badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
                    .grade-a { background: #dcfce7; color: #166534; }
                    .grade-b { background: #dbeafe; color: #1e3a8a; }
                    .grade-c { background: #fef9c3; color: #854d0e; }
                    .grade-d { background: #fee2e2; color: #991b1b; }
                    .grade-e { background: #fecaca; color: #7f1d1d; }
                    @media print { body { margin: 10px; } }
                </style></head><body>${printArea.innerHTML}</body></html>`);
                w.document.close();
                w.print();
            }
        }
    };

    const exportCSV = (headers: string[], rows: string[][], filename: string) => {
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Report exported ');
    };

    const gradeColor = (grade: string) => {
        if (grade.startsWith('A')) return 'bg-green-100 text-green-700';
        if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700';
        if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700';
        if (grade.startsWith('D')) return 'bg-orange-100 text-orange-700';
        return 'bg-red-100 text-red-700';
    };

    // ==================== RENDER TAB CONTENT ====================

    const renderMarkSheet = () => {
        const exam = exams.find(e => e.id === selExam);
        const examStudents = filteredStudents;
        const examSubjects = selSubject ? subjects.filter(s => s.id === selSubject) : subjects.filter(s => s.is_active !== false);

        return (
            <div className="space-y-4"><div className="flex flex-wrap gap-3"><select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select><select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select><select value={selExam} onChange={e => setSelExam(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[180px]"><option value="">Select Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select><select value={selSubject} onChange={e => setSelSubject(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[160px]"><option value={0}>All Subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                    </select></div><div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800"> Mark Sheet {exam ? ` ${exam.exam_name} (${exam.term} ${exam.year})` : ''}</h3><p className="text-xs text-gray-500 mt-1">{examStudents.length} students  {examSubjects.length} subjects</p></div><div className="overflow-x-auto"><table className="table-modern text-xs"><thead><tr><th className="sticky left-0 bg-gray-50 z-10">#</th><th className="sticky left-8 bg-gray-50 z-10">Adm No</th><th className="sticky left-24 bg-gray-50 z-10 min-w-[120px]">Student Name</th>{examSubjects.map(sub => (
                                        <th key={sub.id} className="text-center min-w-[60px]"><div className="text-[10px] font-bold">{sub.subject_code || sub.initials || sub.subject_name?.substring(0, 4)}</div></th>))}
                                    <th className="text-center bg-indigo-50 font-bold">Total</th><th className="text-center bg-indigo-50 font-bold">Mean</th><th className="text-center bg-indigo-50 font-bold">Grade</th><th className="text-center bg-indigo-50 font-bold">Rank</th></tr></thead><tbody>{examStudents.length === 0 ? (
                                    <tr><td colSpan={examSubjects.length + 7} className="text-center py-12 text-gray-400">Select form, stream, and exam to view mark sheet</td></tr>) : (
                                    (() => {
                                        const studentResults = examStudents.map(student => {
                                            const studentMarks = getStudentMarks(student.id, selExam);
                                            let total = 0, count = 0;
                                            const subjectScores: Record<number, { score: number; grade: string }> = {};
                                            examSubjects.forEach(sub => {
                                                const mark = studentMarks.find(m => m.subject_id === sub.id);
                                                if (mark?.score != null) {
                                                    subjectScores[sub.id] = { score: mark.score, grade: getGrade(mark.score).grade };
                                                    total += mark.score;
                                                    count++;
                                                }
                                            });
                                            const mean = count > 0 ? Math.round(total / count) : 0;
                                            return { student, subjectScores, total, mean, grade: getGrade(mean).grade, count };
                                        }).sort((a, b) => b.mean - a.mean);

                                        return studentResults.map((r, i) => (
                                            <tr key={r.student.id} className="hover:bg-gray-50/50"><td className="sticky left-0 bg-white text-gray-400">{i + 1}</td><td className="sticky left-8 bg-white font-semibold text-blue-600">{r.student.admission_number || '-'}</td><td className="sticky left-24 bg-white font-medium">{r.student.first_name} {r.student.last_name}</td>{examSubjects.map(sub => {
                                                    const s = r.subjectScores[sub.id];
                                                    return (
                                                        <td key={sub.id} className="text-center">{s ? (
                                                                <div><span className="font-semibold">{s.score}</span><span className={`block text-[9px] font-bold ${gradeColor(s.grade)} px-1 rounded mt-0.5`}>{s.grade}</span></div>) : <span className="text-gray-300">-</span>}
                                                        </td>);
                                                })}
                                                <td className="text-center font-bold bg-indigo-50/30">{r.total || '-'}</td><td className="text-center font-bold bg-indigo-50/30">{r.mean || '-'}</td><td className="text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${gradeColor(r.grade)}`}>{r.grade}</span></td><td className="text-center font-bold text-indigo-600">{r.count > 0 ? i + 1 : '-'}</td></tr>));
                                    })()
                                )}
                            </tbody>{examStudents.length > 0 && selExam !== '' && (
                                <tfoot><tr className="bg-gray-50 font-bold text-xs"><td colSpan={3} className="sticky left-0 bg-gray-50">Subject Mean</td>{(selSubject ? subjects.filter(s => s.id === selSubject) : subjects.filter(s => s.is_active !== false)).map(sub => (
                                            <td key={sub.id} className="text-center">{getSubjectAvg(sub.id, selExam) || '-'}</td>))}
                                        <td colSpan={4}></td></tr></tfoot>)}
                        </table></div></div></div>);
    };

    const renderSubjectAnalysis = () => {
        const examSubjects = subjects.filter(s => s.is_active !== false);
        return (
            <div className="space-y-4"><div className="flex flex-wrap gap-3"><select value={selExam} onChange={e => setSelExam(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[200px]"><option value="">Select Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select><select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select></div><div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800"> Subject Analysis Report</h3></div><div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>#</th><th>Code</th><th>Subject</th><th>Entries</th><th className="text-center">Mean</th><th className="text-center">Highest</th><th className="text-center">Lowest</th>{KCSE_GRADES.map(g => <th key={g.grade} className="text-center text-[10px]">{g.grade}</th>)}
                                    <th>Teacher</th></tr></thead><tbody>{selExam === '' ? (
                                    <tr><td colSpan={16} className="text-center py-12 text-gray-400">Select an exam to view subject analysis</td></tr>) : (
                                    examSubjects.map((sub, i) => {
                                        const subMarks = marks.filter(m => m.subject_id === sub.id && m.exam_id === selExam && m.score != null);
                                        if (selForm) {
                                            const formStudentIds = students.filter(s => s.form_id === selForm).map(s => s.id);
                                            const filtered = subMarks.filter(m => formStudentIds.includes(m.student_id));
                                            subMarks.length = 0;
                                            filtered.forEach(m => subMarks.push(m));
                                        }
                                        const scores = subMarks.map(m => m.score);
                                        const mean = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
                                        const highest = scores.length > 0 ? Math.max(...scores) : 0;
                                        const lowest = scores.length > 0 ? Math.min(...scores) : 0;
                                        const gradeDist: Record<string, number> = {};
                                        KCSE_GRADES.forEach(g => { gradeDist[g.grade] = 0; });
                                        scores.forEach((s: number) => { gradeDist[getGrade(s).grade]++; });

                                        const teacher = subjectTeachers.find(st => st.subject_id === sub.id);
                                        const teacherName = teacher ? `${teacher.school_teachers?.first_name || ''} ${teacher.school_teachers?.last_name || ''}`.trim() : '-';

                                        return (
                                            <tr key={sub.id} className="hover:bg-gray-50/50"><td className="text-gray-400 text-xs">{i + 1}</td><td><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs">{sub.subject_code || '-'}</span></td><td className="font-semibold">{sub.subject_name}</td><td className="font-medium">{scores.length}</td><td className="text-center"><span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${gradeColor(getGrade(mean).grade)}`}>{mean}</span></td><td className="text-center font-semibold text-green-600">{highest || '-'}</td><td className="text-center font-semibold text-red-600">{lowest || '-'}</td>{KCSE_GRADES.map(g => (
                                                    <td key={g.grade} className="text-center text-xs">{gradeDist[g.grade] || <span className="text-gray-200">0</span>}</td>))}
                                                <td className="text-xs">{teacherName}</td></tr>);
                                    })
                                )}
                            </tbody></table></div></div></div>);
    };

    const renderClassAnalysis = () => (
        <div className="space-y-4"><div className="flex flex-wrap gap-3"><select value={selExam} onChange={e => setSelExam(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[200px]"><option value="">Select Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                </select></div><div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800"> Class/Form Analysis Report</h3></div><div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>Form</th><th>Stream</th><th>Students</th><th>Mean Score</th><th>Mean Grade</th><th>Highest</th><th>Lowest</th>{KCSE_GRADES.slice(0, 6).map(g => <th key={g.grade} className="text-center text-xs">{g.grade}</th>)}
                            </tr></thead><tbody>{selExam === '' ? (
                                <tr><td colSpan={13} className="text-center py-12 text-gray-400">Select an exam to view class analysis</td></tr>) : (
                                forms.map(form => {
                                    const formStreams = streams.length > 0 ? streams : [{ id: 0, stream_name: 'All' }];
                                    return formStreams.map(stream => {
                                        let classStudents = students.filter(s => s.form_id === form.id && s.status === 'Active');
                                        if (stream.id) classStudents = classStudents.filter(s => s.stream_id === stream.id);

                                        const means = classStudents.map(st => {
                                            const studentMarks = marks.filter(m => m.student_id === st.id && m.exam_id === selExam && m.score != null);
                                            if (studentMarks.length === 0) return 0;
                                            return Math.round(studentMarks.reduce((a, m) => a + m.score, 0) / studentMarks.length);
                                        }).filter(m => m > 0);

                                        const classMean = means.length > 0 ? Math.round(means.reduce((a, b) => a + b, 0) / means.length) : 0;
                                        const highest = means.length > 0 ? Math.max(...means) : 0;
                                        const lowest = means.length > 0 ? Math.min(...means) : 0;
                                        const gradeDist: Record<string, number> = {};
                                        KCSE_GRADES.forEach(g => { gradeDist[g.grade] = 0; });
                                        means.forEach(m => { gradeDist[getGrade(m).grade]++; });

                                        return (
                                            <tr key={`${form.id}-${stream.id}`} className="hover:bg-gray-50/50"><td className="font-semibold">{form.form_name}</td><td>{stream.stream_name}</td><td className="font-medium">{classStudents.length}</td><td><span className={`font-bold px-2 py-0.5 rounded-lg ${gradeColor(getGrade(classMean).grade)}`}>{classMean || '-'}</span></td><td><span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${gradeColor(getGrade(classMean).grade)}`}>{classMean > 0 ? getGrade(classMean).grade : '-'}</span></td><td className="text-green-600 font-semibold">{highest || '-'}</td><td className="text-red-600 font-semibold">{lowest || '-'}</td>{KCSE_GRADES.slice(0, 6).map(g => (
                                                    <td key={g.grade} className="text-center text-xs">{gradeDist[g.grade] || 0}</td>))}
                                            </tr>);
                                    });
                                })
                            )}
                        </tbody></table></div></div></div>);

    const renderProgressiveReport = () => (
        <div className="space-y-4"><div className="flex flex-wrap gap-3"><select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select><select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select></div><div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800"> Student Progressive Report</h3><p className="text-xs text-gray-500 mt-1">Track student performance across multiple exams</p></div><div className="overflow-x-auto"><table className="table-modern text-xs"><thead><tr><th>#</th><th>Adm No</th><th>Student Name</th>{exams.slice(0, 6).map(ex => (
                                    <th key={ex.id} className="text-center min-w-[80px]"><div className="text-[10px]">{ex.exam_name}</div><div className="text-[9px] text-gray-400">{ex.term} {ex.year}</div></th>))}
                                <th className="text-center">Trend</th></tr></thead><tbody>{filteredStudents.length === 0 ? (
                                <tr><td colSpan={exams.length + 4} className="text-center py-12 text-gray-400">Select form to view progressive report</td></tr>) : (
                                filteredStudents.map((st, i) => {
                                    const examMeans = exams.slice(0, 6).map(ex => {
                                        const stMarks = marks.filter(m => m.student_id === st.id && m.exam_id === ex.id && m.score != null);
                                        if (stMarks.length === 0) return null;
                                        return Math.round(stMarks.reduce((a, m) => a + m.score, 0) / stMarks.length);
                                    });
                                    const validMeans = examMeans.filter((m): m is number => m !== null);
                                    const trend = validMeans.length >= 2 ? (validMeans[0]! >= validMeans[validMeans.length - 1]! ? '' : '') : '';

                                    return (
                                        <tr key={st.id} className="hover:bg-gray-50/50"><td className="text-gray-400">{i + 1}</td><td className="font-semibold text-blue-600">{st.admission_number || '-'}</td><td className="font-medium">{st.first_name} {st.last_name}</td>{examMeans.map((mean, j) => (
                                                <td key={j} className="text-center">{mean !== null ? (
                                                        <div><span className="font-semibold">{mean}</span><span className={`block text-[9px] font-bold ${gradeColor(getGrade(mean).grade)} px-1 rounded mt-0.5`}>{getGrade(mean).grade}</span></div>) : <span className="text-gray-300">-</span>}
                                                </td>))}
                                            <td className="text-center text-lg">{trend}</td></tr>);
                                })
                            )}
                        </tbody></table></div></div></div>);

    const renderReportCards = () => {
        const selectedExams = selExams.length > 0 ? exams.filter((e) => selExams.includes(e.id)) : (selExam ? [exams.find((e) => e.id === selExam)].filter(Boolean) : []);
        const reportStudents = selStudent ? filteredStudents.filter(s => s.id === selStudent) : filteredStudents;
        const genCode = (sid: number) => { let h = 0; const r = 'APSIMS'+sid+selExams.join('')+Date.now(); for (let i = 0; i < r.length; i++) { h = ((h << 5) - h) + r.charCodeAt(i); h |= 0; } return 'APS-'+Math.abs(h).toString(36).toUpperCase().slice(0,8); };
        const toggleExam = (eid: string) => setSelExams(prev => prev.includes(eid) ? prev.filter(x => x !== eid) : [...prev, eid]);

        const getProgress = (sid: number) => exams.slice(0,6).map((ex) => {
            const sm = marks.filter((m) => m.student_id === sid && m.exam_id === ex.id && m.score != null);
            return sm.length > 0 ? { name: ex.exam_name, term: ex.term, year: ex.year, mean: Math.round(sm.reduce((a, m) => a + m.score, 0) / sm.length) } : null;
        }).filter(Boolean).reverse() as {name:string;term:string;year:number;mean:number}[];

        const getOverallRank = (sid: number) => {
            const st = students.find((s) => s.id === sid);
            const classAll = students.filter((s) => s.form_id === st?.form_id && s.status === 'Active');
            const calcMean = (list: any[]) => list.map(s => {
                let total = 0, cnt = 0;
                selectedExams.forEach((ex) => {
                    const sm = marks.filter((m) => m.student_id === s.id && m.exam_id === ex.id && m.score != null);
                    sm.forEach((m) => { total += m.score; cnt++; });
                });
                return { id: s.id, mean: cnt > 0 ? total / cnt : 0 };
            }).sort((a, b) => b.mean - a.mean);
            const classRanked = calcMean(classAll);
            const cp = classRanked.findIndex(r => r.id === sid) + 1;
            return { rank: cp || '-', of: classAll.length };
        };

        return (
            <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FiBookOpen size={20} /> Comprehensive Report Card Generator</h3>
                    <p className="text-indigo-200 text-sm mt-1">Zeraki-style Kenyan report card | Select multiple exams for combined reports with individual + overall marks</p>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form *</label>
                        <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[130px]"><option value={0}>Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                        <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[130px]"><option value={0}>All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Student</label>
                        <select value={selStudent} onChange={e => setSelStudent(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]"><option value={0}>All Students (Bulk)</option>{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.first_name} {s.last_name}</option>)}</select></div>
                    {selForm > 0 && selectedExams.length > 0 && <button onClick={printReport} className="btn-primary flex items-center gap-2 text-sm h-[42px]"><FiPrinter size={14} /> Print ({reportStudents.length})</button>}
                </div>
                {/* Multi-Exam Checkboxes */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Select Exam(s) - tick multiple for combined report</p>
                    <div className="flex flex-wrap gap-2">{exams.map((ex) => (
                        <button key={ex.id} onClick={() => toggleExam(ex.id)} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' + (selExams.includes(ex.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>
                            {selExams.includes(ex.id) ? <FiCheckSquare size={13} /> : <FiSquare size={13} />} {ex.exam_name} ({ex.term} {ex.year})
                        </button>))}</div>
                    {selExams.length > 1 && <p className="text-xs text-indigo-600 mt-2 font-semibold"><FiTrendingUp className="inline mr-1" size={13} /> Combined report: each exam shown separately + Overall Mean + Overall Position</p>}
                </div>
                {selForm > 0 && selectedExams.length > 0 && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">{reportStudents.length} report card{reportStudents.length !== 1 ? 's' : ''} ready | {selectedExams.length} exam(s): {selectedExams.map((e) => e.exam_name).join(' + ')}</div>}

                {selForm > 0 && selectedExams.length > 0 && (
                    <div id="report-print-area">{reportStudents.map(student => {
                            const activeSubs = subjects.filter((s) => s.is_active !== false);
                            const examData = selectedExams.map((ex) => {
                                const sMarks = getStudentMarks(student.id, ex.id);
                                let total = 0, count = 0, totalPts = 0;
                                const subScores: Record<number, any> = {};
                                activeSubs.forEach(sub => {
                                    const mark = sMarks.find((m) => m.subject_id === sub.id);
                                    const score = mark?.score ?? null;
                                    if (score !== null) { const g = getGrade(score); subScores[sub.id] = { score, grade: g.grade, pts: g.pts }; total += score; count++; totalPts += g.pts; }
                                });
                                const mean = count > 0 ? Math.round(total / count) : 0;
                                return { ex, subScores, total, count, totalPts, mean, grade: getGrade(mean) };
                            });
                            let combTotal = 0, combCount = 0;
                            const combSubScores: Record<number, number> = {};
                            activeSubs.forEach(sub => {
                                let subTotal = 0, subN = 0;
                                examData.forEach(ed => { if (ed.subScores[sub.id]) { subTotal += ed.subScores[sub.id].score; subN++; } });
                                if (subN > 0) { combSubScores[sub.id] = Math.round(subTotal / subN); combTotal += combSubScores[sub.id]; combCount++; }
                            });
                            const combMean = combCount > 0 ? Math.round(combTotal / combCount) : 0;
                            const combGrade = getGrade(combMean);
                            const form = forms.find((f) => f.id === student.form_id);
                            const stream = streams.find((s) => s.id === student.stream_id);
                            const progress = getProgress(student.id);
                            const rank = getOverallRank(student.id);
                            const vCode = genCode(student.id);
                            const examLabel = selectedExams.map((e) => e.exam_name).join(' + ');
                            const qrData = encodeURIComponent('APSIMS|'+student.first_name+' '+student.last_name+'|'+student.admission_number+'|'+examLabel+'|Mean:'+combMean+'|Grade:'+combGrade.grade+'|'+vCode);
                            const gradeDist: Record<string, number> = {};
                            KCSE_GRADES.forEach(g => { gradeDist[g.grade] = 0; });
                            activeSubs.forEach(sub => { if (combSubScores[sub.id]) gradeDist[getGrade(combSubScores[sub.id]).grade]++; });

                            return (
                                <div key={student.id} className="bg-white border-2 border-gray-400 mb-8 text-[11px]" style={{ pageBreakAfter: 'always', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                                    {/* HEADER */}
                                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b-2 border-indigo-800">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-700"><img src="/school_logo.png" alt="Logo" className="w-full h-full object-cover" /></div>
                                        <div className="text-center flex-1 px-4">
                                            <h1 className="text-lg font-black text-indigo-900 uppercase tracking-wider">ALPHA SCHOOL</h1>
                                            <p className="text-[9px] text-gray-500">P.O. Box XXX, Town | Tel: 0720316175 | Email: info@alphaschool.co.ke</p>
                                            <p className="text-[9px] text-gray-400 italic">Motto: &quot;Excellence in Education&quot;</p>
                                            <div className="mt-1 bg-indigo-800 text-white font-bold px-4 py-1 rounded text-xs inline-block">{examLabel} REPORT - {selectedExams[0]?.term || 'Term'} {selectedExams[0]?.year || new Date().getFullYear()}</div>
                                        </div>
                                        <div className="text-right"><img src={'https://api.qrserver.com/v1/create-qr-code/?size=70x70&data='+qrData} alt="QR" className="w-14 h-14" /><p className="text-[6px] text-gray-400 mt-0.5 font-mono">{vCode}</p></div>
                                    </div>
                                    {/* STUDENT BIO */}
                                    <div className="grid grid-cols-6 gap-0 border-b border-gray-300 text-[10px]">
                                        <div className="col-span-2 px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Student Name: </span><span className="font-bold text-gray-800">{student.first_name} {student.middle_name || ''} {student.last_name}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Adm No: </span><span className="font-bold text-gray-800">{student.admission_number || '-'}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">KCPE: </span><span className="font-bold text-gray-800">{student.kcpe_marks || student.kcpe_index || '-'}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Form: </span><span className="font-bold text-gray-800">{form?.form_name || '-'}</span></div>
                                        <div className="px-3 py-1.5"><span className="text-gray-400">Stream: </span><span className="font-bold text-gray-800">{stream?.stream_name || '-'}</span></div>
                                    </div>
                                    {/* MARKS TABLE */}
                                    <table className="w-full border-collapse"><thead><tr className="bg-indigo-900 text-white text-[9px]">
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left w-6">#</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left">SUBJECT</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-10">CODE</th>
                                                {examData.map(ed => (<th key={ed.ex.id} className="border border-indigo-800 px-1 py-1 text-center w-16"><div className="text-[8px]">{ed.ex.exam_name}</div><div className="text-[7px] opacity-70">Score | Grd</div></th>))}
                                                {selectedExams.length > 1 && <th className="border border-indigo-800 px-1 py-1 text-center bg-indigo-700 w-12"><div className="text-[8px]">MEAN</div><div className="text-[7px]">Combined</div></th>}
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-8">GRD</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-8">PTS</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left">REMARKS</th>
                                            </tr></thead><tbody>{activeSubs.map((sub, idx) => {
                                            const combScore = combSubScores[sub.id] || null;
                                            const g = combScore !== null ? getGrade(combScore) : null;
                                            return (
                                            <tr key={sub.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-gray-400">{idx + 1}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 font-semibold">{sub.subject_name}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center text-indigo-600 font-bold text-[9px]">{sub.subject_code || '-'}</td>
                                                {examData.map(ed => { const s = ed.subScores[sub.id]; return (
                                                    <td key={ed.ex.id} className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">{s ? <span>{s.score} <span className={'font-bold text-[8px] '+gradeColor(s.grade)+' px-0.5 rounded'}>{s.grade}</span></span> : <span className="text-gray-300">-</span>}</td>
                                                );})}
                                                {selectedExams.length > 1 && <td className="border border-gray-300 px-1 py-0.5 text-center font-bold bg-indigo-50">{combScore ?? '-'}</td>}
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center"><span className={'font-bold text-[9px] px-1 rounded '+(g ? gradeColor(g.grade) : '')}>{g ? g.grade : '-'}</span></td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold">{g ? g.pts : '-'}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-[9px] text-gray-500">{combScore !== null ? (combScore >= 80 ? 'Excellent' : combScore >= 60 ? 'Good' : combScore >= 40 ? 'Average' : combScore >= 30 ? 'Below Avg' : 'Weak') : ''}</td>
                                            </tr>);
                                        })}</tbody><tfoot><tr className="bg-indigo-100 font-bold text-[10px]">
                                                <td colSpan={3} className="border border-gray-300 px-1.5 py-1">AGGREGATE</td>
                                                {examData.map(ed => (<td key={ed.ex.id} className="border border-gray-300 px-1 py-1 text-center text-[9px]">{ed.mean} ({ed.grade.grade})</td>))}
                                                {selectedExams.length > 1 && <td className="border border-gray-300 px-1 py-1 text-center bg-indigo-200 text-indigo-800">{combMean}</td>}
                                                <td className="border border-gray-300 px-1.5 py-1 text-center"><span className={'px-1 rounded '+gradeColor(combGrade.grade)}>{combGrade.grade}</span></td>
                                                <td className="border border-gray-300 px-1.5 py-1 text-center">{combGrade.pts}</td>
                                                <td className="border border-gray-300 px-1.5 py-1 text-indigo-700">Pos: {rank.rank}/{rank.of}</td>
                                            </tr></tfoot></table>
                                    {/* GRADE DISTRIBUTION + PROGRESS */}
                                    <div className="flex gap-0 border-y border-gray-300">
                                        <div className="flex-1 p-2 border-r border-gray-300"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Grade Distribution</p><div className="flex gap-0.5">{KCSE_GRADES.map(g => (
                                                    <div key={g.grade} className="flex-1 text-center"><div className="text-[7px] font-bold text-gray-500">{g.grade}</div><div className={'text-[9px] font-bold rounded py-0.5 '+(gradeDist[g.grade] > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-300')}>{gradeDist[g.grade]}</div></div>))}</div></div>
                                        <div className="w-64 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Performance Trend</p>{progress.length > 0 ? (
                                                <div className="flex items-end gap-1 h-14">{progress.map((p, i) => {
                                                        const h = Math.max(8, (p.mean / 100) * 100);
                                                        const clr = p.mean >= 60 ? '#059669' : p.mean >= 40 ? '#d97706' : '#dc2626';
                                                        return (<div key={i} className="flex-1 flex flex-col items-center"><span className="text-[7px] font-bold" style={{ color: clr }}>{p.mean}</span><div className="w-full rounded-t" style={{ height: h+'%', background: clr, minHeight: 4 }} /><span className="text-[6px] text-gray-400 mt-0.5">{p.term}</span></div>);
                                                    })}</div>) : <p className="text-[8px] text-gray-400 h-14 flex items-center">No history</p>}
                                        </div>
                                    </div>
                                    {/* CONDUCT & ACTIVITIES */}
                                    <div className="grid grid-cols-2 gap-0 border-b border-gray-300"><div className="border-r border-gray-300 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Conduct &amp; Behavior</p><div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">{['Discipline', 'Punctuality', 'Neatness', 'Respect', 'Effort', 'Attitude'].map(item => (
                                                    <div key={item} className="flex justify-between"><span className="text-gray-500">{item}:</span><span className="font-semibold text-gray-400">____</span></div>))}</div></div>
                                        <div className="p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Co-Curricular Activities &amp; Clubs</p><div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">{['Sports', 'Music/Drama', 'Clubs/Societies', 'Leadership'].map(item => (
                                                    <div key={item} className="flex justify-between"><span className="text-gray-500">{item}:</span><span className="font-semibold text-gray-400">____</span></div>))}</div>
                                            <div className="mt-1 flex gap-4 text-[9px]"><div><span className="text-gray-500">Days Present:</span> <span className="font-bold">___</span></div><div><span className="text-gray-500">Days Absent:</span> <span className="font-bold">___</span></div><div><span className="text-gray-500">Total Days:</span> <span className="font-bold">___</span></div></div></div></div>
                                    {/* REMARKS & SIGNATURES */}
                                    <div className="border-b border-gray-300 p-2"><div className="grid grid-cols-2 gap-4"><div><p className="text-[8px] font-bold text-gray-600 uppercase">Class Teacher&apos;s Remarks</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="border-b border-dotted border-gray-300 h-3"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> <span className="font-bold">_____________________</span></div><div><span className="text-gray-500">Sign:</span> ____________ <span className="text-gray-500 ml-2">Date:</span> ___/___/____</div></div></div>
                                            <div><p className="text-[8px] font-bold text-gray-600 uppercase">Principal&apos;s Remarks</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="border-b border-dotted border-gray-300 h-3"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> <span className="font-bold">_____________________</span></div><div><span className="text-gray-500">Sign &amp; Stamp:</span> ____________</div></div></div></div></div>
                                    {/* PARENT + FEES */}
                                    <div className="grid grid-cols-2 gap-0 border-b border-gray-300"><div className="border-r border-gray-300 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase">Parent / Guardian&apos;s Comments</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> ___________________</div><div><span className="text-gray-500">Sign:</span> ____________ <span className="text-gray-500 ml-2">Date:</span> ___/___/____</div></div></div>
                                        <div className="p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Fee Statement</p><div className="grid grid-cols-4 gap-1 text-[9px]"><div className="bg-red-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Arrears</p><p className="font-bold text-red-600">KSh ______</p></div><div className="bg-blue-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Next Term</p><p className="font-bold text-blue-600">KSh ______</p></div><div className="bg-amber-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Total Due</p><p className="font-bold text-amber-700">KSh ______</p></div><div className="bg-green-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Opens</p><p className="font-bold text-green-700">__/__/____</p></div></div></div></div>
                                    {/* FOOTER */}
                                    <div className="px-5 py-1.5 bg-gray-50 text-center text-[7px] text-gray-400 flex justify-between items-center"><span>APSIMS - Alpha Plus School Information Management System</span><span>Verified: {vCode} | {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>This is a computer-generated document</span></div>
                                </div>
                            );
                        })}
                    </div>)}

                {(!selForm || selectedExams.length === 0) && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400"><FiBookOpen size={48} className="mx-auto mb-3 text-indigo-300" /><p className="font-medium text-gray-600">Select a Form and tick exam(s) to generate comprehensive report cards</p><p className="text-sm mt-1">Zeraki-style layout with marks, grade distribution, progress chart, conduct, fees &amp; QR verification</p><p className="text-xs mt-2 text-indigo-500 font-semibold">TIP: Select multiple exams (e.g. CAT 1 + CAT 2) for combined report with individual marks and overall mean</p></div>)}
            </div>);
    };


    const renderMeritList = () => {
        const examStudents = filteredStudents;
        return (
            <div className="space-y-4"><div className="flex flex-wrap gap-3"><select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select><select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]"><option value={0}>All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select><select value={selExam} onChange={e => setSelExam(e.target.value)} className="select-modern text-sm px-3 py-2.5 min-w-[200px]"><option value="">Select Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select></div><div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800"> Merit List  Ranked Student Performance</h3></div><div className="overflow-x-auto"><table className="table-modern"><thead><tr><th>Rank</th><th>Adm No</th><th>Student Name</th><th>Form</th><th>Stream</th><th className="text-center">Total</th><th className="text-center">Mean</th><th className="text-center">Grade</th><th className="text-center">Points</th></tr></thead><tbody>{selExam === '' ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">Select an exam to view merit list</td></tr>) : (
                                    (() => {
                                        const results = examStudents.map(st => {
                                            const stMarks = marks.filter(m => m.student_id === st.id && m.exam_id === selExam && m.score != null);
                                            const total = stMarks.reduce((a, m) => a + m.score, 0);
                                            const mean = stMarks.length > 0 ? Math.round(total / stMarks.length) : 0;
                                            const form = forms.find(f => f.id === st.form_id);
                                            const stream = streams.find(s => s.id === st.stream_id);
                                            return { st, total, mean, grade: getGrade(mean), form, stream, count: stMarks.length };
                                        }).filter(r => r.count > 0).sort((a, b) => b.mean - a.mean);

                                        return results.map((r, i) => (
                                            <tr key={r.st.id} className={`hover:bg-gray-50/50 ${i < 3 ? 'bg-yellow-50/30' : ''}`}><td className="font-bold text-lg">{i < 3 ? ['', '', ''][i] : i + 1}</td><td className="font-semibold text-blue-600">{r.st.admission_number}</td><td className="font-medium">{r.st.first_name} {r.st.last_name}</td><td>{r.form?.form_name || '-'}</td><td>{r.stream?.stream_name || '-'}</td><td className="text-center font-bold">{r.total}</td><td className="text-center font-bold">{r.mean}</td><td className="text-center"><span className={`font-bold px-2 py-0.5 rounded-lg ${gradeColor(r.grade.grade)}`}>{r.grade.grade}</span></td><td className="text-center font-semibold">{r.grade.pts}</td></tr>));
                                    })()
                                )}
                            </tbody></table></div></div></div>);
    };

    const renderFeeReports = () => (
        <div className="space-y-4"><div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700"><p className="font-semibold"> Fee Reports</p><p className="text-xs mt-1">Fee collection summaries, balance statements, and defaulter lists. Data is loaded from the Fees & Accounts module.</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[
                    { title: 'Fee Collection Summary', desc: 'Total fees collected per term, form, and stream', emoji: '', href: '/dashboard/fees' },
                    { title: 'Fee Balance Report', desc: 'Outstanding balances per student', emoji: '', href: '/dashboard/fees' },
                    { title: 'Fee Defaulters List', desc: 'Students with overdue fees', emoji: '', href: '/dashboard/fees' },
                ].map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = r.href}><span className="text-3xl">{r.emoji}</span><h4 className="font-bold text-gray-800 mt-3">{r.title}</h4><p className="text-xs text-gray-500 mt-1">{r.desc}</p></div>))}
            </div></div>);

    const renderAttendanceReport = () => (
        <div className="space-y-4"><div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700"><p className="font-semibold"> Attendance Reports</p><p className="text-xs mt-1">Summary of student attendance per term, form, and stream.</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[
                    { title: 'Daily Attendance', desc: 'View daily attendance records per class', emoji: '', href: '/dashboard/attendance' },
                    { title: 'Term Attendance Summary', desc: 'Percentage attendance per student per term', emoji: '', href: '/dashboard/attendance' },
                    { title: 'Absentee Report', desc: 'Students with high absenteeism', emoji: '', href: '/dashboard/attendance' },
                ].map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = r.href}><span className="text-3xl">{r.emoji}</span><h4 className="font-bold text-gray-800 mt-3">{r.title}</h4><p className="text-xs text-gray-500 mt-1">{r.desc}</p></div>))}
            </div></div>);

    const tabContent: Record<ReportTab, () => JSX.Element> = {
        'marksheet': renderMarkSheet,
        'subject-analysis': renderSubjectAnalysis,
        'class-analysis': renderClassAnalysis,
        'progressive': renderProgressiveReport,
        'report-card': renderReportCards,
        'merit-list': renderMeritList,
        'fee-reports': renderFeeReports,
        'attendance-report': renderAttendanceReport,
    };

    return (
        <div className="space-y-5 animate-fade-in">{/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"> Reports Center</h1><p className="text-sm text-gray-500 mt-1">Academic, financial, and administrative reports</p></div><div className="flex gap-2"><button onClick={printReport} className="btn-outline flex items-center gap-1.5 text-sm"><FiPrinter size={14} /> Print</button><button onClick={() => {
                        const tab = REPORT_TABS.find(t => t.key === activeTab);
                        exportCSV(['Report'], [[`${tab?.label}  Generated ${new Date().toLocaleString()}`]], `APSIMS_${activeTab}`);
                    }} className="btn-outline flex items-center gap-1.5 text-sm"><FiDownload size={14} /> Export</button></div></div>{/* Report Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">{REPORT_TABS.map(tab => { const Icon = TAB_ICONS[tab.icon]; return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.key
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}>{Icon && <Icon size={15} />}<span>{tab.label}</span></button>);})}

            </div>{/* Active Tab Content */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>) : (
                tabContent[activeTab]()
            )}
        </div>);
}

export default function ReportsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>}><ReportsContent /></Suspense>);
}

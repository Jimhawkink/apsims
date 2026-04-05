'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiPrinter, FiSearch, FiFilter } from 'react-icons/fi';

type ReportTab = 'marksheet' | 'subject-analysis' | 'class-analysis' | 'progressive' | 'report-card' | 'merit-list' | 'fee-reports' | 'attendance-report';

const REPORT_TABS: { key: ReportTab; label: string; emoji: string; desc: string }[] = [
    { key: 'marksheet', label: 'Mark Sheet', emoji: '📋', desc: 'Subject mark entry sheets per class' },
    { key: 'subject-analysis', label: 'Subject Analysis', emoji: '📈', desc: 'Performance breakdown by subject' },
    { key: 'class-analysis', label: 'Class/Form Analysis', emoji: '🏫', desc: 'Class & form-level performance' },
    { key: 'progressive', label: 'Progressive Report', emoji: '📊', desc: 'Student progress across terms' },
    { key: 'report-card', label: 'Report Cards', emoji: '🎓', desc: 'End of term student reports' },
    { key: 'merit-list', label: 'Merit List', emoji: '🏆', desc: 'Ranked student performance' },
    { key: 'fee-reports', label: 'Fee Reports', emoji: '💰', desc: 'Fee collection & balance reports' },
    { key: 'attendance-report', label: 'Attendance Report', emoji: '📅', desc: 'Student attendance summaries' },
];

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

    // Filters
    const [selForm, setSelForm] = useState(0);
    const [selStream, setSelStream] = useState(0);
    const [selExam, setSelExam] = useState(0);
    const [selSubject, setSelSubject] = useState(0);
    const [selTerm, setSelTerm] = useState('');
    const [selYear, setSelYear] = useState(new Date().getFullYear());
    const [selStudent, setSelStudent] = useState(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (tabParam) setActiveTab(tabParam);
    }, [tabParam]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, sRes, subRes, stRes, exRes, mRes, tRes, stRes2] = await Promise.all([
            supabase.from('school_forms').select('*').eq('is_active', true).order('form_level'),
            supabase.from('school_streams').select('*').eq('is_active', true).order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_exams').select('*').order('id', { ascending: false }),
            supabase.from('school_marks').select('*'),
            supabase.from('school_teachers').select('*').eq('status', 'Active'),
            supabase.from('school_subject_teachers').select('*, school_subjects(subject_name, subject_code), school_teachers(first_name, last_name)'),
        ]);
        setForms(fRes.data || []);
        setStreams(sRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(stRes.data || []);
        setExams(exRes.data || []);
        setMarks(mRes.data || []);
        setTeachers(tRes.data || []);
        setSubjectTeachers(stRes2.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Helpers
    const filteredStudents = students.filter(s => {
        if (selForm && s.form_id !== selForm) return false;
        if (selStream && s.stream_id !== selStream) return false;
        if (search && !`${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
        return s.status === 'Active';
    });

    const getStudentMarks = (studentId: number, examId: number) => marks.filter(m => m.student_id === studentId && m.exam_id === examId);
    const getSubjectAvg = (subjectId: number, examId: number) => {
        const subMarks = marks.filter(m => m.subject_id === subjectId && m.exam_id === examId && m.score != null);
        if (subMarks.length === 0) return 0;
        return Math.round(subMarks.reduce((sum, m) => sum + m.score, 0) / subMarks.length);
    };

    const printReport = () => {
        const printArea = document.getElementById('report-print-area');
        if (printArea) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write(`<html><head><title>APSIMS Report</title><style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1a1a1a; }
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
        toast.success('Report exported ✅');
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
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                        <option value={0}>All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                        <option value={0}>All Streams</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select>
                    <select value={selExam} onChange={e => setSelExam(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[180px]">
                        <option value={0}>Select Exam</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select>
                    <select value={selSubject} onChange={e => setSelSubject(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[160px]">
                        <option value={0}>All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                    </select>
                </div>

                <div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">📋 Mark Sheet {exam ? `— ${exam.exam_name} (${exam.term} ${exam.year})` : ''}</h3>
                        <p className="text-xs text-gray-500 mt-1">{examStudents.length} students • {examSubjects.length} subjects</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern text-xs">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 bg-gray-50 z-10">#</th>
                                    <th className="sticky left-8 bg-gray-50 z-10">Adm No</th>
                                    <th className="sticky left-24 bg-gray-50 z-10 min-w-[120px]">Student Name</th>
                                    {examSubjects.map(sub => (
                                        <th key={sub.id} className="text-center min-w-[60px]">
                                            <div className="text-[10px] font-bold">{sub.subject_code || sub.initials || sub.subject_name?.substring(0, 4)}</div>
                                        </th>
                                    ))}
                                    <th className="text-center bg-indigo-50 font-bold">Total</th>
                                    <th className="text-center bg-indigo-50 font-bold">Mean</th>
                                    <th className="text-center bg-indigo-50 font-bold">Grade</th>
                                    <th className="text-center bg-indigo-50 font-bold">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examStudents.length === 0 ? (
                                    <tr><td colSpan={examSubjects.length + 7} className="text-center py-12 text-gray-400">Select form, stream, and exam to view mark sheet</td></tr>
                                ) : (
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
                                            <tr key={r.student.id} className="hover:bg-gray-50/50">
                                                <td className="sticky left-0 bg-white text-gray-400">{i + 1}</td>
                                                <td className="sticky left-8 bg-white font-semibold text-blue-600">{r.student.admission_number || '-'}</td>
                                                <td className="sticky left-24 bg-white font-medium">{r.student.first_name} {r.student.last_name}</td>
                                                {examSubjects.map(sub => {
                                                    const s = r.subjectScores[sub.id];
                                                    return (
                                                        <td key={sub.id} className="text-center">
                                                            {s ? (
                                                                <div>
                                                                    <span className="font-semibold">{s.score}</span>
                                                                    <span className={`block text-[9px] font-bold ${gradeColor(s.grade)} px-1 rounded mt-0.5`}>{s.grade}</span>
                                                                </div>
                                                            ) : <span className="text-gray-300">-</span>}
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-center font-bold bg-indigo-50/30">{r.total || '-'}</td>
                                                <td className="text-center font-bold bg-indigo-50/30">{r.mean || '-'}</td>
                                                <td className="text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                                                <td className="text-center font-bold text-indigo-600">{r.count > 0 ? i + 1 : '-'}</td>
                                            </tr>
                                        ));
                                    })()
                                )}
                            </tbody>
                            {examStudents.length > 0 && selExam > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-50 font-bold text-xs">
                                        <td colSpan={3} className="sticky left-0 bg-gray-50">Subject Mean</td>
                                        {(selSubject ? subjects.filter(s => s.id === selSubject) : subjects.filter(s => s.is_active !== false)).map(sub => (
                                            <td key={sub.id} className="text-center">{getSubjectAvg(sub.id, selExam) || '-'}</td>
                                        ))}
                                        <td colSpan={4}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderSubjectAnalysis = () => {
        const examSubjects = subjects.filter(s => s.is_active !== false);
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    <select value={selExam} onChange={e => setSelExam(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]">
                        <option value={0}>Select Exam</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select>
                    <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                        <option value={0}>All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                </div>
                <div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">📈 Subject Analysis Report</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>#</th><th>Code</th><th>Subject</th><th>Entries</th>
                                    <th className="text-center">Mean</th><th className="text-center">Highest</th><th className="text-center">Lowest</th>
                                    {KCSE_GRADES.map(g => <th key={g.grade} className="text-center text-[10px]">{g.grade}</th>)}
                                    <th>Teacher</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selExam === 0 ? (
                                    <tr><td colSpan={16} className="text-center py-12 text-gray-400">Select an exam to view subject analysis</td></tr>
                                ) : (
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
                                            <tr key={sub.id} className="hover:bg-gray-50/50">
                                                <td className="text-gray-400 text-xs">{i + 1}</td>
                                                <td><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs">{sub.subject_code || '-'}</span></td>
                                                <td className="font-semibold">{sub.subject_name}</td>
                                                <td className="font-medium">{scores.length}</td>
                                                <td className="text-center"><span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${gradeColor(getGrade(mean).grade)}`}>{mean}</span></td>
                                                <td className="text-center font-semibold text-green-600">{highest || '-'}</td>
                                                <td className="text-center font-semibold text-red-600">{lowest || '-'}</td>
                                                {KCSE_GRADES.map(g => (
                                                    <td key={g.grade} className="text-center text-xs">{gradeDist[g.grade] || <span className="text-gray-200">0</span>}</td>
                                                ))}
                                                <td className="text-xs">{teacherName}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderClassAnalysis = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <select value={selExam} onChange={e => setSelExam(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]">
                    <option value={0}>Select Exam</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                </select>
            </div>
            <div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">🏫 Class/Form Analysis Report</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-modern">
                        <thead>
                            <tr><th>Form</th><th>Stream</th><th>Students</th><th>Mean Score</th><th>Mean Grade</th><th>Highest</th><th>Lowest</th>
                                {KCSE_GRADES.slice(0, 6).map(g => <th key={g.grade} className="text-center text-xs">{g.grade}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {selExam === 0 ? (
                                <tr><td colSpan={13} className="text-center py-12 text-gray-400">Select an exam to view class analysis</td></tr>
                            ) : (
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
                                            <tr key={`${form.id}-${stream.id}`} className="hover:bg-gray-50/50">
                                                <td className="font-semibold">{form.form_name}</td>
                                                <td>{stream.stream_name}</td>
                                                <td className="font-medium">{classStudents.length}</td>
                                                <td><span className={`font-bold px-2 py-0.5 rounded-lg ${gradeColor(getGrade(classMean).grade)}`}>{classMean || '-'}</span></td>
                                                <td><span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${gradeColor(getGrade(classMean).grade)}`}>{classMean > 0 ? getGrade(classMean).grade : '-'}</span></td>
                                                <td className="text-green-600 font-semibold">{highest || '-'}</td>
                                                <td className="text-red-600 font-semibold">{lowest || '-'}</td>
                                                {KCSE_GRADES.slice(0, 6).map(g => (
                                                    <td key={g.grade} className="text-center text-xs">{gradeDist[g.grade] || 0}</td>
                                                ))}
                                            </tr>
                                        );
                                    });
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderProgressiveReport = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                    <option value={0}>Select Form</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                    <option value={0}>All Streams</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
            </div>
            <div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">📊 Student Progressive Report</h3>
                    <p className="text-xs text-gray-500 mt-1">Track student performance across multiple exams</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-modern text-xs">
                        <thead>
                            <tr>
                                <th>#</th><th>Adm No</th><th>Student Name</th>
                                {exams.slice(0, 6).map(ex => (
                                    <th key={ex.id} className="text-center min-w-[80px]">
                                        <div className="text-[10px]">{ex.exam_name}</div>
                                        <div className="text-[9px] text-gray-400">{ex.term} {ex.year}</div>
                                    </th>
                                ))}
                                <th className="text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr><td colSpan={exams.length + 4} className="text-center py-12 text-gray-400">Select form to view progressive report</td></tr>
                            ) : (
                                filteredStudents.map((st, i) => {
                                    const examMeans = exams.slice(0, 6).map(ex => {
                                        const stMarks = marks.filter(m => m.student_id === st.id && m.exam_id === ex.id && m.score != null);
                                        if (stMarks.length === 0) return null;
                                        return Math.round(stMarks.reduce((a, m) => a + m.score, 0) / stMarks.length);
                                    });
                                    const validMeans = examMeans.filter((m): m is number => m !== null);
                                    const trend = validMeans.length >= 2 ? (validMeans[0]! >= validMeans[validMeans.length - 1]! ? '📈' : '📉') : '➡️';

                                    return (
                                        <tr key={st.id} className="hover:bg-gray-50/50">
                                            <td className="text-gray-400">{i + 1}</td>
                                            <td className="font-semibold text-blue-600">{st.admission_number || '-'}</td>
                                            <td className="font-medium">{st.first_name} {st.last_name}</td>
                                            {examMeans.map((mean, j) => (
                                                <td key={j} className="text-center">
                                                    {mean !== null ? (
                                                        <div>
                                                            <span className="font-semibold">{mean}</span>
                                                            <span className={`block text-[9px] font-bold ${gradeColor(getGrade(mean).grade)} px-1 rounded mt-0.5`}>{getGrade(mean).grade}</span>
                                                        </div>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                            ))}
                                            <td className="text-center text-lg">{trend}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderReportCards = () => (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <h3 className="font-bold text-lg">🎓 End of Term Report Card Generator</h3>
                <p className="text-indigo-200 text-sm mt-1">Generate and print individual student report cards for closing day</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                    <option value={0}>Select Form</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                    <option value={0}>All Streams</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
                <select value={selExam} onChange={e => setSelExam(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]">
                    <option value={0}>Select Exam</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                </select>
                <select value={selStudent} onChange={e => setSelStudent(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]">
                    <option value={0}>All Students (Bulk Print)</option>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.admission_number} — {s.first_name} {s.last_name}</option>)}
                </select>
            </div>

            {selExam > 0 && selForm > 0 && (
                <div id="report-print-area">
                    {(selStudent ? filteredStudents.filter(s => s.id === selStudent) : filteredStudents).map(student => {
                        const exam = exams.find(e => e.id === selExam);
                        const studentMarks = getStudentMarks(student.id, selExam);
                        const activeSubjects = subjects.filter(s => s.is_active !== false);
                        let total = 0, count = 0;
                        const rows = activeSubjects.map(sub => {
                            const mark = studentMarks.find(m => m.subject_id === sub.id);
                            const score = mark?.score ?? null;
                            const g = score !== null ? getGrade(score) : null;
                            if (score !== null) { total += score; count++; }
                            const teacher = subjectTeachers.find(st => st.subject_id === sub.id);
                            return { sub, score, grade: g?.grade || '-', pts: g?.pts || 0, initials: teacher?.teacher_initials || '-' };
                        }).filter(r => r.score !== null);
                        const mean = count > 0 ? Math.round(total / count) : 0;
                        const form = forms.find(f => f.id === student.form_id);
                        const stream = streams.find(s => s.id === student.stream_id);

                        return (
                            <div key={student.id} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6" style={{ pageBreakAfter: 'always' }}>
                                {/* Report Card Header */}
                                <div className="text-center border-b-2 border-indigo-600 pb-4 mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">Alpha School</h2>
                                    <p className="text-xs text-gray-500">P.O. Box XXX — Tel: 0720316175</p>
                                    <div className="mt-2 inline-block bg-indigo-600 text-white font-bold px-4 py-1 rounded-lg text-sm">
                                        {exam?.exam_name || 'End of Term'} Report — {exam?.term} {exam?.year}
                                    </div>
                                </div>
                                {/* Student Info */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                                    <div><span className="text-gray-500 text-xs">Student:</span> <span className="font-bold">{student.first_name} {student.last_name}</span></div>
                                    <div><span className="text-gray-500 text-xs">Adm No:</span> <span className="font-bold text-blue-600">{student.admission_number}</span></div>
                                    <div><span className="text-gray-500 text-xs">Form:</span> <span className="font-bold">{form?.form_name || '-'}</span></div>
                                    <div><span className="text-gray-500 text-xs">Stream:</span> <span className="font-bold">{stream?.stream_name || '-'}</span></div>
                                </div>
                                {/* Marks Table */}
                                <table className="w-full text-sm border-collapse mb-4">
                                    <thead>
                                        <tr className="bg-indigo-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left">Subject</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center">Code</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center">Score /100</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center">Grade</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center">Points</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center">Teacher</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(r => (
                                            <tr key={r.sub.id} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-1.5 font-medium">{r.sub.subject_name}</td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-center text-xs text-indigo-600 font-bold">{r.sub.subject_code || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-center font-bold">{r.score}</td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-center"><span className={`font-bold px-2 py-0.5 rounded ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-center font-semibold">{r.pts}</td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-center font-mono text-xs">{r.initials}</td>
                                                <td className="border border-gray-300 px-3 py-1.5 text-xs text-gray-500">{r.score !== null && r.score >= 80 ? 'Excellent' : r.score !== null && r.score >= 60 ? 'Good' : r.score !== null && r.score >= 40 ? 'Fair' : 'Needs Improvement'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-indigo-50 font-bold">
                                            <td className="border border-gray-300 px-3 py-2">TOTAL / MEAN</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{count} subj(s)</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{total}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded ${gradeColor(getGrade(mean).grade)}`}>{getGrade(mean).grade}</span></td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{mean}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                {/* Footer */}
                                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-6">Class Teacher&apos;s Remarks:</p>
                                        <div className="border-b border-gray-400 mt-8"></div>
                                        <p className="text-[10px] text-gray-400 mt-1">Signature & Date</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-6">Principal&apos;s Remarks:</p>
                                        <div className="border-b border-gray-400 mt-8"></div>
                                        <p className="text-[10px] text-gray-400 mt-1">Signature & Stamp</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-6">Opening Date:</p>
                                        <p className="text-gray-500 text-xs">Fees Balance: <span className="font-bold text-red-600">KSh ______</span></p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {(!selExam || !selForm) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                    <span className="text-5xl block mb-3">🎓</span>
                    <p className="font-medium">Select Form and Exam to generate report cards</p>
                    <p className="text-sm mt-1">You can bulk-print all students or select a specific student</p>
                </div>
            )}
        </div>
    );

    const renderMeritList = () => {
        const examStudents = filteredStudents;
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                        <option value={0}>All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[140px]">
                        <option value={0}>All Streams</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select>
                    <select value={selExam} onChange={e => setSelExam(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]">
                        <option value={0}>Select Exam</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
                    </select>
                </div>
                <div id="report-print-area" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">🏆 Merit List — Ranked Student Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr><th>Rank</th><th>Adm No</th><th>Student Name</th><th>Form</th><th>Stream</th><th className="text-center">Total</th><th className="text-center">Mean</th><th className="text-center">Grade</th><th className="text-center">Points</th></tr>
                            </thead>
                            <tbody>
                                {selExam === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">Select an exam to view merit list</td></tr>
                                ) : (
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
                                            <tr key={r.st.id} className={`hover:bg-gray-50/50 ${i < 3 ? 'bg-yellow-50/30' : ''}`}>
                                                <td className="font-bold text-lg">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                                                <td className="font-semibold text-blue-600">{r.st.admission_number}</td>
                                                <td className="font-medium">{r.st.first_name} {r.st.last_name}</td>
                                                <td>{r.form?.form_name || '-'}</td>
                                                <td>{r.stream?.stream_name || '-'}</td>
                                                <td className="text-center font-bold">{r.total}</td>
                                                <td className="text-center font-bold">{r.mean}</td>
                                                <td className="text-center"><span className={`font-bold px-2 py-0.5 rounded-lg ${gradeColor(r.grade.grade)}`}>{r.grade.grade}</span></td>
                                                <td className="text-center font-semibold">{r.grade.pts}</td>
                                            </tr>
                                        ));
                                    })()
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderFeeReports = () => (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700">
                <p className="font-semibold">💰 Fee Reports</p>
                <p className="text-xs mt-1">Fee collection summaries, balance statements, and defaulter lists. Data is loaded from the Fees & Accounts module.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { title: 'Fee Collection Summary', desc: 'Total fees collected per term, form, and stream', emoji: '💵', href: '/dashboard/fees' },
                    { title: 'Fee Balance Report', desc: 'Outstanding balances per student', emoji: '📋', href: '/dashboard/fees' },
                    { title: 'Fee Defaulters List', desc: 'Students with overdue fees', emoji: '⚠️', href: '/dashboard/fees' },
                ].map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = r.href}>
                        <span className="text-3xl">{r.emoji}</span>
                        <h4 className="font-bold text-gray-800 mt-3">{r.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAttendanceReport = () => (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700">
                <p className="font-semibold">📅 Attendance Reports</p>
                <p className="text-xs mt-1">Summary of student attendance per term, form, and stream.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { title: 'Daily Attendance', desc: 'View daily attendance records per class', emoji: '📋', href: '/dashboard/attendance' },
                    { title: 'Term Attendance Summary', desc: 'Percentage attendance per student per term', emoji: '📊', href: '/dashboard/attendance' },
                    { title: 'Absentee Report', desc: 'Students with high absenteeism', emoji: '🚫', href: '/dashboard/attendance' },
                ].map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = r.href}>
                        <span className="text-3xl">{r.emoji}</span>
                        <h4 className="font-bold text-gray-800 mt-3">{r.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );

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
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📊 Reports Center</h1>
                    <p className="text-sm text-gray-500 mt-1">Academic, financial, and administrative reports</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={printReport} className="btn-outline flex items-center gap-1.5 text-sm"><FiPrinter size={14} /> Print</button>
                    <button onClick={() => {
                        const tab = REPORT_TABS.find(t => t.key === activeTab);
                        exportCSV(['Report'], [[`${tab?.label} — Generated ${new Date().toLocaleString()}`]], `APSIMS_${activeTab}`);
                    }} className="btn-outline flex items-center gap-1.5 text-sm"><FiDownload size={14} /> Export</button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {REPORT_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.key
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}>
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Active Tab Content */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                tabContent[activeTab]()
            )}
        </div>
    );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>}>
            <ReportsContent />
        </Suspense>
    );
}

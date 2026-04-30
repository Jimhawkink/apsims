'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPrinter, FiDownload, FiFileText, FiImage, FiCheckCircle, FiSend, FiSettings, FiEye, FiZap } from 'react-icons/fi';

interface Layout {
    id: number; layout_name: string; layout_code: string; description: string; config: any; is_default: boolean;
}
interface Student { id: number; first_name: string; last_name: string; other_name?: string; admission_number: string; form_id: number; stream_id?: number; photo_url?: string; gender: string; guardian_name?: string; guardian_phone?: string; }
interface Mark { id: number; student_id: number; subject_id: number; exam_type_id: number; score: number; term_id: number; combined_score?: number; combined_grade?: string; class_position?: number; stream_position?: number; }
interface Subject { id: number; subject_name: string; subject_code?: string; initials?: string; category: string; }
interface ExamType { id: number; exam_name: string; exam_code: string; weight: number; max_score: number; term_id?: number; }
interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

const LAYOUT_PRESETS = [
    { code: 'standard_ke', name: 'Standard Kenya', icon: '🇰🇪', desc: 'All component exams inline, positions, remarks' },
    { code: 'compact', name: 'Compact', icon: '📋', desc: 'Combined scores only, no breakdown' },
    { code: 'detailed_cbc', name: 'Detailed CBC', icon: '📚', desc: 'Strands, rubrics, competency tracking' },
    { code: 'parent_friendly', name: 'Parent Friendly', icon: '👨‍👩‍👧', desc: 'Simplified — grades, remarks, fees' },
    { code: 'kcse_prediction', name: 'KCSE Prediction', icon: '🎯', desc: 'Includes predicted KCSE grades' },
    { code: 'multi_term', name: 'Multi-Term Comparison', icon: '📊', desc: 'Current vs previous term side by side' },
    { code: 'official_transcript', name: 'Official Transcript', icon: '🎓', desc: 'Formal layout for university applications' },
];

export default function UltraReportCardsPage() {
    const [layouts, setLayouts] = useState<Layout[]>([]);
    const [selLayout, setSelLayout] = useState('standard_ke');
    const [students, setStudents] = useState<Student[]>([]);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [examTypes, setExamTypes] = useState<ExamType[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selStudent, setSelStudent] = useState('');
    const [loading, setLoading] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [lRes, sRes, mRes, subRes, etRes, gRes, tRes, fRes, stRes, attRes, fpRes, fsRes] = await Promise.all([
            supabase.from('school_report_card_layouts').select('*').eq('is_active', true).order('id'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('last_name'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_exam_types').select('*').eq('is_active', true).order('id'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_attendance').select('*'),
            supabase.from('school_fee_payments').select('*'),
            supabase.from('school_fee_structures').select('*'),
        ]);
        setLayouts(lRes.data || []);
        setStudents(sRes.data || []);
        setMarks(mRes.data || []);
        setSubjects(subRes.data || []);
        setExamTypes(etRes.data || []);
        setGrading(gRes.data || []);
        setTerms(tRes.data || []);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        setAttendance(attRes.data || []);
        setFeePayments(fpRes.data || []);
        setFeeStructures(fsRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444', 'D-': '#dc2626', 'E': '#991b1b',
    };

    const filteredStudents = students.filter(s => {
        if (selForm && s.form_id !== Number(selForm)) return false;
        if (selStream && s.stream_id !== Number(selStream)) return false;
        return true;
    });

    const selectedStudent = students.find(s => s.id === Number(selStudent));
    const termMarks = marks.filter(m => m.student_id === Number(selStudent) && m.term_id === Number(selTerm));
    const termExamTypes = examTypes.filter(e => e.term_id === Number(selTerm));

    // Calculate student totals and positions
    const getStudentReport = () => {
        if (!selectedStudent || !selTerm) return null;

        const subjectRows: any[] = [];
        let totalPoints = 0;
        let totalSubjects = 0;

        for (const subject of subjects) {
            const subMarks = termMarks.filter(m => m.subject_id === subject.id);
            if (subMarks.length === 0) continue;

            const componentScores: { examCode: string; examName: string; score: number; maxScore: number; weight: number; }[] = [];
            for (const mark of subMarks) {
                const et = examTypes.find(e => e.id === mark.exam_type_id);
                if (et) {
                    componentScores.push({
                        examCode: et.exam_code,
                        examName: et.exam_name,
                        score: Number(mark.score || 0),
                        maxScore: Number(et.max_score || 100),
                        weight: Number(et.weight || 0),
                    });
                }
            }

            const combinedScore = subMarks[0]?.combined_score ?? subMarks.reduce((s, m) => s + Number(m.score || 0), 0) / subMarks.length;
            const grade = getGrade(combinedScore);
            totalPoints += grade.points;
            totalSubjects++;

            subjectRows.push({
                subject,
                componentScores,
                combinedScore: Math.round(combinedScore * 10) / 10,
                grade: grade.grade,
                points: grade.points,
                remarks: grade.remarks,
                classPosition: subMarks[0]?.class_position,
                streamPosition: subMarks[0]?.stream_position,
            });
        }

        const meanGrade = totalSubjects > 0 ? getGrade(totalPoints / totalSubjects) : null;
        const meanScore = totalSubjects > 0 ? totalPoints / totalSubjects : 0;

        // Attendance summary
        const studentAttendance = attendance.filter(a => a.student_id === selectedStudent.id);
        const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
        const absentDays = studentAttendance.filter(a => a.status === 'Absent').length;
        const lateDays = studentAttendance.filter(a => a.status === 'Late').length;
        const totalDays = studentAttendance.length || 1;

        // Fee balance
        const termFeeStructure = feeStructures.find((fs: any) => fs.form_id === selectedStudent.form_id);
        const totalFees = Number(termFeeStructure?.total_amount || termFeeStructure?.tuition || 0);
        const totalPaid = feePayments.filter((fp: any) => fp.student_id === selectedStudent.id).reduce((s: number, fp: any) => s + Number(fp.amount || 0), 0);
        const feeBalance = totalFees - totalPaid;

        return {
            student: selectedStudent,
            subjectRows: subjectRows.sort((a, b) => a.subject.subject_name.localeCompare(b.subject.subject_name)),
            totalPoints,
            totalSubjects,
            meanScore: Math.round(meanScore * 100) / 100,
            meanGrade: meanGrade?.grade || 'N/A',
            meanRemarks: meanGrade?.remarks || '',
            presentDays, absentDays, lateDays, totalDays,
            feeBalance,
            totalFees,
            totalPaid,
        };
    };

    const report = getStudentReport();
    const layoutConfig = layouts.find(l => l.layout_code === selLayout)?.config || LAYOUT_PRESETS.find(p => p.code === selLayout) || {};

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html><head><title>Report Card - ${selectedStudent?.first_name} ${selectedStudent?.last_name}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1f2937; }
                table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; font-size: 12px; }
                th { background: #f3f4f6; font-weight: 700; text-transform: uppercase; font-size: 10px; }
                .header { text-align: center; margin-bottom: 16px; }
                .header h1 { font-size: 20px; margin: 0; }
                .header h2 { font-size: 14px; color: #6b7280; margin: 4px 0; }
                .student-info { display: flex; justify-content: space-between; margin: 12px 0; font-size: 12px; }
                .grade-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-weight: 700; font-size: 11px; }
                .signature-block { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
                .signature-line { border-top: 1px solid #9ca3af; width: 200px; text-align: center; padding-top: 4px; }
                @media print { body { margin: 0; } }
            </style></head><body>
            ${printContent.innerHTML}
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>🎓</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Report Card Engine…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">🎓 Ultra Report Cards</h1>
                    <p className="text-sm text-gray-500 mt-1">7+ professional layouts with component exams, sparklines, signatures & more</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${previewMode ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={previewMode ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                        <FiEye size={16} /> {previewMode ? 'Edit Mode' : 'Preview'}
                    </button>
                    {selectedStudent && (
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            <FiPrinter size={16} /> Print
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">Select Term</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                    <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStudent(''); }}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={selStream} onChange={e => { setSelStream(e.target.value); setSelStudent(''); }}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Streams</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select>
                    <select value={selStudent} onChange={e => setSelStudent(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700 col-span-2 sm:col-span-1">
                        <option value="">Select Student</option>
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                    </select>
                    <select value={selLayout} onChange={e => setSelLayout(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        {LAYOUT_PRESETS.map(l => <option key={l.code} value={l.code}>{l.icon} {l.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Layout Selector Cards */}
            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Report Card Layout</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {LAYOUT_PRESETS.map(layout => (
                        <button key={layout.code} onClick={() => setSelLayout(layout.code)}
                            className={`group p-4 rounded-xl border-2 transition-all text-left ${selLayout === layout.code ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className="text-2xl mb-2">{layout.icon}</div>
                            <p className="text-xs font-bold text-gray-800">{layout.name}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{layout.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Report Card Preview */}
            {report && selectedStudent && (
                <div ref={printRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden shadow-lg">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 text-center">
                        <h1 className="text-xl font-extrabold tracking-wide">ALPHA SCHOOL</h1>
                        <p className="text-sm opacity-80 mt-1">Term Report Card — {terms.find(t => t.id === Number(selTerm))?.term_name || 'Term'}</p>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Student Info */}
                        <div className="flex items-start gap-4">
                            {layoutConfig?.showStudentPhoto && (
                                <div className="w-20 h-24 rounded-xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {selectedStudent.photo_url ? (
                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl text-gray-300">👤</span>
                                    )}
                                </div>
                            )}
                            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <div><span className="text-gray-400 text-xs">Name:</span> <span className="font-bold text-gray-800">{selectedStudent.first_name} {selectedStudent.other_name || ''} {selectedStudent.last_name}</span></div>
                                <div><span className="text-gray-400 text-xs">Adm No:</span> <span className="font-bold text-gray-800">{selectedStudent.admission_number}</span></div>
                                <div><span className="text-gray-400 text-xs">Form:</span> <span className="font-bold text-gray-800">{forms.find(f => f.id === selectedStudent.form_id)?.form_name || '-'}</span></div>
                                <div><span className="text-gray-400 text-xs">Stream:</span> <span className="font-bold text-gray-800">{streams.find(s => s.id === selectedStudent.stream_id)?.stream_name || '-'}</span></div>
                                <div><span className="text-gray-400 text-xs">Gender:</span> <span className="font-bold text-gray-800">{selectedStudent.gender}</span></div>
                                <div><span className="text-gray-400 text-xs">Guardian:</span> <span className="font-bold text-gray-800">{selectedStudent.guardian_name || '-'}</span></div>
                            </div>
                        </div>

                        {/* Subject Scores Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500">Subject</th>
                                        {layoutConfig?.showComponentExams && termExamTypes.map(et => (
                                            <th key={et.id} className="px-2 py-2.5 text-center text-xs font-bold text-gray-500">{et.exam_code}<br/><span className="text-[9px] font-normal">({et.weight}%/{et.max_score})</span></th>
                                        ))}
                                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">Combined</th>
                                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">Grade</th>
                                        {layoutConfig?.showClassPosition && <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">Class Pos</th>}
                                        {layoutConfig?.showStreamPosition && <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">Stream Pos</th>}
                                        {layoutConfig?.showSubjectRemarks && <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500">Remarks</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.subjectRows.map((row: any, i: number) => (
                                        <tr key={row.subject.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                            <td className="px-3 py-2 font-semibold text-gray-800">{row.subject.subject_name}</td>
                                            {layoutConfig?.showComponentExams && termExamTypes.map(et => {
                                                const comp = row.componentScores.find((c: any) => c.examCode === et.exam_code);
                                                return (
                                                    <td key={et.id} className="px-2 py-2 text-center text-gray-600">
                                                        {comp ? `${comp.score}/${comp.maxScore}` : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-center font-bold text-gray-800">{row.combinedScore}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="grade-badge" style={{ background: gradeColors[row.grade] || '#94a3b8' }}>{row.grade}</span>
                                            </td>
                                            {layoutConfig?.showClassPosition && <td className="px-3 py-2 text-center text-gray-600 font-mono">{row.classPosition || '-'}</td>}
                                            {layoutConfig?.showStreamPosition && <td className="px-3 py-2 text-center text-gray-600 font-mono">{row.streamPosition || '-'}</td>}
                                            {layoutConfig?.showSubjectRemarks && <td className="px-3 py-2 text-left text-gray-500 text-xs">{row.remarks}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                                        <td className="px-3 py-3 font-extrabold text-blue-800" colSpan={layoutConfig?.showComponentExams ? termExamTypes.length + 1 : 2}>TOTALS & MEANS</td>
                                        <td className="px-3 py-3 text-center font-extrabold text-blue-800">{report.meanScore}</td>
                                        <td className="px-3 py-3 text-center">
                                            <span className="grade-badge text-sm" style={{ background: gradeColors[report.meanGrade] || '#94a3b8' }}>{report.meanGrade}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-blue-700" colSpan={((layoutConfig?.showClassPosition?1:0) + (layoutConfig?.showStreamPosition?1:0) + (layoutConfig?.showSubjectRemarks?1:0))}>
                                            {report.totalPoints} pts / {report.totalSubjects} subjects
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Attendance Summary */}
                        {layoutConfig?.showAttendance && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Attendance Summary</h4>
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div><p className="text-lg font-extrabold text-green-600">{report.presentDays}</p><p className="text-[10px] text-gray-400">Present</p></div>
                                    <div><p className="text-lg font-extrabold text-red-500">{report.absentDays}</p><p className="text-[10px] text-gray-400">Absent</p></div>
                                    <div><p className="text-lg font-extrabold text-amber-500">{report.lateDays}</p><p className="text-[10px] text-gray-400">Late</p></div>
                                    <div><p className="text-lg font-extrabold text-gray-700">{Math.round((report.presentDays / report.totalDays) * 100)}%</p><p className="text-[10px] text-gray-400">Rate</p></div>
                                </div>
                            </div>
                        )}

                        {/* Fee Balance */}
                        {layoutConfig?.showFeeBalance && (
                            <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-amber-600 uppercase">Fee Balance</p>
                                    <p className="text-lg font-extrabold text-amber-800">Ksh {report.feeBalance.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-amber-500">Total: Ksh {report.totalFees.toLocaleString()}</p>
                                    <p className="text-xs text-green-600">Paid: Ksh {report.totalPaid.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {/* Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {layoutConfig?.showClassTeacherRemark && (
                                <div className="border border-gray-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Class Teacher&apos;s Remark</p>
                                    <div className="h-16 border-b border-dashed border-gray-200" />
                                </div>
                            )}
                            {layoutConfig?.showPrincipalRemark && (
                                <div className="border border-gray-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Principal&apos;s Remark</p>
                                    <div className="h-16 border-b border-dashed border-gray-200" />
                                </div>
                            )}
                        </div>

                        {/* Digital Signatures */}
                        {layoutConfig?.showDigitalSignature && (
                            <div className="grid grid-cols-3 gap-6 mt-6">
                                <div className="text-center">
                                    <div className="border-t-2 border-gray-300 pt-2 mt-8">
                                        <p className="text-xs font-bold text-gray-600">Class Teacher</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="border-t-2 border-gray-300 pt-2 mt-8">
                                        <p className="text-xs font-bold text-gray-600">Principal</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="border-t-2 border-gray-300 pt-2 mt-8">
                                        <p className="text-xs font-bold text-gray-600">Parent/Guardian</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Official Seal */}
                        {layoutConfig?.officialSeal && (
                            <div className="flex justify-center mt-4">
                                <div className="w-20 h-20 rounded-full border-4 border-blue-200 flex items-center justify-center text-blue-300 text-[10px] font-bold text-center leading-tight">
                                    OFFICIAL<br/>SEAL
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* No student selected */}
            {!selectedStudent && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🎓</div>
                    <h3 className="text-lg font-bold text-gray-700">Select a Student to Generate Report Card</h3>
                    <p className="text-sm text-gray-400 mt-2">Choose a term, form, and student above to preview the report card</p>
                </div>
            )}
        </div>
    );
}

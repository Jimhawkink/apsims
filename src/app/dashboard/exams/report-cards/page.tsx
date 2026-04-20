'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPrinter, FiDownload, FiUsers, FiUser, FiChevronLeft, FiChevronRight, FiFileText } from 'react-icons/fi';

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function ReportCardsPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [selStudent, setSelStudent] = useState('');
    const [currentStudentIdx, setCurrentStudentIdx] = useState(0);
    const [showBulk, setShowBulk] = useState(false);
    const [comments, setComments] = useState<Record<number, { classTeacher: string; principal: string }>>({});

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];
    const printRef = useRef<HTMLDivElement>(null);

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr, sd] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
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
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''));

    useEffect(() => {
        if (!selForm || !selTerm || !selExamType) { setMarks([]); return; }
        const studentIds = classStudents.map(s => s.id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selTerm, selExamType, students]);

    // Build student rankings for position calculation
    const allStudentData = classStudents.map(student => {
        const studentMarks = marks.filter(m => m.student_id === student.id);
        let totalPoints = 0, totalScore = 0, subjectCount = 0;
        const subjectResults: { subId: number; subName: string; score: number; grade: string; points: number; remarks: string }[] = [];
        subjects.forEach(sub => {
            const mark = studentMarks.find(m => m.subject_id === sub.id);
            if (mark) {
                const g = getGrade(Number(mark.score));
                subjectResults.push({ subId: sub.id, subName: sub.subject_name, score: Number(mark.score), grade: g.grade, points: g.points, remarks: g.remarks });
                totalPoints += g.points;
                totalScore += Number(mark.score);
                subjectCount++;
            }
        });
        const avgScore = subjectCount > 0 ? totalScore / subjectCount : 0;
        const meanGrade = getGrade(avgScore);
        return { student, subjectResults, totalPoints, totalScore, avgScore, meanGrade, subjectCount };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalScore - a.totalScore);

    allStudentData.forEach((row, i) => {
        if (i === 0 || row.totalPoints !== allStudentData[i - 1].totalPoints || row.totalScore !== allStudentData[i - 1].totalScore) {
            (row as any).rank = i + 1;
        } else {
            (row as any).rank = (allStudentData[i - 1] as any).rank;
        }
    });

    const selectedStudentData = selStudent ? allStudentData.find(d => d.student.id === Number(selStudent)) : (classStudents.length > 0 ? allStudentData[currentStudentIdx] : null);
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const getTermName = (id: string) => terms.find(t => String(t.id) === id)?.term_name || '-';

    const handlePrint = () => { window.print(); };

    const isReady = selForm && selTerm && selExamType;

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Report Cards...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 10mm; }
                }
            `}</style>

            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiFileText className="text-green-500" /> Report Cards</h1>
                    <p className="text-sm text-gray-500 mt-1">Generate professional report cards — Individual or bulk printing</p>
                </div>
                {selectedStudentData && (
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <FiPrinter size={14} /> Print Report Card
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div><label className="lbl">Form *</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelStudent(''); }} className="select-modern w-full text-sm"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => { setSelStream(e.target.value); setSelStudent(''); }} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Term *</label><select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="select-modern w-full text-sm"><option value="">Select Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                    <div><label className="lbl">Exam Type *</label><select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="select-modern w-full text-sm">{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                    <div><label className="lbl">Student</label><select value={selStudent} onChange={e => { setSelStudent(e.target.value); const idx = classStudents.findIndex(s => s.id === Number(e.target.value)); if (idx >= 0) setCurrentStudentIdx(idx); }} className="select-modern w-full text-sm"><option value="">Navigate (arrows)</option>{classStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
                </div>
                {/* Student Navigator */}
                {isReady && classStudents.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <button onClick={() => { const i = Math.max(0, currentStudentIdx - 1); setCurrentStudentIdx(i); setSelStudent(String(classStudents[i]?.id || '')); }}
                            disabled={currentStudentIdx === 0} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1">
                            <FiChevronLeft size={14} /> Previous
                        </button>
                        <span className="text-sm font-semibold text-gray-600">{currentStudentIdx + 1} of {classStudents.length} students</span>
                        <button onClick={() => { const i = Math.min(classStudents.length - 1, currentStudentIdx + 1); setCurrentStudentIdx(i); setSelStudent(String(classStudents[i]?.id || '')); }}
                            disabled={currentStudentIdx >= classStudents.length - 1} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1">
                            Next <FiChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {!isReady ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400 no-print">
                    <span className="text-5xl block mb-4">🎓</span>
                    <p className="font-semibold text-lg">Select Form, Term & Exam Type to generate report cards</p>
                </div>
            ) : loadingMarks ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 no-print">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                </div>
            ) : !selectedStudentData ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400 no-print">
                    <span className="text-5xl block mb-4">👤</span><p className="font-semibold">No student selected or no data</p>
                </div>
            ) : (
                /* Report Card Preview */
                <div className="print-area" ref={printRef}>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-[800px] mx-auto shadow-lg" style={{ fontFamily: "'Times New Roman', serif" }}>
                        {/* School Header */}
                        <div className="border-b-4 border-blue-600 p-6 text-center" style={{ background: 'linear-gradient(180deg, #f0f7ff, #ffffff)' }}>
                            {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain" />}
                            <h1 className="text-2xl font-extrabold text-blue-900 uppercase tracking-wider">{schoolDetails?.school_name || 'Alpha School'}</h1>
                            {schoolDetails?.motto && <p className="text-sm italic text-blue-600 mt-1">"{schoolDetails.motto}"</p>}
                            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-2">
                                {schoolDetails?.postal_address && <span>P.O. Box {schoolDetails.postal_address}</span>}
                                {schoolDetails?.phone1 && <span>Tel: {schoolDetails.phone1}</span>}
                                {schoolDetails?.email && <span>{schoolDetails.email}</span>}
                            </div>
                            <div className="mt-3 py-2 px-6 inline-block rounded-lg" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                                <p className="text-white font-bold text-sm uppercase tracking-widest">Student Progress Report</p>
                            </div>
                        </div>

                        {/* Student Details */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm">
                            <div className="flex"><span className="font-bold text-gray-600 w-28">Student Name:</span><span className="font-semibold text-gray-900">{selectedStudentData.student.first_name} {selectedStudentData.student.last_name}</span></div>
                            <div className="flex"><span className="font-bold text-gray-600 w-28">Adm Number:</span><span className="font-semibold text-gray-900">{selectedStudentData.student.admission_no || selectedStudentData.student.admission_number}</span></div>
                            <div className="flex"><span className="font-bold text-gray-600 w-28">Form/Class:</span><span className="font-semibold text-gray-900">{getFormName(selectedStudentData.student.form_id)} {getStreamName(selectedStudentData.student.stream_id)}</span></div>
                            <div className="flex"><span className="font-bold text-gray-600 w-28">Term:</span><span className="font-semibold text-gray-900">{getTermName(selTerm)} — {selExamType}</span></div>
                            <div className="flex"><span className="font-bold text-gray-600 w-28">KCPE Marks:</span><span className="font-semibold text-gray-900">{selectedStudentData.student.kcpe_marks || '-'}</span></div>
                            <div className="flex"><span className="font-bold text-gray-600 w-28">Position:</span><span className="font-extrabold text-blue-700">{(selectedStudentData as any).rank} of {classStudents.length}</span></div>
                        </div>

                        {/* Subject Results Table */}
                        <div className="px-6 py-4">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-blue-700 text-white">
                                        <th className="border border-blue-600 px-3 py-2 text-left text-xs font-bold uppercase">#</th>
                                        <th className="border border-blue-600 px-3 py-2 text-left text-xs font-bold uppercase">Subject</th>
                                        <th className="border border-blue-600 px-3 py-2 text-center text-xs font-bold uppercase">Score</th>
                                        <th className="border border-blue-600 px-3 py-2 text-center text-xs font-bold uppercase">Grade</th>
                                        <th className="border border-blue-600 px-3 py-2 text-center text-xs font-bold uppercase">Points</th>
                                        <th className="border border-blue-600 px-3 py-2 text-left text-xs font-bold uppercase">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudentData.subjectResults.map((r, i) => (
                                        <tr key={r.subId} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                                            <td className="border border-gray-300 px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800">{r.subName}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold text-gray-800">{r.score}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-6 rounded text-white font-bold text-xs"
                                                    style={{ background: gradeColors[r.grade] || '#94a3b8' }}>{r.grade}</span>
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold text-blue-700">{r.points}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-xs text-gray-600">{r.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                                        <td colSpan={2} className="border border-gray-300 px-3 py-2.5 text-sm text-blue-800">TOTAL / MEAN</td>
                                        <td className="border border-gray-300 px-3 py-2.5 text-center text-sm text-blue-800">{selectedStudentData.avgScore.toFixed(1)}</td>
                                        <td className="border border-gray-300 px-3 py-2.5 text-center">
                                            <span className="inline-flex items-center justify-center w-10 h-7 rounded text-white font-bold text-sm"
                                                style={{ background: gradeColors[selectedStudentData.meanGrade.grade] || '#94a3b8' }}>{selectedStudentData.meanGrade.grade}</span>
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2.5 text-center text-sm text-blue-800">{selectedStudentData.totalPoints}</td>
                                        <td className="border border-gray-300 px-3 py-2.5 text-xs text-blue-800">{selectedStudentData.meanGrade.remarks}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Summary Strip */}
                        <div className="mx-6 mb-4 grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total Subjects', value: selectedStudentData.subjectCount, color: '#3b82f6' },
                                { label: 'Total Points', value: selectedStudentData.totalPoints, color: '#8b5cf6' },
                                { label: 'Mean Score', value: `${selectedStudentData.avgScore.toFixed(1)}%`, color: '#10b981' },
                                { label: 'Class Position', value: `${(selectedStudentData as any).rank} / ${classStudents.length}`, color: '#f59e0b' },
                            ].map((s, i) => (
                                <div key={i} className="text-center p-3 rounded-lg border" style={{ borderColor: s.color + '40', background: s.color + '08' }}>
                                    <p className="text-[10px] font-bold uppercase" style={{ color: s.color }}>{s.label}</p>
                                    <p className="text-lg font-extrabold text-gray-800 mt-0.5">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Comments */}
                        <div className="px-6 pb-4 space-y-3">
                            <div className="border border-gray-300 rounded-lg p-3">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Class Teacher's Comment</p>
                                <div className="border-b border-dashed border-gray-300 h-8" />
                            </div>
                            <div className="border border-gray-300 rounded-lg p-3">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Principal's Comment</p>
                                <div className="border-b border-dashed border-gray-300 h-8" />
                            </div>
                        </div>

                        {/* Signature Lines */}
                        <div className="grid grid-cols-3 gap-4 px-6 pb-6">
                            {['Class Teacher', 'Principal', 'Parent/Guardian'].map(role => (
                                <div key={role} className="text-center">
                                    <div className="border-b-2 border-gray-400 mb-1 h-8" />
                                    <p className="text-xs font-bold text-gray-500">{role}'s Signature</p>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-blue-50 border-t border-blue-200 text-center">
                            <p className="text-[10px] text-blue-600 font-medium">This report card is computer-generated by {schoolDetails?.school_name || 'Alpha School'} Management System</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Scale Reference */}
            {isReady && selectedStudentData && (
                <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Grading Scale Reference</p>
                    <div className="flex flex-wrap gap-2">
                        {grading.map(g => (
                            <div key={g.grade} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-xs">
                                <span className="inline-flex items-center justify-center w-6 h-5 rounded text-white font-bold text-[10px]"
                                    style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>
                                <span className="text-gray-600">{g.min_score}-{g.max_score}%</span>
                                <span className="text-gray-400">({g.points}pts)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiUser, FiSearch, FiPrinter, FiMail, FiPhone, FiMapPin, FiCalendar, FiBookOpen, FiAward, FiChevronLeft, FiChevronRight, FiFileText, FiHeart, FiShield } from 'react-icons/fi';
import EmergencyContactsSection from '@/components/EmergencyContactsSection';

export default function StudentProfilePage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [fees, setFees] = useState<any[]>([]);
    const [discipline, setDiscipline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selStudent, setSelStudent] = useState<any>(null);
    const [tab, setTab] = useState<'personal' | 'academic' | 'financial' | 'discipline' | 'guardian'>('personal');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, m, g, fe, d] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_fee_payments').select('*'),
            supabase.from('school_discipline').select('*'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setMarks(m.data || []);
        setGrading(g.data || []);
        setFees(fe.data || []);
        setDiscipline(d.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const getGrade = (score: number) => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', points: 1, remarks: 'Very Poor' };
    };

    const filtered = students.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(q);
    });

    const studentMarks = selStudent ? marks.filter(m => m.student_id === selStudent.id) : [];
    const studentFees = selStudent ? fees.filter(f => f.student_id === selStudent.id) : [];
    const studentDisc = selStudent ? discipline.filter(d => d.student_id === selStudent.id) : [];
    const avgScore = studentMarks.length > 0 ? studentMarks.reduce((a, m) => a + Number(m.score || 0), 0) / studentMarks.length : 0;
    const meanGrade = getGrade(avgScore);
    const totalPaid = studentFees.reduce((a, f) => a + Number(f.amount || 0), 0);

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiUser className="text-blue-500" /> Student Profiles</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive student profiles — Academic, financial, disciplinary & personal records</p></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Student List */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
                    </div>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                        {filtered.slice(0, 50).map(s => (
                            <button key={s.id} onClick={() => { setSelStudent(s); setTab('personal'); }}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-all ${selStudent?.id === s.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: s.gender === 'Male' ? '#3b82f6' : '#ec4899' }}>
                                        {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number} • {getFormName(s.form_id)} {getStreamName(s.stream_id)}</p>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${s.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No students found</p>}
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">{filtered.length} students</div>
                </div>

                {/* Profile Detail */}
                <div className="lg:col-span-2 space-y-4">
                    {!selStudent ? (
                        <div className="bg-white rounded-2xl border border-gray-200 text-center py-24 text-gray-400">
                            <span className="text-5xl block mb-4">👤</span>
                            <p className="font-semibold text-lg">Select a student from the list</p>
                        </div>
                    ) : (
                        <>
                            {/* Student Header Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="h-20" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }} />
                                <div className="px-6 pb-5 -mt-10">
                                    <div className="flex items-end gap-4">
                                        <div className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white font-bold text-2xl shadow-lg" 
                                            style={{ background: selStudent.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                                            {selStudent.first_name?.charAt(0)}{selStudent.last_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 pt-10">
                                            <h2 className="text-xl font-bold text-gray-800">{selStudent.first_name} {selStudent.middle_name || selStudent.other_name || ''} {selStudent.last_name}</h2>
                                            <p className="text-sm text-gray-500">{selStudent.admission_no || selStudent.admission_number} • {getFormName(selStudent.form_id)} {getStreamName(selStudent.stream_id)}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${selStudent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selStudent.status}</span>
                                    </div>
                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-4 gap-3 mt-5">
                                        {[
                                            { label: 'Mean Score', value: avgScore > 0 ? `${avgScore.toFixed(1)}%` : '-', color: '#3b82f6' },
                                            { label: 'Mean Grade', value: studentMarks.length > 0 ? meanGrade.grade : '-', color: gradeColors[meanGrade.grade] || '#94a3b8' },
                                            { label: 'Total Paid', value: totalPaid > 0 ? fmt(totalPaid) : '-', color: '#10b981' },
                                            { label: 'Discipline', value: studentDisc.length > 0 ? `${studentDisc.length} cases` : 'Clean', color: studentDisc.length > 0 ? '#f59e0b' : '#10b981' },
                                        ].map((s, i) => (
                                            <div key={i} className="text-center p-3 rounded-xl border border-gray-200">
                                                <p className="text-[10px] font-bold uppercase text-gray-400">{s.label}</p>
                                                <p className="text-lg font-extrabold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                                {[
                                    { key: 'personal', label: 'Personal Info', icon: '👤' },
                                    { key: 'academic', label: 'Academic', icon: '📚' },
                                    { key: 'financial', label: 'Financial', icon: '💰' },
                                    { key: 'discipline', label: 'Discipline', icon: '🛡️' },
                                    { key: 'guardian', label: 'Guardian', icon: '👨‍👩‍👦' },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setTab(t.key as any)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === t.key ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Personal Tab */}
                            {tab === 'personal' && (
                                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">📋 Personal Details</h3>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                        {[
                                            { label: 'Full Name', value: `${selStudent.first_name} ${selStudent.middle_name || selStudent.other_name || ''} ${selStudent.last_name}` },
                                            { label: 'Admission No', value: selStudent.admission_no || selStudent.admission_number },
                                            { label: 'Gender', value: selStudent.gender },
                                            { label: 'Date of Birth', value: selStudent.date_of_birth ? new Date(selStudent.date_of_birth).toLocaleDateString('en-GB') : '-' },
                                            { label: 'Nationality', value: selStudent.nationality || '-' },
                                            { label: 'Religion', value: selStudent.religion || '-' },
                                            { label: 'County', value: selStudent.county || '-' },
                                            { label: 'Sub-County', value: selStudent.sub_county || '-' },
                                            { label: 'Village/Estate', value: selStudent.village || '-' },
                                            { label: 'Birth Cert No', value: selStudent.birth_cert_no || '-' },
                                            { label: 'NEMIS/UPI', value: selStudent.nemis_no || '-' },
                                            { label: 'Form', value: `${getFormName(selStudent.form_id)} ${getStreamName(selStudent.stream_id)}` },
                                            { label: 'Admission Date', value: selStudent.admission_date ? new Date(selStudent.admission_date).toLocaleDateString('en-GB') : '-' },
                                            { label: 'Blood Group', value: selStudent.blood_group || '-' },
                                            { label: 'Medical Conditions', value: selStudent.medical_conditions || selStudent.medical_info || 'None' },
                                            { label: 'Special Needs', value: selStudent.special_needs || 'None' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex border-b border-gray-100 py-2">
                                                <span className="text-xs font-semibold text-gray-400 w-32 flex-shrink-0">{item.label}</span>
                                                <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Emergency Contacts Section — shown on personal tab */}
                            {tab === 'personal' && selStudent && (
                                <EmergencyContactsSection
                                    studentId={selStudent.id}
                                    studentStatus={selStudent.status}
                                    canWrite={true}
                                />
                            )}

                            {/* Academic Tab */}
                            {tab === 'academic' && (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">📚 Academic Records — {studentMarks.length} marks</h3></div>
                                    {studentMarks.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400"><p>No exam marks found</p></div>
                                    ) : (
                                        <table className="w-full">
                                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Exam</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Score</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Grade</th>
                                            </tr></thead>
                                            <tbody>
                                                {studentMarks.slice(0, 30).map((m, i) => {
                                                    const g = getGrade(Number(m.score));
                                                    return (
                                                        <tr key={m.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-700">{m.exam_type}</td>
                                                            <td className="px-4 py-2 text-center text-sm font-bold text-gray-800">{m.score}%</td>
                                                            <td className="px-4 py-2 text-center"><span className="inline-flex items-center justify-center w-8 h-6 rounded text-white font-bold text-xs" style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Financial Tab */}
                            {tab === 'financial' && (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h3 className="font-bold text-gray-700 text-sm">💰 Fee Payments</h3><span className="text-sm font-bold text-green-600">Total: {fmt(totalPaid)}</span></div>
                                    {studentFees.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400"><p>No payments recorded</p></div>
                                    ) : (
                                        <table className="w-full">
                                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Receipt</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Mode</th>
                                            </tr></thead>
                                            <tbody>
                                                {studentFees.map((f, i) => (
                                                    <tr key={f.id || i} className="border-b border-gray-100">
                                                        <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                                                        <td className="px-4 py-2 text-sm">{f.payment_date ? new Date(f.payment_date).toLocaleDateString('en-GB') : '-'}</td>
                                                        <td className="px-4 py-2 text-sm font-mono text-blue-600">{f.receipt_number || '-'}</td>
                                                        <td className="px-4 py-2 text-right text-sm font-bold text-green-600">{fmt(Number(f.amount))}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{f.payment_mode || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Discipline Tab */}
                            {tab === 'discipline' && (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-700 text-sm">🛡️ Discipline Records — {studentDisc.length} entries</h3></div>
                                    {studentDisc.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400"><p className="text-lg mb-1">✅</p><p>No discipline issues recorded</p></div>
                                    ) : (
                                        <div className="p-4 space-y-3">
                                            {studentDisc.map((d, i) => (
                                                <div key={d.id || i} className="border border-gray-200 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.severity === 'Major' ? 'bg-red-100 text-red-700' : d.severity === 'Minor' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{d.severity || 'N/A'}</span>
                                                        <span className="text-xs text-gray-400">{d.incident_date ? new Date(d.incident_date).toLocaleDateString('en-GB') : '-'}</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-800">{d.offense || d.incident_description || '-'}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Action: {d.action_taken || '-'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Guardian Tab */}
                            {tab === 'guardian' && (
                                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">👨‍👩‍👦 Guardian / Parent Information</h3>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                        {[
                                            { label: 'Guardian Name', value: selStudent.guardian_name || '-' },
                                            { label: 'Relationship', value: selStudent.guardian_relationship || '-' },
                                            { label: 'Phone', value: selStudent.guardian_phone || '-' },
                                            { label: 'Email', value: selStudent.guardian_email || '-' },
                                            { label: 'ID Number', value: selStudent.guardian_id_no || '-' },
                                            { label: 'Occupation', value: selStudent.guardian_occupation || '-' },
                                            { label: 'Emergency Contact', value: selStudent.emergency_contact_name || '-' },
                                            { label: 'Emergency Phone', value: selStudent.emergency_contact_phone || '-' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex border-b border-gray-100 py-2.5">
                                                <span className="text-xs font-semibold text-gray-400 w-32 flex-shrink-0">{item.label}</span>
                                                <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    FiArrowLeft, FiUser, FiDollarSign, FiCalendar, FiBookOpen,
    FiAlertTriangle, FiHome, FiPhone, FiMail, FiRefreshCw,
    FiCheckCircle, FiXCircle, FiClock, FiTrendingUp, FiEdit2,
    FiMessageSquare, FiPrinter,
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

type Tab = 'overview' | 'fees' | 'attendance' | 'academics' | 'discipline' | 'hostel';

const TABS: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: FiUser,          color: '#6366f1' },
    { id: 'fees',        label: 'Fee Account', icon: FiDollarSign,    color: '#10b981' },
    { id: 'attendance',  label: 'Attendance',  icon: FiCalendar,      color: '#f59e0b' },
    { id: 'academics',   label: 'Academics',   icon: FiBookOpen,      color: '#3b82f6' },
    { id: 'discipline',  label: 'Discipline',  icon: FiAlertTriangle, color: '#ef4444' },
    { id: 'hostel',      label: 'Hostel',      icon: FiHome,          color: '#8b5cf6' },
];

export default function StudentProfilePage() {
    const { id } = useParams<{ id: string }>();
    const studentId = Number(id);

    const [tab, setTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<any>(null);
    const [form, setForm] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [discipline, setDiscipline] = useState<any[]>([]);
    const [hostelAlloc, setHostelAlloc] = useState<any[]>([]);
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [schoolInfo, setSchoolInfo] = useState<any>({});

    const fetchAll = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        try {
            const [
                { data: st },
                { data: termData },
                { data: schoolData },
                { data: payData },
                { data: feeStr },
                { data: attData },
                { data: marksData },
                { data: subData },
                { data: discData },
                { data: hostelData },
            ] = await Promise.all([
                supabase.from('school_students').select('*,school_forms(form_name,form_level),school_streams(stream_name)').eq('id', studentId).single(),
                supabase.from('school_terms').select('*').eq('is_current', true).maybeSingle(),
                supabase.from('school_details').select('school_name,principal_name,phone1').single(),
                supabase.from('school_fee_payments').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }),
                supabase.from('school_fee_structures').select('*'),
                supabase.from('school_daily_attendance').select('*').eq('student_id', studentId).order('attendance_date', { ascending: false }).limit(90),
                supabase.from('school_exam_marks').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(200),
                supabase.from('school_subjects').select('id,subject_name,subject_code'),
                supabase.from('school_discipline').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabase.from('school_hostel_bed_allocations').select('*,school_hostels(dorm_name,gender)').eq('student_id', studentId).order('created_at', { ascending: false }),
            ]);

            setStudent(st);
            setForm(st?.school_forms || null);
            setCurrentTerm(termData);
            setSchoolInfo(schoolData || {});
            setPayments(payData || []);
            setFeeStructures(feeStr || []);
            setAttendance(attData || []);
            setMarks(marksData || []);
            setSubjects(subData || []);
            setDiscipline(discData || []);
            setHostelAlloc(hostelData || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [studentId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Computed values
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const formFees = feeStructures.filter(f => !f.form_id || f.form_id === student?.form_id);
    const totalExpected = formFees.reduce((s, f) => s + Number(f.amount || 0), 0);
    const balance = Math.max(0, totalExpected - totalPaid);
    const overpaid = Math.max(0, totalPaid - totalExpected);
    const collRate = pct(totalPaid, totalExpected);

    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const absentDays = attendance.filter(a => a.status === 'Absent').length;
    const lateDays = attendance.filter(a => a.status === 'Late').length;
    const attRate = pct(presentDays, attendance.length);

    const subjectAvgs: Record<number, { name: string; code: string; avg: number; count: number }> = {};
    marks.forEach(m => {
        const subj = subjects.find(s => s.id === m.subject_id);
        if (!subjectAvgs[m.subject_id]) subjectAvgs[m.subject_id] = { name: subj?.subject_name || `Subject ${m.subject_id}`, code: subj?.subject_code || '', avg: 0, count: 0 };
        subjectAvgs[m.subject_id].avg += Number(m.marks || 0);
        subjectAvgs[m.subject_id].count++;
    });
    Object.values(subjectAvgs).forEach(s => { if (s.count > 0) s.avg = Math.round(s.avg / s.count * 10) / 10; });
    const overallAvg = Object.values(subjectAvgs).length > 0
        ? Math.round(Object.values(subjectAvgs).reduce((s, v) => s + v.avg, 0) / Object.values(subjectAvgs).length * 10) / 10
        : 0;

    const grade = (avg: number) => avg >= 80 ? { g: 'A', c: 'text-emerald-600 bg-emerald-50' } : avg >= 70 ? { g: 'B', c: 'text-blue-600 bg-blue-50' } : avg >= 60 ? { g: 'C', c: 'text-amber-600 bg-amber-50' } : avg >= 50 ? { g: 'D', c: 'text-orange-600 bg-orange-50' } : { g: 'E', c: 'text-red-600 bg-red-50' };
    const overallGrade = grade(overallAvg);

    const name = student ? `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}` : '...';
    const admNo = student?.admission_no || student?.admission_number || '—';

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                    <FiUser className="absolute inset-0 m-auto text-indigo-500" size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-500">Loading Student Profile...</p>
            </div>
        </div>
    );

    if (!student) return (
        <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-gray-700">Student not found</p>
            <Link href="/dashboard/students" className="text-indigo-600 text-sm mt-2 block hover:underline">← Back to Students</Link>
        </div>
    );

    return (
        <div className="space-y-5 max-w-6xl mx-auto">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl flex-shrink-0"
                            style={{ background: student.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                            {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Link href="/dashboard/students" className="text-indigo-300 hover:text-white text-xs flex items-center gap-1">
                                    <FiArrowLeft size={11} /> Students
                                </Link>
                                <span className="text-indigo-400 text-xs">/</span>
                                <span className="text-xs text-indigo-300">360° Profile</span>
                            </div>
                            <h1 className="text-2xl font-black">{name}</h1>
                            <div className="flex flex-wrap gap-3 mt-2">
                                <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold">
                                    Adm: {admNo}
                                </span>
                                <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold">
                                    {form?.form_name || '—'} {student.school_streams?.stream_name || ''}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-red-500/30 text-red-200'}`}>
                                    {student.status || 'Active'}
                                </span>
                                <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold">{student.gender}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                            <Link href={`/dashboard/fees/collect?student=${studentId}`}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-xs font-bold transition">
                                <FiDollarSign size={13} /> Collect Fee
                            </Link>
                            <button onClick={fetchAll} className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition">
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                        {[
                            { label: 'Fee Balance', val: fmt(balance), sub: `${collRate}% paid`, c: balance > 0 ? '#ef4444' : '#10b981' },
                            { label: 'Attendance', val: `${attRate}%`, sub: `${presentDays} present / ${absentDays} absent`, c: attRate >= 80 ? '#10b981' : '#f59e0b' },
                            { label: 'Overall Grade', val: overallGrade.g, sub: `${overallAvg}% avg across ${Object.keys(subjectAvgs).length} subjects`, c: '#6366f1' },
                            { label: 'Discipline', val: discipline.length.toString(), sub: discipline.length === 0 ? 'Clean record ✅' : 'incidents recorded', c: discipline.length > 0 ? '#ef4444' : '#10b981' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3">
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">{k.label}</p>
                                <p className="text-xl font-black mt-0.5" style={{ color: k.c }}>{k.val}</p>
                                <p className="text-white/40 text-[10px] mt-0.5">{k.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    const isActive = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                            style={isActive ? { background: t.color, color: 'white', boxShadow: `0 4px 12px ${t.color}40` } : { color: '#6b7280' }}>
                            <Icon size={13} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ══════════════ OVERVIEW TAB ══════════════ */}
            {tab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Personal Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">👤 Personal Information</p>
                            <Link href={`/dashboard/students?edit=${studentId}`} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                                <FiEdit2 size={11} /> Edit
                            </Link>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-4">
                            {[
                                { l: 'Full Name', v: name },
                                { l: 'Admission No', v: admNo },
                                { l: 'Date of Birth', v: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-KE') : '—' },
                                { l: 'Gender', v: student.gender },
                                { l: 'Nationality', v: student.nationality || '—' },
                                { l: 'Religion', v: student.religion || '—' },
                                { l: 'Admission Date', v: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-KE') : '—' },
                                { l: 'Form', v: `${form?.form_name || '—'} ${student.school_streams?.stream_name || ''}` },
                            ].map(f => (
                                <div key={f.l}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{f.l}</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{f.v}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Guardian Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">👨‍👩‍👧 Guardian / Parent Info</p>
                        </div>
                        <div className="p-5 space-y-4">
                            {[
                                { l: 'Guardian Name', v: student.guardian_name || '—', icon: FiUser },
                                { l: 'Relationship', v: student.guardian_relationship || '—', icon: FiUser },
                                { l: 'Phone', v: student.guardian_phone || '—', icon: FiPhone },
                                { l: 'Alt Phone', v: student.guardian_phone2 || '—', icon: FiPhone },
                                { l: 'Email', v: student.guardian_email || '—', icon: FiMail },
                                { l: 'Address', v: student.guardian_address || '—', icon: FiHome },
                            ].map(f => (
                                <div key={f.l} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <f.icon size={13} className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{f.l}</p>
                                        <p className="text-sm font-semibold text-gray-800">{f.v}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Send WhatsApp */}
                        {student.guardian_phone && (
                            <div className="px-5 pb-5">
                                <a href={`https://wa.me/${student.guardian_phone.replace(/^0/, '254')}?text=Dear%20Parent%2C%20this%20is%20regarding%20${encodeURIComponent(name)}%20at%20${encodeURIComponent(schoolInfo.school_name || 'APSIMS')}%2E`}
                                    target="_blank" rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
                                    <FiMessageSquare size={14} /> Message Guardian on WhatsApp
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════ FEES TAB ══════════════ */}
            {tab === 'fees' && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { l: 'Total Expected', v: fmt(totalExpected), c: '#6366f1', bg: '#eef2ff' },
                            { l: 'Amount Paid', v: fmt(totalPaid), c: '#10b981', bg: '#ecfdf5' },
                            { l: 'Balance', v: fmt(balance), c: balance > 0 ? '#ef4444' : '#10b981', bg: balance > 0 ? '#fef2f2' : '#ecfdf5' },
                            { l: 'Paid %', v: `${collRate}%`, c: collRate >= 100 ? '#10b981' : collRate >= 60 ? '#f59e0b' : '#ef4444', bg: '#f8fafc' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderLeft: `4px solid ${k.c}` }}>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{k.l}</p>
                                <p className="text-lg font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                            </div>
                        ))}
                    </div>

                    {/* Payment history */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">💳 Payment History</p>
                            <Link href={`/dashboard/fees/collect?student=${studentId}`}
                                className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline">
                                <FiDollarSign size={11} /> Collect Fee
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        {['#', 'Date', 'Amount', 'Method', 'Reference', 'Received By'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                                                style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 text-gray-600">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-4 py-3 font-black text-emerald-600">{fmt(Number(p.amount))}</td>
                                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">{p.payment_method}</span></td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.reference_number || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.received_by || '—'}</td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-12 text-gray-400">No payments recorded</td></tr>
                                    )}
                                </tbody>
                                {payments.length > 0 && (
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                                            <td colSpan={2} className="px-4 py-3 font-black text-gray-700">TOTAL</td>
                                            <td className="px-4 py-3 font-black text-emerald-600">{fmt(totalPaid)}</td>
                                            <td colSpan={3} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ ATTENDANCE TAB ══════════════ */}
            {tab === 'attendance' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { l: 'Attendance Rate', v: `${attRate}%`, c: attRate >= 80 ? '#10b981' : '#ef4444' },
                            { l: 'Days Present', v: presentDays, c: '#10b981' },
                            { l: 'Days Absent', v: absentDays, c: '#ef4444' },
                            { l: 'Days Late', v: lateDays, c: '#f59e0b' },
                        ].map((k, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{k.l}</p>
                                <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                            </div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs font-black text-gray-500 mb-3">ATTENDANCE BREAKDOWN (last 90 days)</p>
                        <div className="flex h-4 rounded-full overflow-hidden">
                            <div className="bg-emerald-500" style={{ width: `${pct(presentDays, attendance.length)}%` }} title="Present" />
                            <div className="bg-amber-400" style={{ width: `${pct(lateDays, attendance.length)}%` }} title="Late" />
                            <div className="bg-red-400" style={{ width: `${pct(absentDays, attendance.length)}%` }} title="Absent" />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Present ({presentDays})</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Late ({lateDays})</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Absent ({absentDays})</span>
                        </div>
                    </div>

                    {/* Attendance log */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📋 Recent Attendance Log</p>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                            {attendance.slice(0, 30).map((a, i) => (
                                <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <span className="text-sm text-gray-700">{new Date(a.attendance_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    <div className="flex items-center gap-2">
                                        {a.remarks && <span className="text-xs text-gray-400">{a.remarks}</span>}
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {attendance.length === 0 && <div className="text-center py-10 text-gray-400">No attendance data found</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ ACADEMICS TAB ══════════════ */}
            {tab === 'academics' && (
                <div className="space-y-4">
                    {/* Overall Grade */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-5">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black ${overallGrade.c}`}>
                                {overallGrade.g}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Overall Performance</p>
                                <p className="text-3xl font-black text-gray-800">{overallAvg}%</p>
                                <p className="text-xs text-gray-400 mt-1">Average across {Object.keys(subjectAvgs).length} subjects · {marks.length} exam records</p>
                            </div>
                        </div>
                    </div>

                    {/* Subject Breakdown */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📚 Subject Performance</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {Object.values(subjectAvgs).sort((a, b) => b.avg - a.avg).map((s, i) => {
                                const g = grade(s.avg);
                                return (
                                    <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${g.c}`}>{g.g}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full transition-all"
                                                        style={{ width: `${s.avg}%`, background: s.avg >= 70 ? '#10b981' : s.avg >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                                <span className="text-xs font-black text-gray-600 w-10 text-right">{s.avg}%</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{s.count} exams</span>
                                    </div>
                                );
                            })}
                            {Object.keys(subjectAvgs).length === 0 && <div className="text-center py-12 text-gray-400">No exam data available</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ DISCIPLINE TAB ══════════════ */}
            {tab === 'discipline' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">⚠️ Discipline Record</p>
                        {discipline.length === 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <FiCheckCircle size={12} /> Clean Record
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-gray-50">
                        {discipline.map((d, i) => (
                            <div key={i} className="px-5 py-4 hover:bg-red-50/30">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">{d.offense_description || d.description || 'Incident recorded'}</p>
                                        <p className="text-xs text-gray-400 mt-1">{d.action_taken ? `Action: ${d.action_taken}` : 'No action recorded'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-xs text-gray-500">{new Date(d.incident_date || d.created_at).toLocaleDateString('en-KE')}</p>
                                        {d.severity && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.severity === 'Severe' ? 'bg-red-100 text-red-700' : d.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {d.severity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {discipline.length === 0 && <div className="text-center py-12 text-gray-400">✅ No discipline incidents on record</div>}
                    </div>
                </div>
            )}

            {/* ══════════════ HOSTEL TAB ══════════════ */}
            {tab === 'hostel' && (
                <div className="space-y-4">
                    {hostelAlloc.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 text-gray-400">
                            <p className="text-4xl mb-3">🏠</p>
                            <p className="font-semibold">Not assigned to any dormitory</p>
                            <Link href="/dashboard/hostel" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
                                Go to Hostel Management →
                            </Link>
                        </div>
                    ) : (
                        hostelAlloc.map((h, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
                                            <FiHome size={22} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{h.school_hostels?.dorm_name || 'Dormitory'}</p>
                                            <p className="text-sm text-gray-500">Bed No: <span className="font-bold text-purple-700">#{h.bed_number}</span></p>
                                            <p className="text-xs text-gray-400 mt-0.5">{h.school_hostels?.gender} Dormitory · Allocated {new Date(h.allocation_date || h.created_at).toLocaleDateString('en-KE')}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${h.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {h.is_active ? 'Active' : 'Ended'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

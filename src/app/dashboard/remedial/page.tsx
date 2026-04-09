'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiDollarSign, FiPlus, FiList, FiBarChart2, FiDownload,
    FiUser, FiX, FiCheckCircle, FiClock, FiBookOpen, FiUsers, FiFilter
} from 'react-icons/fi';

type RemTab = 'pay' | 'statement' | 'reports' | 'balances';
const PAY_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'];

export default function RemedialPage() {
    const [tab, setTab] = useState<RemTab>('pay');
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pay form
    const [search, setSearch] = useState('');
    const [selStudent, setSelStudent] = useState<any>(null);
    const [selTermId, setSelTermId] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Cash');
    const [payReceipt, setPayReceipt] = useState('');
    const [payNotes, setPayNotes] = useState('');
    const [paying, setPaying] = useState(false);

    // Statement
    const [stmtSearch, setStmtSearch] = useState('');
    const [stmtStudent, setStmtStudent] = useState<any>(null);

    // Reports
    const [rptForm, setRptForm] = useState('');
    const [rptStream, setRptStream] = useState('');
    const [rptTerm, setRptTerm] = useState('');
    const [rptDateFrom, setRptDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [rptDateTo, setRptDateTo] = useState(new Date().toISOString().split('T')[0]);

    // Balances
    const [balForm, setBalForm] = useState('');
    const [balStream, setBalStream] = useState('');
    const [balTerm, setBalTerm] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, t, e, p] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_remedial_terms').select('*').order('year', { ascending: false }),
            supabase.from('school_remedial_enrollments').select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id), school_remedial_terms(id, term_name, year, fee_amount)').order('enrolled_at', { ascending: false }),
            supabase.from('school_remedial_payments').select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id), school_remedial_terms(id, term_name, year)').order('created_at', { ascending: false }),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setTerms(t.data || []);
        setEnrollments(e.data || []);
        setPayments(p.data || []);
        if (t.data?.length && !selTermId) setSelTermId(String(t.data[0].id));
        if (t.data?.length && !rptTerm) setRptTerm(String(t.data[0].id));
        if (t.data?.length && !balTerm) setBalTerm(String(t.data[0].id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredStudents = search.length >= 2 ? students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8) : [];

    const stmtFilteredStudents = stmtSearch.length >= 2 ? students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(stmtSearch.toLowerCase())
    ).slice(0, 8) : [];

    const getFormName = (fid: any) => forms.find(f => f.id === fid)?.form_name || '-';
    const getStreamName = (sid: any) => streams.find(s => s.id === sid)?.stream_name || '-';

    // Get student balance for a term
    const getStudentBalance = (studentId: number, termId: number) => {
        const enr = enrollments.find(e => e.student_id === studentId && e.remedial_term_id === termId);
        if (!enr) return null;
        const paid = payments.filter(p => p.student_id === studentId && p.remedial_term_id === termId).reduce((s, p) => s + Number(p.amount), 0);
        return { due: Number(enr.amount_due), paid, balance: Number(enr.amount_due) - paid };
    };

    const handleEnrollAndPay = async () => {
        if (!selStudent || !selTermId) { toast.error('Select student and term'); return; }
        const amt = Number(payAmount);
        if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
        setPaying(true);

        const termId = Number(selTermId);
        const term = terms.find(t => t.id === termId);

        // Auto-enroll if not enrolled
        const existing = enrollments.find(e => e.student_id === selStudent.id && e.remedial_term_id === termId);
        if (!existing) {
            const { error: enrErr } = await supabase.from('school_remedial_enrollments').insert([{
                student_id: selStudent.id, remedial_term_id: termId,
                amount_due: term?.fee_amount || 1500, created_by: 'admin'
            }]);
            if (enrErr && !enrErr.message.includes('duplicate')) {
                toast.error('Enrollment failed: ' + enrErr.message); setPaying(false); return;
            }
        }

        // Auto-generate receipt number
        const genReceipt = () => {
            const d = new Date();
            const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
            const rand = Math.floor(1000 + Math.random() * 9000);
            return `REM-${ds}-${rand}`;
        };
        const receiptNo = payReceipt || genReceipt();

        // Record payment
        const { error } = await supabase.from('school_remedial_payments').insert([{
            student_id: selStudent.id, remedial_term_id: termId, amount: amt,
            payment_method: payMethod, receipt_number: receiptNo,
            notes: payNotes || null, created_by: 'admin'
        }]);
        if (error) { toast.error('Payment failed: ' + error.message); setPaying(false); return; }

        toast.success(`KES ${amt.toLocaleString()} recorded for ${selStudent.first_name} ${selStudent.last_name}`);
        setPayAmount(''); setPayReceipt(''); setPayNotes('');
        setSelStudent(null); setSearch('');
        fetchAll(); setPaying(false);
    };

    // Statement data
    const stmtPayments = stmtStudent ? payments.filter(p => p.student_id === stmtStudent.id) : [];
    const stmtEnrollments = stmtStudent ? enrollments.filter(e => e.student_id === stmtStudent.id) : [];

    // Reports filtered payments
    const rptPayments = payments.filter(p => {
        if (rptTerm && p.remedial_term_id !== Number(rptTerm)) return false;
        const d = new Date(p.payment_date || p.created_at).toISOString().split('T')[0];
        if (d < rptDateFrom || d > rptDateTo) return false;
        const st = p.school_students;
        if (rptForm && st?.form_id !== Number(rptForm)) return false;
        if (rptStream && st?.stream_id !== Number(rptStream)) return false;
        return true;
    });
    const rptTotal = rptPayments.reduce((s, p) => s + Number(p.amount), 0);

    // Balances
    const balanceData = enrollments.filter(e => {
        if (balTerm && e.remedial_term_id !== Number(balTerm)) return false;
        const st = e.school_students;
        if (balForm && st?.form_id !== Number(balForm)) return false;
        if (balStream && st?.stream_id !== Number(balStream)) return false;
        return true;
    }).map(e => {
        const paid = payments.filter(p => p.student_id === e.student_id && p.remedial_term_id === e.remedial_term_id).reduce((s, p) => s + Number(p.amount), 0);
        return { ...e, paid, balance: Number(e.amount_due) - paid };
    });
    const totalDue = balanceData.reduce((s, b) => s + Number(b.amount_due), 0);
    const totalPaid = balanceData.reduce((s, b) => s + b.paid, 0);
    const totalBal = balanceData.reduce((s, b) => s + b.balance, 0);

    const exportCSV = (data: any[], filename: string, headers: string[], rowFn: (item: any, i: number) => any[]) => {
        const rows = data.map((d, i) => rowFn(d, i));
        const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = filename; a.click(); toast.success('Exported');
    };

    const TABS: { key: RemTab; label: string; icon: any }[] = [
        { key: 'pay', label: 'Record Payment', icon: FiDollarSign },
        { key: 'statement', label: 'Student Statement', icon: FiUser },
        { key: 'reports', label: 'Payment Reports', icon: FiBarChart2 },
        { key: 'balances', label: 'Balances', icon: FiList },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Remedial...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiBookOpen className="text-purple-500" /> Remedial Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage remedial fees, payments, statements &amp; balances</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold">
                        <FiUsers className="inline mr-1" size={14} /> {enrollments.length} Enrolled
                    </div>
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold">
                        KES {totalPaid.toLocaleString()} Collected
                    </div>
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-bold">
                        KES {totalBal.toLocaleString()} Pending
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            tab === t.key
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600'
                        }`}>
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {/* TAB: Record Payment */}
            {tab === 'pay' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                        <h3 className="font-bold text-lg flex items-center gap-2"><FiDollarSign size={18} /> Record Remedial Payment</h3>
                        <p className="text-purple-100 text-sm mt-1">Search student, select term, enter amount</p>
                    </div>

                    {/* Student Search */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Search Student *</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setSelStudent(null); }}
                                placeholder="Type admission number or student name..."
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                        </div>
                        {filteredStudents.length > 0 && !selStudent && (
                            <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                                {filteredStudents.map(s => (
                                    <button key={s.id} onClick={() => { setSelStudent(s); setSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 text-sm flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-800">{s.admission_number}</span>
                                            <span className="mx-2 text-gray-300">|</span>
                                            <span>{s.first_name} {s.last_name}</span>
                                            <span className="ml-2 text-xs text-gray-400">{getFormName(s.form_id)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Student + Balance */}
                    {selStudent && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                                    {selStudent.first_name?.charAt(0)}{selStudent.last_name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-lg">{selStudent.first_name} {selStudent.last_name}</h4>
                                    <div className="flex gap-4 text-sm text-gray-500 mt-0.5">
                                        <span><strong>Adm:</strong> {selStudent.admission_number}</span>
                                        <span><strong>Form:</strong> {getFormName(selStudent.form_id)}</span>
                                        <span><strong>Stream:</strong> {getStreamName(selStudent.stream_id)}</span>
                                    </div>
                                    {selTermId && (() => {
                                        const bal = getStudentBalance(selStudent.id, Number(selTermId));
                                        return bal ? (
                                            <div className="flex gap-4 text-xs mt-1">
                                                <span className="text-green-600 font-bold">Paid: KES {bal.paid.toLocaleString()}</span>
                                                <span className={`font-bold ${bal.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Balance: KES {bal.balance.toLocaleString()}</span>
                                            </div>
                                        ) : <p className="text-xs text-gray-400 mt-1">Not yet enrolled for this term (will auto-enroll)</p>;
                                    })()}
                                </div>
                                <button onClick={() => { setSelStudent(null); setSearch(''); }} className="text-gray-400 hover:text-red-500"><FiX size={18} /></button>
                            </div>
                        </div>
                    )}

                    {/* Term, Amount, Method */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Remedial Term *</label>
                            <select value={selTermId} onChange={e => setSelTermId(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year} (KES {Number(t.fee_amount).toLocaleString()})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Amount (KES) *</label>
                            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 1500"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Payment Method</label>
                            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none">
                                {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Receipt Number <span className="text-purple-400 normal-case">(auto-generated if blank)</span></label>
                            <input type="text" value={payReceipt} onChange={e => setPayReceipt(e.target.value)} placeholder="Leave blank to auto-generate (REM-YYYYMMDD-XXXX)"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Notes</label>
                            <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional notes"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                        </div>
                    </div>

                    <button onClick={handleEnrollAndPay} disabled={paying || !selStudent || !payAmount}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                        style={{ background: paying ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                        {paying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> :
                            <><FiCheckCircle size={16} /> Record Payment</>}
                    </button>
                </div>
            )}

            {/* TAB: Student Statement */}
            {tab === 'statement' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Search Student</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" value={stmtSearch} onChange={e => { setStmtSearch(e.target.value); setStmtStudent(null); }}
                                placeholder="Type admission number or name..."
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                        </div>
                        {stmtFilteredStudents.length > 0 && !stmtStudent && (
                            <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                                {stmtFilteredStudents.map(s => (
                                    <button key={s.id} onClick={() => { setStmtStudent(s); setStmtSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 text-sm">
                                        <span className="font-semibold">{s.admission_number}</span> | {s.first_name} {s.last_name} <span className="text-gray-400 text-xs ml-1">{getFormName(s.form_id)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {stmtStudent && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-purple-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold">{stmtStudent.first_name?.charAt(0)}{stmtStudent.last_name?.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{stmtStudent.first_name} {stmtStudent.last_name}</h3>
                                        <p className="text-xs text-gray-500">Adm: {stmtStudent.admission_number} | {getFormName(stmtStudent.form_id)} | {getStreamName(stmtStudent.stream_id)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary per term */}
                            {stmtEnrollments.length === 0 ? (
                                <div className="p-10 text-center text-gray-400">No remedial enrollments found for this student</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
                                        {stmtEnrollments.map(e => {
                                            const b = getStudentBalance(stmtStudent.id, e.remedial_term_id);
                                            const t = e.school_remedial_terms;
                                            return (
                                                <div key={e.id} className="border border-gray-200 rounded-xl p-3">
                                                    <p className="text-xs font-bold text-gray-500 uppercase">{t?.term_name} {t?.year}</p>
                                                    <div className="mt-2 space-y-1 text-sm">
                                                        <div className="flex justify-between"><span className="text-gray-400">Due:</span><span className="font-bold">KES {b?.due.toLocaleString()}</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-400">Paid:</span><span className="font-bold text-green-600">KES {b?.paid.toLocaleString()}</span></div>
                                                        <div className="flex justify-between border-t pt-1"><span className="text-gray-400">Balance:</span><span className={`font-bold ${(b?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>KES {b?.balance.toLocaleString()}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 border-t border-gray-100">
                                        <h4 className="font-bold text-gray-700 text-sm mb-3">Payment History</h4>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b">
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">#</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Date</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Term</th>
                                                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Amount</th>
                                                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Method</th>
                                                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Receipt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stmtPayments.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-gray-400">No payments recorded</td></tr> :
                                                    stmtPayments.map((p, i) => (
                                                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                                            <td className="px-3 py-2 text-xs">{new Date(p.payment_date || p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                            <td className="px-3 py-2 text-xs">{p.school_remedial_terms?.term_name} {p.school_remedial_terms?.year}</td>
                                                            <td className="px-3 py-2 text-right font-bold text-green-600">KES {Number(p.amount).toLocaleString()}</td>
                                                            <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{p.payment_method}</span></td>
                                                            <td className="px-3 py-2 text-xs text-gray-500">{p.receipt_number || '-'}</td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Payment Reports */}
            {tab === 'reports' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Term</label>
                                <select value={rptTerm} onChange={e => setRptTerm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none">
                                    <option value="">All Terms</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                                <select value={rptForm} onChange={e => setRptForm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none">
                                    <option value="">All Forms</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">From</label>
                                <input type="date" value={rptDateFrom} onChange={e => setRptDateFrom(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">To</label>
                                <input type="date" value={rptDateTo} onChange={e => setRptDateTo(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none" />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => exportCSV(rptPayments, `remedial_payments_${rptDateFrom}_${rptDateTo}.csv`,
                                    ['#', 'Date', 'Adm No', 'Student', 'Form', 'Term', 'Amount', 'Method', 'Receipt'],
                                    (p, i) => { const st = p.school_students; return [i+1, new Date(p.payment_date||p.created_at).toLocaleDateString(), st?.admission_number||'', st?`${st.first_name} ${st.last_name}`:'', getFormName(st?.form_id), `${p.school_remedial_terms?.term_name} ${p.school_remedial_terms?.year}`, p.amount, p.payment_method, p.receipt_number||'']; }
                                )} className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                                    <FiDownload size={14} /> Export
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-purple-700">{rptPayments.length}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Payments</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">KES {rptTotal.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Collected</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-700">{new Set(rptPayments.map(p => p.student_id)).size}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Unique Students</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiList size={16} /> Payment Records</h3>
                            <span className="text-xs text-gray-500">{rptPayments.length} record(s)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        {['#','Date','Adm No','Student','Form','Term','Amount','Method','Receipt'].map(h => (
                                            <th key={h} className={`px-3 py-2.5 text-xs font-bold text-gray-500 uppercase ${h==='Amount'?'text-right':'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rptPayments.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">No payments found</td></tr> :
                                        rptPayments.map((p, i) => {
                                            const st = p.school_students;
                                            return (
                                                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                                                    <td className="px-3 py-2 text-xs">{new Date(p.payment_date||p.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                                    <td className="px-3 py-2 font-semibold text-blue-600">{st?.admission_number||'-'}</td>
                                                    <td className="px-3 py-2 font-medium">{st?`${st.first_name} ${st.last_name}`:'-'}</td>
                                                    <td className="px-3 py-2 text-xs">{getFormName(st?.form_id)}</td>
                                                    <td className="px-3 py-2 text-xs">{p.school_remedial_terms?.term_name} {p.school_remedial_terms?.year}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-green-600">KES {Number(p.amount).toLocaleString()}</td>
                                                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{p.payment_method}</span></td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{p.receipt_number||'-'}</td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Balances */}
            {tab === 'balances' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Term</label>
                                <select value={balTerm} onChange={e => setBalTerm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none">
                                    <option value="">All Terms</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                                <select value={balForm} onChange={e => setBalForm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none">
                                    <option value="">All Forms</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                                <select value={balStream} onChange={e => setBalStream(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none">
                                    <option value="">All Streams</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => exportCSV(balanceData, 'remedial_balances.csv',
                                    ['#', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Due', 'Paid', 'Balance'],
                                    (b, i) => { const st = b.school_students; const t = b.school_remedial_terms; return [i+1, st?.admission_number||'', st?`${st.first_name} ${st.last_name}`:'', getFormName(st?.form_id), getStreamName(st?.stream_id), `${t?.term_name} ${t?.year}`, b.amount_due, b.paid, b.balance]; }
                                )} className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                                    <FiDownload size={14} /> Export
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-xl font-bold text-gray-700">KES {totalDue.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Due</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-xl font-bold text-green-600">KES {totalPaid.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Paid</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-xl font-bold text-red-600">KES {totalBal.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Balance</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiList size={16} /> Student Balances</h3>
                            <span className="text-xs text-gray-500">{balanceData.length} student(s)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        {['#','Adm No','Student','Form','Stream','Term','Due','Paid','Balance'].map(h => (
                                            <th key={h} className={`px-3 py-2.5 text-xs font-bold text-gray-500 uppercase ${['Due','Paid','Balance'].includes(h)?'text-right':'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {balanceData.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">No enrollments found</td></tr> :
                                        balanceData.map((b, i) => {
                                            const st = b.school_students;
                                            const t = b.school_remedial_terms;
                                            return (
                                                <tr key={b.id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${b.balance > 0 ? '' : 'bg-green-50/30'}`}>
                                                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                                                    <td className="px-3 py-2 font-semibold text-blue-600">{st?.admission_number||'-'}</td>
                                                    <td className="px-3 py-2 font-medium">{st?`${st.first_name} ${st.last_name}`:'-'}</td>
                                                    <td className="px-3 py-2 text-xs">{getFormName(st?.form_id)}</td>
                                                    <td className="px-3 py-2 text-xs">{getStreamName(st?.stream_id)}</td>
                                                    <td className="px-3 py-2 text-xs">{t?.term_name} {t?.year}</td>
                                                    <td className="px-3 py-2 text-right font-bold">KES {Number(b.amount_due).toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-green-600">KES {b.paid.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-right"><span className={`font-bold ${b.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>KES {b.balance.toLocaleString()}</span></td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                                {balanceData.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-100 font-bold">
                                            <td colSpan={6} className="px-3 py-2.5 text-right text-xs uppercase text-gray-600">Totals:</td>
                                            <td className="px-3 py-2.5 text-right text-sm">KES {totalDue.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-right text-sm text-green-600">KES {totalPaid.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-right text-sm text-red-600">KES {totalBal.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

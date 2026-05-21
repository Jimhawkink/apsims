'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiFileText, FiSearch, FiPrinter, FiDownload, FiRefreshCw,
    FiTrash2, FiX, FiCheckCircle, FiAlertTriangle, FiCopy,
    FiSend, FiHash, FiUser, FiDollarSign
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;

// Number to words (for receipt amount in words)
const toWords = (n: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    const num = Math.floor(n);
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + toWords(num % 100) : '');
    if (num < 1000000) return toWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + toWords(num % 1000) : '');
    return toWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + toWords(num % 1000000) : '');
};

type Tab = 'generate' | 'register' | 'void';

export default function ReceiptsPage() {
    const [tab, setTab] = useState<Tab>('generate');
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [school, setSchool] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [selStudent, setSelStudent] = useState<any>(null);
    const [selPayment, setSelPayment] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [voidSearch, setVoidSearch] = useState('');
    const [voidReason, setVoidReason] = useState('');
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [selReceipt, setSelReceipt] = useState<any>(null);
    const [regSearch, setRegSearch] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, pRes, rRes, fRes, sdRes] = await Promise.all([
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, guardian_name, guardian_phone, status').eq('status', 'Active'),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_receipts').select('*').order('created_at', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_details').select('*').limit(1).maybeSingle(),
        ]);
        setStudents(sRes.data || []);
        setPayments(pRes.data || []);
        setReceipts(rRes.data || []);
        setForms(fRes.data || []);
        setSchool(sdRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Generate receipt number
    const genReceiptNo = () => {
        const year = new Date().getFullYear();
        const nextNum = (receipts.length + 1).toString().padStart(5, '0');
        return `RCT-${year}-${nextNum}`;
    };

    // Search students
    const searchResults = useMemo(() => {
        if (!search) return [];
        const s = search.toLowerCase();
        return students.filter(st =>
            `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
            (st.admission_number || st.admission_no || '').toLowerCase().includes(s)
        ).slice(0, 15);
    }, [students, search]);

    // Student payments (last 10)
    const studentPayments = useMemo(() => {
        if (!selStudent) return [];
        return payments.filter(p => p.student_id === selStudent.id).slice(0, 10);
    }, [selStudent, payments]);

    // Check if receipt already exists for payment
    const hasReceipt = (paymentId: number) => receipts.some(r => r.payment_id === paymentId && r.status !== 'Voided');

    // Generate receipt
    const generateReceipt = async () => {
        if (!selPayment || !selStudent) return;
        if (hasReceipt(selPayment.id)) { toast.error('Receipt already exists for this payment'); return; }

        const receiptNo = genReceiptNo();
        const amount = Number(selPayment.amount || 0);
        const { error } = await supabase.from('school_fee_receipts').insert([{
            receipt_number: receiptNo,
            payment_id: selPayment.id,
            student_id: selStudent.id,
            amount,
            amount_words: toWords(amount) + ' Shillings Only',
            status: 'Issued',
            created_by: 'Bursar',
        }]);
        if (error) { toast.error('Failed to generate receipt'); return; }
        toast.success(`Receipt ${receiptNo} generated ✅`);
        setShowPreview(true);
        fetchAll();
    };

    // Void receipt
    const handleVoid = async () => {
        if (!selReceipt || !voidReason) { toast.error('Enter void reason'); return; }
        const { error } = await supabase.from('school_fee_receipts')
            .update({ status: 'Voided', voided_by: 'Admin', void_reason: voidReason, voided_at: new Date().toISOString() })
            .eq('id', selReceipt.id);
        if (error) { toast.error('Failed to void'); return; }
        toast.success('Receipt voided ✅');
        setShowVoidModal(false);
        setSelReceipt(null);
        setVoidReason('');
        fetchAll();
    };

    // Stats
    const totalReceipts = receipts.filter(r => r.status === 'Issued').length;
    const todayReceipts = receipts.filter(r => r.status === 'Issued' && new Date(r.created_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length;
    const totalAmount = receipts.filter(r => r.status === 'Issued').reduce((s, r) => s + Number(r.amount || 0), 0);
    const voidedCount = receipts.filter(r => r.status === 'Voided').length;

    // Filtered receipts for register
    const filteredReceipts = useMemo(() => {
        if (!regSearch) return receipts;
        const s = regSearch.toLowerCase();
        return receipts.filter(r => {
            const student = students.find(st => st.id === r.student_id);
            return (r.receipt_number || '').toLowerCase().includes(s) ||
                (student ? `${student.first_name} ${student.last_name}`.toLowerCase().includes(s) : false);
        });
    }, [receipts, regSearch, students]);

    const getFormName = (formId: number) => forms.find(f => f.id === formId)?.form_name || '-';
    const getStudent = (id: number) => students.find(s => s.id === id);

    const tabConfig = [
        { k: 'generate', l: '🧾 Generate Receipt', icon: FiFileText },
        { k: 'register', l: '📋 Receipt Register', icon: FiHash },
        { k: 'void', l: '🔒 Void / Reprint', icon: FiTrash2 },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>🧾</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-amber-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Receipts…</p>
        </div>
    );

    // Receipt preview component
    const ReceiptPreview = () => {
        if (!selStudent || !selPayment) return null;
        const amount = Number(selPayment.amount || 0);
        const receipt = receipts.find(r => r.payment_id === selPayment.id && r.status === 'Issued');
        const receiptNo = receipt?.receipt_number || genReceiptNo();
        const studentBalance = payments.filter(p => p.student_id === selStudent.id).reduce((s, p) => s + Number(p.amount || 0), 0);

        return (
            <div className="bg-white rounded-2xl border-2 border-gray-300 p-8 max-w-[600px] mx-auto shadow-xl print-area" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                <style jsx global>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } @page { margin: 10mm; } }`}</style>

                {/* Header */}
                <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
                    {school?.logo_url && <img src={school.logo_url} alt="Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />}
                    <h2 className="text-xl font-black uppercase tracking-wider">{school?.school_name || 'ALPHA SCHOOL'}</h2>
                    {school?.motto && <p className="text-xs italic text-gray-500">"{school.motto}"</p>}
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mt-1">
                        {school?.postal_address && <span>P.O. Box {school.postal_address}</span>}
                        {school?.phone1 && <span>📞 {school.phone1}</span>}
                    </div>
                    {school?.kra_pin && <p className="text-[10px] text-gray-400 mt-1">KRA PIN: {school.kra_pin}</p>}
                </div>

                <div className="text-center mb-4">
                    <h3 className="text-lg font-black uppercase tracking-widest text-indigo-800 border-2 border-indigo-200 inline-block px-6 py-1 rounded-lg bg-indigo-50">OFFICIAL RECEIPT</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-4">
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Receipt No:</span><span className="font-black text-indigo-700">{receiptNo}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Date:</span><span className="font-bold">{new Date(selPayment.payment_date || selPayment.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Student:</span><span className="font-bold">{selStudent.first_name} {selStudent.last_name}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Adm No:</span><span className="font-bold">{selStudent.admission_number || selStudent.admission_no}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Class:</span><span className="font-bold">{getFormName(selStudent.form_id)}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 font-semibold">Method:</span><span className="font-bold">{selPayment.payment_method || 'Cash'}</span></div>
                    {selPayment.receipt_number && <div className="col-span-2 flex gap-2"><span className="text-gray-500 font-semibold">Ref/Trans ID:</span><span className="font-mono text-xs">{selPayment.receipt_number}</span></div>}
                </div>

                {/* Amount Box */}
                <div className="border-2 border-gray-800 rounded-xl p-4 mb-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-600">Amount Received:</span>
                        <span className="text-2xl font-black text-green-700">{fmt(amount)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2">
                        <p className="text-xs text-gray-500"><span className="font-semibold">In Words:</span> <span className="italic font-bold">{toWords(amount)} Shillings Only</span></p>
                    </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t border-gray-300">
                    <div className="text-center">
                        <div className="border-b border-gray-400 pb-6 mb-1" />
                        <p className="text-xs text-gray-500 font-semibold">Received By (Bursar)</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-gray-400 pb-6 mb-1" />
                        <p className="text-xs text-gray-500 font-semibold">Official Stamp</p>
                    </div>
                </div>

                <p className="text-center text-[9px] text-gray-400 mt-4">This is a computer-generated receipt • APSIMS School Management System</p>

                {/* Action buttons (no-print) */}
                <div className="flex items-center justify-center gap-3 mt-4 no-print">
                    <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <FiPrinter size={13} /> Print Receipt
                    </button>
                    <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-1.5">
                        <FiX size={13} /> Close
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #451a03 0%, #78350f 40%, #92400e 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <FiFileText className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                🧾 Professional Receipts
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">KRA-COMPLIANT</span>
                            </h1>
                            <p className="text-amber-300 text-xs mt-0.5 font-medium">Receipt Generation • Register • Void/Reprint • Audit Trail</p>
                        </div>
                    </div>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                        <FiRefreshCw size={13} /> Refresh
                    </button>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                            { label: 'Total Receipts', value: String(totalReceipts), emoji: '🧾', color: '#f59e0b' },
                            { label: "Today's Receipts", value: String(todayReceipts), emoji: '📅', color: '#22c55e' },
                            { label: 'Total Receipted', value: fmt(totalAmount), emoji: '💰', color: '#6366f1' },
                            { label: 'Voided', value: String(voidedCount), emoji: '🔴', color: '#ef4444', pulse: voidedCount > 0 },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={isActive ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            <Icon size={15} /> <span>{t.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* Receipt Preview Overlay */}
            {showPreview && <ReceiptPreview />}

            {/* ═══ GENERATE RECEIPT TAB ═══ */}
            {tab === 'generate' && !showPreview && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Student Search */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-amber-50"><p className="text-xs font-bold text-amber-700">🔍 Search Student</p></div>
                        <div className="p-4">
                            <div className="relative mb-3"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setSelStudent(null); setSelPayment(null); }} placeholder="Name or admission number..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none" /></div>
                            <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                                {searchResults.map(st => (
                                    <div key={st.id} onClick={() => { setSelStudent(st); setSearch(''); setSelPayment(null); }}
                                        className={`py-3 px-2 cursor-pointer hover:bg-amber-50 rounded-lg transition-all ${selStudent?.id === st.id ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}>
                                        <p className="text-sm font-semibold text-gray-800">{st.first_name} {st.last_name}</p>
                                        <p className="text-[10px] text-gray-400">{st.admission_number || st.admission_no} • {getFormName(st.form_id)}</p>
                                    </div>
                                ))}
                            </div>
                            {selStudent && (
                                <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                                    <p className="text-xs font-bold text-indigo-800">Selected: {selStudent.first_name} {selStudent.last_name}</p>
                                    <p className="text-[10px] text-indigo-600">{selStudent.admission_number || selStudent.admission_no} • {getFormName(selStudent.form_id)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-green-50"><p className="text-xs font-bold text-green-700">💳 Recent Payments ({studentPayments.length})</p></div>
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                            {!selStudent ? (
                                <div className="p-10 text-center text-gray-400"><span className="text-3xl block mb-2">👈</span><p className="text-sm">Search and select a student first</p></div>
                            ) : studentPayments.length === 0 ? (
                                <div className="p-10 text-center text-gray-400"><p className="text-sm">No payments found</p></div>
                            ) : studentPayments.map(p => {
                                const receiptExists = hasReceipt(p.id);
                                return (
                                    <div key={p.id} onClick={() => !receiptExists && setSelPayment(p)}
                                        className={`px-5 py-3 cursor-pointer transition-all ${receiptExists ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'} ${selPayment?.id === p.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{fmt(p.amount)}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })} • {p.payment_method || 'Cash'}</p>
                                            </div>
                                            {receiptExists ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><FiCheckCircle size={10} /> Receipted</span>
                                            ) : selPayment?.id === p.id ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Selected</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {selPayment && !hasReceipt(selPayment.id) && (
                            <div className="p-4 border-t border-gray-100">
                                <button onClick={generateReceipt} className="w-full px-4 py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                    <FiFileText size={16} /> Generate Receipt for {fmt(selPayment.amount)}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ RECEIPT REGISTER TAB ═══ */}
            {tab === 'register' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">📋 Receipt Register ({filteredReceipts.length})</p>
                        <div className="flex items-center gap-2">
                            <div className="relative"><FiSearch size={12} className="absolute left-3 top-2.5 text-gray-400" /><input value={regSearch} onChange={e => setRegSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-200 outline-none w-48" /></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                {['Receipt #', 'Date', 'Student', 'Amount', 'Method', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filteredReceipts.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🧾</span><p className="text-sm">No receipts yet</p></td></tr>
                                ) : filteredReceipts.map(r => {
                                    const student = getStudent(r.student_id);
                                    const payment = payments.find(p => p.id === r.payment_id);
                                    return (
                                        <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${r.status === 'Voided' ? 'opacity-50 line-through' : ''}`}>
                                            <td className="px-4 py-2.5 text-xs font-mono font-bold text-indigo-600">{r.receipt_number}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : '-'}</td>
                                            <td className="px-4 py-2.5 text-sm font-bold text-green-600">{fmt(r.amount)}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{payment?.payment_method || '-'}</td>
                                            <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'Issued' ? 'bg-green-100 text-green-700' : r.status === 'Voided' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span></td>
                                            <td className="px-4 py-2.5 flex items-center gap-1">
                                                <button onClick={() => { setSelStudent(student); setSelPayment(payment); setShowPreview(true); setTab('generate'); }} className="p-1.5 rounded-lg hover:bg-gray-100"><FiPrinter size={12} className="text-gray-500" /></button>
                                                {r.status === 'Issued' && <button onClick={() => { setSelReceipt(r); setShowVoidModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50"><FiTrash2 size={12} className="text-red-500" /></button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ VOID/REPRINT TAB ═══ */}
            {tab === 'void' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">🔍 Search Receipt to Void or Reprint</p>
                    <div className="relative mb-4"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={voidSearch} onChange={e => setVoidSearch(e.target.value)} placeholder="Receipt number (e.g. RCT-2026-00001)..." className="w-full sm:w-96 pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none" /></div>
                    {voidSearch && (
                        <div className="divide-y divide-gray-100">
                            {receipts.filter(r => (r.receipt_number || '').toLowerCase().includes(voidSearch.toLowerCase())).map(r => {
                                const student = getStudent(r.student_id);
                                return (
                                    <div key={r.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{r.receipt_number}</p>
                                            <p className="text-xs text-gray-500">{student ? `${student.first_name} ${student.last_name}` : '-'} • {fmt(r.amount)} • {new Date(r.created_at).toLocaleDateString('en-KE')}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'Issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                                            {r.void_reason && <p className="text-[10px] text-red-500 mt-1">Void reason: {r.void_reason}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => { setSelStudent(student); const payment = payments.find(p => p.id === r.payment_id); setSelPayment(payment); setShowPreview(true); setTab('generate'); }}
                                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-1"><FiPrinter size={11} /> Reprint</button>
                                            {r.status === 'Issued' && <button onClick={() => { setSelReceipt(r); setShowVoidModal(true); }}
                                                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"><FiTrash2 size={11} /> Void</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && selReceipt && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowVoidModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-extrabold text-red-700 mb-4 flex items-center gap-2"><FiAlertTriangle /> Void Receipt</h3>
                        <p className="text-sm text-gray-600 mb-3">Are you sure you want to void <strong>{selReceipt.receipt_number}</strong> for {fmt(selReceipt.amount)}?</p>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Reason for voiding *</label>
                        <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Enter reason..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowVoidModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleVoid} disabled={!voidReason} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-40">Void Receipt</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

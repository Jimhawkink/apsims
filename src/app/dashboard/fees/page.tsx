'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiPlus, FiDownload, FiX, FiSave, FiDollarSign, FiAlertTriangle, FiEdit2, FiTrash2, FiChevronDown, FiCreditCard, FiUsers, FiClipboard, FiGrid } from 'react-icons/fi';

export default function FeesPage() {
    const [tab, setTab] = useState<'collect' | 'outstanding' | 'payments' | 'structure'>('collect');
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Collect tab
    const [searchAdm, setSearchAdm] = useState('');
    const [foundStudent, setFoundStudent] = useState<any>(null);
    const [studentPayments, setStudentPayments] = useState<any[]>([]);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Cash');
    const [payRef, setPayRef] = useState('');
    const [showPayModal, setShowPayModal] = useState(false);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [bankRef, setBankRef] = useState('');
    const [inKindItem, setInKindItem] = useState('');
    const [inKindValue, setInKindValue] = useState('');
    const [editPayId, setEditPayId] = useState<number | null>(null);
    // Outstanding filter
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    // Fee Structure
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editFeeId, setEditFeeId] = useState<number | null>(null);
    const [feeForm, setFeeForm] = useState<any>({ category: '', amount: '', term_id: '', form_id: '', description: '', year: new Date().getFullYear() });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, s, p, fs, t] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setStudents(s.data || []);
        setPayments(p.data || []);
        setStructures(fs.data || []);
        setTerms(t.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const currentTerm = terms.find(t => t.is_current);

    /* ============================================
     * CORRECTED FEE CALCULATION
     * Annual = sum of ALL terms for the student's form
     * Term = sum of current term fees for the student's form
     * ============================================ */
    const getStudentFees = (studentId: number, formId?: number) => {
        const studentPays = payments.filter(p => p.student_id === studentId);
        const totalPaid = studentPays.reduce((s, p) => s + Number(p.amount || 0), 0);

        // Filter structures that apply to this student's form (form-specific OR all forms)
        const applicableFees = formId
            ? structures.filter(f => !f.form_id || f.form_id === formId)
            : structures;

        // Term total: fees for the current term that apply to this student
        const termFees = applicableFees.filter(f =>
            currentTerm ? (!f.term_id || f.term_id === currentTerm.id) : true
        );
        const termTotal = termFees.reduce((s, f) => s + Number(f.amount || 0), 0);

        // Annual total: ALL fees across ALL terms that apply to this student's form
        const annualTotal = applicableFees.reduce((s, f) => s + Number(f.amount || 0), 0);

        return {
            totalPaid,
            termTotal,
            termBalance: Math.max(0, termTotal - totalPaid),
            annualTotal,
            annualBalance: Math.max(0, annualTotal - totalPaid),
            arrears: totalPaid < termTotal ? termTotal - totalPaid : 0,
            overpayment: totalPaid > annualTotal ? totalPaid - annualTotal : 0,
        };
    };

    // Search student by admission number
    const searchStudent = () => {
        if (!searchAdm.trim()) { toast.error('Enter an admission number'); return; }
        const s = students.find(st =>
            (st.admission_no || st.admission_number || '').toString().toLowerCase() === searchAdm.trim().toLowerCase()
        );
        if (!s) { toast.error('Student not found'); setFoundStudent(null); return; }
        setFoundStudent(s);
        setStudentPayments(payments.filter(p => p.student_id === s.id));
    };

    // Auto-generate APSIMS receipt number
    const genReceipt = () => {
        const nextNum = payments.length + 1;
        return `APSIMS-${String(nextNum).padStart(3, '0')}`;
    };

    const handlePayFee = async () => {
        if (!foundStudent || !payAmount || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
        const method = payMethod === 'In-Kind' ? `In-Kind (${inKindItem || 'Other'})` : payMethod;
        const ref = payMethod === 'M-Pesa' ? mpesaPhone : payMethod === 'Bank Transfer' ? bankRef : payRef;
        const payload = {
            student_id: foundStudent.id,
            amount: payMethod === 'In-Kind' ? Number(inKindValue || payAmount) : Number(payAmount),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: method,
            receipt_number: genReceipt(),
            reference_number: ref || null,
            term_id: currentTerm?.id || null,
            year: new Date().getFullYear(),
            notes: payMethod === 'In-Kind' ? `In-Kind: ${inKindItem} valued at KES ${inKindValue || payAmount}` : null,
        };
        let error;
        if (editPayId) {
            ({ error } = await supabase.from('school_fee_payments').update(payload).eq('id', editPayId));
        } else {
            ({ error } = await supabase.from('school_fee_payments').insert([payload]));
        }
        if (error) { toast.error(error.message); return; }
        const receiptNo = genReceipt();
        toast.success(editPayId ? 'Payment updated ✅' : `${fmt(Number(payAmount))} recorded — ${receiptNo} ✅`);

        // Send SMS to parent/guardian (non-blocking)
        if (!editPayId && foundStudent.guardian_phone) {
            const fees = getStudentFees(foundStudent.id, foundStudent.form_id);
            const admNo = foundStudent.admission_no || foundStudent.admission_number || '';
            const smsMessage = [
                `Dear Parent,`,
                ``,
                `📋 APSIMS FEE RECEIPT`,
                `━━━━━━━━━━━━━━━━━`,
                `Student: ${foundStudent.first_name} ${foundStudent.last_name}`,
                `Adm No: ${admNo}`,
                `Amount Paid: KES ${Number(payAmount).toLocaleString()}`,
                `Receipt No: ${receiptNo}`,
                `Method: ${method}`,
                `Term Balance: KES ${Math.max(0, fees.termBalance - Number(payAmount)).toLocaleString()}`,
                `Annual Balance: KES ${Math.max(0, fees.annualBalance - Number(payAmount)).toLocaleString()}`,
                `Date: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`,
                `━━━━━━━━━━━━━━━━━`,
                `Thank you for your payment.`,
            ].join('\n');

            fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: foundStudent.guardian_phone, message: smsMessage }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        toast.success(`📱 SMS sent to ${foundStudent.guardian_phone}`, { duration: 4000 });
                    } else {
                        toast.error(`SMS failed: ${data.error || 'Unknown error'}`, { duration: 4000 });
                    }
                })
                .catch(() => toast('⚠️ SMS could not be sent', { duration: 3000 }));
        }

        setPayAmount(''); setPayRef(''); setMpesaPhone(''); setBankRef(''); setInKindItem(''); setInKindValue(''); setEditPayId(null); setShowPayModal(false);
        fetchAll();
        setTimeout(() => { searchStudent(); }, 500);
    };

    const handleDeletePayment = async (id: number) => {
        if (!confirm('Delete this payment record?')) return;
        await supabase.from('school_fee_payments').delete().eq('id', id);
        toast.success('Payment deleted');
        fetchAll();
        setTimeout(() => { if (foundStudent) searchStudent(); }, 500);
    };

    const openEditPayment = (p: any) => {
        setEditPayId(p.id);
        setPayAmount(String(p.amount));
        const m = (p.payment_method || '').startsWith('In-Kind') ? 'In-Kind' : p.payment_method;
        setPayMethod(m);
        setPayRef(p.receipt_number || '');
        setMpesaPhone(m === 'M-Pesa' ? (p.reference_number || '') : '');
        setBankRef(m === 'Bank Transfer' ? (p.reference_number || '') : '');
        if (m === 'In-Kind') { const match = (p.notes || '').match(/In-Kind: (.+) valued/); setInKindItem(match?.[1] || ''); setInKindValue(String(p.amount)); }
        setShowPayModal(true);
    };

    // Outstanding students
    const outstandingStudents = students
        .filter(s => s.status === 'Active')
        .filter(s => !filterForm || String(s.form_id) === filterForm)
        .filter(s => !filterStream || String(s.stream_id) === filterStream)
        .map(s => ({ ...s, ...getStudentFees(s.id, s.form_id) }))
        .filter(s => s.termBalance > 0 || s.annualBalance > 0)
        .sort((a, b) => b.annualBalance - a.annualBalance);

    // Export outstanding to CSV
    const exportOutstanding = () => {
        const headers = ['Adm No', 'Name', 'Form', 'Stream', 'Total Paid', 'Term Balance', 'Annual Balance', 'Arrears'];
        const rows = outstandingStudents.map(s => [
            s.admission_no || s.admission_number, `${s.first_name} ${s.last_name}`,
            getFormName(s.form_id), getStreamName(s.stream_id),
            s.totalPaid, s.termBalance, s.annualBalance, s.arrears,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `outstanding_fees_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported ✅');
    };

    // Upload fee balances from CSV
    const handleImportBalances = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const text = await file.text();
        const lines = text.split('\n').filter(Boolean);
        if (lines.length < 2) { toast.error('Empty file'); return; }
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const admIdx = headers.findIndex(h => h.includes('adm'));
        const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('balance') || h.includes('paid'));
        if (admIdx < 0 || amtIdx < 0) { toast.error('CSV must have admission number and amount columns'); return; }
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            const admNo = cols[admIdx]; const amount = Number(cols[amtIdx]);
            if (!admNo || isNaN(amount) || amount <= 0) continue;
            const student = students.find(s => (s.admission_no || s.admission_number || '') == admNo);
            if (!student) continue;
            const { error } = await supabase.from('school_fee_payments').insert([{
                student_id: student.id, amount, payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'Imported', receipt_number: `IMP-${Date.now().toString().slice(-6)}-${i}`,
                term_id: currentTerm?.id || null, year: new Date().getFullYear(),
            }]);
            if (!error) imported++;
        }
        toast.success(`${imported} records imported ✅`);
        fetchAll();
    };

    // Fee Structure handlers
    const openAddFee = () => {
        setEditFeeId(null);
        setFeeForm({ category: '', amount: '', term_id: currentTerm?.id || '', form_id: '', description: '', year: new Date().getFullYear() });
        setShowFeeModal(true);
    };
    const openEditFee = (item: any) => {
        setEditFeeId(item.id);
        setFeeForm({ category: item.category, amount: String(item.amount), term_id: item.term_id || '', form_id: item.form_id || '', description: item.description || '', year: item.year || new Date().getFullYear() });
        setShowFeeModal(true);
    };
    const handleSaveFee = async () => {
        if (!feeForm.category?.trim()) { toast.error('Select a fee category'); return; }
        if (!feeForm.amount || Number(feeForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        const payload = {
            category: feeForm.category.trim(),
            amount: Number(feeForm.amount),
            term_id: feeForm.term_id ? Number(feeForm.term_id) : null,
            form_id: feeForm.form_id ? Number(feeForm.form_id) : null,
            description: feeForm.description || null,
            year: Number(feeForm.year) || new Date().getFullYear(),
        };
        let error;
        if (editFeeId) {
            ({ error } = await supabase.from('school_fee_structures').update(payload).eq('id', editFeeId));
        } else {
            ({ error } = await supabase.from('school_fee_structures').insert([payload]));
        }
        if (error) { toast.error(error.message); return; }
        toast.success(editFeeId ? 'Fee updated ✅' : 'Fee added ✅');
        setShowFeeModal(false);
        fetchAll();
    };
    const handleDeleteFee = async (id: number) => {
        if (!confirm('Delete this fee item?')) return;
        await supabase.from('school_fee_structures').delete().eq('id', id);
        toast.success('Deleted');
        fetchAll();
    };

    const tabs = [
        { key: 'collect' as const, label: 'Collect Fee', icon: <FiCreditCard size={15} /> },
        { key: 'outstanding' as const, label: 'Outstanding Fees', icon: <FiUsers size={15} /> },
        { key: 'payments' as const, label: 'Payment History', icon: <FiClipboard size={15} /> },
        { key: 'structure' as const, label: 'Fee Structure', icon: <FiGrid size={15} /> },
    ];

    // Styles
    const cardStyle = 'bg-white border border-gray-100 shadow-sm';
    const thStyle = 'px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider';
    const tdStyle = 'px-4 py-3.5 text-sm';
    const btnPrimary = 'px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200';
    const gradientPurple = 'linear-gradient(135deg, #7c3aed, #4f46e5)';

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: gradientPurple }}>
                            <FiDollarSign size={18} />
                        </span>
                        Fees & Accounts
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-12">Collect fees, track balances, and manage fee structures</p>
                </div>
                {currentTerm && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-indigo-700">{currentTerm.term_name} {currentTerm.academic_year || currentTerm.year || ''}</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-50/80 rounded-xl p-1 border border-gray-100">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${tab === t.key
                            ? 'text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                            }`}
                        style={tab === t.key ? { background: gradientPurple } : {}}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
                    <span className="text-xs text-gray-400 font-medium">Loading fee data...</span>
                </div>
            ) : (
                <>
                    {/* ═══════════════ COLLECT FEE ═══════════════ */}
                    {tab === 'collect' && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                            {/* Left Panel */}
                            <div className="lg:col-span-2 space-y-4">
                                {/* Search Card */}
                                <div className={`${cardStyle} rounded-xl p-5`}>
                                    <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><FiSearch size={14} className="text-indigo-500" /> Find Student</h3>
                                    <div className="flex gap-2">
                                        <input type="text" value={searchAdm} onChange={e => setSearchAdm(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && searchStudent()}
                                            placeholder="Admission number..."
                                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-indigo-400 outline-none transition-all bg-gray-50 focus:bg-white" />
                                        <button onClick={searchStudent} className="px-4 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all" style={{ background: gradientPurple }}>
                                            <FiSearch size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Student Profile Card */}
                                {foundStudent && (() => {
                                    const fees = getStudentFees(foundStudent.id, foundStudent.form_id);
                                    return (
                                        <div className={`${cardStyle} rounded-xl overflow-hidden`}>
                                            {/* Student header */}
                                            <div className="p-5 border-b border-gray-50" style={{ background: 'linear-gradient(135deg, #f8faff, #eef2ff)' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg" style={{ background: gradientPurple }}>
                                                        {foundStudent.first_name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-base">{foundStudent.first_name} {foundStudent.other_name || foundStudent.middle_name || ''} {foundStudent.last_name}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">{foundStudent.admission_no || foundStudent.admission_number}</span>
                                                            <span>{getFormName(foundStudent.form_id)} • {getStreamName(foundStudent.stream_id)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fee Summary Grid */}
                                            <div className="p-4 grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Total Paid</p>
                                                    <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{fmt(fees.totalPaid)}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
                                                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Term Fees</p>
                                                    <p className="text-lg font-extrabold text-orange-700 mt-0.5">{fmt(fees.termTotal)}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 border border-red-100">
                                                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Term Balance</p>
                                                    <p className="text-lg font-extrabold text-red-700 mt-0.5">{fmt(fees.termBalance)}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Annual Total</p>
                                                    <p className="text-lg font-extrabold text-blue-700 mt-0.5">{fmt(fees.annualTotal)}</p>
                                                </div>
                                                <div className="col-span-2 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Annual Balance</p>
                                                        <p className="text-xl font-extrabold text-purple-700 mt-0.5">{fmt(fees.annualBalance)}</p>
                                                    </div>
                                                    {fees.overpayment > 0 && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">+{fmt(fees.overpayment)} overpaid</span>}
                                                </div>
                                            </div>

                                            {/* Record Payment Button */}
                                            <div className="px-4 pb-4">
                                                <button onClick={() => setShowPayModal(true)} className={`${btnPrimary} w-full flex items-center justify-center gap-2 rounded-lg`} style={{ background: gradientPurple }}>
                                                    <FiCreditCard size={15} /> Record Payment
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Right Panel: Student Payment History */}
                            <div className="lg:col-span-3">
                                <div className={`${cardStyle} rounded-xl overflow-hidden`}>
                                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiClipboard size={14} className="text-indigo-500" /> {foundStudent ? `Payment History — ${foundStudent.first_name} ${foundStudent.last_name}` : 'Payment History'}</h3>
                                        {foundStudent && studentPayments.length > 0 && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{studentPayments.length} records</span>}
                                    </div>
                                    {!foundStudent ? (
                                        <div className="text-center py-20 text-gray-300"><FiSearch size={40} className="mx-auto mb-3 opacity-50" /><p className="text-sm font-medium">Search for a student to view their payment history</p></div>
                                    ) : studentPayments.length === 0 ? (
                                        <div className="text-center py-20 text-gray-300"><FiClipboard size={40} className="mx-auto mb-3 opacity-50" /><p className="text-sm font-medium">No payments recorded yet</p></div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead><tr style={{ background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)' }}><th className={thStyle}>#</th><th className={thStyle}>Receipt</th><th className={thStyle}>Date</th><th className={thStyle}>Amount</th><th className={thStyle}>Method</th><th className={thStyle}>Term</th><th className={`${thStyle} text-center`}>Actions</th></tr></thead>
                                                <tbody>
                                                    {studentPayments.map((p, i) => {
                                                        const mc: Record<string, string> = { 'Cash': 'bg-green-100 text-green-700', 'M-Pesa': 'bg-emerald-100 text-emerald-700', 'Bank Transfer': 'bg-blue-100 text-blue-700', 'Cheque': 'bg-amber-100 text-amber-700' };
                                                        const mColor = Object.entries(mc).find(([k]) => (p.payment_method || '').includes(k))?.[1] || 'bg-purple-100 text-purple-700';
                                                        return (
                                                            <tr key={p.id} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                                <td className={`${tdStyle} text-gray-400 text-xs`}>{i + 1}</td>
                                                                <td className={tdStyle}><span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold">{p.receipt_number || '-'}</span></td>
                                                                <td className={`${tdStyle} font-medium text-sm`}>{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                <td className={`${tdStyle} font-bold text-emerald-600`}>{fmt(Number(p.amount))}</td>
                                                                <td className={tdStyle}><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${mColor}`}>{p.payment_method}</span></td>
                                                                <td className={tdStyle}>{p.term_id ? <span className="inline-flex items-center px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px] font-bold">{terms.find(t => t.id === p.term_id)?.term_name || '-'}</span> : <span className="text-xs text-gray-300">-</span>}</td>
                                                                <td className={`${tdStyle} text-center`}>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button onClick={() => openEditPayment(p)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit"><FiEdit2 size={12} /></button>
                                                                        <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete"><FiTrash2 size={12} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════ OUTSTANDING FEES ═══════════════ */}
                    {tab === 'outstanding' && (
                        <div className="space-y-4">
                            {/* Stats Bar */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`${cardStyle} rounded-xl p-4 flex items-center gap-3`}>
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><FiUsers size={18} className="text-red-600" /></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students Owing</p><p className="text-xl font-extrabold text-gray-900">{outstandingStudents.length}</p></div>
                                </div>
                                <div className={`${cardStyle} rounded-xl p-4 flex items-center gap-3`}>
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><FiDollarSign size={18} className="text-amber-600" /></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Outstanding</p><p className="text-xl font-extrabold text-gray-900">{fmt(outstandingStudents.reduce((s, st) => s + st.annualBalance, 0))}</p></div>
                                </div>
                                <div className={`${cardStyle} rounded-xl p-4 flex items-center gap-3`}>
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FiDollarSign size={18} className="text-emerald-600" /></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Collected</p><p className="text-xl font-extrabold text-gray-900">{fmt(payments.reduce((s, p) => s + Number(p.amount || 0), 0))}</p></div>
                                </div>
                            </div>

                            {/* Filters & Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                <div className="flex gap-2 flex-wrap">
                                    <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none min-w-[140px]">
                                        <option value="">All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                    </select>
                                    <select value={filterStream} onChange={e => setFilterStream(e.target.value)} className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none min-w-[140px]">
                                        <option value="">All Streams</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <label className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-all flex items-center gap-1.5">
                                        <FiPlus size={14} /> Import
                                        <input type="file" accept=".csv" onChange={handleImportBalances} className="hidden" />
                                    </label>
                                    <button onClick={exportOutstanding} className={`${btnPrimary} rounded-lg flex items-center gap-1.5`} style={{ background: gradientPurple }}>
                                        <FiDownload size={14} /> Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Data Grid */}
                            <div className={`${cardStyle} rounded-xl overflow-hidden`}>
                                {outstandingStudents.length === 0 ? (
                                    <div className="text-center py-20 text-gray-300"><span className="text-4xl block mb-2">✅</span><p className="font-medium text-sm">All students are up to date!</p></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-100">
                                                    <th className={thStyle}>#</th>
                                                    <th className={thStyle}>Adm No</th>
                                                    <th className={thStyle}>Student Name</th>
                                                    <th className={thStyle}>Form</th>
                                                    <th className={thStyle}>Stream</th>
                                                    <th className={`${thStyle} text-right`}>Total Paid</th>
                                                    <th className={`${thStyle} text-right`}>Term Balance</th>
                                                    <th className={`${thStyle} text-right`}>Annual Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {outstandingStudents.map((s, i) => (
                                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer group" onClick={() => { setSearchAdm(s.admission_no || s.admission_number); setTab('collect'); setTimeout(searchStudent, 200); }}>
                                                        <td className={`${tdStyle} text-gray-400 text-xs`}>{i + 1}</td>
                                                        <td className={tdStyle}><span className="font-bold text-indigo-600">{s.admission_no || s.admission_number}</span></td>
                                                        <td className={`${tdStyle} font-semibold text-gray-800`}>{s.first_name} {s.last_name}</td>
                                                        <td className={tdStyle}><span className="text-xs font-medium text-gray-500">{getFormName(s.form_id)}</span></td>
                                                        <td className={tdStyle}><span className="text-xs font-medium text-gray-500">{getStreamName(s.stream_id)}</span></td>
                                                        <td className={`${tdStyle} text-right font-semibold text-emerald-600`}>{fmt(s.totalPaid)}</td>
                                                        <td className={`${tdStyle} text-right`}>
                                                            <span className={`font-bold ${s.termBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(s.termBalance)}</span>
                                                        </td>
                                                        <td className={`${tdStyle} text-right`}>
                                                            <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold">{fmt(s.annualBalance)}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                                                    <td colSpan={5} className="px-4 py-3 font-bold text-gray-600 text-sm">Total ({outstandingStudents.length} students)</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">{fmt(outstandingStudents.reduce((s, st) => s + st.totalPaid, 0))}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-700 text-sm">{fmt(outstandingStudents.reduce((s, st) => s + st.termBalance, 0))}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-700 text-sm">{fmt(outstandingStudents.reduce((s, st) => s + st.annualBalance, 0))}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════ PAYMENT HISTORY ═══════════════ */}
                    {tab === 'payments' && (
                        <div className={`${cardStyle} rounded-xl overflow-hidden`}>
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiClipboard size={14} className="text-indigo-500" /> All Payments <span className="text-xs font-bold text-gray-400 ml-1">({payments.length})</span></h3>
                                <button onClick={() => {
                                    const headers = ['Date', 'Adm No', 'Student', 'Amount', 'Method', 'Receipt'];
                                    const rows = payments.map(p => { const s = students.find(st => st.id === p.student_id); return [new Date(p.payment_date).toLocaleDateString('en-KE'), s?.admission_no || s?.admission_number || p.student_id, s ? `${s.first_name} ${s.last_name}` : '-', p.amount, p.payment_method, p.receipt_number || '-']; });
                                    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`; a.click(); toast.success('Exported ✅');
                                }} className="px-4 py-2 border-2 border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"><FiDownload size={13} /> Export</button>
                            </div>
                            {payments.length === 0 ? (
                                <div className="text-center py-20 text-gray-300"><FiClipboard size={40} className="mx-auto mb-3 opacity-50" /><p className="text-sm font-medium">No payments recorded yet</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr style={{ background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)' }}><th className={thStyle}>#</th><th className={thStyle}>Receipt</th><th className={thStyle}>Date</th><th className={thStyle}>Adm No</th><th className={thStyle}>Student</th><th className={`${thStyle} text-right`}>Amount</th><th className={thStyle}>Method</th><th className={thStyle}>Term</th><th className={`${thStyle} text-center`}>Actions</th></tr></thead>
                                        <tbody>
                                            {payments.map((p, i) => {
                                                const s = students.find(st => st.id === p.student_id);
                                                const methodColors: Record<string, string> = { 'Cash': 'bg-green-100 text-green-700', 'M-Pesa': 'bg-emerald-100 text-emerald-700', 'Bank Transfer': 'bg-blue-100 text-blue-700', 'Cheque': 'bg-amber-100 text-amber-700' };
                                                const mc = Object.entries(methodColors).find(([k]) => (p.payment_method || '').includes(k))?.[1] || 'bg-purple-100 text-purple-700';
                                                return (
                                                    <tr key={p.id} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                        <td className={`${tdStyle} text-gray-400 text-xs`}>{i + 1}</td>
                                                        <td className={tdStyle}><span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-xs font-bold">{p.receipt_number || '-'}</span></td>
                                                        <td className={`${tdStyle} font-medium text-sm`}>{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                        <td className={tdStyle}><span className="font-bold text-indigo-600">{s?.admission_no || s?.admission_number || '-'}</span></td>
                                                        <td className={`${tdStyle} font-semibold`}>{s ? `${s.first_name} ${s.last_name}` : '-'}</td>
                                                        <td className={`${tdStyle} text-right font-bold text-emerald-600`}>{fmt(Number(p.amount))}</td>
                                                        <td className={tdStyle}><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${mc}`}>{p.payment_method}</span></td>
                                                        <td className={tdStyle}>{p.term_id ? <span className="inline-flex items-center px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs font-semibold">{terms.find(t => t.id === p.term_id)?.term_name || '-'}</span> : '-'}</td>
                                                        <td className={`${tdStyle} text-center`}>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={() => openEditPayment(p)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit"><FiEdit2 size={13} /></button>
                                                                <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete"><FiTrash2 size={13} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════ FEE STRUCTURE ═══════════════ */}
                    {tab === 'structure' && (
                        <div className="space-y-4">
                            {/* Summary Cards with colors */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {forms.map((form, fi) => {
                                    const formTotal = structures.filter(f => !f.form_id || f.form_id === form.id).reduce((s, f) => s + Number(f.amount || 0), 0);
                                    const colors = ['from-violet-500 to-purple-600', 'from-cyan-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600'];
                                    return (
                                        <div key={form.id} className={`rounded-xl p-4 text-white shadow-lg bg-gradient-to-br ${colors[fi % 4]}`}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{form.form_name} Annual</p>
                                            <p className="text-xl font-extrabold mt-1">{fmt(formTotal)}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">{structures.length} fee item{structures.length !== 1 ? 's' : ''} defined</p>
                                <button onClick={openAddFee} className={`${btnPrimary} rounded-lg flex items-center gap-2`} style={{ background: gradientPurple }}>
                                    <FiPlus size={14} /> Add Fee Item
                                </button>
                            </div>

                            {/* Fee Structure Cards Grid */}
                            {structures.length === 0 ? (
                                <div className={`${cardStyle} rounded-xl text-center py-20 text-gray-300`}><FiGrid size={40} className="mx-auto mb-3 opacity-50" /><p className="font-medium text-sm">No fee structure defined yet</p></div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {structures.map((item: any) => (
                                        <div key={item.id} className={`${cardStyle} rounded-xl p-4 hover:shadow-md transition-all border-l-4`} style={{ borderLeftColor: ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#6366f1'][item.id % 6] }}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 text-sm">{item.category}</p>
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Fee Vote Head</p>
                                                </div>
                                                <p className="text-lg font-extrabold text-emerald-600">{fmt(Number(item.amount))}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                <span className="inline-flex items-center px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold">{item.form_id ? getFormName(item.form_id) : 'All Forms'}</span>
                                                <span className="inline-flex items-center px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-[10px] font-bold">{item.term_id ? terms.find((t: any) => t.id === item.term_id)?.term_name || '-' : 'All Terms'}</span>
                                                <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">{item.year || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
                                                <button onClick={() => openEditFee(item)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit"><FiEdit2 size={14} /></button>
                                                <button onClick={() => handleDeleteFee(item.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete"><FiTrash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Grand Total */}
                            {structures.length > 0 && (
                                <div className="rounded-xl p-4 text-white shadow-lg" style={{ background: gradientPurple }}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold opacity-80">Grand Total (all items)</p>
                                        <p className="text-2xl font-extrabold">{fmt(structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0))}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════ FEE STRUCTURE MODAL ═══════════════ */}
                    {showFeeModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFeeModal(false)}>
                            <div className="bg-white w-full max-w-md shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f8faff, #eef2ff)' }}>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiGrid size={16} className="text-indigo-500" />{editFeeId ? 'Edit Fee Item' : 'Add Fee Item'}</h3>
                                    <button onClick={() => setShowFeeModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition"><FiX size={18} /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Fee Vote Head *</label>
                                        <select value={feeForm.category} onChange={e => setFeeForm({ ...feeForm, category: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all">
                                            <option value="">— Select Fee Vote Head —</option>
                                            <option value="Tuition">Tuition</option><option value="Boarding">Boarding</option><option value="Lunch Program">Lunch Program</option><option value="Activity">Activity</option>
                                            <option value="Exam Fee">Exam Fee</option><option value="Library">Library</option><option value="Computer / ICT">Computer / ICT</option><option value="Development Levy">Development Levy</option>
                                            <option value="Caution Money">Caution Money</option><option value="Medical">Medical</option><option value="Transport">Transport</option><option value="Uniform">Uniform</option>
                                            <option value="Stationery">Stationery</option><option value="Sports">Sports</option><option value="Laboratory">Laboratory</option><option value="Admission">Admission</option>
                                            <option value="Motivation">Motivation</option><option value="Holiday Tuition">Holiday Tuition</option><option value="Remedial">Remedial</option><option value="Diary">Diary</option>
                                            <option value="Prize Giving">Prize Giving</option><option value="Co-curricular">Co-curricular</option><option value="Electricity & Water">Electricity & Water</option><option value="Insurance">Insurance</option><option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (KES) *</label>
                                        <input type="number" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all" placeholder="0" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Form</label>
                                            <select value={feeForm.form_id} onChange={e => setFeeForm({ ...feeForm, form_id: e.target.value })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all"><option value="">All</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Term</label>
                                            <select value={feeForm.term_id} onChange={e => setFeeForm({ ...feeForm, term_id: e.target.value })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all"><option value="">All</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Year</label>
                                            <input type="number" value={feeForm.year} onChange={e => setFeeForm({ ...feeForm, year: e.target.value })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all" placeholder="2026" />
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2" style={{ background: 'linear-gradient(135deg, #fafafa, #f5f5f5)' }}>
                                    <button onClick={() => setShowFeeModal(false)} className="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
                                    <button onClick={handleSaveFee} className={`${btnPrimary} rounded-lg flex items-center gap-2`} style={{ background: gradientPurple }}>
                                        <FiSave size={14} /> {editFeeId ? 'Update' : 'Save Fee'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════ PAYMENT MODAL ═══════════════ */}
                    {showPayModal && foundStudent && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowPayModal(false); setEditPayId(null); }}>
                            <div className="bg-white w-full max-w-lg shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
                                    <div>
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCreditCard size={16} className="text-emerald-500" /> {editPayId ? 'Edit Payment' : 'Record Payment'}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{foundStudent.first_name} {foundStudent.last_name} — {foundStudent.admission_no || foundStudent.admission_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Receipt #</p>
                                        <p className="text-sm font-bold text-indigo-600 font-mono">{editPayId ? payRef : genReceipt()}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Balance summary */}
                                    {(() => {
                                        const fees = getStudentFees(foundStudent.id, foundStudent.form_id); return (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-center"><p className="text-[9px] font-bold text-emerald-400 uppercase">Total Paid</p><p className="font-extrabold text-emerald-700 text-sm">{fmt(fees.totalPaid)}</p></div>
                                                <div className="p-2.5 bg-red-50 rounded-lg border border-red-100 text-center"><p className="text-[9px] font-bold text-red-400 uppercase">Term Bal</p><p className="font-extrabold text-red-700 text-sm">{fmt(fees.termBalance)}</p></div>
                                                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100 text-center"><p className="text-[9px] font-bold text-purple-400 uppercase">Annual Bal</p><p className="font-extrabold text-purple-700 text-sm">{fmt(fees.annualBalance)}</p></div>
                                            </div>
                                        );
                                    })()}

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'].map(m => (
                                                <button key={m} onClick={() => setPayMethod(m)} className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border-2 ${payMethod === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                                    }`}>{m}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{payMethod === 'In-Kind' ? 'Estimated Value (KES)' : 'Amount (KES)'} *</label>
                                        <input type="number" value={payMethod === 'In-Kind' ? inKindValue : payAmount} onChange={e => payMethod === 'In-Kind' ? (setInKindValue(e.target.value), setPayAmount(e.target.value)) : setPayAmount(e.target.value)}
                                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg text-lg font-bold bg-white focus:border-emerald-400 outline-none transition-all text-center" placeholder="0" autoFocus />
                                    </div>

                                    {/* M-Pesa specific fields */}
                                    {payMethod === 'M-Pesa' && (
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3">
                                            <p className="text-[10px] font-bold text-green-600 uppercase">📱 M-Pesa Details</p>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                                                <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-lg text-sm font-medium bg-white focus:border-green-400 outline-none" placeholder="0712 345 678" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">M-Pesa Code</label>
                                                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-lg text-sm font-medium bg-white focus:border-green-400 outline-none font-mono uppercase" placeholder="e.g. SJK4X7R2FN" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bank Transfer fields */}
                                    {payMethod === 'Bank Transfer' && (
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase">🏦 Bank Transfer Details</p>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Receipt / Reference Number</label>
                                                <input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none font-mono" placeholder="Bank receipt number" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Cheque field */}
                                    {payMethod === 'Cheque' && (
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">📝 Cheque Number</label>
                                            <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none" placeholder="Cheque number" />
                                        </div>
                                    )}

                                    {/* In-Kind fields */}
                                    {payMethod === 'In-Kind' && (
                                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                                            <p className="text-[10px] font-bold text-purple-600 uppercase">🌾 In-Kind Payment</p>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Item Type *</label>
                                                <select value={inKindItem} onChange={e => setInKindItem(e.target.value)} className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-lg text-sm font-medium bg-white focus:border-purple-400 outline-none">
                                                    <option value="">— Select Item —</option>
                                                    <option value="Beans">🫘 Beans</option>
                                                    <option value="Maize">🌽 Maize</option>
                                                    <option value="Firewood">🪵 Firewood</option>
                                                    <option value="Rice">🍚 Rice</option>
                                                    <option value="Wheat">🌾 Wheat</option>
                                                    <option value="Potatoes">🥔 Potatoes</option>
                                                    <option value="Vegetables">🥬 Vegetables</option>
                                                    <option value="Cooking Oil">🛢️ Cooking Oil</option>
                                                    <option value="Sugar">🍬 Sugar</option>
                                                    <option value="Milk">🥛 Milk</option>
                                                    <option value="Building Materials">🧱 Building Materials</option>
                                                    <option value="Labour">👷 Labour</option>
                                                    <option value="Other">📦 Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2" style={{ background: 'linear-gradient(135deg, #f0fdf4, #fafafa)' }}>
                                    <button onClick={() => { setShowPayModal(false); setEditPayId(null); }} className="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
                                    <button onClick={handlePayFee} className={`${btnPrimary} rounded-lg flex items-center gap-2`} style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                        <FiSave size={14} /> {editPayId ? 'Update' : 'Record Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

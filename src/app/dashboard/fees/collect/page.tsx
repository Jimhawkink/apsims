'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, getMethodColor } from '../useFeeData';
import { FiSearch, FiCreditCard, FiClipboard, FiSave, FiX, FiEdit2, FiTrash2, FiPrinter, FiFileText, FiDollarSign, FiCheck, FiArrowLeft } from 'react-icons/fi';

export default function CollectFeePage() {
    const { forms, streams, students, payments, terms, loading, fetchAll, currentTerm, getFormName, getStreamName, getStudentFees } = useFeeData();

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
    const [showReceipt, setShowReceipt] = useState<any>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    const searchStudent = () => {
        if (!searchAdm.trim()) { toast.error('Enter an admission number'); return; }
        const s = students.find(st => (st.admission_no || st.admission_number || '').toString().toLowerCase() === searchAdm.trim().toLowerCase());
        if (!s) { toast.error('Student not found'); setFoundStudent(null); return; }
        setFoundStudent(s);
        setStudentPayments(payments.filter(p => p.student_id === s.id).sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));
    };

    const genReceipt = () => `APSIMS-${String(payments.length + 1).padStart(4, '0')}`;

    const handlePayFee = async () => {
        if (!foundStudent || !payAmount || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
        const method = payMethod === 'In-Kind' ? `In-Kind (${inKindItem || 'Other'})` : payMethod;
        const ref = payMethod === 'M-Pesa' ? mpesaPhone : payMethod === 'Bank Transfer' ? bankRef : payRef;
        const receiptNo = editPayId ? payRef : genReceipt();
        const payload = {
            student_id: foundStudent.id,
            amount: payMethod === 'In-Kind' ? Number(inKindValue || payAmount) : Number(payAmount),
            payment_date: new Date().toISOString().split('T')[0], payment_method: method,
            receipt_number: receiptNo, reference_number: ref || null,
            term_id: currentTerm?.id || null, year: new Date().getFullYear(),
            notes: payMethod === 'In-Kind' ? `In-Kind: ${inKindItem} valued at KES ${inKindValue || payAmount}` : null,
        };
        let error;
        if (editPayId) { ({ error } = await supabase.from('school_fee_payments').update(payload).eq('id', editPayId)); }
        else { ({ error } = await supabase.from('school_fee_payments').insert([payload])); }
        if (error) { toast.error(error.message); return; }
        toast.success(editPayId ? 'Payment updated ✅' : `${fmt(Number(payAmount))} recorded — ${receiptNo} ✅`);

        if (!editPayId && foundStudent.guardian_phone) {
            const fees = getStudentFees(foundStudent.id, foundStudent.form_id);
            const smsMessage = [`Dear Parent,`,``,`📋 APSIMS FEE RECEIPT`,`━━━━━━━━━━━━━━━━━`,`Student: ${foundStudent.first_name} ${foundStudent.last_name}`,`Adm No: ${foundStudent.admission_no || foundStudent.admission_number}`,`Amount Paid: KES ${Number(payAmount).toLocaleString()}`,`Receipt No: ${receiptNo}`,`Method: ${method}`,`Term Balance: KES ${Math.max(0, fees.termBalance - Number(payAmount)).toLocaleString()}`,`Annual Balance: KES ${Math.max(0, fees.annualBalance - Number(payAmount)).toLocaleString()}`,`Date: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`,`━━━━━━━━━━━━━━━━━`,`Thank you for your payment.`].join('\n');
            fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: foundStudent.guardian_phone, message: smsMessage }) }).then(r => r.json()).then(d => { if (d.success) toast.success(`📱 SMS sent`, { duration: 4000 }); }).catch(() => {});
        }
        if (!editPayId) setShowReceipt({ ...payload, receipt_number: receiptNo, student: foundStudent });
        setPayAmount(''); setPayRef(''); setMpesaPhone(''); setBankRef(''); setInKindItem(''); setInKindValue(''); setEditPayId(null); setShowPayModal(false);
        fetchAll(); setTimeout(searchStudent, 500);
    };

    const handleDeletePayment = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_fee_payments').delete().eq('id', id); toast.success('Deleted'); fetchAll(); setTimeout(() => { if (foundStudent) searchStudent(); }, 500); };
    const openEditPayment = (p: any) => { setEditPayId(p.id); setPayAmount(String(p.amount)); const m = (p.payment_method || '').startsWith('In-Kind') ? 'In-Kind' : p.payment_method; setPayMethod(m); setPayRef(p.receipt_number || ''); setMpesaPhone(m === 'M-Pesa' ? (p.reference_number || '') : ''); setBankRef(m === 'Bank Transfer' ? (p.reference_number || '') : ''); if (m === 'In-Kind') { const match = (p.notes || '').match(/In-Kind: (.+) valued/); setInKindItem(match?.[1] || ''); setInKindValue(String(p.amount)); } setShowPayModal(true); };

    const printReceipt = () => {
        if (!showReceipt) return;
        const s = showReceipt.student;
        const fees = s ? getStudentFees(s.id, s.form_id) : null;
        const w = window.open('', '_blank'); if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt - ${showReceipt.receipt_number}</title>
<style>
  @page { size: 80mm auto; margin: 5mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; max-width: 350px; margin: 0 auto; color: #1a1a1a; font-size: 12px; }
  .header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #000; margin-bottom: 12px; }
  .header h1 { font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-bottom: 2px; }
  .header p { font-size: 10px; color: #555; }
  .receipt-no { text-align: center; margin: 10px 0; padding: 6px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; }
  .receipt-no span { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px; }
  table.info { width: 100%; margin: 10px 0; }
  table.info td { padding: 4px 0; vertical-align: top; }
  table.info td.label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; width: 110px; }
  table.info td.value { font-weight: 600; color: #1a1a1a; }
  .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
  .amount-box { text-align: center; padding: 14px; margin: 12px 0; border: 2px solid #000; border-radius: 6px; background: #fafafa; }
  .amount-box .label { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .amount-box .amount { font-size: 26px; font-weight: 900; margin-top: 4px; }
  .balance-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  .balance-row .bl { font-size: 11px; color: #666; }
  .balance-row .bv { font-size: 12px; font-weight: 700; }
  .footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px solid #000; }
  .footer p { font-size: 9px; color: #999; margin: 2px 0; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>ALPHA PREMIER SCHOOL</h1>
  <p>P.O. Box 000 | Tel: 0700 000 000</p>
  <p style="font-weight:600;margin-top:4px;">OFFICIAL FEE PAYMENT RECEIPT</p>
</div>
<div class="receipt-no">Receipt No: <span>${showReceipt.receipt_number || '-'}</span></div>
<table class="info">
  <tr><td class="label">Date</td><td class="value">${new Date(showReceipt.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
  <tr><td class="label">Student Name</td><td class="value">${s?.first_name || ''} ${s?.last_name || ''}</td></tr>
  <tr><td class="label">Admission No</td><td class="value">${s?.admission_no || s?.admission_number || '-'}</td></tr>
  <tr><td class="label">Form / Stream</td><td class="value">${s ? getFormName(s.form_id) : '-'} / ${s ? getStreamName(s.stream_id) : '-'}</td></tr>
  <tr><td class="label">Payment Method</td><td class="value">${showReceipt.payment_method || '-'}</td></tr>
  ${showReceipt.reference_number ? `<tr><td class="label">Reference</td><td class="value" style="font-family:monospace;">${showReceipt.reference_number}</td></tr>` : ''}
</table>
<div class="amount-box">
  <div class="label">Amount Received</div>
  <div class="amount">KES ${Number(showReceipt.amount).toLocaleString()}</div>
</div>
${fees ? `
<div class="divider"></div>
<div class="balance-row"><span class="bl">Total Paid to Date</span><span class="bv">KES ${fees.totalPaid.toLocaleString()}</span></div>
<div class="balance-row"><span class="bl">Term Balance</span><span class="bv" style="color:#dc2626;">KES ${fees.termBalance.toLocaleString()}</span></div>
<div class="balance-row" style="border-bottom:none;"><span class="bl">Annual Balance</span><span class="bv" style="color:#dc2626;">KES ${fees.annualBalance.toLocaleString()}</span></div>
` : ''}
<div class="footer">
  <p>Thank you for your payment</p>
  <p>This is a computer-generated receipt</p>
  <p>Printed: ${new Date().toLocaleString('en-KE')}</p>
</div>
</body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); }, 300);
    };

    const gp = 'linear-gradient(135deg, #059669, #10b981)';
    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";
    const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-10 h-10 border-3 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div></div>;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: gp }}><FiCreditCard size={18} /></span> Collect Fee</h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-12">Search student, record payment, and generate receipt</p>
                </div>
                <Link href="/dashboard/fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"><FiArrowLeft size={12} /> Fee Dashboard</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Left Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><FiSearch size={14} className="text-green-500" /> Find Student</h3>
                        <div className="flex gap-2">
                            <input type="text" value={searchAdm} onChange={e => setSearchAdm(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchStudent()} placeholder="Admission number..." className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-green-400 outline-none bg-gray-50 focus:bg-white" />
                            <button onClick={searchStudent} className="px-4 py-2.5 rounded-lg text-white shadow-md" style={{ background: gp }}><FiSearch size={16} /></button>
                        </div>
                    </div>

                    {foundStudent && (() => {
                        const fees = getStudentFees(foundStudent.id, foundStudent.form_id);
                        const pct = fees.annualTotal > 0 ? Math.round((fees.totalPaid / fees.annualTotal) * 100) : 0;
                        return (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="p-5 border-b border-gray-50" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ background: gp }}>{foundStudent.first_name?.charAt(0)}</div>
                                        <div className="flex-1">
                                            <p className="font-extrabold text-gray-900 text-lg">{foundStudent.first_name} {foundStudent.other_name || ''} {foundStudent.last_name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold">{foundStudent.admission_no || foundStudent.admission_number}</span><span>{getFormName(foundStudent.form_id)} • {getStreamName(foundStudent.stream_id)}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pt-4"><div className="flex items-center justify-between text-xs text-gray-500 mb-1"><span>Payment Progress</span><span className="font-bold" style={{ color: pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626' }}>{pct}%</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }} /></div></div>
                                <div className="p-4 grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100"><p className="text-[9px] font-bold text-emerald-500 uppercase">Total Paid</p><p className="text-lg font-extrabold text-emerald-700 mt-0.5">{fmt(fees.totalPaid)}</p></div>
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100"><p className="text-[9px] font-bold text-orange-500 uppercase">Term Fees</p><p className="text-lg font-extrabold text-orange-700 mt-0.5">{fmt(fees.termTotal)}</p></div>
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-rose-50 border border-red-100"><p className="text-[9px] font-bold text-red-500 uppercase">Term Balance</p><p className="text-lg font-extrabold text-red-700 mt-0.5">{fmt(fees.termBalance)}</p></div>
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"><p className="text-[9px] font-bold text-blue-500 uppercase">Annual Total</p><p className="text-lg font-extrabold text-blue-700 mt-0.5">{fmt(fees.annualTotal)}</p></div>
                                    <div className="col-span-2 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 flex items-center justify-between"><div><p className="text-[9px] font-bold text-purple-500 uppercase">Annual Balance</p><p className="text-xl font-extrabold text-purple-700 mt-0.5">{fmt(fees.annualBalance)}</p></div>{fees.overpayment > 0 && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">+{fmt(fees.overpayment)} overpaid</span>}</div>
                                </div>
                                <div className="px-4 pb-4 flex gap-2">
                                    <button onClick={() => setShowPayModal(true)} className="flex-1 px-5 py-3 text-sm font-bold text-white rounded-lg flex items-center justify-center gap-2 shadow-lg" style={{ background: gp }}><FiCreditCard size={16} /> Record Payment</button>
                                    <Link href={`/dashboard/fees/statements?adm=${foundStudent.admission_no || foundStudent.admission_number}`} className="px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 border border-indigo-200"><FiFileText size={14} /></Link>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-3">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiClipboard size={14} className="text-green-500" /> {foundStudent ? `Payment History — ${foundStudent.first_name} ${foundStudent.last_name}` : 'Payment History'}</h3>
                            {foundStudent && studentPayments.length > 0 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">{studentPayments.length} records</span>}
                        </div>
                        {!foundStudent ? (
                            <div className="text-center py-24 text-gray-300"><FiSearch size={48} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">Search for a student by admission number</p><p className="text-xs text-gray-300 mt-1">to view their payment history and record new payments</p></div>
                        ) : studentPayments.length === 0 ? (
                            <div className="text-center py-24 text-gray-300"><FiClipboard size={48} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No payments recorded yet</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Receipt</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Method</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Term</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-28">Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {studentPayments.map((p, i) => (
                                            <tr key={p.id} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                                                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold">{p.receipt_number || '-'}</span></td>
                                                <td className="px-4 py-3 text-sm font-medium">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(Number(p.amount))}</td>
                                                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getMethodColor(p.payment_method)}`}>{p.payment_method}</span></td>
                                                <td className="px-4 py-3">{p.term_id ? <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">{terms.find(t => t.id === p.term_id)?.term_name || '-'}</span> : '-'}</td>
                                                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => setShowReceipt({ ...p, student: foundStudent })} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md" title="Receipt"><FiPrinter size={13} /></button>
                                                    <button onClick={() => openEditPayment(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Edit"><FiEdit2 size={13} /></button>
                                                    <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Delete"><FiTrash2 size={13} /></button>
                                                </div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200"><td colSpan={3} className="px-4 py-3 font-bold text-sm text-gray-600">Total ({studentPayments.length})</td><td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-sm">{fmt(studentPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}</td><td colSpan={3}></td></tr></tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPayModal && foundStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowPayModal(false); setEditPayId(null); }}>
                    <div className="bg-white w-full max-w-lg shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
                            <div><h3 className="font-bold text-gray-800 flex items-center gap-2"><FiCreditCard className="text-emerald-500" /> {editPayId ? 'Edit Payment' : 'Record Payment'}</h3><p className="text-xs text-gray-500 mt-0.5">{foundStudent.first_name} {foundStudent.last_name} — {foundStudent.admission_no || foundStudent.admission_number}</p></div>
                            <div className="text-right"><p className="text-[9px] font-bold text-gray-400 uppercase">Receipt #</p><p className="text-sm font-bold text-indigo-600 font-mono">{editPayId ? payRef : genReceipt()}</p></div>
                        </div>
                        <div className="p-6 space-y-4">
                            {(() => { const fees = getStudentFees(foundStudent.id, foundStudent.form_id); return <div className="grid grid-cols-3 gap-2"><div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-center"><p className="text-[9px] font-bold text-emerald-400 uppercase">Paid</p><p className="font-extrabold text-emerald-700 text-sm">{fmt(fees.totalPaid)}</p></div><div className="p-2.5 bg-red-50 rounded-lg border border-red-100 text-center"><p className="text-[9px] font-bold text-red-400 uppercase">Term Bal</p><p className="font-extrabold text-red-700 text-sm">{fmt(fees.termBalance)}</p></div><div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100 text-center"><p className="text-[9px] font-bold text-purple-400 uppercase">Annual Bal</p><p className="font-extrabold text-purple-700 text-sm">{fmt(fees.annualBalance)}</p></div></div>; })()}
                            <div><label className={labelCls}>Payment Method</label><div className="grid grid-cols-5 gap-1.5">{['Cash','M-Pesa','Bank Transfer','Cheque','In-Kind'].map(m => <button key={m} onClick={() => setPayMethod(m)} className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border-2 ${payMethod === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{m}</button>)}</div></div>
                            <div><label className={labelCls}>{payMethod === 'In-Kind' ? 'Estimated Value (KES)' : 'Amount (KES)'} *</label><input type="number" value={payMethod === 'In-Kind' ? inKindValue : payAmount} onChange={e => payMethod === 'In-Kind' ? (setInKindValue(e.target.value), setPayAmount(e.target.value)) : setPayAmount(e.target.value)} className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg text-xl font-bold bg-white focus:border-emerald-400 outline-none text-center" placeholder="0" autoFocus /></div>
                            {payMethod === 'M-Pesa' && <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3"><p className="text-[10px] font-bold text-green-600 uppercase">📱 M-Pesa Details</p><div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</label><input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-lg text-sm bg-white focus:border-green-400 outline-none" placeholder="0712 345 678" /></div><div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">M-Pesa Code</label><input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-green-200 rounded-lg text-sm bg-white focus:border-green-400 outline-none font-mono uppercase" placeholder="SJK4X7R2FN" /></div></div>}
                            {payMethod === 'Bank Transfer' && <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">🏦 Bank Reference</label><input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none font-mono" /></div>}
                            {payMethod === 'Cheque' && <div className="p-3 bg-amber-50 rounded-lg border border-amber-200"><label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">📝 Cheque Number</label><input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-lg text-sm bg-white focus:border-amber-400 outline-none" /></div>}
                            {payMethod === 'In-Kind' && <div className="p-3 bg-purple-50 rounded-lg border border-purple-200"><label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">🌾 Item Type</label><select value={inKindItem} onChange={e => setInKindItem(e.target.value)} className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-lg text-sm bg-white focus:border-purple-400 outline-none"><option value="">— Select —</option>{['Beans','Maize','Firewood','Rice','Wheat','Potatoes','Vegetables','Cooking Oil','Sugar','Milk','Building Materials','Labour','Other'].map(i => <option key={i}>{i}</option>)}</select></div>}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => { setShowPayModal(false); setEditPayId(null); }} className="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600">Cancel</button>
                            <button onClick={handlePayFee} className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg" style={{ background: gp }}><FiCheck size={14} /> {editPayId ? 'Update' : 'Record Payment'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && (() => {
                const rcptFees = showReceipt.student ? getStudentFees(showReceipt.student.id, showReceipt.student.form_id) : null;
                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReceipt(null)}>
                        <div className="bg-white w-full max-w-[420px] shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-3 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                <h3 className="font-bold text-white flex items-center gap-2"><FiPrinter /> Fee Receipt</h3>
                                <button onClick={() => setShowReceipt(null)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                            </div>
                            <div className="p-5">
                                {/* School Header */}
                                <div className="text-center pb-3 mb-3" style={{ borderBottom: '2px solid #111' }}>
                                    <h2 className="text-base font-extrabold text-gray-900 tracking-wide">ALPHA PREMIER SCHOOL</h2>
                                    <p className="text-[10px] text-gray-500 mt-0.5">P.O. Box 000 • Tel: 0700 000 000</p>
                                    <p className="text-[10px] font-bold text-gray-700 mt-1 tracking-widest">OFFICIAL FEE PAYMENT RECEIPT</p>
                                </div>

                                {/* Receipt Number */}
                                <div className="text-center mb-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Receipt No: </span>
                                    <span className="font-mono font-bold text-sm text-gray-900 tracking-wider">{showReceipt.receipt_number}</span>
                                </div>

                                {/* Details Table */}
                                <table className="w-full mb-3">
                                    <tbody>
                                        {[
                                            ['Date', new Date(showReceipt.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })],
                                            ['Student Name', `${showReceipt.student?.first_name || ''} ${showReceipt.student?.last_name || ''}`],
                                            ['Admission No', showReceipt.student?.admission_no || showReceipt.student?.admission_number || '-'],
                                            ['Form / Stream', `${getFormName(showReceipt.student?.form_id)} / ${getStreamName(showReceipt.student?.stream_id)}`],
                                            ['Payment Method', showReceipt.payment_method || '-'],
                                        ].map(([label, value], i) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="py-1.5 text-[10px] font-bold text-gray-400 uppercase w-[110px]">{label}</td>
                                                <td className="py-1.5 text-[13px] font-semibold text-gray-800">{value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Amount Box */}
                                <div className="text-center py-4 my-3 border-2 border-gray-900 rounded-lg bg-gray-50">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount Received</p>
                                    <p className="text-2xl font-black text-gray-900 mt-1">{fmt(Number(showReceipt.amount))}</p>
                                </div>

                                {/* Balances */}
                                {rcptFees && (
                                    <div className="space-y-1.5 my-3" style={{ borderTop: '1px dashed #ccc', paddingTop: 10 }}>
                                        <div className="flex justify-between"><span className="text-xs text-gray-500">Total Paid to Date</span><span className="text-xs font-bold text-gray-800">{fmt(rcptFees.totalPaid)}</span></div>
                                        <div className="flex justify-between"><span className="text-xs text-gray-500">Term Balance</span><span className="text-xs font-bold text-red-600">{fmt(rcptFees.termBalance)}</span></div>
                                        <div className="flex justify-between"><span className="text-xs text-gray-500">Annual Balance</span><span className="text-xs font-bold text-red-600">{fmt(rcptFees.annualBalance)}</span></div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="text-center pt-3 mt-3" style={{ borderTop: '2px solid #111' }}>
                                    <p className="text-[9px] text-gray-400">Thank you for your payment</p>
                                    <p className="text-[9px] text-gray-400">Computer-generated receipt • No signature required</p>
                                </div>
                            </div>
                            <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
                                <button onClick={() => setShowReceipt(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
                                <button onClick={printReceipt} className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiPrinter size={14} /> Print Receipt</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

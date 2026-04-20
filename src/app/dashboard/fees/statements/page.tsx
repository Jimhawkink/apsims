'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt } from '../useFeeData';
import { FiSearch, FiFileText, FiPrinter, FiArrowLeft, FiDownload, FiUser, FiCalendar, FiDollarSign } from 'react-icons/fi';

export default function FeeStatementsPage() {
    const { students, payments, structures, terms, loading, currentTerm, getFormName, getStreamName, getStudentFees } = useFeeData();
    const [admNo, setAdmNo] = useState('');
    const [student, setStudent] = useState<any>(null);
    const stmtRef = useRef<HTMLDivElement>(null);

    // Auto-load from URL params
    if (typeof window !== 'undefined' && !admNo) {
        const params = new URLSearchParams(window.location.search);
        const adm = params.get('adm');
        if (adm && adm !== admNo) { setAdmNo(adm); }
    }

    const search = () => {
        if (!admNo.trim()) { toast.error('Enter admission number'); return; }
        const s = students.find(st => (st.admission_no || st.admission_number || '').toString().toLowerCase() === admNo.trim().toLowerCase());
        if (!s) { toast.error('Student not found'); setStudent(null); return; }
        setStudent(s);
    };

    const printStatement = () => {
        if (!student) return;
        const fees = getStudentFees(student.id, student.form_id);
        const stmtPayments = payments.filter(p => p.student_id === student.id).sort((a: any, b: any) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
        const applicable = structures.filter(f => !f.form_id || f.form_id === student.form_id);
        let rb = fees.annualTotal;

        const w = window.open('', '_blank'); if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Fee Statement - ${student.admission_no || student.admission_number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #1a1a1a; font-size: 12px; }
  .header { text-align: center; padding-bottom: 12px; border-bottom: 3px double #000; margin-bottom: 15px; }
  .header h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
  .header p { font-size: 11px; color: #555; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
  .info-grid .label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; }
  .info-grid .value { font-size: 12px; font-weight: 600; color: #111; margin-top: 1px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 1px; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #666; background: #f5f5f5; border-bottom: 2px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .bold { font-weight: 700; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .total-row { background: #f9fafb; border-top: 2px solid #333; }
  .total-row td { font-weight: 700; font-size: 12px; padding: 8px; }
  .summary-box { margin: 16px 0; padding: 14px; border: 2px solid ${fees.annualBalance > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 6px; background: ${fees.annualBalance > 0 ? '#fef2f2' : '#f0fdf4'}; display: flex; justify-content: space-between; align-items: center; }
  .summary-box .amount { font-size: 22px; font-weight: 900; color: ${fees.annualBalance > 0 ? '#dc2626' : '#16a34a'}; }
  .summary-box .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${fees.annualBalance > 0 ? '#dc2626' : '#16a34a'}; }
  .footer { text-align: center; margin-top: 16px; padding-top: 10px; border-top: 3px double #000; font-size: 9px; color: #999; }
</style></head><body>
<div class="header">
  <h1>ALPHA PREMIER SCHOOL</h1>
  <p>P.O. Box 000 &bull; Tel: 0700 000 000</p>
  <p style="font-weight:700;margin-top:6px;font-size:13px;letter-spacing:2px;">FEE STATEMENT</p>
  <p style="margin-top:2px;">${currentTerm?.term_name || ''} ${new Date().getFullYear()}</p>
</div>
<div class="info-grid">
  <div><div class="label">Student Name</div><div class="value">${student.first_name} ${student.other_name || student.middle_name || ''} ${student.last_name}</div></div>
  <div><div class="label">Form / Stream</div><div class="value">${getFormName(student.form_id)} / ${getStreamName(student.stream_id)}</div></div>
  <div><div class="label">Admission No</div><div class="value">${student.admission_no || student.admission_number}</div></div>
  <div><div class="label">Statement Date</div><div class="value">${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
  <div><div class="label">Guardian</div><div class="value">${student.guardian_name || '-'}</div></div>
  <div><div class="label">Guardian Phone</div><div class="value">${student.guardian_phone || '-'}</div></div>
</div>
<div class="section-title">Fee Breakdown</div>
<table>
  <thead><tr><th>#</th><th>Fee Vote Head</th><th class="text-center">Form</th><th class="text-center">Term</th><th class="text-right">Amount (KES)</th></tr></thead>
  <tbody>${applicable.map((f: any, i: number) => `<tr><td>${i + 1}</td><td class="bold">${f.category}</td><td class="text-center">${f.form_id ? getFormName(f.form_id) : 'All'}</td><td class="text-center">${f.term_id ? (terms.find(t => t.id === f.term_id)?.term_name || '-') : 'All'}</td><td class="text-right bold">${Number(f.amount).toLocaleString()}</td></tr>`).join('')}</tbody>
  <tfoot><tr class="total-row"><td colspan="4">TOTAL ANNUAL FEE</td><td class="text-right" style="font-size:14px;">KES ${fees.annualTotal.toLocaleString()}</td></tr></tfoot>
</table>
<div class="section-title">Payment Ledger</div>
<table>
  <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead>
  <tbody>
    <tr style="background:#fffbeb;"><td>—</td><td class="bold">Annual Fee Charge</td><td>FEE-STRUCT</td><td class="text-right bold red">KES ${fees.annualTotal.toLocaleString()}</td><td class="text-right">—</td><td class="text-right bold red">KES ${fees.annualTotal.toLocaleString()}</td></tr>
    ${stmtPayments.map(p => { rb -= Number(p.amount || 0); return `<tr><td>${new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>Payment — ${p.payment_method}</td><td style="font-family:monospace;font-size:10px;">${p.receipt_number || '-'}</td><td class="text-right">—</td><td class="text-right bold green">KES ${Number(p.amount).toLocaleString()}</td><td class="text-right bold" style="color:${rb > 0 ? '#dc2626' : '#16a34a'}">KES ${Math.max(0, rb).toLocaleString()}</td></tr>`; }).join('')}
  </tbody>
  <tfoot><tr class="total-row"><td colspan="3">CLOSING BALANCE</td><td class="text-right red">KES ${fees.annualTotal.toLocaleString()}</td><td class="text-right green">KES ${fees.totalPaid.toLocaleString()}</td><td class="text-right" style="color:${fees.annualBalance > 0 ? '#dc2626' : '#16a34a'};font-size:14px;">KES ${fees.annualBalance.toLocaleString()}</td></tr></tfoot>
</table>
<div class="summary-box">
  <div><div class="label">${fees.annualBalance > 0 ? 'Amount Due' : 'Fully Paid'}</div><div class="amount">KES ${fees.annualBalance.toLocaleString()}</div></div>
  ${fees.overpayment > 0 ? `<div style="text-align:right;"><div class="label" style="color:#16a34a;">Overpayment</div><div style="font-size:16px;font-weight:800;color:#16a34a;">KES ${fees.overpayment.toLocaleString()}</div></div>` : ''}
</div>
<div class="footer">
  <p>This is a computer-generated statement. No signature required.</p>
  <p>Generated on ${new Date().toLocaleString('en-KE')}</p>
</div>
</body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 300);
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div></div>;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FiFileText size={18} /></span> Fee Statements</h1><p className="text-sm text-gray-400 mt-0.5 ml-12">Generate and print individual student fee statements</p></div>
                <Link href="/dashboard/fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"><FiArrowLeft size={12} /> Fee Dashboard</Link>
            </div>

            {/* Search */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><FiSearch size={14} className="text-amber-500" /> Search Student</h3>
                <div className="flex gap-2">
                    <input type="text" value={admNo} onChange={e => setAdmNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Enter admission number..." className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-amber-400 outline-none bg-gray-50 focus:bg-white" />
                    <button onClick={search} className="px-6 py-3 rounded-lg text-white text-sm font-bold shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FiSearch size={16} /></button>
                </div>
            </div>

            {student && (() => {
                const fees = getStudentFees(student.id, student.form_id);
                const stmtPayments = payments.filter(p => p.student_id === student.id).sort((a: any, b: any) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

                // Fee breakdown by vote head
                const applicable = structures.filter(f => !f.form_id || f.form_id === student.form_id);
                let runningBalance = fees.annualTotal;

                return (
                    <>
                        {/* Student summary card */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"><FiUser size={18} className="text-indigo-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Student</p><p className="font-bold text-gray-900">{student.first_name} {student.last_name}</p><p className="text-xs text-gray-500">{student.admission_no || student.admission_number} • {getFormName(student.form_id)}</p></div></div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FiDollarSign size={18} className="text-emerald-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Total Paid</p><p className="text-xl font-extrabold text-emerald-600">{fmt(fees.totalPaid)}</p></div></div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><FiDollarSign size={18} className="text-red-600" /></div><div><p className="text-[10px] font-bold text-gray-400 uppercase">Annual Balance</p><p className="text-xl font-extrabold text-red-600">{fmt(fees.annualBalance)}</p></div></div>
                            <div className="flex items-center justify-end gap-2"><button onClick={printStatement} className="px-4 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiPrinter size={14} /> Print Statement</button></div>
                        </div>

                        {/* Statement Document */}
                        <div ref={stmtRef} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-200 text-center" style={{ background: 'linear-gradient(135deg, #fffbeb, #fefce8)' }}>
                                <h2 className="text-xl font-extrabold text-gray-900">ALPHA PREMIER SCHOOL</h2>
                                <p className="text-sm text-gray-600 font-semibold mt-1">FEE STATEMENT</p>
                                <p className="text-xs text-gray-400 mt-1">{currentTerm?.term_name || ''} {new Date().getFullYear()}</p>
                            </div>

                            {/* Student Info */}
                            <div className="p-5 grid grid-cols-2 gap-4 border-b border-gray-200">
                                <div className="space-y-2.5">
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Student Name</span><p className="font-bold text-gray-800">{student.first_name} {student.other_name || student.middle_name || ''} {student.last_name}</p></div>
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Admission No</span><p className="font-bold text-indigo-600">{student.admission_no || student.admission_number}</p></div>
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Guardian</span><p className="font-medium text-gray-700">{student.guardian_name || '-'}</p></div>
                                </div>
                                <div className="space-y-2.5">
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Form / Stream</span><p className="font-bold text-gray-800">{getFormName(student.form_id)} • {getStreamName(student.stream_id)}</p></div>
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Statement Date</span><p className="font-bold text-gray-800">{new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                                    <div><span className="text-[10px] font-bold text-gray-400 uppercase block">Guardian Phone</span><p className="font-medium text-gray-700">{student.guardian_phone || '-'}</p></div>
                                </div>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="px-5 pt-5 pb-2"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fee Breakdown</h4></div>
                            <div className="px-5 pb-3">
                                <table className="w-full">
                                    <thead><tr className="border-b border-gray-200"><th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">#</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Fee Vote Head</th><th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Form</th><th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Term</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amount</th></tr></thead>
                                    <tbody>{applicable.map((f: any, i: number) => (
                                        <tr key={f.id} className="border-b border-gray-50"><td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td><td className="px-3 py-2 text-sm font-medium text-gray-700">{f.category}</td><td className="px-3 py-2 text-center text-xs text-gray-500">{f.form_id ? getFormName(f.form_id) : 'All'}</td><td className="px-3 py-2 text-center text-xs text-gray-500">{f.term_id ? terms.find(t => t.id === f.term_id)?.term_name || '-' : 'All'}</td><td className="px-3 py-2 text-right font-semibold text-gray-700">{fmt(Number(f.amount))}</td></tr>
                                    ))}</tbody>
                                    <tfoot><tr className="bg-amber-50 border-t-2 border-amber-200"><td colSpan={4} className="px-3 py-2 font-bold text-amber-800 text-sm">TOTAL ANNUAL FEE</td><td className="px-3 py-2 text-right font-extrabold text-amber-800 text-lg">{fmt(fees.annualTotal)}</td></tr></tfoot>
                                </table>
                            </div>

                            {/* Ledger */}
                            <div className="px-5 pt-4 pb-2"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Ledger</h4></div>
                            <div className="px-5 pb-3">
                                <table className="w-full">
                                    <thead><tr className="border-b border-gray-200"><th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Description</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Reference</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Debit</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Credit</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Balance</th></tr></thead>
                                    <tbody>
                                        <tr className="border-b border-gray-100 bg-amber-50/50"><td className="px-3 py-2 text-sm">—</td><td className="px-3 py-2 text-sm font-semibold text-gray-700">Annual Fee Charge</td><td className="px-3 py-2 text-sm text-gray-400">FEE-STRUCT</td><td className="px-3 py-2 text-right font-bold text-red-600">{fmt(fees.annualTotal)}</td><td className="px-3 py-2 text-right text-gray-400">—</td><td className="px-3 py-2 text-right font-bold text-red-600">{fmt(fees.annualTotal)}</td></tr>
                                        {stmtPayments.map(p => { runningBalance -= Number(p.amount || 0); return (
                                            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-3 py-2 text-sm">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-3 py-2 text-sm text-gray-700">Payment — {p.payment_method}</td><td className="px-3 py-2 text-sm"><span className="font-mono text-xs text-indigo-600">{p.receipt_number || '-'}</span></td><td className="px-3 py-2 text-right text-gray-400">—</td><td className="px-3 py-2 text-right font-bold text-green-600">{fmt(Number(p.amount))}</td><td className="px-3 py-2 text-right font-bold" style={{ color: runningBalance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(Math.max(0, runningBalance))}</td></tr>
                                        ); })}
                                    </tbody>
                                    <tfoot><tr className="bg-gray-50 border-t-2 border-gray-300"><td colSpan={3} className="px-3 py-3 font-bold text-gray-700 text-sm">CLOSING BALANCE</td><td className="px-3 py-3 text-right font-bold text-red-600 text-sm">{fmt(fees.annualTotal)}</td><td className="px-3 py-3 text-right font-bold text-green-600 text-sm">{fmt(fees.totalPaid)}</td><td className="px-3 py-3 text-right font-extrabold text-sm" style={{ color: fees.annualBalance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(fees.annualBalance)}</td></tr></tfoot>
                                </table>
                            </div>

                            {/* Summary box */}
                            <div className="mx-5 mb-5 p-4 rounded-xl border-2" style={{ borderColor: fees.annualBalance > 0 ? '#fecaca' : '#bbf7d0', background: fees.annualBalance > 0 ? '#fef2f2' : '#f0fdf4' }}>
                                <div className="flex items-center justify-between">
                                    <div><p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: fees.annualBalance > 0 ? '#dc2626' : '#16a34a' }}>{fees.annualBalance > 0 ? 'Amount Due' : 'Fully Paid'}</p><p className="text-2xl font-extrabold mt-0.5" style={{ color: fees.annualBalance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(fees.annualBalance)}</p></div>
                                    {fees.overpayment > 0 && <div className="text-right"><p className="text-[10px] font-bold text-green-500 uppercase">Overpayment</p><p className="text-lg font-extrabold text-green-600">{fmt(fees.overpayment)}</p></div>}
                                </div>
                            </div>

                            <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-100">
                                This is a computer-generated statement. No signature required. • Generated on {new Date().toLocaleString('en-KE')}
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
}

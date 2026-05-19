'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, getMethodColor } from '../useFeeData';
import { FiSearch, FiClipboard, FiDownload, FiEdit2, FiTrash2, FiPrinter, FiChevronLeft, FiChevronRight, FiArrowLeft, FiFilter, FiX } from 'react-icons/fi';

export default function PaymentHistoryPage() {
    const { students, payments, terms, loading, fetchAll, getFormName, getStreamName, getStudentFees } = useFeeData();
    const [search, setSearch] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const filtered = payments.filter(p => {
        if (filterMethod && !(p.payment_method || '').includes(filterMethod)) return false;
        if (dateFrom && p.payment_date < dateFrom) return false;
        if (dateTo && p.payment_date > dateTo) return false;
        if (search) {
            const s = students.find(st => st.id === p.student_id);
            const q = search.toLowerCase();
            return (s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)) || (p.receipt_number || '').toLowerCase().includes(q) || (s && (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q));
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    const totalAmount = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Daily summary for today
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.payment_date === today);
    const todayTotal = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const exportCSV = () => {
        const headers = ['#','Date','Receipt','Adm No','Student','Form','Amount','Method','Reference','Term'];
        const rows = filtered.map((p, i) => { const s = students.find(st => st.id === p.student_id); return [i + 1, p.payment_date, p.receipt_number || '', s?.admission_no || s?.admission_number || '', s ? `${s.first_name} ${s.last_name}` : '', s ? getFormName(s.form_id) : '', p.amount, p.payment_method, p.reference_number || '', terms.find(t => t.id === p.term_id)?.term_name || '']; });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payments_${today}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const handleDelete = async (id: number) => { if (!confirm('Delete this payment?')) return; await supabase.from('school_fee_payments').delete().eq('id', id); toast.success('Deleted'); fetchAll(); };

    const printReceipt = (p: any) => {
        const s = students.find(st => st.id === p.student_id);
        const fees = s ? getStudentFees(s.id, s.form_id) : null;
        const w = window.open('', '_blank'); if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt - ${p.receipt_number}</title>
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
</style></head><body>
<div class="header"><h1>ALPHA PREMIER SCHOOL</h1><p>P.O. Box 000 | Tel: 0700 000 000</p><p style="font-weight:600;margin-top:4px;">OFFICIAL FEE PAYMENT RECEIPT</p></div>
<div class="receipt-no">Receipt No: <span>${p.receipt_number || '-'}</span></div>
<table class="info">
  <tr><td class="label">Date</td><td class="value">${new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
  <tr><td class="label">Student</td><td class="value">${s ? `${s.first_name} ${s.last_name}` : '-'}</td></tr>
  <tr><td class="label">Adm No</td><td class="value">${s?.admission_no || s?.admission_number || '-'}</td></tr>
  <tr><td class="label">Form</td><td class="value">${s ? getFormName(s.form_id) : '-'}</td></tr>
  <tr><td class="label">Method</td><td class="value">${p.payment_method || '-'}</td></tr>
  ${p.reference_number ? `<tr><td class="label">Reference</td><td class="value" style="font-family:monospace;">${p.reference_number}</td></tr>` : ''}
</table>
<div class="amount-box"><div class="label">Amount Received</div><div class="amount">KES ${Number(p.amount).toLocaleString()}</div></div>
${fees ? `<div class="divider"></div>
<div class="balance-row"><span class="bl">Total Paid</span><span class="bv">KES ${fees.totalPaid.toLocaleString()}</span></div>
<div class="balance-row"><span class="bl">Term Balance</span><span class="bv" style="color:#dc2626;">KES ${fees.termBalance.toLocaleString()}</span></div>
<div class="balance-row" style="border-bottom:none;"><span class="bl">Annual Balance</span><span class="bv" style="color:#dc2626;">KES ${fees.annualBalance.toLocaleString()}</span></div>` : ''}
<div class="footer"><p>Thank you for your payment</p><p>Computer-generated receipt</p><p>Printed: ${new Date().toLocaleString('en-KE')}</p></div>
</body></html>`);
        w.document.close(); setTimeout(() => w.print(), 300);
    };

    const editPayment = (p: any) => {
        const s = students.find(st => st.id === p.student_id);
        if (s) window.location.href = `/dashboard/fees/collect?adm=${s.admission_no || s.admission_number}`;
    };

    const inputCls = "px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div></div>;

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5"><span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiClipboard size={18} /></span> Payment History</h1><p className="text-sm text-gray-400 mt-0.5 ml-12">All fee payment transactions</p></div>
                <Link href="/dashboard/fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"><FiArrowLeft size={12} /> Fee Dashboard</Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><p className="text-[10px] font-semibold opacity-85 uppercase">Today</p><p className="text-lg font-extrabold mt-1">{fmt(todayTotal)}</p><p className="text-[10px] opacity-70">{todayPayments.length} payments</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><p className="text-[10px] font-semibold opacity-85 uppercase">Filtered Total</p><p className="text-lg font-extrabold mt-1">{fmt(totalAmount)}</p><p className="text-[10px] opacity-70">{filtered.length} records</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><p className="text-[10px] font-semibold opacity-85 uppercase">All Time</p><p className="text-lg font-extrabold mt-1">{fmt(payments.reduce((s, p) => s + Number(p.amount || 0), 0))}</p><p className="text-[10px] opacity-70">{payments.length} total</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><p className="text-[10px] font-semibold opacity-85 uppercase">Avg Payment</p><p className="text-lg font-extrabold mt-1">{fmt(payments.length > 0 ? payments.reduce((s, p) => s + Number(p.amount || 0), 0) / payments.length : 0)}</p><p className="text-[10px] opacity-70">Per transaction</p></div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, adm no, receipt..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
                    <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1); }} className={inputCls + ' min-w-[140px]'}><option value="">All Methods</option><option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option><option value="Bank">Bank Transfer</option><option value="Cheque">Cheque</option><option value="In-Kind">In-Kind</option></select>
                    <div className="flex items-center gap-1"><span className="text-xs text-gray-400">From</span><input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={inputCls} /></div>
                    <div className="flex items-center gap-1"><span className="text-xs text-gray-400">To</span><input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={inputCls} /></div>
                    <button onClick={exportCSV} className="px-5 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiDownload size={14} /> Export</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {paginated.length === 0 ? (
                    <div className="text-center py-20 text-gray-300"><FiClipboard size={40} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No payments found</p></div>
                ) : (<>
                    <div className="overflow-x-auto"><table className="w-full">
                        <thead><tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Receipt</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Method</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Term</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-28">Actions</th>
                        </tr></thead>
                        <tbody>{paginated.map((p, i) => {
                            const s = students.find(st => st.id === p.student_id);
                            return (
                                <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-xs font-bold">{p.receipt_number || '-'}</span></td>
                                    <td className="px-4 py-3 text-sm font-medium">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-4 py-3"><span className="font-bold text-indigo-600">{s?.admission_no || s?.admission_number || '-'}</span></td>
                                    <td className="px-4 py-3 font-semibold text-gray-800">{s ? `${s.first_name} ${s.last_name}` : '-'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{s ? getFormName(s.form_id) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(Number(p.amount))}</td>
                                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getMethodColor(p.payment_method)}`}>{p.payment_method}</span></td>
                                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.reference_number || '-'}</td>
                                    <td className="px-4 py-3">{p.term_id ? <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">{terms.find(t => t.id === p.term_id)?.term_name || '-'}</span> : '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-0.5">
                                            <button onClick={() => printReceipt(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Reprint Receipt"><FiPrinter size={13} /></button>
                                            <button onClick={() => editPayment(p)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Payment"><FiEdit2 size={13} /></button>
                                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><FiTrash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                        <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200"><td colSpan={6} className="px-4 py-3 font-bold text-sm text-gray-600">{filtered.length} payments</td><td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-sm">{fmt(totalAmount)}</td><td colSpan={4}></td></tr></tfoot>
                    </table></div>
                    {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between"><p className="text-xs text-gray-500">Page {page} of {totalPages}</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronLeft size={16} /></button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronRight size={16} /></button></div></div>}
                </>)}
            </div>
        </div>
    );
}

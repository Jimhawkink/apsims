'use client';

import { useState, useMemo } from 'react';
import { fmt } from '@/hooks/useUltraFeeCollect';
import { printThermalReceipt } from './UltraThermalReceipt';
import { createClient } from '@supabase/supabase-js';
import {
  FiClock, FiFileText, FiPrinter, FiSearch, FiCreditCard,
  FiSmartphone, FiPocket, FiPhone, FiTrash2, FiExternalLink,
  FiCheckCircle, FiShield, FiCheck, FiDownload,
} from 'react-icons/fi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  student: any;
  payments: any[];
  statement: { totalCharged: number; totalPaid: number; balance: number; entries: any[] };
  fees: any;
  terms: any[];
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  onEditPayment: (payment: any) => void;
  onDeletePayment: (id: number) => void;
  settings?: any;
}

export default function UltraFeeHistoryPanel({
  student, payments, statement, fees, terms,
  getFormName, getStreamName, onEditPayment, onDeletePayment, settings,
}: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'statement' | 'receipts'>('history');
  const [searchTerm, setSearchTerm] = useState('');

  const adm = student?.admission_no || student?.admission_number || '—';
  const parentPhone = student?.guardian_phone || '';

  // Filter payments by search term
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const q = searchTerm.trim().toLowerCase();
    return payments.filter(p => {
      const rec = String(p.receipt_number || '').toLowerCase();
      const ref = String(p.reference_number || '').toLowerCase();
      const method = String(p.payment_method || '').toLowerCase();
      return rec.includes(q) || ref.includes(q) || method.includes(q);
    });
  }, [payments, searchTerm]);

  // Handle thermal print
  const handlePrintReceipt = async (p: any) => {
    let allocations: { head: string; amount: number }[] = [];
    try {
      const { data: allocs } = await supabase
        .from('school_fee_payment_allocations')
        .select('vote_head_name, vote_head_code, allocated_amount')
        .eq('payment_id', p.id)
        .order('allocated_amount', { ascending: false });
      if (allocs && allocs.length > 0) {
        allocations = allocs.map((a: any) => ({
          head: a.vote_head_name || a.vote_head_code || 'General',
          amount: Number(a.allocated_amount),
        }));
      }
    } catch { /* proceed without breakdown */ }

    printThermalReceipt({
      receiptNumber: p.receipt_number || `REC-${p.id}`,
      paymentDate: p.payment_date,
      studentName: `${student.first_name} ${student.last_name}`,
      admissionNo: adm,
      formStream: `${getFormName(student.form_id)} ${getStreamName(student.stream_id)}`,
      parentName: student.guardian_name,
      parentPhone: student.guardian_phone,
      paymentMethod: p.payment_method || 'Cash',
      reference: p.reference_number,
      amount: Number(p.amount),
      totalPaid: fees?.totalPaid ?? 0,
      termFees: fees?.termTotal ?? 0,
      termBalance: fees?.termBalance ?? 0,
      annualFees: fees?.annualTotal ?? 0,
      annualBalance: fees?.annualBalance ?? 0,
      allocations,
      schoolName: settings?.school_name,
      schoolPhone: settings?.school_phone,
      schoolAddress: settings?.school_address,
      schoolEmail: settings?.school_email,
    });
  };

  // WhatsApp e-receipt
  const handleWhatsAppReceipt = (p: any) => {
    if (!parentPhone) return;
    const phone = parentPhone.replace(/\D/g, '');
    const intl = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    const recNo = p.receipt_number || `REC-${p.id}`;
    const amountStr = fmt(p.amount);
    const dateStr = new Date(p.payment_date).toLocaleDateString('en-KE');
    const msg = encodeURIComponent(
      `*OFFICIAL FEE RECEIPT*\n` +
      `School: ${settings?.school_name || 'APSIMS School'}\n` +
      `Receipt No: *${recNo}*\n` +
      `Student: *${student.first_name} ${student.last_name}* (${adm})\n` +
      `Amount Paid: *${amountStr}*\n` +
      `Method: ${p.payment_method || 'Cash'}\n` +
      `Date: ${dateStr}\n` +
      `Term Balance: *${fmt(fees?.termBalance ?? 0)}*\n` +
      `Thank you for your payment.`
    );
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full font-sans">

      {/* ════════════════════════════════════════
          1. TAB HEADERS (LIGHT THEME)
      ════════════════════════════════════════ */}
      <div className="px-5 pt-3 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiClock className="w-3.5 h-3.5" />
            <span>Transaction Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'history' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'statement'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiFileText className="w-3.5 h-3.5" />
            <span>Certified Statement</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'statement' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {statement?.entries?.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'receipts'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiPrinter className="w-3.5 h-3.5" />
            <span>Receipts Archive</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'receipts' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {payments.length}
            </span>
          </button>
        </div>

        {/* Tab-Level Action Search */}
        {activeTab === 'history' && payments.length > 3 && (
          <div className="relative pb-2">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
            <input
              type="text"
              placeholder="Search receipt / ref…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1 rounded-xl text-[11px] font-medium border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          2. TAB CONTENT
      ════════════════════════════════════════ */}
      <div className="p-5 flex-1 overflow-y-auto">

        {/* ──────── TAB 1: TRANSACTION HISTORY DATAGRID ──────── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FiClock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-600 text-xs">No payment records found for this student</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Pay Fees&quot; on the left to record the first payment</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPayments.map((p) => {
                      const isMpesa = p.payment_method === 'M-Pesa';
                      const isBank = p.payment_method?.toLowerCase().includes('bank');

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                            <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                              {p.receipt_number || `REC-${p.id}`}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="font-semibold">
                              {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.created_at ? new Date(p.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isMpesa
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isBank
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {isMpesa ? '📱 M-Pesa' : isBank ? '🏦 Bank' : '💵 Cash'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {p.reference_number || '—'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-sm">
                            +{fmt(p.amount)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintReceipt(p)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
                                title="Reprint 80mm POS Thermal Receipt"
                              >
                                <FiPrinter className="w-3 h-3" /> 80mm
                              </button>

                              {parentPhone && (
                                <button
                                  onClick={() => handleWhatsAppReceipt(p)}
                                  className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                                  title="Send WhatsApp receipt to parent"
                                >
                                  <FiPhone className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                onClick={() => onDeletePayment(p.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Delete payment"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
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

        {/* ──────── TAB 2: CERTIFIED STATEMENT & LEDGER ──────── */}
        {activeTab === 'statement' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Particulars / Description</th>
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3 text-right">Debit (Invoiced)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {statement?.entries?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                        No ledger statement entries recorded
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((e: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {new Date(e.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{e.description}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{e.reference || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                          {e.debit > 0 ? fmt(e.debit) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {e.credit > 0 ? fmt(e.credit) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                          {fmt(e.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-extrabold text-xs border-t-2 border-slate-300">
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-slate-500">
                      Total Ledger Summary
                    </td>
                    <td className="py-3 px-3 text-right text-red-600 font-mono">
                      {fmt(statement?.totalCharged ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-mono">
                      {fmt(statement?.totalPaid ?? 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-mono text-sm">
                      {fmt(fees?.termBalance ?? statement?.balance ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 3: RECEIPTS ARCHIVE ──────── */}
        {activeTab === 'receipts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payments.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                    {p.receipt_number || `REC-${p.id}`}
                  </span>
                  <span className="text-xs font-black text-emerald-600 font-mono">{fmt(p.amount)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Method: <strong className="text-slate-800">{p.payment_method || 'Cash'}</strong></span>
                  <span>Date: {new Date(p.payment_date).toLocaleDateString('en-KE')}</span>
                </div>
                {p.reference_number && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ref: {p.reference_number}
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handlePrintReceipt(p)}
                    className="px-3 py-1 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FiPrinter className="w-3.5 h-3.5 text-indigo-600" /> Print Slip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

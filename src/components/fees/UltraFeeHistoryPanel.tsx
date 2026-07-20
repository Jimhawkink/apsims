'use client';

import { useState } from 'react';
import { fmt } from '@/hooks/useUltraFeeCollect';
import { printThermalReceipt } from './UltraThermalReceipt';

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

const METHOD_COLORS: Record<string, string> = {
  'Cash': 'bg-emerald-100 text-emerald-700', 'M-Pesa': 'bg-green-100 text-green-700',
  'Bank Transfer': 'bg-blue-100 text-blue-700', 'Bank': 'bg-blue-100 text-blue-700',
  'Cheque': 'bg-amber-100 text-amber-700', 'In-Kind': 'bg-purple-100 text-purple-700',
};
const getMethodColor = (m: string) => Object.entries(METHOD_COLORS).find(([k]) => m?.includes(k))?.[1] || 'bg-gray-100 text-gray-600';

export default function UltraFeeHistoryPanel({ student, payments, statement, fees, terms, getFormName, getStreamName, onEditPayment, onDeletePayment, settings }: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'statement' | 'receipts'>('history');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const adm = student?.admission_no || student?.admission_number || '';
  const tabs = [
    { id: 'history' as const, label: 'Payment History', icon: '📋', count: payments.length },
    { id: 'statement' as const, label: 'Statement', icon: '📊', count: statement.entries.length },
    { id: 'receipts' as const, label: 'Receipts', icon: '🧾', count: payments.length },
  ];

  const handlePrintReceipt = (p: any) => {
    printThermalReceipt({
      receiptNumber: p.receipt_number || '', paymentDate: p.payment_date,
      studentName: `${student.first_name} ${student.last_name}`, admissionNo: adm,
      formStream: `${getFormName(student.form_id)} / ${getStreamName(student.stream_id)}`,
      parentName: student.guardian_name, parentPhone: student.guardian_phone,
      paymentMethod: p.payment_method || 'Cash', reference: p.reference_number,
      amount: Number(p.amount), totalPaid: fees.totalPaid,
      termFees: fees.termTotal, termBalance: fees.termBalance,
      annualFees: fees.annualTotal, annualBalance: fees.annualBalance,
      schoolName: settings?.school_name, schoolPhone: settings?.school_phone,
      schoolAddress: settings?.school_address, schoolEmail: settings?.school_email,
    });
  };

  const printStatement = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const rows = statement.entries.map((e, i) => `<tr style="border-bottom:1px solid #eee;"><td style="padding:6px 8px;font-size:11px;">${i + 1}</td><td style="padding:6px 8px;font-size:11px;">${new Date(e.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td style="padding:6px 8px;font-size:11px;">${e.description}</td><td style="padding:6px 8px;font-size:11px;font-family:monospace;">${e.reference}</td><td style="padding:6px 8px;font-size:11px;text-align:right;color:#16a34a;font-weight:600;">${e.credit > 0 ? 'KES ' + e.credit.toLocaleString() : '-'}</td><td style="padding:6px 8px;font-size:11px;text-align:right;font-weight:700;">${'KES ' + e.balance.toLocaleString()}</td></tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Statement - ${adm}</title><style>@page{size:A4;margin:15mm}body{font-family:'Segoe UI',sans-serif;max-width:750px;margin:0 auto;padding:20px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px;font-size:10px;text-transform:uppercase;text-align:left;border-bottom:2px solid #ddd}.no-print{text-align:center;margin:16px}@media print{.no-print{display:none}}</style></head><body><div style="text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:16px"><h2 style="margin:0">${settings?.school_name || 'ALPHA PREMIER SCHOOL'}</h2><p style="font-size:11px;color:#666;margin:4px 0">${settings?.school_address || 'P.O. Box 000'} | ${settings?.school_phone || 'Tel: 0700 000 000'}</p><h3 style="margin:8px 0 0;font-size:14px;letter-spacing:2px">FEE STATEMENT</h3></div><table style="margin-bottom:12px"><tr><td style="font-size:11px;width:100px;font-weight:700;color:#888">Student:</td><td style="font-size:12px;font-weight:600">${student.first_name} ${student.last_name}</td><td style="font-size:11px;width:100px;font-weight:700;color:#888">Adm No:</td><td style="font-size:12px;font-weight:600;font-family:monospace">${adm}</td></tr><tr><td style="font-size:11px;font-weight:700;color:#888">Class:</td><td style="font-size:12px">${getFormName(student.form_id)} / ${getStreamName(student.stream_id)}</td><td style="font-size:11px;font-weight:700;color:#888">Date:</td><td style="font-size:12px">${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr></table><table><thead><tr><th>#</th><th>Date</th><th>Description</th><th>Reference</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="border-top:2px solid #000;font-weight:700"><td colspan="4" style="padding:8px;font-size:12px">TOTALS</td><td style="padding:8px;text-align:right;color:#16a34a;font-size:12px">KES ${statement.totalPaid.toLocaleString()}</td><td style="padding:8px;text-align:right;font-size:12px">KES ${statement.balance.toLocaleString()}</td></tr></tfoot></table><div style="margin-top:20px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between"><div><p style="font-size:10px;color:#999">Total Charged: KES ${statement.totalCharged.toLocaleString()}</p><p style="font-size:10px;color:#999">Total Paid: KES ${statement.totalPaid.toLocaleString()}</p></div><div style="text-align:right"><p style="font-size:10px;color:#999">Printed: ${new Date().toLocaleString('en-KE')}</p><p style="font-size:10px;color:#999">Powered by APSIMS™</p></div></div><div class="no-print"><button onclick="window.print()" style="padding:8px 24px;background:#6366f1;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer">🖨️ Print</button></div></body></html>`);
    w.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-100">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${activeTab === tab.id ? 'text-violet-700 bg-violet-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count > 0 && <span className={`ml-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${activeTab === tab.id ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>}
            {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══════ PAYMENT HISTORY TAB ═══════ */}
        {activeTab === 'history' && (() => {
          // Split payments into current term vs previous terms
          const currentTermId = fees?.currentTermId ||
            (terms.find((t: any) => t.is_current))?.id;
          const thisTermPays  = payments.filter((p: any) => p.term_id === currentTermId);
          const prevTermPays  = payments.filter((p: any) => p.term_id !== currentTermId);
          const allEmpty      = payments.length === 0;

          if (allEmpty) return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-medium">No payments recorded yet</p>
              <p className="text-xs text-gray-300 mt-1">Record a payment to get started</p>
            </div>
          );

          const renderRows = (list: any[], startIdx = 0) => list.map((p: any, i: number) => (
            <div key={p.id}>
              <button onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50/50 transition-colors flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 text-[10px] font-black">{startIdx + i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{p.receipt_number || '-'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getMethodColor(p.payment_method)}`}>{p.payment_method}</span>
                    {p.term_id && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{terms.find((t: any) => t.id === p.term_id)?.term_name || ''}</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className="text-sm font-extrabold text-emerald-600">{fmt(Number(p.amount))}</span>
                <svg className={`w-4 h-4 text-gray-300 transition-transform ${expandedRow === p.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedRow === p.id && (
                <div className="px-4 pb-3 pt-1 bg-gray-50/50 space-y-2">
                  {p.reference_number && <div className="flex justify-between text-xs"><span className="text-gray-400">Reference</span><span className="font-mono font-semibold">{p.reference_number}</span></div>}
                  {p.term_id && <div className="flex justify-between text-xs"><span className="text-gray-400">Term</span><span className="font-semibold text-violet-700">{terms.find((t: any) => t.id === p.term_id)?.term_name || '-'}</span></div>}
                  {p.notes && <div className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-100">📝 {p.notes}</div>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handlePrintReceipt(p)} className="px-3 py-1.5 text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center gap-1 transition-colors">🖨️ Receipt</button>
                    <button onClick={() => onEditPayment(p)} className="px-3 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors">✏️ Edit</button>
                    <button onClick={() => { if (confirm('Delete this payment?')) onDeletePayment(p.id); }} className="px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors">🗑️ Delete</button>
                  </div>
                </div>
              )}
            </div>
          ));

          return (
            <div>
              {/* ── THIS TERM ── */}
              <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
                <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">📅 This Term</span>
                <span className="ml-auto text-[10px] font-bold text-violet-500">{fmt(thisTermPays.reduce((s: number, p: any) => s + Number(p.amount || 0), 0))}</span>
              </div>
              {thisTermPays.length === 0 ? (
                <div className="px-4 py-4 text-xs text-gray-400 italic">No payments recorded for this term yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">{renderRows(thisTermPays, 0)}</div>
              )}

              {/* ── PREVIOUS TERMS ── */}
              {prevTermPays.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-amber-50 border-y border-amber-100 flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">⏮️ Previous Terms (Arrears History)</span>
                    <span className="ml-auto text-[10px] font-bold text-amber-500">{fmt(prevTermPays.reduce((s: number, p: any) => s + Number(p.amount || 0), 0))}</span>
                  </div>
                  <div className="divide-y divide-gray-50">{renderRows(prevTermPays, thisTermPays.length)}</div>
                </>
              )}

              {/* Total footer */}
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">All Payments ({payments.length})</span>
                <span className="text-sm font-extrabold text-emerald-700">{fmt(payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0))}</span>
              </div>
            </div>
          );
        })()}

        {/* ═══════ STATEMENT TAB ═══════ */}
        {activeTab === 'statement' && (
          <div>
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 to-indigo-50/50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold">Charged: {fmt(statement.totalCharged)}</span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold">Paid: {fmt(statement.totalPaid)}</span>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold">Bal: {fmt(statement.balance)}</span>
              </div>
              <button onClick={printStatement} className="px-3 py-1.5 text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center gap-1 border border-violet-200 transition-colors">
                🖨️ Print
              </button>
            </div>
            {statement.entries.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <p className="text-sm font-medium">No statement entries</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[9px] font-bold text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-bold text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2.5 text-right text-[9px] font-bold text-gray-500 uppercase">Credit</th>
                    <th className="px-3 py-2.5 text-right text-[9px] font-bold text-gray-500 uppercase">Balance</th>
                  </tr></thead>
                  <tbody>
                    {/* Opening balance row */}
                    <tr className="border-b border-gray-50 bg-amber-50/30">
                      <td className="px-3 py-2 text-[10px] text-gray-400">—</td>
                      <td className="px-3 py-2 text-[10px] font-medium text-gray-600">Opening</td>
                      <td className="px-3 py-2 text-[10px] font-semibold text-gray-700">Total Fees Charged</td>
                      <td className="px-3 py-2 text-right text-[10px] text-gray-400">—</td>
                      <td className="px-3 py-2 text-right text-[10px] font-bold text-red-600">{fmt(statement.totalCharged)}</td>
                    </tr>
                    {statement.entries.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/20 transition-colors">
                        <td className="px-3 py-2 text-[10px] text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-[10px] font-medium">{new Date(e.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="px-3 py-2 text-[10px]">
                          <span className="font-medium text-gray-700">{e.description}</span>
                          {e.reference && <span className="ml-1.5 text-[9px] font-mono text-gray-400">({e.reference})</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] font-bold text-emerald-600">{e.credit > 0 ? fmt(e.credit) : '—'}</td>
                        <td className={`px-3 py-2 text-right text-[10px] font-bold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════ RECEIPTS TAB ═══════ */}
        {activeTab === 'receipts' && (
          payments.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-sm font-medium">No receipts available</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 gap-3">
              {payments.map((p: any) => (
                <div key={p.id} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold font-mono">{p.receipt_number || '-'}</span>
                    <span className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-extrabold text-gray-900">{fmt(Number(p.amount))}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 ${getMethodColor(p.payment_method)}`}>{p.payment_method}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePrintReceipt(p)} className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5">
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <style jsx>{`@keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }`}</style>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { fmt, BURSARY_SOURCES, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';
import {
  FiCreditCard, FiPrinter, FiFileText, FiPhone, FiAlertTriangle,
  FiCheckCircle, FiChevronDown, FiShield, FiSmartphone, FiAward,
  FiBox, FiLayers,
} from 'react-icons/fi';

interface Props {
  student: any;
  fees: StudentFeeProfile;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  onRecordPayment: () => void;
  onViewStatement: () => void;
  onPrintDemand: () => void;
}

export default function UltraStudentFeeProfile({
  student, fees, getFormName, getStreamName,
  onRecordPayment, onViewStatement, onPrintDemand,
}: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('breakdown');
  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const adm = student.admission_no || student.admission_number || '—';
  const pct = fees.paymentProgress;
  const isFemale = student.gender === 'Female';

  // Curriculum track indicator
  const formName = getFormName(student.form_id);
  const isCBC = formName.toLowerCase().includes('grade 10') || formName.toLowerCase().includes('grade 11') || formName.toLowerCase().includes('grade 12');

  const hasBursary = (fees.bursaryCredits?.length ?? 0) > 0;
  const hasCapitation = (fees.capitationTotal ?? 0) > 0;
  const hasArrears = (fees.prevTermArrears ?? 0) > 0;
  const isCleared = fees.isCleared || (fees.hasFeeStructure && fees.termBalance <= 0);

  return (
    <div className="space-y-4 font-sans">
      {/* ════════════════════════════════════════
          1. EXECUTIVE STUDENT PROFILE CARD (LIGHT THEME)
      ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">

        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm flex-shrink-0"
              style={{
                width: 48, height: 48,
                background: isFemale
                  ? 'linear-gradient(135deg, #ec4899, #f472b6)'
                  : 'linear-gradient(135deg, #4f46e5, #818cf8)',
              }}
            >
              {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {student.first_name} {student.other_name || ''} {student.last_name}
                </h2>
                {isCBC ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> CBC Senior School
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 8-4-4 Secondary
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium flex-wrap">
                <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                  {adm}
                </span>
                <span>•</span>
                <span>{formName} {student.stream_id ? '• ' + getStreamName(student.stream_id) : ''}</span>
                {student.nemis_no && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-slate-400">NEMIS: {student.nemis_no}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Pill */}
          <div>
            {isCleared ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FiCheckCircle className="w-3.5 h-3.5" /> Cleared
              </span>
            ) : fees.termBalance > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                <FiAlertTriangle className="w-3.5 h-3.5" /> Owing Fees
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                No Fees Set
              </span>
            )}
          </div>
        </div>

        {/* Parent & Contact Strip */}
        {student.guardian_phone && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">📱</span>
              <span className="font-mono font-bold text-slate-700">{student.guardian_phone}</span>
              {student.guardian_name && (
                <span className="text-slate-400 font-medium">({student.guardian_name})</span>
              )}
            </div>
            <a
              href={`https://wa.me/${student.guardian_phone.startsWith('0') ? '254' + student.guardian_phone.slice(1) : student.guardian_phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 font-bold flex items-center gap-1 text-[11px]"
            >
              <FiPhone className="w-3 h-3" /> WhatsApp Parent
            </a>
          </div>
        )}

        {/* ════════════════════════════════════════
            2. PROGRESS INDICATOR
        ════════════════════════════════════════ */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Annual Payment Progress
            </span>
            <span className="font-mono font-extrabold text-slate-800">
              {pct}% Paid
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Paid: {fmt(fees.totalPaid)}</span>
            <span>Annual Obligation: {fmt(fees.annualTotal)}</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            3. FOUR EXECUTIVE METRIC TILES
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Term Fees */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Term Fees</div>
            <div className="text-sm font-black text-indigo-700 mt-0.5">
              {fees.hasFeeStructure ? fmt(fees.termTotal) : 'Not Set'}
            </div>
          </div>

          {/* Paid This Term */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid This Term</div>
            <div className="text-sm font-black text-emerald-700 mt-0.5">
              {fmt(fees.termPaidAmt ?? 0)}
            </div>
          </div>

          {/* Term Balance Due */}
          <div className={`p-3 rounded-2xl border ${
            fees.termBalance > 0
              ? 'bg-red-50/60 border-red-200 text-red-950'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Term Balance Due</div>
            <div className={`text-sm font-black mt-0.5 ${fees.termBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {fees.hasFeeStructure ? fmt(fees.termBalance) : 'N/A'}
            </div>
          </div>

          {/* Annual Balance */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Balance</div>
            <div className="text-sm font-black text-slate-800 mt-0.5">
              {fees.hasFeeStructure ? fmt(fees.annualBalance) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Arrears Notice Callout */}
        {hasArrears && (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <div className="font-extrabold text-[11px] uppercase tracking-wider">Previous Term Arrears</div>
                <div className="text-[10px] text-amber-700">Carried forward into this term ledger</div>
              </div>
            </div>
            <div className="text-sm font-black font-mono text-amber-900">{fmt(fees.prevTermArrears)}</div>
          </div>
        )}

        {/* Net Due Now Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Settlement Due Now</div>
            <div className="text-xl font-black text-white mt-0.5 tracking-tight">{fmt(fees.netDue)}</div>
            {fees.prevTermArrears > 0 && (
              <div className="text-[10px] text-indigo-300 mt-0.5">
                Includes {fmt(fees.prevTermArrears)} arrears brought forward
              </div>
            )}
          </div>
          <button
            onClick={onRecordPayment}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5"
          >
            <FiCreditCard className="w-3.5 h-3.5" /> Pay Now
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          4. COLLAPSIBLE VOTE-HEAD BREAKDOWN
      ════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('breakdown')}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <FiLayers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Term Vote-Head Allocations</div>
              <div className="text-[10px] text-slate-400">{fees.feeBreakdown.length} vote-heads configured</div>
            </div>
          </div>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'breakdown' ? 'rotate-180' : ''}`} />
        </button>

        {expandedSection === 'breakdown' && (
          <div className="px-5 pb-4 pt-1 border-t border-slate-100 space-y-2">
            {fees.feeBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No fee structure configured for this form</p>
            ) : (
              fees.feeBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-800">{item.voteHead}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{fmt(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          5. BURSARIES & CAPITATION
      ════════════════════════════════════════ */}
      {(hasBursary || hasCapitation) && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 space-y-2">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Applied Subsidies &amp; Bursaries</div>
          <div className="space-y-1.5">
            {fees.bursaryCredits.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                <span className="font-bold text-purple-900">{b.source}</span>
                <span className="font-mono font-bold text-purple-700">+{fmt(b.amount)}</span>
              </div>
            ))}
            {hasCapitation && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                <span className="font-bold text-blue-900">MoE Government Capitation</span>
                <span className="font-mono font-bold text-blue-700">+{fmt(fees.capitationTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          6. ACTION BAR
      ════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onRecordPayment}
          className="col-span-1 py-3 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5"
        >
          <FiCreditCard className="w-3.5 h-3.5" />
          <span>Pay Fees</span>
        </button>

        <button
          onClick={onViewStatement}
          className="py-3 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-1.5"
        >
          <FiPrinter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Statement</span>
        </button>

        <button
          onClick={onPrintDemand}
          className="py-3 rounded-2xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-1.5"
        >
          <FiAlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>Demand</span>
        </button>
      </div>
    </div>
  );
}

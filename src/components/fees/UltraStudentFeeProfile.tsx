'use client';

import { useState } from 'react';
import { fmt, BURSARY_SOURCES, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';

interface Props {
  student: any;
  fees: StudentFeeProfile;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  onRecordPayment: () => void;
  onViewStatement: () => void;
  onPrintDemand: () => void;
}

export default function UltraStudentFeeProfile({ student, fees, getFormName, getStreamName, onRecordPayment, onViewStatement, onPrintDemand }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('breakdown');

  const toggleSection = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  const adm = student.admission_no || student.admission_number || '';
  const pct = fees.paymentProgress;
  const pctColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct >= 25 ? '#f97316' : '#ef4444';
  const pctBg = pct >= 80 ? 'from-emerald-400 to-green-500' : pct >= 50 ? 'from-amber-400 to-yellow-500' : pct >= 25 ? 'from-orange-400 to-amber-500' : 'from-red-400 to-rose-500';

  // Check flags
  const hasBursary = fees.bursaryCredits.length > 0;
  const hasCapitation = fees.capitationTotal > 0;
  const hasSiblingDiscount = false; // extend with sibling logic
  const isOverpaid = fees.overpayment > 0;
  const hasArrears = fees.prevTermArrears > 0;

  return (
    <div className="space-y-3">
      {/* ═══════ STUDENT CARD ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
        {/* Header gradient */}
        <div className="relative px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-black shadow-lg border border-white/20">
              {student.first_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-white truncate">
                {student.first_name} {student.other_name || ''} {student.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded-lg text-xs font-bold font-mono">{adm}</span>
                <span className="text-white/80 text-xs font-medium">{getFormName(student.form_id)} • {getStreamName(student.stream_id)}</span>
              </div>
              {student.guardian_phone && (
                <div className="flex items-center gap-1 mt-1.5 text-white/60 text-[10px]">
                  <span>📱</span>
                  <span>{student.guardian_phone}</span>
                  {student.guardian_name && <span className="text-white/40">• {student.guardian_name}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Status Flags */}
          <div className="relative flex flex-wrap gap-1.5 mt-3">
            {hasBursary && (
              <span className="px-2 py-0.5 bg-emerald-400/20 backdrop-blur-sm text-emerald-100 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-emerald-300/20">
                🎓 Bursary
              </span>
            )}
            {hasCapitation && (
              <span className="px-2 py-0.5 bg-blue-400/20 backdrop-blur-sm text-blue-100 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-blue-300/20">
                🏛️ Capitation
              </span>
            )}
            {hasSiblingDiscount && (
              <span className="px-2 py-0.5 bg-pink-400/20 backdrop-blur-sm text-pink-100 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-pink-300/20">
                👫 Sibling
              </span>
            )}
            {isOverpaid && (
              <span className="px-2 py-0.5 bg-green-400/20 backdrop-blur-sm text-green-100 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-green-300/20">
                ✅ Overpaid
              </span>
            )}
            {hasArrears && (
              <span className="px-2 py-0.5 bg-red-400/20 backdrop-blur-sm text-red-100 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-red-300/20">
                ⚠️ Arrears
              </span>
            )}
            {student.nemis_no && (
              <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm text-white/70 rounded-lg text-[9px] font-medium border border-white/10">
                NEMIS: {student.nemis_no}
              </span>
            )}
          </div>
        </div>

        {/* ═══════ PAYMENT PROGRESS ═══════ */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Progress</span>
            <span className="text-sm font-extrabold" style={{ color: pctColor }}>{pct}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${pctBg} transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-400">{fmt(fees.totalPaid)} paid</span>
            <span className="text-[9px] text-gray-400">{fmt(fees.annualTotal)} total</span>
          </div>
        </div>

        {/* ═══════ 4 METRIC CARDS ═══════ */}
        <div className="px-4 pb-2 grid grid-cols-2 gap-2">
          <MetricCard
            label="Term Fees"
            value={fees.hasFeeStructure ? fmt(fees.termTotal) : 'Not Set'}
            gradient="from-violet-50 to-indigo-50" border="border-violet-100" textColor="text-violet-700" />
          <MetricCard
            label="Paid This Term"
            value={fmt(fees.termPaidAmt ?? 0)}
            gradient="from-emerald-50 to-green-50" border="border-emerald-100" textColor="text-emerald-700" />
          <MetricCard
            label="Term Balance"
            value={fees.hasFeeStructure ? fmt(fees.termBalance) : 'N/A'}
            gradient="from-red-50 to-rose-50" border="border-red-100" textColor="text-red-700"
            highlight={fees.termBalance > 0} />
          <MetricCard
            label="Annual Balance"
            value={fees.hasFeeStructure ? fmt(fees.annualBalance) : 'N/A'}
            gradient="from-amber-50 to-orange-50" border="border-amber-100" textColor="text-amber-700" />
        </div>

        {/* Arrears warning strip */}
        {fees.prevTermArrears > 0 && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
            <span className="text-red-500 text-sm">⚠️</span>
            <div>
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Previous Term Arrears</p>
              <p className="text-sm font-extrabold text-red-600">{fmt(fees.prevTermArrears)}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[9px] text-red-400">Carried forward</p>
              <p className="text-[9px] text-red-400">to this term</p>
            </div>
          </div>
        )}

        {/* ═══════ NET DUE BANNER ═══════ */}
        <div className="mx-4 mb-3 p-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Due Now</p>
            <p className="text-xl font-black text-white mt-0.5">{fmt(fees.netDue)}</p>
            {fees.prevTermArrears > 0 && (
              <p className="text-[9px] text-amber-300 mt-0.5">
                Arrears {fmt(fees.prevTermArrears)} + Term {fmt(fees.termBalance)}
              </p>
            )}
          </div>
          <div className="text-right space-y-0.5">
            {fees.bursaryTotal > 0 && <div className="text-[9px] text-emerald-400 font-medium">- {fmt(fees.bursaryTotal)} bursary</div>}
            {fees.capitationTotal > 0 && <div className="text-[9px] text-blue-400 font-medium">- {fmt(fees.capitationTotal)} capitation</div>}
            {fees.annualBalance > fees.netDue && (
              <div className="text-[9px] text-gray-400 font-medium">Annual bal: {fmt(fees.annualBalance)}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ EXPANDABLE SECTIONS ═══════ */}

      {/* Fee Breakdown */}
      <CollapsibleSection
        title="Fee Breakdown"
        icon="📋"
        count={fees.feeBreakdown.length}
        isOpen={expandedSection === 'breakdown'}
        onToggle={() => toggleSection('breakdown')}
      >
        {fees.feeBreakdown.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No fee structure configured</p>
        ) : (
          <div className="space-y-1.5">
            {fees.feeBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-xs font-semibold text-gray-700">{item.voteHead}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-violet-50 border border-violet-100 mt-2">
              <span className="text-xs font-bold text-violet-600 uppercase">Total</span>
              <span className="text-sm font-extrabold text-violet-700">{fmt(fees.termTotal)}</span>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Bursary & Capitation Credits */}
      <CollapsibleSection
        title="Bursary & Capitation"
        icon="🎓"
        count={fees.bursaryCredits.length}
        badge={fees.bursaryTotal + fees.capitationTotal > 0 ? fmt(fees.bursaryTotal + fees.capitationTotal) : undefined}
        badgeColor="text-emerald-700 bg-emerald-50"
        isOpen={expandedSection === 'bursary'}
        onToggle={() => toggleSection('bursary')}
      >
        {fees.bursaryCredits.length === 0 && fees.capitationTotal === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No bursary or capitation applied</p>
        ) : (
          <div className="space-y-2">
            {fees.bursaryCredits.map((credit, i) => {
              const sourceInfo = BURSARY_SOURCES.find(b => b.id === credit.source) || { label: credit.source, icon: '💰', color: '#666' };
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-lg">{sourceInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{sourceInfo.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {credit.reference && <span className="text-[9px] text-gray-400 font-mono">{credit.reference}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        credit.status === 'Applied' || credit.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        credit.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>{credit.status}</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">{fmt(credit.amount)}</span>
                </div>
              );
            })}
            {fees.capitationTotal > 0 && (
              <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-blue-50/80 border border-blue-100">
                <span className="text-lg">🏛️</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-800">MoE Capitation</p>
                  <span className="text-[9px] text-blue-500">Government subsidy applied</span>
                </div>
                <span className="text-sm font-extrabold text-blue-600">{fmt(fees.capitationTotal)}</span>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Previous Term Arrears */}
      {fees.prevTermArrears > 0 && (
        <CollapsibleSection
          title="Previous Arrears"
          icon="⚠️"
          badge={fmt(fees.prevTermArrears)}
          badgeColor="text-red-700 bg-red-50"
          isOpen={expandedSection === 'arrears'}
          onToggle={() => toggleSection('arrears')}
        >
          <div className="p-3 rounded-xl bg-red-50/50 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-800">Carried Forward Balance</p>
                <p className="text-[10px] text-red-500 mt-0.5">Outstanding from previous term(s)</p>
              </div>
              <span className="text-lg font-extrabold text-red-600">{fmt(fees.prevTermArrears)}</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* ═══════ ACTION BUTTONS ═══════ */}
      <div className="flex gap-2">
        <button
          onClick={onRecordPayment}
          className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-200/50 transition-all hover:shadow-xl hover:shadow-violet-300/50 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Record Payment
        </button>
        <button
          onClick={onViewStatement}
          className="px-4 py-3.5 rounded-2xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5 border border-indigo-200 transition-all"
          title="View Statement"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </button>
        <button
          onClick={onPrintDemand}
          className="px-4 py-3.5 rounded-2xl text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 border border-red-200 transition-all"
          title="Demand Letter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Metric Card ─── */
function MetricCard({ label, value, gradient, border, textColor, highlight }: { label: string; value: string; gradient: string; border: string; textColor: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} ${border} border ${highlight ? 'ring-2 ring-red-200 ring-offset-1' : ''}`}>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-extrabold ${textColor} mt-0.5`}>{value}</p>
    </div>
  );
}

/* ─── Collapsible Section ─── */
function CollapsibleSection({ title, icon, count, badge, badgeColor, isOpen, onToggle, children }: {
  title: string; icon: string; count?: number; badge?: string; badgeColor?: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md shadow-gray-100/30 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-gray-800">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">{count}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badge && <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${badgeColor || 'text-gray-600 bg-gray-100'}`}>{badge}</span>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && <div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
    </div>
  );
}

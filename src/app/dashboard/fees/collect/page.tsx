'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useUltraFeeCollect, fmt } from '@/hooks/useUltraFeeCollect';
import UltraFeeSearch from '@/components/fees/UltraFeeSearch';
import UltraStudentFeeProfile from '@/components/fees/UltraStudentFeeProfile';
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import UltraFeeHistoryPanel from '@/components/fees/UltraFeeHistoryPanel';
import { printThermalReceipt, printDemandLetter } from '@/components/fees/UltraThermalReceipt';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface QuickStat {
  label: string;
  value: string;
  icon: string;
}

interface ReceiptFlashState {
  receiptNo: string;
  amount: number;
}

/* ─────────────────────────────────────────────
   MICRO COMPONENTS
───────────────────────────────────────────── */

/** Pill badge */
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
      borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      background: color + '20', color, border: `1px solid ${color}35`,
    }}>
      {label}
    </span>
  );
}

/** Glassy stat pill in the header */
function StatPill({ stat }: { stat: QuickStat }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 12,
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{ fontSize: 18 }}>{stat.icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
          {stat.value}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
          {stat.label}
        </div>
      </div>
    </div>
  );
}

/** SVG ring showing fee paid percentage */
function FeeRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

/** Pop-up receipt flash (bottom-right corner, auto-dismisses) */
function ReceiptFlash({
  receiptNo, amount, studentName, onClose,
}: {
  receiptNo: string;
  amount: number;
  studentName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: '#0f172a', borderRadius: 20, padding: '20px 24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
      maxWidth: 320, animation: 'slideUpIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: '#22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: '#fff', fontWeight: 900,
          }}>✓</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
            Payment Recorded
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7,
            width: 24, height: 24, cursor: 'pointer', color: '#94a3b8',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px',
      }}>
        <div style={{
          fontSize: 26, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.5px',
        }}>
          KES {amount.toLocaleString('en-KE')}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{studentName}</div>
        <div style={{
          fontSize: 10, color: '#475569', marginTop: 6, fontFamily: 'monospace',
          letterSpacing: '0.04em',
        }}>
          {receiptNo}
        </div>
      </div>
    </div>
  );
}

/** Summary stats row shown in empty state */
function SummaryCards({
  students, payments, forms,
}: {
  students: any[];
  payments: any[];
  forms: any[];
}) {
  const totalCollected = useMemo(
    () => payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    [payments]
  );
  const todayPayments = useMemo(() => {
    const today = new Date().toDateString();
    return payments.filter(
      (p: any) => p.payment_date && new Date(p.payment_date).toDateString() === today
    );
  }, [payments]);
  const todayAmount = useMemo(
    () => todayPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    [todayPayments]
  );

  const cards = [
    { label: 'Total Students', value: students.length, icon: '🎓', color: '#6366f1', sub: `${forms.length} forms` },
    { label: 'All-Time Collected', value: `KES ${(totalCollected / 1000).toFixed(0)}K`, icon: '💰', color: '#10b981', sub: `${payments.length} receipts` },
    { label: "Today's Payments", value: todayPayments.length, icon: '📅', color: '#f59e0b', sub: `KES ${todayAmount.toLocaleString('en-KE')}` },
    {
      label: 'Avg per Student',
      value: students.length ? `KES ${Math.round(totalCollected / students.length).toLocaleString('en-KE')}` : '—',
      icon: '📊', color: '#0ea5e9', sub: 'all time',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12,
    }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: '#fff', borderRadius: 16, padding: '14px 16px',
          border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -10, right: -10,
            width: 60, height: 60, borderRadius: '50%', background: c.color + '14',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span style={{
              fontSize: 10, color: '#94a3b8', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {c.label}
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
            {c.value}
          </div>
          {c.sub && (
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2, fontWeight: 600 }}>
              {c.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Empty / landing state */
function EmptySearchState({
  students, payments, forms,
}: {
  students: any[];
  payments: any[];
  forms: any[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SummaryCards students={students} payments={payments} forms={forms} />

      {/* Prompt card */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px',
        background: '#fff', borderRadius: 24,
        border: '2px dashed #e2e8f0',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, marginBottom: 16,
          boxShadow: '0 8px 24px rgba(99,102,241,0.12)',
        }}>🔍</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
          Search for a student above
        </h3>
        <p style={{
          fontSize: 14, color: '#94a3b8', margin: 0,
          textAlign: 'center', maxWidth: 380, lineHeight: 1.7,
        }}>
          Type a name, admission number, NEMIS no., or parent phone.
          Fee balance and payment history appear instantly.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '📝', label: 'Student name' },
            { icon: '🔢', label: 'Admission no.' },
            { icon: '🇰🇪', label: 'NEMIS no.' },
            { icon: '📱', label: 'Parent phone' },
          ].map(h => (
            <span key={h.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 99,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 600, color: '#64748b',
            }}>
              {h.icon} {h.label}
            </span>
          ))}
        </div>
      </div>

      {/* Recent payments strip */}
      {payments.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 18, padding: '18px 20px',
          border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Recent Payments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {payments.slice(0, 6).map((p: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 10,
                background: '#fafbff', border: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: p.payment_method === 'M-Pesa' ? '#22c55e18' : '#6366f118',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {p.payment_method === 'M-Pesa' ? '📱' : p.payment_method === 'Bank' ? '🏦' : '💵'}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      {p.receipt_number ?? `REC-${String(p.id)}`}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {p.payment_method ?? '—'} ·{' '}
                      {p.payment_date
                        ? new Date(p.payment_date as string).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: '2-digit',
                        })
                        : '—'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>
                  +KES {Number(p.amount || 0).toLocaleString('en-KE')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact breadcrumb strip shown when a student is selected */
function StudentBreadcrumb({
  student, fees, onClear, getFormName, getStreamName,
}: {
  student: any;
  fees: any;
  onClear: () => void;
  getFormName: (id: number | undefined) => string;
  getStreamName: (id: number | undefined) => string;
}) {
  const pct = fees
    ? Math.min(100, Math.round((fees.totalPaid / Math.max(1, fees.annualTotal)) * 100))
    : 0;

  const initials =
    `${(student.first_name as string | undefined)?.charAt(0) ?? ''}${(student.last_name as string | undefined)?.charAt(0) ?? ''}`;

  const avatarBg =
    student.gender === 'Male'
      ? 'linear-gradient(135deg,#6366f1,#818cf8)'
      : 'linear-gradient(135deg,#ec4899,#f472b6)';

  // hasFeeStructure guard — don't show green/cleared when there are no fees set at all
  const hasFeeStructure = (fees?.termTotal ?? 0) > 0 || (fees?.annualTotal ?? 0) > 0;
  const isActuallyCleared = hasFeeStructure && (fees?.termBalance ?? 1) <= 0;

  const balanceColor =
    !hasFeeStructure ? '#f59e0b'          // amber  — no fee structure set
    : isActuallyCleared ? '#22c55e'       // green  — paid in full
    : (fees?.termBalance ?? 1) < 3000 ? '#f59e0b'  // amber  — nearly there
    : '#ef4444';                          // red    — significant balance

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderRadius: 14,
      background: '#fff', border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      flexWrap: 'wrap',
    }}>
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 900, fontSize: 13, flexShrink: 0,
      }}>
        {initials}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#0f172a',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {student.first_name as string} {student.last_name as string}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span>{(student.admission_no as string | undefined) ?? (student.admission_number as string | undefined)}</span>
          <span style={{ color: '#e2e8f0' }}>·</span>
          <span>{getFormName(student.form_id as number | undefined)}</span>
          {(student.stream_id as number | undefined) && (
            <>
              <span style={{ color: '#e2e8f0' }}>·</span>
              <span>{getStreamName(student.stream_id as number | undefined)}</span>
            </>
          )}
        </div>
      </div>

      {/* Ring — only show % when a fee structure exists */}
      {fees && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FeeRing pct={hasFeeStructure ? pct : 0} size={42} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
              {hasFeeStructure ? `${pct}%` : 'N/A'}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
              {hasFeeStructure ? 'paid' : 'no fees'}
            </div>
          </div>
        </div>
      )}

      {/* Balance badge */}
      {fees && (
        <div style={{
          padding: '6px 12px', borderRadius: 10,
          background: balanceColor + '15',
          border: `1px solid ${balanceColor}30`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: balanceColor }}>
            {!hasFeeStructure
              ? '⚠️ NO FEES SET'
              : isActuallyCleared
              ? '✓ CLEARED'
              : `KES ${(fees.termBalance as number).toLocaleString('en-KE')} due`}
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
            {!hasFeeStructure ? 'set fee structure' : 'this term'}
          </div>
        </div>
      )}

      {/* Clear */}
      <button
        onClick={onClear}
        style={{
          padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        ✕ Clear
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function UltraCollectFeePage() {
  /* ── Hook ── */
  const {
    loading,
    forms,
    streams,
    students,
    payments,
    terms,
    settings,
    currentTerm,
    getFormName,
    getStreamName,
    searchStudent,
    getStudentFeeProfile,
    getStudentPayments,
    getStatement,
    recordPayment,
    deletePayment,
    sendSmsReceipt,
    fetchAll,
  } = useUltraFeeCollect();

  /* ── Safe wrappers that accept number | undefined ── */
  const safeGetFormName = (id: number | undefined): string =>
    id != null ? String((getFormName as (id: number) => any)(id) ?? "") : "";
  const safeGetStreamName = (id: number | undefined): string =>
    id != null ? String((getStreamName as (id: number) => any)(id) ?? "") : "";


  /* ── State ── */
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFlash, setReceiptFlash] = useState<ReceiptFlashState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── Derived (memoised) ── */
  const fees = useMemo(
    () => selectedStudent
      ? getStudentFeeProfile(selectedStudent.id as number, selectedStudent.form_id as number)
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, selectedStudent?.form_id, getStudentFeeProfile]
  );

  const studentPayments = useMemo(
    () => selectedStudent ? getStudentPayments(selectedStudent.id as number) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, getStudentPayments]
  );

  const statement = useMemo(
    () => selectedStudent
      ? getStatement(selectedStudent.id as number)
      : { totalCharged: 0, totalPaid: 0, balance: 0, entries: [] as any[] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent?.id, getStatement]
  );

  const getFeeBalance = useCallback(
    (studentId: number, formId: number) => {
      const f = getStudentFeeProfile(studentId, formId);
      return {
        termBalance: f.termBalance as number,
        termTotal: f.termTotal as number,
        annualTotal: f.annualTotal as number,
        annualBalance: f.annualBalance as number,
        totalPaid: f.totalPaid as number,
        hasFeeStructure: f.hasFeeStructure,
        isCleared: f.isCleared,
      };
    },
    [getStudentFeeProfile]
  );

  /* ── Today's total ── */
  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return payments
      .filter((p: any) => p.payment_date && new Date(p.payment_date as string).toDateString() === today)
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  }, [payments]);

  /* ── Handlers ── */
  const handleSelectStudent = useCallback((student: any) => {
    setSelectedStudent(student);
    setShowPayModal(false);
  }, []);

  const handleClearStudent = useCallback(() => {
    setSelectedStudent(null);
    setShowPayModal(false);
  }, []);

  const handleRecordPayment = useCallback(async (data: PaymentData) => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const result = await recordPayment({
        studentId: selectedStudent.id as number,
        amount: data.amount,
        method: data.method,
        mpesaPhone: data.mpesaPhone,
        mpesaCode: data.mpesaCode,
        bankRef:
          data.bankSlip || data.bankBranch
            ? `${data.bankSlip ?? ''} ${data.bankBranch ?? ''} ${data.bankDate ?? ''}`.trim()
            : undefined,
        chequeNo: data.chequeNo
          ? `${data.chequeNo} (${data.chequeBank ?? ''})`
          : undefined,
        inKindItem: data.inKindItem,
        inKindValue: data.inKindValue,
        allocationHead: data.allocationHead,
        bursarySource: data.bursarySource,
        waiverType: data.waiverType,
        notes: data.notes,
      });

      setShowPayModal(false);
      setReceiptFlash({ receiptNo: result.receipt_number as string, amount: data.amount });

      toast.success(
        `KES ${data.amount.toLocaleString('en-KE')} recorded · ${result.receipt_number as string}`,
        { duration: 4000, icon: '✅' }
      );

      /* SMS */
      if (data.sendSms && (selectedStudent.guardian_phone as string | undefined) && fees) {
        try {
          const ok = await sendSmsReceipt(
            selectedStudent,
            data.amount,
            result.receipt_number as string,
            data.method,
            fees
          );
          if (ok) toast.success('📱 SMS receipt sent to parent');
        } catch {
          toast.error('SMS failed — payment still recorded');
        }
      }

      /* 📧 EMAIL RECEIPT — auto-send to parent */
      try {
        const parentEmail =
          (selectedStudent.guardian_email as string | undefined) ||
          (selectedStudent.parent_email as string | undefined);

        if (parentEmail && (result as any)?.id) {
          const emailRes = await fetch('/api/email/send-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: (result as any).id, parentEmail }),
          });
          if (emailRes.ok) {
            toast.success('📧 Email receipt sent to parent', { duration: 3000 });
          }
        }
      } catch {
        /* Email failure is non-fatal — silent */
      }

      /* Thermal receipt */
      if (fees) {
        const adm =
          (selectedStudent.admission_no as string | undefined) ??
          (selectedStudent.admission_number as string | undefined) ??
          '';

        printThermalReceipt({
          receiptNumber: result.receipt_number as string,
          paymentDate: result.payment_date as string,
          studentName: `${selectedStudent.first_name as string} ${selectedStudent.last_name as string}`,
          admissionNo: adm,
          formStream: `${safeGetFormName(selectedStudent.form_id as number | undefined)} / ${safeGetStreamName(selectedStudent.stream_id as number | undefined)}`,
          parentName: selectedStudent.guardian_name as string | undefined,
          parentPhone: selectedStudent.guardian_phone as string | undefined,
          paymentMethod: data.method,
          reference: data.mpesaCode ?? data.bankSlip ?? data.chequeNo ?? '',
          amount: data.amount,
          totalPaid: (fees.totalPaid as number) + data.amount,
          termFees: fees.termTotal as number,
          termBalance: Math.max(0, (fees.termBalance as number) - data.amount),
          annualFees: fees.annualTotal as number,
          annualBalance: Math.max(0, (fees.annualBalance as number) - data.amount),
          allocations: data.allocationHead
            ? [{ head: data.allocationHead, amount: data.amount }]
            : undefined,
          bursaryApplied: (fees.bursaryTotal as number) > 0 ? (fees.bursaryTotal as number) : undefined,
          capitationApplied: (fees.capitationTotal as number) > 0 ? (fees.capitationTotal as number) : undefined,
          schoolName: settings?.school_name as string | undefined,
          schoolAddress: settings?.school_address as string | undefined,
          schoolPhone: settings?.school_phone as string | undefined,
          schoolEmail: settings?.school_email as string | undefined,
          schoolMotto: settings?.school_motto as string | undefined,
        });
      }

      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedStudent, fees, settings,
    recordPayment, sendSmsReceipt, safeGetFormName, safeGetStreamName, fetchAll,
  ]);

  const handleEditPayment = useCallback((_payment: any) => {
    toast('To correct a payment: delete it, then record a new one.', {
      icon: 'ℹ️', duration: 4000,
    });
  }, []);

  const handleDeletePayment = useCallback(async (paymentId: number) => {
    try {
      await deletePayment(paymentId);
      toast.success('Payment deleted');
      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
    }
  }, [deletePayment, fetchAll]);

  const handlePrintDemand = useCallback(() => {
    if (!selectedStudent || !fees) return;
    printDemandLetter(selectedStudent, fees, settings?.school_name as string | undefined);
  }, [selectedStudent, fees, settings]);

  /* ──────────── LOADING ──────────── */
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '62vh', gap: 16,
      }}>
        <div style={{ position: 'relative', width: 60, height: 60 }}>
          {([0, 1, 2] as const).map(i => (
            <div key={i} style={{
              position: 'absolute', inset: i * 7,
              borderRadius: '50%', border: '3px solid transparent',
              borderTopColor: (['#6366f1', '#8b5cf6', '#a78bfa'] as const)[i],
              animation: `spin ${0.8 + i * 0.18}s linear infinite`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
            }} />
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#334155', margin: 0 }}>
            Loading Fee System
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            Fetching students, structures &amp; payments…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ──────────── RENDER ──────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.25s ease',
    }}>

      {/* ════════════════════════════════════════
          HERO BANNER
      ════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 72%, #6366f1 100%)',
        padding: '22px 28px 26px',
        position: 'relative', overflow: 'hidden',
        borderRadius: '0 0 22px 22px',
        marginBottom: 18,
      }}>
        {/* Orb decorations */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.035)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: 80, width: 170, height: 170, borderRadius: '50%', background: 'rgba(99,102,241,0.25)' }} />
        <div style={{ position: 'absolute', top: 15, right: 190, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.055)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                💳
              </div>
              <div>
                <h1 style={{
                  color: '#fff', fontSize: 23, fontWeight: 900, margin: 0, letterSpacing: '-0.5px',
                }}>
                  Collect Fees
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>
                  Search · Record · Receipt · SMS — all in one place
                </p>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {currentTerm && (
                <Pill label={`📅 ${currentTerm.term_name as string}`} color="#a5b4fc" />
              )}
              {todayTotal > 0 && (
                <Pill
                  label={`Today KES ${todayTotal.toLocaleString('en-KE')}`}
                  color="#86efac"
                />
              )}
              <Link
                href="/dashboard/fees"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 11, fontSize: 12, fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.11)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textDecoration: 'none', backdropFilter: 'blur(4px)',
                }}
              >
                ← Dashboard
              </Link>
              <Link
                href="/dashboard/fees/structure"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 11, fontSize: 12, fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.11)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textDecoration: 'none', backdropFilter: 'blur(4px)',
                }}
              >
                ⚙ Structure
              </Link>
              <Link
                href="/dashboard/fees/reports"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 11, fontSize: 12, fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.11)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textDecoration: 'none', backdropFilter: 'blur(4px)',
                }}
              >
                📊 Reports
              </Link>
            </div>
          </div>

          {/* Stats strip (only when no student selected) */}
          {!selectedStudent && (
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {(
                [
                  { icon: '🎓', label: 'Students', value: String(students.length) },
                  { icon: '💰', label: 'Payments', value: String(payments.length) },
                  { icon: '📋', label: 'Forms', value: String(forms.length) },
                  { icon: '📅', label: 'Terms', value: String(terms.length) },
                ] as QuickStat[]
              ).map(s => (
                <StatPill key={s.label} stat={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          CONTENT
      ════════════════════════════════════════ */}
      <div style={{ padding: '0 20px 40px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <UltraFeeSearch
            searchFn={searchStudent}
            onSelect={handleSelectStudent}
            getFormName={safeGetFormName}
            getStreamName={safeGetStreamName}
            getFeeBalance={getFeeBalance}
            selectedStudent={selectedStudent}
            allStudents={students as any[]}
            forms={forms as { id: number; form_name: string }[]}
            streams={streams as { id: number; stream_name: string }[]}
          />
        </div>

        {/* Breadcrumb strip */}
        {selectedStudent && fees && (
          <div style={{ marginBottom: 14 }}>
            <StudentBreadcrumb
              student={selectedStudent}
              fees={fees}
              onClear={handleClearStudent}
              getFormName={safeGetFormName}
              getStreamName={safeGetStreamName}
            />
          </div>
        )}

        {/* Body */}
        {!selectedStudent ? (
          <EmptySearchState
            students={students}
            payments={payments}
            forms={forms}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)',
            gap: 16,
          }}>
            {/* LEFT — profile */}
            <UltraStudentFeeProfile
              student={selectedStudent}
              fees={fees!}
              getFormName={safeGetFormName}
              getStreamName={safeGetStreamName}
              onRecordPayment={() => setShowPayModal(true)}
              onViewStatement={() => { /* handled by history panel */ }}
              onPrintDemand={handlePrintDemand}
            />

            {/* RIGHT — history */}
            <UltraFeeHistoryPanel
              student={selectedStudent}
              payments={studentPayments}
              statement={statement}
              fees={fees}
              terms={terms}
              getFormName={safeGetFormName}
              getStreamName={safeGetStreamName}
              onEditPayment={handleEditPayment}
              onDeletePayment={handleDeletePayment}
              settings={settings}
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          PAYMENT MODAL
      ════════════════════════════════════════ */}
      {selectedStudent && fees && (
        <UltraPaymentModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          student={selectedStudent}
          fees={fees}
          receiptNo={genReceipt()}
          getFormName={safeGetFormName}
          getStreamName={safeGetStreamName}
          onSubmit={handleRecordPayment}
          isSubmitting={isSubmitting}
          terms={terms as any[]}
        />
      )}

      {/* ════════════════════════════════════════
          RECEIPT FLASH
      ════════════════════════════════════════ */}
      {receiptFlash && selectedStudent && (
        <ReceiptFlash
          receiptNo={receiptFlash.receiptNo}
          amount={receiptFlash.amount}
          studentName={`${selectedStudent.first_name as string} ${selectedStudent.last_name as string}`}
          onClose={() => setReceiptFlash(null)}
        />
      )}

      {/* ════════════════════════════════════════
          GLOBAL STYLES
      ════════════════════════════════════════ */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        button:focus-visible,
        a:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: 2px;
        }

        @media (max-width: 860px) {
          .fee-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

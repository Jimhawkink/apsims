'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  fmt, PAYMENT_METHODS, BURSARY_SOURCES, WAIVER_TYPES, useVoteHeadNames,
  type StudentFeeProfile,
} from '@/hooks/useUltraFeeCollect';


// ─── Types ────────────────────────────────────────────────────────
export interface PaymentData {
  amount: number;
  method: string;
  allocationHead: string;
  mpesaPhone: string;
  mpesaCode: string;
  bankSlip: string;
  bankBranch: string;
  bankDate: string;
  chequeNo: string;
  chequeBank: string;
  inKindItem: string;
  inKindValue: number;
  bursarySource: string;
  waiverType: string;
  notes: string;
  sendSms: boolean;
  sendWhatsapp?: boolean;
  paymentDate?: string;
  customReceiptNo?: string;
  kcbPesalinkPhone?: string;
  kcbAccountRef?: string;
  selectedTermIds?: string[];
  splitProportional?: boolean;
}

interface TermArrear {
  id: string;
  label: string;
  termName: string;
  year: number;
  termFees: number;
  paid: number;
  balance: number;
  isPartial: boolean;
  isCurrent: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  fees: StudentFeeProfile;
  receiptNo: string;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  onSubmit: (data: PaymentData) => void;
  isSubmitting: boolean;
  terms?: any[];
}

// ─── Constants ────────────────────────────────────────────────────
const KE_BANKS = [
  'KCB Bank', 'Equity Bank', 'Co-operative Bank', 'NCBA Bank', 'Absa Bank',
  'DTB Bank', 'I&M Bank', 'Standard Chartered', 'Family Bank', 'Prime Bank',
  'Stanbic Bank', 'Gulf African Bank', 'National Bank', 'Sidian Bank', 'HF Group', 'Other',
];
const IN_KIND_ITEMS = [
  'Beans', 'Maize', 'Maize Flour', 'Firewood', 'Rice', 'Wheat Flour',
  'Potatoes', 'Vegetables', 'Cooking Oil', 'Sugar', 'Milk', 'Building Materials',
  'Timber', 'Iron Sheets', 'Paint', 'Labour', 'Other',
];
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

// ─── Sub-components (pure render, no hooks) ───────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', mono = false, ...rest }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; mono?: boolean; [k: string]: any;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'text' && mono ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
        border: '1.5px solid #e2e8f0', background: '#fff', outline: 'none',
        fontFamily: mono ? 'monospace' : 'inherit', fontWeight: mono ? 700 : 500,
        letterSpacing: mono ? '0.05em' : 'normal', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      } as React.CSSProperties}
      onFocus={e => (e.target.style.borderColor = '#6366f1')}
      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
      {...rest}
    />
  );
}

function Select({ value, onChange, children, ...rest }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; [k: string]: any;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
        border: '1.5px solid #e2e8f0', background: '#fff', outline: 'none',
        fontWeight: 500, boxSizing: 'border-box', cursor: 'pointer',
      } as React.CSSProperties}
      {...rest}
    >
      {children}
    </select>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: on ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: on ? 23 : 3,
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────
export default function UltraPaymentModal({
  isOpen, onClose, student, fees, receiptNo,
  getFormName, getStreamName, onSubmit, isSubmitting, terms = [],
}: Props) {
  // ALL HOOKS AT TOP LEVEL
  const [method, setMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customReceiptNo, setCustomReceiptNo] = useState(receiptNo);
  const [allocationHead, setAllocationHead] = useState('');
  const [splitProportional, setSplitProportional] = useState(false);
  const [notes, setNotes] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showReceiptEdit, setShowReceiptEdit] = useState(false);

  // Live vote heads from DB (auto-distribution priority order)
  const { names: voteHeadNames } = useVoteHeadNames();

  // M-Pesa
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'pending' | 'success' | 'failed'>('idle');
  const [c2bChecking, setC2bChecking] = useState(false);

  // KCB
  const [kcbPhone, setKcbPhone] = useState('');
  const [kcbAccountRef, setKcbAccountRef] = useState('');
  const [kcbStatus, setKcbStatus] = useState<'idle' | 'sending' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [kcbPollTimer, setKcbPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Bank
  const [bankSlip, setBankSlip] = useState('');
  const [bankBranch, setBankBranch] = useState('KCB Bank');
  const [bankDate, setBankDate] = useState(new Date().toISOString().split('T')[0]);

  // Cheque
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);

  // In-Kind
  const [inKindItem, setInKindItem] = useState('');
  const [inKindValue, setInKindValue] = useState('');

  // Bursary
  const [bursarySource, setBursarySource] = useState('');
  const [waiverType, setWaiverType] = useState('');
  const [bursaryRef, setBursaryRef] = useState('');

  // Term arrears selection
  const [selectedTermIds, setSelectedTermIds] = useState<Set<string>>(new Set());

  // Receipt update when prop changes
  useEffect(() => { setCustomReceiptNo(receiptNo); }, [receiptNo]);

  // Pre-fill student phone
  useEffect(() => {
    if (student?.guardian_phone) {
      setMpesaPhone(student.guardian_phone);
      setKcbPhone(student.guardian_phone);
    }
    const adm = student?.admission_no || student?.admission_number || '';
    setKcbAccountRef(adm);
  }, [student]);

  // Cleanup KCB poll
  useEffect(() => {
    return () => { if (kcbPollTimer) clearInterval(kcbPollTimer); };
  }, [kcbPollTimer]);

  // Build term arrears from fees data
  const termArrears = useMemo((): TermArrear[] => {
    const arr: TermArrear[] = [];
    // Try termBreakdown from fees
    const tb = (fees as any).termBreakdown as any[] | undefined;
    if (tb && tb.length > 0) {
      tb.forEach((t: any) => {
        arr.push({
          id: String(t.term_id || t.id || t.termName),
          label: `${t.termName || t.term_name} ${t.year || ''}`.trim(),
          termName: t.termName || t.term_name,
          year: t.year || new Date().getFullYear(),
          termFees: t.totalFees || t.termFees || 0,
          paid: t.totalPaid || t.paid || 0,
          balance: t.balance || 0,
          isPartial: (t.paid || t.totalPaid || 0) > 0 && (t.balance || 0) > 0,
          isCurrent: !!t.isCurrent,
        });
      });
    } else {
      // Synthesize from available fees data + terms array
      const sortedTerms = [...terms].sort((a, b) => (b.year - a.year) || (b.term_number - a.term_number));
      const currentTerm = sortedTerms[0];
      if (currentTerm && fees.termBalance > 0) {
        arr.push({
          id: String(currentTerm.id || 'current'),
          label: `${currentTerm.term_name} ${currentTerm.year}`,
          termName: currentTerm.term_name,
          year: currentTerm.year,
          termFees: fees.termTotal,
          paid: fees.totalPaid,
          balance: fees.termBalance,
          isPartial: fees.totalPaid > 0 && fees.termBalance > 0,
          isCurrent: true,
        });
      }
      if (fees.prevTermArrears > 0) {
        const prevTerm = sortedTerms[1];
        arr.push({
          id: String(prevTerm?.id || 'prev'),
          label: prevTerm ? `${prevTerm.term_name} ${prevTerm.year}` : 'Previous Term',
          termName: prevTerm?.term_name || 'Previous',
          year: prevTerm?.year || new Date().getFullYear() - 1,
          termFees: fees.prevTermArrears,
          paid: 0,
          balance: fees.prevTermArrears,
          isPartial: false,
          isCurrent: false,
        });
      }
    }
    return arr.filter(t => t.balance > 0);
  }, [fees, terms]);

  const totalArrears = useMemo(() =>
    termArrears.reduce((s, t) => s + t.balance, 0), [termArrears]);

  const selectedArrearsTotal = useMemo(() =>
    termArrears.filter(t => selectedTermIds.has(t.id)).reduce((s, t) => s + t.balance, 0),
    [termArrears, selectedTermIds]);

  const toggleTerm = useCallback((id: string, balance: number) => {
    setSelectedTermIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Auto-fill amount from selected terms
    setTimeout(() => {
      setSelectedTermIds(prev => {
        const total = termArrears
          .filter(t => prev.has(t.id))
          .reduce((s, t) => s + t.balance, 0);
        if (total > 0) setAmount(String(total));
        return prev;
      });
    }, 0);
  }, [termArrears]);

  const selectAllTerms = useCallback(() => {
    const allIds = new Set(termArrears.map(t => t.id));
    setSelectedTermIds(allIds);
    setAmount(String(totalArrears));
  }, [termArrears, totalArrears]);

  const clearAllTerms = useCallback(() => {
    setSelectedTermIds(new Set());
    setAmount('');
  }, []);

  // Effective amount
  const isInKind = method === 'In-Kind';
  const numAmount = Number(isInKind ? inKindValue : amount) || 0;
  const balanceAfter = Math.max(0, fees.termBalance - numAmount);
  const changeDue = numAmount > fees.termBalance ? numAmount - fees.termBalance : 0;
  const isBackdated = paymentDate < new Date().toISOString().split('T')[0];

  // STK Push
  const handleStkPush = useCallback(async () => {
    if (!mpesaPhone || numAmount <= 0) return;
    setStkStatus('sending');
    try {
      const res = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: mpesaPhone,
          amount: numAmount,
          studentName: `${student.first_name} ${student.last_name}`,
          receiptNo: customReceiptNo,
          accountRef: student.admission_no || student.admission_number,
        }),
      });
      const data = await res.json();
      if (data.success || data.ResponseCode === '0') {
        setStkStatus('pending');
        toast.success('📲 STK Push sent! Ask parent to enter PIN');
        // Poll for completion
        let polls = 0;
        const poll = setInterval(async () => {
          polls++;
          try {
            const check = await fetch(`/api/mpesa/stk-status?checkoutId=${data.CheckoutRequestID}`);
            const status = await check.json();
            if (status.ResultCode === '0') {
              setStkStatus('success');
              setMpesaCode(status.MpesaReceiptNumber || '');
              toast.success('✅ M-Pesa payment confirmed!', { duration: 5000 });
              clearInterval(poll);
            } else if (status.ResultCode && status.ResultCode !== '0') {
              setStkStatus('failed');
              toast.error('Payment cancelled or failed');
              clearInterval(poll);
            }
          } catch { /* continue polling */ }
          if (polls >= 24) clearInterval(poll); // 2 min timeout
        }, 5000);
      } else {
        setStkStatus('failed');
        toast.error(data.errorMessage || 'STK Push failed');
      }
    } catch {
      setStkStatus('failed');
      toast.error('Failed to send STK Push — check network');
    }
  }, [mpesaPhone, numAmount, student, customReceiptNo]);

  const handleC2bCheck = useCallback(async () => {
    if (!mpesaPhone || numAmount <= 0) return;
    setC2bChecking(true);
    try {
      const res = await fetch(`/api/mpesa/check-payment?phone=${mpesaPhone}&amount=${numAmount}`);
      const data = await res.json();
      if (data.transactionCode) {
        setMpesaCode(data.transactionCode);
        toast.success(`✅ Payment found: ${data.transactionCode}`);
      } else {
        toast('No matching payment found yet', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Could not check M-Pesa — try manual entry');
    } finally {
      setC2bChecking(false);
    }
  }, [mpesaPhone, numAmount]);

  // KCB PesaLink
  const handleKcbPesalink = useCallback(async () => {
    if (!kcbPhone || numAmount <= 0) return;
    setKcbStatus('sending');
    try {
      const res = await fetch('/api/kcb/pesalink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: kcbPhone,
          amount: numAmount,
          accountRef: kcbAccountRef,
          studentName: `${student.first_name} ${student.last_name}`,
          receiptNo: customReceiptNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKcbStatus('pending');
        toast.success('🏦 KCB PesaLink request sent!');
        let polls = 0;
        const poll = setInterval(async () => {
          polls++;
          try {
            const check = await fetch(`/api/kcb/pesalink-status?ref=${data.transactionRef}`);
            const st = await check.json();
            if (st.status === 'CONFIRMED') {
              setKcbStatus('confirmed');
              setBankSlip(st.transactionRef || data.transactionRef || '');
              toast.success('✅ KCB payment confirmed!', { duration: 6000 });
              clearInterval(poll);
            } else if (st.status === 'FAILED') {
              setKcbStatus('failed');
              toast.error('KCB payment failed');
              clearInterval(poll);
            }
          } catch { /* continue */ }
          if (polls >= 36) { clearInterval(poll); setKcbStatus('failed'); }
        }, 5000);
        setKcbPollTimer(poll);
      } else {
        setKcbStatus('failed');
        toast.error(data.message || 'KCB PesaLink failed');
      }
    } catch {
      setKcbStatus('failed');
      toast.error('KCB PesaLink error — check network');
    }
  }, [kcbPhone, kcbAccountRef, numAmount, student, customReceiptNo]);

  const handleSubmit = useCallback(() => {
    if (numAmount <= 0) { toast.error('Enter an amount'); return; }
    onSubmit({
      amount: numAmount, method, allocationHead, splitProportional,
      mpesaPhone, mpesaCode,
      bankSlip, bankBranch, bankDate,
      chequeNo, chequeBank: chequeBank || chequeDate,
      inKindItem, inKindValue: Number(inKindValue || 0),
      bursarySource, waiverType, notes,
      sendSms, sendWhatsapp,
      paymentDate, customReceiptNo,
      kcbPesalinkPhone: kcbPhone, kcbAccountRef,
      selectedTermIds: Array.from(selectedTermIds),
    });
  }, [
    numAmount, method, allocationHead, splitProportional,
    mpesaPhone, mpesaCode, bankSlip, bankBranch, bankDate,
    chequeNo, chequeBank, chequeDate, inKindItem, inKindValue,
    bursarySource, waiverType, notes, sendSms, sendWhatsapp,
    paymentDate, customReceiptNo, kcbPhone, kcbAccountRef, selectedTermIds, onSubmit,
  ]);

  if (!isOpen || !student) return null;

  const adm = student.admission_no || student.admission_number || '';

  const METHOD_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    'Cash':          { icon: '💵', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    'M-Pesa':        { icon: '📱', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    'KCB Callback':  { icon: '🏦', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
    'Bank Transfer': { icon: '🏛️', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
    'Cheque':        { icon: '📝', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    'In-Kind':       { icon: '🌾', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
    'Bursary':       { icon: '🎓', color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
    'Waiver':        { icon: '✂️', color: '#9333ea', bg: '#fdf4ff', border: '#e879f9' },
  };
  const ALL_METHODS = Object.keys(METHOD_CONFIG);

  const stkColors = { idle: '#6366f1', sending: '#f59e0b', pending: '#f59e0b', success: '#10b981', failed: '#ef4444' };
  const kcbColors = { idle: '#1d4ed8', sending: '#f59e0b', pending: '#f59e0b', confirmed: '#10b981', failed: '#ef4444' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px', paddingTop: '24px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 680,
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: 'modalUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: 24,
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 75%,#6366f1 100%)',
          padding: '18px 22px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.2)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
                💳 Record Fee Payment
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '3px 0 0' }}>
                FIFO allocation · Arrears-first · Real-time confirmation
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: student.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#f472b6)' : 'linear-gradient(135deg,#6366f1,#818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 900, fontSize: 11,
                  }}>
                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>{student.first_name} {student.last_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>{adm} · {getFormName(student.form_id)} {getStreamName(student.stream_id)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Receipt #</p>
                <button onClick={() => setShowReceiptEdit(!showReceiptEdit)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>
                  ✎
                </button>
              </div>
              {showReceiptEdit ? (
                <input value={customReceiptNo} onChange={e => setCustomReceiptNo(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: '#fff', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '4px 8px', width: 140, outline: 'none' }} />
              ) : (
                <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.06em', margin: '2px 0 0' }}>{customReceiptNo}</p>
              )}
              <button onClick={onClose} style={{
                marginTop: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', cursor: 'pointer', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700,
              }}>✕ Close</button>
            </div>
          </div>
        </div>

        {/* ═══ BALANCE STRIP ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          {[
            { label: 'Term Fees', val: fmt(fees.termTotal), color: '#6366f1' },
            { label: 'Paid', val: fmt(fees.totalPaid), color: '#10b981' },
            { label: 'Term Balance', val: fmt(fees.termBalance), color: fees.termBalance > 0 ? '#ef4444' : '#10b981' },
            { label: 'Annual Balance', val: fmt(fees.annualBalance), color: '#f59e0b' },
            { label: 'Net Due', val: fmt(fees.netDue), color: '#7c3aed' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '10px 6px', textAlign: 'center',
              borderRight: i < 4 ? '1px solid #f1f5f9' : 'none',
            }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 900, color: s.color, margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div style={{ padding: '18px 22px', maxHeight: '58vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── 1. TERM ARREARS BREAKDOWN ── */}
          {termArrears.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#fefce8,#fffbeb)', border: '1.5px solid #fcd34d', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #fde68a' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', margin: 0 }}>📋 Term Arrears Breakdown</p>
                  <p style={{ fontSize: 10, color: '#b45309', margin: '2px 0 0' }}>
                    {termArrears.length} term{termArrears.length !== 1 ? 's' : ''} outstanding · Select to auto-fill amount
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAllTerms}
                    style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                    Select All
                  </button>
                  <button onClick={clearAllTerms}
                    style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', width: 36 }}> </th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Term</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Fees Due</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Paid</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Balance</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termArrears.map((t, i) => {
                      const isSelected = selectedTermIds.has(t.id);
                      return (
                        <tr key={t.id}
                          onClick={() => toggleTerm(t.id, t.balance)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(99,102,241,0.06)' : i % 2 === 0 ? '#fff' : '#fafafa',
                            transition: 'background 0.15s',
                            borderBottom: '1px solid #fef3c7',
                          }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                              background: isSelected ? '#6366f1' : '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}>
                              {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{t.label}</span>
                            {t.isCurrent && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4 }}>CURRENT</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{fmt(t.termFees)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: t.paid > 0 ? '#059669' : '#9ca3af' }}>
                            {t.paid > 0 ? fmt(t.paid) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: 13 }}>{fmt(t.balance)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {t.isPartial
                              ? <span style={{ fontSize: 9, fontWeight: 700, background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: 4 }}>partial</span>
                              : <span style={{ fontSize: 9, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: 4 }}>unpaid</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d' }}>
                      <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 800, color: '#92400e', fontSize: 12, textAlign: 'right' }}>Total Outstanding:</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: '#dc2626', fontSize: 14, textAlign: 'right' }}>{fmt(totalArrears)}</td>
                      <td />
                    </tr>
                    {selectedTermIds.size > 0 && (
                      <tr style={{ background: '#ede9fe' }}>
                        <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 800, color: '#5b21b6', fontSize: 11, textAlign: 'right' }}>Selected ({selectedTermIds.size} term{selectedTermIds.size !== 1 ? 's' : ''}):</td>
                        <td style={{ padding: '8px 12px', fontWeight: 900, color: '#6366f1', fontSize: 13, textAlign: 'right' }}>{fmt(selectedArrearsTotal)}</td>
                        <td />
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── 2. PAYMENT METHOD ── */}
          <div>
            <SectionLabel>Payment Method</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {ALL_METHODS.map(m => {
                const cfg = METHOD_CONFIG[m];
                const isActive = method === m;
                return (
                  <button key={m} onClick={() => setMethod(m)} style={{
                    padding: '10px 6px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${isActive ? cfg.color : '#e2e8f0'}`,
                    background: isActive ? cfg.bg : '#fafbff',
                    transition: 'all 0.15s', outline: 'none',
                  }}>
                    <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 3 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: isActive ? cfg.color : '#64748b', lineHeight: 1.2 }}>{m}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. AMOUNT ── */}
          <div>
            <SectionLabel>{isInKind ? 'Estimated Value (KES)' : 'Amount (KES) *'}</SectionLabel>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8', fontSize: 16, pointerEvents: 'none' }}>KES</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={isInKind ? inKindValue : amount}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  isInKind ? setInKindValue(v) : setAmount(v);
                }}
                placeholder="0"
                autoFocus
                style={{
                  width: '100%', paddingLeft: 52, paddingRight: 16, paddingTop: 16, paddingBottom: 16,
                  fontSize: 32, fontWeight: 900, textAlign: 'center', borderRadius: 14,
                  border: '2px solid #e2e8f0', outline: 'none', background: '#fafbff',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                  MozAppearance: 'textfield',
                } as React.CSSProperties}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>
            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {QUICK_AMOUNTS.map(qa => (
                <button key={qa} onClick={() => isInKind ? setInKindValue(String(qa)) : setAmount(String(qa))}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', transition: 'all 0.12s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#eef2ff'; (e.target as HTMLElement).style.borderColor = '#6366f1'; (e.target as HTMLElement).style.color = '#4f46e5'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f8fafc'; (e.target as HTMLElement).style.borderColor = '#e2e8f0'; (e.target as HTMLElement).style.color = '#64748b'; }}>
                  {qa >= 1000 ? `${qa / 1000}K` : qa}
                </button>
              ))}
              {fees.termBalance > 0 && (
                <button onClick={() => setAmount(String(fees.termBalance))}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '2px solid #6366f1', background: '#eef2ff', color: '#4f46e5' }}>
                  Term Bal ({fmt(fees.termBalance)})
                </button>
              )}
              {fees.annualBalance > 0 && fees.annualBalance !== fees.termBalance && (
                <button onClick={() => setAmount(String(fees.annualBalance))}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '2px solid #f59e0b', background: '#fffbeb', color: '#d97706' }}>
                  Full Year ({fmt(fees.annualBalance)})
                </button>
              )}
            </div>
          </div>

          {/* ── 4. PAYMENT DATE + ALLOCATION ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Payment Date">
              <Input type="date" value={paymentDate} onChange={setPaymentDate} />
              {isBackdated && <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 3, fontWeight: 600 }}>⚠️ Backdated payment</p>}
            </Field>
            <Field label="Allocate to Vote Head">
              <Select value={allocationHead} onChange={setAllocationHead}>
                <option value="">⚡ Auto-distribute by priority (recommended)</option>
                {voteHeadNames.map(h => <option key={h} value={h}>{h}</option>)}

              </Select>
            </Field>
          </div>

          {/* Proportional split toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0 }}>⚖️ Split Proportionally Across All Vote Heads</p>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>Payment distributed proportionally instead of FIFO</p>
            </div>
            <Toggle on={splitProportional} onToggle={() => setSplitProportional(!splitProportional)} />
          </div>

          {/* ── 5. METHOD-SPECIFIC FIELDS ── */}

          {/* M-PESA */}
          {method === 'M-Pesa' && (
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1.5px solid #86efac', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#166534', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>📱 M-Pesa Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Field label="Phone Number">
                  <Input type="tel" value={mpesaPhone} onChange={setMpesaPhone} placeholder="0712 345 678" />
                </Field>
                <Field label="M-Pesa Transaction Code">
                  <Input value={mpesaCode} onChange={setMpesaCode} placeholder="SJK4X7R2FN" mono />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleStkPush} disabled={!mpesaPhone || numAmount <= 0 || stkStatus === 'sending' || stkStatus === 'pending'}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: stkColors[stkStatus], color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s',
                    opacity: (!mpesaPhone || numAmount <= 0) ? 0.5 : 1,
                  }}>
                  {stkStatus === 'sending' ? '⏳ Sending...' : stkStatus === 'pending' ? '🔄 Awaiting PIN...' : stkStatus === 'success' ? '✅ Confirmed!' : stkStatus === 'failed' ? '❌ Failed — Retry' : '📲 Send STK Push'}
                </button>
                <button onClick={handleC2bCheck} disabled={c2bChecking || !mpesaPhone}
                  style={{
                    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #86efac', cursor: 'pointer',
                    background: '#fff', color: '#166534', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                    opacity: c2bChecking ? 0.6 : 1,
                  }}>
                  {c2bChecking ? '🔄' : '🔍'} Check C2B
                </button>
              </div>
              {stkStatus === 'pending' && (
                <p style={{ fontSize: 10, color: '#166534', marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
                  Checking every 5s · Ask parent to enter PIN on their phone
                </p>
              )}
            </div>
          )}

          {/* KCB CALLBACK */}
          {method === 'KCB Callback' && (
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', margin: '0 0 12px' }}>🏦 KCB PesaLink Callback</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Field label="KCB Registered Phone">
                  <Input type="tel" value={kcbPhone} onChange={setKcbPhone} placeholder="0712 345 678" />
                </Field>
                <Field label="Account Reference (Adm No)">
                  <Input value={kcbAccountRef} onChange={setKcbAccountRef} placeholder={adm} mono />
                </Field>
              </div>
              <button onClick={handleKcbPesalink} disabled={!kcbPhone || numAmount <= 0 || kcbStatus === 'sending' || kcbStatus === 'pending'}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: kcbColors[kcbStatus], color: '#fff', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: (!kcbPhone || numAmount <= 0) ? 0.5 : 1, transition: 'all 0.15s',
                }}>
                {kcbStatus === 'idle' && '🏦 Send KCB PesaLink Request'}
                {kcbStatus === 'sending' && '⏳ Sending to KCB...'}
                {kcbStatus === 'pending' && '🔄 Polling KCB... Awaiting Payment'}
                {kcbStatus === 'confirmed' && '✅ KCB Payment Confirmed!'}
                {kcbStatus === 'failed' && '❌ KCB Failed — Retry'}
              </button>
              {kcbStatus === 'pending' && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />
                    <p style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, margin: 0 }}>
                      Checking KCB every 5 seconds · Awaiting parent payment via KCB PesaLink
                    </p>
                  </div>
                </div>
              )}
              {kcbStatus === 'confirmed' && bankSlip && (
                <p style={{ fontSize: 11, color: '#166534', marginTop: 6, fontWeight: 700, textAlign: 'center' }}>
                  ✅ KCB Ref: <span style={{ fontFamily: 'monospace' }}>{bankSlip}</span>
                </p>
              )}
            </div>
          )}

          {/* BANK TRANSFER */}
          {method === 'Bank Transfer' && (
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', margin: '0 0 12px' }}>🏛️ Bank Transfer / RTGS / EFT</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Slip / Reference No">
                  <Input value={bankSlip} onChange={setBankSlip} placeholder="SLIP-001234" mono />
                </Field>
                <Field label="Bank Name">
                  <Select value={bankBranch} onChange={setBankBranch}>
                    {KE_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label="Deposit Date">
                  <Input type="date" value={bankDate} onChange={setBankDate} />
                </Field>
              </div>
            </div>
          )}

          {/* CHEQUE */}
          {method === 'Cheque' && (
            <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid #fcd34d', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', margin: '0 0 12px' }}>📝 Cheque Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Cheque Number">
                  <Input value={chequeNo} onChange={setChequeNo} placeholder="000123" mono />
                </Field>
                <Field label="Drawee Bank">
                  <Select value={chequeBank} onChange={setChequeBank}>
                    <option value="">— Select bank —</option>
                    {KE_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label="Cheque Date">
                  <Input type="date" value={chequeDate} onChange={setChequeDate} />
                  {chequeDate > new Date().toISOString().split('T')[0] && (
                    <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 3, fontWeight: 600 }}>⚠️ Post-dated cheque</p>
                  )}
                </Field>
              </div>
            </div>
          )}

          {/* IN-KIND */}
          {method === 'In-Kind' && (
            <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1.5px solid #c4b5fd', borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#5b21b6', margin: '0 0 12px' }}>🌾 In-Kind Contribution</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Item Type *">
                  <Select value={inKindItem} onChange={setInKindItem}>
                    <option value="">— Select item —</option>
                    {IN_KIND_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </Select>
                </Field>
                <Field label="Estimated KES Value *">
                  <Input type="number" value={inKindValue} onChange={setInKindValue} placeholder="0" />
                </Field>
              </div>
            </div>
          )}

          {/* BURSARY / WAIVER (collapsible) */}
          <div style={{ border: '1.5px solid #e0e7ff', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ width: '100%', padding: '10px 14px', background: '#f8f9ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#4338ca' }}>
              <span>🎓 Bursary / Waiver / Scholarship</span>
              <span style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: 10 }}>▼</span>
            </button>
            {showAdvanced && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Bursary Source">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button onClick={() => setBursarySource('')}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `2px solid ${!bursarySource ? '#6366f1' : '#e2e8f0'}`, background: !bursarySource ? '#eef2ff' : '#f9fafb', color: !bursarySource ? '#4f46e5' : '#6b7280' }}>
                      None
                    </button>
                    {BURSARY_SOURCES.map(bs => (
                      <button key={bs.id} onClick={() => setBursarySource(bs.id)}
                        style={{ padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `2px solid ${bursarySource === bs.id ? '#6366f1' : '#e2e8f0'}`, background: bursarySource === bs.id ? '#eef2ff' : '#f9fafb', color: bursarySource === bs.id ? '#4f46e5' : '#6b7280' }}>
                        {bs.icon} {bs.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Waiver Type">
                    <Select value={waiverType} onChange={setWaiverType}>
                      <option value="">— No Waiver —</option>
                      {WAIVER_TYPES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Reference / Award Letter No">
                    <Input value={bursaryRef} onChange={setBursaryRef} placeholder="BUR/2024/001" mono />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* NOTES */}
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid #e2e8f0', background: '#fff', outline: 'none',
                resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              } as React.CSSProperties}
            />
          </Field>

          {/* NOTIFICATIONS */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { icon: '📱', label: 'SMS Receipt', sub: student.guardian_phone || 'No phone', on: sendSms, toggle: () => setSendSms(!sendSms) },
              { icon: '💬', label: 'WhatsApp Notification', sub: 'WhatsApp receipt + balance', on: sendWhatsapp, toggle: () => setSendWhatsapp(!sendWhatsapp) },
            ].map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>{n.label}</p>
                    <p style={{ fontSize: 9, color: '#9ca3af', margin: '1px 0 0' }}>{n.sub}</p>
                  </div>
                </div>
                <Toggle on={n.on} onToggle={n.toggle} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', background: '#fafbff' }}>
          {/* Live calculator */}
          {numAmount > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Paying', val: fmt(numAmount), color: '#6366f1', bg: '#eef2ff' },
                { label: 'Balance After', val: fmt(balanceAfter), color: balanceAfter > 0 ? '#ef4444' : '#10b981', bg: balanceAfter > 0 ? '#fef2f2' : '#f0fdf4' },
                { label: changeDue > 0 ? 'Next Term Prepayment' : 'Change Due', val: fmt(changeDue), color: changeDue > 0 ? '#0891b2' : '#9ca3af', bg: changeDue > 0 ? '#ecfeff' : '#f9fafb' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '10px 8px', background: c.bg, borderRadius: 10, textAlign: 'center', border: `1px solid ${c.color}22` }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{c.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: c.color, margin: 0 }}>{c.val}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '12px 22px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={numAmount <= 0 || isSubmitting}
              style={{
                padding: '12px 32px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800,
                color: '#fff', cursor: numAmount <= 0 || isSubmitting ? 'not-allowed' : 'pointer',
                background: numAmount > 0 && !isSubmitting
                  ? 'linear-gradient(135deg,#1e1b4b,#4338ca,#6366f1)'
                  : '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: numAmount > 0 && !isSubmitting ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                transition: 'all 0.2s',
                transform: numAmount > 0 && !isSubmitting ? 'translateY(0)' : 'none',
              }}>
              {isSubmitting
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Processing...</>
                : <>✓ Record {numAmount > 0 ? fmt(numAmount) : ''}</>}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalUp { from { opacity:0; transform:translateY(28px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
      `}</style>
    </div>
  );
}

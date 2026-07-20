'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { autoDistributePayment } from '@/lib/feeDistribution';
import { getNextReceiptNumber } from '@/lib/receiptNumber';

export const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'] as const;
export type PayMethod = typeof PAYMENT_METHODS[number];

export const BURSARY_SOURCES = [
  { id: 'moe_capitation', label: 'MoE Capitation', icon: '🏛️', color: '#1D9E75' },
  { id: 'county_bursary', label: 'County Bursary', icon: '🏦', color: '#378ADD' },
  { id: 'cdf', label: 'CDF/NG-CDF', icon: '🇰🇪', color: '#6C63FF' },
  { id: 'helb', label: 'HELB', icon: '🎓', color: '#EF9F27' },
  { id: 'ngo', label: 'NGO/Scholarship', icon: '🤝', color: '#E24B4A' },
  { id: 'church', label: 'Church/FBO', icon: '⛪', color: '#8B5CF6' },
] as const;

export const WAIVER_TYPES = [
  { id: 'sibling', label: 'Sibling Discount' },
  { id: 'principal', label: 'Principal Waiver' },
  { id: 'hardship', label: 'Hardship Waiver' },
  { id: 'staff_child', label: 'Staff Child' },
  { id: 'scholarship', label: 'Scholarship' },
] as const;

// FEE_VOTE_HEADS is now DB-driven via school_vote_heads table.
// Use useVoteHeadNames() hook below — fetches live from DB in priority order.
// The fallback below is only used when DB is empty or unreachable.
export const FEE_VOTE_HEADS_FALLBACK = [
  'Arrears', 'BES', 'Activity', 'Bursary', 'Prepayment', 'General',
] as const;

/** Live vote head names from DB — use this in dropdowns */
export function useVoteHeadNames(): { names: string[]; loading: boolean; refetch: () => void } {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('school_vote_heads')
      .select('name')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('name');
    if (!error && data && data.length > 0) {
      setNames(data.map((v: any) => v.name));
    } else {
      setNames([...FEE_VOTE_HEADS_FALLBACK]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { names, loading, refetch };
}

// Backwards-compatible alias so existing imports don't break
export const FEE_VOTE_HEADS = FEE_VOTE_HEADS_FALLBACK;

export interface FeeBreakdownItem {
  voteHead: string;
  amount: number;
  termId?: number;
  paid?: number;
  balance?: number;
}

export interface BursaryCredit {
  id: number;
  source: string;
  amount: number;
  reference: string;
  status: string;
  date: string;
  applied: boolean;
}

export interface StudentFeeProfile {
  totalPaid: number;
  termTotal: number;
  termBalance: number;
  annualTotal: number;
  annualBalance: number;
  arrears: number;
  overpayment: number;
  bursaryTotal: number;
  capitationTotal: number;
  waiverTotal: number;
  netDue: number;
  paymentProgress: number;
  feeBreakdown: FeeBreakdownItem[];
  bursaryCredits: BursaryCredit[];
  prevTermArrears: number;
  /** true only when a fee structure exists AND the student has paid in full */
  isCleared: boolean;
  /** true when a fee structure exists for this student's form */
  hasFeeStructure: boolean;
}

export function useUltraFeeCollect() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [bursaryRecords, setBursaryRecords] = useState<any[]>([]);
  const [capitationRecords, setCapitationRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, stRes, sRes, pRes, fsRes, tRes, brRes, cpRes, setRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_students').select('*').order('first_name'),
      supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('school_fee_structures').select('*'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_bursary_records').select('*').order('created_at', { ascending: false }),
      supabase.from('school_capitation').select('*').order('created_at', { ascending: false }),
      supabase.from('school_settings').select('*'),
    ]);
    setForms(fRes.data || []);
    setStreams(stRes.data || []);
    setStudents(sRes.data || []);
    setPayments(pRes.data || []);
    setStructures(fsRes.data || []);
    setTerms(tRes.data || []);
    setBursaryRecords(brRes.data || []);
    setCapitationRecords(cpRes.data || []);
    const settingsMap: any = {};
    (setRes.data || []).forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });
    setSettings(settingsMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const currentTerm = useMemo(() => terms.find(t => t.is_current), [terms]);
  const currentYear = new Date().getFullYear();

  const getFormName = useCallback((id: number) => forms.find(f => f.id === id)?.form_name || '-', [forms]);
  const getStreamName = useCallback((id: number) => streams.find(s => s.id === id)?.stream_name || '-', [streams]);

  const searchStudent = useCallback((query: string) => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return students.filter(s => {
      const adm = (s.admission_no || s.admission_number || '').toLowerCase();
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const nemis = (s.nemis_no || '').toLowerCase();
      const phone = (s.guardian_phone || '').toLowerCase();
      return adm.includes(q) || name.includes(q) || nemis.includes(q) || phone.includes(q);
    }).slice(0, 10);
  }, [students]);

  const getStudentFeeProfile = useCallback((studentId: number, formId?: number): StudentFeeProfile => {
    const studentPays = payments.filter(p => p.student_id === studentId);
    const totalPaid = studentPays.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Fee structure
    const applicableFees = formId
      ? structures.filter(f => !f.form_id || f.form_id === formId)
      : structures;
    let yearFiltered = applicableFees.filter(f => !f.year || f.year === currentYear);
    if (yearFiltered.length === 0 && applicableFees.length > 0) {
      const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
      yearFiltered = applicableFees.filter(f => !f.year || f.year === maxYear);
    }
    const termFees = yearFiltered.filter(f => currentTerm ? (!f.term_id || f.term_id === currentTerm.id) : true);
    const termTotal = termFees.reduce((s, f) => s + Number(f.amount || 0), 0);
    const annualTotal = yearFiltered.reduce((s, f) => s + Number(f.amount || 0), 0);

    // Fee breakdown by vote head
    const feeBreakdown: FeeBreakdownItem[] = [];
    const grouped: Record<string, number> = {};
    termFees.forEach(f => {
      const head = f.vote_head || f.fee_name || 'Tuition';
      grouped[head] = (grouped[head] || 0) + Number(f.amount || 0);
    });
    Object.entries(grouped).forEach(([voteHead, amount]) => {
      feeBreakdown.push({ voteHead, amount, paid: 0, balance: amount });
    });

    // Bursary & capitation credits
    const stuBursary = bursaryRecords.filter(b => b.student_id === studentId);
    const bursaryTotal = stuBursary.reduce((s, b) => s + Number(b.amount || 0), 0);
    const bursaryCredits: BursaryCredit[] = stuBursary.map(b => ({
      id: b.id,
      source: b.bursary_type || 'Other',
      amount: Number(b.amount || 0),
      reference: b.reference_number || '',
      status: b.status || 'Pending',
      date: b.disbursement_date || b.created_at,
      applied: b.status === 'Applied' || b.status === 'Approved',
    }));

    // Capitation (form/stream level)
    const stuCapitation = capitationRecords.filter(c =>
      (!c.form_id || c.form_id === formId) && (c.status === 'Approved' || c.status === 'Applied')
    );
    const capitationTotal = stuCapitation.reduce((s, c) => s + Number(c.amount || 0), 0);

    // ── Payment Waterfall: apply payments first to prev term arrears, then current term ──
    // This mirrors Kenya school fee convention correctly
    const prevTerms = terms.filter(t => !t.is_current);
    let prevTotal = 0;
    if (prevTerms.length > 0) {
      const prevTermFees = yearFiltered.filter(f => prevTerms.some(pt => pt.id === f.term_id));
      prevTotal = prevTermFees.reduce((s, f) => s + Number(f.amount || 0), 0);
    }

    // Payments are applied: 1st to prev term arrears, 2nd to current term
    const prevArrears    = Math.max(0, prevTotal - Math.min(totalPaid, prevTotal));
    const termPaidAmt    = Math.max(0, totalPaid - prevTotal); // what's left after clearing arrears
    const termBalanceFix = Math.max(0, termTotal - termPaidAmt);
    const prevTermArrears = prevArrears;

    const waiverTotal = 0; // Can be extended with waiver records
    // Total Due = arrears owed + current term balance (after deducting bursary/capitation)
    const netDue = Math.max(0, prevArrears + termBalanceFix - bursaryTotal - capitationTotal - waiverTotal);
    // paymentProgress: only meaningful when a fee structure exists
    const paymentProgress = annualTotal > 0 ? Math.min(100, Math.round((totalPaid / annualTotal) * 100)) : 0;
    // hasFeeStructure: true only when the fee structure has been set up for this student's form
    const hasFeeStructure = termTotal > 0 || annualTotal > 0;
    // isCleared: ONLY when fees exist AND all dues are fully paid — NOT when fees are simply zero/missing
    const isCleared = hasFeeStructure && netDue <= 0 && totalPaid > 0;

    return {
      totalPaid,
      termTotal,
      termBalance: termBalanceFix,           // Current term unpaid (after applying prev-term payments first)
      annualTotal,
      annualBalance: Math.max(0, annualTotal - totalPaid), // All remaining fees for the year
      arrears: prevArrears,
      overpayment: totalPaid > annualTotal ? totalPaid - annualTotal : 0,
      bursaryTotal, capitationTotal, waiverTotal, netDue, paymentProgress,
      feeBreakdown, bursaryCredits, prevTermArrears,
      hasFeeStructure, isCleared,
    };
  }, [payments, structures, terms, bursaryRecords, capitationRecords, currentTerm, currentYear]);

  const getStudentPayments = useCallback((studentId: number) => {
    return payments
      .filter(p => p.student_id === studentId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [payments]);

  // Record payment
  const recordPayment = useCallback(async (data: {
    studentId: number;
    amount: number;
    method: string;
    reference?: string;
    mpesaPhone?: string;
    mpesaCode?: string;
    bankRef?: string;
    chequeNo?: string;
    inKindItem?: string;
    inKindValue?: number;
    allocationHead?: string;
    bursarySource?: string;
    waiverType?: string;
    notes?: string;
  }) => {
    // ── Get next receipt number atomically from DB ──────────────────
    const receiptNo = await getNextReceiptNumber(supabase);
    const method = data.method === 'In-Kind' ? `In-Kind (${data.inKindItem || 'Other'})` : data.method;
    const ref = data.method === 'M-Pesa' ? data.mpesaCode : data.method === 'Bank Transfer' ? data.bankRef : data.method === 'Cheque' ? data.chequeNo : data.reference;
    const amount = data.method === 'In-Kind' ? (data.inKindValue || data.amount) : data.amount;

    let notes = data.notes || '';
    if (data.allocationHead) notes += ` [Allocated: ${data.allocationHead}]`;
    if (data.bursarySource) notes += ` [Bursary: ${data.bursarySource}]`;
    if (data.waiverType) notes += ` [Waiver: ${data.waiverType}]`;
    if (data.method === 'In-Kind') notes = `In-Kind: ${data.inKindItem} valued at KES ${amount}${notes ? '. ' + notes : ''}`;

    const payload = {
      student_id: data.studentId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: method,
      receipt_number: receiptNo,
      reference_number: ref || null,
      term_id: currentTerm?.id || null,
      year: currentYear,
      notes: notes.trim() || null,
    };

    // Insert and get back the new payment ID (needed for allocations)
    const { data: saved, error } = await supabase
      .from('school_fee_payments')
      .insert([payload])
      .select('id')
      .single();
    if (error) throw error;

    const paymentId = saved?.id;

    // ── Auto-distribute payment across vote heads by priority ──────
    if (paymentId) {
      try {
        const result = await autoDistributePayment(supabase, {
          paymentId,
          studentId:  data.studentId,
          amount,
          termId:     currentTerm?.id || null,
          year:       currentYear,
        });
        console.log(
          `[recordPayment] Distributed KES ${amount}:`,
          result.allocations.map((a: any) => `${a.vote_head_code}=KES${a.allocated_amount}`).join(', ')
        );
      } catch (distErr) {
        // Distribution failure must NEVER block the payment itself
        console.warn('[recordPayment] Auto-distribution failed (payment saved OK):', distErr);
      }
    }

    return { ...payload, id: paymentId, receipt_number: receiptNo };
  }, [currentTerm, currentYear]);

  // Update payment
  const updatePayment = useCallback(async (paymentId: number, updates: any) => {
    const { error } = await supabase.from('school_fee_payments').update(updates).eq('id', paymentId);
    if (error) throw error;
  }, []);

  // Delete payment + its allocations (keep data consistent)
  const deletePayment = useCallback(async (paymentId: number) => {
    // Remove child allocation rows first
    await supabase.from('school_fee_payment_allocations').delete().eq('payment_id', paymentId);
    // Then remove the payment
    const { error } = await supabase.from('school_fee_payments').delete().eq('id', paymentId);
    if (error) throw error;
  }, []);

  // Send SMS receipt
  const sendSmsReceipt = useCallback(async (student: any, amount: number, receiptNo: string, method: string, fees: StudentFeeProfile) => {
    if (!student.guardian_phone) return false;
    const schoolName = settings?.school_name || 'ALPHA PREMIER SCHOOL';
    const smsMessage = [
      `Dear Parent,`, ``,
      `📋 ${schoolName}`, `FEE PAYMENT RECEIPT`,
      `━━━━━━━━━━━━━━━━━`,
      `Student: ${student.first_name} ${student.last_name}`,
      `Adm No: ${student.admission_no || student.admission_number}`,
      `Amount: KES ${amount.toLocaleString()}`,
      `Receipt: ${receiptNo}`,
      `Method: ${method}`,
      `Term Bal: KES ${fees.termBalance.toLocaleString()}`,
      `Annual Bal: KES ${fees.annualBalance.toLocaleString()}`,
      `Date: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      `━━━━━━━━━━━━━━━━━`,
      `Thank you for your payment.`,
    ].join('\n');

    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: student.guardian_phone, message: smsMessage }),
      });
      const data = await res.json();
      return data.success;
    } catch { return false; }
  }, [settings]);

  // Get running statement
  const getStatement = useCallback((studentId: number) => {
    const stuPayments = payments
      .filter(p => p.student_id === studentId)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    let runningBalance = 0;
    const student = students.find(s => s.id === studentId);
    const formId = student?.form_id;

    // Get total fees charged
    const applicableFees = formId ? structures.filter(f => !f.form_id || f.form_id === formId) : structures;
    let yearFiltered = applicableFees.filter(f => !f.year || f.year === currentYear);
    if (yearFiltered.length === 0 && applicableFees.length > 0) {
      const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
      yearFiltered = applicableFees.filter(f => !f.year || f.year === maxYear);
    }
    const totalCharged = yearFiltered.reduce((s, f) => s + Number(f.amount || 0), 0);
    runningBalance = totalCharged;

    const entries = stuPayments.map(p => {
      runningBalance -= Number(p.amount || 0);
      return {
        id: p.id,
        date: p.payment_date,
        description: `Payment — ${p.payment_method}`,
        reference: p.receipt_number || p.reference_number || '',
        debit: 0,
        credit: Number(p.amount || 0),
        balance: Math.max(0, runningBalance),
        method: p.payment_method,
        term: terms.find(t => t.id === p.term_id)?.term_name || '',
      };
    });

    return {
      totalCharged,
      totalPaid: stuPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
      balance: Math.max(0, runningBalance),
      entries,
    };
  }, [payments, students, structures, terms, currentYear]);

  return {
    loading, forms, streams, students, payments, structures, terms,
    bursaryRecords, capitationRecords, settings,
    currentTerm, currentYear,
    getFormName, getStreamName, searchStudent,
    getStudentFeeProfile, getStudentPayments, getStatement,
    recordPayment, updatePayment, deletePayment,
    sendSmsReceipt, fetchAll,
  };
}

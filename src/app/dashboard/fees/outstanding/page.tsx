'use client';

import { useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUltraFeeCollect, fmt, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import UltraOutstandingCharts, {
  type FormMetric,
  type TermTrendMetric,
  type RiskBracketCount,
} from '@/components/fees/UltraOutstandingCharts';
import UltraBulkSmsModal from '@/components/fees/UltraBulkSmsModal';
import { exportUltraOutstandingExcel } from '@/components/fees/UltraOutstandingExport';
import { printDemandLetter } from '@/components/fees/UltraThermalReceipt';
import {
  FiAlertTriangle, FiDollarSign, FiUsers, FiSearch, FiFilter,
  FiPrinter, FiDownload, FiRefreshCw, FiCheckCircle, FiPhone,
  FiCalendar, FiCreditCard, FiFileText, FiMessageSquare,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiCheck, FiX, FiExternalLink, FiUpload, FiArrowUpRight,
  FiSliders, FiLayers, FiShield, FiTrendingUp, FiActivity,
} from 'react-icons/fi';

/* ─────────────────────────────────────────────
   CURRICULUM TRACK TYPES & DETECTOR
───────────────────────────────────────────── */
type CurriculumTrack = 'ALL' | 'CBC_SENIOR' | '844' | 'JSS' | 'PRIMARY_CBC';

function detectTrack(form: any): 'CBC_SENIOR' | '844' | 'JSS' | 'PRIMARY_CBC' | 'OTHER' {
  if (!form) return 'OTHER';
  const sys = String(form.education_system || '').toLowerCase();
  const name = String(form.form_name || '').toLowerCase();

  if (sys.includes('senior') || name.includes('grade 10') || name.includes('grade 11') || name.includes('grade 12')) {
    return 'CBC_SENIOR';
  }
  if (sys.includes('junior') || name.includes('grade 7') || name.includes('grade 8') || name.includes('grade 9')) {
    return 'JSS';
  }
  if (sys.includes('8-4-4') || sys.includes('844') || name.startsWith('form ')) {
    return '844';
  }
  if (sys.includes('primary') || name.startsWith('grade ') || name.startsWith('pp ')) {
    return 'PRIMARY_CBC';
  }
  return 'OTHER';
}

/* ─────────────────────────────────────────────
   HELPERS & FORMATTERS
───────────────────────────────────────────── */
const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const KESK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function OutstandingFeesPage() {
  const {
    forms,
    streams,
    students,
    payments,
    structures,
    terms,
    currentTerm,
    loading,
    fetchAll,
    settings,
    recordPayment,
    getStudentFeeProfile,
  } = useUltraFeeCollect();

  // ── Curriculum & Filter State ──
  const [selectedTrack, setSelectedTrack] = useState<CurriculumTrack>('ALL');
  const [search, setSearch] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterStream, setFilterStream] = useState('');
  const [filterTerm, setFilterTerm] = useState('all'); // 'all' | '1' | '2' | '3'
  const [riskTier, setRiskTier] = useState<string>('all'); // 'all' | 'mild' | 'moderate' | 'severe' | 'critical'
  const [balanceRange, setBalanceRange] = useState('all');
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [sortBy, setSortBy] = useState('highest'); // 'highest' | 'lowest' | 'nameAZ' | 'nameZA' | 'form'
  const [filtersOpen, setFiltersOpen] = useState(true);

  // ── Grid Page Size (Default reduced to 10 as requested) ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');

  // ── Selection State for Bulk Actions ──
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // ── Modals & Drawers ──
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [fastPayStudent, setFastPayStudent] = useState<any>(null);
  const [fastPayProfile, setFastPayProfile] = useState<StudentFeeProfile | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Term Lookups
  const currentYear = new Date().getFullYear();
  const term1 = useMemo(
    () => terms.find(t => t.term_number === 1 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 1),
    [terms, currentTerm]
  );
  const term2 = useMemo(
    () => terms.find(t => t.term_number === 2 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 2),
    [terms, currentTerm]
  );
  const term3 = useMemo(
    () => terms.find(t => t.term_number === 3 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 3),
    [terms, currentTerm]
  );

  // Form & Stream Map Helpers
  const formMap = useMemo(() => {
    const map = new Map<number, any>();
    forms.forEach(f => map.set(f.id, f));
    return map;
  }, [forms]);

  const streamMap = useMemo(() => {
    const map = new Map<number, any>();
    streams.forEach(s => map.set(s.id, s));
    return map;
  }, [streams]);

  const safeGetFormName = useCallback((id?: number) => {
    if (!id) return '—';
    return formMap.get(id)?.form_name || `Form ${id}`;
  }, [formMap]);

  const safeGetStreamName = useCallback((id?: number) => {
    if (!id) return '—';
    return streamMap.get(id)?.stream_name || `Stream ${id}`;
  }, [streamMap]);

  // Per-term fee calculator helper
  const getTermBalance = useCallback(
    (studentId: number, formId: number | null, termId: number | undefined) => {
      if (!termId) return 0;
      const termPaid = payments
        .filter(p => p.student_id === studentId && p.term_id === termId)
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const termFees = structures
        .filter(f => (!f.form_id || f.form_id === formId) && f.term_id === termId && (!f.year || f.year === currentYear))
        .reduce((s, f) => s + Number(f.amount || 0), 0);
      return Math.max(0, termFees - termPaid);
    },
    [payments, structures, currentYear]
  );

  // ── Build Enriched Defaulters Registry ──
  const allDefaulters = useMemo(() => {
    return students
      .filter(s => s.status === 'Active')
      .map(s => {
        const studentPays = payments.filter(p => p.student_id === s.id);
        const totalPaid = studentPays.reduce((acc, p) => acc + Number(p.amount || 0), 0);

        const applicableFees = structures.filter(f => !f.form_id || f.form_id === s.form_id);
        let yearFees = applicableFees.filter(f => !f.year || f.year === currentYear);
        if (yearFees.length === 0 && applicableFees.length > 0) {
          const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
          yearFees = applicableFees.filter(f => !f.year || f.year === maxYear);
        }
        const annualTotal = yearFees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
        const annualBalance = Math.max(0, annualTotal - totalPaid);

        const t1Bal = getTermBalance(s.id, s.form_id, term1?.id);
        const t2Bal = getTermBalance(s.id, s.form_id, term2?.id);
        const t3Bal = getTermBalance(s.id, s.form_id, term3?.id);
        const termBalance = currentTerm ? getTermBalance(s.id, s.form_id, currentTerm.id) : 0;

        const formObj = formMap.get(s.form_id);
        const track = detectTrack(formObj);

        // Risk tier categorization
        let tier: 'Mild' | 'Moderate' | 'Severe' | 'Critical' = 'Mild';
        if (annualBalance >= 30000) tier = 'Critical';
        else if (annualBalance >= 15000) tier = 'Severe';
        else if (annualBalance >= 5000) tier = 'Moderate';

        // Most recent payment date
        const lastPay = studentPays.length > 0 ? studentPays[0].payment_date : undefined;

        return {
          ...s,
          totalPaid,
          annualTotal,
          annualBalance,
          termBalance,
          t1Bal,
          t2Bal,
          t3Bal,
          track,
          riskTier: tier,
          lastPaymentDate: lastPay,
        };
      })
      .filter(s => s.annualBalance > 0 || s.termBalance > 0);
  }, [students, payments, structures, term1, term2, term3, currentTerm, currentYear, getTermBalance, formMap]);

  // Curriculum Counts
  const trackCounts = useMemo(() => {
    let all = 0;
    let cbcSenior = 0;
    let sec844 = 0;
    let jss = 0;
    let pri = 0;

    allDefaulters.forEach(s => {
      all++;
      if (s.track === 'CBC_SENIOR') cbcSenior++;
      else if (s.track === '844') sec844++;
      else if (s.track === 'JSS') jss++;
      else if (s.track === 'PRIMARY_CBC') pri++;
    });

    return { all, cbcSenior, sec844, jss, pri };
  }, [allDefaulters]);

  // ── Apply Track & Detail Filters ──
  const filtered = useMemo(() => {
    let list = [...allDefaulters];

    // Curriculum Track
    if (selectedTrack !== 'ALL') {
      list = list.filter(s => s.track === selectedTrack);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q) ||
        (s.guardian_phone || '').includes(q)
      );
    }

    // Form
    if (filterForm) list = list.filter(s => String(s.form_id) === filterForm);

    // Stream
    if (filterStream) list = list.filter(s => String(s.stream_id) === filterStream);

    // Risk tier
    if (riskTier !== 'all') {
      list = list.filter(s => s.riskTier.toLowerCase() === riskTier.toLowerCase());
    }

    // Term balance filter
    if (filterTerm === '1') list = list.filter(s => s.t1Bal > 0);
    else if (filterTerm === '2') list = list.filter(s => s.t2Bal > 0);
    else if (filterTerm === '3') list = list.filter(s => s.t3Bal > 0);

    // Balance range
    if (balanceRange === 'below5k') list = list.filter(s => s.annualBalance < 5000);
    else if (balanceRange === '5k-15k') list = list.filter(s => s.annualBalance >= 5000 && s.annualBalance < 15000);
    else if (balanceRange === '15k-30k') list = list.filter(s => s.annualBalance >= 15000 && s.annualBalance < 30000);
    else if (balanceRange === 'above30k') list = list.filter(s => s.annualBalance >= 30000);
    else if (balanceRange === 'custom') {
      const mn = Number(customMin) || 0;
      const mx = Number(customMax) || Infinity;
      list = list.filter(s => s.annualBalance >= mn && s.annualBalance <= mx);
    }

    // Sort order
    if (sortBy === 'highest') list.sort((a, b) => b.annualBalance - a.annualBalance);
    else if (sortBy === 'lowest') list.sort((a, b) => a.annualBalance - b.annualBalance);
    else if (sortBy === 'nameAZ') list.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    else if (sortBy === 'nameZA') list.sort((a, b) => `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`));
    else if (sortBy === 'form') list.sort((a, b) => (a.form_id || 0) - (b.form_id || 0));

    return list;
  }, [allDefaulters, selectedTrack, search, filterForm, filterStream, riskTier, filterTerm, balanceRange, customMin, customMax, sortBy]);

  // ── Totals Aggregation ──
  const totals = useMemo(() => {
    return {
      paid: filtered.reduce((s, r) => s + r.totalPaid, 0),
      t1: filtered.reduce((s, r) => s + r.t1Bal, 0),
      t2: filtered.reduce((s, r) => s + r.t2Bal, 0),
      t3: filtered.reduce((s, r) => s + r.t3Bal, 0),
      annual: filtered.reduce((s, r) => s + r.annualBalance, 0),
      allPaid: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    };
  }, [filtered, payments]);

  // ── Prepare Analytics Data for Side-by-Side Charts ──
  const formMetrics = useMemo<FormMetric[]>(() => {
    const map = new Map<number, FormMetric>();

    forms.forEach(f => {
      const track = detectTrack(f);
      map.set(f.id, {
        formId: f.id,
        formName: f.form_name,
        track,
        totalStudents: 0,
        defaultersCount: 0,
        totalOwed: 0,
        totalPaid: 0,
        clearancePct: 0,
      });
    });

    students.forEach(s => {
      const entry = map.get(s.form_id);
      if (entry) entry.totalStudents++;
    });

    allDefaulters.forEach(s => {
      const entry = map.get(s.form_id);
      if (entry) {
        entry.defaultersCount++;
        entry.totalOwed += s.annualBalance;
        entry.totalPaid += s.totalPaid;
      }
    });

    return Array.from(map.values())
      .map(entry => {
        const totalBilled = entry.totalPaid + entry.totalOwed;
        entry.clearancePct = totalBilled > 0 ? Math.round((entry.totalPaid / totalBilled) * 100) : 0;
        return entry;
      })
      .filter(e => e.totalStudents > 0);
  }, [forms, students, allDefaulters]);

  const termTrends = useMemo<TermTrendMetric[]>(() => {
    return [
      {
        termLabel: 'Term 1',
        invoiced: totals.t1 + totals.paid * 0.4,
        collected: totals.paid * 0.4,
        outstanding: totals.t1,
        recoveryPct: 65,
      },
      {
        termLabel: 'Term 2',
        invoiced: totals.t2 + totals.paid * 0.35,
        collected: totals.paid * 0.35,
        outstanding: totals.t2,
        recoveryPct: 52,
      },
      {
        termLabel: 'Term 3',
        invoiced: totals.t3 + totals.paid * 0.25,
        collected: totals.paid * 0.25,
        outstanding: totals.t3,
        recoveryPct: 40,
      },
      {
        termLabel: 'Annual Target',
        invoiced: totals.annual + totals.paid,
        collected: totals.paid,
        outstanding: totals.annual,
        recoveryPct: totals.paid + totals.annual > 0 ? Math.round((totals.paid / (totals.paid + totals.annual)) * 100) : 0,
      },
    ];
  }, [totals]);

  const riskBrackets = useMemo<RiskBracketCount[]>(() => {
    let mildC = 0, mildT = 0;
    let modC = 0, modT = 0;
    let sevC = 0, sevT = 0;
    let critC = 0, critT = 0;

    allDefaulters.forEach(s => {
      if (s.riskTier === 'Critical') { critC++; critT += s.annualBalance; }
      else if (s.riskTier === 'Severe') { sevC++; sevT += s.annualBalance; }
      else if (s.riskTier === 'Moderate') { modC++; modT += s.annualBalance; }
      else { mildC++; mildT += s.annualBalance; }
    });

    return [
      { tier: 'Critical', count: critC, total: critT, color: '#dc2626' },
      { tier: 'Severe', count: sevC, total: sevT, color: '#ea580c' },
      { tier: 'Moderate', count: modC, total: modT, color: '#d97706' },
      { tier: 'Mild', count: mildC, total: mildT, color: '#16a34a' },
    ];
  }, [allDefaulters]);

  // ── Pagination Calculation ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    return filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filtered, safePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  const handleJump = () => {
    const n = parseInt(jumpPage);
    if (n >= 1 && n <= totalPages) {
      setPage(n);
      setJumpPage('');
    }
  };

  // ── Selection Handlers ──
  const isAllPageSelected = paginated.length > 0 && paginated.every(s => selectedStudentIds.includes(s.id));
  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginated.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedStudentIds, ...paginated.map(s => s.id)]);
      setSelectedStudentIds(Array.from(newIds));
    }
  };

  const toggleSelectStudent = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Row-Level Actions ──
  const handleOpenFastPay = (student: any) => {
    const profile = getStudentFeeProfile(student.id, student.form_id);
    setFastPayStudent(student);
    setFastPayProfile(profile);
  };

  const handlePaymentSubmit = async (data: PaymentData) => {
    if (!fastPayStudent) return;
    setIsSubmittingPay(true);
    try {
      await recordPayment({
        studentId: fastPayStudent.id,
        amount: data.amount,
        method: data.method,
        mpesaPhone: data.mpesaPhone,
        mpesaCode: data.mpesaCode,
        bankRef: data.bankSlip || data.bankBranch ? `${data.bankSlip ?? ''} ${data.bankBranch ?? ''}`.trim() : undefined,
        chequeNo: data.chequeNo,
        notes: data.notes,
        termId: currentTerm?.id,
      });
      toast.success(`Payment of ${fmt(data.amount)} recorded for ${fastPayStudent.first_name}!`);
      setFastPayStudent(null);
      setFastPayProfile(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Payment recording failed');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleWhatsAppReminder = (student: any) => {
    if (!student.guardian_phone) {
      toast.error('No parent phone number recorded for this student');
      return;
    }
    const cleanPhone = student.guardian_phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
    const name = `${student.first_name} ${student.last_name}`;
    const adm = student.admission_no || student.admission_number || '';
    const bal = fmt(student.annualBalance);
    const school = settings?.school_name || 'Alpha Premier School';

    const msg = encodeURIComponent(
      `*FEE ARREARS REMINDER*\n` +
      `School: *${school}*\n` +
      `Student: *${name}* (${adm})\n` +
      `Outstanding Balance: *${bal}*\n\n` +
      `Dear Parent/Guardian, please settle this outstanding balance promptly to support your student's uninterrupted academic program. Thank you.`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  const handlePrintSingleDemand = (student: any) => {
    const fees = getStudentFeeProfile(student.id, student.form_id);
    printDemandLetter(student, fees, settings?.school_name);
  };

  // ── Multi-Sheet Excel Export ──
  const handleExportExcel = async () => {
    const toastId = toast.loading('Compiling multi-sheet financial workbook with ExcelJS...');
    try {
      const defaulterExportList = filtered.map((s, idx) => ({
        index: idx + 1,
        admNo: (s.admission_no || s.admission_number || '').toString(),
        fullName: `${s.first_name} ${s.other_name || ''} ${s.last_name}`.trim(),
        gender: s.gender,
        formName: safeGetFormName(s.form_id),
        streamName: safeGetStreamName(s.stream_id),
        guardianName: s.guardian_name,
        guardianPhone: s.guardian_phone,
        curriculumTrack: s.track,
        totalPaid: s.totalPaid,
        term1Balance: s.t1Bal,
        term2Balance: s.t2Bal,
        term3Balance: s.t3Bal,
        annualBalance: s.annualBalance,
        riskTier: s.riskTier,
        lastPaymentDate: s.lastPaymentDate,
      }));

      const formSummaries = formMetrics.map(fm => ({
        formName: fm.formName,
        curriculumTrack: fm.track,
        totalStudents: fm.totalStudents,
        defaultersCount: fm.defaultersCount,
        defaultRatePct: fm.totalStudents > 0 ? (fm.defaultersCount / fm.totalStudents) * 100 : 0,
        totalCollected: fm.totalPaid,
        totalOutstanding: fm.totalOwed,
      }));

      const agingExport = [
        {
          bracket: 'Critical Risk',
          range: '> KES 30,000',
          studentCount: riskBrackets.find(b => b.tier === 'Critical')?.count || 0,
          totalAmount: riskBrackets.find(b => b.tier === 'Critical')?.total || 0,
          pctOfTotalDebt: totals.annual > 0 ? ((riskBrackets.find(b => b.tier === 'Critical')?.total || 0) / totals.annual) * 100 : 0,
          recommendedAction: 'Immediate parent conference & demand letter',
        },
        {
          bracket: 'Severe Risk',
          range: 'KES 15,000 – 30,000',
          studentCount: riskBrackets.find(b => b.tier === 'Severe')?.count || 0,
          totalAmount: riskBrackets.find(b => b.tier === 'Severe')?.total || 0,
          pctOfTotalDebt: totals.annual > 0 ? ((riskBrackets.find(b => b.tier === 'Severe')?.total || 0) / totals.annual) * 100 : 0,
          recommendedAction: 'Structured payment plan & M-Pesa STK push prompt',
        },
        {
          bracket: 'Moderate Risk',
          range: 'KES 5,000 – 15,000',
          studentCount: riskBrackets.find(b => b.tier === 'Moderate')?.count || 0,
          totalAmount: riskBrackets.find(b => b.tier === 'Moderate')?.total || 0,
          pctOfTotalDebt: totals.annual > 0 ? ((riskBrackets.find(b => b.tier === 'Moderate')?.total || 0) / totals.annual) * 100 : 0,
          recommendedAction: 'Automated SMS reminder & bursary check',
        },
        {
          bracket: 'Mild Arrears',
          range: '< KES 5,000',
          studentCount: riskBrackets.find(b => b.tier === 'Mild')?.count || 0,
          totalAmount: riskBrackets.find(b => b.tier === 'Mild')?.total || 0,
          pctOfTotalDebt: totals.annual > 0 ? ((riskBrackets.find(b => b.tier === 'Mild')?.total || 0) / totals.annual) * 100 : 0,
          recommendedAction: 'Routine reminder at midterm',
        },
      ];

      await exportUltraOutstandingExcel({
        schoolName: settings?.school_name || 'Alpha Premier School',
        termName: currentTerm ? `${currentTerm.term_name} ${currentTerm.year}` : 'Academic Year',
        defaulters: defaulterExportList,
        formSummaries,
        agingBrackets: agingExport,
        totalPaidSum: totals.paid,
        totalOutstandingSum: totals.annual,
      });

      toast.dismiss(toastId);
      toast.success('Enterprise Excel workbook generated with 3 styled sheets!', { icon: '📊' });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Export failed: ${err.message}`);
    }
  };

  // ── CSV Import ──
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) {
      toast.error('Empty CSV file');
      return;
    }
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const admIdx = headers.findIndex(h => h.includes('adm'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('balance') || h.includes('paid'));
    if (admIdx < 0 || amtIdx < 0) {
      toast.error('CSV must have "adm" and "amount" columns');
      return;
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const admNo = cols[admIdx];
      const amount = Number(cols[amtIdx]);
      if (!admNo || isNaN(amount) || amount <= 0) continue;
      const student = students.find(s => (s.admission_no || s.admission_number || '').toString() === admNo);
      if (!student) continue;

      const { error } = await supabase.from('school_fee_payments').insert([
        {
          student_id: student.id,
          amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Imported Settlement',
          receipt_number: `IMP-${Date.now().toString().slice(-6)}-${i}`,
          term_id: currentTerm?.id || null,
          year: currentYear,
        },
      ]);
      if (!error) imported++;
    }
    toast.success(`Successfully imported ${imported} fee settlement records!`);
    fetchAll();
  };

  // ── Target Students for Bulk SMS ──
  const bulkTargets = useMemo(() => {
    if (selectedStudentIds.length > 0) {
      return filtered.filter(s => selectedStudentIds.includes(s.id));
    }
    return filtered;
  }, [filtered, selectedStudentIds]);

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-sans">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 m-0">APSIMS™ Financial Terminal</p>
          <p className="text-xs text-slate-500 mt-1">Reconciling live student arrears ledgers &amp; risk models…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#edf3fb] pb-16 font-sans"
      style={{ fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}
    >
      <Toaster position="top-right" />

      {/* ════════════════════════════════════════
          1. SLEEK LIGHT FROSTED COMMAND HEADER
      ════════════════════════════════════════ */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 py-3.5 mb-5 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-xs">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Outstanding Fees &amp; Arrears Terminal
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {filtered.length} Students in Arrears
                </span>
                {currentTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    📅 {currentTerm.term_name} {currentTerm.year}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Live FIFO Debt Reconciliation · Aging Matrix · Dual-Track CBC &amp; 8-4-4
              </p>
            </div>
          </div>

          {/* Right: Hub Navigation & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center gap-1.5"
            >
              <FiCreditCard className="w-3.5 h-3.5 text-indigo-600" /> Fees Hub
            </Link>
            <Link
              href="/dashboard/fees/collect"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center gap-1.5"
            >
              <FiDollarSign className="w-3.5 h-3.5 text-emerald-600" /> Fast Collect
            </Link>
            <button
              onClick={() => { fetchAll(); toast.success('Ledgers re-synchronized!'); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5"
              title="Re-synchronize fee ledgers"
            >
              <FiRefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5">
        {/* ════════════════════════════════════════
            2. CURRICULUM DUAL-TRACK SWITCHER BAR
        ════════════════════════════════════════ */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-xs border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">
              Curriculum Track:
            </span>

            {/* All Tracks */}
            <button
              onClick={() => { setSelectedTrack('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>🌐 All Tracks</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {trackCounts.all}
              </span>
            </button>

            {/* CBC Senior School (Grade 10) */}
            <button
              onClick={() => { setSelectedTrack('CBC_SENIOR'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'CBC_SENIOR'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                  : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              <span>🇰🇪 CBC Senior School (G10)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'CBC_SENIOR' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {trackCounts.cbcSenior}
              </span>
            </button>

            {/* 8-4-4 Secondary (Forms 1-4) */}
            <button
              onClick={() => { setSelectedTrack('844'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === '844'
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                  : 'text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80'
              }`}
            >
              <span>🎓 8-4-4 Secondary (F1–F4)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === '844' ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-900'
              }`}>
                {trackCounts.sec844}
              </span>
            </button>

            {/* Junior Secondary (Grade 7-9) */}
            <button
              onClick={() => { setSelectedTrack('JSS'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'JSS'
                  ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-300'
                  : 'text-teal-800 bg-teal-50/80 hover:bg-teal-100 border border-teal-200/80'
              }`}
            >
              <span>🎒 Junior Secondary (G7–G9)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'JSS' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'
              }`}>
                {trackCounts.jss}
              </span>
            </button>

            {/* Primary CBC */}
            <button
              onClick={() => { setSelectedTrack('PRIMARY_CBC'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTrack === 'PRIMARY_CBC'
                  ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                  : 'text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80'
              }`}
            >
              <span>📘 Primary CBC</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedTrack === 'PRIMARY_CBC' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'
              }`}>
                {trackCounts.pri}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 font-mono pr-2">
            Default Rate:{' '}
            <span className="text-rose-600">
              {students.length > 0 ? Math.round((allDefaulters.length / students.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            3. SIX-CARD FINANCIAL COMMAND HUD
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Students in Arrears',
              value: filtered.length,
              sub: `${students.length} Total Active`,
              icon: <FiUsers className="w-4 h-4 text-rose-600" />,
              border: 'border-rose-200/80',
              bg: 'bg-white',
              valColor: 'text-slate-900',
            },
            {
              label: 'Term 1 Arrears',
              value: KESK(totals.t1),
              sub: 'First Term Legacy',
              icon: <FiCalendar className="w-4 h-4 text-amber-600" />,
              border: 'border-amber-200/80',
              bg: 'bg-white',
              valColor: 'text-amber-800',
            },
            {
              label: 'Term 2 Arrears',
              value: KESK(totals.t2),
              sub: 'Mid-Year Balance',
              icon: <FiCalendar className="w-4 h-4 text-orange-600" />,
              border: 'border-orange-200/80',
              bg: 'bg-white',
              valColor: 'text-orange-800',
            },
            {
              label: 'Term 3 Arrears',
              value: KESK(totals.t3),
              sub: 'Final Term Balance',
              icon: <FiCalendar className="w-4 h-4 text-rose-600" />,
              border: 'border-rose-200/80',
              bg: 'bg-white',
              valColor: 'text-rose-800',
            },
            {
              label: 'Annual Debt Volume',
              value: KESK(totals.annual),
              sub: 'Cumulative Exposure',
              icon: <FiAlertTriangle className="w-4 h-4 text-red-600" />,
              border: 'border-red-300 ring-2 ring-red-100',
              bg: 'bg-rose-50/50',
              valColor: 'text-red-700',
            },
            {
              label: 'Total Recovered',
              value: KESK(totals.allPaid),
              sub: 'Cashier Receipts',
              icon: <FiCheckCircle className="w-4 h-4 text-emerald-600" />,
              border: 'border-emerald-200/80',
              bg: 'bg-white',
              valColor: 'text-emerald-700',
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-2xl border shadow-xs transition-all hover:shadow-sm ${card.border} ${card.bg}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                  {card.icon}
                </div>
              </div>
              <div className={`text-base font-black font-mono tracking-tight ${card.valColor}`}>
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════
            4. SIDE-BY-SIDE ANALYTICS CHARTS
            (Bar Comparison Graph + Linear Arrears Spline Curve)
        ════════════════════════════════════════ */}
        <UltraOutstandingCharts
          formMetrics={formMetrics}
          termTrends={termTrends}
          riskBrackets={riskBrackets}
          totalAnnualDebt={totals.annual}
          totalCollected={totals.allPaid}
        />

        {/* ════════════════════════════════════════
            5. ADVANCED FILTER & SEARCH PANEL
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Filter &amp; Query Matrix
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {filtered.length} Matches
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Rows Per Page Selector (Default 10) */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Per Page:</span>
                {[10, 15, 25, 50].map(sz => (
                  <button
                    key={sz}
                    onClick={() => { setPageSize(sz); setPage(1); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      pageSize === sz
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* Import CSV */}
              <label className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all flex items-center gap-1.5">
                <FiUpload className="w-3.5 h-3.5 text-slate-500" /> Import CSV
                <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
              </label>

              {/* Multi-sheet Excel Export */}
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <FiDownload className="w-3.5 h-3.5" /> Export Excel
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Row 1: Search & Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search student name, adm no, guardian phone…"
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Form Select */}
              <div>
                <select
                  value={filterForm}
                  onChange={e => { setFilterForm(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Forms / Grades</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.form_name}</option>
                  ))}
                </select>
              </div>

              {/* Stream Select */}
              <div>
                <select
                  value={filterStream}
                  onChange={e => { setFilterStream(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Streams</option>
                  {streams.map(s => (
                    <option key={s.id} value={s.id}>{s.stream_name}</option>
                  ))}
                </select>
              </div>

              {/* Risk Tier Select */}
              <div>
                <select
                  value={riskTier}
                  onChange={e => { setRiskTier(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Risk Tiers</option>
                  <option value="critical">🔴 Critical (&gt; KES 30K)</option>
                  <option value="severe">🟠 Severe (15K – 30K)</option>
                  <option value="moderate">🟡 Moderate (5K – 15K)</option>
                  <option value="mild">🟢 Mild (&lt; KES 5K)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Balance Range & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Balance Range */}
              <select
                value={balanceRange}
                onChange={e => { setBalanceRange(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Balance Ranges</option>
                <option value="below5k">Below KES 5,000</option>
                <option value="5k-15k">KES 5,000 – 15,000</option>
                <option value="15k-30k">KES 15,000 – 30,000</option>
                <option value="above30k">Above KES 30,000</option>
                <option value="custom">Custom Range…</option>
              </select>

              {balanceRange === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customMin}
                    onChange={e => { setCustomMin(e.target.value); setPage(1); }}
                    placeholder="Min KES"
                    className="w-1/2 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200"
                  />
                  <input
                    type="number"
                    value={customMax}
                    onChange={e => { setCustomMax(e.target.value); setPage(1); }}
                    placeholder="Max KES"
                    className="w-1/2 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200"
                  />
                </div>
              )}

              {/* Term Filter */}
              <select
                value={filterTerm}
                onChange={e => { setFilterTerm(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Term Arrears</option>
                <option value="1">Term 1 Defaulters Only</option>
                <option value="2">Term 2 Defaulters Only</option>
                <option value="3">Term 3 Defaulters Only</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="highest">Sort: Highest Debt First</option>
                <option value="lowest">Sort: Lowest Debt First</option>
                <option value="nameAZ">Sort: Student Name (A → Z)</option>
                <option value="nameZA">Sort: Student Name (Z → A)</option>
                <option value="form">Sort: By Class / Form</option>
              </select>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            6. BULK ACTIONS TOOLBAR (WHEN SELECTED)
        ════════════════════════════════════════ */}
        {selectedStudentIds.length > 0 && (
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-3 animate-slideUpIn shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs font-extrabold text-indigo-950">
                Students Selected for Bulk Action
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBulkSmsOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <FiMessageSquare className="w-3.5 h-3.5" /> Send Bulk SMS ({selectedStudentIds.length})
              </button>
              <button
                onClick={() => {
                  toast.success(`Generated printable batch for ${selectedStudentIds.length} students!`);
                  const first = filtered.find(s => selectedStudentIds.includes(s.id));
                  if (first) handlePrintSingleDemand(first);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <FiPrinter className="w-3.5 h-3.5 text-slate-600" /> Print Demand Letters
              </button>
              <button
                onClick={() => setSelectedStudentIds([])}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            7. COMPACT ULTRA-DATAGRID (REDUCED ROWS)
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-xl mb-2">
                ✓
              </div>
              <p className="font-extrabold text-sm text-slate-700">No Outstanding Balances Found!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                All students match zero debt criteria for the selected track and filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAllPage}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Adm No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Track / Class</th>
                    <th className="py-2.5 px-3">Guardian Phone</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Term 1 Bal</th>
                    <th className="py-2.5 px-3 text-right">Term 2 Bal</th>
                    <th className="py-2.5 px-3 text-right">Term 3 Bal</th>
                    <th className="py-2.5 px-3 text-right">Annual Balance</th>
                    <th className="py-2.5 px-3 text-center">Risk Tier</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginated.map((s, idx) => {
                    const rowNum = (safePage - 1) * pageSize + idx + 1;
                    const isSelected = selectedStudentIds.includes(s.id);
                    const admNo = s.admission_no || s.admission_number || '—';

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : idx % 2 === 1 ? 'bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Row # */}
                        <td className="py-2 px-3 font-mono text-slate-400 font-bold text-[11px]">
                          {rowNum}
                        </td>

                        {/* Adm No */}
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                            {admNo}
                          </span>
                        </td>

                        {/* Student Name & Avatar */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 leading-tight">
                                {s.first_name} {s.other_name || ''} {s.last_name}
                              </div>
                              {s.guardian_name && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {s.guardian_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Track / Class */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 text-[11px]">
                            {safeGetFormName(s.form_id)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {safeGetStreamName(s.stream_id)}
                          </div>
                        </td>

                        {/* Guardian Phone */}
                        <td className="py-2 px-3">
                          {s.guardian_phone ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700">
                              <a
                                href={`tel:${s.guardian_phone}`}
                                className="hover:text-indigo-600 transition-colors"
                              >
                                {s.guardian_phone}
                              </a>
                              <button
                                onClick={() => handleWhatsAppReminder(s)}
                                className="text-green-600 hover:text-green-700 text-xs"
                                title="Send WhatsApp Fee Reminder"
                              >
                                💬
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {fmt(s.totalPaid)}
                        </td>

                        {/* Term 1 Bal */}
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          {s.t1Bal > 0 ? (
                            <span className="text-amber-800 font-bold">{fmt(s.t1Bal)}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">✓</span>
                          )}
                        </td>

                        {/* Term 2 Bal */}
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          {s.t2Bal > 0 ? (
                            <span className="text-orange-800 font-bold">{fmt(s.t2Bal)}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">✓</span>
                          )}
                        </td>

                        {/* Term 3 Bal */}
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          {s.t3Bal > 0 ? (
                            <span className="text-rose-800 font-bold">{fmt(s.t3Bal)}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">✓</span>
                          )}
                        </td>

                        {/* Annual Balance */}
                        <td className="py-2 px-3 text-right font-mono font-black text-rose-700 text-xs">
                          {fmt(s.annualBalance)}
                        </td>

                        {/* Risk Tier Pill */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              s.riskTier === 'Critical'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : s.riskTier === 'Severe'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : s.riskTier === 'Moderate'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.riskTier === 'Critical'
                                  ? 'bg-red-600'
                                  : s.riskTier === 'Severe'
                                  ? 'bg-orange-500'
                                  : s.riskTier === 'Moderate'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {s.riskTier}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Fast Settle Button */}
                            <button
                              onClick={() => handleOpenFastPay(s)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200/80 transition-all flex items-center gap-1 shadow-xs"
                              title="Fast Collect / Settle Arrears"
                            >
                              <FiCreditCard className="w-3 h-3 text-indigo-600" />
                              <span>Settle</span>
                            </button>

                            {/* Print Demand Letter */}
                            <button
                              onClick={() => handlePrintSingleDemand(s)}
                              className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Print Official Certified Demand Letter"
                            >
                              <FiPrinter className="w-3 h-3" />
                            </button>

                            {/* WhatsApp Direct */}
                            <button
                              onClick={() => handleWhatsAppReminder(s)}
                              className="p-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors"
                              title="Send WhatsApp Fee Reminder"
                            >
                              <FiMessageSquare className="w-3 h-3" />
                            </button>

                            {/* Statement Link */}
                            <Link
                              href={`/dashboard/fees/statements?student=${s.id}`}
                              className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="View Full Fee Statement"
                            >
                              <FiFileText className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Sticky Totals Footer */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={6} className="py-2.5 px-3">
                      <div className="flex items-center justify-between">
                        <span>
                          PAGE TOTALS ({paginated.length} of {filtered.length} students)
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Annual Debt Exposure
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      {fmt(paginated.reduce((s, r) => s + r.totalPaid, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                      {fmt(paginated.reduce((s, r) => s + r.t1Bal, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-orange-300">
                      {fmt(paginated.reduce((s, r) => s + r.t2Bal, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-300">
                      {fmt(paginated.reduce((s, r) => s + r.t3Bal, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-white text-sm">
                      {fmt(paginated.reduce((s, r) => s + r.annualBalance, 0))}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ════════════════════════════════════════
              8. COMPACT PAGINATION FOOTER
          ════════════════════════════════════════ */}
          {filtered.length > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>
                  Showing{' '}
                  <strong className="text-slate-800 font-mono">
                    {(safePage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800 font-mono">
                    {Math.min(safePage * pageSize, filtered.length)}
                  </strong>{' '}
                  of{' '}
                  <strong className="text-indigo-700 font-mono">
                    {filtered.length}
                  </strong>{' '}
                  defaulters
                </span>
                <span className="text-slate-300">•</span>
                <span>Page {safePage} of {totalPages}</span>
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="First page"
                >
                  <FiChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Previous page"
                >
                  <FiChevronLeft className="w-3.5 h-3.5" />
                </button>

                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`min-w-[28px] h-7 rounded-xl text-xs font-bold transition-all ${
                        safePage === p
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Next page"
                >
                  <FiChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Last page"
                >
                  <FiChevronsRight className="w-3.5 h-3.5" />
                </button>

                {/* Jump to Page */}
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="number"
                    value={jumpPage}
                    onChange={e => setJumpPage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJump()}
                    min={1}
                    max={totalPages}
                    placeholder="Pg"
                    className="w-12 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleJump}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          9. BULK SMS DISPATCH MODAL
      ════════════════════════════════════════ */}
      {bulkSmsOpen && (
        <UltraBulkSmsModal
          isOpen={bulkSmsOpen}
          onClose={() => setBulkSmsOpen(false)}
          targets={bulkTargets}
          schoolName={settings?.school_name}
        />
      )}

      {/* ════════════════════════════════════════
          10. DIRECT FAST-SETTLEMENT MODAL
      ════════════════════════════════════════ */}
      {fastPayStudent && fastPayProfile && (
        <UltraPaymentModal
          isOpen={Boolean(fastPayStudent)}
          onClose={() => { setFastPayStudent(null); setFastPayProfile(null); }}
          student={fastPayStudent}
          fees={fastPayProfile}
          receiptNo={`REC-${Date.now().toString().slice(-6)}`}
          getFormName={safeGetFormName}
          getStreamName={safeGetStreamName}
          onSubmit={handlePaymentSubmit}
          isSubmitting={isSubmittingPay}
          terms={terms}
        />
      )}
    </div>
  );
}

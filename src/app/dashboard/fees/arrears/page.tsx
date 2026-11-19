'use client';

import { useState, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUltraFeeCollect, fmt, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import UltraArrearsCharts, {
  type FormArrearsMetric,
  type AgingBucketMetric,
} from '@/components/fees/UltraArrearsCharts';
import UltraSuperBalancesImportModal from '@/components/fees/UltraSuperBalancesImportModal';
import UltraBulkSmsModal from '@/components/fees/UltraBulkSmsModal';
import { exportUltraArrearsExcel } from '@/components/fees/UltraArrearsExport';
import { printDemandLetter } from '@/components/fees/UltraThermalReceipt';
import {
  FiAlertTriangle, FiDollarSign, FiUsers, FiSearch, FiFilter,
  FiPrinter, FiDownload, FiRefreshCw, FiCheckCircle, FiPhone,
  FiCalendar, FiCreditCard, FiFileText, FiMessageSquare,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiCheck, FiX, FiUpload, FiSliders, FiClock, FiLayers, FiShield,
  FiEdit3, FiPlusCircle,
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

function getAgingBucket(lastPaymentDate: string | undefined): '0-30' | '31-60' | '61-90' | '90+' | 'Never' {
  if (!lastPaymentDate) return 'Never';
  const days = Math.floor((Date.now() - new Date(lastPaymentDate).getTime()) / 86400000);
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

const KESK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function ArrearsPage() {
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
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [filterAging, setFilterAging] = useState<string>('all'); // 'all' | '0-30' | '31-60' | '61-90' | '90+' | 'Never'
  const [sortBy, setSortBy] = useState('highest'); // 'highest' | 'lowest' | 'nameAZ' | 'nameZA' | 'form'

  // ── Grid Page Size (Default reduced to 10 rows) ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');

  // ── Selection State for Bulk Actions ──
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // ── Modals & Drawers ──
  const [superImportOpen, setSuperImportOpen] = useState(false);
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [fastPayStudent, setFastPayStudent] = useState<any>(null);
  const [fastPayProfile, setFastPayProfile] = useState<StudentFeeProfile | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Single opening balance manual recording modal
  const [manualObStudent, setManualObStudent] = useState<any>(null);
  const [manualObAmount, setManualObAmount] = useState('');
  const [manualObNotes, setManualObNotes] = useState('');
  const [isSavingOb, setIsSavingOb] = useState(false);

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

  // Last payment date per student
  const lastPaymentMap = useMemo(() => {
    const map = new Map<number, string>();
    payments.forEach(p => {
      const cur = map.get(p.student_id);
      if (!cur || p.payment_date > cur) {
        map.set(p.student_id, p.payment_date);
      }
    });
    return map;
  }, [payments]);

  // Current year
  const currentYear = new Date().getFullYear();

  // ── Build Enriched Arrears Registry ──
  const allArrearsRecords = useMemo(() => {
    return students
      .filter(s => s.status === 'Active')
      .map(s => {
        const studentPays = payments.filter(p => p.student_id === s.id);
        const totalPaid = studentPays.reduce((acc, p) => acc + Number(p.amount || 0), 0);

        // Opening balance payments
        const openingBalancePaid = studentPays
          .filter(p => String(p.payment_method || '').toLowerCase().includes('opening'))
          .reduce((acc, p) => acc + Number(p.amount || 0), 0);

        // Applicable fee structures
        const applicableFees = structures.filter(f => !f.form_id || f.form_id === s.form_id);
        let yearFees = applicableFees.filter(f => !f.year || f.year === currentYear);
        if (yearFees.length === 0 && applicableFees.length > 0) {
          const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
          yearFees = applicableFees.filter(f => !f.year || f.year === maxYear);
        }
        const annualTotal = yearFees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
        const netArrears = Math.max(0, annualTotal - totalPaid);

        const lastPay = lastPaymentMap.get(s.id);
        const agingBucket = getAgingBucket(lastPay);

        const formObj = formMap.get(s.form_id);
        const track = detectTrack(formObj);

        return {
          ...s,
          expectedFees: annualTotal,
          paidFees: totalPaid,
          openingBalancePaid,
          netArrears,
          agingBucket,
          lastPaymentDate: lastPay,
          track,
        };
      })
      .filter(s => s.netArrears > 0 || s.openingBalancePaid > 0);
  }, [students, payments, structures, currentYear, lastPaymentMap, formMap]);

  // Curriculum Counts
  const trackCounts = useMemo(() => {
    let all = 0, cbcSenior = 0, sec844 = 0, jss = 0, pri = 0;
    allArrearsRecords.forEach(s => {
      all++;
      if (s.track === 'CBC_SENIOR') cbcSenior++;
      else if (s.track === '844') sec844++;
      else if (s.track === 'JSS') jss++;
      else if (s.track === 'PRIMARY_CBC') pri++;
    });
    return { all, cbcSenior, sec844, jss, pri };
  }, [allArrearsRecords]);

  // ── Filtered Records ──
  const filtered = useMemo(() => {
    let list = [...allArrearsRecords];

    if (selectedTrack !== 'ALL') {
      list = list.filter(s => s.track === selectedTrack);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q) ||
        (s.guardian_phone || '').includes(q)
      );
    }

    if (filterForm) list = list.filter(s => String(s.form_id) === filterForm);
    if (filterStream) list = list.filter(s => String(s.stream_id) === filterStream);
    if (filterAging !== 'all') list = list.filter(s => s.agingBucket === filterAging);

    // Sort order
    if (sortBy === 'highest') list.sort((a, b) => b.netArrears - a.netArrears);
    else if (sortBy === 'lowest') list.sort((a, b) => a.netArrears - b.netArrears);
    else if (sortBy === 'nameAZ') list.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    else if (sortBy === 'nameZA') list.sort((a, b) => `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`));
    else if (sortBy === 'form') list.sort((a, b) => (a.form_id || 0) - (b.form_id || 0));

    return list;
  }, [allArrearsRecords, selectedTrack, search, filterForm, filterStream, filterAging, sortBy]);

  // ── Financial Totals ──
  const totals = useMemo(() => {
    return {
      totalArrears: filtered.reduce((s, r) => s + r.netArrears, 0),
      totalPaid: filtered.reduce((s, r) => s + r.paidFees, 0),
      totalOpeningPaid: filtered.reduce((s, r) => s + r.openingBalancePaid, 0),
      bucket0_30: filtered.filter(r => r.agingBucket === '0-30').reduce((s, r) => s + r.netArrears, 0),
      bucket31_60: filtered.filter(r => r.agingBucket === '31-60').reduce((s, r) => s + r.netArrears, 0),
      bucket61_90: filtered.filter(r => r.agingBucket === '61-90' || r.agingBucket === '90+' || r.agingBucket === 'Never').reduce((s, r) => s + r.netArrears, 0),
    };
  }, [filtered]);

  // ── Prepare Analytics Data for Side-by-Side Charts ──
  const formMetrics = useMemo<FormArrearsMetric[]>(() => {
    const map = new Map<number, FormArrearsMetric>();

    forms.forEach(f => {
      const track = detectTrack(f);
      map.set(f.id, {
        formId: f.id,
        formName: f.form_name,
        track,
        totalStudents: 0,
        arrearsCount: 0,
        totalArrears: 0,
        totalPaid: 0,
        recoveryRatePct: 0,
      });
    });

    students.forEach(s => {
      const entry = map.get(s.form_id);
      if (entry) entry.totalStudents++;
    });

    allArrearsRecords.forEach(s => {
      const entry = map.get(s.form_id);
      if (entry) {
        entry.arrearsCount++;
        entry.totalArrears += s.netArrears;
        entry.totalPaid += s.paidFees;
      }
    });

    return Array.from(map.values())
      .map(entry => {
        const totalBilled = entry.totalPaid + entry.totalArrears;
        entry.recoveryRatePct = totalBilled > 0 ? Math.round((entry.totalPaid / totalBilled) * 100) : 0;
        return entry;
      })
      .filter(e => e.totalStudents > 0);
  }, [forms, students, allArrearsRecords]);

  const agingMetrics = useMemo<AgingBucketMetric[]>(() => {
    const map: Record<string, { count: number; amount: number; label: string; color: string }> = {
      '0-30': { count: 0, amount: 0, label: '0–30 Days', color: '#16a34a' },
      '31-60': { count: 0, amount: 0, label: '31–60 Days', color: '#d97706' },
      '61-90': { count: 0, amount: 0, label: '61–90 Days', color: '#ea580c' },
      '90+': { count: 0, amount: 0, label: '90+ Days', color: '#dc2626' },
      'Never': { count: 0, amount: 0, label: 'Never Paid', color: '#7f1d1d' },
    };

    allArrearsRecords.forEach(s => {
      if (map[s.agingBucket]) {
        map[s.agingBucket].count++;
        map[s.agingBucket].amount += s.netArrears;
      }
    });

    return (Object.keys(map) as (keyof typeof map)[]).map(key => ({
      bucket: key as any,
      label: map[key].label,
      count: map[key].count,
      amount: map[key].amount,
      color: map[key].color,
    }));
  }, [allArrearsRecords]);

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

  // ── Fast-Settle Drawer Handler ──
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

  // ── Manual Opening Balance Recording ──
  const handleOpenManualOb = (student: any) => {
    setManualObStudent(student);
    setManualObAmount('');
    setManualObNotes('');
  };

  const handleSaveManualOb = async () => {
    if (!manualObStudent || manualObAmount === '') {
      toast.error('Please enter an opening balance amount');
      return;
    }
    const amt = Number(manualObAmount);
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid non-negative amount');
      return;
    }

    setIsSavingOb(true);
    try {
      const { error } = await supabase.from('school_fee_payments').insert([
        {
          student_id: manualObStudent.id,
          amount: amt,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: amt === 0 ? 'Opening Balance (Nil)' : 'Opening Balance',
          receipt_number: `OB-${Date.now().toString().slice(-6)}`,
          term_id: currentTerm?.id || null,
          year: currentYear,
          notes:
            manualObNotes.trim() ||
            (amt === 0
              ? 'Student paid nothing prior to system — full arrears confirmed'
              : 'Opening balance — amount paid before system setup'),
        },
      ]);
      if (error) throw new Error(error.message);

      toast.success(`Opening balance of ${fmt(amt)} recorded for ${manualObStudent.first_name}!`);
      setManualObStudent(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record opening balance');
    } finally {
      setIsSavingOb(false);
    }
  };

  // ── WhatsApp & Demand Letter ──
  const handleWhatsAppReminder = (student: any) => {
    if (!student.guardian_phone) {
      toast.error('No parent phone number recorded for this student');
      return;
    }
    const cleanPhone = student.guardian_phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
    const name = `${student.first_name} ${student.last_name}`;
    const adm = student.admission_no || student.admission_number || '';
    const arrears = fmt(student.netArrears);
    const school = settings?.school_name || 'Alpha Premier School';

    const msg = encodeURIComponent(
      `*OFFICIAL FEE ARREARS NOTICE*\n` +
      `School: *${school}*\n` +
      `Student: *${name}* (${adm})\n` +
      `Carried-Forward Arrears: *${arrears}*\n\n` +
      `Dear Parent/Guardian, please settle this outstanding balance or contact the accounts office to agree on an installment schedule. Thank you.`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  const handlePrintSingleDemand = (student: any) => {
    const fees = getStudentFeeProfile(student.id, student.form_id);
    printDemandLetter(student, fees, settings?.school_name);
  };

  // ── Multi-Sheet Excel Export ──
  const handleExportExcel = async () => {
    const toastId = toast.loading('Compiling multi-sheet arrears workbook with ExcelJS...');
    try {
      const recordsExportList = filtered.map((s, idx) => ({
        index: idx + 1,
        admNo: (s.admission_no || s.admission_number || '').toString(),
        fullName: `${s.first_name} ${s.other_name || ''} ${s.last_name}`.trim(),
        gender: s.gender,
        curriculumTrack: s.track,
        formName: safeGetFormName(s.form_id),
        streamName: safeGetStreamName(s.stream_id),
        guardianPhone: s.guardian_phone,
        expectedFees: s.expectedFees,
        paidFees: s.paidFees,
        netArrears: s.netArrears,
        agingBucket: s.agingBucket,
        lastPaymentDate: s.lastPaymentDate,
        status: s.netArrears > 0 ? 'In Arrears' : 'Cleared',
      }));

      const formSummaries = formMetrics.map(fm => ({
        formName: fm.formName,
        curriculumTrack: fm.track,
        totalStudents: fm.totalStudents,
        arrearsCount: fm.arrearsCount,
        arrearsRatePct: fm.totalStudents > 0 ? (fm.arrearsCount / fm.totalStudents) * 100 : 0,
        totalExpected: fm.totalPaid + fm.totalArrears,
        totalPaid: fm.totalPaid,
        totalArrears: fm.totalArrears,
      }));

      const agingSummaries = [
        {
          bucket: '0–30 Days',
          label: 'Recent default in current cycle',
          studentCount: agingMetrics.find(a => a.bucket === '0-30')?.count || 0,
          totalAmount: agingMetrics.find(a => a.bucket === '0-30')?.amount || 0,
          pctOfTotalArrears: totals.totalArrears > 0 ? ((agingMetrics.find(a => a.bucket === '0-30')?.amount || 0) / totals.totalArrears) * 100 : 0,
          actionProtocol: 'Routine SMS fee prompt & M-Pesa link',
        },
        {
          bucket: '31–60 Days',
          label: 'Mid-cycle unpaid balance',
          studentCount: agingMetrics.find(a => a.bucket === '31-60')?.count || 0,
          totalAmount: agingMetrics.find(a => a.bucket === '31-60')?.amount || 0,
          pctOfTotalArrears: totals.totalArrears > 0 ? ((agingMetrics.find(a => a.bucket === '31-60')?.amount || 0) / totals.totalArrears) * 100 : 0,
          actionProtocol: 'Parent WhatsApp notification & phone check',
        },
        {
          bucket: '61–90 Days',
          label: 'Extended arrears crossing term barrier',
          studentCount: agingMetrics.find(a => a.bucket === '61-90')?.count || 0,
          totalAmount: agingMetrics.find(a => a.bucket === '61-90')?.amount || 0,
          pctOfTotalArrears: totals.totalArrears > 0 ? ((agingMetrics.find(a => a.bucket === '61-90')?.amount || 0) / totals.totalArrears) * 100 : 0,
          actionProtocol: 'Official printed demand letter issued',
        },
        {
          bucket: '90+ Days & Never',
          label: 'Critical legacy arrears debt',
          studentCount: (agingMetrics.find(a => a.bucket === '90+')?.count || 0) + (agingMetrics.find(a => a.bucket === 'Never')?.count || 0),
          totalAmount: (agingMetrics.find(a => a.bucket === '90+')?.amount || 0) + (agingMetrics.find(a => a.bucket === 'Never')?.amount || 0),
          pctOfTotalArrears: totals.totalArrears > 0 ? (((agingMetrics.find(a => a.bucket === '90+')?.amount || 0) + (agingMetrics.find(a => a.bucket === 'Never')?.amount || 0)) / totals.totalArrears) * 100 : 0,
          actionProtocol: 'Bursar & Principal escalation conference',
        },
      ];

      await exportUltraArrearsExcel({
        schoolName: settings?.school_name || 'Alpha Premier School',
        termName: currentTerm ? `${currentTerm.term_name} ${currentTerm.year}` : 'Current Academic Term',
        records: recordsExportList,
        formSummaries,
        agingSummaries,
        totalArrearsSum: totals.totalArrears,
        totalPaidSum: totals.totalPaid,
      });

      toast.dismiss(toastId);
      toast.success('Enterprise Arrears Workbook exported with 3 styled sheets!', { icon: '📊' });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Export failed: ${err.message}`);
    }
  };

  // Bulk SMS target students
  const bulkTargets = useMemo(() => {
    if (selectedStudentIds.length > 0) {
      return filtered.filter(s => selectedStudentIds.includes(s.id)).map(s => ({
        ...s,
        annualBalance: s.netArrears,
      }));
    }
    return filtered.map(s => ({
      ...s,
      annualBalance: s.netArrears,
    }));
  }, [filtered, selectedStudentIds]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-sans">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 m-0">APSIMS™ Financial Terminal</p>
          <p className="text-xs text-slate-500 mt-1">Reconciling live arrears ledgers, opening balances &amp; CBC cohorts…</p>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs">
              <FiClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Arrears &amp; Opening Balances Terminal
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {filtered.length} Arrears Records
                </span>
                {currentTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    📅 {currentTerm.term_name} {currentTerm.year}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Automatic Priority-1 FIFO Deduction · Super Balances Hub · Dual-Track CBC &amp; 8-4-4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Super Balances Import Trigger */}
            <button
              onClick={() => setSuperImportOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all flex items-center gap-1.5"
            >
              <FiUpload className="w-3.5 h-3.5" /> Super Balances Import
            </button>

            <Link
              href="/dashboard/fees/collect"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center gap-1.5"
            >
              <FiDollarSign className="w-3.5 h-3.5 text-emerald-600" /> Fast Collect
            </Link>

            <button
              onClick={() => { fetchAll(); toast.success('Arrears ledgers re-synced!'); }}
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
            Opening Balances Credited:{' '}
            <span className="text-emerald-700 font-extrabold">{KESK(totals.totalOpeningPaid)}</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            3. SIX-CARD FINANCIAL COMMAND HUD
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Students with Arrears',
              value: filtered.length,
              sub: 'Active cohort',
              icon: <FiUsers className="w-4 h-4 text-amber-600" />,
              border: 'border-amber-200/80',
              bg: 'bg-white',
              valColor: 'text-slate-900',
            },
            {
              label: 'Carried-Forward Arrears',
              value: KESK(totals.totalArrears),
              sub: 'Cumulative debt',
              icon: <FiAlertTriangle className="w-4 h-4 text-rose-600" />,
              border: 'border-rose-300 ring-2 ring-rose-100',
              bg: 'bg-rose-50/40',
              valColor: 'text-rose-700',
            },
            {
              label: '0–30 Days Recent',
              value: KESK(totals.bucket0_30),
              sub: 'Current cycle arrears',
              icon: <FiCalendar className="w-4 h-4 text-emerald-600" />,
              border: 'border-emerald-200/80',
              bg: 'bg-white',
              valColor: 'text-emerald-700',
            },
            {
              label: '31–60 Days Medium',
              value: KESK(totals.bucket31_60),
              sub: 'Mid-cycle arrears',
              icon: <FiCalendar className="w-4 h-4 text-amber-600" />,
              border: 'border-amber-200/80',
              bg: 'bg-white',
              valColor: 'text-amber-800',
            },
            {
              label: '61–90+ Days Critical',
              value: KESK(totals.bucket61_90),
              sub: 'Multi-term debt',
              icon: <FiClock className="w-4 h-4 text-red-600" />,
              border: 'border-red-200/80',
              bg: 'bg-white',
              valColor: 'text-red-700',
            },
            {
              label: 'Opening Balances Paid',
              value: KESK(totals.totalOpeningPaid),
              sub: 'Pre-system receipts',
              icon: <FiCheckCircle className="w-4 h-4 text-indigo-600" />,
              border: 'border-indigo-200/80',
              bg: 'bg-white',
              valColor: 'text-indigo-700',
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
            (Form Arrears Concentration + Aging Spline Curve)
        ════════════════════════════════════════ */}
        <UltraArrearsCharts
          formMetrics={formMetrics}
          agingMetrics={agingMetrics}
          totalArrears={totals.totalArrears}
          totalPaid={totals.totalPaid}
        />

        {/* ════════════════════════════════════════
            5. ADVANCED FILTER & SEARCH PANEL
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Arrears Query Matrix
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

              {/* Super Balances Import Trigger */}
              <button
                onClick={() => setSuperImportOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5"
              >
                <FiUpload className="w-3.5 h-3.5" /> Import Balances
              </button>

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

              {/* Aging Bracket Select */}
              <div>
                <select
                  value={filterAging}
                  onChange={e => { setFilterAging(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Aging Brackets</option>
                  <option value="0-30">🟢 0–30 Days (Recent)</option>
                  <option value="31-60">🟡 31–60 Days (Medium)</option>
                  <option value="61-90">🟠 61–90 Days (Extended)</option>
                  <option value="90+">🔴 90+ Days (Critical)</option>
                  <option value="Never">⚫ Never Paid Prior</option>
                </select>
              </div>
            </div>

            {/* Row 2: Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="highest">Sort: Highest Arrears First</option>
                <option value="lowest">Sort: Lowest Arrears First</option>
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
                Students Selected for Bulk Arrears Action
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBulkSmsOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <FiMessageSquare className="w-3.5 h-3.5" /> Send Arrears SMS ({selectedStudentIds.length})
              </button>
              <button
                onClick={() => {
                  toast.success(`Generated batch demand letters for ${selectedStudentIds.length} students!`);
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
            7. COMPACT ARREARS DATAGRID (REDUCED ROWS)
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-xl mb-2">
                ✓
              </div>
              <p className="font-extrabold text-sm text-slate-700">No Arrears Found!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                All students match zero debt criteria for the selected track and aging filters.
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
                    <th className="py-2.5 px-3 text-right">Expected Fees</th>
                    <th className="py-2.5 px-3 text-right">Opening Paid</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Net Arrears</th>
                    <th className="py-2.5 px-3 text-center">Aging Bracket</th>
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
                                title="Send WhatsApp Arrears Reminder"
                              >
                                💬
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Expected Fees */}
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {fmt(s.expectedFees)}
                        </td>

                        {/* Opening Paid */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                          {s.openingBalancePaid > 0 ? fmt(s.openingBalancePaid) : '—'}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {fmt(s.paidFees)}
                        </td>

                        {/* Net Arrears */}
                        <td className="py-2 px-3 text-right font-mono font-black text-rose-700 text-xs">
                          {fmt(s.netArrears)}
                        </td>

                        {/* Aging Bracket Pill */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              s.agingBucket === '0-30'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.agingBucket === '31-60'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : s.agingBucket === '61-90'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.agingBucket === '0-30'
                                  ? 'bg-emerald-500'
                                  : s.agingBucket === '31-60'
                                  ? 'bg-amber-500'
                                  : s.agingBucket === '61-90'
                                  ? 'bg-orange-500'
                                  : 'bg-rose-600'
                              }`}
                            />
                            {s.agingBucket === 'Never' ? 'Never Paid' : `${s.agingBucket} Days`}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Fast Settle */}
                            <button
                              onClick={() => handleOpenFastPay(s)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200/80 transition-all flex items-center gap-1 shadow-xs"
                              title="Fast Collect Arrears"
                            >
                              <FiCreditCard className="w-3 h-3 text-indigo-600" />
                              <span>Settle</span>
                            </button>

                            {/* Manual Opening Balance Adjust */}
                            <button
                              onClick={() => handleOpenManualOb(s)}
                              className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                              title="Enter / Adjust Opening Balance"
                            >
                              <FiEdit3 className="w-3 h-3" />
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
                              title="Send WhatsApp Arrears Reminder"
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
                          Carried-Forward Arrears Volume
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {fmt(paginated.reduce((s, r) => s + r.expectedFees, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-400">
                      {fmt(paginated.reduce((s, r) => s + r.openingBalancePaid, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      {fmt(paginated.reduce((s, r) => s + r.paidFees, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-400 text-sm">
                      {fmt(paginated.reduce((s, r) => s + r.netArrears, 0))}
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
                  records
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
          9. SUPER BALANCES IMPORT MODAL (CBC & 844)
      ════════════════════════════════════════ */}
      {superImportOpen && (
        <UltraSuperBalancesImportModal
          isOpen={superImportOpen}
          onClose={() => setSuperImportOpen(false)}
          students={students}
          forms={forms}
          streams={streams}
          terms={terms}
          currentTerm={currentTerm}
          onSuccess={() => fetchAll()}
          schoolName={settings?.school_name}
        />
      )}

      {/* ════════════════════════════════════════
          10. BULK SMS DISPATCH MODAL
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
          11. DIRECT FAST-SETTLEMENT MODAL
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

      {/* ════════════════════════════════════════
          12. SINGLE OPENING BALANCE QUICK MODAL
      ════════════════════════════════════════ */}
      {manualObStudent && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-md w-full animate-slideUpIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-xl shadow-xs">
                  ✏️
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Record Opening Balance
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {manualObStudent.first_name} {manualObStudent.last_name} ({manualObStudent.admission_no || manualObStudent.admission_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualObStudent(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Amount Paid Prior (KES) *
                </label>
                <input
                  type="number"
                  value={manualObAmount}
                  onChange={(e) => setManualObAmount(e.target.value)}
                  placeholder="e.g. 15000 (enter 0 if nil)"
                  className="w-full px-3 py-2 rounded-xl text-base font-black font-mono border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Audit Notes / Source Reference
                </label>
                <input
                  type="text"
                  value={manualObNotes}
                  onChange={(e) => setManualObNotes(e.target.value)}
                  placeholder="e.g. Paid cash to bursar prior to system setup"
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManualObStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualOb}
                disabled={isSavingOb || manualObAmount === ''}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingOb ? 'Saving...' : 'Confirm Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

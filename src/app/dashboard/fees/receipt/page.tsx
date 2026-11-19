'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useUltraFeeCollect, fmt, type StudentFeeProfile } from '@/hooks/useUltraFeeCollect';
import UltraPaymentsCharts, { type MethodMetric, type DailyPoint } from '@/components/fees/UltraPaymentsCharts';
import {
  exportUltraPaymentsExcel,
  type PaymentExportItem,
  type MethodSummaryExportItem,
  type FormCollectionExportItem,
} from '@/components/fees/UltraPaymentsExport';
import {
  printThermalReceipt,
  printA4OfficialReceipt,
  printA5DualReceipt,
  printBulkThermalReceipts,
  printBulkA4Receipts,
  printPaymentsRegisterReport,
  printCashierShiftHandover,
} from '@/components/fees/UltraThermalReceipt';
import {
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiPrinter,
  FiShare2,
  FiEye,
  FiCheck,
  FiX,
  FiCalendar,
  FiUser,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiLayers,
  FiTrendingUp,
  FiCheckCircle,
  FiShield,
  FiSend,
  FiScissors,
  FiClock,
  FiPlus,
  FiCopy,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & EXECUTIVE PALETTE
   ══════════════════════════════════════════════════════════════════════════════ */
type SortKey = 'payment_date' | 'amount' | 'student' | 'receipt_number' | 'payment_method';
type SortDir = 'asc' | 'desc';
type MainTab = 'ledger' | 'studio' | 'batch' | 'handover';
type CurriculumFilter = 'ALL' | 'CBC_SENIOR' | '844_SEC' | 'JSS' | 'PRIMARY_CBC';

const T = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  borderHov: '#cbd5e1',
  text: '#0f172a',
  sub: '#64748b',
  muted: '#94a3b8',
  indigo: '#4f46e5',
  indigoL: '#eef2ff',
  indigoBd: '#c7d2fe',
  green: '#16a34a',
  greenL: '#f0fdf4',
  greenBd: '#bbf7d0',
  amber: '#d97706',
  amberL: '#fffbeb',
  amberBd: '#fde68a',
  red: '#dc2626',
  redL: '#fef2f2',
  redBd: '#fecaca',
  blue: '#2563eb',
  blueL: '#eff6ff',
  blueBd: '#bfdbfe',
  purple: '#7c3aed',
  purpleL: '#f5f3ff',
  purpleBd: '#ddd6fe',
  teal: '#0d9488',
  tealL: '#f0fdfa',
  tealBd: '#99f6e4',
};

const METHOD_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
  'M-Pesa': { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', icon: '📱' },
  'Cash': { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b', icon: '💵' },
  'Bank Transfer': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', icon: '🏦' },
  'Bank': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', icon: '🏦' },
  'Cheque': { bg: '#faf5ff', text: '#6d28d9', dot: '#8b5cf6', icon: '📄' },
  'In-Kind': { bg: '#fdf4ff', text: '#a21caf', dot: '#d946ef', icon: '🎁' },
  'Bursary': { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6', icon: '🏛️' },
  'Capitation': { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1', icon: '🎓' },
};

function getMethodMeta(m: string) {
  return METHOD_CONFIG[m] || { bg: '#f8fafc', text: '#475569', dot: '#94a3b8', icon: '💳' };
}

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateLong = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const fmtKES = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

function detectCurriculum(formName: string): { track: CurriculumFilter; label: string; badgeColor: string } {
  const fn = (formName || '').toLowerCase();
  if (fn.includes('grade 10') || fn.includes('grade 11') || fn.includes('grade 12') || fn.includes('senior')) {
    return { track: 'CBC_SENIOR', label: 'CBC Senior', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (fn.includes('form') || fn.includes('f1') || fn.includes('f2') || fn.includes('f3') || fn.includes('f4')) {
    return { track: '844_SEC', label: '8-4-4 Sec', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (fn.includes('grade 7') || fn.includes('grade 8') || fn.includes('grade 9') || fn.includes('jss')) {
    return { track: 'JSS', label: 'JSS (G7-9)', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
  if (fn.includes('pp') || fn.includes('playgroup') || fn.includes('grade 1') || fn.includes('grade 2') || fn.includes('grade 3') || fn.includes('grade 4') || fn.includes('grade 5') || fn.includes('grade 6')) {
    return { track: 'PRIMARY_CBC', label: 'Primary CBC', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { track: 'ALL', label: 'General', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' };
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function FeeReceiptsPage() {
  const {
    loading,
    forms,
    streams,
    students,
    payments,
    terms,
    currentTerm,
    currentYear,
    settings,
    getFormName,
    getStreamName,
    getStudentFeeProfile,
    fetchAll,
  } = useUltraFeeCollect();

  // ── School Identity (Direct DB Settings) ──
  const [schoolDetails, setSchoolDetails] = useState<any>(null);

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const { data } = await supabase
          .from('school_details')
          .select('*')
          .neq('section', 'primary')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data) setSchoolDetails(data);
      } catch (err) {
        console.error('Failed to load school details:', err);
      }
    }
    loadSchoolData();
  }, []);

  // ── Workspaces & Tabs ──
  const [activeTab, setActiveTab] = useState<MainTab>('ledger');

  // ── Intelligent Term Resolver (Guarantees Term is Never Blank!) ──
  const resolvePaymentTerm = useCallback(
    (p: any): { id: number; name: string } => {
      if (p.term_id) {
        const match = terms.find((t) => Number(t.id) === Number(p.term_id));
        if (match) return { id: match.id, name: match.term_name };
      }

      if (p.payment_date && terms.length > 0) {
        for (const t of terms) {
          if (t.start_date && t.end_date) {
            if (p.payment_date >= t.start_date && p.payment_date <= t.end_date) {
              return { id: t.id, name: t.term_name };
            }
          }
        }

        const sorted = [...terms].sort(
          (a, b) => new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime()
        );
        for (let i = 0; i < sorted.length; i++) {
          const cur = sorted[i];
          const next = sorted[i + 1];
          if (cur.start_date && p.payment_date >= cur.start_date && (!next?.start_date || p.payment_date < next.start_date)) {
            return { id: cur.id, name: cur.term_name };
          }
        }
      }

      if (currentTerm) return { id: currentTerm.id, name: currentTerm.term_name };
      if (terms.length > 0) return { id: terms[0].id, name: terms[0].term_name };
      return { id: 1, name: 'Term 1' };
    },
    [terms, currentTerm]
  );

  // ── Filters & Search ──
  const [search, setSearch] = useState('');
  const [curriculum, setCurriculum] = useState<CurriculumFilter>('ALL');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amtMin, setAmtMin] = useState('');
  const [amtMax, setAmtMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Sorting & Reduced Pagination ──
  const [sortKey, setSortKey] = useState<SortKey>('payment_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10); // Default reduced row loading per user request

  // ── Selections & Modals ──
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewPayment, setPreviewPayment] = useState<any>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ── On-The-Fly Studio State ──
  const [studioStudentId, setStudioStudentId] = useState<number | ''>('');
  const [studioPaymentId, setStudioPaymentId] = useState<number | ''>('');
  const [studioCustomNotes, setStudioCustomNotes] = useState('');
  const [studioCashierName, setStudioCashierName] = useState('');

  // ── Cashier Shift Handover State ──
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverCashier, setHandoverCashier] = useState('Senior Bursar');

  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+F
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Form options
  const formOptions = useMemo(() => {
    const s = new Set<string>();
    forms.forEach((f) => {
      if (f.form_name) s.add(f.form_name);
    });
    return Array.from(s).sort();
  }, [forms]);

  // ── Filtered & Sorted Receipts ──
  const filtered = useMemo(() => {
    let list = [...payments];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => {
        const s = students.find((st) => st.id === p.student_id);
        const sName = s ? `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase() : '';
        const adm = (s?.admission_no || s?.admission_number || '').toString().toLowerCase();
        const rcpt = (p.receipt_number || '').toLowerCase();
        const mpesa = (p.mpesa_code || '').toLowerCase();
        const ref = (p.reference_number || '').toLowerCase();
        const bank = (p.bank_name || '').toLowerCase();
        return (
          sName.includes(q) ||
          adm.includes(q) ||
          rcpt.includes(q) ||
          mpesa.includes(q) ||
          ref.includes(q) ||
          bank.includes(q)
        );
      });
    }

    // Curriculum track filter
    if (curriculum !== 'ALL') {
      list = list.filter((p) => {
        const s = students.find((st) => st.id === p.student_id);
        const fName = s ? getFormName(s.form_id) : '';
        const { track } = detectCurriculum(fName);
        return track === curriculum;
      });
    }

    // Payment Method
    if (filterMethod) {
      list = list.filter((p) => p.payment_method === filterMethod);
    }

    // Form
    if (filterForm) {
      list = list.filter((p) => {
        const s = students.find((st) => st.id === p.student_id);
        return s && getFormName(s.form_id) === filterForm;
      });
    }

    // Term filter
    if (filterTerm) {
      list = list.filter((p) => {
        const tInfo = resolvePaymentTerm(p);
        return String(tInfo.id) === filterTerm;
      });
    }

    // Date range
    if (dateFrom) list = list.filter((p) => p.payment_date >= dateFrom);
    if (dateTo) list = list.filter((p) => p.payment_date <= dateTo);

    // Amount range
    if (amtMin) list = list.filter((p) => Number(p.amount) >= Number(amtMin));
    if (amtMax) list = list.filter((p) => Number(p.amount) <= Number(amtMax));

    // Sort
    list.sort((a, b) => {
      let av: any = '';
      let bv: any = '';
      if (sortKey === 'amount') {
        av = Number(a.amount || 0);
        bv = Number(b.amount || 0);
      } else if (sortKey === 'student') {
        const sa = students.find((st) => st.id === a.student_id);
        const sb = students.find((st) => st.id === b.student_id);
        av = sa ? `${sa.first_name} ${sa.last_name}` : '';
        bv = sb ? `${sb.first_name} ${sb.last_name}` : '';
      } else if (sortKey === 'payment_method') {
        av = a.payment_method || '';
        bv = b.payment_method || '';
      } else if (sortKey === 'receipt_number') {
        av = a.receipt_number || '';
        bv = b.receipt_number || '';
      } else {
        av = a.payment_date || '';
        bv = b.payment_date || '';
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    payments,
    students,
    search,
    curriculum,
    filterMethod,
    filterForm,
    filterTerm,
    dateFrom,
    dateTo,
    amtMin,
    amtMax,
    sortKey,
    sortDir,
    getFormName,
    resolvePaymentTerm,
  ]);

  // Totals & Pagination
  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount || 0), 0), [filtered]);
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);
  const hasFilters = Boolean(
    search || curriculum !== 'ALL' || filterMethod || filterForm || filterTerm || dateFrom || dateTo || amtMin || amtMax
  );

  // ── Executive HUD Metrics ──
  const hudStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalRevenue = 0;
    let todayVolume = 0;
    let todayCount = 0;
    let mpesaVolume = 0;
    let mpesaCount = 0;
    let bankVolume = 0;
    let bankCount = 0;
    let cashVolume = 0;
    let cashCount = 0;
    let bursaryVolume = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount || 0);
      totalRevenue += amt;
      if (p.payment_date === todayStr) {
        todayVolume += amt;
        todayCount += 1;
      }

      const m = (p.payment_method || '').toLowerCase();
      if (m.includes('pesa')) {
        mpesaVolume += amt;
        mpesaCount += 1;
      } else if (m.includes('bank')) {
        bankVolume += amt;
        bankCount += 1;
      } else if (m.includes('cash')) {
        cashVolume += amt;
        cashCount += 1;
      } else {
        bursaryVolume += amt;
      }
    });

    return {
      totalRevenue,
      todayVolume,
      todayCount,
      mpesaVolume,
      mpesaCount,
      bankVolume,
      bankCount,
      cashVolume,
      cashCount,
      bursaryVolume,
      count: payments.length,
    };
  }, [payments]);

  // ── Side-by-Side Chart Data Preparation ──
  const chartMethodMetrics: MethodMetric[] = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filtered.forEach((p) => {
      const m = p.payment_method || 'Cash';
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count += 1;
      map[m].total += Number(p.amount || 0);
    });

    const totalRev = Object.values(map).reduce((s, v) => s + v.total, 0) || 1;
    return Object.entries(map).map(([m, data]) => {
      const meta = getMethodMeta(m);
      return {
        method: m,
        count: data.count,
        total: data.total,
        pct: (data.total / totalRev) * 100,
        color: meta.dot,
        icon: meta.icon,
      };
    });
  }, [filtered]);

  const chartDailyTrends: DailyPoint[] = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      map[iso] = { amount: 0, count: 0 };
    }

    filtered.forEach((p) => {
      const dt = p.payment_date;
      if (map[dt]) {
        map[dt].amount += Number(p.amount || 0);
        map[dt].count += 1;
      }
    });

    return Object.entries(map).map(([iso, v]) => {
      const d = new Date(iso);
      return {
        date: iso,
        label: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
        amount: v.amount,
        count: v.count,
      };
    });
  }, [filtered]);

  // ── Sorting handler ──
  const handleSort = useCallback(
    (k: SortKey) => {
      if (sortKey === k) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(k);
        setSortDir('desc');
      }
      setPage(1);
    },
    [sortKey]
  );

  // ── Checkbox Selection ──
  const allPageIds = useMemo(() => paginated.map((p) => p.id), [paginated]);
  const isAllPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    const next = new Set(selected);
    if (isAllPageSelected) {
      allPageIds.forEach((id) => next.delete(id));
    } else {
      allPageIds.forEach((id) => next.add(id));
    }
    setSelected(next);
  };

  const toggleSelectOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Helper to construct receipt payload
  const buildReceiptData = useCallback(
    (p: any) => {
      const s = students.find((st: any) => st.id === p.student_id);
      const formName = s ? getFormName(s.form_id) : '—';
      const streamName = s ? getStreamName(s.stream_id) : '';
      const fees = s ? getStudentFeeProfile(s.id) : null;
      const termInfo = resolvePaymentTerm(p);

      return {
        receiptNumber: p.receipt_number || `REC-${p.id}`,
        paymentDate: p.payment_date || new Date().toISOString().split('T')[0],
        studentName: s ? `${s.first_name} ${s.last_name}` : 'Unknown Student',
        admissionNo: s?.admission_no || s?.admission_number || '—',
        formStream: `${formName}${streamName ? ' ' + streamName : ''}`,
        parentName: s?.parent_name || s?.guardian_name || '',
        parentPhone: s?.parent_phone || s?.emergency_contact || '',
        paymentMethod: p.payment_method || 'Cash',
        reference: p.mpesa_code || p.reference_number || p.bank_name || '',
        amount: Number(p.amount || 0),
        totalPaid: fees?.totalPaid || Number(p.amount || 0),
        termFees: fees?.termTotal || 0,
        termBalance: fees?.termBalance || 0,
        annualFees: fees?.annualTotal || 0,
        annualBalance: fees?.annualBalance || 0,
        schoolName: settings?.school_name || 'ALPHA PREMIER SCHOOL',
        schoolAddress: settings?.school_address || 'P.O. Box 000, Nairobi, Kenya',
        schoolPhone: settings?.school_phone || 'Tel: +254 700 000 000',
        schoolEmail: settings?.school_email || 'finance@alphapremier.ac.ke',
        cashier: p.received_by || studioCashierName || 'Cashier Command Desk',
      };
    },
    [students, getFormName, getStreamName, getStudentFeeProfile, resolvePaymentTerm, settings, studioCashierName]
  );

  // Single Thermal, A4, and Dual A5 Print Handlers
  const handlePrintThermalReceipt = (p: any) => {
    printThermalReceipt(buildReceiptData(p));
  };

  const handlePrintA4Receipt = (p: any) => {
    printA4OfficialReceipt(buildReceiptData(p));
  };

  const handlePrintA5DualReceipt = (p: any) => {
    printA5DualReceipt(buildReceiptData(p));
  };

  // Batch Print Handlers
  const handleBulkPrintThermal = () => {
    const targets = filtered.filter((p) => selected.size === 0 || selected.has(p.id));
    if (!targets.length) {
      toast.error('No receipts available for printing');
      return;
    }
    const payloads = targets.map((p) => buildReceiptData(p));
    printBulkThermalReceipts(payloads);
    toast.success(`Batch streaming ${payloads.length} thermal receipts...`);
  };

  const handleBulkPrintA4 = () => {
    const targets = filtered.filter((p) => selected.size === 0 || selected.has(p.id));
    if (!targets.length) {
      toast.error('No receipts available for printing');
      return;
    }
    const payloads = targets.map((p) => buildReceiptData(p));
    printBulkA4Receipts(payloads);
    toast.success(`Batch streaming ${payloads.length} official A4 vouchers...`);
  };

  const handlePrintRegister = () => {
    const termLabel = filterTerm
      ? terms.find((t) => String(t.id) === filterTerm)?.term_name || currentTerm?.term_name || 'All Terms'
      : currentTerm?.term_name || 'All Terms';

    const reportRows = filtered.map((p) => {
      const s = students.find((st) => st.id === p.student_id);
      return {
        receiptNo: p.receipt_number || `REC-${p.id}`,
        paymentDate: fmtDate(p.payment_date),
        studentName: s ? `${s.first_name} ${s.last_name}` : 'Unknown Student',
        admNo: s?.admission_no || s?.admission_number || '—',
        formName: s ? getFormName(s.form_id) : '—',
        paymentMethod: p.payment_method || 'Cash',
        referenceNo: p.mpesa_code || p.reference_number || p.bank_name || '—',
        amount: Number(p.amount || 0),
      };
    });

    printPaymentsRegisterReport({
      schoolName: settings?.school_name || 'ALPHA PREMIER SCHOOL',
      termName: termLabel,
      payments: reportRows,
      totalAmount,
    });
  };

  // Cashier Handover Action
  const handlePrintHandover = () => {
    const dayPayments = payments.filter((p) => p.payment_date === handoverDate);
    let totalVol = 0;
    let mpesaVol = 0;
    let bankVol = 0;
    let cashVol = 0;
    let otherVol = 0;

    dayPayments.forEach((p) => {
      const a = Number(p.amount || 0);
      totalVol += a;
      const m = (p.payment_method || '').toLowerCase();
      if (m.includes('pesa')) mpesaVol += a;
      else if (m.includes('bank')) bankVol += a;
      else if (m.includes('cash')) cashVol += a;
      else otherVol += a;
    });

    printCashierShiftHandover({
      cashierName: handoverCashier || 'Bursar',
      date: handoverDate,
      shiftNumber: '1',
      totalReceipts: dayPayments.length,
      totalVolume: totalVol,
      mpesaVolume: mpesaVol,
      bankVolume: bankVol,
      cashVolume: cashVol,
      otherVolume: otherVol,
      payments: dayPayments.map((p) => {
        const s = students.find((st) => st.id === p.student_id);
        return {
          receiptNo: p.receipt_number || `REC-${p.id}`,
          studentName: s ? `${s.first_name} ${s.last_name}` : 'Student',
          paymentMethod: p.payment_method || 'Cash',
          referenceNo: p.mpesa_code || p.reference_number || '—',
          amount: p.amount,
        };
      }),
      schoolName: settings?.school_name || 'ALPHA PREMIER SCHOOL',
    });
  };

  // WhatsApp Dispatch
  const handleSendWhatsAppReceipt = (p: any) => {
    const s = students.find((st: any) => st.id === p.student_id);
    const phone = s?.parent_phone || s?.emergency_contact || s?.guardian_phone || '';
    if (!phone) {
      toast.error('No parent phone number found for this student');
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) cleanPhone = '254' + cleanPhone;

    const termInfo = resolvePaymentTerm(p);
    const school = settings?.school_name || 'ALPHA PREMIER SCHOOL';
    const text =
      `*OFFICIAL FEE RECEIPT - ${school.toUpperCase()}*\n\n` +
      `Receipt No: *${p.receipt_number || 'N/A'}*\n` +
      `Student: *${s ? `${s.first_name} ${s.last_name}` : 'Student'}* (Adm: ${s?.admission_no || s?.admission_number || '—'})\n` +
      `Term: *${termInfo.name}*\n` +
      `Amount Paid: *KES ${Number(p.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}*\n` +
      `Payment Date: *${fmtDate(p.payment_date)}*\n` +
      `Method: *${p.payment_method || 'Cash'}*\n` +
      (p.mpesa_code ? `M-Pesa Code: *${p.mpesa_code}*\n` : '') +
      (p.reference_number ? `Ref No: *${p.reference_number}*\n` : '') +
      (p.bank_name ? `Bank: *${p.bank_name}*\n` : '') +
      `\n✅ Thank you for your payment. For fee queries, contact our finance desk.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success(`Opening WhatsApp dispatch for ${s?.first_name || 'Guardian'}...`);
  };

  const handleCopyReceipt = (p: any) => {
    const s = students.find((st) => st.id === p.student_id);
    const termInfo = resolvePaymentTerm(p);
    const txt =
      `Receipt: ${p.receipt_number || '—'}\n` +
      `Student: ${s ? `${s.first_name} ${s.last_name}` : '—'} (${s?.admission_no || s?.admission_number || '—'})\n` +
      `Term: ${termInfo.name}\n` +
      `Amount: ${fmt(Number(p.amount || 0))}\n` +
      `Date: ${fmtDate(p.payment_date)}\n` +
      `Method: ${p.payment_method || '—'}` +
      (p.mpesa_code ? `\nM-Pesa: ${p.mpesa_code}` : '') +
      (p.reference_number ? `\nRef: ${p.reference_number}` : '');

    navigator.clipboard.writeText(txt).then(() => toast.success('Receipt details copied!'));
  };

  // Enterprise Multi-Sheet Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const toastId = toast.loading('Generating enterprise 4-sheet Excel workbook with auto-sized columns...');

      const exportItems: PaymentExportItem[] = filtered.map((p, idx) => {
        const s = students.find((st) => st.id === p.student_id);
        const fName = s ? getFormName(s.form_id) : '—';
        const stName = s ? getStreamName(s.stream_id) : '—';
        const termInfo = resolvePaymentTerm(p);
        const { label: curLabel } = detectCurriculum(fName);

        return {
          index: idx + 1,
          receiptNo: p.receipt_number || `REC-${p.id}`,
          paymentDate: p.payment_date || '',
          studentName: s ? `${s.first_name} ${s.last_name}` : 'Unknown Student',
          admNo: s?.admission_no || s?.admission_number || '—',
          curriculumTrack: curLabel,
          formName: fName,
          streamName: stName,
          paymentMethod: p.payment_method || 'Cash',
          referenceNo: p.mpesa_code || p.reference_number || p.bank_name || '—',
          amount: Number(p.amount || 0),
          receivedBy: p.received_by || 'Cashier Desk',
          termName: termInfo.name,
          notes: p.notes || '',
        };
      });

      const methodMap: Record<string, { count: number; total: number }> = {};
      filtered.forEach((p) => {
        const m = p.payment_method || 'Cash';
        if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 };
        methodMap[m].count += 1;
        methodMap[m].total += Number(p.amount || 0);
      });
      const grandTotal = exportItems.reduce((s, p) => s + p.amount, 0);

      const methodSummaries: MethodSummaryExportItem[] = Object.entries(methodMap).map(([m, val]) => ({
        method: m,
        transactionCount: val.count,
        totalAmount: val.total,
        pctOfTotal: grandTotal > 0 ? (val.total / grandTotal) * 100 : 0,
      }));

      const formMap: Record<string, { count: number; total: number; track: string }> = {};
      filtered.forEach((p) => {
        const s = students.find((st) => st.id === p.student_id);
        const fName = s ? getFormName(s.form_id) : 'Unknown Form';
        const { label: curLabel } = detectCurriculum(fName);
        if (!formMap[fName]) formMap[fName] = { count: 0, total: 0, track: curLabel };
        formMap[fName].count += 1;
        formMap[fName].total += Number(p.amount || 0);
      });

      const formSummaries: FormCollectionExportItem[] = Object.entries(formMap).map(([fn, val]) => ({
        formName: fn,
        curriculumTrack: val.track,
        transactionCount: val.count,
        totalCollected: val.total,
      }));

      await exportUltraPaymentsExcel({
        schoolName: settings?.school_name || 'ALPHA PREMIER SCHOOL',
        termName: currentTerm?.term_name || 'All Academic Terms',
        payments: exportItems,
        methodSummaries,
        formSummaries,
        totalRevenue: grandTotal,
      });

      toast.success(`Exported ${exportItems.length.toLocaleString()} receipts to 4-sheet Excel!`, { id: toastId });
    } catch (err: any) {
      console.error('Excel export error:', err);
      toast.error('Export failed: ' + (err?.message || 'Error creating file'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCurriculum('ALL');
    setFilterMethod('');
    setFilterForm('');
    setFilterTerm('');
    setDateFrom('');
    setDateTo('');
    setAmtMin('');
    setAmtMax('');
    setPage(1);
  };

  return (
    <div className="space-y-3.5 pb-10 max-w-[1400px] mx-auto text-slate-800">
      {/* ── Page Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }
        input:focus, select:focus, textarea:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
        tr.pay-row:hover td { background: #f8fafc !important; }
        .pay-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* ═══ 1. COMPACT EXECUTIVE COMMAND HEADER (Light & Tight Like Fee Structure) ═══ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
              🧾
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Official Fee Receipts &amp; Document Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails?.school_name || settings?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {hudStats.count.toLocaleString()} Receipts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Multi-mode 80mm POS, Executive A4 &amp; 2-in-1 Dual A5 · AlphaSIMS Document Engine
              </p>
            </div>
          </div>

          {/* Right: Actions & Workspace Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Workspace Tab Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 gap-0.5">
              {[
                { id: 'ledger', label: '🧾 Ledger' },
                { id: 'studio', label: '⚡ Studio' },
                { id: 'batch', label: '📦 Batch Print' },
                { id: 'handover', label: '📋 Shift Handover' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as MainTab)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    activeTab === tab.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              href="/dashboard/fees"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center gap-1"
            >
              ← Fees Desk
            </Link>

            {/* Refresh */}
            <button
              onClick={fetchAll}
              disabled={loading}
              title="Refresh ledger"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Batch Thermal Print */}
            <button
              onClick={handleBulkPrintThermal}
              disabled={filtered.length === 0}
              className="px-2.5 py-1.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Print selected or all receipts on 80mm thermal paper"
            >
              <FiPrinter size={12} />
              <span>{selected.size > 0 ? `Thermal (${selected.size})` : '80mm Thermal'}</span>
            </button>

            {/* Batch A4 Print */}
            <button
              onClick={handleBulkPrintA4}
              disabled={filtered.length === 0}
              className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Print selected or all receipts as official A4 vouchers"
            >
              <FiFileText size={12} />
              <span>{selected.size > 0 ? `A4 (${selected.size})` : 'A4 Vouchers'}</span>
            </button>

            {/* Multi-Sheet Enterprise Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || filtered.length === 0}
              className="px-3 py-1.5 rounded-xl border border-blue-300/80 bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <FiDownload size={12} />
              <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </div>
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: RECEIPTS LEDGER & DISPATCH
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ledger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-in">
            {/* Dual-Track Curriculum Filter Bar */}
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Curriculum Track:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'All Curricula', icon: '🌐', count: payments.length },
                  {
                    id: 'CBC_SENIOR',
                    label: 'CBC Senior School (G10–12)',
                    icon: '🏛️',
                    count: payments.filter((p) => {
                      const s = students.find((st) => st.id === p.student_id);
                      return detectCurriculum(s ? getFormName(s.form_id) : '').track === 'CBC_SENIOR';
                    }).length,
                  },
                  {
                    id: '844_SEC',
                    label: '8-4-4 Secondary (Forms 1–4)',
                    icon: '📚',
                    count: payments.filter((p) => {
                      const s = students.find((st) => st.id === p.student_id);
                      return detectCurriculum(s ? getFormName(s.form_id) : '').track === '844_SEC';
                    }).length,
                  },
                  {
                    id: 'JSS',
                    label: 'JSS Junior Secondary (G7–9)',
                    icon: '🎓',
                    count: payments.filter((p) => {
                      const s = students.find((st) => st.id === p.student_id);
                      return detectCurriculum(s ? getFormName(s.form_id) : '').track === 'JSS';
                    }).length,
                  },
                  {
                    id: 'PRIMARY_CBC',
                    label: 'Primary CBC (PP1–G6)',
                    icon: '🎒',
                    count: payments.filter((p) => {
                      const s = students.find((st) => st.id === p.student_id);
                      return detectCurriculum(s ? getFormName(s.form_id) : '').track === 'PRIMARY_CBC';
                    }).length,
                  },
                ].map((tab) => {
                  const active = curriculum === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCurriculum(tab.id as CurriculumFilter);
                        setPage(1);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 99,
                        border: `1.5px solid ${active ? T.indigo : T.border}`,
                        background: active ? T.indigoL : T.card,
                        color: active ? T.indigo : T.sub,
                        fontSize: 11,
                        fontWeight: active ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span
                        style={{
                          background: active ? T.indigo : '#e2e8f0',
                          color: active ? '#fff' : T.sub,
                          borderRadius: 99,
                          fontSize: 9,
                          fontWeight: 900,
                          padding: '1px 6px',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6-Card Executive HUD (Fine Like Fee Structure Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                {
                  label: 'Issued Receipts',
                  value: hudStats.count.toLocaleString(),
                  sub: '100% verified computer receipts',
                  color: 'text-indigo-700',
                  bg: 'bg-indigo-50/70',
                  border: 'border-indigo-100',
                  icon: <FiFileText size={14} className="text-indigo-600" />,
                },
                {
                  label: 'Total Value',
                  value: fmtK(hudStats.totalRevenue),
                  sub: 'Cumulative reconciled intake',
                  color: 'text-emerald-700',
                  bg: 'bg-emerald-50/70',
                  border: 'border-emerald-100',
                  icon: <FiDollarSign size={14} className="text-emerald-600" />,
                },
                {
                  label: "Today's Receipts",
                  value: fmtK(hudStats.todayVolume),
                  sub: `${hudStats.todayCount} issued today`,
                  color: 'text-amber-700',
                  bg: 'bg-amber-50/70',
                  border: 'border-amber-100',
                  icon: <FiCalendar size={14} className="text-amber-600" />,
                },
                {
                  label: 'M-Pesa Receipts',
                  value: fmtK(hudStats.mpesaVolume),
                  sub: `${hudStats.mpesaCount} digital slips`,
                  color: 'text-green-700',
                  bg: 'bg-green-50/70',
                  border: 'border-green-100',
                  icon: <FiSmartphone size={14} className="text-green-600" />,
                },
                {
                  label: 'Bank Slips',
                  value: fmtK(hudStats.bankVolume),
                  sub: `${hudStats.bankCount} verified slips`,
                  color: 'text-sky-700',
                  bg: 'bg-sky-50/70',
                  border: 'border-sky-100',
                  icon: <FiCreditCard size={14} className="text-sky-600" />,
                },
                {
                  label: 'Counter Drawer',
                  value: fmtK(hudStats.cashVolume),
                  sub: `${hudStats.cashCount} cash settlements`,
                  color: 'text-teal-700',
                  bg: 'bg-teal-50/70',
                  border: 'border-teal-100',
                  icon: <FiDollarSign size={14} className="text-teal-600" />,
                },
              ].map((k, i) => (
                <div
                  key={i}
                  className={`bg-white border ${k.border} rounded-xl p-2.5 shadow-2xs flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</span>
                    <div className={`w-6 h-6 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                      {k.icon}
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className={`text-sm font-extrabold font-mono ${k.color} tracking-tight`}>{k.value}</p>
                    <p className="text-[9.5px] text-slate-400 font-medium truncate">{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-Side SVG Charts */}
            <UltraPaymentsCharts
              methodMetrics={chartMethodMetrics}
              dailyTrends={chartDailyTrends}
              grandTotal={totalAmount}
              totalCount={filtered.length}
            />

            {/* Filter Matrix */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: T.muted }}>🔍</span>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search receipt #, student name, adm no, M-Pesa code… (Ctrl+F)"
                    style={{
                      width: '100%',
                      padding: '9px 36px 9px 34px',
                      borderRadius: 10,
                      border: `1.5px solid ${T.border}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.text,
                      background: T.bg,
                      outline: 'none',
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setPage(1);
                      }}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        color: T.muted,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque'].map((m) => {
                  const meta = getMethodMeta(m);
                  const active = filterMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setFilterMethod(active ? '' : m);
                        setPage(1);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${active ? meta.dot : T.border}`,
                        background: active ? meta.bg : T.card,
                        color: active ? meta.text : T.sub,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>{meta.icon}</span>
                      <span>{m}</span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowFilters((s) => !s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: `1.5px solid ${showFilters || hasFilters ? T.indigo : T.border}`,
                    background: showFilters || hasFilters ? T.indigoL : T.card,
                    color: showFilters || hasFilters ? T.indigo : T.sub,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FiFilter />
                  <span>More Filters</span>
                  {hasFilters && (
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: T.indigo, color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      !
                    </span>
                  )}
                </button>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: `1.5px solid #fecaca`,
                      background: '#fef2f2',
                      color: T.red,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FiX />
                    <span>Reset</span>
                  </button>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.sub }}>Rows:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 10,
                      border: `1.5px solid ${T.border}`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      background: T.card,
                      cursor: 'pointer',
                    }}
                  >
                    {[10, 15, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} rows / page
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showFilters && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>Form / Class</label>
                    <select value={filterForm} onChange={(e) => { setFilterForm(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}>
                      <option value="">All Classes</option>
                      {formOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>Academic Term</label>
                    <select value={filterTerm} onChange={(e) => { setFilterTerm(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}>
                      <option value="">All Terms</option>
                      {terms.map((t) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>From Date</label>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>To Date</label>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>Min Amount (KES)</label>
                    <input type="number" placeholder="Min KES" value={amtMin} onChange={(e) => { setAmtMin(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>Max Amount (KES)</label>
                    <input type="number" placeholder="Max KES" value={amtMax} onChange={(e) => { setAmtMax(e.target.value); setPage(1); }} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }} />
                  </div>
                </div>
              )}
            </div>

            {/* Results bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>
                  Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{' '}
                  <strong style={{ color: T.text }}>{filtered.length.toLocaleString()}</strong> receipts{' '}
                  {hasFilters && <span style={{ color: T.indigo }}>(filtered)</span>}
                </span>

                {selected.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.indigoL, border: `1px solid ${T.indigoBd}`, borderRadius: 8, padding: '3px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo }}>{selected.size} selected</span>
                    <button onClick={() => setSelected(new Set())} style={{ fontSize: 10, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      ✕ clear
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={handlePrintRegister} style={{ background: 'none', border: 'none', color: T.indigo, cursor: 'pointer', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiPrinter /> Print Register (A4 Landscape)
                </button>
                <span style={{ color: T.muted }}>·</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>Page Volume:</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{fmt(paginated.reduce((s, p) => s + Number(p.amount || 0), 0))}</span>
                <span style={{ color: T.muted }}>·</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>Total:</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: T.indigo }}>{fmt(totalAmount)}</span>
              </div>
            </div>

            {/* Datagrid Table */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Inter',sans-serif" }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                      <th style={{ padding: '10px 12px', width: 38 }}>
                        <input type="checkbox" checked={isAllPageSelected} onChange={toggleSelectAll} style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <button onClick={() => handleSort('receipt_number')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: sortKey === 'receipt_number' ? T.indigo : T.sub }}>
                          Receipt # {sortKey === 'receipt_number' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <button onClick={() => handleSort('student')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: sortKey === 'student' ? T.indigo : T.sub }}>
                          Student / Adm {sortKey === 'student' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>Track & Class</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button onClick={() => handleSort('amount')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginLeft: 'auto', color: sortKey === 'amount' ? T.indigo : T.sub }}>
                          Amount (KES) {sortKey === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <button onClick={() => handleSort('payment_method')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: sortKey === 'payment_method' ? T.indigo : T.sub }}>
                          Method {sortKey === 'payment_method' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>Ref / Slip / Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        <button onClick={() => handleSort('payment_date')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: sortKey === 'payment_date' ? T.indigo : T.sub }}>
                          Date {sortKey === 'payment_date' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>Term</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>Receipt Formats & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.indigo, fontWeight: 700 }}>
                            <FiRefreshCw className="animate-spin" />
                            <span>Loading fee receipts from live database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 32, marginBottom: 6 }}>🧾</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>No receipts found</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Try clearing or adjusting search filters.</div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((p) => {
                        const s = students.find((st) => st.id === p.student_id);
                        const fName = s ? getFormName(s.form_id) : '—';
                        const stName = s ? getStreamName(s.stream_id) : '';
                        const { label: curLabel, badgeColor } = detectCurriculum(fName);
                        const termInfo = resolvePaymentTerm(p);
                        const isSel = selected.has(p.id);
                        const meta = getMethodMeta(p.payment_method);
                        const initials = s ? `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase() : '?';

                        return (
                          <tr
                            key={p.id}
                            className="pay-row"
                            onClick={() => setPreviewPayment(p)}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: isSel ? T.indigoL : '#fff',
                              cursor: 'pointer',
                              transition: 'background 0.12s',
                            }}
                          >
                            <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={isSel} onChange={() => toggleSelectOne(p.id)} style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }} />
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: T.indigo, background: T.indigoL, border: `1px solid ${T.indigoBd}`, padding: '2px 7px', borderRadius: 6 }}>
                                {p.receipt_number || `REC-${p.id}`}
                              </span>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 12, color: T.text }}>
                                    {s ? `${s.first_name} ${s.last_name}` : <span style={{ color: T.muted }}>Unknown Student</span>}
                                  </div>
                                  <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', marginTop: 1 }}>
                                    Adm: {s?.admission_no || s?.admission_number || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{fName} {stName}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 99, width: 'fit-content', border: '1px solid' }} className={badgeColor}>
                                  {curLabel}
                                </span>
                              </div>
                            </td>

                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{fmt(Number(p.amount || 0))}</span>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: meta.bg, color: meta.text, fontSize: 10, fontWeight: 800, border: `1px solid ${meta.dot}40` }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                                <span>{meta.icon}</span>
                                <span>{p.payment_method || 'Cash'}</span>
                              </span>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.sub }}>
                                {p.mpesa_code || p.reference_number || p.bank_name || '—'}
                              </span>
                            </td>

                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>{fmtDate(p.payment_date)}</span>
                            </td>

                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#6d28d9', background: '#faf5ff', border: '1px solid #ddd6fe', padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                                {termInfo.name}
                              </span>
                            </td>

                            {/* In-Grid Multi-Action Controls */}
                            <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                {/* Thermal 80mm */}
                                <button
                                  onClick={() => handlePrintThermalReceipt(p)}
                                  title="Print 80mm Cashier Thermal Receipt"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <FiPrinter size={13} />
                                </button>

                                {/* Official A4 Voucher */}
                                <button
                                  onClick={() => handlePrintA4Receipt(p)}
                                  title="Print Official A4 Voucher"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid #bfdbfe`, background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <FiFileText size={13} />
                                </button>

                                {/* Dual A5 Cut Voucher */}
                                <button
                                  onClick={() => handlePrintA5DualReceipt(p)}
                                  title="Print 2-in-1 Dual A5 Cut Receipt (School + Student copy)"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid #ddd6fe`, background: '#faf5ff', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <FiScissors size={13} />
                                </button>

                                {/* WhatsApp Dispatch */}
                                <button
                                  onClick={() => handleSendWhatsAppReceipt(p)}
                                  title="Dispatch Official Receipt to Parent WhatsApp"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid #bbf7d0`, background: '#f0fdf4', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <FiShare2 size={13} />
                                </button>

                                {/* Interactive Preview */}
                                <button
                                  onClick={() => setPreviewPayment(p)}
                                  title="Full Interactive Receipt Preview"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.indigo, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <FiEye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {paginated.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: `2px solid ${T.border}` }}>
                        <td colSpan={4} style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
                            Page Subtotal ({paginated.length} records):
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>
                            {fmt(paginated.reduce((s, p) => s + Number(p.amount || 0), 0))}
                          </span>
                        </td>
                        <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
                            Total Receipts Volume: <strong style={{ color: T.indigo }}>{fmt(totalAmount)}</strong>
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
                  <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 800, color: T.sub, opacity: page === 1 ? 0.4 : 1 }}>
                      «
                    </button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 800, color: T.sub, opacity: page === 1 ? 0.4 : 1 }}>
                      ‹
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pg = i + 1;
                      if (totalPages > 5 && page > 3) {
                        pg = Math.min(page - 2 + i, totalPages - 4 + i);
                      }
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: `1.5px solid ${page === pg ? T.indigo : T.border}`,
                            background: page === pg ? T.indigo : T.card,
                            color: page === pg ? '#fff' : T.sub,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {pg}
                        </button>
                      );
                    })}

                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 800, color: T.sub, opacity: page === totalPages ? 0.4 : 1 }}>
                      ›
                    </button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 800, color: T.sub, opacity: page === totalPages ? 0.4 : 1 }}>
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: ON-THE-FLY RECEIPT STUDIO
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'studio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }} className="fade-in">
            {/* Control Panel */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
                  Instant Receipt Customizer Studio
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.sub }}>
                  Pick any student & settled transaction to dispatch customized official documents.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 6 }}>
                  Select Enrolled Student
                </label>
                <select
                  value={studioStudentId}
                  onChange={(e) => {
                    const sid = e.target.value ? Number(e.target.value) : '';
                    setStudioStudentId(sid);
                    const matchPays = payments.filter((p) => p.student_id === sid);
                    setStudioPaymentId(matchPays[0]?.id || '');
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg, fontWeight: 600 }}
                >
                  <option value="">— Choose Student —</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name} ({st.admission_no || st.admission_number || 'No Adm'}) — {getFormName(st.form_id)}
                    </option>
                  ))}
                </select>
              </div>

              {studioStudentId && (
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 6 }}>
                    Select Fee Payment Transaction
                  </label>
                  <select
                    value={studioPaymentId}
                    onChange={(e) => setStudioPaymentId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg, fontWeight: 600 }}
                  >
                    {payments
                      .filter((p) => p.student_id === studioStudentId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.receipt_number || `REC-${p.id}`} • KES {Number(p.amount || 0).toLocaleString()} • {p.payment_method} ({fmtDate(p.payment_date)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 6 }}>
                  Cashier Name / Issuer Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bursar J. Kiprono"
                  value={studioCashierName}
                  onChange={(e) => setStudioCashierName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 6 }}>
                  Custom Remarks / Audit Note
                </label>
                <textarea
                  placeholder="Special fee clearance notes or conditions..."
                  value={studioCustomNotes}
                  onChange={(e) => setStudioCustomNotes(e.target.value)}
                  style={{ width: '100%', height: 70, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg, resize: 'none' }}
                />
              </div>

              {/* Direct Print Triggers */}
              {studioPaymentId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      const p = payments.find((pm) => pm.id === studioPaymentId);
                      if (p) handlePrintA4Receipt(p);
                    }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#1e3a8a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <FiFileText /> Print Official A4 Voucher
                  </button>
                  <button
                    onClick={() => {
                      const p = payments.find((pm) => pm.id === studioPaymentId);
                      if (p) handlePrintThermalReceipt(p);
                    }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <FiPrinter /> Print 80mm POS Thermal Slip
                  </button>
                  <button
                    onClick={() => {
                      const p = payments.find((pm) => pm.id === studioPaymentId);
                      if (p) handlePrintA5DualReceipt(p);
                    }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #ddd6fe', background: '#faf5ff', color: '#7c3aed', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <FiScissors /> Print 2-in-1 Dual A5 Cut Voucher
                  </button>
                </div>
              )}
            </div>

            {/* Live Document Preview Pane */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Live Document Preview</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.indigo, background: T.indigoL, padding: '2px 8px', borderRadius: 99 }}>
                  REAL-TIME RENDER
                </span>
              </div>

              {studioPaymentId ? (
                (() => {
                  const p = payments.find((pm) => pm.id === studioPaymentId);
                  const st = students.find((s) => s.id === p?.student_id);
                  const fees = st ? getStudentFeeProfile(st.id) : null;
                  const termInfo = p ? resolvePaymentTerm(p) : { id: 1, name: 'Term 1' };
                  const fName = st ? getFormName(st.form_id) : '—';
                  const { label: curLabel } = detectCurriculum(fName);

                  return (
                    <div style={{ border: '2px solid #1e3a8a', borderRadius: 12, padding: 20, background: '#ffffff', fontFamily: "'Segoe UI', sans-serif" }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: 10, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a' }}>{settings?.school_name || 'ALPHA PREMIER SCHOOL'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>P.O. Box 000, Nairobi • Tel: +254 700 000 000</div>
                        </div>
                        <div style={{ background: '#1e3a8a', color: '#fff', padding: '4px 12px', borderRadius: 6, textAlign: 'right' }}>
                          <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>OFFICIAL RECEIPT</div>
                          <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>{p?.receipt_number || `REC-${p?.id}`}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, fontSize: 11.5 }}>
                        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div>Student: <strong>{st?.first_name} {st?.last_name}</strong></div>
                          <div>Adm: <strong>{st?.admission_no || st?.admission_number}</strong></div>
                          <div>Class: <strong>{curLabel} · {fName}</strong></div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div>Date: <strong>{fmtDateLong(p?.payment_date)}</strong></div>
                          <div>Method: <strong>{p?.payment_method}</strong></div>
                          <div>Term: <strong>{termInfo.name}</strong></div>
                        </div>
                      </div>

                      <div style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Amount Cleared</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e3a8a', fontFamily: 'monospace' }}>{fmt(Number(p?.amount || 0))}</div>
                      </div>

                      {fees && (
                        <div style={{ fontSize: 11, borderTop: '1px dashed #cbd5e1', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Term Balance Due: <strong style={{ color: fees.termBalance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(fees.termBalance)}</strong></span>
                          <span>Total Paid to Date: <strong style={{ color: '#15803d' }}>{fmt(fees.totalPaid)}</strong></span>
                        </div>
                      )}

                      {studioCustomNotes && (
                        <div style={{ marginTop: 10, padding: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 10, color: '#92400e' }}>
                          <strong>Audit Remarks:</strong> {studioCustomNotes}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div style={{ padding: 60, textAlign: 'center', color: T.muted }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎨</div>
                  <div style={{ fontWeight: 700 }}>Choose a student from the left panel to begin customization.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: BATCH PRINTING & PDF MERGE CENTER
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'batch' && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }} className="fade-in">
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.indigoL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto' }}>
                📦
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
                  High-Capacity Batch Receipt Printing Engine
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: T.sub }}>
                  Streamline end-of-term and cashier closing by batch generating all receipts into a single unified print stream.
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: `1.5px solid ${T.border}`, borderRadius: 14, padding: 18, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Selected Receipts for Batch Processing</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                    {selected.size > 0 ? `${selected.size} specific receipts selected from ledger` : `All ${filtered.length} currently filtered receipts`}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.indigo }}>
                  {fmt(selected.size > 0 ? payments.filter((p) => selected.has(p.id)).reduce((s, p) => s + Number(p.amount || 0), 0) : totalAmount)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
                {/* Option 1: 80mm POS Thermal */}
                <div style={{ border: `1.5px solid #bbf7d0`, borderRadius: 14, padding: 16, background: '#f0fdf4', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>🖨️</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#166534' }}>POS Thermal (80mm)</div>
                    <div style={{ fontSize: 10.5, color: '#15803d', marginTop: 2 }}>Roll feed printer stream with cut-lines</div>
                  </div>
                  <button
                    onClick={handleBulkPrintThermal}
                    style={{ marginTop: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Print 80mm Thermal
                  </button>
                </div>

                {/* Option 2: Executive A4 Full Page */}
                <div style={{ border: `1.5px solid #bfdbfe`, borderRadius: 14, padding: 16, background: '#eff6ff', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1e40af' }}>Official A4 Vouchers</div>
                    <div style={{ fontSize: 10.5, color: '#1d4ed8', marginTop: 2 }}>Formal full-page certificates with crest & seals</div>
                  </div>
                  <button
                    onClick={handleBulkPrintA4}
                    style={{ marginTop: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#1e3a8a', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Print A4 Vouchers
                  </button>
                </div>

                {/* Option 3: Accounting Register */}
                <div style={{ border: `1.5px solid ${T.indigoBd}`, borderRadius: 14, padding: 16, background: T.indigoL, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>📊</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: T.indigo }}>Audit Register (A4)</div>
                    <div style={{ fontSize: 10.5, color: '#4338ca', marginTop: 2 }}>Landscape certified master table for auditors</div>
                  </div>
                  <button
                    onClick={handlePrintRegister}
                    style={{ marginTop: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: T.indigo, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Print Audit Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: CASHIER DAILY SHIFT HANDOVER & RECONCILIATION
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'handover' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }} className="fade-in">
            {/* Reconciliation Setup */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
                  Cashier Shift Handover Terminal
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: T.sub }}>
                  Generate certified end-of-shift handover certificates reconciling cash drawer, M-Pesa, and bank deposits.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Shift Handover Date
                </label>
                <input
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Outgoing Cashier / Bursar Name
                </label>
                <input
                  type="text"
                  value={handoverCashier}
                  onChange={(e) => setHandoverCashier(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, background: T.bg }}
                />
              </div>

              <div style={{ background: '#f8fafc', border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text, marginBottom: 8, textTransform: 'uppercase' }}>
                  Shift Summary Breakdown ({handoverDate})
                </div>
                {(() => {
                  const dayPayments = payments.filter((p) => p.payment_date === handoverDate);
                  const tot = dayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                  const mpesa = dayPayments.filter((p) => (p.payment_method || '').toLowerCase().includes('pesa')).reduce((s, p) => s + Number(p.amount || 0), 0);
                  const cash = dayPayments.filter((p) => (p.payment_method || '').toLowerCase().includes('cash')).reduce((s, p) => s + Number(p.amount || 0), 0);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.sub }}>Total Receipts Issued:</span>
                        <strong>{dayPayments.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.sub }}>M-Pesa Collections:</span>
                        <strong style={{ color: '#15803d' }}>{fmt(mpesa)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.sub }}>Physical Cash in Drawer:</span>
                        <strong style={{ color: '#b45309' }}>{fmt(cash)}</strong>
                      </div>
                      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900 }}>
                        <span>Total Handover:</span>
                        <span style={{ color: T.indigo }}>{fmt(tot)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={handlePrintHandover}
                style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: '#1e3a8a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <FiPrinter /> Print Official Handover Certificate
              </button>
            </div>

            {/* Shift Items List */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, overflow: 'hidden' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 900, color: T.text, textTransform: 'uppercase' }}>
                Itemized Shift Settlements ({handoverDate})
              </h3>
              {(() => {
                const dayPayments = payments.filter((p) => p.payment_date === handoverDate);
                if (dayPayments.length === 0) {
                  return <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>No payments logged on this date.</div>;
                }
                return (
                  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${T.border}` }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Receipt #</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Student</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Method</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayPayments.map((p) => {
                          const s = students.find((st) => st.id === p.student_id);
                          return (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 800, color: T.indigo }}>{p.receipt_number || `REC-${p.id}`}</td>
                              <td style={{ padding: '6px 8px' }}>{s ? `${s.first_name} ${s.last_name}` : 'Student'}</td>
                              <td style={{ padding: '6px 8px' }}>{p.payment_method}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: T.green }}>{fmt(Number(p.amount || 0))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE RECEIPT PREVIEW MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {previewPayment && (
        <ReceiptPreviewModal
          payment={previewPayment}
          student={students.find((st) => st.id === previewPayment.student_id)}
          fees={getStudentFeeProfile(previewPayment.student_id)}
          term={resolvePaymentTerm(previewPayment)}
          getFormName={getFormName}
          onClose={() => setPreviewPayment(null)}
          onPrintThermal={() => {
            handlePrintThermalReceipt(previewPayment);
            setPreviewPayment(null);
          }}
          onPrintA4={() => {
            handlePrintA4Receipt(previewPayment);
            setPreviewPayment(null);
          }}
          onPrintA5Dual={() => {
            handlePrintA5DualReceipt(previewPayment);
            setPreviewPayment(null);
          }}
          onWhatsApp={() => {
            handleSendWhatsAppReceipt(previewPayment);
            setPreviewPayment(null);
          }}
          onCopy={() => handleCopyReceipt(previewPayment)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUBCOMPONENT: RECEIPT PREVIEW MODAL (Interactive A4, Thermal & A5 Dual)
   ══════════════════════════════════════════════════════════════════════════════ */
function ReceiptPreviewModal({
  payment,
  student,
  fees,
  term,
  getFormName,
  onClose,
  onPrintThermal,
  onPrintA4,
  onPrintA5Dual,
  onWhatsApp,
  onCopy,
}: {
  payment: any;
  student: any;
  fees: StudentFeeProfile | null;
  term: { id: number; name: string };
  getFormName: (id: number) => string;
  onClose: () => void;
  onPrintThermal: () => void;
  onPrintA4: () => void;
  onPrintA5Dual: () => void;
  onWhatsApp: () => void;
  onCopy: () => void;
}) {
  const [previewTab, setPreviewTab] = useState<'a4' | 'thermal' | 'a5'>('a4');
  const meta = getMethodMeta(payment.payment_method);
  const formName = student ? getFormName(student.form_id) : '—';
  const { label: curLabel } = detectCurriculum(formName);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with channel color */}
        <div
          style={{
            background: meta.bg,
            borderBottom: `2px solid ${meta.dot}30`,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: `0 3px 8px ${meta.dot}30`,
              }}
            >
              {meta.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>
                Official Fee Receipt
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: '#4f46e5' }}>
                {payment.receipt_number || `REC-${payment.id}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Toggle Preview Tab */}
            <div style={{ display: 'flex', background: '#ffffff', borderRadius: 8, padding: 2, border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setPreviewTab('a4')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: previewTab === 'a4' ? '#1e3a8a' : 'transparent',
                  color: previewTab === 'a4' ? '#ffffff' : '#64748b',
                }}
              >
                A4
              </button>
              <button
                onClick={() => setPreviewTab('a5')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: previewTab === 'a5' ? '#7c3aed' : 'transparent',
                  color: previewTab === 'a5' ? '#ffffff' : '#64748b',
                }}
              >
                2-in-1
              </button>
              <button
                onClick={() => setPreviewTab('thermal')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: previewTab === 'thermal' ? '#16a34a' : 'transparent',
                  color: previewTab === 'thermal' ? '#ffffff' : '#64748b',
                }}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: 16,
                color: '#64748b',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Big Amount Box */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 14,
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Amount Paid & Cleared
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#14532d', letterSpacing: '-0.02em', marginTop: 2 }}>
              {fmt(Number(payment.amount || 0))}
            </div>
          </div>

          {/* Details Table */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              ['Student Name', student ? `${student.first_name} ${student.last_name}` : '—'],
              ['Admission Number', student?.admission_no || student?.admission_number || '—'],
              ['Curriculum / Class', `${curLabel} · ${formName}`],
              ['Academic Term', term.name],
              ['Payment Date', fmtDateLong(payment.payment_date)],
              ['Payment Rail', payment.payment_method || 'Cash'],
              ...(payment.mpesa_code ? [['M-Pesa Ref', payment.mpesa_code]] : []),
              ...(payment.bank_name ? [['Bank Name', payment.bank_name]] : []),
              ...(payment.reference_number ? [['Reference #', payment.reference_number]] : []),
              ...(payment.received_by ? [['Received By', payment.received_by]] : []),
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: k === 'M-Pesa Ref' ? '#15803d' : '#0f172a',
                    fontFamily: k === 'M-Pesa Ref' ? 'monospace' : "'Inter',sans-serif",
                    textAlign: 'right',
                    maxWidth: '60%',
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Fee Position Snapshot */}
          {fees && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                Clearance Balance Breakdown
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: '#64748b' }}>Term Balance Due:</span>
                <span style={{ fontWeight: 800, color: fees.termBalance > 0 ? '#dc2626' : '#16a34a' }}>
                  {fmt(fees.termBalance)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Cumulative Paid (Year):</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>{fmt(fees.totalPaid)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fafafa' }}>
          <button
            onClick={onCopy}
            style={{
              flex: 1,
              minWidth: 60,
              padding: '9px',
              borderRadius: 10,
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📋 Copy
          </button>
          <button
            onClick={onWhatsApp}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '9px',
              borderRadius: 10,
              border: '1.5px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            💬 WhatsApp
          </button>
          <button
            onClick={onPrintThermal}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '9px',
              borderRadius: 10,
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            }}
          >
            🖨️ 80mm
          </button>
          <button
            onClick={onPrintA5Dual}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '9px',
              borderRadius: 10,
              border: 'none',
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            ✂️ 2-in-1
          </button>
          <button
            onClick={onPrintA4}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '9px',
              borderRadius: 10,
              border: 'none',
              background: '#1e3a8a',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
            }}
          >
            📄 A4
          </button>
        </div>
      </div>
    </div>
  );
}

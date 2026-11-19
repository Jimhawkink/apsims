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
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import {
  printThermalReceipt,
  printA4OfficialReceipt,
  printPaymentsRegisterReport,
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
  FiEdit2,
  FiTrash2,
  FiEye,
  FiPlus,
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
  FiArrowUpRight,
  FiCheckCircle,
  FiShield,
  FiSend,
  FiAward,
  FiArrowLeft,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & EXECUTIVE THEME
   ══════════════════════════════════════════════════════════════════════════════ */
type SortKey = 'payment_date' | 'amount' | 'student' | 'receipt_number' | 'payment_method';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'grid' | 'analytics';
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
export default function UltraPaymentsPage() {
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
    recordPayment,
    updatePayment,
    deletePayment,
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

  // ── Intelligent Term Resolver (Guarantees Term is Never Blank!) ──
  const resolvePaymentTerm = useCallback(
    (p: any): { id: number; name: string } => {
      // 1. Direct term_id match
      if (p.term_id) {
        const match = terms.find((t) => Number(t.id) === Number(p.term_id));
        if (match) return { id: match.id, name: match.term_name };
      }

      // 2. Date-range lookup against official school term dates
      if (p.payment_date && terms.length > 0) {
        for (const t of terms) {
          if (t.start_date && t.end_date) {
            if (p.payment_date >= t.start_date && p.payment_date <= t.end_date) {
              return { id: t.id, name: t.term_name };
            }
          }
        }

        // Closest term by start_date
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

      // 3. Fallback to active current term or first term
      if (currentTerm) {
        return { id: currentTerm.id, name: currentTerm.term_name };
      }
      if (terms.length > 0) {
        return { id: terms[0].id, name: terms[0].term_name };
      }
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

  // ── View, Sorting & Reduced Pagination ──
  const [view, setView] = useState<ViewMode>('table');
  const [sortKey, setSortKey] = useState<SortKey>('payment_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10); // Reduced default row loading per user request

  // ── Selections & Modals ──
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isFastCollectOpen, setIsFastCollectOpen] = useState(false);
  const [previewPayment, setPreviewPayment] = useState<any>(null);
  const [editModalData, setEditModalData] = useState<{ open: boolean; payment: any | null }>({ open: false, payment: null });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isSubmittingFastPay, setIsSubmittingFastPay] = useState(false);

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

  // Form list options
  const formOptions = useMemo(() => {
    const s = new Set<string>();
    forms.forEach((f) => {
      if (f.form_name) s.add(f.form_name);
    });
    return Array.from(s).sort();
  }, [forms]);

  // ── Filtered & Sorted Payments ──
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

    // Term filter using intelligent resolver
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
    let mpesaVolume = 0;
    let bankVolume = 0;
    let cashVolume = 0;
    let bursaryVolume = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount || 0);
      totalRevenue += amt;
      if (p.payment_date === todayStr) todayVolume += amt;

      const m = (p.payment_method || '').toLowerCase();
      if (m.includes('pesa')) mpesaVolume += amt;
      else if (m.includes('bank')) bankVolume += amt;
      else if (m.includes('cash')) cashVolume += amt;
      else if (m.includes('burs') || m.includes('grant') || m.includes('capitation') || m.includes('in-kind')) {
        bursaryVolume += amt;
      }
    });

    return {
      totalRevenue,
      todayVolume,
      mpesaVolume,
      bankVolume,
      cashVolume,
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
    // Build last 14 days
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

  // ── Super Premium Thermal 80mm Printing ──
  const handlePrintThermalReceipt = (p: any) => {
    const s = students.find((st: any) => st.id === p.student_id);
    const formName = s ? getFormName(s.form_id) : '—';
    const streamName = s ? getStreamName(s.stream_id) : '';
    const fees = s ? getStudentFeeProfile(s.id) : null;
    const termInfo = resolvePaymentTerm(p);

    printThermalReceipt({
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
      schoolEmail: settings?.school_email || 'info@alphapremier.ac.ke',
      cashier: p.received_by || 'Bursar / Cashier',
    });
  };

  // ── Super Premium Official A4 Voucher Printing ──
  const handlePrintA4Receipt = (p: any) => {
    const s = students.find((st: any) => st.id === p.student_id);
    const formName = s ? getFormName(s.form_id) : '—';
    const streamName = s ? getStreamName(s.stream_id) : '';
    const fees = s ? getStudentFeeProfile(s.id) : null;
    const termInfo = resolvePaymentTerm(p);

    printA4OfficialReceipt({
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
      cashier: p.received_by || 'Cashier Command Desk',
    });
  };

  // ── Super Premium A4 Landscape Accounting Register Report ──
  const handlePrintRegisterReport = () => {
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

  // ── WhatsApp Official Receipt Dispatch ──
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to void/delete this payment record? This cannot be undone.')) return;
    try {
      await deletePayment(id);
      toast.success('Payment deleted successfully');
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error('Delete failed: ' + (err?.message || 'Error occurred'));
    }
  };

  const handleSaveEdit = async (data: any) => {
    try {
      await updatePayment(data.id, {
        amount: Number(data.amount),
        payment_method: data.payment_method,
        reference_number: data.reference_number || null,
        mpesa_code: data.mpesa_code || null,
        bank_name: data.bank_name || null,
        payment_date: data.payment_date,
        term_id: data.term_id ? Number(data.term_id) : null,
        notes: data.notes || null,
        received_by: data.received_by || null,
      });
      toast.success('Payment record updated successfully ✓');
      setEditModalData({ open: false, payment: null });
    } catch (err: any) {
      toast.error('Update failed: ' + (err?.message || 'Error'));
    }
  };

  // ── Enterprise 4-Sheet Excel Export ──
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

      // Method summaries
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

      // Form summaries
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

      toast.success(`Exported ${exportItems.length.toLocaleString()} payments to 4-sheet Excel!`, { id: toastId });
    } catch (err: any) {
      console.error('Excel export error:', err);
      toast.error('Export failed: ' + (err?.message || 'Error creating file'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── Fast Payment Settlement Submission ──
  const handleFastCollectSubmit = async (pdata: PaymentData) => {
    try {
      setIsSubmittingFastPay(true);
      await recordPayment({
        studentId: pdata.amount > 0 && students[0] ? students[0].id : 0,
        amount: pdata.amount,
        method: pdata.method as any,
        mpesaCode: pdata.mpesaCode,
        mpesaPhone: pdata.mpesaPhone,
        bankSlip: pdata.bankSlip,
        bankBranch: pdata.bankBranch,
        bankDate: pdata.bankDate,
        chequeNo: pdata.chequeNo,
        chequeBank: pdata.chequeBank,
        inKindItem: pdata.inKindItem,
        inKindValue: pdata.inKindValue,
        bursarySource: pdata.bursarySource,
        waiverType: pdata.waiverType,
        notes: pdata.notes,
        customReceiptNo: pdata.customReceiptNo,
        paymentDate: pdata.paymentDate,
        selectedTermIds: pdata.selectedTermIds,
      });

      toast.success('Fee payment settled and recorded successfully! ✓');
      setIsFastCollectOpen(false);
    } catch (err: any) {
      toast.error('Payment failed: ' + (err?.message || 'Error recording payment'));
    } finally {
      setIsSubmittingFastPay(false);
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
              💳
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Fee Payment &amp; Collection History
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails?.school_name || settings?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {hudStats.count.toLocaleString()} Settlements
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Real-time M-Pesa, Bank &amp; Cash intake · Dual-track CBC &amp; 8-4-4 · Official Audit Ledger
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 gap-0.5">
              {(['table', 'grid', 'analytics'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setView(v);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition capitalize ${
                    view === v ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {v === 'table' ? '📋 Table' : v === 'grid' ? '🗂️ Cards' : '📊 Analytics'}
                </button>
              ))}
            </div>

            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
            >
              <FiArrowLeft size={13} /> Hub
            </Link>

            <button
              onClick={handlePrintRegisterReport}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Print official accounting payments register report (A4 Landscape)"
            >
              <FiPrinter size={13} className="text-blue-700" />
              <span>Register (A4)</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || filtered.length === 0}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Download 4-Sheet Enterprise Excel Workbook with Registered School Header"
            >
              <FiDownload size={13} className="text-emerald-700" />
              <span>{isExportingExcel ? 'Exporting...' : 'Excel Sheet'}</span>
            </button>

            <Link
              href="/dashboard/fees/collect"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs"
            >
              <FiPlus size={14} />
              <span>Record Payment</span>
            </Link>

            <button
              onClick={fetchAll}
              disabled={loading}
              title="Refresh ledger"
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 2. COMPACT DUAL-TRACK CURRICULUM SELECTION BAR ═══ */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Curriculum:
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

        {/* ══════════════════════════════════════════════════════════════════════
            3. EXECUTIVE FINANCIAL COMMAND HUD (Fine Like Fee Structure Cards)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            {
              label: 'Total Revenue',
              value: fmtK(hudStats.totalRevenue),
              sub: `${hudStats.count.toLocaleString()} transactions`,
              color: 'text-indigo-700',
              bg: 'bg-indigo-50/70',
              border: 'border-indigo-100',
              icon: <FiDollarSign size={14} className="text-indigo-600" />,
            },
            {
              label: "Today's Intake",
              value: fmtK(hudStats.todayVolume),
              sub: new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }),
              color: 'text-emerald-700',
              bg: 'bg-emerald-50/70',
              border: 'border-emerald-100',
              icon: <FiCalendar size={14} className="text-emerald-600" />,
            },
            {
              label: 'M-Pesa Volume',
              value: fmtK(hudStats.mpesaVolume),
              sub: `${hudStats.totalRevenue > 0 ? ((hudStats.mpesaVolume / hudStats.totalRevenue) * 100).toFixed(0) : 0}% digital share`,
              color: 'text-green-700',
              bg: 'bg-green-50/70',
              border: 'border-green-100',
              icon: <FiSmartphone size={14} className="text-green-600" />,
            },
            {
              label: 'Bank Rails',
              value: fmtK(hudStats.bankVolume),
              sub: 'KCB, Equity, Co-op',
              color: 'text-sky-700',
              bg: 'bg-sky-50/70',
              border: 'border-sky-100',
              icon: <FiCreditCard size={14} className="text-sky-600" />,
            },
            {
              label: 'Cash Drawer',
              value: fmtK(hudStats.cashVolume),
              sub: 'Counter cash intake',
              color: 'text-amber-700',
              bg: 'bg-amber-50/70',
              border: 'border-amber-100',
              icon: <FiDollarSign size={14} className="text-amber-600" />,
            },
            {
              label: 'Bursary & Grants',
              value: fmtK(hudStats.bursaryVolume),
              sub: 'CDF, County, SNE',
              color: 'text-teal-700',
              bg: 'bg-teal-50/70',
              border: 'border-teal-100',
              icon: <FiAward size={14} className="text-teal-600" />,
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

        {/* ══════════════════════════════════════════════════════════════════════
            4. SIDE-BY-SIDE ANALYTICS CHARTS (Channel Bar + Spline Curve)
           ══════════════════════════════════════════════════════════════════════ */}
        <UltraPaymentsCharts
          methodMetrics={chartMethodMetrics}
          dailyTrends={chartDailyTrends}
          grandTotal={totalAmount}
          totalCount={filtered.length}
        />

        {/* ══════════════════════════════════════════════════════════════════════
            5. ADVANCED QUERY & FILTER MATRIX
           ══════════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 14,
                  pointerEvents: 'none',
                  color: T.muted,
                }}
              >
                🔍
              </span>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search student, adm no, receipt #, M-Pesa code, bank… (Ctrl+F)"
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

            {/* Quick Channel Pills */}
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

            {/* Filter Toggle */}
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
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: T.indigo,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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

            {/* Reduced Row Count Selector */}
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

          {/* Expandable Advanced Options */}
          {showFilters && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))',
                gap: 10,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Form / Class
                </label>
                <select
                  value={filterForm}
                  onChange={(e) => {
                    setFilterForm(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                >
                  <option value="">All Classes</option>
                  {formOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Academic Term
                </label>
                <select
                  value={filterTerm}
                  onChange={(e) => {
                    setFilterTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                >
                  <option value="">All Terms</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.term_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Min Amount (KES)
                </label>
                <input
                  type="number"
                  placeholder="Min KES"
                  value={amtMin}
                  onChange={(e) => {
                    setAmtMin(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', marginBottom: 4 }}>
                  Max Amount (KES)
                </label>
                <input
                  type="number"
                  placeholder="Max KES"
                  value={amtMax}
                  onChange={(e) => {
                    setAmtMax(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, background: T.bg }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Results Bar & Bulk Actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{' '}
              <strong style={{ color: T.text }}>{filtered.length.toLocaleString()}</strong> records{' '}
              {hasFilters && <span style={{ color: T.indigo }}>(filtered)</span>}
            </span>

            {selected.size > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: T.indigoL,
                  border: `1px solid ${T.indigoBd}`,
                  borderRadius: 8,
                  padding: '3px 10px',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo }}>{selected.size} selected</span>
                <button
                  onClick={() => setSelected(new Set())}
                  style={{ fontSize: 10, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕ clear
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>Page Volume:</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>
              {fmt(paginated.reduce((s, p) => s + Number(p.amount || 0), 0))}
            </span>
            <span style={{ color: T.muted }}>·</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>Filtered Total:</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: T.indigo }}>{fmt(totalAmount)}</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            6. COMPACT & RESPONSIVE DATAGRID (TABLE VIEW)
           ══════════════════════════════════════════════════════════════════════ */}
        {view === 'table' && (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
            className="fade-in"
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Inter',sans-serif" }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                    <th style={{ padding: '10px 12px', width: 38 }}>
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAll}
                        style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                      <button
                        onClick={() => handleSort('receipt_number')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: sortKey === 'receipt_number' ? T.indigo : T.sub,
                        }}
                      >
                        Receipt # {sortKey === 'receipt_number' && (sortDir === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                      <button
                        onClick={() => handleSort('student')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: sortKey === 'student' ? T.indigo : T.sub,
                        }}
                      >
                        Student / Adm {sortKey === 'student' && (sortDir === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>
                      Track & Class
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleSort('amount')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          marginLeft: 'auto',
                          color: sortKey === 'amount' ? T.indigo : T.sub,
                        }}
                      >
                        Amount (KES) {sortKey === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                      <button
                        onClick={() => handleSort('payment_method')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: sortKey === 'payment_method' ? T.indigo : T.sub,
                        }}
                      >
                        Method {sortKey === 'payment_method' && (sortDir === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>
                      Ref / Slip / Code
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                      <button
                        onClick={() => handleSort('payment_date')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: sortKey === 'payment_date' ? T.indigo : T.sub,
                        }}
                      >
                        Date {sortKey === 'payment_date' && (sortDir === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>
                      Term
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.sub }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.indigo, fontWeight: 700 }}>
                          <FiRefreshCw className="animate-spin" />
                          <span>Loading financial transactions from live database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>🔍</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>No payment records found</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                          Try clearing or adjusting search filters to locate transactions.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p, idx) => {
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
                          {/* Checkbox */}
                          <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggleSelectOne(p.id)}
                              style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }}
                            />
                          </td>

                          {/* Receipt # */}
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: 800,
                                color: T.indigo,
                                background: T.indigoL,
                                border: `1px solid ${T.indigoBd}`,
                                padding: '2px 7px',
                                borderRadius: 6,
                              }}
                            >
                              {p.receipt_number || `REC-${p.id}`}
                            </span>
                          </td>

                          {/* Student Info */}
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 900,
                                  flexShrink: 0,
                                }}
                              >
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

                          {/* Curriculum Track & Class */}
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
                                {fName} {stName}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 99,
                                  width: 'fit-content',
                                  border: '1px solid',
                                }}
                                className={badgeColor}
                              >
                                {curLabel}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>
                              {fmt(Number(p.amount || 0))}
                            </span>
                          </td>

                          {/* Method */}
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: meta.bg,
                                color: meta.text,
                                fontSize: 10,
                                fontWeight: 800,
                                border: `1px solid ${meta.dot}40`,
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                              <span>{meta.icon}</span>
                              <span>{p.payment_method || 'Cash'}</span>
                            </span>
                          </td>

                          {/* Ref / Code */}
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.sub }}>
                              {p.mpesa_code || p.reference_number || p.bank_name || '—'}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>{fmtDate(p.payment_date)}</span>
                          </td>

                          {/* Term (Intelligently resolved, NEVER blank) */}
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#6d28d9',
                                background: '#faf5ff',
                                border: '1px solid #ddd6fe',
                                padding: '2px 7px',
                                borderRadius: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {termInfo.name}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              {/* Thermal Print */}
                              <button
                                onClick={() => handlePrintThermalReceipt(p)}
                                title="Print 80mm Cashier Thermal Receipt"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid ${T.border}`,
                                  background: T.card,
                                  color: T.green,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiPrinter size={13} />
                              </button>

                              {/* Official A4 Voucher Print */}
                              <button
                                onClick={() => handlePrintA4Receipt(p)}
                                title="Print Official A4 Voucher Receipt"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid #bfdbfe`,
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiFileText size={13} />
                              </button>

                              {/* WhatsApp Dispatch */}
                              <button
                                onClick={() => handleSendWhatsAppReceipt(p)}
                                title="Send Official Receipt via WhatsApp"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid #bbf7d0`,
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiShare2 size={13} />
                              </button>

                              {/* Preview Details */}
                              <button
                                onClick={() => setPreviewPayment(p)}
                                title="View Full Receipt Details"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid ${T.border}`,
                                  background: T.card,
                                  color: T.indigo,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiEye size={13} />
                              </button>

                              {/* Edit Modal */}
                              <button
                                onClick={() => setEditModalData({ open: true, payment: p })}
                                title="Edit Payment"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid ${T.border}`,
                                  background: T.card,
                                  color: T.amber,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiEdit2 size={13} />
                              </button>

                              {/* Void / Delete */}
                              <button
                                onClick={() => handleDelete(p.id)}
                                title="Void/Delete Payment"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 7,
                                  border: `1px solid ${T.border}`,
                                  background: T.card,
                                  color: T.red,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Sticky Summary Footer */}
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
                          Ledger Total: <strong style={{ color: T.indigo }}>{fmt(totalAmount)}</strong>
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── Compact Pagination Bar ── */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: '10px 18px',
                  borderTop: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                }}
              >
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: `1px solid ${T.border}`,
                      background: T.card,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.sub,
                      opacity: page === 1 ? 0.4 : 1,
                    }}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: `1px solid ${T.border}`,
                      background: T.card,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.sub,
                      opacity: page === 1 ? 0.4 : 1,
                    }}
                  >
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
                          border: `1px solid ${page === pg ? T.indigo : T.border}`,
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

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: `1px solid ${T.border}`,
                      background: T.card,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.sub,
                      opacity: page === totalPages ? 0.4 : 1,
                    }}
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      border: `1px solid ${T.border}`,
                      background: T.card,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.sub,
                      opacity: page === totalPages ? 0.4 : 1,
                    }}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            7. CARD / GRID VIEW
           ══════════════════════════════════════════════════════════════════════ */}
        {view === 'grid' && (
          <div className="fade-in">
            {paginated.length === 0 ? (
              <div
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding: 40,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 800, color: T.text }}>No payment cards found</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
                  {paginated.map((p) => {
                    const s = students.find((st) => st.id === p.student_id);
                    const fName = s ? getFormName(s.form_id) : '—';
                    const { label: curLabel, badgeColor } = detectCurriculum(fName);
                    const termInfo = resolvePaymentTerm(p);
                    const meta = getMethodMeta(p.payment_method);
                    const isSel = selected.has(p.id);

                    return (
                      <div
                        key={p.id}
                        className="pay-card"
                        onClick={() => setPreviewPayment(p)}
                        style={{
                          background: T.card,
                          border: `1.5px solid ${isSel ? T.indigo : T.border}`,
                          borderRadius: 16,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          transition: 'all 0.16s ease',
                        }}
                      >
                        <div style={{ height: 4, background: meta.dot }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                background: meta.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                              }}
                            >
                              {meta.icon}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handlePrintThermalReceipt(p)}
                                title="Print Thermal Receipt"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  background: T.bg,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                }}
                              >
                                🖨️
                              </button>
                              <button
                                onClick={() => handlePrintA4Receipt(p)}
                                title="Print Official A4 Voucher"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  border: `1px solid #bfdbfe`,
                                  background: '#eff6ff',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                }}
                              >
                                📄
                              </button>
                              <button
                                onClick={() => handleSendWhatsAppReceipt(p)}
                                title="WhatsApp Receipt"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  background: T.bg,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                }}
                              >
                                💬
                              </button>
                              <button
                                onClick={() => setEditModalData({ open: true, payment: p })}
                                title="Edit"
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  background: T.bg,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                }}
                              >
                                ✏️
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: 18, fontWeight: 900, color: T.green, letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {fmt(Number(p.amount || 0))}
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s ? `${s.first_name} ${s.last_name}` : 'Unknown Student'}
                          </div>
                          <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', marginTop: 1 }}>
                            {s?.admission_no || s?.admission_number || '—'} · {fName}
                          </div>

                          <div
                            style={{
                              borderTop: `1px solid ${T.border}`,
                              marginTop: 10,
                              paddingTop: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 99,
                                border: '1px solid',
                              }}
                              className={badgeColor}
                            >
                              {curLabel}
                            </span>
                            <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{fmtDate(p.payment_date)}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: T.indigo, fontWeight: 700, background: T.indigoL, padding: '1px 6px', borderRadius: 5 }}>
                              {p.receipt_number || `REC-${p.id}`}
                            </span>
                            <span style={{ fontSize: 10, color: '#6d28d9', fontWeight: 700 }}>
                              {termInfo.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.card,
                        color: T.sub,
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        opacity: page === 1 ? 0.4 : 1,
                      }}
                    >
                      ← Prev
                    </button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.card,
                        color: T.sub,
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        opacity: page === totalPages ? 0.4 : 1,
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            8. ANALYTICS FULL VIEW
           ══════════════════════════════════════════════════════════════════════ */}
        {view === 'analytics' && (
          <div className="fade-in">
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: '20px 24px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
                Class & Form Collections Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {forms.map((f) => {
                  const formPays = payments.filter((p) => {
                    const s = students.find((st) => st.id === p.student_id);
                    return s && s.form_id === f.id;
                  });
                  const sum = formPays.reduce((acc, p) => acc + Number(p.amount || 0), 0);
                  const { label: curLabel, badgeColor } = detectCurriculum(f.form_name);

                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1px solid ${T.border}`,
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>{f.form_name}</span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 99,
                            border: '1px solid',
                          }}
                          className={badgeColor}
                        >
                          {curLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: T.green }}>{fmt(sum)}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{formPays.length} recorded payments</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* ══════════════════════════════════════════════════════════════════════
          9. EDIT PAYMENT MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {editModalData.open && editModalData.payment && (
        <EditPaymentModal
          payment={editModalData.payment}
          onClose={() => setEditModalData({ open: false, payment: null })}
          onSave={handleSaveEdit}
          terms={terms}
          students={students}
          getFormName={getFormName}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          10. RECEIPT PREVIEW MODAL
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
          onWhatsApp={() => {
            handleSendWhatsAppReceipt(previewPayment);
            setPreviewPayment(null);
          }}
          onCopy={() => handleCopyReceipt(previewPayment)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          11. FAST PAYMENT SETTLEMENT MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {isFastCollectOpen && (
        <UltraPaymentModal
          isOpen={isFastCollectOpen}
          onClose={() => setIsFastCollectOpen(false)}
          student={students[0] || null}
          fees={students[0] ? getStudentFeeProfile(students[0].id) : ({} as any)}
          receiptNo={`REC-${Date.now().toString().slice(-6)}`}
          getFormName={getFormName}
          getStreamName={getStreamName}
          onSubmit={handleFastCollectSubmit}
          isSubmitting={isSubmittingFastPay}
          terms={terms}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUBCOMPONENT: EDIT PAYMENT MODAL
   ══════════════════════════════════════════════════════════════════════════════ */
function EditPaymentModal({
  payment,
  onClose,
  onSave,
  terms,
  students,
  getFormName,
}: {
  payment: any;
  onClose: () => void;
  onSave: (data: any) => void;
  terms: any[];
  students: any[];
  getFormName: (id: number) => string;
}) {
  const s = students.find((st) => st.id === payment.student_id);
  const [form, setForm] = useState({
    amount: payment.amount || '',
    payment_method: payment.payment_method || 'Cash',
    reference_number: payment.reference_number || '',
    mpesa_code: payment.mpesa_code || '',
    bank_name: payment.bank_name || '',
    payment_date: payment.payment_date || '',
    term_id: payment.term_id || '',
    notes: payment.notes || '',
    received_by: payment.received_by || '',
  });

  const inpStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1.5px solid #e2e8f0',
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
  };

  const lblStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  };

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
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>
              Edit Payment Record
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {s ? `${s.first_name} ${s.last_name}` : 'Student'} · {payment.receipt_number || `REC-${payment.id}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: 16,
              color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lblStyle}>Amount (KES)</label>
              <input
                type="number"
                style={inpStyle}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label style={lblStyle}>Payment Date</label>
              <input
                type="date"
                style={inpStyle}
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={lblStyle}>Payment Method</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'].map((m) => {
                const active = form.payment_method === m;
                const meta = getMethodMeta(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_method: m }))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${active ? meta.dot : '#e2e8f0'}`,
                      background: active ? meta.bg : '#ffffff',
                      color: active ? meta.text : '#64748b',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {meta.icon} {m}
                  </button>
                );
              })}
            </div>
          </div>

          {form.payment_method === 'M-Pesa' && (
            <div>
              <label style={lblStyle}>M-Pesa Confirmation Code</label>
              <input
                style={inpStyle}
                placeholder="e.g. SLK89X42A"
                value={form.mpesa_code}
                onChange={(e) => setForm((f) => ({ ...f, mpesa_code: e.target.value.toUpperCase() }))}
              />
            </div>
          )}

          {(form.payment_method === 'Bank Transfer' || form.payment_method === 'Bank') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lblStyle}>Bank Name</label>
                <input
                  style={inpStyle}
                  placeholder="KCB, Equity, Co-op..."
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                />
              </div>
              <div>
                <label style={lblStyle}>Slip Reference #</label>
                <input
                  style={inpStyle}
                  placeholder="Deposit ref"
                  value={form.reference_number}
                  onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lblStyle}>Academic Term</label>
              <select
                style={{ ...inpStyle, cursor: 'pointer' }}
                value={form.term_id}
                onChange={(e) => setForm((f) => ({ ...f, term_id: e.target.value }))}
              >
                <option value="">— Select Term —</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Received By</label>
              <input
                style={inpStyle}
                placeholder="Bursar name"
                value={form.received_by}
                onChange={(e) => setForm((f) => ({ ...f, received_by: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={lblStyle}>Notes / Remarks</label>
            <textarea
              style={{ ...inpStyle, resize: 'none', height: 60 }}
              placeholder="Additional cashier details..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...payment, ...form })}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(79,70,229,0.3)',
            }}
          >
            Save Changes ✓
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUBCOMPONENT: RECEIPT PREVIEW MODAL
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
  onWhatsApp: () => void;
  onCopy: () => void;
}) {
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
          maxWidth: 440,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with channel color */}
        <div
          style={{
            background: meta.bg,
            borderBottom: `2px solid ${meta.dot}30`,
            padding: '20px 20px 16px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 8px',
              boxShadow: `0 4px 12px ${meta.dot}30`,
            }}
          >
            {meta.icon}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>
            Official Fee Payment Receipt
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#4f46e5', marginTop: 2 }}>
            {payment.receipt_number || `REC-${payment.id}`}
          </div>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 26,
              height: 26,
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

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Big Amount Card */}
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
              Amount Received
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#14532d', letterSpacing: '-0.02em', marginTop: 2 }}>
              {fmt(Number(payment.amount || 0))}
            </div>
          </div>

          {/* Key Facts */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              ['Student', student ? `${student.first_name} ${student.last_name}` : '—'],
              ['Admission #', student?.admission_no || student?.admission_number || '—'],
              ['Curriculum / Class', `${curLabel} · ${formName}`],
              ['Academic Term', term.name],
              ['Payment Date', fmtDateLong(payment.payment_date)],
              ['Method', payment.payment_method || 'Cash'],
              ...(payment.mpesa_code ? [['M-Pesa Code', payment.mpesa_code]] : []),
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
                    color: k === 'M-Pesa Code' ? '#15803d' : '#0f172a',
                    fontFamily: k === 'M-Pesa Code' ? 'monospace' : "'Inter',sans-serif",
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
                Student Fee Balance Summary
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
        <div style={{ padding: '0 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            onClick={onCopy}
            style={{
              flex: 1,
              minWidth: 70,
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
              minWidth: 90,
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
              minWidth: 100,
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
            🖨️ Thermal 80mm
          </button>
          <button
            onClick={onPrintA4}
            style={{
              flex: 1,
              minWidth: 100,
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
            📄 Official A4
          </button>
        </div>
      </div>
    </div>
  );
}

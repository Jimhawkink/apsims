'use client';

import { useFeeData, fmt } from './useFeeData';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { exportUltraFeeLedgerExcel } from '@/components/fees/UltraFeeLedgerExport';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler, RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  FiTrendingUp, FiTrendingDown, FiCreditCard, FiUsers, FiAlertTriangle,
  FiArrowRight, FiRefreshCw, FiActivity, FiCheckCircle, FiZap,
  FiDollarSign, FiBarChart2, FiPieChart, FiCalendar, FiClock,
  FiAward, FiTarget, FiShield, FiBookOpen, FiStar, FiPrinter,
  FiDownload, FiFilter, FiSearch, FiChevronLeft, FiChevronRight,
  FiX, FiFileText, FiPhone, FiCheck, FiLayers, FiSliders,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

/* ══════════════════════════════════════════════════════════════
   HELPERS & FORMATTERS
══════════════════════════════════════════════════════════════ */
const KES   = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const KESM  = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString()}`;
};
const pct   = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const today = new Date().toISOString().split('T')[0];

const C = {
  indigo: '#4f46e5', indigoL: '#eef2ff', indigoBd: '#c7d2fe',
  green:  '#16a34a', greenL:  '#f0fdf4', greenBd:  '#bbf7d0',
  red:    '#dc2626', redL:    '#fef2f2', redBd:    '#fecaca',
  amber:  '#d97706', amberL:  '#fffbeb', amberBd:  '#fde68a',
  blue:   '#2563eb', blueL:   '#eff6ff', blueBd:   '#bfdbfe',
  purple: '#7c3aed', purpleL: '#faf5ff', purpleBd: '#ddd6fe',
  teal:   '#0d9488', tealL:   '#f0fdfa', tealBd:   '#99f6e4',
  pink:   '#db2777', pinkL:   '#fdf4ff', pinkBd:   '#f5d0fe',
  slate:  '#64748b', slateL:  '#f8fafc', slateBd:  '#e2e8f0',
};
const CHART_PALETTE = ['#4f46e5', '#16a34a', '#0ea5e9', '#d97706', '#8b5cf6', '#ef4444', '#0d9488', '#db2777'];

/* ══════════════════════════════════════════════════════════════
   MINI UI COMPONENTS
══════════════════════════════════════════════════════════════ */
function KPICard({ label, value, sub, color, colorL, colorBd, icon, trend, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-2.5 shadow-2xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-xs' : ''
      }`}
      style={{ borderColor: colorBd || '#e2e8f0' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate mr-1">{label}</span>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs"
          style={{ background: colorL || '#f1f5f9' }}
        >
          {icon}
        </div>
      </div>
      <div className="mt-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className="text-sm font-extrabold font-mono tracking-tight" style={{ color: color || '#0f172a' }}>
            {value}
          </p>
          {trend !== undefined && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
              style={{
                background: trend >= 0 ? C.greenL : C.redL,
                color: trend >= 0 ? C.green : C.red,
              }}
            >
              {trend >= 0 ? '▲' : '▼'}{Math.abs(trend)}%
            </span>
          )}
        </div>
        {sub && <p className="text-[9.5px] text-slate-400 font-medium truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHead({ icon, title, sub, right }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: C.indigoL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: '#0f172a', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {sub && <div style={{ fontSize: 10, color: C.slate, marginTop: 1, fontWeight: 500 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function PBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height, width: `${Math.min(100, Math.max(0, value))}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color, background: bg, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
  );
}

function HealthRing({ score }: { score: number }) {
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  const label = score >= 75 ? 'EXCELLENT' : score >= 50 ? 'FAIR' : 'CRITICAL';
  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="115" height="115" viewBox="0 0 115 115">
        <circle cx="57.5" cy="57.5" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle
          cx="57.5" cy="57.5" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 57.5 57.5)" style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
        <text x="57.5" y="54" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a" fontFamily="Outfit,sans-serif">{score}</text>
        <text x="57.5" y="69" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.slate} fontFamily="Inter,sans-serif">/ 100</text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
      <div style={{ fontSize: 9, color: C.slate, textAlign: 'center' }}>Fiscal Health Score</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function FeeDashboardPage() {
  const { forms, streams, students, payments, structures, terms, loading, fetchAll, currentTerm, getStudentFees, getFormName, getStreamName } = useFeeData();
  const currentYear = new Date().getFullYear();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [schoolDetails, setSchoolDetails] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'ledger' | 'structures' | 'transactions' | 'defaulters' | 'modules'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Curriculum Filter: 'all' | '8-4-4' | 'cbc' | 'jss'
  const [curriculumFilter, setCurriculumFilter] = useState<'all' | '8-4-4' | 'cbc' | 'jss'>('all');

  // Ledger Search & Pagination
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'cleared' | 'partial' | 'owing'>('all');
  const [ledgerFormFilter, setLedgerFormFilter] = useState<string>('all');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const pageSize = ledgerPageSize;

  // Transactions Tab Search & Pagination
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txMethodFilter, setTxMethodFilter] = useState('');

  // Defaulters Tab Search & Pagination
  const [defSearch, setDefSearch] = useState('');
  const [defPage, setDefPage] = useState(1);
  const [defTrackFilter, setDefTrackFilter] = useState<'all' | '8-4-4' | 'cbc'>('all');

  // Clearance Voucher Modal State
  const [voucherStudent, setVoucherStudent] = useState<any>(null);

  useEffect(() => {
    const fetchAux = async () => {
      const [{ data: inc }, { data: exp }, { data: det }] = await Promise.all([
        supabase.from('school_income').select('amount').eq('year', currentYear),
        supabase.from('school_expenses').select('amount,status').eq('year', currentYear),
        supabase
          .from('school_details')
          .select('*')
          .neq('section', 'primary')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      setTotalIncome((inc || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0));
      setTotalExpenses((exp || []).filter((e: any) => (e.status || 'approved') === 'approved').reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
      if (det) setSchoolDetails(det);
    };
    fetchAux();
  }, [currentYear]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success('Fee database synchronized! 🔄');
  };

  /* ─── Active Students & Curriculum Segments ─── */
  const activeStudents = useMemo(() => students.filter(s => s.status === 'Active'), [students]);

  // Tag each student with system
  const studentsWithCurriculum = useMemo(() => {
    return activeStudents.map(st => {
      const f = forms.find(fm => fm.id === st.form_id);
      const isCbcSenior = f?.education_system === 'CBC_Senior_School' || f?.form_name?.toLowerCase().includes('grade 10') || f?.form_name?.toLowerCase().includes('grade 11') || f?.form_name?.toLowerCase().includes('grade 12');
      const isJss = f?.education_system === 'Junior_Secondary' || f?.form_name?.toLowerCase().includes('grade 7') || f?.form_name?.toLowerCase().includes('grade 8') || f?.form_name?.toLowerCase().includes('grade 9');
      const isPrimary = f?.section === 'primary' || f?.education_system?.toLowerCase().includes('primary');
      const systemTag: '8-4-4' | 'CBC Senior' | 'JSS' | 'Primary CBC' = isCbcSenior ? 'CBC Senior' : isJss ? 'JSS' : isPrimary ? 'Primary CBC' : '8-4-4';
      
      const fees = getStudentFees(st.id, st.form_id);
      const totalPaid = payments.filter(p => p.student_id === st.id).reduce((s, p) => s + Number(p.amount || 0), 0);
      const balance = fees.annualBalance;
      const rate = pct(totalPaid, fees.annualTotal);
      const status: 'cleared' | 'partial' | 'owing' = balance === 0 ? 'cleared' : totalPaid > 0 ? 'partial' : 'owing';

      return {
        ...st,
        formName: f?.form_name || 'Unassigned',
        streamName: getStreamName(st.stream_id),
        systemTag,
        totalPaid,
        annualTotal: fees.annualTotal,
        balance,
        rate,
        status,
      };
    });
  }, [activeStudents, forms, payments, getStudentFees, getStreamName]);

  // Filtered by top Curriculum Segment
  const filteredStudents = useMemo(() => {
    if (curriculumFilter === '8-4-4') return studentsWithCurriculum.filter(s => s.systemTag === '8-4-4');
    if (curriculumFilter === 'cbc') return studentsWithCurriculum.filter(s => s.systemTag === 'CBC Senior');
    if (curriculumFilter === 'jss') return studentsWithCurriculum.filter(s => s.systemTag === 'JSS');
    return studentsWithCurriculum;
  }, [studentsWithCurriculum, curriculumFilter]);

  /* ─── Core Filtered Metrics ─── */
  const totalCollected = useMemo(() => {
    const studentIds = new Set(filteredStudents.map(s => s.id));
    return payments.filter(p => studentIds.has(p.student_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments, filteredStudents]);

  const totalExpected = useMemo(() => {
    return filteredStudents.reduce((s, st) => s + st.annualTotal, 0);
  }, [filteredStudents]);

  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = pct(totalCollected, totalExpected);
  const studentsOwing = useMemo(() => filteredStudents.filter(s => s.balance > 0).length, [filteredStudents]);
  const studentsCleared = filteredStudents.length - studentsOwing;
  const netPosition = (totalCollected + totalIncome) - totalExpenses;

  // Curriculum breakdown metrics
  const cbcTotalCollected = useMemo(() => {
    const cbcIds = new Set(studentsWithCurriculum.filter(s => s.systemTag.includes('CBC') || s.systemTag === 'JSS').map(s => s.id));
    return payments.filter(p => cbcIds.has(p.student_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments, studentsWithCurriculum]);

  const eightFourTotalCollected = useMemo(() => {
    const eightIds = new Set(studentsWithCurriculum.filter(s => s.systemTag === '8-4-4').map(s => s.id));
    return payments.filter(p => eightIds.has(p.student_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments, studentsWithCurriculum]);

  /* ─── Time-scoped Intake ─── */
  const todayPays = payments.filter(p => p.payment_date === today);
  const todayTotal = todayPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const monthStart = new Date(currentYear, new Date().getMonth(), 1);
  const monthPays = payments.filter(p => new Date(p.payment_date) >= monthStart);
  const monthTotal = monthPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const daysElapsed = new Date().getDate();
  const velocity = daysElapsed > 0 ? Math.round(monthTotal / daysElapsed) : 0;
  const daysInMonth = new Date(currentYear, new Date().getMonth() + 1, 0).getDate();
  const projected = velocity * daysInMonth;

  /* ─── 12-Month Trend Line ─── */
  const monthly12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const m = d.getMonth(), y = d.getFullYear();
    const amt = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { month: d.toLocaleString('en', { month: 'short' }), year: String(y).slice(2), amount: amt };
  }), [payments]);

  /* ─── Method Breakdown ─── */
  const methodMap = useMemo(() => {
    const r: Record<string, { count: number; total: number }> = {};
    payments.forEach(p => {
      const m = (p.payment_method || 'Other').replace(/\s*\(.+\)/, '');
      if (!r[m]) r[m] = { count: 0, total: 0 };
      r[m].count++;
      r[m].total += Number(p.amount || 0);
    });
    return Object.entries(r).sort((a, b) => b[1].total - a[1].total);
  }, [payments]);

  /* ─── Daily 30 days ─── */
  const daily30 = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const ds = d.toISOString().split('T')[0];
    const amt = payments.filter(p => p.payment_date === ds).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), amount: amt, isToday: ds === today };
  }), [payments]);

  /* ─── Per-Form Collection Summary (CBC + 8-4-4) ─── */
  const formCollection = useMemo(() => forms.map(form => {
    const fSts = studentsWithCurriculum.filter(s => s.form_id === form.id);
    const collected = fSts.reduce((s, st) => s + st.totalPaid, 0);
    const expected = fSts.reduce((s, st) => s + st.annualTotal, 0);
    const rate = pct(collected, expected);
    const owing = fSts.filter(st => st.balance > 0).length;
    return {
      id: form.id,
      name: form.form_name,
      system: form.education_system || '8-4-4',
      isCbc: form.education_system?.includes('CBC') || form.form_name.includes('Grade'),
      collected,
      expected,
      balance: Math.max(0, expected - collected),
      students: fSts.length,
      rate,
      owing,
    };
  }).filter(f => f.students > 0).sort((a, b) => b.rate - a.rate), [forms, studentsWithCurriculum]);

  /* ─── Aging Buckets ─── */
  const aging = useMemo(() => {
    const buckets = { d0: 0, d30: 0, d60: 0, d90: 0, d180: 0 };
    const now = new Date();
    filteredStudents.forEach(st => {
      if (st.balance <= 0) return;
      const lastPay = payments.filter(p => p.student_id === st.id).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
      const days = lastPay ? Math.floor((now.getTime() - new Date(lastPay.payment_date).getTime()) / 86400000) : 999;
      if (days <= 30) buckets.d0 += st.balance;
      else if (days <= 60) buckets.d30 += st.balance;
      else if (days <= 90) buckets.d60 += st.balance;
      else if (days <= 180) buckets.d90 += st.balance;
      else buckets.d180 += st.balance;
    });
    return buckets;
  }, [filteredStudents, payments]);

  /* ─── Health Score (0-100) ─── */
  const healthScore = useMemo(() => {
    let score = 0;
    score += Math.min(40, collectionRate * 0.4);
    score += studentsCleared / Math.max(filteredStudents.length, 1) * 20;
    score += netPosition >= 0 ? 20 : 0;
    score += Math.min(20, pct(monthTotal, projected) * 0.2);
    return Math.round(Math.min(100, Math.max(10, score)));
  }, [collectionRate, studentsCleared, filteredStudents.length, netPosition, monthTotal, projected]);

  /* ─── Paginated & Filtered Student Ledger ─── */
  const ledgerFiltered = useMemo(() => {
    return filteredStudents.filter(st => {
      const matchSearch = ledgerSearch === '' ||
        `${st.first_name} ${st.last_name}`.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        String(st.admission_number || st.admission_no || '').includes(ledgerSearch) ||
        String(st.guardian_phone || '').includes(ledgerSearch);

      const matchStatus = ledgerStatusFilter === 'all' || st.status === ledgerStatusFilter;
      const matchForm = ledgerFormFilter === 'all' || String(st.form_id) === ledgerFormFilter;

      return matchSearch && matchStatus && matchForm;
    });
  }, [filteredStudents, ledgerSearch, ledgerStatusFilter, ledgerFormFilter]);

  const totalLedgerPages = Math.max(1, Math.ceil(ledgerFiltered.length / pageSize));
  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * pageSize;
    return ledgerFiltered.slice(start, start + pageSize);
  }, [ledgerFiltered, ledgerPage]);

  /* ─── Defaulters Sorted ─── */
  const worstDefaulters = useMemo(() => {
    return [...filteredStudents].filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
  }, [filteredStudents]);

  /* ══════════════════════════════════════════════════════════════
     ENTERPRISE MULTI-SHEET EXCEL WORKBOOK EXPORT
  ══════════════════════════════════════════════════════════════ */
  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading('Generating enterprise 3-sheet Excel workbook with official letterhead...');
      await exportUltraFeeLedgerExcel({
        schoolName: schoolDetails?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT",
        schoolMotto: schoolDetails?.school_motto || "Excellence in Education",
        termName: `Academic Year ${currentYear}`,
        students: ledgerFiltered.map((s) => ({
          admission_number: s.admission_number || s.admission_no,
          first_name: s.first_name,
          last_name: s.last_name,
          formName: s.formName,
          streamName: s.streamName,
          systemTag: s.systemTag,
          annualTotal: s.annualTotal,
          totalPaid: s.totalPaid,
          balance: s.balance,
          rate: s.rate,
          guardian_phone: s.guardian_phone,
        })),
        classSummaries: formCollection.map((fc) => ({
          formName: fc.name,
          systemTag: fc.system,
          studentCount: fc.students,
          expected: fc.expected,
          collected: fc.collected,
          arrears: fc.balance,
          recoveryRate: fc.rate,
        })),
      });
      toast.success('Official 3-sheet Excel workbook exported with registered school branding! ✓', { id: toastId });
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel workbook: ' + (err?.message || 'Error occurred'));
    }
  };

  /* ══════════════════════════════════════════════════════════════
     PRINT SUMMARY & CLEARANCE ACTIONS
  ══════════════════════════════════════════════════════════════ */
  const handlePrintSummary = () => {
    window.print();
  };

  const openClearanceVoucher = (st: any) => {
    setVoucherStudent(st);
  };

  /* ─── Chart Data ─── */
  const lineData = {
    labels: monthly12.map(m => `${m.month}'${m.year}`),
    datasets: [{
      label: 'Collections',
      data: monthly12.map(m => m.amount),
      borderColor: C.indigo,
      backgroundColor: 'rgba(79,70,229,0.08)',
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      pointBorderColor: C.indigo,
      pointBorderWidth: 2,
    }],
  };

  const doughnutData = {
    labels: methodMap.map(([m]) => m),
    datasets: [{
      data: methodMap.map(([, v]) => v.total),
      backgroundColor: CHART_PALETTE,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const barDaily = {
    labels: daily30.map(d => d.day),
    datasets: [{
      label: 'Intake (KES)',
      data: daily30.map(d => d.amount),
      backgroundColor: daily30.map(d => d.isToday ? C.indigo : 'rgba(99,102,241,0.35)'),
      borderRadius: 4,
      hoverBackgroundColor: C.indigo,
    }],
  };

  const formBarData = {
    labels: formCollection.map(f => f.name),
    datasets: [
      { label: 'Expected', data: formCollection.map(f => f.expected), backgroundColor: 'rgba(79,70,229,0.2)', borderColor: C.indigo, borderWidth: 1.5, borderRadius: 5 },
      { label: 'Collected', data: formCollection.map(f => f.collected), backgroundColor: 'rgba(22,163,74,0.7)', borderColor: C.green, borderWidth: 1.5, borderRadius: 5 },
    ],
  };

  const agingBarData = {
    labels: ['0–30 days', '31–60 days', '61–90 days', '91–180 days', '180+ days'],
    datasets: [{
      label: 'Outstanding KES',
      data: [aging.d0, aging.d30, aging.d60, aging.d90, aging.d180],
      backgroundColor: ['rgba(22,163,74,0.7)', 'rgba(217,119,6,0.7)', 'rgba(234,88,12,0.7)', 'rgba(220,38,38,0.7)', 'rgba(127,29,29,0.85)'],
      borderRadius: 6,
    }],
  };

  const chartOpts = (label = 'KES'): any => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleFont: { size: 10, weight: 'bold' as const },
        bodyFont: { size: 10 },
        padding: 7,
        cornerRadius: 8,
        callbacks: {
          label: (c: any) => `KES ${Number(c.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          callback: (v: any) => `${(Number(v) / 1000).toFixed(0)}K`,
          font: { size: 9, family: 'monospace' },
          color: '#94a3b8',
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 9, weight: 'bold' as const }, color: '#64748b' },
      },
    },
  });

  // Transactions Tab Filtering & Pagination (Strictly 10 rows)
  const filteredTx = useMemo(() => {
    let list = [...payments];
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase().trim();
      list = list.filter((p) => {
        const st = students.find((s) => s.id === p.student_id);
        const name = st ? `${st.first_name} ${st.last_name}`.toLowerCase() : '';
        const adm = (st?.admission_no || st?.admission_number || '').toString().toLowerCase();
        const rcpt = (p.receipt_number || '').toLowerCase();
        const m = (p.payment_method || '').toLowerCase();
        return name.includes(q) || adm.includes(q) || rcpt.includes(q) || m.includes(q);
      });
    }
    if (txMethodFilter) {
      list = list.filter((p) => (p.payment_method || 'Cash').toLowerCase() === txMethodFilter.toLowerCase());
    }
    return list;
  }, [payments, students, txSearch, txMethodFilter]);

  const paginatedTx = useMemo(() => {
    const start = (txPage - 1) * 10;
    return filteredTx.slice(start, start + 10);
  }, [filteredTx, txPage]);

  const totalTxPages = Math.max(1, Math.ceil(filteredTx.length / 10));

  // Defaulters Tab Filtering & Pagination (Strictly 10 rows)
  const filteredDefaulters = useMemo(() => {
    let list = [...worstDefaulters];
    if (defSearch.trim()) {
      const q = defSearch.toLowerCase().trim();
      list = list.filter((st) => {
        const name = `${st.first_name} ${st.last_name}`.toLowerCase();
        const adm = (st.admission_number || st.admission_no || '').toString().toLowerCase();
        const f = (st.formName || '').toLowerCase();
        return name.includes(q) || adm.includes(q) || f.includes(q);
      });
    }
    if (defTrackFilter !== 'all') {
      list = list.filter((st) =>
        defTrackFilter === 'cbc'
          ? st.systemTag?.includes('CBC') || st.formName?.includes('Grade')
          : !st.systemTag?.includes('CBC') && !st.formName?.includes('Grade')
      );
    }
    return list;
  }, [worstDefaulters, defSearch, defTrackFilter]);

  const paginatedDefaulters = useMemo(() => {
    const start = (defPage - 1) * 10;
    return filteredDefaulters.slice(start, start + 10);
  }, [filteredDefaulters, defPage]);

  const totalDefPages = Math.max(1, Math.ceil(filteredDefaulters.length / 10));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 bg-[#edf3fb]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-bounce">
          <FiDollarSign size={24} />
        </div>
        <p className="font-bold text-xs text-slate-600 tracking-wider uppercase font-mono">
          Connecting Financial Command Centre &amp; Live Ledgers...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-10 max-w-[1400px] mx-auto text-slate-800" style={{ fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}>
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          PRINT-ONLY WATERMARK & HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block p-8 bg-white border-b-2 border-slate-800 mb-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}</h1>
          <p className="text-xs font-bold text-slate-500 italic uppercase">"{schoolDetails.school_motto || 'Excellence in Education'}"</p>
          <p className="text-xs font-mono text-slate-700">P.O. BOX {schoolDetails.postal_address || '112 BOMET'}, {schoolDetails.county || 'Bomet'}</p>
          <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between text-xs font-bold text-slate-600">
            <span>OFFICIAL FINANCIAL LEDGER &amp; REVENUE SUMMARY</span>
            <span>ACADEMIC YEAR: {currentYear} · {currentTerm?.term_name || 'Term 3'}</span>
            <span>DATE: {new Date().toLocaleDateString('en-KE')}</span>
          </div>
        </div>
      </div>

      {/* ═══ 1. COMPACT EXECUTIVE COMMAND HEADER (Light & Tight Like Fee Structure) ═══ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
              💰
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Financial Command Centre &amp; Fees Desk
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                {currentTerm && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{currentTerm.term_name} · {currentYear}</span>
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthScore >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-amber-50 text-amber-700 border-amber-200/80'}`}>
                  ⚡ Fiscal Health: {healthScore}/100
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {activeStudents.length} Active Learners · CBC Senior &amp; 8-4-4 Dual-Track · Official Audit Stream
              </p>
            </div>
          </div>

          {/* Super Premium Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/fees/collect"
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
            >
              <FiDollarSign size={13} />
              <span>Collect Fee</span>
            </Link>

            <Link
              href="/dashboard/fees/mpesa-push"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
            >
              <FiCreditCard size={13} />
              <span>KCB / M-Pesa</span>
            </Link>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export complete fee ledger to Excel"
            >
              <FiDownload size={13} className="text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrintSummary}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print official fee summary sheet"
            >
              <FiPrinter size={13} className="text-blue-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh database"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* ── Curriculum Filter Switcher & Workspace Tabs ── */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Dual-Track Curriculum Filter */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
              <FiFilter size={10} /> Track:
            </span>
            {[
              { id: 'all', label: 'All Curricula', count: activeStudents.length },
              { id: '8-4-4', label: '8-4-4 System', count: studentsWithCurriculum.filter(s => s.systemTag === '8-4-4').length },
              { id: 'cbc', label: 'CBC Senior', count: studentsWithCurriculum.filter(s => s.systemTag === 'CBC Senior').length },
              { id: 'jss', label: 'JSS (G7-9)', count: studentsWithCurriculum.filter(s => s.systemTag === 'JSS').length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setCurriculumFilter(tab.id as any); setLedgerPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  curriculumFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9.5px] px-1 rounded-full font-mono ${curriculumFilter === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Metrics Tag */}
          <div className="text-[10.5px] font-bold text-slate-500 flex items-center gap-2">
            <span>8-4-4: <strong className="text-emerald-700 font-mono">{KESM(eightFourTotalCollected)}</strong></span>
            <span>·</span>
            <span>CBC: <strong className="text-purple-700 font-mono">{KESM(cbcTotalCollected)}</strong></span>
          </div>
        </div>

        {/* ── Super Ultra-Premium Studio Segmented Tab Strip ── */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 gap-1 overflow-x-auto text-xs">
            {[
              { key: 'overview', label: '📊 Overview & Velocity', badge: 'Live', badgeBg: 'bg-emerald-100 text-emerald-800' },
              { key: 'curriculum', label: '🏫 Dual-Track CBC & 8-4-4', badge: `${studentsWithCurriculum.length}`, badgeBg: 'bg-purple-100 text-purple-800' },
              { key: 'ledger', label: '📋 Student Fee Ledger', badge: `${activeStudents.length}`, badgeBg: 'bg-indigo-100 text-indigo-800' },
              { key: 'structures', label: '🏗️ Fee Structures', badge: 'Studio', badgeBg: 'bg-sky-100 text-sky-800' },
              { key: 'transactions', label: '📲 Live Transactions', badge: `${payments.length}`, badgeBg: 'bg-emerald-100 text-emerald-800' },
              { key: 'defaulters', label: '🚨 Defaulters Recovery', badge: `${studentsOwing}`, badgeBg: 'bg-rose-100 text-rose-800' },
              { key: 'modules', label: '🗂️ All 30 Modules', badge: '30', badgeBg: 'bg-slate-200 text-slate-700' },
            ].map(t => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/25 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                      active ? 'bg-white/20 text-white' : t.badgeBg
                    }`}
                  >
                    {t.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/dashboard/fees/payments"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
            >
              <span>⚡ Payments Studio</span>
            </Link>
            <Link
              href="/dashboard/fees/structure"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
            >
              <span>🏗️ Structure Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BODY CONTENT
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3.5">

        {/* Compact Low-Profile Alert Strip */}
        {totalOutstanding > 500000 && (
          <div className="bg-rose-50/80 border border-rose-200/90 rounded-xl py-2 px-3.5 shadow-2xs flex items-center justify-between gap-3 flex-wrap print:hidden text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
              <span className="font-extrabold text-rose-900 uppercase text-[10.5px]">Arrears Alert:</span>
              <span className="text-rose-800 text-[11px]">
                <strong>{studentsOwing}</strong> learners hold outstanding arrears totalling <strong className="font-mono">{KES(totalOutstanding)}</strong> ({collectionRate}% recovery rate).
              </span>
            </div>
            <button
              onClick={() => setActiveTab('defaulters')}
              className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer shrink-0"
            >
              Defaulter Recovery →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW & INTAKE VELOCITY
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* 8 Metric Fine Compact KPI Cards (Matching Fee Structure HUD) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <KPICard
                label="Fee Revenue"
                value={KES(totalCollected)}
                icon="💰"
                color={C.green}
                colorL={C.greenL}
                colorBd={C.greenBd}
                sub={`${payments.length} verified txns`}
              />
              <KPICard
                label="Annual Expected"
                value={KES(totalExpected)}
                icon="🎯"
                color={C.indigo}
                colorL={C.indigoL}
                colorBd={C.indigoBd}
                sub={`${filteredStudents.length} active learners`}
              />
              <KPICard
                label="Arrears Due"
                value={KES(totalOutstanding)}
                icon="⏳"
                color={totalOutstanding > 0 ? C.red : C.green}
                colorL={totalOutstanding > 0 ? C.redL : C.greenL}
                colorBd={totalOutstanding > 0 ? C.redBd : C.greenBd}
                sub={`${studentsOwing} owing learners`}
              />
              <KPICard
                label="Collection Rate"
                value={`${collectionRate}%`}
                icon="⚡"
                color={collectionRate >= 70 ? C.green : collectionRate >= 40 ? C.amber : C.red}
                colorL={collectionRate >= 70 ? C.greenL : collectionRate >= 40 ? C.amberL : C.redL}
                colorBd={collectionRate >= 70 ? C.greenBd : collectionRate >= 40 ? C.amberBd : C.redBd}
                sub={`${studentsCleared} 100% cleared`}
              />
              <KPICard
                label="Today's Intake"
                value={KES(todayTotal)}
                icon="📅"
                color={C.teal}
                colorL={C.tealL}
                colorBd={C.tealBd}
                sub={`${todayPays.length} recorded today`}
              />
              <KPICard
                label="Daily Velocity"
                value={KES(velocity)}
                icon="⚡"
                color={C.blue}
                colorL={C.blueL}
                colorBd={C.blueBd}
                sub={`Proj: ${KESM(projected)}/mo`}
              />
              <KPICard
                label="CBC Senior Intake"
                value={KES(cbcTotalCollected)}
                icon="📚"
                color={C.purple}
                colorL={C.purpleL}
                colorBd={C.purpleBd}
                sub="Grade 10 senior levies"
              />
              <KPICard
                label="8-4-4 Intake"
                value={KES(eightFourTotalCollected)}
                icon="🎓"
                color={C.green}
                colorL={C.greenL}
                colorBd={C.greenBd}
                sub="Form 1 - Form 4 secondary"
              />
            </div>

            {/* Row 2: 12-Month Line Trend + Health Ring */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06)]">
                <SectionHead
                  icon={<FiTrendingUp size={15} className="text-indigo-600" />}
                  title="12-Month Revenue & Collection Momentum"
                  sub="Monthly fee intake velocity across all payment channels"
                  right={
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live Stream
                    </span>
                  }
                />
                <div className="relative w-full h-[220px]">
                  <Line data={lineData} options={chartOpts()} />
                </div>
              </div>

              <div className="lg:col-span-4 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06)] flex flex-col justify-between items-center text-center">
                <HealthRing score={healthScore} />
                <div className="w-full space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Compliance Rate:</span>
                    <strong className="text-emerald-600 font-mono">{pct(studentsCleared, filteredStudents.length)}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Net Fiscal Status:</span>
                    <strong className={netPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {netPosition >= 0 ? 'Surplus' : 'Deficit'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Average Paid / Student:</span>
                    <strong className="text-slate-800 font-mono">
                      {KES(filteredStudents.length > 0 ? Math.round(totalCollected / filteredStudents.length) : 0)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Daily Collections + Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06)]">
                <SectionHead
                  icon={<FiBarChart2 size={15} className="text-purple-600" />}
                  title="Daily Collections — Last 30 Days"
                  sub="Dark pill indicates today's intake"
                />
                <div className="relative w-full h-[200px]">
                  <Bar data={barDaily} options={chartOpts()} />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06)]">
                <SectionHead
                  icon={<FiPieChart size={15} className="text-emerald-600" />}
                  title="Payment Channel Distribution"
                  sub="M-Pesa, Bank, and Cash breakdown"
                />
                <div className="relative w-full h-[150px]">
                  {methodMap.length > 0 ? (
                    <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No payment methods recorded</div>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {methodMap.slice(0, 4).map(([m, v], i) => (
                    <div key={m} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="font-bold text-slate-700 text-xs">{m}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-slate-400 font-normal">({v.count})</span>
                        <strong className="text-slate-900">{KESM(v.total)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: CBC & 8-4-4 DUAL-TRACK ANALYSIS (SIDE-BY-SIDE)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'curriculum' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 fade-in">
            {/* Left Column (7/12): Dual-Track Performance Table */}
            <div className="lg:col-span-7 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06)] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold">
                      <FiLayers size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 tracking-tight">
                        Dual-Track Curriculum Fee Performance
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        CBC Senior School vs 8-4-4 Secondary collection recovery rates
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition"
                  >
                    <FiDownload size={11} />
                    <span>Export Breakdown</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 px-3">Class / Grade</th>
                        <th className="py-2.5 px-2">Track</th>
                        <th className="py-2.5 px-2 text-center">Students</th>
                        <th className="py-2.5 px-3 text-right">Expected</th>
                        <th className="py-2.5 px-3 text-right">Collected</th>
                        <th className="py-2.5 px-3 text-right">Arrears</th>
                        <th className="py-2.5 px-2 text-center">Rate</th>
                        <th className="py-2.5 px-3 min-w-[90px]">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formCollection.map((f) => {
                        const rc = f.rate >= 70 ? C.green : f.rate >= 40 ? C.amber : C.red;
                        return (
                          <tr key={f.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-3 font-extrabold text-slate-800 text-[11.5px]">
                              {f.name}
                            </td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black ${
                                  f.isCbc ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {f.system}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-slate-700 text-[11px]">
                              {f.students}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 text-[11px]">
                              {KES(f.expected)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-600 text-[11px]">
                              {KES(f.collected)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-rose-600 text-[11px]">
                              {KES(f.balance)}
                            </td>
                            <td className="py-2 px-2 text-center font-black font-mono text-[11px]" style={{ color: rc }}>
                              {f.rate}%
                            </td>
                            <td className="py-2 px-3">
                              <PBar value={f.rate} color={rc} height={6} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-[11px]">
                        <td className="py-2.5 px-3 font-mono">∑ TOTALS</td>
                        <td className="py-2.5 px-2 text-slate-300">DUAL</td>
                        <td className="py-2.5 px-2 text-center">{filteredStudents.length}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{KES(totalExpected)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{KES(totalCollected)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-400">{KES(totalOutstanding)}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{collectionRate}%</td>
                        <td className="py-2.5 px-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (5/12): Side-by-Side Chart & Dual-Track Insights */}
            <div className="lg:col-span-5 bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-4 shadow-[0_4px_24px_rgba(20,50,120,0.06)] flex flex-col justify-between space-y-3">
              <div>
                <SectionHead
                  icon={<FiBarChart2 size={14} className="text-blue-600" />}
                  title="Expected vs Collected by Class (KES)"
                  sub="Comparing fee recovery performance across 8-4-4 and CBC Senior School"
                />
                <div className="relative w-full h-[220px] mt-2">
                  <Bar data={formBarData} options={chartOpts()} />
                </div>
              </div>

              {/* Dual-Track Quick Insights Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                  <div className="text-[9.5px] font-bold text-purple-600 uppercase">CBC Senior Track</div>
                  <div className="text-sm font-extrabold font-mono text-purple-900 mt-0.5">
                    {KES(formCollection.filter((f) => f.isCbc).reduce((s, f) => s + f.collected, 0))}
                  </div>
                  <div className="text-[9px] text-purple-500 font-medium mt-0.5">
                    {formCollection.filter((f) => f.isCbc).length} CBC Classes
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <div className="text-[9.5px] font-bold text-blue-600 uppercase">8-4-4 Secondary</div>
                  <div className="text-sm font-extrabold font-mono text-blue-900 mt-0.5">
                    {KES(formCollection.filter((f) => !f.isCbc).reduce((s, f) => s + f.collected, 0))}
                  </div>
                  <div className="text-[9px] text-blue-500 font-medium mt-0.5">
                    {formCollection.filter((f) => !f.isCbc).length} Secondary Forms
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: SUPER ULTRA-PREMIUM STUDENT FEE LEDGER STUDIO
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ledger' && (
          <div className="space-y-3.5 fade-in">
            {/* Side-to-Side Functions Directly on Top of Data Grid */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                {/* Left Side: Search Bar + Live Status Filter Pills + Class Selector */}
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[220px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search student by name, admission no, or phone... (Ctrl+F)"
                      value={ledgerSearch}
                      onChange={(e) => {
                        setLedgerSearch(e.target.value);
                        setLedgerPage(1);
                      }}
                      className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                    />
                    {ledgerSearch && (
                      <button
                        onClick={() => {
                          setLedgerSearch('');
                          setLedgerPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Status Filter Pills */}
                  {[
                    { id: 'all', label: 'All', count: filteredStudents.length },
                    { id: 'cleared', label: '✅ Cleared', count: studentsCleared },
                    { id: 'partial', label: '⚠️ Partial', count: filteredStudents.filter((s) => s.status === 'partial').length },
                    { id: 'owing', label: '🚨 In Arrears', count: studentsOwing },
                  ].map((p) => {
                    const active = ledgerStatusFilter === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setLedgerStatusFilter(p.id as any);
                          setLedgerPage(1);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-extrabold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{p.label}</span>
                        <span
                          className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                            active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.count}
                        </span>
                      </button>
                    );
                  })}

                  {/* Class / Form Dropdown */}
                  <select
                    value={ledgerFormFilter}
                    onChange={(e) => {
                      setLedgerFormFilter(e.target.value);
                      setLedgerPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    {forms.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.form_name} ({f.education_system || '8-4-4'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right Side: Live Volume Metrics Cockpit + Rows Selector + Excel Exporter */}
                <div className="flex items-center gap-2.5 flex-wrap shrink-0 justify-between lg:justify-end">
                  {/* Volume Cockpit Badges */}
                  <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Expected:</span>
                    <span className="font-extrabold font-mono text-slate-800">{KESM(totalExpected)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Paid:</span>
                    <span className="font-extrabold font-mono text-emerald-700">{KESM(totalCollected)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Arrears:</span>
                    <span className="font-extrabold font-mono text-rose-700">{KESM(totalOutstanding)}</span>
                  </div>

                  {/* Rows Per Page Selector (Default 10 per user constraint) */}
                  <select
                    value={ledgerPageSize}
                    onChange={(e) => {
                      setLedgerPageSize(Number(e.target.value));
                      setLedgerPage(1);
                    }}
                    className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
                    title="Rows per page (strictly compact)"
                  >
                    {[10, 15, 25].map((n) => (
                      <option key={n} value={n}>
                        {n} rows / page
                      </option>
                    ))}
                  </select>

                  {/* Enterprise Multi-Sheet Excel Exporter */}
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Export 3-Sheet Enterprise Excel Workbook with St. Catherine Letterhead"
                  >
                    <FiDownload size={13} />
                    <span>Export Excel Workbook</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Elevated Datagrid Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-2.5 px-3.5">Learner Profile</th>
                      <th className="py-2.5 px-3">Class &amp; Track</th>
                      <th className="py-2.5 px-3 text-right">Annual Expected</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Settlement Status</th>
                      <th className="py-2.5 px-3 text-center print:hidden">Clearance Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          No students matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedLedger.map((st) => {
                        const statusColor =
                          st.balance === 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : st.totalPaid > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200';
                        const statusLabel = st.balance === 0 ? 'CLEARED' : st.totalPaid > 0 ? 'PARTIAL' : 'IN ARREARS';
                        const isCbc = st.systemTag.includes('CBC') || st.systemTag === 'JSS';
                        const initials = `${st.first_name?.[0] || ''}${st.last_name?.[0] || ''}`.toUpperCase() || 'S';

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Learner Avatar & Name */}
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    isCbc
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  }`}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900 text-xs leading-snug">
                                    {st.first_name} {st.last_name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    <span>Adm: {st.admission_number || st.admission_no || '—'}</span>
                                    {st.guardian_phone && (
                                      <>
                                        <span>·</span>
                                        <a
                                          href={`tel:${st.guardian_phone}`}
                                          className="text-slate-500 hover:text-indigo-600 flex items-center gap-0.5"
                                        >
                                          <FiPhone size={9} /> {st.guardian_phone}
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Class & Curriculum Track */}
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">{st.formName} {st.streamName}</div>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border inline-block mt-0.5 ${
                                  isCbc
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {st.systemTag}
                              </span>
                            </td>

                            {/* Annual Expected */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                              {KES(st.annualTotal)}
                            </td>

                            {/* Total Paid */}
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600">
                              {KES(st.totalPaid)}
                            </td>

                            {/* Balance Due */}
                            <td className="py-2.5 px-3 text-right font-mono font-black" style={{ color: st.balance > 0 ? C.red : C.green }}>
                              {KES(st.balance)}
                            </td>

                            {/* Status Chip */}
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>

                            {/* Clearance Voucher */}
                            <td className="py-2.5 px-3 text-center print:hidden">
                              <button
                                onClick={() => openClearanceVoucher(st)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition shadow-2xs flex items-center gap-1 mx-auto cursor-pointer"
                                title="Print Official Fee Clearance Voucher"
                              >
                                <FiPrinter size={11} />
                                <span>Voucher</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Compact 10-Row Pagination Bar */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <span className="text-[11px] font-medium">
                  Showing <strong>{ledgerFiltered.length > 0 ? (ledgerPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                  <strong>{Math.min(ledgerPage * pageSize, ledgerFiltered.length)}</strong> of{' '}
                  <strong>{ledgerFiltered.length.toLocaleString()}</strong> learners
                </span>

                <div className="flex items-center gap-1 font-bold">
                  <button
                    onClick={() => setLedgerPage(1)}
                    disabled={ledgerPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                    title="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    disabled={ledgerPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                    title="Previous page"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-extrabold text-slate-800">
                    Page {ledgerPage} / {totalLedgerPages}
                  </span>
                  <button
                    onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                    disabled={ledgerPage === totalLedgerPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                    title="Next page"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setLedgerPage(totalLedgerPages)}
                    disabled={ledgerPage === totalLedgerPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                    title="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: FEE STRUCTURES (CBC & 8-4-4)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'structures' && (
          <div className="space-y-4">
            <div className="bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Vote-Head Fee Structures (KICD &amp; MoE Aligned)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Active vote heads, capitation deductions, and term levies for 8-4-4 and CBC Senior School
                  </p>
                </div>
                <Link
                  href="/dashboard/fees/structure"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
                >
                  Manage Structures →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {structures.map(fs => {
                  const f = forms.find(fm => fm.id === fs.form_id);
                  const isCbc = f?.education_system?.includes('CBC') || f?.form_name?.includes('Grade');
                  return (
                    <div key={fs.id} className="p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs flex flex-col justify-between transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {fs.vote_head_name || fs.category || 'Tuition'}
                        </span>
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${isCbc ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {f ? `${f.form_name}` : 'All Classes'}
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-slate-900 font-mono">
                        {KES(fs.amount)}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                        <span>Term {fs.term_id || 'All'} · Year {fs.year || currentYear}</span>
                        <span className="font-bold text-slate-700">{isCbc ? 'CBC Levies' : '8-4-4 Standard'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: LIVE TRANSACTIONS & M-PESA STREAM
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'transactions' && (
          <div className="space-y-3.5 fade-in">
            {/* Side-to-Side Cockpit Directly on Top of Transactions Grid */}
            <div className="bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-3.5 shadow-[0_4px_24px_rgba(20,50,120,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left Side: Search + Channel Filters */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search receipt #, student name, admission #, method..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/80 focus:bg-white outline-none transition"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: '', label: 'All Methods' },
                    { id: 'M-Pesa', label: '📱 M-Pesa' },
                    { id: 'Bank Transfer', label: '🏦 Bank' },
                    { id: 'Cash', label: '💵 Cash' },
                  ].map((m) => {
                    const active = txMethodFilter === m.id;
                    const count = m.id
                      ? payments.filter((p) => (p.payment_method || '').toLowerCase().includes(m.id.toLowerCase())).length
                      : payments.length;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setTxMethodFilter(m.id);
                          setTxPage(1);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                          active
                            ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{m.label}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded-full ${active ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Totals Badges & Link */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Filtered:</span>
                  <span className="font-extrabold font-mono text-emerald-700">
                    {KES(filteredTx.reduce((s, p) => s + Number(p.amount || 0), 0))}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredTx.length} records</span>
                </div>

                <Link
                  href="/dashboard/fees/payments"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Studio Workspace →</span>
                </Link>
              </div>
            </div>

            {/* Non-Long Paginated 10-Row Transactions Table */}
            <div className="bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-4">Receipt No</th>
                      <th className="py-2.5 px-4">Student Name &amp; Adm</th>
                      <th className="py-2.5 px-4">Method &amp; Ref</th>
                      <th className="py-2.5 px-4">Payment Date</th>
                      <th className="py-2.5 px-4 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTx.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          No transactions found matching your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedTx.map((p) => {
                        const st = students.find((s) => s.id === p.student_id);
                        return (
                          <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                              {p.receipt_number || `REC-${p.id}`}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-extrabold text-slate-800">
                                {st ? `${st.first_name} ${st.last_name}` : 'Unknown Student'}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Adm: {st?.admission_no || st?.admission_number || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {p.payment_method || 'Cash'}
                              </span>
                              {(p.mpesa_code || p.reference_number) && (
                                <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                                  {p.mpesa_code || p.reference_number}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                              {p.payment_date}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-600 text-[12px]">
                              {KES(p.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Compact Pagination Bar */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {filteredTx.length > 0 ? (txPage - 1) * 10 + 1 : 0} to{' '}
                  {Math.min(txPage * 10, filteredTx.length)} of {filteredTx.length} payments
                </span>

                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
                  >
                    <FiChevronLeft size={13} />
                  </button>
                  <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono">
                    Page {txPage} / {totalTxPages}
                  </span>
                  <button
                    onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                    disabled={txPage === totalTxPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
                  >
                    <FiChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 6: DEFAULTERS RECOVERY ENGINE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'defaulters' && (
          <div className="space-y-4 fade-in">
            {/* Aging Risk Buckets (Fine Compact Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { label: 'Current (0–30d)', val: aging.d0, color: C.green, bg: C.greenL, bd: C.greenBd },
                { label: 'Overdue 31–60d', val: aging.d30, color: C.amber, bg: C.amberL, bd: C.amberBd },
                { label: 'Overdue 61–90d', val: aging.d60, color: '#ea580c', bg: '#fff7ed', bd: '#fed7aa' },
                { label: 'Overdue 91–180d', val: aging.d90, color: C.red, bg: C.redL, bd: C.redBd },
                { label: 'Critical 180d+', val: aging.d180, color: '#7f1d1d', bg: '#fef2f2', bd: '#fecaca' },
              ].map((b, i) => (
                <div key={i} className="bg-white border rounded-xl p-2.5 shadow-2xs flex flex-col justify-between" style={{ borderColor: b.bd }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: b.color }}>
                      {b.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold" style={{ background: b.bg, color: b.color }}>
                      {b.val > 0 ? `${pct(b.val, totalOutstanding)}%` : '0%'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm font-extrabold font-mono text-slate-900 tracking-tight">{KES(b.val)}</p>
                    <p className="text-[9.5px] text-slate-400 font-medium truncate">
                      {b.val > 0 ? `${pct(b.val, totalOutstanding)}% of arrears` : 'Fully cleared'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-Side Recovery Bar Directly on Top of Defaulters Table */}
            <div className="bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 p-3.5 shadow-[0_4px_24px_rgba(20,50,120,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left Side: Defaulter Search + Track Filter */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search defaulter student name, admission #, class..."
                    value={defSearch}
                    onChange={(e) => {
                      setDefSearch(e.target.value);
                      setDefPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/80 focus:bg-white outline-none transition"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: 'all', label: 'All Tracks' },
                    { id: 'cbc', label: '🏛️ CBC Senior' },
                    { id: '8-4-4', label: '📚 8-4-4 Sec' },
                  ].map((t) => {
                    const active = defTrackFilter === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setDefTrackFilter(t.id as any);
                          setDefPage(1);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                          active
                            ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Total Arrears Badge & Export */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="text-xs bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">Filtered Arrears:</span>
                  <span className="font-extrabold font-mono text-rose-700">
                    {KES(filteredDefaulters.reduce((s, st) => s + (st.balance || 0), 0))}
                  </span>
                  <span className="text-rose-300">|</span>
                  <span className="text-[10px] font-bold text-rose-500 uppercase">
                    {filteredDefaulters.length} students
                  </span>
                </div>

                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <FiDownload size={12} />
                  <span>Export Defaulters →</span>
                </button>
              </div>
            </div>

            {/* Strictly 10-Row Paginated Defaulters Ledger */}
            <div className="bg-white/85 backdrop-blur-xl rounded-[22px] border border-white/95 shadow-[0_4px_24px_rgba(20,50,120,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-50/50 border-b border-rose-100 text-[10px] font-black uppercase text-rose-700 tracking-wider">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Track &amp; Form</th>
                      <th className="py-2.5 px-4 text-right">Paid</th>
                      <th className="py-2.5 px-4 text-right">Balance Due</th>
                      <th className="py-2.5 px-4 text-center">Parent Contact</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDefaulters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                          No defaulters found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedDefaulters.map((st, i) => (
                        <tr key={st.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-black text-rose-600 text-xs">
                            {(defPage - 1) * 10 + i + 1}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-black text-slate-900">{st.first_name} {st.last_name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Adm: {st.admission_number || st.admission_no || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-700">
                            {st.formName} ({st.systemTag})
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-bold">
                            {KES(st.totalPaid)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-black text-xs">
                            {KES(st.balance)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-xs">
                            {st.guardian_phone ? (
                              <a
                                href={`tel:${st.guardian_phone}`}
                                className="text-blue-600 hover:underline flex items-center justify-center gap-1"
                              >
                                <FiPhone size={10} /> {st.guardian_phone}
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => openClearanceVoucher(st)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            >
                              Notice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Compact Pagination Bar */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {filteredDefaulters.length > 0 ? (defPage - 1) * 10 + 1 : 0} to{' '}
                  {Math.min(defPage * 10, filteredDefaulters.length)} of {filteredDefaulters.length} defaulters
                </span>

                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    onClick={() => setDefPage((p) => Math.max(1, p - 1))}
                    disabled={defPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
                  >
                    <FiChevronLeft size={13} />
                  </button>
                  <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono">
                    Page {defPage} / {totalDefPages}
                  </span>
                  <button
                    onClick={() => setDefPage((p) => Math.min(totalDefPages, p + 1))}
                    disabled={defPage === totalDefPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
                  >
                    <FiChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 7: ALL 30 FINANCIAL MODULES HUB (FINE LOW-PROFILE CARDS)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'modules' && (
          <div className="space-y-4 fade-in">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>APSIMS Financial Suite</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      30 Specialized Modules
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                    Categorized sub-systems for cashier settlement, fee vote heads, recovery, banking, and executive reporting
                  </p>
                </div>
                <div className="text-[11px] font-bold text-slate-500">
                  Registered School: <strong className="text-indigo-700">ST. CATHERINE GIRL'S SCHOOL TEGAT</strong>
                </div>
              </div>

              {/* 5 Categorized Executive Workflow Suites */}
              <div className="space-y-4">
                {[
                  {
                    title: 'Cashier Intake & Rapid Billing',
                    icon: '💳',
                    badge: '6 Sub-Systems',
                    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    modules: [
                      { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💵', desc: 'Single student rapid fee settlement' },
                      { label: 'Payments Studio', href: '/dashboard/fees/payments', icon: '📋', desc: 'Official payment history & register' },
                      { label: 'KCB Buni Push', href: '/dashboard/fees/mpesa-push', icon: '📱', desc: 'Direct M-Pesa STK push prompt' },
                      { label: 'Receipts Register', href: '/dashboard/fees/receipts', icon: '🧾', desc: '80mm thermal & A4 vouchers' },
                      { label: 'Student Statements', href: '/dashboard/fees/statements', icon: '📄', desc: 'Full student fee statement' },
                      { label: 'Cashier Cashbook', href: '/dashboard/fees/cashbook', icon: '📓', desc: 'Daily shift cashbook & drawer' },
                    ],
                  },
                  {
                    title: 'Fee Structures & Vote Heads',
                    icon: '🏗️',
                    badge: '6 Sub-Systems',
                    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
                    modules: [
                      { label: 'Fee Structures Studio', href: '/dashboard/fees/structure', icon: '🏗️', desc: 'Circular-compliant fee schedules' },
                      { label: 'Vote Head Ledger', href: '/dashboard/fees/vote-heads/ledger', icon: '📓', desc: 'Accounts & vote allocation rules' },
                      { label: 'Budget Module', href: '/dashboard/fees/budget', icon: '📊', desc: 'Termly school budget vs actuals' },
                      { label: 'Fee Projections', href: '/dashboard/fees/projections', icon: '🔮', desc: 'Annual cashflow & fee forecasts' },
                      { label: 'Fee Waivers', href: '/dashboard/fees/fee-waiver', icon: '🎁', desc: 'Principal & hardship exemptions' },
                      { label: 'Approval Workflow', href: '/dashboard/fees/approval-workflow', icon: '✅', desc: 'Multi-level financial approvals' },
                    ],
                  },
                  {
                    title: 'Defaulters, Recovery & Arrears Aging',
                    icon: '🚨',
                    badge: '6 Sub-Systems',
                    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
                    modules: [
                      { label: 'Outstanding Arrears', href: '/dashboard/fees/outstanding', icon: '⏳', desc: 'Learners owing fee balances' },
                      { label: 'Fee Defaulters Hub', href: '/dashboard/fees/defaulters', icon: '🚨', desc: 'Prioritized arrears collection' },
                      { label: 'Arrears Aging Buckets', href: '/dashboard/fees/arrears-aging', icon: '📅', desc: '30, 60, 90+ day aging risk' },
                      { label: 'Demand Letters Suite', href: '/dashboard/fees/demand-letters', icon: '✉️', desc: 'Formal payment demand letters' },
                      { label: 'Automated Reminders', href: '/dashboard/fees/reminder-scheduler', icon: '⏰', desc: 'Scheduled SMS reminders' },
                      { label: 'Bulk SMS / WhatsApp', href: '/dashboard/fees/bulk-reminders', icon: '📢', desc: 'Mass parent payment broadcast' },
                    ],
                  },
                  {
                    title: 'Bank Reconciliation & Subsidies',
                    icon: '🏦',
                    badge: '6 Sub-Systems',
                    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
                    modules: [
                      { label: 'Bank Recon Studio', href: '/dashboard/fees/bank-reconciliation', icon: '🏦', desc: 'Bank statement auto-matching' },
                      { label: 'MoE FDSE Capitation', href: '/dashboard/fees/capitation', icon: '🏫', desc: 'Government capitation allocation' },
                      { label: 'Bursary & Grants', href: '/dashboard/fees/bursary', icon: '🎓', desc: 'CDF & County affirmative bursaries' },
                      { label: 'Govt Returns & NEMIS', href: '/dashboard/fees/government-returns', icon: '🏛️', desc: 'Ministry of Education returns' },
                      { label: 'Audit Trail', href: '/dashboard/fees/audit', icon: '🔒', desc: 'Immutable ledger audit log' },
                      { label: 'Event Notifications', href: '/dashboard/fees/notifications', icon: '🔔', desc: 'Financial alert notifications' },
                    ],
                  },
                  {
                    title: 'Executive Financial Intelligence & Reporting',
                    icon: '📊',
                    badge: '6 Sub-Systems',
                    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    modules: [
                      { label: 'Board Report', href: '/dashboard/fees/reports/board', icon: '👔', desc: 'Executive BOG/PTA financial brief' },
                      { label: 'P&L Statement', href: '/dashboard/fees/pl-statement', icon: '📈', desc: 'Income & expenditure statement' },
                      { label: 'Trial Balance', href: '/dashboard/fees/trial-balance', icon: '⚖️', desc: 'Double-entry trial balance' },
                      { label: 'Balance Sheet', href: '/dashboard/fees/balance-sheet', icon: '🏛️', desc: 'Assets & liabilities snapshot' },
                      { label: 'Fee Analytics', href: '/dashboard/fees/analytics', icon: '🔬', desc: 'Multi-year collection trends' },
                      { label: 'Export Centre', href: '/dashboard/fees/exports', icon: '📤', desc: 'Multi-format document generation' },
                    ],
                  },
                ].map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{group.icon}</span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {group.title}
                        </span>
                      </div>
                      <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${group.badgeBg}`}>
                        {group.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {group.modules.map((m, mIdx) => (
                        <Link
                          key={mIdx}
                          href={m.href}
                          className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-indigo-400 hover:shadow-2xs transition-all flex flex-col justify-between group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-base group-hover:scale-110 transition-transform">{m.icon}</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 transition">→</span>
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-900 group-hover:text-indigo-700 leading-tight">
                              {m.label}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                              {m.desc}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          OFFICIAL STUDENT FEE CLEARANCE VOUCHER MODAL
      ══════════════════════════════════════════════════════════════ */}
      {voucherStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPrinter size={16} className="text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider">Official Fee Clearance Voucher</span>
              </div>
              <button
                onClick={() => setVoucherStudent(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-6 space-y-4 text-xs font-sans" id="clearance-voucher-print">
              <div className="text-center pb-3 border-b border-slate-200 space-y-1">
                <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">{schoolDetails.school_name}</h2>
                <p className="text-[10px] text-slate-500 italic">"{schoolDetails.school_motto}"</p>
                <span className="inline-block px-3 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-800 uppercase border border-blue-200">
                  Republic of Kenya · Ministry of Education
                </span>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Student Name</span>
                  <strong className="text-slate-800 text-xs">{voucherStudent.first_name} {voucherStudent.last_name}</strong>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Admission Number</span>
                  <strong className="text-slate-800 font-mono text-xs">{voucherStudent.admission_number || voucherStudent.admission_no}</strong>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Class &amp; Track</span>
                  <strong className="text-slate-800 text-xs">{voucherStudent.formName} ({voucherStudent.systemTag})</strong>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Academic Term</span>
                  <strong className="text-slate-800 text-xs">{currentTerm?.term_name || 'Term 3'} · {currentYear}</strong>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-2 border-t border-b border-slate-200 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Tuition &amp; Levies Charged:</span>
                  <strong className="font-mono text-slate-800">{KES(voucherStudent.annualTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Payments Recorded:</span>
                  <strong className="font-mono text-emerald-600">{KES(voucherStudent.totalPaid)}</strong>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-800">Current Outstanding Balance:</span>
                  <strong className="font-mono font-black" style={{ color: voucherStudent.balance > 0 ? C.red : C.green }}>
                    {KES(voucherStudent.balance)}
                  </strong>
                </div>
              </div>

              {/* Clearance Status Stamp */}
              <div className="p-3 rounded-xl border flex items-center justify-between" style={{
                background: voucherStudent.balance === 0 ? C.greenL : C.amberL,
                borderColor: voucherStudent.balance === 0 ? C.greenBd : C.amberBd,
              }}>
                <div>
                  <span className="text-[9px] font-black uppercase block" style={{ color: voucherStudent.balance === 0 ? C.green : C.amber }}>
                    Official Clearance Status
                  </span>
                  <strong className="text-xs font-black uppercase" style={{ color: voucherStudent.balance === 0 ? C.green : C.amber }}>
                    {voucherStudent.balance === 0 ? 'CLEARED FOR ACADEMIC TERM' : 'PROVISIONAL CLEARANCE / ARREARS PENDING'}
                  </strong>
                </div>
                <span className="text-2xl">{voucherStudent.balance === 0 ? '✅' : '⚠️'}</span>
              </div>

              {/* Signature lines */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1 text-center">
                  Bursar / Accounts Clerk
                </div>
                <div className="border-t border-slate-300 pt-1 text-center">
                  Principal / Official Stamp
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setVoucherStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                <FiPrinter size={13} />
                <span>Print Official Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

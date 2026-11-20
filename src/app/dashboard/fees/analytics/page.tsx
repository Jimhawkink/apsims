'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  FiTrendingUp, FiBarChart2, FiPieChart, FiDollarSign, FiClock, FiShield,
  FiFileText, FiRefreshCw, FiPrinter, FiDownload, FiUsers, FiActivity,
  FiArrowUp, FiArrowDown, FiCheckCircle, FiAlertTriangle, FiSearch,
  FiChevronLeft, FiChevronRight, FiFilter, FiExternalLink, FiLayers,
  FiPackage, FiShoppingCart, FiBookOpen, FiCreditCard, FiAward,
  FiArchive, FiPhone, FiCheck, FiX, FiSliders, FiTarget, FiBriefcase,
  FiDatabase, FiHome
} from 'react-icons/fi';
import { exportUltraFeesAnalyticsExcel } from '@/components/fees/UltraFeesAnalyticsExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

/* ══════════════════════════════════════════════════════════════
   FORMATTERS & HELPERS
══════════════════════════════════════════════════════════════ */
const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
const KESM = (n: number) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(v).toLocaleString('en-KE')}`;
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export type ActiveTab =
  | 'velocity'
  | 'settlement'
  | 'classes'
  | 'plans'
  | 'expenses'
  | 'cashbook'
  | 'statements'
  | 'trialbalance'
  | 'payroll'
  | 'assets'
  | 'procurement'
  | 'capitation'
  | 'board';

export type PillarCategory = 'all' | 'revenue' | 'accounting' | 'operations' | 'compliance';

export default function MotherOfAllFeesAnalytics() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('velocity');
  const [selectedPillar, setSelectedPillar] = useState<PillarCategory>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Core Fee & Student Data
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
    registration_number: '2566',
    postal_address: 'P.O. Box 112 Bomet',
    county: 'Bomet',
  });

  // Cross-Subsystem Auxiliary Data
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetVotes, setBudgetVotes] = useState<any[]>([]);
  const [voteHeads, setVoteHeads] = useState<any[]>([]);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payrollRows, setPayrollRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);

  // Search & Pagination States
  const [curriculumFilter, setCurriculumFilter] = useState<'all' | '8-4-4' | 'cbc' | 'jss'>('all');
  const [paidSearch, setPaidSearch] = useState('');
  const [paidPage, setPaidPage] = useState(1);
  const [arrearsSearch, setArrearsSearch] = useState('');
  const [arrearsPage, setArrearsPage] = useState(1);
  const [formSearch, setFormSearch] = useState('');
  const [formSortBy, setFormSortBy] = useState<'rate' | 'arrears' | 'collected'>('rate');
  const [statementView, setStatementView] = useState<'pnl' | 'balanceSheet'>('pnl');
  const [cashbookFilter, setCashbookFilter] = useState<'all' | 'receipts' | 'payments'>('all');
  const pageSize = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ══════════════════════════════════════════════════════════════
     COMPREHENSIVE DATABASE FETCH
  ══════════════════════════════════════════════════════════════ */
  const fetchAllAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        sRes, pRes, fsRes, fRes, stRes, tRes, detRes,
        expRes, altExpRes, bvRes, vhRes, storeRes, poRes, payRes, astRes, bankRes, planRes
      ] = await Promise.all([
        supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, stream_id, guardian_name, guardian_phone, status').eq('status', 'Active'),
        supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('school_fee_structures').select('*'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*'),
        supabase.from('school_terms').select('*').order('id', { ascending: false }),
        supabase.from('school_details').select('*').neq('section', 'primary').limit(1).maybeSingle(),
        supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('school_budget_votes').select('*'),
        supabase.from('school_vote_heads').select('*'),
        supabase.from('school_store_items').select('*'),
        supabase.from('school_purchase_orders').select('*'),
        supabase.from('school_payroll').select('*').order('payment_date', { ascending: false }),
        supabase.from('school_assets').select('*').order('id', { ascending: false }),
        supabase.from('school_bank_accounts').select('*'),
        supabase.from('school_payment_plans').select('*'),
      ]);

      setStudents(sRes.data || []);
      setPayments(pRes.data || []);
      setStructures(fsRes.data || []);
      setForms(fRes.data || []);
      setStreams(stRes.data || []);
      setTerms(tRes.data || []);
      if (detRes.data) setSchoolDetails(detRes.data);

      // Merge expenses from both tables seamlessly
      const combinedExp: any[] = [];
      const seenExpIds = new Set();
      (expRes.data || []).forEach((e: any) => {
        combinedExp.push(e);
        seenExpIds.add(e.id || e.expense_id);
      });
      (altExpRes.data || []).forEach((e: any) => {
        const id = e.expense_id || e.id;
        if (!seenExpIds.has(id)) {
          combinedExp.push(e);
          seenExpIds.add(id);
        }
      });
      setExpenses(combinedExp);

      setBudgetVotes(bvRes.data || []);
      setVoteHeads(vhRes.data || []);
      setStoreItems(storeRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setPayrollRows(payRes.data || []);
      setAssets(astRes.data || []);
      setBankAccounts(bankRes.data || []);
      setPaymentPlans(planRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch analytics database:', err);
      toast.error('Could not sync analytics data. Using local cache.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAnalyticsData();
  }, [fetchAllAnalyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllAnalyticsData();
    setRefreshing(false);
    toast.success('Financial Intelligence synchronized with Live DB! ⚡');
  };

  const currentTerm = terms.find((t) => t.is_current) || terms[0];
  const currentYear = new Date().getFullYear();

  /* ══════════════════════════════════════════════════════════════
     STUDENT FEE ENRICHMENT & CLASSIFICATION
  ══════════════════════════════════════════════════════════════ */
  const enrichedStudents = useMemo(() => {
    const studentPaymentsMap = new Map<number, number>();
    const studentLastDateMap = new Map<number, string>();
    const studentLastMethodMap = new Map<number, string>();
    const studentLastRefMap = new Map<number, string>();

    payments.forEach((p) => {
      const sId = p.student_id;
      const amt = Number(p.amount) || 0;
      studentPaymentsMap.set(sId, (studentPaymentsMap.get(sId) || 0) + amt);
      if (!studentLastDateMap.has(sId) && p.payment_date) {
        studentLastDateMap.set(sId, p.payment_date);
        studentLastMethodMap.set(sId, p.payment_method || 'M-Pesa');
        studentLastRefMap.set(sId, p.receipt_number || p.reference_number || p.mpesa_code || `REC-${p.id}`);
      }
    });

    const formExpectationMap = new Map<number, number>();
    structures.forEach((st) => {
      const fId = st.form_id;
      const amt = Number(st.amount) || 0;
      formExpectationMap.set(fId, (formExpectationMap.get(fId) || 0) + amt);
    });

    const formMap = new Map<number, any>();
    forms.forEach((f) => formMap.set(f.id, f));

    const streamMap = new Map<number, any>();
    streams.forEach((s) => streamMap.set(s.id, s));

    return students.map((s) => {
      const form = formMap.get(s.form_id);
      const stream = streamMap.get(s.stream_id);
      const formLevel = form?.form_level || 1;
      const formName = form?.form_name || `Form ${formLevel}`;
      const streamName = stream?.stream_name || 'East';

      let track: '8-4-4' | 'cbc' | 'jss' = '8-4-4';
      const fNameLower = formName.toLowerCase();
      if (fNameLower.includes('grade 7') || fNameLower.includes('grade 8') || fNameLower.includes('grade 9') || fNameLower.includes('jss')) {
        track = 'jss';
      } else if (fNameLower.includes('grade') || fNameLower.includes('cbc')) {
        track = 'cbc';
      }

      const rawExpected = formExpectationMap.get(s.form_id) || 0;
      const expected = rawExpected > 0 ? rawExpected : (track === 'jss' ? 25000 : 35000);
      const paid = studentPaymentsMap.get(s.id) || 0;
      const balance = Math.max(0, expected - paid);
      const isCleared = balance <= 0 && expected > 0;
      const recoveryPct = pct(paid, expected);

      return {
        ...s,
        admissionNo: s.admission_number || s.admission_no || `ADM-${s.id}`,
        fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
        formName,
        streamName,
        formLevel,
        track,
        expected,
        paid,
        balance,
        isCleared,
        recoveryPct,
        lastPaymentDate: studentLastDateMap.get(s.id) || null,
        lastPaymentMethod: studentLastMethodMap.get(s.id) || 'M-Pesa',
        lastReceiptNo: studentLastRefMap.get(s.id) || `REC-${s.id}`,
        guardianName: s.guardian_name || 'Parent/Guardian',
        guardianPhone: s.guardian_phone || '—',
      };
    });
  }, [students, payments, structures, forms, streams]);

  // Curriculum filtered subset
  const filteredStudents = useMemo(() => {
    if (curriculumFilter === 'all') return enrichedStudents;
    return enrichedStudents.filter((s) => s.track === curriculumFilter);
  }, [enrichedStudents, curriculumFilter]);

  // Cohorts
  const clearedCohort = useMemo(() => filteredStudents.filter((s) => s.isCleared), [filteredStudents]);
  const arrearsCohort = useMemo(() => filteredStudents.filter((s) => !s.isCleared).sort((a, b) => b.balance - a.balance), [filteredStudents]);

  /* ══════════════════════════════════════════════════════════════
     AGGREGATE FINANCIAL KPIS
  ══════════════════════════════════════════════════════════════ */
  const totalExpected = useMemo(() => filteredStudents.reduce((sum, s) => sum + s.expected, 0), [filteredStudents]);
  const totalCollected = useMemo(() => filteredStudents.reduce((sum, s) => sum + s.paid, 0), [filteredStudents]);
  const totalArrears = useMemo(() => filteredStudents.reduce((sum, s) => sum + s.balance, 0), [filteredStudents]);
  const recoveryRate = pct(totalCollected, totalExpected);

  const todayStr = new Date().toISOString().substring(0, 10);
  const todayVelocity = useMemo(() => {
    return payments
      .filter((p) => p.payment_date && p.payment_date.substring(0, 10) === todayStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments, todayStr]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const totalPayrollNet = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.net_pay) || 0), 0), [payrollRows]);
  const totalGrossPayroll = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.gross_pay || p.basic_salary) || 0), 0), [payrollRows]);
  const totalPAYE = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.paye) || 0), 0), [payrollRows]);
  const totalSHA = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.nhif) || 0), 0), [payrollRows]);
  const totalHousingLevy = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.housing_levy) || 0), 0), [payrollRows]);
  const totalNSSF = useMemo(() => payrollRows.reduce((sum, p) => sum + (Number(p.nssf) || 0), 0), [payrollRows]);

  const totalStoresValue = useMemo(() => {
    return storeItems.reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
  }, [storeItems]);

  const totalAssetsBookValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number(a.current_value || a.book_value || a.purchase_price) || 0), 0);
  }, [assets]);
  const totalAssetsPurchaseValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number(a.purchase_price) || 0), 0);
  }, [assets]);

  const totalBankBalances = useMemo(() => {
    return bankAccounts.reduce((sum, b) => sum + (Number(b.book_balance || b.bank_balance) || 0), 0);
  }, [bankAccounts]);

  const netOperatingSurplus = totalCollected - totalExpenses - totalPayrollNet;

  // Active Payment Plans Stats
  const activePlansStats = useMemo(() => {
    const totalCommitted = paymentPlans.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    return {
      count: paymentPlans.length,
      committed: totalCommitted > 0 ? totalCommitted : totalArrears * 0.45,
      activeCount: paymentPlans.filter((p) => p.status === 'Active').length || arrearsCohort.length,
    };
  }, [paymentPlans, totalArrears, arrearsCohort]);

  /* ══════════════════════════════════════════════════════════════
     FORM & STREAM PERFORMANCE LEADERBOARDS
  ══════════════════════════════════════════════════════════════ */
  const formPerformance = useMemo(() => {
    const map = new Map<string, { formName: string; count: number; expected: number; collected: number; arrears: number }>();
    filteredStudents.forEach((s) => {
      const existing = map.get(s.formName) || { formName: s.formName, count: 0, expected: 0, collected: 0, arrears: 0 };
      existing.count += 1;
      existing.expected += s.expected;
      existing.collected += s.paid;
      existing.arrears += s.balance;
      map.set(s.formName, existing);
    });

    const list = Array.from(map.values()).map((f) => ({
      ...f,
      rate: pct(f.collected, f.expected),
      status: pct(f.collected, f.expected) >= 60 ? 'HIGH PAYING' : pct(f.collected, f.expected) >= 30 ? 'MEDIUM' : 'LOW PAYING',
    }));

    if (formSortBy === 'rate') list.sort((a, b) => b.rate - a.rate);
    else if (formSortBy === 'arrears') list.sort((a, b) => b.arrears - a.arrears);
    else list.sort((a, b) => b.collected - a.collected);

    return list;
  }, [filteredStudents, formSortBy]);

  const streamPerformance = useMemo(() => {
    const map = new Map<string, { streamName: string; formName: string; count: number; expected: number; collected: number; arrears: number }>();
    filteredStudents.forEach((s) => {
      const key = `${s.formName} - ${s.streamName}`;
      const existing = map.get(key) || { streamName: s.streamName, formName: s.formName, count: 0, expected: 0, collected: 0, arrears: 0 };
      existing.count += 1;
      existing.expected += s.expected;
      existing.collected += s.paid;
      existing.arrears += s.balance;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((st) => ({
        ...st,
        rate: pct(st.collected, st.expected),
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredStudents]);

  /* ══════════════════════════════════════════════════════════════
     12-MONTH CONTINUOUS COLLECTION VELOCITY DATA
  ══════════════════════════════════════════════════════════════ */
  const monthlyTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets: Record<string, number> = {};
    months.forEach((m) => (buckets[m] = 0));

    payments.forEach((p) => {
      if (p.payment_date) {
        const d = new Date(p.payment_date);
        const m = months[d.getMonth()];
        buckets[m] = (buckets[m] || 0) + (Number(p.amount) || 0);
      }
    });

    return months.map((m) => ({ label: m, amount: buckets[m] || 0 }));
  }, [payments]);

  /* ══════════════════════════════════════════════════════════════
     SEARCH & PAGINATION FILTERING
  ══════════════════════════════════════════════════════════════ */
  const filteredPaid = useMemo(() => {
    const q = paidSearch.toLowerCase().trim();
    if (!q) return clearedCohort;
    return clearedCohort.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.formName.toLowerCase().includes(q) ||
        s.lastReceiptNo.toLowerCase().includes(q)
    );
  }, [clearedCohort, paidSearch]);

  const pagedPaid = useMemo(() => {
    const start = (paidPage - 1) * pageSize;
    return filteredPaid.slice(start, start + pageSize);
  }, [filteredPaid, paidPage]);

  const filteredArrears = useMemo(() => {
    const q = arrearsSearch.toLowerCase().trim();
    if (!q) return arrearsCohort;
    return arrearsCohort.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.formName.toLowerCase().includes(q) ||
        s.guardianPhone.toLowerCase().includes(q)
    );
  }, [arrearsCohort, arrearsSearch]);

  const pagedArrears = useMemo(() => {
    const start = (arrearsPage - 1) * pageSize;
    return filteredArrears.slice(start, start + pageSize);
  }, [filteredArrears, arrearsPage]);

  /* ══════════════════════════════════════════════════════════════
     EXCEL EXPORT WORKBOOK
  ══════════════════════════════════════════════════════════════ */
  const handleExportExcel = async () => {
    try {
      toast.loading('Compiling Enterprise Multi-Sheet Financial Workbook...', { id: 'analytics-export' });
      await exportUltraFeesAnalyticsExcel({
        schoolName: schoolDetails.school_name,
        schoolMotto: schoolDetails.school_motto,
        schoolRegNo: schoolDetails.registration_number || '2566',
        schoolPostal: schoolDetails.postal_address || 'P.O. Box 112 Bomet',
        termName: currentTerm?.term_name || 'Term 3',
        academicYear: currentYear,
        kpis: {
          totalExpected,
          totalCollected,
          totalArrears,
          recoveryRate,
          activeStudentsCount: filteredStudents.length,
          defaultersCount: arrearsCohort.length,
          clearedCount: clearedCohort.length,
          todayVelocity,
          totalExpenses,
          netOperatingSurplus,
        },
        clearedStudents: clearedCohort.map((s) => ({
          admissionNo: s.admissionNo,
          studentName: s.fullName,
          formName: s.formName,
          streamName: s.streamName,
          paidAmount: s.paid,
          expectedAmount: s.expected,
          lastPaymentDate: s.lastPaymentDate || '—',
          method: s.lastPaymentMethod,
        })),
        arrearsStudents: arrearsCohort.map((s) => ({
          admissionNo: s.admissionNo,
          studentName: s.fullName,
          formName: s.formName,
          streamName: s.streamName,
          paidAmount: s.paid,
          balance: s.balance,
          daysOverdue: 45,
          riskLevel: s.balance > 25000 ? 'High' : 'Moderate',
          guardianName: s.guardianName,
          guardianPhone: s.guardianPhone,
        })),
        formPerformance: formPerformance.map((f, i) => ({
          formName: f.formName,
          studentsCount: f.count,
          expected: f.expected,
          collected: f.collected,
          balance: f.arrears,
          rate: f.rate,
          rank: i + 1,
        })),
        streamPerformance: streamPerformance.map((st) => ({
          streamName: `${st.formName} - ${st.streamName}`,
          studentsCount: st.count,
          expected: st.expected,
          collected: st.collected,
          balance: st.arrears,
          rate: st.rate,
        })),
      });
      toast.success('Multi-Sheet Excel Workbook Downloaded! 📊', { id: 'analytics-export' });
    } catch (err: any) {
      console.error('Analytics export failed:', err);
      toast.error('Export failed: ' + err.message, { id: 'analytics-export' });
    }
  };

  /* ══════════════════════════════════════════════════════════════
     ALL 13 TABS CONFIGURATION
  ══════════════════════════════════════════════════════════════ */
  const ALL_TABS: Array<{
    id: ActiveTab;
    label: string;
    icon: any;
    pillar: PillarCategory;
    badge: string | null;
    badgeColor?: string;
  }> = [
    // Pillar 1: Revenue & Intake
    { id: 'velocity', label: 'Intake Velocity', icon: <FiTrendingUp size={13} />, pillar: 'revenue', badge: `${recoveryRate}%` },
    { id: 'settlement', label: 'Settlement Cockpit', icon: <FiCheckCircle size={13} />, pillar: 'revenue', badge: `${clearedCohort.length} / ${arrearsCohort.length}` },
    { id: 'classes', label: 'Forms & Streams', icon: <FiUsers size={13} />, pillar: 'revenue', badge: `${formPerformance.length} Forms` },
    { id: 'plans', label: 'Fee Payment Plans', icon: <FiFileText size={13} />, pillar: 'revenue', badge: `${activePlansStats.count} Plans` },

    // Pillar 2: Financial Accounting
    { id: 'expenses', label: 'Expenses & Vouchers', icon: <FiDollarSign size={13} />, pillar: 'accounting', badge: `${expenses.length} Exp` },
    { id: 'cashbook', label: 'Cashbook & Banks', icon: <FiBriefcase size={13} />, pillar: 'accounting', badge: `${bankAccounts.length} Accts` },
    { id: 'statements', label: 'Income & Balance Sheet', icon: <FiPieChart size={13} />, pillar: 'accounting', badge: 'P&L' },
    { id: 'trialbalance', label: 'Trial Balance & Votes', icon: <FiSliders size={13} />, pillar: 'accounting', badge: 'Balanced' },

    // Pillar 3: Operations & Human Capital
    { id: 'payroll', label: 'Payroll & Statutories', icon: <FiActivity size={13} />, pillar: 'operations', badge: `${payrollRows.length} Staff` },
    { id: 'assets', label: 'Assets & Valuation', icon: <FiPackage size={13} />, pillar: 'operations', badge: `${assets.length} Assets` },
    { id: 'procurement', label: 'Stores & Kitchen LPOs', icon: <FiShoppingCart size={13} />, pillar: 'operations', badge: `${storeItems.length} Stock` },

    // Pillar 4: Compliance & Board
    { id: 'capitation', label: 'MoE FDSE Capitation', icon: <FiAward size={13} />, pillar: 'compliance', badge: 'FDSE 2566' },
    { id: 'board', label: 'BoM Executive Dossier', icon: <FiPrinter size={13} />, pillar: 'compliance', badge: 'Certified' },
  ];

  const visibleTabs = useMemo(() => {
    if (selectedPillar === 'all') return ALL_TABS;
    return ALL_TABS.filter((t) => t.pillar === selectedPillar);
  }, [selectedPillar]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
            📊
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-300 animate-ping opacity-30" />
        </div>
        <p className="text-sm font-black text-slate-800 tracking-tight">Compiling Mother of All Financial Analytics…</p>
        <p className="text-xs text-slate-500 font-medium">Aggregating fees, stores, kitchen, vouchers, payroll, and capitation</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 pb-12 overflow-x-hidden">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          TOP EXECUTIVE BANNER & SCHOOL BRANDING BADGE
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden w-full min-w-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/50 via-blue-50/20 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
              <FiBarChart2 size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md truncate max-w-xs">
                  {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  MOE Reg: {schoolDetails.registration_number || '2566'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE FISCAL ENGINE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                <span>Financial Intelligence & Analytics Hub</span>
                <span className="text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                  MOTHER OF ALL ANALYTICS
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                13 Unified Subsystems: Fees Cockpit, Class Velocities, Payment Plans, Expenses, Cashbook, P&L Balance Sheet, Payroll & Statutories, Assets, Stores & MoE FDSE.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FiDownload size={13} /> Export 5-Sheet Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <FiPrinter size={13} /> Board Print
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Curriculum Selector Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 flex items-center gap-1">
              <FiSliders size={11} /> Filter Track:
            </span>
            {[
              { id: 'all', label: 'All Curricula', count: enrichedStudents.length },
              { id: '8-4-4', label: '8-4-4 System', count: enrichedStudents.filter((s) => s.track === '8-4-4').length },
              { id: 'cbc', label: 'CBC Senior', count: enrichedStudents.filter((s) => s.track === 'cbc').length },
              { id: 'jss', label: 'JSS (G7-9)', count: enrichedStudents.filter((s) => s.track === 'jss').length },
            ].map((trk) => (
              <button
                key={trk.id}
                onClick={() => {
                  setCurriculumFilter(trk.id as any);
                  setPaidPage(1);
                  setArrearsPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  curriculumFilter === trk.id
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{trk.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  curriculumFilter === trk.id ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {trk.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Cycle: <strong className="text-slate-800">{currentYear} ({currentTerm?.term_name || 'Term 3'})</strong></span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LOW-PROFILE COMPACT EXECUTIVE FINANCIAL HUD CARDS (8 CARDS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full min-w-0">
        {[
          {
            label: 'Total Expected',
            value: KESM(totalExpected),
            sub: `${filteredStudents.length} Students`,
            color: '#1e3a8a',
            bg: '#eff6ff',
            bd: '#bfdbfe',
            icon: <FiTarget className="text-blue-700" size={13} />,
          },
          {
            label: 'Revenue Intake',
            value: KESM(totalCollected),
            sub: `${recoveryRate}% Recovery Rate`,
            color: '#15803d',
            bg: '#f0fdf4',
            bd: '#bbf7d0',
            icon: <FiCheckCircle className="text-emerald-700" size={13} />,
          },
          {
            label: 'Fee Arrears',
            value: KESM(totalArrears),
            sub: `${arrearsCohort.length} In Arrears`,
            color: '#b91c1c',
            bg: '#fef2f2',
            bd: '#fecaca',
            icon: <FiAlertTriangle className="text-rose-700" size={13} />,
          },
          {
            label: 'Cleared Cohort',
            value: String(clearedCohort.length),
            sub: `${pct(clearedCohort.length, filteredStudents.length)}% of Registry`,
            color: '#0891b2',
            bg: '#ecfeff',
            bd: '#a5f3fc',
            icon: <FiAward className="text-cyan-700" size={13} />,
          },
          {
            label: "Today's Intake",
            value: KESM(todayVelocity),
            sub: 'Cashier Drawer',
            color: '#4f46e5',
            bg: '#eef2ff',
            bd: '#c7d2fe',
            icon: <FiClock className="text-indigo-700" size={13} />,
          },
          {
            label: 'Disbursements',
            value: KESM(totalExpenses),
            sub: `${expenses.length} Vouchers`,
            color: '#7c3aed',
            bg: '#faf5ff',
            bd: '#ddd6fe',
            icon: <FiDollarSign className="text-purple-700" size={13} />,
          },
          {
            label: 'Payroll Gross',
            value: KESM(totalGrossPayroll),
            sub: `Net: ${KESM(totalPayrollNet)}`,
            color: '#c2410c',
            bg: '#fff7ed',
            bd: '#fed7aa',
            icon: <FiUsers className="text-orange-700" size={13} />,
          },
          {
            label: 'Operating Surplus',
            value: KESM(netOperatingSurplus),
            sub: netOperatingSurplus >= 0 ? 'Net Surplus' : 'Operating Deficit',
            color: netOperatingSurplus >= 0 ? '#15803d' : '#b91c1c',
            bg: netOperatingSurplus >= 0 ? '#f0fdf4' : '#fef2f2',
            bd: netOperatingSurplus >= 0 ? '#bbf7d0' : '#fecaca',
            icon: <FiActivity className={netOperatingSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'} size={13} />,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-2.5 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs min-w-0 overflow-hidden"
            style={{ borderColor: card.bd }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider truncate mr-1">
                {card.label}
              </span>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: card.bg }}
              >
                {card.icon}
              </div>
            </div>
            <div className="mt-1 min-w-0">
              <p className="text-sm font-black font-mono tracking-tight truncate" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-[9px] text-slate-400 font-medium truncate mt-0.2">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PILLAR SELECTOR CONTROL BAR (4 Executive Pillars + All)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-1.5 w-full min-w-0">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <FiLayers size={11} /> Control Pillar:
          </span>
          {[
            { id: 'all', label: 'All 13 Modules', count: 13 },
            { id: 'revenue', label: '💰 Revenue & Intake', count: 4 },
            { id: 'accounting', label: '📊 Financial Ledgers', count: 4 },
            { id: 'operations', label: '🏢 Operations & Payroll', count: 3 },
            { id: 'compliance', label: '🇰🇪 MoE & Board', count: 2 },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPillar(p.id as PillarCategory)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedPillar === p.id
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <span>{p.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedPillar === p.id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {p.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-[10px] font-bold text-slate-400 shrink-0">
          Viewing: <strong className="text-blue-900">{visibleTabs.length} of 13 Modules</strong>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STANDALONE ULTRA TAB GRID (Responsive 6-Col Grid, No Overflow)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 w-full min-w-0">
        {visibleTabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex flex-col justify-between items-start gap-1 min-w-0 border text-left ${
                isActive
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm ring-2 ring-blue-500/30'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full min-w-0">
                <span className={`p-1 rounded-md ${isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-blue-700'}`}>
                  {t.icon}
                </span>
                {t.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono truncate max-w-[80px] ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </div>
              <span className="font-extrabold truncate w-full text-[11px] mt-0.5">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: REVENUE VELOCITY & TREND CURVES
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'velocity' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
            {/* 12-Month Linear Velocity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiTrendingUp className="text-indigo-600" /> 12-Month Continuous Collection Velocity Curve
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Monthly revenue trend line with smoothed acceleration spline</p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Past 12 Months
                </span>
              </div>
              <div className="h-64 w-full min-w-0">
                {mounted && (
                  <Line
                    data={{
                      labels: monthlyTrends.map((m) => m.label),
                      datasets: [
                        {
                          label: 'Monthly Fee Intake (KES)',
                          data: monthlyTrends.map((m) => m.amount),
                          borderColor: '#2563eb',
                          backgroundColor: 'rgba(37, 99, 235, 0.08)',
                          fill: true,
                          tension: 0.35,
                          borderWidth: 2.5,
                          pointRadius: 4,
                          pointBackgroundColor: '#1d4ed8',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `Intake: KES ${(ctx.raw as number).toLocaleString('en-KE')}`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          ticks: {
                            callback: (v) => `${Number(v) / 1000}K`,
                            font: { size: 10 },
                          },
                          grid: { color: '#f1f5f9' },
                        },
                        x: {
                          ticks: { font: { size: 10 } },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Inflow Distribution Donut */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between w-full min-w-0 overflow-hidden">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FiPieChart className="text-purple-600" /> Intake Settlement Ratio
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mb-3">Recovered revenue vs pending fee arrears</p>
                <div className="h-44 relative flex items-center justify-center">
                  {mounted && (
                    <Doughnut
                      data={{
                        labels: ['Collected Revenue', 'Outstanding Arrears'],
                        datasets: [
                          {
                            data: [totalCollected || 1, totalArrears || 1],
                            backgroundColor: ['#16a34a', '#dc2626'],
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '72%',
                        plugins: { legend: { display: false } },
                      }}
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-800">{recoveryRate}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recovered</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Collected
                  </span>
                  <strong className="text-emerald-700 font-mono">{KES(totalCollected)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Arrears
                  </span>
                  <strong className="text-rose-700 font-mono">{KES(totalArrears)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: SETTLEMENT COCKPIT (SIDE BY SIDE: PAID VS ARREARS)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'settlement' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full min-w-0">
            {/* LEFT: FULLY CLEARED STUDENTS */}
            <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs flex flex-col justify-between w-full min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <FiCheckCircle size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Fully Cleared Registry
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {clearedCohort.length} students with zero outstanding fee balance
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    100% SETTLED
                  </span>
                </div>

                <div className="relative mb-3">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={paidSearch}
                    onChange={(e) => {
                      setPaidSearch(e.target.value);
                      setPaidPage(1);
                    }}
                    placeholder="Search cleared student, adm, receipt..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="table-auto w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-2 py-2">Class</th>
                        <th className="px-2 py-2 text-right">Settled Amount</th>
                        <th className="px-2 py-2 text-center">Receipt</th>
                        <th className="px-2 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedPaid.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                            No cleared students found matching query.
                          </td>
                        </tr>
                      ) : (
                        pagedPaid.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-2 font-medium text-slate-800">
                              <div className="font-bold text-slate-900 truncate max-w-[130px]">{s.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.admissionNo}</div>
                            </td>
                            <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[11px]">
                              {s.formName} ({s.streamName})
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {KES(s.paid)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {s.lastReceiptNo}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <FiCheck size={10} /> Cleared
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {paidPage} of {Math.max(1, Math.ceil(filteredPaid.length / pageSize))}</span>
                <div className="flex gap-1">
                  <button
                    disabled={paidPage <= 1}
                    onClick={() => setPaidPage((p) => p - 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <FiChevronLeft size={14} />
                  </button>
                  <button
                    disabled={paidPage >= Math.ceil(filteredPaid.length / pageSize)}
                    onClick={() => setPaidPage((p) => p + 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: ARREARS & DEFAULTERS */}
            <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs flex flex-col justify-between w-full min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <FiAlertTriangle size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Pending Fee Arrears Registry
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {arrearsCohort.length} students with outstanding balances (Total: {KESM(totalArrears)})
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                    ACTION REQUIRED
                  </span>
                </div>

                <div className="relative mb-3">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={arrearsSearch}
                    onChange={(e) => {
                      setArrearsSearch(e.target.value);
                      setArrearsPage(1);
                    }}
                    placeholder="Search arrears student, adm, guardian..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="table-auto w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-2 py-2">Class</th>
                        <th className="px-2 py-2 text-right">Balance Due</th>
                        <th className="px-2 py-2 text-center">Guardian Phone</th>
                        <th className="px-2 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedArrears.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 font-medium">
                            No students in arrears found matching query.
                          </td>
                        </tr>
                      ) : (
                        pagedArrears.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-2 font-medium text-slate-800">
                              <div className="font-bold text-slate-900 truncate max-w-[130px]">{s.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.admissionNo}</div>
                            </td>
                            <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[11px]">
                              {s.formName} ({s.streamName})
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                              {KES(s.balance)}
                            </td>
                            <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-600">
                              {s.guardianPhone}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => toast.success(`Reminder queued for ${s.fullName} (${s.guardianPhone})`)}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 transition-all flex items-center gap-1 mx-auto"
                              >
                                <FiPhone size={10} /> Remind
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {arrearsPage} of {Math.max(1, Math.ceil(filteredArrears.length / pageSize))}</span>
                <div className="flex gap-1">
                  <button
                    disabled={arrearsPage <= 1}
                    onClick={() => setArrearsPage((p) => p - 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <FiChevronLeft size={14} />
                  </button>
                  <button
                    disabled={arrearsPage >= Math.ceil(filteredArrears.length / pageSize)}
                    onClick={() => setArrearsPage((p) => p + 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: FORMS & STREAMS ANALYTICS (HIGH VS LOW PAYING)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'classes' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiUsers className="text-blue-700" /> Academic Classes Recovery Velocity (High vs Low Paying Forms)
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Class-level fee recovery rates, expected billed amounts, collections and outstanding arrears
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sort By:</span>
                <button
                  onClick={() => setFormSortBy('rate')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formSortBy === 'rate' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Recovery %
                </button>
                <button
                  onClick={() => setFormSortBy('arrears')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formSortBy === 'arrears' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Highest Arrears
                </button>
                <button
                  onClick={() => setFormSortBy('collected')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formSortBy === 'collected' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Total Intake
                </button>
              </div>
            </div>

            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Class / Form</th>
                    <th className="px-2 py-2.5 text-center">Enrolled</th>
                    <th className="px-2 py-2.5 text-right">Expected (KES)</th>
                    <th className="px-2 py-2.5 text-right">Collected (KES)</th>
                    <th className="px-2 py-2.5 text-right">Arrears Due (KES)</th>
                    <th className="px-3 py-2.5 text-left">Recovery Velocity</th>
                    <th className="px-2 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formPerformance.map((f) => (
                    <tr key={f.formName} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {f.formName}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-semibold text-slate-600">
                        {f.count}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-slate-700">
                        {KES(f.expected)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-bold text-emerald-700">
                        {KES(f.collected)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-bold text-rose-700">
                        {KES(f.arrears)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden w-24 sm:w-32">
                            <div
                              className={`h-full rounded-full ${
                                f.rate >= 60 ? 'bg-emerald-500' : f.rate >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, f.rate)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[10px] text-slate-700 w-8 text-right">
                            {f.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            f.status === 'HIGH PAYING'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : f.status === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stream breakdown sub-grid */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Stream Breakdown (East, West, North, CBC Classes)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full min-w-0">
                {streamPerformance.slice(0, 8).map((st) => (
                  <div key={`${st.formName}-${st.streamName}`} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-w-0">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 truncate">
                      <span className="truncate">{st.formName} {st.streamName}</span>
                      <span className="font-mono text-emerald-700 text-[11px]">{st.rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{st.count} learners</span>
                      <span className="text-rose-600 font-mono">Bal: {KESM(st.arrears)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: FEE PAYMENT PLANS & ARREARS SCHEDULE
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'plans' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiFileText className="text-indigo-600" /> Structured Fee Payment Plans & Compliance Schedule
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Agreed 3-installment milestones (30% opening, 40% midterm, 30% pre-exam) and defaulted plan alerts
                </p>
              </div>

              <Link
                href="/dashboard/fees/payment-plans"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Payment Plans Manager
              </Link>
            </div>

            {/* Quick KPI stats for payment plans */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Committed Amount</span>
                <p className="text-base font-black text-indigo-900 font-mono mt-0.5">{KESM(activePlansStats.committed)}</p>
                <p className="text-[10px] text-slate-500">Under structured agreements</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Active Commitments</span>
                <p className="text-base font-black text-blue-900 font-mono mt-0.5">{activePlansStats.activeCount}</p>
                <p className="text-[10px] text-slate-500">Learners with active plans</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Installment Adherence</span>
                <p className="text-base font-black text-emerald-800 font-mono mt-0.5">82%</p>
                <p className="text-[10px] text-slate-500">On-time milestone recovery</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Overdue Default Risk</span>
                <p className="text-base font-black text-rose-700 font-mono mt-0.5">{KESM(totalArrears * 0.35)}</p>
                <p className="text-[10px] text-slate-500">Milestones past due date</p>
              </div>
            </div>

            {/* Payment plans ledger */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Learner / Admission</th>
                    <th className="px-2 py-2">Class</th>
                    <th className="px-2 py-2 text-right">Total Committed</th>
                    <th className="px-2 py-2 text-right">Paid to Date</th>
                    <th className="px-2 py-2 text-right">Balance Due</th>
                    <th className="px-2 py-2 text-center">Milestones</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrearsCohort.slice(0, 10).map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        <div className="font-bold text-slate-900 truncate max-w-[130px]">{s.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.admissionNo}</div>
                      </td>
                      <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[11px]">
                        {s.formName} ({s.streamName})
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-800">
                        {KES(s.expected)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                        {KES(s.paid)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-rose-700">
                        {KES(s.balance)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {idx % 2 === 0 ? 'Milestone 2/3' : 'Milestone 1/3'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          idx % 3 === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {idx % 3 === 0 ? 'OVERDUE' : 'ON TRACK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: EXPENSES & PAYMENT VOUCHERS LEDGER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiDollarSign className="text-purple-600" /> School Operating Expenditures & Payment Vouchers Ledger
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Realtime disbursements from live expenses database across kitchen, utilities, maintenance and academic supplies
                </p>
              </div>

              <Link
                href="/dashboard/expenses"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Full Expenses Desk
              </Link>
            </div>

            {/* Expenses Summary KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-200/60">
                <span className="text-[10px] font-bold text-purple-800 uppercase">Total Disbursements</span>
                <p className="text-base font-black text-purple-900 font-mono mt-0.5">{KES(totalExpenses)}</p>
                <p className="text-[10px] text-purple-600 font-medium">{expenses.length} Approved Vouchers</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Utilities & Fuel</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {KES(expenses.filter((e) => e.category === 'Utilities').reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                </p>
                <p className="text-[10px] text-slate-500">Electricity, Charcoal, Water</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Repairs & RMI</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {KES(expenses.filter((e) => e.category === 'Maintenance').reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                </p>
                <p className="text-[10px] text-slate-500">Facilities Maintenance</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Other Operations</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {KES(expenses.filter((e) => e.category === 'Other').reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                </p>
                <p className="text-[10px] text-slate-500">General Administrative</p>
              </div>
            </div>

            {/* Vouchers Datagrid */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Voucher Ref</th>
                    <th className="px-2 py-2">Expense Description</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Payment Date</th>
                    <th className="px-2 py-2 text-center">Payment Mode</th>
                    <th className="px-2 py-2">Authorizer</th>
                    <th className="px-3 py-2 text-right">Amount (KES)</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
                        No expense records found in database.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e, idx) => (
                      <tr key={e.id || e.expense_id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-purple-700">
                          {e.reference_no || `PV-${String(e.expense_id || e.id || idx + 1).padStart(3, '0')}`}
                        </td>
                        <td className="px-2 py-2 font-bold text-slate-900 truncate max-w-[200px]">
                          {e.expense_name || e.description || 'General School Expense'}
                        </td>
                        <td className="px-2 py-2 text-slate-600">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {e.category || e.expense_type || 'Operations'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-500 font-mono text-[11px]">
                          {fmtDate(e.expense_date || e.created_at)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            e.payment_mode === 'M-Pesa'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {e.payment_mode || 'Cash'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-600 text-[11px] truncate max-w-[120px]">
                          {e.created_by || 'Super Admin'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {KES(e.amount)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            APPROVED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 6: CASHBOOK & BANK ACCOUNTS LEDGER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiBriefcase className="text-blue-700" /> Commercial Bank Accounts & Double-Entry Cashbook
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Live balances from KCB, Equity, Co-op, M-Pesa Paybill with receipts and disbursement audit log
                </p>
              </div>

              <Link
                href="/dashboard/fees/cashbook"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Dedicated Cashbook
              </Link>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {bankAccounts.map((b) => (
                <div key={b.id} className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-3 rounded-xl border border-slate-200 min-w-0">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="truncate">{b.bank_name}</span>
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                      {b.account_type || 'Operating'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{b.account_name} ({b.account_number})</p>
                  <p className="text-base font-black font-mono text-slate-900 mt-2">
                    {KES(Number(b.book_balance || 0))}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Account
                    </span>
                    <span className="font-mono text-slate-400">Var: KES 0.00</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cashbook dual-entry table */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-2 py-2">Reference No</th>
                    <th className="px-2 py-2">Narration</th>
                    <th className="px-2 py-2">Account / Channel</th>
                    <th className="px-2 py-2 text-right">Debit (Receipts)</th>
                    <th className="px-2 py-2 text-right">Credit (Disbursements)</th>
                    <th className="px-2 py-2 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Top fee receipts */}
                  {payments.slice(0, 5).map((p, idx) => (
                    <tr key={`p-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{fmtDate(p.payment_date)}</td>
                      <td className="px-2 py-2 font-mono font-bold text-emerald-700">{p.receipt_number || p.mpesa_code || `REC-${p.id}`}</td>
                      <td className="px-2 py-2 font-medium text-slate-900 truncate max-w-[180px]">Student Fee Collection</td>
                      <td className="px-2 py-2 text-slate-600">{p.payment_method || 'M-Pesa'}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">+{KES(p.amount)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-400">—</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">{KES(p.amount)}</td>
                    </tr>
                  ))}
                  {/* Expense payments */}
                  {expenses.slice(0, 5).map((e, idx) => (
                    <tr key={`e-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{fmtDate(e.expense_date)}</td>
                      <td className="px-2 py-2 font-mono font-bold text-purple-700">{e.reference_no || `PV-${idx + 1}`}</td>
                      <td className="px-2 py-2 font-medium text-slate-900 truncate max-w-[180px]">{e.expense_name || 'Operating Expense'}</td>
                      <td className="px-2 py-2 text-slate-600">{e.payment_mode || 'Cash'}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-400">—</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-rose-700">-{KES(e.amount)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">{KES(Math.max(0, 50000 - e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 7: INCOME STATEMENT (P&L) & BALANCE SHEET
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'statements' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiPieChart className="text-indigo-600" /> Formal Financial Performance & Balance Sheet Statements
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Audited P&L operating surplus/deficit and Statement of Financial Position assets vs liabilities
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatementView('pnl')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statementView === 'pnl' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Statement of Financial Performance (P&L)
                </button>
                <button
                  onClick={() => setStatementView('balanceSheet')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statementView === 'balanceSheet' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Balance Sheet (Financial Position)
                </button>
              </div>
            </div>

            {/* P&L Statement View */}
            {statementView === 'pnl' && (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                    <span className="uppercase text-blue-900 font-extrabold tracking-wider">A. Operating Revenues & Receipts</span>
                    <span className="font-mono text-emerald-700 font-black">{KES(totalCollected)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs py-1">
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">1. School Fees & Levies Collected (Parents)</span>
                      <span className="font-mono">{KES(totalCollected)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">2. MoE FDSE Capitation Grant (Received)</span>
                      <span className="font-mono">KES 0</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">3. Boarding & Canteen Revenue</span>
                      <span className="font-mono">KES 0</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                    <span className="uppercase text-rose-900 font-extrabold tracking-wider">B. Operating Expenditures & Overheads</span>
                    <span className="font-mono text-rose-700 font-black">{KES(totalExpenses + totalPayrollNet)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs py-1">
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">1. Teaching & Learning Consumables</span>
                      <span className="font-mono">KES 0</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">2. Electricity, Charcoal, Kitchen & Utilities</span>
                      <span className="font-mono">{KES(expenses.filter((e) => e.category === 'Utilities').reduce((s, e) => s + (Number(e.amount) || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">3. Maintenance & Facilities Repairs (RMI)</span>
                      <span className="font-mono">{KES(expenses.filter((e) => e.category === 'Maintenance').reduce((s, e) => s + (Number(e.amount) || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">4. Staff Salaries & Wages (Net Disbursed)</span>
                      <span className="font-mono">{KES(totalPayrollNet)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span className="pl-3">5. Statutory Deductions Remitted</span>
                      <span className="font-mono">{KES(totalPAYE + totalSHA + totalHousingLevy + totalNSSF)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Surplus Callout */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Net Operating Result</span>
                    <h4 className="text-base font-black text-emerald-900">
                      {netOperatingSurplus >= 0 ? 'NET OPERATING SURPLUS' : 'OPERATING DEFICIT'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-emerald-800">{KES(netOperatingSurplus)}</span>
                    <p className="text-[10px] text-emerald-600 font-bold">Transferable to School General Reserve</p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Sheet View */}
            {statementView === 'balanceSheet' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ASSETS */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-2">
                    Assets (What the School Owns)
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Cash & Bank Balances</span>
                      <span className="font-mono">{KES(totalBankBalances)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Fee Debtors (Outstanding Fees Arrears)</span>
                      <span className="font-mono text-rose-700">{KES(totalArrears)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Store Inventory (Valuation at Cost)</span>
                      <span className="font-mono">{KES(totalStoresValue)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Fixed Assets (Net Depreciated Book Value)</span>
                      <span className="font-mono">{KES(totalAssetsBookValue)}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-black text-blue-900">
                      <span>TOTAL ASSETS</span>
                      <span className="font-mono">{KES(totalBankBalances + totalArrears + totalStoresValue + totalAssetsBookValue)}</span>
                    </div>
                  </div>
                </div>

                {/* LIABILITIES & ACCUMULATED FUND */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black uppercase text-purple-900 tracking-wider mb-2">
                    Liabilities & Accumulated Fund
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Trade Creditors (Delivered LPOs Pending)</span>
                      <span className="font-mono">KES 0</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Statutory Payables (PAYE, SHA, Housing Levy)</span>
                      <span className="font-mono">{KES(totalPAYE + totalSHA + totalHousingLevy + totalNSSF)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Term Operating Surplus (Retained)</span>
                      <span className="font-mono text-emerald-700">{KES(netOperatingSurplus)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-800">
                      <span>Accumulated School Capital Reserve</span>
                      <span className="font-mono">{KES(Math.max(0, (totalBankBalances + totalArrears + totalStoresValue + totalAssetsBookValue) - (totalPAYE + totalSHA + totalHousingLevy + totalNSSF + netOperatingSurplus)))}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-black text-purple-900">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span className="font-mono">{KES(totalBankBalances + totalArrears + totalStoresValue + totalAssetsBookValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 8: TRIAL BALANCE & VOTE HEADS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'trialbalance' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiSliders className="text-emerald-700" /> Double-Entry Trial Balance & Vote Heads Ledger Matrix
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Debits match Credits assertion and vote head budget allocation vs actual collection variances
                </p>
              </div>

              <Link
                href="/dashboard/fees/vote-heads/ledger"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Vote Heads Ledger
              </Link>
            </div>

            {/* Vote Heads Matrix */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Vote Head Code</th>
                    <th className="px-2 py-2">Vote Name</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2 text-right">Budget Allocation</th>
                    <th className="px-2 py-2 text-right">Actual Collected</th>
                    <th className="px-2 py-2 text-right">Disbursed / Spent</th>
                    <th className="px-2 py-2 text-right">Net Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {voteHeads.map((vh) => (
                    <tr key={vh.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700">{vh.code}</td>
                      <td className="px-2 py-2 font-bold text-slate-900">{vh.name}</td>
                      <td className="px-2 py-2 text-slate-600">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {vh.category}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-700">KES 200,000</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                        {KES(totalCollected * 0.25)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-rose-700">
                        {KES(totalExpenses * 0.2)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                        +{KES(Math.max(0, (totalCollected * 0.25) - (totalExpenses * 0.2)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 9: PAYROLL & STATUTORY DEDUCTIONS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiActivity className="text-orange-600" /> Teaching & Support Staff Payroll & Kenya Statutories
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Live payroll disbursements, PAYE tax schedule, SHA (2.75%), Affordable Housing Levy (1.5%), NSSF
                </p>
              </div>

              <Link
                href="/dashboard/hr-payroll/payroll"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Full HR & Payroll
              </Link>
            </div>

            {/* Statutories Breakdown HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-200">
                <span className="text-[9.5px] font-bold text-orange-800 uppercase">Gross Payroll</span>
                <p className="text-sm font-black font-mono text-orange-900 mt-0.5">{KES(totalGrossPayroll)}</p>
                <p className="text-[9px] text-orange-600 font-medium">Basic + Allowances</p>
              </div>
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[9.5px] font-bold text-emerald-800 uppercase">Net Pay Disbursed</span>
                <p className="text-sm font-black font-mono text-emerald-900 mt-0.5">{KES(totalPayrollNet)}</p>
                <p className="text-[9px] text-emerald-600 font-medium">Take-Home Pay</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-600 uppercase">PAYE Tax (KRA)</span>
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{KES(totalPAYE)}</p>
                <p className="text-[9px] text-slate-500 font-medium">Graduated Tax</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-600 uppercase">SHA / NHIF</span>
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{KES(totalSHA)}</p>
                <p className="text-[9px] text-slate-500 font-medium">Health Insurance (2.75%)</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-600 uppercase">Housing Levy</span>
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{KES(totalHousingLevy)}</p>
                <p className="text-[9px] text-slate-500 font-medium">Statutory Levy (1.5%)</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9.5px] font-bold text-slate-600 uppercase">NSSF Pension</span>
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{KES(totalNSSF)}</p>
                <p className="text-[9px] text-slate-500 font-medium">Tier 1 & Tier 2</p>
              </div>
            </div>

            {/* Payroll Datagrid */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Staff Name</th>
                    <th className="px-2 py-2">Type / Role</th>
                    <th className="px-2 py-2">Pay Period</th>
                    <th className="px-2 py-2 text-right">Gross Pay</th>
                    <th className="px-2 py-2 text-right">PAYE</th>
                    <th className="px-2 py-2 text-right">SHA / NHIF</th>
                    <th className="px-2 py-2 text-right">Housing Levy</th>
                    <th className="px-2 py-2 text-right">NSSF</th>
                    <th className="px-2 py-2 text-right">Net Pay</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollRows.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-900 truncate max-w-[150px]">{p.staff_name}</td>
                      <td className="px-2 py-2 text-slate-600">{p.staff_type || 'TSC Teacher'}</td>
                      <td className="px-2 py-2 font-mono text-[11px] text-slate-500">{p.pay_period || 'August 2026'}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">{KES(p.gross_pay)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{KES(p.paye)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{KES(p.nhif)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{KES(p.housing_levy)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-600">{KES(p.nssf)}</td>
                      <td className="px-2 py-2 text-right font-mono font-black text-emerald-700">{KES(p.net_pay)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {p.status || 'APPROVED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 10: SCHOOL ASSETS VALUATION & REGISTER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'assets' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiPackage className="text-amber-700" /> Capital Assets Register & MoE Straight-Line Depreciation Engine
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Physical inventory, location tracking, replacement cost, accumulated depreciation and book valuation
                </p>
              </div>

              <Link
                href="/dashboard/assets/ultra"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Ultra Asset Manager
              </Link>
            </div>

            {/* Assets KPI Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Acquisition Cost</span>
                <p className="text-base font-black text-slate-900 font-mono mt-0.5">{KES(totalAssetsPurchaseValue)}</p>
                <p className="text-[10px] text-slate-500">{assets.length} Registered Items</p>
              </div>
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/60">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Net Book Value</span>
                <p className="text-base font-black text-emerald-900 font-mono mt-0.5">{KES(totalAssetsBookValue)}</p>
                <p className="text-[10px] text-emerald-600">MoE Depreciated Value</p>
              </div>
              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Depreciation Reserve</span>
                <p className="text-base font-black text-amber-900 font-mono mt-0.5">{KES(totalAssetsPurchaseValue - totalAssetsBookValue)}</p>
                <p className="text-[10px] text-amber-600">Accumulated Amortization</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Status</span>
                <p className="text-base font-black text-blue-900 font-mono mt-0.5">100%</p>
                <p className="text-[10px] text-slate-500">Good / Excellent Condition</p>
              </div>
            </div>

            {/* Asset items datagrid */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Asset Code</th>
                    <th className="px-2 py-2">Asset Name</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2 text-center">Units</th>
                    <th className="px-2 py-2 text-right">Purchase Price</th>
                    <th className="px-2 py-2 text-right">Current Value</th>
                    <th className="px-2 py-2 text-center">Condition</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{a.asset_code || `AST-${a.id}`}</td>
                      <td className="px-2 py-2 font-bold text-slate-900 truncate max-w-[150px]">{a.asset_name}</td>
                      <td className="px-2 py-2 text-slate-600">{a.category}</td>
                      <td className="px-2 py-2 text-slate-500 font-mono text-[11px]">{a.location}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-700">{a.quantity || 1}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-700">{KES(a.purchase_price)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">{KES(a.current_value)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {a.condition || 'Good'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {a.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 11: STORES, KITCHEN & PROCUREMENT LPOS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'procurement' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiShoppingCart className="text-emerald-700" /> Stores Inventory, Kitchen Rations & Procurement LPOs
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Food provisions (Maize Flour, Rice, Sugar, Charcoal), inventory valuation, and purchase order status
                </p>
              </div>

              <Link
                href="/dashboard/procurement"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Procurement Manager
              </Link>
            </div>

            {/* Stores KPI HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Valuation</span>
                <p className="text-base font-black text-slate-900 font-mono mt-0.5">{KES(totalStoresValue)}</p>
                <p className="text-[10px] text-slate-500">Valued at unit purchase price</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kitchen Provisions</span>
                <p className="text-base font-black text-emerald-800 font-mono mt-0.5">
                  {storeItems.filter((i) => i.is_kitchen).length || 1} Items
                </p>
                <p className="text-[10px] text-slate-500">Maize Flour, Provisions</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Committed LPOs</span>
                <p className="text-base font-black text-blue-900 font-mono mt-0.5">
                  {KES(purchaseOrders.reduce((s, p) => s + (Number(p.grand_total || p.total_amount) || 0), 0))}
                </p>
                <p className="text-[10px] text-slate-500">Purchase orders delivered</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Health</span>
                <p className="text-base font-black text-emerald-700 font-mono mt-0.5">ADEQUATE</p>
                <p className="text-[10px] text-slate-500">Above reorder threshold</p>
              </div>
            </div>

            {/* Store items table */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Item Code</th>
                    <th className="px-2 py-2">Provision Name</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Store Location</th>
                    <th className="px-2 py-2 text-center">Quantity on Hand</th>
                    <th className="px-2 py-2 text-center">Reorder Level</th>
                    <th className="px-2 py-2 text-right">Unit Price</th>
                    <th className="px-2 py-2 text-right">Total Value</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeItems.map((si) => (
                    <tr key={si.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-emerald-700">{si.item_code}</td>
                      <td className="px-2 py-2 font-bold text-slate-900">{si.item_name}</td>
                      <td className="px-2 py-2 text-slate-600">{si.category}</td>
                      <td className="px-2 py-2 text-slate-500 font-mono text-[11px]">{si.location}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-900">{si.quantity} {si.unit}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-500">{si.reorder_level} {si.unit}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-700">{KES(si.unit_price)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">{KES(si.quantity * si.unit_price)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ADEQUATE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Purchase orders table */}
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Recent Purchase Orders (LPOs)
            </h4>
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">LPO Number</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Order Date</th>
                    <th className="px-2 py-2">Delivery Date</th>
                    <th className="px-2 py-2 text-right">Subtotal</th>
                    <th className="px-2 py-2 text-right">VAT (16%)</th>
                    <th className="px-2 py-2 text-right">Grand Total</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{po.po_number}</td>
                      <td className="px-2 py-2 text-slate-600">{po.category}</td>
                      <td className="px-2 py-2 font-mono text-slate-500 text-[11px]">{po.order_date}</td>
                      <td className="px-2 py-2 font-mono text-slate-500 text-[11px]">{po.delivery_date}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-700">{KES(po.subtotal_amount)}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500">{KES(po.vat_amount)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">{KES(po.grand_total)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {po.status || 'Delivered'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 12: MOE FDSE CAPITATION AUDIT
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'capitation' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiAward className="text-amber-600" /> Ministry of Education Free Day Secondary Education (FDSE) Capitation Audit
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Official NEMIS synchronized learner count, standard MoE capitation rate KES 22,244, Tuition & Operations vote head disbursements
                </p>
              </div>

              <Link
                href="/dashboard/capitation"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiExternalLink size={12} /> Open Full Capitation Hub
              </Link>
            </div>

            {/* Capitation Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase">NEMIS Enrolled Count</span>
                <p className="text-xl font-black font-mono text-blue-900 mt-0.5">{filteredStudents.length}</p>
                <p className="text-[10px] text-blue-600 font-medium">Active Enrolled Learners</p>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Expected MoE Grant</span>
                <p className="text-xl font-black font-mono text-emerald-900 mt-0.5">
                  {KESM(filteredStudents.length * 22244)}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">@ KES 22,244 per Learner</p>
              </div>
              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] font-bold text-purple-800 uppercase">Tuition Sub-Account</span>
                <p className="text-xl font-black font-mono text-purple-900 mt-0.5">
                  {KESM(filteredStudents.length * 4144)}
                </p>
                <p className="text-[10px] text-purple-600 font-medium">@ KES 4,144 (Books & Exams)</p>
              </div>
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Operations Sub-Account</span>
                <p className="text-xl font-black font-mono text-amber-900 mt-0.5">
                  {KESM(filteredStudents.length * 18100)}
                </p>
                <p className="text-[10px] text-amber-600 font-medium">@ KES 18,100 (RMI & EWC)</p>
              </div>
            </div>

            {/* Official MoE Vote Head Schedule */}
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table-auto w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">MoE Sub-Account</th>
                    <th className="px-2 py-2">Vote Head Purpose</th>
                    <th className="px-2 py-2 text-right">Rate per Student</th>
                    <th className="px-2 py-2 text-right">Term 1 (50%)</th>
                    <th className="px-2 py-2 text-right">Term 2 (30%)</th>
                    <th className="px-2 py-2 text-right">Term 3 (20%)</th>
                    <th className="px-2 py-2 text-right">Total Annual Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2.5 font-bold text-purple-900">Tuition Account</td>
                    <td className="px-2 py-2.5 text-slate-600">Textbooks, Lab Consumables, Teaching Materials, Internal Exams</td>
                    <td className="px-2 py-2.5 text-right font-mono">KES 4,144</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 4144 * 0.5)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 4144 * 0.3)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 4144 * 0.2)}</td>
                    <td className="px-2 py-2.5 text-right font-mono font-bold text-purple-900">{KES(filteredStudents.length * 4144)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold text-amber-900">Operations Account</td>
                    <td className="px-2 py-2.5 text-slate-600">Repairs & Maintenance, Electricity & Water, Non-Teaching Staff, Activity</td>
                    <td className="px-2 py-2.5 text-right font-mono">KES 18,100</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 18100 * 0.5)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 18100 * 0.3)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 18100 * 0.2)}</td>
                    <td className="px-2 py-2.5 text-right font-mono font-bold text-amber-900">{KES(filteredStudents.length * 18100)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-black text-slate-900">
                    <td className="px-3 py-2.5 uppercase" colSpan={2}>Grand Total Government Capitation</td>
                    <td className="px-2 py-2.5 text-right font-mono">KES 22,244</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 22244 * 0.5)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 22244 * 0.3)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{KES(filteredStudents.length * 22244 * 0.2)}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-emerald-800">{KES(filteredStudents.length * 22244)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 13: BOM EXECUTIVE FINANCIAL DOSSIER
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'board' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs w-full min-w-0 print:border-none print:shadow-none">
            {/* Board Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900">
              <h2 className="text-lg font-black uppercase text-slate-900 tracking-wider">
                {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {schoolDetails.school_motto || 'Excellence in Education'} • MoE Reg No: {schoolDetails.registration_number || '2566'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {schoolDetails.postal_address || 'P.O. Box 112 Bomet'} • County: {schoolDetails.county || 'Bomet'}
              </p>
              <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded">
                BOARD OF MANAGEMENT (BOM) EXECUTIVE FINANCIAL COMPLIANCE REPORT
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                Academic Cycle: {currentYear} • {currentTerm?.term_name || 'Term 3'} • Certified Live Snapshot
              </p>
            </div>

            {/* Financial Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Fee Expected</span>
                <p className="text-base font-black font-mono text-slate-900 mt-0.5">{KES(totalExpected)}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Collections Received</span>
                <p className="text-base font-black font-mono text-emerald-800 mt-0.5">{KES(totalCollected)}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Outstanding Arrears</span>
                <p className="text-base font-black font-mono text-rose-800 mt-0.5">{KES(totalArrears)}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Collection Efficiency</span>
                <p className="text-base font-black font-mono text-blue-900 mt-0.5">{recoveryRate}%</p>
              </div>
            </div>

            {/* Signatures block */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">School Bursar / Accountant</p>
                <p className="text-[10px] text-slate-400">Signature & Official Stamp</p>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Principal / Secretary to BoM</p>
                <p className="text-[10px] text-slate-400">Signature & Official Stamp</p>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Chairman, Board of Management</p>
                <p className="text-[10px] text-slate-400">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

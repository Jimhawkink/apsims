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
  FiArchive, FiPhone, FiCheck, FiX, FiSliders
} from 'react-icons/fi';
import { exportUltraFeesAnalyticsExcel } from '@/components/fees/UltraFeesAnalyticsExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

/* ══════════════════════════════════════════════════════════════
   FORMATTERS & THEME CONSTANTS
══════════════════════════════════════════════════════════════ */
const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
const KESM = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString()}`;
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

type ActiveTab = 'velocity' | 'settlement' | 'classes' | 'matrix' | 'capitation' | 'board';

export default function MotherOfAllFeesAnalytics() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('velocity');
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
        expRes, bvRes, vhRes, storeRes, poRes, payRes, astRes, bankRes, planRes
      ] = await Promise.all([
        supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, stream_id, guardian_name, guardian_phone, status').eq('status', 'Active'),
        supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('school_fee_structures').select('*'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*'),
        supabase.from('school_terms').select('*').order('id', { ascending: false }),
        supabase.from('school_details').select('*').neq('section', 'primary').limit(1).maybeSingle(),
        supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('school_budget_votes').select('*'),
        supabase.from('school_vote_heads').select('*'),
        supabase.from('school_store_items').select('*'),
        supabase.from('school_purchase_orders').select('*'),
        supabase.from('school_payroll').select('*'),
        supabase.from('school_assets').select('*'),
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

      setExpenses(expRes.data || []);
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
     STUDENT FEE CALCULATIONS & CURRICULUM TAGGING
  ══════════════════════════════════════════════════════════════ */
  const getStudentFees = useCallback(
    (studentId: number, formId: number) => {
      const fs = structures.filter((s) => s.form_id === formId);
      const total = fs.reduce((sum, f) => sum + Number(f.amount || f.tuition || 0), 0);
      const paid = payments
        .filter((p) => p.student_id === studentId)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = Math.max(0, total - paid);
      return { total: total || 15000, paid, balance };
    },
    [structures, payments]
  );

  const getFormName = useCallback(
    (formId: number) => {
      const f = forms.find((fm) => fm.id === formId);
      return f?.form_name || 'Unassigned';
    },
    [forms]
  );

  const getStreamName = useCallback(
    (streamId: number) => {
      const s = streams.find((st) => st.id === streamId);
      return s?.stream_name || 'General';
    },
    [streams]
  );

  // Tag students with curriculum & payment metrics
  const enrichedStudents = useMemo(() => {
    return students.map((st) => {
      const f = forms.find((fm) => fm.id === st.form_id);
      const isCbc =
        f?.education_system === 'CBC_Senior_School' ||
        f?.form_name?.toLowerCase().includes('grade 10') ||
        f?.form_name?.toLowerCase().includes('grade 11') ||
        f?.form_name?.toLowerCase().includes('grade 12');
      const isJss =
        f?.education_system === 'Junior_Secondary' ||
        f?.form_name?.toLowerCase().includes('grade 7') ||
        f?.form_name?.toLowerCase().includes('grade 8') ||
        f?.form_name?.toLowerCase().includes('grade 9');
      const track: '8-4-4' | 'cbc' | 'jss' = isCbc ? 'cbc' : isJss ? 'jss' : '8-4-4';

      const fees = getStudentFees(st.id, st.form_id);
      const studentPayments = payments.filter((p) => p.student_id === st.id);
      const lastPayment = studentPayments[0];
      const lastPaymentDate = lastPayment?.payment_date || null;
      const paymentCount = studentPayments.length;

      // Overdue aging calculation
      const now = new Date();
      const lastDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date(now.getFullYear(), 0, 1);
      const daysOverdue = fees.balance > 0 ? Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / 86400000)) : 0;

      // Risk score: 0 (safe) to 100 (critical default)
      const paidRatio = fees.total > 0 ? fees.paid / fees.total : 0;
      const recencyFactor = Math.max(0, 1 - daysOverdue / 120) * 35;
      const consistencyFactor = Math.min(1, paymentCount / 3) * 35;
      const amountFactor = paidRatio * 30;
      const riskScore = fees.balance === 0 ? 0 : Math.round(100 - (recencyFactor + consistencyFactor + amountFactor));
      const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';

      return {
        ...st,
        fullName: `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Student',
        admNo: st.admission_number || st.admission_no || `ADM-${st.id}`,
        formName: getFormName(st.form_id),
        streamName: getStreamName(st.stream_id),
        track,
        fees,
        paid: fees.paid,
        balance: fees.balance,
        rate: pct(fees.paid, fees.total),
        lastPaymentDate,
        lastPaymentRef: lastPayment?.reference_number || lastPayment?.receipt_number || 'Cash Deposit',
        lastPaymentMethod: lastPayment?.payment_method || 'Cash',
        daysOverdue,
        riskScore,
        riskLevel,
        isCleared: fees.balance === 0,
      };
    });
  }, [students, forms, payments, getStudentFees, getFormName, getStreamName]);

  // Curriculum Filtered Students
  const filteredStudents = useMemo(() => {
    if (curriculumFilter === 'all') return enrichedStudents;
    return enrichedStudents.filter((s) => s.track === curriculumFilter);
  }, [enrichedStudents, curriculumFilter]);

  // Cleared vs Defaulters cohorts
  const clearedCohort = useMemo(() => {
    return filteredStudents.filter((s) => s.isCleared);
  }, [filteredStudents]);

  const arrearsCohort = useMemo(() => {
    return filteredStudents.filter((s) => !s.isCleared).sort((a, b) => b.balance - a.balance);
  }, [filteredStudents]);

  /* ══════════════════════════════════════════════════════════════
     EXECUTIVE KPIS & TOTALS
  ══════════════════════════════════════════════════════════════ */
  const totalExpected = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + s.fees.total, 0);
  }, [filteredStudents]);

  const totalCollected = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + s.fees.paid, 0);
  }, [filteredStudents]);

  const totalArrears = Math.max(0, totalExpected - totalCollected);
  const recoveryRate = pct(totalCollected, totalExpected);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayVelocity = useMemo(() => {
    return payments
      .filter((p) => (p.payment_date || '').startsWith(todayStr))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments, todayStr]);

  const totalExpenses = useMemo(() => {
    return expenses
      .filter((e) => (e.status || 'approved').toLowerCase() === 'approved')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const netOperatingSurplus = totalCollected - totalExpenses;

  /* ══════════════════════════════════════════════════════════════
     FORM & STREAM PERFORMANCE BREAKDOWN
  ══════════════════════════════════════════════════════════════ */
  const formPerformance = useMemo(() => {
    const list = forms.map((f) => {
      const fStudents = enrichedStudents.filter((s) => s.form_id === f.id);
      const expected = fStudents.reduce((sum, s) => sum + s.fees.total, 0);
      const collected = fStudents.reduce((sum, s) => sum + s.fees.paid, 0);
      const balance = Math.max(0, expected - collected);
      const rate = pct(collected, expected);
      const clearedCount = fStudents.filter((s) => s.isCleared).length;
      return {
        id: f.id,
        formName: f.form_name,
        studentsCount: fStudents.length,
        expected,
        collected,
        balance,
        rate,
        clearedCount,
        arrearsCount: fStudents.length - clearedCount,
      };
    });

    return list.sort((a, b) => {
      if (formSortBy === 'rate') return b.rate - a.rate;
      if (formSortBy === 'arrears') return b.balance - a.balance;
      return b.collected - a.collected;
    });
  }, [forms, enrichedStudents, formSortBy]);

  const streamPerformance = useMemo(() => {
    return streams.map((st) => {
      const stStudents = enrichedStudents.filter((s) => s.stream_id === st.id);
      const expected = stStudents.reduce((sum, s) => sum + s.fees.total, 0);
      const collected = stStudents.reduce((sum, s) => sum + s.fees.paid, 0);
      const balance = Math.max(0, expected - collected);
      const rate = pct(collected, expected);
      return {
        id: st.id,
        streamName: st.stream_name,
        formName: getFormName(st.form_id),
        studentsCount: stStudents.length,
        expected,
        collected,
        balance,
        rate,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [streams, enrichedStudents, getFormName]);

  /* ══════════════════════════════════════════════════════════════
     CROSS-SUBSYSTEM AGGREGATES (Stores, Procurement, Cashbook, Payroll, Assets)
  ══════════════════════════════════════════════════════════════ */
  const crossSubsystems = useMemo(() => {
    // Cashbook reconciliation
    const cashInDrawer = payments
      .filter((p) => (p.payment_method || '').toLowerCase() === 'cash')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const bankDeposits = payments
      .filter((p) => (p.payment_method || '').toLowerCase().includes('bank') || (p.payment_method || '').toLowerCase().includes('kcb') || (p.payment_method || '').toLowerCase().includes('equity'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const mpesaTill = payments
      .filter((p) => (p.payment_method || '').toLowerCase().includes('mpesa') || (p.payment_method || '').toLowerCase().includes('m-pesa'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Budget & Vote Heads
    const votesAnalysis = budgetVotes.map((bv) => {
      const disbursed = expenses
        .filter((e) => e.vote_id === bv.id || (e.title || '').toLowerCase().includes((bv.vote_name || '').toLowerCase()))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const budget = Number(bv.budget_amount || bv.allocated_amount || 0);
      const variance = budget - disbursed;
      const burnRate = pct(disbursed, budget);
      return {
        voteCode: bv.vote_code || 'VH-01',
        voteName: bv.vote_name || 'General Operations',
        budgetAmount: budget,
        actualDisbursed: disbursed,
        variance,
        burnRate,
      };
    });

    // Stores & Kitchen
    const totalStoreItems = storeItems.length;
    const kitchenItems = storeItems.filter((i) => i.is_kitchen || (i.category || '').toLowerCase().includes('kitchen') || (i.category || '').toLowerCase().includes('food'));
    const totalStockValuation = storeItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const reorderAlertsCount = storeItems.filter((i) => Number(i.quantity || 0) <= Number(i.reorder_level || 0)).length;

    // Procurement / LPOs
    const deliveredPOs = purchaseOrders.filter((po) => (po.status || '').toLowerCase() === 'delivered');
    const pendingPOs = purchaseOrders.filter((po) => (po.status || '').toLowerCase() !== 'delivered');
    const deliveredValue = deliveredPOs.reduce((sum, po) => sum + Number(po.grand_total || po.total_amount || 0), 0);
    const pendingValue = pendingPOs.reduce((sum, po) => sum + Number(po.grand_total || po.total_amount || 0), 0);

    // Fixed Capital Assets
    const assetsCount = assets.length;
    const purchaseCost = assets.reduce((sum, a) => sum + Number(a.purchase_price || 0) * Number(a.quantity || 1), 0);
    const currentBookValue = assets.reduce((sum, a) => sum + Number(a.current_value || a.purchase_price || 0) * Number(a.quantity || 1), 0);

    // Payroll & Statutory Remittances
    const totalStaff = payrollRows.length;
    const grossPayroll = payrollRows.reduce((sum, p) => sum + Number(p.gross_pay || p.basic_salary || 0), 0);
    const netPayroll = payrollRows.reduce((sum, p) => sum + Number(p.net_pay || 0), 0);
    const paye = payrollRows.reduce((sum, p) => sum + Number(p.paye || 0), 0);
    const housingLevy = payrollRows.reduce((sum, p) => sum + Number(p.housing_levy || 0), 0);
    const shaNhif = payrollRows.reduce((sum, p) => sum + Number(p.nhif || 0), 0);
    const nssf = payrollRows.reduce((sum, p) => sum + Number(p.nssf || 0), 0);

    return {
      cashbook: {
        cashInDrawer,
        bankDeposits,
        mpesaTill,
        totalIntake: totalCollected,
      },
      budgetVotes: votesAnalysis,
      storesKitchen: {
        totalStoreItems,
        kitchenItemsCount: kitchenItems.length,
        totalStockValuation,
        reorderAlertsCount,
      },
      procurement: {
        totalPOs: purchaseOrders.length,
        deliveredValue,
        pendingValue,
      },
      fixedAssets: {
        assetsCount,
        purchaseCost,
        currentBookValue,
      },
      payrollStatutory: {
        totalStaff,
        grossPayroll,
        netPayroll,
        paye,
        housingLevy,
        shaNhif,
        nssf,
      },
    };
  }, [payments, totalCollected, budgetVotes, expenses, storeItems, purchaseOrders, assets, payrollRows]);

  /* ══════════════════════════════════════════════════════════════
     MOE FDSE CAPITATION AUDIT
  ══════════════════════════════════════════════════════════════ */
  const capitationAudit = useMemo(() => {
    const studentCount = enrichedStudents.length;
    const tuitionRate = 4144;
    const operationsRate = 18100;
    const tuitionAllocation = studentCount * tuitionRate;
    const operationsAllocation = studentCount * operationsRate;
    const totalFDSE = tuitionAllocation + operationsAllocation;
    const boardingReserves = totalCollected;

    return {
      totalStudents: studentCount,
      tuitionAllocation,
      operationsAllocation,
      totalFDSE,
      boardingReserves,
    };
  }, [enrichedStudents, totalCollected]);

  /* ══════════════════════════════════════════════════════════════
     CHART DATA GENERATORS
  ══════════════════════════════════════════════════════════════ */
  // 12-Month Linear Velocity
  const monthlyTrends = useMemo(() => {
    const months: { label: string; amount: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const mPayments = payments.filter((p) => {
        const pd = new Date(p.payment_date || p.created_at);
        return pd.getMonth() === m && pd.getFullYear() === y;
      });
      months.push({
        label,
        amount: mPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        count: mPayments.length,
      });
    }
    return months;
  }, [payments]);

  // Fee Aging Buckets
  const agingBuckets = useMemo(() => {
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
    enrichedStudents.forEach((st) => {
      if (st.balance <= 0) return;
      if (st.daysOverdue <= 30) buckets.current += st.balance;
      else if (st.daysOverdue <= 60) buckets.days30 += st.balance;
      else if (st.daysOverdue <= 90) buckets.days60 += st.balance;
      else if (st.daysOverdue <= 120) buckets.days90 += st.balance;
      else buckets.days90plus += st.balance;
    });
    return buckets;
  }, [enrichedStudents]);

  // Payment Method Breakdown
  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      const m = (p.payment_method || 'Cash').split('(')[0].trim();
      map[m] = (map[m] || 0) + Number(p.amount || 0);
    });
    return map;
  }, [payments]);

  /* ══════════════════════════════════════════════════════════════
     EXCEL EXPORT HANDLER
  ══════════════════════════════════════════════════════════════ */
  const handleExportExcel = async () => {
    try {
      toast.loading('Generating Enterprise Financial Workbook...', { id: 'excel-export' });
      await exportUltraFeesAnalyticsExcel({
        schoolName: schoolDetails.school_name,
        schoolMotto: schoolDetails.school_motto,
        schoolRegNo: schoolDetails.registration_number || '2566',
        schoolPostal: schoolDetails.postal_address || 'P.O. Box 112 Bomet',
        termName: currentTerm?.term_name || 'Academic Term',
        academicYear: currentYear,
        kpis: {
          totalExpected,
          totalCollected,
          totalArrears,
          recoveryRate,
          activeStudentsCount: enrichedStudents.length,
          defaultersCount: arrearsCohort.length,
          clearedCount: clearedCohort.length,
          todayVelocity,
          totalExpenses,
          netOperatingSurplus,
        },
        clearedStudents: clearedCohort.map((s) => ({
          admissionNo: s.admNo,
          studentName: s.fullName,
          formName: s.formName,
          streamName: s.streamName,
          paidAmount: s.paid,
          expectedAmount: s.fees.total,
          lastPaymentDate: s.lastPaymentDate ? new Date(s.lastPaymentDate).toLocaleDateString('en-KE') : 'Verified',
          method: s.lastPaymentMethod,
        })),
        arrearsStudents: arrearsCohort.map((s) => ({
          admissionNo: s.admNo,
          studentName: s.fullName,
          formName: s.formName,
          streamName: s.streamName,
          paidAmount: s.paid,
          balance: s.balance,
          daysOverdue: s.daysOverdue,
          riskLevel: s.riskLevel,
          guardianName: s.guardian_name || 'Parent/Guardian',
          guardianPhone: s.guardian_phone || '-',
        })),
        formPerformance: formPerformance.map((f, i) => ({
          ...f,
          rank: i + 1,
        })),
        streamPerformance: streamPerformance.map((s) => ({
          ...s,
        })),
        crossSubsystems,
        capitation: capitationAudit,
      });
      toast.success('Multi-Sheet Financial Intelligence Workbook Downloaded! 📊', { id: 'excel-export' });
    } catch (err: any) {
      console.error('Excel export error:', err);
      toast.error('Failed to export workbook: ' + err.message, { id: 'excel-export' });
    }
  };

  /* ══════════════════════════════════════════════════════════════
     PAGINATED DATA SUBSETS
  ══════════════════════════════════════════════════════════════ */
  // Filtered Cleared Students for Left Grid
  const paginatedCleared = useMemo(() => {
    let list = clearedCohort;
    if (paidSearch) {
      const q = paidSearch.toLowerCase();
      list = list.filter((s) => s.fullName.toLowerCase().includes(q) || s.admNo.toLowerCase().includes(q) || s.formName.toLowerCase().includes(q));
    }
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const safePage = Math.min(paidPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: list.slice(start, start + pageSize),
      totalCount: list.length,
      totalPages,
      currentPage: safePage,
    };
  }, [clearedCohort, paidSearch, paidPage]);

  // Filtered Arrears Students for Right Grid
  const paginatedArrears = useMemo(() => {
    let list = arrearsCohort;
    if (arrearsSearch) {
      const q = arrearsSearch.toLowerCase();
      list = list.filter((s) => s.fullName.toLowerCase().includes(q) || s.admNo.toLowerCase().includes(q) || s.formName.toLowerCase().includes(q));
    }
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const safePage = Math.min(arrearsPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: list.slice(start, start + pageSize),
      totalCount: list.length,
      totalPages,
      currentPage: safePage,
    };
  }, [arrearsCohort, arrearsSearch, arrearsPage]);

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
    <div className="space-y-4 pb-12">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          TOP EXECUTIVE BANNER & SCHOOL BRANDING BADGE
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/50 via-blue-50/20 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
              <FiBarChart2 size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                  {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  MOE Reg: {schoolDetails.registration_number || '2566'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE FISCAL ENGINE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
                Financial Intelligence & Analytics Hub
                <span className="text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                  MOTHER OF ALL ANALYTICS
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Side-by-side settlement cockpits, class velocities, cross-subsystem ledgers (stores, kitchen, LPOs, payroll, statutories) & MoE FDSE returns.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FiDownload size={13} /> Export 5-Sheet Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <FiPrinter size={13} /> Board Print
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Curriculum Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
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
            label: 'Recovery Rate',
            value: `${recoveryRate}%`,
            sub: recoveryRate >= 70 ? 'On Target' : 'Under Target',
            color: recoveryRate >= 70 ? '#15803d' : '#b91c1c',
            bg: recoveryRate >= 70 ? '#f0fdf4' : '#fffbeb',
            bd: recoveryRate >= 70 ? '#bbf7d0' : '#fde68a',
            icon: <FiTrendingUp className={recoveryRate >= 70 ? 'text-emerald-700' : 'text-amber-700'} size={13} />,
          },
          {
            label: 'Fully Cleared',
            value: String(clearedCohort.length),
            sub: `${pct(clearedCohort.length, filteredStudents.length)}% of Registry`,
            color: '#0369a1',
            bg: '#f0f9ff',
            bd: '#bae6fd',
            icon: <FiAward className="text-sky-700" size={13} />,
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
            sub: 'Approved Vouchers',
            color: '#7c3aed',
            bg: '#faf5ff',
            bd: '#ddd6fe',
            icon: <FiDollarSign className="text-purple-700" size={13} />,
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
            className="bg-white rounded-xl p-2.5 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs"
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
            <div className="mt-1">
              <p className="text-sm font-black font-mono tracking-tight" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-[9px] text-slate-400 font-medium truncate mt-0.2">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STANDALONE ULTRA TAB BAR (Matching settings/fees architecture)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'velocity', label: '📊 Revenue & Intake Velocity', badge: null },
          { id: 'settlement', label: '⚖️ Side-by-Side Settlement (Paid vs Arrears)', badge: `${clearedCohort.length} vs ${arrearsCohort.length}` },
          { id: 'classes', label: '🏫 Forms & Streams Velocity (High vs Low)', badge: `${formPerformance.length} Forms` },
          { id: 'matrix', label: '🏛️ Cross-Subsystem Matrix (Stores, Kitchen, LPO, Payroll)', badge: 'Integrated' },
          { id: 'capitation', label: '📋 MoE FDSE Capitation & Statutory Audit', badge: 'MoE' },
          { id: 'board', label: '📑 Board Financial Report Preview', badge: 'Print' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{t.label}</span>
              {t.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: REVENUE VELOCITY & SLEEK GRAPHS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'velocity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 12-Month Linear Velocity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
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
              <div className="h-64">
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
                          beginAtZero: true,
                          grid: { color: '#f1f5f9' },
                          ticks: {
                            callback: (v) => `${Number(v) / 1000}k`,
                            font: { size: 10 },
                          },
                        },
                        x: {
                          grid: { display: false },
                          ticks: { font: { size: 10 } },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Payment Methods Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FiPieChart className="text-emerald-600" /> Channel Inflow Distribution
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Payment Channels
                  </span>
                </div>
                <div className="h-48 relative flex items-center justify-center">
                  {mounted && Object.keys(methodBreakdown).length > 0 ? (
                    <Doughnut
                      data={{
                        labels: Object.keys(methodBreakdown),
                        datasets: [
                          {
                            data: Object.values(methodBreakdown),
                            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '72%',
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { boxWidth: 10, font: { size: 9 }, padding: 8 },
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.label}: KES ${(ctx.raw as number).toLocaleString('en-KE')}`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <p className="text-xs text-slate-400">No payment records found</p>
                  )}
                </div>
              </div>

              {/* Quick breakdown list */}
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                {Object.entries(methodBreakdown).slice(0, 3).map(([ch, val]) => (
                  <div key={ch} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">{ch}</span>
                    <span className="font-mono font-bold text-slate-800">{KES(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fee Aging Buckets Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FiClock className="text-amber-600" /> Delinquency Aging Velocity & Exposure Buckets
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Stratification of outstanding learner arrears by days since last payment</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                  Total Delinquent Exposure: {KES(totalArrears)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              {[
                { label: 'Current (0-30d)', amount: agingBuckets.current, color: '#16a34a', bg: '#f0fdf4', bd: '#bbf7d0' },
                { label: '31 - 60 Days', amount: agingBuckets.days30, color: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
                { label: '61 - 90 Days', amount: agingBuckets.days60, color: '#ea580c', bg: '#fff7ed', bd: '#fed7aa' },
                { label: '91 - 120 Days', amount: agingBuckets.days90, color: '#dc2626', bg: '#fef2f2', bd: '#fecaca' },
                { label: '120+ Days (Critical)', amount: agingBuckets.days90plus, color: '#991b1b', bg: '#fef2f2', bd: '#f87171' },
              ].map((b, i) => (
                <div key={i} className="p-2.5 rounded-xl border flex flex-col justify-between" style={{ background: b.bg, borderColor: b.bd }}>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{b.label}</span>
                  <p className="text-sm font-black font-mono mt-1" style={{ color: b.color }}>{KESM(b.amount)}</p>
                </div>
              ))}
            </div>

            <div className="h-44">
              {mounted && (
                <Bar
                  data={{
                    labels: ['0-30 Days (Current)', '31-60 Days', '61-90 Days', '91-120 Days', '120+ Days (Critical)'],
                    datasets: [
                      {
                        label: 'Arrears Balance (KES)',
                        data: [
                          agingBuckets.current,
                          agingBuckets.days30,
                          agingBuckets.days60,
                          agingBuckets.days90,
                          agingBuckets.days90plus,
                        ],
                        backgroundColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626', '#991b1b'],
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { callback: (v) => `${Number(v) / 1000}k`, font: { size: 9 } },
                      },
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: SIDE-BY-SIDE SETTLEMENT COCKPIT (PAID VS ARREARS)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'settlement' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <div>
                <p className="text-xs font-black text-blue-900">Side-by-Side Settlement Cockpit</p>
                <p className="text-[10px] text-blue-700">
                  Inspect fully cleared learners side-by-side with delinquent defaulters for instantaneous fiscal balancing and targeted recovery.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Cleared: {clearedCohort.length} Learners ({KESM(clearedCohort.reduce((s, c) => s + c.paid, 0))})
              </span>
              <span className="text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                Owing: {arrearsCohort.length} Learners ({KESM(arrearsCohort.reduce((s, c) => s + c.balance, 0))})
              </span>
            </div>
          </div>

          {/* DUAL SIDE-BY-SIDE GRIDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT GRID: FULLY CLEARED & ACTIVELY PAYING */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      <FiCheckCircle size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        Fully Cleared & Actively Paying
                      </h4>
                      <p className="text-[9px] text-emerald-700 font-medium">
                        Showing {paginatedCleared.items.length} of {paginatedCleared.totalCount} compliant accounts
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={11} />
                    <input
                      type="text"
                      placeholder="Filter cleared..."
                      value={paidSearch}
                      onChange={(e) => {
                        setPaidSearch(e.target.value);
                        setPaidPage(1);
                      }}
                      className="pl-7 pr-3 py-1 text-xs rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-3">Adm No</th>
                        <th className="py-2 px-3">Learner Name</th>
                        <th className="py-2 px-3">Form/Stream</th>
                        <th className="py-2 px-3 text-right">Paid (KES)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {paginatedCleared.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                            No cleared learners matching current filter
                          </td>
                        </tr>
                      ) : (
                        paginatedCleared.items.map((st) => (
                          <tr key={st.id} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] font-bold text-blue-700">
                              {st.admNo}
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-800 truncate max-w-[140px]">{st.fullName}</p>
                              <span className="text-[9px] text-slate-400 truncate block">
                                Ref: {st.lastPaymentRef}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-700">{st.formName}</span>
                              <span className="text-[9px] text-slate-400 block">{st.streamName}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {KES(st.paid)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                CLEARED
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* Left Pagination */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-medium">
                  Page {paginatedCleared.currentPage} of {paginatedCleared.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={paginatedCleared.currentPage <= 1}
                    onClick={() => setPaidPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <FiChevronLeft size={13} />
                  </button>
                  <button
                    disabled={paginatedCleared.currentPage >= paginatedCleared.totalPages}
                    onClick={() => setPaidPage((p) => p + 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <FiChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT GRID: PENDING & OVERDUE ARREARS */}
            <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-3 bg-rose-50/60 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                      <FiAlertTriangle size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                        Pending & Overdue Arrears
                      </h4>
                      <p className="text-[9px] text-rose-700 font-medium">
                        Showing {paginatedArrears.items.length} of {paginatedArrears.totalCount} defaulting accounts
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={11} />
                    <input
                      type="text"
                      placeholder="Filter arrears..."
                      value={arrearsSearch}
                      onChange={(e) => {
                        setArrearsSearch(e.target.value);
                        setArrearsPage(1);
                      }}
                      className="pl-7 pr-3 py-1 text-xs rounded-lg border border-rose-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 w-36 sm:w-44"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-3">Adm No</th>
                        <th className="py-2 px-3">Learner Name</th>
                        <th className="py-2 px-3">Form/Stream</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                        <th className="py-2 px-3 text-center">Overdue</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {paginatedArrears.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                            No overdue learners in current selection! 🎉
                          </td>
                        </tr>
                      ) : (
                        paginatedArrears.items.map((st) => (
                          <tr key={st.id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] font-bold text-rose-700">
                              {st.admNo}
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-800 truncate max-w-[130px]">{st.fullName}</p>
                              <span className="text-[9px] text-slate-400 truncate block">
                                Phone: {st.guardian_phone || 'No Phone'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-700">{st.formName}</span>
                              <span className="text-[9px] text-slate-400 block">{st.streamName}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              {KES(st.balance)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                st.daysOverdue > 90 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {st.daysOverdue}d
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {st.guardian_phone ? (
                                <a
                                  href={`tel:${st.guardian_phone}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                >
                                  <FiPhone size={9} /> Call
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Pagination */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-medium">
                  Page {paginatedArrears.currentPage} of {paginatedArrears.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={paginatedArrears.currentPage <= 1}
                    onClick={() => setArrearsPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <FiChevronLeft size={13} />
                  </button>
                  <button
                    disabled={paginatedArrears.currentPage >= paginatedArrears.totalPages}
                    onClick={() => setArrearsPage((p) => p + 1)}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <FiChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: FORMS & STREAMS PAYMENT VELOCITY (HIGH VS LOW)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FiUsers className="text-indigo-600" /> Academic Class Velocity Leaderboard
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Benchmark highest performing classes against lagging low-paying forms and streams
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sort By:</span>
              {(['rate', 'arrears', 'collected'] as const).map((sortBy) => (
                <button
                  key={sortBy}
                  onClick={() => setFormSortBy(sortBy)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all ${
                    formSortBy === sortBy
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sortBy === 'rate' ? 'Recovery %' : sortBy === 'arrears' ? 'Highest Arrears' : 'Total Intake'}
                </button>
              ))}
            </div>
          </div>

          {/* Form Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">Class / Form</th>
                    <th className="py-2.5 px-3 text-center">Learners</th>
                    <th className="py-2.5 px-3 text-right">Expected (KES)</th>
                    <th className="py-2.5 px-3 text-right">Collected (KES)</th>
                    <th className="py-2.5 px-3 text-right">Arrears Due (KES)</th>
                    <th className="py-2.5 px-3">Recovery Velocity</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {formPerformance.map((f, i) => {
                    const isHighPaying = f.rate >= 60;
                    const isLowPaying = f.rate < 30;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          #{i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {f.formName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                          {f.studentsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {KES(f.expected)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {KES(f.collected)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          {KES(f.balance)}
                        </td>
                        <td className="py-2.5 px-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, f.rate)}%`,
                                  background: isHighPaying ? '#16a34a' : isLowPaying ? '#dc2626' : '#d97706',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600 w-8 text-right">
                              {f.rate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isHighPaying ? (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              HIGH VELOCITY
                            </span>
                          ) : isLowPaying ? (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              LOW PAYING ⚠️
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              MODERATE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Granular Stream Breakdown Cards */}
          <div className="mt-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
              Granular Stream Performance Matrix ({streamPerformance.length} Streams)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {streamPerformance.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{s.streamName}</span>
                      <span className="text-[9.5px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {s.studentsCount} Learners
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.formName}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Collected</p>
                      <p className="text-xs font-mono font-bold text-emerald-700">{KESM(s.collected)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Recovery Rate</p>
                      <p className="text-xs font-mono font-bold text-blue-700">{s.rate}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: CROSS-SUBSYSTEM MATRIX (Stores, Kitchen, LPO, Payroll, etc.)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <div>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  Cross-Subsystem Integrated Financial Matrix
                </p>
                <p className="text-[10px] text-indigo-700">
                  Consolidated miniature executive reports side-by-side with 1-click deep links to every underlying institutional ledger.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg">
              8 Real-Time Operational Subsystems
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Cashbook & Drawer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <FiDollarSign size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Cashier Cashbook & Drawer</h4>
                  </div>
                  <Link
                    href="/dashboard/finance/cashbook"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Cash in Drawer (Petty):</span>
                    <span className="font-mono font-bold text-slate-800">{KES(crossSubsystems.cashbook.cashInDrawer)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Bank Direct Deposits:</span>
                    <span className="font-mono font-bold text-slate-800">{KES(crossSubsystems.cashbook.bankDeposits)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">M-Pesa Till / Paybill:</span>
                    <span className="font-mono font-bold text-slate-800">{KES(crossSubsystems.cashbook.mpesaTill)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-700">Total Liquid Intake:</span>
                    <span className="font-mono text-emerald-700">{KES(crossSubsystems.cashbook.totalIntake)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Stores & Kitchen Inventory */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      <FiPackage size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Stores & Kitchen Provisions</h4>
                  </div>
                  <Link
                    href="/dashboard/stores"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Inventory Items Tracked:</span>
                    <span className="font-mono font-bold text-slate-800">{crossSubsystems.storesKitchen.totalStoreItems} Items</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Kitchen Provisions Count:</span>
                    <span className="font-mono font-bold text-slate-800">{crossSubsystems.storesKitchen.kitchenItemsCount} Items</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Stock Valuation (KES):</span>
                    <span className="font-mono font-bold text-emerald-700">{KES(crossSubsystems.storesKitchen.totalStockValuation)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-700">Reorder Level Alerts:</span>
                    <span className="font-mono text-rose-600">{crossSubsystems.storesKitchen.reorderAlertsCount} Items Low</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Procurement & Purchase Orders */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <FiShoppingCart size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Procurement & LPO Commitments</h4>
                  </div>
                  <Link
                    href="/dashboard/procurement"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Total Purchase Orders:</span>
                    <span className="font-mono font-bold text-slate-800">{crossSubsystems.procurement.totalPOs} LPOs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Delivered Commitments:</span>
                    <span className="font-mono font-bold text-emerald-700">{KES(crossSubsystems.procurement.deliveredValue)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-700">Pending Supplier Fulfillment:</span>
                    <span className="font-mono text-amber-700">{KES(crossSubsystems.procurement.pendingValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Payroll & Statutory Remittances */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <FiUsers size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Payroll & Statutory (KRA/SHA)</h4>
                  </div>
                  <Link
                    href="/dashboard/staff/salary-slips"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Gross Monthly Payroll:</span>
                    <span className="font-mono font-bold text-slate-800">{KES(crossSubsystems.payrollStatutory.grossPayroll)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">PAYE (KRA Statutory Tax):</span>
                    <span className="font-mono font-bold text-rose-600">{KES(crossSubsystems.payrollStatutory.paye)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Housing Levy (1.5%):</span>
                    <span className="font-mono font-bold text-indigo-700">{KES(crossSubsystems.payrollStatutory.housingLevy)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">SHA / NHIF (2.75%):</span>
                    <span className="font-mono font-bold text-emerald-700">{KES(crossSubsystems.payrollStatutory.shaNhif)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold">
                    <span className="text-slate-700">NSSF Tier I & II:</span>
                    <span className="font-mono text-purple-700">{KES(crossSubsystems.payrollStatutory.nssf)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Fixed Capital Assets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                      <FiArchive size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Fixed Capital Assets Register</h4>
                  </div>
                  <Link
                    href="/dashboard/assets"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Registered Assets:</span>
                    <span className="font-mono font-bold text-slate-800">{crossSubsystems.fixedAssets.assetsCount} Units</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Acquisition Cost:</span>
                    <span className="font-mono font-bold text-slate-800">{KES(crossSubsystems.fixedAssets.purchaseCost)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-700">Current Net Book Value:</span>
                    <span className="font-mono text-blue-700">{KES(crossSubsystems.fixedAssets.currentBookValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Trial Balance, P&L & Balance Sheet */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <FiFileText size={15} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">P&L, Trial Balance & Balance Sheet</h4>
                  </div>
                  <Link
                    href="/dashboard/finance/trial-balance"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                  >
                    Open Page <FiExternalLink size={9} />
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Total Fee Revenue:</span>
                    <span className="font-mono font-bold text-emerald-700">{KES(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Operating Expenses & Vouchers:</span>
                    <span className="font-mono font-bold text-rose-600">{KES(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-700">Net Operating Surplus:</span>
                    <span className={`font-mono ${netOperatingSurplus >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {KES(netOperatingSurplus)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: MOE FDSE CAPITATION & STATUTORY AUDIT
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'capitation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FiBookOpen className="text-blue-700" /> MoE FDSE Capitation Ring-Fencing Audit
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Official Ministry of Education secondary capitation formula: Tuition (KES 4,144) vs Operations (KES 18,100) per learner
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                Total Enrolled: {capitationAudit.totalStudents} Learners
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Statutory Ring-Fenced Component</th>
                    <th className="py-2.5 px-3 text-center">MoE Rate / Student</th>
                    <th className="py-2.5 px-3 text-center">Enrolled Count</th>
                    <th className="py-2.5 px-3 text-right">Total Expected Intake (KES)</th>
                    <th className="py-2.5 px-3">Statutory Audit Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      MoE Tuition Account (Textbooks, Teaching & Learning Materials)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      KES 4,144.00
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{capitationAudit.totalStudents}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {KES(capitationAudit.tuitionAllocation)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        NON-VIREMENT STRICT
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      MoE Operations Account (RMI, Electricity, Water, Non-Teaching Remuneration)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      KES 18,100.00
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{capitationAudit.totalStudents}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {KES(capitationAudit.operationsAllocation)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        DISBURSED VIA TREASURY
                      </span>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/80 font-bold">
                    <td className="py-3 px-3 text-slate-900">
                      TOTAL STATUTORY FDSE CAPITATION FORMULA
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-700">
                      KES 22,244.00
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{capitationAudit.totalStudents}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-900 text-sm">
                      {KES(capitationAudit.totalFDSE)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        GOVERNMENT GRANT
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      Boarding Fees & Extra-Curricular Levies (Parent Accounts)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      Varies by Form
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{capitationAudit.totalStudents}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {KES(capitationAudit.boardingReserves)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        BOG RING-FENCED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 6: BOARD FINANCIAL REPORT PREVIEW
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'board' && (
        <div className="space-y-4 print-area">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 shadow-md" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
            <div className="text-center border-b-2 border-blue-900 pb-4 mb-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
                {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </h2>
              <p className="text-xs text-slate-600 italic mt-0.5">
                "{schoolDetails.school_motto || 'Excellence in Education'}" • MoE Registration: {schoolDetails.registration_number || '2566'} • {schoolDetails.postal_address || 'P.O. Box 112 Bomet'}
              </p>
              <h3 className="text-base font-bold text-blue-900 uppercase mt-2 tracking-wide">
                EXECUTIVE BOARD OF GOVERNORS FINANCIAL INTELLIGENCE REPORT
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Academic Cycle: {currentYear} ({currentTerm?.term_name || 'Term 3'}) — Audited on {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Fee Collections & Fiscal Intake
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Total Expected Collections:</span><span className="font-bold">{KES(totalExpected)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Actual Revenue Intake:</span><span className="font-bold text-emerald-700">{KES(totalCollected)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Outstanding Delinquent Arrears:</span><span className="font-bold text-rose-700">{KES(totalArrears)}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Collection Recovery Rate:</span><span className="font-bold text-blue-800">{recoveryRate}%</span></div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Institutional Operations & Net Position
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Approved Operating Disbursements:</span><span className="font-bold text-slate-900">{KES(totalExpenses)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Stores & Kitchen Provisions Valuation:</span><span className="font-bold text-emerald-700">{KES(crossSubsystems.storesKitchen.totalStockValuation)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Gross Monthly Payroll Remuneration:</span><span className="font-bold text-purple-700">{KES(crossSubsystems.payrollStatutory.grossPayroll)}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Net Operational Surplus / (Deficit):</span><span className={`font-bold ${netOperatingSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{KES(netOperatingSurplus)}</span></div>
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2" style={{ fontFamily: 'sans-serif' }}>
              Form-Level Performance Ledger
            </h4>
            <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700">
                  <th className="border border-slate-300 px-3 py-1.5 text-left">Class / Form</th>
                  <th className="border border-slate-300 px-3 py-1.5 text-center">Learners</th>
                  <th className="border border-slate-300 px-3 py-1.5 text-right">Expected (KES)</th>
                  <th className="border border-slate-300 px-3 py-1.5 text-right">Collected (KES)</th>
                  <th className="border border-slate-300 px-3 py-1.5 text-right">Arrears (KES)</th>
                  <th className="border border-slate-300 px-3 py-1.5 text-center">Rate</th>
                </tr>
              </thead>
              <tbody>
                {formPerformance.map((f) => (
                  <tr key={f.id}>
                    <td className="border border-slate-300 px-3 py-1.5 font-bold">{f.formName}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center">{f.studentsCount}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-right">{KES(f.expected)}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-right font-bold text-emerald-700">{KES(f.collected)}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-right font-bold text-rose-700">{KES(f.balance)}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-bold">{f.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-200" style={{ fontFamily: 'sans-serif' }}>
              <span>Certified Accurate by Principal & Bursar</span>
              <span>Generated by APSIMS Ultra Financial Suite</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

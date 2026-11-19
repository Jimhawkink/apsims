'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { exportUltraVoteHeadLedgerExcel } from '@/components/fees/UltraVoteHeadLedgerExport';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  FiZap,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiSearch,
  FiRefreshCw,
  FiGrid,
  FiPrinter,
  FiDownload,
  FiLayers,
  FiShield,
  FiPieChart,
  FiBookOpen,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiFilter,
  FiArrowRight,
  FiSliders,
  FiArrowLeft,
  FiCreditCard,
  FiCalendar,
  FiFileText,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiActivity,
  FiExternalLink,
} from 'react-icons/fi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
);

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & FORMATTERS
   ══════════════════════════════════════════════════════════════════════════════ */
interface VoteHead {
  id: number;
  code: string;
  name: string;
  category: string;
  priority: number;
  is_active: boolean;
  description: string | null;
  color: string | null;
}

interface FeeStructure {
  id: number;
  vote_head_id: number | null;
  vote_head_name: string | null;
  form_id: number;
  term_id: number | null;
  amount: number;
  category: string | null;
  year: number;
}

interface Expense {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  approved_by: string | null;
  status: string | null;
  vote_id: number | null;
  reference_number: string | null;
  year: number | null;
  term_id: number | null;
}

interface BudgetVote {
  id: number;
  vote_code: string | null;
  vote_name: string;
  category: string | null;
  allocated_amount: number | null;
  budget_amount: number | null;
  spent_amount: number | null;
  balance: number | null;
  academic_year: string | null;
  notes: string | null;
}

interface SchoolTerm {
  id: number;
  term_name: string;
  is_current: boolean;
  year: number;
}

interface SchoolForm {
  id: number;
  form_name: string;
  education_system?: string;
}

const fmtKES = (n: number) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const CHART_PALETTE = [
  '#4f46e5',
  '#16a34a',
  '#0891b2',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#ea580c',
  '#0d9488',
  '#2563eb',
  '#db2777',
];

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function VoteHeadLedgerPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentYear = new Date().getFullYear();

  // Selected Filters
  const [selYear, setSelYear] = useState<number>(currentYear);
  const [selTerm, setSelTerm] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'ledger' | 'journals' | 'analytics' | 'circular'>('ledger');

  // Live Database States
  const [schoolDetails, setSchoolDetails] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
    postal_address: '112 BOMET',
    county: 'Bomet',
  });
  const [heads, setHeads] = useState<VoteHead[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetVotes, setBudgetVotes] = useState<BudgetVote[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [forms, setForms] = useState<SchoolForm[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState<number>(127);

  // Search & Filters inside Ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'surplus' | 'warning' | 'deficit'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search & Filters inside Journals
  const [journalSearch, setJournalSearch] = useState('');
  const [journalHeadFilter, setJournalHeadFilter] = useState('all');
  const [journalPage, setJournalPage] = useState(1);

  // Modals
  const [inspectVh, setInspectVh] = useState<any | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vote_id: '',
    payment_method: 'Cash',
    reference_number: '',
    approved_by: 'BOG / PRINCIPAL',
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Budget Form State
  const [budgetForm, setBudgetForm] = useState({
    vote_name: '',
    vote_code: '',
    budget_amount: '',
    category: 'Operations',
    academic_year: String(currentYear),
    notes: '',
  });
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── 1. Fetch All Supabase Data ─────────────────────────────────────── */
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [
        detailsRes,
        headsRes,
        structRes,
        expRes,
        bvRes,
        termsRes,
        formsRes,
        payRes,
        studRes,
      ] = await Promise.all([
        supabase
          .from('school_details')
          .select('*')
          .neq('section', 'primary')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('school_vote_heads')
          .select('*')
          .order('priority', { ascending: true }),
        supabase
          .from('school_fee_structures')
          .select('id,vote_head_id,vote_head_name,form_id,term_id,amount,category,year')
          .eq('year', selYear),
        supabase
          .from('school_expenses')
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase
          .from('school_budget_votes')
          .select('*')
          .eq('academic_year', String(selYear)),
        supabase
          .from('school_terms')
          .select('*')
          .order('id', { ascending: true }),
        supabase
          .from('school_forms')
          .select('id,form_name,education_system')
          .order('id', { ascending: true }),
        supabase
          .from('school_fee_payments')
          .select('id,amount,payment_date,term_id,payment_method'),
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Active'),
      ]);

      if (detailsRes.data) setSchoolDetails(detailsRes.data);
      if (headsRes.data) setHeads(headsRes.data);
      if (structRes.data) setStructures(structRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (bvRes.data) setBudgetVotes(bvRes.data);
      if (termsRes.data) setTerms(termsRes.data);
      if (formsRes.data) setForms(formsRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (studRes.count) setStudentCount(studRes.count);

      // Default current term if unset
      const current = (termsRes.data || []).find((t: any) => t.is_current);
      if (current && selTerm === 'all') {
        // keep 'all' or default
      }
    } catch (err: any) {
      console.error('Error loading vote head ledger:', err);
      toast.error('Failed to load ledger data: ' + (err?.message || 'DB Error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selYear, selTerm]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /* ── 2. Unified Vote Head Ledger Computation ────────────────────────── */
  const ledgerRows = useMemo(() => {
    const totalPaymentsAll = (
      selTerm !== 'all'
        ? payments.filter((p) => String(p.term_id) === String(selTerm))
        : payments
    ).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalStructureFeeAll = structures.reduce((sum, s) => sum + Number(s.amount || 0), 0);

    return heads.map((vh) => {
      // Fee structures linked to this vote head
      const vhStructures = structures.filter(
        (s) =>
          (s.vote_head_id && s.vote_head_id === vh.id) ||
          (s.vote_head_name && s.vote_head_name.toLowerCase() === vh.name.toLowerCase()) ||
          (s.category && s.category.toLowerCase() === vh.name.toLowerCase())
      );

      const vhStructureSum = vhStructures.reduce((sum, s) => sum + Number(s.amount || 0), 0);

      // Proportion of annual fees allocated to this head
      const feeProportion = totalStructureFeeAll > 0 ? vhStructureSum / totalStructureFeeAll : 0;
      const feeIncome = Math.round(totalPaymentsAll * feeProportion);

      // Budget Allocation from school_budget_votes or estimated
      const matchedBv = budgetVotes.find(
        (bv) =>
          (bv.vote_code && bv.vote_code.toLowerCase() === vh.code.toLowerCase()) ||
          bv.vote_name.toLowerCase().includes(vh.name.toLowerCase().slice(0, 5)) ||
          vh.name.toLowerCase().includes(bv.vote_name.toLowerCase().slice(0, 5))
      );

      // If explicit budget vote exists, take budget_amount or allocated_amount; else project from structures × student population
      const budgeted = matchedBv
        ? Number(matchedBv.budget_amount || matchedBv.allocated_amount || 0)
        : vhStructureSum * Math.max(1, studentCount);

      // Real Expenses from school_expenses debited against this vote head
      const vhExpenses = expenses.filter((e) => {
        const matchesVoteId = e.vote_id && e.vote_id === vh.id;
        const matchesTitle = e.title && e.title.toLowerCase().includes(vh.name.toLowerCase().slice(0, 4));
        const matchesDesc =
          e.description && e.description.toLowerCase().includes(vh.name.toLowerCase().slice(0, 4));
        const matchesCode = e.title && e.title.toLowerCase().includes(vh.code.toLowerCase());
        return matchesVoteId || matchesTitle || matchesDesc || matchesCode;
      });

      const expenseTotal = vhExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      // Effective Base for Balance: Budget if set, otherwise fee collections intake
      const effectiveRevenue = budgeted > 0 ? budgeted : feeIncome;
      const balance = effectiveRevenue - expenseTotal;
      const utilization = effectiveRevenue > 0 ? Math.round((expenseTotal / effectiveRevenue) * 100) : 0;

      let status: 'surplus' | 'warning' | 'deficit' = 'surplus';
      if (utilization > 100 || balance < 0) status = 'deficit';
      else if (utilization >= 80) status = 'warning';

      return {
        vh,
        budgeted,
        feeIncome,
        expenses: expenseTotal,
        balance,
        utilization,
        status,
        structuresCount: vhStructures.length,
        expenseVouchers: vhExpenses,
      };
    });
  }, [heads, structures, payments, budgetVotes, expenses, studentCount, selTerm]);

  /* ── 3. Ledger Totals Summary ───────────────────────────────────────── */
  const totals = useMemo(() => {
    const totalBudgeted = ledgerRows.reduce((s, r) => s + r.budgeted, 0);
    const totalFeeIncome = ledgerRows.reduce((s, r) => s + r.feeIncome, 0);
    const totalExpenses = ledgerRows.reduce((s, r) => s + r.expenses, 0);
    const totalBalance = ledgerRows.reduce((s, r) => s + r.balance, 0);
    const overallBurnRate =
      totalBudgeted > 0
        ? Math.round((totalExpenses / totalBudgeted) * 100)
        : totalFeeIncome > 0
        ? Math.round((totalExpenses / totalFeeIncome) * 100)
        : 0;

    return {
      budgeted: totalBudgeted,
      feeIncome: totalFeeIncome,
      expenses: totalExpenses,
      balance: totalBalance,
      burnRate: overallBurnRate,
    };
  }, [ledgerRows]);

  /* ── 4. Filtered & Paginated Ledger ─────────────────────────────────── */
  const filteredLedger = useMemo(() => {
    return ledgerRows.filter((row) => {
      const matchSearch =
        searchQuery === '' ||
        row.vh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.vh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.vh.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = catFilter === 'all' || row.vh.category.toUpperCase() === catFilter.toUpperCase();
      const matchHealth = healthFilter === 'all' || row.status === healthFilter;

      return matchSearch && matchCat && matchHealth;
    });
  }, [ledgerRows, searchQuery, catFilter, healthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / pageSize));
  const paginatedLedger = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLedger.slice(start, start + pageSize);
  }, [filteredLedger, page, pageSize]);

  /* ── 5. Itemized Expenses Journals Tab Data ─────────────────────────── */
  const filteredJournals = useMemo(() => {
    return expenses.filter((e) => {
      const q = journalSearch.toLowerCase();
      const matchSearch =
        journalSearch === '' ||
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.reference_number?.toLowerCase().includes(q) ||
        e.payment_method?.toLowerCase().includes(q);

      const matchHead =
        journalHeadFilter === 'all' ||
        (e.vote_id && String(e.vote_id) === journalHeadFilter) ||
        (e.title && e.title.toLowerCase().includes(journalHeadFilter.toLowerCase()));

      return matchSearch && matchHead;
    });
  }, [expenses, journalSearch, journalHeadFilter]);

  const totalJournalPages = Math.max(1, Math.ceil(filteredJournals.length / 10));
  const paginatedJournals = useMemo(() => {
    const start = (journalPage - 1) * 10;
    return filteredJournals.slice(start, start + 10);
  }, [filteredJournals, journalPage]);

  /* ── 6. Excel Workbook Export ───────────────────────────────────────── */
  const handleExportExcel = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating official Microsoft Excel (.xlsx) Vote Head Ledger...');
    try {
      await exportUltraVoteHeadLedgerExcel({
        schoolName: schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT",
        schoolMotto: schoolDetails.school_motto || 'Excellence in Education',
        academicYear: selYear,
        termName:
          selTerm !== 'all'
            ? terms.find((t) => String(t.id) === selTerm)?.term_name || `Term ${selTerm}`
            : 'All Terms Consolidation',
        ledgerRows: ledgerRows.map((r) => ({
          code: r.vh.code,
          name: r.vh.name,
          category: r.vh.category,
          priority: r.vh.priority,
          budgeted: r.budgeted,
          feeIncome: r.feeIncome,
          capitation: 0,
          totalIncome: r.budgeted > 0 ? r.budgeted : r.feeIncome,
          expenses: r.expenses,
          balance: r.balance,
          utilization: r.utilization,
          status: r.status.toUpperCase(),
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          expense_date: e.expense_date,
          expense_name: e.title,
          vote_head: heads.find((h) => h.id === e.vote_id)?.name || 'General Operations',
          category: 'Operations',
          payment_method: e.payment_method || 'Cash',
          amount: Number(e.amount || 0),
          status: e.status || 'approved',
        })),
      });
      toast.success('Official Excel Ledger exported with St. Catherine branding! ✓', { id: toastId });
    } catch (err: any) {
      console.error('Export Error:', err);
      toast.error('Failed to export Excel workbook: ' + (err?.message || 'Error'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  /* ── 7. Handle Create Expense ────────────────────────────────────────── */
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      toast.error('Please enter expense title and amount');
      return;
    }
    setSavingExpense(true);
    try {
      const payload: any = {
        title: expenseForm.title.trim(),
        description: expenseForm.description.trim() || null,
        amount: Number(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method,
        approved_by: expenseForm.approved_by,
        status: 'approved',
        year: selYear,
        reference_number: expenseForm.reference_number || `PV/${Date.now().toString().slice(-4)}`,
      };
      if (expenseForm.vote_id) {
        payload.vote_id = Number(expenseForm.vote_id);
      }

      const { data, error } = await supabase.from('school_expenses').insert([payload]).select();
      if (error) throw error;

      toast.success('Expenditure disbursement recorded into ledger! 💸');
      setShowExpenseModal(false);
      setExpenseForm({
        title: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vote_id: '',
        payment_method: 'Cash',
        reference_number: '',
        approved_by: 'BOG / PRINCIPAL',
      });
      await fetchAllData();
    } catch (err: any) {
      toast.error('Failed to record expense: ' + err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  /* ── 8. Handle Save Budget ───────────────────────────────────────────── */
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.vote_name || !budgetForm.budget_amount) {
      toast.error('Please enter vote name and budget amount');
      return;
    }
    setSavingBudget(true);
    try {
      const payload: any = {
        vote_name: budgetForm.vote_name.trim(),
        vote_code: budgetForm.vote_code.trim() || null,
        budget_amount: Number(budgetForm.budget_amount),
        allocated_amount: Number(budgetForm.budget_amount),
        category: budgetForm.category,
        academic_year: String(selYear),
        notes: budgetForm.notes.trim() || null,
      };

      const { error } = await supabase.from('school_budget_votes').insert([payload]);
      if (error) throw error;

      toast.success('Budget allocation registered in Treasury! 📊');
      setShowBudgetModal(false);
      setBudgetForm({
        vote_name: '',
        vote_code: '',
        budget_amount: '',
        category: 'Operations',
        academic_year: String(selYear),
        notes: '',
      });
      await fetchAllData();
    } catch (err: any) {
      toast.error('Failed to save budget allocation: ' + err.message);
    } finally {
      setSavingBudget(false);
    }
  };

  /* ── 9. Print Official MoE Ledger ────────────────────────────────────── */
  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return (
    <div
      className="space-y-3.5 pb-12 max-w-[1400px] mx-auto text-slate-800"
      style={{ fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}
    >
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════════════════
          PRINT-ONLY OFFICIAL LETTERHEAD (MoE AUDIT COMPLIANT)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block p-8 bg-white border-b-2 border-slate-900 mb-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
            {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
          </h1>
          <p className="text-xs font-bold text-slate-500 italic uppercase">
            "{schoolDetails.school_motto || 'Excellence in Education'}"
          </p>
          <p className="text-xs font-mono text-slate-700">
            P.O. BOX {schoolDetails.postal_address || '112 BOMET'}, {schoolDetails.county || 'BOMET'}
          </p>
          <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between text-xs font-bold text-slate-600">
            <span>OFFICIAL VOTE HEAD TREASURY LEDGER &amp; EXPENDITURES</span>
            <span>
              ACADEMIC YEAR: {selYear} ·{' '}
              {selTerm !== 'all'
                ? terms.find((t) => String(t.id) === selTerm)?.term_name || `Term ${selTerm}`
                : 'All Terms Consolidated'}
            </span>
            <span>PRINTED: {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          1. EXECUTIVE COMMAND HEADER (Light & Tight Matching Fee Studios)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-black text-lg shrink-0">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Vote Head Treasury Ledger
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    totals.balance >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      : 'bg-rose-50 text-rose-700 border-rose-200/80'
                  }`}
                >
                  {totals.balance >= 0 ? '🟢 Surplus Position' : '🔴 Deficit Warning'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Double-entry allocation, MoE FDSE accounts, and real expenditure vouchers audit stream
              </p>
            </div>
          </div>

          {/* Super Premium Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <select
              value={selYear}
              onChange={(e) => setSelYear(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>

            {/* Term Selector */}
            <select
              value={selTerm}
              onChange={(e) => setSelTerm(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
            >
              <option value="all">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.term_name}
                </option>
              ))}
            </select>

            {/* + Record Expense Modal Trigger */}
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FiPlus size={13} />
              <span>Record Expense</span>
            </button>

            {/* + Set Budget Modal Trigger */}
            <button
              onClick={() => setShowBudgetModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FiDollarSign size={13} />
              <span>Set Budget</span>
            </button>

            {/* Excel Exporter */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export complete 2-sheet Excel ledger"
            >
              <FiDownload size={13} className="text-emerald-600" />
              <span>{isExporting ? 'Exporting...' : 'Excel'}</span>
            </button>

            {/* Print Summary */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print official audit ledger"
            >
              <FiPrinter size={13} className="text-blue-600" />
              <span>Print</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh ledger database"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin text-purple-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. STANDALONE ULTRA-PREMIUM WORKSPACE TAB BAR (MATCHING DASHBOARD/SETTINGS)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 print:hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Main Studio Navigation Tabs */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {[
              { id: 'ledger', label: 'Vote Heads Ledger', icon: '📊', count: heads.length, badge: '' },
              { id: 'journals', label: 'Expenditure Journals', icon: '💸', count: expenses.length, badge: '' },
              { id: 'analytics', label: 'Allocation Analytics', icon: '📈', count: 0, badge: 'Charts' },
              { id: 'circular', label: 'MoE Circular Splits', icon: '🏛️', count: 0, badge: 'MoE FDSE' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold'
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-black min-w-[18px] text-center ${
                        active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {t.badge && !t.count && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        active ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Studio Nav Links */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/dashboard/fees/vote-heads"
              className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition"
            >
              <span>⚡ Registry &amp; Matrix</span>
            </Link>
            <Link
              href="/dashboard/fees/payments"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition"
            >
              <span>💳 Payments</span>
            </Link>
            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition"
            >
              <span>🏠 Fees Desk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          3. EXECUTIVE FINANCIAL HUD (6 Low-Profile Compact Cards)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 print:hidden">
        {[
          {
            label: 'Total Vote Heads',
            value: heads.length,
            sub: `${heads.filter((h) => h.is_active).length} Active Accounts`,
            color: 'text-indigo-700',
            bg: 'bg-indigo-50/70',
            border: 'border-indigo-100',
            icon: <FiLayers size={14} className="text-indigo-600" />,
          },
          {
            label: 'Treasury Budgeted',
            value: fmtK(totals.budgeted),
            sub: `Academic Year ${selYear}`,
            color: 'text-blue-700',
            bg: 'bg-blue-50/70',
            border: 'border-blue-100',
            icon: <FiDollarSign size={14} className="text-blue-600" />,
          },
          {
            label: 'Fee Intake Allocated',
            value: fmtK(totals.feeIncome),
            sub: 'Apportioned collections',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/70',
            border: 'border-emerald-100',
            icon: <FiTrendingUp size={14} className="text-emerald-600" />,
          },
          {
            label: 'Total Disbursements',
            value: fmtK(totals.expenses),
            sub: `${expenses.length} Expense Vouchers`,
            color: 'text-rose-700',
            bg: 'bg-rose-50/70',
            border: 'border-rose-100',
            icon: <FiTrendingDown size={14} className="text-rose-600" />,
          },
          {
            label: 'Net Treasury Balance',
            value: fmtK(Math.abs(totals.balance)),
            sub: totals.balance >= 0 ? 'Net Surplus Reserve' : 'Deficit Shortfall',
            color: totals.balance >= 0 ? 'text-emerald-700' : 'text-rose-700',
            bg: totals.balance >= 0 ? 'bg-emerald-50/70' : 'bg-rose-50/70',
            border: totals.balance >= 0 ? 'border-emerald-200' : 'border-rose-200',
            icon: <FiCheckCircle size={14} className={totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} />,
          },
          {
            label: 'Overall Burn Rate',
            value: `${totals.burnRate}%`,
            sub: totals.burnRate > 100 ? 'Overspent' : totals.burnRate > 80 ? 'Near Limit' : 'Within Budget',
            color: totals.burnRate > 100 ? 'text-rose-700' : totals.burnRate > 80 ? 'text-amber-700' : 'text-emerald-700',
            bg: totals.burnRate > 100 ? 'bg-rose-50/70' : totals.burnRate > 80 ? 'bg-amber-50/70' : 'bg-emerald-50/70',
            border: 'border-slate-200',
            icon: <FiActivity size={14} className="text-purple-600" />,
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white border rounded-xl p-2.5 shadow-2xs flex flex-col justify-between ${kpi.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate mr-1">
                {kpi.label}
              </span>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="mt-1">
              <p className={`text-sm font-extrabold font-mono tracking-tight ${kpi.color}`}>
                {kpi.value}
              </p>
              <p className="text-[9.5px] text-slate-400 font-medium truncate mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: VOTE HEADS MASTER LEDGER
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="space-y-3.5 fade-in">
          {/* Side-to-Side Cockpit Directly on Top of Datagrid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Left Side: Search + Category Pills + Health Filter */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search vote head name, code, or category... (Ctrl+F)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Fiscal Health Filter Pills */}
                {[
                  { id: 'all', label: 'All Health' },
                  { id: 'surplus', label: '🟢 Surplus', count: ledgerRows.filter((r) => r.status === 'surplus').length },
                  { id: 'warning', label: '🟡 Warning', count: ledgerRows.filter((r) => r.status === 'warning').length },
                  { id: 'deficit', label: '🔴 Deficit', count: ledgerRows.filter((r) => r.status === 'deficit').length },
                ].map((hp) => {
                  const active = healthFilter === hp.id;
                  return (
                    <button
                      key={hp.id}
                      type="button"
                      onClick={() => {
                        setHealthFilter(hp.id as any);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-2xs font-extrabold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{hp.label}</span>
                      {hp.count !== undefined && (
                        <span
                          className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                            active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {hp.count}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Category Dropdown */}
                <select
                  value={catFilter}
                  onChange={(e) => {
                    setCatFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="TUITION">Tuition / Academic</option>
                  <option value="BOARDING">Boarding / Feeding</option>
                  <option value="OPERATIONS">Operations / Utilities</option>
                  <option value="EXAM">Examination Levies</option>
                  <option value="ACTIVITY">Activity / Sports</option>
                  <option value="R_M_I">RMI &amp; Maintenance</option>
                </select>
              </div>

              {/* Right Side: Volume Cockpit Badges + Page Size */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0 justify-between lg:justify-end">
                <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Budget:</span>
                  <span className="font-extrabold font-mono text-slate-800">{fmtK(totals.budgeted)}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Intake:</span>
                  <span className="font-extrabold font-mono text-emerald-700">{fmtK(totals.feeIncome)}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Spent:</span>
                  <span className="font-extrabold font-mono text-rose-700">{fmtK(totals.expenses)}</span>
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
                >
                  {[10, 15, 25].map((n) => (
                    <option key={n} value={n}>
                      {n} rows / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Elevated Datagrid Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3.5">Priority &amp; Vote Head</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Budgeted (KES)</th>
                    <th className="py-2.5 px-3 text-right">Fee Income (KES)</th>
                    <th className="py-2.5 px-3 text-right">Expenses (Real DB)</th>
                    <th className="py-2.5 px-3 text-right">Net Balance (KES)</th>
                    <th className="py-2.5 px-3 text-center">Burn Rate (%)</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        No vote heads matching your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedLedger.map((row) => {
                      const isSurplus = row.balance >= 0;
                      return (
                        <tr
                          key={row.vh.id}
                          className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                          onClick={() => setInspectVh(row)}
                        >
                          {/* Priority & Vote Head Name */}
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: row.vh.color || '#6366f1' }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-slate-900 text-xs group-hover:text-purple-700 transition">
                                    {row.vh.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-slate-100 text-slate-600">
                                    {row.vh.code}
                                  </span>
                                  <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-purple-50 text-purple-700">
                                    P{row.vh.priority}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">
                                  {row.vh.description || 'Standard accounting vote head'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {row.vh.category}
                            </span>
                          </td>

                          {/* Budgeted */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {row.budgeted > 0 ? fmtKES(row.budgeted) : <span className="text-slate-400">—</span>}
                          </td>

                          {/* Fee Income */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600">
                            {fmtKES(row.feeIncome)}
                          </td>

                          {/* Real DB Expenses */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                            <div className="flex items-center justify-end gap-1.5">
                              <span>{fmtKES(row.expenses)}</span>
                              {row.expenseVouchers.length > 0 && (
                                <span className="px-1 py-0.2 rounded-full text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {row.expenseVouchers.length}v
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Net Balance */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black text-xs ${
                              isSurplus ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {fmtKES(row.balance)}
                          </td>

                          {/* Burn Rate with Progress Bar */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="w-24 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span
                                  className={
                                    row.utilization > 100
                                      ? 'text-rose-600'
                                      : row.utilization > 80
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }
                                >
                                  {row.utilization}%
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {row.status === 'deficit' ? 'Over' : 'Safe'}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    row.utilization > 100
                                      ? 'bg-rose-500'
                                      : row.utilization > 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(3, row.utilization))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setInspectVh(row)}
                                className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 transition"
                                title="Inspect Vote Head Detail Drawer"
                              >
                                Inspect
                              </button>
                              <button
                                onClick={() => {
                                  setExpenseForm((prev) => ({
                                    ...prev,
                                    vote_id: String(row.vh.id),
                                    title: `${row.vh.name} Disbursement`,
                                  }));
                                  setShowExpenseModal(true);
                                }}
                                className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 transition"
                                title="Debit Expense Voucher to this vote head"
                              >
                                + Spent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td className="py-3 px-3.5 font-mono">∑ TREASURY TOTALS</td>
                    <td className="py-3 px-3 text-slate-400 text-[10px] uppercase">ALL ACCOUNTS</td>
                    <td className="py-3 px-3 text-right font-mono text-sky-400">{fmtKES(totals.budgeted)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">{fmtKES(totals.feeIncome)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">{fmtKES(totals.expenses)}</td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-sm ${
                        totals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {fmtKES(totals.balance)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{totals.burnRate}%</td>
                    <td className="py-3 px-3 text-center text-slate-400 text-[10px] print:hidden">AUDITED ✓</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Cockpit */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs print:hidden flex-wrap gap-2">
              <span className="text-slate-500 font-medium text-[11px]">
                Showing{' '}
                <strong className="text-slate-800">
                  {filteredLedger.length === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800">
                  {Math.min(page * pageSize, filteredLedger.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredLedger.length}</strong> vote heads
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  <FiChevronLeft size={12} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                      page === p
                        ? 'bg-purple-600 text-white font-extrabold shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  <FiChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: ITEMIZED EXPENDITURE JOURNALS
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'journals' && (
        <div className="space-y-3.5 fade-in">
          {/* Side-to-Side Cockpit on Top of Journals */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search expense description, payee, or voucher #..."
                  value={journalSearch}
                  onChange={(e) => {
                    setJournalSearch(e.target.value);
                    setJournalPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/80 focus:bg-white outline-none transition"
                />
              </div>

              <select
                value={journalHeadFilter}
                onChange={(e) => {
                  setJournalHeadFilter(e.target.value);
                  setJournalPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All Vote Heads</option>
                {heads.map((h) => (
                  <option key={h.id} value={String(h.id)}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                Disbursed: <strong className="text-rose-600">{fmtKES(totals.expenses)}</strong>
              </span>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiPlus size={13} />
                <span>+ New Voucher</span>
              </button>
            </div>
          </div>

          {/* Journals Datagrid Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3.5">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payee / Title</th>
                    <th className="py-2.5 px-3">Vote Head Account</th>
                    <th className="py-2.5 px-3">Payment Channel</th>
                    <th className="py-2.5 px-3">Approval</th>
                    <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedJournals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No expenditure vouchers recorded for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedJournals.map((e, idx) => {
                      const matchedHead = heads.find((h) => h.id === e.vote_id);
                      return (
                        <tr key={e.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700">
                            {e.reference_number || `PV/${e.id}`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{e.expense_date || '—'}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900">{e.title}</div>
                            {e.description && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">{e.description}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {matchedHead?.name || 'General Operations'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-600">
                            {e.payment_method || 'Cash / Cheque'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {e.status || 'APPROVED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 text-xs">
                            {fmtKES(e.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs print:hidden">
              <span className="text-slate-500 font-medium text-[11px]">
                Showing {filteredJournals.length === 0 ? 0 : (journalPage - 1) * 10 + 1} to{' '}
                {Math.min(journalPage * 10, filteredJournals.length)} of {filteredJournals.length} vouchers
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
                  disabled={journalPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  <FiChevronLeft size={12} />
                </button>
                <span className="px-2 text-slate-600 font-bold font-mono">
                  {journalPage} / {totalJournalPages}
                </span>
                <button
                  onClick={() => setJournalPage((p) => Math.min(totalJournalPages, p + 1))}
                  disabled={journalPage === totalJournalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  <FiChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: ALLOCATION ANALYTICS & CHARTS
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 fade-in">
          {/* Left Chart: Budget vs Actual Expenses Bar Chart */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Budget Allocation vs Real Disbursements
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Direct comparison of authorized allocations vs real expenditure debits
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                Academic Year {selYear}
              </span>
            </div>

            <div className="h-[280px]">
              <Bar
                data={{
                  labels: ledgerRows.map((r) => r.vh.name),
                  datasets: [
                    {
                      label: 'Budget Allocation (KES)',
                      data: ledgerRows.map((r) => r.budgeted),
                      backgroundColor: 'rgba(79, 70, 229, 0.75)',
                      borderRadius: 6,
                    },
                    {
                      label: 'Disbursed Expenses (KES)',
                      data: ledgerRows.map((r) => r.expenses),
                      backgroundColor: 'rgba(220, 38, 38, 0.85)',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: '#f1f5f9' },
                      ticks: {
                        callback: (v: any) => `${(Number(v) / 1000).toFixed(0)}K`,
                        font: { size: 9, family: 'monospace' },
                      },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 9, weight: 'bold' } },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Right Chart: Revenue Share Doughnut Chart */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Fee Revenue Share Distribution
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Apportionment of student collections across vote heads
              </p>
            </div>

            <div className="h-[210px] flex items-center justify-center">
              <Doughnut
                data={{
                  labels: ledgerRows.map((r) => r.vh.name),
                  datasets: [
                    {
                      data: ledgerRows.map((r) => r.feeIncome),
                      backgroundColor: CHART_PALETTE.slice(0, ledgerRows.length),
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 9 } } },
                  },
                }}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">Consolidated Collections:</span>
              <span className="font-mono text-emerald-700">{fmtKES(totals.feeIncome)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: MoE FDSE CIRCULAR ACCOUNTS BREAKDOWN
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'circular' && (
        <div className="space-y-4 fade-in">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Ministry of Education (MoE) Circular Accounts Split</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    FDSE Circular Ref: MOE/HQS/3/13/3
                  </span>
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Statutory banking ring-fencing separating Tuition Account, Operations Account, and Boarding Reserve
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                School Enrollment: <strong className="text-indigo-700 font-mono">{studentCount} Learners</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tuition Account */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-blue-900">1. Tuition Account (MoE)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-200/70 text-blue-900 font-mono">
                    KES 4,144 / student
                  </span>
                </div>
                <p className="text-[10px] text-blue-700 leading-snug">
                  Strictly ring-fenced for textbooks, teaching materials, science consumables, and internal examinations.
                </p>
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between font-mono text-xs">
                  <span className="text-blue-800 font-bold">Annual FDSE Capitation:</span>
                  <strong className="text-blue-950 font-black">{fmtKES(4144 * studentCount)}</strong>
                </div>
              </div>

              {/* Operations Account */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-purple-900">2. Operations Account</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-purple-200/70 text-purple-900 font-mono">
                    KES 18,100 / student
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 leading-snug">
                  Ring-fenced for school operations, RMI, electricity, water, non-teaching staff wages, and security.
                </p>
                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between font-mono text-xs">
                  <span className="text-purple-800 font-bold">Annual Operations Capitation:</span>
                  <strong className="text-purple-950 font-black">{fmtKES(18100 * studentCount)}</strong>
                </div>
              </div>

              {/* Boarding Account */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-900">3. Boarding Account</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-200/70 text-emerald-900 font-mono">
                    Parent Levies
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 leading-snug">
                  Funded directly by parents via fee structures for feeding, boarding accommodation, and medical care.
                </p>
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between font-mono text-xs">
                  <span className="text-emerald-800 font-bold">Apportioned Collections:</span>
                  <strong className="text-emerald-950 font-black">
                    {fmtKES(ledgerRows.find((r) => r.vh.code === 'BOARDING')?.feeIncome || 0)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          VOTE HEAD INSPECTOR DRAWER / MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {inspectVh && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: inspectVh.vh.color || '#6366f1' }}
                />
                <div>
                  <h3 className="text-sm font-extrabold text-white">{inspectVh.vh.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Code: {inspectVh.vh.code} · Category: {inspectVh.vh.category} · Priority: #{inspectVh.vh.priority}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectVh(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs font-sans">
              {/* Financial Status Banner */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Budgeted</span>
                  <span className="font-mono font-extrabold text-slate-800 text-xs">
                    {fmtKES(inspectVh.budgeted)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Disbursed</span>
                  <span className="font-mono font-extrabold text-rose-600 text-xs">
                    {fmtKES(inspectVh.expenses)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Net Balance</span>
                  <span
                    className={`font-mono font-extrabold text-xs ${
                      inspectVh.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {fmtKES(inspectVh.balance)}
                  </span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600">Budget Utilization Rate:</span>
                  <span
                    className={
                      inspectVh.utilization > 100
                        ? 'text-rose-600 font-extrabold'
                        : inspectVh.utilization > 80
                        ? 'text-amber-600 font-extrabold'
                        : 'text-emerald-600 font-extrabold'
                    }
                  >
                    {inspectVh.utilization}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      inspectVh.utilization > 100
                        ? 'bg-rose-500'
                        : inspectVh.utilization > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, inspectVh.utilization))}%` }}
                  />
                </div>
              </div>

              {/* Recent Expense Vouchers Debited */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Recent Expense Vouchers Debited ({inspectVh.expenseVouchers.length})
                </h4>
                {inspectVh.expenseVouchers.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-slate-400 text-xs">
                    No expenditure vouchers debited to this vote head yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {inspectVh.expenseVouchers.map((ev: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-white">
                        <div>
                          <div className="font-bold text-slate-800">{ev.title}</div>
                          <div className="text-[9.5px] text-slate-400 font-mono">
                            {ev.expense_date} · {ev.payment_method || 'Cash'} · {ev.reference_number || `PV/${ev.id}`}
                          </div>
                        </div>
                        <div className="font-mono font-extrabold text-rose-600">{fmtKES(ev.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setExpenseForm((prev) => ({
                      ...prev,
                      vote_id: String(inspectVh.vh.id),
                      title: `${inspectVh.vh.name} Voucher`,
                    }));
                    setInspectVh(null);
                    setShowExpenseModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
                >
                  + Debit Expense
                </button>
                <button
                  onClick={() => setInspectVh(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          RECORD EXPENSE MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiDollarSign size={16} />
                <h3 className="text-sm font-extrabold">Debit Vote Head Expense Voucher</h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-lg bg-rose-800 hover:bg-rose-900 text-rose-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Chemicals Purchase"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Amount (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Vote Head Account Allocation *
                </label>
                <select
                  value={expenseForm.vote_id}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, vote_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="">Select Vote Head Account</option>
                  {heads.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Voucher / Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PV/102"
                    value={expenseForm.reference_number}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Description / Payee Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes, supplier name, invoice details..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingExpense ? 'Recording...' : 'Debit to Ledger ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SET BUDGET ALLOCATION MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiDollarSign size={16} />
                <h3 className="text-sm font-extrabold">Register Treasury Budget Allocation</h3>
              </div>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="w-7 h-7 rounded-lg bg-indigo-800 hover:bg-indigo-900 text-indigo-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-5 space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Vote Head Name *
                </label>
                <select
                  value={budgetForm.vote_name}
                  onChange={(e) => {
                    const sel = heads.find((h) => h.name === e.target.value);
                    setBudgetForm((p) => ({
                      ...p,
                      vote_name: e.target.value,
                      vote_code: sel?.code || '',
                      category: sel?.category || 'Operations',
                    }));
                  }}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Select Vote Head</option>
                  {heads.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Annual Budget Amount (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 250000"
                    value={budgetForm.budget_amount}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, budget_amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selYear}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Budget Notes / Approval Ref
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved in BOG Minute 12/2026"
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingBudget ? 'Saving...' : 'Authorize Budget ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

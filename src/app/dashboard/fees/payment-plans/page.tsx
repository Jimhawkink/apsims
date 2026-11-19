'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { exportUltraPaymentPlansExcel } from '@/components/fees/UltraPaymentPlansExport';
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
  FiPhone,
  FiMessageSquare,
  FiClock,
  FiUser,
  FiCheckSquare,
  FiSquare,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & FORMATTERS
   ══════════════════════════════════════════════════════════════════════════════ */
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_no: string;
  admission_number?: string;
  guardian_name?: string;
  guardian_phone?: string;
  form_id: number;
  stream_id?: number;
  status?: string;
}

interface Term {
  id: number;
  term_name: string;
  is_current: boolean;
  year?: number;
}

interface Form {
  id: number;
  form_name: string;
  form_level?: number;
  education_system?: string;
}

interface Stream {
  id: number;
  stream_name: string;
  form_id: number;
}

interface Installment {
  id: number;
  plan_id: number;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_date: string | null;
}

interface Plan {
  id: number;
  student_id: number;
  term_id: number;
  plan_type: string;
  total_amount: number;
  installment_count: number;
  start_date: string;
  due_day: number;
  status: string;
  notes: string | null;
  created_at: string;
  student?: Student;
  installments?: Installment[];
}

const fmtKES = (n: number) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const daysDiff = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const getPct = (paid: number, total: number) => (total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0);

const PLAN_TYPES = ['Monthly', 'Termly', 'Bi-Monthly', 'Weekly', 'Custom'];

function getPlanStatus(plan: Plan): { label: string; color: string; bg: string; border: string } {
  const paid = (plan.installments || []).reduce((a, i) => a + Number(i.paid_amount || 0), 0);
  if (paid >= plan.total_amount && plan.total_amount > 0) {
    return { label: 'COMPLETED', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
  const hasOverdue = (plan.installments || []).some((i) => i.status !== 'paid' && daysDiff(i.due_date) > 0);
  if (hasOverdue) {
    return { label: 'OVERDUE', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
  }
  return { label: 'ON TRACK', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' };
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function PaymentPlansPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentYear = new Date().getFullYear();

  // Tab State
  const [tab, setTab] = useState<'active' | 'overdue' | 'completed' | 'all' | 'new'>('active');

  // Supabase Data
  const [schoolDetails, setSchoolDetails] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
    postal_address: '112 BOMET',
    county: 'Bomet',
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // Filter & Search Controls
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selType, setSelType] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals State
  const [inspectPlan, setInspectPlan] = useState<Plan | null>(null);
  const [agreementSlipPlan, setAgreementSlipPlan] = useState<Plan | null>(null);
  const [payModal, setPayModal] = useState<{ plan: Plan; inst: Installment } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('M-Pesa');
  const [payRef, setPayRef] = useState('');
  const [savingPay, setSavingPay] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // New Plan Generator Form State
  const [np, setNp] = useState({
    student_id: '',
    term_id: '',
    plan_type: 'Monthly',
    total_amount: '',
    installment_count: '3',
    start_date: new Date().toISOString().slice(0, 10),
    due_day: '5',
    notes: '',
  });
  const [preview, setPreview] = useState<{ due_date: string; amount: number }[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDrop, setShowStudentDrop] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── 1. Load All Database Records ───────────────────────────────────── */
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, sRes, fRes, stRes, tRes, detRes] = await Promise.all([
        supabase
          .from('school_payment_plans')
          .select(`*, school_students(id,first_name,last_name,admission_no,admission_number,guardian_name,guardian_phone,form_id,stream_id), school_plan_installments(*)`)
          .order('id', { ascending: false }),
        supabase
          .from('school_students')
          .select('id,first_name,last_name,admission_no,admission_number,guardian_name,guardian_phone,form_id,stream_id')
          .eq('status', 'Active')
          .order('first_name'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*').order('stream_name'),
        supabase.from('school_terms').select('*').order('id', { ascending: false }),
        supabase
          .from('school_details')
          .select('*')
          .neq('section', 'primary')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const raw = (pRes.data || []).map((p: any) => ({
        ...p,
        student: p.school_students,
        installments: p.school_plan_installments || [],
      }));
      setPlans(raw);
      setStudents(sRes.data || []);
      setForms(fRes.data || []);
      setStreams(stRes.data || []);
      const tData = tRes.data || [];
      setTerms(tData);
      if (detRes.data) setSchoolDetails(detRes.data);

      const cur = tData.find((t: Term) => t.is_current) || tData[0];
      if (cur && !np.term_id) {
        setNp((prev) => ({ ...prev, term_id: String(cur.id) }));
      }
    } catch (err: any) {
      console.error('Error loading payment plans:', err);
      toast.error('Failed to load payment plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [np.term_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── 2. KPI Metrics Summary ─────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const totalPledged = plans.reduce((a, p) => a + Number(p.total_amount || 0), 0);
    const totalCollected = plans.reduce(
      (a, p) => a + (p.installments || []).reduce((b, i) => b + Number(i.paid_amount || 0), 0),
      0
    );
    const totalOutstanding = Math.max(0, totalPledged - totalCollected);
    const overduePlans = plans.filter((p) => getPlanStatus(p).label === 'OVERDUE');
    const overdueAmount = overduePlans.reduce((a, p) => {
      const unpaid = (p.installments || [])
        .filter((i) => i.status !== 'paid' && daysDiff(i.due_date) > 0)
        .reduce((b, i) => b + (Number(i.amount || 0) - Number(i.paid_amount || 0)), 0);
      return a + unpaid;
    }, 0);
    const activePlans = plans.filter((p) => getPlanStatus(p).label === 'ON TRACK');
    const completedPlans = plans.filter((p) => getPlanStatus(p).label === 'COMPLETED');
    const recoveryRate = getPct(totalCollected, totalPledged);

    return {
      total: plans.length,
      active: activePlans.length,
      overdue: overduePlans.length,
      completed: completedPlans.length,
      totalPledged,
      totalCollected,
      totalOutstanding,
      overdueAmount,
      recoveryRate,
    };
  }, [plans]);

  /* ── 3. Filtered & Sorted Plans ─────────────────────────────────────── */
  const filteredPlans = useMemo(() => {
    let list = plans.map((p) => {
      const st = getPlanStatus(p);
      const paid = (p.installments || []).reduce((a, i) => a + Number(i.paid_amount || 0), 0);
      const bal = Math.max(0, p.total_amount - paid);
      const pctVal = getPct(paid, p.total_amount);
      const nextDue = (p.installments || []).find((ins) => ins.status !== 'paid');
      return {
        ...p,
        _status: st,
        _paid: paid,
        _bal: bal,
        _pct: pctVal,
        _nextDue: nextDue,
      };
    });

    if (tab === 'active') list = list.filter((p) => p._status.label === 'ON TRACK');
    else if (tab === 'overdue') list = list.filter((p) => p._status.label === 'OVERDUE');
    else if (tab === 'completed') list = list.filter((p) => p._status.label === 'COMPLETED');

    if (selType !== 'all') list = list.filter((p) => p.plan_type.toLowerCase() === selType.toLowerCase());
    if (selForm) list = list.filter((p) => String(p.student?.form_id) === selForm);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => {
        const sName = `${p.student?.first_name} ${p.student?.last_name}`.toLowerCase();
        const adm = (p.student?.admission_no || p.student?.admission_number || '').toLowerCase();
        const gName = (p.student?.guardian_name || '').toLowerCase();
        const gPhone = (p.student?.guardian_phone || '').toLowerCase();
        return sName.includes(q) || adm.includes(q) || gName.includes(q) || gPhone.includes(q);
      });
    }

    return list;
  }, [plans, tab, selType, selForm, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const paginatedPlans = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, page, pageSize]);

  /* ── 4. Build Installment Preview ────────────────────────────────────── */
  const buildPreview = useCallback(() => {
    const total = parseFloat(np.total_amount) || 0;
    const n = Math.max(1, parseInt(np.installment_count) || 1);
    if (total <= 0) {
      toast.error('Enter a valid total pledge amount');
      return;
    }
    const amt = parseFloat((total / n).toFixed(2));
    const lastAmt = parseFloat((total - amt * (n - 1)).toFixed(2));
    const start = new Date(np.start_date || new Date().toISOString().slice(0, 10));
    const res: { due_date: string; amount: number }[] = [];

    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      if (np.plan_type === 'Monthly' || np.plan_type === 'Bi-Monthly') {
        d.setMonth(d.getMonth() + i * (np.plan_type === 'Bi-Monthly' ? 2 : 1));
      } else if (np.plan_type === 'Weekly') {
        d.setDate(d.getDate() + i * 7);
      } else if (np.plan_type === 'Termly') {
        d.setMonth(d.getMonth() + i * 4);
      } else {
        d.setDate(d.getDate() + i * 30);
      }
      const due = parseInt(np.due_day) || 5;
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(due, maxDay));
      res.push({ due_date: d.toISOString().slice(0, 10), amount: i === n - 1 ? lastAmt : amt });
    }
    setPreview(res);
    toast.success(`Generated ${n}-installment schedule preview! 📅`);
  }, [np]);

  /* ── 5. Save & Authorize Payment Plan ────────────────────────────────── */
  const savePlan = async () => {
    if (!np.student_id || !np.term_id || !np.total_amount || !np.start_date) {
      toast.error('Please fill all required plan fields');
      return;
    }
    if (preview.length === 0) {
      toast.error('Please generate and inspect schedule preview first');
      return;
    }
    setSavingPlan(true);
    try {
      const { data: plan, error } = await supabase
        .from('school_payment_plans')
        .insert({
          student_id: parseInt(np.student_id),
          term_id: parseInt(np.term_id),
          plan_type: np.plan_type,
          total_amount: parseFloat(np.total_amount),
          installment_count: parseInt(np.installment_count),
          start_date: np.start_date,
          due_day: parseInt(np.due_day),
          status: 'active',
          notes: np.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('school_plan_installments').insert(
        preview.map((p, i) => ({
          plan_id: plan.id,
          installment_no: i + 1,
          due_date: p.due_date,
          amount: p.amount,
          paid_amount: 0,
          status: 'pending',
        }))
      );

      toast.success('Official payment plan authorized and registered! 🚀');
      setNp({
        student_id: '',
        term_id: np.term_id,
        plan_type: 'Monthly',
        total_amount: '',
        installment_count: '3',
        start_date: new Date().toISOString().slice(0, 10),
        due_day: '5',
        notes: '',
      });
      setPreview([]);
      setStudentSearch('');
      setTab('active');
      await loadData();
    } catch (e: any) {
      console.error('Save Plan Error:', e);
      toast.error(e.message || 'Failed to authorize payment plan');
    } finally {
      setSavingPlan(false);
    }
  };

  /* ── 6. Settle / Record Installment Payment ───────────────────────────── */
  const recordPayment = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    setSavingPay(true);
    try {
      const { error: insErr } = await supabase
        .from('school_plan_installments')
        .update({
          paid_amount: amt,
          status: 'paid',
          paid_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', payModal.inst.id);

      if (insErr) throw insErr;

      // Also log into school_fee_payments for cashier audit integration
      await supabase.from('school_fee_payments').insert([
        {
          student_id: payModal.plan.student_id,
          amount: amt,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: payMethod,
          receipt_number: payRef || `RCT-PLN-${payModal.inst.id}`,
          term_id: payModal.plan.term_id,
          status: 'verified',
        },
      ]);

      toast.success(`Installment payment of ${fmtKES(amt)} successfully recorded! 💳`);
      setPayModal(null);
      setPayAmount('');
      setPayRef('');
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record installment payment');
    } finally {
      setSavingPay(false);
    }
  };

  /* ── 7. Excel Workbook Exporter ──────────────────────────────────────── */
  const handleExportExcel = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating official Microsoft Excel (.xlsx) payment plans register...');
    try {
      const allInstallments: any[] = [];
      plans.forEach((p) => {
        (p.installments || []).forEach((ins) => {
          allInstallments.push({
            planId: p.id,
            studentName: `${p.student?.first_name || ''} ${p.student?.last_name || ''}`,
            admissionNo: p.student?.admission_no || p.student?.admission_number || '',
            installmentNo: ins.installment_no,
            dueDate: ins.due_date,
            amount: Number(ins.amount || 0),
            paidAmount: Number(ins.paid_amount || 0),
            balance: Math.max(0, Number(ins.amount || 0) - Number(ins.paid_amount || 0)),
            status: ins.status,
            paidDate: ins.paid_date,
          });
        });
      });

      await exportUltraPaymentPlansExcel({
        schoolName: schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT",
        schoolMotto: schoolDetails.school_motto || 'Excellence in Education',
        academicYear: currentYear,
        termName: 'Current Term',
        plans: filteredPlans.map((p) => {
          const form = forms.find((f) => f.id === p.student?.form_id);
          return {
            id: p.id,
            studentName: `${p.student?.first_name || ''} ${p.student?.last_name || ''}`,
            admissionNo: p.student?.admission_no || p.student?.admission_number || '',
            formName: form?.form_name || 'Unassigned',
            guardianName: p.student?.guardian_name || '',
            guardianPhone: p.student?.guardian_phone || '',
            planType: p.plan_type,
            totalAmount: p.total_amount,
            paidAmount: p._paid,
            balance: p._bal,
            progressPct: p._pct,
            nextDueDate: p._nextDue?.due_date || '',
            status: p._status.label,
          };
        }),
        installments: allInstallments,
      });

      toast.success('Official Payment Plans Excel Workbook exported! ✓', { id: toastId });
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel workbook: ' + (err?.message || 'Error'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  /* ── 8. Multi-Select Handlers ────────────────────────────────────────── */
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedPlans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPlans.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkSms = () => {
    if (selectedIds.size === 0) return;
    toast.success(`Broadcasting automated SMS payment reminders to ${selectedIds.size} parent guardians! 📲`);
  };

  // Student search results for plan creator
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 10);
    const q = studentSearch.toLowerCase().trim();
    return students
      .filter(
        (s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          String(s.admission_no || s.admission_number || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [students, studentSearch]);

  const selStudent = students.find((s) => String(s.id) === np.student_id);

  if (!mounted) return null;

  return (
    <div
      className="space-y-3.5 pb-12 max-w-[1400px] mx-auto text-slate-800"
      style={{ fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}
    >
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════════════════
          1. EXECUTIVE COMMAND HEADER (Light & Tight Matching Fee Studios)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Fee Payment Plans &amp; Pledges Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  ⚡ Recovery Rate: {kpis.recoveryRate}%
                </span>
                {kpis.overdue > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 animate-pulse">
                    🚨 {kpis.overdue} Overdue Agreements
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Installment scheduling, promissory parent undertakings, automated SMS reminders &amp; clearance tracking
              </p>
            </div>
          </div>

          {/* Super Premium Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setTab('new');
                setPreview([]);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FiPlus size={14} />
              <span>+ Plan Architect</span>
            </button>

            {kpis.overdue > 0 && (
              <button
                onClick={() => {
                  setTab('overdue');
                  handleBulkSms();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FiMessageSquare size={13} />
                <span>SMS Overdue ({kpis.overdue})</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export complete 2-sheet Excel register"
            >
              <FiDownload size={13} className="text-emerald-600" />
              <span>{isExporting ? 'Exporting...' : 'Excel'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print official payment plans schedule"
            >
              <FiPrinter size={13} className="text-blue-600" />
              <span>Print</span>
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh database"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. STANDALONE ULTRA-PREMIUM WORKSPACE TAB BAR (MATCHING DASHBOARD/SETTINGS)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 print:hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Main Navigation Tabs */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {[
              { id: 'active', label: 'On Track Plans', icon: '✅', count: kpis.active, badge: '' },
              {
                id: 'overdue',
                label: 'Overdue Installments',
                icon: '🚨',
                count: kpis.overdue,
                badge: kpis.overdue > 0 ? 'Action' : '',
                badgeBg: 'bg-rose-100 text-rose-800 animate-pulse font-extrabold',
              },
              { id: 'completed', label: 'Completed Plans', icon: '🏁', count: kpis.completed, badge: '' },
              { id: 'all', label: 'All Agreements', icon: '📋', count: kpis.total, badge: '' },
              { id: 'new', label: 'Plan Architect', icon: '➕', count: 0, badge: 'Generator' },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id as any);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
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
                        active ? 'bg-white/25 text-white' : t.badgeBg || 'bg-indigo-100 text-indigo-800'
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
              href="/dashboard/fees/payments"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition"
            >
              <span>💳 Payments Studio</span>
            </Link>
            <Link
              href="/dashboard/fees/vote-heads/ledger"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition"
            >
              <span>🏛️ Vote Ledger</span>
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
            label: 'Total Agreements',
            value: kpis.total,
            sub: `${kpis.active} Active On Track`,
            color: 'text-indigo-700',
            bg: 'bg-indigo-50/70',
            border: 'border-indigo-100',
            icon: <FiLayers size={14} className="text-indigo-600" />,
          },
          {
            label: 'Total Pledged',
            value: fmtK(kpis.totalPledged),
            sub: 'Structured parent dues',
            color: 'text-blue-700',
            bg: 'bg-blue-50/70',
            border: 'border-blue-100',
            icon: <FiDollarSign size={14} className="text-blue-600" />,
          },
          {
            label: 'Recovered Funds',
            value: fmtK(kpis.totalCollected),
            sub: `${kpis.recoveryRate}% Collection Rate`,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/70',
            border: 'border-emerald-100',
            icon: <FiTrendingUp size={14} className="text-emerald-600" />,
          },
          {
            label: 'Outstanding Balance',
            value: fmtK(kpis.totalOutstanding),
            sub: 'Remaining to collect',
            color: 'text-rose-700',
            bg: 'bg-rose-50/70',
            border: 'border-rose-100',
            icon: <FiClock size={14} className="text-rose-600" />,
          },
          {
            label: 'Overdue Risk',
            value: kpis.overdue,
            sub: fmtK(kpis.overdueAmount) + ' at risk',
            color: kpis.overdue > 0 ? 'text-rose-700' : 'text-emerald-700',
            bg: kpis.overdue > 0 ? 'bg-rose-50/70' : 'bg-emerald-50/70',
            border: kpis.overdue > 0 ? 'border-rose-200' : 'border-emerald-200',
            icon: <FiAlertTriangle size={14} className={kpis.overdue > 0 ? 'text-rose-600' : 'text-emerald-600'} />,
          },
          {
            label: 'Completed Plans',
            value: kpis.completed,
            sub: '100% Fully Settled',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/70',
            border: 'border-slate-200',
            icon: <FiCheckCircle size={14} className="text-emerald-600" />,
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
          TAB 5: PLAN ARCHITECT & GENERATOR (INTERACTIVE 2-COLUMN WORKSPACE)
          ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 fade-in">
          {/* Left Column (6/12): Interactive Plan Configuration Form */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Payment Plan Architect</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Parent Undertaking
                  </span>
                </h2>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Structure flexible parent installment pledges with automated milestone breakdown
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Searchable Student Picker */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Learner / Student *
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={
                      selStudent
                        ? `${selStudent.first_name} ${selStudent.last_name} (${selStudent.admission_no || selStudent.admission_number})`
                        : studentSearch
                    }
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setNp((p) => ({ ...p, student_id: '' }));
                      setShowStudentDrop(true);
                    }}
                    onFocus={() => setShowStudentDrop(true)}
                    placeholder="Search student name or admission number..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                  />
                  {showStudentDrop && filteredStudents.length > 0 && !np.student_id && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {filteredStudents.map((s) => {
                        const f = forms.find((fm) => fm.id === s.form_id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setNp((p) => ({ ...p, student_id: String(s.id) }));
                              setStudentSearch('');
                              setShowStudentDrop(false);
                            }}
                            className="p-2.5 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <div className="font-extrabold text-slate-900">
                                {s.first_name} {s.last_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Adm: {s.admission_no || s.admission_number} · Parent: {s.guardian_phone || '—'}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                              {f?.form_name || 'Class'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selStudent && (
                  <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <FiCheckCircle size={13} className="text-emerald-600" />
                      <span>
                        {selStudent.first_name} {selStudent.last_name} · Adm: {selStudent.admission_no || selStudent.admission_number}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        setNp((p) => ({ ...p, student_id: '' }));
                        setStudentSearch('');
                      }}
                      className="text-slate-400 hover:text-rose-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Term & Plan Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Academic Term *
                  </label>
                  <select
                    value={np.term_id}
                    onChange={(e) => setNp((p) => ({ ...p, term_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="">Select Term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name} {t.is_current ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Plan Frequency
                  </label>
                  <select
                    value={np.plan_type}
                    onChange={(e) => setNp((p) => ({ ...p, plan_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                  >
                    {PLAN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Pledge Amount + Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Total Pledge Amount (KES) *
                  </label>
                  <div className="flex items-center gap-1">
                    {[15000, 25000, 35000, 45000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNp((p) => ({ ...p, total_amount: String(preset) }))}
                        className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition"
                      >
                        {preset / 1000}k
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={np.total_amount}
                  onChange={(e) => setNp((p) => ({ ...p, total_amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                />
              </div>

              {/* Installments Stepper + Due Day + Start Date */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Installments
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={np.installment_count}
                    onChange={(e) => setNp((p) => ({ ...p, installment_count: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50/70 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={np.start_date}
                    onChange={(e) => setNp((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={np.due_day}
                    onChange={(e) => setNp((p) => ({ ...p, due_day: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50/70 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Agreement Notes / Undertaking Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Parent undertaking signed by Mrs. Mary Chebet to settle in 3 monthly tranches before exams."
                  value={np.notes}
                  onChange={(e) => setNp((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/70 focus:bg-white outline-none"
                />
              </div>

              {/* Massive Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={buildPreview}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FiClock size={13} />
                  <span>Generate Schedule Preview</span>
                </button>

                <button
                  type="button"
                  onClick={savePlan}
                  disabled={savingPlan || preview.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-40"
                >
                  <FiCheck size={14} />
                  <span>{savingPlan ? 'Authorizing...' : 'Authorize & Register Plan'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (6/12): Live Installment Schedule Preview */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Installment Milestones Preview
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Calculated installment schedule ready to be committed to database
                </p>
              </div>
              {preview.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {preview.length} Tranches
                </span>
              )}
            </div>

            {preview.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto text-xl">
                  📅
                </div>
                <div className="font-extrabold text-slate-600 text-xs">No Schedule Generated Yet</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Configure the total amount and frequency on the left, then click "Generate Schedule Preview".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Pill Bar */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase block">
                      {np.plan_type} Frequency
                    </span>
                    <strong className="text-indigo-900 font-extrabold text-sm">
                      {fmtKES(parseFloat(np.total_amount) || 0)} Total
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase block">Per Tranche</span>
                    <strong className="text-indigo-900 font-extrabold text-sm">
                      {fmtKES(preview[0]?.amount || 0)}
                    </strong>
                  </div>
                </div>

                {/* Milestones Datagrid */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] font-black uppercase text-slate-500">
                        <th className="py-2 px-3">Milestone</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Expected (KES)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3 font-bold text-slate-700">Tranche #{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{formatDate(p.due_date)}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                            {fmtKES(p.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              PENDING
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-xs">
                        <td colSpan={2} className="py-2 px-3">
                          ∑ TOTAL PLEDGE
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400">
                          {fmtKES(preview.reduce((a, b) => a + b.amount, 0))}
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-400">AUTHORIZED</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Promissory Undertaking Notice */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 leading-snug">
                  <strong className="text-slate-800 font-bold block mb-0.5">
                    MoE Official Promissory Clause:
                  </strong>
                  By authorizing this plan, the school confirms a formal payment undertaking signed with the parent/guardian. Defaulters will trigger automated SMS alerts and demand notifications.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TABS 1-4: PLANS REGISTER & DATA GRID
          ══════════════════════════════════════════════════════════════════════════ */}
      {tab !== 'new' && (
        <div className="space-y-3.5 fade-in">
          {/* Side-to-Side Cockpit Directly on Top of Datagrid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Left Side: Search + Plan Type Pills + Form Filter */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search student, adm #, guardian or phone... (Ctrl+F)"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Plan Type Selector Pills */}
                {['all', 'Monthly', 'Termly', 'Bi-Monthly'].map((typeId) => {
                  const active = selType === typeId;
                  return (
                    <button
                      key={typeId}
                      type="button"
                      onClick={() => {
                        setSelType(typeId);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-extrabold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{typeId === 'all' ? 'All Types' : typeId}</span>
                    </button>
                  );
                })}

                {/* Class / Form Dropdown */}
                <select
                  value={selForm}
                  onChange={(e) => {
                    setSelForm(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="">All Classes</option>
                  {forms.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.form_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right Side: Volume Badges + Multi-Select Actions + Rows Selector */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 justify-between lg:justify-end">
                {/* Multi-Select Action Pills */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleBulkSms}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs transition"
                    >
                      <FiMessageSquare size={12} />
                      <span>SMS ({selectedIds.size})</span>
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      ✕ Clear
                    </button>
                  </div>
                )}

                {/* Volume Summary Badges */}
                <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pledged:</span>
                  <span className="font-extrabold font-mono text-slate-800">{fmtK(kpis.totalPledged)}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Paid:</span>
                  <span className="font-extrabold font-mono text-emerald-700">{fmtK(kpis.totalCollected)}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Due:</span>
                  <span className="font-extrabold font-mono text-rose-700">{fmtK(kpis.totalOutstanding)}</span>
                </div>

                {/* Rows Selector */}
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
                    <th className="py-2.5 px-3 w-8 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={paginatedPlans.length > 0 && selectedIds.size === paginatedPlans.length}
                        onChange={toggleSelectAll}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Learner Profile</th>
                    <th className="py-2.5 px-3">Parent / Guardian</th>
                    <th className="py-2.5 px-3">Plan Type</th>
                    <th className="py-2.5 px-3 text-right">Pledged (KES)</th>
                    <th className="py-2.5 px-3 text-right">Paid (KES)</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-center min-w-[100px]">Progress</th>
                    <th className="py-2.5 px-3 text-center">Next Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPlans.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                        No payment plans matching your criteria.{' '}
                        <button
                          onClick={() => setTab('new')}
                          className="text-indigo-600 font-extrabold hover:underline ml-1"
                        >
                          + Create New Plan
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedPlans.map((plan) => {
                      const isOverdue = plan._nextDue && daysDiff(plan._nextDue.due_date) > 0;
                      const form = forms.find((f) => f.id === plan.student?.form_id);
                      const isSelected = selectedIds.has(plan.id);
                      const initials = `${plan.student?.first_name?.[0] || ''}${plan.student?.last_name?.[0] || ''}`.toUpperCase() || 'S';

                      return (
                        <tr
                          key={plan.id}
                          className={`hover:bg-indigo-50/30 transition-colors group ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center print:hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(plan.id)}
                              className="rounded cursor-pointer"
                            />
                          </td>

                          {/* Student Profile */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center text-[10px] font-black shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {plan.student?.first_name} {plan.student?.last_name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Adm: {plan.student?.admission_no || plan.student?.admission_number} ·{' '}
                                  {form?.form_name || 'Class'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Guardian Contact */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {plan.student?.guardian_name || 'Parent'}
                            </div>
                            {plan.student?.guardian_phone && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <a
                                  href={`tel:${plan.student.guardian_phone}`}
                                  className="text-slate-500 hover:text-indigo-600 flex items-center gap-0.5"
                                >
                                  <FiPhone size={9} /> {plan.student.guardian_phone}
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Plan Type */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {plan.plan_type} ({plan.installment_count}x)
                            </span>
                          </td>

                          {/* Pledged */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {fmtKES(plan.total_amount)}
                          </td>

                          {/* Paid */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600">
                            {fmtKES(plan._paid)}
                          </td>

                          {/* Balance Due */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black text-xs ${
                              plan._bal > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {fmtKES(plan._bal)}
                          </td>

                          {/* Progress Bar */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="w-20 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                                <span
                                  className={
                                    plan._pct >= 100
                                      ? 'text-emerald-600'
                                      : plan._pct >= 50
                                      ? 'text-indigo-600'
                                      : 'text-amber-600'
                                  }
                                >
                                  {plan._pct}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    plan._pct >= 100
                                      ? 'bg-emerald-500'
                                      : plan._pct >= 50
                                      ? 'bg-indigo-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(3, plan._pct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Next Due Date */}
                          <td className="py-2.5 px-3 text-center">
                            {plan._nextDue ? (
                              <div>
                                <div
                                  className={`text-[11px] font-bold font-mono ${
                                    isOverdue ? 'text-rose-600' : 'text-slate-800'
                                  }`}
                                >
                                  {formatDate(plan._nextDue.due_date)}
                                </div>
                                {isOverdue && (
                                  <div className="text-[9px] font-bold text-rose-600 mt-0.5">
                                    ⚠ {daysDiff(plan._nextDue.due_date)}d overdue
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Status Pill */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase border ${plan._status.bg} ${plan._status.color} ${plan._status.border}`}
                            >
                              {plan._status.label}
                            </span>
                          </td>

                          {/* Massive Actions */}
                          <td className="py-2.5 px-3 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Agreement Slip */}
                              <button
                                onClick={() => setAgreementSlipPlan(plan)}
                                className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                title="Print Official Undertaking Agreement Slip"
                              >
                                Slip
                              </button>

                              {/* Details / Milestones */}
                              <button
                                onClick={() => setInspectPlan(plan)}
                                className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                title="Inspect Installment Milestones"
                              >
                                Milestones
                              </button>

                              {/* Pay Installment */}
                              {plan._nextDue && plan._bal > 0 && (
                                <button
                                  onClick={() => {
                                    setPayModal({ plan, inst: plan._nextDue });
                                    setPayAmount(String(plan._nextDue.amount));
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10.5px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                                  title="Record Installment Settlement"
                                >
                                  💳 Pay
                                </button>
                              )}

                              {/* SMS Reminder */}
                              <button
                                onClick={() =>
                                  toast.success(`SMS reminder queued for ${plan.student?.guardian_phone || 'Parent'}! 📲`)
                                }
                                className="p-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-500 transition"
                                title="Send SMS reminder to parent"
                              >
                                <FiMessageSquare size={12} />
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
                    <td colSpan={4} className="py-3 px-3.5 font-mono">
                      ∑ CONSOLIDATED PORTFOLIO
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-400">
                      {fmtKES(kpis.totalPledged)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">
                      {fmtKES(kpis.totalCollected)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400 text-sm">
                      {fmtKES(kpis.totalOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{kpis.recoveryRate}% RECOVERED</td>
                    <td colSpan={3} className="py-3 px-3 text-center text-slate-400 text-[10px] print:hidden">
                      {kpis.total} TOTAL AGREEMENTS
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Cockpit */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs print:hidden flex-wrap gap-2">
              <span className="text-slate-500 font-medium text-[11px]">
                Showing{' '}
                <strong className="text-slate-800">
                  {filteredPlans.length === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800">
                  {Math.min(page * pageSize, filteredPlans.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredPlans.length}</strong> payment plans
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
                        ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
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
          INSPECT INSTALLMENTS MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {inspectPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiLayers size={16} className="text-indigo-400" />
                <h3 className="text-sm font-extrabold">
                  Installment Milestones — {inspectPlan.student?.first_name} {inspectPlan.student?.last_name}
                </h3>
              </div>
              <button
                onClick={() => setInspectPlan(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-sans">
              {/* Summary Pill */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Pledged</span>
                  <span className="font-mono font-extrabold text-slate-800 text-xs">
                    {fmtKES(inspectPlan.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Collected</span>
                  <span className="font-mono font-extrabold text-emerald-600 text-xs">
                    {fmtKES(
                      (inspectPlan.installments || []).reduce((a, b) => a + Number(b.paid_amount || 0), 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Remaining</span>
                  <span className="font-mono font-extrabold text-rose-600 text-xs">
                    {fmtKES(
                      Math.max(
                        0,
                        inspectPlan.total_amount -
                          (inspectPlan.installments || []).reduce((a, b) => a + Number(b.paid_amount || 0), 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Installment Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] font-black uppercase text-slate-500">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3 text-right">Scheduled (KES)</th>
                      <th className="py-2 px-3 text-right">Paid (KES)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(inspectPlan.installments || [])
                      .sort((a, b) => a.installment_no - b.installment_no)
                      .map((ins) => {
                        const isOver = ins.status !== 'paid' && daysDiff(ins.due_date) > 0;
                        return (
                          <tr key={ins.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-bold text-slate-700">#{ins.installment_no}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {formatDate(ins.due_date)}
                              {isOver && (
                                <span className="text-[9px] text-rose-600 font-bold ml-1">
                                  ({daysDiff(ins.due_date)}d late)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {fmtKES(ins.amount)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-600">
                              {ins.paid_amount > 0 ? fmtKES(ins.paid_amount) : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${
                                  ins.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isOver
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {ins.status === 'paid' ? 'SETTLED' : isOver ? 'OVERDUE' : 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setAgreementSlipPlan(inspectPlan);
                    setInspectPlan(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Print Promissory Slip 🖨️
                </button>
                <button
                  onClick={() => setInspectPlan(null)}
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
          OFFICIAL PRINTABLE PAYMENT AGREEMENT & PROMISSORY SLIP MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {agreementSlipPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FiPrinter size={16} className="text-indigo-400" />
                <h3 className="text-sm font-extrabold">Official Payment Agreement &amp; Promissory Note</h3>
              </div>
              <button
                onClick={() => setAgreementSlipPlan(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Printable Body */}
            <div className="p-6 space-y-4 text-xs font-sans" id="promissory-agreement-print">
              <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
                <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                  {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </h2>
                <p className="text-[10px] text-slate-500 italic">
                  "{schoolDetails.school_motto || 'Excellence in Education'}"
                </p>
                <p className="text-[10px] font-mono text-slate-600">
                  P.O. BOX {schoolDetails.postal_address || '112 BOMET'}, {schoolDetails.county || 'BOMET'}
                </p>
                <div className="inline-block px-3 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-900 uppercase border border-indigo-200 mt-1">
                  OFFICIAL PARENT PROMISSORY UNDERTAKING AGREEMENT
                </div>
              </div>

              {/* Student & Guardian Info */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Student Name</span>
                  <strong className="text-slate-800">
                    {agreementSlipPlan.student?.first_name} {agreementSlipPlan.student?.last_name}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Admission Number</span>
                  <strong className="text-slate-800 font-mono">
                    {agreementSlipPlan.student?.admission_no || agreementSlipPlan.student?.admission_number}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Parent / Guardian</span>
                  <strong className="text-slate-800">
                    {agreementSlipPlan.student?.guardian_name || 'Guardian'} ({agreementSlipPlan.student?.guardian_phone || '—'})
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Pledged</span>
                  <strong className="text-indigo-900 font-mono font-black">
                    {fmtKES(agreementSlipPlan.total_amount)}
                  </strong>
                </div>
              </div>

              {/* Installment Table */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider mb-1">
                  Approved Installment Tranches:
                </h4>
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[9px] font-black uppercase text-slate-700">
                      <th className="p-1.5 border border-slate-200">Tranche</th>
                      <th className="p-1.5 border border-slate-200">Due Date</th>
                      <th className="p-1.5 border border-slate-200 text-right">Amount (KES)</th>
                      <th className="p-1.5 border border-slate-200 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(agreementSlipPlan.installments || []).map((ins) => (
                      <tr key={ins.id}>
                        <td className="p-1.5 border border-slate-200 font-bold">Installment #{ins.installment_no}</td>
                        <td className="p-1.5 border border-slate-200 font-mono">{formatDate(ins.due_date)}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono font-bold">
                          {fmtKES(ins.amount)}
                        </td>
                        <td className="p-1.5 border border-slate-200 text-center font-bold uppercase text-[9px]">
                          {ins.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formal Undertaking Text */}
              <p className="text-[9.5px] text-slate-600 leading-snug italic">
                "I, the undersigned parent/guardian, hereby solemnly promise and undertake to pay the school fees installments as stipulated above. I understand that failure to honor any milestone without prior written permission from the School Principal will result in immediate fee default procedures."
              </p>

              {/* Signature Blocks */}
              <div className="pt-4 grid grid-cols-2 gap-6 text-[10px]">
                <div className="border-t border-slate-400 pt-1 text-center">
                  <span className="font-bold text-slate-800 block">Parent / Guardian Signature</span>
                  <span className="text-slate-400">Date: ________________________</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-center">
                  <span className="font-bold text-slate-800 block">Bursar / Principal Signature &amp; Stamp</span>
                  <span className="text-slate-400">Date: ________________________</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FiPrinter size={13} />
                  <span>Print Official Agreement</span>
                </button>
                <button
                  onClick={() => setAgreementSlipPlan(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SETTLE INSTALLMENT PAYMENT MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {payModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiDollarSign size={16} />
                <h3 className="text-sm font-extrabold">
                  Record Payment — Installment #{payModal.inst.installment_no}
                </h3>
              </div>
              <button
                onClick={() => setPayModal(null)}
                className="w-7 h-7 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-sans">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="font-extrabold text-emerald-900">
                  {payModal.plan.student?.first_name} {payModal.plan.student?.last_name}
                </div>
                <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                  Due: {formatDate(payModal.inst.due_date)} · Expected Milestone: {fmtKES(payModal.inst.amount)}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Payment Amount (KES) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Enter amount paid"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Receipt / Transaction Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QK891234"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={recordPayment}
                  disabled={savingPay}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingPay ? 'Recording...' : 'Record Payment ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

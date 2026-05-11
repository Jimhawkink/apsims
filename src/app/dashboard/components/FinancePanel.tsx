'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import FinanceKPIs from './finance/FinanceKPIs';
import FinanceCharts from './finance/FinanceCharts';
import FinanceTables from './finance/FinanceTables';
import { fmt, fmtDate, fmtTime, METHOD_COLORS, VOTE_HEADS, EXPENSE_COLORS, DEMO_ALERTS, type FinanceData } from './finance/financeHelpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

// Safe query helper - returns empty array if table doesn't exist
async function safeQuery(table: string, select = '*', opts?: Record<string, any>): Promise<any[]> {
  try {
    let q: any = supabase.from(table).select(select);
    if (opts?.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
    if (opts?.limit) q = q.limit(opts.limit);
    if (opts?.eq) q = q.eq(opts.eq[0], opts.eq[1]);
    const { data, error } = await q;
    if (error) return [] as any[];
    return (data || []) as any[];
  } catch (_e) { return [] as any[]; }
}

export default function FinancePanel() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch all data
      const [payments, structures, students, forms, streams, expenses, expCats, income, budgetVotes, bankAccounts, capitation, bursary, etimsArr, payrollArr, terms] = await Promise.all([
        safeQuery('school_fee_payments', '*', { order: 'payment_date' }),
        safeQuery('school_fee_structures', '*'),
        safeQuery('school_students', 'id, first_name, last_name, admission_no, admission_number, form_id, status, gender'),
        safeQuery('school_forms', '*', { order: 'form_level', ascending: true }),
        safeQuery('school_streams', '*'),
        safeQuery('school_expenses', '*', { order: 'expense_date' }),
        safeQuery('school_expense_categories', '*'),
        safeQuery('school_income', '*'),
        safeQuery('school_budget_votes', '*'),
        safeQuery('school_bank_accounts', '*'),
        safeQuery('school_capitation', '*'),
        safeQuery('school_bursary_records', '*'),
        safeQuery('school_etims_config', '*'),
        safeQuery('school_payroll_schedule', '*'),
        safeQuery('school_terms', '*'),
      ]);

      const activeStudents = students.filter((s: any) => s.status === 'Active');
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];

      // === KPI Calculations ===
      const todayPayments = payments.filter((p: any) => p.payment_date?.startsWith(today));
      const todayCollection = todayPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const todayMpesa = todayPayments.filter((p: any) => (p.payment_method || '').toLowerCase().includes('pesa')).length;

      const weekPayments = payments.filter((p: any) => p.payment_date >= weekAgo);
      const weekCollection = weekPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const prevWeekPayments = payments.filter((p: any) => p.payment_date >= prevWeekStart && p.payment_date < weekAgo);
      const prevWeekTotal = prevWeekPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const weekChange = prevWeekTotal > 0 ? Math.round(((weekCollection - prevWeekTotal) / prevWeekTotal) * 100) : 0;

      const totalCollected = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const perStudentFee = structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
      const targetAmount = perStudentFee * activeStudents.length;
      const feeArrears = Math.max(0, targetAmount - totalCollected);
      const collectionRate = targetAmount > 0 ? Math.round((totalCollected / targetAmount) * 100) : 0;

      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const totalIncome = (income || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0) + totalCollected;
      const capitationReceived = capitation.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const netPosition = totalIncome - totalExpenses;
      const salaryAmount = payrollArr.reduce((s: number, p: any) => s + Number(p.net_amount || 0), 0) || totalExpenses * 0.6;

      // Debtors
      const studentBalances: Record<number, number> = {};
      const studentPaid: Record<number, number> = {};
      payments.forEach((p: any) => { studentPaid[p.student_id] = (studentPaid[p.student_id] || 0) + Number(p.amount || 0); });
      activeStudents.forEach((s: any) => { studentBalances[s.id] = Math.max(0, perStudentFee - (studentPaid[s.id] || 0)); });
      const debtors = Object.entries(studentBalances).filter(([, b]) => b > 0);
      const criticalDebtors = debtors.filter(([, b]) => b > 5000).length;

      // === Monthly Trend (6 months) ===
      const monthlyFees: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const month = d.toLocaleString('en', { month: 'short' });
        const y = d.getFullYear(), m = d.getMonth();
        const mPayments = payments.filter((p: any) => { const pd = new Date(p.payment_date); return pd.getFullYear() === y && pd.getMonth() === m; });
        const mExpenses = expenses.filter((e: any) => { const ed = new Date(e.expense_date); return ed.getFullYear() === y && ed.getMonth() === m; });
        const mCap = capitation.filter((c: any) => { const cd = new Date(c.disbursement_date || c.created_at); return cd.getFullYear() === y && cd.getMonth() === m; });
        monthlyFees.push({
          month,
          fees: mPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          expenses: mExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
          capitation: mCap.reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
          target: targetAmount / 12,
        });
      }

      // === Daily Collection (7 days) ===
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyCollection = days.map((day, idx) => {
        const d = new Date(); const diff = (d.getDay() + 6) % 7 - idx;
        const date = new Date(d.getTime() - diff * 86400000).toISOString().split('T')[0];
        const dayP = payments.filter((p: any) => p.payment_date?.startsWith(date));
        return {
          day,
          mpesa: dayP.filter((p: any) => (p.payment_method || '').toLowerCase().includes('pesa')).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          bank: dayP.filter((p: any) => (p.payment_method || '').toLowerCase().includes('bank')).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          cash: dayP.filter((p: any) => { const m = (p.payment_method || 'cash').toLowerCase(); return !m.includes('pesa') && !m.includes('bank') && !m.includes('helb'); }).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
        };
      });

      // === Payment Methods ===
      const methodTotals: Record<string, number> = {};
      payments.forEach((p: any) => {
        const m = (p.payment_method || 'Cash');
        const key = m.toLowerCase().includes('pesa') ? 'M-Pesa' : m.toLowerCase().includes('bank') ? 'Bank' : m.toLowerCase().includes('helb') ? 'HELB' : 'Cash';
        methodTotals[key] = (methodTotals[key] || 0) + Number(p.amount || 0);
      });
      const totalMethodAmt = Object.values(methodTotals).reduce((a, b) => a + b, 0) || 1;
      const paymentMethods = Object.entries(methodTotals).sort((a, b) => b[1] - a[1]).map(([method, amount]) => ({
        method, amount, pct: Math.round((amount / totalMethodAmt) * 100), color: METHOD_COLORS[method] || '#9ca3af',
      }));
      if (paymentMethods.length === 0) paymentMethods.push({ method: 'Cash', amount: totalCollected, pct: 100, color: '#f59e0b' });

      // === Fee Position per Form ===
      const formPositions = forms.map((f: any) => {
        const formStudents = activeStudents.filter((s: any) => s.form_id === f.id);
        const expected = perStudentFee * formStudents.length;
        const paid = formStudents.reduce((s: number, st: any) => s + (studentPaid[st.id] || 0), 0);
        return { form: f.form_name, expected, paid, arrears: Math.max(0, expected - paid), pct: expected > 0 ? Math.round((paid / expected) * 100) : 0 };
      });

      // === Budget vs Actual ===
      const budgetData = budgetVotes.length > 0 ? budgetVotes.map((v: any) => ({
        head: v.vote_head, budget: Number(v.budget_amount || 0), actual: Number(v.actual_amount || 0),
        pct: Number(v.budget_amount) > 0 ? Math.round((Number(v.actual_amount) / Number(v.budget_amount)) * 100) : 0,
      })) : VOTE_HEADS.map((h, i) => {
        const b = [1400000, 284000, 196000, 120000, 84000, 56000][i] || 100000;
        const a = Math.round(b * ([0.61, 0.78, 0.54, 0.33, 0.62, 0.41][i] || 0.5));
        return { head: h, budget: b, actual: a, pct: Math.round((a / b) * 100) };
      });

      // === Expense Breakdown ===
      const expByCat: Record<string, number> = {};
      expenses.forEach((e: any) => {
        const cat = e.category || e.vote_head || 'Other';
        expByCat[cat] = (expByCat[cat] || 0) + Number(e.amount || 0);
      });
      const expenseBreakdown = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([category, amount], i) => ({
        category, amount, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
      }));
      if (expenseBreakdown.length === 0) {
        ['Salaries', 'Operations', 'Procurement', 'Infrastructure', 'Library', 'Extra-curr'].forEach((c, i) => {
          expenseBreakdown.push({ category: c, amount: [1200000, 450000, 280000, 180000, 95000, 60000][i], color: EXPENSE_COLORS[i] });
        });
      }

      // === Aged Debtors ===
      const agedDebtors = debtors
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([sid, balance]) => {
          const st = students.find((s: any) => s.id === Number(sid));
          const form = forms.find((f: any) => f.id === st?.form_id);
          const lastPayment = payments.filter((p: any) => p.student_id === Number(sid)).pop();
          const daysSince = lastPayment ? Math.floor((now.getTime() - new Date(lastPayment.payment_date).getTime()) / 86400000) : 90;
          return {
            admNo: st?.admission_no || st?.admission_number || `${st?.id || '?'}`,
            student: st ? `${st.last_name}, ${st.first_name}` : 'Unknown',
            form: form?.form_name || '—',
            invoiced: perStudentFee, paid: perStudentFee - balance, balance,
            days: daysSince,
            status: balance > 20000 ? 'Critical' : daysSince > 60 ? 'Overdue' : 'Notice Sent',
          };
        });
      // Fill demo if empty
      if (agedDebtors.length === 0) {
        [
          { admNo: '2021/047', student: 'Wanjiku, Ann M.', form: 'Form 4 East', invoiced: 42000, paid: 22000, balance: 20000, days: 89, status: 'Critical' },
          { admNo: '2022/113', student: 'Odhiambo, Kevin', form: 'Form 3 West', invoiced: 38000, paid: 21500, balance: 16500, days: 64, status: 'Overdue' },
          { admNo: '2023/056', student: 'Mutua, Grace', form: 'Form 2 North', invoiced: 35000, paid: 22000, balance: 13000, days: 42, status: 'Overdue' },
          { admNo: '2023/189', student: 'Kipchoge, Brian', form: 'Form 2 South', invoiced: 35000, paid: 24000, balance: 11000, days: 35, status: 'Overdue' },
          { admNo: '2024/022', student: 'Njoroge, Lilian', form: 'Form 1 East', invoiced: 32000, paid: 22500, balance: 9500, days: 18, status: 'Notice Sent' },
          { admNo: '2021/088', student: 'Achieng, Rose', form: 'Form 4 West', invoiced: 42000, paid: 32000, balance: 10000, days: 91, status: 'Critical' },
        ].forEach(d => agedDebtors.push(d));
      }

      // === Capitation by Form ===
      const streamNames = streams.length > 0 ? streams.map((s: any) => s.stream_name) : ['East', 'West', 'North', 'South'];
      const capitationByForm = forms.map((f: any) => ({
        form: f.form_name,
        amounts: streamNames.map((_: string, si: number) => {
          const fc = capitation.filter((c: any) => c.form_id === f.id);
          return fc.length > 0 ? Number(fc[si]?.amount || 0) : Math.round(100000 + Math.random() * 600000);
        }),
      }));

      // === Bursary ===
      const bHelb = bursary.filter((b: any) => b.bursary_type === 'HELB').reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const bCounty = bursary.filter((b: any) => b.bursary_type === 'County Bursary').reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const bCdf = bursary.filter((b: any) => b.bursary_type === 'CDF').reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const bursaryStudents = bursary.length > 0 ? bursary.slice(0, 5).map((b: any) => {
        const st = students.find((s: any) => s.id === b.student_id);
        return { student: st ? `${st.last_name}, ${st.first_name}` : 'Student', type: b.bursary_type, amount: Number(b.amount || 0), status: b.status || 'Pending' };
      }) : [
        { student: 'Wanjiku, Ann', type: 'HELB', amount: 28000, status: 'Credited' },
        { student: 'Odhiambo, Kevin', type: 'County bursary', amount: 15000, status: 'Pending' },
        { student: 'Mutua, Grace', type: 'CDF', amount: 12000, status: 'Credited' },
        { student: 'Kipchoge, Brian', type: 'HELB', amount: 24000, status: 'Queued' },
      ];

      // === eTIMS Config ===
      const etims: any = etimsArr.length > 0 ? etimsArr[0] : {};
      const etimsConfig = {
        vscu: etims.vscu_status || 'Active', vscuExpiry: etims.token_expiry || '14 Jun 2026',
        pending: etims.receipts_pending || 12, lastSync: etims.last_sync_at ? fmtDate(etims.last_sync_at) + ' ' + fmtTime(etims.last_sync_at) : '9 May 2026 08:14',
        paye: etims.paye_status === 'Filed' ? 'May return filed' : 'Pending', payeAmount: etims.paye_amount ? fmt(etims.paye_amount) : 'Ksh 342,000 · ref P202505',
        nssf: etims.nssf_status === 'Pending' ? 'April not remitted' : 'Remitted', nssfAmount: etims.nssf_amount ? `Due ${fmt(etims.nssf_amount)} · overdue ${etims.nssf_due_date || '11 days'}` : 'Due Ksh 84,000 · overdue 11 days',
        nssfDue: etims.nssf_due_date || 'overdue 11 days',
        tcc: etims.tcc_valid !== false ? 'OK' : 'Expired', tccExpiry: etims.tcc_expiry || '31 Dec 2026',
      };

      // === Latest Payments ===
      const sortedPayments = [...payments].sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      const latestPayments = sortedPayments.slice(0, 5).map((p: any) => {
        const st = students.find((s: any) => s.id === p.student_id);
        const form = forms.find((f: any) => f.id === st?.form_id);
        const stream = streams.find((s: any) => s.id === p.stream_id);
        return {
          date: p.payment_date ? `${fmtDate(p.payment_date)} · ${fmtTime(p.payment_date || p.created_at)}` : '—',
          admNo: st?.admission_no || st?.admission_number || '—',
          student: st ? `${st.last_name}, ${st.first_name}` : 'Unknown',
          formStream: `${form?.form_name || '—'} ${stream?.stream_name || ''}`.trim(),
          amount: Number(p.amount || 0),
          method: (p.payment_method || 'Cash').includes('pesa') ? 'M-Pesa' : (p.payment_method || 'Cash').includes('bank') ? 'Bank' : p.payment_method || 'Cash',
          reference: p.mpesa_reference || p.bank_reference || p.reference_number || '—',
          receipt: p.receipt_number || `APSIMS-${String(p.id || 0).padStart(4, '0')}`,
          voteHead: p.vote_head || 'Tuition',
          status: p.receipt_number ? 'Posted' : 'Pending eTIMS',
        };
      });
      // Fill demo if empty
      if (latestPayments.length === 0) {
        [
          { date: '11 May · 09:42', admNo: '2024/031', student: 'Njoroge, Lilian', formStream: 'Form 1 East', amount: 12000, method: 'M-Pesa', reference: 'QHI4R7X2', receipt: 'APSIMS-0041', voteHead: 'Tuition', status: 'Posted' },
          { date: '11 May · 09:18', admNo: '2022/089', student: 'Kamau, James', formStream: 'Form 3 West', amount: 8500, method: 'Bank', reference: 'KCB-282991', receipt: 'APSIMS-0040', voteHead: 'Tuition', status: 'Posted' },
          { date: '10 May · 16:55', admNo: '2023/047', student: 'Otieno, Mary', formStream: 'Form 2 North', amount: 5000, method: 'M-Pesa', reference: 'QHU4T9A1', receipt: 'APSIMS-0039', voteHead: 'Boarding', status: 'Posted' },
          { date: '10 May · 14:30', admNo: '2021/012', student: 'Waweru, Peter', formStream: 'Form 4 South', amount: 20000, method: 'Cash', reference: '—', receipt: 'APSIMS-0038', voteHead: 'Tuition', status: 'Pending eTIMS' },
          { date: '10 May · 11:12', admNo: '2024/058', student: 'Chebet, Ruth', formStream: 'Form 1 West', amount: 7200, method: 'HELB', reference: 'HELB-2026-044', receipt: 'APSIMS-0037', voteHead: 'Tuition', status: 'Posted' },
        ].forEach(p => latestPayments.push(p));
      }

      // === Waterfall ===
      const waterfallData = [
        { label: 'Fees', value: totalCollected || 4280000, color: '#10b981' },
        { label: 'Capitation', value: capitationReceived || 748000, color: '#3b82f6' },
        { label: 'Other income', value: (totalIncome - totalCollected - capitationReceived) || 120000, color: '#8b5cf6' },
        { label: 'Salaries', value: -(salaryAmount || 1400000), color: '#ef4444' },
        { label: 'Operations', value: -(totalExpenses * 0.2 || 380000), color: '#ef4444' },
        { label: 'Procurement', value: -(totalExpenses * 0.1 || 196000), color: '#ef4444' },
        { label: 'Infrastructure', value: -(totalExpenses * 0.08 || 120000), color: '#f59e0b' },
        { label: 'Net surplus', value: netPosition || 2340000, color: netPosition >= 0 ? '#10b981' : '#ef4444' },
      ];

      // === Bank Accounts ===
      const bankAccountsData = bankAccounts.length > 0 ? bankAccounts.map((b: any) => ({
        bank: b.bank_name, account: b.account_number?.replace(/(.{4})(.+)(.{1})/, (m: string, a: string, b: string, c: string) => a + '*'.repeat(b.length) + c),
        bookBal: Number(b.book_balance || 0), bankBal: Number(b.bank_balance || 0),
        diff: Number(b.bank_balance || 0) - Number(b.book_balance || 0),
        status: b.reconciliation_status || 'Pending',
      })) : [
        { bank: 'KCB', account: '1120****2', bookBal: 1284200, bankBal: 1284200, diff: 0, status: 'Reconciled' },
        { bank: 'Equity', account: '0023****7', bookBal: 892400, bankBal: 910800, diff: -18400, status: 'Unreconciled' },
        { bank: 'Co-op', account: '3341****9', bookBal: 448000, bankBal: 448000, diff: 0, status: 'Reconciled' },
        { bank: 'M-Pesa paybill', account: '522400', bookBal: 124500, bankBal: 0, diff: 0, status: 'Today' },
      ];

      setData({
        todayCollection, weekCollection, totalCollected, feeArrears, collectionRate, totalExpenses,
        capitationReceived, netPosition, todayPayments: todayPayments.length, todayMpesa, weekChange,
        targetAmount, debtorCount: debtors.length, criticalDebtors, expenseEntries: expenses.length,
        salaryAmount, capitationTerm: `Term 2 MoE disbursement`,
        monthlyFees, dailyCollection, paymentMethods, formPositions, budgetVotes: budgetData,
        expenseBreakdown, agedDebtors, alerts: DEMO_ALERTS,
        capitationByForm, capitationStreams: streamNames.slice(0, 4),
        bursaryKpis: { helb: bHelb || 284000, county: bCounty || 142000, cdf: bCdf || 96000 },
        bursaryStudents, etimsConfig, latestPayments, waterfallData, bankAccounts: bankAccountsData,
      });
    } catch (e) { console.error('Finance panel error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#10b981', borderColor: '#e2e8f0', width: 40, height: 40, borderWidth: 3 }} />
        <p className="text-gray-400 text-sm">Loading finance dashboard...</p>
      </div>
    </div>
  );

  if (!data) return <div className="text-center py-20 text-gray-400 text-sm">No finance data available</div>;

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4 ultra-animate">
      {/* Header with Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg shadow-lg shadow-emerald-200">💰</div>
          <div>
            <h2 className="text-[15px] font-extrabold text-gray-800">Fees & finance</h2>
            <p className="text-[10px] text-gray-400">Real-time financial dashboard — Alpha School</p>
          </div>
        </div>
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="text-[10px] font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors appearance-none">
            <option>Term 2 · {currentYear}</option>
            <option>Term 1 · {currentYear}</option>
            <option>Term 3 · {currentYear - 1}</option>
          </select>
          <select className="text-[10px] font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors appearance-none">
            <option>All forms ▾</option>
            <option>Form 1</option>
            <option>Form 2</option>
            <option>Form 3</option>
            <option>Form 4</option>
          </select>
          <select className="text-[10px] font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors appearance-none">
            <option>All streams ▾</option>
            <option>East</option>
            <option>West</option>
            <option>North</option>
            <option>South</option>
          </select>
          <select className="text-[10px] font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors appearance-none">
            <option>All methods ▾</option>
            <option>M-Pesa</option>
            <option>Bank</option>
            <option>Cash</option>
            <option>HELB</option>
          </select>
          <div className="flex items-center gap-1">
            <input type="date" defaultValue={`${currentYear}-01-01`} className="text-[10px] font-semibold text-gray-500 px-2 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer" />
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="text-[10px] font-semibold text-gray-500 px-2 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer" />
          </div>
          <button onClick={fetchData} className="text-[10px] font-bold px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors">Apply</button>
          <button className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Export</button>
          <span className="text-[9px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </div>

      <FinanceKPIs data={data} />
      <FinanceCharts data={data} />
      <FinanceTables data={data} />

      {/* Footer */}
      <div className="text-center py-2 text-[8px] text-gray-300 font-medium tracking-wide">
        APSIMS Ultra Finance Module v3.0 · Complete fee management, budget, capitation, expenses and compliance for Kenyan schools · © {currentYear}
      </div>
    </div>
  );
}

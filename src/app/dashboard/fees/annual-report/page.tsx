'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiPrinter, FiTrendingUp, FiTrendingDown, FiDollarSign, FiBarChart2, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = ['2022','2023','2024','2025','2026'];
const TERMS = ['Term 1 (Jan–Apr)','Term 2 (May–Aug)','Term 3 (Sep–Dec)'];

export default function AnnualFinancialReportPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState<'summary'|'income'|'expenses'|'defaulters'|'print'>('summary');
  const [generating, setGenerating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pR, eR, fR, sR, sdR] = await Promise.all([
      supabase.from('school_fee_payments').select('*').gte('payment_date', `${filterYear}-01-01`).lte('payment_date', `${filterYear}-12-31`).order('payment_date'),
      supabase.from('school_expenses').select('*').gte('expense_date', `${filterYear}-01-01`).lte('expense_date', `${filterYear}-12-31`).order('expense_date'),
      supabase.from('school_fee_structures').select('*').eq('academic_year', filterYear),
      supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id').eq('is_active', true),
      supabase.from('school_details').select('*').limit(1).maybeSingle(),
    ]);
    setPayments(pR.data || []);
    setExpenses(eR.data || []);
    setFeeStructures(fR.data || []);
    setStudents(sR.data || []);
    setSchool(sdR.data);
    setLoading(false);
  }, [filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── INCOME ANALYTICS ──────────────────────────────────────────────
  const totalIncome = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netSurplus = totalIncome - totalExpenses;

  const incomeByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => { const m = p.payment_method || 'Cash'; map[m] = (map[m] || 0) + Number(p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const incomeByMonth = useMemo(() => MONTHS.map((m, i) => ({
    m, amount: payments.filter(p => new Date(p.payment_date).getMonth() === i).reduce((s, p) => s + Number(p.amount || 0), 0),
  })), [payments]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { const c = e.category || 'Other'; map[c] = (map[c] || 0) + Number(e.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const incomeByTerm = useMemo(() => TERMS.map((term, ti) => {
    const months = ti === 0 ? [0,1,2,3] : ti === 1 ? [4,5,6,7] : [8,9,10,11];
    return { term, amount: payments.filter(p => months.includes(new Date(p.payment_date).getMonth())).reduce((s, p) => s + Number(p.amount || 0), 0) };
  }), [payments]);

  const expenseByTerm = useMemo(() => TERMS.map((term, ti) => {
    const months = ti === 0 ? [0,1,2,3] : ti === 1 ? [4,5,6,7] : [8,9,10,11];
    return { term, amount: expenses.filter(e => months.includes(new Date(e.expense_date).getMonth())).reduce((s, e) => s + Number(e.amount || 0), 0) };
  }), [expenses]);

  const maxMonthlyIncome = Math.max(...incomeByMonth.map(m => m.amount), 1);
  const maxExpenseCat = Math.max(...expenseByCategory.map(([, v]) => v), 1);

  // Expected total fees (fee structure × students)
  const totalExpected = feeStructures.reduce((s, f) => s + Number(f.total_amount || 0), 0) * students.length;
  const collectionRate = totalExpected > 0 ? Math.round(totalIncome / totalExpected * 100) : 0;

  // ── PRINT FULL PDF REPORT ─────────────────────────────────────────
  const printReport = () => {
    setGenerating(true);
    const schoolName = school?.school_name || 'AlphaSchool';
    const html = `<!DOCTYPE html>
<html>
<head>
<title>Annual Financial Report ${filterYear} — ${schoolName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1f2937; font-size: 11px; }
  .page { max-width: 210mm; margin: 0 auto; padding: 15mm; }
  h1 { font-size: 18px; text-align: center; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 6px; }
  h2 { font-size: 13px; color: #1e3a8a; margin: 18px 0 8px; padding: 4px 0; border-bottom: 1px solid #bfdbfe; }
  h3 { font-size: 11px; color: #374151; margin: 12px 0 5px; }
  .subtitle { text-align: center; color: #6b7280; font-size: 10px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
  .kpi-label { font-size: 8px; color: #6b7280; text-transform: uppercase; font-weight: bold; }
  .kpi-value { font-size: 15px; font-weight: 900; margin-top: 3px; }
  .kpi-sub { font-size: 8px; color: #9ca3af; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th { background: #1e3a8a; color: white; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; }
  td { border-bottom: 1px solid #f3f4f6; padding: 4px 8px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .amount { text-align: right; font-weight: bold; }
  .surplus { color: #16a34a; font-weight: 900; }
  .deficit { color: #dc2626; font-weight: 900; }
  .total-row td { background: #eff6ff !important; font-weight: 900; border-top: 2px solid #1e3a8a; }
  .term-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
  .term-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; }
  .term-label { font-size: 9px; color: #6b7280; font-weight: bold; }
  .term-amount { font-size: 13px; font-weight: 900; color: #1e3a8a; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .bar-label { width: 120px; font-size: 9px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { flex: 1; height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 5px; }
  .bar-value { width: 80px; font-size: 9px; font-weight: bold; color: #374151; text-align: right; }
  .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 40px; }
  .sig-box { text-align: center; border-top: 1px solid #111; padding-top: 6px; font-size: 10px; }
  .footer { text-align: center; font-size: 8px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page { padding: 10mm; } }
</style>
</head>
<body>
<div class="page">
  <h1>📊 ANNUAL FINANCIAL REPORT — ${filterYear}</h1>
  <div class="subtitle">
    ${schoolName} · ${school?.physical_address || 'Kenya'}<br/>
    KRA PIN: ${school?.kra_pin || '—'} · Tel: ${school?.phone1 || '—'} · Email: ${school?.email || '—'}<br/>
    Prepared by: Bursar · Date: ${new Date().toLocaleDateString('en-KE', { day:'2-digit',month:'long',year:'numeric' })} · APSIMS School Management System
  </div>

  <h2>1. EXECUTIVE SUMMARY</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Income</div><div class="kpi-value" style="color:#16a34a">${KES(totalIncome)}</div><div class="kpi-sub">${payments.length} transactions</div></div>
    <div class="kpi"><div class="kpi-label">Total Expenditure</div><div class="kpi-value" style="color:#dc2626">${KES(totalExpenses)}</div><div class="kpi-sub">${expenses.length} transactions</div></div>
    <div class="kpi"><div class="kpi-label">Net ${netSurplus >= 0 ? 'Surplus' : 'Deficit'}</div><div class="kpi-value" style="color:${netSurplus >= 0 ? '#16a34a' : '#dc2626'}">${KES(Math.abs(netSurplus))}</div><div class="kpi-sub">${netSurplus >= 0 ? '✅ Surplus' : '⚠️ Deficit'}</div></div>
    <div class="kpi"><div class="kpi-label">Collection Rate</div><div class="kpi-value" style="color:#1e3a8a">${collectionRate}%</div><div class="kpi-sub">${students.length} students</div></div>
  </div>

  <h2>2. INCOME BY TERM</h2>
  <div class="term-grid">
    ${incomeByTerm.map((t, i) => `<div class="term-box"><div class="term-label">${['📘 Term 1','📗 Term 2','📙 Term 3'][i]}</div><div class="term-amount">${KES(t.amount)}</div><div style="font-size:9px;color:#6b7280;margin-top:2px">${Math.round(t.amount/Math.max(totalIncome,1)*100)}% of total</div></div>`).join('')}
  </div>

  <h2>3. INCOME BY PAYMENT METHOD</h2>
  ${incomeByMethod.map(([method, amount]) => `
    <div class="bar-row">
      <span class="bar-label">${method}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(amount/Math.max(totalIncome,1)*100)}%;background:#1e3a8a;"></div></div>
      <span class="bar-value">${KES(amount)}</span>
    </div>`).join('')}

  <h2>4. MONTHLY INCOME STATEMENT</h2>
  <table>
    <thead><tr><th>Month</th><th>Income (KES)</th><th>Expenses (KES)</th><th>Net (KES)</th><th>Status</th></tr></thead>
    <tbody>
      ${MONTHS.map((m, i) => {
        const inc = payments.filter(p => new Date(p.payment_date).getMonth() === i).reduce((s, p) => s + Number(p.amount || 0), 0);
        const exp = expenses.filter(e => new Date(e.expense_date).getMonth() === i).reduce((s, e) => s + Number(e.amount || 0), 0);
        const net = inc - exp;
        if (inc === 0 && exp === 0) return '';
        return `<tr><td>${m} ${filterYear}</td><td class="amount" style="color:#16a34a">${KES(inc)}</td><td class="amount" style="color:#dc2626">${KES(exp)}</td><td class="amount ${net >= 0 ? 'surplus' : 'deficit'}">${KES(net)}</td><td><span class="badge ${net >= 0 ? 'badge-green' : 'badge-red'}">${net >= 0 ? 'Surplus' : 'Deficit'}</span></td></tr>`;
      }).join('')}
      <tr class="total-row"><td>TOTAL ${filterYear}</td><td class="amount" style="color:#16a34a">${KES(totalIncome)}</td><td class="amount" style="color:#dc2626">${KES(totalExpenses)}</td><td class="amount ${netSurplus >= 0 ? 'surplus' : 'deficit'}">${KES(Math.abs(netSurplus))}</td><td><span class="badge ${netSurplus >= 0 ? 'badge-green' : 'badge-red'}">${netSurplus >= 0 ? '✅ Surplus' : '⚠️ Deficit'}</span></td></tr>
    </tbody>
  </table>

  <h2>5. EXPENDITURE BY CATEGORY</h2>
  <table>
    <thead><tr><th>Category</th><th>Amount (KES)</th><th>% of Total</th><th>Transactions</th></tr></thead>
    <tbody>
      ${expenseByCategory.map(([cat, amount]) => {
        const count = expenses.filter(e => (e.category || 'Other') === cat).length;
        return `<tr><td>${cat}</td><td class="amount">${KES(amount)}</td><td class="amount">${Math.round(amount/Math.max(totalExpenses,1)*100)}%</td><td class="amount">${count}</td></tr>`;
      }).join('')}
      <tr class="total-row"><td>TOTAL EXPENDITURE</td><td class="amount">${KES(totalExpenses)}</td><td class="amount">100%</td><td class="amount">${expenses.length}</td></tr>
    </tbody>
  </table>

  <h2>6. FEE COLLECTION ANALYSIS</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Total Students (Active)</td><td class="amount">${students.length}</td></tr>
      <tr><td>Total Paying Students</td><td class="amount">${new Set(payments.map(p => p.student_id)).size}</td></tr>
      <tr><td>Total Collected</td><td class="amount" style="color:#16a34a">${KES(totalIncome)}</td></tr>
      <tr><td>Collection Rate</td><td class="amount">${collectionRate}%</td></tr>
      <tr><td>KCB Buni Collections</td><td class="amount">${KES(payments.filter(p => (p.payment_method || '').toLowerCase().includes('kcb') || (p.payment_method || '').toLowerCase().includes('buni')).reduce((s,p) => s + Number(p.amount||0),0))}</td></tr>
      <tr><td>Cash Collections</td><td class="amount">${KES(payments.filter(p => (p.payment_method || '').toLowerCase().includes('cash')).reduce((s,p) => s + Number(p.amount||0),0))}</td></tr>
      <tr><td>Average Payment per Transaction</td><td class="amount">${KES(payments.length > 0 ? totalIncome / payments.length : 0)}</td></tr>
    </tbody>
  </table>

  <h2>7. AUDITOR'S CERTIFICATION</h2>
  <p style="font-size:10px;color:#374151;line-height:1.6;margin:8px 0;">I certify that to the best of my knowledge, the above financial statements correctly represent the income and expenditure of <strong>${schoolName}</strong> for the financial year <strong>${filterYear}</strong>. All transactions have been recorded in accordance with proper accounting practices and school financial regulations.</p>

  <div class="signature-grid">
    <div class="sig-box">Bursar / Accounts Officer<br/><br/>Name: ___________________<br/>Sign: ___________________<br/>Date: ___________________</div>
    <div class="sig-box">Principal<br/><br/>Name: ___________________<br/>Sign: ___________________<br/>Date: ___________________</div>
    <div class="sig-box">Board of Governors Chairman<br/><br/>Name: ___________________<br/>Sign: ___________________<br/>Date: ___________________</div>
  </div>

  <div class="footer">
    APSIMS School Management System · apsims.vercel.app · Generated: ${new Date().toLocaleString('en-KE')} · CONFIDENTIAL — FOR SCHOOL USE ONLY
  </div>
</div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.print(); setGenerating(false); }, 600); }
    else { setGenerating(false); toast.error('Popup blocked — please allow popups'); }
  };

  // ── UI ───────────────────────────────────────────────────────────
  const TABS = [
    { id: 'summary', label: '📊 Summary' },
    { id: 'income', label: '💰 Income' },
    { id: 'expenses', label: '💸 Expenses' },
    { id: 'defaulters', label: '⚠️ Defaulters' },
    { id: 'print', label: '🖨️ Print Report' },
  ] as const;

  const EXP_COLORS = ['#dc2626','#d97706','#7c3aed','#0891b2','#16a34a','#6366f1','#db2777','#ea580c'];

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8,#2563eb)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">📊</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Annual Financial Report</h1>
              <p className="text-blue-200 text-sm mt-0.5">Auditor-ready · {school?.school_name || 'AlphaSchool'} · Financial Year {filterYear}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {YEARS.map(y => (
              <button key={y} onClick={() => setFilterYear(y)} className={`px-4 py-2 rounded-xl text-sm font-black border transition ${filterYear===y?'bg-white text-blue-800 border-white':'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}>{y}</button>
            ))}
            <button onClick={printReport} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-blue-900 font-black text-sm hover:bg-amber-300 transition shadow-lg disabled:opacity-60">
              {generating ? <span className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" /> : <FiPrinter size={15} />}
              {generating ? 'Generating…' : 'Print PDF'}
            </button>
          </div>
        </div>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-6">
          {[
            { icon: '💰', label: 'Total Income', val: KES(totalIncome), c: '#86efac', sub: `${payments.length} transactions` },
            { icon: '💸', label: 'Total Expenses', val: KES(totalExpenses), c: '#fca5a5', sub: `${expenses.length} entries` },
            { icon: netSurplus >= 0 ? '📈' : '📉', label: netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit', val: KES(Math.abs(netSurplus)), c: netSurplus >= 0 ? '#86efac' : '#fca5a5', sub: netSurplus >= 0 ? '✅ In surplus' : '⚠️ In deficit' },
            { icon: '📋', label: 'Collection Rate', val: `${collectionRate}%`, c: '#93c5fd', sub: `${students.length} students` },
            { icon: '👥', label: 'Paying Students', val: new Set(payments.map(p => p.student_id)).size.toString(), c: '#c4b5fd', sub: 'Have paid' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-sm font-black leading-tight" style={{ color: s.c }}>{s.val}</div>
              <div className="text-[9px] text-blue-200 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
              <div className="text-[8px] text-blue-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab===t.id?'bg-blue-700 text-white border-blue-700 shadow-md':'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>)}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="text-center"><div className="w-12 h-12 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-400">Loading financial data…</p></div></div>
      ) : activeTab === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Income by Month Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 text-base mb-5">💰 Monthly Income — {filterYear}</h3>
            <div className="flex items-end gap-1.5 h-44 mb-2">
              {incomeByMonth.map((m, i) => (
                <div key={m.m} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">{KES(m.amount)}</div>
                  <div className="w-full rounded-t-lg hover:opacity-80 cursor-pointer transition-all duration-500" style={{ height: `${Math.max(m.amount/maxMonthlyIncome*100, 2)}%`, background: m.amount > 0 ? 'linear-gradient(to top,#1e3a8a,#2563eb)' : '#e5e7eb', minHeight: 4 }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">{MONTHS.map(m => <span key={m} className="flex-1 text-center text-[9px] font-bold text-gray-400">{m}</span>)}</div>

            {/* Term summary */}
            <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              {incomeByTerm.map((t, i) => (
                <div key={t.term} className={`p-3 rounded-xl text-center ${['bg-blue-50','bg-green-50','bg-purple-50'][i]}`}>
                  <p className="text-[9px] font-black text-gray-500 uppercase">{['Term 1','Term 2','Term 3'][i]}</p>
                  <p className="font-black text-sm mt-0.5" style={{ color: ['#1d4ed8','#16a34a','#7c3aed'][i] }}>{KES(t.amount)}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">{Math.round(t.amount/Math.max(totalIncome,1)*100)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 text-base mb-5">💸 Expenditure by Category — {filterYear}</h3>
            <div className="space-y-3">
              {expenseByCategory.map(([cat, amount], i) => (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: EXP_COLORS[i % EXP_COLORS.length] }} /><span className="text-sm font-bold text-gray-700">{cat}</span></div><span className="font-black text-sm text-gray-800">{KES(amount)} <span className="text-gray-400 font-normal text-[10px]">({Math.round(amount/Math.max(totalExpenses,1)*100)}%)</span></span></div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-2.5 rounded-full" style={{ width: `${Math.round(amount/maxExpenseCat*100)}%`, background: EXP_COLORS[i%EXP_COLORS.length] }} /></div>
                </div>
              ))}
              {expenseByCategory.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No expense records for {filterYear}</p>}
            </div>

            {/* Net position */}
            <div className={`mt-5 p-4 rounded-xl border-2 text-center ${netSurplus >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <p className="text-xs font-black text-gray-600 mb-1">NET FINANCIAL POSITION — {filterYear}</p>
              <p className="text-3xl font-black" style={{ color: netSurplus >= 0 ? '#16a34a' : '#dc2626' }}>{netSurplus >= 0 ? '+' : '-'}{KES(Math.abs(netSurplus))}</p>
              <p className="text-sm font-bold mt-1" style={{ color: netSurplus >= 0 ? '#16a34a' : '#dc2626' }}>{netSurplus >= 0 ? '✅ School is in Surplus' : '⚠️ School is in Deficit'}</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'income' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">All Fee Payments — {filterYear}</h3><p className="text-xs text-gray-400">{payments.length} transactions · Total: {KES(totalIncome)}</p></div>
            <button onClick={() => { const rows = [['Date','Student','Amount','Method','Receipt']]; payments.forEach(p => rows.push([p.payment_date,p.student_id?.toString()||'',p.amount?.toString()||'',p.payment_method||'',p.receipt_number||''])); const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`income_${filterYear}.csv`;a.click(); toast.success('Exported!'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-sm"><FiDownload size={13}/> CSV</button>
          </div>
          {payments.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">💰</div><p className="font-black text-gray-600">No payments recorded for {filterYear}</p></div>
          : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0"><tr className="border-b bg-gray-50">{['Date','Student ID','Amount','Payment Method','Receipt No','Notes'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.slice(0,300).map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/20 transition">
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.payment_date}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{p.student_id || '—'}</td>
                      <td className="px-4 py-2.5 font-black text-green-700">{KES(p.amount)}</td>
                      <td className="px-4 py-2.5 text-xs"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">{p.payment_method || 'Cash'}</span></td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{p.receipt_number || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t-2 border-blue-300 bg-blue-50"><td colSpan={2} className="px-4 py-3 font-black text-blue-800">TOTAL ({payments.length} transactions)</td><td className="px-4 py-3 font-black text-green-700 text-base">{KES(totalIncome)}</td><td colSpan={3}/></tr></tfoot>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'expenses' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">All Expenses — {filterYear}</h3><p className="text-xs text-gray-400">{expenses.length} entries · Total: {KES(totalExpenses)}</p></div>
            <button onClick={() => { const rows = [['Date','Category','Description','Amount','Approved By']]; expenses.forEach(e => rows.push([e.expense_date,e.category||'',e.description||'',e.amount?.toString()||'',e.approved_by||''])); const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`expenses_${filterYear}.csv`;a.click(); toast.success('Exported!'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm"><FiDownload size={13}/> CSV</button>
          </div>
          {expenses.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">💸</div><p className="font-black text-gray-600">No expenses for {filterYear}</p></div>
          : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0"><tr className="border-b bg-gray-50">{['Date','Category','Description','Amount','Approved By','Receipt'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-red-50/10 transition">
                      <td className="px-4 py-2.5 text-xs text-gray-600">{e.expense_date}</td>
                      <td className="px-4 py-2.5 text-xs"><span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">{e.category || 'Other'}</span></td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[200px] truncate">{e.description || '—'}</td>
                      <td className="px-4 py-2.5 font-black text-red-700">{KES(e.amount)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{e.approved_by || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-gray-400">{e.receipt_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t-2 border-red-300 bg-red-50"><td colSpan={3} className="px-4 py-3 font-black text-red-800">TOTAL ({expenses.length} entries)</td><td className="px-4 py-3 font-black text-red-700 text-base">{KES(totalExpenses)}</td><td colSpan={2}/></tr></tfoot>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'defaulters' ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4"><FiAlertCircle className="text-amber-600" size={22}/><h3 className="font-black text-amber-800 text-lg">⚠️ Students with No Payments in {filterYear}</h3></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 text-center border border-amber-100"><p className="text-[10px] text-gray-400 font-bold">TOTAL STUDENTS</p><p className="font-black text-2xl text-gray-800">{students.length}</p></div>
              <div className="bg-white rounded-xl p-3 text-center border border-amber-100"><p className="text-[10px] text-gray-400 font-bold">HAVE PAID</p><p className="font-black text-2xl text-green-700">{new Set(payments.map(p=>p.student_id)).size}</p></div>
              <div className="bg-white rounded-xl p-3 text-center border border-amber-100"><p className="text-[10px] text-gray-400 font-bold">DEFAULTERS</p><p className="font-black text-2xl text-red-600">{students.length - new Set(payments.map(p=>p.student_id)).size}</p></div>
              <div className="bg-white rounded-xl p-3 text-center border border-amber-100"><p className="text-[10px] text-gray-400 font-bold">PAYMENT RATE</p><p className="font-black text-2xl text-blue-700">{students.length > 0 ? Math.round(new Set(payments.map(p=>p.student_id)).size/students.length*100) : 0}%</p></div>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-amber-100 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0"><tr className="border-b bg-amber-50">{['Student ID','Name','Adm No'].map(h=><th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-amber-700 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-amber-50">
                  {students.filter(s => !payments.some(p => p.student_id === s.id)).slice(0,50).map(s => (
                    <tr key={s.id} className="hover:bg-amber-50/50"><td className="px-4 py-2 text-xs font-mono text-gray-600">{s.id}</td><td className="px-4 py-2 font-bold text-gray-800 text-xs">{s.first_name} {s.last_name}</td><td className="px-4 py-2 font-mono text-xs text-gray-500">{s.admission_no||'—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* PRINT PREVIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-8xl mb-6">🖨️</div>
          <h2 className="text-2xl font-black text-gray-800 mb-3">Print Annual Financial Report</h2>
          <p className="text-gray-500 mb-2 max-w-md mx-auto">Generate a complete, auditor-ready PDF for Financial Year <strong>{filterYear}</strong>. Includes income statement, expense analysis, term breakdown, collection analysis, and signature blocks.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8 max-w-lg mx-auto">
            {[['📊','7 Sections','Full report'],['💰',KES(totalIncome),'Income'],['💸',KES(totalExpenses),'Expenses'],['📋',`${collectionRate}%`,'Collection']].map(([i,v,l])=>(
              <div key={l as string} className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="text-2xl mb-1">{i}</div>
                <div className="font-black text-blue-800 text-sm">{v}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={printReport} disabled={generating} className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-lg mx-auto shadow-xl hover:shadow-2xl transition disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}>
            {generating ? <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPrinter size={22} />}
            {generating ? 'Generating PDF…' : `Print Report — ${filterYear}`}
          </button>
          <p className="text-xs text-gray-400 mt-4">Opens in new tab → Print to PDF using Ctrl+P</p>
        </div>
      )}
    </div>
  );
}

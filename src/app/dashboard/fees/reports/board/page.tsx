'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPrinter, FiRefreshCw, FiCalendar } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const PCT = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0.0%';

export default function BoardReportPage() {
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [capitation, setCapitation] = useState<any[]>([]);
  const [selTerm, setSelTerm] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [scRes, sRes, pRes, fsRes, payRes, aRes, baRes, eRes, fRes, tRes] = await Promise.all([
      supabase.from('school_details').select('school_name,address,phone,email,motto').limit(1).maybeSingle(),
      // NO status filter — same as useFeeData, get all students
      supabase.from('school_students').select('id,form_id,status').order('first_name'),
      supabase.from('school_fee_payments').select('amount,payment_date,term_id,payment_method,student_id').order('payment_date', { ascending: false }),
      supabase.from('school_fee_structures').select('*'),
      // NO .eq filter on payroll status — get all, filter in JS
      supabase.from('school_payroll').select('gross_pay,net_pay,paye,nhif,nssf,housing_levy,payment_date,status,staff_type').order('payment_date', { ascending: false }),
      // NO .eq filter on assets — get all, filter in JS
      supabase.from('school_assets').select('purchase_price,current_value,category,status'),
      supabase.from('school_bank_accounts').select('bank_name,account_name,book_balance,bank_balance,is_active'),
      // FIXED: removed expense_type column (doesn't exist). Use actual columns.
      supabase.from('school_expenses').select('amount,category,expense_date,year,status,vote_head,expense_name').order('expense_date', { ascending: false }),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_terms').select('id,term_name,start_date,end_date,is_current,year').order('id', { ascending: false }),
    ]);

    setSchool(scRes.data || {});
    setStudents(sRes.data || []);
    setPayments(pRes.data || []);
    setStructures(fsRes.data || []);
    setPayroll(payRes.data || []);
    setAssets(aRes.data || []);
    setBankAccounts(baRes.data || []);
    setExpenses(eRes.data || []);
    setForms(fRes.data || []);
    setTerms(tRes.data || []);

    // Safe capitation query — table now exists after batch4 SQL
    try {
      const { data: capData } = await supabase.from('school_capitation')
        .select('amount_received,term_id,year,status').order('id', { ascending: false }).limit(20);
      setCapitation(capData || []);
    } catch { setCapitation([]); }

    const cur = (tRes.data || []).find((t: any) => t.is_current) || (tRes.data || [])[0];
    if (cur) setSelTerm(String(cur.id));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentTerm = terms.find(t => String(t.id) === selTerm) || terms[0];
  const year = currentTerm?.year || new Date().getFullYear();
  const currentYear = new Date().getFullYear();

  // Active students — check multiple status values like useFeeData context
  const activeStudents = useMemo(() =>
    students.filter(s => {
      const st = (s.status || '').toLowerCase();
      return !st || st === 'active' || st === 'enrolled' || st === 'current';
    }), [students]);

  const termPayments = useMemo(() =>
    selTerm ? payments.filter(p => String(p.term_id) === selTerm) : payments,
    [payments, selTerm]);

  const yearPayments = useMemo(() =>
    payments.filter(p => {
      const y = p.payment_date ? new Date(p.payment_date).getFullYear() : 0;
      return y === year;
    }), [payments, year]);

  // Fee income from current term
  const totalFeeIncome = termPayments.reduce((a, p) => a + Number(p.amount || 0), 0);

  // Expected using same logic as useFeeData getStudentFees
  const totalExpected = useMemo(() => activeStudents.reduce((a, s) => {
    const applicable = structures.filter(f => !f.form_id || f.form_id === s.form_id);
    let yearFiltered = applicable.filter(f => !f.year || f.year === currentYear);
    if (yearFiltered.length === 0 && applicable.length > 0) {
      const maxYear = Math.max(...applicable.map(f => f.year || 0));
      yearFiltered = applicable.filter(f => !f.year || f.year === maxYear);
    }
    // Divide by 3 for per-term expected
    return a + yearFiltered.reduce((b, f) => b + Number(f.amount || 0), 0) / 3;
  }, 0), [activeStudents, structures, currentYear]);

  const outstanding = Math.max(0, totalExpected - totalFeeIncome);
  const collRate = totalExpected > 0 ? (totalFeeIncome / totalExpected) * 100 : 0;

  // Capitation — filter by year
  const capitationTotal = capitation.filter(c => Number(c.year) === year).reduce((a, c) => a + Number(c.amount_received || 0), 0);
  const totalIncome = totalFeeIncome + capitationTotal;

  // Payroll — filter by year, include all paid/approved statuses
  const yearPayroll = payroll.filter(p => {
    const y = p.payment_date ? new Date(p.payment_date).getFullYear() : 0;
    const st = (p.status || '').toLowerCase();
    return y === year && (st === 'paid' || st === 'approved' || st === 'processed' || !st);
  });
  const salaries = yearPayroll.reduce((a, p) => a + Number(p.gross_pay || 0), 0);
  const paye = yearPayroll.reduce((a, p) => a + Number(p.paye || 0), 0);
  const nhif = yearPayroll.reduce((a, p) => a + Number(p.nhif || 0), 0);
  const nssf = yearPayroll.reduce((a, p) => a + Number(p.nssf || 0), 0);

  // Expenses — use expense_date or year column
  const yearExpenses = expenses.filter(e => {
    const ey = e.year ? Number(e.year) : (e.expense_date ? new Date(e.expense_date).getFullYear() : 0);
    const st = (e.status || '').toLowerCase();
    return ey === year && st !== 'rejected' && st !== 'cancelled';
  });
  const totalExpenseAmt = yearExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const totalExpenditureAll = salaries + totalExpenseAmt;
  const netSurplus = totalIncome - totalExpenditureAll;

  // Assets — all active/in-use
  const activeAssets = assets.filter(a => {
    const st = (a.status || '').toLowerCase();
    return st === 'active' || st === 'in use' || st === 'in-use' || !st;
  });
  const fixedAssets = activeAssets.reduce((a, ast) => a + Number(ast.current_value || ast.purchase_price || 0), 0);

  // Bank — all active accounts
  const activeAccounts = bankAccounts.filter(b => b.is_active !== false);
  const cashAtBank = activeAccounts.reduce((a, b) => a + Number(b.book_balance || b.bank_balance || 0), 0);
  const feesReceivable = outstanding;
  const totalAssetsVal = fixedAssets + cashAtBank + feesReceivable;
  const totalLiabilities = paye + nhif + nssf;

  // Form analysis
  const formAnalysis = useMemo(() => forms.map(f => {
    const fStudents = activeStudents.filter(s => s.form_id === f.id);
    const expected = fStudents.reduce((a, s) => {
      const applicable = structures.filter(fs2 => !fs2.form_id || fs2.form_id === s.form_id);
      let yf = applicable.filter(fs2 => !fs2.year || fs2.year === currentYear);
      if (yf.length === 0 && applicable.length > 0) {
        const maxY = Math.max(...applicable.map(fs2 => fs2.year || 0));
        yf = applicable.filter(fs2 => !fs2.year || fs2.year === maxY);
      }
      return a + yf.reduce((b, fs2) => b + Number(fs2.amount || 0), 0) / 3;
    }, 0);
    const collected = termPayments
      .filter(p => fStudents.some(s => s.id === p.student_id))
      .reduce((a, p) => a + Number(p.amount || 0), 0);
    return {
      name: f.form_name,
      students: fStudents.length,
      expected,
      collected,
      balance: Math.max(0, expected - collected),
      rate: expected > 0 ? (collected / expected) * 100 : 0,
    };
  }), [forms, activeStudents, structures, termPayments, currentYear]);

  // Payment method breakdown
  const methodBreakdown: Record<string, number> = {};
  termPayments.forEach(p => {
    const m = p.payment_method || 'Other';
    methodBreakdown[m] = (methodBreakdown[m] || 0) + Number(p.amount || 0);
  });

  // Expense category breakdown
  const expCategoryBreakdown: Record<string, number> = {};
  yearExpenses.forEach(e => {
    const c = e.category || e.vote_head || 'Other';
    expCategoryBreakdown[c] = (expCategoryBreakdown[c] || 0) + Number(e.amount || 0);
  });

  const printReport = () => {
    const w = window.open('', '_blank')!;
    const schoolName = school.school_name || 'School Name';
    w.document.write(`<!DOCTYPE html><html><head><title>BOG Report ${year}</title><style>
      body{font-family:Arial,sans-serif;padding:20px;color:#222;font-size:12px}
      .header{text-align:center;border-bottom:3px double #1d4ed8;padding-bottom:16px;margin-bottom:20px}
      .header h1{font-size:22px;color:#1d4ed8;margin:0}
      .section h2{background:#1d4ed8;color:#fff;padding:8px 14px;font-size:13px;margin:16px 0 8px;border-radius:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th{background:#dbeafe;color:#1e3a8a;padding:7px 10px;text-align:left;font-size:11px;font-weight:bold}
      td{padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px}
      .total{background:#dbeafe;font-weight:bold}
      .surplus{color:#15803d;font-weight:bold}.deficit{color:#dc2626;font-weight:bold}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
      .kpi{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px;text-align:center}
      .kpi-val{font-size:16px;font-weight:bold;color:#1d4ed8}.kpi-lbl{font-size:10px;color:#64748b;margin-top:2px}
      @page{size:A4;margin:15mm}
    </style></head><body>
      <div class="header">
        <h1>${schoolName}</h1>
        <p>${school.address || ''}</p>
        <p><strong>BOARD OF GOVERNORS — FINANCIAL REPORT ${year}</strong></p>
        <p>Term: ${currentTerm?.term_name || 'Current Term'} | Generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val">${KES(totalFeeIncome)}</div><div class="kpi-lbl">Fee Income</div></div>
        <div class="kpi"><div class="kpi-val">${PCT(collRate, 100)}</div><div class="kpi-lbl">Collection Rate</div></div>
        <div class="kpi"><div class="kpi-val">${KES(outstanding)}</div><div class="kpi-lbl">Outstanding</div></div>
        <div class="kpi"><div class="kpi-val" class="${netSurplus >= 0 ? 'surplus' : 'deficit'}">${KES(Math.abs(netSurplus))}</div><div class="kpi-lbl">${netSurplus >= 0 ? 'Surplus' : 'Deficit'}</div></div>
      </div>
      <div class="section"><h2>INCOME STATEMENT — ${year}</h2>
        <table><tr><th>Item</th><th style="text-align:right">Amount</th></tr>
          <tr><td>Fee Income (Term)</td><td style="text-align:right">${KES(totalFeeIncome)}</td></tr>
          <tr><td>Govt Capitation</td><td style="text-align:right">${KES(capitationTotal)}</td></tr>
          <tr class="total"><td><strong>TOTAL INCOME</strong></td><td style="text-align:right"><strong>${KES(totalIncome)}</strong></td></tr>
          <tr><td>Staff Salaries</td><td style="text-align:right">${KES(salaries)}</td></tr>
          <tr><td>Other Expenses</td><td style="text-align:right">${KES(totalExpenseAmt)}</td></tr>
          <tr class="total"><td><strong>TOTAL EXPENDITURE</strong></td><td style="text-align:right"><strong>${KES(totalExpenditureAll)}</strong></td></tr>
          <tr><td class="${netSurplus >= 0 ? 'surplus' : 'deficit'}"><strong>NET ${netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'}</strong></td><td style="text-align:right" class="${netSurplus >= 0 ? 'surplus' : 'deficit'}"><strong>${KES(Math.abs(netSurplus))}</strong></td></tr>
        </table>
      </div>
      <div class="section"><h2>FEE COLLECTION BY CLASS</h2>
        <table><tr><th>Class</th><th>Students</th><th style="text-align:right">Expected</th><th style="text-align:right">Collected</th><th style="text-align:right">Balance</th><th style="text-align:right">Rate</th></tr>
          ${formAnalysis.map(f => `<tr><td>${f.name}</td><td>${f.students}</td><td style="text-align:right">${KES(f.expected)}</td><td style="text-align:right">${KES(f.collected)}</td><td style="text-align:right">${KES(f.balance)}</td><td style="text-align:right">${f.rate.toFixed(1)}%</td></tr>`).join('')}
          <tr class="total"><td><strong>TOTAL</strong></td><td><strong>${activeStudents.length}</strong></td><td style="text-align:right"><strong>${KES(totalExpected)}</strong></td><td style="text-align:right"><strong>${KES(totalFeeIncome)}</strong></td><td style="text-align:right"><strong>${KES(outstanding)}</strong></td><td style="text-align:right"><strong>${collRate.toFixed(1)}%</strong></td></tr>
        </table>
      </div>
    </body></html>`);
    w.document.close(); w.print();
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ fontSize: 48 }}>👔</div>
      <p style={{ fontWeight: 900, color: '#1d4ed8' }}>Loading Board Financial Report…</p>
      <p style={{ fontSize: 12, color: '#64748b' }}>Reading all tables from database…</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", padding: '0 0 40px' }}>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a8a,#1d4ed8)', borderRadius: 20, padding: '28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>👔</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{school.school_name || 'Board Financial Report'}</h1>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Board of Governors — Financial Report {year}</p>
              </div>
            </div>
            {/* Data confirmation strip */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {[
                { label: `${students.length} students loaded`, ok: students.length > 0 },
                { label: `${payments.length} payments loaded`, ok: payments.length > 0 },
                { label: `${structures.length} fee structures loaded`, ok: structures.length > 0 },
                { label: `${payroll.length} payroll records`, ok: true },
                { label: `${expenses.length} expense records`, ok: true },
              ].map((d, i) => (
                <span key={i} style={{ background: d.ok && (i < 3 ? d.ok : true) ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${d.ok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 99, padding: '3px 10px', fontSize: 11, color: d.ok ? '#86efac' : '#fca5a5', fontWeight: 700 }}>
                  {d.ok ? '✓' : '⚠'} {d.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Filter by Term</label>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
                {terms.map(t => <option key={t.id} value={String(t.id)} style={{ background: '#1e3a8a' }}>{t.term_name}</option>)}
              </select>
            </div>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 14px', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, marginTop: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button onClick={printReport} style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 10, padding: '9px 14px', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, marginTop: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiPrinter size={14} /> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Term Fee Income', value: KES(totalFeeIncome), icon: '💰', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', sub: `${termPayments.length} payments` },
          { label: 'Collection Rate', value: collRate.toFixed(1) + '%', icon: '📊', color: collRate >= 70 ? '#16a34a' : collRate >= 40 ? '#d97706' : '#dc2626', bg: '#eff6ff', border: '#bfdbfe', sub: `${KES(totalExpected)} expected` },
          { label: 'Outstanding Fees', value: KES(outstanding), icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fde68a', sub: `${activeStudents.length} active students` },
          { label: 'Total Income', value: KES(totalIncome), icon: '📈', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', sub: `Incl. KES ${(capitationTotal/1000).toFixed(0)}K capitation` },
          { label: 'Total Expenditure', value: KES(totalExpenditureAll), icon: '📉', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', sub: `Salaries + Expenses` },
          { label: netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit', value: KES(Math.abs(netSurplus)), icon: netSurplus >= 0 ? '🏆' : '⚠️', color: netSurplus >= 0 ? '#059669' : '#dc2626', bg: netSurplus >= 0 ? '#f0fdf4' : '#fef2f2', border: netSurplus >= 0 ? '#86efac' : '#fca5a5', sub: netSurplus >= 0 ? 'School in surplus' : 'School in deficit' },
          { label: 'Fixed Assets', value: KES(fixedAssets), icon: '🏗️', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', sub: `${activeAssets.length} assets` },
          { label: 'Cash at Bank', value: KES(cashAtBank), icon: '🏦', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', sub: `${activeAccounts.length} accounts` },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: k.color, opacity: 0.08 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 900, color: k.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize: 26 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* INCOME STATEMENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff' }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>📈 Income Statement — {year}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Term: {currentTerm?.term_name}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                { label: 'Fee Income (Term)', value: totalFeeIncome, indent: false, bold: false },
                { label: 'Govt Capitation', value: capitationTotal, indent: false, bold: false },
                { label: 'TOTAL INCOME', value: totalIncome, indent: false, bold: true, highlight: '#dbeafe' },
                { label: '', value: null, indent: false, bold: false },
                { label: 'Staff Salaries (Gross)', value: salaries, indent: false, bold: false },
                { label: 'Other Expenses', value: totalExpenseAmt, indent: false, bold: false },
                { label: 'TOTAL EXPENDITURE', value: totalExpenditureAll, indent: false, bold: true, highlight: '#fee2e2' },
                { label: '', value: null, indent: false, bold: false },
                { label: netSurplus >= 0 ? '✅ NET SURPLUS' : '⚠️ NET DEFICIT', value: Math.abs(netSurplus), indent: false, bold: true, highlight: netSurplus >= 0 ? '#dcfce7' : '#fee2e2', color: netSurplus >= 0 ? '#16a34a' : '#dc2626' },
              ].map((row, i) => row.value === null ? (
                <tr key={i}><td colSpan={2} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }} /></tr>
              ) : (
                <tr key={i} style={{ background: (row as any).highlight || (i % 2 === 0 ? '#fff' : '#f8fafc'), borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 20px', fontWeight: row.bold ? 900 : 400, color: (row as any).color || '#374151', fontSize: row.bold ? 13 : 12 }}>{row.label}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontWeight: row.bold ? 900 : 600, color: (row as any).color || '#0f172a', fontSize: row.bold ? 13 : 12 }}>{KES(row.value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Balance Sheet */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#0f172a,#374151)', color: '#fff' }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>🏛️ Balance Sheet Summary</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>As at end of {currentTerm?.term_name}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr style={{ background: '#eff6ff' }}><td colSpan={2} style={{ padding: '8px 20px', fontWeight: 900, fontSize: 11, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ASSETS</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>Fixed Assets (Net Book Value)</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(fixedAssets)}</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>Cash & Bank Balances</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(cashAtBank)}</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>Fees Receivable (Debtors)</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(feesReceivable)}</td></tr>
              <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}><td style={{ padding: '11px 20px', fontWeight: 900, color: '#1d4ed8' }}>TOTAL ASSETS</td><td style={{ padding: '11px 20px', textAlign: 'right', fontWeight: 900, color: '#1d4ed8' }}>{KES(totalAssetsVal)}</td></tr>
              <tr style={{ background: '#fef2f2' }}><td colSpan={2} style={{ padding: '8px 20px', fontWeight: 900, fontSize: 11, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LIABILITIES</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>PAYE Payable (KRA)</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(paye)}</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>NHIF Payable</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(nhif)}</td></tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 20px', color: '#374151' }}>NSSF Payable</td><td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700 }}>{KES(nssf)}</td></tr>
              <tr style={{ background: '#fee2e2', borderBottom: '2px solid #fca5a5' }}><td style={{ padding: '11px 20px', fontWeight: 900, color: '#dc2626' }}>TOTAL LIABILITIES</td><td style={{ padding: '11px 20px', textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>{KES(totalLiabilities)}</td></tr>
              <tr style={{ background: netSurplus >= 0 ? '#dcfce7' : '#fee2e2' }}><td style={{ padding: '11px 20px', fontWeight: 900, color: netSurplus >= 0 ? '#16a34a' : '#dc2626' }}>NET EQUITY / RESERVES</td><td style={{ padding: '11px 20px', textAlign: 'right', fontWeight: 900, color: netSurplus >= 0 ? '#16a34a' : '#dc2626' }}>{KES(totalAssetsVal - totalLiabilities)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM ANALYSIS TABLE */}
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff' }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>📚 Fee Collection by Class — {currentTerm?.term_name}</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Form','Students','Expected','Collected','Outstanding','Rate','Progress'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h==='Form'||h==='Progress' ? 'left' : h==='Students'||h==='Rate' ? 'center' : 'right', fontWeight: 900, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formAnalysis.map((f, i) => (
                <tr key={f.name} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '13px 16px', fontWeight: 900, color: '#0f172a' }}>{f.name}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}><span style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 800, fontSize: 12, padding: '2px 8px', borderRadius: 99 }}>{f.students}</span></td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{KES(f.expected)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>{KES(f.collected)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: f.balance > 0 ? '#dc2626' : '#16a34a' }}>{KES(f.balance)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 900, color: f.rate >= 70 ? '#16a34a' : f.rate >= 40 ? '#d97706' : '#dc2626' }}>{f.rate.toFixed(1)}%</td>
                  <td style={{ padding: '13px 16px', minWidth: 140 }}>
                    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: 10, width: `${Math.min(100, f.rate)}%`, background: f.rate >= 70 ? 'linear-gradient(90deg,#22c55e,#10b981)' : f.rate >= 40 ? 'linear-gradient(90deg,#f59e0b,#fb923c)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 99 }} />
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', fontWeight: 900 }}>
                <td style={{ padding: '14px 16px', color: '#fff', fontSize: 13 }}>TOTALS</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#c7d2fe', fontWeight: 900 }}>{activeStudents.length}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#c7d2fe', fontWeight: 900 }}>{KES(totalExpected)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#86efac', fontWeight: 900 }}>{KES(totalFeeIncome)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#fca5a5', fontWeight: 900 }}>{KES(outstanding)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: collRate >= 70 ? '#86efac' : '#fcd34d', fontWeight: 900, fontSize: 15 }}>{collRate.toFixed(1)}%</td>
                <td style={{ padding: '14px 16px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Methods + Expense Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💳 Payment Methods</div>
          {Object.entries(methodBreakdown).length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No payment data for this term</p> : Object.entries(methodBreakdown).map(([m, amt], i) => {
            const colors = ['#6366f1','#22c55e','#f59e0b','#0891b2','#ec4899'];
            const pct = totalFeeIncome > 0 ? (amt / totalFeeIncome) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{m}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: colors[i % colors.length] }}>{KES(amt)} ({pct.toFixed(1)}%)</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                  <div style={{ height: 8, width: `${pct}%`, background: colors[i % colors.length], borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📉 Expense by Category</div>
          {Object.entries(expCategoryBreakdown).length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No expense data for {year}</p> : Object.entries(expCategoryBreakdown).sort(([,a],[,b])=>b-a).slice(0, 8).map(([cat, amt], i) => {
            const colors = ['#ef4444','#f97316','#f59e0b','#dc2626','#ec4899','#8b5cf6'];
            const pct = totalExpenseAmt > 0 ? (amt / totalExpenseAmt) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{cat}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: colors[i % colors.length] }}>{KES(amt)}</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                  <div style={{ height: 8, width: `${pct}%`, background: colors[i % colors.length], borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

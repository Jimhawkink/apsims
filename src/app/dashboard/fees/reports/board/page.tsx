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
    const [scRes, sRes, pRes, fsRes, payRes, aRes, baRes, eRes, fRes, tRes, cRes] = await Promise.all([
      supabase.from('school_details').select('school_name,address,phone,email,motto').limit(1).maybeSingle(),
      supabase.from('school_students').select('id,form_id,status'),
      supabase.from('school_fee_payments').select('amount,payment_date,term_id,payment_method,student_id'),
      supabase.from('school_fee_structures').select('form_id,amount,tuition'),
      supabase.from('school_payroll').select('gross_pay,net_pay,paye,nhif,nssf,housing_levy,payment_date,status,staff_type').eq('status','Paid'),
      supabase.from('school_assets').select('purchase_price,current_value,category,status').eq('status','Active'),
      supabase.from('school_bank_accounts').select('bank_name,account_name,book_balance,bank_balance,is_active').eq('is_active',true),
      supabase.from('school_expenses').select('amount,category,expense_date,expense_type'),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_terms').select('id,term_name,start_date,end_date,is_current,year').order('id',{ascending:false}),
      supabase.from('school_capitation').select('amount_received,term_id,year').order('id',{ascending:false}).limit(10),
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
    setCapitation(cRes.data || []);
    const cur = (tRes.data || []).find((t: any) => t.is_current) || (tRes.data || [])[0];
    if (cur) setSelTerm(String(cur.id));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentTerm = terms.find(t => String(t.id) === selTerm) || terms[0];
  const year = currentTerm?.year || new Date().getFullYear();

  const activeStudents = students.filter(s => s.status === 'Active');
  const termPayments = selTerm ? payments.filter(p => String(p.term_id) === selTerm) : payments;
  const yearPayments = payments.filter(p => new Date(p.payment_date || '').getFullYear() === year);

  const totalFeeIncome = termPayments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const totalExpected = activeStudents.reduce((a, s) => {
    const fs = structures.filter(f => f.form_id === s.form_id);
    return a + fs.reduce((b, f) => b + Number(f.amount || f.tuition || 0), 0) / 3;
  }, 0);
  const outstanding = Math.max(0, totalExpected - totalFeeIncome);
  const collRate = totalExpected > 0 ? (totalFeeIncome / totalExpected) * 100 : 0;

  const capitationTotal = capitation.filter(c => c.year === year).reduce((a, c) => a + Number(c.amount_received || 0), 0);
  const totalIncome = totalFeeIncome + capitationTotal;

  const salaries = payroll.filter(p => new Date(p.payment_date || '').getFullYear() === year).reduce((a, p) => a + Number(p.gross_pay || 0), 0);
  const paye = payroll.filter(p => new Date(p.payment_date || '').getFullYear() === year).reduce((a, p) => a + Number(p.paye || 0), 0);
  const nhif = payroll.filter(p => new Date(p.payment_date || '').getFullYear() === year).reduce((a, p) => a + Number(p.nhif || 0), 0);
  const nssf = payroll.filter(p => new Date(p.payment_date || '').getFullYear() === year).reduce((a, p) => a + Number(p.nssf || 0), 0);
  const totalExpenseAmt = expenses.filter(e => new Date(e.expense_date || '').getFullYear() === year).reduce((a, e) => a + Number(e.amount || 0), 0);
  const totalExpenditureAll = salaries + totalExpenseAmt;
  const netSurplus = totalIncome - totalExpenditureAll;

  const fixedAssets = assets.reduce((a, ast) => a + Number(ast.current_value || ast.purchase_price || 0), 0);
  const cashAtBank = bankAccounts.reduce((a, b) => a + Number(b.book_balance || b.bank_balance || 0), 0);
  const feesReceivable = outstanding;
  const totalAssetsVal = fixedAssets + cashAtBank + feesReceivable;
  const totalLiabilities = paye + nhif + nssf;

  const formAnalysis = forms.map(f => {
    const fStudents = activeStudents.filter(s => s.form_id === f.id);
    const expected = fStudents.reduce((a, s) => { const fs = structures.filter(fs2 => fs2.form_id === s.form_id); return a + fs.reduce((b, f2) => b + Number(f2.amount || f2.tuition || 0), 0) / 3; }, 0);
    const collected = termPayments.filter(p => fStudents.some(s => s.id === p.student_id)).reduce((a, p) => a + Number(p.amount || 0), 0);
    return { name: f.form_name, students: fStudents.length, expected, collected, balance: expected - collected, rate: expected > 0 ? (collected / expected) * 100 : 0 };
  });

  const methodBreakdown: Record<string, number> = {};
  termPayments.forEach(p => { const m = p.payment_method || 'Other'; methodBreakdown[m] = (methodBreakdown[m] || 0) + Number(p.amount || 0); });

  const printReport = () => {
    const w = window.open('','_blank')!;
    const schoolName = school.school_name || 'School Name';
    w.document.write(`<!DOCTYPE html><html><head><title>BOG Report</title><style>
      body{font-family:Arial,sans-serif;padding:20px;color:#222;font-size:12px}
      .header{text-align:center;border-bottom:3px double #1d4ed8;padding-bottom:16px;margin-bottom:20px}
      .header h1{font-size:22px;color:#1d4ed8;margin:0}
      .header p{margin:4px 0;font-size:13px;color:#555}
      .section{margin-bottom:20px}
      .section h2{background:#1d4ed8;color:#fff;padding:8px 14px;font-size:13px;margin:0 0 8px;border-radius:4px}
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
        <p>${school.address || ''} | ${school.phone || ''}</p>
        <p style="font-size:15px;font-weight:bold;color:#dc2626;margin-top:8px">BOARD OF MANAGEMENT — FINANCIAL REPORT</p>
        <p>${currentTerm?.term_name || ''} ${year} | Prepared: ${new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val">${activeStudents.length}</div><div class="kpi-lbl">Active Students</div></div>
        <div class="kpi"><div class="kpi-val">${collRate.toFixed(1)}%</div><div class="kpi-lbl">Collection Rate</div></div>
        <div class="kpi"><div class="kpi-val">${KES(totalFeeIncome)}</div><div class="kpi-lbl">Fees Collected</div></div>
        <div class="kpi"><div class="kpi-val">${KES(outstanding)}</div><div class="kpi-lbl">Outstanding</div></div>
      </div>

      <div class="section"><h2>I. INCOME STATEMENT</h2>
        <table><tr><th>Revenue Source</th><th>Amount (KES)</th></tr>
          <tr><td>School Fee Collections</td><td>${KES(totalFeeIncome)}</td></tr>
          <tr><td>Government Capitation</td><td>${KES(capitationTotal)}</td></tr>
          <tr class="total"><td><strong>TOTAL INCOME</strong></td><td><strong>${KES(totalIncome)}</strong></td></tr>
        </table>
        <table><tr><th>Expenditure Item</th><th>Amount (KES)</th></tr>
          <tr><td>Staff Salaries & Allowances</td><td>${KES(salaries)}</td></tr>
          <tr><td>Operational Expenses</td><td>${KES(totalExpenseAmt)}</td></tr>
          <tr class="total"><td><strong>TOTAL EXPENDITURE</strong></td><td><strong>${KES(totalExpenditureAll)}</strong></td></tr>
          <tr class="total"><td><strong>NET ${netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'}</strong></td><td class="${netSurplus >= 0 ? 'surplus' : 'deficit'}"><strong>${KES(Math.abs(netSurplus))}</strong></td></tr>
        </table>
      </div>

      <div class="section"><h2>II. BALANCE SHEET SUMMARY</h2>
        <table><tr><th>Item</th><th>Amount (KES)</th></tr>
          <tr><td>Fixed Assets (Net Book Value)</td><td>${KES(fixedAssets)}</td></tr>
          <tr><td>Cash at Bank</td><td>${KES(cashAtBank)}</td></tr>
          <tr><td>Fees Receivable</td><td>${KES(feesReceivable)}</td></tr>
          <tr class="total"><td><strong>TOTAL ASSETS</strong></td><td><strong>${KES(totalAssetsVal)}</strong></td></tr>
          <tr><td>Statutory Deductions Payable (PAYE, NHIF, NSSF)</td><td>${KES(totalLiabilities)}</td></tr>
          <tr class="total"><td><strong>NET EQUITY</strong></td><td><strong>${KES(totalAssetsVal - totalLiabilities)}</strong></td></tr>
        </table>
      </div>

      <div class="section"><h2>III. FEE COLLECTION BY CLASS</h2>
        <table><tr><th>Class</th><th>Students</th><th>Expected</th><th>Collected</th><th>Balance</th><th>Rate</th></tr>
          ${formAnalysis.map(f => `<tr><td>${f.name}</td><td>${f.students}</td><td>${KES(f.expected)}</td><td>${KES(f.collected)}</td><td class="${f.balance>0?'deficit':'surplus'}">${KES(f.balance)}</td><td>${f.rate.toFixed(1)}%</td></tr>`).join('')}
        </table>
      </div>

      <div class="section"><h2>IV. PAYMENT METHODS BREAKDOWN</h2>
        <table><tr><th>Method</th><th>Amount</th><th>% of Total</th></tr>
          ${Object.entries(methodBreakdown).map(([m,a]) => `<tr><td>${m}</td><td>${KES(a)}</td><td>${PCT(a as number, totalFeeIncome)}</td></tr>`).join('')}
        </table>
      </div>

      <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:11px">
        <div><div style="border-top:1px solid #000;padding-top:4px;margin-top:40px">Principal's Signature & Date</div></div>
        <div><div style="border-top:1px solid #000;padding-top:4px;margin-top:40px">Bursar's Signature & Date</div></div>
        <div><div style="border-top:1px solid #000;padding-top:4px;margin-top:40px">BOG Chairman's Signature & Date</div></div>
      </div>
    </body></html>`);
    setTimeout(() => w.print(), 400);
  };

  const sectionHd = { fontSize: 13, fontWeight: 900, color: '#1d4ed8', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 };
  const TBL = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 };
  const TH = { padding: '9px 14px', background: '#eff6ff', color: '#1e3a8a', fontWeight: 800, fontSize: 11, textAlign: 'left' as const, textTransform: 'uppercase' as const };
  const TD = { padding: '9px 14px', borderBottom: '1px solid #f1f5f9' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0891b2 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🏛️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Board of Management Report</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>{school.school_name || 'School'} — One-click PDF-ready BOG financial report from real data</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }}>
                {terms.slice(0, 6).map(t => <option key={t.id} value={t.id} style={{ color: '#000' }}>{t.term_name} {t.year}</option>)}
              </select>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiRefreshCw size={14} /></button>
              <button onClick={printReport} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#1d4ed8', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print BOG Report</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              { icon: '👥', label: 'Active Students', val: activeStudents.length },
              { icon: '💰', label: 'Fee Income', val: KES(totalFeeIncome) },
              { icon: '📈', label: 'Collection Rate', val: collRate.toFixed(1) + '%' },
              { icon: '⚠️', label: 'Outstanding', val: KES(outstanding) },
              { icon: '🏦', label: netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit', val: KES(Math.abs(netSurplus)) },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div>{k.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 900, marginTop: 4 }}>{k.val}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 80 }}>Loading report data…</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Income Statement */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20 }}>
              <h3 style={sectionHd}>📋 Income Statement — {currentTerm?.term_name}</h3>
              <table style={TBL}><thead><tr><th style={TH}>Item</th><th style={{ ...TH, textAlign: 'right' as const }}>Amount</th></tr></thead>
                <tbody>
                  <tr><td style={TD}>Fee Collections</td><td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{KES(totalFeeIncome)}</td></tr>
                  <tr><td style={TD}>Govt Capitation</td><td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{KES(capitationTotal)}</td></tr>
                  <tr style={{ background: '#eff6ff' }}><td style={{ ...TD, fontWeight: 900 }}>Total Income</td><td style={{ ...TD, textAlign: 'right', fontWeight: 900, color: '#1d4ed8' }}>{KES(totalIncome)}</td></tr>
                  <tr><td style={{ ...TD, paddingTop: 16, color: '#64748b' }}>Staff Salaries</td><td style={{ ...TD, paddingTop: 16, textAlign: 'right', color: '#dc2626' }}>{KES(salaries)}</td></tr>
                  <tr><td style={TD}>Operations</td><td style={{ ...TD, textAlign: 'right', color: '#dc2626' }}>{KES(totalExpenseAmt)}</td></tr>
                  <tr style={{ background: '#fef2f2' }}><td style={{ ...TD, fontWeight: 900 }}>Total Expenditure</td><td style={{ ...TD, textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>{KES(totalExpenditureAll)}</td></tr>
                  <tr style={{ background: netSurplus >= 0 ? '#dcfce7' : '#fef2f2' }}>
                    <td style={{ ...TD, fontWeight: 900, fontSize: 15 }}>Net {netSurplus >= 0 ? 'Surplus ✅' : 'Deficit ⚠️'}</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 900, fontSize: 15, color: netSurplus >= 0 ? '#15803d' : '#dc2626' }}>{KES(Math.abs(netSurplus))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Balance Sheet */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20 }}>
              <h3 style={sectionHd}>🏦 Balance Sheet Summary</h3>
              <table style={TBL}><thead><tr><th style={TH}>Item</th><th style={{ ...TH, textAlign: 'right' as const }}>Amount</th></tr></thead>
                <tbody>
                  <tr><td style={TD} colSpan={2}><strong>ASSETS</strong></td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>Fixed Assets</td><td style={{ ...TD, textAlign: 'right' }}>{KES(fixedAssets)}</td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>Cash at Bank</td><td style={{ ...TD, textAlign: 'right', color: '#15803d' }}>{KES(cashAtBank)}</td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>Fees Receivable</td><td style={{ ...TD, textAlign: 'right' }}>{KES(feesReceivable)}</td></tr>
                  <tr style={{ background: '#eff6ff' }}><td style={{ ...TD, fontWeight: 900 }}>Total Assets</td><td style={{ ...TD, textAlign: 'right', fontWeight: 900, color: '#1d4ed8' }}>{KES(totalAssetsVal)}</td></tr>
                  <tr><td style={{ ...TD, paddingTop: 12 }} colSpan={2}><strong>LIABILITIES</strong></td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>PAYE Payable</td><td style={{ ...TD, textAlign: 'right', color: '#dc2626' }}>{KES(paye)}</td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>NHIF Payable</td><td style={{ ...TD, textAlign: 'right', color: '#dc2626' }}>{KES(nhif)}</td></tr>
                  <tr><td style={{ ...TD, paddingLeft: 24 }}>NSSF Payable</td><td style={{ ...TD, textAlign: 'right', color: '#dc2626' }}>{KES(nssf)}</td></tr>
                  <tr style={{ background: '#fef2f2' }}><td style={{ ...TD, fontWeight: 900 }}>Total Liabilities</td><td style={{ ...TD, textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>{KES(totalLiabilities)}</td></tr>
                  <tr style={{ background: '#dcfce7' }}><td style={{ ...TD, fontWeight: 900, fontSize: 14 }}>NET EQUITY</td><td style={{ ...TD, textAlign: 'right', fontWeight: 900, fontSize: 14, color: '#15803d' }}>{KES(totalAssetsVal - totalLiabilities)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Form Analysis */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20, gridColumn: '1 / -1' }}>
              <h3 style={sectionHd}>📚 Collection Analysis by Class</h3>
              <table style={TBL}><thead><tr>{['Class','Students','Expected','Collected','Balance','Rate','Progress'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {formAnalysis.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...TD, fontWeight: 900, color: '#4f46e5' }}>{f.name}</td>
                      <td style={TD}>{f.students}</td>
                      <td style={{ ...TD, fontWeight: 700 }}>{KES(f.expected)}</td>
                      <td style={{ ...TD, fontWeight: 700, color: '#15803d' }}>{KES(f.collected)}</td>
                      <td style={{ ...TD, fontWeight: 700, color: f.balance > 0 ? '#dc2626' : '#15803d' }}>{KES(f.balance)}</td>
                      <td style={{ ...TD, fontWeight: 900, color: f.rate >= 80 ? '#15803d' : f.rate >= 50 ? '#d97706' : '#dc2626' }}>{f.rate.toFixed(1)}%</td>
                      <td style={{ ...TD, width: 120 }}>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                          <div style={{ height: 8, width: `${Math.min(100, f.rate)}%`, background: f.rate >= 80 ? '#22c55e' : f.rate >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 99 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

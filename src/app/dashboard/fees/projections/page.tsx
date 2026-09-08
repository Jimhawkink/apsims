'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiTrendingUp, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const PCT = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

export default function ProjectionsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pRes, payRes, sRes, fsRes, fRes, tRes, eRes] = await Promise.all([
      supabase.from('school_fee_payments').select('amount,payment_date,term_id').order('payment_date'),
      supabase.from('school_payroll').select('gross_pay,net_pay,payment_date,status').eq('status','Paid'),
      supabase.from('school_students').select('id,form_id,status').eq('status','Active'),
      supabase.from('school_fee_structures').select('form_id,amount,tuition'),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_terms').select('id,term_name,start_date,end_date,is_current,year').order('id',{ascending:false}),
      supabase.from('school_expenses').select('amount,expense_date'),
    ]);
    setPayments(pRes.data || []);
    setPayroll(payRes.data || []);
    setStudents(sRes.data || []);
    setStructures(fsRes.data || []);
    setForms(fRes.data || []);
    setTerms(tRes.data || []);
    setExpenses(eRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Monthly collection trend (last 12 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; amount: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(); const y = d.getFullYear();
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const amount = payments.filter(p => { const pd = new Date(p.payment_date || ''); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((a, p) => a + Number(p.amount || 0), 0);
      const exp = expenses.filter(e => { const ed = new Date(e.expense_date || ''); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((a, e) => a + Number(e.amount || 0), 0);
      months.push({ label, amount, expenses: exp });
    }
    return months;
  }, [payments, expenses]);

  // Calculate average monthly collection (last 6 months for accuracy)
  const avgMonthly = useMemo(() => {
    const last6 = monthlyData.slice(6);
    const withData = last6.filter(m => m.amount > 0);
    return withData.length > 0 ? withData.reduce((a, m) => a + m.amount, 0) / withData.length : 0;
  }, [monthlyData]);

  // Total expected fees this year
  const totalExpected = useMemo(() => {
    return students.reduce((a, s) => {
      const fs = structures.filter(f => f.form_id === s.form_id);
      return a + fs.reduce((b, f) => b + Number(f.amount || f.tuition || 0), 0);
    }, 0);
  }, [students, structures]);

  // Total collected this year
  const collectedThisYear = useMemo(() => payments.filter(p => new Date(p.payment_date || '').getFullYear() === currentYear).reduce((a, p) => a + Number(p.amount || 0), 0), [payments, currentYear]);

  // Total payroll this year
  const payrollThisYear = useMemo(() => payroll.filter(p => new Date(p.payment_date || '').getFullYear() === currentYear).reduce((a, p) => a + Number(p.gross_pay || 0), 0), [payroll, currentYear]);

  // Remaining months in year
  const remainingMonths = 11 - currentMonth;

  // Projections
  const projectedYearTotal = collectedThisYear + (avgMonthly * remainingMonths);
  const shortfall = totalExpected - projectedYearTotal;
  const staffIncomeRatio = projectedYearTotal > 0 ? (payrollThisYear / projectedYearTotal) * 100 : 0;
  const collectionRate = totalExpected > 0 ? (collectedThisYear / totalExpected) * 100 : 0;

  // Next 3 months projection
  const nextMonths = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(); d.setMonth(d.getMonth() + i);
      const trend = monthlyData.slice(-3).reduce((a, m) => a + m.amount, 0) / 3;
      arr.push({ label: d.toLocaleString('en', { month: 'long', year: 'numeric' }), projected: Math.round(trend * (1 + (i * 0.02))), month: d });
    }
    return arr;
  }, [monthlyData]);

  // Form collection analysis
  const formData = useMemo(() => forms.map(form => {
    const formStudents = students.filter(s => s.form_id === form.id);
    const expected = formStudents.reduce((a, s) => { const fs = structures.filter(f => f.form_id === s.form_id); return a + fs.reduce((b, f) => b + Number(f.amount || f.tuition || 0), 0); }, 0);
    const studentIds = new Set(formStudents.map(s => s.id));
    const collected = payments.filter(p => studentIds.has(p.student_id)).reduce((a, p) => a + Number(p.amount || 0), 0);
    return { name: form.form_name, expected, collected, balance: expected - collected, rate: expected > 0 ? (collected / expected) * 100 : 0 };
  }), [forms, students, structures, payments]);

  const chartData = {
    labels: monthlyData.map(m => m.label),
    datasets: [
      { label: 'Fee Income (KES)', data: monthlyData.map(m => m.amount), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4 },
      { label: 'Expenses (KES)', data: monthlyData.map(m => m.expenses), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.4 },
    ],
  };

  const projData = {
    labels: [...monthlyData.slice(-3).map(m => m.label), ...nextMonths.map(m => `📈 ${m.label.split(' ')[0]}`)],
    datasets: [
      { label: 'Historical', data: [...monthlyData.slice(-3).map(m => m.amount), null, null, null], borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.15)', fill: true, tension: 0.3 },
      { label: 'Projected', data: [null, null, monthlyData[monthlyData.length-1]?.amount || 0, ...nextMonths.map(m => m.projected)], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3, borderDash: [6,3] },
    ],
  };

  const chartOpts = { responsive: true, plugins: { legend: { position: 'bottom' as const } }, scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => `KES ${(v/1000).toFixed(0)}k` } } } };

  const printReport = () => {
    const w = window.open('','_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Financial Projections ${currentYear}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#4f46e5}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#4f46e5;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #e5e7eb}@page{size:A4;margin:12mm}</style></head><body>
      <h1>📈 Financial Projections — ${currentYear}</h1>
      <table><tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
      <tr><td>Total Expected (Annual)</td><td>${KES(totalExpected)}</td><td>From fee structures × active students</td></tr>
      <tr><td>Collected To Date</td><td>${KES(collectedThisYear)}</td><td>${PCT(collectedThisYear, totalExpected)}% of annual target</td></tr>
      <tr><td>Avg Monthly Collection</td><td>${KES(avgMonthly)}</td><td>Based on last 6 months</td></tr>
      <tr><td>Projected Year Total</td><td>${KES(projectedYearTotal)}</td><td>${remainingMonths} months remaining × avg</td></tr>
      <tr><td>Shortfall/Surplus</td><td>${KES(Math.abs(shortfall))}</td><td>${shortfall > 0 ? 'SHORTFALL ⚠️' : 'SURPLUS ✅'}</td></tr>
      <tr><td>Staff Costs This Year</td><td>${KES(payrollThisYear)}</td><td>${staffIncomeRatio.toFixed(1)}% of income</td></tr>
      </table>
      <h2>Next Term Projections</h2>
      <table><tr><th>Month</th><th>Projected Collection</th></tr>${nextMonths.map(m => `<tr><td>${m.label}</td><td>${KES(m.projected)}</td></tr>`).join('')}</table>
    </body></html>`);
    setTimeout(() => w.print(), 300);
  };

  const healthColor = shortfall > 0 ? '#dc2626' : '#15803d';
  const healthBg = shortfall > 0 ? '#fee2e2' : '#dcfce7';
  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 60%,#818cf8 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📈</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Financial Projections Engine</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>AI-powered forecasts from real fee collections, payroll & expense trends — {currentYear}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiRefreshCw size={14} /> Refresh</button>
              <button onClick={printReport} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#4f46e5', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print Report</button>
            </div>
          </div>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              { icon: '🎯', label: 'Annual Target', val: KES(totalExpected) },
              { icon: '✅', label: 'Collected', val: KES(collectedThisYear), sub: `${PCT(collectedThisYear, totalExpected)}%` },
              { icon: '📈', label: 'Projected Total', val: KES(projectedYearTotal) },
              { icon: shortfall > 0 ? '⚠️' : '💚', label: shortfall > 0 ? 'Shortfall' : 'Surplus', val: KES(Math.abs(shortfall)) },
              { icon: '👥', label: 'Staff/Income Ratio', val: `${staffIncomeRatio.toFixed(1)}%`, sub: staffIncomeRatio > 70 ? '⚠️ HIGH' : '✅ HEALTHY' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 18 }}>{k.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 4 }}>{k.val}</div>
                {k.sub && <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>{k.sub}</div>}
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
        {/* Health Alert */}
        <div style={{ background: healthBg, border: `1px solid ${healthColor}30`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          {shortfall > 0 ? <FiAlertTriangle size={20} color={healthColor} /> : <FiCheckCircle size={20} color={healthColor} />}
          <div>
            <div style={{ fontWeight: 900, color: healthColor, fontSize: 15 }}>
              {shortfall > 0 ? `⚠️ Projected shortfall of ${KES(shortfall)} — take action now` : `✅ On track — projected surplus of ${KES(Math.abs(shortfall))}`}
            </div>
            <div style={{ fontSize: 12, color: healthColor, opacity: 0.8, marginTop: 2 }}>
              Staff costs are {staffIncomeRatio.toFixed(1)}% of projected income. {staffIncomeRatio > 70 ? 'Consider reviewing payroll costs.' : 'Within healthy range (target <70%).'} Average monthly collection: {KES(avgMonthly)}.
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 900, fontSize: 14, color: '#0f172a' }}>📊 12-Month Income vs Expenses</h3>
            {!loading && <Line data={chartData} options={chartOpts} />}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 900, fontSize: 14, color: '#0f172a' }}>🔮 3-Month Projection</h3>
            {!loading && <Line data={projData} options={chartOpts} />}
          </div>
        </div>

        {/* Next Term Projections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
          {nextMonths.map((m, i) => (
            <div key={i} style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)', borderRadius: 14, padding: '20px', color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700, marginBottom: 4 }}>MONTH {i+1} PROJECTION</div>
              <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px' }}>{KES(m.projected)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>Based on {i === 0 ? 'last 3 months' : 'trend + growth rate'}</div>
            </div>
          ))}
        </div>

        {/* Form-wise Analysis */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#0f172a' }}>📚 Collection Rate by Form Class</h3>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Form','Expected','Collected','Balance','Collection Rate','Progress'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {formData.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: '#4f46e5' }}>{f.name}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{KES(f.expected)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d' }}>{KES(f.collected)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: f.balance > 0 ? '#dc2626' : '#15803d' }}>{KES(f.balance)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: f.rate >= 80 ? '#15803d' : f.rate >= 50 ? '#d97706' : '#dc2626' }}>{f.rate.toFixed(1)}%</td>
                    <td style={{ padding: '12px 14px', width: 140 }}>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: 8, width: `${Math.min(100, f.rate)}%`, background: f.rate >= 80 ? '#22c55e' : f.rate >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 99 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

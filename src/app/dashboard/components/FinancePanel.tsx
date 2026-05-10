'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

export default function FinancePanel() {
  const [data, setData] = useState<any>({ payments: [], expenses: [], income: [], structures: [], students: 0 });
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    (async () => {
      const [{ data: payments }, { data: expenses }, { data: income }, { data: structures }, { count }] = await Promise.all([
        supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('school_income').select('*').order('income_date', { ascending: false }),
        supabase.from('school_fee_structures').select('*'),
        supabase.from('school_students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      ]);
      setData({ payments: payments || [], expenses: expenses || [], income: income || [], structures: structures || [], students: count || 0 });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading finance data...</div>;

  const totalFees = data.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalIncome = data.income.reduce((s: number, i: any) => s + Number(i.amount || 0), 0) + totalFees;
  const totalStructure = data.structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
  const expectedFees = totalStructure * data.students;
  const feesDue = Math.max(0, expectedFees - totalFees);
  const collectionRate = expectedFees > 0 ? Math.round((totalFees / expectedFees) * 100) : 0;

  // Monthly breakdown
  const months: Record<string, { fees: number; expenses: number; income: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    months[key] = { fees: 0, expenses: 0, income: 0 };
  }
  data.payments.forEach((p: any) => {
    const k = new Date(p.payment_date).toLocaleString('en', { month: 'short', year: '2-digit' });
    if (months[k]) months[k].fees += Number(p.amount || 0);
  });
  data.expenses.forEach((e: any) => {
    const k = new Date(e.expense_date).toLocaleString('en', { month: 'short', year: '2-digit' });
    if (months[k]) months[k].expenses += Number(e.amount || 0);
  });

  const labels = Object.keys(months);
  const trendChart = {
    labels,
    datasets: [
      { label: 'Fees', data: labels.map(l => months[l].fees), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
      { label: 'Expenses', data: labels.map(l => months[l].expenses), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
    ],
  };

  // Payment methods breakdown
  const methodCounts: Record<string, number> = {};
  data.payments.forEach((p: any) => { const m = p.payment_method || 'Cash'; methodCounts[m] = (methodCounts[m] || 0) + Number(p.amount || 0); });
  const methodChart = {
    labels: Object.keys(methodCounts),
    datasets: [{ data: Object.values(methodCounts), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'], borderWidth: 0 }],
  };

  // Expense categories
  const expCats: Record<string, number> = {};
  data.expenses.forEach((e: any) => { const c = e.category || 'General'; expCats[c] = (expCats[c] || 0) + Number(e.amount || 0); });
  const expChart = {
    labels: Object.keys(expCats).slice(0, 6),
    datasets: [{ data: Object.values(expCats).slice(0, 6), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'], borderWidth: 0 }],
  };

  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 }, callback: (v: any) => `${(v/1000).toFixed(0)}K` }, beginAtZero: true } } };
  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } };

  return (
    <div className="space-y-4 ultra-animate">
      {/* Finance KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Total Collected', value: fmt(totalFees), icon: '💰', color: '#10b981', sub: `${data.payments.length} payments` },
          { label: 'Fee Arrears', value: fmt(feesDue), icon: '⚠️', color: '#f59e0b', sub: `${100 - collectionRate}% pending` },
          { label: 'Collection Rate', value: `${collectionRate}%`, icon: '📊', color: '#3b82f6', sub: 'Of expected fees' },
          { label: 'Total Expenses', value: fmt(totalExpenses), icon: '📉', color: '#ef4444', sub: `${data.expenses.length} entries` },
          { label: 'Other Income', value: fmt(totalIncome - totalFees), icon: '💎', color: '#8b5cf6', sub: `${data.income.length} sources` },
          { label: 'Net Position', value: fmt(totalIncome - totalExpenses), icon: '💹', color: totalIncome - totalExpenses >= 0 ? '#10b981' : '#ef4444', sub: totalIncome >= totalExpenses ? 'Surplus' : 'Deficit' },
        ].map((c, i) => (
          <div key={i} className="ultra-card">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.color }} />
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[9px] text-gray-400 uppercase font-semibold">{c.label}</span></div>
            <p className="text-[18px] font-bold text-gray-800">{c.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ultra-panel lg:col-span-2">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📈 Fees vs Expenses Trend (6 Months)</h3>
          <div className="flex gap-3 mb-2">{[{l:'Fees',c:'#10b981'},{l:'Expenses',c:'#ef4444'}].map((x,i)=><span key={i} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:x.c}}/>{x.l}</span>)}</div>
          <div style={{ height: 200 }}><Line data={trendChart} options={opts} /></div>
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">💳 Payment Methods</h3>
          <div style={{ height: 160 }}><Doughnut data={methodChart} options={dOpts} /></div>
          <div className="mt-2 space-y-1">{Object.entries(methodCounts).map(([m, v], i) => (
            <div key={i} className="flex justify-between text-[10px]"><span className="text-gray-400">{m}</span><span className="font-semibold text-gray-700">{fmt(v)}</span></div>
          ))}</div>
        </div>
      </div>

      {/* Expense Categories + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📊 Expense Categories</h3>
          <div style={{ height: 160 }}><Doughnut data={expChart} options={dOpts} /></div>
          <div className="mt-2 space-y-1">{Object.entries(expCats).slice(0, 5).map(([c, v], i) => (
            <div key={i} className="flex justify-between text-[10px]"><span className="text-gray-400">{c}</span><span className="font-semibold text-gray-700">{fmt(v)}</span></div>
          ))}</div>
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">💳 Latest 10 Payments</h3>
          <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead><tbody>
            {data.payments.slice(0, 10).map((p: any, i: number) => (
              <tr key={i}><td className="text-[10px]">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</td>
                <td className="font-bold text-emerald-600 text-[11px] font-mono">{fmt(Number(p.amount))}</td>
                <td className="text-[9px] text-gray-400">{p.payment_method || 'Cash'}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
}

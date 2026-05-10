'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Link from 'next/link';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function FinancePanel() {
  const [data, setData] = useState<any>({ payments: [], expenses: [], income: [], structures: [], students: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

  const loadData = async () => {
    const [{ data: payments }, { data: expenses }, { data: income }, { data: structures }, { count }] = await Promise.all([
      supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('school_expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('school_income').select('*').order('income_date', { ascending: false }),
      supabase.from('school_fee_structures').select('*'),
      supabase.from('school_students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    ]);
    setData({ payments: payments || [], expenses: expenses || [], income: income || [], structures: structures || [], students: count || 0 });
  };

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>💰</div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-emerald-200 animate-ping opacity-30" />
      </div>
      <p className="text-sm font-bold text-gray-400">Loading Finance Panel…</p>
    </div>
  );

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalFees = data.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const otherIncome = data.income.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalIncome = otherIncome + totalFees;
  const netPosition = totalIncome - totalExpenses;
  const totalStructure = data.structures.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
  const expectedFees = totalStructure * data.students;
  const feesDue = Math.max(0, expectedFees - totalFees);
  const collectionRate = expectedFees > 0 ? Math.round((totalFees / expectedFees) * 100) : 0;

  // Today & this week
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const todayPayments = data.payments.filter((p: any) => p.payment_date === today);
  const todayTotal = todayPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const weekPayments = data.payments.filter((p: any) => new Date(p.payment_date) >= weekStart);
  const weekTotal = weekPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  // ── Monthly trend (6 months) ──────────────────────────────────────────────
  const months: Record<string, { fees: number; expenses: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months[d.toLocaleString('en', { month: 'short', year: '2-digit' })] = { fees: 0, expenses: 0 };
  }
  data.payments.forEach((p: any) => {
    const k = new Date(p.payment_date).toLocaleString('en', { month: 'short', year: '2-digit' });
    if (months[k]) months[k].fees += Number(p.amount || 0);
  });
  data.expenses.forEach((e: any) => {
    const k = new Date(e.expense_date).toLocaleString('en', { month: 'short', year: '2-digit' });
    if (months[k]) months[k].expenses += Number(e.amount || 0);
  });
  const mLabels = Object.keys(months);

  // ── Daily (last 7 days) ───────────────────────────────────────────────────
  const daily: { day: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    daily.push({
      day: d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
      amount: data.payments.filter((p: any) => p.payment_date === ds).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    });
  }

  // ── Payment methods ───────────────────────────────────────────────────────
  const methodCounts: Record<string, number> = {};
  data.payments.forEach((p: any) => {
    const m = (p.payment_method || 'Cash').replace(/\s*\(.+\)/, '');
    methodCounts[m] = (methodCounts[m] || 0) + Number(p.amount || 0);
  });

  // ── Expense categories ────────────────────────────────────────────────────
  const expCats: Record<string, number> = {};
  data.expenses.forEach((e: any) => {
    const c = e.category || 'General';
    expCats[c] = (expCats[c] || 0) + Number(e.amount || 0);
  });

  // ── Chart configs ─────────────────────────────────────────────────────────
  const trendChart = {
    labels: mLabels,
    datasets: [
      { label: 'Fees Collected', data: mLabels.map(l => months[l].fees), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10b981', borderWidth: 2.5 },
      { label: 'Expenses', data: mLabels.map(l => months[l].expenses), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#ef4444', borderWidth: 2.5 },
    ],
  };
  const dailyChart = {
    labels: daily.map(d => d.day),
    datasets: [{ label: 'KES', data: daily.map(d => d.amount), backgroundColor: daily.map((_, i) => i === 6 ? '#10b981' : 'rgba(16,185,129,0.35)'), borderRadius: 10, borderSkipped: false }],
  };
  const methodChart = {
    labels: Object.keys(methodCounts),
    datasets: [{ data: Object.values(methodCounts), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'], borderWidth: 0, hoverOffset: 6 }],
  };
  const expChart = {
    labels: Object.keys(expCats).slice(0, 6),
    datasets: [{ data: Object.values(expCats).slice(0, 6), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'], borderWidth: 0, hoverOffset: 6 }],
  };

  const lineOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx: any) => ` ${fmt(ctx.raw)}` } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: any) => `${(v / 1000).toFixed(0)}K` }, beginAtZero: true } },
  };
  const barOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${fmt(ctx.raw)}` } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, callback: (v: any) => `${(v / 1000).toFixed(0)}K` }, beginAtZero: true } },
  };
  const dOpts: any = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx: any) => ` ${fmt(ctx.raw)}` } } },
  };

  const kpiCards = [
    { label: "Today's Collection", value: fmt(todayTotal), icon: '📅', color: '#22c55e', sub: `${todayPayments.length} payments`, pulse: todayTotal > 0 },
    { label: 'This Week', value: fmt(weekTotal), icon: '📆', color: '#06b6d4', sub: `${weekPayments.length} payments` },
    { label: 'Total Collected', value: fmt(totalFees), icon: '✅', color: '#10b981', sub: `${data.payments.length} transactions` },
    { label: 'Fee Arrears', value: fmt(feesDue), icon: '⚠️', color: '#f59e0b', sub: `${100 - collectionRate}% pending`, pulse: feesDue > 0 },
    { label: 'Collection Rate', value: `${collectionRate}%`, icon: '📊', color: collectionRate >= 70 ? '#10b981' : collectionRate >= 40 ? '#f59e0b' : '#ef4444', sub: collectionRate >= 70 ? 'On track ✓' : collectionRate >= 40 ? 'Needs attention' : 'Critical ⚠️', pulse: collectionRate < 40 },
    { label: 'Total Expenses', value: fmt(totalExpenses), icon: '📉', color: '#ef4444', sub: `${data.expenses.length} entries` },
    { label: 'Other Income', value: fmt(otherIncome), icon: '💎', color: '#8b5cf6', sub: `${data.income.length} sources` },
    { label: 'Net Position', value: fmt(netPosition), icon: netPosition >= 0 ? '💹' : '📛', color: netPosition >= 0 ? '#10b981' : '#ef4444', sub: netPosition >= 0 ? 'Surplus' : 'Deficit', pulse: netPosition < 0 },
  ];

  return (
    <div className="space-y-5 ultra-animate">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md text-base"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>💰</span>
            Fees &amp; Finance
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 ml-12">Real-time financial overview — collections, expenses &amp; trends</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
          </span>
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
            title="Refresh">
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── KPI Cards (8 cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {kpiCards.map((c, i) => (
          <div key={i} className="ultra-card group cursor-default" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{c.label}</span>
              <span className="text-base">{c.icon}</span>
            </div>
            <p className="text-[15px] font-extrabold text-gray-900 leading-tight">{c.value}</p>
            <p className="text-[9px] text-gray-400 mt-1 leading-tight">{c.sub}</p>
            {c.pulse && <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c.color }} />}
          </div>
        ))}
      </div>

      {/* ── Trend + Daily Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ultra-panel lg:col-span-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-emerald-500">📈</span> Fees vs Expenses — 6 Month Trend
          </p>
          <div style={{ height: 240 }}><Line data={trendChart} options={lineOpts} /></div>
        </div>
        <div className="ultra-panel">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-indigo-500">📊</span> Daily Collection (7 Days)
          </p>
          <div style={{ height: 240 }}><Bar data={dailyChart} options={barOpts} /></div>
        </div>
      </div>

      {/* ── Payment Methods + Expense Categories ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ultra-panel">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-blue-500">💳</span> Payment Methods Breakdown
          </p>
          <div className="flex gap-4 items-center">
            <div style={{ height: 180, width: 180, flexShrink: 0 }}>
              {Object.keys(methodCounts).length > 0
                ? <Doughnut data={methodChart} options={dOpts} />
                : <div className="flex items-center justify-center h-full text-gray-300 text-xs">No data</div>}
            </div>
            <div className="flex-1 space-y-2">
              {Object.entries(methodCounts).map(([m, v], i) => {
                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                const pct = totalFees > 0 ? Math.round((v / totalFees) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-gray-600">{m}</span>
                      <span className="font-bold text-gray-800">{fmt(v)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ultra-panel">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-red-500">📉</span> Expense Categories
          </p>
          <div className="flex gap-4 items-center">
            <div style={{ height: 180, width: 180, flexShrink: 0 }}>
              {Object.keys(expCats).length > 0
                ? <Doughnut data={expChart} options={dOpts} />
                : <div className="flex items-center justify-center h-full text-gray-300 text-xs">No data</div>}
            </div>
            <div className="flex-1 space-y-2">
              {Object.entries(expCats).slice(0, 6).map(([c, v], i) => {
                const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
                const pct = totalExpenses > 0 ? Math.round((v / totalExpenses) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-gray-600">{c}</span>
                      <span className="font-bold text-gray-800">{fmt(v)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Net Position Summary Bar ── */}
      <div className="ultra-panel" style={{ borderLeftWidth: 4, borderLeftColor: netPosition >= 0 ? '#10b981' : '#ef4444' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Income</p>
              <p className="text-lg font-extrabold text-emerald-600">{fmt(totalIncome)}</p>
              <p className="text-[9px] text-gray-400">Fees + Other</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-lg font-extrabold text-red-500">{fmt(totalExpenses)}</p>
              <p className="text-[9px] text-gray-400">{data.expenses.length} entries</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Net Position</p>
              <p className="text-lg font-extrabold" style={{ color: netPosition >= 0 ? '#10b981' : '#ef4444' }}>{fmt(netPosition)}</p>
              <p className="text-[9px] text-gray-400">{netPosition >= 0 ? '✅ Surplus' : '⚠️ Deficit'}</p>
            </div>
          </div>
          <div className="sm:w-48">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Collection Rate</p>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, collectionRate)}%`, background: collectionRate >= 70 ? '#10b981' : collectionRate >= 40 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <p className="text-center text-sm font-extrabold mt-1.5" style={{ color: collectionRate >= 70 ? '#10b981' : collectionRate >= 40 ? '#f59e0b' : '#ef4444' }}>
              {collectionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* ── Latest Payments Table ── */}
      <div className="ultra-panel p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="text-emerald-500">💳</span> Latest Payments
          </p>
          <Link href="/dashboard/fees/payments"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors">
            View All →
          </Link>
        </div>
        <div className="ultra-table-wrap rounded-none border-0">
          <table className="ultra-grid">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.slice(0, 12).map((p: any, i: number) => (
                <tr key={i}>
                  <td className="text-[10px] text-gray-500 whitespace-nowrap">
                    {new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="text-[11px] font-semibold text-gray-700">
                    {p.student_name || `ID #${p.student_id || '—'}`}
                  </td>
                  <td className="font-bold text-emerald-600 text-[12px] font-mono whitespace-nowrap">
                    {fmt(Number(p.amount))}
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: p.payment_method?.toLowerCase().includes('mpesa') ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                        color: p.payment_method?.toLowerCase().includes('mpesa') ? '#059669' : '#2563eb',
                      }}>
                      {p.payment_method || 'Cash'}
                    </span>
                  </td>
                  <td className="text-[9px] text-gray-400 font-mono">{p.receipt_number || p.mpesa_code || '—'}</td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-300 text-xs">No payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Action Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Collect Fee', href: '/dashboard/fees/collect', icon: '💵', color: '#10b981' },
          { label: 'Outstanding', href: '/dashboard/fees/outstanding', icon: '⚠️', color: '#ef4444' },
          { label: 'All Payments', href: '/dashboard/fees/payments', icon: '📋', color: '#3b82f6' },
          { label: 'Fee Structure', href: '/dashboard/fees/structure', icon: '🏗️', color: '#8b5cf6' },
          { label: 'Statements', href: '/dashboard/fees/statements', icon: '📄', color: '#f59e0b' },
        ].map((a, i) => (
          <Link key={i} href={a.href}
            className="ultra-action-btn group relative overflow-hidden"
            style={{ borderLeftWidth: 3, borderLeftColor: a.color }}>
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform block">{a.icon}</span>
            <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900">{a.label}</span>
            <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full opacity-[0.07]"
              style={{ background: a.color }} />
          </Link>
        ))}
      </div>

    </div>
  );
}

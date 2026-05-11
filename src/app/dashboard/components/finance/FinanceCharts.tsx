'use client';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { fmt, fmtK, METHOD_COLORS } from './financeHelpers';

const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const, labels: { padding: 10, usePointStyle: true, pointStyleWidth: 8, font: { size: 10 } } } },
  scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, callback: (v: any) => fmtK(v) } }, x: { grid: { display: false }, ticks: { font: { size: 9 } } } },
};

export default function FinanceCharts({ data }: { data: any }) {
  // Fee Collection Trend (6 months)
  const trendChart = {
    labels: data.monthlyFees.map((m: any) => m.month),
    datasets: [
      { label: 'Fees Collected', data: data.monthlyFees.map((m: any) => m.fees), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10b981', borderWidth: 2 },
      { label: 'Expenses', data: data.monthlyFees.map((m: any) => m.expenses), borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ef4444', borderWidth: 2 },
      { label: 'Capitation', data: data.monthlyFees.map((m: any) => m.capitation), borderColor: '#3b82f6', backgroundColor: 'transparent', tension: 0.4, pointRadius: 4, pointBackgroundColor: '#3b82f6', borderWidth: 2 },
      { label: 'Target', data: data.monthlyFees.map((m: any) => m.target), borderColor: '#ef4444', borderDash: [8, 4], backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5 },
    ],
  };

  // Daily Collection (7 days)
  const dailyChart = {
    labels: data.dailyCollection.map((d: any) => d.day),
    datasets: [
      { label: 'M-Pesa', data: data.dailyCollection.map((d: any) => d.mpesa), backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.6 },
      { label: 'Bank', data: data.dailyCollection.map((d: any) => d.bank), backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.6 },
      { label: 'Cash', data: data.dailyCollection.map((d: any) => d.cash), backgroundColor: '#f59e0b', borderRadius: 4, barPercentage: 0.6 },
    ],
  };
  const dailyOpts = { ...chartBase, scales: { ...chartBase.scales, x: { ...chartBase.scales.x, stacked: true }, y: { ...chartBase.scales.y, stacked: true } } };

  // Payment Methods Doughnut
  const methodChart = {
    labels: data.paymentMethods.map((m: any) => m.method),
    datasets: [{ data: data.paymentMethods.map((m: any) => m.amount), backgroundColor: data.paymentMethods.map((m: any) => m.color), borderWidth: 0 }],
  };
  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } } };

  // Expense Breakdown (horizontal bar)
  const expChart = {
    labels: data.expenseBreakdown.map((e: any) => e.category),
    datasets: [{ data: data.expenseBreakdown.map((e: any) => e.amount), backgroundColor: data.expenseBreakdown.map((e: any) => e.color), borderRadius: 4, barPercentage: 0.7 }],
  };
  const hBarOpts = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { font: { size: 9 }, callback: (v: any) => fmtK(v) } }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } },
  };

  // Capitation stacked bar
  const capChart = {
    labels: data.capitationByForm.map((f: any) => f.form),
    datasets: data.capitationStreams.map((stream: string, i: number) => ({
      label: stream, data: data.capitationByForm.map((f: any) => f.amounts[i] || 0),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5], borderRadius: 3, barPercentage: 0.6,
    })),
  };
  const capOpts = { ...chartBase, scales: { ...chartBase.scales, x: { ...chartBase.scales.x, stacked: true }, y: { ...chartBase.scales.y, stacked: true } } };

  // Waterfall chart (simulated with bar)
  const waterLabels = data.waterfallData.map((w: any) => w.label);
  const waterValues = data.waterfallData.map((w: any) => w.value);
  const waterColors = data.waterfallData.map((w: any) => w.color);
  // For waterfall: hidden base + visible bar
  let runningTotal = 0;
  const bases: number[] = []; const tops: number[] = [];
  data.waterfallData.forEach((w: any, i: number) => {
    if (i === data.waterfallData.length - 1) { bases.push(0); tops.push(w.value); }
    else { bases.push(Math.max(0, runningTotal)); tops.push(w.value); runningTotal += w.value; }
  });
  const waterfallChart = {
    labels: waterLabels,
    datasets: [
      { label: 'Base', data: bases, backgroundColor: 'transparent', borderWidth: 0, barPercentage: 0.5 },
      { label: 'Amount', data: tops, backgroundColor: waterColors, borderRadius: 3, barPercentage: 0.5 },
    ],
  };
  const wfOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false }, stacked: true, ticks: { font: { size: 8 } } }, y: { stacked: true, grid: { color: '#f8fafc' }, ticks: { font: { size: 9 }, callback: (v: any) => fmtK(v) } } },
  };

  return (
    <>
      {/* Row 1: Fee Trend + Daily + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Fee collection trend — 6 months</h3>
            <span className="text-[8px] text-gray-400 font-medium">vs expenses vs capitation</span>
          </div>
          <div style={{ height: 220 }}><Line data={trendChart} options={chartBase} /></div>
        </div>
        <div className="lg:col-span-4 ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Daily collection — 7 days</h3>
            <span className="text-[8px] text-gray-400">M-Pesa vs cash vs bank</span>
          </div>
          <div style={{ height: 220 }}><Bar data={dailyChart} options={dailyOpts} /></div>
        </div>
        <div className="lg:col-span-3 ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Payment methods</h3>
            <span className="text-[8px] text-gray-400">this term</span>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ height: 130, width: 130, flexShrink: 0 }}><Doughnut data={methodChart} options={dOpts} /></div>
            <div className="space-y-1.5 flex-1">
              {data.paymentMethods.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-gray-500 flex-1">{m.method}</span>
                  <span className="font-bold text-gray-700">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Fee Position + Budget vs Actual + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Fee position per form */}
        <div className="lg:col-span-3 ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-gray-700">Fee position per form</h3>
            <span className="text-[8px] text-gray-400">expected vs paid vs arrears</span>
          </div>
          <div className="space-y-3">
            {data.formPositions.map((f: any, i: number) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-700 w-14">{f.form}</span>
                  <span className="text-[9px] font-semibold text-emerald-600">{f.pct}%</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000" style={{ width: `${f.pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono">Ksh<br/>{fmtK(f.expected)}</span>
                </div>
              </div>
            ))}
            <p className="text-[8px] text-gray-300 mt-1">Bar = % of term fees collected. Click form to drill down.</p>
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="lg:col-span-4 ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-gray-700">Budget vs actual</h3>
            <span className="text-[8px] text-gray-400">by vote head</span>
          </div>
          <div className="space-y-2.5">
            {data.budgetVotes.map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] text-gray-600 font-medium w-28 truncate">{v.head}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-1000 ${v.pct > 90 ? 'bg-gradient-to-r from-red-400 to-red-500' : v.pct > 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${Math.min(v.pct, 100)}%` }} />
                </div>
                <span className="text-[9px] font-semibold text-gray-600 w-20 text-right">{v.pct}% / {fmt(v.actual)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="lg:col-span-5 ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Expense breakdown</h3>
            <span className="text-[8px] text-gray-400">this term by category</span>
          </div>
          <div className="flex gap-4">
            <div style={{ height: 180 }} className="flex-1"><Bar data={expChart} options={hBarOpts} /></div>
            <div className="space-y-1.5 w-24 flex-shrink-0 pt-2">
              {data.expenseBreakdown.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-[9px]">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                  <span className="text-gray-500 truncate">{e.category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Capitation + Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Capitation allocation</h3>
            <span className="text-[8px] text-gray-400">per form & stream — Term 2 · 2026</span>
          </div>
          <div style={{ height: 200 }}><Bar data={capChart} options={capOpts} /></div>
        </div>
        <div className="ultra-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-700">Income vs expenses — waterfall</h3>
            <span className="text-[8px] text-gray-400">cash flow position</span>
          </div>
          <div style={{ height: 200 }}><Bar data={waterfallChart} options={wfOpts} /></div>
        </div>
      </div>
    </>
  );
}

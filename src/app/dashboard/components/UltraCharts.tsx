'use client';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

const darkGrid = 'rgba(0,0,0,0.04)';
const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(99,115,155,.2)', borderWidth: 1, cornerRadius: 8, padding: 10, titleFont: { size: 11, weight: '600' as const }, bodyFont: { size: 10 } } },
  animation: { duration: 1200, easing: 'easeOutQuart' as const },
  scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { grid: { color: darkGrid }, ticks: { color: '#94a3b8', font: { size: 9 } }, beginAtZero: true } },
};
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', cornerRadius: 8, padding: 10 } },
};

function ChartPanel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ultra-panel ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-semibold text-gray-700">{title}</h3>
        {subtitle && <span className="text-[10px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

export default function UltraChartsSection({ studentsByForm, feePayments, stats, fmt }: {
  studentsByForm: { form: string; male: number; female: number }[];
  feePayments: { month: string; amount: number }[];
  stats: any; fmt: (n: number) => string;
}) {
  // Student Distribution — Stacked Horizontal Bar
  const enrollChart = {
    labels: studentsByForm.map(s => s.form),
    datasets: [
      { label: 'Male', data: studentsByForm.map(s => s.male), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 4, borderSkipped: false as const },
      { label: 'Female', data: studentsByForm.map(s => s.female), backgroundColor: 'rgba(236,72,153,0.65)', borderRadius: 4, borderSkipped: false as const },
    ],
  };

  // Fee Trend — Gradient Area Line
  const feeTrend = {
    labels: feePayments.map(f => f.month),
    datasets: [{
      label: 'Fees', data: feePayments.map(f => f.amount),
      borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)',
      fill: true, tension: 0.4, pointBackgroundColor: '#8b5cf6',
      pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, borderWidth: 2.5,
    }],
  };

  // Attendance Doughnut
  const attTotal = stats.attendance.present + stats.attendance.absent + stats.attendance.late;
  const attChart = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [{ data: [stats.attendance.present, stats.attendance.absent, stats.attendance.late], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
  };

  // Fee Breakdown Doughnut
  const feeTotal = stats.feesCollected + stats.feesDue + stats.prepayments;
  const feeChart = {
    labels: ['Collected', 'Outstanding', 'Prepaid'],
    datasets: [{ data: [stats.feesCollected, stats.feesDue, stats.prepayments], backgroundColor: ['#10b981', '#ef4444', '#3b82f6'], borderWidth: 0, hoverOffset: 6 }],
  };

  // Income vs Expense bar chart
  const incExpChart = {
    labels: ['Revenue', 'Expenses', 'Net'],
    datasets: [{
      data: [stats.totalIncome, stats.totalExpenses, stats.totalIncome - stats.totalExpenses],
      backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(239,68,68,0.6)', stats.totalIncome - stats.totalExpenses >= 0 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.7)'],
      borderRadius: 6, borderSkipped: false as const, barPercentage: 0.5,
    }],
  };

  return (
    <>
      {/* Row 1: Main charts */}
      <div className="ultra-section-label">Financial Analytics & Trends</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartPanel title="📈 Fee Payment Trend" subtitle="Last 6 months" className="lg:col-span-2">
          <div style={{ height: 220 }}><Line data={feeTrend} options={chartOpts} /></div>
        </ChartPanel>
        <ChartPanel title="💰 Fee Status Breakdown" subtitle="Current year">
          <div className="flex items-center gap-4">
            <div style={{ height: 160, width: 160, flexShrink: 0 }}>
              {feeTotal > 0 ? <Doughnut data={feeChart} options={doughnutOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>}
            </div>
            <div className="space-y-2.5 flex-1">
              {[
                { label: 'Collected', val: fmt(stats.feesCollected), color: '#10b981' },
                { label: 'Outstanding', val: fmt(stats.feesDue), color: '#ef4444' },
                { label: 'Prepaid', val: fmt(stats.prepayments), color: '#3b82f6' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-400 flex-1">{item.label}</span>
                  <span className="font-semibold text-gray-700">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: Distribution + Attendance + Income */}
      <div className="ultra-section-label">Academic & Operational Insights</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ChartPanel title="📊 Students by Form & Gender" subtitle={`${stats.totalStudents} total`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[9px] font-medium text-blue-500 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/70" />Male</span>
            <span className="text-[9px] font-medium text-pink-500 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-pink-500/60" />Female</span>
          </div>
          <div style={{ height: 180 }}>
            <Bar data={enrollChart} options={{ ...chartOpts, indexAxis: 'y' as const, scales: { ...chartOpts.scales, x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true, grid: { display: false } } } }} />
          </div>
        </ChartPanel>

        <ChartPanel title="📋 Today's Attendance" subtitle={`${stats.attendance.rate}%`}>
          <div className="flex items-center gap-4">
            <div style={{ height: 140, width: 140, flexShrink: 0 }}>
              {attTotal > 0 ? <Doughnut data={attChart} options={doughnutOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data today</div>}
            </div>
            <div className="space-y-2 flex-1">
              {[
                { label: 'Present', val: stats.attendance.present, color: '#10b981' },
                { label: 'Absent', val: stats.attendance.absent, color: '#ef4444' },
                { label: 'Late', val: stats.attendance.late, color: '#f59e0b' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-400 flex-1">{item.label}</span>
                  <span className="font-bold text-gray-700">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartPanel>

        <ChartPanel title="💹 Income vs Expenses" subtitle="Financial overview">
          <div style={{ height: 140 }}>
            <Bar data={incExpChart} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, tooltip: { ...chartOpts.plugins.tooltip, callbacks: { label: (ctx: any) => fmt(ctx.raw) } } }, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: (v: any) => `${(v / 1000).toFixed(0)}K` } } } }} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-medium">Net Income</span>
            <span className={`text-[14px] font-bold ${stats.totalIncome - stats.totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmt(stats.totalIncome - stats.totalExpenses)}
            </span>
          </div>
        </ChartPanel>
      </div>
    </>
  );
}

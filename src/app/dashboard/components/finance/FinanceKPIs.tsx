'use client';
import { fmt, fmtK, QUICK_ACTIONS } from './financeHelpers';
import Link from 'next/link';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const h = 28, w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-1">
      <defs><linearGradient id={`fg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={area} fill={`url(#fg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface KPICardProps {
  label: string; value: string; icon: string; sub: string;
  borderColor: string; sparkColor: string; sparkData: number[];
  subColor?: string;
}

function KPICard({ label, value, icon, sub, borderColor, sparkColor, sparkData, subColor }: KPICardProps) {
  return (
    <div className="ultra-card group">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]" style={{ background: borderColor }} />
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.05]" style={{ background: sparkColor }} />
      <div className="flex items-start justify-between mb-1">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-[22px] font-extrabold text-gray-800 leading-tight">{value}</p>
      <p className={`text-[10px] mt-0.5 ${subColor || 'text-gray-400'}`}>{sub}</p>
      <Sparkline data={sparkData} color={sparkColor} />
    </div>
  );
}

export default function FinanceKPIs({ data }: { data: any }) {
  const cards: KPICardProps[] = [
    { label: 'Collected Today', value: fmt(data.todayCollection), icon: '📅', sub: `${data.todayPayments} payments · ${data.todayMpesa} M-Pesa`, borderColor: '#10b981', sparkColor: '#10b981', sparkData: [40, 65, 80, 55, 90, 110, data.todayCollection > 0 ? 100 : 30] },
    { label: 'This Week', value: fmt(data.weekCollection), icon: '📊', sub: data.weekChange >= 0 ? `+${data.weekChange}% vs last week` : `${data.weekChange}% vs last week`, borderColor: '#3b82f6', sparkColor: '#3b82f6', sparkData: [200, 340, 280, 420, 380, 460, data.weekCollection > 0 ? 100 : 30], subColor: data.weekChange >= 0 ? 'text-emerald-500' : 'text-red-400' },
    { label: 'Total Collected', value: fmt(data.totalCollected), icon: '✅', sub: `${Math.round((data.totalCollected / Math.max(data.targetAmount, 1)) * 100)}% of ${fmt(data.targetAmount)} target`, borderColor: '#8b5cf6', sparkColor: '#8b5cf6', sparkData: [500, 800, 1200, 1800, 2600, 3400, data.totalCollected > 0 ? 100 : 20], subColor: 'text-blue-500' },
    { label: 'Fee Arrears', value: fmt(data.feeArrears), icon: '⚠️', sub: `${data.debtorCount} defaulters · ${data.criticalDebtors} critical`, borderColor: '#ef4444', sparkColor: '#ef4444', sparkData: [600, 550, 500, 480, 450, 420, data.feeArrears > 0 ? 100 : 20], subColor: 'text-red-400' },
    { label: 'Collection Rate', value: `${data.collectionRate}%`, icon: '📈', sub: `Target 90% · ${data.collectionRate >= 90 ? 'On track' : data.collectionRate + '% gap'}`, borderColor: data.collectionRate >= 80 ? '#10b981' : '#f59e0b', sparkColor: data.collectionRate >= 80 ? '#10b981' : '#f59e0b', sparkData: [60, 65, 72, 78, 82, 84, data.collectionRate || 50], subColor: data.collectionRate >= 80 ? 'text-emerald-500' : 'text-amber-500' },
    { label: 'Total Expenses', value: fmt(data.totalExpenses), icon: '💳', sub: `Salaries: ${fmt(data.salaryAmount)}`, borderColor: '#f59e0b', sparkColor: '#f59e0b', sparkData: [300, 350, 400, 380, 420, 450, data.totalExpenses > 0 ? 100 : 20] },
    { label: 'Net Position', value: fmt(data.netPosition), icon: '💹', sub: data.netPosition >= 0 ? 'Surplus · healthy' : 'Deficit · review budget', borderColor: data.netPosition >= 0 ? '#10b981' : '#ef4444', sparkColor: data.netPosition >= 0 ? '#10b981' : '#ef4444', sparkData: [100, 150, 200, 180, 220, 250, data.netPosition > 0 ? 100 : 20], subColor: data.netPosition >= 0 ? 'text-emerald-500' : 'text-red-400' },
    { label: 'Capitation Received', value: fmt(data.capitationReceived), icon: '🏛️', sub: data.capitationTerm || 'Term 2 MoE disbursement', borderColor: '#6366f1', sparkColor: '#6366f1', sparkData: [0, 0, 200, 200, 400, 600, data.capitationReceived > 0 ? 100 : 10] },
  ];

  return (
    <>
      {/* Section Label */}
      <div className="ultra-section-label">Key Financial Metrics — Real Time</div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {cards.map((c, i) => <KPICard key={i} {...c} />)}
      </div>

      {/* Quick Actions */}
      <div className="ultra-section-label mt-4">Quick Actions</div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {QUICK_ACTIONS.map((a, i) => (
          <Link key={i} href={a.href} className="ultra-action-btn group">
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{a.icon}</span>
            <span className="text-[9px] font-semibold text-gray-500 group-hover:text-indigo-600 leading-tight text-center">{a.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

'use client';

interface CardProps {
  label: string; value: string | number; icon: string; sub: string;
  gradient: string; trend?: string; trendUp?: boolean; progress?: number;
  sparkData?: number[];
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const h = 28, w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-2">
      <defs><linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UltraCard({ label, value, icon, sub, gradient, trend, trendUp = true, progress, sparkData }: CardProps) {
  const colors: Record<string, string> = {
    'purple': '#a78bfa', 'green': '#34d399', 'amber': '#fbbf24', 'blue': '#60a5fa',
    'pink': '#f472b6', 'cyan': '#22d3ee', 'gray': '#9ca3af', 'red': '#f87171',
  };
  const colorKey = Object.keys(colors).find(k => gradient.includes(k)) || 'purple';
  const sparkColor = colors[colorKey];

  return (
    <div className="ultra-card group" style={{ '--card-accent': sparkColor } as any}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]" style={{ background: gradient }} />
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.06]" style={{ background: sparkColor }} />
      <div className="flex items-start justify-between mb-2.5">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg" style={{ background: `${sparkColor}20`, color: sparkColor }}>{icon}</div>
        {trend && (
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-[24px] font-bold text-gray-800 leading-tight mb-1">{value}</p>
      <p className="text-[11px] text-gray-400 flex items-center gap-1">{sub}</p>
      {progress !== undefined && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[9px] text-gray-400 mb-1"><span>Progress</span><span>{progress}%</span></div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: gradient }} /></div>
        </div>
      )}
      {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
    </div>
  );
}

export default function UltraCardsSection({ stats, currentYear, fmt }: {
  stats: any; currentYear: number;
  fmt: (n: number) => string;
}) {
  const feeProgress = stats.feesCollected > 0 ? Math.round((stats.feesCollected / (stats.feesCollected + stats.feesDue)) * 100) : 0;

  const cards: CardProps[] = [
    { label: 'Total Students', value: stats.totalStudents.toLocaleString(), icon: '👨‍🎓',
      sub: `${stats.activeStudents} active · ${stats.newEnrollments} new`,
      gradient: 'linear-gradient(135deg, #6c5ce7, #a78bfa)', trend: `${stats.newEnrollments}`, trendUp: true,
      sparkData: [820, 890, 960, 1040, 1120, stats.totalStudents || 1195] },
    { label: 'Fees Collected', value: fmt(stats.feesCollected), icon: '💰',
      sub: `${feeProgress}% of target collected`,
      gradient: 'linear-gradient(135deg, #059669, #34d399)', trend: `${feeProgress}%`, trendUp: true,
      progress: feeProgress },
    { label: 'Fee Arrears', value: fmt(stats.feesDue), icon: '⚠️',
      sub: `Outstanding balance · Year ${currentYear}`,
      gradient: 'linear-gradient(135deg, #d97706, #fbbf24)', trend: 'Due', trendUp: false,
      sparkData: [200, 340, 280, 410, 380, stats.feesDue > 0 ? 100 : 50] },
    { label: 'Attendance Today', value: `${stats.attendance.rate}%`, icon: '📋',
      sub: `${stats.attendance.present}P · ${stats.attendance.absent}A · ${stats.attendance.late}L`,
      gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)', trend: `${stats.attendance.rate}%`, trendUp: stats.attendance.rate >= 90,
      sparkData: [91, 94, 88, 96, 92, stats.attendance.rate || 93] },
    { label: 'Teaching Staff', value: stats.teachingStaff, icon: '👨‍🏫',
      sub: `${stats.totalStaff} total · ${stats.nonTeachingStaff} non-teaching`,
      gradient: 'linear-gradient(135deg, #db2777, #f472b6)', trend: `${stats.totalStaff}`, trendUp: true,
      sparkData: [32, 35, 38, 40, 42, stats.totalStaff || 45] },
    { label: 'Net Income', value: fmt(stats.totalIncome - stats.totalExpenses), icon: '📊',
      sub: `Revenue: ${fmt(stats.totalIncome)}`,
      gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)',
      trend: stats.totalIncome - stats.totalExpenses >= 0 ? 'Surplus' : 'Deficit',
      trendUp: stats.totalIncome - stats.totalExpenses >= 0,
      sparkData: [400, 520, 480, 610, 550, (stats.totalIncome - stats.totalExpenses) > 0 ? 100 : 30] },
    { label: 'Prepayments', value: fmt(stats.prepayments), icon: '💎',
      sub: `Advance fees received`,
      gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)',
      sparkData: [10, 25, 18, 30, 22, stats.prepayments > 0 ? 80 : 20] },
    { label: 'Term Reports', value: stats.reportedStudents, icon: '✅',
      sub: `Attendance reported this term`,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)', trend: 'Current', trendUp: true,
      sparkData: [100, 280, 450, 620, 780, stats.reportedStudents || 900] },
  ];

  return (
    <>
      <div className="ultra-section-label">Key Performance Metrics — Real-Time</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => <UltraCard key={i} {...c} />)}
      </div>
    </>
  );
}

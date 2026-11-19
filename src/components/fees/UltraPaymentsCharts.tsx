/**
 * UltraPaymentsCharts.tsx
 * Side-by-Side Executive Payment Analytics:
 * 1. Payment Channel Revenue Breakdown Dual Bar Chart
 * 2. 14-Day Collection Velocity & Daily Trajectory Linear Spline Curve
 * Designed with pure interactive SVGs, micro-typography, and frosted executive light palette.
 */

'use client';

import { useState, useMemo } from 'react';
import { FiBarChart2, FiTrendingUp, FiCreditCard, FiSmartphone, FiDollarSign, FiLayers } from 'react-icons/fi';

export interface MethodMetric {
  method: string;
  count: number;
  total: number;
  pct: number;
  color: string;
  icon: string;
}

export interface DailyPoint {
  date: string;
  label: string;
  amount: number;
  count: number;
}

interface Props {
  methodMetrics: MethodMetric[];
  dailyTrends: DailyPoint[];
  grandTotal: number;
  totalCount: number;
}

const fmtKES = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function UltraPaymentsCharts({
  methodMetrics,
  dailyTrends,
  grandTotal,
  totalCount,
}: Props) {
  const [hoveredMethod, setHoveredMethod] = useState<MethodMetric | null>(null);
  const [hoveredDailyIdx, setHoveredDailyIdx] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'spline' | 'channels'>('spline');

  // Max value for channel bar scaling
  const maxMethodVal = useMemo(() => {
    if (!methodMetrics.length) return 100000;
    const maxVal = Math.max(...methodMetrics.map((m) => m.total));
    return maxVal > 0 ? maxVal * 1.15 : 100000;
  }, [methodMetrics]);

  // Max value for daily trend scaling
  const maxDailyVal = useMemo(() => {
    if (!dailyTrends.length) return 10000;
    const maxVal = Math.max(...dailyTrends.map((d) => d.amount));
    return maxVal > 0 ? maxVal * 1.25 : 10000;
  }, [dailyTrends]);

  // Top payment channel
  const topChannel = useMemo(() => {
    if (!methodMetrics.length) return null;
    return [...methodMetrics].sort((a, b) => b.total - a.total)[0];
  }, [methodMetrics]);

  // ── Coordinates for 14-Day Linear Spline Curve ──
  const splinePoints = useMemo(() => {
    if (!dailyTrends.length) return [];
    const width = 480;
    const height = 140;
    const paddingX = 40;
    const paddingTop = 22;
    const paddingBottom = 28;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingTop - paddingBottom;

    const step = dailyTrends.length > 1 ? effectiveWidth / (dailyTrends.length - 1) : effectiveWidth / 2;

    return dailyTrends.map((item, idx) => {
      const x = paddingX + idx * step;
      const y = height - paddingBottom - (item.amount / maxDailyVal) * effectiveHeight;
      return { x, y, ...item };
    });
  }, [dailyTrends, maxDailyVal]);

  // Construct SVG cubic bezier path
  const splinePathD = useMemo(() => {
    if (splinePoints.length === 0) return '';
    if (splinePoints.length === 1) return `M ${splinePoints[0].x} ${splinePoints[0].y}`;

    let d = `M ${splinePoints[0].x} ${splinePoints[0].y}`;
    for (let i = 0; i < splinePoints.length - 1; i++) {
      const p0 = splinePoints[i];
      const p1 = splinePoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpX2 = cpX1;
      d += ` C ${cpX1} ${p0.y}, ${cpX2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [splinePoints]);

  const splineAreaD = useMemo(() => {
    if (!splinePathD || splinePoints.length === 0) return '';
    const lastPoint = splinePoints[splinePoints.length - 1];
    const firstPoint = splinePoints[0];
    const groundY = 140 - 28;
    return `${splinePathD} L ${lastPoint.x} ${groundY} L ${firstPoint.x} ${groundY} Z`;
  }, [splinePathD, splinePoints]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4 font-sans">
      {/* ═════════════════════════════════════════════════════════════
          CHART 1: PAYMENT CHANNEL BREAKDOWN & REVENUE VOLUME
      ═════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs">
              <FiBarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Payment Channel Distribution
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {methodMetrics.length} Channels
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Volume share across M-Pesa, Cashier Drawer, Bank Slips &amp; Subsidies
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
            {fmtKES(grandTotal)} Total
          </div>
        </div>

        {/* Channel Bars */}
        <div className="relative pt-2 pb-1">
          {methodMetrics.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No transactions recorded in this period.
            </div>
          ) : (
            <div className="space-y-3">
              {methodMetrics.map((mm) => {
                const barWidth = Math.max(4, Math.min(100, (mm.total / maxMethodVal) * 100));
                const isHovered = hoveredMethod?.method === mm.method;

                return (
                  <div
                    key={mm.method}
                    onMouseEnter={() => setHoveredMethod(mm)}
                    onMouseLeave={() => setHoveredMethod(null)}
                    className={`p-2.5 rounded-2xl transition-all border ${
                      isHovered
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{mm.icon}</span>
                        <span className="text-slate-900 font-extrabold">{mm.method}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
                          {mm.count} txns
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-900 font-extrabold">{fmtKES(mm.total)}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                          {mm.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-700 shadow-xs"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: mm.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Insight */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiCreditCard className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Dominant Channel:{' '}
              <strong className="text-slate-800">
                {topChannel?.method || '—'} ({topChannel?.pct.toFixed(1)}%)
              </strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {totalCount.toLocaleString()} Total Receipts
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          CHART 2: 14-DAY COLLECTION VELOCITY & TRAJECTORY SPLINE
      ═════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  14-Day Collection Velocity
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Daily Spline
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Day-by-day revenue intake trajectory across cashier terminals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveView('spline')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeView === 'spline'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Spline Curve
            </button>
            <button
              onClick={() => setActiveView('channels')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeView === 'channels'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Channel Matrix
            </button>
          </div>
        </div>

        {/* View 1: Spline SVG Curve */}
        {activeView === 'spline' ? (
          <div className="relative py-2 flex flex-col items-center">
            <svg
              viewBox="0 0 480 140"
              className="w-full h-36 overflow-visible"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.02))' }}
            >
              <defs>
                <linearGradient id="payAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="112" x2="450" y2="112" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Area & Spline Line */}
              {splineAreaD && <path d={splineAreaD} fill="url(#payAreaGrad)" />}
              {splinePathD && (
                <path
                  d={splinePathD}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}

              {/* Coordinate Dots */}
              {splinePoints.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDailyIdx === i ? 6 : 4}
                    fill="#ffffff"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredDailyIdx(i)}
                    onMouseLeave={() => setHoveredDailyIdx(null)}
                  />
                  {pt.amount > 0 && (
                    <text
                      x={pt.x}
                      y={Math.max(14, pt.y - 8)}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-extrabold fill-indigo-700"
                    >
                      {fmtKES(pt.amount)}
                    </text>
                  )}
                  {i % 2 === 0 && (
                    <text
                      x={pt.x}
                      y={130}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-400"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            <div className="flex items-center gap-4 text-[10px] font-bold mt-1">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="w-3 h-0.5 bg-indigo-600 rounded-full" />
                Daily Collection Velocity Trajectory
              </span>
              <span className="text-slate-400 font-normal">Real-Time Database Gateway</span>
            </div>
          </div>
        ) : (
          /* View 2: Channel Matrix Mini Cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
            {methodMetrics.map((m) => (
              <div
                key={m.method}
                className="p-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1">
                    <span>{m.icon}</span>
                    <span className="text-slate-800 font-extrabold">{m.method}</span>
                  </span>
                  <span className="font-mono text-slate-500 text-[10px]">
                    {m.count} txns
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Volume
                  </div>
                  <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                    {fmtKES(m.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Callout */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              Average Payment Size:{' '}
              <strong className="text-slate-900 font-black">
                {totalCount > 0 ? fmtKES(grandTotal / totalCount) : '—'}
              </strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Auto-Reconciled</span>
        </div>
      </div>
    </div>
  );
}

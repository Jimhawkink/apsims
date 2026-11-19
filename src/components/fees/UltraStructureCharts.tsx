'use client';

import React from 'react';
import { fmt } from '@/hooks/useUltraFeeCollect';

interface VoteHeadMetric {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

interface FormProgressionMetric {
  name: string;
  track: string;
  annualAmount: number;
}

interface UltraStructureChartsProps {
  voteHeadMetrics: VoteHeadMetric[];
  formProgressionMetrics: FormProgressionMetric[];
  totalAnnualBudget: number;
}

export function UltraStructureCharts({
  voteHeadMetrics,
  formProgressionMetrics,
  totalAnnualBudget,
}: UltraStructureChartsProps) {
  // Chart 2: Linear SVG Spline calculations
  const maxFormAmount = Math.max(...formProgressionMetrics.map((f) => f.annualAmount), 1);
  const chartW = 560;
  const chartH = 130;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 28;

  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  const points = formProgressionMetrics.map((f, i) => {
    const n = Math.max(formProgressionMetrics.length - 1, 1);
    const x = padLeft + (i / n) * innerW;
    const y = padTop + innerH - (f.annualAmount / maxFormAmount) * innerH;
    return { x, y, name: f.name, amount: f.annualAmount, track: f.track };
  });

  // Build SVG path
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padTop + innerH} L ${points[0].x} ${padTop + innerH} Z`
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
      {/* ── Left Chart: Vote Head Allocation Distribution ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">Vote Head Budget Allocation</h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {voteHeadMetrics.length} Categories · {fmt(totalAnnualBudget)}
          </span>
        </div>

        {/* Multi-Bar Stack Track */}
        <div className="my-2.5">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {voteHeadMetrics.map((vh, i) => (
              <div
                key={i}
                style={{ width: `${Math.max(vh.pct, 1)}%`, background: vh.color }}
                className="h-full transition-all duration-500 hover:brightness-110"
                title={`${vh.name}: ${fmt(vh.amount)} (${vh.pct.toFixed(1)}%)`}
              />
            ))}
          </div>
        </div>

        {/* Itemized Vote Head Rows (Compact) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {voteHeadMetrics.slice(0, 6).map((vh, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vh.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-slate-500 truncate">{vh.name}</p>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-800 font-mono">{fmt(vh.amount)}</span>
                  <span className="text-[9px] font-semibold text-slate-400">{vh.pct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Chart: Class-by-Class Fee Load Spline ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">Fee Load Trajectory Across Classes</h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Peak: {fmt(maxFormAmount)}
          </span>
        </div>

        {/* Linear SVG Chart */}
        <div className="relative w-full pt-1">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-28 overflow-visible">
            <defs>
              <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.5, 1].map((pct, i) => {
              const y = padTop + innerH - pct * innerH;
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartW - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[8px] fill-slate-400 font-mono"
                  >
                    {Math.round((pct * maxFormAmount) / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill */}
            {fillD && <path d={fillD} fill="url(#splineGradient)" />}

            {/* Spline Path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Circles & Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  className="fill-white stroke-[#059669] stroke-2 hover:r-5 transition-all"
                />
                {/* Abbreviated class name */}
                <text
                  x={pt.x}
                  y={padTop + innerH + 16}
                  textAnchor="middle"
                  className="text-[8.5px] fill-slate-500 font-semibold"
                >
                  {pt.name.replace('Grade ', 'G').replace('Form ', 'F')}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

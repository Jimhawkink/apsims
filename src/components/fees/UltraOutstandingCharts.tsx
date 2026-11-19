/**
 * UltraOutstandingCharts.tsx
 * Side-by-Side Executive Financial Analytics:
 * 1. Form-Level Deficit vs Collection Dual Column/Bar Graph
 * 2. Linear Arrears Deficit Curve & Milestone Trend Line Chart
 * Designed with pure interactive SVGs, micro-typography, and frosted executive light palette.
 */

'use client';

import { useState, useMemo } from 'react';
import { FiBarChart2, FiTrendingUp, FiInfo, FiLayers, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export interface FormMetric {
  formId: number;
  formName: string;
  track: string;
  totalStudents: number;
  defaultersCount: number;
  totalOwed: number;
  totalPaid: number;
  clearancePct: number;
}

export interface TermTrendMetric {
  termLabel: string;
  invoiced: number;
  collected: number;
  outstanding: number;
  recoveryPct: number;
}

export interface RiskBracketCount {
  tier: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  count: number;
  total: number;
  color: string;
}

interface Props {
  formMetrics: FormMetric[];
  termTrends: TermTrendMetric[];
  riskBrackets: RiskBracketCount[];
  totalAnnualDebt: number;
  totalCollected: number;
}

const fmtKES = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function UltraOutstandingCharts({
  formMetrics,
  termTrends,
  riskBrackets,
  totalAnnualDebt,
  totalCollected,
}: Props) {
  const [hoveredForm, setHoveredForm] = useState<FormMetric | null>(null);
  const [hoveredTermIdx, setHoveredTermIdx] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'comparison' | 'aging'>('comparison');

  // Max value for bar chart scaling
  const maxBarVal = useMemo(() => {
    if (!formMetrics.length) return 100000;
    const maxVal = Math.max(...formMetrics.map((f) => Math.max(f.totalOwed, f.totalPaid)));
    return maxVal > 0 ? maxVal * 1.15 : 100000;
  }, [formMetrics]);

  // Max value for linear trend chart scaling
  const maxTrendVal = useMemo(() => {
    if (!termTrends.length) return 100000;
    const maxVal = Math.max(...termTrends.map((t) => Math.max(t.invoiced, t.collected, t.outstanding)));
    return maxVal > 0 ? maxVal * 1.2 : 100000;
  }, [termTrends]);

  // Overall collection rate
  const totalBilled = totalCollected + totalAnnualDebt;
  const overallRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Highest debt form
  const highestDebtForm = useMemo(() => {
    if (!formMetrics.length) return null;
    return [...formMetrics].sort((a, b) => b.totalOwed - a.totalOwed)[0];
  }, [formMetrics]);

  // ── Coordinates for Linear Trend Spline ──
  const trendPoints = useMemo(() => {
    if (!termTrends.length) return [];
    const width = 480;
    const height = 140;
    const paddingX = 40;
    const paddingTop = 20;
    const paddingBottom = 28;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingTop - paddingBottom;

    const step = termTrends.length > 1 ? effectiveWidth / (termTrends.length - 1) : effectiveWidth / 2;

    return termTrends.map((item, idx) => {
      const x = paddingX + idx * step;
      const debtY = height - paddingBottom - (item.outstanding / maxTrendVal) * effectiveHeight;
      const paidY = height - paddingBottom - (item.collected / maxTrendVal) * effectiveHeight;
      return { x, debtY, paidY, ...item };
    });
  }, [termTrends, maxTrendVal]);

  // Construct SVG Path using smooth cubic bezier curves
  const debtPathD = useMemo(() => {
    if (trendPoints.length === 0) return '';
    if (trendPoints.length === 1) return `M ${trendPoints[0].x} ${trendPoints[0].debtY}`;

    let d = `M ${trendPoints[0].x} ${trendPoints[0].debtY}`;
    for (let i = 0; i < trendPoints.length - 1; i++) {
      const p0 = trendPoints[i];
      const p1 = trendPoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpX2 = cpX1;
      d += ` C ${cpX1} ${p0.debtY}, ${cpX2} ${p1.debtY}, ${p1.x} ${p1.debtY}`;
    }
    return d;
  }, [trendPoints]);

  const debtAreaD = useMemo(() => {
    if (!debtPathD || trendPoints.length === 0) return '';
    const lastPoint = trendPoints[trendPoints.length - 1];
    const firstPoint = trendPoints[0];
    const groundY = 140 - 28;
    return `${debtPathD} L ${lastPoint.x} ${groundY} L ${firstPoint.x} ${groundY} Z`;
  }, [debtPathD, trendPoints]);

  const paidPathD = useMemo(() => {
    if (trendPoints.length === 0) return '';
    if (trendPoints.length === 1) return `M ${trendPoints[0].x} ${trendPoints[0].paidY}`;

    let d = `M ${trendPoints[0].x} ${trendPoints[0].paidY}`;
    for (let i = 0; i < trendPoints.length - 1; i++) {
      const p0 = trendPoints[i];
      const p1 = trendPoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpX2 = cpX1;
      d += ` C ${cpX1} ${p0.paidY}, ${cpX2} ${p1.paidY}, ${p1.x} ${p1.paidY}`;
    }
    return d;
  }, [trendPoints]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4 font-sans">
      {/* ═════════════════════════════════════════════════════════════
          CHART 1: FORM-LEVEL OUTSTANDING VS COLLECTED (DUAL BAR GRAPH)
      ═════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-xs">
              <FiBarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Form Deficit vs Collection
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {formMetrics.length} Cohorts
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Comparative breakdown of unpaid arrears vs recovered revenue
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-xs" />
              Unpaid Debt
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-xs" />
              Paid / Collected
            </span>
          </div>
        </div>

        {/* Bar Visualization Canvas */}
        <div className="relative pt-2 pb-1">
          {formMetrics.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No cohort fee structures configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {formMetrics.slice(0, 6).map((fm) => {
                const owedWidth = Math.max(4, Math.min(100, (fm.totalOwed / maxBarVal) * 100));
                const paidWidth = Math.max(4, Math.min(100, (fm.totalPaid / maxBarVal) * 100));
                const isHovered = hoveredForm?.formId === fm.formId;

                return (
                  <div
                    key={fm.formId}
                    onMouseEnter={() => setHoveredForm(fm)}
                    onMouseLeave={() => setHoveredForm(null)}
                    className={`p-2.5 rounded-2xl transition-all border ${
                      isHovered
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/60'
                    }`}
                  >
                    {/* Top Row: Form Name & Values */}
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-extrabold">{fm.formName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
                          {fm.track}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({fm.defaultersCount} owing / {fm.totalStudents})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-rose-600 font-extrabold">{fmtKES(fm.totalOwed)}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-emerald-700 font-extrabold">{fmtKES(fm.totalPaid)}</span>
                      </div>
                    </div>

                    {/* Dual Comparative Bar Tracks */}
                    <div className="space-y-1">
                      {/* Owed Bar (Rose) */}
                      <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-700 shadow-xs"
                          style={{ width: `${owedWidth}%` }}
                        />
                      </div>
                      {/* Paid Bar (Emerald) */}
                      <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                          style={{ width: `${paidWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Insights Strip */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiAlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>
              Highest Deficit:{' '}
              <strong className="text-slate-800">
                {highestDebtForm?.formName || '—'} ({fmtKES(highestDebtForm?.totalOwed || 0)})
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <FiCheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Overall Collection: {overallRate}%</span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          CHART 2: LINEAR ARREARS DEFICIT CURVE & RISK TIERS
      ═════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Linear Collection &amp; Arrears Velocity
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Spline Trend
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Milestone curve showing debt trajectory vs cash recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveView('comparison')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeView === 'comparison'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Spline Curve
            </button>
            <button
              onClick={() => setActiveView('aging')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeView === 'aging'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Risk Tiers
            </button>
          </div>
        </div>

        {/* View 1: Smooth SVG Spline Chart */}
        {activeView === 'comparison' ? (
          <div className="relative py-2 flex flex-col items-center">
            <svg
              viewBox="0 0 480 140"
              className="w-full h-36 overflow-visible"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.02))' }}
            >
              <defs>
                {/* Debt Area Gradient */}
                <linearGradient id="debtAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>

                {/* Paid Area Gradient */}
                <linearGradient id="paidAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="112" x2="450" y2="112" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Debt Shaded Area & Line */}
              {debtAreaD && <path d={debtAreaD} fill="url(#debtAreaGrad)" />}
              {debtPathD && (
                <path
                  d={debtPathD}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}

              {/* Paid Curve */}
              {paidPathD && (
                <path
                  d={paidPathD}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Trend Data Dots */}
              {trendPoints.map((pt, i) => (
                <g key={i}>
                  {/* Debt node dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.debtY}
                    r={hoveredTermIdx === i ? 6 : 4}
                    fill="#ffffff"
                    stroke="#e11d48"
                    strokeWidth="3"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredTermIdx(i)}
                    onMouseLeave={() => setHoveredTermIdx(null)}
                  />
                  {/* Paid node dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.paidY}
                    r={3}
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="2"
                  />

                  {/* Value tag above node */}
                  <text
                    x={pt.x}
                    y={Math.max(14, pt.debtY - 8)}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-extrabold fill-rose-600"
                  >
                    {fmtKES(pt.outstanding)}
                  </text>

                  {/* Milestone X Label */}
                  <text
                    x={pt.x}
                    y={130}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-500"
                  >
                    {pt.termLabel}
                  </text>
                </g>
              ))}
            </svg>

            {/* Quick legend for spline */}
            <div className="flex items-center gap-4 text-[10px] font-bold mt-1">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-0.5 bg-rose-600 rounded-full" />
                Outstanding Arrears Trajectory
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-0.5 bg-emerald-600 border-t border-dashed border-emerald-600" />
                Collection Velocity
              </span>
            </div>
          </div>
        ) : (
          /* View 2: Risk Brackets Matrix Cards */
          <div className="grid grid-cols-2 gap-2.5 py-2">
            {riskBrackets.map((rb) => {
              const pctOfDebt =
                totalAnnualDebt > 0 ? Math.round((rb.total / totalAnnualDebt) * 100) : 0;
              return (
                <div
                  key={rb.tier}
                  className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ backgroundColor: `${rb.color}15`, color: rb.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rb.color }} />
                      {rb.tier} Risk
                    </span>
                    <span className="font-mono text-slate-800 text-xs font-black">
                      {rb.count} Students
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Arrears Exposure
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                      {fmtKES(rb.total)}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>Share of Total Debt</span>
                    <strong className="text-slate-800 font-mono">{pctOfDebt}%</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Callout */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Total Annual Exposure:{' '}
              <strong className="text-slate-900 font-black">{fmtKES(totalAnnualDebt)}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Real-Time DB Sync</span>
        </div>
      </div>
    </div>
  );
}

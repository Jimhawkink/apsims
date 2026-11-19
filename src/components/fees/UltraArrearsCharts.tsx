/**
 * UltraArrearsCharts.tsx
 * Side-by-Side Executive Arrears Analytics:
 * 1. Form-Level Arrears Concentration vs Recovery Dual Bar Graph
 * 2. Arrears Aging Trajectory Spline Curve & Recovery Velocity
 * Pure SVG, micro-typography, frosted executive light palette.
 */

'use client';

import { useState, useMemo } from 'react';
import { FiBarChart2, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiLayers } from 'react-icons/fi';

export interface FormArrearsMetric {
  formId: number;
  formName: string;
  track: string;
  totalStudents: number;
  arrearsCount: number;
  totalArrears: number;
  totalPaid: number;
  recoveryRatePct: number;
}

export interface AgingBucketMetric {
  bucket: '0-30' | '31-60' | '61-90' | '90+' | 'Never';
  label: string;
  count: number;
  amount: number;
  color: string;
}

interface Props {
  formMetrics: FormArrearsMetric[];
  agingMetrics: AgingBucketMetric[];
  totalArrears: number;
  totalPaid: number;
}

const fmtKES = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function UltraArrearsCharts({
  formMetrics,
  agingMetrics,
  totalArrears,
  totalPaid,
}: Props) {
  const [hoveredForm, setHoveredForm] = useState<FormArrearsMetric | null>(null);
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'spline' | 'buckets'>('spline');

  // Max value for bar scaling
  const maxBarVal = useMemo(() => {
    if (!formMetrics.length) return 100000;
    const maxVal = Math.max(...formMetrics.map((f) => Math.max(f.totalArrears, f.totalPaid)));
    return maxVal > 0 ? maxVal * 1.15 : 100000;
  }, [formMetrics]);

  // Max value for aging spline scaling
  const maxAgingVal = useMemo(() => {
    if (!agingMetrics.length) return 100000;
    const maxVal = Math.max(...agingMetrics.map((a) => a.amount));
    return maxVal > 0 ? maxVal * 1.25 : 100000;
  }, [agingMetrics]);

  // Highest arrears form
  const highestArrearsForm = useMemo(() => {
    if (!formMetrics.length) return null;
    return [...formMetrics].sort((a, b) => b.totalArrears - a.totalArrears)[0];
  }, [formMetrics]);

  // Overall recovery rate
  const totalBilled = totalPaid + totalArrears;
  const overallRecoveryPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  // ── Coordinates for Aging Spline Curve ──
  const splinePoints = useMemo(() => {
    if (!agingMetrics.length) return [];
    const width = 480;
    const height = 140;
    const paddingX = 40;
    const paddingTop = 22;
    const paddingBottom = 28;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingTop - paddingBottom;

    const step = agingMetrics.length > 1 ? effectiveWidth / (agingMetrics.length - 1) : effectiveWidth / 2;

    return agingMetrics.map((item, idx) => {
      const x = paddingX + idx * step;
      const y = height - paddingBottom - (item.amount / maxAgingVal) * effectiveHeight;
      return { x, y, ...item };
    });
  }, [agingMetrics, maxAgingVal]);

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
          CHART 1: FORM-LEVEL ARREARS CONCENTRATION (DUAL BAR GRAPH)
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
                  Form Arrears Concentration
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {formMetrics.length} Cohorts
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Carried-forward arrears vs credited opening balances
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-xs" />
              Unpaid Arrears
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-xs" />
              Opening Balances Paid
            </span>
          </div>
        </div>

        {/* Bar Visualization Canvas */}
        <div className="relative pt-2 pb-1">
          {formMetrics.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No cohort fee arrears registered.
            </div>
          ) : (
            <div className="space-y-3">
              {formMetrics.slice(0, 6).map((fm) => {
                const arrearsWidth = Math.max(4, Math.min(100, (fm.totalArrears / maxBarVal) * 100));
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
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-extrabold">{fm.formName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
                          {fm.track}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({fm.arrearsCount} owing / {fm.totalStudents})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-rose-600 font-extrabold">{fmtKES(fm.totalArrears)}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-emerald-700 font-extrabold">{fmtKES(fm.totalPaid)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-700 shadow-xs"
                          style={{ width: `${arrearsWidth}%` }}
                        />
                      </div>
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
              Highest Arrears Cohort:{' '}
              <strong className="text-slate-800">
                {highestArrearsForm?.formName || '—'} ({fmtKES(highestArrearsForm?.totalArrears || 0)})
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <FiCheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Recovery Ratio: {overallRecoveryPct}%</span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          CHART 2: ARREARS AGING SPLINE CURVE & BUCKETS
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
                  Arrears Aging Trajectory
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Spline Curve
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Aging distribution: 0–30d, 31–60d, 61–90d, 90+d &amp; Never Paid
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
              onClick={() => setActiveView('buckets')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeView === 'buckets'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aging Cards
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
                <linearGradient id="arrearsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="112" x2="450" y2="112" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Area & Spline Line */}
              {splineAreaD && <path d={splineAreaD} fill="url(#arrearsAreaGrad)" />}
              {splinePathD && (
                <path
                  d={splinePathD}
                  fill="none"
                  stroke="#e11d48"
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
                    r={hoveredBucketIdx === i ? 6 : 4}
                    fill="#ffffff"
                    stroke={pt.color}
                    strokeWidth="3"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredBucketIdx(i)}
                    onMouseLeave={() => setHoveredBucketIdx(null)}
                  />
                  <text
                    x={pt.x}
                    y={Math.max(14, pt.y - 8)}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-extrabold fill-rose-600"
                  >
                    {fmtKES(pt.amount)}
                  </text>
                  <text
                    x={pt.x}
                    y={130}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-500"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            <div className="flex items-center gap-4 text-[10px] font-bold mt-1">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-0.5 bg-rose-600 rounded-full" />
                Arrears Exposure by Aging Bracket
              </span>
              <span className="text-slate-400 font-normal">
                (Days elapsed since last confirmed settlement)
              </span>
            </div>
          </div>
        ) : (
          /* View 2: Aging Bucket Matrix Cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
            {agingMetrics.map((b) => (
              <div
                key={b.bucket}
                className="p-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                    style={{ backgroundColor: `${b.color}15`, color: b.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                    {b.label}
                  </span>
                  <span className="font-mono text-slate-800 text-xs font-black">
                    {b.count}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Arrears Exposure
                  </div>
                  <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                    {fmtKES(b.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Callout */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FiClock className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Cumulative Carried Arrears:{' '}
              <strong className="text-slate-900 font-black">{fmtKES(totalArrears)}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Automatic Priority-1 FIFO</span>
        </div>
      </div>
    </div>
  );
}

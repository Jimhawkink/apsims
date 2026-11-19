'use client';

import { useState } from 'react';
import {
    FiBarChart2,
    FiUsers,
    FiCheckCircle,
    FiTrendingUp,
    FiShield,
    FiChevronDown,
} from 'react-icons/fi';

interface MiddleSectionProps {
    totalCollected?: number;
    totalOutstanding?: number;
    totalExpected?: number;
    collectionRate?: number;
    attendanceRate?: number;
    passRate?: number;
    classProgress?: number;
    disciplineRate?: number;
    monthlyData?: { month: string; amount: number }[];
}

const fmt = (n: number) => {
    return `Ksh ${new Intl.NumberFormat('en-KE').format(Math.round(n || 0))}`;
};

export default function UltraMiddleSection({
    totalCollected = 461000,
    totalOutstanding = 131000,
    totalExpected = 592000,
    collectionRate = 78,
    attendanceRate = 96,
    passRate = 92,
    classProgress = 94,
    disciplineRate = 100,
    monthlyData,
}: MiddleSectionProps) {
    const [period, setPeriod] = useState<'term' | 'year' | 'all'>('term');
    const [perfTerm, setPerfTerm] = useState('This Term');

    // Real dynamic months and fee values from DB monthlyData
    const months = monthlyData && monthlyData.length > 0
        ? monthlyData.slice(-5).map(m => m.month)
        : ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

    const dataPoints = monthlyData && monthlyData.length > 0
        ? monthlyData.slice(-5).map(m => m.amount)
        : [0, 0, 0, 0, totalCollected];

    const highestVal = Math.max(...dataPoints, totalCollected, 1000);
    const maxVal = Math.ceil(highestVal * 1.25);
    const svgWidth = 460;
    const svgHeight = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 35;
    const paddingBottom = 30;

    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;

    const coords = dataPoints.map((val, idx) => {
        const x = paddingLeft + (idx / Math.max(1, dataPoints.length - 1)) * plotWidth;
        const normalizedY = Math.min(1, Math.max(0, val / maxVal));
        const y = paddingTop + (1 - normalizedY) * plotHeight;
        return { x, y, val };
    });

    // Build smooth bezier spline
    const makeSplinePath = () => {
        if (coords.length === 0) return '';
        let d = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[i === 0 ? 0 : i - 1];
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    };

    const splinePath = makeSplinePath();
    const areaPath = `${splinePath} L ${coords[coords.length - 1].x} ${svgHeight - paddingBottom} L ${coords[0].x} ${svgHeight - paddingBottom} Z`;

    // Active tooltip index (November point)
    const activePoint = coords[coords.length - 1];

    // Donut circumference (radius = 52)
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (collectionRate / 100) * circumference;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* ══════════════════════════════════════════════════
                CARD 1: Fee Analytics & Class Intelligence (7 cols)
            ══════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                            <FiBarChart2 size={15} />
                        </div>
                        <h2 className="text-xs font-black text-slate-800 tracking-tight">
                            Fee Analytics &amp; Class Intelligence
                        </h2>
                    </div>

                    {/* Period Switcher */}
                    <div className="flex items-center bg-[#f0f5fc] p-0.5 rounded-full border border-[#e2ecf8]">
                        {[
                            { key: 'term', label: 'This Term' },
                            { key: 'year', label: 'This Year' },
                            { key: 'all', label: 'All Terms' },
                        ].map(t => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setPeriod(t.key as any)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-150 ${
                                    period === t.key
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/60'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub-panels Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Left Sub-panel: Circular Progress Donut + Legend */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center py-1">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                                <defs>
                                    <linearGradient id="donutRingGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="45%" stopColor="#8b5cf6" />
                                        <stop offset="85%" stopColor="#06b6d4" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="none"
                                    stroke="#f1f5f9"
                                    strokeWidth="11"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={radius}
                                    fill="none"
                                    stroke="url(#donutRingGrad)"
                                    strokeWidth="11"
                                    strokeDasharray={`${strokeDash} ${circumference}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-[26px] font-black text-slate-800 leading-none tracking-tight">
                                    {collectionRate}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1">
                                    Collection<br />Rate
                                </span>
                            </div>
                        </div>

                        {/* Legend list matching Image 2 */}
                        <div className="w-full space-y-1.5 mt-3 pt-3 border-t border-slate-100/90 text-xs font-semibold">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs" />
                                    Collected
                                </span>
                                <span className="font-black text-slate-800 text-[11px] font-mono">
                                    {fmt(totalCollected)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-xs" />
                                    Outstanding
                                </span>
                                <span className="font-black text-slate-800 text-[11px] font-mono">
                                    {fmt(totalOutstanding)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                                    Expected
                                </span>
                                <span className="font-black text-slate-800 text-[11px] font-mono">
                                    {fmt(totalExpected)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Sub-panel: Smooth Linear Spline Area Chart */}
                    <div className="sm:col-span-7 flex flex-col justify-center">
                        <div className="relative w-full h-[190px]">
                            <svg
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                className="w-full h-full overflow-visible"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="splineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                        <stop offset="65%" stopColor="#60a5fa" stopOpacity="0.08" />
                                        <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="splineStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#60a5fa" />
                                        <stop offset="50%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#2563eb" />
                                    </linearGradient>
                                    <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.4" />
                                    </filter>
                                </defs>

                                {/* Y-Axis grid lines & labels */}
                                {[
                                    { val: maxVal >= 1000 ? `${Math.round(maxVal / 1000)}K` : `${maxVal}`, y: paddingTop },
                                    { val: maxVal >= 1000 ? `${Math.round((maxVal * 0.66) / 1000)}K` : `${Math.round(maxVal * 0.66)}`, y: paddingTop + plotHeight * 0.333 },
                                    { val: maxVal >= 1000 ? `${Math.round((maxVal * 0.33) / 1000)}K` : `${Math.round(maxVal * 0.33)}`, y: paddingTop + plotHeight * 0.666 },
                                    { val: '0',   y: paddingTop + plotHeight },
                                ].map((grid, i) => (
                                    <g key={i}>
                                        <line
                                            x1={paddingLeft}
                                            y1={grid.y}
                                            x2={svgWidth - paddingRight}
                                            y2={grid.y}
                                            stroke="#f1f5f9"
                                            strokeDasharray={i === 3 ? 'none' : '3 3'}
                                            strokeWidth="1"
                                        />
                                        <text
                                            x={paddingLeft - 8}
                                            y={grid.y + 3}
                                            textAnchor="end"
                                            className="fill-slate-400 text-[9px] font-bold font-mono"
                                        >
                                            {grid.val}
                                        </text>
                                    </g>
                                ))}

                                {/* Area fill */}
                                <path d={areaPath} fill="url(#splineAreaGrad)" />

                                {/* Spline Line */}
                                <path
                                    d={splinePath}
                                    fill="none"
                                    stroke="url(#splineStrokeGrad)"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                />

                                {/* Data Nodes */}
                                {coords.map((c, i) => {
                                    const isLatest = i === coords.length - 1;
                                    return (
                                        <g key={i}>
                                            <circle
                                                cx={c.x}
                                                cy={c.y}
                                                r={isLatest ? 5.5 : 4}
                                                fill={isLatest ? '#2563eb' : '#3b82f6'}
                                                stroke="#ffffff"
                                                strokeWidth={isLatest ? 2.5 : 2}
                                                filter="url(#nodeGlow)"
                                                className="transition-transform hover:scale-125"
                                            />
                                            {/* X-axis Month Label */}
                                            <text
                                                x={c.x}
                                                y={svgHeight - 10}
                                                textAnchor="middle"
                                                className="fill-slate-500 text-[10px] font-semibold"
                                            >
                                                {months[i]}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Floating Navy Tooltip Pill matching Image 2 */}
                            {activePoint && (
                                <div
                                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full"
                                    style={{
                                        left: `${(activePoint.x / svgWidth) * 100}%`,
                                        top: `${(activePoint.y / svgHeight) * 100 - 8}%`,
                                    }}
                                >
                                    <div className="bg-[#0f172a] text-white px-3 py-1.5 rounded-xl shadow-[0_8px_20px_rgba(15,23,42,0.35)] text-center relative border border-slate-700/60 whitespace-nowrap">
                                        <p className="text-[11px] font-black leading-tight tracking-tight text-white font-mono">
                                            {fmt(totalCollected)}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-wider">
                                            This Month
                                        </p>
                                        {/* Bottom caret arrow */}
                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#0f172a] rotate-45 border-r border-b border-slate-700/60" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                CARD 2: Performance Overview (5 cols)
            ══════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                {/* Header with Term Dropdown */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                            <FiTrendingUp size={15} />
                        </div>
                        <h2 className="text-xs font-black text-slate-800 tracking-tight">
                            Performance Overview
                        </h2>
                    </div>

                    <div className="flex items-center gap-1 bg-[#f0f5fc] px-3 py-1 rounded-full border border-[#e2ecf8] text-[10px] font-bold text-slate-700 cursor-pointer shadow-xs hover:bg-white transition-all">
                        <span>{perfTerm}</span>
                        <FiChevronDown size={11} className="text-slate-400" />
                    </div>
                </div>

                {/* 4 Circular Progress Meters matching Image 2 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
                    {[
                        {
                            label: 'Attendance',
                            pct: attendanceRate,
                            color: '#3b82f6',
                            gradId: 'blueMeter',
                            gradStart: '#60a5fa',
                            gradEnd: '#2563eb',
                            icon: FiUsers,
                        },
                        {
                            label: 'Pass Rate',
                            pct: passRate,
                            color: '#10b981',
                            gradId: 'greenMeter',
                            gradStart: '#34d399',
                            gradEnd: '#059669',
                            icon: FiCheckCircle,
                        },
                        {
                            label: 'Class Progress',
                            pct: classProgress,
                            color: '#8b5cf6',
                            gradId: 'purpleMeter',
                            gradStart: '#a78bfa',
                            gradEnd: '#7c3aed',
                            icon: FiBarChart2,
                        },
                        {
                            label: 'Discipline',
                            pct: disciplineRate,
                            color: '#f59e0b',
                            gradId: 'amberMeter',
                            gradStart: '#fbbf24',
                            gradEnd: '#d97706',
                            icon: FiShield,
                        },
                    ].map((meter, i) => {
                        const Icon = meter.icon;
                        const mRadius = 32;
                        const mCirc = 2 * Math.PI * mRadius;
                        const mDash = (meter.pct / 100) * mCirc;

                        return (
                            <div key={i} className="flex flex-col items-center text-center">
                                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                        <defs>
                                            <linearGradient id={meter.gradId} x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor={meter.gradStart} />
                                                <stop offset="100%" stopColor={meter.gradEnd} />
                                            </linearGradient>
                                        </defs>
                                        <circle
                                            cx="40"
                                            cy="40"
                                            r={mRadius}
                                            fill="none"
                                            stroke="#f1f5f9"
                                            strokeWidth="6"
                                        />
                                        <circle
                                            cx="40"
                                            cy="40"
                                            r={mRadius}
                                            fill="none"
                                            stroke={`url(#${meter.gradId})`}
                                            strokeWidth="6"
                                            strokeDasharray={`${mDash} ${mCirc}`}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dasharray 1s ease' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-sm font-black text-slate-800 leading-none tracking-tight">
                                            {meter.pct}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                                    <Icon size={11} style={{ color: meter.color }} />
                                    <span>{meter.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Performance Summary Pill */}
                <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Target Standards Met
                    </span>
                    <span className="font-semibold text-slate-500">Benchmark: 85%+</span>
                </div>
            </div>
        </div>
    );
}

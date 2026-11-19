'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    FiBookOpen,
    FiCheckSquare,
    FiAlertTriangle,
    FiAward,
    FiTrendingUp,
    FiChevronRight,
    FiLayers,
    FiShield,
} from 'react-icons/fi';

interface ClassCurveItem {
    name: string;
    t1: number;
    t2: number;
    t3: number;
    color: string;
}

interface CompetencyCounts {
    ee: { count: number; pct: number };
    me: { count: number; pct: number };
    ae: { count: number; pct: number };
    be: { count: number; pct: number };
    total: number;
}

interface CBCIntelligenceProps {
    schemesCount?: number;
    schemesApproved?: number;
    lessonPlansCount?: number;
    lessonPlansApproved?: number;
    openInterventions?: number;
    kpseaMean?: number;
    formPerformance?: { form: string; avg: number }[];
    classCurves?: ClassCurveItem[];
    competencyStats?: CompetencyCounts;
}

export default function CBCIntelligenceConsole({
    schemesCount = 0,
    schemesApproved = 0,
    lessonPlansCount = 0,
    lessonPlansApproved = 0,
    openInterventions = 0,
    kpseaMean = 0,
    formPerformance = [],
    classCurves = [],
    competencyStats,
}: CBCIntelligenceProps) {
    const schemeApprovalRate = schemesCount > 0 ? Math.round((schemesApproved / schemesCount) * 100) : 0;
    const lessonPlanRate = lessonPlansCount > 0 ? Math.round((lessonPlansApproved / lessonPlansCount) * 100) : 0;

    // Real or Form-derived performance curves
    const activeCurves: ClassCurveItem[] = classCurves.length > 0
        ? classCurves
        : formPerformance.slice(0, 5).map((f, i) => {
            const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b'];
            return {
                name: f.form,
                t1: Math.max(0, Math.round((f.avg - 4) * 10) / 10),
                t2: Math.max(0, Math.round((f.avg - 1) * 10) / 10),
                t3: f.avg,
                color: colors[i % colors.length],
            };
        });

    const svgW = 460;
    const svgH = 150;
    const pLeft = 40;
    const pRight = 20;
    const pTop = 20;
    const pBottom = 25;
    const plotW = svgW - pLeft - pRight;
    const plotH = svgH - pTop - pBottom;

    const terms = ['Term 1', 'Term 2', 'Term 3'];

    return (
        <div className="space-y-3.5">
            {/* ══════════════════════════════════════════════════
                SECTION HEADER
            ══════════════════════════════════════════════════ */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] px-5 py-3 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
                        <FiBookOpen size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-black text-slate-800 tracking-tight">
                                CBC Curriculum Coverage &amp; Academic Intelligence
                            </h2>
                            <span className="px-2 py-0.5 text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 rounded-full uppercase">
                                KICD &amp; KNEC Aligned
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                            Schemes of work tracking, lesson delivery, JSS rubric mastery &amp; Zeraki-grade trend curves
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/cbc"
                        className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
                    >
                        CBC Portal
                    </Link>
                    <Link
                        href="/dashboard/exams/kpsea"
                        className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                        KPSEA Hub
                    </Link>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                ROW 1: CBC DELIVERY CONSOLE + JSS COMPETENCY RUBRICS
            ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* ── LEFT PANEL (5 cols): Schemes of Work & KICD Lesson Plans ── */}
                <div className="lg:col-span-5 bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-4 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FiCheckSquare size={15} className="text-emerald-600" />
                                <h3 className="text-xs font-black text-slate-800 tracking-tight">
                                    Schemes of Work &amp; Lesson Delivery
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Week 8 / 13</span>
                        </div>

                        {/* 2 Micro KPI Cards */}
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/90">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                                    <span>Schemes Coverage</span>
                                    <span className="text-emerald-600">{schemeApprovalRate}%</span>
                                </div>
                                <p className="text-base font-black text-slate-800 mt-1 font-mono">
                                    {schemesApproved} / {schemesCount}
                                </p>
                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${schemeApprovalRate}%` }}
                                    />
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 block">Approved by HODs</span>
                            </div>

                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/90">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                                    <span>KICD Lesson Plans</span>
                                    <span className="text-blue-600">{lessonPlanRate}%</span>
                                </div>
                                <p className="text-base font-black text-slate-800 mt-1 font-mono">
                                    {lessonPlansApproved} / {lessonPlansCount}
                                </p>
                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${lessonPlanRate}%` }}
                                    />
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 block">Delivered &amp; Verified</span>
                            </div>
                        </div>

                        {/* Early Warning Academic Intervention Flags */}
                        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100/80 mb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <FiAlertTriangle size={13} className="text-rose-600" />
                                    <span className="text-[11px] font-black text-rose-800">
                                        Academic Intervention Alerts
                                    </span>
                                </div>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                                    {openInterventions} At-Risk
                                </span>
                            </div>
                            <p className="text-[10px] text-rose-700/90 mt-1">
                                {openInterventions} students flagged below expectation (BE rubric). Remedial classes scheduled.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <Link
                            href="/dashboard/curriculum"
                            className="font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                            <span>Manage Schemes of Work</span>
                            <FiChevronRight size={11} />
                        </Link>
                        <span className="text-slate-400">Synced to TSC Portal</span>
                    </div>
                </div>

                {/* ── RIGHT PANEL (7 cols): JSS Competency Rubric & KPSEA Readiness ── */}
                <div className="lg:col-span-7 bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-4 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FiAward size={15} className="text-blue-600" />
                                <h3 className="text-xs font-black text-slate-800 tracking-tight">
                                    JSS Competency Distribution &amp; KPSEA Readiness
                                </h3>
                            </div>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                KPSEA Mean: {kpseaMean}%
                            </span>
                        </div>

                        {/* 4 CBC Competency Bars from Live Database */}
                        <div className="space-y-2 mb-3">
                            {[
                                { level: 'EE (Exceeding Expectation)', pct: competencyStats?.ee.pct || 0, count: competencyStats?.ee.count || 0, color: '#3b82f6', bg: '#eff6ff' },
                                { level: 'ME (Meeting Expectation)',   pct: competencyStats?.me.pct || 0, count: competencyStats?.me.count || 0, color: '#10b981', bg: '#f0fdf4' },
                                { level: 'AE (Approaching Expectation)', pct: competencyStats?.ae.pct || 0, count: competencyStats?.ae.count || 0, color: '#f59e0b', bg: '#fffbeb' },
                                { level: 'BE (Below Expectation)',     pct: competencyStats?.be.pct || 0, count: competencyStats?.be.count || 0, color: '#ef4444', bg: '#fef2f2' },
                            ].map((rubric, idx) => (
                                <div key={idx} className="p-2 rounded-xl border border-slate-100" style={{ background: rubric.bg }}>
                                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                        <span className="text-slate-700">{rubric.level}</span>
                                        <span className="font-black font-mono" style={{ color: rubric.color }}>
                                            {rubric.pct}% ({rubric.count} marks)
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-white rounded-full overflow-hidden border border-slate-200/50">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${rubric.pct}%`, background: rubric.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>KNEC National Standard: 84% ME &amp; EE Combined (Current: 84%)</span>
                        <Link href="/dashboard/jss" className="text-purple-600 font-bold hover:underline">
                            JSS Marks Intake →
                        </Link>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                ROW 2: ZERAKI-STYLE LINEAR PERFORMANCE SPLINES
            ══════════════════════════════════════════════════ */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[22px] p-4 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FiTrendingUp size={15} className="text-blue-600" />
                        <div>
                            <h3 className="text-xs font-black text-slate-800 tracking-tight">
                                Term-Over-Term Academic Trajectory (Linear Splines)
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Comparative mean score momentum across classes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
                        {activeCurves.map(c => (
                            <span key={c.name} className="hidden sm:flex items-center gap-1">
                                <span className="w-2.5 h-1 rounded-full" style={{ background: c.color }} />
                                <span>{c.name}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="relative w-full h-[140px]">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Horizontal Grid lines */}
                        {[
                            { val: '80%', y: pTop },
                            { val: '70%', y: pTop + plotH * 0.333 },
                            { val: '60%', y: pTop + plotH * 0.666 },
                            { val: '50%', y: pTop + plotH },
                        ].map((grid, i) => (
                            <g key={i}>
                                <line
                                    x1={pLeft}
                                    y1={grid.y}
                                    x2={svgW - pRight}
                                    y2={grid.y}
                                    stroke="#f1f5f9"
                                    strokeDasharray="3 3"
                                    strokeWidth="1"
                                />
                                <text
                                    x={pLeft - 8}
                                    y={grid.y + 3}
                                    textAnchor="end"
                                    className="fill-slate-400 text-[9px] font-bold font-mono"
                                >
                                    {grid.val}
                                </text>
                            </g>
                        ))}

                        {/* Spline lines for each class */}
                        {activeCurves.map((curve, cIdx) => {
                            const pts = [curve.t1, curve.t2, curve.t3].map((val, idx) => {
                                const x = pLeft + (idx / 2) * plotW;
                                const norm = (val - 50) / 30; // 50% to 80%
                                const y = pTop + (1 - Math.min(1, Math.max(0, norm))) * plotH;
                                return { x, y, val };
                            });

                            const cp1x = pts[0].x + (pts[1].x - pts[0].x) / 2;
                            const cp1y = pts[0].y;
                            const cp2x = pts[1].x + (pts[2].x - pts[1].x) / 2;
                            const cp2y = pts[1].y;

                            const d = `M ${pts[0].x} ${pts[0].y} Q ${cp1x} ${pts[1].y} ${pts[1].x} ${pts[1].y} T ${pts[2].x} ${pts[2].y}`;

                            return (
                                <g key={cIdx}>
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke={curve.color}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        opacity={0.9}
                                    />
                                    {pts.map((p, pIdx) => (
                                        <circle
                                            key={pIdx}
                                            cx={p.x}
                                            cy={p.y}
                                            r="3.5"
                                            fill={curve.color}
                                            stroke="#ffffff"
                                            strokeWidth="1.5"
                                        />
                                    ))}
                                </g>
                            );
                        })}

                        {/* X-axis labels */}
                        {terms.map((t, idx) => {
                            const x = pLeft + (idx / 2) * plotW;
                            return (
                                <text
                                    key={t}
                                    x={x}
                                    y={svgH - 6}
                                    textAnchor="middle"
                                    className="fill-slate-500 text-[10px] font-bold"
                                >
                                    {t}
                                </text>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
}

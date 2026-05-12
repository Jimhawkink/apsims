'use client';

import { useState } from 'react';
import { FiPieChart } from 'react-icons/fi';

interface ClassDistProps {
    formDistribution: { name: string; count: number; color?: string }[];
    activeCount: number;
    meanAttendance: number;
    thisYearAdmissions: number;
    nemisSync: { synced: number; total: number };
}

const FORM_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function StudentClassDistribution({
    formDistribution, activeCount, meanAttendance, thisYearAdmissions, nemisSync
}: ClassDistProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const withStudents = formDistribution.filter(f => f.count > 0);

    // Derive mean grade from Form 4 (demo)
    const form4 = formDistribution.find(f => f.name?.includes('4') && !f.name?.includes('10'));

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.03)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <FiPieChart size={16} className="text-amber-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">Class distribution</h3>
                </div>
                <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-1.5"
                >
                    <FiPieChart size={12} /> Breakdown
                </button>
            </div>

            {/* Proportional Bar */}
            <div className="flex rounded-xl overflow-hidden h-9 mb-3" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
                {withStudents.map((f, i) => {
                    const pct = activeCount > 0 ? (f.count / activeCount) * 100 : 0;
                    const color = f.color || FORM_COLORS[i % FORM_COLORS.length];
                    return (
                        <div
                            key={i}
                            className="flex items-center justify-center text-white text-xs font-bold transition-all duration-500 hover:brightness-110 cursor-default relative group"
                            style={{
                                width: `${pct}%`,
                                background: color,
                                minWidth: f.count > 0 ? '36px' : '0',
                            }}
                            title={`${f.name}: ${f.count} students (${pct.toFixed(0)}%)`}
                        >
                            {f.count}
                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {f.name}: {f.count}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5">
                {formDistribution.map((f, i) => {
                    const color = f.color || FORM_COLORS[i % FORM_COLORS.length];
                    return (
                        <span key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                            <span className="font-semibold text-gray-600">{f.name}</span>
                            <span className="text-gray-400">({f.count})</span>
                        </span>
                    );
                })}
            </div>

            {/* 4 Quick Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Attendance Rate */}
                <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-blue-50/30 p-3.5 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendance rate</p>
                    <p className="text-xl font-extrabold text-blue-600 mt-1">{meanAttendance}%</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">This term</p>
                </div>

                {/* Mean Grade */}
                <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-emerald-50/30 p-3.5 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mean grade {form4 ? `(${form4.name})` : ''}</p>
                    <p className="text-xl font-extrabold text-emerald-600 mt-1">B <span className="text-sm font-semibold text-gray-400">(Plain)</span></p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Latest results</p>
                </div>

                {/* New Enrolments */}
                <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-amber-50/30 p-3.5 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New this year</p>
                    <p className="text-xl font-extrabold text-amber-600 mt-1">{thisYearAdmissions}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Enrolled {new Date().getFullYear()}</p>
                </div>

                {/* NEMIS Sync */}
                <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-violet-50/30 p-3.5 hover:shadow-md transition-all">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NEMIS synced</p>
                    <p className="text-xl font-extrabold text-violet-600 mt-1">
                        {nemisSync.synced} <span className="text-sm text-gray-400">/ {nemisSync.total}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{nemisSync.total - nemisSync.synced} pending</p>
                </div>
            </div>

            {/* Breakdown Expandable */}
            {showBreakdown && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 animate-fade-in">
                    {formDistribution.map((f, i) => {
                        const color = f.color || FORM_COLORS[i % FORM_COLORS.length];
                        const pct = activeCount > 0 ? ((f.count / activeCount) * 100).toFixed(1) : '0';
                        return (
                            <div key={i} className="rounded-xl border border-gray-100 p-3 text-center hover:shadow-md transition-all bg-white">
                                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm" style={{ background: color }}>
                                    {f.count}
                                </div>
                                <p className="text-xs font-bold text-gray-700">{f.name}</p>
                                <p className="text-[10px] text-gray-400">{pct}% of total</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

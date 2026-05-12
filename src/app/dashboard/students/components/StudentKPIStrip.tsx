'use client';

import { FiUsers, FiUserCheck, FiDollarSign, FiAlertCircle } from 'react-icons/fi';

interface KPIStripProps {
    totalStudents: number;
    activeCount: number;
    maleCount: number;
    femaleCount: number;
    cbcCount: number;
    eightFourFourCount: number;
    feeCollectionRate: number;
    defaulterInfo: { count: number; totalOwed: number };
}

export default function StudentKPIStrip({
    totalStudents, activeCount, maleCount, femaleCount,
    cbcCount, eightFourFourCount, feeCollectionRate, defaulterInfo
}: KPIStripProps) {
    const formatKsh = (v: number) => {
        if (v >= 1000000) return `Ksh ${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `Ksh ${(v / 1000).toFixed(0)}K`;
        return `Ksh ${v}`;
    };

    const kpis = [
        {
            label: 'Total students',
            value: totalStudents,
            sub: 'All records',
            icon: '👥',
            color: '#6366f1',
            bgFrom: '#eef2ff',
            bgTo: '#e0e7ff',
            iconBg: '#c7d2fe',
        },
        {
            label: 'Active',
            value: activeCount,
            sub: 'Enrolled',
            icon: '✓',
            color: '#16a34a',
            bgFrom: '#f0fdf4',
            bgTo: '#dcfce7',
            iconBg: '#bbf7d0',
            isCheck: true,
        },
        {
            label: 'Male',
            value: maleCount,
            sub: `${activeCount > 0 ? ((maleCount / activeCount) * 100).toFixed(0) : 0}%`,
            icon: '♂',
            color: '#2563eb',
            bgFrom: '#eff6ff',
            bgTo: '#dbeafe',
            iconBg: '#bfdbfe',
        },
        {
            label: 'Female',
            value: femaleCount,
            sub: `${activeCount > 0 ? ((femaleCount / activeCount) * 100).toFixed(0) : 0}%`,
            icon: '♀',
            color: '#db2777',
            bgFrom: '#fdf2f8',
            bgTo: '#fce7f3',
            iconBg: '#fbcfe8',
        },
        {
            label: 'CBC students',
            value: cbcCount,
            sub: 'Grade 10',
            icon: '🖥️',
            color: '#7c3aed',
            bgFrom: '#f5f3ff',
            bgTo: '#ede9fe',
            iconBg: '#ddd6fe',
        },
        {
            label: '8-4-4',
            value: eightFourFourCount,
            sub: 'Form 1–4',
            icon: '📘',
            color: '#0891b2',
            bgFrom: '#ecfeff',
            bgTo: '#cffafe',
            iconBg: '#a5f3fc',
        },
        {
            label: 'Fee paid',
            value: `${feeCollectionRate}%`,
            sub: 'This term',
            icon: '💰',
            color: '#059669',
            bgFrom: '#f0fdf4',
            bgTo: '#dcfce7',
            iconBg: '#a7f3d0',
            isPercent: true,
        },
        {
            label: 'Defaulters',
            value: defaulterInfo.count,
            sub: formatKsh(defaulterInfo.totalOwed),
            icon: '⚠️',
            color: '#dc2626',
            bgFrom: '#fef2f2',
            bgTo: '#fee2e2',
            iconBg: '#fecaca',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {kpis.map((kpi, i) => (
                <div
                    key={i}
                    className="relative rounded-2xl p-4 border border-white/60 overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                    style={{
                        background: `linear-gradient(135deg, ${kpi.bgFrom}, ${kpi.bgTo})`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                    }}
                >
                    {/* Floating icon background */}
                    <div
                        className="absolute -right-2 -top-2 w-14 h-14 rounded-full opacity-30 group-hover:opacity-50 transition-opacity"
                        style={{ background: kpi.iconBg }}
                    />

                    {/* Top row: icon + label */}
                    <div className="flex items-center gap-1.5 mb-2 relative z-10">
                        <span className="text-sm">{kpi.icon}</span>
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: kpi.color }}
                        >
                            {kpi.label}
                        </span>
                    </div>

                    {/* Value */}
                    <p
                        className="text-2xl font-extrabold leading-none relative z-10"
                        style={{ color: kpi.color }}
                    >
                        {kpi.value}
                    </p>

                    {/* Subtitle */}
                    <p className="text-[10px] font-medium mt-1.5 relative z-10 opacity-70" style={{ color: kpi.color }}>
                        {kpi.sub}
                    </p>

                    {/* Subtle bottom accent line */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-[3px] opacity-40"
                        style={{ background: kpi.color }}
                    />
                </div>
            ))}
        </div>
    );
}

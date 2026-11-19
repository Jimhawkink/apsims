'use client';

import React from 'react';
import {
  FiUsers,
  FiInbox,
  FiSearch,
  FiCheckCircle,
  FiAward,
  FiTrendingUp,
} from 'react-icons/fi';

interface FunnelCounts {
  total: number;
  new: number;
  review: number;
  approved: number;
  rejected: number;
  waitlist: number;
  admitted: number;
}

interface UltraAdmissionsFunnelProps {
  counts: FunnelCounts;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

export function UltraAdmissionsFunnel({
  counts,
  activeStatus,
  onSelectStatus,
}: UltraAdmissionsFunnelProps) {
  const conversionRate = counts.total > 0 ? ((counts.admitted / counts.total) * 100).toFixed(1) : '0.0';
  const approvalRate = counts.total > 0 ? (((counts.approved + counts.admitted) / counts.total) * 100).toFixed(1) : '0.0';

  const cards = [
    {
      id: 'All',
      label: 'Total Applications',
      count: counts.total,
      subtext: 'Intake Dossiers',
      icon: <FiUsers size={16} />,
      color: 'blue',
      borderColor: '#93c5fd',
      bgGrad: 'from-blue-50/70 to-indigo-50/40',
      activeBorder: 'border-blue-500 ring-2 ring-blue-100',
    },
    {
      id: 'Submitted',
      label: 'New Submissions',
      count: counts.new,
      subtext: 'Awaiting 1st Review',
      icon: <FiInbox size={16} />,
      color: 'sky',
      borderColor: '#7dd3fc',
      bgGrad: 'from-sky-50/70 to-cyan-50/40',
      activeBorder: 'border-sky-500 ring-2 ring-sky-100',
    },
    {
      id: 'Under Review',
      label: 'Under Review',
      count: counts.review,
      subtext: 'Committee Processing',
      icon: <FiSearch size={16} />,
      color: 'amber',
      borderColor: '#fcd34d',
      bgGrad: 'from-amber-50/70 to-yellow-50/40',
      activeBorder: 'border-amber-500 ring-2 ring-amber-100',
    },
    {
      id: 'Approved',
      label: 'Approved Qualified',
      count: counts.approved,
      subtext: 'Ready for Class Placement',
      icon: <FiCheckCircle size={16} />,
      color: 'emerald',
      borderColor: '#86efac',
      bgGrad: 'from-emerald-50/70 to-green-50/40',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-100',
    },
    {
      id: 'Admitted',
      label: 'Enrolled Students',
      count: counts.admitted,
      subtext: 'Active in Student Roster',
      icon: <FiAward size={16} />,
      color: 'teal',
      borderColor: '#5eead4',
      bgGrad: 'from-teal-50/70 to-emerald-50/40',
      activeBorder: 'border-teal-500 ring-2 ring-teal-100',
    },
    {
      id: 'Conversion',
      label: 'Intake Conversion',
      count: `${conversionRate}%`,
      subtext: `${approvalRate}% Offered Admission`,
      icon: <FiTrendingUp size={16} />,
      color: 'indigo',
      borderColor: '#c7d2fe',
      bgGrad: 'from-indigo-50/70 to-violet-50/40',
      activeBorder: 'border-indigo-500',
      isMetricOnly: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((c) => {
        const isSelected = activeStatus === c.id;
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              if (!c.isMetricOnly) {
                onSelectStatus(c.id);
              }
            }}
            className={`text-left p-3 rounded-2xl bg-gradient-to-b ${c.bgGrad} bg-white border transition-all duration-150 ${
              isSelected ? c.activeBorder : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
            } ${c.isMetricOnly ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                {c.label}
              </span>
              <span className="text-slate-400">{c.icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {c.count}
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
              {c.subtext}
            </p>
          </button>
        );
      })}
    </div>
  );
}

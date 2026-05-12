'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiEdit3,
  FiBarChart2,
  FiAward,
  FiClock,
  FiBook,
  FiSettings,
} from 'react-icons/fi';

const TABS = [
  { id: 'entry', label: 'Mark Entry', icon: FiEdit3, href: '/dashboard/exams/cbc-marks' },
  { id: 'summary', label: 'Summary', icon: FiBarChart2, href: '/dashboard/exams/cbc-marks/summary' },
  { id: 'competency', label: 'Competency', icon: FiAward, href: '/dashboard/exams/cbc-marks/competency' },
  { id: 'history', label: 'History', icon: FiClock, href: '/dashboard/exams/cbc-marks/history' },
  { id: 'rubric-config', label: 'Rubric Config', icon: FiSettings, href: '/dashboard/exams/cbc-marks/rubric-config' },
];

interface CBCNavBarProps {
  /** The currently active tab ID */
  activeTab?: string;
  /** Optional right-side action buttons */
  rightActions?: React.ReactNode;
  /** Breadcrumb trail override */
  breadcrumbEnd?: string;
}

export default function CBCNavBar({
  activeTab,
  rightActions,
  breadcrumbEnd = 'Mark Entry',
}: CBCNavBarProps) {
  const pathname = usePathname();

  // Auto-detect active tab from pathname
  const currentTab = activeTab || (() => {
    if (pathname.includes('/summary')) return 'summary';
    if (pathname.includes('/competency')) return 'competency';
    if (pathname.includes('/history')) return 'history';
    if (pathname.includes('/rubric-config')) return 'rubric-config';
    return 'entry';
  })();

  return (
    <div className="flex items-center justify-between py-2.5 px-5 bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* Left: Logo + Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D9A6)' }}
          >
            <FiBook size={14} className="text-white" />
          </div>
          AlphaSIMS
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Exams</span>
          <span className="opacity-50">›</span>
          <span>CBC Assessment</span>
          <span className="opacity-50">›</span>
          <span className="text-gray-700 font-medium">{breadcrumbEnd}</span>
        </div>
      </div>

      {/* Center: Nav Tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs cursor-pointer transition-all no-underline ${
                isActive
                  ? 'bg-white text-gray-800 font-semibold shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {rightActions}
      </div>
    </div>
  );
}

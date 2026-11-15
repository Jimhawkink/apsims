'use client';

import {
  LayoutDashboard,
  Wallet,
  GraduationCap,
  Users2,
  Package,
  KeyRound,
} from 'lucide-react';

export type TabKey = 'overview' | 'finance' | 'academics' | 'staff' | 'stores' | 'portals';

const tabs: { key: TabKey; label: string; icon: any; color: string; bg: string; activeBg: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#2563eb', bg: '#eff6ff', activeBg: 'from-blue-600 to-indigo-600' },
  { key: 'finance', label: 'Fees & Finance', icon: Wallet, color: '#059669', bg: '#ecfdf5', activeBg: 'from-emerald-600 to-teal-600' },
  { key: 'academics', label: 'Academics', icon: GraduationCap, color: '#7c3aed', bg: '#f5f3ff', activeBg: 'from-purple-600 to-indigo-600' },
  { key: 'staff', label: 'Staff & HR', icon: Users2, color: '#ea580c', bg: '#fff7ed', activeBg: 'from-orange-500 to-amber-600' },
  { key: 'stores', label: 'Stores & Library', icon: Package, color: '#d97706', bg: '#fffbeb', activeBg: 'from-amber-500 to-orange-600' },
  { key: 'portals', label: 'Portal Users', icon: KeyRound, color: '#0891b2', bg: '#ecfeff', activeBg: 'from-cyan-600 to-blue-600' },
];

export default function DashboardTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide py-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(tab.key);
            }}
            className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-200 flex-shrink-0 cursor-pointer ${
              isActive
                ? `bg-gradient-to-r ${tab.activeBg} text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] scale-[1.02] border border-white/30`
                : 'bg-white/90 backdrop-blur-xl border border-white/95 text-slate-700 shadow-[0_2px_10px_rgba(20,50,120,0.04)] hover:border-blue-300 hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'bg-white/20 text-white' : 'text-slate-600 group-hover:text-blue-600'
              }`}
              style={{ background: isActive ? undefined : tab.bg, color: isActive ? undefined : tab.color }}
            >
              <Icon size={15} strokeWidth={2.4} />
            </div>
            <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}


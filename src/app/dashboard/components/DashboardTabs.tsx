'use client';

export type TabKey = 'overview' | 'finance' | 'academics' | 'staff' | 'stores' | 'portals';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'finance', label: 'Fees & Finance', icon: '💰' },
  { key: 'academics', label: 'Academics', icon: '📚' },
  { key: 'staff', label: 'Staff & HR', icon: '👨‍🏫' },
  { key: 'stores', label: 'Stores & Library', icon: '📦' },
  { key: 'portals', label: 'Portal Users', icon: '🔑' },
];

export default function DashboardTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_3px_16px_rgba(20,50,120,0.05),0_1px_3px_rgba(0,0,0,0.02)] rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(tab.key);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] scale-[1.02]'
                : 'text-slate-600 hover:text-blue-600 hover:bg-white/80'
            }`}
          >
            <span className="text-sm group-hover:scale-110 transition-transform">{tab.icon}</span>
            <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}


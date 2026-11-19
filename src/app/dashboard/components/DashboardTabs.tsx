'use client';

export type TabKey = 'overview' | 'finance' | 'academics' | 'staff' | 'stores' | 'portals';

const tabs: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Overview', emoji: '🏠' },
  { key: 'finance', label: 'Fees & Finance', emoji: '💰' },
  { key: 'academics', label: 'Academics', emoji: '📚' },
  { key: 'staff', label: 'Staff & HR', emoji: '👨‍🏫' },
  { key: 'stores', label: 'Stores & Library', emoji: '📦' },
  { key: 'portals', label: 'Portal Users', emoji: '🔑' },
];

export default function DashboardTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-[24px] p-1.5 shadow-[0_4px_24px_rgba(20,50,120,0.06),0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
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
            className={`group relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all duration-200 flex-shrink-0 cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] scale-[1.02]'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 font-bold'
            }`}
          >
            <span className="text-sm select-none">{tab.emoji}</span>
            <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}


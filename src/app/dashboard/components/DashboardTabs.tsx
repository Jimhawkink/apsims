'use client';

export type TabKey = 'overview' | 'finance' | 'academics' | 'staff' | 'stores' | 'portals';

const tabs: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: 'overview', label: 'Overview', icon: '🏠', color: '#6366f1' },
  { key: 'finance', label: 'Fees & Finance', icon: '💰', color: '#10b981' },
  { key: 'academics', label: 'Academics', icon: '📚', color: '#3b82f6' },
  { key: 'staff', label: 'Staff & HR', icon: '👨‍🏫', color: '#ec4899' },
  { key: 'stores', label: 'Stores & Library', icon: '📦', color: '#f59e0b' },
  { key: 'portals', label: 'Portal Users', icon: '🔑', color: '#8b5cf6' },
];

export default function DashboardTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button key={tab.key} onClick={() => onTabChange(tab.key)}
            className="ultra-tab-btn group flex-shrink-0"
            style={{
              background: isActive ? `${tab.color}12` : 'transparent',
              borderColor: isActive ? `${tab.color}40` : 'transparent',
              color: isActive ? tab.color : '#6b7280',
            }}
          >
            <span className="text-sm group-hover:scale-110 transition-transform">{tab.icon}</span>
            <span className="text-[10px] font-semibold whitespace-nowrap">{tab.label}</span>
            {isActive && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: tab.color }} />}
          </button>
        );
      })}
    </div>
  );
}

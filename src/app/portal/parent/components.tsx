'use client';
import { FiCheckCircle, FiXCircle, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export const G = { blue:'linear-gradient(135deg,#2563eb,#3b82f6)', green:'linear-gradient(135deg,#059669,#0d9488)', red:'linear-gradient(135deg,#ef4444,#dc2626)', amber:'linear-gradient(135deg,#f59e0b,#d97706)', purple:'linear-gradient(135deg,#7c3aed,#8b5cf6)', teal:'linear-gradient(135deg,#0d9488,#14b8a6)' };
export const GC = { blue:'#2563eb', green:'#059669', red:'#ef4444', amber:'#f59e0b', purple:'#7c3aed', teal:'#0d9488' };

export const statusIcon = (s: string) => {
  const sl = (s||'').toLowerCase();
  if (sl === 'present') return <FiCheckCircle className="text-green-500" size={14} />;
  if (sl === 'absent') return <FiXCircle className="text-red-500" size={14} />;
  return <FiClock className="text-amber-500" size={14} />;
};

export const severityColor = (s: string) => {
  if (s === 'life_threatening') return 'bg-red-100 text-red-800';
  if (s === 'severe') return 'bg-orange-100 text-orange-800';
  if (s === 'moderate') return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
};

export const notifTypeIcon = (t: string) => {
  if (t === 'fee') return '💰'; if (t === 'result') return '📊';
  if (t === 'attendance') return '📅'; if (t === 'health') return '🏥';
  return '🔔';
};

// ═══════════ KPI CARD ═══════════
export function KPI({ label, value, emoji, color }: { label: string; value: string | number; emoji: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><span className="text-lg">{emoji}</span></div>
      <p className="text-lg font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

// ═══════════ ULTRA-MODERN TAB BUTTON ═══════════
const tabColors: Record<string, string> = {
  overview: '#7c3aed', fees: '#059669', results: '#2563eb', attendance: '#0d9488',
  discipline: '#ef4444', health: '#f59e0b', notifications: '#7c3aed',
};

export function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  const key = label.split(' ').pop()?.toLowerCase() || 'overview';
  const color = tabColors[key] || '#7c3aed';
  return (
    <button onClick={onClick} className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${
      active
        ? 'text-white shadow-lg scale-[1.03]'
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
    }`} style={active ? { background: color, boxShadow: `0 4px 14px ${color}40` } : {}}>
      {label}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white/50"/>}
    </button>
  );
}

// ═══════════ ULTRA-MODERN PAGE NAV ═══════════
export function PageNav({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4 pb-1">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
        className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-white border border-gray-200 shadow-sm hover:shadow hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <FiChevronLeft size={12}/> Prev
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setPage(p)}
            className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${p === page ? 'text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
            style={p === page ? { background: GC.purple } : {}}>
            {p}
          </button>
        ))}
      </div>
      <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page >= total}
        className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-white border border-gray-200 shadow-sm hover:shadow hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        Next <FiChevronRight size={12}/>
      </button>
    </div>
  );
}

// ═══════════ SECTION HEADER — Light & Faded ═══════════
export function SectionHeader({ title, emoji, gradient }: { title: string; emoji: string; gradient: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent">
      <h3 className="text-xs font-bold text-gray-600 flex items-center gap-1.5">{emoji} {title}</h3>
    </div>
  );
}

// ═══════════ ULTRA-MODERN DATA ROW ═══════════
export function DataRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-3.5 flex items-center gap-3 border-b border-gray-50/80 hover:bg-gradient-to-r hover:from-gray-50/40 hover:to-transparent transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
}

// ═══════════ ULTRA-MODERN PILL BADGE ═══════════
export function Pill({ text, color = 'blue' }: { text: string; color?: string }) {
  const styles: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${styles[color] || styles.blue}`}>{text}</span>
  );
}

// ═══════════ ULTRA-MODERN EMPTY STATE ═══════════
export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-14">
      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl bg-gray-50 border border-gray-100 mb-3">{emoji}</div>
      <p className="text-sm text-gray-400 font-medium">{text}</p>
    </div>
  );
}

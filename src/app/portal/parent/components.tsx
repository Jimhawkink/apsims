'use client';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

export const G = { blue: 'linear-gradient(135deg,#2563eb,#3b82f6)', green: 'linear-gradient(135deg,#059669,#0d9488)', red: 'linear-gradient(135deg,#ef4444,#dc2626)', amber: 'linear-gradient(135deg,#f59e0b,#d97706)', purple: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', teal: 'linear-gradient(135deg,#0d9488,#14b8a6)' };

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

export function KPI({ label, value, emoji, color }: { label: string; value: string | number; emoji: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><span className="text-lg">{emoji}</span></div>
      <p className="text-lg font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

export function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
  );
}

export function PageNav({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-40">← Prev</button>
      <span className="text-xs text-gray-500 font-bold">Page {page} of {total}</span>
      <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page >= total} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-40">Next →</button>
    </div>
  );
}

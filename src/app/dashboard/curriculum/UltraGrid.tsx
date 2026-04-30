'use client';
import React from 'react';
import { FiEdit2, FiTrash2, FiEye, FiCheck, FiX, FiSend, FiDownload, FiCopy, FiMoreHorizontal } from 'react-icons/fi';

interface Column {
  key: string;
  label: string;
  color?: string;
  bg?: string;
  render?: (val: any, row: any) => React.ReactNode;
  width?: string;
}

interface Action {
  label: string;
  icon?: any;
  color: string;
  bg: string;
  onClick: (row: any) => void;
  show?: (row: any) => boolean;
}

interface Props {
  columns: Column[];
  data: any[];
  actions?: Action[];
  keyField?: string;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  rowColor?: (row: any) => string;
}

const DEFAULT_COLORS = [
  { color: '#1e40af', bg: '#eff6ff' },
  { color: '#065f46', bg: '#ecfdf5' },
  { color: '#92400e', bg: '#fffbeb' },
  { color: '#991b1b', bg: '#fef2f2' },
  { color: '#5b21b6', bg: '#f5f3ff' },
  { color: '#155e75', bg: '#ecfeff' },
  { color: '#9f1239', bg: '#fff1f2' },
  { color: '#166534', bg: '#f0fdf4' },
];

export default function UltraGrid({ columns, data, actions, keyField = 'id', emptyMessage = 'No data found', onRowClick, rowColor }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col, i) => {
              const c = col.color ? { color: col.color, bg: col.bg || '#f9fafb' } : DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <th key={col.key} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                  style={{ color: c.color, backgroundColor: c.bg, borderRight: i < columns.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  {col.label}
                </th>
              );
            })}
            {actions && actions.length > 0 && (
              <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider" style={{ color: '#6b7280', backgroundColor: '#f3f4f6' }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-400 text-xs">{emptyMessage}</td></tr>
          ) : (
            data.map((row, ri) => (
              <tr key={row[keyField] || ri}
                className={`border-b border-gray-100 transition-all hover:shadow-sm ${onRowClick ? 'cursor-pointer' : ''} ${rowColor ? rowColor(row) : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {col.render ? col.render(row[col.key], row) : <span className="font-medium text-gray-700">{row[col.key] ?? '-'}</span>}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {actions.filter(a => !a.show || a.show(row)).map((act, ai) => {
                        const Icon = act.icon || FiMoreHorizontal;
                        return (
                          <button key={ai} onClick={() => act.onClick(row)} title={act.label}
                            className={`p-1.5 rounded-lg transition-all hover:scale-110`}
                            style={{ color: act.color, backgroundColor: act.bg }}>
                            <Icon size={13} />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status, map }: { status: string; map: Record<string, { color: string; bg: string }> }) {
  const s = map[status] || { color: '#6b7280', bg: '#f3f4f6' };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: s.color, backgroundColor: s.bg }}>{status}</span>;
}

export const STATUS_MAPS = {
  approval: { Pending: { color: '#b45309', bg: '#fffbeb' }, Approved: { color: '#15803d', bg: '#f0fdf4' }, Rejected: { color: '#b91c1c', bg: '#fef2f2' }, Draft: { color: '#6b7280', bg: '#f3f4f6' } },
  coverage: { 'On Track': { color: '#15803d', bg: '#f0fdf4' }, 'Behind': { color: '#b45309', bg: '#fffbeb' }, 'Critical': { color: '#b91c1c', bg: '#fef2f2' }, 'Complete': { color: '#1e40af', bg: '#eff6ff' } },
  inspection: { Scheduled: { color: '#1e40af', bg: '#eff6ff' }, 'In Progress': { color: '#b45309', bg: '#fffbeb' }, Completed: { color: '#15803d', bg: '#f0fdf4' }, 'Follow Up': { color: '#92400e', bg: '#fffbeb' } },
  lesson: { Draft: { color: '#6b7280', bg: '#f3f4f6' }, Submitted: { color: '#1e40af', bg: '#eff6ff' }, Approved: { color: '#15803d', bg: '#f0fdf4' }, Taught: { color: '#059669', bg: '#ecfdf5' } },
};

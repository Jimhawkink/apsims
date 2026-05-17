'use client';

import { useState, useMemo } from 'react';
import {
    FiSearch, FiX, FiChevronLeft, FiChevronRight,
    FiDownload, FiRefreshCw, FiMessageSquare,
} from 'react-icons/fi';

// ── Color tokens (matching ARMS style) ───────────────────────────────────────
const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    date:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    name:    { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    channel: { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    type:    { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    message: { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    status:  { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    cost:    { bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
};

const PAGE_SIZES = [10, 25, 50];

interface MessageLog {
    id: number;
    message: string;
    recipients?: string;
    recipient_count?: number;
    status?: string;
    sent_by?: string;
    sent_at?: string;
    message_type?: string;
    cost?: number;
    error_message?: string;
    created_at: string;
}

interface HistoryTabProps {
    messageLogs: MessageLog[];
    fetchData: () => void;
}

function ChannelBadge({ type }: { type: string }) {
    const t = (type || '').toLowerCase();
    const isWA = t.includes('whatsapp') || t === 'wa';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
            isWA ? 'bg-green-50 text-green-700 border-green-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
        }`}>
            {isWA ? '🟢 WhatsApp' : '💬 SMS'}
        </span>
    );
}

export default function HistoryTab({ messageLogs, fetchData }: HistoryTabProps) {
    const [search, setSearch] = useState('');
    const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'whatsapp'>('all');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    // ── Client-side filtering ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return messageLogs.filter(log => {
            const matchSearch = !search ||
                (log.recipients || '').toLowerCase().includes(search.toLowerCase()) ||
                (log.message || '').toLowerCase().includes(search.toLowerCase());
            const logType = (log.message_type || '').toLowerCase();
            const matchChannel =
                channelFilter === 'all' ||
                (channelFilter === 'whatsapp' && (logType.includes('whatsapp') || logType === 'wa')) ||
                (channelFilter === 'sms' && !logType.includes('whatsapp') && logType !== 'wa');
            return matchSearch && matchChannel;
        });
    }, [messageLogs, search, channelFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleChannelFilter = (val: 'all' | 'sms' | 'whatsapp') => {
        setChannelFilter(val);
        setPage(1);
    };

    // ── CSV Export ────────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const headers = ['#', 'Date', 'Recipients', 'Channel', 'Type', 'Message', 'Status', 'Cost', 'Sent By'];
        const rows = filtered.map((log, i) => [
            i + 1,
            new Date(log.created_at).toLocaleString('en-KE'),
            `"${(log.recipients || '').replace(/"/g, '""')}"`,
            (log.message_type || '').toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'SMS',
            log.message_type || 'Custom',
            `"${(log.message || '').replace(/"/g, '""').slice(0, 200)}"`,
            log.status || '',
            log.cost || 0,
            log.sent_by || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `message-history-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* ── Toolbar ── */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Search recipients, message…"
                            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                        />
                        {search && (
                            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                <FiX size={14} />
                            </button>
                        )}
                    </div>

                    {/* Channel filter */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                        {[
                            { k: 'all', l: 'All' },
                            { k: 'sms', l: '💬 SMS' },
                            { k: 'whatsapp', l: '🟢 WhatsApp' },
                        ].map(f => (
                            <button key={f.k} onClick={() => handleChannelFilter(f.k as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${channelFilter === f.k ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                {f.l}
                            </button>
                        ))}
                    </div>

                    {/* Page size */}
                    <select
                        value={pageSize}
                        onChange={e => handlePageSizeChange(Number(e.target.value))}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600"
                    >
                        {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
                    </select>

                    {/* Export */}
                    <button onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                        <FiDownload size={13} /> Export CSV
                    </button>

                    {/* Refresh */}
                    <button onClick={fetchData}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition">
                        <FiRefreshCw size={14} />
                    </button>

                    <p className="ml-auto text-xs font-bold text-gray-400">{filtered.length} messages</p>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                        <thead>
                            <tr>
                                {[
                                    { label: '#', col: C.num },
                                    { label: '📅 Date', col: C.date },
                                    { label: '👤 Recipients', col: C.name },
                                    { label: '📡 Channel', col: C.channel },
                                    { label: '🏷️ Type', col: C.type },
                                    { label: '💬 Message', col: C.message },
                                    { label: '✅ Status', col: C.status },
                                    { label: '💰 Cost', col: C.cost },
                                ].map((h, i) => (
                                    <th key={i}
                                        className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                        style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>
                                        {h.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FiMessageSquare size={40} className="text-gray-200" />
                                            <p className="text-sm font-medium">No messages yet</p>
                                            <p className="text-xs">Send your first message from the Compose tab</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.map((log, idx) => (
                                <tr key={log.id}
                                    className="transition-colors"
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                    {/* # */}
                                    <td className="px-3 py-3 text-center font-bold" style={{ background: C.num.bg + '60', color: C.num.text }}>
                                        {(page - 1) * pageSize + idx + 1}
                                    </td>
                                    {/* Date */}
                                    <td className="px-3 py-3 whitespace-nowrap font-semibold" style={{ background: C.date.bg + '60', color: C.date.text }}>
                                        {new Date(log.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(log.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </td>
                                    {/* Recipients */}
                                    <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                        <p className="font-bold text-gray-800 text-xs">{log.recipients || '—'}</p>
                                        {log.recipient_count != null && (
                                            <p className="text-[10px] text-gray-400">{log.recipient_count} recipient{log.recipient_count !== 1 ? 's' : ''}</p>
                                        )}
                                    </td>
                                    {/* Channel */}
                                    <td className="px-3 py-3" style={{ background: C.channel.bg + '60' }}>
                                        <ChannelBadge type={log.message_type || ''} />
                                    </td>
                                    {/* Type */}
                                    <td className="px-3 py-3" style={{ background: C.type.bg + '60' }}>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            {log.message_type || 'Custom'}
                                        </span>
                                    </td>
                                    {/* Message */}
                                    <td className="px-3 py-3 max-w-[220px]" style={{ background: C.message.bg + '60', color: C.message.text }}>
                                        <p className="truncate text-xs" title={log.message}>
                                            {(log.message || '').slice(0, 60)}{(log.message || '').length > 60 ? '…' : ''}
                                        </p>
                                    </td>
                                    {/* Status */}
                                    <td className="px-3 py-3" style={{ background: C.status.bg + '60' }}>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                            log.status === 'Sent' ? 'bg-green-50 text-green-700 border-green-200' :
                                            log.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200' :
                                            log.status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {log.status === 'Sent' ? '✅' : log.status === 'Failed' ? '❌' : log.status === 'Partial' ? '⚠️' : '⏳'} {log.status || 'Queued'}
                                        </span>
                                    </td>
                                    {/* Cost */}
                                    <td className="px-3 py-3 whitespace-nowrap font-bold" style={{ background: C.cost.bg + '60', color: C.cost.text }}>
                                        {(log.message_type || '').toLowerCase().includes('whatsapp') ? '—' : `KES ${(log.cost || 0).toFixed(2)}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                        <p className="text-xs text-gray-400">
                            {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                                aria-label="Previous page">
                                <FiChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, i, arr) => (
                                    <>
                                        {i > 0 && arr[i - 1] !== p - 1 && (
                                            <span key={`ellipsis-${p}`} className="text-gray-400 text-xs px-1">…</span>
                                        )}
                                        <button key={p} onClick={() => setPage(p)}
                                            className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all ${page === p ? 'bg-indigo-600 text-white shadow-md' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                            {p}
                                        </button>
                                    </>
                                ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                                aria-label="Next page">
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

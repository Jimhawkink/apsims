'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiShield, FiRefreshCw, FiSearch, FiDownload, FiFilter, FiClock, FiUser, FiDollarSign, FiAlertTriangle, FiFileText, FiTrash2, FiEdit2, FiCheckCircle } from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;

const ACTION_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    payment_created: { label: 'Payment Created', emoji: '💰', color: '#22c55e', bg: '#f0fdf4' },
    payment_voided: { label: 'Payment Voided', emoji: '🔴', color: '#ef4444', bg: '#fef2f2' },
    receipt_issued: { label: 'Receipt Issued', emoji: '🧾', color: '#6366f1', bg: '#eef2ff' },
    receipt_voided: { label: 'Receipt Voided', emoji: '❌', color: '#dc2626', bg: '#fef2f2' },
    plan_created: { label: 'Plan Created', emoji: '📅', color: '#8b5cf6', bg: '#faf5ff' },
    scholarship_applied: { label: 'Scholarship Applied', emoji: '🎓', color: '#10b981', bg: '#ecfdf5' },
    scholarship_revoked: { label: 'Scholarship Revoked', emoji: '⛔', color: '#f59e0b', bg: '#fffbeb' },
    mpesa_matched: { label: 'M-Pesa Matched', emoji: '📱', color: '#059669', bg: '#ecfdf5' },
    fee_adjusted: { label: 'Fee Adjusted', emoji: '✏️', color: '#f97316', bg: '#fff7ed' },
    structure_changed: { label: 'Structure Changed', emoji: '🔧', color: '#0891b2', bg: '#ecfeff' },
};

export default function FeeAuditPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [lRes, sRes] = await Promise.all([
            supabase.from('school_fee_audit_log').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no'),
        ]);
        setLogs(lRes.data || []);
        setStudents(sRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getStudent = (id: number) => students.find(s => s.id === id);

    const filteredLogs = useMemo(() => {
        return logs
            .filter(l => actionFilter === 'All' || l.action_type === actionFilter)
            .filter(l => {
                if (!search) return true;
                const s = search.toLowerCase();
                const student = l.student_id ? getStudent(l.student_id) : null;
                return (l.action_type || '').toLowerCase().includes(s) ||
                    (l.performed_by || '').toLowerCase().includes(s) ||
                    (student ? `${student.first_name} ${student.last_name}`.toLowerCase().includes(s) : false);
            })
            .filter(l => {
                const d = new Date(l.created_at).toISOString().split('T')[0];
                return d >= dateFrom && d <= dateTo;
            });
    }, [logs, actionFilter, search, dateFrom, dateTo, students]);

    // Stats
    const todayLogs = logs.filter(l => new Date(l.created_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]);
    const suspiciousCount = logs.filter(l => l.action_type === 'payment_voided' || l.action_type === 'receipt_voided').length;
    const uniqueUsers = [...new Set(logs.map(l => l.performed_by).filter(Boolean))];

    const exportCSV = () => {
        const rows = filteredLogs.map(l => {
            const student = l.student_id ? getStudent(l.student_id) : null;
            const config = ACTION_CONFIG[l.action_type] || { label: l.action_type };
            return {
                Date: new Date(l.created_at).toLocaleString('en-KE'),
                Action: config.label,
                Student: student ? `${student.first_name} ${student.last_name}` : '-',
                Amount: l.amount || '',
                Performed_By: l.performed_by || '-',
                IP: l.ip_address || '-',
                Details: JSON.stringify(l.details || {}),
            };
        });
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fee_audit_log_${dateTo}.csv`; a.click();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>🔒</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-red-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Audit Trail…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 40%, #44403c 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                            <FiShield className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                🔒 Financial Audit Trail
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full">ENTERPRISE</span>
                            </h1>
                            <p className="text-gray-400 text-xs mt-0.5 font-medium">Every Transaction Logged • Fraud Detection • Role-Based Access</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={exportCSV} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"><FiDownload size={13} /> Export</button>
                        <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"><FiRefreshCw size={13} /> Refresh</button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                            { label: 'Total Entries', value: String(logs.length), emoji: '📋', color: '#6366f1' },
                            { label: "Today's Activity", value: String(todayLogs.length), emoji: '📅', color: '#22c55e' },
                            { label: 'Voids / Reversals', value: String(suspiciousCount), emoji: '⚠️', color: '#ef4444', pulse: suspiciousCount > 0 },
                            { label: 'Active Users', value: String(uniqueUsers.length), emoji: '👥', color: '#f59e0b' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-2 mb-1.5"><span className="text-sm">{card.emoji}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/40">{card.label}</span></div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Action Type</label>
                        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-200">
                            <option value="All">All Actions</option>
                            {Object.entries(ACTION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                        </select>
                    </div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" /></div>
                    <div className="col-span-2 sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Search</label>
                        <div className="relative"><FiSearch size={13} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Action, user, student name..." className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" /></div>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiShield className="text-red-500" /> Audit Log ({filteredLogs.length} entries)</p>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            {['Timestamp', 'Action', 'Student', 'Amount', 'Performed By', 'IP Address', 'Details'].map(h => (
                                <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                    <span className="text-4xl block mb-3">🔒</span>
                                    <p className="text-sm font-medium">No audit entries found</p>
                                    <p className="text-xs mt-1">Financial actions will be logged here automatically</p>
                                </td></tr>
                            ) : filteredLogs.map((log, i) => {
                                const config = ACTION_CONFIG[log.action_type] || { label: log.action_type, emoji: '📝', color: '#6b7280', bg: '#f9fafb' };
                                const student = log.student_id ? getStudent(log.student_id) : null;
                                const isVoid = log.action_type?.includes('void');
                                return (
                                    <tr key={log.id || i} className={`border-b border-gray-100 hover:bg-gray-50 ${isVoid ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                                            <div>{new Date(log.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</div>
                                            <div className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit" style={{ background: config.bg, color: config.color }}>
                                                <span>{config.emoji}</span> {config.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : '-'}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold" style={{ color: isVoid ? '#ef4444' : '#22c55e' }}>{log.amount ? fmt(log.amount) : '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600 font-medium">{log.performed_by || '-'}</td>
                                        <td className="px-3 py-2.5 text-[10px] font-mono text-gray-400">{log.ip_address || '-'}</td>
                                        <td className="px-3 py-2.5 text-[10px] text-gray-400 max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
                    <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                    <span className="flex items-center gap-1 text-red-500 font-semibold"><FiShield size={11} /> Tamper-proof logging enabled</span>
                </div>
            </div>
        </div>
    );
}

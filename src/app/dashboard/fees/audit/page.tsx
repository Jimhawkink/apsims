'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiShield, FiRefreshCw, FiSearch, FiDownload, FiClock, FiUser, FiDollarSign, FiAlertTriangle, FiFileText, FiTrash2, FiEdit2, FiCheckCircle, FiFilter, FiLock } from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
    waiver_applied: { label: 'Waiver Applied', emoji: '🎁', color: '#db2777', bg: '#fdf2f8' },
    payment_reversed: { label: 'Payment Reversed', emoji: '↩️', color: '#dc2626', bg: '#fef2f2' },
    discount_added: { label: 'Discount Added', emoji: '🏷️', color: '#7c3aed', bg: '#faf5ff' },
    approval_granted: { label: 'Approval Granted', emoji: '✅', color: '#16a34a', bg: '#f0fdf4' },
};

function StatCard({ label, value, icon, color, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function FeeAuditPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [lRes, sRes] = await Promise.all([
            supabase.from('school_fee_audit_log').select('*').order('created_at', { ascending: false }).limit(1000),
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no'),
        ]);
        if (lRes.error) toast.error('Failed to load audit log');
        setLogs(lRes.data || []);
        setStudents(sRes.data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getStudent = (id: number) => students.find(s => s.id === id);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return logs.filter(l => {
            if (actionFilter !== 'All' && l.action_type !== actionFilter) return false;
            if (dateFrom && l.created_at < dateFrom) return false;
            if (dateTo && l.created_at > dateTo + 'T23:59:59') return false;
            if (q) {
                const s = getStudent(l.student_id);
                const sName = s ? `${s.first_name} ${s.last_name}`.toLowerCase() : '';
                const adm = s?.admission_number || s?.admission_no || '';
                if (!sName.includes(q) && !String(l.action_type || '').toLowerCase().includes(q) && !String(l.performed_by || '').toLowerCase().includes(q) && !adm.toLowerCase().includes(q) && !String(l.notes || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [logs, actionFilter, dateFrom, dateTo, search]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = logs.filter(l => l.created_at?.startsWith(today));
        const voidedCount = logs.filter(l => l.action_type?.includes('voided') || l.action_type?.includes('reversed')).length;
        const totalAmount = logs.filter(l => l.amount > 0).reduce((s, l) => s + Number(l.amount || 0), 0);
        const uniqueUsers = [...new Set(logs.map(l => l.performed_by).filter(Boolean))].length;
        return { todayLogs: todayLogs.length, voidedCount, totalAmount, uniqueUsers };
    }, [logs]);

    const exportCSV = () => {
        const rows = [['Timestamp', 'Action', 'Student', 'Adm No', 'Amount', 'Performed By', 'Notes']];
        filtered.forEach(l => {
            const s = getStudent(l.student_id);
            rows.push([fmtTime(l.created_at), l.action_type || '', s ? `${s.first_name} ${s.last_name}` : String(l.student_id || ''), s?.admission_number || s?.admission_no || '', String(l.amount || ''), l.performed_by || '', l.notes || '']);
        });
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `fee_audit_${dateFrom}_to_${dateTo}.csv`; a.click();
        toast.success('Exported!');
    };

    const actionTypes = ['All', ...Object.keys(ACTION_CONFIG)];

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading audit trail...</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#1e40af)' }}><FiShield size={18} /></span>
                        Fee Audit Trail
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Immutable log of all fee transactions &bull; Who did what, when &bull; Tamper-proof</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export CSV</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                </div>
            </div>

            {/* Immutable notice */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
                <FiLock className="text-indigo-500 shrink-0" size={16} />
                <p className="text-xs font-bold text-indigo-800">🔒 This audit trail is <u>read-only and tamper-proof</u>. All entries are generated automatically by system actions and cannot be manually edited or deleted. This ensures full financial accountability and compliance.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Today's Activity" value={String(stats.todayLogs)} icon={<FiClock size={18} />} color="linear-gradient(135deg,#4f46e5,#1e40af)" sub="audit events today" />
                <StatCard label="Voided / Reversed" value={String(stats.voidedCount)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#dc2626,#b91c1c)" sub="requires review" />
                <StatCard label="Total Logged Amount" value={fmt(stats.totalAmount)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#059669,#047857)" sub="all-time" />
                <StatCard label="Unique Users" value={String(stats.uniqueUsers)} icon={<FiUser size={18} />} color="linear-gradient(135deg,#7c3aed,#5b21b6)" sub="performed actions" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[180px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, user, action..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none max-w-[220px]">
                    {actionTypes.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : (ACTION_CONFIG[a]?.emoji || '') + ' ' + (ACTION_CONFIG[a]?.label || a)}</option>)}
                </select>
                <div className="flex items-center gap-1.5 text-sm">
                    <FiFilter size={13} className="text-gray-400" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                    <span className="text-gray-400">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                </div>
                <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length} / {logs.length} events</span>
            </div>

            {/* Action Type Summary Row */}
            {logs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(ACTION_CONFIG).map(([key, cfg]) => {
                        const count = logs.filter(l => l.action_type === key).length;
                        if (!count) return null;
                        return (
                            <button key={key} onClick={() => setActionFilter(actionFilter === key ? 'All' : key)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${actionFilter === key ? 'ring-2 ring-offset-1' : ''}`} style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
                                <span>{cfg.emoji}</span> {cfg.label} <span className="bg-white/60 px-1 rounded-full">{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Audit Log List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-14 text-center text-gray-400">
                        <FiShield size={32} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No audit events found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or date range</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(log => {
                            const cfg = ACTION_CONFIG[log.action_type] || { label: log.action_type, emoji: '📋', color: '#6b7280', bg: '#f9fafb' };
                            const student = getStudent(log.student_id);
                            const isExpanded = expandedId === log.id;
                            return (
                                <div key={log.id} className="px-4 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                                    <div className="flex items-start gap-3">
                                        {/* Action badge */}
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: cfg.bg }}>{cfg.emoji}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-extrabold text-gray-800">{cfg.label}</span>
                                                {log.amount > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{fmt(log.amount)}</span>}
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>{cfg.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                                                {student && <span className="flex items-center gap-1"><FiUser size={10} /><b className="text-gray-700">{student.first_name} {student.last_name}</b> ({student.admission_number || student.admission_no || 'N/A'})</span>}
                                                {log.performed_by && <span className="flex items-center gap-1"><FiShield size={10} /> by <b className="text-gray-700">{log.performed_by}</b></span>}
                                                <span className="flex items-center gap-1"><FiClock size={10} /> {fmtTime(log.created_at)}</span>
                                            </div>
                                            {log.notes && !isExpanded && <p className="text-xs text-gray-400 mt-0.5 truncate">{log.notes}</p>}
                                            {isExpanded && (
                                                <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
                                                    {log.notes && <p><b className="text-gray-600">Notes:</b> {log.notes}</p>}
                                                    {log.previous_value && <p><b className="text-gray-600">Previous Value:</b> {log.previous_value}</p>}
                                                    {log.new_value && <p><b className="text-gray-600">New Value:</b> {log.new_value}</p>}
                                                    {log.ip_address && <p><b className="text-gray-600">IP Address:</b> {log.ip_address}</p>}
                                                    {log.reference && <p><b className="text-gray-600">Reference:</b> {log.reference}</p>}
                                                    <p><b className="text-gray-600">Log ID:</b> #{log.id} &nbsp;|&nbsp; <b className="text-gray-600">Timestamp:</b> {fmtTime(log.created_at)}</p>
                                                    <p className="text-indigo-500 font-bold">🔒 This log entry cannot be modified or deleted.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="shrink-0">
                                            <span className="text-[10px] text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination notice */}
            {logs.length >= 1000 && (
                <div className="text-center text-xs text-gray-400 py-2">Showing last 1,000 entries. Use date filter to view older records.</div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiRefreshCw, FiSearch, FiCheck, FiX, FiDownload, FiFilter,
    FiLink, FiClock, FiAlertTriangle, FiCheckCircle, FiDollarSign,
    FiActivity, FiZap, FiArrowRight, FiPhone
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
type Tab = 'feed' | 'match' | 'report';

export default function MpesaReconciliationPage() {
    const [tab, setTab] = useState<Tab>('feed');
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [matchSearch, setMatchSearch] = useState('');
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [txRes, stRes, fpRes] = await Promise.all([
            supabase.from('school_mpesa_transactions').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, guardian_phone, status').eq('status', 'Active'),
            supabase.from('school_fee_payments').select('id, student_id, amount, payment_date, payment_method, receipt_number').order('payment_date', { ascending: false }).limit(200),
        ]);
        setTransactions(txRes.data || []);
        setStudents(stRes.data || []);
        setFeePayments(fpRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 30s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchAll]);

    // Stats
    const matched = transactions.filter(t => t.status === 'Matched');
    const pending = transactions.filter(t => t.status === 'Pending' || !t.status);
    const failed = transactions.filter(t => t.status === 'Failed');
    const totalReceived = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalMatched = matched.reduce((s, t) => s + Number(t.amount || 0), 0);
    const matchRate = transactions.length > 0 ? Math.round((matched.length / transactions.length) * 100) : 0;

    // Filtered transactions
    const filteredTx = useMemo(() => {
        return transactions
            .filter(t => statusFilter === 'All' || t.status === statusFilter || (!t.status && statusFilter === 'Pending'))
            .filter(t => {
                if (!search) return true;
                const s = search.toLowerCase();
                return (t.transaction_id || '').toLowerCase().includes(s) ||
                    (t.sender_name || '').toLowerCase().includes(s) ||
                    (t.phone || '').includes(s) ||
                    (t.account_reference || '').toLowerCase().includes(s);
            })
            .filter(t => {
                const td = new Date(t.created_at).toISOString().split('T')[0];
                return td >= dateFrom && td <= dateTo;
            });
    }, [transactions, statusFilter, search, dateFrom, dateTo]);

    // Student search for matching
    const matchStudents = useMemo(() => {
        if (!matchSearch) return [];
        const s = matchSearch.toLowerCase();
        return students.filter(st =>
            `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
            (st.admission_number || st.admission_no || '').toLowerCase().includes(s) ||
            (st.guardian_phone || '').includes(s)
        ).slice(0, 20);
    }, [students, matchSearch]);

    // Manual match
    const handleMatch = async (tx: any, studentId: number) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // 1. Update M-Pesa transaction
        const { error: txError } = await supabase.from('school_mpesa_transactions')
            .update({ status: 'Matched', student_id: studentId, matched_at: new Date().toISOString() })
            .eq('id', tx.id);
        if (txError) { toast.error('Failed to update transaction'); return; }

        // 2. Create fee payment record
        const { error: fpError } = await supabase.from('school_fee_payments').insert([{
            student_id: studentId,
            amount: tx.amount,
            payment_date: new Date(tx.created_at).toISOString().split('T')[0],
            payment_method: 'M-Pesa',
            receipt_number: tx.transaction_id,
            notes: `Auto-reconciled from M-Pesa: ${tx.transaction_id} - ${tx.sender_name}`,
        }]);
        if (fpError) { toast.error('Payment created but fee record failed'); return; }

        toast.success(`✅ Matched to ${student.first_name} ${student.last_name} — ${fmt(tx.amount)} recorded`);
        setSelectedTx(null);
        setMatchSearch('');
        fetchAll();
    };

    // Auto-match by admission number in account_reference
    const handleAutoMatch = async () => {
        const unmatchedTx = transactions.filter(t => t.status === 'Pending' || !t.status);
        let matchCount = 0;
        for (const tx of unmatchedTx) {
            const ref = (tx.account_reference || '').trim().toUpperCase();
            if (!ref) continue;
            const student = students.find(s =>
                (s.admission_number || '').toUpperCase() === ref ||
                (s.admission_no || '').toUpperCase() === ref
            );
            if (student) {
                await handleMatch(tx, student.id);
                matchCount++;
            }
        }
        if (matchCount === 0) toast('No auto-matches found — try manual matching');
        else toast.success(`🎯 Auto-matched ${matchCount} transactions!`);
    };

    const exportCSV = () => {
        const rows = filteredTx.map(t => {
            const student = t.student_id ? students.find(s => s.id === t.student_id) : null;
            return {
                Date: new Date(t.created_at).toLocaleString('en-KE'),
                Transaction_ID: t.transaction_id,
                Phone: t.phone,
                Sender: t.sender_name,
                Amount: t.amount,
                Reference: t.account_reference,
                Status: t.status || 'Pending',
                Matched_To: student ? `${student.first_name} ${student.last_name}` : '',
            };
        });
        const headers = Object.keys(rows[0] || {});
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mpesa_reconciliation_${dateTo}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const tabConfig = [
        { k: 'feed', l: '📡 Live Feed', icon: FiActivity },
        { k: 'match', l: '🔗 Manual Match', icon: FiLink },
        { k: 'report', l: '📊 Reconciliation', icon: FiDollarSign },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>💳</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-green-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading M-Pesa Reconciliation…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                            <FiDollarSign className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                💳 M-Pesa Auto-Reconciliation
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full shadow-sm">LIVE</span>
                            </h1>
                            <p className="text-green-300 text-xs mt-0.5 font-medium">Real-time Payment Matching • C2B Callbacks • Auto Fee Recording</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${autoRefresh ? 'bg-green-500 text-white' : 'text-white/80 hover:bg-white/10'}`}>
                            <FiRefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} /> {autoRefresh ? 'Auto ON' : 'Auto OFF'}
                        </button>
                        <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Received', value: fmt(totalReceived), emoji: '💰', color: '#22c55e' },
                            { label: 'Auto-Matched', value: `${matched.length}`, emoji: '✅', color: '#10b981' },
                            { label: 'Matched Amount', value: fmt(totalMatched), emoji: '🎯', color: '#059669' },
                            { label: 'Pending Match', value: `${pending.length}`, emoji: '⏳', color: '#f59e0b', pulse: pending.length > 0 },
                            { label: 'Failed', value: `${failed.length}`, emoji: '❌', color: '#ef4444', pulse: failed.length > 0 },
                            { label: 'Match Rate', value: `${matchRate}%`, emoji: '📊', color: matchRate >= 80 ? '#22c55e' : '#f59e0b' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={isActive ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(34,197,94,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            <Icon size={15} /> <span>{t.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══ LIVE FEED TAB ═══ */}
            {tab === 'feed' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Status</label>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-green-200 outline-none">
                                    {['All', 'Matched', 'Pending', 'Failed'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-200 outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-200 outline-none" /></div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Search</label>
                                <div className="relative"><FiSearch size={13} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Trans ID, phone, name..." className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-200 outline-none" /></div>
                            </div>
                            <div className="flex items-end gap-2">
                                <button onClick={handleAutoMatch} className="px-4 py-2.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                    <FiZap size={13} /> Auto-Match
                                </button>
                                <button onClick={exportCSV} className="px-3 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-1"><FiDownload size={13} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                    {['Time', 'Trans ID', 'Phone', 'Sender', 'Amount', 'Reference', 'Status', 'Matched To', 'Action'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {filteredTx.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                                            <span className="text-4xl block mb-3">💳</span>
                                            <p className="text-sm font-medium">No M-Pesa transactions found</p>
                                            <p className="text-xs mt-1">Transactions will appear here when parents pay via M-Pesa</p>
                                        </td></tr>
                                    ) : filteredTx.map(tx => {
                                        const student = tx.student_id ? students.find(s => s.id === tx.student_id) : null;
                                        const isPending = tx.status === 'Pending' || !tx.status;
                                        return (
                                            <tr key={tx.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isPending ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-3 py-2.5 text-xs font-mono text-gray-700">{tx.transaction_id || '-'}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-600">{tx.phone || '-'}</td>
                                                <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{tx.sender_name || '-'}</td>
                                                <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(tx.amount)}</td>
                                                <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{tx.account_reference || '-'}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.status === 'Matched' ? 'bg-green-100 text-green-700' : tx.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {tx.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-gray-600">{student ? `${student.first_name} ${student.last_name}` : '-'}</td>
                                                <td className="px-3 py-2.5">
                                                    {isPending && (
                                                        <button onClick={() => { setSelectedTx(tx); setTab('match'); }}
                                                            className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                                            <FiLink size={10} className="inline mr-1" /> Assign
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                            <span>Showing {filteredTx.length} of {transactions.length} transactions</span>
                            {autoRefresh && <span className="flex items-center gap-1 text-green-600 font-semibold"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Auto-refreshing every 30s</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MANUAL MATCH TAB ═══ */}
            {tab === 'match' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left: Unmatched Transactions */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-amber-50">
                            <p className="text-xs font-bold text-amber-700">⏳ Unmatched Payments ({pending.length})</p>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                            {pending.length === 0 ? (
                                <div className="p-10 text-center text-gray-400"><span className="text-3xl block mb-2">✅</span><p className="text-sm">All payments matched!</p></div>
                            ) : pending.map(tx => (
                                <div key={tx.id} onClick={() => setSelectedTx(tx)}
                                    className={`px-5 py-3 cursor-pointer hover:bg-indigo-50 transition-all ${selectedTx?.id === tx.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{tx.sender_name || tx.phone}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{tx.transaction_id} • {new Date(tx.created_at).toLocaleDateString('en-KE')}</p>
                                            {tx.account_reference && <p className="text-[10px] font-mono text-indigo-500 mt-0.5">Ref: {tx.account_reference}</p>}
                                        </div>
                                        <p className="text-lg font-black text-green-600">{fmt(tx.amount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Student Search */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-indigo-50">
                            <p className="text-xs font-bold text-indigo-700">🔍 Find Student to Match</p>
                        </div>
                        <div className="p-4">
                            {selectedTx ? (
                                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200">
                                    <p className="text-xs font-bold text-green-800">Selected Payment:</p>
                                    <p className="text-sm font-bold text-green-700">{selectedTx.sender_name} — {fmt(selectedTx.amount)}</p>
                                    <p className="text-[10px] text-green-600">{selectedTx.transaction_id}</p>
                                </div>
                            ) : (
                                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                                    <p className="text-xs text-gray-500">← Select an unmatched payment first</p>
                                </div>
                            )}

                            <div className="relative mb-3">
                                <FiSearch size={14} className="absolute left-3 top-3 text-gray-400" />
                                <input value={matchSearch} onChange={e => setMatchSearch(e.target.value)}
                                    placeholder="Search by name, admission no, or phone..."
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                            </div>

                            <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100">
                                {matchStudents.map(st => (
                                    <div key={st.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{st.first_name} {st.last_name}</p>
                                            <p className="text-[10px] text-gray-400">{st.admission_number || st.admission_no} • {st.guardian_phone || 'No phone'}</p>
                                        </div>
                                        <button onClick={() => selectedTx && handleMatch(selectedTx, st.id)} disabled={!selectedTx}
                                            className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                            <FiCheck size={10} className="inline mr-1" /> Match
                                        </button>
                                    </div>
                                ))}
                                {matchSearch && matchStudents.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 py-6">No students found matching "{matchSearch}"</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ RECONCILIATION REPORT TAB ═══ */}
            {tab === 'report' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Total M-Pesa Received', value: fmt(totalReceived), color: '#22c55e', bg: '#f0fdf4', icon: '💰' },
                            { label: 'Successfully Matched', value: fmt(totalMatched), color: '#059669', bg: '#ecfdf5', icon: '✅' },
                            { label: 'Variance (Unmatched)', value: fmt(totalReceived - totalMatched), color: totalReceived - totalMatched > 0 ? '#f59e0b' : '#22c55e', bg: '#fffbeb', icon: '⚠️' },
                        ].map((c, i) => (
                            <div key={i} className="rounded-2xl p-5 border shadow-sm" style={{ background: c.bg, borderColor: c.color + '30', borderLeftWidth: 4, borderLeftColor: c.color }}>
                                <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[10px] font-bold text-gray-500 uppercase">{c.label}</span></div>
                                <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Daily summary */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily M-Pesa Summary</p>
                            <button onClick={exportCSV} className="text-xs text-green-600 font-semibold flex items-center gap-1"><FiDownload size={12} /> Export All</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    {['Date', 'Transactions', 'Total Amount', 'Matched', 'Pending', 'Match Rate'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {(() => {
                                        const days: Record<string, any[]> = {};
                                        transactions.forEach(t => { const d = new Date(t.created_at).toISOString().split('T')[0]; if (!days[d]) days[d] = []; days[d].push(t); });
                                        return Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30).map(([day, txs]) => {
                                            const dayMatched = txs.filter(t => t.status === 'Matched').length;
                                            const dayPending = txs.filter(t => t.status === 'Pending' || !t.status).length;
                                            const rate = txs.length > 0 ? Math.round((dayMatched / txs.length) * 100) : 0;
                                            return (
                                                <tr key={day} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{new Date(day).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                                                    <td className="px-4 py-2.5 text-sm text-center font-bold text-indigo-600">{txs.length}</td>
                                                    <td className="px-4 py-2.5 text-sm font-bold text-green-600">{fmt(txs.reduce((s, t) => s + Number(t.amount || 0), 0))}</td>
                                                    <td className="px-4 py-2.5 text-center"><span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{dayMatched}</span></td>
                                                    <td className="px-4 py-2.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dayPending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{dayPending}</span></td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${rate}%`, background: rate >= 80 ? '#22c55e' : '#f59e0b' }} /></div>
                                                            <span className="text-xs font-bold text-gray-600 w-8 text-right">{rate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

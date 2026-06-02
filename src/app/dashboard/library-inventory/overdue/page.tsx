'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiAlertCircle, FiCheck, FiPrinter, FiBookOpen, FiSearch,
    FiRefreshCw, FiDownload, FiMessageSquare, FiFilter,
    FiChevronLeft, FiAlertTriangle, FiDollarSign, FiClock,
} from 'react-icons/fi';

const FINE_PER_DAY = 5; // KES 5 per day overdue

export default function OverdueBooksPage() {
    const [checkouts, setCheckouts] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [returning, setReturning] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterType, setFilterType] = useState('');
    const [sendingReminders, setSendingReminders] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [c, b] = await Promise.all([
            supabase.from('school_library_checkouts')
                .select('*,school_library_books(title,isbn,author)')
                .eq('status', 'Checked Out')
                .order('due_date'),
            supabase.from('school_library_books').select('id,available_copies'),
        ]);
        setCheckouts(c.data || []);
        setBooks(b.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const now = new Date();

    const getDaysOverdue = (dueDate: string) =>
        Math.max(0, Math.ceil((now.getTime() - new Date(dueDate).getTime()) / 86400000));

    const getSeverity = (days: number) => {
        if (days >= 30) return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: '#ef4444' };
        if (days >= 14) return { label: 'High', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', border: '#f97316' };
        if (days >= 7) return { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: '#f59e0b' };
        return { label: 'Low', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', border: '#eab308' };
    };

    const overdue = useMemo(() =>
        checkouts.filter(c => new Date(c.due_date) < now)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [checkouts]);

    const filtered = useMemo(() => {
        let list = overdue;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(c =>
                (c.borrower_name || '').toLowerCase().includes(q) ||
                (c.book_title || c.school_library_books?.title || '').toLowerCase().includes(q) ||
                (c.borrower_id || '').toLowerCase().includes(q)
            );
        }
        if (filterType) list = list.filter(c => c.borrower_type === filterType);
        if (filterSeverity) list = list.filter(c => getSeverity(getDaysOverdue(c.due_date)).label === filterSeverity);
        return list;
    }, [overdue, search, filterSeverity, filterType]);

    const stats = useMemo(() => ({
        critical: overdue.filter(c => getDaysOverdue(c.due_date) >= 30).length,
        high: overdue.filter(c => { const d = getDaysOverdue(c.due_date); return d >= 14 && d < 30; }).length,
        medium: overdue.filter(c => { const d = getDaysOverdue(c.due_date); return d >= 7 && d < 14; }).length,
        low: overdue.filter(c => getDaysOverdue(c.due_date) < 7).length,
        totalFines: overdue.reduce((s, c) => s + getDaysOverdue(c.due_date) * FINE_PER_DAY, 0),
    }), [overdue]);

    const handleReturn = async (checkout: any) => {
        if (!confirm(`Mark "${checkout.book_title || checkout.school_library_books?.title}" as returned?`)) return;
        setReturning(checkout.id);
        try {
            const { error } = await supabase.from('school_library_checkouts')
                .update({ status: 'Returned', return_date: now.toISOString().split('T')[0] })
                .eq('id', checkout.id);
            if (error) throw error;
            const book = books.find(b => b.id === checkout.book_id);
            if (book) await supabase.from('school_library_books')
                .update({ available_copies: (book.available_copies || 0) + 1 })
                .eq('id', book.id);
            toast.success('✅ Book returned successfully!');
            fetchAll();
        } catch (e: any) { toast.error(e.message); }
        setReturning(null);
    };

    const sendBulkReminders = async () => {
        const targets = filtered.filter(c => selectedIds.size === 0 || selectedIds.has(c.id));
        if (targets.length === 0) { toast.error('No records to send reminders to'); return; }
        setSendingReminders(true);
        let sent = 0;
        for (const c of targets) {
            if (!c.borrower_phone) continue;
            const days = getDaysOverdue(c.due_date);
            const fine = days * FINE_PER_DAY;
            const title = c.book_title || c.school_library_books?.title || 'a library book';
            const msg = `Dear ${c.borrower_name}, the library book "${title}" is ${days} days overdue. Accrued fine: KES ${fine}. Please return it immediately. - APSIMS Library`;
            try {
                await fetch('/api/send-sms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: c.borrower_phone, message: msg }),
                });
                sent++;
            } catch { /* continue */ }
            await new Promise(r => setTimeout(r, 200));
        }
        toast.success(`📱 Sent ${sent} reminder(s)`);
        setSendingReminders(false);
    };

    const exportCSV = () => {
        const rows = [
            ['#', 'Book Title', 'Borrower', 'Type', 'Checkout Date', 'Due Date', 'Days Overdue', 'Fine (KES)', 'Severity'],
            ...filtered.map((c, i) => {
                const days = getDaysOverdue(c.due_date);
                return [
                    i + 1,
                    c.book_title || c.school_library_books?.title || '—',
                    c.borrower_name,
                    c.borrower_type,
                    c.checkout_date,
                    c.due_date,
                    days,
                    days * FINE_PER_DAY,
                    getSeverity(days).label,
                ];
            })
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob([rows], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Overdue_Books_${now.toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('CSV exported!');
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-4 border-red-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-500 animate-spin" />
                    <FiBookOpen className="absolute inset-0 m-auto text-red-400" size={18} />
                </div>
                <p className="text-sm font-semibold text-gray-500">Loading overdue books...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ── Premium Header ── */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #ef4444 100%)' }}>
                <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href="/dashboard/library-inventory" className="text-red-300 hover:text-white text-xs flex items-center gap-1">
                                <FiChevronLeft size={11} /> Library
                            </Link>
                        </div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <FiAlertCircle size={20} /> Overdue Books
                        </h1>
                        <p className="text-red-200 text-sm mt-1">{overdue.length} overdue · Total fines accrued: KES {stats.totalFines.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={fetchAll} className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition">
                            <FiRefreshCw size={14} />
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                            <FiDownload size={13} /> Export CSV
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition">
                            <FiPrinter size={13} /> Print
                        </button>
                        <button onClick={sendBulkReminders} disabled={sendingReminders}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-red-700 rounded-xl text-xs font-black shadow-lg hover:shadow-xl disabled:opacity-60 transition">
                            {sendingReminders ? <FiRefreshCw size={13} className="animate-spin" /> : <FiMessageSquare size={13} />}
                            {sendingReminders ? 'Sending...' : 'Send SMS Reminders'}
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-px border-t border-white/10">
                    {[
                        { label: 'Critical (30d+)', val: stats.critical, color: '#fca5a5' },
                        { label: 'High (14-29d)', val: stats.high, color: '#fdba74' },
                        { label: 'Medium (7-13d)', val: stats.medium, color: '#fcd34d' },
                        { label: 'Low (<7d)', val: stats.low, color: '#fde68a' },
                        { label: 'Total Fines', val: `KES ${stats.totalFines.toLocaleString()}`, color: '#86efac' },
                    ].map((k, i) => (
                        <div key={i} className="bg-white/10 p-3 text-center">
                            <p className="text-white/50 text-[10px] font-bold uppercase">{k.label}</p>
                            <p className="font-black text-lg mt-0.5" style={{ color: k.color }}>{k.val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <FiSearch size={13} className="text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search borrower or book title..." className="text-sm outline-none bg-transparent flex-1" />
                </div>
                <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="">All Severity</option>
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="">All Types</option>
                    {['Student', 'Staff', 'Teacher'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {selectedIds.size > 0 && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                        {selectedIds.size} selected
                    </span>
                )}
                <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>

            {/* ── Table ── */}
            {overdue.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
                    <span className="text-5xl block mb-4">✅</span>
                    <p className="font-bold text-lg text-emerald-600">No Overdue Books!</p>
                    <p className="text-sm text-gray-400 mt-1">All library books have been returned on time</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 w-8 text-center" style={{ background: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
                                        <input type="checkbox" onChange={e => {
                                            if (e.target.checked) setSelectedIds(new Set(filtered.map(c => c.id)));
                                            else setSelectedIds(new Set());
                                        }} className="w-3.5 h-3.5" />
                                    </th>
                                    {['#', 'Book Title', 'Borrower', 'Type', 'Checkout', 'Due Date', 'Days', 'Fine (KES)', 'Severity', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            style={{ background: '#fef2f2', color: '#b91c1c', borderBottom: '2px solid #fecaca' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, i) => {
                                    const days = getDaysOverdue(c.due_date);
                                    const fine = days * FINE_PER_DAY;
                                    const sev = getSeverity(days);
                                    const title = c.book_title || c.school_library_books?.title || '—';
                                    const isSel = selectedIds.has(c.id);
                                    return (
                                        <tr key={c.id}
                                            className={`border-b border-gray-50 hover:bg-red-50/20 transition-colors ${isSel ? 'bg-red-50/30' : ''} ${days >= 30 ? 'bg-red-50/10' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <input type="checkbox" checked={isSel} onChange={() => toggleSelect(c.id)} className="w-3.5 h-3.5" />
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                                        <FiBookOpen size={12} className="text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 leading-tight">{title}</p>
                                                        {c.school_library_books?.author && (
                                                            <p className="text-[10px] text-gray-400">{c.school_library_books.author}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-800">{c.borrower_name}</p>
                                                {c.borrower_id && <p className="text-[10px] text-gray-400">{c.borrower_id}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold">
                                                    {c.borrower_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {new Date(c.checkout_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-red-600">
                                                {new Date(c.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <FiClock size={12} className="text-red-400" />
                                                    <span className="text-lg font-black text-red-600">{days}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-red-700">
                                                {fine > 0 ? `${fine.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${sev.bg} ${sev.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot} animate-pulse`} />
                                                    {sev.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => handleReturn(c)} disabled={returning === c.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition disabled:opacity-60 whitespace-nowrap">
                                                    {returning === c.id
                                                        ? <FiRefreshCw size={11} className="animate-spin" />
                                                        : <FiCheck size={11} />}
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Summary */}
                    <div className="px-5 py-3 bg-red-50 border-t border-red-100 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-red-700">
                            <FiAlertTriangle size={14} className="inline mr-1" />
                            {filtered.length} overdue book{filtered.length !== 1 ? 's' : ''} showing
                        </p>
                        <p className="text-sm font-black text-red-800 flex items-center gap-1">
                            <FiDollarSign size={14} />
                            Total Fines: KES {filtered.reduce((s, c) => s + getDaysOverdue(c.due_date) * FINE_PER_DAY, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

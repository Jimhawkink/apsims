'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiPlus, FiSearch, FiX, FiCheck, FiRefreshCw,
    FiDownload, FiAlertCircle, FiClock, FiArrowLeft, FiPrinter,
    FiRotateCcw, FiChevronDown, FiChevronUp, FiUser, FiCalendar,
} from 'react-icons/fi';

const FINE_PER_DAY = 5;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const TODAY = new Date().toISOString().split('T')[0];

function calcFine(dueDate: string): number {
    const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
    return Math.max(0, days) * FINE_PER_DAY;
}
function calcDaysOverdue(dueDate: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));
}
function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

type StatusFilter = 'all' | 'out' | 'overdue' | 'returned';
type BorrowerFilter = 'all' | 'Student' | 'Teacher' | 'Staff';

export default function CheckoutPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [checkouts, setCheckouts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modals
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState<any>(null);
    const [showRenewModal, setShowRenewModal] = useState<any>(null);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [borrowerFilter, setBorrowerFilter] = useState<BorrowerFilter>('all');

    // Issue form
    const [issueForm, setIssueForm] = useState({
        book_id: 0, borrower_name: '', borrower_type: 'Student',
        borrower_id: '', checkout_date: TODAY, due_date: addDays(TODAY, 14),
        loan_period: 14, notes: '',
    });

    // Return form
    const [waiveFine, setWaiveFine] = useState(false);
    const [waiveReason, setWaiveReason] = useState('');
    const [returnCondition, setReturnCondition] = useState('Good');

    // Renew form
    const [renewDays, setRenewDays] = useState(14);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [b, c, s] = await Promise.all([
            supabase.from('school_library_books').select('*').order('title'),
            supabase.from('school_library_checkouts').select('*').order('checkout_date', { ascending: false }),
            supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number').eq('status', 'Active').order('first_name'),
        ]);
        setBooks(b.data || []);
        setCheckouts(c.data || []);
        setStudents(s.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Derived stats
    const activeCheckouts = useMemo(() => checkouts.filter(c => c.status === 'Checked Out'), [checkouts]);
    const overdueCheckouts = useMemo(() => activeCheckouts.filter(c => new Date(c.due_date) < new Date()), [activeCheckouts]);
    const returnedToday = useMemo(() => checkouts.filter(c => c.return_date === TODAY), [checkouts]);
    const totalFines = useMemo(() => overdueCheckouts.reduce((s, c) => s + calcFine(c.due_date), 0), [overdueCheckouts]);
    const availableBooks = useMemo(() => books.filter(b => b.available_copies > 0).length, [books]);

    const filtered = useMemo(() => checkouts.filter(c => {
        const isOverdue = c.status === 'Checked Out' && new Date(c.due_date) < new Date();
        if (statusFilter === 'out' && c.status !== 'Checked Out') return false;
        if (statusFilter === 'overdue' && !isOverdue) return false;
        if (statusFilter === 'returned' && c.status !== 'Returned') return false;
        if (borrowerFilter !== 'all' && c.borrower_type !== borrowerFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (c.book_title || '').toLowerCase().includes(q) || (c.borrower_name || '').toLowerCase().includes(q) || (c.borrower_id || '').includes(q);
        }
        return true;
    }), [checkouts, statusFilter, borrowerFilter, search]);

    // ── ISSUE ──
    const handleIssue = async () => {
        if (!issueForm.book_id || !issueForm.borrower_name.trim()) { toast.error('Select a book and enter borrower name'); return; }
        const book = books.find(b => b.id === issueForm.book_id);
        if (!book || book.available_copies <= 0) { toast.error('No copies available'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_library_checkouts').insert([{
            book_id: issueForm.book_id, book_title: book.title,
            borrower_name: issueForm.borrower_name.trim(), borrower_type: issueForm.borrower_type,
            borrower_id: issueForm.borrower_id.trim() || null,
            checkout_date: issueForm.checkout_date, due_date: issueForm.due_date,
            status: 'Checked Out', notes: issueForm.notes || null, fine_amount: 0, renewed_count: 0,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_library_books').update({ available_copies: book.available_copies - 1 } as any).eq('id', book.id);
        toast.success(`📤 "${book.title}" issued to ${issueForm.borrower_name}`);
        setShowIssueModal(false);
        setIssueForm({ book_id: 0, borrower_name: '', borrower_type: 'Student', borrower_id: '', checkout_date: TODAY, due_date: addDays(TODAY, 14), loan_period: 14, notes: '' });
        setSaving(false); fetchAll();
    };

    // ── RETURN ──
    const handleReturn = async (checkout: any) => {
        setSaving(true);
        const fine = waiveFine ? 0 : calcFine(checkout.due_date);
        const { error } = await supabase.from('school_library_checkouts').update({
            status: 'Returned', return_date: TODAY, fine_amount: fine,
        } as any).eq('id', checkout.id);
        if (error) { toast.error(error.message); setSaving(false); return; }
        const book = books.find(b => b.id === checkout.book_id);
        if (book) await supabase.from('school_library_books').update({ available_copies: (book.available_copies || 0) + 1 } as any).eq('id', book.id);
        toast.success(`📥 "${checkout.book_title}" returned${fine > 0 ? ` — Fine: ${fmtKES(fine)}` : ''}`);
        setShowReturnModal(null); setWaiveFine(false); setWaiveReason(''); setReturnCondition('Good');
        setSaving(false); fetchAll();
    };

    // ── RENEW ──
    const handleRenew = async (checkout: any) => {
        setSaving(true);
        const newDue = addDays(checkout.due_date, renewDays);
        const { error } = await supabase.from('school_library_checkouts').update({
            due_date: newDue, renewed_count: (checkout.renewed_count || 0) + 1,
        } as any).eq('id', checkout.id);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(`🔄 Renewed ${renewDays} days → Due: ${fmtDate(newDue)}`);
        setShowRenewModal(null); setSaving(false); fetchAll();
    };

    // ── EXPORT ──
    const exportCSV = () => {
        const headers = ['#', 'Book', 'Borrower', 'Type', 'ID', 'Checkout', 'Due', 'Returned', 'Status', 'Fine (KES)'];
        const rows = filtered.map((c, i) => [i + 1, `"${c.book_title}"`, `"${c.borrower_name}"`, c.borrower_type, c.borrower_id || '', c.checkout_date, c.due_date, c.return_date || '', c.status, c.fine_amount || 0]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `checkouts_${TODAY}.csv`; a.click(); toast.success('Exported');
    };

    // ── PRINT RECEIPT ──
    const printReceipt = (checkout: any) => {
        const w = window.open('', '_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>Book Issue Receipt</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:20px;font-size:12px;color:#1e293b;max-width:400px;margin:0 auto;}
.h{text-align:center;border-bottom:3px double #0d9488;padding-bottom:12px;margin-bottom:16px;}
.hn{font-size:18px;font-weight:900;color:#0d9488;}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;}
.lbl{color:#64748b;font-size:11px;}.val{font-weight:700;}.warn{background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px;margin-top:12px;font-size:11px;}
.footer{margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;}
</style></head><body>
<div class="h"><p class="hn">📚 Library Book Issue</p><p style="font-size:11px;color:#64748b">APSIMS School Library</p></div>
<div class="row"><span class="lbl">Book Title</span><span class="val">${checkout.book_title}</span></div>
<div class="row"><span class="lbl">Borrower</span><span class="val">${checkout.borrower_name}</span></div>
<div class="row"><span class="lbl">Type</span><span class="val">${checkout.borrower_type}</span></div>
${checkout.borrower_id ? `<div class="row"><span class="lbl">Adm/ID</span><span class="val">${checkout.borrower_id}</span></div>` : ''}
<div class="row"><span class="lbl">Issue Date</span><span class="val">${fmtDate(checkout.checkout_date)}</span></div>
<div class="row"><span class="lbl">Due Date</span><span class="val" style="color:#dc2626">${fmtDate(checkout.due_date)}</span></div>
<div class="warn">⚠️ Return by <strong>${fmtDate(checkout.due_date)}</strong>. Late returns attract a fine of <strong>KES ${FINE_PER_DAY} per day</strong>.</div>
<div class="footer">Issued by Librarian · ${new Date().toLocaleString('en-KE')} · APSIMS Library System</div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`);
        w?.document.close();
    };

    const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-200 outline-none transition';

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>📖</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Checkouts…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ════ HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#1e40af 50%,#2563eb 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#818cf8,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                                <FiBookOpen className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    📖 Book Issue & Return
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>ULTRA</span>
                                </h1>
                                <p className="text-blue-300 text-xs mt-0.5 font-medium">Issue Books · Track Checkouts · Process Returns · Manage Fines</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => { setIssueForm({ book_id: 0, borrower_name: '', borrower_type: 'Student', borrower_id: '', checkout_date: TODAY, due_date: addDays(TODAY, 14), loan_period: 14, notes: '' }); setShowIssueModal(true); }}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                <FiPlus size={12} /> Issue Book
                            </button>
                            <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition">
                                <FiDownload size={12} /> Export
                            </button>
                            <button onClick={fetchAll} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Active Out', value: activeCheckouts.length, icon: '📤' },
                            { label: 'Overdue', value: overdueCheckouts.length, icon: '⚠️', pulse: overdueCheckouts.length > 0 },
                            { label: 'Returned Today', value: returnedToday.length, icon: '📥' },
                            { label: 'Fines Due', value: fmtKES(totalFines), icon: '💰', pulse: totalFines > 0 },
                            { label: 'Books Available', value: availableBooks, icon: '✅' },
                        ].map((c: any, i) => (
                            <div key={i} className={`rounded-xl p-3 ${c.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{c.icon}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span>
                                </div>
                                <p className="text-xl font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overdue alert */}
            {overdueCheckouts.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
                    <FiAlertCircle className="text-red-500 flex-shrink-0" size={16} />
                    <p className="text-sm font-bold text-red-700">
                        ⚠️ {overdueCheckouts.length} overdue book(s) — {fmtKES(totalFines)} in fines accumulating
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {([
                        { key: 'all', label: `All (${checkouts.length})` },
                        { key: 'out', label: `Out (${activeCheckouts.length})` },
                        { key: 'overdue', label: `Overdue (${overdueCheckouts.length})` },
                        { key: 'returned', label: `Returned` },
                    ] as { key: StatusFilter, label: string }[]).map(f => (
                        <button key={f.key} onClick={() => setStatusFilter(f.key)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                            style={statusFilter === f.key
                                ? { background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', boxShadow: '0 4px 15px -3px rgba(59,130,246,0.4)' }
                                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {f.label}
                        </button>
                    ))}
                    <select value={borrowerFilter} onChange={e => setBorrowerFilter(e.target.value as BorrowerFilter)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white outline-none">
                        <option value="all">All Types</option>
                        <option value="Student">Students</option>
                        <option value="Teacher">Teachers</option>
                        <option value="Staff">Staff</option>
                    </select>
                </div>
                <div className="relative min-w-[240px]">
                    <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search book or borrower…"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none bg-white" />
                </div>
            </div>

            {/* ════ TABLE ════ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Book', 'Borrower', 'Type', 'Checkout', 'Due Date', 'Status', 'Fine', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                                    <FiBookOpen className="mx-auto mb-2" size={28} />
                                    <p className="text-sm font-medium">No checkouts found</p>
                                </td></tr>
                            ) : filtered.map((c, idx) => {
                                const isOverdue = c.status === 'Checked Out' && new Date(c.due_date) < new Date();
                                const daysOver = isOverdue ? calcDaysOverdue(c.due_date) : 0;
                                const fine = isOverdue ? calcFine(c.due_date) : (c.fine_amount || 0);
                                const isExpanded = expandedRow === c.id;
                                return (
                                    <>
                                        <tr key={c.id}
                                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isOverdue ? 'bg-red-50/40 border-l-4 border-l-red-400' : ''}`}
                                            onClick={() => setExpandedRow(isExpanded ? null : c.id)}>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-3 py-2.5">
                                                <p className="text-sm font-semibold text-gray-800 max-w-[180px] truncate">{c.book_title}</p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="text-sm font-medium text-gray-700">{c.borrower_name}</p>
                                                {c.borrower_id && <p className="text-[10px] text-gray-400">{c.borrower_id}</p>}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.borrower_type === 'Student' ? 'bg-blue-100 text-blue-700' : c.borrower_type === 'Teacher' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {c.borrower_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDate(c.checkout_date)}</td>
                                            <td className="px-3 py-2.5">
                                                <p className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{fmtDate(c.due_date)}</p>
                                                {isOverdue && <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{daysOver}d late</span>}
                                                {c.return_date && <p className="text-[10px] text-green-600 font-semibold">↩ {fmtDate(c.return_date)}</p>}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'Returned' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {c.status === 'Returned' ? '✅ Returned' : isOverdue ? `⚠️ Overdue` : '📤 Out'}
                                                </span>
                                                {c.renewed_count > 0 && <p className="text-[9px] text-indigo-500 font-bold mt-0.5">↺ Renewed ×{c.renewed_count}</p>}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {fine > 0 ? <span className="text-xs font-black text-red-600">{fmtKES(fine)}</span> : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    {c.status === 'Checked Out' && (
                                                        <>
                                                            <button onClick={() => { setShowReturnModal(c); setWaiveFine(false); setWaiveReason(''); setReturnCondition('Good'); }}
                                                                className="px-2 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                                <FiCheck size={9} className="inline mr-0.5" />Return
                                                            </button>
                                                            <button onClick={() => { setShowRenewModal(c); setRenewDays(14); }}
                                                                className="p-1.5 rounded-lg hover:bg-indigo-50 transition" title="Renew">
                                                                <FiRotateCcw size={12} className="text-indigo-500" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => printReceipt(c)} className="p-1.5 rounded-lg hover:bg-gray-50 transition" title="Print">
                                                        <FiPrinter size={12} className="text-gray-400" />
                                                    </button>
                                                    <button onClick={() => setExpandedRow(isExpanded ? null : c.id)} className="p-1.5 rounded-lg hover:bg-gray-50 transition">
                                                        {isExpanded ? <FiChevronUp size={12} className="text-gray-400" /> : <FiChevronDown size={12} className="text-gray-400" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr key={`${c.id}-exp`} className="border-b border-gray-100 bg-blue-50/30">
                                                <td colSpan={9} className="px-6 py-3">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                                        <div><p className="text-gray-400 font-bold uppercase text-[9px]">Borrower ID/Adm</p><p className="font-semibold text-gray-700 mt-0.5">{c.borrower_id || '—'}</p></div>
                                                        <div><p className="text-gray-400 font-bold uppercase text-[9px]">Checkout Date</p><p className="font-semibold text-gray-700 mt-0.5">{fmtDate(c.checkout_date)}</p></div>
                                                        <div><p className="text-gray-400 font-bold uppercase text-[9px]">Times Renewed</p><p className="font-semibold text-gray-700 mt-0.5">{c.renewed_count || 0}</p></div>
                                                        <div><p className="text-gray-400 font-bold uppercase text-[9px]">Notes</p><p className="font-semibold text-gray-700 mt-0.5">{c.notes || '—'}</p></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                    <span>{filtered.length} record(s)</span>
                    <span>Outstanding Fines: <strong className="text-red-600">{fmtKES(totalFines)}</strong></span>
                </div>
            </div>

            {/* ════ ISSUE MODAL ════ */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowIssueModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiBookOpen /> Issue Book to Borrower</h3>
                            <button onClick={() => setShowIssueModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Book * (Available Only)</label>
                                <select value={issueForm.book_id} onChange={e => setIssueForm({ ...issueForm, book_id: Number(e.target.value) })} className={inputCls}>
                                    <option value={0}>Select a book…</option>
                                    {books.filter(b => b.available_copies > 0).map(b => (
                                        <option key={b.id} value={b.id}>{b.title} — {b.available_copies} copy available</option>
                                    ))}
                                </select>
                                {issueForm.book_id > 0 && (() => {
                                    const bk = books.find(b => b.id === issueForm.book_id);
                                    return bk ? (
                                        <div className="mt-2 p-2 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 font-medium">
                                            📚 {bk.category} · Shelf: {bk.shelf_location || '—'} · {bk.available_copies}/{bk.total_copies} available
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Student (from register)</label>
                                <select onChange={e => {
                                    const st = students.find(s => s.id === Number(e.target.value));
                                    if (st) setIssueForm(f => ({ ...f, borrower_name: `${st.first_name} ${st.last_name}`, borrower_id: st.admission_no || st.admission_number || '', borrower_type: 'Student' }));
                                }} className={inputCls}>
                                    <option value="">— Select student or type below —</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no || s.admission_number})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Borrower Name *</label>
                                    <input value={issueForm.borrower_name} onChange={e => setIssueForm({ ...issueForm, borrower_name: e.target.value })} className={inputCls} placeholder="Full name" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Type</label>
                                    <div className="flex gap-1">
                                        {['Student', 'Teacher', 'Staff'].map(t => (
                                            <button key={t} onClick={() => setIssueForm(f => ({ ...f, borrower_type: t }))}
                                                className="flex-1 py-2 text-[10px] font-bold rounded-lg transition"
                                                style={issueForm.borrower_type === t ? { background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff' } : { background: '#f8fafc', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Admission / Staff ID</label>
                                <input value={issueForm.borrower_id} onChange={e => setIssueForm({ ...issueForm, borrower_id: e.target.value })} className={inputCls} placeholder="e.g. ADM-2024-001" />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Loan Period</label>
                                <div className="flex gap-2">
                                    {[7, 14, 21, 30].map(d => (
                                        <button key={d} onClick={() => setIssueForm(f => ({ ...f, loan_period: d, due_date: addDays(f.checkout_date, d) }))}
                                            className="flex-1 py-2.5 text-xs font-bold rounded-xl transition"
                                            style={issueForm.loan_period === d ? { background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', boxShadow: '0 4px 12px -2px rgba(59,130,246,0.4)' } : { background: '#f8fafc', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                            {d} Days
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Checkout Date</label>
                                    <input type="date" value={issueForm.checkout_date} onChange={e => setIssueForm(f => ({ ...f, checkout_date: e.target.value, due_date: addDays(e.target.value, f.loan_period) }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Due Date (auto)</label>
                                    <div className="px-3 py-2.5 border border-gray-200 rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{fmtDate(issueForm.due_date)}</div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label>
                                <textarea value={issueForm.notes} onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} className={inputCls} rows={2} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={handleIssue} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                                {saving ? 'Issuing…' : '📤 Issue Book'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ RETURN MODAL ════ */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowReturnModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#166534,#22c55e)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiCheck /> Process Book Return</h3>
                            <button onClick={() => setShowReturnModal(null)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-1.5">
                                <p className="font-bold text-gray-800">📚 {showReturnModal.book_title}</p>
                                <p className="text-gray-600">👤 {showReturnModal.borrower_name} <span className="text-xs text-gray-400">({showReturnModal.borrower_type})</span></p>
                                <p className="text-gray-600">📅 Checked out: {fmtDate(showReturnModal.checkout_date)} → Due: {fmtDate(showReturnModal.due_date)}</p>
                            </div>

                            {calcDaysOverdue(showReturnModal.due_date) > 0 ? (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-xs font-bold text-red-700 uppercase">Fine Calculation</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-sm text-red-600">{calcDaysOverdue(showReturnModal.due_date)} days × KES {FINE_PER_DAY}/day</p>
                                        <p className="text-xl font-black text-red-700">{fmtKES(calcFine(showReturnModal.due_date))}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold">✅ Returned on time — No fine</div>
                            )}

                            {calcDaysOverdue(showReturnModal.due_date) > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <input type="checkbox" id="waive" checked={waiveFine} onChange={e => setWaiveFine(e.target.checked)} className="mt-0.5 rounded" />
                                    <div className="flex-1">
                                        <label htmlFor="waive" className="text-sm font-bold text-amber-800 cursor-pointer">Waive Fine</label>
                                        {waiveFine && (
                                            <input value={waiveReason} onChange={e => setWaiveReason(e.target.value)} className={`${inputCls} mt-2`} placeholder="Reason for waiving fine…" />
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Book Condition on Return</label>
                                <div className="flex gap-2">
                                    {['Good', 'Fair', 'Damaged'].map(c => (
                                        <button key={c} onClick={() => setReturnCondition(c)}
                                            className="flex-1 py-2 text-xs font-bold rounded-xl transition"
                                            style={returnCondition === c ? { background: c === 'Damaged' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#166534,#22c55e)', color: '#fff' } : { background: '#f8fafc', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowReturnModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                                <button onClick={() => handleReturn(showReturnModal)} disabled={saving}
                                    className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#166534,#22c55e)' }}>
                                    {saving ? 'Processing…' : `📥 Confirm Return${!waiveFine && calcFine(showReturnModal.due_date) > 0 ? ` (Fine: ${fmtKES(calcFine(showReturnModal.due_date))})` : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ RENEW MODAL ════ */}
            {showRenewModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowRenewModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiRotateCcw /> Renew Loan</h3>
                            <button onClick={() => setShowRenewModal(null)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-semibold text-gray-700">📚 {showRenewModal.book_title}</p>
                            <p className="text-xs text-gray-500">Current due: <strong className="text-red-600">{fmtDate(showRenewModal.due_date)}</strong></p>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Extend By</label>
                                <div className="flex gap-2">
                                    {[7, 14, 21, 30].map(d => (
                                        <button key={d} onClick={() => setRenewDays(d)}
                                            className="flex-1 py-2.5 text-xs font-bold rounded-xl transition"
                                            style={renewDays === d ? { background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff' } : { background: '#f8fafc', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                            +{d}d
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between text-sm">
                                <span className="text-indigo-700 font-semibold">New Due Date:</span>
                                <span className="font-black text-indigo-800">{fmtDate(addDays(showRenewModal.due_date, renewDays))}</span>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowRenewModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button onClick={() => handleRenew(showRenewModal)} disabled={saving}
                                    className="px-6 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}>
                                    {saving ? 'Renewing…' : '↺ Renew'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

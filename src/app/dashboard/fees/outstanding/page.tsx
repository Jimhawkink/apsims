'use client';

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt } from '../useFeeData';
import {
    FiSearch, FiUsers, FiDollarSign, FiDownload, FiPlus, FiAlertTriangle,
    FiChevronLeft, FiChevronRight, FiArrowLeft, FiPhone, FiFilter,
    FiX, FiCreditCard, FiFileText, FiMessageSquare, FiRefreshCw,
    FiChevronDown, FiChevronUp, FiArrowUp, FiArrowDown, FiSend,
    FiChevronsLeft, FiChevronsRight, FiPrinter,
} from 'react-icons/fi';

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
    num:    { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    adm:    { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    name:   { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    form:   { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    stream: { bg: '#ecfeff', text: '#0e7490', head: '#a5f3fc' },
    phone:  { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    paid:   { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    t1:     { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    t2:     { bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
    t3:     { bg: '#fef2f2', text: '#b91c1c', head: '#fecaca' },
    annual: { bg: '#fef2f2', text: '#991b1b', head: '#fca5a5' },
};

// ── Student avatar ────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
    const GRADS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)',
        'linear-gradient(135deg,#0891b2,#06b6d4)',
        'linear-gradient(135deg,#059669,#10b981)',
        'linear-gradient(135deg,#d97706,#f59e0b)',
        'linear-gradient(135deg,#dc2626,#ef4444)',
        'linear-gradient(135deg,#7c3aed,#a855f7)',
    ];
    const idx = (name.charCodeAt(0) || 0) % GRADS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, flexShrink: 0 }}>
            {initials || '?'}
        </div>
    );
}

// ── Balance badge ─────────────────────────────────────────────────────────────
function BalBadge({ amount, compact = false }: { amount: number; compact?: boolean }) {
    if (amount <= 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            ✅ PAID
        </span>
    );
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black border whitespace-nowrap ${compact ? 'text-[10px]' : 'text-xs'} bg-red-50 text-red-700 border-red-200`}>
            {fmt(amount)}
        </span>
    );
}

// ── SMS Modal ─────────────────────────────────────────────────────────────────
function SmsModal({ student, onClose }: { student: any; onClose: () => void }) {
    const [msg, setMsg] = useState(
        `Dear Parent/Guardian of ${student.first_name} ${student.last_name}, your fee balance of ${fmt(student.annualBalance)} is outstanding. Please pay promptly to avoid disruption. - AlphaSchool`
    );
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!student.guardian_phone) return toast.error('No phone number on record');
        setSending(true);
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: student.guardian_phone, message: msg, messageType: 'Fee Reminder' }),
            });
            const result = await res.json();
            if (result.success && result.status !== 'skipped') {
                toast.success('✅ SMS sent!');
                onClose();
            } else if (result.status === 'skipped') {
                toast.error('⚠️ SMS not configured. Go to Communication → SMS Config.');
            } else {
                toast.error(`❌ ${result.error || 'Failed to send'}`);
            }
        } catch (e: any) {
            toast.error(`❌ ${e.message}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    <div className="flex items-center gap-3">
                        <FiMessageSquare size={18} className="text-white" />
                        <div>
                            <p className="text-sm font-bold text-white">📱 Send Fee Reminder SMS</p>
                            <p className="text-white/60 text-[10px]">{student.first_name} {student.last_name} · {student.guardian_phone || 'No phone'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><FiX size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Message ({msg.length}/160)</label>
                        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} maxLength={320}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                        <button onClick={handleSend} disabled={sending || !student.guardian_phone}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                            {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</> : <><FiSend size={13} />Send SMS</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OutstandingFeesPage() {
    const { forms, streams, students, payments, structures, terms, loading, fetchAll, currentTerm, getFormName, getStreamName } = useFeeData();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterTerm, setFilterTerm] = useState('all'); // 'all' | '1' | '2' | '3'
    const [balanceRange, setBalanceRange] = useState('all'); // 'all' | 'below5k' | '5k-10k' | '10k-20k' | 'above20k' | 'custom'
    const [customMin, setCustomMin] = useState('');
    const [customMax, setCustomMax] = useState('');
    const [sortBy, setSortBy] = useState('highest'); // 'highest' | 'lowest' | 'nameAZ' | 'nameZA' | 'form'
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [smsStudent, setSmsStudent] = useState<any>(null);

    // ── Term lookup helpers ───────────────────────────────────────────────────
    const term1 = useMemo(() => terms.find(t => t.term_number === 1 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 1), [terms, currentTerm]);
    const term2 = useMemo(() => terms.find(t => t.term_number === 2 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 2), [terms, currentTerm]);
    const term3 = useMemo(() => terms.find(t => t.term_number === 3 && (currentTerm ? t.year === currentTerm.year : true)) || terms.find(t => t.term_number === 3), [terms, currentTerm]);

    // ── Per-term fee calculator ───────────────────────────────────────────────
    const getTermBalance = useCallback((studentId: number, formId: number | null, termId: number | undefined) => {
        if (!termId) return 0;
        const termPaid = payments.filter(p => p.student_id === studentId && p.term_id === termId).reduce((s, p) => s + Number(p.amount || 0), 0);
        const currentYear = new Date().getFullYear();
        const termFees = structures.filter(f =>
            (!f.form_id || f.form_id === formId) &&
            f.term_id === termId &&
            (!f.year || f.year === currentYear)
        ).reduce((s, f) => s + Number(f.amount || 0), 0);
        return Math.max(0, termFees - termPaid);
    }, [payments, structures]);

    // ── Build enriched outstanding list ──────────────────────────────────────
    const allOutstanding = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return students
            .filter(s => s.status === 'Active')
            .map(s => {
                const totalPaid = payments.filter(p => p.student_id === s.id).reduce((acc, p) => acc + Number(p.amount || 0), 0);
                const applicableFees = structures.filter(f => !f.form_id || f.form_id === s.form_id);
                let yearFees = applicableFees.filter(f => !f.year || f.year === currentYear);
                if (yearFees.length === 0 && applicableFees.length > 0) {
                    const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
                    yearFees = applicableFees.filter(f => !f.year || f.year === maxYear);
                }
                const annualTotal = yearFees.reduce((acc, f) => acc + Number(f.amount || 0), 0);
                const annualBalance = Math.max(0, annualTotal - totalPaid);
                const t1Bal = getTermBalance(s.id, s.form_id, term1?.id);
                const t2Bal = getTermBalance(s.id, s.form_id, term2?.id);
                const t3Bal = getTermBalance(s.id, s.form_id, term3?.id);
                const termBalance = currentTerm ? getTermBalance(s.id, s.form_id, currentTerm.id) : 0;
                return { ...s, totalPaid, annualTotal, annualBalance, termBalance, t1Bal, t2Bal, t3Bal };
            })
            .filter(s => s.annualBalance > 0 || s.termBalance > 0);
    }, [students, payments, structures, term1, term2, term3, currentTerm, getTermBalance]);

    // ── Apply filters ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = [...allOutstanding];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q) ||
                (s.guardian_phone || '').includes(q)
            );
        }

        // Form
        if (filterForm) list = list.filter(s => String(s.form_id) === filterForm);

        // Stream
        if (filterStream) list = list.filter(s => String(s.stream_id) === filterStream);

        // Term balance filter
        if (filterTerm === '1') list = list.filter(s => s.t1Bal > 0);
        else if (filterTerm === '2') list = list.filter(s => s.t2Bal > 0);
        else if (filterTerm === '3') list = list.filter(s => s.t3Bal > 0);

        // Balance range
        const bal = (s: any) => s.annualBalance;
        if (balanceRange === 'below5k') list = list.filter(s => bal(s) < 5000);
        else if (balanceRange === '5k-10k') list = list.filter(s => bal(s) >= 5000 && bal(s) < 10000);
        else if (balanceRange === '10k-20k') list = list.filter(s => bal(s) >= 10000 && bal(s) < 20000);
        else if (balanceRange === 'above20k') list = list.filter(s => bal(s) >= 20000);
        else if (balanceRange === 'custom') {
            const mn = Number(customMin) || 0;
            const mx = Number(customMax) || Infinity;
            list = list.filter(s => bal(s) >= mn && bal(s) <= mx);
        }

        // Sort
        if (sortBy === 'highest') list.sort((a, b) => b.annualBalance - a.annualBalance);
        else if (sortBy === 'lowest') list.sort((a, b) => a.annualBalance - b.annualBalance);
        else if (sortBy === 'nameAZ') list.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
        else if (sortBy === 'nameZA') list.sort((a, b) => `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`));
        else if (sortBy === 'form') list.sort((a, b) => (a.form_id || 0) - (b.form_id || 0));

        return list;
    }, [allOutstanding, search, filterForm, filterStream, filterTerm, balanceRange, customMin, customMax, sortBy]);

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    // ── Totals ────────────────────────────────────────────────────────────────
    const totals = useMemo(() => ({
        paid: filtered.reduce((s, r) => s + r.totalPaid, 0),
        t1: filtered.reduce((s, r) => s + r.t1Bal, 0),
        t2: filtered.reduce((s, r) => s + r.t2Bal, 0),
        t3: filtered.reduce((s, r) => s + r.t3Bal, 0),
        annual: filtered.reduce((s, r) => s + r.annualBalance, 0),
        allPaid: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    }), [filtered, payments]);

    // ── Active filter chips ───────────────────────────────────────────────────
    const chips: { label: string; clear: () => void }[] = [];
    if (search) chips.push({ label: `Search: "${search}"`, clear: () => { setSearch(''); setPage(1); } });
    if (filterForm) chips.push({ label: `Form: ${getFormName(Number(filterForm))}`, clear: () => { setFilterForm(''); setPage(1); } });
    if (filterStream) chips.push({ label: `Stream: ${streams.find(s => String(s.id) === filterStream)?.stream_name || ''}`, clear: () => { setFilterStream(''); setPage(1); } });
    if (filterTerm !== 'all') chips.push({ label: `Term ${filterTerm} defaulters`, clear: () => { setFilterTerm('all'); setPage(1); } });
    if (balanceRange !== 'all') chips.push({ label: balanceRange === 'custom' ? `Balance: ${customMin}–${customMax}` : `Balance: ${balanceRange}`, clear: () => { setBalanceRange('all'); setPage(1); } });

    const clearAll = () => { setSearch(''); setFilterForm(''); setFilterStream(''); setFilterTerm('all'); setBalanceRange('all'); setCustomMin(''); setCustomMax(''); setPage(1); };

    // ── Import CSV ────────────────────────────────────────────────────────────
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const text = await file.text(); const lines = text.split('\n').filter(Boolean);
        if (lines.length < 2) { toast.error('Empty file'); return; }
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const admIdx = headers.findIndex(h => h.includes('adm'));
        const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('balance') || h.includes('paid'));
        if (admIdx < 0 || amtIdx < 0) { toast.error('CSV must have adm no and amount columns'); return; }
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            const admNo = cols[admIdx]; const amount = Number(cols[amtIdx]);
            if (!admNo || isNaN(amount) || amount <= 0) continue;
            const student = students.find(s => (s.admission_no || s.admission_number || '') == admNo);
            if (!student) continue;
            const { error } = await supabase.from('school_fee_payments').insert([{
                student_id: student.id, amount, payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'Imported', receipt_number: `IMP-${Date.now().toString().slice(-6)}-${i}`,
                term_id: currentTerm?.id || null, year: new Date().getFullYear(),
            }]);
            if (!error) imported++;
        }
        toast.success(`${imported} records imported ✅`); fetchAll();
    };

    // ── Premium Excel/CSV Export ──────────────────────────────────────────────
    const exportExcel = async () => {
        const tid = toast.loading('Generating premium export…');
        try {
            // Try to use xlsx if available, otherwise rich CSV
            let xlsxLib: any = null;
            try { xlsxLib = await import('xlsx'); } catch { /* fall through to CSV */ }

            if (xlsxLib) {
                const XLSX = xlsxLib;
                const wb = XLSX.utils.book_new();

                // ── Sheet 1: Outstanding Fees ──────────────────────────────
                const schoolName = 'ALPHA SCHOOL';
                const termName = currentTerm ? `${currentTerm.term_name} ${currentTerm.year}` : 'All Terms';
                const genDate = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

                const ws1Data: any[][] = [
                    [`${schoolName} — OUTSTANDING FEES REPORT`, '', '', '', '', '', '', '', '', '', ''],
                    [`Generated: ${genDate}  |  Term: ${termName}  |  Students Owing: ${filtered.length}  |  Total Outstanding: ${fmt(totals.annual)}`, '', '', '', '', '', '', '', '', '', ''],
                    [],
                    ['#', 'Adm No', 'Student Name', 'Form', 'Stream', 'Guardian Phone', 'Total Paid (KES)', 'Term 1 Balance', 'Term 2 Balance', 'Term 3 Balance', 'Annual Balance'],
                    ...filtered.map((s, i) => [
                        i + 1,
                        s.admission_no || s.admission_number || '',
                        `${s.first_name} ${s.last_name}`,
                        getFormName(s.form_id),
                        getStreamName(s.stream_id),
                        s.guardian_phone || '',
                        s.totalPaid,
                        s.t1Bal,
                        s.t2Bal,
                        s.t3Bal,
                        s.annualBalance,
                    ]),
                    ['TOTALS', '', `${filtered.length} students`, '', '', '', totals.paid, totals.t1, totals.t2, totals.t3, totals.annual],
                ];

                const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

                // Column widths
                ws1['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

                // Merge title rows
                ws1['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
                ];

                // Style helper
                const headerStyle = (bg: string, color = 'FFFFFF') => ({
                    fill: { fgColor: { rgb: bg } },
                    font: { bold: true, color: { rgb: color }, sz: 11 },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } } },
                });

                // Title row style
                if (ws1['A1']) ws1['A1'].s = { fill: { fgColor: { rgb: 'B91C1C' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, alignment: { horizontal: 'center', vertical: 'center' } };
                if (ws1['A2']) ws1['A2'].s = { fill: { fgColor: { rgb: 'F3F4F6' } }, font: { italic: true, color: { rgb: '6B7280' }, sz: 10 }, alignment: { horizontal: 'center' } };

                // Header row (row 4, index 3)
                const headerColors = ['6D28D9', '7C3AED', '0F766E', '1D4ED8', '0E7490', '475569', '15803D', 'B45309', 'C2410C', 'B91C1C', '991B1B'];
                const headerCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
                headerCols.forEach((col, idx) => {
                    const cell = `${col}4`;
                    if (ws1[cell]) ws1[cell].s = headerStyle(headerColors[idx]);
                });

                // Data rows styling
                filtered.forEach((s, i) => {
                    const row = i + 5;
                    const isEven = i % 2 === 0;
                    const rowBg = isEven ? 'FFFFFF' : 'F9FAFB';
                    headerCols.forEach((col, ci) => {
                        const cell = `${col}${row}`;
                        if (!ws1[cell]) return;
                        const isBalCol = ci >= 6;
                        const val = ws1[cell].v;
                        const isZero = val === 0;
                        ws1[cell].s = {
                            fill: { fgColor: { rgb: rowBg } },
                            font: {
                                color: { rgb: isBalCol ? (isZero ? '15803D' : 'B91C1C') : '374151' },
                                bold: ci === 10,
                            },
                            alignment: { horizontal: ci >= 6 ? 'right' : 'left' },
                            numFmt: ci >= 6 ? '#,##0' : undefined,
                        };
                        if (ci >= 6 && isZero) ws1[cell].v = 'PAID';
                    });
                });

                // Totals row
                const totRow = filtered.length + 5;
                headerCols.forEach((col, ci) => {
                    const cell = `${col}${totRow}`;
                    if (ws1[cell]) ws1[cell].s = {
                        fill: { fgColor: { rgb: 'FEF08A' } },
                        font: { bold: true, color: { rgb: '92400E' }, sz: 11 },
                        alignment: { horizontal: ci >= 6 ? 'right' : 'left' },
                        numFmt: ci >= 6 ? '#,##0' : undefined,
                    };
                });

                XLSX.utils.book_append_sheet(wb, ws1, 'Outstanding Fees');

                // ── Sheet 2: Summary by Form ───────────────────────────────
                const byForm: Record<string, { count: number; total: number }> = {};
                filtered.forEach(s => {
                    const fn = getFormName(s.form_id);
                    if (!byForm[fn]) byForm[fn] = { count: 0, total: 0 };
                    byForm[fn].count++;
                    byForm[fn].total += s.annualBalance;
                });
                const ws2Data = [
                    ['OUTSTANDING FEES — SUMMARY BY FORM', '', ''],
                    [`Generated: ${genDate}`, '', ''],
                    [],
                    ['Form', 'Students Owing', 'Total Outstanding (KES)'],
                    ...Object.entries(byForm).map(([form, d]) => [form, d.count, d.total]),
                    ['TOTAL', filtered.length, totals.annual],
                ];
                const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
                ws2['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 24 }];
                ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }];
                if (ws2['A1']) ws2['A1'].s = { fill: { fgColor: { rgb: '1D4ED8' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, alignment: { horizontal: 'center' } };
                ['A4', 'B4', 'C4'].forEach((cell, ci) => {
                    if (ws2[cell]) ws2[cell].s = headerStyle(['1D4ED8', '059669', 'B91C1C'][ci]);
                });
                XLSX.utils.book_append_sheet(wb, ws2, 'Summary by Form');

                // ── Sheet 3: Payment History ───────────────────────────────
                const defaulterIds = new Set(filtered.map(s => s.id));
                const relevantPayments = payments.filter(p => defaulterIds.has(p.student_id));
                const ws3Data = [
                    ['PAYMENT HISTORY — FEE DEFAULTERS', '', '', '', '', ''],
                    [`Generated: ${genDate}`, '', '', '', '', ''],
                    [],
                    ['Date', 'Student Name', 'Adm No', 'Amount (KES)', 'Method', 'Receipt No'],
                    ...relevantPayments.map(p => {
                        const st = students.find(s => s.id === p.student_id);
                        return [
                            p.payment_date,
                            st ? `${st.first_name} ${st.last_name}` : '',
                            st ? (st.admission_no || st.admission_number || '') : '',
                            Number(p.amount || 0),
                            p.payment_method || '',
                            p.receipt_number || '',
                        ];
                    }),
                ];
                const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
                ws3['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
                ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];
                if (ws3['A1']) ws3['A1'].s = { fill: { fgColor: { rgb: '059669' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, alignment: { horizontal: 'center' } };
                ['A4', 'B4', 'C4', 'D4', 'E4', 'F4'].forEach(cell => {
                    if (ws3[cell]) ws3[cell].s = headerStyle('059669');
                });
                XLSX.utils.book_append_sheet(wb, ws3, 'Payment History');

                XLSX.writeFile(wb, `AlphaSchool_Outstanding_Fees_${new Date().toISOString().split('T')[0]}.xlsx`);
                toast.dismiss(tid);
                toast.success('✅ Premium Excel exported!');
            } else {
                // Fallback: rich CSV
                const headers = ['#', 'Adm No', 'Student Name', 'Form', 'Stream', 'Guardian Phone', 'Total Paid', 'Term 1 Balance', 'Term 2 Balance', 'Term 3 Balance', 'Annual Balance'];
                const rows = filtered.map((s, i) => [
                    i + 1,
                    s.admission_no || s.admission_number || '',
                    `"${s.first_name} ${s.last_name}"`,
                    getFormName(s.form_id),
                    getStreamName(s.stream_id),
                    s.guardian_phone || '',
                    s.totalPaid,
                    s.t1Bal,
                    s.t2Bal,
                    s.t3Bal,
                    s.annualBalance,
                ]);
                const csv = [
                    `"ALPHA SCHOOL — OUTSTANDING FEES REPORT"`,
                    `"Generated: ${new Date().toLocaleDateString('en-KE')} | Students: ${filtered.length} | Total Outstanding: ${fmt(totals.annual)}"`,
                    '',
                    headers.join(','),
                    ...rows.map(r => r.join(',')),
                    `"TOTALS","","${filtered.length} students","","","",${totals.paid},${totals.t1},${totals.t2},${totals.t3},${totals.annual}`,
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `AlphaSchool_Outstanding_Fees_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                toast.dismiss(tid);
                toast.success('✅ CSV exported! (Install xlsx package for Excel format)');
            }
        } catch (err: any) {
            toast.dismiss(tid);
            toast.error(`Export failed: ${err.message}`);
        }
    };

    // ── Pagination helpers ────────────────────────────────────────────────────
    const [jumpPage, setJumpPage] = useState('');
    const handleJump = () => {
        const n = parseInt(jumpPage);
        if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage(''); }
    };
    const pageNumbers = useMemo(() => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push('...');
            for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    }, [totalPages, safePage]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>💰</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-red-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-400">Loading Outstanding Fees…</p>
        </div>
    );

    return (
        <div className="space-y-5" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
            {smsStudent && <SmsModal student={smsStudent} onClose={() => setSmsStudent(null)} />}

            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#b91c1c 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle,#ef4444 0%,transparent 70%)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                            <FiAlertTriangle className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                ⚠️ Outstanding Fees
                                {filtered.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                                        {filtered.length} DEFAULTERS
                                    </span>
                                )}
                            </h1>
                            <p className="text-indigo-300 text-xs mt-0.5 font-medium">
                                {currentTerm ? `${currentTerm.term_name} ${currentTerm.year}` : 'All Terms'} · Per-term & annual balances · Premium export
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/fees" className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <FiArrowLeft size={13} /> Fee Dashboard
                        </Link>
                        <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition" title="Refresh">
                            <FiRefreshCw size={15} />
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Students Owing', value: filtered.length, emoji: '👤', color: '#ef4444' },
                            { label: 'Term 1 Outstanding', value: fmt(totals.t1), emoji: '📅', color: '#b45309' },
                            { label: 'Term 2 Outstanding', value: fmt(totals.t2), emoji: '📅', color: '#c2410c' },
                            { label: 'Term 3 Outstanding', value: fmt(totals.t3), emoji: '📅', color: '#b91c1c' },
                            { label: 'Annual Outstanding', value: fmt(totals.annual), emoji: '💸', color: '#991b1b', pulse: true },
                            { label: 'Total Collected', value: fmt(totals.allPaid), emoji: '✅', color: '#15803d' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden cursor-default group transition-all hover:scale-[1.03] ${(card as any).pulse ? 'ring-1 ring-red-400/40' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: card.color, transform: 'translate(30%,-30%)' }} />
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">{card.emoji}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-lg font-black text-white leading-tight">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ FILTER PANEL ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setFiltersOpen(o => !o)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-2.5">
                        <FiFilter size={15} className="text-indigo-500" />
                        <span className="text-sm font-bold text-gray-700">Filters & Search</span>
                        {chips.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">{chips.length} active</span>
                        )}
                    </div>
                    {filtersOpen ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
                </button>

                {filtersOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                        {/* Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                            {/* Search */}
                            <div className="relative lg:col-span-2">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search name, admission no, phone…"
                                    className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all" />
                                {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14} /></button>}
                            </div>
                            {/* Form */}
                            <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                            </select>
                            {/* Stream */}
                            <select value={filterStream} onChange={e => { setFilterStream(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="">All Streams</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Balance range */}
                            <select value={balanceRange} onChange={e => { setBalanceRange(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="all">All Balance Ranges</option>
                                <option value="below5k">Below KES 5,000</option>
                                <option value="5k-10k">KES 5,000 – 10,000</option>
                                <option value="10k-20k">KES 10,000 – 20,000</option>
                                <option value="above20k">Above KES 20,000</option>
                                <option value="custom">Custom Range…</option>
                            </select>
                            {/* Custom range inputs */}
                            {balanceRange === 'custom' && (
                                <div className="flex gap-2 lg:col-span-1">
                                    <input type="number" value={customMin} onChange={e => { setCustomMin(e.target.value); setPage(1); }} placeholder="Min KES"
                                        className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all" />
                                    <input type="number" value={customMax} onChange={e => { setCustomMax(e.target.value); setPage(1); }} placeholder="Max KES"
                                        className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all" />
                                </div>
                            )}
                            {/* Term filter */}
                            <select value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="all">All Terms</option>
                                <option value="1">Term 1 Defaulters</option>
                                <option value="2">Term 2 Defaulters</option>
                                <option value="3">Term 3 Defaulters</option>
                            </select>
                            {/* Sort */}
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="highest">Sort: Highest Balance</option>
                                <option value="lowest">Sort: Lowest Balance</option>
                                <option value="nameAZ">Sort: Name A → Z</option>
                                <option value="nameZA">Sort: Name Z → A</option>
                                <option value="form">Sort: By Form</option>
                            </select>
                            {/* Page size */}
                            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>
                        </div>

                        {/* Active chips + actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            {chips.map((chip, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {chip.label}
                                    <button onClick={chip.clear} className="hover:text-red-500 transition"><FiX size={11} /></button>
                                </span>
                            ))}
                            {chips.length > 0 && (
                                <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1">
                                    <FiX size={12} /> Clear All
                                </button>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <label className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition cursor-pointer flex items-center gap-1.5">
                                    <FiPlus size={13} /> Import CSV
                                    <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                                </label>
                                <button onClick={exportExcel}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:opacity-90 transition"
                                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                                    <FiDownload size={13} /> Export Excel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ DATA GRID ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-24 text-gray-300">
                        <span className="text-6xl block mb-3">✅</span>
                        <p className="font-bold text-lg text-gray-400">No outstanding fees found!</p>
                        <p className="text-sm text-gray-300 mt-1">All students are up to date with the current filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: '#', col: C.num, align: 'center' },
                                        { label: '🎓 Adm No', col: C.adm, align: 'left' },
                                        { label: '👤 Student Name', col: C.name, align: 'left' },
                                        { label: '📚 Form', col: C.form, align: 'left' },
                                        { label: '🏫 Stream', col: C.stream, align: 'left' },
                                        { label: '📞 Guardian Phone', col: C.phone, align: 'left' },
                                        { label: '✅ Total Paid', col: C.paid, align: 'right' },
                                        { label: '📅 Term 1 Bal', col: C.t1, align: 'right' },
                                        { label: '📅 Term 2 Bal', col: C.t2, align: 'right' },
                                        { label: '📅 Term 3 Bal', col: C.t3, align: 'right' },
                                        { label: '💸 Annual Bal', col: C.annual, align: 'right' },
                                        { label: '⚡ Actions', col: { bg: '#f8fafc', text: '#374151', head: '#e2e8f0' }, align: 'center' },
                                    ].map((h, i) => (
                                        <th key={i}
                                            className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-${h.align}`}
                                            style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((s, idx) => {
                                    const rowNum = (safePage - 1) * pageSize + idx + 1;
                                    const isEven = idx % 2 === 0;
                                    const rowBg = isEven ? '' : 'bg-gray-50/50';
                                    const admNo = s.admission_no || s.admission_number || '';
                                    return (
                                        <tr key={s.id} className={`${rowBg} hover:bg-indigo-50/30 transition-colors group`}
                                            style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            {/* # */}
                                            <td className="px-3 py-3 text-center font-bold" style={{ background: C.num.bg + '60', color: C.num.text }}>
                                                {rowNum}
                                            </td>
                                            {/* Adm No */}
                                            <td className="px-3 py-3" style={{ background: C.adm.bg + '60' }}>
                                                <span className="font-black text-indigo-600">{admNo}</span>
                                            </td>
                                            {/* Name */}
                                            <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar name={`${s.first_name} ${s.last_name}`} size={28} />
                                                    <div>
                                                        <p className="font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                                                        {s.guardian_name && <p className="text-[10px] text-gray-400">{s.guardian_name}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Form */}
                                            <td className="px-3 py-3 font-semibold" style={{ background: C.form.bg + '60', color: C.form.text }}>
                                                {getFormName(s.form_id)}
                                            </td>
                                            {/* Stream */}
                                            <td className="px-3 py-3 font-semibold" style={{ background: C.stream.bg + '60', color: C.stream.text }}>
                                                {getStreamName(s.stream_id)}
                                            </td>
                                            {/* Phone */}
                                            <td className="px-3 py-3" style={{ background: C.phone.bg + '60', color: C.phone.text }}>
                                                {s.guardian_phone ? (
                                                    <a href={`tel:${s.guardian_phone}`} className="flex items-center gap-1 hover:text-indigo-600 transition">
                                                        <FiPhone size={11} className="text-gray-400" />
                                                        {s.guardian_phone}
                                                    </a>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            {/* Total Paid */}
                                            <td className="px-3 py-3 text-right font-bold" style={{ background: C.paid.bg + '60', color: C.paid.text }}>
                                                {fmt(s.totalPaid)}
                                            </td>
                                            {/* Term 1 */}
                                            <td className="px-3 py-3 text-right" style={{ background: C.t1.bg + '60' }}>
                                                <BalBadge amount={s.t1Bal} compact />
                                            </td>
                                            {/* Term 2 */}
                                            <td className="px-3 py-3 text-right" style={{ background: C.t2.bg + '60' }}>
                                                <BalBadge amount={s.t2Bal} compact />
                                            </td>
                                            {/* Term 3 */}
                                            <td className="px-3 py-3 text-right" style={{ background: C.t3.bg + '60' }}>
                                                <BalBadge amount={s.t3Bal} compact />
                                            </td>
                                            {/* Annual Balance */}
                                            <td className="px-3 py-3 text-right" style={{ background: C.annual.bg + '60' }}>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-800 border border-red-200">
                                                    {fmt(s.annualBalance)}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-3 py-3">
                                                <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    {/* Pay Fees */}
                                                    <Link href={`/dashboard/fees/collect?adm=${admNo}`}
                                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                                                        title="Pay Fees">
                                                        <FiCreditCard size={13} />
                                                    </Link>
                                                    {/* Statement */}
                                                    <Link href={`/dashboard/fees/statements?student=${s.id}`}
                                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                                                        title="Student Statement">
                                                        <FiFileText size={13} />
                                                    </Link>
                                                    {/* Receipt */}
                                                    <Link href={`/dashboard/fees/payments?student=${s.id}`}
                                                        className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-200"
                                                        title="View Receipts">
                                                        <FiPrinter size={13} />
                                                    </Link>
                                                    {/* SMS */}
                                                    <button onClick={() => setSmsStudent(s)}
                                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
                                                        title="Send Fee Reminder SMS">
                                                        <FiMessageSquare size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* ── Sticky Totals Footer ── */}
                            <tfoot>
                                <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', position: 'sticky', bottom: 0 }}>
                                    <td colSpan={6} className="px-4 py-3">
                                        <span className="text-xs font-black text-white/90">
                                            TOTALS — {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                                            {chips.length > 0 && <span className="text-white/50 font-normal"> (filtered)</span>}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-emerald-300">{fmt(totals.paid)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-amber-300">{fmt(totals.t1)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-orange-300">{fmt(totals.t2)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-xs font-black text-red-300">{fmt(totals.t3)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="text-sm font-black text-white">{fmt(totals.annual)}</span>
                                    </td>
                                    <td className="px-3 py-3" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* ═══ ULTRA PAGINATION FOOTER ═══ */}
                {filtered.length > 0 && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Info */}
                        <div className="flex items-center gap-3">
                            <p className="text-xs font-semibold text-gray-500">
                                Showing <span className="font-black text-gray-800">{Math.min((safePage - 1) * pageSize + 1, filtered.length)}</span>
                                {' '}–{' '}
                                <span className="font-black text-gray-800">{Math.min(safePage * pageSize, filtered.length)}</span>
                                {' '}of{' '}
                                <span className="font-black text-indigo-700">{filtered.length}</span> students
                            </p>
                            <span className="text-[10px] text-gray-400">|</span>
                            <p className="text-xs text-gray-400">Page <span className="font-bold text-gray-600">{safePage}</span> of <span className="font-bold text-gray-600">{totalPages}</span></p>
                        </div>

                        {/* Page controls */}
                        <div className="flex items-center gap-1.5">
                            {/* First */}
                            <button onClick={() => setPage(1)} disabled={safePage === 1}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition" title="First page">
                                <FiChevronsLeft size={14} />
                            </button>
                            {/* Prev */}
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition" title="Previous page">
                                <FiChevronLeft size={14} />
                            </button>

                            {/* Page numbers */}
                            {pageNumbers.map((p, i) =>
                                p === '...' ? (
                                    <span key={`e${i}`} className="px-2 text-gray-400 text-xs">…</span>
                                ) : (
                                    <button key={p} onClick={() => setPage(p as number)}
                                        className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all ${safePage === p ? 'text-white shadow-md' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        style={safePage === p ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                                        {p}
                                    </button>
                                )
                            )}

                            {/* Next */}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition" title="Next page">
                                <FiChevronRight size={14} />
                            </button>
                            {/* Last */}
                            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition" title="Last page">
                                <FiChevronsRight size={14} />
                            </button>

                            {/* Jump to page */}
                            <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-xs text-gray-400">Go to</span>
                                <input type="number" value={jumpPage} onChange={e => setJumpPage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleJump()}
                                    min={1} max={totalPages} placeholder="pg"
                                    className="w-14 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-indigo-300 transition-all" />
                                <button onClick={handleJump}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition">
                                    Go
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

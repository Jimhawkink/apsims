'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiFilter, FiBookOpen, FiArrowDownLeft, FiArrowUpRight, FiDollarSign, FiTrendingUp } from 'react-icons/fi';

const fmt = (n: number) => 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d.split('T')[0]).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type Entry = {
    date: string;
    narration: string;
    reference: string;
    receipt: number;
    payment: number;
    source: 'fee_payment' | 'expense' | 'payroll';
    category: string;
    method?: string;
};

export default function CashBookPage() {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [accountFilter, setAccountFilter] = useState('All');
    const [openingBalance, setOpeningBalance] = useState(0);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [paymentsRes, expensesRes, payrollRes, termsRes] = await Promise.all([
                supabase.from('school_fee_payments')
                    .select('id, amount, payment_date, payment_method, receipt_number, reference_number, mpesa_code, bank_name, notes, student_id')
                    .order('payment_date', { ascending: true }),
                supabase.from('expenses')
                    .select('expense_id, expense_name, amount, expense_date, category, payment_mode, reference_no, created_by, description')
                    .order('expense_date', { ascending: true }),
                supabase.from('school_payroll')
                    .select('id, staff_name, net_pay, gross_pay, total_deductions, payment_date, pay_period, status, payment_method')
                    .eq('status', 'Paid')
                    .order('payment_date', { ascending: true }),
                supabase.from('school_terms').select('id, term_name, year, start_date, end_date, is_current').order('year').order('id'),
            ]);
            const termsData = termsRes.data || [];
            setTerms(termsData);
            const currentTerm = termsData.find(t => t.is_current);
            if (currentTerm && !selectedTerm) setSelectedTerm(String(currentTerm.id));

            const combined: Entry[] = [];

            // Fee Payments → RECEIPTS (money coming in)
            for (const p of paymentsRes.data || []) {
                const date = p.payment_date || '';
                combined.push({
                    date,
                    narration: `Fee Payment${p.notes ? ' — ' + p.notes : ''}`,
                    reference: p.receipt_number || p.reference_number || p.mpesa_code || '',
                    receipt: Number(p.amount || 0),
                    payment: 0,
                    source: 'fee_payment',
                    category: 'School Fees',
                    method: p.payment_method,
                });
            }

            // Expenses → PAYMENTS (money going out)
            for (const e of expensesRes.data || []) {
                const date = e.expense_date || '';
                combined.push({
                    date,
                    narration: `${e.expense_name || 'Expense'}${e.description ? ' — ' + e.description : ''}`,
                    reference: e.reference_no || '',
                    receipt: 0,
                    payment: Number(e.amount || 0),
                    source: 'expense',
                    category: e.category || 'General Expense',
                    method: e.payment_mode,
                });
            }

            // Payroll → PAYMENTS (wages / salaries paid out)
            for (const pr of payrollRes.data || []) {
                if (!pr.payment_date) continue;
                combined.push({
                    date: pr.payment_date,
                    narration: `Payroll — ${pr.staff_name || 'Staff'} (${pr.pay_period || ''})`,
                    reference: `PAY-${pr.id}`,
                    receipt: 0,
                    payment: Number(pr.net_pay || 0),
                    source: 'payroll',
                    category: 'Payroll / Salaries',
                    method: pr.payment_method,
                });
            }

            // Sort by date
            combined.sort((a, b) => a.date.localeCompare(b.date));
            setEntries(combined);
        } catch {
            toast.error('Failed to load cash book data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        return entries.filter(e => {
            const d = e.date.substring(0, 10);
            if (dateFrom && d < dateFrom) return false;
            if (dateTo && d > dateTo) return false;
            if (accountFilter !== 'All' && e.source !== accountFilter) return false;
            return true;
        });
    }, [entries, dateFrom, dateTo, accountFilter]);

    // Running balance
    const withBalance = useMemo(() => {
        let bal = openingBalance;
        return filtered.map(e => {
            bal += e.receipt - e.payment;
            return { ...e, balance: bal };
        });
    }, [filtered, openingBalance]);

    const totals = useMemo(() => {
        const totalReceipts = filtered.reduce((s, e) => s + e.receipt, 0);
        const totalPayments = filtered.reduce((s, e) => s + e.payment, 0);
        const closingBalance = openingBalance + totalReceipts - totalPayments;
        return { totalReceipts, totalPayments, closingBalance };
    }, [filtered, openingBalance]);

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, { receipts: number; payments: number }> = {};
        filtered.forEach(e => {
            if (!map[e.category]) map[e.category] = { receipts: 0, payments: 0 };
            map[e.category].receipts += e.receipt;
            map[e.category].payments += e.payment;
        });
        return Object.entries(map).sort((a, b) => (b[1].receipts + b[1].payments) - (a[1].receipts + a[1].payments));
    }, [filtered]);

    const printCashBook = () => {
        const rows = withBalance.map(e => `<tr>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px">${fmtDate(e.date)}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px">${e.narration}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:11px;color:#64748b">${e.reference}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:right;color:#16a34a;font-weight:700">${e.receipt > 0 ? fmt(e.receipt) : ''}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:right;color:#dc2626;font-weight:700">${e.payment > 0 ? fmt(e.payment) : ''}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:right;font-weight:800;color:${e.balance >= 0 ? '#1e293b' : '#dc2626'}">${fmt(e.balance)}</td>
        </tr>`).join('');
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Cash Book</title>
        <style>@page{size:A4 landscape;margin:15mm} body{font-family:Arial,sans-serif;font-size:13px} h2{margin:0 0 4px;color:#1e293b} .meta{color:#64748b;font-size:11px;margin-bottom:16px} table{width:100%;border-collapse:collapse} th{background:#1e293b;color:#fff;padding:8px 10px;font-size:11px;text-align:left} .total-row{background:#f1f5f9;font-weight:900}</style>
        </head><body>
        <h2>📒 SCHOOL CASH BOOK</h2>
        <p class="meta">Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-KE')}</p>
        <table>
        <thead><tr><th>Date</th><th>Narration</th><th>Reference</th><th style="text-align:right">Receipts (DR)</th><th style="text-align:right">Payments (CR)</th><th style="text-align:right">Balance</th></tr></thead>
        <tbody>
        <tr class="total-row"><td colspan="3" style="padding:6px 10px;border:1px solid #e2e8f0">Opening Balance</td><td colspan="2"></td><td style="text-align:right;padding:6px 10px;border:1px solid #e2e8f0">${fmt(openingBalance)}</td></tr>
        ${rows}
        <tr class="total-row"><td colspan="3" style="padding:8px 10px;border:2px solid #1e293b">TOTALS</td>
        <td style="text-align:right;padding:8px 10px;border:2px solid #1e293b;color:#16a34a">${fmt(totals.totalReceipts)}</td>
        <td style="text-align:right;padding:8px 10px;border:2px solid #1e293b;color:#dc2626">${fmt(totals.totalPayments)}</td>
        <td style="text-align:right;padding:8px 10px;border:2px solid #1e293b">${fmt(totals.closingBalance)}</td></tr>
        </tbody></table>
        </body></html>`);
        setTimeout(() => w.print(), 400);
        toast.success('Cash book sent to printer');
    };

    const exportCSV = () => {
        const rows = [['Date', 'Narration', 'Reference', 'Source', 'Category', 'Method', 'Receipts', 'Payments', 'Balance']];
        withBalance.forEach(e => rows.push([fmtDate(e.date), e.narration, e.reference, e.source, e.category, e.method || '', String(e.receipt), String(e.payment), String(e.balance)]));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `cashbook_${dateFrom}_to_${dateTo}.csv`; a.click();
        toast.success('Cash book exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading cash book from transactions...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiBookOpen size={18} /></span>
                        Cash Book
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Live data — fee payments, expenses, payroll &bull; Auto running balance</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export CSV</button>
                    <button onClick={printCashBook} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-800 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Receipts</p>
                    <p className="text-xl font-extrabold text-emerald-700">{fmt(totals.totalReceipts)}</p>
                    <p className="text-xs text-gray-400">money in &bull; {filtered.filter(e => e.receipt > 0).length} entries</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Total Payments</p>
                    <p className="text-xl font-extrabold text-red-700">{fmt(totals.totalPayments)}</p>
                    <p className="text-xs text-gray-400">money out &bull; {filtered.filter(e => e.payment > 0).length} entries</p>
                </div>
                <div className={`bg-white rounded-xl p-4 border shadow-sm ${totals.closingBalance >= 0 ? 'border-indigo-200' : 'border-red-300'}`}>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Closing Balance</p>
                    <p className={`text-xl font-extrabold ${totals.closingBalance >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{fmt(totals.closingBalance)}</p>
                    <p className="text-xs text-gray-400">after {filtered.length} entries</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <FiDollarSign size={13} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Opening Balance</span>
                    </div>
                    <input type="number" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value))} className="w-full text-lg font-extrabold text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-indigo-400 focus:outline-none py-1" />
                    <p className="text-[10px] text-gray-400 mt-1">Set manually if needed</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center shadow-sm">
                <FiFilter size={13} className="text-gray-400" />
                <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-[10px] font-bold text-gray-400">From:</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                    <span className="text-gray-400">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                </div>
                <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                    <option value="All">All Sources</option>
                    <option value="fee_payment">Fee Payments Only</option>
                    <option value="expense">Expenses Only</option>
                    <option value="payroll">Payroll Only</option>
                </select>
                <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length} entries</span>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Category Summary</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {categoryBreakdown.slice(0, 8).map(([cat, vals]) => (
                            <div key={cat} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 truncate">{cat}</p>
                                {vals.receipts > 0 && <p className="text-sm font-extrabold text-emerald-600">+{fmt(vals.receipts)}</p>}
                                {vals.payments > 0 && <p className="text-sm font-extrabold text-red-600">−{fmt(vals.payments)}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cash Book Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                {['Date', 'Narration', 'Reference', 'Source', 'Category', 'Method', 'Receipts (DR)', 'Payments (CR)', 'Balance'].map(h => (
                                    <th key={h} className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider ${['Receipts (DR)', 'Payments (CR)', 'Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening Balance Row */}
                            <tr className="bg-indigo-50 border-b-2 border-indigo-200">
                                <td colSpan={5} className="px-3 py-2 text-xs font-extrabold text-indigo-700">Opening Balance</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-right font-extrabold text-indigo-700">{fmt(openingBalance)}</td>
                            </tr>
                            {withBalance.length === 0 && (
                                <tr><td colSpan={9} className="py-12 text-center text-gray-400"><FiBookOpen size={28} className="mx-auto mb-2 text-gray-300" /><p>No transactions in selected period</p></td></tr>
                            )}
                            {withBalance.map((e, i) => (
                                <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${e.receipt > 0 ? 'hover:bg-emerald-50/20' : 'hover:bg-red-50/10'}`}>
                                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                                    <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[200px]"><span className="truncate block">{e.narration}</span></td>
                                    <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{e.reference || '—'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${e.source === 'fee_payment' ? 'bg-emerald-100 text-emerald-700' : e.source === 'payroll' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {e.source === 'fee_payment' ? 'Fee' : e.source === 'payroll' ? 'Payroll' : 'Expense'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">{e.category}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-400">{e.method || '—'}</td>
                                    <td className="px-3 py-2.5 text-right font-extrabold text-emerald-600">{e.receipt > 0 ? fmt(e.receipt) : ''}</td>
                                    <td className="px-3 py-2.5 text-right font-extrabold text-red-600">{e.payment > 0 ? fmt(e.payment) : ''}</td>
                                    <td className={`px-3 py-2.5 text-right font-extrabold text-sm ${e.balance >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{fmt(e.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {withBalance.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-800 text-white">
                                    <td colSpan={6} className="px-3 py-3 font-extrabold uppercase tracking-wider">CLOSING BALANCE</td>
                                    <td className="px-3 py-3 text-right font-extrabold text-emerald-400">{fmt(totals.totalReceipts)}</td>
                                    <td className="px-3 py-3 text-right font-extrabold text-red-400">{fmt(totals.totalPayments)}</td>
                                    <td className={`px-3 py-3 text-right font-extrabold text-xl ${totals.closingBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(totals.closingBalance)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}

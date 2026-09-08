'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiTrendingUp, FiTrendingDown, FiDollarSign, FiFilter } from 'react-icons/fi';

const fmt = (n: number) => 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PLStatementPage() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [expensesData, setExpensesData] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [pRes, eRes, prRes, tRes, fsRes] = await Promise.all([
            supabase.from('school_fee_payments').select('amount, payment_date, payment_method').order('payment_date'),
            supabase.from('expenses').select('amount, expense_date, category, expense_name, expense_type').order('expense_date'),
            supabase.from('school_payroll').select('net_pay, gross_pay, paye, nhif, nssf, housing_levy, payment_date, pay_period, status, staff_name').eq('status', 'Paid').order('payment_date'),
            supabase.from('school_terms').select('id,term_name,year,start_date,end_date,is_current').order('year').order('id'),
            supabase.from('school_fee_structures').select('amount, category, form_id, term_id').order('category'),
        ]);
        setPayments(pRes.data || []);
        setExpensesData(eRes.data || []);
        setPayrollData(prRes.data || []);
        setTerms(tRes.data || []);
        setFeeStructures(fsRes.data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const inRange = (dateStr: string) => {
        if (!dateStr) return false;
        const d = dateStr.substring(0, 10);
        return d >= dateFrom && d <= dateTo;
    };

    // ── INCOME SECTION ──────────────────────────────────────────
    const incomeLines = useMemo(() => {
        const filtered = payments.filter(p => inRange(p.payment_date));
        // Group by payment method
        const byMethod: Record<string, number> = {};
        filtered.forEach(p => {
            const m = p.payment_method || 'Other';
            byMethod[m] = (byMethod[m] || 0) + Number(p.amount || 0);
        });
        const lines = Object.entries(byMethod).map(([method, total]) => ({
            item: `School Fees — ${method}`,
            amount: total,
            category: 'School Fees',
        }));
        return { lines, total: filtered.reduce((s, p) => s + Number(p.amount || 0), 0) };
    }, [payments, dateFrom, dateTo]);

    // ── EXPENSE SECTION ──────────────────────────────────────────
    const expenseLines = useMemo(() => {
        const filtered = expensesData.filter(e => inRange(e.expense_date));
        const byCategory: Record<string, number> = {};
        filtered.forEach(e => {
            const cat = e.category || e.expense_type || 'General';
            byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0);
        });
        return { lines: Object.entries(byCategory).map(([cat, amt]) => ({ item: cat, amount: amt })), total: filtered.reduce((s, e) => s + Number(e.amount || 0), 0) };
    }, [expensesData, dateFrom, dateTo]);

    // ── PAYROLL EXPENSE ──────────────────────────────────────────
    const payrollLines = useMemo(() => {
        const filtered = payrollData.filter(p => inRange(p.payment_date));
        const totalGross = filtered.reduce((s, p) => s + Number(p.gross_pay || 0), 0);
        const totalPAYE = filtered.reduce((s, p) => s + Number(p.paye || 0), 0);
        const totalNHIF = filtered.reduce((s, p) => s + Number(p.nhif || 0), 0);
        const totalNSSF = filtered.reduce((s, p) => s + Number(p.nssf || 0), 0);
        const totalNet = filtered.reduce((s, p) => s + Number(p.net_pay || 0), 0);
        return {
            lines: [
                { item: 'Staff Gross Salaries', amount: totalGross },
                { item: 'PAYE Deducted (Staff)', amount: totalPAYE },
                { item: 'NHIF / SHA Contributions', amount: totalNHIF },
                { item: 'NSSF Contributions', amount: totalNSSF },
            ].filter(l => l.amount > 0),
            total: totalNet,
            gross: totalGross,
        };
    }, [payrollData, dateFrom, dateTo]);

    const totalIncome = incomeLines.total;
    const totalExpenses = expenseLines.total + payrollLines.total;
    const netProfit = totalIncome - totalExpenses;
    const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const printPL = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        const incomeRows = incomeLines.lines.map(l => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${l.item}</td><td style="padding:6px 12px;text-align:right;font-weight:700;color:#16a34a;border-bottom:1px solid #f1f5f9">${fmt(l.amount)}</td></tr>`).join('');
        const expenseRows = [
            ...expenseLines.lines.map(l => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${l.item}</td><td style="padding:6px 12px;text-align:right;font-weight:700;color:#dc2626;border-bottom:1px solid #f1f5f9">${fmt(l.amount)}</td></tr>`),
            ...payrollLines.lines.map(l => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${l.item}</td><td style="padding:6px 12px;text-align:right;font-weight:700;color:#dc2626;border-bottom:1px solid #f1f5f9">${fmt(l.amount)}</td></tr>`)
        ].join('');
        w.document.write(`<!DOCTYPE html><html><head><title>P&L Statement</title>
        <style>@page{size:A4;margin:20mm} body{font-family:Arial,sans-serif;color:#1e293b} h2{margin:0 0 4px} .meta{font-size:11px;color:#64748b;margin-bottom:20px} .section{font-weight:900;background:#f8fafc;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-left:4px solid #1e293b} .total-row{background:#f1f5f9;font-weight:900} .net{background:${netProfit>=0?'#ecfdf5':'#fef2f2'};font-weight:900;font-size:16px} table{width:100%;border-collapse:collapse}</style>
        </head><body>
        <h2>📊 PROFIT & LOSS STATEMENT</h2>
        <p class="meta">Period: ${fmtDate(dateFrom)} → ${fmtDate(dateTo)} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-KE')}</p>
        <table>
        <tr class="section"><td colspan="2">INCOME</td></tr>
        ${incomeRows}
        <tr class="total-row"><td style="padding:8px 12px">Total Income</td><td style="text-align:right;padding:8px 12px;color:#16a34a">${fmt(totalIncome)}</td></tr>
        <tr><td colspan="2" style="padding:8px"></td></tr>
        <tr class="section"><td colspan="2">EXPENDITURE</td></tr>
        ${expenseRows}
        <tr class="total-row"><td style="padding:8px 12px">Total Expenditure</td><td style="text-align:right;padding:8px 12px;color:#dc2626">${fmt(totalExpenses)}</td></tr>
        <tr><td colspan="2" style="padding:8px"></td></tr>
        <tr class="net"><td style="padding:12px">NET ${netProfit>=0?'SURPLUS':'DEFICIT'}</td><td style="text-align:right;padding:12px;color:${netProfit>=0?'#16a34a':'#dc2626'}">${fmt(Math.abs(netProfit))}</td></tr>
        </table></body></html>`);
        setTimeout(() => w.print(), 400);
        toast.success('P&L sent to printer');
    };

    const exportCSV = () => {
        const rows = [
            ['Section', 'Item', 'Amount'],
            ...incomeLines.lines.map(l => ['Income', l.item, String(l.amount)]),
            ['Income', 'TOTAL INCOME', String(totalIncome)],
            ...expenseLines.lines.map(l => ['Expenses', l.item, String(l.amount)]),
            ...payrollLines.lines.map(l => ['Payroll', l.item, String(l.amount)]),
            ['Expenses', 'TOTAL EXPENSES', String(totalExpenses)],
            ['', `NET ${netProfit >= 0 ? 'SURPLUS' : 'DEFICIT'}`, String(netProfit)],
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `pl_statement_${dateFrom}_to_${dateTo}.csv`; a.click();
        toast.success('P&L exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Calculating P&amp;L from transactions...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#1e40af)' }}><FiTrendingUp size={18} /></span>
                        Profit & Loss Statement
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Auto-computed from fee payments, expenses & payroll &bull; Real financial data</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={printPL} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-800 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print A4</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center shadow-sm">
                <FiFilter size={13} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Period:</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none" />
                <span className="text-gray-400">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none" />
                <div className="ml-auto flex gap-2">
                    {terms.map(t => (
                        <button key={t.id} onClick={() => { setDateFrom(t.start_date || ''); setDateTo(t.end_date || ''); }}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                            {t.term_name} {t.year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Net Profit Banner */}
            <div className={`rounded-2xl p-6 flex items-center justify-between shadow-md ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
                <div>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">{netProfit >= 0 ? '📈 NET SURPLUS' : '📉 NET DEFICIT'}</p>
                    <p className="text-4xl font-black text-white mt-1">{fmt(Math.abs(netProfit))}</p>
                    <p className="text-white/60 text-sm mt-1">{fmtDate(dateFrom)} → {fmtDate(dateTo)} &nbsp;|&nbsp; Margin: {netMargin.toFixed(1)}%</p>
                </div>
                <div className="text-right text-white/60 text-sm">
                    <p>Income: <span className="font-bold text-white">{fmt(totalIncome)}</span></p>
                    <p>Expenses: <span className="font-bold text-white">{fmt(totalExpenses)}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INCOME */}
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><FiTrendingUp className="text-white" size={16} /><h3 className="font-extrabold text-white">INCOME</h3></div>
                        <span className="font-extrabold text-emerald-100">{fmt(totalIncome)}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {incomeLines.lines.length === 0 && <p className="px-5 py-4 text-sm text-gray-400 italic">No fee payments in selected period</p>}
                        {incomeLines.lines.map((line, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3">
                                <span className="text-sm text-gray-700">{line.item}</span>
                                <span className="font-extrabold text-emerald-600">{fmt(line.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-emerald-50 px-5 py-3 flex justify-between border-t-2 border-emerald-200">
                        <span className="font-extrabold text-emerald-800">TOTAL INCOME</span>
                        <span className="font-extrabold text-emerald-800 text-lg">{fmt(totalIncome)}</span>
                    </div>
                </div>

                {/* EXPENDITURE */}
                <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><FiTrendingDown className="text-white" size={16} /><h3 className="font-extrabold text-white">EXPENDITURE</h3></div>
                        <span className="font-extrabold text-red-100">{fmt(totalExpenses)}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {/* General expenses */}
                        {expenseLines.lines.length > 0 && (
                            <>
                                <div className="px-5 py-2 bg-red-50"><p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">General Expenses</p></div>
                                {expenseLines.lines.map((line, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-gray-700">{line.item}</span>
                                        <span className="font-extrabold text-red-600">{fmt(line.amount)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {/* Payroll expenses */}
                        {payrollLines.lines.length > 0 && (
                            <>
                                <div className="px-5 py-2 bg-red-50"><p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Payroll / Salaries</p></div>
                                {payrollLines.lines.map((line, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3">
                                        <span className="text-sm text-gray-700">{line.item}</span>
                                        <span className="font-extrabold text-red-600">{fmt(line.amount)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {expenseLines.lines.length === 0 && payrollLines.lines.length === 0 && <p className="px-5 py-4 text-sm text-gray-400 italic">No expenses in selected period</p>}
                    </div>
                    <div className="bg-red-50 px-5 py-3 flex justify-between border-t-2 border-red-200">
                        <span className="font-extrabold text-red-800">TOTAL EXPENDITURE</span>
                        <span className="font-extrabold text-red-800 text-lg">{fmt(totalExpenses)}</span>
                    </div>
                </div>
            </div>

            {/* Payroll Statutory breakdown */}
            {payrollLines.lines.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">📋 Payroll Statutory Breakdown</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100"><p className="text-[10px] font-bold text-gray-400">Gross Payroll</p><p className="text-lg font-extrabold text-gray-700">{fmt(payrollLines.gross)}</p></div>
                        {payrollLines.lines.map((l, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100"><p className="text-[10px] font-bold text-gray-400">{l.item}</p><p className="text-lg font-extrabold text-red-600">{fmt(l.amount)}</p></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

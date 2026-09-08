'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiFilter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type TrialEntry = {
    code: string;
    account: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
    debit: number;
    credit: number;
};

export default function TrialBalancePage() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [expensesList, setExpensesList] = useState<any[]>([]);
    const [payrollList, setPayrollList] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [pRes, eRes, prRes, aRes, baRes, fsRes, tRes] = await Promise.all([
            supabase.from('school_fee_payments').select('amount, payment_date, payment_method').order('payment_date'),
            supabase.from('expenses').select('amount, expense_date, category, expense_name').order('expense_date'),
            supabase.from('school_payroll').select('net_pay, gross_pay, paye, nhif, nssf, housing_levy, payment_date, status').eq('status', 'Paid').order('payment_date'),
            supabase.from('school_assets').select('asset_name, category, purchase_price, current_value, status').eq('status', 'Active'),
            supabase.from('school_bank_accounts').select('bank_name, account_name, book_balance, account_type').eq('is_active', true),
            supabase.from('school_fee_structures').select('amount, category, form_id, term_id'),
            supabase.from('school_terms').select('id,term_name,year,start_date,end_date,is_current').order('year').order('id'),
        ]);
        setPayments(pRes.data || []);
        setExpensesList(eRes.data || []);
        setPayrollList(prRes.data || []);
        setAssets(aRes.data || []);
        setBankAccounts(baRes.data || []);
        setFeeStructures(fsRes.data || []);
        setTerms(tRes.data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const inRange = (d: string) => {
        if (!d) return false;
        const ds = d.substring(0, 10);
        return ds >= dateFrom && ds <= dateTo;
    };

    const trialLines = useMemo((): TrialEntry[] => {
        const lines: TrialEntry[] = [];

        // 1. CASH & BANK — total fee receipts (money that came in) → ASSET (Debit)
        const filteredPayments = payments.filter(p => inRange(p.payment_date));
        const totalFeeReceipts = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        if (totalFeeReceipts !== 0) {
            lines.push({ code: '1100', account: 'Cash & Bank — Fee Receipts', type: 'Asset', debit: totalFeeReceipts, credit: 0 });
        }

        // Bank accounts (opening / current book balance)
        bankAccounts.forEach((ba, i) => {
            const bal = Number(ba.book_balance || 0);
            if (bal !== 0) {
                lines.push({ code: `1${200 + i}`, account: `${ba.bank_name} — ${ba.account_name}`, type: 'Asset', debit: bal > 0 ? bal : 0, credit: bal < 0 ? Math.abs(bal) : 0 });
            }
        });

        // 2. FIXED ASSETS → ASSET (Debit)
        const assetsByCategory: Record<string, number> = {};
        assets.forEach(a => {
            const cat = a.category || 'Other Assets';
            assetsByCategory[cat] = (assetsByCategory[cat] || 0) + Number(a.current_value || a.purchase_price || 0);
        });
        let assetCode = 1500;
        Object.entries(assetsByCategory).forEach(([cat, val]) => {
            if (val > 0) lines.push({ code: String(assetCode++), account: `Fixed Assets — ${cat}`, type: 'Asset', debit: val, credit: 0 });
        });

        // 3. SCHOOL FEE INCOME → INCOME (Credit)
        if (totalFeeReceipts !== 0) {
            lines.push({ code: '4100', account: 'School Fees Income', type: 'Income', debit: 0, credit: totalFeeReceipts });
        }

        // 4. OUTSTANDING FEES (what's owed) — difference between structure total and collected
        const totalExpectedFees = feeStructures.reduce((s, f) => s + Number(f.amount || 0), 0);
        const outstandingFees = totalExpectedFees - totalFeeReceipts;
        if (outstandingFees > 0) {
            lines.push({ code: '1300', account: 'Debtors — Outstanding School Fees', type: 'Asset', debit: outstandingFees, credit: 0 });
            lines.push({ code: '4200', account: 'Fees Income — Billed (Not Yet Collected)', type: 'Income', debit: 0, credit: outstandingFees });
        }

        // 5. GENERAL EXPENSES → EXPENSE (Debit)
        const filteredExpenses = expensesList.filter(e => inRange(e.expense_date));
        const expByCategory: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const cat = e.category || 'General Expense';
            expByCategory[cat] = (expByCategory[cat] || 0) + Number(e.amount || 0);
        });
        let expCode = 5100;
        Object.entries(expByCategory).forEach(([cat, amt]) => {
            if (amt > 0) lines.push({ code: String(expCode++), account: `Expense — ${cat}`, type: 'Expense', debit: amt, credit: 0 });
        });

        // Total expenses paid out → reduces cash (Credit to Cash)
        const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        if (totalExpenses > 0) {
            lines.push({ code: '1105', account: 'Cash Paid — General Expenses', type: 'Asset', debit: 0, credit: totalExpenses });
        }

        // 6. PAYROLL → EXPENSE (Debit) + STATUTORY LIABILITY (Credit)
        const filteredPayroll = payrollList.filter(p => inRange(p.payment_date));
        const totalGross = filteredPayroll.reduce((s, p) => s + Number(p.gross_pay || 0), 0);
        const totalPAYE = filteredPayroll.reduce((s, p) => s + Number(p.paye || 0), 0);
        const totalNHIF = filteredPayroll.reduce((s, p) => s + Number(p.nhif || 0), 0);
        const totalNSSF = filteredPayroll.reduce((s, p) => s + Number(p.nssf || 0), 0);
        const totalNet = filteredPayroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);

        if (totalGross > 0) {
            lines.push({ code: '5200', account: 'Salaries & Wages Expense', type: 'Expense', debit: totalGross, credit: 0 });
            lines.push({ code: '1106', account: 'Cash Paid — Net Salaries', type: 'Asset', debit: 0, credit: totalNet });
        }
        if (totalPAYE > 0) {
            lines.push({ code: '2100', account: 'PAYE Payable (KRA)', type: 'Liability', debit: 0, credit: totalPAYE });
        }
        if (totalNHIF > 0) {
            lines.push({ code: '2200', account: 'NHIF / SHA Payable', type: 'Liability', debit: 0, credit: totalNHIF });
        }
        if (totalNSSF > 0) {
            lines.push({ code: '2300', account: 'NSSF Payable', type: 'Liability', debit: 0, credit: totalNSSF });
        }

        return lines;
    }, [payments, expensesList, payrollList, assets, bankAccounts, feeStructures, dateFrom, dateTo]);

    const totalDebits = trialLines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = trialLines.reduce((s, l) => s + l.credit, 0);
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    const typeOrder: TrialEntry['type'][] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
    const sortedLines = [...trialLines].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.code.localeCompare(b.code));

    const typeColors: Record<string, string> = { Asset: '#0369a1', Liability: '#dc2626', Equity: '#7c3aed', Income: '#16a34a', Expense: '#d97706' };

    const printTB = () => {
        const rows = sortedLines.map(l => `<tr><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;color:${typeColors[l.type]};font-size:11px">${l.code}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9">${l.account}</td><td style="padding:5px 10px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:11px">${l.type}</td><td style="padding:5px 10px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700">${l.debit > 0 ? fmt(l.debit) : ''}</td><td style="padding:5px 10px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700">${l.credit > 0 ? fmt(l.credit) : ''}</td></tr>`).join('');
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Trial Balance</title>
        <style>@page{size:A4;margin:20mm} body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b} h2{margin:0 0 4px} .meta{font-size:11px;color:#64748b;margin-bottom:16px} table{width:100%;border-collapse:collapse} th{background:#1e293b;color:#fff;padding:8px 10px;font-size:11px;text-align:left} .total{background:#f1f5f9;font-weight:900} .balanced{color:#16a34a} .unbalanced{color:#dc2626}</style>
        </head><body>
        <h2>📜 TRIAL BALANCE</h2>
        <p class="meta">Period: ${fmtDate(dateFrom)} → ${fmtDate(dateTo)} &nbsp;|&nbsp; ${isBalanced ? '<span class="balanced">✓ BALANCED</span>' : '<span class="unbalanced">⚠ DOES NOT BALANCE — Diff: KES ' + fmt(difference) + '</span>'} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-KE')}</p>
        <table>
        <thead><tr><th>Code</th><th>Account Name</th><th style="text-align:center">Type</th><th style="text-align:right">Debit (KES)</th><th style="text-align:right">Credit (KES)</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total"><td colspan="3" style="padding:8px 10px">TOTALS</td><td style="text-align:right;padding:8px 10px">${fmt(totalDebits)}</td><td style="text-align:right;padding:8px 10px">${fmt(totalCredits)}</td></tr></tfoot>
        </table></body></html>`);
        setTimeout(() => w.print(), 400);
        toast.success('Trial balance sent to printer');
    };

    const exportCSV = () => {
        const rows = [['Code', 'Account', 'Type', 'Debit', 'Credit'], ...sortedLines.map(l => [l.code, l.account, l.type, String(l.debit), String(l.credit)]), ['', 'TOTALS', '', String(totalDebits), String(totalCredits)]];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `trial_balance_${dateFrom}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Generating trial balance from database...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#312e81)' }}>📜</span>
                        Trial Balance
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Auto-generated from real transaction data &bull; No manual entry</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> CSV</button>
                    <button onClick={printTB} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-800 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200"><FiRefreshCw size={14} /></button>
                </div>
            </div>

            {/* Period filter */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center shadow-sm">
                <FiFilter size={13} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Period:</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none" />
                <span className="text-gray-400">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none" />
                <div className="ml-auto flex gap-2 flex-wrap">
                    {terms.map(t => (
                        <button key={t.id} onClick={() => { setDateFrom(t.start_date || ''); setDateTo(t.end_date || ''); }} className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100">{t.term_name} {t.year}</button>
                    ))}
                </div>
            </div>

            {/* Balance Status Banner */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-sm font-bold text-sm ${isBalanced ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {isBalanced ? <FiCheckCircle size={18} className="text-emerald-600" /> : <FiAlertCircle size={18} className="text-red-600" />}
                {isBalanced ? '✅ Trial Balance is BALANCED — Total Debits = Total Credits' : `⚠️ Does NOT Balance — Difference: KES ${fmt(difference)}`}
                <span className="ml-auto font-mono text-sm">{trialLines.length} accounts</span>
            </div>

            {/* Summary Cards by Type */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {typeOrder.map(type => {
                    const lines = trialLines.filter(l => l.type === type);
                    const debits = lines.reduce((s, l) => s + l.debit, 0);
                    const credits = lines.reduce((s, l) => s + l.credit, 0);
                    const net = debits - credits;
                    return (
                        <div key={type} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: typeColors[type] }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: typeColors[type] }}>{type}</p>
                            {debits > 0 && <p className="text-sm font-extrabold text-gray-800">DR: {fmt(debits)}</p>}
                            {credits > 0 && <p className="text-sm font-extrabold text-gray-600">CR: {fmt(credits)}</p>}
                            <p className="text-[10px] text-gray-400">{lines.length} accounts</p>
                        </div>
                    );
                })}
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                {['Code', 'Account Name', 'Type', 'Debit (KES)', 'Credit (KES)'].map(h => (
                                    <th key={h} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider ${['Debit (KES)', 'Credit (KES)'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {typeOrder.map(type => {
                                const lines = sortedLines.filter(l => l.type === type);
                                if (lines.length === 0) return null;
                                return (
                                    <>
                                        <tr key={`hdr-${type}`} style={{ background: typeColors[type] + '10' }}>
                                            <td colSpan={5} className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: typeColors[type] }}>
                                                {type === 'Asset' ? '💰' : type === 'Liability' ? '⚖️' : type === 'Equity' ? '🏛️' : type === 'Income' ? '📈' : '📉'} {type}S
                                            </td>
                                        </tr>
                                        {lines.map((l, i) => (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                                                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{l.code}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-800">{l.account}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: typeColors[l.type] + '15', color: typeColors[l.type] }}>{l.type}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-extrabold text-gray-800">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                                                <td className="px-4 py-2.5 text-right font-extrabold text-gray-600">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                                            </tr>
                                        ))}
                                    </>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className={`font-extrabold text-lg ${isBalanced ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
                                <td colSpan={3} className="px-4 py-4">TOTALS</td>
                                <td className="px-4 py-4 text-right">{fmt(totalDebits)}</td>
                                <td className="px-4 py-4 text-right">{fmt(totalCredits)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiDownload, FiPrinter, FiFilter } from 'react-icons/fi';

const fmt = (n: number) => 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type BSLine = { label: string; amount: number; indent?: boolean; bold?: boolean };

export default function BalanceSheetPage() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [expensesList, setExpensesList] = useState<any[]>([]);
    const [payrollList, setPayrollList] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [asAt, setAsAt] = useState(new Date().toISOString().split('T')[0]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [pRes, eRes, prRes, aRes, baRes, fsRes, siRes, tRes] = await Promise.all([
            supabase.from('school_fee_payments').select('amount, payment_date'),
            supabase.from('expenses').select('amount, expense_date'),
            supabase.from('school_payroll').select('net_pay, paye, nhif, nssf, gross_pay, payment_date, status').eq('status', 'Paid'),
            supabase.from('school_assets').select('asset_name, category, current_value, purchase_price, quantity, status'),
            supabase.from('school_bank_accounts').select('bank_name, account_name, book_balance, account_type, is_active').eq('is_active', true),
            supabase.from('school_fee_structures').select('amount, category, form_id, term_id'),
            supabase.from('school_store_items').select('item_name, quantity, unit_price, category').gt('quantity', 0),
            supabase.from('school_terms').select('id,term_name,year,start_date,end_date,is_current').order('year').order('id'),
        ]);
        setPayments(pRes.data || []);
        setExpensesList(eRes.data || []);
        setPayrollList(prRes.data || []);
        setAssets(aRes.data || []);
        setBankAccounts(baRes.data || []);
        setFeeStructures(fsRes.data || []);
        setStoreItems(siRes.data || []);
        setTerms(tRes.data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const bs = useMemo(() => {
        const asAtDate = asAt.substring(0, 10);
        const paymentsUpTo = payments.filter(p => p.payment_date && p.payment_date.substring(0, 10) <= asAtDate);
        const expensesUpTo = expensesList.filter(e => e.expense_date && e.expense_date.substring(0, 10) <= asAtDate);
        const payrollUpTo = payrollList.filter(p => p.payment_date && p.payment_date.substring(0, 10) <= asAtDate);

        const totalFeeCollected = paymentsUpTo.reduce((s, p) => s + Number(p.amount || 0), 0);
        const totalExpensesPaid = expensesUpTo.reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalNetPayrollPaid = payrollUpTo.reduce((s, p) => s + Number(p.net_pay || 0), 0);
        const totalPAYE = payrollUpTo.reduce((s, p) => s + Number(p.paye || 0), 0);
        const totalNHIF = payrollUpTo.reduce((s, p) => s + Number(p.nhif || 0), 0);
        const totalNSSF = payrollUpTo.reduce((s, p) => s + Number(p.nssf || 0), 0);

        const cashOnHand = totalFeeCollected - totalExpensesPaid - totalNetPayrollPaid;
        const totalBankBalance = bankAccounts.reduce((s, b) => s + Number(b.book_balance || 0), 0);

        const fixedAssetTotal = assets.filter(a => a.status !== 'Disposed').reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0), 0);
        const storeInventoryValue = storeItems.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
        const outstandingFees = Math.max(0, feeStructures.reduce((s, f) => s + Number(f.amount || 0), 0) - totalFeeCollected);

        // ASSETS
        const currentAssets: BSLine[] = [
            { label: 'Cash at Hand (Net of Expenses & Payroll)', amount: cashOnHand, indent: true },
            ...bankAccounts.map(ba => ({ label: `${ba.bank_name} — ${ba.account_name}`, amount: Number(ba.book_balance || 0), indent: true })),
            { label: 'Fee Debtors — Outstanding School Fees', amount: outstandingFees, indent: true },
            ...(storeInventoryValue > 0 ? [{ label: 'Store Inventory (Stock)', amount: storeInventoryValue, indent: true }] : []),
        ];
        const totalCurrentAssets = cashOnHand + totalBankBalance + outstandingFees + storeInventoryValue;

        // Fixed assets by category
        const fixedByCat: Record<string, number> = {};
        assets.filter(a => a.status !== 'Disposed').forEach(a => {
            const cat = a.category || 'Equipment';
            fixedByCat[cat] = (fixedByCat[cat] || 0) + Number(a.current_value || a.purchase_price || 0);
        });
        const fixedAssetLines: BSLine[] = Object.entries(fixedByCat).map(([cat, val]) => ({ label: cat, amount: val, indent: true }));

        const totalAssets = totalCurrentAssets + fixedAssetTotal;

        // LIABILITIES
        const currentLiabilities: BSLine[] = [
            ...(totalPAYE > 0 ? [{ label: 'PAYE Payable (KRA)', amount: totalPAYE, indent: true }] : []),
            ...(totalNHIF > 0 ? [{ label: 'NHIF / SHA Payable', amount: totalNHIF, indent: true }] : []),
            ...(totalNSSF > 0 ? [{ label: 'NSSF Payable', amount: totalNSSF, indent: true }] : []),
        ];
        const totalCurrentLiabilities = totalPAYE + totalNHIF + totalNSSF;
        const totalLiabilities = totalCurrentLiabilities;

        // EQUITY — derived (Assets - Liabilities)
        const equity = totalAssets - totalLiabilities;
        const surplusDeficit = totalFeeCollected - totalExpensesPaid - totalNetPayrollPaid - totalPAYE - totalNHIF - totalNSSF;

        return {
            currentAssets, fixedAssetLines, fixedAssetTotal,
            totalCurrentAssets, totalAssets,
            currentLiabilities, totalCurrentLiabilities, totalLiabilities,
            equity, surplusDeficit,
            totalFeeCollected, totalExpensesPaid, totalNetPayrollPaid,
            cashOnHand, outstandingFees, storeInventoryValue, totalBankBalance,
        };
    }, [payments, expensesList, payrollList, assets, bankAccounts, feeStructures, storeItems, asAt]);

    const printBS = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        const renderLines = (lines: BSLine[]) => lines.map(l => `<tr><td style="padding:5px 12px ${l.indent ? '5px 24px' : ''};font-size:12px${l.bold ? ';font-weight:900' : ''}">${l.label}</td><td style="padding:5px 12px;text-align:right;font-size:12px${l.bold ? ';font-weight:900' : ''}">${fmt(l.amount)}</td></tr>`).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>Balance Sheet</title>
        <style>@page{size:A4;margin:20mm} body{font-family:Arial,sans-serif;color:#1e293b} h2{margin:0 0 4px} .meta{font-size:11px;color:#64748b;margin-bottom:20px} .section{font-weight:900;background:#1e293b;color:#fff;padding:8px 12px;font-size:11px;text-transform:uppercase} .subtotal{background:#f8fafc;font-weight:900} .equity{background:#4f46e5;color:#fff;font-weight:900;font-size:14px} table{width:100%;border-collapse:collapse} td{border-bottom:1px solid #f1f5f9}</style>
        </head><body>
        <h2>🏦 BALANCE SHEET</h2>
        <p class="meta">As at: ${fmtDate(asAt)} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-KE')}</p>
        <table>
        <tr class="section"><td colspan="2">ASSETS</td></tr>
        <tr><td colspan="2" style="padding:4px 12px;font-size:10px;font-weight:700;color:#0369a1;background:#eff6ff">CURRENT ASSETS</td></tr>
        ${renderLines(bs.currentAssets)}
        <tr class="subtotal"><td style="padding:6px 12px">Total Current Assets</td><td style="text-align:right;padding:6px 12px">${fmt(bs.totalCurrentAssets)}</td></tr>
        ${bs.fixedAssetLines.length > 0 ? `
        <tr><td colspan="2" style="padding:4px 12px;font-size:10px;font-weight:700;color:#0369a1;background:#eff6ff">FIXED ASSETS</td></tr>
        ${renderLines(bs.fixedAssetLines)}
        <tr class="subtotal"><td style="padding:6px 12px">Total Fixed Assets</td><td style="text-align:right;padding:6px 12px">${fmt(bs.fixedAssetTotal)}</td></tr>
        ` : ''}
        <tr class="subtotal"><td style="padding:8px 12px;font-size:14px;font-weight:900">TOTAL ASSETS</td><td style="text-align:right;padding:8px 12px;font-size:14px;font-weight:900">${fmt(bs.totalAssets)}</td></tr>
        <tr><td colspan="2" style="padding:10px"></td></tr>
        <tr class="section"><td colspan="2">LIABILITIES</td></tr>
        ${bs.currentLiabilities.length > 0 ? `
        <tr><td colspan="2" style="padding:4px 12px;font-size:10px;font-weight:700;color:#dc2626;background:#fef2f2">CURRENT LIABILITIES</td></tr>
        ${renderLines(bs.currentLiabilities)}
        <tr class="subtotal"><td style="padding:6px 12px">Total Liabilities</td><td style="text-align:right;padding:6px 12px">${fmt(bs.totalLiabilities)}</td></tr>
        ` : '<tr><td colspan="2" style="padding:6px 12px;color:#94a3b8;font-size:12px;font-style:italic">No outstanding liabilities</td></tr>'}
        <tr class="equity"><td style="padding:10px 12px">NET WORTH / EQUITY</td><td style="text-align:right;padding:10px 12px">${fmt(bs.equity)}</td></tr>
        </table></body></html>`);
        setTimeout(() => w.print(), 400);
        toast.success('Balance sheet sent to printer');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Building balance sheet from database...</p></div></div>;

    const Section = ({ title, icon, color, bg }: { title: string; icon: string; color: string; bg: string }) => (
        <div className="px-5 py-2.5 flex items-center gap-2" style={{ background: bg }}>
            <span>{icon}</span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider" style={{ color }}>{title}</h3>
        </div>
    );

    const Line = ({ line, highlight }: { line: BSLine; highlight?: boolean }) => (
        <div className={`flex items-center justify-between py-2 border-b border-gray-50 ${line.indent ? 'px-7' : 'px-5'} ${highlight ? 'bg-gray-50' : ''}`}>
            <span className={`text-sm ${line.bold ? 'font-extrabold text-gray-800' : 'text-gray-700'}`}>{line.label}</span>
            <span className={`font-extrabold ${line.bold ? 'text-base text-gray-900' : 'text-gray-700'}`}>{fmt(line.amount)}</span>
        </div>
    );

    const SubTotal = ({ label, amount, color = 'text-gray-800', bg = 'bg-gray-50' }: { label: string; amount: number; color?: string; bg?: string }) => (
        <div className={`flex items-center justify-between px-5 py-3 ${bg}`}>
            <span className={`text-sm font-extrabold uppercase tracking-wider ${color}`}>{label}</span>
            <span className={`text-lg font-extrabold ${color}`}>{fmt(amount)}</span>
        </div>
    );

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0369a1,#0c4a6e)' }}>🏦</span>
                        Balance Sheet
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Auto-computed from real data &bull; Assets = Liabilities + Equity</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={printBS} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-800 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200"><FiRefreshCw size={14} /></button>
                </div>
            </div>

            {/* As At selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 shadow-sm">
                <FiFilter size={13} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">As At:</span>
                <input type="date" value={asAt} onChange={e => setAsAt(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none" />
                <span className="text-xs text-gray-400">Balance sheet reflects all transactions up to this date</span>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Fees Collected</p>
                    <p className="text-xl font-extrabold text-emerald-700">{fmt(bs.totalFeeCollected)}</p>
                    <p className="text-xs text-emerald-500">all time up to {fmtDate(asAt)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Total Paid Out</p>
                    <p className="text-xl font-extrabold text-red-700">{fmt(bs.totalExpensesPaid + bs.totalNetPayrollPaid)}</p>
                    <p className="text-xs text-red-500">expenses + salaries</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Outstanding Fees</p>
                    <p className="text-xl font-extrabold text-amber-700">{fmt(bs.outstandingFees)}</p>
                    <p className="text-xs text-amber-500">debtors — fees billed not collected</p>
                </div>
                <div className={`rounded-xl p-4 border ${bs.equity >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-[10px] font-bold uppercase ${bs.equity >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>Net Worth / Equity</p>
                    <p className={`text-xl font-extrabold ${bs.equity >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{fmt(bs.equity)}</p>
                    <p className={`text-xs ${bs.equity >= 0 ? 'text-indigo-500' : 'text-red-500'}`}>{bs.equity >= 0 ? 'School is solvent' : 'School is insolvent'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ASSETS */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <Section title="ASSETS" icon="💰" color="#0369a1" bg="#eff6ff" />
                    <div className="px-5 py-2 bg-blue-50/50"><p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Current Assets</p></div>
                    {bs.currentAssets.map((l, i) => <Line key={i} line={l} />)}
                    <SubTotal label="Total Current Assets" amount={bs.totalCurrentAssets} color="text-blue-700" bg="bg-blue-50" />

                    {bs.fixedAssetLines.length > 0 && (
                        <>
                            <div className="px-5 py-2 bg-blue-50/50"><p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Fixed Assets</p></div>
                            {bs.fixedAssetLines.map((l, i) => <Line key={i} line={l} />)}
                            <SubTotal label="Total Fixed Assets" amount={bs.fixedAssetTotal} color="text-blue-700" bg="bg-blue-50" />
                        </>
                    )}

                    <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-4">
                        <span className="font-extrabold uppercase tracking-wider">TOTAL ASSETS</span>
                        <span className="text-xl font-extrabold">{fmt(bs.totalAssets)}</span>
                    </div>
                </div>

                {/* LIABILITIES + EQUITY */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <Section title="LIABILITIES" icon="⚖️" color="#dc2626" bg="#fef2f2" />
                        <div className="px-5 py-2 bg-red-50/50"><p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Statutory Payables</p></div>
                        {bs.currentLiabilities.length === 0 && (
                            <div className="px-5 py-4 text-sm text-gray-400 italic">No outstanding liabilities</div>
                        )}
                        {bs.currentLiabilities.map((l, i) => <Line key={i} line={l} />)}
                        <div className="bg-red-600 text-white flex items-center justify-between px-5 py-4">
                            <span className="font-extrabold uppercase tracking-wider">TOTAL LIABILITIES</span>
                            <span className="text-xl font-extrabold">{fmt(bs.totalLiabilities)}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <Section title="EQUITY / NET WORTH" icon="🏛️" color="#4f46e5" bg="#eff6ff" />
                        <div className="px-5 py-3 border-b border-gray-50">
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Total Assets</span><span className="font-bold text-gray-800">{fmt(bs.totalAssets)}</span></div>
                            <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Less: Total Liabilities</span><span className="font-bold text-red-600">({fmt(bs.totalLiabilities)})</span></div>
                            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-dashed"><span className="text-gray-600">Surplus / (Deficit)</span><span className={`font-bold ${bs.surplusDeficit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(bs.surplusDeficit)}</span></div>
                        </div>
                        <div className={`flex items-center justify-between px-5 py-4 ${bs.equity >= 0 ? 'bg-indigo-600' : 'bg-red-600'} text-white`}>
                            <span className="font-extrabold uppercase tracking-wider">NET WORTH</span>
                            <span className="text-xl font-extrabold">{fmt(bs.equity)}</span>
                        </div>
                    </div>

                    {/* Accounting Equation Check */}
                    <div className={`rounded-xl p-4 text-sm font-bold text-center shadow-sm ${Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.equity)) < 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.equity)) < 1
                            ? `✅ A = L + E — Balance Sheet balances — As at ${fmtDate(asAt)}`
                            : `⚠️ Balance Sheet does NOT balance — review transactions`}
                    </div>
                </div>
            </div>
        </div>
    );
}

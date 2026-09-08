'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiRefreshCw, FiBookOpen, FiPrinter, FiX, FiSave, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RECEIPT_CATS = ['School Fees', 'Capitation', 'Government Grant', 'CDF', 'County Bursary', 'NGO/Donor', 'Hiring', 'Canteen', 'Uniform Sales', 'Other Receipts'];
const PAYMENT_CATS = ['Salaries', 'NSSF', 'NHIF', 'PAYE', 'Housing Levy', 'Electricity', 'Water', 'Telephone', 'Fuel', 'Stationery', 'Repairs', 'Cleaning', 'Provisions', 'Sports', 'Medical', 'Furniture', 'Books', 'Bank Charges', 'Petty Cash Top-up', 'Other Payments'];
const ACCOUNTS = ['Cash at Hand', 'KCB Bank', 'Equity Bank', 'Cooperative Bank', 'MPESA Till', 'Petty Cash Fund'];

type CashbookEntry = {
    id?: number; date: string; reference?: string; narration: string;
    receipt_amount: number; payment_amount: number; account: string;
    category?: string; voucher_no?: string; cheque_no?: string;
    bank_name?: string; approved_by?: string; posted_by?: string;
    academic_year?: string; term?: string; notes?: string; created_at?: string;
};
const emptyEntry = (): CashbookEntry => ({
    date: new Date().toISOString().split('T')[0], narration: '',
    receipt_amount: 0, payment_amount: 0, account: 'Cash at Hand',
    academic_year: new Date().getFullYear().toString(), term: 'Term 1'
});

function StatCard({ label, value, icon, color, textColor, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className={`text-lg font-extrabold ${textColor || 'text-gray-800'} truncate`}>{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function CashbookPage() {
    const [entries, setEntries] = useState<CashbookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [entryMode, setEntryMode] = useState<'Receipt' | 'Payment'>('Receipt');
    const [editing, setEditing] = useState<CashbookEntry | null>(null);
    const [form, setForm] = useState<CashbookEntry>(emptyEntry());
    const [search, setSearch] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [openingBalance, setOpeningBalance] = useState(0);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_cashbook').select('*').order('date', { ascending: true }).order('id', { ascending: true });
        if (error) toast.error('Failed to load cashbook');
        setEntries(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const years = useMemo(() => [...new Set(entries.map(e => e.academic_year).filter(Boolean))].sort().reverse() as string[], [entries]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return entries.filter(e => {
            if (filterAccount && e.account !== filterAccount) return false;
            if (filterYear && e.academic_year !== filterYear) return false;
            if (filterTerm && e.term !== filterTerm) return false;
            if (filterType === 'Receipt' && !e.receipt_amount) return false;
            if (filterType === 'Payment' && !e.payment_amount) return false;
            if (q && !e.narration.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [entries, search, filterAccount, filterYear, filterTerm, filterType]);

    // Running balance computation
    const withBalance = useMemo(() => {
        let balance = openingBalance;
        return filtered.map(e => {
            balance += Number(e.receipt_amount || 0) - Number(e.payment_amount || 0);
            return { ...e, running_balance: balance };
        });
    }, [filtered, openingBalance]);

    const totals = useMemo(() => {
        const totalReceipts = filtered.reduce((s, e) => s + Number(e.receipt_amount || 0), 0);
        const totalPayments = filtered.reduce((s, e) => s + Number(e.payment_amount || 0), 0);
        const closingBalance = openingBalance + totalReceipts - totalPayments;
        return { totalReceipts, totalPayments, closingBalance };
    }, [filtered, openingBalance]);

    const openAdd = (mode: 'Receipt' | 'Payment') => { setEntryMode(mode); setEditing(null); setForm(emptyEntry()); setShowModal(true); };
    const openEdit = (e: CashbookEntry) => { setEditing(e); setEntryMode(e.receipt_amount > 0 ? 'Receipt' : 'Payment'); setForm({ ...e }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyEntry()); };

    const handleSave = async () => {
        if (!form.narration) { toast.error('Enter narration/description'); return; }
        if (entryMode === 'Receipt' && !form.receipt_amount) { toast.error('Enter receipt amount'); return; }
        if (entryMode === 'Payment' && !form.payment_amount) { toast.error('Enter payment amount'); return; }
        setSaving(true);
        const payload: any = {
            date: form.date, reference: form.reference, narration: form.narration,
            receipt_amount: entryMode === 'Receipt' ? Number(form.receipt_amount || 0) : 0,
            payment_amount: entryMode === 'Payment' ? Number(form.payment_amount || 0) : 0,
            account: form.account, category: form.category, voucher_no: form.voucher_no,
            cheque_no: form.cheque_no, bank_name: form.bank_name, approved_by: form.approved_by,
            posted_by: form.posted_by, academic_year: form.academic_year, term: form.term, notes: form.notes
        };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_cashbook').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_cashbook').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : `${entryMode} recorded!`);
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_cashbook').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const exportCSV = () => {
        const rows = [['Date', 'Reference', 'Narration', 'Category', 'Receipts', 'Payments', 'Balance', 'Account', 'Voucher', 'Cheque']];
        let bal = openingBalance;
        rows.push(['', '', 'OPENING BALANCE', '', '', '', String(bal), filterAccount || 'All', '', '']);
        filtered.forEach(e => {
            bal += Number(e.receipt_amount || 0) - Number(e.payment_amount || 0);
            rows.push([e.date, e.reference || '', e.narration, e.category || '', String(e.receipt_amount || ''), String(e.payment_amount || ''), String(bal.toFixed(2)), e.account, e.voucher_no || '', e.cheque_no || '']);
        });
        rows.push(['', '', 'TOTALS', '', String(totals.totalReceipts), String(totals.totalPayments), String(totals.closingBalance.toFixed(2)), '', '', '']);
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `cashbook_${filterYear || 'all'}.csv`; a.click();
        toast.success('Exported!');
    };

    const printBook = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        let bal = openingBalance;
        const rows = withBalance.map(e => {
            return `<tr>
                <td>${e.date}</td><td>${e.reference || ''}</td><td>${e.narration}</td><td>${e.category || ''}</td>
                <td style="text-align:right">${e.receipt_amount ? e.receipt_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}</td>
                <td style="text-align:right">${e.payment_amount ? e.payment_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}</td>
                <td style="text-align:right;font-weight:bold;color:${e.running_balance >= 0 ? '#166534' : '#b91c1c'}">${(e.running_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                <td>${e.account}</td>
            </tr>`;
        }).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>Cashbook</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:10px}h1{text-align:center;font-size:16px}table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left}td{padding:4px 8px;border-bottom:1px solid #eee}.totals{background:#f0f4ff;font-weight:bold}.opening{background:#fefce8}</style></head><body>
        <h1>APSIMS — Cash Book</h1><p style="text-align:center;color:#666">${filterAccount || 'All Accounts'} | ${filterYear || 'All Years'} ${filterTerm || ''} | Generated: ${new Date().toLocaleDateString('en-KE')}</p>
        <table><thead><tr><th>Date</th><th>Ref</th><th>Narration</th><th>Category</th><th>Receipts</th><th>Payments</th><th>Balance</th><th>Account</th></tr></thead><tbody>
        <tr class="opening"><td colspan="4"><b>OPENING BALANCE</b></td><td></td><td></td><td style="text-align:right;font-weight:bold">${openingBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td><td></td></tr>
        ${rows}
        <tr class="totals"><td colspan="4"><b>CLOSING BALANCE</b></td>
        <td style="text-align:right">${totals.totalReceipts.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${totals.totalPayments.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${totals.closingBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td><td></td></tr>
        </tbody></table></body></html>`);
        setTimeout(() => w.print(), 400);
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading cashbook...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}><FiBookOpen size={18} /></span>
                        Cash Book
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">All cash receipts &amp; payments &bull; Running balance &bull; Multi-account &bull; Print &bull; Export</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={printBook} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={() => openAdd('Receipt')} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiTrendingUp size={14} /> Receipt</button>
                    <button onClick={() => openAdd('Payment')} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}><FiTrendingDown size={14} /> Payment</button>
                </div>
            </div>

            {/* Opening balance input */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-amber-800">Opening Balance:</span>
                <input type="number" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value))} className="px-3 py-1.5 border border-amber-300 rounded-lg text-sm font-bold bg-white w-44 focus:outline-none" />
                <span className="text-xs text-amber-600">Set the opening cash balance for accurate running balance calculation</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Opening Balance" value={fmt(openingBalance)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#78716c,#57534e)" />
                <StatCard label="Total Receipts" value={fmt(totals.totalReceipts)} icon={<FiTrendingUp size={18} />} color="linear-gradient(135deg,#059669,#047857)" textColor="text-emerald-700" />
                <StatCard label="Total Payments" value={fmt(totals.totalPayments)} icon={<FiTrendingDown size={18} />} color="linear-gradient(135deg,#dc2626,#b91c1c)" textColor="text-red-600" />
                <StatCard label="Closing Balance" value={fmt(totals.closingBalance)} icon={<FiDollarSign size={18} />} color={totals.closingBalance >= 0 ? 'linear-gradient(135deg,#0d9488,#0f766e)' : 'linear-gradient(135deg,#ea580c,#c2410c)'} textColor={totals.closingBalance >= 0 ? 'text-teal-700' : 'text-orange-700'} sub={`${filtered.length} entries`} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[160px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search narration, ref, category..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Types</option><option value="Receipt">Receipts</option><option value="Payment">Payments</option></select>
                <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Accounts</option>{ACCOUNTS.map(a => <option key={a}>{a}</option>)}</select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Terms</option><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
                <span className="text-xs font-bold text-gray-400">{filtered.length} entries</span>
            </div>

            {/* Cashbook Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                {['Date', 'Ref / Voucher', 'Narration', 'Category', 'Receipts (KES)', 'Payments (KES)', 'Balance (KES)', 'Account', 'Actions'].map(h =>
                                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening balance row */}
                            <tr className="bg-amber-50 border-b border-amber-100">
                                <td colSpan={4} className="px-3 py-2 text-xs font-extrabold text-amber-700 uppercase">Opening Balance</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-right font-extrabold text-amber-700">{fmt(openingBalance)}</td>
                                <td colSpan={2}></td>
                            </tr>
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} className="py-14 text-center text-gray-400">
                                    <FiBookOpen size={32} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">No cashbook entries</p>
                                    <div className="flex gap-3 justify-center mt-4">
                                        <button onClick={() => openAdd('Receipt')} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600">+ Add Receipt</button>
                                        <button onClick={() => openAdd('Payment')} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600">+ Add Payment</button>
                                    </div>
                                </td></tr>
                            )}
                            {withBalance.map((e, idx) => (
                                <tr key={e.id} className={`border-b border-gray-50 hover:bg-teal-50/20 transition-colors ${e.receipt_amount > 0 ? 'bg-emerald-50/10' : 'bg-red-50/10'}`}>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                                    <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{e.reference || e.voucher_no || e.cheque_no || '—'}</td>
                                    <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{e.narration}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">{e.category || '—'}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{e.receipt_amount > 0 ? fmt(e.receipt_amount) : ''}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-red-500">{e.payment_amount > 0 ? fmt(e.payment_amount) : ''}</td>
                                    <td className={`px-3 py-2.5 text-right font-extrabold ${(e as any).running_balance >= 0 ? 'text-teal-700' : 'text-red-700'}`}>{fmt((e as any).running_balance)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{e.account}</td>
                                    <td className="px-3 py-2.5"><div className="flex gap-1">
                                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={12} /></button>
                                        <button onClick={() => setDeleteId(e.id!)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={12} /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-100 border-t-2 border-gray-300">
                                    <td colSpan={4} className="px-3 py-3 font-extrabold text-gray-600 text-xs uppercase">TOTALS ({filtered.length} entries)</td>
                                    <td className="px-3 py-3 text-right font-extrabold text-emerald-700">{fmt(totals.totalReceipts)}</td>
                                    <td className="px-3 py-3 text-right font-extrabold text-red-600">{fmt(totals.totalPayments)}</td>
                                    <td colSpan={3}></td>
                                </tr>
                                <tr className={`border-t-2 ${totals.closingBalance >= 0 ? 'bg-teal-700' : 'bg-red-700'}`}>
                                    <td colSpan={6} className="px-3 py-3 font-extrabold text-white uppercase tracking-wider">CLOSING BALANCE</td>
                                    <td className="px-3 py-3 text-right font-extrabold text-white text-lg">{fmt(totals.closingBalance)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${entryMode === 'Receipt' ? 'bg-emerald-600' : 'bg-red-600'}`}>{entryMode}</span>
                                {editing ? 'Edit Entry' : `New ${entryMode}`}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => { setEntryMode('Receipt'); setForm(f => ({ ...f, payment_amount: 0 })); }} className={`flex-1 py-2 rounded-xl font-bold text-sm ${entryMode === 'Receipt' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Receipt (IN)</button>
                                <button onClick={() => { setEntryMode('Payment'); setForm(f => ({ ...f, receipt_amount: 0 })); }} className={`flex-1 py-2 rounded-xl font-bold text-sm ${entryMode === 'Payment' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Payment (OUT)</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference No</label><input value={form.reference || ''} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. RCP-001" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Narration / Description *</label><input value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="What is this transaction for?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                                    <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">
                                        <option value="">Select category...</option>
                                        {(entryMode === 'Receipt' ? RECEIPT_CATS : PAYMENT_CATS).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Account *</label>
                                    <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">
                                        {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{entryMode === 'Receipt' ? 'Receipt' : 'Payment'} Amount (KES) *</label>
                                    <input type="number" value={entryMode === 'Receipt' ? form.receipt_amount : form.payment_amount} onChange={e => setForm(f => entryMode === 'Receipt' ? { ...f, receipt_amount: Number(e.target.value) } : { ...f, payment_amount: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" />
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Voucher No</label><input value={form.voucher_no || ''} onChange={e => setForm(f => ({ ...f, voucher_no: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cheque No</label><input value={form.cheque_no || ''} onChange={e => setForm(f => ({ ...f, cheque_no: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Posted By</label><input value={form.posted_by || ''} onChange={e => setForm(f => ({ ...f, posted_by: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approved By</label><input value={form.approved_by || ''} onChange={e => setForm(f => ({ ...f, approved_by: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label><input value={form.academic_year || ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
                                    <select value={form.term || ''} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
                                </div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className={`flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 ${entryMode === 'Receipt' ? 'bg-emerald-600' : 'bg-red-600'}`}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : `Save ${entryMode}`}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Entry?</h3><p className="text-center text-sm text-gray-400 mb-4">This cashbook entry will be permanently removed.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}

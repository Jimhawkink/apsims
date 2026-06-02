'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPrinter, FiDownload, FiX, FiSearch, FiRefreshCw,
    FiDollarSign, FiEye, FiCalendar, FiFileText, FiCheck,
    FiFilter, FiChevronDown, FiCheckSquare, FiSquare,
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const pad = (n: number, len = 5) => String(n).padStart(len, '0');

const METHOD_COLORS: Record<string, string> = {
    'M-Pesa': 'bg-emerald-100 text-emerald-700',
    'Cash':   'bg-blue-100 text-blue-700',
    'Bank':   'bg-purple-100 text-purple-700',
    'Cheque': 'bg-amber-100 text-amber-700',
    'RTGS':   'bg-indigo-100 text-indigo-700',
    'EFT':    'bg-teal-100 text-teal-700',
};

export default function FeeReceiptsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [school,   setSchool]   = useState<any>({});
    const [loading,  setLoading]  = useState(true);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [receipt,  setReceipt]  = useState<any | null>(null);
    const [search,   setSearch]   = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [filterTerm,   setFilterTerm]   = useState('');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');
    const [limit,        setLimit]        = useState(50);
    const [terms, setTerms] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [paymentsRes, schoolRes, termsRes] = await Promise.all([
            supabase.from('school_fee_payments')
                .select(`*, school_students(first_name,last_name,admission_no,form_id,stream_id,school_forms(form_name),school_streams(stream_name))`)
                .order('payment_date', { ascending: false })
                .limit(500),
            supabase.from('school_details').select('*').single(),
            supabase.from('school_terms').select('id,term_name').order('term_name'),
        ]);
        setPayments(paymentsRes.data || []);
        setSchool(schoolRes.data || {});
        setTerms(termsRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => {
        let list = payments;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                `${p.school_students?.first_name} ${p.school_students?.last_name}`.toLowerCase().includes(q) ||
                (p.school_students?.admission_no || '').toLowerCase().includes(q) ||
                (p.mpesa_receipt || '').toLowerCase().includes(q) ||
                (p.reference_no || '').toLowerCase().includes(q)
            );
        }
        if (filterMethod) list = list.filter(p => (p.payment_method || '').toLowerCase() === filterMethod.toLowerCase());
        if (filterTerm)   list = list.filter(p => String(p.term_id) === filterTerm);
        if (dateFrom)     list = list.filter(p => p.payment_date >= dateFrom);
        if (dateTo)       list = list.filter(p => p.payment_date <= dateTo);
        return list.slice(0, limit);
    }, [payments, search, filterMethod, filterTerm, dateFrom, dateTo, limit]);

    const todayTotal   = payments.filter(p => p.payment_date === new Date().toISOString().split('T')[0]).reduce((s, p) => s + Number(p.amount || p.amount_paid || 0), 0);
    const mpesaTotal   = payments.filter(p => (p.payment_method || '').toLowerCase().includes('mpesa') || (p.payment_method || '').toLowerCase().includes('m-pesa')).reduce((s, p) => s + Number(p.amount || p.amount_paid || 0), 0);
    const cashTotal    = payments.filter(p => (p.payment_method || '').toLowerCase() === 'cash').reduce((s, p) => s + Number(p.amount || p.amount_paid || 0), 0);

    const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAll    = () => setSelected(new Set(filtered.map(p => p.id)));
    const clearSelect  = () => setSelected(new Set());

    const openReceipt  = (p: any) => setReceipt(p);

    const printReceipt = () => window.print();

    const printBulk = () => {
        const toPrint = filtered.filter(p => selected.size === 0 || selected.has(p.id));
        if (toPrint.length === 0) { toast.error('No payments selected'); return; }
        // Build bulk print window
        const html = toPrint.map((p, i) => buildReceiptHTML(p, i)).join('<div style="page-break-after:always"></div>');
        const win = window.open('', '_blank');
        if (!win) return toast.error('Pop-up blocked — allow pop-ups');
        win.document.write(`<html><head><title>Fee Receipts</title><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
            body { background:#fff; }
            @media print { @page { size: A5; margin: 10mm; } }
        </style></head><body>${html}</body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 800);
    };

    const buildReceiptHTML = (p: any, idx = 0) => {
        const student  = p.school_students || {};
        const amount   = Number(p.amount || p.amount_paid || 0);
        const receiptNo = p.receipt_no || `FEE-${new Date(p.payment_date||Date.now()).getFullYear()}-${pad(p.id)}`;
        const primary  = '#059669';
        return `
        <div style="width:520px;margin:20px auto;padding:32px;border:2px solid #e2e8f0;border-radius:16px;position:relative;font-family:Inter,sans-serif;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:56px;height:56px;border-radius:50%;background:${primary};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:900;margin-bottom:8px">${(school.school_name||'S').charAt(0)}</div>
                <h1 style="font-size:18px;font-weight:900;color:#0f172a">${school.school_name||'School Name'}</h1>
                <p style="font-size:11px;color:#64748b">${school.address||''} ${school.phone?'· Tel: '+school.phone:''}</p>
                <div style="display:inline-block;margin-top:10px;padding:4px 16px;background:${primary};color:#fff;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:2px">OFFICIAL FEE RECEIPT</div>
            </div>
            <hr style="border:1px solid #e2e8f0;margin:16px 0"/>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:12px">
                <div><span style="color:#64748b;font-weight:600">Receipt No:</span><br><strong style="color:${primary}">${receiptNo}</strong></div>
                <div style="text-align:right"><span style="color:#64748b;font-weight:600">Date:</span><br><strong>${fmtDate(p.payment_date)}</strong></div>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px">
                <p style="font-weight:700;font-size:11px;color:#64748b;margin-bottom:8px;letter-spacing:1px">STUDENT INFORMATION</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                    <div><span style="color:#64748b">Name:</span> <strong>${student.first_name||''} ${student.last_name||''}</strong></div>
                    <div><span style="color:#64748b">Adm No:</span> <strong>${student.admission_no||'—'}</strong></div>
                    <div><span style="color:#64748b">Form:</span> <strong>${student.school_forms?.form_name||'—'}</strong></div>
                    <div><span style="color:#64748b">Stream:</span> <strong>${student.school_streams?.stream_name||'—'}</strong></div>
                </div>
            </div>
            <div style="background:#f0fdf4;border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px">
                <p style="font-weight:700;font-size:11px;color:#64748b;margin-bottom:8px;letter-spacing:1px">PAYMENT DETAILS</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span style="font-size:13px;color:#374151;font-weight:600">Amount Paid</span>
                    <span style="font-size:24px;font-weight:900;color:${primary}">${fmt(amount)}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                    <div><span style="color:#64748b">Method:</span> <strong>${p.payment_method||'—'}</strong></div>
                    ${p.mpesa_receipt?`<div><span style="color:#64748b">M-Pesa Ref:</span> <strong style="color:${primary}">${p.mpesa_receipt}</strong></div>`:''}
                    ${p.reference_no?`<div><span style="color:#64748b">Reference:</span> <strong>${p.reference_no}</strong></div>`:''}
                    <div><span style="color:#64748b">Received by:</span> <strong>${p.received_by||'Bursar'}</strong></div>
                </div>
            </div>
            <div style="position:relative;border-top:1px dashed #e2e8f0;padding-top:16px;margin-top:16px;font-size:11px;color:#64748b;text-align:center">
                <p>This is an official receipt of <strong>${school.school_name||'the school'}</strong></p>
                <div style="display:inline-block;margin-top:10px;border:3px solid ${primary};border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:${primary};letter-spacing:0;margin:10px auto 0">PAID ✓</div>
                <div style="display:flex;justify-content:space-between;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px">
                    <div>Received by: _______________</div>
                    <div>Date: _______________</div>
                </div>
                <p style="margin-top:12px;color:#cbd5e1;font-size:10px">Powered by APSIMS · ${school.school_name}</p>
            </div>
        </div>`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    <FiFileText className="absolute inset-0 m-auto text-emerald-500" size={18} />
                </div>
                <p className="text-sm font-semibold text-gray-500">Loading receipts…</p>
            </div>
        </div>
    );

    return (
        <>
        {/* Print-only styles */}
        <style>{`
            @media print {
                body > * { display: none !important; }
                #receipt-print-area { display: block !important; }
                #receipt-print-area { width: 100%; }
            }
        `}</style>

        {/* ── Hidden print area ── */}
        {receipt && (
            <div id="receipt-print-area" style={{ display: 'none' }}
                dangerouslySetInnerHTML={{ __html: buildReceiptHTML(receipt) }} />
        )}

        <div className="space-y-5">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #10b981 100%)' }}>
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">🧾 Fee Receipts & PDF</h1>
                        <p className="text-emerald-200 text-sm mt-0.5">Generate professional receipts for all fee payments</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={fetchAll} className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition">
                            <FiRefreshCw size={14} />
                        </button>
                        <button onClick={printBulk}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-black shadow-lg hover:shadow-xl transition">
                            <FiPrinter size={13} />
                            {selected.size > 0 ? `Print ${selected.size} Selected` : 'Print All Filtered'}
                        </button>
                    </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-t border-white/10">
                    {[
                        { label: 'Total Receipts',    val: payments.length },
                        { label: "Today's Collections", val: fmt(todayTotal) },
                        { label: 'M-Pesa Total',      val: fmt(mpesaTotal) },
                        { label: 'Cash Total',        val: fmt(cashTotal) },
                    ].map((k, i) => (
                        <div key={i} className="bg-white/10 p-3 text-center">
                            <p className="text-emerald-200 text-[10px] font-bold uppercase">{k.label}</p>
                            <p className="font-black text-lg mt-0.5 text-white">{k.val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <FiSearch size={13} className="text-gray-400 flex-shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search student, adm no, M-Pesa code..." className="text-sm outline-none bg-transparent flex-1" />
                </div>
                <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="">All Methods</option>
                    {['Cash','M-Pesa','Bank','Cheque','RTGS','EFT'].map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="">All Terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white" />
                <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white">
                    {[25, 50, 100, 250, 500].map(l => <option key={l} value={l}>Show {l}</option>)}
                </select>
                <div className="flex gap-1">
                    <button onClick={selectAll} className="text-xs font-bold px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100">Select All</button>
                    {selected.size > 0 && <button onClick={clearSelect} className="text-xs font-bold px-3 py-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100">Clear</button>}
                </div>
                <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th className="px-3 py-3 w-8" style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                                    <input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearSelect()}
                                        checked={selected.size === filtered.length && filtered.length > 0} className="w-3.5 h-3.5" />
                                </th>
                                {['Receipt No', 'Date', 'Student', 'Adm No', 'Form', 'Amount', 'Method', 'M-Pesa / Ref', 'Received By', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                        style={{ background: '#f0fdf4', color: '#065f46', borderBottom: '2px solid #bbf7d0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={11} className="px-4 py-16 text-center text-gray-400">
                                    <p className="text-3xl mb-3">🧾</p>
                                    <p className="font-semibold">No payments found</p>
                                </td></tr>
                            ) : filtered.map(p => {
                                const student   = p.school_students || {};
                                const amount    = Number(p.amount || p.amount_paid || 0);
                                const method    = p.payment_method || 'Cash';
                                const receiptNo = p.receipt_no || `FEE-${new Date(p.payment_date||Date.now()).getFullYear()}-${pad(p.id)}`;
                                const isSel     = selected.has(p.id);
                                return (
                                    <tr key={p.id} className={`hover:bg-emerald-50/20 transition-colors ${isSel ? 'bg-emerald-50/30' : ''}`}
                                        style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td className="px-3 py-3 text-center">
                                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} className="w-3.5 h-3.5" />
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{receiptNo}</span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-semibold text-gray-800 text-sm">{student.first_name} {student.last_name}</p>
                                        </td>
                                        <td className="px-3 py-3 text-xs font-bold text-blue-600">{student.admission_no || '—'}</td>
                                        <td className="px-3 py-3 text-xs text-gray-500">{student.school_forms?.form_name || '—'}</td>
                                        <td className="px-3 py-3 font-black text-emerald-700">{fmt(amount)}</td>
                                        <td className="px-3 py-3">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${METHOD_COLORS[method] || 'bg-gray-100 text-gray-600'}`}>{method}</span>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-[11px] text-gray-500">{p.mpesa_receipt || p.reference_no || '—'}</td>
                                        <td className="px-3 py-3 text-xs text-gray-500">{p.received_by || 'Bursar'}</td>
                                        <td className="px-3 py-3">
                                            <button onClick={() => openReceipt(p)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition whitespace-nowrap">
                                                <FiPrinter size={11} /> Receipt
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid #bbf7d0', background: '#f0fdf4' }}>
                                    <td colSpan={6} className="px-3 py-3 font-black text-emerald-800 text-xs">TOTAL</td>
                                    <td className="px-3 py-3 font-black text-emerald-700">
                                        {fmt(filtered.reduce((s, p) => s + Number(p.amount || p.amount_paid || 0), 0))}
                                    </td>
                                    <td colSpan={4} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>

        {/* ── Receipt Preview Modal ── */}
        {receipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReceipt(null)}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto print:hidden" onClick={e => e.stopPropagation()}>
                    {/* Modal header */}
                    <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white border-b border-gray-100 rounded-t-2xl z-10">
                        <p className="font-black text-gray-800">Fee Receipt Preview</p>
                        <div className="flex gap-2">
                            <button onClick={printReceipt}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl"
                                style={{ background: 'linear-gradient(135deg,#10b981,#065f46)' }}>
                                <FiPrinter size={13} /> Print / Save PDF
                            </button>
                            <button onClick={() => setReceipt(null)} className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <FiX size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Receipt body — beautiful design */}
                    <div className="p-6" ref={printRef}>
                        {(() => {
                            const student  = receipt.school_students || {};
                            const amount   = Number(receipt.amount || receipt.amount_paid || 0);
                            const receiptNo = receipt.receipt_no || `FEE-${new Date(receipt.payment_date||Date.now()).getFullYear()}-${pad(receipt.id)}`;
                            return (
                                <div className="border-2 border-gray-200 rounded-2xl p-6" style={{ fontFamily: 'Inter, system-ui' }}>
                                    {/* School header */}
                                    <div className="text-center mb-5">
                                        <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-black mx-auto mb-2">
                                            {(school.school_name || 'S').charAt(0)}
                                        </div>
                                        <h1 className="text-lg font-black text-gray-900">{school.school_name || 'School Name'}</h1>
                                        <p className="text-xs text-gray-500">{school.address || ''} {school.phone ? `· ${school.phone}` : ''}</p>
                                        <div className="inline-block mt-2 px-4 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full tracking-widest">
                                            OFFICIAL FEE RECEIPT
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 my-4" />

                                    <div className="flex justify-between text-xs mb-4">
                                        <div>
                                            <p className="text-gray-400 font-semibold">Receipt No</p>
                                            <p className="font-black text-emerald-600 text-sm">{receiptNo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 font-semibold">Date</p>
                                            <p className="font-bold text-gray-800">{fmtDate(receipt.payment_date)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 mb-4 text-xs">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Student Information</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><p className="text-gray-400">Full Name</p><p className="font-bold text-gray-800">{student.first_name} {student.last_name}</p></div>
                                            <div><p className="text-gray-400">Admission No</p><p className="font-bold text-blue-600">{student.admission_no || '—'}</p></div>
                                            <div><p className="text-gray-400">Form / Class</p><p className="font-bold text-gray-800">{student.school_forms?.form_name || '—'}</p></div>
                                            <div><p className="text-gray-400">Stream</p><p className="font-bold text-gray-800">{student.school_streams?.stream_name || '—'}</p></div>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-xs">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Details</p>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="font-semibold text-gray-700">Amount Paid</p>
                                            <p className="text-2xl font-black text-emerald-600">{fmt(amount)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><p className="text-gray-400">Payment Method</p><p className="font-bold text-gray-800">{receipt.payment_method || '—'}</p></div>
                                            {receipt.mpesa_receipt && <div><p className="text-gray-400">M-Pesa Receipt</p><p className="font-bold text-emerald-600">{receipt.mpesa_receipt}</p></div>}
                                            {receipt.reference_no && <div><p className="text-gray-400">Reference No</p><p className="font-bold text-gray-800">{receipt.reference_no}</p></div>}
                                            <div><p className="text-gray-400">Received By</p><p className="font-bold text-gray-800">{receipt.received_by || 'Bursar'}</p></div>
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-200 my-4" />

                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full border-4 border-emerald-600 flex items-center justify-center mx-auto mb-3">
                                            <div className="text-center">
                                                <FiCheck size={20} className="text-emerald-600 mx-auto" />
                                                <p className="text-[9px] font-black text-emerald-600 -mt-0.5">PAID</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">This is an official receipt of <strong>{school.school_name}</strong></p>
                                        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                                            <span>Received by: _______________</span>
                                            <span>Date: _______________</span>
                                        </div>
                                        <p className="text-[10px] text-gray-300 mt-3">Powered by APSIMS · {school.school_name}</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

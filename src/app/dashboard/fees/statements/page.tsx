'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
    FiSearch, FiPrinter, FiFileText, FiDownload, FiUser,
    FiDollarSign, FiCheck, FiAlertTriangle,
    FiMessageCircle, FiRefreshCw, FiFilter, FiX,
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

type Student = { id: number; first_name: string; last_name: string; other_name?: string; admission_no?: string; admission_number?: string; form_id: number; stream_id?: number; guardian_name?: string; guardian_phone?: string; status?: string; };
type Payment = { id: number; student_id: number; amount: number; payment_date: string; payment_method: string; receipt_number?: string; mpesa_code?: string; bank_name?: string; term_id?: number; notes?: string; };
type Structure = { id: number; form_id?: number; term_id?: number; category: string; amount: number; description?: string; };
type Term = { id: number; term_name: string; term_number?: number; year?: string | number; is_current?: boolean; };
type Form = { id: number; form_name?: string; form_level?: number; grade?: string; };
type Stream = { id: number; stream_name: string; };

function StatCard({ label, value, color, sub, icon }: { label: string; value: string; color: string; sub?: string; icon: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
        </div>
    );
}

export default function FeeStatementsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [forms, setForms] = useState<Form[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [school, setSchool] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterBalance, setFilterBalance] = useState('All');
    const [selected, setSelected] = useState<Student | null>(null);
    const [selTermId, setSelTermId] = useState('all');
    const [activeTab, setActiveTab] = useState<'ledger' | 'terms' | 'summary'>('ledger');
    const [bulkIds, setBulkIds] = useState<Set<number>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [
            { data: s }, { data: p }, { data: st }, { data: t },
            { data: f }, { data: str }, { data: sch }
        ] = await Promise.all([
            supabase.from('school_students').select('id,first_name,last_name,other_name,admission_no,admission_number,form_id,stream_id,guardian_name,guardian_phone,status').order('first_name'),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('*').order('form_id'),
            supabase.from('school_terms').select('*').order('id'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_settings').select('*').limit(1),
        ]);
        setStudents(s || []);
        setPayments(p || []);
        setStructures(st || []);
        setTerms(t || []);
        setForms(f || []);
        setStreams(str || []);
        if (sch && sch.length > 0) setSchool(sch[0]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (fid?: number) => {
        if (!fid) return '\u2014';
        const f = forms.find(x => x.id === fid);
        return f?.form_name || f?.grade || `Form ${f?.form_level || fid}`;
    };
    const getStreamName = (sid?: number) => {
        if (!sid) return '\u2014';
        return streams.find(x => x.id === sid)?.stream_name || '\u2014';
    };
    const admNo = (s: Student) => s.admission_no || s.admission_number || '';
    const fullName = (s: Student) => `${s.first_name} ${s.other_name || ''} ${s.last_name}`.replace(/\s+/g, ' ').trim();

    const getBalance = useCallback((studentId: number, formId: number, termId?: string) => {
        const applicable = structures.filter(st =>
            (!st.form_id || st.form_id === formId) &&
            (termId === 'all' || !termId || !st.term_id || st.term_id === Number(termId))
        );
        const charged = applicable.reduce((s, x) => s + Number(x.amount || 0), 0);
        const paidList = payments.filter(p =>
            p.student_id === studentId &&
            (termId === 'all' || !termId || !p.term_id || p.term_id === Number(termId))
        );
        const paid = paidList.reduce((s, p) => s + Number(p.amount || 0), 0);
        const balance = charged - paid;
        return { charged, paid, balance, overpaid: balance < 0 ? Math.abs(balance) : 0, owing: Math.max(0, balance), paidList };
    }, [structures, payments]);

    const filteredStudents = useMemo(() => {
        const q = search.toLowerCase().trim();
        return students.filter(s => {
            if (s.status && s.status !== 'Active') return false;
            if (filterForm && s.form_id !== Number(filterForm)) return false;
            if (q && !fullName(s).toLowerCase().includes(q) && !admNo(s).toLowerCase().includes(q)) return false;
            if (filterBalance !== 'All') {
                const { balance } = getBalance(s.id, s.form_id);
                if (filterBalance === 'Owing' && balance <= 0) return false;
                if (filterBalance === 'Paid' && balance > 0) return false;
            }
            return true;
        });
    }, [students, search, filterForm, filterBalance, getBalance]);

    const selStats = useMemo(() => {
        if (!selected) return null;
        return getBalance(selected.id, selected.form_id, selTermId);
    }, [selected, selTermId, getBalance]);

    const termBreakdown = useMemo(() => {
        if (!selected) return [];
        return terms.map(t => {
            const res = getBalance(selected.id, selected.form_id, String(t.id));
            return { term: t, ...res };
        }).filter(x => x.charged > 0 || x.paid > 0);
    }, [selected, terms, getBalance]);

    const ledgerEntries = useMemo(() => {
        if (!selected) return [];
        const term = selTermId === 'all' ? undefined : Number(selTermId);
        const applicable = structures.filter(st =>
            (!st.form_id || st.form_id === selected.form_id) &&
            (!term || !st.term_id || st.term_id === term)
        );
        const totalCharged = applicable.reduce((s, x) => s + Number(x.amount || 0), 0);
        const paidList = payments.filter(p =>
            p.student_id === selected.id &&
            (!term || !p.term_id || p.term_id === term)
        ).sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

        let running = totalCharged;
        const entries: any[] = [{ type: 'charge', date: '', desc: 'Annual Fee Charge', ref: 'FEE-STRUCT', debit: totalCharged, credit: 0, balance: totalCharged }];
        for (const p of paidList) {
            running -= Number(p.amount || 0);
            entries.push({
                type: 'payment', date: p.payment_date,
                desc: `Payment \u2014 ${p.payment_method}${p.mpesa_code ? ` (${p.mpesa_code})` : ''}`,
                ref: p.receipt_number || '\u2014', debit: 0, credit: Number(p.amount || 0), balance: running
            });
        }
        return entries;
    }, [selected, selTermId, structures, payments]);

    const overallStats = useMemo(() => {
        let totalCharged = 0; let totalPaid = 0; let totalOwing = 0; let fullyPaid = 0;
        for (const s of filteredStudents) {
            const { charged, paid, balance } = getBalance(s.id, s.form_id);
            totalCharged += charged; totalPaid += paid;
            if (balance > 0) totalOwing += balance;
            if (balance <= 0) fullyPaid++;
        }
        return { totalCharged, totalPaid, totalOwing, fullyPaid, total: filteredStudents.length };
    }, [filteredStudents, getBalance]);

    const printStatement = (s: Student, termId = 'all') => {
        const { charged, paid, balance, overpaid, paidList } = getBalance(s.id, s.form_id, termId);
        const applicable = structures.filter(st =>
            (!st.form_id || st.form_id === s.form_id) &&
            (termId === 'all' || !st.term_id || st.term_id === Number(termId))
        );
        const sorted = [...paidList].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
        let rb = charged;
        const schoolName = school.school_name || 'ALPHA PREMIER SCHOOL';
        const schoolAddr = school.address || 'P.O. Box 000';
        const schoolPhone = school.phone || '0700 000 000';
        const selTerm = terms.find(t => t.id === Number(termId));
        const w = window.open('', '_blank'); if (!w) return;
        const feesHtml = applicable.map((f: any, i: number) =>
            `<tr><td style="color:#6b7280">${i + 1}</td><td style="font-weight:700">${f.category}</td><td>${f.form_id ? getFormName(f.form_id) : 'All'}</td><td>${f.term_id ? (terms.find((t: any) => t.id === f.term_id)?.term_name || '\u2014') : 'All'}</td><td style="text-align:right;font-weight:700">${Number(f.amount).toLocaleString()}</td></tr>`
        ).join('');
        const ledgerHtml = sorted.map((p: any) => {
            rb -= Number(p.amount || 0);
            return `<tr><td>${fmtDate(p.payment_date)}</td><td>Payment \u2014 ${p.payment_method}</td><td style="font-family:monospace;font-size:9.5px">${p.receipt_number || '\u2014'}</td><td style="font-family:monospace;font-size:9.5px">${p.mpesa_code || '\u2014'}</td><td style="text-align:right;color:#6b7280">\u2014</td><td style="text-align:right;font-weight:700;color:#16a34a">${Number(p.amount).toLocaleString()}</td><td style="text-align:right;font-weight:700;color:${rb > 0 ? '#dc2626' : '#16a34a'}">${Math.abs(rb).toLocaleString()}${rb < 0 ? ' CR' : ''}</td></tr>`;
        }).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>Fee Statement - ${admNo(s)}</title><style>
@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;color:#1a1a1a;font-size:11px}
.hdr{display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:3px double #4f46e5;margin-bottom:14px}
.sn{font-size:22px;font-weight:900;color:#4f46e5}.ss{font-size:10px;color:#666;margin-top:3px}
.sl{text-align:right}.sl h2{font-size:16px;font-weight:800}.sl p{font-size:10px;color:#888}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb}
.lb{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px}
.vl{font-size:11px;font-weight:600;margin-top:1px}
.sec{margin:14px 0 6px;font-size:9px;font-weight:800;text-transform:uppercase;color:#6366f1;letter-spacing:1.2px;padding-bottom:4px;border-bottom:2px solid #e5e7eb}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10.5px}
th{padding:5px 8px;text-align:left;font-size:8.5px;font-weight:800;text-transform:uppercase;color:#6b7280;background:#f3f4f6;border-bottom:2px solid #e5e7eb}
td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
.tf td{font-weight:800;background:#f3f4f6;border-top:2px solid #d1d5db;padding:7px 8px}
.sum{margin:14px 0;padding:14px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center}
.foot{text-align:center;margin-top:16px;padding-top:10px;border-top:3px double #4f46e5;font-size:8.5px;color:#9ca3af}
</style></head><body>
<div class="hdr"><div><div class="sn">${schoolName}</div><div class="ss">${schoolAddr} &bull; Tel: ${schoolPhone}</div></div><div class="sl"><h2>FEE STATEMENT</h2><p>${selTerm ? selTerm.term_name : 'All Terms'} &bull; ${new Date().getFullYear()}</p></div></div>
<div class="ig"><div><div class="lb">Student Name</div><div class="vl" style="font-size:14px">${fullName(s)}</div></div><div><div class="lb">Form / Stream</div><div class="vl">${getFormName(s.form_id)} &bull; ${getStreamName(s.stream_id)}</div></div><div><div class="lb">Admission No</div><div class="vl" style="color:#4f46e5">${admNo(s)}</div></div><div><div class="lb">Guardian</div><div class="vl">${s.guardian_name || '\u2014'}</div></div><div><div class="lb">Phone</div><div class="vl">${s.guardian_phone || '\u2014'}</div></div><div><div class="lb">Date</div><div class="vl">${new Date().toLocaleDateString('en-KE')}</div></div></div>
<div class="sec">Fee Breakdown</div>
<table><thead><tr><th>#</th><th>Vote Head</th><th>Form</th><th>Term</th><th style="text-align:right">Amount (KES)</th></tr></thead><tbody>${feesHtml}</tbody><tfoot><tr class="tf"><td colspan="4">TOTAL CHARGED</td><td style="text-align:right;color:#dc2626">KES ${charged.toLocaleString()}</td></tr></tfoot></table>
<div class="sec">Payment Ledger</div>
<table><thead><tr><th>Date</th><th>Description</th><th>Receipt</th><th>M-Pesa Ref</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead><tbody>
<tr style="background:#fefce8"><td>\u2014</td><td style="font-weight:700">Annual Fee Charge</td><td>FEE-STRUCT</td><td>\u2014</td><td style="text-align:right;font-weight:700;color:#dc2626">${charged.toLocaleString()}</td><td style="text-align:right;color:#6b7280">\u2014</td><td style="text-align:right;font-weight:700;color:#dc2626">${charged.toLocaleString()}</td></tr>
${ledgerHtml}</tbody><tfoot><tr class="tf"><td colspan="4">CLOSING BALANCE</td><td style="text-align:right;color:#dc2626">KES ${charged.toLocaleString()}</td><td style="text-align:right;color:#16a34a">KES ${paid.toLocaleString()}</td><td style="text-align:right;color:${balance > 0 ? '#dc2626' : '#16a34a'};font-size:13px">KES ${Math.abs(balance).toLocaleString()}${balance < 0 ? ' CR' : ''}</td></tr></tfoot></table>
<div class="sum" style="background:${balance > 0 ? '#fef2f2' : '#f0fdf4'};border:2px solid ${balance > 0 ? '#fca5a5' : '#86efac'}">
<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:${balance > 0 ? '#b91c1c' : '#15803d'}">${balance > 0 ? 'AMOUNT DUE' : 'STATUS'}</div><div style="font-size:26px;font-weight:900;color:${balance > 0 ? '#dc2626' : '#16a34a'}">${balance > 0 ? 'KES ' + balance.toLocaleString() : 'FULLY PAID'}</div></div>
<div style="text-align:right"><div style="font-size:9px;font-weight:700">COLLECTION RATE</div><div style="font-size:20px;font-weight:900">${charged > 0 ? ((paid / charged) * 100).toFixed(1) : 0}%</div>${overpaid > 0 ? '<div style="color:#16a34a;font-weight:700">Overpaid: KES ' + overpaid.toLocaleString() + ' CR</div>' : ''}</div></div>
<div class="foot"><p>Computer-generated official fee statement. No signature required.</p><p>Generated by APSIMS Ultra &bull; ${new Date().toLocaleString('en-KE')}</p></div>
</body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 400);
    };

    const exportCSV = () => {
        const rows = [['Adm No', 'Name', 'Form', 'Stream', 'Charged', 'Paid', 'Balance', 'Status']];
        for (const s of filteredStudents) {
            const { charged, paid, balance } = getBalance(s.id, s.form_id, selTermId);
            rows.push([admNo(s), fullName(s), getFormName(s.form_id), getStreamName(s.stream_id), String(charged), String(paid), String(balance), balance <= 0 ? 'Fully Paid' : 'Owing']);
        }
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `statements_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('CSV exported!');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading fee statements...</p>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col gap-4 p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                            <FiFileText size={18} />
                        </span>
                        Fee Statements
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Per-student ledger &bull; Term breakdown &bull; Print &bull; WhatsApp &bull; CSV export</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setBulkMode(!bulkMode)} className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 ${bulkMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                        <FiFilter size={14} /> Bulk {bulkMode && bulkIds.size > 0 && `(${bulkIds.size})`}
                    </button>
                    {bulkMode && bulkIds.size > 0 && (
                        <button onClick={() => { const list = filteredStudents.filter(s => bulkIds.has(s.id)); list.forEach((s, i) => setTimeout(() => printStatement(s, selTermId), i * 700)); toast.success(`Printing ${list.length} statements...`); }} className="px-3 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white flex items-center gap-1.5">
                            <FiPrinter size={14} /> Print {bulkIds.size}
                        </button>
                    )}
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5 hover:bg-emerald-700">
                        <FiDownload size={14} /> Export CSV
                    </button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <FiRefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
                <StatCard label="Total Students" value={String(overallStats.total)} icon={<FiUser size={18} />} color="linear-gradient(135deg,#6366f1,#4f46e5)" sub={`${overallStats.fullyPaid} fully paid`} />
                <StatCard label="Total Charged" value={fmt(overallStats.totalCharged)} icon={<FiDollarSign size={18} />} color="linear-gradient(135deg,#f59e0b,#d97706)" />
                <StatCard label="Collected" value={fmt(overallStats.totalPaid)} icon={<FiCheck size={18} />} color="linear-gradient(135deg,#10b981,#059669)" />
                <StatCard label="Outstanding" value={fmt(overallStats.totalOwing)} icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#ef4444,#dc2626)" sub={`${overallStats.total - overallStats.fullyPaid} students owing`} />
            </div>

            {/* Two-panel layout */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* LEFT: Student list */}
                <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-gray-100 space-y-2">
                        <div className="relative">
                            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or adm no..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-amber-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name || f.grade}</option>)}
                            </select>
                            <select value={filterBalance} onChange={e => setFilterBalance(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                                <option value="All">All</option>
                                <option value="Owing">Owing</option>
                                <option value="Paid">Fully Paid</option>
                            </select>
                        </div>
                        <select value={selTermId} onChange={e => setSelTermId(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
                            <option value="all">All Terms (Annual)</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {bulkMode && (
                            <div className="px-3 py-2 border-b border-gray-100 flex justify-between">
                                <button onClick={() => setBulkIds(new Set(filteredStudents.map(s => s.id)))} className="text-xs font-bold text-indigo-600">Select All</button>
                                <button onClick={() => setBulkIds(new Set())} className="text-xs font-bold text-gray-400">Clear</button>
                            </div>
                        )}
                        {filteredStudents.map(s => {
                            const { balance, charged, paid } = getBalance(s.id, s.form_id, selTermId);
                            const pct = charged > 0 ? Math.min(100, (paid / charged) * 100) : 100;
                            const isSelected = selected?.id === s.id;
                            return (
                                <div key={s.id} onClick={() => { if (bulkMode) { const n = new Set(bulkIds); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setBulkIds(n); } else { setSelected(s); setActiveTab('ledger'); } }}
                                    className={`px-3 py-2.5 border-b border-gray-50 cursor-pointer transition-all ${isSelected ? 'bg-amber-50 border-l-4 border-l-amber-400' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-2">
                                        {bulkMode && <input type="checkbox" checked={bulkIds.has(s.id)} readOnly className="rounded accent-indigo-600" />}
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                            style={{ background: balance > 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
                                            {s.first_name[0]}{s.last_name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{fullName(s)}</p>
                                            <p className="text-[10px] text-gray-400">{admNo(s)} &bull; {getFormName(s.form_id)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-[10px] font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{balance > 0 ? fmt(balance) : 'Paid'}</p>
                                            <div className="w-10 h-1 bg-gray-200 rounded-full mt-0.5 ml-auto overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredStudents.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No students found</div>}
                    </div>
                    <div className="p-2 border-t border-gray-100 text-center text-[10px] text-gray-400">{filteredStudents.length} students shown</div>
                </div>

                {/* RIGHT: Statement detail */}
                <div className="flex-1 min-w-0 flex flex-col">
                    {!selected ? (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                <FiFileText size={28} />
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Select a Student</h3>
                            <p className="text-sm text-gray-400 max-w-xs">Click any student from the left panel to view their complete fee statement, payment ledger, and term-by-term breakdown.</p>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                            {/* Student header */}
                            <div className="p-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fefce8,#fffbeb)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md"
                                            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                            {selected.first_name[0]}{selected.last_name[0]}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-extrabold text-gray-900">{fullName(selected)}</h2>
                                            <p className="text-sm text-gray-500">{admNo(selected)} &bull; {getFormName(selected.form_id)} &bull; {getStreamName(selected.stream_id)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => printStatement(selected, selTermId)}
                                            className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md"
                                            style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                            <FiPrinter size={14} /> Print
                                        </button>
                                        <button onClick={() => {
                                            if (!selected.guardian_phone) { toast.error('No guardian phone on record'); return; }
                                            const msg = encodeURIComponent(`Dear ${selected.guardian_name || 'Parent'},\n\nFee Statement: ${fullName(selected)} (${admNo(selected)})\nCharged: ${selStats ? fmt(selStats.charged) : ''}\nPaid: ${selStats ? fmt(selStats.paid) : ''}\nBalance: ${selStats ? fmt(selStats.balance) : ''}\n\nPlease visit school finance office or call for more details.`);
                                            window.open(`https://wa.me/254${String(selected.guardian_phone).replace(/^0/, '')}?text=${msg}`, '_blank');
                                        }} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md"
                                            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
                                            <FiMessageCircle size={14} /> WhatsApp
                                        </button>
                                        <button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                </div>

                                {selStats && (
                                    <div className="grid grid-cols-4 gap-3 mt-3">
                                        {[
                                            { l: 'Charged', v: fmt(selStats.charged), c: '#374151' },
                                            { l: 'Paid', v: fmt(selStats.paid), c: '#059669' },
                                            { l: 'Balance', v: fmt(selStats.owing), c: selStats.owing > 0 ? '#dc2626' : '#059669' },
                                            { l: 'Rate', v: `${selStats.charged > 0 ? ((selStats.paid / selStats.charged) * 100).toFixed(1) : 100}%`, c: '#7c3aed' },
                                        ].map(k => (
                                            <div key={k.l} className="bg-white rounded-xl px-3 py-2 border border-amber-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{k.l}</p>
                                                <p className="text-sm font-extrabold" style={{ color: k.c }}>{k.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 px-4 pt-3 border-b border-gray-100">
                                {(['ledger', 'terms', 'summary'] as const).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all ${activeTab === tab ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                                        {tab === 'ledger' ? 'Payment Ledger' : tab === 'terms' ? 'Term Breakdown' : 'Summary'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {/* LEDGER TAB */}
                                {activeTab === 'ledger' && (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                {['Date', 'Description', 'Receipt / Ref', 'Debit', 'Credit', 'Balance'].map(h => (
                                                    <th key={h} className={`px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left ${['Debit', 'Credit', 'Balance'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ledgerEntries.map((e, i) => (
                                                <tr key={i} className={`border-b border-gray-50 ${e.type === 'charge' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                                    <td className="px-3 py-2.5 text-xs text-gray-500">{e.date ? fmtDate(e.date) : '\u2014'}</td>
                                                    <td className="px-3 py-2.5 font-medium text-gray-700">{e.desc}</td>
                                                    <td className="px-3 py-2.5 font-mono text-xs text-indigo-600">{e.ref}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold text-red-500">{e.debit > 0 ? fmt(e.debit) : '\u2014'}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{e.credit > 0 ? fmt(e.credit) : '\u2014'}</td>
                                                    <td className={`px-3 py-2.5 text-right font-bold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {fmt(Math.abs(e.balance))}{e.balance < 0 ? ' CR' : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {selStats && (
                                            <tfoot>
                                                <tr className="bg-gray-50 border-t-2 border-gray-300">
                                                    <td colSpan={3} className="px-3 py-3 font-extrabold text-gray-700 text-sm">CLOSING BALANCE</td>
                                                    <td className="px-3 py-3 text-right font-extrabold text-red-600">{fmt(selStats.charged)}</td>
                                                    <td className="px-3 py-3 text-right font-extrabold text-emerald-600">{fmt(selStats.paid)}</td>
                                                    <td className={`px-3 py-3 text-right font-extrabold text-base ${selStats.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {fmt(Math.abs(selStats.balance))}{selStats.balance < 0 ? ' CR' : ''}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                )}

                                {/* TERMS TAB */}
                                {activeTab === 'terms' && (
                                    <div className="space-y-3">
                                        {termBreakdown.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No fee data for any term</div>}
                                        {termBreakdown.map(({ term, charged, paid, balance }) => (
                                            <div key={term.id} className="border border-gray-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="font-bold text-gray-800">{term.term_name}
                                                        {term.is_current && <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Current</span>}
                                                    </p>
                                                    <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${balance > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {balance > 0 ? fmt(balance) + ' Owing' : 'Cleared'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 mb-3">
                                                    <div className="bg-gray-50 rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-400 font-bold uppercase">Charged</p><p className="font-bold text-gray-800">{fmt(charged)}</p></div>
                                                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-400 font-bold uppercase">Paid</p><p className="font-bold text-emerald-700">{fmt(paid)}</p></div>
                                                    <div className={`rounded-lg p-2.5 text-center ${balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}><p className="text-[10px] text-gray-400 font-bold uppercase">Balance</p><p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(Math.abs(balance))}</p></div>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all"
                                                        style={{ width: `${charged > 0 ? Math.min(100, (paid / charged) * 100) : 0}%`, background: paid >= charged ? '#10b981' : paid > charged / 2 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* SUMMARY TAB */}
                                {activeTab === 'summary' && selStats && (
                                    <div className="space-y-4">
                                        <div className={`rounded-2xl p-6 border-2 ${selStats.balance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: selStats.balance > 0 ? '#b91c1c' : '#15803d' }}>
                                                {selStats.balance > 0 ? 'Outstanding Balance' : 'Account Status'}
                                            </p>
                                            <p className="text-4xl font-black" style={{ color: selStats.balance > 0 ? '#dc2626' : '#16a34a' }}>
                                                {selStats.balance > 0 ? fmt(selStats.balance) : 'FULLY PAID'}
                                            </p>
                                            {selStats.overpaid > 0 && <p className="text-sm font-bold text-emerald-600 mt-1">Overpaid by {fmt(selStats.overpaid)}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[['Student', fullName(selected)], ['Admission No', admNo(selected)], ['Form', getFormName(selected.form_id)], ['Stream', getStreamName(selected.stream_id)], ['Guardian', selected.guardian_name || '\u2014'], ['Guardian Phone', selected.guardian_phone || '\u2014']].map(([l, v]) => (
                                                <div key={l} className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{l}</p>
                                                    <p className="font-bold text-gray-800 mt-0.5">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Collection Progress</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all"
                                                        style={{ width: `${selStats.charged > 0 ? Math.min(100, (selStats.paid / selStats.charged) * 100) : 0}%`, background: selStats.paid >= selStats.charged ? '#10b981' : '#f59e0b' }} />
                                                </div>
                                                <span className="text-sm font-extrabold text-gray-700">
                                                    {selStats.charged > 0 ? ((selStats.paid / selStats.charged) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

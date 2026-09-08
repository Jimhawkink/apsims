'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiFileText, FiRefreshCw, FiDownload, FiSend, FiPrinter, FiSearch, FiMail, FiUsers, FiAlertTriangle, FiCheck, FiFilter } from 'react-icons/fi';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const LETTER_TEMPLATES: Record<string, { subject: string; body: (s: any) => string }> = {
    first: {
        subject: 'Fee Reminder Notice',
        body: (s) => `Dear Parent/Guardian of ${s.name},\n\nThis is a friendly reminder that fee balance of ${fmt(s.balance)} for ${s.form || 'your ward'} (Adm: ${s.admNo}) is outstanding.\n\nPlease make payment by END OF THIS WEEK to avoid disruption of studies.\n\nPayment Methods:\n• MPESA Paybill: [PAYBILL] — Account: ${s.admNo}\n• Bank: [BANK NAME]\n\nFor queries, contact the school bursar.\n\nThank you for your continued support.\n\nYours faithfully,\nThe Principal`
    },
    second: {
        subject: 'Second & Final Fee Demand Notice',
        body: (s) => `Dear Parent/Guardian,\n\nRE: SECOND DEMAND NOTICE — ${s.name} (Adm: ${s.admNo})\n\nDespite our previous reminder, fee arrears of ${fmt(s.balance)} remain UNPAID.\n\nYou are hereby notified that failure to settle this balance within 48 HOURS will result in:\n1. Exclusion from class and examinations\n2. Withholding of academic certificates and results\n3. Referral to the school Board of Governors\n\nWe urge you to treat this as URGENT.\n\nPrincipal,\n[School Name]`
    },
    suspension: {
        subject: 'NOTICE OF FEE SUSPENSION',
        body: (s) => `Dear Parent/Guardian of ${s.name},\n\nRE: SUSPENSION DUE TO NON-PAYMENT\n\nWe regret to inform you that ${s.name} (Form ${s.form || '?'}, Adm: ${s.admNo}) has been SUSPENDED from school due to outstanding fees of ${fmt(s.balance)}.\n\nYour child will be readmitted ONLY upon full payment or an approved payment plan.\n\nReport to the school with full payment or to discuss a payment arrangement.\n\nPrincipal,\n[School Name]`
    },
    boa_referral: {
        subject: 'Board of Governors Fee Referral',
        body: (s) => `Dear Parent/Guardian of ${s.name},\n\nRE: REFERRAL TO BOARD OF GOVERNORS\n\nThis is to inform you that the matter of outstanding fees of ${fmt(s.balance)} for ${s.name} (Adm: ${s.admNo}) has been referred to the Board of Governors for further action.\n\nYou are required to appear before the BOG on [DATE] at [TIME] at the school office.\n\nFailure to appear may result in legal action to recover the debt.\n\nSecretary,\nBoard of Governors`
    }
};

type Defaulter = {
    id: number; name: string; admNo: string; form: string;
    balance: number; phone?: string; lastPayment?: string; selected?: boolean;
};

export default function DemandLettersPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [minBalance, setMinBalance] = useState(500);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [template, setTemplate] = useState<keyof typeof LETTER_TEMPLATES>('first');
    const [previewStudent, setPreviewStudent] = useState<Defaulter | null>(null);
    const [sentMap, setSentMap] = useState<Record<number, boolean>>({});

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, pRes, stRes] = await Promise.all([
            supabase.from('school_students').select('id, first_name, last_name, admission_no, admission_number, form_id, status').eq('status', 'Active'),
            supabase.from('school_fee_payments').select('student_id, amount, payment_date').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('form_id, annual_amount, term1_amount, term2_amount, term3_amount'),
        ]);
        setStudents(sRes.data || []);
        setPayments(pRes.data || []);
        setStructures(stRes.data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const defaulters: Defaulter[] = useMemo(() => {
        return students.map(s => {
            const st = structures.find(x => x.form_id === s.form_id);
            const expected = Number(st?.annual_amount || st?.term1_amount || 0);
            const paid = payments.filter(p => p.student_id === s.id).reduce((acc, p) => acc + Number(p.amount || 0), 0);
            const balance = Math.max(0, expected - paid);
            const lastPmt = payments.filter(p => p.student_id === s.id)[0];
            return {
                id: s.id,
                name: `${s.first_name} ${s.last_name}`,
                admNo: s.admission_no || s.admission_number || String(s.id),
                form: String(s.form_id || ''),
                balance,
                phone: s.phone,
                lastPayment: lastPmt?.payment_date,
            };
        }).filter(d => d.balance >= minBalance);
    }, [students, payments, structures, minBalance]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return defaulters.filter(d => {
            if (filterForm && d.form !== filterForm) return false;
            if (q && !d.name.toLowerCase().includes(q) && !d.admNo.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [defaulters, search, filterForm]);

    const totalOutstanding = useMemo(() => defaulters.reduce((s, d) => s + d.balance, 0), [defaulters]);
    const forms = useMemo(() => [...new Set(defaulters.map(d => d.form).filter(Boolean))].sort(), [defaulters]);

    const toggleSelect = (id: number) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const selectAll = () => setSelected(new Set(filtered.map(d => d.id)));
    const clearAll = () => setSelected(new Set());

    const selectedDefaulters = useMemo(() => filtered.filter(d => selected.has(d.id)), [filtered, selected]);

    const printLetter = (d: Defaulter) => {
        const tmpl = LETTER_TEMPLATES[template];
        const w = window.open('', '_blank');
        if (!w) return;
        const body = tmpl.body(d).replace(/\n/g, '<br>');
        w.document.write(`<!DOCTYPE html><html><head><title>Demand Letter - ${d.name}</title><style>
        @page{size:A4;margin:25mm 20mm} body{font-family:'Times New Roman',serif;font-size:13px;color:#111;line-height:1.8}
        .header{text-align:center;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:20px}
        h2{font-size:16px;margin:4px 0} .school-name{font-size:20px;font-weight:bold;color:#1e3a5f}
        .subject{font-weight:bold;text-decoration:underline;margin:16px 0}
        .date{text-align:right;margin-bottom:16px} .footer{margin-top:30px}
        .stamp{border:2px dashed #dc2626;padding:8px 16px;display:inline-block;color:#dc2626;font-weight:bold;transform:rotate(-5deg);margin-top:10px}
        </style></head><body>
        <div class="header"><p class="school-name">APSIMS SCHOOL</p><p>P.O. Box [BOX] - [TOWN] | Tel: [TEL] | Email: [EMAIL]</p></div>
        <div class="date">Date: ${fmtDate(new Date().toISOString())}</div>
        <p>The Parent/Guardian,</p><p>${d.name},</p><p>Adm No: ${d.admNo}</p><br>
        <p class="subject">RE: ${tmpl.subject.toUpperCase()}</p>
        <p>${body}</p>
        <div class="footer"><p>Yours faithfully,</p><br><br><p>________________________________</p><p><b>THE PRINCIPAL</b></p>
        ${template === 'suspension' || template === 'boa_referral' ? '<div class="stamp">URGENT — IMMEDIATE ACTION REQUIRED</div>' : ''}
        </div></body></html>`);
        setTimeout(() => w.print(), 400);
        setSentMap(prev => ({ ...prev, [d.id]: true }));
        toast.success(`Letter printed for ${d.name}`);
    };

    const printBulk = () => {
        const toProcess = selectedDefaulters.length > 0 ? selectedDefaulters : filtered.slice(0, 50);
        if (toProcess.length === 0) { toast.error('No students selected'); return; }
        const tmpl = LETTER_TEMPLATES[template];
        const w = window.open('', '_blank');
        if (!w) return;
        const letters = toProcess.map(d => {
            const body = tmpl.body(d).replace(/\n/g, '<br>');
            return `<div class="letter" style="page-break-after:always">
            <div class="header"><p class="school-name">APSIMS SCHOOL</p><p>P.O. Box [BOX] - [TOWN] | Tel: [TEL]</p></div>
            <div style="text-align:right">Date: ${fmtDate(new Date().toISOString())}</div>
            <p>The Parent/Guardian of <b>${d.name}</b>, Adm: ${d.admNo}</p><br>
            <p style="font-weight:bold;text-decoration:underline">RE: ${tmpl.subject.toUpperCase()}</p>
            <p>${body}</p>
            <div style="margin-top:30px"><p>Yours faithfully,</p><br><br><p>________________________________</p><p><b>THE PRINCIPAL</b></p></div>
            </div>`;
        }).join('');
        w.document.write(`<!DOCTYPE html><html><head><title>Bulk Demand Letters</title><style>
        @page{size:A4;margin:20mm} body{font-family:'Times New Roman',serif;font-size:12px;line-height:1.8}
        .header{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:16px}
        .school-name{font-size:18px;font-weight:bold;color:#1e3a5f}
        </style></head><body>${letters}</body></html>`);
        setTimeout(() => w.print(), 400);
        const s = new Set(toProcess.map(d => d.id));
        setSentMap(prev => { const n = { ...prev }; s.forEach(id => { n[id] = true; }); return n; });
        toast.success(`${toProcess.length} letters sent to print!`);
    };

    const sendWhatsApp = (d: Defaulter) => {
        const tmpl = LETTER_TEMPLATES[template];
        const msg = encodeURIComponent(tmpl.body(d));
        const phone = (d.phone || '254700000000').replace(/\D/g, '');
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
        setSentMap(prev => ({ ...prev, [d.id]: true }));
        toast.success(`WhatsApp opened for ${d.name}`);
    };

    const sendBulkWhatsApp = () => {
        const toProcess = selectedDefaulters.length > 0 ? selectedDefaulters : filtered.slice(0, 20);
        if (toProcess.length === 0) { toast.error('No students to process'); return; }
        toast(`Opening WhatsApp for ${toProcess.length} parents...`, { icon: '📱' });
        toProcess.forEach((d, i) => {
            setTimeout(() => {
                const tmpl = LETTER_TEMPLATES[template];
                const msg = encodeURIComponent(tmpl.body(d));
                const phone = (d.phone || '254700000000').replace(/\D/g, '');
                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
            }, i * 1200);
        });
        const s = new Set(toProcess.map(d => d.id));
        setSentMap(prev => { const n = { ...prev }; s.forEach(id => { n[id] = true; }); return n; });
    };

    const exportCSV = () => {
        const rows = [['Name', 'Adm No', 'Class/Form', 'Balance (KES)', 'Last Payment']];
        filtered.forEach(d => rows.push([d.name, d.admNo, d.form, String(d.balance), d.lastPayment ? fmtDate(d.lastPayment) : 'Never']));
        rows.push(['', '', 'TOTAL OUTSTANDING', String(totalOutstanding), '']);
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `defaulters_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading defaulters list...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}><FiFileText size={18} /></span>
                        Demand Letters
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Fee defaulters &bull; Print letters &bull; Bulk WhatsApp &bull; 4 letter templates</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export List</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={printBulk} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f172a)' }}><FiPrinter size={14} /> {selected.size > 0 ? `Print ${selected.size}` : 'Print All'}</button>
                    <button onClick={sendBulkWhatsApp} className="px-3 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}><FiSend size={14} /> {selected.size > 0 ? `WhatsApp ${selected.size}` : 'Bulk WhatsApp'}</button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Total Defaulters</p><p className="text-2xl font-extrabold text-red-700">{defaulters.length}</p><p className="text-xs text-red-400">Balance ≥ {fmt(minBalance)}</p></div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4"><p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Total Outstanding</p><p className="text-2xl font-extrabold text-orange-700">{fmt(totalOutstanding)}</p><p className="text-xs text-orange-400">from {defaulters.length} students</p></div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Filtered</p><p className="text-2xl font-extrabold text-blue-700">{filtered.length}</p><p className="text-xs text-blue-400">matching filter</p></div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Selected</p><p className="text-2xl font-extrabold text-emerald-700">{selected.size}</p><div className="flex gap-1 mt-1"><button onClick={selectAll} className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">All</button><button onClick={clearAll} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Clear</button></div></div>
            </div>

            {/* Letter Template Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">📄 Letter Template</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(LETTER_TEMPLATES) as Array<keyof typeof LETTER_TEMPLATES>).map(key => (
                        <button key={key} onClick={() => setTemplate(key)} className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-left ${template === key ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            {key === 'first' && '📋 1st Reminder'}
                            {key === 'second' && '⚠️ 2nd & Final'}
                            {key === 'suspension' && '🔴 Suspension Notice'}
                            {key === 'boa_referral' && '🏛️ BOG Referral'}
                        </button>
                    ))}
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500">
                    <b className="text-gray-700">{LETTER_TEMPLATES[template].subject}:</b> Preview template — placeholders like [PAYBILL] and [BANK NAME] will be replaced with your school details.
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
                <div className="relative flex-1 min-w-[180px]"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name or adm no..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" /></div>
                <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"><option value="">All Classes</option>{forms.map(f => <option key={f}>{f}</option>)}</select>
                <div className="flex items-center gap-2 text-sm"><FiFilter size={13} className="text-gray-400" /><label className="text-[10px] font-bold text-gray-500">Min Balance:</label><input type="number" value={minBalance} onChange={e => setMinBalance(Number(e.target.value))} className="w-28 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" /></div>
                <button onClick={selectAll} className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Select All Filtered</button>
            </div>

            {/* Defaulters Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-800 text-white">
                            <th className="px-3 py-3 text-left"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => e.target.checked ? selectAll() : clearAll()} className="rounded" /></th>
                            {['Student', 'Adm No', 'Class', 'Outstanding Balance', 'Last Payment', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={8} className="py-14 text-center text-gray-400"><FiFileText size={32} className="mx-auto mb-3 text-gray-300" /><p>No defaulters with balance ≥ {fmt(minBalance)}</p></td></tr>}
                            {filtered.map(d => (
                                <tr key={d.id} className={`border-b border-gray-50 hover:bg-red-50/10 transition-colors ${selected.has(d.id) ? 'bg-red-50/20' : ''}`}>
                                    <td className="px-3 py-3"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} className="rounded" /></td>
                                    <td className="px-3 py-3 font-bold text-gray-800">{d.name}</td>
                                    <td className="px-3 py-3 text-xs font-mono text-indigo-600">{d.admNo}</td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{d.form || '—'}</td>
                                    <td className="px-3 py-3">
                                        <span className={`font-extrabold ${d.balance > 20000 ? 'text-red-700' : d.balance > 10000 ? 'text-orange-600' : 'text-yellow-600'}`}>{fmt(d.balance)}</span>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-gray-500">{d.lastPayment ? fmtDate(d.lastPayment) : <span className="text-red-500 font-bold">Never</span>}</td>
                                    <td className="px-3 py-3">
                                        {sentMap[d.id] ? <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><FiCheck size={12} /> Sent</span> :
                                            <span className="text-xs font-bold text-orange-500 flex items-center gap-1"><FiAlertTriangle size={12} /> Pending</span>}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setPreviewStudent(d)} className="px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100">Preview</button>
                                            <button onClick={() => printLetter(d)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="Print"><FiPrinter size={13} /></button>
                                            <button onClick={() => sendWhatsApp(d)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="WhatsApp"><FiSend size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {filtered.length > 0 && <tfoot>
                            <tr className="bg-red-700">
                                <td colSpan={3} className="px-3 py-3 font-extrabold text-white uppercase tracking-wider">TOTAL OUTSTANDING ({filtered.length} students)</td>
                                <td className="px-3 py-3"></td>
                                <td className="px-3 py-3 font-extrabold text-white text-lg">{fmt(filtered.reduce((s, d) => s + d.balance, 0))}</td>
                                <td colSpan={3}></td>
                            </tr>
                        </tfoot>}
                    </table>
                </div>
            </div>

            {/* Letter Preview Modal */}
            {previewStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900">Letter Preview — {previewStudent.name}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => printLetter(previewStudent)} className="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-800 text-white flex items-center gap-1.5"><FiPrinter size={14} /> Print</button>
                                <button onClick={() => sendWhatsApp(previewStudent)} className="px-3 py-1.5 rounded-xl text-sm font-bold bg-green-600 text-white flex items-center gap-1.5"><FiSend size={14} /> WhatsApp</button>
                                <button onClick={() => setPreviewStudent(null)} className="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600">Close</button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                                <div className="text-center border-b border-gray-300 pb-4 mb-4">
                                    <p className="font-extrabold text-lg text-gray-900">APSIMS SCHOOL</p>
                                    <p className="text-gray-500 text-xs">P.O. Box [BOX] · [TOWN] · Tel: [TEL]</p>
                                </div>
                                <p className="text-right text-xs mb-4">Date: {fmtDate(new Date().toISOString())}</p>
                                <p className="font-extrabold underline mb-4">RE: {LETTER_TEMPLATES[template].subject.toUpperCase()}</p>
                                {LETTER_TEMPLATES[template].body(previewStudent)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

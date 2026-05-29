'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiArrowLeft, FiCheck, FiX, FiMessageSquare, FiSend, FiUsers,
    FiPhone, FiDownload, FiRefreshCw, FiAlertTriangle, FiCheckCircle,
    FiXCircle, FiChevronRight, FiChevronLeft, FiEdit2,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DefaulterStudent {
    id: number; first_name: string; last_name: string;
    admission_no?: string; admission_number?: string;
    form_id: number; form_name: string; stream_name: string;
    guardian_phone?: string; guardian_name?: string;
    annualBalance: number; totalPaid: number;
    selected: boolean;
    smsStatus?: 'idle' | 'sending' | 'sent' | 'failed' | 'skipped';
    waStatus?:  'idle' | 'sending' | 'sent' | 'failed' | 'skipped';
}

interface CampaignResult { name: string; phone: string; balance: number; smsStatus: string; waStatus: string; }

const TEMPLATES = [
    {
        name: '😊 Gentle Reminder',
        color: '#10b981',
        text: `Dear Parent/Guardian of {student_name} ({form}), this is a friendly reminder that your fee balance of KES {balance} is outstanding for {term}. Please make payment at your earliest convenience. Thank you for your continued support. - {school_name}`,
    },
    {
        name: '⚠️ Firm Reminder',
        color: '#f59e0b',
        text: `IMPORTANT: Dear Parent/Guardian of {student_name} ({form}), your school fee balance of KES {balance} is now overdue for {term}. Please settle this amount immediately to avoid disruption of your child's studies. Contact the bursar for payment arrangements. - {school_name}`,
    },
    {
        name: '🚨 Final Notice',
        color: '#ef4444',
        text: `FINAL NOTICE: {student_name} ({form}) has an outstanding fee balance of KES {balance} for {term}. Failure to pay by end of this week may result in temporary suspension of studies. Please visit the bursar's office IMMEDIATELY or call us urgently. - {school_name} Accounts Dept`,
    },
    {
        name: '⚖️ Legal Warning',
        color: '#dc2626',
        text: `NOTICE OF LEGAL ACTION: This is to formally notify you that {student_name}'s fee account (KES {balance}) has been escalated to our legal department. To avoid further action including blacklisting, please visit our offices within 48 hours. - {school_name} Board of Management`,
    },
    {
        name: '🎁 Bursary Available',
        color: '#7c3aed',
        text: `Dear Parent of {student_name} ({form}), we understand fee payment may be challenging. Please visit our office to apply for a bursary scholarship or installment payment plan. Your child's education is our priority. Current balance: KES {balance}. - {school_name} Welfare Office`,
    },
];

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

function mergeMessage(template: string, student: DefaulterStudent, termName: string, schoolName: string) {
    return template
        .replace(/\{student_name\}/g, `${student.first_name} ${student.last_name}`)
        .replace(/\{form\}/g, student.form_name)
        .replace(/\{balance\}/g, student.annualBalance.toLocaleString())
        .replace(/\{term\}/g, termName)
        .replace(/\{school_name\}/g, schoolName);
}

function StepIndicator({ current }: { current: number }) {
    const steps = ['Select Recipients', 'Compose Message', 'Preview & Send'];
    return (
        <div className="flex items-center gap-0">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${i === current ? 'text-white shadow-md' : i < current ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-gray-400 bg-gray-100'}`}
                        style={i === current ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } : {}}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === current ? 'bg-white/20' : i < current ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200'}`}>
                            {i < current ? <FiCheck size={10} /> : i + 1}
                        </span>
                        <span className="hidden sm:block">{s}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BulkRemindersPage() {
    const [step, setStep] = useState(0);
    const [students, setStudents] = useState<DefaulterStudent[]>([]);
    const [schoolName, setSchoolName] = useState('Our School');
    const [termName, setTermName] = useState('Current Term');
    const [loading, setLoading] = useState(true);

    // Step 1
    const [minBalance, setMinBalance] = useState(0);
    const [filterForm, setFilterForm] = useState('');
    const [searchQ, setSearchQ] = useState('');

    // Step 2
    const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'both'>('both');
    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const [message, setMessage] = useState(TEMPLATES[0].text);
    const [editingMsg, setEditingMsg] = useState(false);

    // Step 3 — Sending
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const [sentCount, setSentCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [results, setResults] = useState<CampaignResult[]>([]);
    const [campaignDone, setCampaignDone] = useState(false);

    // ── Data ──────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: studs }, { data: forms }, { data: streams }, { data: payments }, { data: structures }, { data: term }, { data: school }] = await Promise.all([
                supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,guardian_phone,guardian_name,status').eq('status', 'Active'),
                supabase.from('school_forms').select('id,form_name'),
                supabase.from('school_streams').select('id,stream_name'),
                supabase.from('school_fee_payments').select('student_id,amount,term_id,year'),
                supabase.from('school_fee_structures').select('form_id,amount,year,term_id'),
                supabase.from('school_terms').select('id,term_name,year,is_current').order('id', { ascending: false }).limit(1).single(),
                supabase.from('school_details').select('school_name').limit(1).single(),
            ]);

            const currentYear = new Date().getFullYear();
            setSchoolName(school?.school_name || 'Our School');
            setTermName(term?.term_name ? `${term.term_name} ${term.year || ''}` : 'Current Term');

            const formMap: Record<number, string> = {};
            (forms || []).forEach((f: any) => { formMap[f.id] = f.form_name; });
            const streamMap: Record<number, string> = {};
            (streams || []).forEach((s: any) => { streamMap[s.id] = s.stream_name; });

            const enriched: DefaulterStudent[] = (studs || []).map((s: any) => {
                const totalPaid = (payments || []).filter((p: any) => p.student_id === s.id).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
                const fees = (structures || []).filter((f: any) => (!f.form_id || f.form_id === s.form_id) && (!f.year || f.year === currentYear));
                const annualTotal = fees.reduce((acc: number, f: any) => acc + Number(f.amount || 0), 0);
                const annualBalance = Math.max(0, annualTotal - totalPaid);
                return {
                    ...s,
                    form_name: formMap[s.form_id] || `Form ${s.form_id}`,
                    stream_name: streamMap[s.stream_id] || '',
                    totalPaid, annualBalance,
                    selected: annualBalance > 0,
                    smsStatus: 'idle', waStatus: 'idle',
                };
            }).filter((s: any) => s.annualBalance > 0);

            setStudents(enriched);
        } catch (err: any) {
            toast.error(`Failed to load data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const forms = useMemo(() => Array.from(new Set(students.map(s => s.form_name))).sort(), [students]);

    const filtered = useMemo(() => students.filter(s => {
        if (s.annualBalance < minBalance) return false;
        if (filterForm && s.form_name !== filterForm) return false;
        if (searchQ) { const q = searchQ.toLowerCase(); if (!`${s.first_name} ${s.last_name}`.toLowerCase().includes(q) && !(s.admission_no || s.admission_number || '').toLowerCase().includes(q)) return false; }
        return true;
    }), [students, minBalance, filterForm, searchQ]);

    const selected = filtered.filter(s => s.selected);
    const withPhone = selected.filter(s => s.guardian_phone);
    const withoutPhone = selected.filter(s => !s.guardian_phone);
    const totalBalance = selected.reduce((s, d) => s + d.annualBalance, 0);

    const toggleAll = (val: boolean) => setStudents(prev => prev.map(s => filtered.find(f => f.id === s.id) ? { ...s, selected: val } : s));
    const toggleOne = (id: number) => setStudents(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    const selectByForm = (form: string) => setStudents(prev => prev.map(s => ({ ...s, selected: s.form_name === form && s.annualBalance > 0 })));

    const charCount = message.length;
    const smsParts = Math.ceil(charCount / 160);

    // ── Sending ───────────────────────────────────────────────────────────────
    const runCampaign = async () => {
        if (withPhone.length === 0) { toast.error('No recipients with phone numbers!'); return; }
        setSending(true); setCampaignDone(false);
        setProgress(0); setSentCount(0); setFailedCount(0); setSkippedCount(0);
        setResults([]);
        const total = withPhone.length;
        const campaignResults: CampaignResult[] = [];

        for (let i = 0; i < withPhone.length; i++) {
            const student = withPhone[i];
            const msg = mergeMessage(message, student, termName, schoolName);
            let smsStatus = 'skipped';
            let waStatus = 'skipped';

            if (channel === 'sms' || channel === 'both') {
                try {
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, smsStatus: 'sending' } : s));
                    const res = await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: student.guardian_phone, message: msg }) });
                    const data = await res.json();
                    smsStatus = data.success && data.status !== 'skipped' ? 'sent' : 'failed';
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, smsStatus: smsStatus as any } : s));
                } catch { smsStatus = 'failed'; setStudents(prev => prev.map(s => s.id === student.id ? { ...s, smsStatus: 'failed' } : s)); }
            }

            if (channel === 'whatsapp' || channel === 'both') {
                try {
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, waStatus: 'sending' } : s));
                    const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: student.guardian_phone, message: msg }) });
                    const data = await res.json();
                    waStatus = data.success ? 'sent' : 'failed';
                    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, waStatus: waStatus as any } : s));
                } catch { waStatus = 'failed'; setStudents(prev => prev.map(s => s.id === student.id ? { ...s, waStatus: 'failed' } : s)); }
            }

            campaignResults.push({ name: `${student.first_name} ${student.last_name}`, phone: student.guardian_phone || '', balance: student.annualBalance, smsStatus, waStatus });
            const sent = campaignResults.filter(r => r.smsStatus === 'sent' || r.waStatus === 'sent').length;
            const failed = campaignResults.filter(r => r.smsStatus === 'failed' || r.waStatus === 'failed').length;
            setSentCount(sent); setFailedCount(failed);
            setProgress(Math.round(((i + 1) / total) * 100));
            await new Promise(r => setTimeout(r, 350));
        }

        setResults(campaignResults);
        setSending(false); setCampaignDone(true);
        toast.success(`Campaign complete! ✅ ${sentCount} sent`);
    };

    const exportResults = () => {
        const csv = ['Name,Phone,Balance,SMS Status,WhatsApp Status', ...results.map(r => `"${r.name}",${r.phone},${r.balance},${r.smsStatus},${r.waStatus}`)].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Fee_Reminders_Campaign_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>📱</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading defaulters…</p>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            {/* HEADER */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#4f46e5 60%,#7c3aed 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/fees" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><FiArrowLeft size={18} /></Link>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                                <FiSend className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white">📱 Bulk Fee Reminder Campaign</h1>
                                <p className="text-white/50 text-xs mt-0.5">SMS &amp; WhatsApp reminders for all fee defaulters</p>
                            </div>
                        </div>
                        <button onClick={fetchData} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"><FiRefreshCw size={15} /></button>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                            { label: 'Total Defaulters', value: students.length, color: '#ef4444', emoji: '👤' },
                            { label: 'Total Outstanding', value: fmt(students.reduce((s, d) => s + d.annualBalance, 0)), color: '#f59e0b', emoji: '💸' },
                            { label: 'With Phone', value: students.filter(s => s.guardian_phone).length, color: '#10b981', emoji: '📞' },
                            { label: 'No Phone on File', value: students.filter(s => !s.guardian_phone).length, color: '#6b7280', emoji: '🚫' },
                        ].map((c, i) => (
                            <div key={i} className="relative rounded-xl p-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-1.5 mb-1"><span className="text-sm">{c.emoji}</span><span className="text-[9px] font-bold text-white/50 uppercase">{c.label}</span></div>
                                <p className="text-base font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center py-2"><StepIndicator current={step} /></div>

            {/* ═══ STEP 1: SELECT ═══ */}
            {step === 0 && (
                <div className="space-y-4">
                    {/* Quick select toolbar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 mr-2">Quick Select:</span>
                            <button onClick={() => toggleAll(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition">✅ All</button>
                            <button onClick={() => toggleAll(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition">☐ None</button>
                            {forms.map(f => (
                                <button key={f} onClick={() => selectByForm(f)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">{f} Only</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            <div className="relative">
                                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search students…"
                                    className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all" />
                            </div>
                            <select value={filterForm} onChange={e => setFilterForm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value="">All Forms</option>
                                {forms.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select value={minBalance} onChange={e => setMinBalance(Number(e.target.value))} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition-all">
                                <option value={0}>All Balances (&gt; KES 0)</option>
                                <option value={1000}>Balance &gt; KES 1,000</option>
                                <option value={5000}>Balance &gt; KES 5,000</option>
                                <option value={10000}>Balance &gt; KES 10,000</option>
                                <option value={20000}>Balance &gt; KES 20,000</option>
                            </select>
                        </div>
                    </div>

                    {/* Selection summary */}
                    {selected.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
                            <FiUsers className="text-indigo-600" size={18} />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-indigo-800">{selected.length} students selected · {fmt(totalBalance)} total outstanding</p>
                                <p className="text-xs text-indigo-600">{withPhone.length} have phone numbers · {withoutPhone.length} without phone (will be skipped)</p>
                            </div>
                        </div>
                    )}

                    {/* Recipients table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{filtered.length} Defaulters</p>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-gray-50 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-4 py-3 w-10"><input type="checkbox" checked={filtered.every(s => s.selected)} onChange={e => toggleAll(e.target.checked)} className="rounded" /></th>
                                        {['Student', 'Form', 'Balance', 'Phone', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s, i) => (
                                        <tr key={s.id} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${s.selected ? 'bg-indigo-50/20' : ''}`}>
                                            <td className="px-4 py-3"><input type="checkbox" checked={s.selected} onChange={() => toggleOne(s.id)} className="rounded" /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                                                        style={{ background: ['linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)', 'linear-gradient(135deg,#059669,#10b981)'][i % 3] }}>
                                                        {s.first_name[0]}{s.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                                                        <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-gray-600">{s.form_name}</span></td>
                                            <td className="px-4 py-3 font-black text-red-600 whitespace-nowrap">{fmt(s.annualBalance)}</td>
                                            <td className="px-4 py-3">
                                                {s.guardian_phone
                                                    ? <span className="text-xs text-gray-600 flex items-center gap-1"><FiPhone size={11} className="text-emerald-500" />{s.guardian_phone}</span>
                                                    : <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">No Phone</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.smsStatus && s.smsStatus !== 'idle' && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.smsStatus === 'sent' ? 'bg-emerald-50 text-emerald-700' : s.smsStatus === 'failed' ? 'bg-red-50 text-red-700' : s.smsStatus === 'sending' ? 'bg-blue-50 text-blue-700 animate-pulse' : 'bg-gray-50 text-gray-500'}`}>
                                                        SMS: {s.smsStatus}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button disabled={selected.length === 0} onClick={() => setStep(1)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                            Next: Compose Message <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ STEP 2: COMPOSE ═══ */}
            {step === 1 && (
                <div className="space-y-4">
                    {/* Channel */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Choose Channel</p>
                        <div className="flex gap-3">
                            {([['sms', '📱 SMS Only'], ['whatsapp', '💬 WhatsApp Only'], ['both', '📲 Both SMS & WhatsApp']] as const).map(([val, label]) => (
                                <button key={val} onClick={() => setChannel(val)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition border-2 ${channel === val ? 'text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    style={channel === val ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderColor: 'transparent' } : {}}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Templates */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Message Templates</p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-4">
                            {TEMPLATES.map((t, i) => (
                                <button key={i} onClick={() => { setSelectedTemplate(i); setMessage(t.text); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition border-2 ${selectedTemplate === i ? 'text-white' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    style={selectedTemplate === i ? { background: t.color, borderColor: t.color } : {}}>
                                    {t.name}
                                </button>
                            ))}
                        </div>
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-gray-600">Message Text</label>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold ${charCount > 320 ? 'text-red-500' : charCount > 160 ? 'text-amber-500' : 'text-gray-400'}`}>{charCount} chars · {smsParts} SMS part{smsParts > 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all font-mono" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-gray-400">Merge fields:</span>
                            {['{student_name}', '{form}', '{balance}', '{term}', '{school_name}'].map(f => (
                                <button key={f} onClick={() => setMessage(m => m + f)} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition">{f}</button>
                            ))}
                        </div>
                    </div>

                    {/* Live preview */}
                    {selected[0] && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Live Preview — First Recipient</p>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-indigo-600 mb-2">📱 To: {selected[0].guardian_phone || 'No phone'} ({selected[0].first_name} {selected[0].last_name})</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{mergeMessage(message, selected[0], termName, schoolName)}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <button onClick={() => setStep(0)} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"><FiChevronLeft size={16} />Back</button>
                        <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                            Next: Preview & Send <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ STEP 3: SEND ═══ */}
            {step === 2 && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Campaign Summary</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Recipients', value: withPhone.length, color: '#4f46e5', emoji: '👤' },
                                { label: 'Channel', value: channel === 'both' ? 'SMS + WhatsApp' : channel === 'sms' ? 'SMS Only' : 'WhatsApp Only', color: '#7c3aed', emoji: '📲' },
                                { label: 'Without Phone (Skip)', value: withoutPhone.length, color: '#6b7280', emoji: '🚫' },
                                { label: 'Total Outstanding', value: fmt(totalBalance), color: '#ef4444', emoji: '💸' },
                            ].map((c, i) => (
                                <div key={i} className="p-3 rounded-xl border" style={{ borderColor: c.color + '33', backgroundColor: c.color + '08' }}>
                                    <p className="text-[10px] text-gray-500 font-bold">{c.emoji} {c.label}</p>
                                    <p className="text-sm font-black mt-1" style={{ color: c.color }}>{c.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sample previews */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Sample Messages (First 3 Recipients)</p>
                        <div className="space-y-3">
                            {withPhone.slice(0, 3).map((s, i) => (
                                <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">To: {s.guardian_phone} · {s.first_name} {s.last_name} · {s.form_name} · {fmt(s.annualBalance)}</p>
                                    <p className="text-xs text-gray-700">{mergeMessage(message, s, termName, schoolName)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progress */}
                    {(sending || campaignDone) && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gray-600">{campaignDone ? '🎉 Campaign Complete!' : `Sending… ${progress}%`}</p>
                                <div className="flex items-center gap-3 text-[10px] font-black">
                                    <span className="text-emerald-600">✅ {sentCount} sent</span>
                                    <span className="text-red-600">❌ {failedCount} failed</span>
                                    <span className="text-gray-400">⏭️ {skippedCount} skipped</span>
                                </div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899)' }} />
                            </div>
                        </div>
                    )}

                    {/* Results table */}
                    {campaignDone && results.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Campaign Results</p>
                                <button onClick={exportResults} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition">
                                    <FiDownload size={12} /> Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-gray-50"><tr className="border-b border-gray-200">
                                        {['Student', 'Phone', 'Balance', 'SMS', 'WhatsApp'].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {results.map((r, i) => (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm font-bold text-gray-800">{r.name}</td>
                                                <td className="px-4 py-2 text-xs text-gray-600">{r.phone}</td>
                                                <td className="px-4 py-2 text-xs font-bold text-red-600">{fmt(r.balance)}</td>
                                                {[r.smsStatus, r.waStatus].map((st, si) => (
                                                    <td key={si} className="px-4 py-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${st === 'sent' ? 'bg-emerald-50 text-emerald-700' : st === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>{st}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <button onClick={() => setStep(1)} disabled={sending} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"><FiChevronLeft size={16} />Back</button>
                        {!campaignDone ? (
                            <button onClick={runCampaign} disabled={sending || withPhone.length === 0}
                                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black text-white transition disabled:opacity-50 shadow-lg"
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending {progress}%…</> : <><FiSend size={16} />🚀 SEND TO {withPhone.length} RECIPIENTS</>}
                            </button>
                        ) : (
                            <button onClick={() => { setStep(0); setCampaignDone(false); setResults([]); setProgress(0); }}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                                <FiRefreshCw size={15} /> New Campaign
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

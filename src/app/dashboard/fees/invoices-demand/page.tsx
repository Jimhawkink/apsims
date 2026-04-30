'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiFileText, FiSend, FiPrinter, FiPlus, FiAlertTriangle, FiCheckCircle, FiXCircle, FiDollarSign, FiMail, FiMessageSquare, FiSearch, FiX, FiRefreshCw, FiPhone } from 'react-icons/fi';

// ── Color tokens per column ──
const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    name:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    inv:     { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    total:   { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    paid:    { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    balance: { bg: '#fff1f2', text: '#be123c', head: '#fecdd3' },
    date:    { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    status:  { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    type:    { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    amount:  { bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
    sms:     { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    actions: { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    contact: { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
};

const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
    'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
    'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#0284c7,#38bdf8)', 'linear-gradient(135deg,#15803d,#22c55e)',
];

function StudentAvatar({ name, size = 34 }: { name: string; size?: number }) {
    const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    const idx = (name || '').charCodeAt(0) % GRADIENTS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, letterSpacing: 0.5, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
            {initials}
        </div>
    );
}

interface Student { id: number; first_name: string; last_name: string; admission_number: string; form_id: number; stream_id?: number; guardian_name?: string; guardian_phone?: string; guardian_email?: string; status: string; }
interface DemandLetter { id?: number; student_id: number; term_id?: number; letter_type: string; subject: string; body: string; amount_owed: number; deadline_date?: string; delivery_method: string; sms_sent: boolean; whatsapp_sent: boolean; email_sent: boolean; status: string; issued_by?: string; parent_acknowledged: boolean; notes?: string; }
interface Invoice { id?: number; invoice_number: string; student_id: number; term_id: number; form_id?: number; total_amount: number; amount_paid: number; balance: number; due_date?: string; status: string; line_items: any[]; }

export default function InvoicingDemandLettersPage() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'invoices' | 'demand' | 'bulk'>('invoices');
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [demandLetters, setDemandLetters] = useState<DemandLetter[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [saving, setSaving] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showDemandModal, setShowDemandModal] = useState(false);
    const [bulkThreshold, setBulkThreshold] = useState(5000);
    const [bulkLetterType, setBulkLetterType] = useState('First Notice');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, fRes, tRes, fsRes, fpRes, invRes, dlRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('last_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_fee_payments').select('*'),
            supabase.from('school_fee_invoices').select('*').order('id', { ascending: false }),
            supabase.from('school_demand_letters').select('*').order('id', { ascending: false }),
        ]);
        setStudents(sRes.data || []);
        setForms(fRes.data || []);
        setTerms(tRes.data || []);
        setFeeStructures(fsRes.data || []);
        setFeePayments(fpRes.data || []);
        setInvoices(invRes.data || []);
        setDemandLetters(dlRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getStudentBalance = (studentId: number, formId: number) => {
        const fs = feeStructures.find((f: any) => f.form_id === formId);
        const totalFees = Number(fs?.total_amount || fs?.tuition || 0);
        const totalPaid = feePayments.filter((fp: any) => fp.student_id === studentId).reduce((s: number, fp: any) => s + Number(fp.amount || 0), 0);
        return { totalFees, totalPaid, balance: totalFees - totalPaid };
    };

    const generateInvoices = async () => {
        if (!selTerm || !selForm) { toast.error('Select term and form'); return; }
        setSaving(true);
        const formStudents = students.filter(s => s.form_id === Number(selForm));
        const termId = Number(selTerm);
        let created = 0;

        for (const student of formStudents) {
            const existing = invoices.find(inv => inv.student_id === student.id && inv.term_id === termId);
            if (existing) continue;

            const { totalFees, totalPaid, balance } = getStudentBalance(student.id, student.form_id);
            const fs = feeStructures.find((f: any) => f.form_id === student.form_id);
            const lineItems = [];
            if (Number(fs?.tuition || 0) > 0) lineItems.push({ description: 'Tuition', amount: Number(fs.tuition) });
            if (Number(fs?.boarding || 0) > 0) lineItems.push({ description: 'Boarding', amount: Number(fs.boarding) });
            if (Number(fs?.transport || 0) > 0) lineItems.push({ description: 'Transport', amount: Number(fs.transport) });
            if (Number(fs?.activity || 0) > 0) lineItems.push({ description: 'Activity Fee', amount: Number(fs.activity) });
            if (Number(fs?.exam || 0) > 0) lineItems.push({ description: 'Exam Fee', amount: Number(fs.exam) });
            if (Number(fs?.development || 0) > 0) lineItems.push({ description: 'Development', amount: Number(fs.development) });

            const invoiceNumber = `INV-${student.admission_number}-${termId}-${Date.now().toString(36).toUpperCase()}`;
            const { error } = await supabase.from('school_fee_invoices').insert([{
                invoice_number: invoiceNumber,
                student_id: student.id,
                term_id: termId,
                form_id: student.form_id,
                total_amount: totalFees,
                amount_paid: totalPaid,
                balance,
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: balance <= 0 ? 'Paid' : 'Unpaid',
                line_items: lineItems,
            }]);
            if (!error) created++;
        }

        toast.success(`Generated ${created} invoices`);
        setSaving(false);
        fetchAll();
    };

    const createDemandLetter = async (studentId: number, amountOwed: number) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        setSaving(true);
        const letterTypes: Record<string, { subject: string; body: string }> = {
            'First Notice': {
                subject: 'First Notice — Outstanding School Fees',
                body: `Dear Parent/Guardian of ${student.first_name} ${student.last_name} (Adm: ${student.admission_number}),\n\nThis is a gentle reminder that the outstanding school fee balance for your child is Ksh ${amountOwed.toLocaleString()}. Kindly settle this balance at your earliest convenience to avoid disruption of your child's education.\n\nPayment can be made via M-Pesa Paybill or at the school bursar's office.\n\nThank you for your cooperation.\n\nPrincipal\nAlpha School`,
            },
            'Final Notice': {
                subject: 'FINAL NOTICE — Urgent Fee Payment Required',
                body: `Dear Parent/Guardian of ${student.first_name} ${student.last_name} (Adm: ${student.admission_number}),\n\nThis is a FINAL NOTICE regarding the outstanding fee balance of Ksh ${amountOwed.toLocaleString()}. Despite previous reminders, this amount remains unpaid.\n\nPlease note that failure to clear this balance within 7 days may result in your child being sent home until full payment is made.\n\nWe urge you to treat this matter with urgency.\n\nPrincipal\nAlpha School`,
            },
            'Pre-Suspension': {
                subject: 'NOTICE OF SUSPENSION — Fee Arrears',
                body: `Dear Parent/Guardian of ${student.first_name} ${student.last_name} (Adm: ${student.admission_number}),\n\nRegrettably, due to the outstanding fee balance of Ksh ${amountOwed.toLocaleString()} which has remained unpaid despite multiple notices, we are compelled to suspend your child from attending classes effective immediately.\n\nYour child may resume classes once the full outstanding amount is settled.\n\nWe hope for your understanding.\n\nPrincipal\nAlpha School`,
            },
        };

        const template = letterTypes[bulkLetterType] || letterTypes['First Notice'];
        const { error } = await supabase.from('school_demand_letters').insert([{
            student_id: studentId,
            term_id: Number(selTerm) || null,
            letter_type: bulkLetterType,
            subject: template.subject,
            body: template.body,
            amount_owed: amountOwed,
            deadline_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            delivery_method: 'SMS',
            status: 'Draft',
            issued_by: 'Admin',
        }]);
        if (error) toast.error('Failed to create letter'); else toast.success('Demand letter created');
        setSaving(false);
        fetchAll();
    };

    const sendDemandLetter = async (letter: DemandLetter) => {
        const student = students.find(s => s.id === letter.student_id);
        if (!student?.guardian_phone) { toast.error('No guardian phone'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: student.guardian_phone, message: letter.body }),
            });
            if (res.ok) {
                await supabase.from('school_demand_letters').update({ sms_sent: true, status: 'Sent' }).eq('id', letter.id);
                toast.success('SMS sent');
            } else {
                toast.error('SMS failed');
            }
        } catch { toast.error('Network error'); }
        setSaving(false);
        fetchAll();
    };

    const generateBulkDemandLetters = async () => {
        if (!selForm) { toast.error('Select a form'); return; }
        setSaving(true);
        const formStudents = students.filter(s => s.form_id === Number(selForm));
        let created = 0;
        for (const student of formStudents) {
            const { balance } = getStudentBalance(student.id, student.form_id);
            if (balance >= bulkThreshold) {
                const existing = demandLetters.find(dl => dl.student_id === student.id && dl.letter_type === bulkLetterType && dl.status !== 'Rejected');
                if (existing) continue;
                await createDemandLetter(student.id, balance);
                created++;
            }
        }
        toast.success(`Created ${created} demand letters for students owing ≥ Ksh ${bulkThreshold.toLocaleString()}`);
        setSaving(false);
    };

    // Defaulter students
    const defaulters = students.filter(s => {
        if (selForm && s.form_id !== Number(selForm)) return false;
        const { balance } = getStudentBalance(s.id, s.form_id);
        return balance > 0;
    }).map(s => ({ ...s, ...getStudentBalance(s.id, s.form_id) })).sort((a, b) => b.balance - a.balance);

    const tabs = [
        { key: 'invoices', label: 'Fee Invoices', icon: FiFileText },
        { key: 'demand', label: 'Demand Letters', icon: FiAlertTriangle },
        { key: 'bulk', label: 'Bulk Actions', icon: FiSend },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📄</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Invoicing…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">📄 Invoicing & Demand Letters</h1>
                    <p className="text-sm text-gray-500 mt-1">Auto-generate invoices, demand letters & bulk fee defaulter notices</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">Select Term</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                    <select value={selForm} onChange={e => setSelForm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Defaulters', value: defaulters.length, emoji: '⚠️', color: '#ef4444', sub: 'With outstanding fees', pulse: defaulters.length > 0 },
                    { label: 'Total Owed', value: `Ksh ${defaulters.reduce((s, d) => s + d.balance, 0).toLocaleString()}`, emoji: '💰', color: '#c2410c', sub: 'Outstanding balance' },
                    { label: 'Invoices Generated', value: invoices.length, emoji: '📋', color: '#6366f1', sub: 'Total invoices' },
                    { label: 'Demand Letters', value: demandLetters.length, emoji: '📨', color: '#7c3aed', sub: 'Letters issued' },
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                            <span className="text-xl">{card.emoji}</span>
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                        {card.pulse && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: card.color }} />}
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: card.color }} />
                    </div>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(t => { const Icon = t.icon; return (
                    <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? 'text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        style={tab === t.key ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                        <Icon size={14} /> {t.label}
                    </button>
                ); })}
            </div>

            {/* INVOICES */}
            {tab === 'invoices' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📋 Fee Invoices</p>
                        <button onClick={generateInvoices} disabled={saving || !selTerm || !selForm}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${selTerm && selForm ? 'hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed'}`}
                            style={selTerm && selForm ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                            <FiPlus size={14} /> {saving ? 'Generating…' : 'Generate Invoices'}
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {[
                                            { label: '#', col: C.num },
                                            { label: '📋 Invoice #', col: C.inv },
                                            { label: '👤 Student', col: C.name },
                                            { label: '💵 Total', col: C.total },
                                            { label: '✅ Paid', col: C.paid },
                                            { label: '⚠️ Balance', col: C.balance },
                                            { label: '📅 Due Date', col: C.date },
                                            { label: '📊 Status', col: C.status },
                                        ].map((h, i) => (
                                            <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                                style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                            <div className="flex flex-col items-center gap-2"><span className="text-5xl">📋</span><p className="text-sm font-medium">No invoices yet</p><p className="text-xs">Select term & form, then Generate</p></div>
                                        </td></tr>
                                    ) : invoices.map((inv, idx) => {
                                        const student = students.find(s => s.id === inv.student_id);
                                        const statusColors: Record<string, string> = { Paid: 'bg-green-100 text-green-700', Unpaid: 'bg-red-100 text-red-700', Partial: 'bg-amber-100 text-amber-700' };
                                        return (
                                            <tr key={inv.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                                <td className="px-3 py-3 text-center font-bold" style={{ background: C.num.bg + '60', color: C.num.text }}>{idx + 1}</td>
                                                <td className="px-3 py-3 font-mono text-xs" style={{ background: C.inv.bg + '60', color: C.inv.text }}>{inv.invoice_number}</td>
                                                <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                                    <div className="flex items-center gap-2.5">
                                                        <StudentAvatar name={student ? `${student.first_name} ${student.last_name}` : '?'} size={32} />
                                                        <span className="font-bold text-gray-900">{student ? `${student.first_name} ${student.last_name}` : `ID: ${inv.student_id}`}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right font-bold" style={{ background: C.total.bg + '60', color: C.total.text }}>Ksh {Number(inv.total_amount).toLocaleString()}</td>
                                                <td className="px-3 py-3 text-right font-bold" style={{ background: C.paid.bg + '60', color: C.paid.text }}>Ksh {Number(inv.amount_paid).toLocaleString()}</td>
                                                <td className="px-3 py-3 text-right font-extrabold" style={{ background: C.balance.bg + '60', color: C.balance.text }}>Ksh {Number(inv.balance).toLocaleString()}</td>
                                                <td className="px-3 py-3 text-center" style={{ background: C.date.bg + '60', color: C.date.text }}>{inv.due_date || '—'}</td>
                                                <td className="px-3 py-3 text-center" style={{ background: C.status.bg + '60' }}>
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusColors[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* DEMAND LETTERS */}
            {tab === 'demand' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">⚠️ Fee Defaulters</p>
                        <div className="flex items-center gap-2">
                            <select value={bulkLetterType} onChange={e => setBulkLetterType(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                                <option value="First Notice">First Notice</option>
                                <option value="Final Notice">Final Notice</option>
                                <option value="Pre-Suspension">Pre-Suspension</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {[
                                            { label: '👤 Student', col: C.name },
                                            { label: '👨‍👩‍👧 Guardian', col: C.contact },
                                            { label: '💵 Total Fees', col: C.total },
                                            { label: '✅ Paid', col: C.paid },
                                            { label: '⚠️ Balance', col: C.balance },
                                            { label: '📞 Phone', col: C.sms },
                                            { label: '⚡ Action', col: C.actions },
                                        ].map((h, i) => (
                                            <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                                style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {defaulters.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                            <div className="flex flex-col items-center gap-2"><span className="text-5xl">✅</span><p className="text-sm font-medium">No fee defaulters found</p></div>
                                        </td></tr>
                                    ) : defaulters.slice(0, 50).map(d => (
                                        <tr key={d.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                            <td className="px-3 py-3" style={{ background: C.name.bg + '60' }}>
                                                <div className="flex items-center gap-2.5">
                                                    <StudentAvatar name={`${d.first_name} ${d.last_name}`} size={32} />
                                                    <span className="font-bold text-gray-900">{d.first_name} {d.last_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3" style={{ background: C.contact.bg + '60', color: C.contact.text }}>{d.guardian_name || '—'}</td>
                                            <td className="px-3 py-3 text-right font-bold" style={{ background: C.total.bg + '60', color: C.total.text }}>Ksh {d.totalFees.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-right font-bold" style={{ background: C.paid.bg + '60', color: C.paid.text }}>Ksh {d.totalPaid.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-right font-extrabold" style={{ background: C.balance.bg + '60', color: C.balance.text }}>Ksh {d.balance.toLocaleString()}</td>
                                            <td className="px-3 py-3" style={{ background: C.sms.bg + '60' }}>
                                                {d.guardian_phone ? <div className="flex items-center gap-1 font-medium whitespace-nowrap" style={{ color: C.sms.text }}><FiPhone size={10} /> {d.guardian_phone}</div> : <span className="text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">No phone</span>}
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.actions.bg + '60' }}>
                                                <button onClick={() => createDemandLetter(d.id, d.balance)} disabled={saving}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                                    <FiAlertTriangle size={12} className="inline mr-1" /> Issue
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Existing demand letters */}
                    {demandLetters.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📨 Issued Demand Letters</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            {[
                                                { label: '👤 Student', col: C.name },
                                                { label: '📨 Type', col: C.type },
                                                { label: '💰 Amount', col: C.amount },
                                                { label: '📱 SMS', col: C.sms },
                                                { label: '📊 Status', col: C.status },
                                                { label: '⚡ Actions', col: C.actions },
                                            ].map((h, i) => (
                                                <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                                    style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {demandLetters.map(dl => {
                                            const student = students.find(s => s.id === dl.student_id);
                                            return (
                                                <tr key={dl.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                                    <td className="px-3 py-3 font-bold text-gray-900" style={{ background: C.name.bg + '60' }}>{student ? `${student.first_name} ${student.last_name}` : `ID: ${dl.student_id}`}</td>
                                                    <td className="px-3 py-3 text-center" style={{ background: C.type.bg + '60', color: C.type.text }}>{dl.letter_type}</td>
                                                    <td className="px-3 py-3 text-right font-extrabold" style={{ background: C.amount.bg + '60', color: C.amount.text }}>Ksh {Number(dl.amount_owed).toLocaleString()}</td>
                                                    <td className="px-3 py-3 text-center" style={{ background: C.sms.bg + '60' }}>{dl.sms_sent ? <FiCheckCircle className="text-green-500 mx-auto" /> : <FiXCircle className="text-gray-300 mx-auto" />}</td>
                                                    <td className="px-3 py-3 text-center" style={{ background: C.status.bg + '60' }}>
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${dl.status === 'Sent' ? 'bg-green-100 text-green-700' : dl.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>{dl.status}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center" style={{ background: C.actions.bg + '60' }}>
                                                        {!dl.sms_sent && (
                                                            <button onClick={() => sendDemandLetter(dl)} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                                                <FiSend size={12} className="inline mr-1" /> Send
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BULK ACTIONS */}
            {tab === 'bulk' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">⚡ Bulk Demand Letter Generation</p>
                    <p className="text-xs text-gray-400">Generate demand letters for all students owing above a threshold amount</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Minimum Balance Threshold (Ksh)</label>
                            <input type="number" value={bulkThreshold} onChange={e => setBulkThreshold(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Letter Type</label>
                            <select value={bulkLetterType} onChange={e => setBulkLetterType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50">
                                <option value="First Notice">First Notice</option>
                                <option value="Final Notice">Final Notice</option>
                                <option value="Pre-Suspension">Pre-Suspension</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={generateBulkDemandLetters} disabled={saving}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                <FiSend size={16} /> {saving ? 'Generating…' : `Generate for ${defaulters.filter(d => d.balance >= bulkThreshold).length} Students`}
                            </button>
                        </div>
                    </div>
                    <div className="relative p-4 rounded-2xl border-2 overflow-hidden" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', borderColor: '#fed7aa' }}>
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 opacity-10" style={{ background: '#f59e0b' }} />
                        <p className="text-xs text-amber-700 font-bold">⚡ Preview: {defaulters.filter(d => d.balance >= bulkThreshold).length} students with balance ≥ Ksh {bulkThreshold.toLocaleString()} will receive a <strong>{bulkLetterType}</strong></p>
                    </div>
                </div>
            )}
        </div>
    );
}

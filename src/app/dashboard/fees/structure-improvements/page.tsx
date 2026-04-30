'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDollarSign, FiUsers, FiCheckCircle, FiXCircle, FiEdit2, FiSave, FiPlus, FiTrash2, FiPercent, FiAward, FiShield, FiSearch, FiX, FiRefreshCw, FiPhone } from 'react-icons/fi';

// ── Color tokens per column ──
const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    name:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    type:    { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    amount:  { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    reason:  { bg: '#f8fafc', text: '#475569', head: '#e2e8f0' },
    status:  { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
    actions: { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    form:    { bg: '#fff7ed', text: '#c2410c', head: '#fed7aa' },
    tuition: { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    boarding:{ bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    cap:     { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    sibl:    { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    schol:   { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    total:   { bg: '#fff1f2', text: '#be123c', head: '#fecdd3' },
};

const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
    'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
    'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
];

function FormAvatar({ name, size = 34 }: { name: string; size?: number }) {
    const initials = (name || '?').replace(/[^A-Z0-9]/gi, '').slice(0, 2) || '?';
    const idx = (name || '').charCodeAt(0) % GRADIENTS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, letterSpacing: 0.5, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
            {initials}
        </div>
    );
}

interface FeeStructure { id?: number; form_id: number; form_name?: string; tuition: number; boarding: number; transport: number; activity: number; exam: number; development: number; total_amount: number; sibling_discount_pct: number; scholarship_amount: number; government_capitation: number; }
interface Waiver { id?: number; student_id: number; term_id: number; waiver_type: string; amount: number; reason: string; requested_by: string; approved_by: string; status: string; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; form_id: number; guardian_name?: string; guardian_phone?: string; status: string; }

export default function FeeStructureImprovementsPage() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'structure' | 'waivers' | 'capitation' | 'analytics'>('structure');
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [waivers, setWaivers] = useState<Waiver[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [feePayments, setFeePayments] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [showWaiverModal, setShowWaiverModal] = useState(false);
    const [waiverForm, setWaiverForm] = useState<Partial<Waiver>>({ waiver_type: 'Scholarship', amount: 0, reason: '', status: 'Pending' });
    const [editState, setEditState] = useState<Record<number, FeeStructure>>({});

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fsRes, wRes, sRes, fRes, tRes, fpRes] = await Promise.all([
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_fee_waivers').select('*').order('id', { ascending: false }),
            supabase.from('school_students').select('*').eq('status', 'Active').order('last_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_fee_payments').select('*'),
        ]);
        setFeeStructures(fsRes.data || []);
        setWaivers(wRes.data || []);
        setStudents(sRes.data || []);
        setForms(fRes.data || []);
        setTerms(tRes.data || []);
        setFeePayments(fpRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const saveStructure = async (fs: FeeStructure) => {
        setSaving(true);
        const total = Number(fs.tuition || 0) + Number(fs.boarding || 0) + Number(fs.transport || 0) + Number(fs.activity || 0) + Number(fs.exam || 0) + Number(fs.development || 0);
        const data = { ...fs, total_amount: total };
        if (fs.id) {
            const { error } = await supabase.from('school_fee_structures').update(data).eq('id', fs.id);
            if (error) toast.error('Failed to save'); else toast.success('Fee structure saved');
        } else {
            const { error } = await supabase.from('school_fee_structures').insert([data]);
            if (error) toast.error('Failed to create'); else toast.success('Fee structure created');
        }
        setSaving(false);
        fetchAll();
    };

    const saveWaiver = async () => {
        if (!waiverForm.student_id || !waiverForm.amount) { toast.error('Fill all required fields'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_fee_waivers').insert([{ ...waiverForm, term_id: Number(selTerm) }]);
        if (error) toast.error('Failed to create waiver'); else { toast.success('Waiver created'); setShowWaiverModal(false); }
        setSaving(false);
        fetchAll();
    };

    const approveWaiver = async (id: number, approvedBy: string) => {
        const { error } = await supabase.from('school_fee_waivers').update({ status: 'Approved', approved_by: approvedBy }).eq('id', id);
        if (error) toast.error('Failed'); else toast.success('Waiver approved');
        fetchAll();
    };

    const rejectWaiver = async (id: number) => {
        const { error } = await supabase.from('school_fee_waivers').update({ status: 'Rejected' }).eq('id', id);
        if (error) toast.error('Failed'); else toast.success('Waiver rejected');
        fetchAll();
    };

    // Analytics
    const totalProjected = feeStructures.reduce((s, fs) => {
        const formStudents = students.filter(st => st.form_id === fs.form_id);
        return s + (Number(fs.total_amount || 0) * formStudents.length);
    }, 0);
    const totalCollected = feePayments.reduce((s: number, fp: any) => s + Number(fp.amount || 0), 0);
    const totalWaivers = waivers.filter(w => w.status === 'Approved').reduce((s, w) => s + Number(w.amount || 0), 0);
    const totalCapitation = feeStructures.reduce((s, fs) => {
        const formStudents = students.filter(st => st.form_id === fs.form_id);
        return s + (Number(fs.government_capitation || 0) * formStudents.length);
    }, 0);
    const collectionRate = totalProjected > 0 ? (totalCollected / totalProjected) * 100 : 0;

    const tabs = [
        { key: 'structure', label: 'Fee Structure', icon: FiDollarSign },
        { key: 'waivers', label: 'Waivers & Scholarships', icon: FiAward },
        { key: 'capitation', label: 'Govt Capitation', icon: FiShield },
        { key: 'analytics', label: 'Collection Analytics', icon: FiPercent },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>💰</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Fee Management…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">💰 Fee Structure & Waivers</h1>
                    <p className="text-sm text-gray-500 mt-1">Sibling discounts, scholarships, government capitation & fee waiver workflow</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">
                        <option value="">Select Term</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Projected Revenue', value: `Ksh ${totalProjected.toLocaleString()}`, emoji: '📊', color: '#6366f1', sub: 'Total expected' },
                    { label: 'Collected', value: `Ksh ${totalCollected.toLocaleString()}`, emoji: '✅', color: '#10b981', sub: 'Received so far' },
                    { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, emoji: '📈', color: collectionRate >= 80 ? '#10b981' : collectionRate >= 50 ? '#f59e0b' : '#ef4444', sub: collectionRate >= 80 ? 'On track' : collectionRate >= 50 ? 'Needs attention' : 'Critical' },
                    { label: 'Govt Capitation', value: `Ksh ${totalCapitation.toLocaleString()}`, emoji: '🏛️', color: '#7c3aed', sub: 'Expected from govt' },
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                            <span className="text-xl">{card.emoji}</span>
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
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

            {/* FEE STRUCTURE */}
            {tab === 'structure' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📋 Fee Structure per Form</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: '🏫 Form', col: C.form },
                                        { label: '📚 Tuition', col: C.tuition },
                                        { label: '🏠 Boarding', col: C.boarding },
                                        { label: '🚌 Transport', col: C.name },
                                        { label: '🎯 Activity', col: C.type },
                                        { label: '📝 Exam', col: C.amount },
                                        { label: '🏗️ Dev.', col: C.reason },
                                        { label: '💵 Total', col: C.total },
                                        { label: '👨‍👦 Sibling %', col: C.sibl },
                                        { label: '🎓 Scholarship', col: C.schol },
                                        { label: '🏛️ Capitation', col: C.cap },
                                        { label: '💾', col: C.actions },
                                    ].map((h, i) => (
                                        <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {forms.map(form => {
                                    const dbFs = feeStructures.find((f: any) => f.form_id === form.id) || { form_id: form.id, tuition: 0, boarding: 0, transport: 0, activity: 0, exam: 0, development: 0, total_amount: 0, sibling_discount_pct: 0, scholarship_amount: 0, government_capitation: 0 };
                                    const editFs = editState[form.id] || dbFs;
                                    const updateField = (key: string, val: number) => setEditState(prev => ({ ...prev, [form.id]: { ...editFs, [key]: val } }));
                                    const cols: [string, typeof C.tuition][] = [['tuition', C.tuition],['boarding', C.boarding],['transport', C.name],['activity', C.type],['exam', C.amount],['development', C.reason]];
                                    return (
                                        <tr key={form.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'}
                                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                                            <td className="px-3 py-3" style={{ background: C.form.bg + '60' }}>
                                                <div className="flex items-center gap-2.5">
                                                    <FormAvatar name={form.form_name} size={32} />
                                                    <span className="font-bold text-gray-900">{form.form_name}</span>
                                                </div>
                                            </td>
                                            {cols.map(([key, col]) => (
                                                <td key={key} className="px-3 py-3 text-center" style={{ background: col.bg + '60' }}>
                                                    <input type="number" value={(editFs as any)[key] || 0} onChange={e => updateField(key, Number(e.target.value))}
                                                        className="w-20 px-1 py-1 border border-gray-200 rounded text-center text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none" />
                                                </td>
                                            ))}
                                            <td className="px-3 py-3 text-center font-extrabold" style={{ background: C.total.bg + '60', color: C.total.text }}>
                                                {(Number(editFs.tuition||0)+Number(editFs.boarding||0)+Number(editFs.transport||0)+Number(editFs.activity||0)+Number(editFs.exam||0)+Number(editFs.development||0)).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.sibl.bg + '60' }}>
                                                <input type="number" value={editFs.sibling_discount_pct || 0} onChange={e => updateField('sibling_discount_pct', Number(e.target.value))}
                                                    className="w-16 px-1 py-1 border border-blue-200 rounded text-center text-sm bg-blue-50 text-blue-700 font-bold focus:border-blue-400 outline-none" min={0} max={100} />
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.schol.bg + '60' }}>
                                                <input type="number" value={editFs.scholarship_amount || 0} onChange={e => updateField('scholarship_amount', Number(e.target.value))}
                                                    className="w-20 px-1 py-1 border border-purple-200 rounded text-center text-sm bg-purple-50 text-purple-700 font-bold focus:border-purple-400 outline-none" />
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.cap.bg + '60' }}>
                                                <input type="number" value={editFs.government_capitation || 0} onChange={e => updateField('government_capitation', Number(e.target.value))}
                                                    className="w-20 px-1 py-1 border border-green-200 rounded text-center text-sm bg-green-50 text-green-700 font-bold focus:border-green-400 outline-none" />
                                            </td>
                                            <td className="px-3 py-3 text-center" style={{ background: C.actions.bg + '60' }}>
                                                <button onClick={() => saveStructure(editFs)} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                                    <FiSave size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* WAIVERS & SCHOLARSHIPS */}
            {tab === 'waivers' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm">Fee Waivers & Scholarships</h3>
                        <button onClick={() => { setWaiverForm({ waiver_type: 'Scholarship', amount: 0, reason: '', status: 'Pending' }); setShowWaiverModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all">
                            <FiPlus size={14} /> New Waiver
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Student</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Reason</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Requested By</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waivers.map(w => {
                                        const student = students.find(s => s.id === w.student_id);
                                        const statusColors: Record<string, string> = { Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700' };
                                        return (
                                            <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : `ID: ${w.student_id}`}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">{w.waiver_type}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">Ksh {Number(w.amount).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{w.reason}</td>
                                                <td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[w.status] || 'bg-gray-100 text-gray-600'}`}>{w.status}</span></td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{w.requested_by || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {w.status === 'Pending' && (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => approveWaiver(w.id!, 'Admin')} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"><FiCheckCircle size={14} /></button>
                                                            <button onClick={() => rejectWaiver(w.id!)} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"><FiXCircle size={14} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {waivers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No waivers created yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Waiver Modal */}
                    {showWaiverModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">New Fee Waiver</h3>
                                <select value={waiverForm.student_id || ''} onChange={e => setWaiverForm({...waiverForm, student_id: Number(e.target.value)})}
                                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none">
                                    <option value="">Select Student</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                                </select>
                                <select value={waiverForm.waiver_type} onChange={e => setWaiverForm({...waiverForm, waiver_type: e.target.value})}
                                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none">
                                    <option value="Scholarship">Scholarship</option>
                                    <option value="Bursary">Bursary</option>
                                    <option value="Sibling Discount">Sibling Discount</option>
                                    <option value="NG-CDF">NG-CDF Bursary</option>
                                    <option value="County Bursary">County Bursary</option>
                                    <option value="Hardship">Hardship Waiver</option>
                                    <option value="Staff Child">Staff Child Discount</option>
                                </select>
                                <input type="number" value={waiverForm.amount || 0} onChange={e => setWaiverForm({...waiverForm, amount: Number(e.target.value)})} placeholder="Amount (Ksh)"
                                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
                                <textarea value={waiverForm.reason} onChange={e => setWaiverForm({...waiverForm, reason: e.target.value})} placeholder="Reason" rows={2}
                                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none resize-none" />
                                <input type="text" value={waiverForm.requested_by || ''} onChange={e => setWaiverForm({...waiverForm, requested_by: e.target.value})} placeholder="Requested By"
                                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowWaiverModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                                    <button onClick={saveWaiver} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600">{saving ? 'Saving...' : 'Create Waiver'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* GOVT CAPITATION */}
            {tab === 'capitation' && (
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-700 text-sm">Government Capitation Tracking</h3>
                            <p className="text-xs text-gray-400 mt-1">Track NG-CDF, county bursaries, and MOE capitation per form</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Form</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500">Students</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Capitation/Student</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Total Expected</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Total Collected</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Shortfall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forms.map(form => {
                                        const fs = feeStructures.find((f: any) => f.form_id === form.id);
                                        const formStudents = students.filter(s => s.form_id === form.id);
                                        const capPerStudent = Number(fs?.government_capitation || 0);
                                        const totalExpected = capPerStudent * formStudents.length;
                                        const formWaivers = waivers.filter(w => w.status === 'Approved' && formStudents.some(s => s.id === w.student_id) && (w.waiver_type === 'NG-CDF' || w.waiver_type === 'County Bursary'));
                                        const totalCollected = formWaivers.reduce((s, w) => s + Number(w.amount || 0), 0);
                                        return (
                                            <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-800">{form.form_name}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">{formStudents.length}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">Ksh {capPerStudent.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">Ksh {totalExpected.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-green-600">Ksh {totalCollected.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-red-500">Ksh {(totalExpected - totalCollected).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* COLLECTION ANALYTICS */}
            {tab === 'analytics' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Projected Revenue', value: `Ksh ${totalProjected.toLocaleString()}`, emoji: '📊', color: '#6366f1', sub: 'Total expected' },
                        { label: 'Collected', value: `Ksh ${totalCollected.toLocaleString()}`, emoji: '✅', color: '#10b981', sub: 'Received so far' },
                        { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, emoji: '📈', color: collectionRate >= 80 ? '#10b981' : collectionRate >= 50 ? '#f59e0b' : '#ef4444', sub: collectionRate >= 80 ? 'On track' : collectionRate >= 50 ? 'Needs attention' : 'Critical', pulse: collectionRate < 50 },
                        { label: 'Govt Capitation', value: `Ksh ${totalCapitation.toLocaleString()}`, emoji: '🏛️', color: '#7c3aed', sub: 'Expected from govt' },
                    ].map((card, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                                <span className="text-xl">{card.emoji}</span>
                            </div>
                            <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                            {card.pulse && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: card.color }} />}
                            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: card.color }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

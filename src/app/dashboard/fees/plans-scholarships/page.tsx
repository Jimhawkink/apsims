'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiCalendar, FiRefreshCw, FiPlus, FiSearch, FiCheck, FiX, FiClock,
    FiDollarSign, FiUser, FiAlertTriangle, FiGift, FiPercent, FiAward,
    FiUsers, FiEdit2, FiTrash2, FiCheckCircle, FiXCircle
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
type Tab = 'plans' | 'scholarships' | 'discounts';

export default function PaymentPlansPage() {
    const [tab, setTab] = useState<Tab>('plans');
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [scholarships, setScholarships] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Plan form
    const [planForm, setPlanForm] = useState({ student_id: '', total_amount: '', installments: 3, frequency: 'Monthly', start_date: new Date().toISOString().split('T')[0], notes: '' });
    // Scholarship form
    const [schForm, setSchForm] = useState({ student_id: '', scholarship_name: '', scholarship_type: 'Partial', sponsor: '', amount: '', percentage: '', applies_to: 'All Fees', reason: '', notes: '' });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, plRes, iRes, scRes, fRes, tRes, fsRes, fpRes] = await Promise.all([
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no, form_id, guardian_name, guardian_phone, status').eq('status', 'Active').order('last_name'),
            supabase.from('school_payment_plans').select('*').order('created_at', { ascending: false }),
            supabase.from('school_plan_installments').select('*').order('due_date'),
            supabase.from('school_scholarships').select('*').order('created_at', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_fee_payments').select('id, student_id, amount'),
        ]);
        setStudents(sRes.data || []);
        setPlans(plRes.data || []);
        setInstallments(iRes.data || []);
        setScholarships(scRes.data || []);
        setForms(fRes.data || []);
        setTerms(tRes.data || []);
        setStructures(fsRes.data || []);
        setPayments(fpRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (formId: number) => forms.find(f => f.id === formId)?.form_name || '-';
    const getStudent = (id: number) => students.find(s => s.id === id);
    const getStudentBalance = (studentId: number, formId: number) => {
        const fs = structures.filter(s => s.form_id === formId);
        const total = fs.reduce((s, f) => s + Number(f.amount || f.tuition || 0), 0);
        const paid = payments.filter(p => p.student_id === studentId).reduce((s, p) => s + Number(p.amount || 0), 0);
        return { total, paid, balance: Math.max(0, total - paid) };
    };

    // Student search
    const searchResults = useMemo(() => {
        if (!search) return [];
        const s = search.toLowerCase();
        return students.filter(st =>
            `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
            (st.admission_number || st.admission_no || '').toLowerCase().includes(s)
        ).slice(0, 12);
    }, [students, search]);

    // Create payment plan
    const createPlan = async () => {
        if (!planForm.student_id || !planForm.total_amount) { toast.error('Select student and enter amount'); return; }
        setSaving(true);
        const totalAmount = Number(planForm.total_amount);
        const numInstallments = Number(planForm.installments);
        const installmentAmount = Math.ceil(totalAmount / numInstallments);

        const { data: plan, error } = await supabase.from('school_payment_plans').insert([{
            student_id: Number(planForm.student_id),
            total_amount: totalAmount,
            installments: numInstallments,
            frequency: planForm.frequency,
            start_date: planForm.start_date,
            notes: planForm.notes,
            status: 'Active',
            approved_by: 'Admin',
            approved_at: new Date().toISOString(),
        }]).select().single();

        if (error || !plan) { toast.error('Failed to create plan'); setSaving(false); return; }

        // Create installments
        const installmentRows = [];
        for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date(planForm.start_date);
            if (planForm.frequency === 'Weekly') dueDate.setDate(dueDate.getDate() + i * 7);
            else if (planForm.frequency === 'Bi-Weekly') dueDate.setDate(dueDate.getDate() + i * 14);
            else dueDate.setMonth(dueDate.getMonth() + i);

            installmentRows.push({
                plan_id: plan.id,
                installment_number: i + 1,
                due_date: dueDate.toISOString().split('T')[0],
                amount_due: i < numInstallments - 1 ? installmentAmount : totalAmount - installmentAmount * (numInstallments - 1),
                status: 'Pending',
            });
        }

        await supabase.from('school_plan_installments').insert(installmentRows);
        toast.success(`✅ Payment plan created with ${numInstallments} installments`);
        setShowPlanModal(false);
        setPlanForm({ student_id: '', total_amount: '', installments: 3, frequency: 'Monthly', start_date: new Date().toISOString().split('T')[0], notes: '' });
        setSaving(false);
        fetchAll();
    };

    // Create scholarship
    const createScholarship = async () => {
        if (!schForm.student_id || !schForm.scholarship_name) { toast.error('Fill required fields'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_scholarships').insert([{
            student_id: Number(schForm.student_id),
            scholarship_name: schForm.scholarship_name,
            scholarship_type: schForm.scholarship_type,
            sponsor: schForm.sponsor,
            amount: Number(schForm.amount || 0),
            percentage: schForm.percentage ? Number(schForm.percentage) : null,
            applies_to: schForm.applies_to,
            reason: schForm.reason,
            notes: schForm.notes,
            status: 'Active',
            approved_by: 'Admin',
            approved_at: new Date().toISOString(),
        }]);
        if (error) { toast.error('Failed to create scholarship'); setSaving(false); return; }
        toast.success('Scholarship applied ✅');
        setShowScholarshipModal(false);
        setSchForm({ student_id: '', scholarship_name: '', scholarship_type: 'Partial', sponsor: '', amount: '', percentage: '', applies_to: 'All Fees', reason: '', notes: '' });
        setSaving(false);
        fetchAll();
    };

    // Stats
    const activePlans = plans.filter(p => p.status === 'Active');
    const totalPlanAmount = activePlans.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const overdueInstallments = installments.filter(i => i.status === 'Pending' && new Date(i.due_date) < new Date());
    const activeScholarships = scholarships.filter(s => s.status === 'Active');
    const totalScholarshipValue = activeScholarships.reduce((s, sc) => s + Number(sc.amount || 0), 0);

    // Sibling detection
    const siblingGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        students.forEach(s => {
            const phone = s.guardian_phone?.replace(/\D/g, '') || '';
            if (phone) { if (!groups[phone]) groups[phone] = []; groups[phone].push(s); }
        });
        return Object.entries(groups).filter(([, v]) => v.length > 1);
    }, [students]);

    const tabConfig = [
        { k: 'plans', l: '📅 Payment Plans', icon: FiCalendar },
        { k: 'scholarships', l: '🎓 Scholarships & Waivers', icon: FiAward },
        { k: 'discounts', l: '👨‍👩‍👧‍👦 Sibling & Discounts', icon: FiUsers },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>💰</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-purple-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Plans & Scholarships…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <FiCalendar className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                💰 Payment Plans & Scholarships
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full">FLEXIBLE</span>
                            </h1>
                            <p className="text-purple-300 text-xs mt-0.5 font-medium">Installment Plans • Scholarships • Waivers • Sibling Discounts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowPlanModal(true)} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 transition-all flex items-center gap-1.5 shadow-md"><FiPlus size={13} /> New Plan</button>
                        <button onClick={() => setShowScholarshipModal(true)} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 transition-all flex items-center gap-1.5 shadow-md"><FiGift size={13} /> Add Scholarship</button>
                        <button onClick={fetchAll} className="px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"><FiRefreshCw size={13} /></button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Active Plans', value: String(activePlans.length), emoji: '📅', color: '#8b5cf6' },
                            { label: 'Plan Total', value: fmt(totalPlanAmount), emoji: '💰', color: '#6366f1' },
                            { label: 'Overdue Installments', value: String(overdueInstallments.length), emoji: '⚠️', color: '#ef4444', pulse: overdueInstallments.length > 0 },
                            { label: 'Active Scholarships', value: String(activeScholarships.length), emoji: '🎓', color: '#22c55e' },
                            { label: 'Scholarship Value', value: fmt(totalScholarshipValue), emoji: '🎁', color: '#10b981' },
                            { label: 'Sibling Groups', value: String(siblingGroups.length), emoji: '👨‍👩‍👧‍👦', color: '#f59e0b' },
                        ].map((card, i) => (
                            <div key={i} className={`relative rounded-xl p-3 overflow-hidden transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-1.5"><span className="text-sm">{card.emoji}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span></div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map(t => {
                    const isActive = tab === t.k;
                    const Icon = t.icon;
                    return (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={isActive ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(139,92,246,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            <Icon size={15} /> <span>{t.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══ PAYMENT PLANS TAB ═══ */}
            {tab === 'plans' && (
                <div className="space-y-4">
                    {activePlans.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                            <span className="text-5xl block mb-3">📅</span>
                            <p className="text-sm font-bold text-gray-600">No payment plans yet</p>
                            <p className="text-xs text-gray-400 mt-1">Create installment plans for students who need flexible payment schedules</p>
                            <button onClick={() => setShowPlanModal(true)} className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><FiPlus size={12} className="inline mr-1" /> Create First Plan</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activePlans.map(plan => {
                                const student = getStudent(plan.student_id);
                                const planInstallments = installments.filter(i => i.plan_id === plan.id).sort((a, b) => a.installment_number - b.installment_number);
                                const paidCount = planInstallments.filter(i => i.status === 'Paid').length;
                                const totalPaid = planInstallments.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount_due || 0), 0);
                                const pct = plan.total_amount > 0 ? Math.round((totalPaid / plan.total_amount) * 100) : 0;

                                return (
                                    <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                                    {student ? student.first_name[0] + student.last_name[0] : '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : `ID: ${plan.student_id}`}</p>
                                                    <p className="text-[10px] text-gray-400">{student?.admission_number || student?.admission_no} • {getFormName(student?.form_id)} • {plan.frequency}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-gray-800">{fmt(plan.total_amount)}</p>
                                                    <p className="text-[10px] text-gray-400">{paidCount}/{planInstallments.length} paid</p>
                                                </div>
                                                <div className="w-20">
                                                    <div className="w-full bg-gray-100 rounded-full h-2.5"><div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }} /></div>
                                                    <p className="text-[10px] font-bold text-center mt-0.5" style={{ color: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }}>{pct}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Installment timeline */}
                                        <div className="px-5 py-3">
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                                                {planInstallments.map((inst, idx) => {
                                                    const isOverdue = inst.status === 'Pending' && new Date(inst.due_date) < new Date();
                                                    const isPaid = inst.status === 'Paid';
                                                    return (
                                                        <div key={inst.id} className="flex items-center">
                                                            <div className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[90px] border transition-all cursor-default ${isPaid ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                                                <span className={`text-lg ${isPaid ? '' : isOverdue ? '' : ''}`}>{isPaid ? '✅' : isOverdue ? '🔴' : '⏳'}</span>
                                                                <p className="text-[10px] font-bold text-gray-700 mt-0.5">#{inst.installment_number}</p>
                                                                <p className="text-xs font-bold" style={{ color: isPaid ? '#22c55e' : isOverdue ? '#ef4444' : '#6b7280' }}>{fmt(inst.amount_due)}</p>
                                                                <p className="text-[9px] text-gray-400">{new Date(inst.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</p>
                                                                {!isPaid && (
                                                                    <button onClick={async () => {
                                                                        await supabase.from('school_plan_installments').update({ status: 'Paid', paid_at: new Date().toISOString() }).eq('id', inst.id);
                                                                        toast.success(`Installment #${inst.installment_number} marked as paid ✅`);
                                                                        fetchAll();
                                                                    }} className="mt-1 text-[9px] font-bold text-green-600 hover:text-green-800">Mark Paid</button>
                                                                )}
                                                            </div>
                                                            {idx < planInstallments.length - 1 && <div className="w-4 h-0.5 bg-gray-200 mx-0.5" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ SCHOLARSHIPS TAB ═══ */}
            {tab === 'scholarships' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🎓 Scholarships & Waivers ({scholarships.length})</p>
                        <button onClick={() => setShowScholarshipModal(true)} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><FiPlus size={11} className="inline mr-1" /> Add</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['Student', 'Scholarship', 'Type', 'Sponsor', 'Amount/Pct', 'Applies To', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {scholarships.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🎓</span><p className="text-sm">No scholarships yet</p></td></tr>
                                ) : scholarships.map(sc => {
                                    const student = getStudent(sc.student_id);
                                    return (
                                        <tr key={sc.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : '-'}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-purple-700">{sc.scholarship_name}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.scholarship_type === 'Full' ? 'bg-green-100 text-green-700' : sc.scholarship_type === 'Bursary' ? 'bg-blue-100 text-blue-700' : sc.scholarship_type === 'Waiver' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>{sc.scholarship_type}</span></td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{sc.sponsor || '-'}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{sc.amount ? fmt(sc.amount) : sc.percentage ? `${sc.percentage}%` : '-'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{sc.applies_to}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sc.status}</span></td>
                                            <td className="px-3 py-2.5">
                                                {sc.status === 'Active' && (
                                                    <button onClick={async () => { await supabase.from('school_scholarships').update({ status: 'Revoked' }).eq('id', sc.id); toast.success('Revoked'); fetchAll(); }}
                                                        className="text-[10px] font-bold text-red-500 hover:text-red-700"><FiXCircle size={12} className="inline mr-0.5" /> Revoke</button>
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

            {/* ═══ SIBLING DISCOUNTS TAB ═══ */}
            {tab === 'discounts' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">👨‍👩‍👧‍👦 Auto-Detected Sibling Groups ({siblingGroups.length})</p>
                        <p className="text-xs text-gray-500 mb-4">Students sharing the same guardian phone number are grouped as siblings. Apply discounts per family.</p>

                        {siblingGroups.length === 0 ? (
                            <div className="text-center py-10 text-gray-400"><span className="text-4xl block mb-2">👪</span><p className="text-sm">No sibling groups detected</p><p className="text-xs mt-1">Siblings are detected by matching guardian phone numbers</p></div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {siblingGroups.slice(0, 20).map(([phone, siblings]) => (
                                    <div key={phone} className="rounded-xl border border-purple-200 bg-purple-50/30 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">👨‍👩‍👧‍👦</span>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-700">{siblings[0]?.guardian_name || 'Guardian'}</p>
                                                    <p className="text-[10px] text-gray-400">📞 {phone} • {siblings.length} children</p>
                                                </div>
                                            </div>
                                            <button onClick={() => {
                                                siblings.slice(1).forEach(async (sib: any) => {
                                                    const existing = scholarships.find(s => s.student_id === sib.id && s.scholarship_type === 'Sibling Discount');
                                                    if (!existing) {
                                                        await supabase.from('school_scholarships').insert([{
                                                            student_id: sib.id,
                                                            scholarship_name: 'Sibling Discount',
                                                            scholarship_type: 'Sibling Discount',
                                                            percentage: 10,
                                                            applies_to: 'Tuition Only',
                                                            status: 'Active',
                                                            approved_by: 'System',
                                                            approved_at: new Date().toISOString(),
                                                            reason: `Sibling of ${siblings[0].first_name} ${siblings[0].last_name}`,
                                                        }]);
                                                    }
                                                });
                                                toast.success(`10% sibling discount applied to ${siblings.length - 1} student(s) ✅`);
                                                fetchAll();
                                            }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                                <FiPercent size={10} className="inline mr-1" /> Apply 10% Discount
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            {siblings.map((sib: any, idx: number) => {
                                                const hasDiscount = scholarships.some(s => s.student_id === sib.id && s.scholarship_type === 'Sibling Discount');
                                                return (
                                                    <div key={sib.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs">{idx === 0 ? '👤' : '👧'}</span>
                                                            <p className="text-xs font-semibold text-gray-800">{sib.first_name} {sib.last_name}</p>
                                                            <span className="text-[10px] text-gray-400">{sib.admission_number || sib.admission_no}</span>
                                                        </div>
                                                        {hasDiscount && <span className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">10% OFF</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ CREATE PLAN MODAL ═══ */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPlanModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiCalendar /> Create Payment Plan</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Search Student *</label>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or admission number..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" />
                                {searchResults.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg mt-1 divide-y divide-gray-100">
                                        {searchResults.map(st => (
                                            <div key={st.id} onClick={() => { setPlanForm(f => ({ ...f, student_id: String(st.id), total_amount: String(getStudentBalance(st.id, st.form_id).balance) })); setSearch(''); }}
                                                className="px-3 py-2 cursor-pointer hover:bg-purple-50 text-xs"><span className="font-semibold">{st.first_name} {st.last_name}</span> <span className="text-gray-400">({st.admission_number || st.admission_no})</span> — <span className="text-red-500 font-bold">Owes {fmt(getStudentBalance(st.id, st.form_id).balance)}</span></div>
                                        ))}
                                    </div>
                                )}
                                {planForm.student_id && <p className="text-xs text-purple-600 font-semibold mt-1">✅ Selected: {getStudent(Number(planForm.student_id))?.first_name} {getStudent(Number(planForm.student_id))?.last_name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Amount *</label><input type="number" value={planForm.total_amount} onChange={e => setPlanForm(f => ({ ...f, total_amount: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Installments</label><input type="number" min={2} max={12} value={planForm.installments} onChange={e => setPlanForm(f => ({ ...f, installments: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Frequency</label><select value={planForm.frequency} onChange={e => setPlanForm(f => ({ ...f, frequency: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200"><option>Weekly</option><option>Bi-Weekly</option><option>Monthly</option></select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Start Date</label><input type="date" value={planForm.start_date} onChange={e => setPlanForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" /></div>
                            </div>
                            {planForm.total_amount && <div className="p-3 rounded-xl bg-purple-50 border border-purple-200"><p className="text-xs font-bold text-purple-700">Preview: {planForm.installments} installments of ~{fmt(Math.ceil(Number(planForm.total_amount) / planForm.installments))} each ({planForm.frequency})</p></div>}
                            <textarea value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={createPlan} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>{saving ? 'Creating...' : 'Create Plan'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SCHOLARSHIP MODAL ═══ */}
            {showScholarshipModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowScholarshipModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                            <h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiAward /> Apply Scholarship / Waiver</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Search Student *</label>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or admission number..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-200" />
                                {searchResults.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg mt-1 divide-y divide-gray-100">
                                        {searchResults.map(st => (
                                            <div key={st.id} onClick={() => { setSchForm(f => ({ ...f, student_id: String(st.id) })); setSearch(''); }}
                                                className="px-3 py-2 cursor-pointer hover:bg-green-50 text-xs"><span className="font-semibold">{st.first_name} {st.last_name}</span> <span className="text-gray-400">({st.admission_number || st.admission_no})</span></div>
                                        ))}
                                    </div>
                                )}
                                {schForm.student_id && <p className="text-xs text-green-600 font-semibold mt-1">✅ Selected: {getStudent(Number(schForm.student_id))?.first_name} {getStudent(Number(schForm.student_id))?.last_name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Scholarship Name *</label><input value={schForm.scholarship_name} onChange={e => setSchForm(f => ({ ...f, scholarship_name: e.target.value }))} placeholder="e.g. CDF Bursary, Principal's Waiver..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-200" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Type</label><select value={schForm.scholarship_type} onChange={e => setSchForm(f => ({ ...f, scholarship_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"><option>Full</option><option>Partial</option><option>Bursary</option><option>Waiver</option><option>Sibling Discount</option></select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Sponsor</label><input value={schForm.sponsor} onChange={e => setSchForm(f => ({ ...f, sponsor: e.target.value }))} placeholder="CDF, NGO, Church..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Amount (KES)</label><input type="number" value={schForm.amount} onChange={e => setSchForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Or Percentage (%)</label><input type="number" value={schForm.percentage} onChange={e => setSchForm(f => ({ ...f, percentage: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" /></div>
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Applies To</label><select value={schForm.applies_to} onChange={e => setSchForm(f => ({ ...f, applies_to: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"><option>All Fees</option><option>Tuition Only</option><option>Boarding Only</option><option>Transport Only</option></select></div>
                            </div>
                            <textarea value={schForm.reason} onChange={e => setSchForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason / justification..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-200" />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setShowScholarshipModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={createScholarship} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>{saving ? 'Saving...' : 'Apply Scholarship'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

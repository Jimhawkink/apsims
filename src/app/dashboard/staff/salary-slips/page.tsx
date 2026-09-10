'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiPrinter, FiRefreshCw, FiUser, FiCalendar,
    FiDollarSign, FiFilter, FiChevronLeft, FiCheckCircle,
    FiSettings, FiX, FiAlertCircle, FiDownload, FiSend,
    FiTrendingUp, FiTrendingDown, FiCreditCard, FiFileText,
    FiBarChart2, FiAward, FiShield, FiZap, FiLayers, FiMail,
    FiPhone, FiMapPin, FiBriefcase, FiHash, FiInfo, FiCheck,
    FiActivity, FiPieChart, FiClipboard, FiArrowRight, FiStar,
} from 'react-icons/fi';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Kenya 2025/26 Tax Engine ─────────────────────────────────────────────────
const KE_PAYE_BANDS = [
    { max: 24000, rate: 0.10 }, { max: 32333, rate: 0.25 },
    { max: 500000, rate: 0.30 }, { max: 800000, rate: 0.325 },
    { max: Infinity, rate: 0.35 },
];
const PERSONAL_RELIEF = 2400;
const NSSF_TIER1 = 7000; const NSSF_TIER2 = 36000; const NSSF_RATE = 0.06;
const SHIF_RATE = 0.0275; const HOUSING_LEVY_RATE = 0.015;

function calcPAYE(taxable: number) {
    let tax = 0, prev = 0;
    for (const b of KE_PAYE_BANDS) {
        if (taxable <= 0) break;
        const sl = Math.min(taxable, b.max - prev); tax += sl * b.rate; prev = b.max; taxable -= sl;
    }
    return Math.max(0, Math.round(tax - PERSONAL_RELIEF));
}
function calcNSSF(gross: number) {
    const t1 = Math.round(Math.min(gross, NSSF_TIER1) * NSSF_RATE);
    const t2 = Math.round(Math.max(0, Math.min(gross, NSSF_TIER2) - NSSF_TIER1) * NSSF_RATE);
    return { tier1: t1, tier2: t2, total: t1 + t2 };
}
function calcSHIF(gross: number) { return Math.round(gross * SHIF_RATE); }
function calcHousingLevy(gross: number) { return Math.round(gross * HOUSING_LEVY_RATE); }
function calcInsuranceRelief(shif: number) { return Math.min(Math.round(shif * 0.15), 5000); }

function computeFromScratch(
    basic: number, house: number, transport: number, medical: number,
    responsibility: number, otherAllow: number,
    loans: number, advance: number, sacco: number, otherDed: number,
) {
    const gross = basic + house + transport + medical + responsibility + otherAllow;
    const nssf = calcNSSF(gross);
    const taxable = Math.max(0, gross - nssf.total);
    const paye = calcPAYE(taxable);
    const shif = calcSHIF(gross);
    const insRelief = calcInsuranceRelief(shif);
    const finalPaye = Math.max(0, paye - insRelief);
    const housing = calcHousingLevy(gross);
    const totalDed = finalPaye + shif + nssf.total + housing + loans + advance + sacco + otherDed;
    const net = Math.max(0, gross - totalDed);
    return { gross, taxable, paye: finalPaye, shif, nssf: nssf.total, nssfTier1: nssf.tier1, nssfTier2: nssf.tier2, housing, insRelief, totalDed, net };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Teacher {
    id: number; first_name: string; last_name: string; middle_name?: string;
    staff_type: string; designation?: string; department?: string;
    tsc_number?: string; kra_pin?: string; nhif_no?: string; nssf_no?: string;
    bank_name?: string; bank_account?: string; email?: string; phone?: string;
    employment_type?: string; id_number?: string; basic_salary?: number;
    house_allowance?: number; transport_allowance?: number;
}
interface PayrollRecord {
    id: string; staff_id: string; staff_name: string; staff_type: string;
    month: number; year: number; pay_period: string; payroll_number?: string;
    basic_salary: number; house_allowance: number; transport_allowance: number;
    medical_allowance?: number; other_allowances?: number;
    paye: number; nhif: number; nssf: number; housing_levy?: number;
    loan_deduction?: number; loan_deductions?: number;
    advance_deductions?: number; sacco_deductions?: number; other_deductions?: number;
    gross_pay: number; total_deductions: number; net_pay: number;
    status: string; payment_method?: string; approved_by?: string;
}
interface SalaryConfig {
    basic: number; house: number; transport: number; medical: number;
    responsibility: number; other_allowance: number; other_allowance_name: string;
    loans: number; advance: number; sacco: number; other_deduction: number;
    other_deduction_name: string;
}

const DEFAULT_CONFIG: SalaryConfig = {
    basic: 30000, house: 10000, transport: 5000, medical: 3000,
    responsibility: 0, other_allowance: 0, other_allowance_name: 'Other Allowance',
    loans: 0, advance: 0, sacco: 0, other_deduction: 0, other_deduction_name: 'Other Deduction',
};

// ─── Salary Config Modal (Ultra Premium) ──────────────────────────────────────
function SalaryConfigModal({
    teacher, config, payrollRecord, schoolName, onSave, onClose,
}: {
    teacher: Teacher; config: SalaryConfig; payrollRecord?: PayrollRecord | null;
    schoolName: string; onSave: (c: SalaryConfig) => void; onClose: () => void;
}) {
    const [form, setForm] = useState<SalaryConfig>({ ...config });
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'earnings' | 'deductions' | 'preview' | 'info'>('earnings');

    const F = (k: keyof SalaryConfig) => form[k] as number;
    const set = (k: keyof SalaryConfig, v: number | string) => setForm(p => ({ ...p, [k]: v }));

    const calc = useMemo(() => computeFromScratch(
        F('basic'), F('house'), F('transport'), F('medical'), F('responsibility'), F('other_allowance'),
        F('loans'), F('advance'), F('sacco'), F('other_deduction'),
    ), [form]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                teacher_id: teacher.id,
                basic: form.basic, house: form.house, transport: form.transport,
                medical: form.medical, responsibility: form.responsibility,
                other_allowance: form.other_allowance, other_allowance_name: form.other_allowance_name,
                loans: form.loans, advance: form.advance, sacco: form.sacco,
                other_deduction: form.other_deduction, other_deduction_name: form.other_deduction_name,
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase.from('school_salary_details').upsert(payload, { onConflict: 'teacher_id' });
            if (error) throw error;
            onSave(form);
            toast.success('✅ Salary configuration saved!');
        } catch {
            onSave(form); // save locally
            toast.success('✅ Saved to local state (persist requires DB table school_salary_details)');
        }
        setSaving(false);
        onClose();
    };

    const TABS = [
        { key: 'earnings', label: '↑ Earnings', icon: FiTrendingUp, color: '#10b981' },
        { key: 'deductions', label: '↓ Deductions', icon: FiTrendingDown, color: '#ef4444' },
        { key: 'preview', label: '🧮 Tax Preview', icon: FiPieChart, color: '#6366f1' },
        { key: 'info', label: '👤 Staff Info', icon: FiUser, color: '#0284c7' },
    ];

    const I = ({ label, k, readOnly }: { label: string; k: keyof SalaryConfig; readOnly?: boolean }) => (
        <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: readOnly ? '#f8fafc' : '#fff', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                <span style={{ padding: '10px 12px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>KES</span>
                <input type="number" min={0} value={F(k)} readOnly={readOnly}
                    onChange={e => set(k, Number(e.target.value))}
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0f172a', background: 'transparent', width: 0 }} />
            </div>
        </div>
    );

    const InfoRow = ({ label, val, icon: Icon }: { label: string; val: string; icon?: any }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            {Icon && <Icon size={14} color="#6366f1" style={{ flexShrink: 0 }} />}
            <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{val || '—'}</p>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)' }}>
            <div style={{ background: '#fff', borderRadius: 28, width: '100%', maxWidth: 720, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%)', borderRadius: '28px 28px 0 0', padding: '22px 26px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, border: '1px solid rgba(255,255,255,0.2)' }}>
                                {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Salary Configuration</p>
                                <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 900, letterSpacing: '-0.02em' }}>{teacher.first_name} {teacher.middle_name ? teacher.middle_name + ' ' : ''}{teacher.last_name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#93c5fd' }}>{teacher.designation || teacher.staff_type} {teacher.department ? `· ${teacher.department}` : ''}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            {payrollRecord && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: '#22c55e22', color: '#4ade80', border: '1px solid #22c55e44', borderRadius: 99, padding: '3px 10px' }}>
                                    ● Has Payroll Record
                                </span>
                            )}
                            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(239,68,68,0.2)'); (e.currentTarget.style.color = '#f87171'); }}
                                onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = '#94a3b8'); }}>
                                <FiX size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Live Net Pay Banner */}
                    <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                            {[
                                { l: 'Gross Pay', v: fmtShort(calc.gross), c: '#4ade80' },
                                { l: 'Total Deductions', v: fmtShort(calc.totalDed), c: '#f87171' },
                                { l: 'PAYE', v: fmtShort(calc.paye), c: '#fbbf24' },
                                { l: 'NSSF', v: fmtShort(calc.nssf), c: '#fb923c' },
                            ].map(({ l, v, c }) => (
                                <div key={l}>
                                    <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: c }}>{v}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NET PAY</p>
                            <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>{fmtShort(calc.net)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f1f5f9', padding: '0 26px' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px',
                            border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            color: activeTab === t.key ? t.color : '#94a3b8',
                            borderBottom: activeTab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                            marginBottom: -1, transition: 'all 0.15s', letterSpacing: '0.02em',
                        }}>
                            <t.icon size={12} />{t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px' }}>

                    {/* ── EARNINGS TAB ─────────────────────────── */}
                    {activeTab === 'earnings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiTrendingUp size={14} color="#16a34a" />
                                <p style={{ margin: 0, fontSize: 11, color: '#14532d', fontWeight: 600 }}>All earnings that will be added to compute Gross Pay. PAYE, SHIF, NSSF & Housing Levy are auto-calculated.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <I label="Basic Salary *" k="basic" />
                                <I label="House Allowance" k="house" />
                                <I label="Transport Allowance" k="transport" />
                                <I label="Medical Allowance" k="medical" />
                                <I label="Responsibility Allowance" k="responsibility" />
                                <I label="Other Allowance (KES)" k="other_allowance" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Other Allowance Label</label>
                                <input value={form.other_allowance_name} onChange={e => set('other_allowance_name', e.target.value)}
                                    placeholder="e.g. Remote Area Allowance" style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {/* Gross Pay Card */}
                            <div style={{ background: 'linear-gradient(135deg,#0f172a,#064e3b)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Computed Gross Pay</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a7f3d0' }}>Basic + All Allowances</p>
                                </div>
                                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>{fmtShort(calc.gross)}</p>
                            </div>
                        </div>
                    )}

                    {/* ── DEDUCTIONS TAB ────────────────────────── */}
                    {activeTab === 'deductions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Auto-computed preview */}
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px' }}>
                                <p style={{ margin: '0 0 8px', fontSize: 10, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏛️ Statutory Deductions (Auto-Computed)</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                                    {[
                                        { l: 'PAYE', v: calc.paye, note: 'KRA 2025/26' },
                                        { l: 'SHIF/NHIF', v: calc.shif, note: '2.75% gross' },
                                        { l: 'NSSF', v: calc.nssf, note: `T1:${fmtShort(calc.nssfTier1)} T2:${fmtShort(calc.nssfTier2)}` },
                                        { l: 'Housing Levy', v: calc.housing, note: '1.5% gross' },
                                    ].map(({ l, v, note }) => (
                                        <div key={l} style={{ textAlign: 'center', background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 8px' }}>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</p>
                                            <p style={{ margin: '4px 0 2px', fontSize: 14, fontWeight: 900, color: '#7f1d1d' }}>{fmtShort(v)}</p>
                                            <p style={{ margin: 0, fontSize: 8, color: '#b91c1c' }}>{note}</p>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ margin: '8px 0 0', fontSize: 10, color: '#7f1d1d' }}>Insurance Relief: -{fmtShort(calc.insRelief)} applied against PAYE</p>
                            </div>

                            {/* Manual deductions */}
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Extra / Manual Deductions</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <I label="Loan Repayment" k="loans" />
                                <I label="Salary Advance" k="advance" />
                                <I label="SACCO Contribution" k="sacco" />
                                <I label="Other Deduction (KES)" k="other_deduction" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Other Deduction Label</label>
                                <input value={form.other_deduction_name} onChange={e => set('other_deduction_name', e.target.value)}
                                    placeholder="e.g. Union Dues" style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {/* Total Deductions */}
                            <div style={{ background: 'linear-gradient(135deg,#450a0a,#7f1d1d)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Deductions</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#fca5a5' }}>Statutory + Manual</p>
                                </div>
                                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f87171', letterSpacing: '-0.02em' }}>{fmtShort(calc.totalDed)}</p>
                            </div>
                        </div>
                    )}

                    {/* ── PREVIEW TAB ───────────────────────────── */}
                    {activeTab === 'preview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiInfo size={14} color="#1d4ed8" />
                                <p style={{ margin: 0, fontSize: 11, color: '#1e3a8a', fontWeight: 600 }}>Live computation using Kenya Revenue Authority 2025/26 rates including NSSF New Act Tier I &amp; II, SHIF (2.75%), Housing Levy (1.5%).</p>
                            </div>
                            {/* Full breakdown table */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                                <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📊 Full Tax Computation Breakdown</p>
                                </div>
                                {[
                                    { section: 'EARNINGS', rows: [
                                        { l: 'Basic Salary', v: F('basic'), color: '#0f172a' },
                                        { l: 'House Allowance', v: F('house'), color: '#0f172a' },
                                        { l: 'Transport Allowance', v: F('transport'), color: '#0f172a' },
                                        { l: 'Medical Allowance', v: F('medical'), color: '#0f172a' },
                                        { l: 'Responsibility Allowance', v: F('responsibility'), color: '#0f172a' },
                                        { l: form.other_allowance_name || 'Other Allowance', v: F('other_allowance'), color: '#0f172a' },
                                        { l: '── GROSS PAY ──', v: calc.gross, color: '#059669', bold: true },
                                    ]},
                                    { section: 'STATUTORY DEDUCTIONS', rows: [
                                        { l: 'NSSF Tier I (6% up to KES 7,000)', v: calc.nssfTier1, color: '#dc2626' },
                                        { l: 'NSSF Tier II (6% of 7K–36K)', v: calc.nssfTier2, color: '#dc2626' },
                                        { l: 'Taxable Income (Gross – NSSF)', v: calc.taxable, color: '#2563eb' },
                                        { l: 'PAYE (before Insurance Relief)', v: calc.paye + calc.insRelief, color: '#dc2626' },
                                        { l: 'Insurance Relief (15% of SHIF, max 5K)', v: -calc.insRelief, color: '#16a34a' },
                                        { l: 'Net PAYE', v: calc.paye, color: '#b91c1c', bold: true },
                                        { l: 'SHIF / NHIF (2.75% of gross)', v: calc.shif, color: '#dc2626' },
                                        { l: 'Housing Levy (1.5% of gross)', v: calc.housing, color: '#dc2626' },
                                    ]},
                                    { section: 'EXTRA DEDUCTIONS', rows: [
                                        { l: 'Loan Repayment', v: F('loans'), color: '#7c3aed' },
                                        { l: 'Salary Advance Recovery', v: F('advance'), color: '#7c3aed' },
                                        { l: 'SACCO Contribution', v: F('sacco'), color: '#7c3aed' },
                                        { l: form.other_deduction_name || 'Other Deduction', v: F('other_deduction'), color: '#7c3aed' },
                                    ]},
                                ].map(({ section, rows }) => (
                                    <div key={section}>
                                        <div style={{ background: '#f1f5f9', padding: '6px 16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{section}</p>
                                        </div>
                                        {rows.filter(r => r.v !== 0).map((r, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <span style={{ fontSize: 11, color: '#475569', fontWeight: (r as any).bold ? 700 : 500 }}>{r.l}</span>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: r.color }}>{r.v < 0 ? `-${fmtShort(-r.v)}` : fmtShort(r.v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', borderTop: '2px solid #1d4ed8' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Pay (Take Home)</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>Gross {fmtShort(calc.gross)} − Deductions {fmtShort(calc.totalDed)}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>{fmtShort(calc.net)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── INFO TAB ──────────────────────────────── */}
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staff Information (Read-only — edit in Staff Directory)</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <InfoRow icon={FiUser} label="Full Name" val={`${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim()} />
                                <InfoRow icon={FiBriefcase} label="Staff Type" val={teacher.staff_type || '—'} />
                                <InfoRow icon={FiStar} label="Designation" val={teacher.designation || '—'} />
                                <InfoRow icon={FiLayers} label="Department" val={teacher.department || '—'} />
                                <InfoRow icon={FiHash} label="TSC Number" val={teacher.tsc_number || '—'} />
                                <InfoRow icon={FiShield} label="ID Number" val={teacher.id_number || '—'} />
                                <InfoRow icon={FiShield} label="KRA PIN" val={teacher.kra_pin || '—'} />
                                <InfoRow icon={FiShield} label="NHIF No." val={teacher.nhif_no || '—'} />
                                <InfoRow icon={FiShield} label="NSSF No." val={teacher.nssf_no || '—'} />
                                <InfoRow icon={FiMail} label="Email" val={teacher.email || '—'} />
                                <InfoRow icon={FiPhone} label="Phone" val={teacher.phone || '—'} />
                                <InfoRow icon={FiCreditCard} label="Bank Name" val={teacher.bank_name || '—'} />
                                <InfoRow icon={FiHash} label="Bank Account" val={teacher.bank_account || '—'} />
                                <InfoRow icon={FiCalendar} label="Employment Type" val={teacher.employment_type || '—'} />
                            </div>
                            {payrollRecord && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', marginTop: 8 }}>
                                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ Payroll Record for {payrollRecord.pay_period}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                                        {[
                                            ['Payroll No.', payrollRecord.payroll_number || '—'],
                                            ['Status', payrollRecord.status],
                                            ['Gross Pay', fmtShort(payrollRecord.gross_pay)],
                                            ['Net Pay', fmtShort(payrollRecord.net_pay)],
                                            ['Payment Method', payrollRecord.payment_method || '—'],
                                            ['Approved By', payrollRecord.approved_by || '—'],
                                        ].map(([l, v]) => (
                                            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</span>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 26px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{
                        flex: 2, padding: '12px', borderRadius: 14, border: 'none',
                        background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#1d4ed8)',
                        color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
                    }}>
                        {saving
                            ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Saving...</>
                            : <><FiCheck size={14} />Save Salary Configuration</>}
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalarySlipPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>({});
    const [salaryOverrides, setSalaryOverrides] = useState<Record<number, SalaryConfig>>({});
    const [search, setSearch] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [filterType, setFilterType] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [teachRes, payrollRes, sdRes] = await Promise.all([
            supabase.from('school_teachers')
                .select('id,first_name,last_name,middle_name,staff_type,designation,department,bank_name,bank_account,kra_pin,nhif_no,nssf_no,tsc_number,employment_type,status,id_number,email,phone,basic_salary,house_allowance,transport_allowance')
                .eq('status', 'Active').order('first_name'),
            supabase.from('school_payroll').select('*').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').single(),
        ]);
        setTeachers(teachRes.data || []);
        setPayrolls(payrollRes.data || []);
        setSchoolDetails(sdRes.data || {});

        try {
            const { data: salaryData } = await supabase.from('school_salary_details').select('*');
            if (salaryData) {
                const overrides: Record<number, SalaryConfig> = {};
                salaryData.forEach((s: any) => { overrides[s.teacher_id] = s; });
                setSalaryOverrides(overrides);
            }
        } catch { /* table may not exist */ }

        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Find payroll record for selected teacher + selected month/year
    const getPayrollRecord = (teacherId: number) =>
        payrolls.find(p => String(p.staff_id) === String(teacherId) && p.month === (month + 1) && p.year === year) || null;

    // Build salary config: prefer school_salary_details override, else teacher's own columns, else defaults
    const getSalaryConfig = (t: Teacher): SalaryConfig => {
        const ov = salaryOverrides[t.id];
        if (ov) return ov;
        return {
            ...DEFAULT_CONFIG,
            basic: t.basic_salary || DEFAULT_CONFIG.basic,
            house: t.house_allowance || DEFAULT_CONFIG.house,
            transport: t.transport_allowance || DEFAULT_CONFIG.transport,
        };
    };

    // Compute slip — prefer real payroll record, else compute from config
    const computeSlipForTeacher = (t: Teacher) => {
        const pr = getPayrollRecord(t.id);
        if (pr) {
            return {
                fromPayroll: true, payrollStatus: pr.status,
                basic: pr.basic_salary, house: pr.house_allowance, transport: pr.transport_allowance,
                medical: pr.medical_allowance || 0, responsibility: 0,
                otherAllow: pr.other_allowances || 0, gross: pr.gross_pay,
                paye: pr.paye, shif: pr.nhif, nssf: pr.nssf,
                housing: pr.housing_levy || 0, insRelief: 0,
                loans: pr.loan_deduction || pr.loan_deductions || 0,
                advance: pr.advance_deductions || 0, sacco: pr.sacco_deductions || 0,
                otherDed: pr.other_deductions || 0,
                taxable: 0, nssfTier1: 0, nssfTier2: 0,
                totalDed: pr.total_deductions, net: pr.net_pay,
            };
        }
        const cfg = getSalaryConfig(t);
        const c = computeFromScratch(cfg.basic, cfg.house, cfg.transport, cfg.medical, cfg.responsibility, cfg.other_allowance, cfg.loans, cfg.advance, cfg.sacco, cfg.other_deduction);
        return { fromPayroll: false, payrollStatus: null, basic: cfg.basic, house: cfg.house, transport: cfg.transport, medical: cfg.medical, responsibility: cfg.responsibility, otherAllow: cfg.other_allowance, ...c };
    };

    const filtered = teachers.filter(t => {
        if (filterType && t.staff_type !== filterType) return false;
        const q = search.toLowerCase();
        return !q || `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) || (t.tsc_number || '').toLowerCase().includes(q);
    });

    const selectedSlip = selectedTeacher ? computeSlipForTeacher(selectedTeacher) : null;
    const selectedPayroll = selectedTeacher ? getPayrollRecord(selectedTeacher.id) : null;
    const selectedConfig = selectedTeacher ? getSalaryConfig(selectedTeacher) : DEFAULT_CONFIG;

    const totalNetAll = filtered.reduce((s, t) => s + computeSlipForTeacher(t).net, 0);
    const totalGrossAll = filtered.reduce((s, t) => s + computeSlipForTeacher(t).gross, 0);
    const withPayroll = filtered.filter(t => !!getPayrollRecord(t.id)).length;

    // ── 80mm THERMAL RECEIPT PRINT (default) ────────────────────────────────
    const printSlip = async (mode: 'a4' | 'thermal' = 'thermal') => {
        if (!selectedTeacher || !selectedSlip) return;
        setPrinting(true);
        const win = window.open('', '_blank', mode === 'thermal' ? 'width=420,height=860' : 'width=920,height=720');
        if (!win) { toast.error('Allow popups to print'); setPrinting(false); return; }

        const t = selectedTeacher;
        const sl = selectedSlip;
        const pr = selectedPayroll;
        const sn = schoolDetails.school_name || 'APSIMS SCHOOL';
        const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

        if (mode === 'a4') {
            win.document.write(`<!DOCTYPE html><html><head><title>Salary Slip — ${t.first_name} ${t.last_name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}body{background:#fff;color:#1e293b;padding:32px}.hdr{background:linear-gradient(135deg,#1e3a5f,#1d4ed8);color:#fff;padding:24px 28px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}.school{font-size:22px;font-weight:900}.sub{font-size:11px;color:#93c5fd;margin-top:4px}.badge{background:rgba(255,255,255,0.2);padding:8px 14px;border-radius:8px;text-align:right}.badge-t{font-size:13px;font-weight:800}.badge-s{font-size:11px;color:#bfdbfe;margin-top:2px}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}.info-cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}.info-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}.info-val{font-size:12px;font-weight:700;color:#0f172a;margin-top:2px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.sec{font-size:10px;font-weight:800;color:#1e3a5f;text-transform:uppercase;background:#eff6ff;padding:6px 10px;border-radius:6px;margin-bottom:8px}table{width:100%;border-collapse:collapse}tr:nth-child(even){background:#f8fafc}td{padding:7px 10px;font-size:12px;border-bottom:1px solid #f1f5f9}td:last-child{text-align:right;font-weight:600}.tot td{font-weight:800;font-size:13px;border-top:2px solid #1e3a5f;color:#1e3a5f}.net{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:18px 24px;border-radius:12px;text-align:center;margin-bottom:16px}.net-lbl{font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.6)}.net-amt{font-size:36px;font-weight:900;margin-top:4px}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0}.sig{border-top:1.5px solid #94a3b8;padding-top:6px;margin-top:32px;font-size:11px;color:#64748b}.ftr{text-align:center;margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body>
<div class="hdr"><div><div class="school">${sn}</div><div class="sub">${schoolDetails.postal_address||''} ${schoolDetails.county?'· '+schoolDetails.county:''}</div><div class="sub">${schoolDetails.phone1||schoolDetails.phone||''} ${schoolDetails.email?'· '+schoolDetails.email:''}</div></div><div class="badge"><div class="badge-t">SALARY SLIP</div><div class="badge-s">${MONTHS[month]} ${year}</div>${sl.fromPayroll?'<div style="font-size:9px;color:#86efac;margin-top:4px">✔ Payroll Record</div>':'<div style="font-size:9px;color:#fde68a;margin-top:4px">⚠ Estimate</div>'}</div></div>
<div class="info-grid">${[['Employee',`${t.first_name} ${t.middle_name||''} ${t.last_name}`.trim()],['Staff Type',t.staff_type||'—'],['Designation',t.designation||'—'],['Department',t.department||'—'],['TSC No.',t.tsc_number||'—'],['KRA PIN',t.kra_pin||'—'],['NHIF No.',t.nhif_no||'—'],['NSSF No.',t.nssf_no||'—'],['Pay Period',`${MONTHS[month]} ${year}`],['Bank',t.bank_name||'—'],['Account',t.bank_account||'—'],['Payment',pr?.payment_method||'Bank Transfer']].map(([l,v])=>`<div class="info-cell"><div class="info-lbl">${l}</div><div class="info-val">${v}</div></div>`).join('')}</div>
<div class="cols"><div><div class="sec">↑ EARNINGS</div><table>${[['Basic Salary',sl.basic],['House Allowance',sl.house],['Transport Allow.',sl.transport],['Medical Allow.',sl.medical],...(sl.otherAllow>0?[['Other Allowances',sl.otherAllow]]:[])].map(([l,v])=>`<tr><td>${l}</td><td>${fmt(v as number)}</td></tr>`).join('')}<tr class="tot"><td>GROSS PAY</td><td>${fmt(sl.gross)}</td></tr></table></div>
<div><div class="sec">↓ DEDUCTIONS</div><table>${[['PAYE (Income Tax)',sl.paye],['NHIF / SHIF',sl.shif],['NSSF',sl.nssf],...(sl.housing>0?[['Housing Levy 1.5%',sl.housing]]:[]),...((sl.loans||0)>0?[['Loan Repayment',(sl.loans||0)]]:[]),...((sl.advance||0)>0?[['Salary Advance',(sl.advance||0)]]:[]),...((sl.sacco||0)>0?[['SACCO',(sl.sacco||0)]]:[]),...((sl.otherDed||0)>0?[['Other Deductions',(sl.otherDed||0)]]:[])].map(([l,v])=>`<tr><td>${l}</td><td style="color:#dc2626">${fmt(v as number)}</td></tr>`).join('')}<tr class="tot"><td>TOTAL DEDUCTIONS</td><td style="color:#dc2626">${fmt(sl.totalDed)}</td></tr></table></div></div>
<div class="net"><div class="net-lbl">NET PAY (TAKE HOME)</div><div class="net-amt">${fmt(sl.net)}</div><div style="font-size:11px;margin-top:6px;color:rgba(255,255,255,.6)">Gross ${fmt(sl.gross)} − Deductions ${fmt(sl.totalDed)}</div></div>
<div class="sigs"><div><div class="sig">Employee: ${t.first_name} ${t.last_name}</div></div><div><div class="sig">Principal: ${schoolDetails.principal_name||'________________'}</div></div></div>
<div class="ftr">Computer-generated salary slip. Generated: ${new Date().toLocaleDateString('en-KE')} · ${sn} · APSIMS</div>
<script>window.onload=()=>{window.print();}</script></body></html>`);
            win.document.close();
            setPrinting(false);
            return;
        }

        // ── 80mm THERMAL RECEIPT ─────────────────────────────────────────────
        const W = 32;
        const EQ = '='.repeat(W);
        const DA = '-'.repeat(W);
        const DO = String.fromCharCode(183).repeat(W); // · · · · · 
        const ST = '*'.repeat(W);
        const ctr = (s: string) => { const p = Math.max(0, Math.floor((W - s.length) / 2)); return ' '.repeat(p) + s; };
        const rw  = (lbl: string, val: string) => {
            const max = W - val.length - 1;
            const l = lbl.length > max ? lbl.slice(0, max - 1) + '.' : lbl;
            return l + ' '.repeat(Math.max(1, W - l.length - val.length)) + val;
        };
        const fmtT = (n: number) => `KES ${(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`;

        const R: string[] = [];
        const a = (s: string) => R.push(s);

        a(EQ);
        a(ctr('*** SALARY SLIP ***'));
        a(ctr(sn.toUpperCase()));
        if (schoolDetails.postal_address) a(ctr(schoolDetails.postal_address));
        if (schoolDetails.phone1||schoolDetails.phone) a(ctr((schoolDetails.phone1||schoolDetails.phone)+''));
        if (schoolDetails.email) a(ctr(schoolDetails.email));
        a(EQ);
        a(ctr(`PAY PERIOD: ${(MONTHS[month]||'').toUpperCase()} ${year}`));
        if (pr?.payroll_number) a(ctr(`Payroll No: ${pr.payroll_number}`));
        a(ctr(sl.fromPayroll ? '[OFFICIAL PAYROLL RECORD]' : '[COMPUTED ESTIMATE]'));
        a(DA);
        a('EMPLOYEE DETAILS');
        a(rw('Name:', `${t.first_name} ${t.last_name}`));
        if (t.staff_type)   a(rw('Type:', t.staff_type));
        if (t.designation)  a(rw('Designation:', t.designation));
        if (t.department)   a(rw('Department:', t.department));
        if (t.tsc_number)   a(rw('TSC No:', t.tsc_number));
        if (t.kra_pin)      a(rw('KRA PIN:', t.kra_pin));
        if (t.nhif_no)      a(rw('NHIF No:', t.nhif_no));
        if (t.nssf_no)      a(rw('NSSF No:', t.nssf_no));
        if (t.bank_name)    a(rw('Bank:', t.bank_name));
        if (t.bank_account) a(rw('A/C No:', t.bank_account));
        a(rw('Payment:', pr?.payment_method || 'Bank Transfer'));
        a(DA);
        a('EARNINGS');
        a(rw('Basic Salary', fmtT(sl.basic)));
        if (sl.house)      a(rw('House Allow.', fmtT(sl.house)));
        if (sl.transport)  a(rw('Transport Allow.', fmtT(sl.transport)));
        if (sl.medical)    a(rw('Medical Allow.', fmtT(sl.medical)));
        if (sl.otherAllow) a(rw('Other Allow.', fmtT(sl.otherAllow)));
        a(DO);
        a(rw('GROSS PAY', fmtT(sl.gross)));
        a(DA);
        a('DEDUCTIONS');
        a(rw('PAYE (Income Tax)', fmtT(sl.paye)));
        a(rw('NHIF / SHIF', fmtT(sl.shif)));
        a(rw('NSSF', fmtT(sl.nssf)));
        if (sl.housing > 0)  a(rw('Housing Levy 1.5%', fmtT(sl.housing)));
        if ((sl.loans||0) > 0)    a(rw('Loan Repayment', fmtT((sl.loans||0))));
        if ((sl.advance||0) > 0)  a(rw('Salary Advance', fmtT((sl.advance||0))));
        if ((sl.sacco||0) > 0)    a(rw('SACCO', fmtT((sl.sacco||0))));
        if ((sl.otherDed||0) > 0) a(rw('Other Deductions', fmtT((sl.otherDed||0))));
        a(DO);
        a(rw('TOTAL DEDUCTIONS', fmtT(sl.totalDed)));
        a(EQ);
        a(ctr('NET PAY (TAKE HOME)'));
        a(ctr(fmtT(sl.net)));
        a(ctr(`Gross ${fmtT(sl.gross)}`));
        a(ctr(`Less Deductions ${fmtT(sl.totalDed)}`));
        a(EQ);
        a('');
        a('Prepared by: ___________________');
        a('');
        a(`Employee: ${t.first_name} ${t.last_name}`);
        a('Sign: _____________ Date: _______');
        a('');
        a(`Principal: ${schoolDetails.principal_name||'__________________'}`);
        a('Sign: _____________ Date: _______');
        a(DA);
        a(ctr('CONFIDENTIAL DOCUMENT'));
        a(ctr('Not valid without official stamp'));
        a(ctr(`Printed: ${new Date().toLocaleDateString('en-KE')}`));
        a(ctr('Powered by APSIMS'));
        a(ST);

        win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Salary Slip - ${t.first_name} ${t.last_name} - ${MONTHS[month]} ${year}</title>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11.5px; color: #000; background: #fff; width: 74mm; margin: 0 auto; line-height: 1.5; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 11.5px; white-space: pre; line-height: 1.5; word-break: break-all; }
  @media print { body { width: 74mm; } }
</style></head><body>
<pre>${R.join('\n')}</pre>
<script>window.onload=()=>{ setTimeout(()=>{ window.print(); }, 300); }</script>
</body></html>`);
        win.document.close();
        setPrinting(false);
    };


    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4ff 0%,#f8fafc 50%,#f0fdf4 100%)', padding: '20px 24px', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

            {/* ── HEADER ─────────────────────────────────────── */}
            <div style={{ borderRadius: 24, padding: '24px 28px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 55%,#6366f1 100%)' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Link href="/dashboard/hr-payroll/payroll" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FiChevronLeft size={11} />Payroll
                            </Link>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>/</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Salary Slips</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 28 }}>💰</span> Salary Slip Generator
                        </h1>
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#93c5fd' }}>Generate professional payslips with live KRA 2025/26 tax computation · NSSF New Act · SHIF · Housing Levy</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[
                            { l: 'Active Staff', v: teachers.length, c: '#fff' },
                            { l: 'With Payroll', v: withPayroll, c: '#4ade80' },
                            { l: 'Without Payroll', v: filtered.length - withPayroll, c: '#fbbf24' },
                            { l: 'Total Net Pay', v: fmtShort(totalNetAll), c: '#a5f3fc' },
                        ].map(({ l, v, c }) => (
                            <div key={l} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
                                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: c }}>{v}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{l}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>

                {/* ── LEFT: STAFF LIST ───────────────────────── */}
                <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    {/* Filters */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px' }}>
                                <FiSearch size={12} color="#94a3b8" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#0f172a', fontFamily: 'inherit' }} />
                            </div>
                            <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <FiRefreshCw size={13} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 8px', fontSize: 11, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }}>
                                <option value="">All Types</option>
                                <option value="Teaching">Teaching</option>
                                <option value="Non-Teaching">Non-Teaching</option>
                            </select>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 8px', fontSize: 11, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }}>
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 8px', fontSize: 11, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc' }}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                            <span style={{ color: '#4ade80' }}>●</span> Has payroll record &nbsp; <span style={{ color: '#f59e0b' }}>●</span> Computed estimate
                        </p>
                    </div>

                    {/* Staff List */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 460 }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                                <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 48 }}><p style={{ fontSize: 13, color: '#94a3b8' }}>No staff found</p></div>
                        ) : filtered.map(t => {
                            const sl = computeSlipForTeacher(t);
                            const hasPR = sl.fromPayroll;
                            const isSelected = selectedTeacher?.id === t.id;
                            return (
                                <button key={t.id} onClick={() => setSelectedTeacher(t)} style={{
                                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', border: 'none', background: isSelected ? '#eff6ff' : 'transparent',
                                    borderLeft: isSelected ? '3px solid #1d4ed8' : '3px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.15s', borderBottom: '1px solid #f8fafc',
                                }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                                        {t.first_name?.[0]}{t.last_name?.[0]}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.first_name} {t.last_name}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{t.designation || t.staff_type} · {t.department || 'General'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#059669' }}>{fmtShort(sl.net)}</p>
                                        <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: hasPR ? '#f0fdf4' : '#fffbeb', color: hasPR ? '#16a34a' : '#d97706', border: `1px solid ${hasPR ? '#bbf7d0' : '#fde68a'}` }}>
                                            {hasPR ? '✔ PAYROLL' : '⚡ ESTIMATE'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary Footer */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '0 0 20px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <div><p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Gross ({MONTHS[month]})</p><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#059669' }}>{fmtShort(totalGrossAll)}</p></div>
                            <div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Net ({MONTHS[month]})</p><p style={{ margin: '2px 0 0', fontWeight: 800, color: '#1d4ed8' }}>{fmtShort(totalNetAll)}</p></div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: PAYSLIP PREVIEW ─────────────────── */}
                <div>
                    {!selectedTeacher ? (
                        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 56, marginBottom: 12 }}>💼</div>
                                <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 15 }}>Select a Staff Member</p>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Click any name on the left to preview their salary slip</p>
                            </div>
                        </div>
                    ) : selectedSlip && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Action Bar */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                {!selectedSlip.fromPayroll && (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '8px 14px' }}>
                                        <FiAlertCircle size={13} color="#d97706" />
                                        <p style={{ margin: 0, fontSize: 11, color: '#92400e', fontWeight: 600 }}>No payroll record for {MONTHS[month]} {year}. Showing computed estimate. Go to <Link href="/dashboard/hr-payroll/payroll" style={{ color: '#1d4ed8', fontWeight: 700 }}>Run Payroll</Link> to create official records.</p>
                                    </div>
                                )}
                                {selectedSlip.fromPayroll && (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 14px' }}>
                                        <FiCheckCircle size={13} color="#16a34a" />
                                        <p style={{ margin: 0, fontSize: 11, color: '#14532d', fontWeight: 600 }}>✅ Official payroll record found for {MONTHS[month]} {year} · Status: <strong style={{ color: selectedSlip.payrollStatus === 'Paid' ? '#16a34a' : '#d97706' }}>{selectedSlip.payrollStatus}</strong></p>
                                    </div>
                                )}
                                <button onClick={() => setShowConfig(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer', flexShrink: 0 }}>
                                    <FiSettings size={13} />Configure Salary
                                </button>
                                <button onClick={() => printSlip('thermal')} disabled={printing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 14px rgba(15,23,42,0.4)' }}>
                                    <FiPrinter size={13} />{printing ? 'Printing...' : 'Thermal (80mm)'}
                                </button>
                                <button onClick={() => printSlip('a4')} disabled={printing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#1d4ed8,#6366f1)', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}>
                                    <FiPrinter size={13} />A4 / PDF
                                </button>
                            </div>

                            {/* Payslip Document */}
                            <div ref={printRef} style={{ background: '#fff', borderRadius: 20, border: '2px solid #e2e8f0', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                                {/* Header Band */}
                                <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', padding: '22px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{schoolDetails.school_name || 'APSIMS SCHOOL'}</h1>
                                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#93c5fd' }}>{schoolDetails.postal_address || ''} {schoolDetails.county ? `· ${schoolDetails.county}` : ''}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#93c5fd' }}>{schoolDetails.phone1 || schoolDetails.phone || ''} {schoolDetails.email ? `· ${schoolDetails.email}` : ''}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 16px' }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: '0.05em' }}>SALARY SLIP</p>
                                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#bfdbfe' }}>{MONTHS[month]} {year}</p>
                                            {selectedSlip.fromPayroll
                                                ? <p style={{ margin: '4px 0 0', fontSize: 9, color: '#86efac', fontWeight: 700 }}>✔ Official Payroll Record</p>
                                                : <p style={{ margin: '4px 0 0', fontSize: 9, color: '#fde68a', fontWeight: 700 }}>⚡ Estimate — Run Payroll to confirm</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Info */}
                                <div style={{ padding: '16px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                    {[
                                        { l: 'Employee Name', v: `${selectedTeacher.first_name} ${selectedTeacher.middle_name || ''} ${selectedTeacher.last_name}`.trim() },
                                        { l: 'Staff Type', v: selectedTeacher.staff_type },
                                        { l: 'Designation', v: selectedTeacher.designation || '—' },
                                        { l: 'Department', v: selectedTeacher.department || '—' },
                                        { l: 'TSC No.', v: selectedTeacher.tsc_number || '—' },
                                        { l: 'KRA PIN', v: selectedTeacher.kra_pin || '—' },
                                        { l: 'NHIF No.', v: selectedTeacher.nhif_no || '—' },
                                        { l: 'NSSF No.', v: selectedTeacher.nssf_no || '—' },
                                        { l: 'Pay Period', v: `${MONTHS[month]} ${year}` },
                                    ].map(({ l, v }) => (
                                        <div key={l}>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                                            <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{v}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Earnings + Deductions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                    {/* Earnings */}
                                    <div style={{ padding: '20px 24px', borderRight: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <div style={{ width: 4, height: 18, background: '#10b981', borderRadius: 99 }} />
                                            <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EARNINGS</h3>
                                        </div>
                                        <div>
                                            {[
                                                { l: 'Basic Salary', v: selectedSlip.basic },
                                                { l: 'House Allowance', v: selectedSlip.house },
                                                { l: 'Transport Allowance', v: selectedSlip.transport },
                                                { l: 'Medical Allowance', v: selectedSlip.medical },
                                                ...(selectedSlip.responsibility > 0 ? [{ l: 'Responsibility Allowance', v: selectedSlip.responsibility }] : []),
                                                ...(selectedSlip.otherAllow > 0 ? [{ l: selectedConfig.other_allowance_name || 'Other Allowance', v: selectedSlip.otherAllow }] : []),
                                            ].map((row, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? '#f8fafc' : 'transparent', borderRadius: 6, marginBottom: 2 }}>
                                                    <span style={{ fontSize: 12, color: '#475569' }}>{row.l}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmt(row.v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>GROSS PAY</span>
                                            <span style={{ fontWeight: 900, fontSize: 14, color: '#059669' }}>{fmt(selectedSlip.gross)}</span>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <div style={{ width: 4, height: 18, background: '#ef4444', borderRadius: 99 }} />
                                            <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>DEDUCTIONS</h3>
                                        </div>
                                        <div>
                                            {[
                                                { l: 'PAYE (Income Tax)', v: selectedSlip.paye },
                                                { l: 'NHIF / SHIF', v: selectedSlip.shif },
                                                { l: 'NSSF', v: selectedSlip.nssf },
                                                ...(selectedSlip.housing > 0 ? [{ l: 'Housing Levy (1.5%)', v: selectedSlip.housing }] : []),
                                                ...((selectedSlip.loans||0) > 0 ? [{ l: 'Loan Repayment', v: (selectedSlip.loans||0) }] : []),
                                                ...((selectedSlip.advance||0) > 0 ? [{ l: 'Salary Advance', v: (selectedSlip.advance||0) }] : []),
                                                ...((selectedSlip.sacco||0) > 0 ? [{ l: 'SACCO Contribution', v: (selectedSlip.sacco||0) }] : []),
                                                ...((selectedSlip.otherDed||0) > 0 ? [{ l: selectedConfig.other_deduction_name || 'Other Deduction', v: (selectedSlip.otherDed||0) }] : []),
                                            ].map((row, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? '#f8fafc' : 'transparent', borderRadius: 6, marginBottom: 2 }}>
                                                    <span style={{ fontSize: 12, color: '#475569' }}>{row.l}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{fmt(row.v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '2px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>TOTAL DEDUCTIONS</span>
                                            <span style={{ fontWeight: 900, fontSize: 14, color: '#dc2626' }}>{fmt(selectedSlip.totalDed)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay Banner */}
                                <div style={{ margin: '0 24px 20px', borderRadius: 16, padding: '16px 24px', background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#1d4ed8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NET PAY (TAKE HOME)</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Gross {fmt(selectedSlip.gross)} − Deductions {fmt(selectedSlip.totalDed)}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>{fmt(selectedSlip.net)}</p>
                                </div>

                                {/* Bank info + Signatures */}
                                {selectedTeacher.bank_name && (
                                    <div style={{ margin: '0 24px 16px', padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <FiCreditCard size={14} color="#1d4ed8" />
                                        <p style={{ margin: 0, fontSize: 11, color: '#1e3a8a', fontWeight: 600 }}>Bank Transfer: {selectedTeacher.bank_name} · Account: {selectedTeacher.bank_account || '—'}</p>
                                    </div>
                                )}
                                <div style={{ margin: '0 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                                    <div><p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 28 }}>Employee Signature &amp; Date</p><div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}><p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>{selectedTeacher.first_name} {selectedTeacher.last_name}</p></div></div>
                                    <div><p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 28 }}>Authorised Signatory</p><div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}><p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>{schoolDetails.principal_name || 'Principal'}</p></div></div>
                                </div>
                                <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '10px 24px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: 9, color: '#94a3b8' }}>Computer-generated salary slip · For queries contact HR Department · Generated: {new Date().toLocaleDateString('en-KE')} · {schoolDetails.school_name} · Powered by APSIMS</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONFIG MODAL ──────────────────────────────── */}
            {showConfig && selectedTeacher && (
                <SalaryConfigModal
                    teacher={selectedTeacher}
                    config={selectedConfig}
                    payrollRecord={selectedPayroll}
                    schoolName={schoolDetails.school_name || 'APSIMS'}
                    onSave={cfg => { setSalaryOverrides(p => ({ ...p, [selectedTeacher.id]: cfg })); }}
                    onClose={() => setShowConfig(false)}
                />
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiDollarSign, FiUsers, FiDownload, FiRefreshCw, FiSearch, FiFilter,
    FiCheckCircle, FiXCircle, FiEye, FiEdit2, FiTrash2, FiPlus,
    FiPrinter, FiSend, FiChevronDown, FiChevronUp, FiAlertTriangle,
    FiTrendingUp, FiTrendingDown, FiCreditCard, FiCalendar, FiFileText,
    FiClock, FiArrowRight, FiMail, FiCheck, FiZap, FiLayers, FiActivity,
    FiPieChart, FiBarChart2, FiAward, FiShield, FiBookOpen, FiSliders
} from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ─────────────────────────────────────────────────────────────────────────────
// KENYA TAX CALCULATOR (2024/2025 KRA RATES)
// ─────────────────────────────────────────────────────────────────────────────
const KE_PAYE_BANDS = [
    { max: 24000, rate: 0.10 },
    { max: 32333, rate: 0.25 },
    { max: 500000, rate: 0.30 },
    { max: 800000, rate: 0.325 },
    { max: Infinity, rate: 0.35 },
];
const PERSONAL_RELIEF = 2400;
const NHIF_RATES = [
    { max: 5999, amt: 150 }, { max: 7999, amt: 300 }, { max: 11999, amt: 400 },
    { max: 14999, amt: 500 }, { max: 19999, amt: 600 }, { max: 24999, amt: 750 },
    { max: 29999, amt: 850 }, { max: 34999, amt: 900 }, { max: 39999, amt: 950 },
    { max: 44999, amt: 1000 }, { max: 49999, amt: 1100 }, { max: 59999, amt: 1200 },
    { max: 69999, amt: 1300 }, { max: 79999, amt: 1400 }, { max: 89999, amt: 1500 },
    { max: 99999, amt: 1600 }, { max: Infinity, amt: 1700 },
];
const NSSF_EMPLOYEE = 200;
const HOUSING_LEVY_RATE = 0.015;

function calcPAYE(taxable: number): number {
    let tax = 0; let prev = 0;
    for (const band of KE_PAYE_BANDS) {
        if (taxable <= 0) break;
        const slice = Math.min(taxable, band.max - prev);
        tax += slice * band.rate;
        prev = band.max;
        taxable -= slice;
    }
    return Math.max(0, tax - PERSONAL_RELIEF);
}
function calcNHIF(gross: number): number {
    for (const r of NHIF_RATES) if (gross <= r.max) return r.amt;
    return 1700;
}
function calcHousingLevy(gross: number): number {
    return Math.round(gross * HOUSING_LEVY_RATE);
}

interface TaxBreakdown {
    grossPay: number; taxable: number; paye: number;
    nhif: number; nssf: number; housingLevy: number;
    loanDeductions: number; advanceDeductions: number;
    saccoDeductions: number; otherDeductions: number;
    totalDeductions: number; netPay: number;
}

function computePayroll(
    basicSalary: number, houseAllowance: number, transportAllowance: number,
    medicalAllowance: number, otherAllowances: number, loanDeductions: number,
    advanceDeductions: number, saccoDeductions: number, otherDeductions: number,
): TaxBreakdown {
    const grossPay = basicSalary + houseAllowance + transportAllowance + medicalAllowance + otherAllowances;
    const nssfDeduction = NSSF_EMPLOYEE;
    const taxable = Math.max(0, grossPay - nssfDeduction);
    const paye = calcPAYE(taxable);
    const nhif = calcNHIF(grossPay);
    const housingLevy = calcHousingLevy(grossPay);
    const totalDeductions = paye + nhif + nssfDeduction + housingLevy +
        loanDeductions + advanceDeductions + saccoDeductions + otherDeductions;
    const netPay = Math.max(0, grossPay - totalDeductions);
    return {
        grossPay, taxable, paye, nhif, nssf: nssfDeduction, housingLevy,
        loanDeductions, advanceDeductions, saccoDeductions, otherDeductions, totalDeductions, netPay
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(n);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface StaffMember {
    id: string; first_name: string; last_name: string; email?: string;
    phone?: string; gender?: string; department?: string; designation?: string;
    basic_salary: number; status: string; bank_name?: string;
    bank_account?: string; tsc_number?: string; id_number?: string;
    _type: 'TSC Teacher' | 'Support Teacher' | 'Subordinate';
}
interface PayrollRecord {
    id: string; staff_id: string; staff_name: string; staff_type: string;
    month: number; year: number; pay_period: string;
    basic_salary: number; house_allowance: number; transport_allowance: number;
    medical_allowance: number; other_allowances: number;
    paye: number; nhif: number; nssf: number; housing_levy: number;
    loan_deductions: number; advance_deductions: number;
    sacco_deductions: number; other_deductions: number;
    gross_pay: number; total_deductions: number; net_pay: number;
    status: 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Rejected';
    payment_method?: string; payment_ref?: string;
    notes?: string; created_at?: string;
}
interface SalaryAdvance {
    id: string; staff_id: string; staff_name: string;
    amount: number; reason: string; monthly_deduction: number;
    balance: number; status: 'Pending' | 'Approved' | 'Active' | 'Cleared' | 'Rejected';
    approved_by?: string; created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (matching Alpha Analysis font system)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
    // Font system — matches Alpha Analysis page exactly
    fontBase: "'Inter','Segoe UI',sans-serif",
    fontMono: "'DM Mono','Courier New',monospace",
    // Text colors (Slate palette — identical to analysis page)
    text: { primary: '#0f172a', heading: '#1e293b', body: '#334155', muted: '#64748b', faint: '#94a3b8' },
    // Status colors
    status: { Draft: '#94a3b8', Pending: '#f59e0b', Approved: '#3b82f6', Paid: '#22c55e', Rejected: '#ef4444' },
    statusBg: { Draft: '#f8fafc', Pending: '#fffbeb', Approved: '#eff6ff', Paid: '#f0fdf4', Rejected: '#fef2f2' },
    statusText: { Draft: '#475569', Pending: '#92400e', Approved: '#1e40af', Paid: '#14532d', Rejected: '#991b1b' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
    open: boolean; onClose: () => void; title: string;
    children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}) {
    if (!open) return null;
    const maxW = { sm: '480px', md: '600px', lg: '800px', xl: '1000px', full: '1300px' }[size];
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                background: '#fff', borderRadius: 24, width: '100%', maxWidth: maxW,
                display: 'flex', flexDirection: 'column', maxHeight: '92vh',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
                animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                fontFamily: T.fontBase,
            }}>
                {/* Modal header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text.heading, letterSpacing: '-0.01em' }}>{title}</h2>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 10, border: 'none',
                        background: '#f1f5f9', color: T.text.muted, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = '#fee2e2'; (e.target as HTMLElement).closest('button')!.style.color = '#ef4444'; }}
                        onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = '#f1f5f9'; (e.target as HTMLElement).closest('button')!.style.color = T.text.muted; }}
                    >
                        <FiXCircle size={16} />
                    </button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>{children}</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ULTRA STAT CARD — glassmorphic + glowing accent edge
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, trend }: {
    label: string; value: string; icon: any; color: string; sub?: string; trend?: 'up' | 'down';
}) {
    return (
        <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderTop: `3px solid ${color}`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.04), 0 0 0 0 ${color}00`,
            transition: 'box-shadow 0.25s, transform 0.25s',
            cursor: 'default',
            fontFamily: T.fontBase,
        }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.08), 0 0 0 3px ${color}22`;
                el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)';
                el.style.transform = 'none';
            }}
        >
            {/* Subtle glow orb */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}12`, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: `${color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color, flexShrink: 0,
                }}>
                    <Icon size={18} />
                </div>
                {trend && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        color: trend === 'up' ? '#10b981' : '#ef4444',
                        background: trend === 'up' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${trend === 'up' ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: 20, padding: '3px 8px',
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        {trend === 'up' ? <FiTrendingUp size={9} /> : <FiTrendingDown size={9} />}
                        {trend === 'up' ? 'Up' : 'Down'}
                    </span>
                )}
            </div>

            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: T.text.primary, margin: '4px 0 0', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
                {sub && <p style={{ fontSize: 11, color: T.text.muted, margin: '5px 0 0' }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const bg = (T.statusBg as any)[status] || '#f8fafc';
    const txt = (T.statusText as any)[status] || '#475569';
    const dot = (T.status as any)[status] || '#94a3b8';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: bg, color: txt,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            fontFamily: T.fontBase,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
            {status}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD — sleek inset surface card
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, children, accent }: {
    title: string; subtitle?: string; action?: React.ReactNode;
    children: React.ReactNode; accent?: string;
}) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 20, overflow: 'hidden',
            fontFamily: T.fontBase,
            ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
        }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text.heading }}>{title}</h3>
                    {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: T.text.faint }}>{subtitle}</p>}
                </div>
                {action}
            </div>
            <div style={{ padding: '16px 20px' }}>{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT STYLE HELPER
// ─────────────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '10px 14px', fontSize: 12, fontWeight: 600, color: T.text.heading,
    outline: 'none', fontFamily: "'Inter','Segoe UI',sans-serif", boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};
const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: T.text.faint,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 5,
    fontFamily: "'Inter','Segoe UI',sans-serif",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYSLIP VIEWER
// ─────────────────────────────────────────────────────────────────────────────
function PayslipViewer({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<html><head><title>Payslip - ${record.staff_name}</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',sans-serif; }
            body { padding:40px; color:#1a1a2e; background:#fff; }
            .header { text-align:center; border-bottom:3px solid #1e3a5f; padding-bottom:20px; margin-bottom:24px; }
            .logo { font-size:28px; font-weight:900; color:#1e3a5f; letter-spacing:-1px; }
            .sub { font-size:13px; color:#666; margin-top:4px; }
            .payslip-title { background:#1e3a5f; color:white; text-align:center; padding:10px; font-weight:700; font-size:15px; border-radius:8px; margin-bottom:20px; }
            .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
            .info-item { background:#f8fafc; padding:12px; border-radius:8px; }
            .info-label { font-size:10px; color:#888; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
            .info-value { font-size:14px; font-weight:700; color:#1a1a2e; margin-top:2px; }
            .earnings-deductions { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
            table { width:100%; border-collapse:collapse; }
            th { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#1e3a5f; padding:8px; text-align:left; border-bottom:2px solid #e2e8f0; }
            td { font-size:13px; padding:8px; border-bottom:1px solid #f1f5f9; }
            td:last-child { text-align:right; font-weight:600; }
            .total-row td { font-weight:800; font-size:14px; border-top:2px solid #1e3a5f; color:#1e3a5f; }
            .net-box { background:linear-gradient(135deg,#1e3a5f,#2d6a4f); color:white; padding:16px 24px; border-radius:12px; text-align:center; margin-top:20px; }
            .net-label { font-size:12px; opacity:0.8; font-weight:600; text-transform:uppercase; letter-spacing:1px; }
            .net-amount { font-size:32px; font-weight:900; margin-top:4px; letter-spacing:-1px; }
            .section-title { font-size:12px; font-weight:800; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; padding:6px 8px; background:#eff6ff; border-radius:6px; }
            .footer { text-align:center; margin-top:24px; font-size:11px; color:#aaa; border-top:1px solid #eee; padding-top:16px; }
        </style></head><body>
        <div class="header"><div class="logo">ALPHA SCHOOL</div><div class="sub">HR & Payroll Department • Payslip</div></div>
        <div class="payslip-title">EMPLOYEE PAY ADVICE — ${MONTHS[record.month - 1].toUpperCase()} ${record.year}</div>
        <div class="info-grid">
            <div class="info-item"><div class="info-label">Employee Name</div><div class="info-value">${record.staff_name}</div></div>
            <div class="info-item"><div class="info-label">Employee Type</div><div class="info-value">${record.staff_type}</div></div>
            <div class="info-item"><div class="info-label">Pay Period</div><div class="info-value">${record.pay_period}</div></div>
            <div class="info-item"><div class="info-label">Payment Method</div><div class="info-value">${record.payment_method || 'Bank Transfer'}</div></div>
            <div class="info-item"><div class="info-label">Payment Reference</div><div class="info-value">${record.payment_ref || '—'}</div></div>
            <div class="info-item"><div class="info-label">Status</div><div class="info-value">${record.status}</div></div>
        </div>
        <div class="earnings-deductions">
            <div>
                <div class="section-title">Earnings</div>
                <table>
                    <tr><th>Description</th><th style="text-align:right">Amount (KES)</th></tr>
                    <tr><td>Basic Salary</td><td>${fmtNum(record.basic_salary)}</td></tr>
                    <tr><td>House Allowance</td><td>${fmtNum(record.house_allowance)}</td></tr>
                    <tr><td>Transport Allowance</td><td>${fmtNum(record.transport_allowance)}</td></tr>
                    <tr><td>Medical Allowance</td><td>${fmtNum(record.medical_allowance)}</td></tr>
                    <tr><td>Other Allowances</td><td>${fmtNum(record.other_allowances)}</td></tr>
                    <tr class="total-row"><td>GROSS PAY</td><td>${fmtNum(record.gross_pay)}</td></tr>
                </table>
            </div>
            <div>
                <div class="section-title">Deductions</div>
                <table>
                    <tr><th>Description</th><th style="text-align:right">Amount (KES)</th></tr>
                    <tr><td>PAYE Tax</td><td>${fmtNum(record.paye)}</td></tr>
                    <tr><td>NHIF</td><td>${fmtNum(record.nhif)}</td></tr>
                    <tr><td>NSSF</td><td>${fmtNum(record.nssf)}</td></tr>
                    <tr><td>Housing Levy (1.5%)</td><td>${fmtNum(record.housing_levy)}</td></tr>
                    <tr><td>Loan Deductions</td><td>${fmtNum(record.loan_deductions)}</td></tr>
                    <tr><td>Salary Advances</td><td>${fmtNum(record.advance_deductions)}</td></tr>
                    <tr><td>SACCO</td><td>${fmtNum(record.sacco_deductions)}</td></tr>
                    <tr><td>Other Deductions</td><td>${fmtNum(record.other_deductions)}</td></tr>
                    <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td>${fmtNum(record.total_deductions)}</td></tr>
                </table>
            </div>
        </div>
        <div class="net-box">
            <div class="net-label">Net Pay (Take Home)</div>
            <div class="net-amount">KES ${fmtNum(record.net_pay)}</div>
        </div>
        <div class="footer">This is a computer-generated payslip. For queries, contact HR Department. Generated: ${new Date().toLocaleDateString('en-KE')}</div>
        </body></html>`);
        w.document.close(); w.print();
    };

    const row = (label: string, val: number, accent?: string) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontFamily: T.fontBase }}>
            <span style={{ fontSize: 12, color: T.text.body }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent || T.text.heading }}>{fmt(val)}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: T.fontBase }}>
            {/* Pay advice header */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e293b 100%)', borderRadius: 18, padding: '20px 24px', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pay Advice</p>
                        <p style={{ margin: '6px 0 2px', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>{record.staff_name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{record.staff_type} · {record.pay_period}</p>
                    </div>
                    <StatusBadge status={record.status} />
                </div>
            </div>

            {/* Earnings / Deductions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <p style={{ ...labelStyle, color: '#10b981', marginBottom: 10 }}>↑ Earnings</p>
                    {row('Basic Salary', record.basic_salary)}
                    {row('House Allowance', record.house_allowance)}
                    {row('Transport Allowance', record.transport_allowance)}
                    {row('Medical Allowance', record.medical_allowance)}
                    {row('Other Allowances', record.other_allowances)}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, marginTop: 8, fontFamily: T.fontBase }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gross Pay</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#059669', letterSpacing: '-0.01em' }}>{fmt(record.gross_pay)}</span>
                    </div>
                </div>
                <div>
                    <p style={{ ...labelStyle, color: '#ef4444', marginBottom: 10 }}>↓ Deductions</p>
                    {row('PAYE Tax', record.paye, '#ef4444')}
                    {row('NHIF', record.nhif, '#ef4444')}
                    {row('NSSF', record.nssf, '#ef4444')}
                    {row('Housing Levy (1.5%)', record.housing_levy, '#ef4444')}
                    {row('Loans', record.loan_deductions, '#f97316')}
                    {row('Advances', record.advance_deductions, '#f97316')}
                    {row('SACCO', record.sacco_deductions, '#f97316')}
                    {row('Other', record.other_deductions, '#f97316')}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fef2f2', borderRadius: 10, marginTop: 8, fontFamily: T.fontBase }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Deductions</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#ef4444', letterSpacing: '-0.01em' }}>-{fmt(record.total_deductions)}</span>
                    </div>
                </div>
            </div>

            {/* Net Pay */}
            <div style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', borderRadius: 18, padding: '20px 24px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Pay (Take Home)</p>
                <p style={{ margin: '8px 0 4px', fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{fmt(record.net_pay)}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Payment: {record.payment_method || 'Bank Transfer'} {record.payment_ref ? `· Ref: ${record.payment_ref}` : ''}</p>
            </div>

            <button onClick={handlePrint} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#0f172a', color: '#fff', border: 'none', borderRadius: 14,
                padding: '12px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: T.fontBase, letterSpacing: '-0.01em', transition: 'background 0.15s',
            }}>
                <FiPrinter size={15} /> Print / Download Payslip
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL FORM
// ─────────────────────────────────────────────────────────────────────────────
function PayrollForm({ staff, advances, onSave, onClose, editRecord }: {
    staff: StaffMember[]; advances: SalaryAdvance[];
    onSave: (data: Partial<PayrollRecord>) => Promise<void>;
    onClose: () => void; editRecord?: PayrollRecord | null;
}) {
    const [selectedStaffId, setSelectedStaffId] = useState(editRecord?.staff_id || '');
    const [month, setMonth] = useState(editRecord?.month ?? now.getMonth() + 1);
    const [year, setYear] = useState(editRecord?.year ?? now.getFullYear());
    const [houseAllow, setHouseAllow] = useState(editRecord?.house_allowance ?? 0);
    const [transportAllow, setTransportAllow] = useState(editRecord?.transport_allowance ?? 0);
    const [medicalAllow, setMedicalAllow] = useState(editRecord?.medical_allowance ?? 0);
    const [otherAllow, setOtherAllow] = useState(editRecord?.other_allowances ?? 0);
    const [loanDeduct, setLoanDeduct] = useState(editRecord?.loan_deductions ?? 0);
    const [advanceDeduct, setAdvanceDeduct] = useState(editRecord?.advance_deductions ?? 0);
    const [saccoDeduct, setSaccoDeduct] = useState(editRecord?.sacco_deductions ?? 0);
    const [otherDeduct, setOtherDeduct] = useState(editRecord?.other_deductions ?? 0);
    const [payMethod, setPayMethod] = useState(editRecord?.payment_method || 'Bank Transfer');
    const [payRef, setPayRef] = useState(editRecord?.payment_ref || '');
    const [notes, setNotes] = useState(editRecord?.notes || '');
    const [saving, setSaving] = useState(false);

    const selectedStaff = staff.find(s => s.id === selectedStaffId);
    const basicSalary = selectedStaff?.basic_salary ?? 0;

    useEffect(() => {
        if (!selectedStaffId) return;
        const activeAdvance = advances.find(a => a.staff_id === selectedStaffId && a.status === 'Active');
        if (activeAdvance) setAdvanceDeduct(activeAdvance.monthly_deduction);
    }, [selectedStaffId, advances]);

    const calc = computePayroll(basicSalary, houseAllow, transportAllow, medicalAllow, otherAllow,
        loanDeduct, advanceDeduct, saccoDeduct, otherDeduct);

    const handleSave = async () => {
        if (!selectedStaffId) return alert('Please select a staff member');
        setSaving(true);
        const s = selectedStaff!;
        await onSave({
            staff_id: selectedStaffId,
            staff_name: `${s.first_name} ${s.last_name}`,
            staff_type: s._type, month, year,
            pay_period: `${MONTHS[month - 1]} ${year}`,
            basic_salary: basicSalary,
            house_allowance: houseAllow, transport_allowance: transportAllow,
            medical_allowance: medicalAllow, other_allowances: otherAllow,
            paye: calc.paye, nhif: calc.nhif, nssf: calc.nssf, housing_levy: calc.housingLevy,
            loan_deductions: loanDeduct, advance_deductions: advanceDeduct,
            sacco_deductions: saccoDeduct, other_deductions: otherDeduct,
            gross_pay: calc.grossPay, total_deductions: calc.totalDeductions, net_pay: calc.netPay,
            status: 'Pending', payment_method: payMethod, payment_ref: payRef, notes,
        });
        setSaving(false);
    };

    const fStyle = { ...inputStyle };

    const FieldLabel = ({ children }: { children: string }) => <label style={labelStyle}>{children}</label>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: T.fontBase }}>
            {/* Staff + Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <FieldLabel>Staff Member *</FieldLabel>
                    <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={fStyle}>
                        <option value="">— Select Staff —</option>
                        {staff.filter(s => s.status === 'Active').map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s._type}) — Basic: {fmt(s.basic_salary)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <FieldLabel>Month</FieldLabel>
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} style={fStyle}>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <FieldLabel>Year</FieldLabel>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} style={fStyle}>
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <FieldLabel>Basic Salary</FieldLabel>
                    <input type="text" value={fmt(basicSalary)} disabled style={{ ...fStyle, background: '#f1f5f9', color: T.text.muted }} />
                </div>
            </div>

            {/* Allowances */}
            <div>
                <p style={{ ...labelStyle, color: '#10b981', marginBottom: 10 }}>↑ Allowances</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        ['House Allowance', houseAllow, setHouseAllow],
                        ['Transport Allowance', transportAllow, setTransportAllow],
                        ['Medical Allowance', medicalAllow, setMedicalAllow],
                        ['Other Allowances', otherAllow, setOtherAllow],
                    ].map(([l, v, set]) => (
                        <div key={l as string}>
                            <FieldLabel>{l as string}</FieldLabel>
                            <input type="number" min="0" value={v as number} onChange={e => (set as any)(Number(e.target.value))} style={fStyle} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Deductions */}
            <div>
                <p style={{ ...labelStyle, color: '#ef4444', marginBottom: 10 }}>↓ Extra Deductions</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        ['Loan Deductions', loanDeduct, setLoanDeduct],
                        ['Advance Deductions', advanceDeduct, setAdvanceDeduct],
                        ['SACCO Contributions', saccoDeduct, setSaccoDeduct],
                        ['Other Deductions', otherDeduct, setOtherDeduct],
                    ].map(([l, v, set]) => (
                        <div key={l as string}>
                            <FieldLabel>{l as string}</FieldLabel>
                            <input type="number" min="0" value={v as number} onChange={e => (set as any)(Number(e.target.value))} style={fStyle} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Live tax computation — dark card */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 18, padding: '18px 20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🧮 Live KRA Tax Computation</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        ['Gross Pay', fmt(calc.grossPay), '#34d399'],
                        ['Taxable Income', fmt(calc.taxable), '#93c5fd'],
                        ['PAYE Tax', fmt(calc.paye), '#f87171'],
                        ['NHIF', fmt(calc.nhif), '#f87171'],
                        ['NSSF', fmt(calc.nssf), '#f87171'],
                        ['Housing Levy (1.5%)', fmt(calc.housingLevy), '#f87171'],
                        ['Total Deductions', fmt(calc.totalDeductions), '#fb923c'],
                    ].map(([l, v, c]) => (
                        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontBase }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c as string }}>{v}</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: T.fontBase }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>NET PAY</span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>{fmt(calc.netPay)}</span>
                </div>
            </div>

            {/* Payment method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <FieldLabel>Payment Method</FieldLabel>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={fStyle}>
                        {['Bank Transfer', 'M-Pesa', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <FieldLabel>Payment Reference</FieldLabel>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TXN12345" style={fStyle} />
                </div>
            </div>
            <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Any notes for this payroll entry..."
                    style={{ ...fStyle, resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{
                    flex: 1, padding: '12px', borderRadius: 14, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: T.text.body, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: T.fontBase, transition: 'all 0.15s',
                }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{
                    flex: 2, padding: '12px', borderRadius: 14, border: 'none',
                    background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#2563eb)',
                    color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 800, fontFamily: T.fontBase,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    letterSpacing: '-0.01em', transition: 'all 0.15s',
                }}>
                    {saving
                        ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Saving...</>
                        : <><FiCheck size={14} /> Save Payroll Record</>}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCE FORM
// ─────────────────────────────────────────────────────────────────────────────
function AdvanceForm({ staff, onSave, onClose }: {
    staff: StaffMember[];
    onSave: (data: Partial<SalaryAdvance>) => Promise<void>;
    onClose: () => void;
}) {
    const [staffId, setStaffId] = useState('');
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState('');
    const [monthly, setMonthly] = useState(0);
    const [saving, setSaving] = useState(false);

    const months = amount > 0 && monthly > 0 ? Math.ceil(amount / monthly) : 0;
    const selectedStaff = staff.find(s => s.id === staffId);

    const handleSave = async () => {
        if (!staffId || amount <= 0 || monthly <= 0) return alert('Fill all required fields');
        setSaving(true);
        await onSave({
            staff_id: staffId,
            staff_name: `${selectedStaff?.first_name} ${selectedStaff?.last_name}`,
            amount, reason, monthly_deduction: monthly, balance: amount, status: 'Pending',
        });
        setSaving(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: T.fontBase }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                ⚠️ Salary advances will be automatically deducted from monthly payroll when approved and set to Active.
            </div>
            <div>
                <label style={labelStyle}>Staff Member *</label>
                <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inputStyle}>
                    <option value="">— Select Staff —</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — Basic: {fmt(s.basic_salary)}</option>
                    ))}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={labelStyle}>Advance Amount (KES) *</label>
                    <input type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Monthly Deduction (KES) *</label>
                    <input type="number" min="0" value={monthly} onChange={e => setMonthly(Number(e.target.value))} style={inputStyle} />
                </div>
            </div>
            {months > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#1e40af', fontWeight: 600 }}>
                    📅 Repayment duration: approx. <strong>{months} month{months !== 1 ? 's' : ''}</strong>
                </div>
            )}
            <div>
                <label style={labelStyle}>Reason / Purpose</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                    placeholder="Reason for advance request..." style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: T.text.body, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 800, fontFamily: T.fontBase, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {saving ? 'Submitting...' : <><FiCheck size={14} /> Submit Advance Request</>}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK PAYROLL RUNNER
// ─────────────────────────────────────────────────────────────────────────────
function BulkPayrollRunner({ staff, advances, onComplete, onClose }: {
    staff: StaffMember[]; advances: SalaryAdvance[];
    onComplete: () => void; onClose: () => void;
}) {
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [houseRate, setHouseRate] = useState(15);
    const [transportFlat, setTransportFlat] = useState(3000);
    const [medicalFlat, setMedicalFlat] = useState(2000);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);

    const activeStaff = staff.filter(s => s.status === 'Active');

    const preview = activeStaff.map(s => {
        const houseAllow = Math.round(s.basic_salary * houseRate / 100);
        const activeAdv = advances.find(a => a.staff_id === s.id && a.status === 'Active');
        const advDeduct = activeAdv?.monthly_deduction ?? 0;
        const calc = computePayroll(s.basic_salary, houseAllow, transportFlat, medicalFlat, 0, 0, advDeduct, 0, 0);
        return { ...s, calc, houseAllow };
    });

    const totalGross = preview.reduce((s, p) => s + p.calc.grossPay, 0);
    const totalNet = preview.reduce((s, p) => s + p.calc.netPay, 0);
    const totalPAYE = preview.reduce((s, p) => s + p.calc.paye, 0);

    const handleRun = async () => {
        if (!confirm(`Process payroll for ${activeStaff.length} staff members for ${MONTHS[month - 1]} ${year}?`)) return;
        setRunning(true);
        for (let i = 0; i < preview.length; i++) {
            const s = preview[i];
            await supabase.from('school_payroll').insert({
                staff_id: s.id, staff_name: `${s.first_name} ${s.last_name}`, staff_type: s._type,
                month, year, pay_period: `${MONTHS[month - 1]} ${year}`,
                basic_salary: s.basic_salary, house_allowance: s.houseAllow,
                transport_allowance: transportFlat, medical_allowance: medicalFlat, other_allowances: 0,
                paye: s.calc.paye, nhif: s.calc.nhif, nssf: s.calc.nssf, housing_levy: s.calc.housingLevy,
                loan_deductions: 0, advance_deductions: s.calc.advanceDeductions,
                sacco_deductions: 0, other_deductions: 0,
                gross_pay: s.calc.grossPay, total_deductions: s.calc.totalDeductions, net_pay: s.calc.netPay,
                status: 'Pending',
            });
            setProgress(Math.round(((i + 1) / preview.length) * 100));
        }
        setRunning(false); setDone(true);
        onComplete();
    };

    if (done) return (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: T.fontBase }}>
            <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FiCheckCircle size={32} color="#22c55e" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: T.text.heading, letterSpacing: '-0.02em' }}>Payroll Processed!</h3>
            <p style={{ margin: 0, fontSize: 12, color: T.text.muted }}>{preview.length} staff members processed for {MONTHS[month - 1]} {year}</p>
            <button onClick={onClose} style={{ marginTop: 24, padding: '12px 32px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}>Done</button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: T.fontBase }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[['Month', month, setMonth, 'select-month'], ['Year', year, setYear, 'select-year'], ['House Allow %', houseRate, setHouseRate, 'number'], ['Transport (KES flat)', transportFlat, setTransportFlat, 'number'], ['Medical (KES flat)', medicalFlat, setMedicalFlat, 'number']].map(([l, v, set, type]) => (
                    <div key={l as string}>
                        <label style={labelStyle}>{l as string}</label>
                        {type === 'select-month'
                            ? <select value={v as number} onChange={e => (set as any)(Number(e.target.value))} style={inputStyle}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                            : type === 'select-year'
                                ? <select value={v as number} onChange={e => (set as any)(Number(e.target.value))} style={inputStyle}>{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
                                : <input type="number" min="0" value={v as number} onChange={e => (set as any)(Number(e.target.value))} style={inputStyle} />}
                    </div>
                ))}
            </div>

            {/* Summary mini-cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                {[
                    ['Total Staff', `${activeStaff.length}`, '#6366f1'],
                    ['Total Gross', fmt(totalGross), '#059669'],
                    ['Total Net', fmt(totalNet), '#0284c7'],
                    ['Total PAYE', fmt(totalPAYE), '#dc2626'],
                ].map(([l, v, c]) => (
                    <div key={l as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', textAlign: 'center', borderTop: `3px solid ${c as string}` }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 900, color: c as string, letterSpacing: '-0.01em' }}>{v}</p>
                    </div>
                ))}
            </div>

            {/* Preview table */}
            <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: T.fontBase }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                            {['Name', 'Type', 'Basic', 'Gross', 'PAYE', 'Net'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {preview.map(s => (
                            <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600, color: T.text.heading }}>{s.first_name} {s.last_name}</td>
                                <td style={{ padding: '8px 12px', color: T.text.muted }}>{s._type}</td>
                                <td style={{ padding: '8px 12px' }}>{fmt(s.basic_salary)}</td>
                                <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 700 }}>{fmt(s.calc.grossPay)}</td>
                                <td style={{ padding: '8px 12px', color: '#ef4444', fontWeight: 700 }}>{fmt(s.calc.paye)}</td>
                                <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: 900 }}>{fmt(s.calc.netPay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {running && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.text.muted }}>
                        <span>Processing payroll...</span><span>{progress}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#4f46e5,#2563eb)', borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: T.text.body, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase }}>Cancel</button>
                <button onClick={handleRun} disabled={running} style={{
                    flex: 2, padding: '12px', borderRadius: 14, border: 'none',
                    background: running ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#2563eb)',
                    color: '#fff', cursor: running ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 800, fontFamily: T.fontBase,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    {running
                        ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Processing {progress}%...</>
                        : <><FiZap size={14} /> Run Bulk Payroll for {activeStaff.length} Staff</>}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'payroll' | 'advances' | 'analytics';
type StatusFilter = 'All' | 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Rejected';

export default function PayrollPage() {
    const [tab, setTab] = useState<Tab>('payroll');
    const [loading, setLoading] = useState(true);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [monthFilter, setMonthFilter] = useState<number>(0);
    const [yearFilter, setYearFilter] = useState<number>(now.getFullYear());
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [viewRecord, setViewRecord] = useState<PayrollRecord | null>(null);
    const [editRecord, setEditRecord] = useState<PayrollRecord | null | undefined>(null);
    const [showAddPayroll, setShowAddPayroll] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showAdvanceForm, setShowAdvanceForm] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [teachersRes, supportRes, subRes, payrollRes, advRes] = await Promise.all([
                supabase.from('school_teachers').select('*'),
                supabase.from('school_support_teachers').select('*'),
                supabase.from('school_subordinate_staff').select('*'),
                supabase.from('school_payroll').select('*').order('created_at', { ascending: false }),
                supabase.from('school_salary_advances').select('*').order('created_at', { ascending: false }),
            ]);
            const allStaff: StaffMember[] = [
                ...(teachersRes.data || []).map((t: any) => ({ ...t, _type: 'TSC Teacher' as const })),
                ...(supportRes.data || []).map((s: any) => ({ ...s, _type: 'Support Teacher' as const })),
                ...(subRes.data || []).map((s: any) => ({ ...s, _type: 'Subordinate' as const })),
            ];
            setStaff(allStaff); setPayrolls(payrollRes.data || []); setAdvances(advRes.data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const stats = useMemo(() => {
        const paid = payrolls.filter(p => p.status === 'Paid');
        const pending = payrolls.filter(p => p.status === 'Pending');
        const totalGross = payrolls.reduce((s, p) => s + p.gross_pay, 0);
        const totalNet = payrolls.reduce((s, p) => s + p.net_pay, 0);
        const totalPAYE = payrolls.reduce((s, p) => s + p.paye, 0);
        const totalNHIF = payrolls.reduce((s, p) => s + p.nhif, 0);
        const pendingAdvances = advances.filter(a => a.status === 'Pending').length;
        const activeAdvances = advances.filter(a => a.status === 'Active');
        const totalAdvanceBalance = activeAdvances.reduce((s, a) => s + a.balance, 0);
        return { paid: paid.length, pending: pending.length, totalGross, totalNet, totalPAYE, totalNHIF, pendingAdvances, totalAdvanceBalance };
    }, [payrolls, advances]);

    const filteredPayrolls = useMemo(() => {
        let res = [...payrolls];
        if (search) {
            const q = search.toLowerCase();
            res = res.filter(p => p.staff_name.toLowerCase().includes(q) || p.pay_period.toLowerCase().includes(q) || p.staff_type.toLowerCase().includes(q));
        }
        if (statusFilter !== 'All') res = res.filter(p => p.status === statusFilter);
        if (monthFilter > 0) res = res.filter(p => p.month === monthFilter);
        if (yearFilter) res = res.filter(p => p.year === yearFilter);
        res.sort((a: any, b: any) => {
            const av = a[sortField]; const bv = b[sortField];
            if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
            return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        return res;
    }, [payrolls, search, statusFilter, monthFilter, yearFilter, sortField, sortDir]);

    const handleBulkStatus = async (status: PayrollRecord['status']) => {
        if (selected.size === 0) return;
        if (!confirm(`Mark ${selected.size} records as ${status}?`)) return;
        await Promise.all(Array.from(selected).map(id => supabase.from('school_payroll').update({ status }).eq('id', id)));
        await fetchAll(); setSelected(new Set());
    };
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this payroll record?')) return;
        await supabase.from('school_payroll').delete().eq('id', id);
        await fetchAll();
    };
    const handleSavePayroll = async (data: Partial<PayrollRecord>) => {
        if (editRecord) await supabase.from('school_payroll').update(data).eq('id', editRecord.id);
        else await supabase.from('school_payroll').insert(data);
        await fetchAll(); setShowAddPayroll(false); setEditRecord(null);
    };
    const handleSaveAdvance = async (data: Partial<SalaryAdvance>) => {
        await supabase.from('school_salary_advances').insert(data);
        await fetchAll(); setShowAdvanceForm(false);
    };
    const handleAdvanceAction = async (id: string, status: SalaryAdvance['status']) => {
        await supabase.from('school_salary_advances').update({ status }).eq('id', id);
        await fetchAll();
    };
    const toggleSelect = (id: string) => {
        const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
    };
    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const exportCSV = () => {
        const rows = [
            ['Name', 'Type', 'Period', 'Basic', 'House Allow', 'Transport', 'Medical', 'Other Allow', 'Gross Pay', 'PAYE', 'NHIF', 'NSSF', 'Housing Levy', 'Loans', 'Advances', 'SACCO', 'Other Deductions', 'Total Deductions', 'Net Pay', 'Status', 'Payment Method', 'Reference'],
            ...filteredPayrolls.map(p => [p.staff_name, p.staff_type, p.pay_period, p.basic_salary, p.house_allowance, p.transport_allowance, p.medical_allowance, p.other_allowances, p.gross_pay, p.paye, p.nhif, p.nssf, p.housing_levy, p.loan_deductions, p.advance_deductions, p.sacco_deductions, p.other_deductions, p.total_deductions, p.net_pay, p.status, p.payment_method, p.payment_ref]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `payroll_${MONTHS[now.getMonth()]}_${now.getFullYear()}.csv`;
        a.click();
    };

    const analyticsData = useMemo(() => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        payrolls.forEach(p => {
            byType[p.staff_type] = (byType[p.staff_type] || 0) + p.net_pay;
            byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        });
        const monthly: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const key = `${d.toLocaleString('en', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
            const m = d.getMonth() + 1; const y = d.getFullYear();
            monthly[key] = payrolls.filter(p => p.month === m && p.year === y && p.status === 'Paid').reduce((s, p) => s + p.net_pay, 0);
        }
        return { byType, byStatus, monthly };
    }, [payrolls]);

    const statusColors: Record<string, string> = { Draft: '#94a3b8', Pending: '#f59e0b', Approved: '#3b82f6', Paid: '#22c55e', Rejected: '#ef4444' };

    // Sort button component
    const SortBtn = ({ field, label }: { field: string; label: string }) => (
        <th onClick={() => handleSort(field)} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: sortField === field ? '#4f46e5' : T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', fontFamily: T.fontBase }}>
            {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </th>
    );

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: T.fontBase }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 16px' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f1f5f9' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                    <FiDollarSign style={{ position: 'absolute', inset: 0, margin: 'auto', color: '#6366f1' }} size={20} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.text.heading, margin: 0, letterSpacing: '-0.01em' }}>Loading Payroll System…</p>
                <p style={{ fontSize: 11, color: T.text.faint, margin: '6px 0 0' }}>Kenya Tax Calculator Active</p>
            </div>
            <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
        </div>
    );

    return (
        <>
            <style>{`
                @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
                @keyframes modalIn { from { opacity:0; transform:scale(0.94) translateY(10px) } to { opacity:1; transform:none } }
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width:5px; height:5px; }
                ::-webkit-scrollbar-track { background:#f8fafc; }
                ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px; }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40, fontFamily: T.fontBase }}>

                {/* ── TOP HEADER ─────────────────────────────────────────────── */}
                <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e293b 100%)', borderRadius: 20, padding: '20px 24px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiDollarSign size={20} color="#a5b4fc" />
                                </div>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>Payroll Management</h1>
                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Kenya Tax Calculator · PAYE · NHIF · NSSF · Housing Levy · Advances</p>
                                </div>
                            </div>
                            {/* Quick stat tags */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { label: `${payrolls.length} records`, color: '#6366f1' },
                                    { label: `${stats.paid} paid`, color: '#22c55e' },
                                    { label: `${stats.pending} pending`, color: '#f59e0b' },
                                    { label: `${staff.filter(s => s.status === 'Active').length} active staff`, color: '#06b6d4' },
                                ].map(tag => (
                                    <span key={tag.label} style={{ fontSize: 10, fontWeight: 700, color: tag.color, background: `${tag.color}22`, borderRadius: 20, padding: '3px 10px', border: `1px solid ${tag.color}44` }}>
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <button onClick={() => fetchAll()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: T.fontBase }}>
                                <FiRefreshCw size={13} /> Refresh
                            </button>
                            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: T.fontBase }}>
                                <FiDownload size={13} /> Export CSV
                            </button>
                            <button onClick={() => setShowAdvanceForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase }}>
                                <FiCreditCard size={13} /> Salary Advance
                            </button>
                            <button onClick={() => setShowBulk(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase }}>
                                <FiZap size={13} /> Bulk Run
                            </button>
                            <button onClick={() => { setEditRecord(undefined); setShowAddPayroll(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase, boxShadow: '0 4px 14px rgba(79,70,229,0.4)' }}>
                                <FiPlus size={13} /> Add Payroll
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── STAT CARDS ──────────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                    <StatCard label="Total Records" value={String(payrolls.length)} icon={FiFileText} color="#6366f1" sub={`${stats.paid} Paid · ${stats.pending} Pending`} />
                    <StatCard label="Total Gross Pay" value={fmt(stats.totalGross)} icon={FiTrendingUp} color="#059669" trend="up" />
                    <StatCard label="Total Net Pay" value={fmt(stats.totalNet)} icon={FiDollarSign} color="#0284c7" />
                    <StatCard label="Total PAYE (KRA)" value={fmt(stats.totalPAYE)} icon={FiShield} color="#dc2626" sub={`NHIF: ${fmt(stats.totalNHIF)}`} />
                    <StatCard label="Active Advances" value={fmt(stats.totalAdvanceBalance)} icon={FiCreditCard} color="#f59e0b" sub={`${stats.pendingAdvances} pending approval`} />
                    <StatCard label="Active Staff" value={String(staff.filter(s => s.status === 'Active').length)} icon={FiUsers} color="#8b5cf6" />
                </div>

                {/* ── TABS ──────────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 14, padding: 4, width: 'fit-content' }}>
                    {([
                        ['payroll', FiFileText, 'Payroll Records'],
                        ['advances', FiCreditCard, 'Salary Advances'],
                        ['analytics', FiBarChart2, 'Analytics'],
                    ] as const).map(([t, Icon, label]) => (
                        <button key={t} onClick={() => setTab(t as Tab)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                            borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                            fontSize: 12, fontWeight: tab === t ? 700 : 600, fontFamily: T.fontBase,
                            background: tab === t ? '#fff' : 'transparent',
                            color: tab === t ? '#1e293b' : '#64748b',
                            boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.18s',
                        }}>
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {tab === 'payroll' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Filter bar */}
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                            <FiFilter size={14} color={T.text.faint} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filters:</span>
                            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                                <FiSearch size={13} color={T.text.faint} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff, period..."
                                    style={{ ...inputStyle, paddingLeft: 32, flex: 1 }} />
                            </div>
                            {[
                                { label: 'Status', value: statusFilter, onChange: (v: string) => setStatusFilter(v as StatusFilter), opts: ['All', 'Draft', 'Pending', 'Approved', 'Paid', 'Rejected'] },
                                { label: 'Month', value: String(monthFilter), onChange: (v: string) => setMonthFilter(Number(v)), opts: ['0', ...MONTHS.map((_, i) => String(i + 1))], optLabels: ['All Months', ...MONTHS] },
                                { label: 'Year', value: String(yearFilter), onChange: (v: string) => setYearFilter(Number(v)), opts: ['2024', '2025', '2026'] },
                            ].map(({ label, value, onChange, opts, optLabels }) => (
                                <select key={label} value={value} onChange={e => onChange(e.target.value)}
                                    style={{ ...inputStyle, width: 'auto', minWidth: 110 }}>
                                    {opts.map((o, i) => <option key={o} value={o}>{optLabels ? optLabels[i] : o}</option>)}
                                </select>
                            ))}
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.text.faint, marginLeft: 'auto' }}>
                                {filteredPayrolls.length} of {payrolls.length} records
                            </span>
                        </div>

                        {/* Bulk actions bar */}
                        {selected.size > 0 && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#1e40af' }}>{selected.size} selected</span>
                                {[
                                    { label: 'Approve All', color: '#2563eb', bg: '#2563eb', onClick: () => handleBulkStatus('Approved') },
                                    { label: 'Mark Paid', color: '#059669', bg: '#059669', onClick: () => handleBulkStatus('Paid') },
                                    { label: 'Reject', color: '#ef4444', bg: '#ef4444', onClick: () => handleBulkStatus('Rejected') },
                                ].map(({ label, bg, onClick }) => (
                                    <button key={label} onClick={onClick} style={{ padding: '6px 14px', background: bg, color: '#fff', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}>
                                        {label}
                                    </button>
                                ))}
                                <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', fontSize: 11, color: T.text.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontBase }}>Clear</button>
                            </div>
                        )}

                        {/* Main data table — ultra-refined */}
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: T.fontBase }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ width: 36, padding: '10px 12px' }}>
                                                <input type="checkbox"
                                                    checked={selected.size === filteredPayrolls.length && filteredPayrolls.length > 0}
                                                    onChange={e => setSelected(e.target.checked ? new Set(filteredPayrolls.map(p => p.id)) : new Set())}
                                                    style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                                            </th>
                                            <SortBtn field="staff_name" label="Staff Member" />
                                            <SortBtn field="staff_type" label="Type" />
                                            <SortBtn field="pay_period" label="Period" />
                                            <SortBtn field="gross_pay" label="Gross" />
                                            <SortBtn field="paye" label="PAYE" />
                                            <SortBtn field="net_pay" label="Net Pay" />
                                            <SortBtn field="status" label="Status" />
                                            <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: T.fontBase }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayrolls.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: T.text.faint, fontFamily: T.fontBase }}>
                                                    <FiFileText size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                                                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No payroll records found</p>
                                                    <p style={{ fontSize: 11, margin: '4px 0 0' }}>Adjust your filters or add a new record</p>
                                                </td>
                                            </tr>
                                        ) : filteredPayrolls.map(p => (
                                            <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                                                        style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <p style={{ margin: 0, fontWeight: 700, color: T.text.heading, fontSize: 12 }}>{p.staff_name}</p>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 6, padding: '2px 8px' }}>{p.staff_type}</span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: T.text.muted, fontWeight: 600 }}>{p.pay_period}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669', fontSize: 12 }}>{fmt(p.gross_pay)}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#ef4444', fontSize: 11 }}>{fmt(p.paye)}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 900, color: '#0f172a', fontSize: 13, letterSpacing: '-0.01em' }}>{fmt(p.net_pay)}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <StatusBadge status={p.status} />
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {[
                                                            { icon: FiEye, title: 'View Payslip', hoverBg: '#eef2ff', hoverColor: '#6366f1', onClick: () => setViewRecord(p) },
                                                            { icon: FiEdit2, title: 'Edit', hoverBg: '#eff6ff', hoverColor: '#2563eb', onClick: () => { setEditRecord(p); setShowAddPayroll(true); } },
                                                        ].map(({ icon: Icon, title, hoverBg, hoverColor, onClick }) => (
                                                            <button key={title} onClick={onClick} title={title} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f1f5f9', color: T.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                                                onMouseEnter={e => { const b = e.currentTarget; b.style.background = hoverBg; b.style.color = hoverColor; }}
                                                                onMouseLeave={e => { const b = e.currentTarget; b.style.background = '#f1f5f9'; b.style.color = T.text.muted; }}>
                                                                <Icon size={12} />
                                                            </button>
                                                        ))}
                                                        {p.status === 'Pending' && (
                                                            <button onClick={async () => { await supabase.from('school_payroll').update({ status: 'Approved' }).eq('id', p.id); fetchAll(); }} title="Approve" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <FiCheck size={12} />
                                                            </button>
                                                        )}
                                                        {p.status === 'Approved' && (
                                                            <button onClick={async () => { await supabase.from('school_payroll').update({ status: 'Paid' }).eq('id', p.id); fetchAll(); }} title="Mark Paid" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <FiCheckCircle size={12} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(p.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f1f5f9', color: T.text.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { const b = e.currentTarget; b.style.background = '#fef2f2'; b.style.color = '#ef4444'; }}
                                                            onMouseLeave={e => { const b = e.currentTarget; b.style.background = '#f1f5f9'; b.style.color = T.text.muted; }}>
                                                            <FiTrash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table footer totals */}
                            {filteredPayrolls.length > 0 && (
                                <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 11, fontWeight: 700, color: T.text.muted, fontFamily: T.fontBase }}>
                                    <span>Showing {filteredPayrolls.length} records</span>
                                    <span>Gross: <strong style={{ color: '#059669' }}>{fmt(filteredPayrolls.reduce((s, p) => s + p.gross_pay, 0))}</strong></span>
                                    <span>PAYE: <strong style={{ color: '#ef4444' }}>{fmt(filteredPayrolls.reduce((s, p) => s + p.paye, 0))}</strong></span>
                                    <span>NHIF: <strong style={{ color: '#f97316' }}>{fmt(filteredPayrolls.reduce((s, p) => s + p.nhif, 0))}</strong></span>
                                    <span>Net: <strong style={{ color: '#2563eb' }}>{fmt(filteredPayrolls.reduce((s, p) => s + p.net_pay, 0))}</strong></span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════ */}
                {tab === 'advances' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text.heading, letterSpacing: '-0.01em' }}>Salary Advances Register</h2>
                            <button onClick={() => setShowAdvanceForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: T.fontBase }}>
                                <FiPlus size={13} /> New Advance
                            </button>
                        </div>

                        {/* Advance summary mini-cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                            {[
                                ['Pending', advances.filter(a => a.status === 'Pending').length, '#f59e0b'],
                                ['Active', advances.filter(a => a.status === 'Active').length, '#3b82f6'],
                                ['Cleared', advances.filter(a => a.status === 'Cleared').length, '#22c55e'],
                            ].map(([l, v, c]) => (
                                <div key={l as string} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '16px 20px', textAlign: 'center', borderTop: `3px solid ${c as string}` }}>
                                    <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: c as string, letterSpacing: '-0.02em' }}>{v as number}</p>
                                    <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                                </div>
                            ))}
                        </div>

                        {/* Advances table */}
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: T.fontBase }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            {['Staff Member', 'Amount', 'Monthly Deduction', 'Balance', 'Reason', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.text.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: T.fontBase }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advances.length === 0 ? (
                                            <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: T.text.faint, fontFamily: T.fontBase }}>
                                                <FiCreditCard size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                                                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No salary advances yet</p>
                                            </td></tr>
                                        ) : advances.map(a => (
                                            <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fffbeb')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                <td style={{ padding: '10px 14px', fontWeight: 700, color: T.text.heading }}>{a.staff_name}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 800, color: T.text.heading }}>{fmt(a.amount)}</td>
                                                <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: 700 }}>{fmt(a.monthly_deduction)}/mo</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', background: '#f59e0b', borderRadius: 3, width: `${(a.balance / a.amount) * 100}%`, transition: 'width 0.5s' }} />
                                                        </div>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: T.text.muted, whiteSpace: 'nowrap' }}>{fmt(a.balance)}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', color: T.text.muted, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</td>
                                                <td style={{ padding: '10px 14px' }}><StatusBadge status={a.status} /></td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {a.status === 'Pending' && <>
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Active')} style={{ padding: '5px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}>Approve</button>
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Rejected')} style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}>Reject</button>
                                                        </>}
                                                        {a.status === 'Active' && (
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Cleared')} style={{ padding: '5px 10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}>Mark Cleared</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════ */}
                {tab === 'analytics' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                            {/* Monthly trend */}
                            <SectionCard title="Monthly Net Pay Trend (Paid)" subtitle="Last 6 months" accent="#6366f1">
                                <div style={{ height: 280 }}>
                                    <Bar data={{
                                        labels: Object.keys(analyticsData.monthly),
                                        datasets: [{ label: 'Net Pay', data: Object.values(analyticsData.monthly), backgroundColor: '#6366f120', borderColor: '#6366f1', borderWidth: 2, borderRadius: 10 }]
                                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => fmt(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { font: { size: 9 } } } } }} />
                                </div>
                            </SectionCard>

                            {/* Net pay by type */}
                            <SectionCard title="Net Pay by Staff Type" subtitle="Distribution of payroll spend" accent="#8b5cf6">
                                <div style={{ height: 280 }}>
                                    <Doughnut data={{
                                        labels: Object.keys(analyticsData.byType),
                                        datasets: [{ data: Object.values(analyticsData.byType), backgroundColor: ['#6366f1', '#8b5cf6', '#f59e0b'], borderWidth: 0 }]
                                    }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
                                </div>
                            </SectionCard>

                            {/* Records by status */}
                            <SectionCard title="Records by Status" subtitle="Payroll pipeline overview" accent="#06b6d4">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {Object.entries(analyticsData.byStatus).map(([status, count]) => (
                                        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: T.fontBase }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: T.text.body, width: 70, flexShrink: 0 }}>{status}</span>
                                            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 99, background: statusColors[status] || '#94a3b8', width: `${(count / payrolls.length) * 100}%`, transition: 'width 0.5s' }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: T.text.heading, width: 24, textAlign: 'right' }}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>

                            {/* KRA Statutory summary — dark card */}
                            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: '1px solid #1e293b', borderRadius: 20, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FiShield size={14} color="#94a3b8" />
                                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: T.fontBase }}>KRA / Statutory Summary</h3>
                                </div>
                                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                        ['PAYE Tax (KRA)', payrolls.reduce((s, p) => s + p.paye, 0), '#f87171'],
                                        ['NHIF Contributions', payrolls.reduce((s, p) => s + p.nhif, 0), '#fb923c'],
                                        ['NSSF Contributions', payrolls.reduce((s, p) => s + p.nssf, 0), '#facc15'],
                                        ['Housing Levy', payrolls.reduce((s, p) => s + p.housing_levy, 0), '#a78bfa'],
                                        ['Total Statutory', payrolls.reduce((s, p) => s + p.paye + p.nhif + p.nssf + p.housing_levy, 0), '#34d399'],
                                    ].map(([l, v, c]) => (
                                        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: T.fontBase }}>
                                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
                                            <span style={{ fontSize: 15, fontWeight: 900, color: c as string, letterSpacing: '-0.01em' }}>{fmt(v as number)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontFamily: T.fontBase }}>
                    <span style={{ fontSize: 10, color: T.text.faint }}>Alpha Payroll Engine · AlphaSchool ERP</span>
                    <span style={{ fontSize: 10, color: T.text.faint }}>Generated: {new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            <Modal open={!!viewRecord} onClose={() => setViewRecord(null)} title="Employee Payslip" size="lg">
                {viewRecord && <PayslipViewer record={viewRecord} onClose={() => setViewRecord(null)} />}
            </Modal>

            <Modal open={showAddPayroll} onClose={() => { setShowAddPayroll(false); setEditRecord(null); }}
                title={editRecord ? 'Edit Payroll Record' : 'Add Payroll Record'} size="lg">
                <PayrollForm staff={staff} advances={advances} editRecord={editRecord}
                    onSave={handleSavePayroll} onClose={() => { setShowAddPayroll(false); setEditRecord(null); }} />
            </Modal>

            <Modal open={showBulk} onClose={() => setShowBulk(false)} title="⚡ Bulk Payroll Runner" size="xl">
                <BulkPayrollRunner staff={staff} advances={advances} onComplete={fetchAll} onClose={() => setShowBulk(false)} />
            </Modal>

            <Modal open={showAdvanceForm} onClose={() => setShowAdvanceForm(false)} title="Salary Advance Request" size="md">
                <AdvanceForm staff={staff} onSave={handleSaveAdvance} onClose={() => setShowAdvanceForm(false)} />
            </Modal>
        </>
    );
}

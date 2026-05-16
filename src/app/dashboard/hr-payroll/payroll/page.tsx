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
const PERSONAL_RELIEF = 2400; // KES/month
const NHIF_RATES = [
    { max: 5999, amt: 150 },
    { max: 7999, amt: 300 },
    { max: 11999, amt: 400 },
    { max: 14999, amt: 500 },
    { max: 19999, amt: 600 },
    { max: 24999, amt: 750 },
    { max: 29999, amt: 850 },
    { max: 34999, amt: 900 },
    { max: 39999, amt: 950 },
    { max: 44999, amt: 1000 },
    { max: 49999, amt: 1100 },
    { max: 59999, amt: 1200 },
    { max: 69999, amt: 1300 },
    { max: 79999, amt: 1400 },
    { max: 89999, amt: 1500 },
    { max: 99999, amt: 1600 },
    { max: Infinity, amt: 1700 },
];
const NSSF_EMPLOYEE = 200; // Tier I + II simplified flat for now
const HOUSING_LEVY_RATE = 0.015; // 1.5% of gross

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
    basicSalary: number,
    houseAllowance: number,
    transportAllowance: number,
    medicalAllowance: number,
    otherAllowances: number,
    loanDeductions: number,
    advanceDeductions: number,
    saccoDeductions: number,
    otherDeductions: number,
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
        loanDeductions, advanceDeductions, saccoDeductions, otherDeductions,
        totalDeductions, netPay
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT HELPERS
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
// MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
    open: boolean; onClose: () => void; title: string;
    children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}) {
    if (!open) return null;
    const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-7xl' };
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
            <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeMap[size]} flex flex-col max-h-[92vh] animate-modal`}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{title}</h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-600 transition-all">
                        <FiXCircle size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, trend }: {
    label: string; value: string; icon: any; color: string; sub?: string; trend?: 'up' | 'down';
}) {
    return (
        <div className="relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-5 -mr-8 -mt-8" style={{ background: color }} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
                    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
                    <Icon size={20} style={{ color }} />
                </div>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {trend === 'up' ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                    {trend === 'up' ? 'Up this month' : 'Down this month'}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYSLIP VIEWER
// ─────────────────────────────────────────────────────────────────────────────
function PayslipViewer({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<html><head><title>Payslip - ${record.staff_name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
            body { padding: 40px; color: #1a1a2e; background: #fff; }
            .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 24px; }
            .logo { font-size: 28px; font-weight: 900; color: #1e3a5f; letter-spacing: -1px; }
            .sub { font-size: 13px; color: #666; margin-top: 4px; }
            .payslip-title { background: #1e3a5f; color: white; text-align: center; padding: 10px; font-weight: 700; font-size: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .info-item { background: #f8fafc; padding: 12px; border-radius: 8px; }
            .info-label { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-value { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-top: 2px; }
            .earnings-deductions { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a5f; padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            td { font-size: 13px; padding: 8px; border-bottom: 1px solid #f1f5f9; }
            td:last-child { text-align: right; font-weight: 600; }
            .total-row td { font-weight: 800; font-size: 14px; border-top: 2px solid #1e3a5f; color: #1e3a5f; }
            .net-box { background: linear-gradient(135deg, #1e3a5f, #2d6a4f); color: white; padding: 16px 24px; border-radius: 12px; text-align: center; margin-top: 20px; }
            .net-label { font-size: 12px; opacity: 0.8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .net-amount { font-size: 32px; font-weight: 900; margin-top: 4px; letter-spacing: -1px; }
            .section-title { font-size: 12px; font-weight: 800; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding: 6px 8px; background: #eff6ff; border-radius: 6px; }
            .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
        </style></head><body>
        <div class="header">
            <div class="logo">ALPHA SCHOOL</div>
            <div class="sub">HR & Payroll Department • Payslip</div>
        </div>
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

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs opacity-60 font-semibold uppercase tracking-widest mb-1">Pay Advice</p>
                        <p className="text-xl font-black">{record.staff_name}</p>
                        <p className="text-sm opacity-70 mt-1">{record.staff_type} · {record.pay_period}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs opacity-60">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${record.status === 'Paid' ? 'bg-emerald-500' :
                            record.status === 'Approved' ? 'bg-blue-500' :
                                record.status === 'Pending' ? 'bg-amber-500' : 'bg-gray-500'
                            }`}>{record.status}</span>
                    </div>
                </div>
            </div>

            {/* Earnings & Deductions Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Earnings */}
                <div>
                    <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <FiTrendingUp size={11} /> Earnings
                    </h4>
                    <div className="space-y-1">
                        {[
                            ['Basic Salary', record.basic_salary],
                            ['House Allowance', record.house_allowance],
                            ['Transport Allowance', record.transport_allowance],
                            ['Medical Allowance', record.medical_allowance],
                            ['Other Allowances', record.other_allowances],
                        ].map(([l, v]) => (
                            <div key={l as string} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                                <span className="text-gray-600">{l}</span>
                                <span className="font-semibold text-gray-800">{fmt(Number(v))}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-xl mt-2">
                            <span className="text-xs font-black text-emerald-800 uppercase">Gross Pay</span>
                            <span className="font-black text-emerald-700">{fmt(record.gross_pay)}</span>
                        </div>
                    </div>
                </div>
                {/* Deductions */}
                <div>
                    <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <FiTrendingDown size={11} /> Deductions
                    </h4>
                    <div className="space-y-1">
                        {[
                            ['PAYE Tax', record.paye],
                            ['NHIF', record.nhif],
                            ['NSSF', record.nssf],
                            ['Housing Levy (1.5%)', record.housing_levy],
                            ['Loans', record.loan_deductions],
                            ['Advances', record.advance_deductions],
                            ['SACCO', record.sacco_deductions],
                            ['Other', record.other_deductions],
                        ].map(([l, v]) => (
                            <div key={l as string} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                                <span className="text-gray-600">{l}</span>
                                <span className="font-semibold text-red-600">-{fmt(Number(v))}</span>
                            </div>
                        ))}
                        <div className="flex justify-between py-2 bg-red-50 px-3 rounded-xl mt-2">
                            <span className="text-xs font-black text-red-800 uppercase">Total Deductions</span>
                            <span className="font-black text-red-600">-{fmt(record.total_deductions)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white text-center">
                <p className="text-xs opacity-70 font-semibold uppercase tracking-widest">Net Pay (Take Home)</p>
                <p className="text-4xl font-black mt-1 tracking-tight">{fmt(record.net_pay)}</p>
                <p className="text-xs opacity-60 mt-2">Payment: {record.payment_method || 'Bank Transfer'}</p>
            </div>

            {/* Print Button */}
            <button onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-bold text-sm transition-all">
                <FiPrinter size={16} /> Print / Download Payslip
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL FORM (Add / Edit)
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

    // Auto-fill advance deduction from active advances
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
            staff_type: s._type,
            month, year,
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

    const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all";

    return (
        <div className="space-y-5">
            {/* Staff + Period */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Staff Member *</label>
                    <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className={inp}>
                        <option value="">— Select Staff —</option>
                        {staff.filter(s => s.status === 'Active').map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s._type}) — Basic: {fmt(s.basic_salary)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Month</label>
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inp}>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Year</label>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className={inp}>
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Basic Salary</label>
                    <input type="text" value={fmt(basicSalary)} disabled className={inp + ' bg-slate-100 text-slate-500'} />
                </div>
            </div>

            {/* Allowances */}
            <div>
                <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FiTrendingUp size={12} /> Allowances
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        ['House Allowance', houseAllow, setHouseAllow],
                        ['Transport Allowance', transportAllow, setTransportAllow],
                        ['Medical Allowance', medicalAllow, setMedicalAllow],
                        ['Other Allowances', otherAllow, setOtherAllow],
                    ].map(([l, v, set]) => (
                        <div key={l as string}>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{l as string}</label>
                            <input type="number" min="0" value={v as number}
                                onChange={e => (set as any)(Number(e.target.value))} className={inp} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Deductions */}
            <div>
                <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FiTrendingDown size={12} /> Extra Deductions
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        ['Loan Deductions', loanDeduct, setLoanDeduct],
                        ['Advance Deductions', advanceDeduct, setAdvanceDeduct],
                        ['SACCO Contributions', saccoDeduct, setSaccoDeduct],
                        ['Other Deductions', otherDeduct, setOtherDeduct],
                    ].map(([l, v, set]) => (
                        <div key={l as string}>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{l as string}</label>
                            <input type="number" min="0" value={v as number}
                                onChange={e => (set as any)(Number(e.target.value))} className={inp} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Tax Preview */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-3">🧮 Live KRA Tax Computation</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                        ['Gross Pay', fmt(calc.grossPay), 'text-emerald-400'],
                        ['Taxable Income', fmt(calc.taxable), 'text-blue-300'],
                        ['PAYE Tax', fmt(calc.paye), 'text-red-400'],
                        ['NHIF', fmt(calc.nhif), 'text-red-400'],
                        ['NSSF', fmt(calc.nssf), 'text-red-400'],
                        ['Housing Levy (1.5%)', fmt(calc.housingLevy), 'text-red-400'],
                        ['Total Deductions', fmt(calc.totalDeductions), 'text-orange-400'],
                    ].map(([l, v, c]) => (
                        <div key={l as string} className="flex justify-between">
                            <span className="opacity-70">{l}</span>
                            <span className={`font-bold ${c}`}>{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm opacity-70 font-semibold">NET PAY</span>
                    <span className="text-2xl font-black text-emerald-400">{fmt(calc.netPay)}</span>
                </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Payment Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inp}>
                        {['Bank Transfer', 'M-Pesa', 'Cash', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Payment Reference</label>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TXN12345" className={inp} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Any notes for this payroll entry..." className={inp + ' resize-none'} />
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiCheck size={15} /> Save Payroll</>}
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
            amount, reason, monthly_deduction: monthly,
            balance: amount, status: 'Pending',
        });
        setSaving(false);
    };

    const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all";

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-semibold">
                ⚠️ Salary advances will be automatically deducted from monthly payroll when approved and set to Active.
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Staff Member *</label>
                <select value={staffId} onChange={e => setStaffId(e.target.value)} className={inp}>
                    <option value="">— Select Staff —</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — Basic: {fmt(s.basic_salary)}</option>
                    ))}
                </select>
            </div>
            {selectedStaff && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs">
                    <p className="text-gray-500">Basic Salary: <strong className="text-gray-800">{fmt(selectedStaff.basic_salary)}</strong></p>
                    <p className="text-gray-500 mt-1">Recommended max advance: <strong className="text-gray-800">{fmt(selectedStaff.basic_salary * 3)}</strong> (3 months)</p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Advance Amount (KES) *</label>
                    <input type="number" min="0" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className={inp} placeholder="0" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Monthly Deduction (KES) *</label>
                    <input type="number" min="0" value={monthly || ''} onChange={e => setMonthly(Number(e.target.value))} className={inp} placeholder="0" />
                </div>
            </div>
            {months > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 font-semibold flex justify-between">
                    <span>Repayment Period:</span>
                    <span className="font-black">{months} months</span>
                </div>
            )}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Reason / Purpose *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="Reason for salary advance..." />
            </div>
            <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiCheck size={15} /> Submit Advance</>}
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
    const [houseRate, setHouseRate] = useState(15); // % of basic
    const [transportFlat, setTransportFlat] = useState(3000);
    const [medicalFlat, setMedicalFlat] = useState(0);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);

    const activeStaff = staff.filter(s => s.status === 'Active');
    const preview = activeStaff.map(s => {
        const house = Math.round(s.basic_salary * houseRate / 100);
        const advance = advances.find(a => a.staff_id === s.id && a.status === 'Active');
        const calc = computePayroll(s.basic_salary, house, transportFlat, medicalFlat, 0, 0, advance?.monthly_deduction ?? 0, 0, 0);
        return { ...s, calc };
    });
    const totalGross = preview.reduce((s, p) => s + p.calc.grossPay, 0);
    const totalNet = preview.reduce((s, p) => s + p.calc.netPay, 0);
    const totalPAYE = preview.reduce((s, p) => s + p.calc.paye, 0);

    const handleRun = async () => {
        setRunning(true);
        for (let i = 0; i < preview.length; i++) {
            const s = preview[i];
            const house = Math.round(s.basic_salary * houseRate / 100);
            const advance = advances.find(a => a.staff_id === s.id && a.status === 'Active');
            const calc = computePayroll(s.basic_salary, house, transportFlat, medicalFlat, 0, 0, advance?.monthly_deduction ?? 0, 0, 0);
            await supabase.from('school_payroll').upsert({
                staff_id: s.id,
                staff_name: `${s.first_name} ${s.last_name}`,
                staff_type: s._type,
                month, year,
                pay_period: `${MONTHS[month - 1]} ${year}`,
                basic_salary: s.basic_salary,
                house_allowance: house, transport_allowance: transportFlat,
                medical_allowance: medicalFlat, other_allowances: 0,
                paye: calc.paye, nhif: calc.nhif, nssf: calc.nssf, housing_levy: calc.housingLevy,
                loan_deductions: 0, advance_deductions: advance?.monthly_deduction ?? 0,
                sacco_deductions: 0, other_deductions: 0,
                gross_pay: calc.grossPay, total_deductions: calc.totalDeductions, net_pay: calc.netPay,
                status: 'Pending',
            }, { onConflict: 'staff_id,month,year' });
            setProgress(Math.round(((i + 1) / preview.length) * 100));
            await new Promise(r => setTimeout(r, 80));
        }
        setDone(true); setRunning(false); onComplete();
    };

    const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all";

    return (
        <div className="space-y-5">
            {done ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Payroll Processed!</h3>
                    <p className="text-gray-500 text-sm mt-2">{preview.length} staff members processed for {MONTHS[month - 1]} {year}</p>
                    <button onClick={onClose} className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">Done</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Month</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inp}>
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Year</label>
                            <select value={year} onChange={e => setYear(Number(e.target.value))} className={inp}>
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">House Allow %</label>
                            <input type="number" min="0" max="100" value={houseRate} onChange={e => setHouseRate(Number(e.target.value))} className={inp} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Transport (KES flat)</label>
                            <input type="number" min="0" value={transportFlat} onChange={e => setTransportFlat(Number(e.target.value))} className={inp} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Medical (KES flat)</label>
                            <input type="number" min="0" value={medicalFlat} onChange={e => setMedicalFlat(Number(e.target.value))} className={inp} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            ['Total Staff', `${activeStaff.length}`, '#6366f1'],
                            ['Total Gross', fmt(totalGross), '#059669'],
                            ['Total Net', fmt(totalNet), '#0284c7'],
                            ['Total PAYE', fmt(totalPAYE), '#dc2626'],
                        ].map(([l, v, c]) => (
                            <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase">{l}</p>
                                <p className="text-base font-black mt-1" style={{ color: c }}>{v}</p>
                            </div>
                        ))}
                    </div>

                    {/* Preview table */}
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {['Name', 'Type', 'Basic', 'Gross', 'PAYE', 'Net'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left font-black text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map(s => (
                                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                        <td className="px-3 py-2 text-gray-500">{s._type}</td>
                                        <td className="px-3 py-2">{fmt(s.basic_salary)}</td>
                                        <td className="px-3 py-2 text-emerald-700 font-bold">{fmt(s.calc.grossPay)}</td>
                                        <td className="px-3 py-2 text-red-600 font-bold">{fmt(s.calc.paye)}</td>
                                        <td className="px-3 py-2 text-blue-700 font-black">{fmt(s.calc.netPay)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {running && (
                        <div>
                            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                <span>Processing payroll...</span><span>{progress}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                        <button onClick={handleRun} disabled={running}
                            className="flex-2 flex-grow py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {running ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing {progress}%...</> : <><FiZap size={15} /> Run Bulk Payroll for {activeStaff.length} Staff</>}
                        </button>
                    </div>
                </>
            )}
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
    const [monthFilter, setMonthFilter] = useState<number>(0); // 0 = all
    const [yearFilter, setYearFilter] = useState<number>(now.getFullYear());
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [viewRecord, setViewRecord] = useState<PayrollRecord | null>(null);
    const [editRecord, setEditRecord] = useState<PayrollRecord | null | undefined>(null);
    const [showAddPayroll, setShowAddPayroll] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showAdvanceForm, setShowAdvanceForm] = useState(false);

    // ─── Fetch ───────────────────────────────────────────────────────────────
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
            setStaff(allStaff);
            setPayrolls(payrollRes.data || []);
            setAdvances(advRes.data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Stats ───────────────────────────────────────────────────────────────
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

    // ─── Filtered Payrolls ───────────────────────────────────────────────────
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

    // ─── Bulk actions ─────────────────────────────────────────────────────────
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
        if (editRecord) {
            await supabase.from('school_payroll').update(data).eq('id', editRecord.id);
        } else {
            await supabase.from('school_payroll').insert(data);
        }
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
        const s = new Set(selected);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelected(s);
    };
    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // ─── Export CSV ─────────────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Name', 'Type', 'Period', 'Basic', 'House Allow', 'Transport', 'Medical', 'Other Allow',
                'Gross Pay', 'PAYE', 'NHIF', 'NSSF', 'Housing Levy', 'Loans', 'Advances', 'SACCO', 'Other Deductions',
                'Total Deductions', 'Net Pay', 'Status', 'Payment Method', 'Reference'],
            ...filteredPayrolls.map(p => [
                p.staff_name, p.staff_type, p.pay_period,
                p.basic_salary, p.house_allowance, p.transport_allowance, p.medical_allowance, p.other_allowances,
                p.gross_pay, p.paye, p.nhif, p.nssf, p.housing_levy,
                p.loan_deductions, p.advance_deductions, p.sacco_deductions, p.other_deductions,
                p.total_deductions, p.net_pay, p.status, p.payment_method, p.payment_ref,
            ]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `payroll_${MONTHS[now.getMonth()]}_${now.getFullYear()}.csv`;
        a.click();
    };

    // ─── Analytics Data ────────────────────────────────────────────────────
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

    const statusColors: Record<string, string> = {
        Draft: '#94a3b8', Pending: '#f59e0b', Approved: '#3b82f6', Paid: '#22c55e', Rejected: '#ef4444'
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                    <FiDollarSign className="absolute inset-0 m-auto text-indigo-500" size={20} />
                </div>
                <p className="text-gray-500 font-semibold text-sm">Loading Payroll System...</p>
                <p className="text-gray-400 text-xs mt-1">Kenya Tax Calculator Active</p>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                @keyframes modal { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: none; } }
                .animate-modal { animation: modal 0.2s ease-out; }
                .sort-btn { cursor: pointer; user-select: none; }
                .sort-btn:hover { color: #4f46e5; }
                .row-select:checked + td { background: #eff6ff; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: #f8fafc; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
            `}</style>

            <div className="space-y-5 pb-10">
                {/* ── Top Header ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                                <FiDollarSign className="text-white" size={18} />
                            </span>
                            Payroll Management
                        </h1>
                        <p className="text-xs text-gray-400 font-semibold mt-1 ml-11">Kenya Tax Calculator · PAYE · NHIF · NSSF · Housing Levy · Advances</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => fetchAll()} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-all">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-all">
                            <FiDownload size={13} /> Export CSV
                        </button>
                        <button onClick={() => setShowAdvanceForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all">
                            <FiCreditCard size={13} /> Salary Advance
                        </button>
                        <button onClick={() => setShowBulk(true)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all">
                            <FiZap size={13} /> Bulk Run
                        </button>
                        <button onClick={() => { setEditRecord(undefined); setShowAddPayroll(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-200">
                            <FiPlus size={13} /> Add Payroll
                        </button>
                    </div>
                </div>

                {/* ── Stat Cards ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Records" value={String(payrolls.length)} icon={FiFileText} color="#6366f1" sub={`${stats.paid} Paid · ${stats.pending} Pending`} />
                    <StatCard label="Total Gross Pay" value={fmt(stats.totalGross)} icon={FiTrendingUp} color="#059669" trend="up" />
                    <StatCard label="Total Net Pay" value={fmt(stats.totalNet)} icon={FiDollarSign} color="#0284c7" />
                    <StatCard label="Total PAYE (KRA)" value={fmt(stats.totalPAYE)} icon={FiShield} color="#dc2626" sub={`NHIF: ${fmt(stats.totalNHIF)}`} />
                    <StatCard label="Active Advances" value={fmt(stats.totalAdvanceBalance)} icon={FiCreditCard} color="#f59e0b" sub={`${stats.pendingAdvances} pending approval`} />
                    <StatCard label="Active Staff" value={String(staff.filter(s => s.status === 'Active').length)} icon={FiUsers} color="#8b5cf6" />
                </div>

                {/* ── Tabs ─────────────────────────────────────────────────────── */}
                <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
                    {([['payroll', FiFileText, 'Payroll Records'], ['advances', FiCreditCard, 'Salary Advances'], ['analytics', FiBarChart2, 'Analytics']] as const).map(([t, Icon, label]) => (
                        <button key={t} onClick={() => setTab(t as Tab)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${tab === t ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {tab === 'payroll' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 min-w-44">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff, period..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                {['All', 'Draft', 'Pending', 'Approved', 'Paid', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                            </select>
                            <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                <option value={0}>All Months</option>
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                            <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="text-xs text-gray-400 font-semibold ml-auto">
                                {filteredPayrolls.length} of {payrolls.length} records
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selected.size > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center gap-3">
                                <span className="text-xs font-black text-indigo-700">{selected.size} selected</span>
                                <button onClick={() => handleBulkStatus('Approved')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">Approve All</button>
                                <button onClick={() => handleBulkStatus('Paid')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all">Mark Paid</button>
                                <button onClick={() => handleBulkStatus('Rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all">Reject</button>
                                <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Clear</button>
                            </div>
                        )}

                        {/* Data Grid */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="w-8 px-3 py-3">
                                                <input type="checkbox"
                                                    checked={selected.size === filteredPayrolls.length && filteredPayrolls.length > 0}
                                                    onChange={e => setSelected(e.target.checked ? new Set(filteredPayrolls.map(p => p.id)) : new Set())}
                                                    className="rounded" />
                                            </th>
                                            {[
                                                ['staff_name', 'Staff Name'], ['staff_type', 'Type'],
                                                ['pay_period', 'Period'], ['basic_salary', 'Basic'],
                                                ['gross_pay', 'Gross'], ['paye', 'PAYE'],
                                                ['nhif', 'NHIF'], ['total_deductions', 'Total Deductions'],
                                                ['net_pay', 'Net Pay'], ['status', 'Status'],
                                            ].map(([field, label]) => (
                                                <th key={field} onClick={() => handleSort(field)}
                                                    className="sort-btn px-3 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    <span className="flex items-center gap-1">
                                                        {label}
                                                        {sortField === field ? (sortDir === 'asc' ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />) : null}
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="px-3 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayrolls.length === 0 ? (
                                            <tr><td colSpan={12} className="text-center py-16 text-gray-400">
                                                <FiFileText size={32} className="mx-auto mb-3 opacity-30" />
                                                <p className="font-semibold">No payroll records found</p>
                                                <p className="text-xs mt-1">Use <strong>Bulk Run</strong> or <strong>Add Payroll</strong> to get started</p>
                                            </td></tr>
                                        ) : filteredPayrolls.map((p, i) => (
                                            <tr key={p.id} className={`border-t border-gray-50 hover:bg-indigo-50/30 transition-colors ${selected.has(p.id) ? 'bg-indigo-50' : i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                                <td className="px-3 py-3">
                                                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                                            {p.staff_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                        </div>
                                                        <span className="font-semibold text-gray-800 whitespace-nowrap">{p.staff_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.staff_type === 'TSC Teacher' ? 'bg-indigo-100 text-indigo-700' :
                                                        p.staff_type === 'Support Teacher' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>{p.staff_type}</span>
                                                </td>
                                                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.pay_period}</td>
                                                <td className="px-3 py-3 text-gray-700 font-semibold">{fmt(p.basic_salary)}</td>
                                                <td className="px-3 py-3 text-emerald-700 font-bold">{fmt(p.gross_pay)}</td>
                                                <td className="px-3 py-3 text-red-600 font-semibold">{fmt(p.paye)}</td>
                                                <td className="px-3 py-3 text-orange-600 font-semibold">{fmt(p.nhif)}</td>
                                                <td className="px-3 py-3 text-red-700 font-bold">{fmt(p.total_deductions)}</td>
                                                <td className="px-3 py-3 text-blue-700 font-black">{fmt(p.net_pay)}</td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        p.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                                            p.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                                p.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>{p.status}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setViewRecord(p)} title="View Payslip"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-all">
                                                            <FiEye size={13} />
                                                        </button>
                                                        <button onClick={() => { setEditRecord(p); setShowAddPayroll(true); }} title="Edit"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all">
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                        {p.status === 'Pending' && (
                                                            <button onClick={async () => { await supabase.from('school_payroll').update({ status: 'Approved' }).eq('id', p.id); fetchAll(); }} title="Approve"
                                                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500 transition-all">
                                                                <FiCheck size={13} />
                                                            </button>
                                                        )}
                                                        {p.status === 'Approved' && (
                                                            <button onClick={async () => { await supabase.from('school_payroll').update({ status: 'Paid' }).eq('id', p.id); fetchAll(); }} title="Mark Paid"
                                                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-500 transition-all">
                                                                <FiCheckCircle size={13} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(p.id)} title="Delete"
                                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer summary */}
                            {filteredPayrolls.length > 0 && (
                                <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex flex-wrap gap-6 text-xs font-bold text-gray-600">
                                    <span>Showing {filteredPayrolls.length} records</span>
                                    <span>Gross: <strong className="text-emerald-700">{fmt(filteredPayrolls.reduce((s, p) => s + p.gross_pay, 0))}</strong></span>
                                    <span>PAYE: <strong className="text-red-600">{fmt(filteredPayrolls.reduce((s, p) => s + p.paye, 0))}</strong></span>
                                    <span>NHIF: <strong className="text-orange-600">{fmt(filteredPayrolls.reduce((s, p) => s + p.nhif, 0))}</strong></span>
                                    <span>Net: <strong className="text-blue-700">{fmt(filteredPayrolls.reduce((s, p) => s + p.net_pay, 0))}</strong></span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════ */}
                {tab === 'advances' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black text-gray-700">Salary Advances Register</h2>
                            <button onClick={() => setShowAdvanceForm(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all">
                                <FiPlus size={13} /> New Advance
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                ['Pending', advances.filter(a => a.status === 'Pending').length, '#f59e0b'],
                                ['Active', advances.filter(a => a.status === 'Active').length, '#3b82f6'],
                                ['Cleared', advances.filter(a => a.status === 'Cleared').length, '#22c55e'],
                            ].map(([l, v, c]) => (
                                <div key={l as string} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                                    <p className="text-2xl font-black" style={{ color: c as string }}>{v as number}</p>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">{l}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Staff Member', 'Amount', 'Monthly Deduction', 'Balance', 'Reason', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advances.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                                                <FiCreditCard size={28} className="mx-auto mb-2 opacity-30" />
                                                <p className="font-semibold">No salary advances yet</p>
                                            </td></tr>
                                        ) : advances.map(a => (
                                            <tr key={a.id} className="border-t border-gray-50 hover:bg-amber-50/20 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-gray-800">{a.staff_name}</td>
                                                <td className="px-4 py-3 font-bold text-gray-700">{fmt(a.amount)}</td>
                                                <td className="px-4 py-3 text-red-600 font-semibold">{fmt(a.monthly_deduction)}/mo</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(a.balance / a.amount) * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{fmt(a.balance)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate">{a.reason}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${a.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                                                        a.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                            a.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                        }`}>{a.status}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {a.status === 'Pending' && <>
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Active')}
                                                                className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">Approve</button>
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Rejected')}
                                                                className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all">Reject</button>
                                                        </>}
                                                        {a.status === 'Active' && (
                                                            <button onClick={() => handleAdvanceAction(a.id, 'Cleared')}
                                                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all">Mark Cleared</button>
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
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <FiBarChart2 size={12} /> Monthly Net Pay Trend (Paid)
                                </h3>
                                <Bar data={{
                                    labels: Object.keys(analyticsData.monthly),
                                    datasets: [{ label: 'Net Pay', data: Object.values(analyticsData.monthly), backgroundColor: '#6366f120', borderColor: '#6366f1', borderWidth: 2, borderRadius: 8 }]
                                }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => fmt(v) } } } }} />
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <FiPieChart size={12} /> Net Pay by Staff Type
                                </h3>
                                <Doughnut data={{
                                    labels: Object.keys(analyticsData.byType),
                                    datasets: [{ data: Object.values(analyticsData.byType), backgroundColor: ['#6366f1', '#8b5cf6', '#f59e0b'], borderWidth: 0 }]
                                }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <FiActivity size={12} /> Records by Status
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(analyticsData.byStatus).map(([status, count]) => (
                                        <div key={status} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-600 w-20 flex-shrink-0">{status}</span>
                                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{
                                                    width: `${(count / payrolls.length) * 100}%`,
                                                    background: statusColors[status] || '#94a3b8'
                                                }} />
                                            </div>
                                            <span className="text-xs font-black text-gray-700 w-8 text-right">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* KRA Tax Summary */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                                <h3 className="text-xs font-black opacity-60 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <FiShield size={12} /> KRA / Statutory Summary (All Records)
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        ['PAYE Tax (KRA)', payrolls.reduce((s, p) => s + p.paye, 0), '#f87171'],
                                        ['NHIF Contributions', payrolls.reduce((s, p) => s + p.nhif, 0), '#fb923c'],
                                        ['NSSF Contributions', payrolls.reduce((s, p) => s + p.nssf, 0), '#facc15'],
                                        ['Housing Levy', payrolls.reduce((s, p) => s + p.housing_levy, 0), '#a78bfa'],
                                        ['Total Statutory', payrolls.reduce((s, p) => s + p.paye + p.nhif + p.nssf + p.housing_levy, 0), '#34d399'],
                                    ].map(([l, v, c]) => (
                                        <div key={l as string} className="flex justify-between items-center">
                                            <span className="text-sm opacity-70">{l}</span>
                                            <span className="font-black text-lg" style={{ color: c as string }}>{fmt(v as number)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────────── */}
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

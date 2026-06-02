'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiDownload, FiPrinter, FiRefreshCw, FiUser,
    FiCalendar, FiDollarSign, FiFilter, FiSend, FiChevronLeft,
    FiCheckCircle, FiSettings, FiX
} from 'react-icons/fi';
import Link from 'next/link';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const KRA_TAX_RATE = (gross: number): number => {
    // Kenya PAYE 2024/25 bands (monthly)
    if (gross <= 24000) return 0;
    if (gross <= 32333) return (gross - 24000) * 0.25;
    if (gross <= 500000) return (32333 - 24000) * 0.25 + (gross - 32333) * 0.30;
    return (32333 - 24000) * 0.25 + (500000 - 32333) * 0.30 + (gross - 500000) * 0.35;
};
const NHIF_TABLE = (gross: number): number => {
    if (gross < 6000) return 150;
    if (gross < 8000) return 300;
    if (gross < 12000) return 400;
    if (gross < 15000) return 600;
    if (gross < 20000) return 750;
    if (gross < 25000) return 850;
    if (gross < 30000) return 900;
    if (gross < 35000) return 950;
    if (gross < 40000) return 1000;
    if (gross < 45000) return 1100;
    if (gross < 50000) return 1200;
    if (gross < 60000) return 1300;
    if (gross < 70000) return 1400;
    if (gross < 80000) return 1500;
    if (gross < 90000) return 1600;
    if (gross < 100000) return 1700;
    return 1700;
};
const NSSF = (gross: number): number => Math.min(gross * 0.06, 2160); // Tier I + II capped at 2160

export default function SalarySlipPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>({});
    const [search, setSearch] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [filterType, setFilterType] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    // Salary overrides per employee
    const [salaryOverrides, setSalaryOverrides] = useState<Record<number, {
        basic: number; house: number; transport: number; medical: number;
        responsibility: number; other_allowance: number; other_allowance_name: string;
        loans: number; salary_advance: number; other_deduction: number; other_deduction_name: string;
    }>>({});

    const [showConfig, setShowConfig] = useState(false);
    const [configDraft, setConfigDraft] = useState<any>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        const [staffRes, sdRes] = await Promise.all([
            supabase.from('school_teachers')
                .select('id,first_name,last_name,middle_name,staff_type,designation,department,bank_name,bank_account,kra_pin,nhif_no,nssf_no,tsc_number,employment_type,status')
                .eq('status', 'Active').order('first_name'),
            supabase.from('school_details').select('*').single(),
        ]);
        setStaff(staffRes.data || []);
        setSchoolDetails(sdRes.data || {});

        // Try load saved salary data from school_salary_details
        try {
            const { data: salaryData } = await supabase.from('school_salary_details').select('*');
            if (salaryData) {
                const overrides: Record<number, any> = {};
                salaryData.forEach((s: any) => { overrides[s.teacher_id] = s; });
                setSalaryOverrides(overrides);
            }
        } catch { /* Table may not exist yet */ }

        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredStaff = staff.filter(s => {
        if (filterType && s.staff_type !== filterType) return false;
        const q = search.toLowerCase();
        return !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            (s.tsc_number || '').toLowerCase().includes(q);
    });

    const getOverrides = (staffId: number) => salaryOverrides[staffId] || {
        basic: 30000, house: 10000, transport: 5000, medical: 3000,
        responsibility: 0, other_allowance: 0, other_allowance_name: 'Allowance',
        loans: 0, salary_advance: 0, other_deduction: 0, other_deduction_name: 'Deduction',
    };

    const computeSlip = (s: any) => {
        const ov = getOverrides(s.id);
        const basic = Number(ov.basic) || 0;
        const house = Number(ov.house) || 0;
        const transport = Number(ov.transport) || 0;
        const medical = Number(ov.medical) || 0;
        const responsibility = Number(ov.responsibility) || 0;
        const otherAllow = Number(ov.other_allowance) || 0;
        const grossPay = basic + house + transport + medical + responsibility + otherAllow;
        const paye = Math.max(0, Math.round(KRA_TAX_RATE(grossPay) - 2400)); // minus personal relief KES 2400/month
        const nhif = NHIF_TABLE(grossPay);
        const nssf = Math.round(NSSF(grossPay));
        const loans = Number(ov.loans) || 0;
        const advance = Number(ov.salary_advance) || 0;
        const otherDed = Number(ov.other_deduction) || 0;
        const totalDeductions = paye + nhif + nssf + loans + advance + otherDed;
        const netPay = grossPay - totalDeductions;
        return { basic, house, transport, medical, responsibility, otherAllow, grossPay, paye, nhif, nssf, loans, advance, otherDed, totalDeductions, netPay };
    };

    const saveConfig = async () => {
        if (!selectedStaff) return;
        const payload = { teacher_id: selectedStaff.id, ...configDraft, updated_at: new Date().toISOString() };
        try {
            const { error } = await supabase.from('school_salary_details')
                .upsert(payload, { onConflict: 'teacher_id' });
            if (error) throw error;
            setSalaryOverrides(prev => ({ ...prev, [selectedStaff.id]: configDraft }));
            setShowConfig(false);
            toast.success('Salary details saved!');
        } catch {
            // Table may not exist — save to local state only
            setSalaryOverrides(prev => ({ ...prev, [selectedStaff.id]: configDraft }));
            setShowConfig(false);
            toast.success('Salary saved locally (table not found in DB)');
        }
    };

    const printSlip = async () => {
        if (!printRef.current) return;
        setPrinting(true);
        try {
            const win = window.open('', '_blank', 'width=900,height=700');
            if (!win) { toast.error('Allow popups to print'); setPrinting(false); return; }
            win.document.write(`
                <!DOCTYPE html><html><head>
                <title>Salary Slip</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Inter',sans-serif; background:#fff; color:#1e293b; }
                    ${document.querySelector('style')?.textContent || ''}
                </style>
                </head><body>
                ${printRef.current.innerHTML}
                <script>window.onload=()=>{window.print();window.close();}<\/script>
                </body></html>
            `);
            win.document.close();
        } catch (e) { toast.error('Print failed'); }
        setPrinting(false);
    };

    const slip = selectedStaff ? computeSlip(selectedStaff) : null;
    const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            {/* Header */}
            <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #6366f1 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Link href="/dashboard/staff" className="text-white/60 hover:text-white text-xs flex items-center gap-1">
                                <FiChevronLeft size={12} /> Staff
                            </Link>
                        </div>
                        <h1 className="text-2xl font-black flex items-center gap-3">💰 Salary Slip Generator</h1>
                        <p className="text-blue-200 text-sm mt-1">Generate professional payslips with PAYE, NHIF, NSSF computed automatically</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Active Staff', val: staff.length },
                            { label: 'Teaching', val: staff.filter(s => s.staff_type === 'Teaching').length },
                            { label: 'Non-Teaching', val: staff.filter(s => s.staff_type !== 'Teaching').length },
                        ].map(s => (
                            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center">
                                <p className="text-2xl font-black">{s.val}</p>
                                <p className="text-blue-200 text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100 space-y-3">
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <FiSearch size={13} className="text-gray-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search staff..." className="text-sm outline-none bg-transparent flex-1" />
                            </div>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="text-xs border border-gray-200 rounded-xl px-2 py-2 outline-none">
                                <option value="">All</option>
                                <option value="Teaching">Teaching</option>
                                <option value="Non-Teaching">Non-Teaching</option>
                                <option value="Subordinate">Subordinate</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 outline-none">
                                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <select value={year} onChange={e => setYear(Number(e.target.value))}
                                    className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 outline-none">
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-[500px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : filteredStaff.map(s => {
                            const slipData = computeSlip(s);
                            return (
                                <button key={s.id} onClick={() => setSelectedStaff(s)}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-all ${selectedStaff?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                                    <div className="w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#6366f1)' }}>
                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-xs text-gray-400">{s.designation || s.staff_type} · {s.department || 'General'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-black text-emerald-600">{fmt(slipData.netPay)}</p>
                                        <p className="text-[9px] text-gray-400">net pay</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500 text-center">
                            Total payroll: <span className="font-black text-blue-700">
                                {fmt(filteredStaff.reduce((sum, s) => sum + computeSlip(s).netPay, 0))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payslip Preview */}
                <div className="lg:col-span-2">
                    {!selectedStaff ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="text-5xl mb-4">💼</div>
                                <p className="font-bold text-gray-700">Select a staff member</p>
                                <p className="text-sm text-gray-400 mt-1">Click any name on the left to preview their salary slip</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Action Bar */}
                            <div className="flex gap-3 flex-wrap">
                                <button onClick={() => { setConfigDraft({ ...getOverrides(selectedStaff.id) }); setShowConfig(true); }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
                                    <FiSettings size={14} /> Edit Salary
                                </button>
                                <button onClick={printSlip} disabled={printing}
                                    className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#6366f1)' }}>
                                    <FiPrinter size={14} /> {printing ? 'Generating...' : 'Print / Save PDF'}
                                </button>
                            </div>

                            {/* Payslip Document */}
                            <div ref={printRef} style={{ fontFamily: 'Inter, sans-serif' }}
                                className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl overflow-hidden">
                                {/* Header Band */}
                                <div className="text-white p-6" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h1 className="text-xl font-black uppercase tracking-wider">{schoolDetails.school_name || 'APSIMS SCHOOL'}</h1>
                                            <p className="text-blue-200 text-xs mt-0.5">{schoolDetails.postal_address || ''} {schoolDetails.county ? `· ${schoolDetails.county}` : ''}</p>
                                            <p className="text-blue-200 text-xs">{schoolDetails.phone1 || ''} {schoolDetails.email ? `· ${schoolDetails.email}` : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
                                                <p className="text-sm font-black">SALARY SLIP</p>
                                                <p className="text-blue-200 text-xs mt-0.5">{MONTHS[month]} {year}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Info Grid */}
                                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-gray-100 bg-gray-50">
                                    {[
                                        { label: 'Employee Name', val: `${selectedStaff.first_name} ${selectedStaff.middle_name || ''} ${selectedStaff.last_name}`.trim() },
                                        { label: 'Staff Type', val: selectedStaff.staff_type },
                                        { label: 'Designation', val: selectedStaff.designation || '—' },
                                        { label: 'Department', val: selectedStaff.department || '—' },
                                        { label: 'TSC No.', val: selectedStaff.tsc_number || '—' },
                                        { label: 'KRA PIN', val: selectedStaff.kra_pin || '—' },
                                        { label: 'NHIF No.', val: selectedStaff.nhif_no || '—' },
                                        { label: 'NSSF No.', val: selectedStaff.nssf_no || '—' },
                                        { label: 'Pay Period', val: `${MONTHS[month]} ${year}` },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</p>
                                            <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{f.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Earnings + Deductions Side by Side */}
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Earnings */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                                            <h3 className="font-black text-gray-800 text-sm">EARNINGS</h3>
                                        </div>
                                        <div className="space-y-0">
                                            {[
                                                { label: 'Basic Salary', val: slip!.basic },
                                                { label: 'House Allowance', val: slip!.house },
                                                { label: 'Transport Allowance', val: slip!.transport },
                                                { label: 'Medical Allowance', val: slip!.medical },
                                                ...(slip!.responsibility > 0 ? [{ label: 'Responsibility Allowance', val: slip!.responsibility }] : []),
                                                ...(slip!.otherAllow > 0 ? [{ label: getOverrides(selectedStaff.id).other_allowance_name || 'Other Allowance', val: slip!.otherAllow }] : []),
                                            ].map((e, i) => (
                                                <div key={i} className={`flex justify-between py-2 text-sm ${i % 2 === 0 ? 'bg-gray-50 px-2 rounded' : 'px-2'}`}>
                                                    <span className="text-gray-600">{e.label}</span>
                                                    <span className="font-semibold text-gray-900">{fmt(e.val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t-2 border-emerald-500 flex justify-between">
                                            <span className="font-black text-gray-800">GROSS PAY</span>
                                            <span className="font-black text-emerald-600 text-base">{fmt(slip!.grossPay)}</span>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1 h-5 bg-red-500 rounded-full" />
                                            <h3 className="font-black text-gray-800 text-sm">DEDUCTIONS</h3>
                                        </div>
                                        <div className="space-y-0">
                                            {[
                                                { label: 'PAYE (Income Tax)', val: slip!.paye },
                                                { label: 'NHIF (SHA)', val: slip!.nhif },
                                                { label: 'NSSF', val: slip!.nssf },
                                                ...(slip!.loans > 0 ? [{ label: 'Loan Repayment', val: slip!.loans }] : []),
                                                ...(slip!.advance > 0 ? [{ label: 'Salary Advance', val: slip!.advance }] : []),
                                                ...(slip!.otherDed > 0 ? [{ label: getOverrides(selectedStaff.id).other_deduction_name || 'Other Deduction', val: slip!.otherDed }] : []),
                                            ].map((d, i) => (
                                                <div key={i} className={`flex justify-between py-2 text-sm ${i % 2 === 0 ? 'bg-gray-50 px-2 rounded' : 'px-2'}`}>
                                                    <span className="text-gray-600">{d.label}</span>
                                                    <span className="font-semibold text-red-700">{fmt(d.val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t-2 border-red-500 flex justify-between">
                                            <span className="font-black text-gray-800">TOTAL DEDUCTIONS</span>
                                            <span className="font-black text-red-600 text-base">{fmt(slip!.totalDeductions)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay Banner */}
                                <div className="mx-5 mb-5 rounded-2xl p-4 text-white flex items-center justify-between"
                                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#6366f1)' }}>
                                    <div>
                                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">NET PAY (Take Home)</p>
                                        <p className="text-xs text-blue-300 mt-0.5">Gross: {fmt(slip!.grossPay)} − Deductions: {fmt(slip!.totalDeductions)}</p>
                                    </div>
                                    <p className="text-3xl font-black">{fmt(slip!.netPay)}</p>
                                </div>

                                {/* Bank Details */}
                                {selectedStaff.bank_name && (
                                    <div className="mx-5 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-xs font-bold text-blue-800">💳 Bank Transfer Details</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            {selectedStaff.bank_name} · Account: {selectedStaff.bank_account || '—'}
                                        </p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mx-5 mb-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-6">Employee Signature & Date</p>
                                        <div className="border-t border-gray-300 pt-1">
                                            <p className="text-[10px] text-gray-500 font-semibold">{selectedStaff.first_name} {selectedStaff.last_name}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-6">Authorised Signatory</p>
                                        <div className="border-t border-gray-300 pt-1">
                                            <p className="text-[10px] text-gray-500 font-semibold">{schoolDetails.principal_name || 'Principal'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 text-center">
                                    <p className="text-[9px] text-gray-400">
                                        This is a computer-generated payslip and does not require a signature. · {schoolDetails.school_name} · Powered by APSIMS
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Salary Modal */}
            {showConfig && selectedStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfig(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <div>
                                <h2 className="font-bold text-gray-900">💰 Salary Configuration</h2>
                                <p className="text-xs text-gray-400">{selectedStaff.first_name} {selectedStaff.last_name}</p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                <FiX size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Earnings */}
                            <div>
                                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1"><FiCheckCircle size={12} /> Earnings</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'basic', label: 'Basic Salary' },
                                        { key: 'house', label: 'House Allowance' },
                                        { key: 'transport', label: 'Transport Allowance' },
                                        { key: 'medical', label: 'Medical Allowance' },
                                        { key: 'responsibility', label: 'Responsibility Allow.' },
                                        { key: 'other_allowance', label: 'Other Allowance (KES)' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{f.label}</label>
                                            <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-3 py-2">
                                                <span className="text-xs text-gray-400">KES</span>
                                                <input type="number" min="0" value={(configDraft as any)[f.key] || 0}
                                                    onChange={e => setConfigDraft((c: any) => ({ ...c, [f.key]: Number(e.target.value) }))}
                                                    className="flex-1 text-sm font-bold outline-none text-gray-800" />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Other Allowance Name</label>
                                        <input type="text" value={configDraft.other_allowance_name || ''}
                                            onChange={e => setConfigDraft((c: any) => ({ ...c, other_allowance_name: e.target.value }))}
                                            placeholder="e.g. Remote Area Allowance"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div>
                                <p className="text-xs font-black text-red-700 uppercase tracking-wider mb-3">Extra Deductions (PAYE/NHIF/NSSF auto-computed)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'loans', label: 'Loan Repayment' },
                                        { key: 'salary_advance', label: 'Salary Advance' },
                                        { key: 'other_deduction', label: 'Other Deduction' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{f.label}</label>
                                            <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-3 py-2">
                                                <span className="text-xs text-gray-400">KES</span>
                                                <input type="number" min="0" value={(configDraft as any)[f.key] || 0}
                                                    onChange={e => setConfigDraft((c: any) => ({ ...c, [f.key]: Number(e.target.value) }))}
                                                    className="flex-1 text-sm font-bold outline-none text-gray-800" />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Other Deduction Name</label>
                                        <input type="text" value={configDraft.other_deduction_name || ''}
                                            onChange={e => setConfigDraft((c: any) => ({ ...c, other_deduction_name: e.target.value }))}
                                            placeholder="e.g. Union Dues"
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                                    </div>
                                </div>
                            </div>

                            <button onClick={saveConfig}
                                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                                style={{ background: 'linear-gradient(135deg,#1d4ed8,#6366f1)' }}>
                                <FiCheckCircle size={16} /> Save Salary Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

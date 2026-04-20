'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiDollarSign, FiUsers, FiCheck, FiDownload, FiRefreshCw,
    FiCalendar, FiSearch, FiSave, FiClock, FiAlertCircle,
    FiChevronLeft, FiChevronRight, FiEye, FiEdit2, FiX, FiPrinter
} from 'react-icons/fi';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Kenya tax brackets 2026 (monthly)
const calcPAYE = (taxable: number): number => {
    if (taxable <= 24000) return taxable * 0.1;
    if (taxable <= 32333) return 2400 + (taxable - 24000) * 0.25;
    return 2400 + 2083.25 + (taxable - 32333) * 0.3;
};

// NHIF rates (simplified)
const calcNHIF = (gross: number): number => {
    if (gross <= 5999) return 150;
    if (gross <= 7999) return 300;
    if (gross <= 11999) return 400;
    if (gross <= 14999) return 500;
    if (gross <= 19999) return 600;
    if (gross <= 24999) return 750;
    if (gross <= 29999) return 850;
    if (gross <= 34999) return 900;
    if (gross <= 39999) return 950;
    if (gross <= 44999) return 1000;
    if (gross <= 49999) return 1100;
    if (gross <= 59999) return 1200;
    if (gross <= 69999) return 1300;
    if (gross <= 79999) return 1400;
    if (gross <= 89999) return 1500;
    if (gross <= 99999) return 1600;
    return 1700;
};

// NSSF (tier I + tier II)
const calcNSSF = (gross: number): number => {
    const tier1 = Math.min(gross, 7000) * 0.06;
    const tier2 = gross > 7000 ? Math.min(gross - 7000, 29000) * 0.06 : 0;
    return Math.min(tier1 + tier2, 2160);
};

interface StaffPayrollEntry {
    _staffId: number;
    _staffType: string;
    _staffName: string;
    _basicSalary: number;
    houseAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    grossPay: number;
    paye: number;
    nhif: number;
    nssf: number;
    loanDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    _existingId?: number;
    _status?: string;
}

export default function RunPayrollPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allStaff, setAllStaff] = useState<any[]>([]);
    const [payrollEntries, setPayrollEntries] = useState<StaffPayrollEntry[]>([]);
    const [existingPayroll, setExistingPayroll] = useState<any[]>([]);

    const now = new Date();
    const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
    const [selYear, setSelYear] = useState(now.getFullYear());
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [viewPayslip, setViewPayslip] = useState<StaffPayrollEntry | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const perPage = 20;

    const payPeriod = `${MONTHS[selMonth - 1]} ${selYear}`;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [teachersRes, supportRes, subRes, payrollRes] = await Promise.all([
                supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
                supabase.from('school_support_teachers').select('*').eq('status', 'Active').order('first_name'),
                supabase.from('school_subordinate_staff').select('*').eq('status', 'Active').order('first_name'),
                supabase.from('school_payroll').select('*').eq('month', selMonth).eq('year', selYear),
            ]);

            const teachers = (teachersRes.data || []).map(t => ({ ...t, _type: 'teacher', _typeLabel: 'TSC Teacher' }));
            const support = (supportRes.data || []).map(s => ({ ...s, _type: 'support', _typeLabel: 'Support Teacher' }));
            const subordinate = (subRes.data || []).map(s => ({ ...s, _type: 'subordinate', _typeLabel: 'Support Staff' }));
            const all = [...teachers, ...support, ...subordinate];
            setAllStaff(all);

            const existing = payrollRes.data || [];
            setExistingPayroll(existing);

            // Build payroll entries
            const entries: StaffPayrollEntry[] = all.map(staff => {
                const name = `${staff.first_name} ${staff.last_name}`;
                const basicSalary = Number(staff.basic_salary || 0);

                // Check if already processed
                const existingEntry = existing.find(e => e.staff_id === staff.id && e.staff_type === staff._type);

                if (existingEntry) {
                    return {
                        _staffId: staff.id, _staffType: staff._type, _staffName: name,
                        _basicSalary: basicSalary,
                        houseAllowance: Number(existingEntry.house_allowance || 0),
                        transportAllowance: Number(existingEntry.transport_allowance || 0),
                        otherAllowances: Number(existingEntry.other_allowances || 0),
                        grossPay: Number(existingEntry.gross_pay || 0),
                        paye: Number(existingEntry.paye || 0),
                        nhif: Number(existingEntry.nhif || 0),
                        nssf: Number(existingEntry.nssf || 0),
                        loanDeduction: Number(existingEntry.loan_deduction || 0),
                        otherDeductions: Number(existingEntry.other_deductions || 0),
                        totalDeductions: Number(existingEntry.total_deductions || 0),
                        netPay: Number(existingEntry.net_pay || 0),
                        _existingId: existingEntry.id,
                        _status: existingEntry.status,
                    };
                }

                // Auto-calculate
                const houseAllowance = Math.round(basicSalary * 0.15);
                const transportAllowance = Math.round(basicSalary * 0.05);
                const otherAllowances = 0;
                const grossPay = basicSalary + houseAllowance + transportAllowance + otherAllowances;
                const paye = Math.round(calcPAYE(grossPay));
                const nhif = calcNHIF(grossPay);
                const nssf = Math.round(calcNSSF(grossPay));
                const loanDeduction = 0;
                const otherDed = 0;
                const totalDeductions = paye + nhif + nssf + loanDeduction + otherDed;
                const netPay = grossPay - totalDeductions;

                return {
                    _staffId: staff.id, _staffType: staff._type, _staffName: name,
                    _basicSalary: basicSalary,
                    houseAllowance, transportAllowance, otherAllowances,
                    grossPay, paye, nhif, nssf,
                    loanDeduction, otherDeductions: otherDed,
                    totalDeductions, netPay,
                };
            });

            setPayrollEntries(entries);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [selMonth, selYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Recalculate for an entry
    const recalculate = (entry: StaffPayrollEntry): StaffPayrollEntry => {
        const grossPay = entry._basicSalary + entry.houseAllowance + entry.transportAllowance + entry.otherAllowances;
        const paye = Math.round(calcPAYE(grossPay));
        const nhif = calcNHIF(grossPay);
        const nssf = Math.round(calcNSSF(grossPay));
        const totalDeductions = paye + nhif + nssf + entry.loanDeduction + entry.otherDeductions;
        const netPay = grossPay - totalDeductions;
        return { ...entry, grossPay, paye, nhif, nssf, totalDeductions, netPay };
    };

    const updateEntry = (idx: number, field: keyof StaffPayrollEntry, value: number) => {
        setPayrollEntries(prev => {
            const updated = [...prev];
            (updated[idx] as any)[field] = value;
            updated[idx] = recalculate(updated[idx]);
            return updated;
        });
    };

    // Filter + search
    const filtered = payrollEntries.filter(e => {
        if (filterType !== 'all' && e._staffType !== filterType) return false;
        if (search) return e._staffName.toLowerCase().includes(search.toLowerCase());
        return true;
    });

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    // Totals
    const totalGross = filtered.reduce((s, e) => s + e.grossPay, 0);
    const totalDeductions = filtered.reduce((s, e) => s + e.totalDeductions, 0);
    const totalNet = filtered.reduce((s, e) => s + e.netPay, 0);
    const processedCount = filtered.filter(e => e._existingId).length;

    // Save all payroll
    const handleSaveAll = async () => {
        if (payrollEntries.length === 0) return;
        setSaving(true);
        let saved = 0;
        try {
            for (const entry of payrollEntries) {
                const payload = {
                    staff_type: entry._staffType,
                    staff_id: entry._staffId,
                    staff_name: entry._staffName,
                    pay_period: payPeriod,
                    month: selMonth,
                    year: selYear,
                    basic_salary: entry._basicSalary,
                    house_allowance: entry.houseAllowance,
                    transport_allowance: entry.transportAllowance,
                    other_allowances: entry.otherAllowances,
                    gross_pay: entry.grossPay,
                    paye: entry.paye,
                    nhif: entry.nhif,
                    nssf: entry.nssf,
                    loan_deduction: entry.loanDeduction,
                    other_deductions: entry.otherDeductions,
                    total_deductions: entry.totalDeductions,
                    net_pay: entry.netPay,
                    status: 'Pending',
                };

                let error;
                if (entry._existingId) {
                    ({ error } = await supabase.from('school_payroll').update(payload).eq('id', entry._existingId));
                } else {
                    ({ error } = await supabase.from('school_payroll').insert([payload]));
                }
                if (!error) saved++;
            }
            toast.success(`${saved} payroll records saved ✅`);
            fetchData();
        } catch (e) { toast.error('Error saving payroll'); }
        setSaving(false);
    };

    // Approve / Mark as Paid
    const handleStatusUpdate = async (status: 'Approved' | 'Paid') => {
        const ids = payrollEntries.filter(e => e._existingId).map(e => e._existingId!);
        if (ids.length === 0) { toast.error('Save payroll first before approving'); return; }
        const { error } = await supabase.from('school_payroll').update({ status, payment_date: status === 'Paid' ? new Date().toISOString().split('T')[0] : null }).in('id', ids);
        if (error) { toast.error('Update failed'); return; }
        toast.success(`Payroll ${status.toLowerCase()} ✅`);
        fetchData();
    };

    // Export CSV
    const exportCSV = () => {
        if (filtered.length === 0) return;
        const headers = ['#', 'Staff Name', 'Type', 'Basic', 'House Allow', 'Transport', 'Other Allow', 'Gross', 'PAYE', 'NHIF', 'NSSF', 'Loans', 'Other Ded', 'Total Ded', 'Net Pay'];
        const rows = filtered.map((e, i) => [i + 1, e._staffName, e._staffType, e._basicSalary, e.houseAllowance, e.transportAllowance, e.otherAllowances, e.grossPay, e.paye, e.nhif, e.nssf, e.loanDeduction, e.otherDeductions, e.totalDeductions, e.netPay]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `payroll_${payPeriod.replace(' ', '_')}.csv`; a.click();
        toast.success('Exported ✅');
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Payroll...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiDollarSign className="text-green-500" /> Run Payroll
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Process monthly payroll for <span className="font-semibold text-green-600">{payPeriod}</span></p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FiDownload size={14} /> Export</button>
                    <button onClick={() => handleStatusUpdate('Approved')} className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-2"><FiCheck size={14} /> Approve All</button>
                    <button onClick={() => handleStatusUpdate('Paid')} className="px-4 py-2 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg flex items-center gap-2"><FiCheck size={14} /> Mark All Paid</button>
                    <button onClick={handleSaveAll} disabled={saving}
                        className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <><FiSave size={14} /> Save Payroll</>}
                    </button>
                </div>
            </div>

            {/* Month/Year Selector + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Month</label>
                            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-green-400 outline-none">
                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Year</label>
                            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-green-400 outline-none">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <FiAlertCircle size={12} className="text-amber-500" />
                        <span><strong>{processedCount}</strong> of <strong>{payrollEntries.length}</strong> already processed for {payPeriod}</span>
                    </div>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <p className="text-xs font-semibold opacity-80">TOTAL GROSS</p>
                    <p className="text-xl font-extrabold mt-1">{fmt(totalGross)}</p>
                    <p className="text-[10px] opacity-70 mt-1">{filtered.length} staff</p>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                    <p className="text-xs font-semibold opacity-80">TOTAL DEDUCTIONS</p>
                    <p className="text-xl font-extrabold mt-1">{fmt(totalDeductions)}</p>
                    <p className="text-[10px] opacity-70 mt-1">PAYE + NHIF + NSSF + Loans</p>
                </div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <p className="text-xs font-semibold opacity-80">TOTAL NET PAY</p>
                    <p className="text-xl font-extrabold mt-1">{fmt(totalNet)}</p>
                    <p className="text-[10px] opacity-70 mt-1">After deductions</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search staff..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-green-400 outline-none" />
                    </div>
                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-green-400 outline-none">
                        <option value="all">All Staff Types</option>
                        <option value="teacher">TSC Teachers</option>
                        <option value="support">Support Teachers</option>
                        <option value="subordinate">Support Staff</option>
                    </select>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase w-8">#</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase min-w-[180px]">Staff Name</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">Basic</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">House</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">Transport</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase bg-green-50 font-extrabold">Gross</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">PAYE</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">NHIF</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">NSSF</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">Loans</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase bg-red-50">Total Ded</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase bg-indigo-50 font-extrabold">Net Pay</th>
                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={14} className="text-center py-16 text-gray-400">No staff found for payroll processing</td></tr>
                            ) : paginated.map((entry, i) => {
                                const realIdx = payrollEntries.findIndex(e => e._staffId === entry._staffId && e._staffType === entry._staffType);
                                return (
                                    <tr key={`${entry._staffType}-${entry._staffId}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                        <td className="px-3 py-2 font-semibold text-gray-800">{entry._staffName}</td>
                                        <td className="px-3 py-2 text-right font-medium">{fmt(entry._basicSalary)}</td>
                                        <td className="px-3 py-2 text-right">
                                            <input type="number" value={entry.houseAllowance}
                                                onChange={e => updateEntry(realIdx, 'houseAllowance', Number(e.target.value))}
                                                className="w-20 text-right px-2 py-1 border border-gray-200 rounded text-xs focus:border-green-400 outline-none" />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <input type="number" value={entry.transportAllowance}
                                                onChange={e => updateEntry(realIdx, 'transportAllowance', Number(e.target.value))}
                                                className="w-20 text-right px-2 py-1 border border-gray-200 rounded text-xs focus:border-green-400 outline-none" />
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-green-700 bg-green-50/50">{fmt(entry.grossPay)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{fmt(entry.paye)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{fmt(entry.nhif)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{fmt(entry.nssf)}</td>
                                        <td className="px-3 py-2 text-right">
                                            <input type="number" value={entry.loanDeduction}
                                                onChange={e => updateEntry(realIdx, 'loanDeduction', Number(e.target.value))}
                                                className="w-20 text-right px-2 py-1 border border-gray-200 rounded text-xs focus:border-green-400 outline-none" />
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-red-600 bg-red-50/50">{fmt(entry.totalDeductions)}</td>
                                        <td className="px-3 py-2 text-right font-extrabold text-indigo-700 bg-indigo-50/50">{fmt(entry.netPay)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`badge ${entry._status === 'Paid' ? 'badge-success' : entry._status === 'Approved' ? 'badge-blue' : entry._existingId ? 'badge-warning' : 'badge-info'}`}>
                                                {entry._status || (entry._existingId ? 'Pending' : 'New')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button onClick={() => setViewPayslip(entry)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="View Payslip">
                                                <FiEye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {paginated.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                                    <td colSpan={2} className="px-3 py-3 text-sm text-gray-700">TOTALS</td>
                                    <td className="px-3 py-3 text-right text-sm">{fmt(filtered.reduce((s, e) => s + e._basicSalary, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm">{fmt(filtered.reduce((s, e) => s + e.houseAllowance, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm">{fmt(filtered.reduce((s, e) => s + e.transportAllowance, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm text-green-700 bg-green-50">{fmt(totalGross)}</td>
                                    <td className="px-3 py-3 text-right text-sm text-red-600">{fmt(filtered.reduce((s, e) => s + e.paye, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm text-red-600">{fmt(filtered.reduce((s, e) => s + e.nhif, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm text-red-600">{fmt(filtered.reduce((s, e) => s + e.nssf, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm text-red-600">{fmt(filtered.reduce((s, e) => s + e.loanDeduction, 0))}</td>
                                    <td className="px-3 py-3 text-right text-sm text-red-700 bg-red-50">{fmt(totalDeductions)}</td>
                                    <td className="px-3 py-3 text-right text-sm text-indigo-700 bg-indigo-50">{fmt(totalNet)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronLeft size={16} /></button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Payslip Modal */}
            {viewPayslip && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewPayslip(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiPrinter /> Payslip Preview</h2>
                            <button onClick={() => setViewPayslip(null)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-center border-b border-gray-200 pb-4">
                                <h3 className="text-lg font-bold text-gray-800">{viewPayslip._staffName}</h3>
                                <p className="text-sm text-gray-500">Pay Period: <span className="font-semibold">{payPeriod}</span></p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Earnings</h4>
                                <div className="bg-green-50 rounded-lg p-3 space-y-2">
                                    {[
                                        ['Basic Salary', viewPayslip._basicSalary],
                                        ['House Allowance', viewPayslip.houseAllowance],
                                        ['Transport Allowance', viewPayslip.transportAllowance],
                                        ['Other Allowances', viewPayslip.otherAllowances],
                                    ].map(([label, val], i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{label as string}</span>
                                            <span className="font-medium text-gray-800">{fmt(val as number)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-sm font-bold border-t border-green-200 pt-2">
                                        <span className="text-green-700">Gross Pay</span>
                                        <span className="text-green-700">{fmt(viewPayslip.grossPay)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Deductions</h4>
                                <div className="bg-red-50 rounded-lg p-3 space-y-2">
                                    {[
                                        ['P.A.Y.E', viewPayslip.paye],
                                        ['NHIF', viewPayslip.nhif],
                                        ['NSSF', viewPayslip.nssf],
                                        ['Loan Deduction', viewPayslip.loanDeduction],
                                        ['Other Deductions', viewPayslip.otherDeductions],
                                    ].map(([label, val], i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{label as string}</span>
                                            <span className="font-medium text-red-600">{fmt(val as number)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-sm font-bold border-t border-red-200 pt-2">
                                        <span className="text-red-700">Total Deductions</span>
                                        <span className="text-red-700">{fmt(viewPayslip.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <p className="text-xs text-white/80 font-semibold uppercase">Net Pay</p>
                                <p className="text-3xl font-extrabold text-white mt-1">{fmt(viewPayslip.netPay)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

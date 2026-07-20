'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getNextDocumentNumber } from '@/lib/receiptNumber';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiX, FiSearch } from 'react-icons/fi';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface PayrollEntry { id: number; staff_type: string; staff_id: number; staff_name: string; pay_period: string; month: number; year: number; basic_salary: number; house_allowance: number; transport_allowance: number; other_allowances: number; gross_pay: number; paye: number; nhif: number; nssf: number; loan_deduction: number; other_deductions: number; total_deductions: number; net_pay: number; payment_method: string; status: string; }

export default function PayrollPage() {
    const [entries, setEntries] = useState<PayrollEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [allStaff, setAllStaff] = useState<any[]>([]);

    const [form, setForm] = useState({
        staff_type: 'teacher', staff_id: '', basic_salary: '', house_allowance: '0', transport_allowance: '0',
        other_allowances: '0', paye: '0', nhif: '0', nssf: '0', loan_deduction: '0', other_deductions: '0',
        payment_method: 'Bank Transfer',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: payroll }, { data: teachers }, { data: support }, { data: subordinate }] = await Promise.all([
            supabase.from('school_payroll').select('*').eq('year', filterYear).eq('month', filterMonth).order('staff_name'),
            supabase.from('school_teachers').select('id, first_name, last_name, basic_salary').eq('status', 'Active'),
            supabase.from('school_support_teachers').select('id, first_name, last_name, basic_salary').eq('status', 'Active'),
            supabase.from('school_subordinate_staff').select('id, first_name, last_name, basic_salary').eq('status', 'Active'),
        ]);
        setEntries(payroll || []);
        setAllStaff([
            ...(teachers || []).map(t => ({ ...t, type: 'teacher', label: `👨‍🏫 ${t.first_name} ${t.last_name} (TSC)` })),
            ...(support || []).map(t => ({ ...t, type: 'support_teacher', label: `👩‍🏫 ${t.first_name} ${t.last_name} (Support)` })),
            ...(subordinate || []).map(t => ({ ...t, type: 'subordinate', label: `🧑‍🔧 ${t.first_name} ${t.last_name} (Staff)` })),
        ]);
        setLoading(false);
    }, [filterMonth, filterYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

    const totalGross = entries.reduce((s, e) => s + Number(e.gross_pay), 0);
    const totalDeductions = entries.reduce((s, e) => s + Number(e.total_deductions), 0);
    const totalNet = entries.reduce((s, e) => s + Number(e.net_pay), 0);

    const onStaffSelect = (staffKey: string) => {
        const staff = allStaff.find(s => `${s.type}-${s.id}` === staffKey);
        if (staff) setForm({ ...form, staff_type: staff.type, staff_id: staffKey, basic_salary: String(staff.basic_salary || 0) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const staff = allStaff.find(s => `${s.type}-${s.id}` === form.staff_id);
        if (!staff) { toast.error('Select a staff member'); return; }
        const basic = Number(form.basic_salary);
        const house = Number(form.house_allowance);
        const transport = Number(form.transport_allowance);
        const otherAllow = Number(form.other_allowances);
        const gross = basic + house + transport + otherAllow;
        const paye = Number(form.paye); const nhif = Number(form.nhif); const nssf = Number(form.nssf);
        const loan = Number(form.loan_deduction); const otherDed = Number(form.other_deductions);
        const totalDed = paye + nhif + nssf + loan + otherDed;
        const net = gross - totalDed;

        // Get payroll voucher number from DB counter
        let payroll_number = `PR/${filterMonth}/${filterYear}`; // fallback
        try { payroll_number = await getNextDocumentNumber(supabase, 'PAYROLL'); } catch { /* keep fallback */ }

        const { error } = await supabase.from('school_payroll').insert([{
            staff_type: staff.type, staff_id: staff.id, staff_name: `${staff.first_name} ${staff.last_name}`,
            pay_period: `${months[filterMonth - 1]} ${filterYear}`, month: filterMonth, year: filterYear,
            basic_salary: basic, house_allowance: house, transport_allowance: transport, other_allowances: otherAllow,
            gross_pay: gross, paye, nhif, nssf, loan_deduction: loan, other_deductions: otherDed,
            total_deductions: totalDed, net_pay: net, payment_method: form.payment_method, status: 'Pending',
            payroll_number,
        }]);
        if (error) {
            if (error.code === '23505') toast.error('Payroll already exists for this staff member this month');
            else toast.error('Failed to create payroll');
            return;
        }
        toast.success('Payroll entry created! 💵');
        setShowModal(false);
        setForm({ staff_type: 'teacher', staff_id: '', basic_salary: '', house_allowance: '0', transport_allowance: '0', other_allowances: '0', paye: '0', nhif: '0', nssf: '0', loan_deduction: '0', other_deductions: '0', payment_method: 'Bank Transfer' });
        fetchData();
    };

    const deleteEntry = async (id: number) => {
        if (!confirm('Delete this payroll entry?')) return;
        await supabase.from('school_payroll').delete().eq('id', id);
        toast.success('Deleted');
        fetchData();
    };

    const filtered = entries.filter(e => searchTerm === '' || e.staff_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">💵 Payroll — {months[filterMonth - 1]} {filterYear}</h1>
                    <p className="text-sm text-gray-500 mt-1">{entries.length} payroll entries</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start"><FiPlus size={16} /> Add Payroll</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="stat-card"><p className="text-xs text-gray-500">💰 Gross Pay</p><p className="text-lg font-bold text-blue-600 mt-1">{fmt(totalGross)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">📉 Deductions</p><p className="text-lg font-bold text-red-500 mt-1">{fmt(totalDeductions)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">💵 Net Pay</p><p className="text-lg font-bold text-green-600 mt-1">{fmt(totalNet)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">👥 Staff</p><p className="text-lg font-bold text-purple-600 mt-1">{entries.length}</p></div>
            </div>

            <div className="filter-bar items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search staff..." className="input-modern pl-10 py-2.5 text-sm" />
                </div>
                <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value) || filterMonth)} className="select-modern">
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#3b82f6', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">💵</span><p className="font-medium">No payroll entries</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Staff Name</th><th>Type</th><th>Basic</th><th>Allowances</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((e, i) => (
                                        <tr key={e.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-medium">{e.staff_name}</td>
                                            <td><span className="badge badge-info">{e.staff_type === 'teacher' ? 'TSC' : e.staff_type === 'support_teacher' ? 'Support' : 'Staff'}</span></td>
                                            <td>{fmt(e.basic_salary)}</td>
                                            <td className="text-sm text-gray-500">{fmt(e.house_allowance + e.transport_allowance + e.other_allowances)}</td>
                                            <td className="font-semibold">{fmt(e.gross_pay)}</td>
                                            <td className="text-red-500">{fmt(e.total_deductions)}</td>
                                            <td className="font-bold text-green-600">{fmt(e.net_pay)}</td>
                                            <td><span className={`badge ${e.status === 'Paid' ? 'badge-success' : e.status === 'Approved' ? 'badge-info' : 'badge-warning'}`}>{e.status}</span></td>
                                            <td><button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">💵 Add Payroll Entry</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Staff Member *</label>
                                <select value={form.staff_id} onChange={e => onStaffSelect(e.target.value)} className="select-modern w-full" required>
                                    <option value="">Select Staff</option>
                                    {allStaff.map(s => <option key={`${s.type}-${s.id}`} value={`${s.type}-${s.id}`}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Basic Salary</label><input type="number" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">House Allowance</label><input type="number" value={form.house_allowance} onChange={e => setForm({ ...form, house_allowance: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Transport</label><input type="number" value={form.transport_allowance} onChange={e => setForm({ ...form, transport_allowance: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Other Allow.</label><input type="number" value={form.other_allowances} onChange={e => setForm({ ...form, other_allowances: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                            </div>
                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="text-xs font-bold text-gray-500 mb-2">📉 Deductions</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">PAYE</label><input type="number" value={form.paye} onChange={e => setForm({ ...form, paye: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">NHIF</label><input type="number" value={form.nhif} onChange={e => setForm({ ...form, nhif: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">NSSF</label><input type="number" value={form.nssf} onChange={e => setForm({ ...form, nssf: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Loan</label><input type="number" value={form.loan_deduction} onChange={e => setForm({ ...form, loan_deduction: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Other</label><input type="number" value={form.other_deductions} onChange={e => setForm({ ...form, other_deductions: e.target.value })} className="input-modern pl-4 py-2 text-sm" /></div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">💵 Create Payroll</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

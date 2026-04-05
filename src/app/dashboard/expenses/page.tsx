'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiX, FiSearch } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Expense { id: number; expense_date: string; category_id: number; description: string; amount: number; payment_method: string; reference_number?: string; approved_by?: string; notes?: string; }
interface Category { id: number; category_name: string; icon: string; }

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const currentYear = new Date().getFullYear();

    const [form, setForm] = useState({
        expense_date: new Date().toISOString().split('T')[0], category_id: '', description: '',
        amount: '', payment_method: 'Cash', reference_number: '', approved_by: '', notes: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: exp }, { data: cats }] = await Promise.all([
            supabase.from('school_expenses').select('*').eq('year', currentYear).order('expense_date', { ascending: false }),
            supabase.from('school_expense_categories').select('*').order('category_name'),
        ]);
        setExpenses(exp || []);
        setCategories(cats || []);
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.description || !form.amount || !form.category_id) { toast.error('Fill required fields'); return; }
        const { error } = await supabase.from('school_expenses').insert([{
            expense_date: form.expense_date, category_id: Number(form.category_id), description: form.description.trim(),
            amount: Number(form.amount), payment_method: form.payment_method,
            reference_number: form.reference_number || null, approved_by: form.approved_by || null,
            notes: form.notes || null, year: currentYear,
        }]);
        if (error) { toast.error('Failed to add expense'); return; }
        toast.success('Expense recorded! 📉');
        setShowModal(false);
        setForm({ expense_date: new Date().toISOString().split('T')[0], category_id: '', description: '', amount: '', payment_method: 'Cash', reference_number: '', approved_by: '', notes: '' });
        fetchData();
    };

    const deleteExpense = async (id: number) => {
        if (!confirm('Delete this expense?')) return;
        await supabase.from('school_expenses').delete().eq('id', id);
        toast.success('Deleted');
        fetchData();
    };

    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.category_name || '-';
    const getCategoryIcon = (id: number) => categories.find(c => c.id === id)?.icon || '💰';

    const filtered = expenses.filter(e => searchTerm === '' || e.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const categoryTotals = categories.map(c => ({ name: c.category_name, total: expenses.filter(e => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0) })).filter(c => c.total > 0);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📉 School Expenses</h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage school expenditures — {currentYear}</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start"><FiPlus size={16} /> Add Expense</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="stat-card"><p className="text-xs text-gray-500">📉 Total Expenses</p><p className="text-lg font-bold text-red-500 mt-1">{fmt(totalExpenses)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">🧾 Entries</p><p className="text-lg font-bold text-blue-600 mt-1">{expenses.length}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">📊 Categories</p><p className="text-lg font-bold text-purple-600 mt-1">{categoryTotals.length}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="filter-bar mb-0">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search expenses..." className="input-modern pl-10 py-2.5 text-sm" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-4">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">📉</span><p className="font-medium">No expenses recorded</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filtered.map((e, i) => (
                                            <tr key={e.id}>
                                                <td className="text-xs text-gray-400">{i + 1}</td>
                                                <td className="text-sm">{new Date(e.expense_date).toLocaleDateString()}</td>
                                                <td><span className="badge badge-purple">{getCategoryIcon(e.category_id)} {getCategoryName(e.category_id)}</span></td>
                                                <td className="font-medium">{e.description}</td>
                                                <td className="font-bold text-red-500">{fmt(e.amount)}</td>
                                                <td className="text-sm">{e.payment_method}</td>
                                                <td><button onClick={() => deleteExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                {categoryTotals.length > 0 && (
                    <div className="chart-container">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">🍩 Breakdown</h3>
                        <div style={{ height: 250 }}>
                            <Doughnut data={{
                                labels: categoryTotals.map(c => c.name),
                                datasets: [{ data: categoryTotals.map(c => c.total), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'], borderWidth: 0 }]
                            }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 10 } } } }} />
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">📉 Add Expense</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date</label><input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label><select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="select-modern w-full" required><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.category_name}</option>)}</select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" required /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="select-modern w-full"><option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option><option value="Bank">Bank</option><option value="Cheque">Cheque</option></select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Approved By</label><input type="text" value={form.approved_by} onChange={e => setForm({ ...form, approved_by: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn-danger flex-1">📉 Record Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

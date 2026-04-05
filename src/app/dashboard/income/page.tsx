'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiX, FiSearch } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Income { id: number; income_date: string; source: string; description: string; amount: number; payment_method: string; reference_number?: string; received_by?: string; notes?: string; year: number; }

export default function IncomePage() {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const currentYear = new Date().getFullYear();

    const [form, setForm] = useState({
        income_date: new Date().toISOString().split('T')[0], source: 'Fees', description: '',
        amount: '', payment_method: 'Cash', reference_number: '', received_by: '', notes: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('school_income').select('*').eq('year', currentYear).order('income_date', { ascending: false });
        setIncomes(data || []);
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);
    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.description || !form.amount) { toast.error('Fill required fields'); return; }
        const { error } = await supabase.from('school_income').insert([{
            income_date: form.income_date, source: form.source, description: form.description.trim(),
            amount: Number(form.amount), payment_method: form.payment_method,
            reference_number: form.reference_number || null, received_by: form.received_by || null,
            notes: form.notes || null, year: currentYear,
        }]);
        if (error) { toast.error('Failed to add income'); return; }
        toast.success('Income recorded! 📈');
        setShowModal(false);
        setForm({ income_date: new Date().toISOString().split('T')[0], source: 'Fees', description: '', amount: '', payment_method: 'Cash', reference_number: '', received_by: '', notes: '' });
        fetchData();
    };

    const deleteIncome = async (id: number) => {
        if (!confirm('Delete this income entry?')) return;
        await supabase.from('school_income').delete().eq('id', id);
        toast.success('Deleted');
        fetchData();
    };

    const filtered = incomes.filter(i => searchTerm === '' || i.description.toLowerCase().includes(searchTerm.toLowerCase()) || i.source.toLowerCase().includes(searchTerm.toLowerCase()));

    const sources = ['Fees', 'Donations', 'Government Grant', 'CDF', 'Fundraising', 'Rent', 'Projects', 'Sports', 'Other'];
    const sourceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1'];
    const sourceTotals = sources.map((s, i) => ({ source: s, total: incomes.filter(inc => inc.source === s).reduce((sum, inc) => sum + Number(inc.amount), 0), color: sourceColors[i] })).filter(s => s.total > 0);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📈 School Income</h1>
                    <p className="text-sm text-gray-500 mt-1">Track all school income and revenue — {currentYear}</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start"><FiPlus size={16} /> Add Income</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="stat-card"><p className="text-xs text-gray-500">📈 Total Income</p><p className="text-lg font-bold text-green-600 mt-1">{fmt(totalIncome)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">🧾 Entries</p><p className="text-lg font-bold text-blue-600 mt-1">{incomes.length}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">📊 Sources</p><p className="text-lg font-bold text-purple-600 mt-1">{sourceTotals.length}</p></div>
            </div>

            {sourceTotals.length > 0 && (
                <div className="chart-container">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">📊 Income by Source</h3>
                    <div style={{ height: 250 }}>
                        <Bar data={{
                            labels: sourceTotals.map(s => s.source),
                            datasets: [{ label: 'Amount', data: sourceTotals.map(s => s.total), backgroundColor: sourceTotals.map(s => s.color), borderRadius: 6 }]
                        }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                    </div>
                </div>
            )}

            <div className="filter-bar">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search income..." className="input-modern pl-10 py-2.5 text-sm" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#3b82f6', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">📈</span><p className="font-medium">No income recorded</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Date</th><th>Source</th><th>Description</th><th>Amount</th><th>Method</th><th>Ref</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((inc, i) => (
                                        <tr key={inc.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="text-sm">{new Date(inc.income_date).toLocaleDateString()}</td>
                                            <td><span className="badge badge-success">{inc.source}</span></td>
                                            <td className="font-medium">{inc.description}</td>
                                            <td className="font-bold text-green-600">{fmt(inc.amount)}</td>
                                            <td className="text-sm">{inc.payment_method}</td>
                                            <td className="text-sm">{inc.reference_number || '-'}</td>
                                            <td><button onClick={() => deleteIncome(inc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button></td>
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
                            <h3 className="text-lg font-bold text-gray-800">📈 Add Income</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date</label><input type="date" value={form.income_date} onChange={e => setForm({ ...form, income_date: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Source</label><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="select-modern w-full">{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Amount (KES) *</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" required /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="select-modern w-full"><option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option><option value="Bank">Bank</option><option value="Cheque">Cheque</option></select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Received By</label><input type="text" value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn-success flex-1">📈 Record Income</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

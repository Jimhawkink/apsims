'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiCheck, FiMail, FiPrinter, FiBookOpen } from 'react-icons/fi';

export default function OverdueBooksPage() {
    const [checkouts, setCheckouts] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [c, b] = await Promise.all([
            supabase.from('school_library_checkouts').select('*').eq('status', 'Checked Out').order('due_date'),
            supabase.from('school_library_books').select('*'),
        ]);
        setCheckouts(c.data || []);
        setBooks(b.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const now = new Date();
    const overdue = checkouts.filter(c => new Date(c.due_date) < now).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const getDaysOverdue = (dueDate: string) => Math.ceil((now.getTime() - new Date(dueDate).getTime()) / 86400000);

    const getSeverity = (days: number): { label: string; bg: string; text: string } => {
        if (days >= 30) return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' };
        if (days >= 14) return { label: 'High', bg: 'bg-orange-100', text: 'text-orange-700' };
        if (days >= 7) return { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700' };
        return { label: 'Low', bg: 'bg-yellow-50', text: 'text-yellow-700' };
    };

    const handleReturn = async (checkout: any) => {
        const { error } = await supabase.from('school_library_checkouts').update({ status: 'Returned', return_date: now.toISOString().split('T')[0] }).eq('id', checkout.id);
        if (error) { toast.error('Return failed'); return; }
        const book = books.find(b => b.id === checkout.book_id);
        if (book) await supabase.from('school_library_books').update({ available_copies: (book.available_copies || 0) + 1 }).eq('id', book.id);
        toast.success('Book returned ✅'); fetchAll();
    };

    const criticalCount = overdue.filter(c => getDaysOverdue(c.due_date) >= 30).length;
    const highCount = overdue.filter(c => { const d = getDaysOverdue(c.due_date); return d >= 14 && d < 30; }).length;
    const medCount = overdue.filter(c => { const d = getDaysOverdue(c.due_date); return d >= 7 && d < 14; }).length;
    const lowCount = overdue.filter(c => getDaysOverdue(c.due_date) < 7).length;

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiAlertCircle className="text-red-500" /> Overdue Books</h1>
                <p className="text-sm text-gray-500 mt-1">Track and manage overdue library books — {overdue.length} books overdue</p></div>
                <button onClick={() => window.print()} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                    <FiPrinter size={14} /> Print Report
                </button>
            </div>

            {/* Severity Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><p className="text-xs font-semibold opacity-80 uppercase">Critical (30+ days)</p><p className="text-2xl font-extrabold mt-1">{criticalCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}><p className="text-xs font-semibold opacity-80 uppercase">High (14-29 days)</p><p className="text-2xl font-extrabold mt-1">{highCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><p className="text-xs font-semibold opacity-80 uppercase">Medium (7-13 days)</p><p className="text-2xl font-extrabold mt-1">{medCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}><p className="text-xs font-semibold opacity-80 uppercase">Low (&lt;7 days)</p><p className="text-2xl font-extrabold mt-1">{lowCount}</p></div>
            </div>

            {overdue.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">✅</span>
                    <p className="font-semibold text-lg text-green-600">No Overdue Books!</p>
                    <p className="text-sm mt-1">All library books are returned on time</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full"><thead><tr className="bg-red-50 border-b border-red-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase">Book Title</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase">Borrower</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-red-600 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase">Checkout</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase">Due Date</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-red-600 uppercase">Days Overdue</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-red-600 uppercase">Severity</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-red-600 uppercase">Action</th>
                    </tr></thead><tbody>
                        {overdue.map((c, i) => {
                            const days = getDaysOverdue(c.due_date);
                            const severity = getSeverity(days);
                            return (
                                <tr key={c.id} className={`border-b border-gray-100 hover:bg-red-50/30 ${days >= 30 ? 'bg-red-50/20' : ''}`}>
                                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{c.book_title}</td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-800">{c.borrower_name}</p>
                                        {c.borrower_id && <p className="text-[10px] text-gray-400">{c.borrower_id}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{c.borrower_type}</span></td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(c.checkout_date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{new Date(c.due_date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-3 text-center"><span className="text-lg font-extrabold text-red-600">{days}</span></td>
                                    <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${severity.bg} ${severity.text}`}>{severity.label}</span></td>
                                    <td className="px-4 py-3 text-center"><button onClick={() => handleReturn(c)} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg flex items-center gap-1 mx-auto"><FiCheck size={12} /> Return</button></td>
                                </tr>
                            );
                        })}
                    </tbody></table>
                    <div className="px-5 py-3 bg-red-50 border-t border-red-200 text-sm text-red-600 font-semibold">{overdue.length} books overdue</div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBookOpen, FiPlus, FiSearch, FiCheck, FiX, FiClock, FiAlertCircle } from 'react-icons/fi';

export default function CheckoutPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [checkouts, setCheckouts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [form, setForm] = useState({
        book_id: 0, book_title: '', borrower_name: '', borrower_type: 'Student',
        borrower_id: '', checkout_date: new Date().toISOString().split('T')[0],
        due_date: '', notes: '',
    });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [b, c, s] = await Promise.all([
            supabase.from('school_library_books').select('*').order('title'),
            supabase.from('school_library_checkouts').select('*').order('checkout_date', { ascending: false }),
            supabase.from('school_students').select('id, first_name, last_name, admission_no, admission_number').eq('status', 'Active').order('first_name'),
        ]);
        setBooks(b.data || []);
        setCheckouts(c.data || []);
        setStudents(s.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        if (form.checkout_date && !form.due_date) {
            const d = new Date(form.checkout_date); d.setDate(d.getDate() + 14);
            setForm(prev => ({ ...prev, due_date: d.toISOString().split('T')[0] }));
        }
    }, [form.checkout_date]);

    const filtered = checkouts.filter(c => {
        if (filterStatus === 'out' && c.status !== 'Checked Out') return false;
        if (filterStatus === 'returned' && c.status !== 'Returned') return false;
        if (filterStatus === 'overdue' && !(c.status === 'Checked Out' && new Date(c.due_date) < new Date())) return false;
        if (search) { const q = search.toLowerCase(); return (c.book_title || '').toLowerCase().includes(q) || (c.borrower_name || '').toLowerCase().includes(q); }
        return true;
    });

    const activeCount = checkouts.filter(c => c.status === 'Checked Out').length;
    const overdueCount = checkouts.filter(c => c.status === 'Checked Out' && new Date(c.due_date) < new Date()).length;
    const returnedCount = checkouts.filter(c => c.status === 'Returned').length;

    const handleCheckout = async () => {
        if (!form.book_id || !form.borrower_name.trim()) { toast.error('Select a book and borrower'); return; }
        const book = books.find(b => b.id === form.book_id);
        if (!book || book.available_copies <= 0) { toast.error('No copies available'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_library_checkouts').insert([{
            book_id: form.book_id, book_title: book.title, borrower_name: form.borrower_name.trim(),
            borrower_type: form.borrower_type, borrower_id: form.borrower_id.trim() || null,
            checkout_date: form.checkout_date, due_date: form.due_date, status: 'Checked Out', notes: form.notes || null,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_library_books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id);
        toast.success('Book issued ✅');
        setShowModal(false); fetchAll();
        setSaving(false);
    };

    const handleReturn = async (checkout: any) => {
        const { error } = await supabase.from('school_library_checkouts').update({ status: 'Returned', return_date: new Date().toISOString().split('T')[0] }).eq('id', checkout.id);
        if (error) { toast.error('Return failed'); return; }
        const book = books.find(b => b.id === checkout.book_id);
        if (book) await supabase.from('school_library_books').update({ available_copies: (book.available_copies || 0) + 1 }).eq('id', book.id);
        toast.success('Book returned ✅'); fetchAll();
    };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none";

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiClock className="text-blue-500" /> Issue & Return Books</h1>
                <p className="text-sm text-gray-500 mt-1">Check out books to students/staff and process returns</p></div>
                <button onClick={() => { setForm({ book_id: 0, book_title: '', borrower_name: '', borrower_type: 'Student', borrower_id: '', checkout_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' }); setShowModal(true); }}
                    className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                    <FiPlus size={14} /> Issue Book
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><p className="text-xs font-semibold opacity-80">Active Checkouts</p><p className="text-2xl font-extrabold mt-1">{activeCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><p className="text-xs font-semibold opacity-80">Overdue</p><p className="text-2xl font-extrabold mt-1">{overdueCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><p className="text-xs font-semibold opacity-80">Returned</p><p className="text-2xl font-extrabold mt-1">{returnedCount}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><p className="text-xs font-semibold opacity-80">Total Transactions</p><p className="text-2xl font-extrabold mt-1">{checkouts.length}</p></div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search book or borrower..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                    {[{key:'all',label:'All'},{key:'out',label:`Out (${activeCount})`},{key:'overdue',label:`Overdue (${overdueCount})`},{key:'returned',label:'Returned'}].map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterStatus === f.key ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500'}`}>{f.label}</button>
                    ))}
                </div>
            </div>

            {/* Checkouts Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Book</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Borrower</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Checkout</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Returned</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                </tr></thead><tbody>
                    {filtered.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-12 text-gray-400"><FiBookOpen className="mx-auto mb-2" size={28} /><p>No records found</p></td></tr>
                    ) : filtered.slice(0, 50).map((c, i) => {
                        const isOverdue = c.status === 'Checked Out' && new Date(c.due_date) < new Date();
                        const daysOverdue = isOverdue ? Math.ceil((Date.now() - new Date(c.due_date).getTime()) / 86400000) : 0;
                        return (
                            <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{c.book_title}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{c.borrower_name}</td>
                                <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{c.borrower_type}</span></td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{new Date(c.checkout_date).toLocaleDateString('en-GB')}</td>
                                <td className={`px-4 py-2.5 text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{new Date(c.due_date).toLocaleDateString('en-GB')}{isOverdue && <span className="ml-1 text-[10px] text-red-500 font-bold">({daysOverdue}d late)</span>}</td>
                                <td className="px-4 py-2.5 text-sm text-green-600">{c.return_date ? new Date(c.return_date).toLocaleDateString('en-GB') : '-'}</td>
                                <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.status === 'Returned' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{isOverdue ? 'Overdue' : c.status}</span></td>
                                <td className="px-4 py-2.5 text-center">{c.status === 'Checked Out' && (
                                    <button onClick={() => handleReturn(c)} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg flex items-center gap-1 mx-auto"><FiCheck size={12} /> Return</button>
                                )}</td>
                            </tr>
                        );
                    })}
                </tbody></table>
            </div>

            {/* Issue Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <h2 className="text-lg font-bold text-white">Issue Book</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Book *</label>
                                <select value={form.book_id} onChange={e => setForm({...form, book_id: Number(e.target.value)})} className={inputCls}>
                                    <option value={0}>Select a book</option>{books.filter(b => b.available_copies > 0).map(b => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} avail)</option>)}
                                </select></div>
                            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Borrower *</label>
                                <select onChange={e => { const s = students.find(st => st.id === Number(e.target.value)); if (s) setForm({...form, borrower_name: `${s.first_name} ${s.last_name}`, borrower_id: s.admission_no || s.admission_number || '', borrower_type: 'Student'}); }} className={inputCls}>
                                    <option value="">Select student or type below</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no || s.admission_number})</option>)}
                                </select>
                                <input type="text" value={form.borrower_name} onChange={e => setForm({...form, borrower_name: e.target.value})} className={`${inputCls} mt-2`} placeholder="Or type borrower name" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Borrower Type</label><select value={form.borrower_type} onChange={e => setForm({...form, borrower_type: e.target.value})} className={inputCls}><option>Student</option><option>Teacher</option><option>Staff</option></select></div>
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Borrower ID</label><input type="text" value={form.borrower_id} onChange={e => setForm({...form, borrower_id: e.target.value})} className={inputCls} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Checkout Date</label><input type="date" value={form.checkout_date} onChange={e => setForm({...form, checkout_date: e.target.value})} className={inputCls} /></div>
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className={inputCls} /></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleCheckout} disabled={saving} className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiCheck size={14} /> Issue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

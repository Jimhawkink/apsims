'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiBox, FiPlus, FiSearch, FiEdit2, FiTrash2,
    FiDownload, FiX, FiSave, FiFilter, FiRefreshCw, FiCheck,
    FiAlertCircle, FiClock, FiChevronLeft, FiChevronRight,
    FiArrowRight, FiEye, FiCopy
} from 'react-icons/fi';

type LibraryTab = 'books' | 'checkout' | 'assets' | 'stores';

interface Book {
    id: number;
    title: string;
    author: string;
    isbn: string;
    category: string;
    publisher: string;
    year_published: number;
    total_copies: number;
    available_copies: number;
    shelf_location: string;
    condition: string;
    notes: string;
    status: string;
    created_at: string;
}

interface Checkout {
    id: number;
    book_id: number;
    book_title: string;
    borrower_name: string;
    borrower_type: string;
    borrower_id: string;
    checkout_date: string;
    due_date: string;
    return_date: string | null;
    status: string;
    fine_amount: number;
    notes: string;
    created_at: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const bookCategories = ['Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Language', 'Religious', 'General', 'Periodical'];

export default function LibraryInventoryPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<LibraryTab>('books');
    const [search, setSearch] = useState('');

    // Books
    const [books, setBooks] = useState<Book[]>([]);
    const [showBookModal, setShowBookModal] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [bookForm, setBookForm] = useState({
        title: '', author: '', isbn: '', category: 'Textbook', publisher: '',
        year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1,
        shelf_location: '', condition: 'Good', notes: '', status: 'Active',
    });

    // Checkout
    const [checkouts, setCheckouts] = useState<Checkout[]>([]);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        book_id: 0, book_title: '', borrower_name: '', borrower_type: 'Student',
        borrower_id: '', checkout_date: new Date().toISOString().split('T')[0],
        due_date: '', notes: '',
    });

    // Assets (from existing school_assets table)
    const [assets, setAssets] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const perPage = 15;
    const [filterCategory, setFilterCategory] = useState('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [booksRes, checkoutsRes, assetsRes] = await Promise.all([
                supabase.from('school_library_books').select('*').order('title'),
                supabase.from('school_library_checkouts').select('*').order('checkout_date', { ascending: false }),
                supabase.from('school_assets').select('*').order('asset_name'),
            ]);

            setBooks(booksRes.data || []);
            setCheckouts(checkoutsRes.data || []);
            setAssets(assetsRes.data || []);
        } catch (e) {
            console.error(e);
            // Tables may not exist yet
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Set default due date (14 days from checkout)
    useEffect(() => {
        if (checkoutForm.checkout_date && !checkoutForm.due_date) {
            const d = new Date(checkoutForm.checkout_date);
            d.setDate(d.getDate() + 14);
            setCheckoutForm(prev => ({ ...prev, due_date: d.toISOString().split('T')[0] }));
        }
    }, [checkoutForm.checkout_date]);

    // Filtered books
    const filteredBooks = books.filter(b => {
        if (filterCategory !== 'all' && b.category !== filterCategory) return false;
        if (search) {
            const q = search.toLowerCase();
            return b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').includes(q);
        }
        return true;
    });

    const totalPages = Math.ceil(filteredBooks.length / perPage);
    const paginatedBooks = filteredBooks.slice((page - 1) * perPage, page * perPage);

    // Stats
    const totalBooksCount = books.reduce((s, b) => s + (b.total_copies || 0), 0);
    const availableBooksCount = books.reduce((s, b) => s + (b.available_copies || 0), 0);
    const checkedOutCount = checkouts.filter(c => c.status === 'Checked Out').length;
    const overdueCount = checkouts.filter(c => c.status === 'Checked Out' && new Date(c.due_date) < new Date()).length;
    const totalAssetValue = assets.reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0), 0);

    // Save book
    const handleSaveBook = async () => {
        if (!bookForm.title.trim()) { toast.error('Book title required'); return; }
        setSaving(true);
        try {
            const payload = {
                title: bookForm.title.trim(), author: bookForm.author.trim(),
                isbn: bookForm.isbn.trim() || null, category: bookForm.category,
                publisher: bookForm.publisher.trim() || null,
                year_published: bookForm.year_published,
                total_copies: bookForm.total_copies, available_copies: bookForm.available_copies,
                shelf_location: bookForm.shelf_location.trim() || null,
                condition: bookForm.condition, notes: bookForm.notes || null,
                status: bookForm.status,
            };

            let error;
            if (editingBook) {
                ({ error } = await supabase.from('school_library_books').update(payload).eq('id', editingBook.id));
            } else {
                ({ error } = await supabase.from('school_library_books').insert([payload]));
            }
            if (error) throw error;
            toast.success(editingBook ? 'Book updated ✅' : 'Book added ✅');
            setShowBookModal(false);
            setEditingBook(null);
            fetchData();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const handleDeleteBook = async (id: number) => {
        if (!confirm('Delete this book?')) return;
        const { error } = await supabase.from('school_library_books').delete().eq('id', id);
        if (error) { toast.error('Delete failed'); return; }
        toast.success('Book deleted');
        fetchData();
    };

    // Checkout book
    const handleCheckout = async () => {
        if (!checkoutForm.book_id || !checkoutForm.borrower_name.trim()) { toast.error('Select a book and enter borrower details'); return; }
        setSaving(true);
        try {
            const book = books.find(b => b.id === checkoutForm.book_id);
            if (!book || book.available_copies <= 0) { toast.error('No copies available'); setSaving(false); return; }

            const { error } = await supabase.from('school_library_checkouts').insert([{
                book_id: checkoutForm.book_id,
                book_title: book.title,
                borrower_name: checkoutForm.borrower_name.trim(),
                borrower_type: checkoutForm.borrower_type,
                borrower_id: checkoutForm.borrower_id.trim() || null,
                checkout_date: checkoutForm.checkout_date,
                due_date: checkoutForm.due_date,
                status: 'Checked Out',
                notes: checkoutForm.notes || null,
            }]);
            if (error) throw error;

            // Decrease available copies
            await supabase.from('school_library_books').update({ available_copies: book.available_copies - 1 }).eq('id', book.id);

            toast.success('Book checked out ✅');
            setShowCheckoutModal(false);
            fetchData();
        } catch (e: any) { toast.error(e.message || 'Checkout failed'); }
        setSaving(false);
    };

    // Return book
    const handleReturn = async (checkout: Checkout) => {
        try {
            const { error } = await supabase.from('school_library_checkouts').update({
                status: 'Returned', return_date: new Date().toISOString().split('T')[0],
            }).eq('id', checkout.id);
            if (error) throw error;

            // Increase available copies
            const book = books.find(b => b.id === checkout.book_id);
            if (book) {
                await supabase.from('school_library_books').update({ available_copies: (book.available_copies || 0) + 1 }).eq('id', book.id);
            }
            toast.success('Book returned ✅');
            fetchData();
        } catch (e) { toast.error('Return failed'); }
    };

    const exportCSV = () => {
        if (filteredBooks.length === 0) return;
        const headers = ['#', 'Title', 'Author', 'ISBN', 'Category', 'Total', 'Available', 'Shelf', 'Condition'];
        const rows = filteredBooks.map((b, i) => [i + 1, b.title, b.author, b.isbn, b.category, b.total_copies, b.available_copies, b.shelf_location, b.condition]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `library_catalog_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Exported ✅');
    };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-indigo-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Library & Inventory...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiBookOpen className="text-teal-500" /> Library & Inventory
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage books, check-in/out, school assets, and store inventory</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Books', value: totalBooksCount, gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)', sub: `${books.length} titles` },
                    { label: 'Available', value: availableBooksCount, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', sub: 'Ready to lend' },
                    { label: 'Checked Out', value: checkedOutCount, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', sub: 'Currently borrowed' },
                    { label: 'Overdue', value: overdueCount, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', sub: 'Past due date' },
                    { label: 'Total Assets', value: assets.length, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', sub: fmt(totalAssetValue) },
                    { label: 'Categories', value: Array.from(new Set(books.map(b => b.category))).length, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', sub: 'Book types' },
                ].map((c, i) => (
                    <div key={i} className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: c.gradient }}>
                        <p className="text-xs font-semibold opacity-85 mb-1">{c.label}</p>
                        <p className="text-xl font-extrabold">{c.value}</p>
                        <p className="text-[10px] opacity-75 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'books' as LibraryTab, label: 'Book Catalog', icon: FiBookOpen },
                    { key: 'checkout' as LibraryTab, label: 'Check In / Out', icon: FiClock },
                    { key: 'assets' as LibraryTab, label: 'Assets Register', icon: FiBox },
                    { key: 'stores' as LibraryTab, label: 'Store Items', icon: FiCopy },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === t.key ? 'bg-white shadow-md text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Books Tab */}
            {tab === 'books' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" placeholder="Search by title, author, or ISBN..."
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none" />
                        </div>
                        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-teal-400 outline-none">
                            <option value="all">All Categories</option>
                            {bookCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center gap-2"><FiDownload size={14} /> Export</button>
                        <button onClick={() => {
                            setEditingBook(null);
                            setBookForm({ title: '', author: '', isbn: '', category: 'Textbook', publisher: '', year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1, shelf_location: '', condition: 'Good', notes: '', status: 'Active' });
                            setShowBookModal(true);
                        }} className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                            <FiPlus size={14} /> Add Book
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase min-w-[200px]">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Author</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ISBN</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Category</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Available</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Shelf</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Condition</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedBooks.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                                            <FiBookOpen className="mx-auto mb-2" size={28} />
                                            <p>No books found. Add your first book to get started.</p>
                                        </td></tr>
                                    ) : paginatedBooks.map((b, i) => (
                                        <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-semibold text-gray-800">{b.title}</p>
                                                {b.publisher && <p className="text-xs text-gray-400">{b.publisher} ({b.year_published})</p>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{b.author || '-'}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.isbn || '-'}</td>
                                            <td className="px-4 py-3 text-center"><span className="badge badge-info">{b.category}</span></td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{b.total_copies}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${b.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>{b.available_copies}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{b.shelf_location || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`badge ${b.condition === 'New' || b.condition === 'Good' ? 'badge-success' : b.condition === 'Fair' ? 'badge-warning' : 'badge-danger'}`}>{b.condition}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => { setEditingBook(b); setBookForm({ title: b.title, author: b.author || '', isbn: b.isbn || '', category: b.category, publisher: b.publisher || '', year_published: b.year_published, total_copies: b.total_copies, available_copies: b.available_copies, shelf_location: b.shelf_location || '', condition: b.condition, notes: b.notes || '', status: b.status }); setShowBookModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><FiEdit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteBook(b.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><FiTrash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                                <p className="text-xs text-gray-500">Page {page} of {totalPages} ({filteredBooks.length} books)</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronLeft size={16} /></button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><FiChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Check In/Out Tab */}
            {tab === 'checkout' && (
                <div className="space-y-5">
                    <div className="flex justify-end">
                        <button onClick={() => {
                            setCheckoutForm({ book_id: 0, book_title: '', borrower_name: '', borrower_type: 'Student', borrower_id: '', checkout_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' });
                            setShowCheckoutModal(true);
                        }} className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <FiPlus size={14} /> Issue Book
                        </button>
                    </div>

                    {/* Active Checkouts */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiClock className="text-blue-500" /> Active Checkouts</h3>
                            <span className="badge badge-blue">{checkedOutCount} books out</span>
                        </div>
                        {checkouts.filter(c => c.status === 'Checked Out').length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <FiBookOpen className="mx-auto mb-2" size={28} />
                                <p>No active checkouts</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead><tr><th>#</th><th>Book Title</th><th>Borrower</th><th>Type</th><th>Checkout Date</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {checkouts.filter(c => c.status === 'Checked Out').map((c, i) => {
                                            const isOverdue = new Date(c.due_date) < new Date();
                                            return (
                                                <tr key={c.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                                                    <td className="text-xs text-gray-400">{i + 1}</td>
                                                    <td className="font-semibold text-gray-800">{c.book_title}</td>
                                                    <td className="text-sm text-gray-700">{c.borrower_name}</td>
                                                    <td><span className="badge badge-info">{c.borrower_type}</span></td>
                                                    <td className="text-sm">{new Date(c.checkout_date).toLocaleDateString('en-KE')}</td>
                                                    <td className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {new Date(c.due_date).toLocaleDateString('en-KE')}
                                                        {isOverdue && <span className="ml-1 text-xs text-red-500 font-bold">OVERDUE</span>}
                                                    </td>
                                                    <td><span className={`badge ${isOverdue ? 'badge-danger' : 'badge-warning'}`}>{isOverdue ? 'Overdue' : 'Borrowed'}</span></td>
                                                    <td>
                                                        <button onClick={() => handleReturn(c)}
                                                            className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg flex items-center gap-1">
                                                            <FiCheck size={12} /> Return
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Return History */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiCheck className="text-green-500" /> Return History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Book</th><th>Borrower</th><th>Checkout</th><th>Returned</th><th>Status</th></tr></thead>
                                <tbody>
                                    {checkouts.filter(c => c.status === 'Returned').slice(0, 20).map((c, i) => (
                                        <tr key={c.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-semibold text-gray-800">{c.book_title}</td>
                                            <td className="text-sm text-gray-700">{c.borrower_name}</td>
                                            <td className="text-sm">{new Date(c.checkout_date).toLocaleDateString('en-KE')}</td>
                                            <td className="text-sm text-green-600 font-semibold">{c.return_date ? new Date(c.return_date).toLocaleDateString('en-KE') : '-'}</td>
                                            <td><span className="badge badge-success">Returned</span></td>
                                        </tr>
                                    ))}
                                    {checkouts.filter(c => c.status === 'Returned').length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">No returns recorded yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Assets Tab */}
            {tab === 'assets' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiBox className="text-purple-500" /> School Assets Register</h3>
                        <span className="badge badge-purple">{assets.length} assets • {fmt(totalAssetValue)} total value</span>
                    </div>
                    {assets.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <FiBox className="mx-auto mb-2" size={28} />
                            <p>No assets registered. Use the <a href="/dashboard/assets" className="text-indigo-600 font-semibold underline">Assets Manager</a> to add assets.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Asset Name</th><th>Code</th><th>Category</th><th>Location</th><th>Qty</th><th>Value</th><th>Condition</th><th>Status</th></tr></thead>
                                <tbody>
                                    {assets.map((a, i) => (
                                        <tr key={a.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-semibold text-gray-800">{a.asset_name}</td>
                                            <td className="text-xs font-mono text-indigo-600">{a.asset_code || '-'}</td>
                                            <td><span className="badge badge-info">{a.category || '-'}</span></td>
                                            <td className="text-sm text-gray-600">{a.location || '-'}</td>
                                            <td className="text-center font-bold">{a.quantity || 1}</td>
                                            <td className="font-bold text-green-600">{fmt(Number(a.current_value || a.purchase_price || 0))}</td>
                                            <td><span className={`badge ${a.condition === 'Good' || a.condition === 'New' ? 'badge-success' : a.condition === 'Fair' ? 'badge-warning' : 'badge-danger'}`}>{a.condition}</span></td>
                                            <td><span className={`badge ${a.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{a.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Stores Tab (Rim Paper + other consumables) */}
            {tab === 'stores' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiCopy className="text-amber-500" /> Store Items & Consumables</h3>
                        <a href="/dashboard/rim-paper" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">Rim Paper Module <FiArrowRight size={12} /></a>
                    </div>
                    <div className="p-8 text-center">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            <a href="/dashboard/rim-paper" className="bg-amber-50 border border-amber-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
                                <FiCopy className="mx-auto mb-3 text-amber-500" size={32} />
                                <p className="text-sm font-bold text-gray-800 group-hover:text-amber-700">Rim Paper</p>
                                <p className="text-xs text-gray-500 mt-1">Track paper stock</p>
                            </a>
                            <a href="/dashboard/assets" className="bg-purple-50 border border-purple-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
                                <FiBox className="mx-auto mb-3 text-purple-500" size={32} />
                                <p className="text-sm font-bold text-gray-800 group-hover:text-purple-700">Assets Manager</p>
                                <p className="text-xs text-gray-500 mt-1">Manage school assets</p>
                            </a>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 opacity-60">
                                <FiBox className="mx-auto mb-3 text-gray-400" size={32} />
                                <p className="text-sm font-bold text-gray-600">More Coming</p>
                                <p className="text-xs text-gray-400 mt-1">Lab, Kitchen, etc.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Book Modal */}
            {showBookModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBookModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                            <h2 className="text-lg font-bold text-white">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
                            <button onClick={() => setShowBookModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2"><label className={labelCls}>Title *</label><input type="text" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} className={inputCls} placeholder="Enter book title" /></div>
                                <div><label className={labelCls}>Author</label><input type="text" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} className={inputCls} /></div>
                                <div><label className={labelCls}>ISBN</label><input type="text" value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} className={inputCls} /></div>
                                <div><label className={labelCls}>Category</label><select value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })} className={inputCls}>{bookCategories.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className={labelCls}>Publisher</label><input type="text" value={bookForm.publisher} onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })} className={inputCls} /></div>
                                <div><label className={labelCls}>Year Published</label><input type="number" value={bookForm.year_published} onChange={e => setBookForm({ ...bookForm, year_published: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className={labelCls}>Total Copies</label><input type="number" value={bookForm.total_copies} onChange={e => setBookForm({ ...bookForm, total_copies: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className={labelCls}>Available Copies</label><input type="number" value={bookForm.available_copies} onChange={e => setBookForm({ ...bookForm, available_copies: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className={labelCls}>Shelf Location</label><input type="text" value={bookForm.shelf_location} onChange={e => setBookForm({ ...bookForm, shelf_location: e.target.value })} className={inputCls} placeholder="e.g. A1, B3" /></div>
                                <div><label className={labelCls}>Condition</label><select value={bookForm.condition} onChange={e => setBookForm({ ...bookForm, condition: e.target.value })} className={inputCls}><option>New</option><option>Good</option><option>Fair</option><option>Poor</option><option>Damaged</option></select></div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea value={bookForm.notes} onChange={e => setBookForm({ ...bookForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowBookModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveBook} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                                    <FiSave size={14} /> {editingBook ? 'Update' : 'Add Book'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCheckoutModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <h2 className="text-lg font-bold text-white">Issue Book</h2>
                            <button onClick={() => setShowCheckoutModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Book *</label>
                                <select value={checkoutForm.book_id} onChange={e => { const b = books.find(bb => bb.id === Number(e.target.value)); setCheckoutForm({ ...checkoutForm, book_id: Number(e.target.value), book_title: b?.title || '' }); }} className={inputCls}>
                                    <option value={0}>-- Select a book --</option>
                                    {books.filter(b => b.available_copies > 0).map(b => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>)}
                                </select>
                            </div>
                            <div><label className={labelCls}>Borrower Name *</label><input type="text" value={checkoutForm.borrower_name} onChange={e => setCheckoutForm({ ...checkoutForm, borrower_name: e.target.value })} className={inputCls} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Borrower Type</label><select value={checkoutForm.borrower_type} onChange={e => setCheckoutForm({ ...checkoutForm, borrower_type: e.target.value })} className={inputCls}><option>Student</option><option>Teacher</option><option>Staff</option></select></div>
                                <div><label className={labelCls}>Borrower ID</label><input type="text" value={checkoutForm.borrower_id} onChange={e => setCheckoutForm({ ...checkoutForm, borrower_id: e.target.value })} className={inputCls} placeholder="Adm/Staff No" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Checkout Date</label><input type="date" value={checkoutForm.checkout_date} onChange={e => setCheckoutForm({ ...checkoutForm, checkout_date: e.target.value })} className={inputCls} /></div>
                                <div><label className={labelCls}>Due Date</label><input type="date" value={checkoutForm.due_date} onChange={e => setCheckoutForm({ ...checkoutForm, due_date: e.target.value })} className={inputCls} /></div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea value={checkoutForm.notes} onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowCheckoutModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleCheckout} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                    <FiCheck size={14} /> Issue Book
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

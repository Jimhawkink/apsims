'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
    FiDownload, FiAlertCircle, FiCheckCircle, FiClock, FiUser, FiHash,
    FiArrowRight, FiArrowLeft, FiStar, FiFilter, FiCamera, FiBarChart2
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
const GENRES = ['Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Business', 'Agriculture', 'Home Science', 'Religion', 'Reference', 'Encyclopedia', 'Magazine', 'Newspaper', 'Other'];
type Tab = 'catalog' | 'checkout' | 'overdue' | 'members' | 'stats';

export default function UltraLibraryPage() {
    const [tab, setTab] = useState<Tab>('catalog');
    const [loading, setLoading] = useState(true);
    const [books, setBooks] = useState<any[]>([]);
    const [checkouts, setCheckouts] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterGenre, setFilterGenre] = useState('All');
    const [saving, setSaving] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    // Modals
    const [showBookModal, setShowBookModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    // Forms
    const emptyBook = { title: '', author: '', isbn: '', barcode: '', genre: 'Fiction', publisher: '', publish_year: '', copies_total: 1, copies_available: 1, shelf_location: '', condition: 'Good', notes: '' };
    const emptyCheckout = { book_id: 0, borrower_name: '', borrower_type: 'Student', borrower_id: '', due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], notes: '' };
    const [bookForm, setBookForm] = useState(emptyBook);
    const [checkoutForm, setCheckoutForm] = useState(emptyCheckout);
    const [scanBarcode, setScanBarcode] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [bRes, cRes, sRes] = await Promise.all([
            supabase.from('school_library_books').select('*').order('title'),
            supabase.from('school_library_checkouts').select('*').order('created_at', { ascending: false }).limit(1000),
            supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no'),
        ]);
        setBooks(bRes.data || []);
        setCheckouts(cRes.data || []);
        setMembers(sRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Stats
    const totalBooks = books.reduce((s, b) => s + (b.copies_total || 1), 0);
    const availableBooks = books.reduce((s, b) => s + (b.copies_available || 0), 0);
    const checkedOut = checkouts.filter(c => !c.returned_at);
    const overdueBooks = checkedOut.filter(c => c.due_date && new Date(c.due_date) < new Date());
    const todayCheckouts = checkouts.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString());
    const uniqueBorrowers = [...new Set(checkedOut.map(c => c.borrower_name))].length;

    const filtered = useMemo(() => {
        return books.filter(b => {
            if (filterGenre !== 'All' && b.genre !== filterGenre) return false;
            if (search) { const q = search.toLowerCase(); return b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').toLowerCase().includes(q) || (b.barcode || '').toLowerCase().includes(q); }
            return true;
        });
    }, [books, filterGenre, search]);

    // Save Book
    const saveBook = async () => {
        if (!bookForm.title.trim()) { toast.error('Book title required'); return; }
        setSaving(true);
        if (editing) {
            const { error } = await supabase.from('school_library_books').update(bookForm).eq('id', editing.id);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Book updated ✅');
        } else {
            const { error } = await supabase.from('school_library_books').insert([bookForm]);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Book added ✅');
        }
        setShowBookModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    // Checkout Book
    const checkoutBook = async () => {
        if (!checkoutForm.book_id || !checkoutForm.borrower_name.trim()) { toast.error('Select book and borrower'); return; }
        const book = books.find(b => b.id === checkoutForm.book_id);
        if (!book || (book.copies_available || 0) <= 0) { toast.error('No copies available'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_library_checkouts').insert([{
            book_id: checkoutForm.book_id, book_title: book.title, borrower_name: checkoutForm.borrower_name,
            borrower_type: checkoutForm.borrower_type, borrower_id: checkoutForm.borrower_id || null,
            checkout_date: new Date().toISOString(), due_date: checkoutForm.due_date, notes: checkoutForm.notes,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_library_books').update({ copies_available: Math.max(0, (book.copies_available || 1) - 1) }).eq('id', book.id);
        toast.success(`"${book.title}" checked out to ${checkoutForm.borrower_name} ✅`);
        setShowCheckoutModal(false); setCheckoutForm(emptyCheckout); setSaving(false); fetchAll();
    };

    // Return Book
    const returnBook = async (checkout: any) => {
        setSaving(true);
        await supabase.from('school_library_checkouts').update({ returned_at: new Date().toISOString() }).eq('id', checkout.id);
        const book = books.find(b => b.id === checkout.book_id);
        if (book) await supabase.from('school_library_books').update({ copies_available: (book.copies_available || 0) + 1 }).eq('id', book.id);
        toast.success(`"${checkout.book_title}" returned ✅`);
        setSaving(false); fetchAll();
    };

    // Barcode Scan
    const handleBarcodeScan = () => {
        if (!scanBarcode.trim()) return;
        const book = books.find(b => b.barcode === scanBarcode.trim() || b.isbn === scanBarcode.trim());
        if (book) {
            const activeCheckout = checkedOut.find(c => c.book_id === book.id);
            if (activeCheckout) {
                returnBook(activeCheckout);
                setShowScanModal(false); setScanBarcode('');
            } else if ((book.copies_available || 0) > 0) {
                setCheckoutForm({ ...emptyCheckout, book_id: book.id });
                setShowScanModal(false); setScanBarcode('');
                setShowCheckoutModal(true);
            } else {
                toast.error('No copies available for checkout');
            }
        } else {
            toast.error('Book not found. Check barcode/ISBN.');
        }
    };

    // Genre stats for dashboard
    const genreStats = useMemo(() => {
        const map: Record<string, number> = {};
        books.forEach(b => { map[b.genre] = (map[b.genre] || 0) + (b.copies_total || 1); });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [books]);

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 outline-none";

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>📚</div>
            <p className="text-sm font-bold text-gray-500">Loading Ultra Library…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #312e81 0%, #3730a3 40%, #4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)' }}>
                            <FiBookOpen className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                📚 Ultra Library Management
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-indigo-400 to-purple-500 text-white rounded-full">ULTRA</span>
                            </h1>
                            <p className="text-indigo-300 text-xs mt-0.5 font-medium">Catalog • Barcode Scan • Issue/Return • Overdue Tracking • Analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setScanBarcode(''); setShowScanModal(true); setTimeout(() => barcodeRef.current?.focus(), 100); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 flex items-center gap-1.5 shadow-md"><FiCamera size={12} /> Scan Barcode</button>
                        <button onClick={() => { setBookForm(emptyBook); setEditing(null); setShowBookModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 flex items-center gap-1.5 shadow-md"><FiPlus size={12} /> Add Book</button>
                        <button onClick={() => { setCheckoutForm(emptyCheckout); setShowCheckoutModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 shadow-md"><FiArrowRight size={12} /> Issue Book</button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Books', value: String(totalBooks), emoji: '📚' },
                            { label: 'Available', value: String(availableBooks), emoji: '✅' },
                            { label: 'Checked Out', value: String(checkedOut.length), emoji: '📤' },
                            { label: 'Overdue', value: String(overdueBooks.length), emoji: '⚠️', pulse: overdueBooks.length > 0 },
                            { label: 'Today Issues', value: String(todayCheckouts.length), emoji: '📅' },
                            { label: 'Active Borrowers', value: String(uniqueBorrowers), emoji: '👥' },
                        ].map((card, i) => (
                            <div key={i} className={`rounded-xl p-3 transition-all hover:scale-[1.03] ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-1"><span className="text-sm">{card.emoji}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span></div>
                                <p className="text-xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                    { k: 'catalog', l: '📚 Book Catalog', count: books.length },
                    { k: 'checkout', l: '📤 Active Checkouts', count: checkedOut.length },
                    { k: 'overdue', l: '⚠️ Overdue', count: overdueBooks.length },
                    { k: 'members', l: '👥 Borrowers', count: uniqueBorrowers },
                    { k: 'stats', l: '📊 Analytics', count: 0 },
                ] as { k: Tab; l: string; count: number }[]).map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                        style={tab === t.k ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        {t.l} {t.count > 0 && <span className="text-[10px] font-bold opacity-60">({t.count})</span>}
                    </button>
                ))}
            </div>

            {/* ═══ CATALOG ═══ */}
            {tab === 'catalog' && (
                <>
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN, barcode..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-white" /></div>
                        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none bg-white"><option value="All">All Genres</option>{GENRES.map(g => <option key={g}>{g}</option>)}</select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-16 text-center"><span className="text-5xl block mb-3">📚</span><p className="text-sm font-bold text-gray-600">No books in catalog</p><button onClick={() => { setBookForm(emptyBook); setEditing(null); setShowBookModal(true); }} className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><FiPlus size={12} className="inline mr-1" /> Add First Book</button></div>
                        ) : filtered.map(book => {
                            const isAvailable = (book.copies_available || 0) > 0;
                            return (
                                <div key={book.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                                    <div className="h-2" style={{ background: isAvailable ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}>📖</div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isAvailable ? `${book.copies_available} Available` : 'All Out'}</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">{book.title}</h3>
                                        <p className="text-[11px] text-gray-500 mb-2">{book.author || 'Unknown Author'}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{book.genre}</span>
                                            {book.isbn && <span className="text-[9px] font-mono px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">ISBN: {book.isbn}</span>}
                                            {book.barcode && <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">🔖 {book.barcode}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-3">
                                            <span>📍 {book.shelf_location || 'N/A'}</span>
                                            <span>•</span>
                                            <span>{book.copies_total || 1} copies</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                                            {isAvailable && (
                                                <button onClick={() => { setCheckoutForm({ ...emptyCheckout, book_id: book.id }); setShowCheckoutModal(true); }}
                                                    className="flex-1 px-2 py-1.5 text-[10px] font-bold text-white rounded-lg flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                                    <FiArrowRight size={10} /> Issue
                                                </button>
                                            )}
                                            <button onClick={() => { setEditing(book); setBookForm({ ...emptyBook, ...book }); setShowBookModal(true); }}
                                                className="px-2 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg flex items-center gap-1 hover:bg-indigo-100"><FiEdit2 size={10} /> Edit</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ═══ ACTIVE CHECKOUTS ═══ */}
            {tab === 'checkout' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Book', 'Borrower', 'Type', 'Checkout', 'Due Date', 'Days Left', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {checkedOut.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">✅</span><p className="text-sm">No books currently checked out</p></td></tr>
                                ) : checkedOut.map((c, i) => {
                                    const daysLeft = c.due_date ? Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000) : 0;
                                    const isOverdue = daysLeft < 0;
                                    return (
                                        <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{c.book_title}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-700">{c.borrower_name}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{c.borrower_type}</span></td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(c.checkout_date || c.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</td>
                                            <td className="px-3 py-2.5 text-xs" style={{ color: isOverdue ? '#ef4444' : '#6b7280', fontWeight: isOverdue ? 700 : 500 }}>{c.due_date ? new Date(c.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '-'}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : daysLeft <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</span></td>
                                            <td className="px-3 py-2.5">
                                                <button onClick={() => returnBook(c)} disabled={saving}
                                                    className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                                    <FiArrowLeft size={10} className="inline mr-0.5" /> Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ OVERDUE ═══ */}
            {tab === 'overdue' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {overdueBooks.length > 0 && <div className="px-5 py-2.5 bg-red-50 border-b border-red-200"><p className="text-xs font-bold text-red-700">⚠️ {overdueBooks.length} overdue book(s) — contact borrowers immediately!</p></div>}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-red-50/50 border-b border-red-200">
                                {['#', 'Book', 'Borrower', 'Due Date', 'Days Overdue', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-red-600 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {overdueBooks.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">✅</span><p className="text-sm font-medium">No overdue books!</p></td></tr>
                                ) : overdueBooks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map((c, i) => {
                                    const daysOverdue = Math.ceil((Date.now() - new Date(c.due_date).getTime()) / 86400000);
                                    return (
                                        <tr key={c.id} className="border-b border-gray-100 hover:bg-red-50/20">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{c.book_title}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-700">{c.borrower_name}</td>
                                            <td className="px-3 py-2.5 text-xs text-red-600 font-bold">{new Date(c.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-3 py-2.5"><span className="text-xs font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{daysOverdue} days</span></td>
                                            <td className="px-3 py-2.5"><button onClick={() => returnBook(c)} className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><FiArrowLeft size={10} className="inline mr-0.5" /> Return</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {tab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FiBarChart2 className="text-indigo-500" /> Books by Genre</h3>
                        <div className="space-y-2">
                            {genreStats.map(([genre, count]) => (
                                <div key={genre} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600 w-28 truncate">{genre}</span>
                                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (count / totalBooks) * 100)}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} /></div>
                                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FiUser className="text-indigo-500" /> Top Borrowers</h3>
                        <div className="space-y-2">
                            {(() => {
                                const bMap: Record<string, number> = {};
                                checkouts.forEach(c => { bMap[c.borrower_name] = (bMap[c.borrower_name] || 0) + 1; });
                                return Object.entries(bMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count], i) => (
                                    <div key={name} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: i < 3 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb', color: i < 3 ? '#fff' : '#6b7280' }}>{i + 1}</span>
                                        <span className="flex-1 text-xs font-semibold text-gray-700">{name}</span>
                                        <span className="text-xs font-bold text-indigo-600">{count} books</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ BORROWERS TAB ═══ */}
            {tab === 'members' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Borrower', 'Type', 'Total Checkouts', 'Currently Out', 'Overdue', 'Status'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {(() => {
                                    const bMap: Record<string, { total: number; active: number; overdue: number; type: string }> = {};
                                    checkouts.forEach(c => {
                                        if (!bMap[c.borrower_name]) bMap[c.borrower_name] = { total: 0, active: 0, overdue: 0, type: c.borrower_type };
                                        bMap[c.borrower_name].total++;
                                        if (!c.returned_at) { bMap[c.borrower_name].active++; if (c.due_date && new Date(c.due_date) < new Date()) bMap[c.borrower_name].overdue++; }
                                    });
                                    const list = Object.entries(bMap).sort((a, b) => b[1].total - a[1].total);
                                    return list.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">👥</span><p className="text-sm">No borrowing history</p></td></tr>
                                    ) : list.map(([name, stats], i) => (
                                        <tr key={name} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{name}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{stats.type}</span></td>
                                            <td className="px-3 py-2.5 text-sm text-gray-700">{stats.total}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold" style={{ color: stats.active > 0 ? '#f59e0b' : '#22c55e' }}>{stats.active}</td>
                                            <td className="px-3 py-2.5">{stats.overdue > 0 ? <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{stats.overdue} overdue</span> : <span className="text-xs text-green-500">✅</span>}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.overdue > 0 ? 'bg-red-100 text-red-700' : stats.active > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{stats.overdue > 0 ? 'Flagged' : stats.active > 0 ? 'Has Books' : 'Clear'}</span></td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ BARCODE SCAN MODAL ═══ */}
            {showScanModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowScanModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiCamera /> 📷 Barcode / ISBN Scanner</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                                <p className="text-xs font-bold text-green-700">Scan barcode or type ISBN — Auto detects Issue or Return</p>
                            </div>
                            <input ref={barcodeRef} value={scanBarcode} onChange={e => setScanBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBarcodeScan()} placeholder="Scan or type barcode/ISBN..." className="w-full px-4 py-4 text-lg font-bold text-center border-2 border-green-300 rounded-2xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" autoFocus />
                            <button onClick={handleBarcodeScan} className="w-full px-4 py-3 text-sm font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>🔍 Lookup Book</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ADD/EDIT BOOK MODAL ═══ */}
            {showBookModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowBookModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiBookOpen /> {editing ? 'Edit Book' : 'Add New Book'}</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Title *</label><input value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Author</label><input value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Genre</label><select value={bookForm.genre} onChange={e => setBookForm({ ...bookForm, genre: e.target.value })} className={inputCls}>{GENRES.map(g => <option key={g}>{g}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">ISBN</label><input value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} className={inputCls} placeholder="978-..." /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Barcode</label><input value={bookForm.barcode} onChange={e => setBookForm({ ...bookForm, barcode: e.target.value })} className={inputCls} placeholder="Scan barcode" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Copies</label><input type="number" value={bookForm.copies_total} onChange={e => setBookForm({ ...bookForm, copies_total: Number(e.target.value), copies_available: Number(e.target.value) })} className={inputCls} min="1" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Shelf Location</label><input value={bookForm.shelf_location} onChange={e => setBookForm({ ...bookForm, shelf_location: e.target.value })} className={inputCls} placeholder="e.g. A-12" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Publisher</label><input value={bookForm.publisher} onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Year</label><input value={bookForm.publish_year} onChange={e => setBookForm({ ...bookForm, publish_year: e.target.value })} className={inputCls} placeholder="2024" /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowBookModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={saveBook} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Book'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CHECKOUT MODAL ═══ */}
            {showCheckoutModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckoutModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiArrowRight /> Issue Book</h3></div>
                        <div className="p-6 space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Book *</label><select value={checkoutForm.book_id} onChange={e => setCheckoutForm({ ...checkoutForm, book_id: Number(e.target.value) })} className={inputCls}><option value={0}>Select book</option>{books.filter(b => (b.copies_available || 0) > 0).map(b => <option key={b.id} value={b.id}>{b.title} ({b.copies_available} avail.)</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Borrower Name *</label><input value={checkoutForm.borrower_name} onChange={e => setCheckoutForm({ ...checkoutForm, borrower_name: e.target.value })} className={inputCls} placeholder="Student/Teacher name" list="borrowers" /><datalist id="borrowers">{members.map(m => <option key={m.id} value={`${m.first_name} ${m.last_name}`} />)}</datalist></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Type</label><select value={checkoutForm.borrower_type} onChange={e => setCheckoutForm({ ...checkoutForm, borrower_type: e.target.value })} className={inputCls}><option>Student</option><option>Teacher</option><option>Staff</option><option>Other</option></select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Due Date</label><input type="date" value={checkoutForm.due_date} onChange={e => setCheckoutForm({ ...checkoutForm, due_date: e.target.value })} className={inputCls} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowCheckoutModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={checkoutBook} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{saving ? 'Issuing...' : 'Issue Book'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

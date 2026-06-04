'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiPlus, FiSearch, FiEdit2, FiTrash2,
    FiDownload, FiX, FiSave, FiRefreshCw, FiCheck,
    FiAlertCircle, FiClock, FiChevronLeft, FiChevronRight,
    FiArrowRight, FiBarChart2, FiUsers, FiBell,
    FiMapPin, FiPrinter, FiChevronDown, FiChevronUp,
    FiCheckCircle, FiGrid, FiList,
    FiArchive, FiTrendingUp, FiDollarSign,
} from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type LibraryTab = 'books' | 'checkouts' | 'history' | 'overdue' | 'reports';
type ViewMode = 'table' | 'grid';
type SortField = 'title' | 'author' | 'category' | 'available_copies' | 'total_copies' | 'year_published';
type SortDir = 'asc' | 'desc';

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
    cover_color?: string;
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
    renewed_count?: number;
}

interface BookFormData {
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
    cover_color: string;
}

interface CheckoutFormData {
    book_id: number;
    book_title: string;
    borrower_name: string;
    borrower_type: string;
    borrower_id: string;
    checkout_date: string;
    due_date: string;
    notes: string;
    loan_period: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

const bookCategories = [
    'Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science',
    'Mathematics', 'History', 'Language', 'Religious', 'General',
    'Periodical', 'Biography', 'Geography', 'Agriculture', 'Business',
    'Art & Music', 'Technology', 'Health & PE', 'Swahili Literature',
];

const coverColors = [
    '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c',
    '#16a34a', '#0891b2', '#9333ea', '#e11d48', '#d97706',
];

const FINE_PER_DAY = 5;
const LOAN_PERIODS = [7, 14, 21, 30];

const conditionConfig: Record<string, { color: string; bg: string; label: string }> = {
    'New': { color: '#16a34a', bg: '#dcfce7', label: 'New' },
    'Good': { color: '#0891b2', bg: '#cffafe', label: 'Good' },
    'Fair': { color: '#d97706', bg: '#fef3c7', label: 'Fair' },
    'Poor': { color: '#ea580c', bg: '#ffedd5', label: 'Poor' },
    'Damaged': { color: '#dc2626', bg: '#fee2e2', label: 'Damaged' },
};

const borrowerTypeConfig: Record<string, { color: string; bg: string }> = {
    'Student': { color: '#0891b2', bg: '#cffafe' },
    'Teacher': { color: '#7c3aed', bg: '#ede9fe' },
    'Staff': { color: '#d97706', bg: '#fef3c7' },
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ color, backgroundColor: bg }}>
            {children}
        </span>
    );
}

function ConditionBadge({ condition }: { condition: string }) {
    const cfg = conditionConfig[condition] ?? { color: '#6b7280', bg: '#f3f4f6', label: condition };
    return <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>;
}

function AvailabilityBar({ total, available }: { total: number; available: number }) {
    const pct = total > 0 ? (available / total) * 100 : 0;
    const color = pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626';
    return (
        <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-black tabular-nums" style={{ color }}>
                {available}/{total}
            </span>
        </div>
    );
}

function OverdueDaysTag({ dueDate }: { dueDate: string }) {
    const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
    if (days <= 0) return null;
    const fine = days * FINE_PER_DAY;
    return (
        <div className="flex items-center gap-1 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">
                <FiAlertCircle size={9} /> {days}d overdue
            </span>
            <span className="text-[10px] text-red-500 font-bold">{fmt(fine)}</span>
        </div>
    );
}

function EmptyState({ icon: Icon, title, sub, action }: {
    icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Icon size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-600">{title}</p>
            {sub && <p className="text-xs text-gray-400 mt-1 max-w-xs">{sub}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

function Modal({ title, subtitle, onClose, headerGradient, children, wide = false }: {
    title: string; subtitle?: string; onClose: () => void;
    headerGradient?: string; children: React.ReactNode; wide?: boolean;
}) {
    const grad = headerGradient || 'linear-gradient(135deg,#134e4a,#0f766e)';
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <div
                className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[92vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
                style={{ animation: 'libModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <div className="flex items-center justify-between px-7 py-5 rounded-t-3xl flex-shrink-0"
                    style={{ background: grad }}>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
                        {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-7 space-y-5">
                    {children}
                </div>
            </div>
            <style>{`@keyframes libModalIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>
    );
}

function FormField({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

const inputCls = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none transition-all placeholder:text-gray-300';
const selectCls = `${inputCls} cursor-pointer`;

function BookCard({ book, onEdit, onDelete, onIssue }: {
    book: Book; onEdit: (b: Book) => void; onDelete: (id: number) => void; onIssue: (b: Book) => void;
}) {
    const color = book.cover_color || coverColors[book.id % coverColors.length];
    const pct = book.total_copies > 0 ? (book.available_copies / book.total_copies) * 100 : 0;
    const avColor = pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626';
    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
            <div className="relative h-32 flex items-end p-4"
                style={{ background: `linear-gradient(135deg, ${color}ee, ${color}99)` }}>
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg,white 0,white 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
                <div className="relative z-10 w-full">
                    <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur rounded text-white text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        {book.category}
                    </span>
                    <h3 className="text-white font-black text-sm leading-tight line-clamp-2">{book.title}</h3>
                    <p className="text-white/80 text-[11px] mt-0.5">{book.author || 'Unknown Author'}</p>
                </div>
                <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => onEdit(book)}
                        className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow text-xs">
                        <FiEdit2 size={11} />
                    </button>
                    <button onClick={() => onDelete(book.id)}
                        className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow">
                        <FiTrash2 size={11} />
                    </button>
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono truncate">{book.isbn || 'No ISBN'}</span>
                    <ConditionBadge condition={book.condition} />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Availability</span>
                        <span className="text-[10px] font-black" style={{ color: avColor }}>
                            {book.available_copies}/{book.total_copies}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: avColor }} />
                    </div>
                </div>
                {book.shelf_location && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <FiMapPin size={9} />
                        <span>Shelf: <strong className="text-gray-700">{book.shelf_location}</strong></span>
                    </div>
                )}
                <button onClick={() => onIssue(book)} disabled={book.available_copies === 0}
                    className="mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                        background: book.available_copies > 0 ? `linear-gradient(135deg,${color},${color}bb)` : '#f3f4f6',
                        color: book.available_copies > 0 ? 'white' : '#9ca3af',
                        cursor: book.available_copies > 0 ? 'pointer' : 'not-allowed',
                    }}>
                    {book.available_copies > 0 ? '📤 Issue This Book' : '✗ All Copies Out'}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LibraryInventoryPage() {
    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<LibraryTab>('books');
    const [search, setSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [sortField, setSortField] = useState<SortField>('title');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterCondition, setFilterCondition] = useState('all');
    const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
    const [page, setPage] = useState(1);
    const perPage = 20;

    const [books, setBooks] = useState<Book[]>([]);
    const [checkouts, setCheckouts] = useState<Checkout[]>([]);

    const [showBookModal, setShowBookModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [selectedCheckout, setSelectedCheckout] = useState<Checkout | null>(null);
    const [returnFineAmount, setReturnFineAmount] = useState(0);
    const [fineWaived, setFineWaived] = useState(false);

    const [bookForm, setBookForm] = useState<BookFormData>({
        title: '', author: '', isbn: '', category: 'Textbook', publisher: '',
        year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1,
        shelf_location: '', condition: 'Good', notes: '', status: 'Active',
        cover_color: coverColors[0],
    });

    const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>({
        book_id: 0, book_title: '', borrower_name: '', borrower_type: 'Student',
        borrower_id: '', checkout_date: new Date().toISOString().split('T')[0],
        due_date: '', notes: '', loan_period: 14,
    });

    // ── Derived data ─────────────────────────────────────────────────────────
    const activeCheckouts = useMemo(() => checkouts.filter(c => c.status === 'Checked Out'), [checkouts]);
    const overdueCheckouts = useMemo(() => activeCheckouts.filter(c => new Date(c.due_date) < new Date()), [activeCheckouts]);
    const returnHistory = useMemo(() => checkouts.filter(c => c.status === 'Returned'), [checkouts]);

    const stats = useMemo(() => ({
        totalCopies: books.reduce((s, b) => s + (b.total_copies || 0), 0),
        availableCopies: books.reduce((s, b) => s + (b.available_copies || 0), 0),
        uniqueTitles: books.length,
        checkedOut: activeCheckouts.length,
        overdue: overdueCheckouts.length,
        totalFines: overdueCheckouts.reduce((s, c) => {
            const days = Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000);
            return s + Math.max(0, days) * FINE_PER_DAY;
        }, 0),
        finesCollected: returnHistory.reduce((s, c) => s + Number(c.fine_amount || 0), 0),
    }), [books, activeCheckouts, overdueCheckouts, returnHistory]);

    const filteredBooks = useMemo(() => {
        let result = [...books];
        if (filterCategory !== 'all') result = result.filter(b => b.category === filterCategory);
        if (filterCondition !== 'all') result = result.filter(b => b.condition === filterCondition);
        if (filterAvailability === 'available') result = result.filter(b => b.available_copies > 0);
        if (filterAvailability === 'unavailable') result = result.filter(b => b.available_copies === 0);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(b =>
                b.title.toLowerCase().includes(q) ||
                (b.author || '').toLowerCase().includes(q) ||
                (b.isbn || '').includes(q) ||
                (b.shelf_location || '').toLowerCase().includes(q) ||
                (b.publisher || '').toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            const av = (a as unknown as Record<string, unknown>)[sortField] ?? '';
            const bv = (b as unknown as Record<string, unknown>)[sortField] ?? '';
            const cmp = typeof av === 'string' && typeof bv === 'string'
                ? av.localeCompare(bv)
                : (av as number) - (bv as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [books, search, filterCategory, filterCondition, filterAvailability, sortField, sortDir]);

    const totalPages = Math.ceil(filteredBooks.length / perPage);
    const paginatedBooks = filteredBooks.slice((page - 1) * perPage, page * perPage);

    const filteredHistory = useMemo(() => {
        if (!historySearch.trim()) return returnHistory;
        const q = historySearch.toLowerCase();
        return returnHistory.filter(c =>
            c.book_title.toLowerCase().includes(q) ||
            c.borrower_name.toLowerCase().includes(q) ||
            (c.borrower_id || '').toLowerCase().includes(q)
        );
    }, [returnHistory, historySearch]);

    // ── Category stats for reports ────────────────────────────────────────────
    const categoryStats = useMemo(() => {
        const map: Record<string, number> = {};
        books.forEach(b => { map[b.category] = (map[b.category] || 0) + b.total_copies; });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }, [books]);

    const topBorrowed = useMemo(() => {
        const map: Record<string, number> = {};
        checkouts.forEach(c => { map[c.book_title] = (map[c.book_title] || 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [checkouts]);

    const borrowerBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        checkouts.forEach(c => { map[c.borrower_type] = (map[c.borrower_type] || 0) + 1; });
        return map;
    }, [checkouts]);

    const monthlyCheckouts = useMemo(() => {
        const map: Record<string, number> = {};
        checkouts.forEach(c => {
            const d = new Date(c.checkout_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).sort().slice(-6);
    }, [checkouts]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [booksRes, checkoutsRes] = await Promise.all([
                supabase.from('school_library_books').select('*').order('title'),
                supabase.from('school_library_checkouts').select('*').order('checkout_date', { ascending: false }),
            ]);
            setBooks(booksRes.data || []);
            setCheckouts(checkoutsRes.data || []);
        } catch {
            toast.error('Failed to load library data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-calculate due date
    useEffect(() => {
        if (checkoutForm.checkout_date && checkoutForm.loan_period) {
            const d = new Date(checkoutForm.checkout_date);
            d.setDate(d.getDate() + checkoutForm.loan_period);
            setCheckoutForm(prev => ({ ...prev, due_date: d.toISOString().split('T')[0] }));
        }
    }, [checkoutForm.checkout_date, checkoutForm.loan_period]);

    // ── Sort handler ──────────────────────────────────────────────────────────
    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
        setPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) =>
        sortField === field
            ? (sortDir === 'asc'
                ? <FiChevronUp size={11} className="inline ml-0.5 text-teal-500" />
                : <FiChevronDown size={11} className="inline ml-0.5 text-teal-500" />)
            : <span className="inline ml-0.5 text-gray-300 text-xs">↕</span>;

    // ── Book CRUD ─────────────────────────────────────────────────────────────
    const openAddBook = () => {
        setEditingBook(null);
        setBookForm({
            title: '', author: '', isbn: '', category: 'Textbook', publisher: '',
            year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1,
            shelf_location: '', condition: 'Good', notes: '', status: 'Active',
            cover_color: coverColors[Math.floor(Math.random() * coverColors.length)],
        });
        setShowBookModal(true);
    };

    const openEditBook = (b: Book) => {
        setEditingBook(b);
        setBookForm({
            title: b.title, author: b.author || '', isbn: b.isbn || '',
            category: b.category, publisher: b.publisher || '',
            year_published: b.year_published, total_copies: b.total_copies,
            available_copies: b.available_copies, shelf_location: b.shelf_location || '',
            condition: b.condition, notes: b.notes || '', status: b.status,
            cover_color: b.cover_color || coverColors[b.id % coverColors.length],
        });
        setShowBookModal(true);
    };

    const handleSaveBook = async () => {
        if (!bookForm.title.trim()) { toast.error('Book title is required'); return; }
        if (bookForm.available_copies > bookForm.total_copies) {
            toast.error('Available copies cannot exceed total copies'); return;
        }
        setSaving(true);
        try {
            const payload = {
                title: bookForm.title.trim(),
                author: bookForm.author.trim() || null,
                isbn: bookForm.isbn.trim() || null,
                category: bookForm.category,
                publisher: bookForm.publisher.trim() || null,
                year_published: bookForm.year_published,
                total_copies: bookForm.total_copies,
                available_copies: bookForm.available_copies,
                shelf_location: bookForm.shelf_location.trim() || null,
                condition: bookForm.condition,
                notes: bookForm.notes || null,
                status: bookForm.status,
                cover_color: bookForm.cover_color,
            };
            if (editingBook) {
                const { error } = await supabase.from('school_library_books')
                    .update(payload as Record<string, unknown>).eq('id', editingBook.id);
                if (error) throw error;
                toast.success('✅ Book updated successfully');
            } else {
                const { error } = await supabase.from('school_library_books').insert([payload]);
                if (error) throw error;
                toast.success('✅ Book added to catalog');
            }
            setShowBookModal(false);
            setEditingBook(null);
            fetchData();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Failed to save book');
        }
        setSaving(false);
    };

    const handleDeleteBook = async (id: number) => {
        if (activeCheckouts.some(c => c.book_id === id)) {
            toast.error('Cannot delete — this book has active checkouts'); return;
        }
        if (!confirm('Permanently delete this book from the catalog?')) return;
        const { error } = await supabase.from('school_library_books').delete().eq('id', id);
        if (error) { toast.error('Delete failed'); return; }
        toast.success('Book removed from catalog');
        fetchData();
    };

    // ── Checkout ──────────────────────────────────────────────────────────────
    const openIssueBook = (book?: Book) => {
        setCheckoutForm({
            book_id: book?.id || 0,
            book_title: book?.title || '',
            borrower_name: '', borrower_type: 'Student',
            borrower_id: '', checkout_date: new Date().toISOString().split('T')[0],
            due_date: '', notes: '', loan_period: 14,
        });
        setShowCheckoutModal(true);
    };

    const handleCheckout = async () => {
        if (!checkoutForm.book_id) { toast.error('Please select a book'); return; }
        if (!checkoutForm.borrower_name.trim()) { toast.error('Borrower name is required'); return; }
        if (!checkoutForm.due_date) { toast.error('Due date is required'); return; }
        setSaving(true);
        try {
            const book = books.find(b => b.id === checkoutForm.book_id);
            if (!book || book.available_copies <= 0) {
                toast.error('No copies available for checkout'); setSaving(false); return;
            }
            const { error: ce } = await supabase.from('school_library_checkouts').insert([{
                book_id: checkoutForm.book_id,
                book_title: book.title,
                borrower_name: checkoutForm.borrower_name.trim(),
                borrower_type: checkoutForm.borrower_type,
                borrower_id: checkoutForm.borrower_id.trim() || null,
                checkout_date: checkoutForm.checkout_date,
                due_date: checkoutForm.due_date,
                status: 'Checked Out',
                notes: checkoutForm.notes || null,
                fine_amount: 0,
                renewed_count: 0,
            }]);
            if (ce) throw ce;
            const { error: be } = await supabase.from('school_library_books')
                .update({ available_copies: book.available_copies - 1 } as Record<string, unknown>)
                .eq('id', book.id);
            if (be) throw be;
            toast.success(`📤 "${book.title}" issued to ${checkoutForm.borrower_name}`);
            setShowCheckoutModal(false);
            fetchData();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Checkout failed');
        }
        setSaving(false);
    };

    // ── Return ────────────────────────────────────────────────────────────────
    const openReturnModal = (checkout: Checkout) => {
        setSelectedCheckout(checkout);
        const days = Math.floor((Date.now() - new Date(checkout.due_date).getTime()) / 86400000);
        setReturnFineAmount(Math.max(0, days) * FINE_PER_DAY);
        setFineWaived(false);
        setShowReturnModal(true);
    };

    const handleReturn = async () => {
        if (!selectedCheckout) return;
        setSaving(true);
        try {
            const finalFine = fineWaived ? 0 : returnFineAmount;
            const { error: re } = await supabase.from('school_library_checkouts')
                .update({
                    status: 'Returned',
                    return_date: new Date().toISOString().split('T')[0],
                    fine_amount: finalFine,
                } as Record<string, unknown>)
                .eq('id', selectedCheckout.id);
            if (re) throw re;
            const book = books.find(b => b.id === selectedCheckout.book_id);
            if (book) {
                await supabase.from('school_library_books')
                    .update({ available_copies: (book.available_copies || 0) + 1 } as Record<string, unknown>)
                    .eq('id', book.id);
            }
            toast.success(`📥 "${selectedCheckout.book_title}" returned${finalFine > 0 ? ` — Fine: ${fmt(finalFine)}` : ' — No fine'}`);
            setShowReturnModal(false);
            setSelectedCheckout(null);
            fetchData();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Return failed');
        }
        setSaving(false);
    };

    // ── Renew ─────────────────────────────────────────────────────────────────
    const handleRenew = async (checkout: Checkout, extraDays: number) => {
        setSaving(true);
        try {
            const newDue = new Date(checkout.due_date);
            newDue.setDate(newDue.getDate() + extraDays);
            const { error } = await supabase.from('school_library_checkouts')
                .update({
                    due_date: newDue.toISOString().split('T')[0],
                    renewed_count: (checkout.renewed_count || 0) + 1,
                } as Record<string, unknown>)
                .eq('id', checkout.id);
            if (error) throw error;
            toast.success(`🔄 Renewed for ${extraDays} more days`);
            fetchData();
        } catch (e: unknown) {
            toast.error((e as Error).message || 'Renewal failed');
        }
        setSaving(false);
    };

    // ── Export functions ──────────────────────────────────────────────────────
    const exportCatalogCSV = () => {
        if (filteredBooks.length === 0) { toast.error('No books to export'); return; }
        const headers = ['#', 'Title', 'Author', 'ISBN', 'Category', 'Publisher', 'Year', 'Total Copies', 'Available', 'Shelf', 'Condition', 'Status'];
        const rows = filteredBooks.map((b, i) => [
            i + 1, `"${b.title}"`, `"${b.author || ''}"`, b.isbn || '',
            b.category, `"${b.publisher || ''}"`, b.year_published,
            b.total_copies, b.available_copies, b.shelf_location || '', b.condition, b.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `library_catalog_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success(`Exported ${filteredBooks.length} books`);
    };

    const exportCheckoutsCSV = () => {
        const headers = ['#', 'Book Title', 'Borrower', 'Type', 'ID/Adm No', 'Checkout Date', 'Due Date', 'Status'];
        const rows = activeCheckouts.map((c, i) => [
            i + 1, `"${c.book_title}"`, `"${c.borrower_name}"`,
            c.borrower_type, c.borrower_id || '', c.checkout_date, c.due_date, c.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `active_checkouts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Checkouts exported');
    };

    const printOverdueReport = async () => {
        const schoolRes = await supabase.from('school_details').select('school_name,address,phone').single();
        const school = schoolRes.data;
        const html = `<!DOCTYPE html><html><head><title>Overdue Books Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#fff;padding:24px}
.header{background:linear-gradient(135deg,#991b1b,#b91c1c);color:white;padding:20px 24px;border-radius:12px;margin-bottom:20px}
.header h1{font-size:20px;font-weight:800;letter-spacing:-0.5px}
.header p{font-size:12px;opacity:0.8;margin-top:4px}
.school{font-size:13px;font-weight:700;margin-bottom:2px}
.meta{display:flex;gap:24px;margin-bottom:16px;background:#fef2f2;border:1px solid #fecaca;padding:12px 16px;border-radius:8px}
.meta-item{text-align:center}.meta-item .val{font-size:22px;font-weight:900;color:#dc2626}
.meta-item .lbl{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;font-size:11px}
thead tr{background:#991b1b;color:white}
thead th{padding:10px 8px;text-align:left;font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase}
tbody tr:nth-child(even){background:#fff5f5}
tbody tr:hover{background:#fee2e2}
td{padding:8px;border-bottom:1px solid #f3f4f6}
.fine{color:#dc2626;font-weight:800}
tfoot tr{background:#fee2e2}
tfoot td{padding:10px 8px;font-weight:800;color:#991b1b;font-size:12px}
@media print{body{padding:0}.header{border-radius:0}}
</style></head><body>
<div class="header">
  <div class="school">${school?.school_name || 'School Library'}</div>
  <div>${school?.address || ''} ${school?.phone ? '· ' + school.phone : ''}</div>
  <h1 style="margin-top:10px">⚠ Overdue Books Report</h1>
  <p>Generated: ${new Date().toLocaleString('en-KE')}</p>
</div>
<div class="meta">
  <div class="meta-item"><div class="val">${overdueCheckouts.length}</div><div class="lbl">Overdue Books</div></div>
  <div class="meta-item"><div class="val" style="color:#b45309">KES ${stats.totalFines.toLocaleString()}</div><div class="lbl">Total Fines Due</div></div>
  <div class="meta-item"><div class="val" style="color:#065f46">${FINE_PER_DAY}</div><div class="lbl">KES/Day Fine</div></div>
</div>
<table>
<thead><tr><th>#</th><th>Book Title</th><th>Borrower</th><th>Type</th><th>ID/Adm No</th><th>Due Date</th><th>Days Overdue</th><th>Fine (KES)</th></tr></thead>
<tbody>
${overdueCheckouts.map((c, i) => {
            const days = Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000);
            const fine = Math.max(0, days) * FINE_PER_DAY;
            return `<tr>
  <td>${i + 1}</td>
  <td><strong>${c.book_title}</strong></td>
  <td>${c.borrower_name}</td>
  <td>${c.borrower_type}</td>
  <td>${c.borrower_id || '—'}</td>
  <td>${fmtDate(c.due_date)}</td>
  <td class="fine">${days} days</td>
  <td class="fine">KES ${fine.toLocaleString()}</td>
</tr>`;
        }).join('')}
</tbody>
<tfoot><tr>
  <td colspan="7">TOTAL OUTSTANDING FINES</td>
  <td>KES ${stats.totalFines.toLocaleString()}</td>
</tr></tfoot>
</table>
</body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl opacity-15"
                        style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }} />
                    <div className="absolute inset-0 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
                    <FiBookOpen className="absolute inset-0 m-auto text-teal-500" size={22} />
                </div>
                <p className="text-sm font-bold text-gray-600">Loading Library System...</p>
                <p className="text-xs text-gray-400 mt-1">Fetching books & checkouts</p>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-0 pb-10">
            <style>{`
                @keyframes libPulseBadge{0%,100%{opacity:1}50%{opacity:.6}}
                .lib-pulse{animation:libPulseBadge 2s infinite}
                .lib-tbl th{position:sticky;top:0;z-index:1;background:#f9fafb}
            `}</style>

            {/* ═══════════════════════════════════════════════════════════════
                HERO SECTION
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl mb-6"
                style={{ background: 'linear-gradient(135deg,#134e4a 0%,#0f766e 40%,#0d9488 100%)' }}>
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #99f6e4, transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #5eead4, transparent)', transform: 'translate(-30%,30%)' }} />

                <div className="relative z-10 p-8 pb-0">
                    {/* Title row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-2xl bg-white/15 backdrop-blur">
                                    <FiBookOpen size={26} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-black text-white tracking-tight">
                                            📚 Library Management System
                                        </h1>
                                        <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur rounded-full text-white text-[10px] font-black tracking-widest uppercase border border-white/30">
                                            ULTRA
                                        </span>
                                    </div>
                                    <p className="text-teal-100/80 text-sm mt-0.5 font-medium">
                                        Books · Checkouts · Fines · Reports · Asset Tracking
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {stats.overdue > 0 && (
                                <button onClick={() => setTab('overdue')}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/20 border border-red-300/40 rounded-xl text-white text-xs font-bold hover:bg-red-500/30 transition-colors lib-pulse">
                                    <FiBell size={13} /> {stats.overdue} Overdue
                                </button>
                            )}
                            <button onClick={openAddBook}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-teal-800 rounded-xl text-xs font-black hover:bg-teal-50 transition-colors shadow-lg">
                                <FiPlus size={14} /> Add Book
                            </button>
                            <button onClick={() => openIssueBook()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white/15 border border-white/30 text-white rounded-xl text-xs font-bold hover:bg-white/25 transition-colors backdrop-blur">
                                <FiArrowRight size={14} /> Issue Book
                            </button>
                            <button onClick={exportCatalogCSV}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 border border-white/30 text-white rounded-xl text-xs font-bold hover:bg-white/25 transition-colors backdrop-blur">
                                <FiDownload size={14} /> Export
                            </button>
                            <button onClick={fetchData}
                                className="p-2.5 bg-white/15 border border-white/30 text-white rounded-xl hover:bg-white/25 transition-colors backdrop-blur">
                                <FiRefreshCw size={15} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pb-6">
                        {[
                            {
                                label: 'Total Titles', value: stats.uniqueTitles.toLocaleString(),
                                sub: `${stats.totalCopies} total copies`, icon: FiBookOpen,
                                onClick: () => { setTab('books'); setFilterAvailability('all'); },
                            },
                            {
                                label: 'Total Copies', value: stats.totalCopies.toLocaleString(),
                                sub: `across ${stats.uniqueTitles} titles`, icon: FiArchive,
                                onClick: () => setTab('books'),
                            },
                            {
                                label: 'Available', value: stats.availableCopies.toLocaleString(),
                                sub: `${stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0}% of collection`,
                                icon: FiCheckCircle, highlight: true,
                                onClick: () => { setTab('books'); setFilterAvailability('available'); },
                            },
                            {
                                label: 'Checked Out', value: stats.checkedOut.toLocaleString(),
                                sub: 'currently borrowed', icon: FiUsers,
                                onClick: () => setTab('checkouts'),
                            },
                            {
                                label: 'Overdue', value: stats.overdue.toLocaleString(),
                                sub: stats.overdue > 0 ? `${fmt(stats.totalFines)} due` : 'All on time ✓',
                                icon: FiAlertCircle, danger: stats.overdue > 0,
                                onClick: () => setTab('overdue'),
                            },
                            {
                                label: 'Fines Due', value: fmt(stats.totalFines),
                                sub: `${fmt(stats.finesCollected)} collected`, icon: FiDollarSign,
                                onClick: () => setTab('overdue'),
                            },
                        ].map((kpi, i) => {
                            const Icon = kpi.icon;
                            return (
                                <button key={i} onClick={kpi.onClick}
                                    className="group text-left bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-2xl p-4 transition-all hover:-translate-y-0.5 cursor-pointer">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="p-1.5 rounded-xl bg-white/20">
                                            <Icon size={15} className="text-white" />
                                        </div>
                                        {kpi.danger && (
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-300 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-200" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xl font-black text-white leading-none">{kpi.value}</p>
                                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">{kpi.label}</p>
                                    {kpi.sub && <p className="text-[9px] text-white/50 mt-0.5">{kpi.sub}</p>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TABS
            ═══════════════════════════════════════════════════════════════ */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
                {([
                    { key: 'books' as LibraryTab, label: '📚 Books Catalog', count: books.length },
                    { key: 'checkouts' as LibraryTab, label: '📤 Active Checkouts', count: activeCheckouts.length, alert: stats.overdue > 0 },
                    { key: 'history' as LibraryTab, label: '🕐 History', count: returnHistory.length },
                    { key: 'overdue' as LibraryTab, label: '⚠️ Overdue', count: overdueCheckouts.length, danger: true },
                    { key: 'reports' as LibraryTab, label: '📊 Reports' },
                ] as Array<{ key: LibraryTab; label: string; count?: number; alert?: boolean; danger?: boolean }>).map(t => {
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex-shrink-0 border ${active
                                ? 'text-white border-transparent shadow-lg'
                                : 'text-gray-500 bg-white border-gray-200 hover:border-teal-200 hover:text-teal-700'
                                }`}
                            style={active ? { background: 'linear-gradient(135deg,#134e4a,#0d9488)' } : {}}>
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${active
                                    ? 'bg-white/25 text-white'
                                    : t.danger && t.count > 0
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📚 BOOKS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'books' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                                <input type="text"
                                    placeholder="Search title, author, ISBN, shelf, publisher..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-teal-400 outline-none transition-all" />
                                {search && (
                                    <button onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                        <FiX size={14} />
                                    </button>
                                )}
                            </div>
                            <select value={filterCategory}
                                onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none cursor-pointer min-w-[140px]">
                                <option value="all">All Categories</option>
                                {bookCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={filterCondition}
                                onChange={e => { setFilterCondition(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none cursor-pointer min-w-[130px]">
                                <option value="all">All Conditions</option>
                                {Object.keys(conditionConfig).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={filterAvailability}
                                onChange={e => { setFilterAvailability(e.target.value as 'all' | 'available' | 'unavailable'); setPage(1); }}
                                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none cursor-pointer min-w-[130px]">
                                <option value="all">All Status</option>
                                <option value="available">Available</option>
                                <option value="unavailable">All Out</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium">
                                    Showing <strong className="text-gray-700">{filteredBooks.length}</strong> of <strong className="text-gray-700">{books.length}</strong> books
                                </span>
                                {(filterCategory !== 'all' || filterAvailability !== 'all' || filterCondition !== 'all' || search) && (
                                    <button onClick={() => { setFilterCategory('all'); setFilterAvailability('all'); setFilterCondition('all'); setSearch(''); setPage(1); }}
                                        className="text-xs text-teal-600 font-bold hover:text-teal-800 flex items-center gap-1">
                                        <FiX size={11} /> Clear filters
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-teal-600' : 'text-gray-400'}`}>
                                        <FiList size={13} />
                                    </button>
                                    <button onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-gray-400'}`}>
                                        <FiGrid size={13} />
                                    </button>
                                </div>
                                <button onClick={exportCatalogCSV}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors">
                                    <FiDownload size={12} /> Export CSV
                                </button>
                                <button onClick={openAddBook}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>
                                    <FiPlus size={13} /> Add Book
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid View */}
                    {viewMode === 'grid' ? (
                        paginatedBooks.length === 0 ? (
                            <EmptyState icon={FiBookOpen} title="No books found"
                                sub="Try adjusting your filters or add books to the catalog"
                                action={
                                    <button onClick={openAddBook}
                                        className="px-5 py-2.5 text-sm font-bold text-white rounded-xl"
                                        style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>
                                        <FiPlus size={13} className="inline mr-1" /> Add First Book
                                    </button>
                                } />
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {paginatedBooks.map(book => (
                                    <BookCard key={book.id} book={book}
                                        onEdit={openEditBook}
                                        onDelete={handleDeleteBook}
                                        onIssue={b => openIssueBook(b)} />
                                ))}
                            </div>
                        )
                    ) : (
                        /* Table View */
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full lib-tbl">
                                    <thead>
                                        <tr className="bg-gray-50/90 border-b border-gray-200">
                                            {([
                                                { key: null, label: '#', cls: 'w-10' },
                                                { key: 'title' as SortField, label: 'Title & Publisher', cls: 'min-w-[220px]' },
                                                { key: 'author' as SortField, label: 'Author', cls: '' },
                                                { key: null, label: 'ISBN', cls: '' },
                                                { key: 'category' as SortField, label: 'Category', cls: '' },
                                                { key: 'available_copies' as SortField, label: 'Availability', cls: '' },
                                                { key: null, label: 'Shelf', cls: '' },
                                                { key: null, label: 'Condition', cls: '' },
                                                { key: null, label: 'Actions', cls: 'w-28' },
                                            ] as Array<{ key: SortField | null; label: string; cls: string }>).map((col, ci) => (
                                                <th key={ci}
                                                    className={`px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest ${col.cls} ${col.key ? 'cursor-pointer hover:text-teal-600' : ''}`}
                                                    onClick={() => col.key && handleSort(col.key)}>
                                                    {col.label} {col.key && <SortIcon field={col.key} />}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedBooks.length === 0 ? (
                                            <tr><td colSpan={9}>
                                                <EmptyState icon={FiBookOpen} title="No books found"
                                                    sub="Try adjusting your filters or search terms"
                                                    action={
                                                        <button onClick={openAddBook}
                                                            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl"
                                                            style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>
                                                            Add First Book
                                                        </button>
                                                    } />
                                            </td></tr>
                                        ) : paginatedBooks.map((b, i) => {
                                            const color = b.cover_color || coverColors[b.id % coverColors.length];
                                            return (
                                                <tr key={b.id}
                                                    className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors group">
                                                    <td className="px-4 py-3.5 text-xs text-gray-300 font-mono">
                                                        {(page - 1) * perPage + i + 1}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1 h-10 rounded-full flex-shrink-0"
                                                                style={{ background: `linear-gradient(to bottom,${color},${color}55)` }} />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 leading-tight">{b.title}</p>
                                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                                    {[b.publisher, b.year_published].filter(Boolean).join(' · ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-sm text-gray-600">{b.author || <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-400">{b.isbn || <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-4 py-3.5">
                                                        <Badge color="#0891b2" bg="#cffafe">{b.category}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <AvailabilityBar total={b.total_copies} available={b.available_copies} />
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {b.shelf_location
                                                            ? <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                                                                <FiMapPin size={10} />{b.shelf_location}
                                                            </span>
                                                            : <span className="text-gray-300 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3.5"><ConditionBadge condition={b.condition} /></td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openIssueBook(b)}
                                                                disabled={b.available_copies === 0}
                                                                title="Issue book"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                                <FiArrowRight size={13} />
                                                            </button>
                                                            <button onClick={() => openEditBook(b)}
                                                                title="Edit"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                                                <FiEdit2 size={13} />
                                                            </button>
                                                            <button onClick={() => handleDeleteBook(b.id)}
                                                                title="Delete"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <p className="text-xs text-gray-400 font-medium">
                                        Page <strong className="text-gray-600">{page}</strong> of <strong className="text-gray-600">{totalPages}</strong>
                                        <span className="ml-2 text-gray-300">·</span>
                                        <span className="ml-2">{filteredBooks.length} results</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPage(1)} disabled={page === 1}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 font-medium">
                                            First
                                        </button>
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                                            <FiChevronLeft size={13} />
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                                            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + idx;
                                            return p <= totalPages ? (
                                                <button key={p} onClick={() => setPage(p)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${p === page ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                                                    {p}
                                                </button>
                                            ) : null;
                                        })}
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                                            <FiChevronRight size={13} />
                                        </button>
                                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 font-medium">
                                            Last
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                📤 ACTIVE CHECKOUTS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'checkouts' && (
                <div className="space-y-4">
                    {overdueCheckouts.length > 0 && (
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 border border-red-200 rounded-2xl lib-pulse">
                            <FiAlertCircle size={18} className="text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-red-700">
                                    {overdueCheckouts.length} book{overdueCheckouts.length > 1 ? 's' : ''} overdue
                                </p>
                                <p className="text-xs text-red-500">{fmt(stats.totalFines)} in outstanding fines</p>
                            </div>
                            <button onClick={printOverdueReport}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors">
                                <FiPrinter size={12} /> Print Report
                            </button>
                        </div>
                    )}

                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-50">
                                    <FiClock size={17} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Active Checkouts</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{activeCheckouts.length} books currently borrowed</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={exportCheckoutsCSV}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                                    <FiDownload size={12} /> Export CSV
                                </button>
                                <button onClick={() => openIssueBook()}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                    <FiPlus size={13} /> Issue Book
                                </button>
                            </div>
                        </div>

                        {activeCheckouts.length === 0 ? (
                            <EmptyState icon={FiCheckCircle} title="No active checkouts"
                                sub="All books are in the library. Issue a book to get started." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full lib-tbl">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200">
                                            {['#', 'Book', 'Borrower', 'ID/Adm No', 'Issued', 'Due Date', 'Status', 'Renewals', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeCheckouts.map((c, i) => {
                                            const isOverdue = new Date(c.due_date) < new Date();
                                            const daysLeft = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
                                            const btc = borrowerTypeConfig[c.borrower_type] || { color: '#6b7280', bg: '#f3f4f6' };
                                            return (
                                                <tr key={c.id}
                                                    className={`border-b border-gray-100 transition-colors ${isOverdue ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/60'}`}>
                                                    <td className="px-4 py-3.5 text-xs text-gray-300 font-mono">{i + 1}</td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-sm font-bold text-gray-800 leading-tight">{c.book_title}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-sm font-semibold text-gray-700">{c.borrower_name}</p>
                                                        <Badge color={btc.color} bg={btc.bg}>{c.borrower_type}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-500">{c.borrower_id || '—'}</td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">{fmtDate(c.checkout_date)}</td>
                                                    <td className="px-4 py-3.5">
                                                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                                                            {fmtDate(c.due_date)}
                                                        </p>
                                                        {isOverdue
                                                            ? <OverdueDaysTag dueDate={c.due_date} />
                                                            : <p className="text-[10px] text-gray-400 mt-0.5">{daysLeft}d remaining</p>}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {isOverdue
                                                            ? <Badge color="#dc2626" bg="#fee2e2">🔴 Overdue</Badge>
                                                            : daysLeft <= 3
                                                                ? <Badge color="#d97706" bg="#fef3c7">⚠ Due Soon</Badge>
                                                                : <Badge color="#16a34a" bg="#dcfce7">✓ On Time</Badge>}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className="text-xs font-black text-gray-500">{c.renewed_count || 0}×</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <button onClick={() => openReturnModal(c)}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-colors">
                                                                <FiCheck size={11} /> Return
                                                            </button>
                                                            {(c.renewed_count || 0) < 2 && !isOverdue && (
                                                                <button onClick={() => handleRenew(c, 14)}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors">
                                                                    <FiRefreshCw size={11} /> Renew
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                🕐 HISTORY TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-50">
                                    <FiArchive size={17} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Return History</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{returnHistory.length} transactions · Fines collected: <strong className="text-purple-600">{fmt(stats.finesCollected)}</strong></p>
                                </div>
                            </div>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                                <input type="text"
                                    placeholder="Search history..."
                                    value={historySearch}
                                    onChange={e => setHistorySearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-medium focus:border-teal-400 outline-none w-48" />
                            </div>
                        </div>
                        {filteredHistory.length === 0 ? (
                            <EmptyState icon={FiArchive} title="No return history yet"
                                sub="Returned books will appear here with full transaction records" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full lib-tbl">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200">
                                            {['#', 'Book Title', 'Borrower', 'Type', 'Checked Out', 'Returned', 'Duration', 'Fine', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.map((c, i) => {
                                            const duration = c.return_date
                                                ? Math.ceil((new Date(c.return_date).getTime() - new Date(c.checkout_date).getTime()) / 86400000)
                                                : null;
                                            const wasLate = c.return_date && new Date(c.return_date) > new Date(c.due_date);
                                            return (
                                                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-gray-300 font-mono">{i + 1}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{c.book_title}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{c.borrower_name}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge color="#6b7280" bg="#f3f4f6">{c.borrower_type}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.checkout_date)}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-green-600">{c.return_date ? fmtDate(c.return_date) : '—'}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{duration ? `${duration} days` : '—'}</td>
                                                    <td className="px-4 py-3 text-xs font-bold">
                                                        {Number(c.fine_amount) > 0
                                                            ? <span className="text-red-600">{fmt(Number(c.fine_amount))}</span>
                                                            : <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {wasLate
                                                            ? <Badge color="#d97706" bg="#fef3c7">Returned Late</Badge>
                                                            : <Badge color="#16a34a" bg="#dcfce7">On Time</Badge>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-purple-50 border-t-2 border-purple-100">
                                            <td colSpan={7} className="px-4 py-3 text-xs font-black text-purple-700 uppercase tracking-wide">
                                                Total Fines Collected
                                            </td>
                                            <td className="px-4 py-3 text-sm font-black text-purple-700">
                                                {fmt(returnHistory.reduce((s, c) => s + Number(c.fine_amount || 0), 0))}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ⚠️ OVERDUE TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'overdue' && (
                <div className="space-y-4">
                    {/* Overdue summary banner */}
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c)' }}>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%,white 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <FiAlertCircle size={20} className="text-red-200" />
                                    <h2 className="text-lg font-black">Overdue Books</h2>
                                </div>
                                <p className="text-red-200 text-sm">
                                    {overdueCheckouts.length} book{overdueCheckouts.length !== 1 ? 's' : ''} overdue ·
                                    <span className="font-black ml-1">{fmt(stats.totalFines)}</span> total outstanding
                                </p>
                                <p className="text-red-300/70 text-xs mt-1">Fine rate: KES {FINE_PER_DAY} per day</p>
                            </div>
                            <button onClick={printOverdueReport}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-700 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors shadow-lg">
                                <FiPrinter size={15} /> Print Overdue Report
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        {overdueCheckouts.length === 0 ? (
                            <EmptyState icon={FiCheckCircle} title="No overdue books! 🎉"
                                sub="All borrowed books are within their due dates. Great job!" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full lib-tbl">
                                    <thead>
                                        <tr className="bg-red-50 border-b border-red-100">
                                            {['#', 'Book', 'Borrower', 'Type', 'ID/Adm No', 'Due Date', 'Days Overdue', 'Fine (KES)', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-red-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overdueCheckouts.map((c, i) => {
                                            const days = Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000);
                                            const fine = Math.max(0, days) * FINE_PER_DAY;
                                            const btc = borrowerTypeConfig[c.borrower_type] || { color: '#6b7280', bg: '#f3f4f6' };
                                            return (
                                                <tr key={c.id}
                                                    className="border-b border-red-50 hover:bg-red-50/60 transition-colors">
                                                    <td className="px-4 py-3.5 text-xs text-red-300 font-mono">{i + 1}</td>
                                                    <td className="px-4 py-3.5 text-sm font-bold text-gray-800">{c.book_title}</td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-sm font-semibold text-gray-700">{c.borrower_name}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <Badge color={btc.color} bg={btc.bg}>{c.borrower_type}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-500">{c.borrower_id || '—'}</td>
                                                    <td className="px-4 py-3.5 text-sm font-bold text-red-600">{fmtDate(c.due_date)}</td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black">
                                                            <FiAlertCircle size={10} /> {days} days
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-sm font-black text-red-600">{fmt(fine)}</td>
                                                    <td className="px-4 py-3.5">
                                                        <button onClick={() => openReturnModal(c)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-colors">
                                                            <FiCheck size={11} /> Return & Collect Fine
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-red-50 border-t-2 border-red-200">
                                            <td colSpan={7} className="px-4 py-3 text-xs font-black text-red-700 uppercase tracking-wide">
                                                Total Outstanding Fines
                                            </td>
                                            <td className="px-4 py-3 text-base font-black text-red-700">{fmt(stats.totalFines)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                📊 REPORTS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'reports' && (
                <div className="space-y-5">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Titles', value: stats.uniqueTitles, color: '#0d9488', icon: FiBookOpen },
                            { label: 'Total Volumes', value: stats.totalCopies, color: '#2563eb', icon: FiArchive },
                            { label: 'Transactions', value: checkouts.length, color: '#7c3aed', icon: FiTrendingUp },
                            { label: 'Fines Collected', value: fmt(stats.finesCollected), color: '#d97706', icon: FiDollarSign },
                        ].map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                                            <Icon size={17} style={{ color: s.color }} />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Books by Category Chart */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-teal-50">
                                    <FiBarChart2 size={16} className="text-teal-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Books by Category</h3>
                                    <p className="text-xs text-gray-400">Top 10 categories by volume</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                {categoryStats.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">No data available</p>
                                ) : (() => {
                                    const maxVal = categoryStats[0][1];
                                    const barColors = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#9333ea', '#e11d48', '#d97706'];
                                    return categoryStats.map(([cat, count], i) => (
                                        <div key={cat} className="flex items-center gap-3 group">
                                            <div className="w-24 text-xs font-semibold text-gray-500 truncate text-right flex-shrink-0">
                                                {cat}
                                            </div>
                                            <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                                                <div
                                                    className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                                                    style={{
                                                        width: `${(count / maxVal) * 100}%`,
                                                        background: `linear-gradient(90deg,${barColors[i % barColors.length]}99,${barColors[i % barColors.length]})`,
                                                        minWidth: '24px',
                                                    }}>
                                                    <span className="text-[9px] text-white font-black">{count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Borrower Type Breakdown */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-50">
                                    <FiUsers size={16} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Borrower Breakdown</h3>
                                    <p className="text-xs text-gray-400">Checkouts by borrower type</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {checkouts.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">No checkout data</p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(borrowerBreakdown).map(([type, count]) => {
                                            const total = checkouts.length;
                                            const pct = Math.round((count / total) * 100);
                                            const btc = borrowerTypeConfig[type] || { color: '#6b7280', bg: '#f3f4f6' };
                                            return (
                                                <div key={type}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: btc.color }} />
                                                            <span className="text-sm font-bold text-gray-700">{type}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black" style={{ color: btc.color }}>{count}</span>
                                                            <span className="text-xs text-gray-400">({pct}%)</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%`, backgroundColor: btc.color }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="pt-3 border-t border-gray-100">
                                            <p className="text-xs text-gray-400 font-medium">Total checkouts: <strong className="text-gray-700">{checkouts.length}</strong></p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top 10 Most Borrowed */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-yellow-50">
                                    <FiTrendingUp size={16} className="text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Top 10 Most Borrowed</h3>
                                    <p className="text-xs text-gray-400">All-time popular titles</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-2">
                                {topBorrowed.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">No checkout data</p>
                                ) : topBorrowed.map(([title, count], i) => (
                                    <div key={title} className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 text-sm text-gray-700 font-medium truncate">{title}</span>
                                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-black flex-shrink-0">
                                            {count}×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Monthly Checkouts */}
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-50">
                                    <FiBarChart2 size={16} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800">Monthly Checkouts</h3>
                                    <p className="text-xs text-gray-400">Last 6 months activity</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {monthlyCheckouts.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">No checkout data</p>
                                ) : (() => {
                                    const maxM = Math.max(...monthlyCheckouts.map(m => m[1]));
                                    return (
                                        <div className="space-y-3">
                                            {monthlyCheckouts.map(([month, count]) => {
                                                const [yr, mo] = month.split('-');
                                                const label = new Date(Number(yr), Number(mo) - 1, 1)
                                                    .toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
                                                return (
                                                    <div key={month} className="flex items-center gap-3">
                                                        <div className="w-16 text-xs font-semibold text-gray-500 flex-shrink-0">{label}</div>
                                                        <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                                                            <div
                                                                className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                                                                style={{
                                                                    width: `${maxM > 0 ? (count / maxM) * 100 : 0}%`,
                                                                    background: 'linear-gradient(90deg,#9333ea99,#9333ea)',
                                                                    minWidth: '24px',
                                                                }}>
                                                                <span className="text-[9px] text-white font-black">{count}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Condition breakdown */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-black text-gray-800">Book Condition Summary</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Physical state of the entire collection</p>
                        </div>
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {Object.entries(conditionConfig).map(([cond, cfg]) => {
                                const count = books.filter(b => b.condition === cond).length;
                                const pct = books.length > 0 ? Math.round((count / books.length) * 100) : 0;
                                return (
                                    <div key={cond} className="text-center p-4 rounded-2xl border-2"
                                        style={{ borderColor: `${cfg.color}30`, backgroundColor: cfg.bg }}>
                                        <p className="text-2xl font-black" style={{ color: cfg.color }}>{count}</p>
                                        <p className="text-xs font-black uppercase tracking-wide mt-1" style={{ color: cfg.color }}>{cond}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{pct}% of collection</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ADD/EDIT BOOK MODAL
            ═══════════════════════════════════════════════════════════════ */}
            {showBookModal && (
                <Modal
                    title={editingBook ? '✏️ Edit Book' : '📖 Add New Book'}
                    subtitle={editingBook ? `Editing: ${editingBook.title}` : 'Add a book to the library catalog'}
                    onClose={() => setShowBookModal(false)}
                    headerGradient="linear-gradient(135deg,#134e4a,#0f766e)"
                    wide>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <FormField label="Book Title" required>
                                <input type="text" placeholder="e.g. Kenya Certificate of Secondary Education Biology"
                                    value={bookForm.title}
                                    onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))}
                                    className={inputCls} />
                            </FormField>
                        </div>
                        <FormField label="Author">
                            <input type="text" placeholder="Author name"
                                value={bookForm.author}
                                onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="ISBN">
                            <input type="text" placeholder="978-..."
                                value={bookForm.isbn}
                                onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Category" required>
                            <select value={bookForm.category}
                                onChange={e => setBookForm(p => ({ ...p, category: e.target.value }))}
                                className={selectCls}>
                                {bookCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Condition" required>
                            <select value={bookForm.condition}
                                onChange={e => setBookForm(p => ({ ...p, condition: e.target.value }))}
                                className={selectCls}>
                                {Object.keys(conditionConfig).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Publisher">
                            <input type="text" placeholder="Publisher name"
                                value={bookForm.publisher}
                                onChange={e => setBookForm(p => ({ ...p, publisher: e.target.value }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Year Published">
                            <input type="number" min={1900} max={new Date().getFullYear()}
                                value={bookForm.year_published}
                                onChange={e => setBookForm(p => ({ ...p, year_published: Number(e.target.value) }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Total Copies" required>
                            <input type="number" min={1}
                                value={bookForm.total_copies}
                                onChange={e => setBookForm(p => ({ ...p, total_copies: Number(e.target.value) }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Available Copies" required>
                            <input type="number" min={0} max={bookForm.total_copies}
                                value={bookForm.available_copies}
                                onChange={e => setBookForm(p => ({ ...p, available_copies: Number(e.target.value) }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Shelf Location">
                            <input type="text" placeholder="e.g. A3, Science-Shelf-2"
                                value={bookForm.shelf_location}
                                onChange={e => setBookForm(p => ({ ...p, shelf_location: e.target.value }))}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Status">
                            <select value={bookForm.status}
                                onChange={e => setBookForm(p => ({ ...p, status: e.target.value }))}
                                className={selectCls}>
                                <option value="Active">Active</option>
                                <option value="Withdrawn">Withdrawn</option>
                                <option value="Lost">Lost</option>
                            </select>
                        </FormField>
                        <div className="sm:col-span-2">
                            <FormField label="Notes">
                                <textarea rows={2} placeholder="Additional notes about this book..."
                                    value={bookForm.notes}
                                    onChange={e => setBookForm(p => ({ ...p, notes: e.target.value }))}
                                    className={inputCls + ' resize-none'} />
                            </FormField>
                        </div>
                        <div className="sm:col-span-2">
                            <FormField label="Cover Color" hint="Pick a color for the book card accent">
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                    {coverColors.map(color => (
                                        <button key={color} type="button"
                                            onClick={() => setBookForm(p => ({ ...p, cover_color: color }))}
                                            className={`w-9 h-9 rounded-xl border-2 transition-all ${bookForm.cover_color === color ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: color }} />
                                    ))}
                                    <div className="flex items-center gap-2 ml-2">
                                        <div className="w-9 h-9 rounded-xl border-2 border-gray-200"
                                            style={{ backgroundColor: bookForm.cover_color }} />
                                        <span className="text-xs text-gray-400 font-mono">{bookForm.cover_color}</span>
                                    </div>
                                </div>
                            </FormField>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => setShowBookModal(false)}
                            className="px-5 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSaveBook} disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg,#134e4a,#0d9488)' }}>
                            {saving ? <><FiRefreshCw size={15} className="animate-spin" /> Saving...</> : <><FiSave size={15} /> {editingBook ? 'Update Book' : 'Add to Catalog'}</>}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ISSUE BOOK MODAL
            ═══════════════════════════════════════════════════════════════ */}
            {showCheckoutModal && (
                <Modal
                    title="📤 Issue Book"
                    subtitle="Loan a book from the library catalog"
                    onClose={() => setShowCheckoutModal(false)}
                    headerGradient="linear-gradient(135deg,#1e3a5f,#1d4ed8)">
                    <div className="space-y-5">
                        <FormField label="Select Book" required>
                            <select value={checkoutForm.book_id}
                                onChange={e => {
                                    const book = books.find(b => b.id === Number(e.target.value));
                                    setCheckoutForm(p => ({ ...p, book_id: Number(e.target.value), book_title: book?.title || '' }));
                                }}
                                className={selectCls}>
                                <option value={0}>— Choose an available book —</option>
                                {books.filter(b => b.available_copies > 0).map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.title} ({b.available_copies} available)
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <div className="grid grid-cols-2 gap-5">
                            <FormField label="Borrower Type" required>
                                <select value={checkoutForm.borrower_type}
                                    onChange={e => setCheckoutForm(p => ({ ...p, borrower_type: e.target.value }))}
                                    className={selectCls}>
                                    <option value="Student">Student</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Staff">Staff</option>
                                </select>
                            </FormField>
                            <FormField label="ID / Adm No">
                                <input type="text" placeholder="Student/Staff ID"
                                    value={checkoutForm.borrower_id}
                                    onChange={e => setCheckoutForm(p => ({ ...p, borrower_id: e.target.value }))}
                                    className={inputCls} />
                            </FormField>
                        </div>

                        <FormField label="Borrower Full Name" required>
                            <input type="text" placeholder="Enter borrower's full name"
                                value={checkoutForm.borrower_name}
                                onChange={e => setCheckoutForm(p => ({ ...p, borrower_name: e.target.value }))}
                                className={inputCls} />
                        </FormField>

                        <div className="grid grid-cols-2 gap-5">
                            <FormField label="Checkout Date" required>
                                <input type="date"
                                    value={checkoutForm.checkout_date}
                                    onChange={e => setCheckoutForm(p => ({ ...p, checkout_date: e.target.value }))}
                                    className={inputCls} />
                            </FormField>
                            <FormField label="Loan Period">
                                <select value={checkoutForm.loan_period}
                                    onChange={e => setCheckoutForm(p => ({ ...p, loan_period: Number(e.target.value) }))}
                                    className={selectCls}>
                                    {LOAN_PERIODS.map(d => <option key={d} value={d}>{d} days</option>)}
                                </select>
                            </FormField>
                        </div>

                        {checkoutForm.due_date && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <FiClock size={15} className="text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">
                                    Due date: <strong>{fmtDate(checkoutForm.due_date)}</strong>
                                </span>
                            </div>
                        )}

                        <FormField label="Notes">
                            <textarea rows={2} placeholder="Optional notes..."
                                value={checkoutForm.notes}
                                onChange={e => setCheckoutForm(p => ({ ...p, notes: e.target.value }))}
                                className={inputCls + ' resize-none'} />
                        </FormField>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setShowCheckoutModal(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">
                                Cancel
                            </button>
                            <button onClick={handleCheckout} disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
                                {saving ? <><FiRefreshCw size={15} className="animate-spin" /> Processing...</> : <><FiArrowRight size={15} /> Issue Book</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                RETURN MODAL
            ═══════════════════════════════════════════════════════════════ */}
            {showReturnModal && selectedCheckout && (
                <Modal
                    title="📥 Return Book"
                    subtitle="Process book return and collect any outstanding fines"
                    onClose={() => setShowReturnModal(false)}
                    headerGradient="linear-gradient(135deg,#14532d,#16a34a)">
                    <div className="space-y-5">
                        {/* Book info */}
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Checkout Details</h4>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                {[
                                    { label: 'Book', value: selectedCheckout.book_title },
                                    { label: 'Borrower', value: selectedCheckout.borrower_name },
                                    { label: 'Type', value: selectedCheckout.borrower_type },
                                    { label: 'ID/Adm No', value: selectedCheckout.borrower_id || '—' },
                                    { label: 'Issued', value: fmtDate(selectedCheckout.checkout_date) },
                                    { label: 'Due Date', value: fmtDate(selectedCheckout.due_date) },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fine summary */}
                        {returnFineAmount > 0 ? (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <FiAlertCircle size={18} className="text-red-600" />
                                    <h4 className="text-sm font-black text-red-700">Overdue Fine</h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-black text-red-600">{fmt(fineWaived ? 0 : returnFineAmount)}</p>
                                        <p className="text-xs text-red-400 mt-1">
                                            {Math.round(returnFineAmount / FINE_PER_DAY)} days × KES {FINE_PER_DAY}/day
                                        </p>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div className={`relative w-11 h-6 rounded-full transition-colors ${fineWaived ? 'bg-green-500' : 'bg-gray-300'}`}
                                            onClick={() => setFineWaived(f => !f)}>
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${fineWaived ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-600">Waive Fine</span>
                                    </label>
                                </div>
                                {fineWaived && (
                                    <div className="mt-3 flex items-center gap-2 text-green-600 text-xs font-bold">
                                        <FiCheckCircle size={13} /> Fine waived — student returns for free
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                                <FiCheckCircle size={18} className="text-green-600" />
                                <div>
                                    <p className="text-sm font-bold text-green-700">No fine applicable</p>
                                    <p className="text-xs text-green-500">Book returned on or before due date</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setShowReturnModal(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">
                                Cancel
                            </button>
                            <button onClick={handleReturn} disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }}>
                                {saving ? <><FiRefreshCw size={15} className="animate-spin" /> Processing...</> : <><FiCheck size={15} /> Confirm Return{returnFineAmount > 0 && !fineWaived ? ` & Collect ${fmt(returnFineAmount)}` : ''}</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

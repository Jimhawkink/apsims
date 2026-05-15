'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBookOpen, FiBox, FiPlus, FiSearch, FiEdit2, FiTrash2,
    FiDownload, FiX, FiSave, FiRefreshCw, FiCheck,
    FiAlertCircle, FiClock, FiChevronLeft, FiChevronRight,
    FiArrowRight, FiBarChart2, FiUsers, FiZap, FiBell,
    FiMapPin, FiPrinter, FiChevronDown, FiChevronUp,
    FiCheckCircle, FiXCircle, FiGrid, FiList,
    FiActivity, FiArchive, FiPackage, FiCopy,
} from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
type LibraryTab = 'books' | 'checkout' | 'history' | 'assets' | 'reports' | 'stores';
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
    created_at: string;
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
    created_at: string;
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
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

const bookCategories = [
    'Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science',
    'Mathematics', 'History', 'Language', 'Religious', 'General',
    'Periodical', 'Biography', 'Geography', 'Agriculture', 'Business',
    'Art & Music', 'Technology', 'Health & PE', 'Swahili Literature'
];

const coverColors = [
    '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c',
    '#16a34a', '#0891b2', '#9333ea', '#e11d48', '#d97706'
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

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, gradient, icon: Icon, pulse, onClick
}: {
    label: string; value: string | number; sub?: string;
    gradient: string; icon: React.ElementType;
    pulse?: boolean; onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`relative rounded-2xl p-5 text-white overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
            style={{ background: gradient }}
        >
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                        <Icon size={18} className="text-white" />
                    </div>
                    {pulse && (
                        <span className="flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                        </span>
                    )}
                </div>
                <p className="text-3xl font-black tracking-tight">{value}</p>
                <p className="text-xs font-semibold opacity-90 mt-1 uppercase tracking-widest">{label}</p>
                {sub && <p className="text-[10px] opacity-70 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

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
        <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
                {available}/{total}
            </span>
        </div>
    );
}

function OverdueDaysTag({ dueDate }: { dueDate: string }) {
    const days = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / 86400000);
    if (days <= 0) return null;
    const fine = days * FINE_PER_DAY;
    return (
        <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">
                <FiAlertCircle size={10} /> {days}d overdue
            </span>
            <span className="text-[10px] text-red-500 font-bold">{fmt(fine)}</span>
        </div>
    );
}

function BookCard({ book, onEdit, onDelete, onIssue }: {
    book: Book;
    onEdit: (b: Book) => void;
    onDelete: (id: number) => void;
    onIssue: (b: Book) => void;
}) {
    const color = book.cover_color || coverColors[book.id % coverColors.length];
    const pct = book.total_copies > 0 ? (book.available_copies / book.total_copies) * 100 : 0;
    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
            <div className="relative h-32 flex items-end p-4"
                style={{ background: `linear-gradient(135deg, ${color}ee, ${color}99)` }}>
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: `repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)`, backgroundSize: '12px 12px' }} />
                <div className="relative z-10">
                    <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur rounded text-white text-[10px] font-bold uppercase tracking-widest mb-2">
                        {book.category}
                    </span>
                    <h3 className="text-white font-black text-sm leading-tight line-clamp-2">{book.title}</h3>
                    <p className="text-white/80 text-[11px] mt-0.5">{book.author || 'Unknown Author'}</p>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => onEdit(book)}
                        className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white shadow">
                        <FiEdit2 size={12} />
                    </button>
                    <button onClick={() => onDelete(book.id)}
                        className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow">
                        <FiTrash2 size={12} />
                    </button>
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono">{book.isbn || 'No ISBN'}</span>
                    <ConditionBadge condition={book.condition} />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Availability</span>
                        <span className="text-[10px] font-bold" style={{ color: pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626' }}>
                            {book.available_copies} of {book.total_copies} available
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626' }} />
                    </div>
                </div>
                {book.shelf_location && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <FiMapPin size={10} />
                        <span>Shelf: <strong className="text-gray-700">{book.shelf_location}</strong></span>
                    </div>
                )}
                <button
                    onClick={() => onIssue(book)}
                    disabled={book.available_copies === 0}
                    className="mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                        background: book.available_copies > 0 ? `linear-gradient(135deg, ${color}, ${color}bb)` : '#f3f4f6',
                        color: book.available_copies > 0 ? 'white' : '#9ca3af',
                        cursor: book.available_copies > 0 ? 'pointer' : 'not-allowed'
                    }}>
                    {book.available_copies > 0 ? '📤 Issue This Book' : '✗ All Copies Out'}
                </button>
            </div>
        </div>
    );
}

function SectionHeader({
    title, sub, icon: Icon, color, actions
}: {
    title: string; sub?: string; icon: React.ElementType;
    color: string; actions?: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

function EmptyState({ icon: Icon, title, sub, action }: {
    icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode
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

// ─────────────────────────────────────────────────────────────────────────────
// MODAL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, headerColor = '#0d9488', children, wide = false }: {
    title: string; subtitle?: string; onClose: () => void;
    headerColor?: string; children: React.ReactNode; wide?: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <div
                className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[92vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className="flex items-center justify-between px-7 py-5 rounded-t-3xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColor}bb)` }}>
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
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.92) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

function FormField({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

const inputCls = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none transition-all placeholder:text-gray-300";
const selectCls = `${inputCls} cursor-pointer`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LibraryInventoryPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<LibraryTab>('books');
    const [search, setSearch] = useState('');
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
    const [assets, setAssets] = useState<any[]>([]);

    const [showBookModal, setShowBookModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [selectedCheckout, setSelectedCheckout] = useState<Checkout | null>(null);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
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

    // ─── Derived / memoized ─────────────────────────────────────────────────
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
            const av = (a as any)[sortField] ?? '';
            const bv = (b as any)[sortField] ?? '';
            const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [books, search, filterCategory, filterCondition, filterAvailability, sortField, sortDir]);

    const totalPages = Math.ceil(filteredBooks.length / perPage);
    const paginatedBooks = filteredBooks.slice((page - 1) * perPage, page * perPage);

    const activeCheckouts = checkouts.filter(c => c.status === 'Checked Out');
    const overdueCheckouts = activeCheckouts.filter(c => new Date(c.due_date) < new Date());
    const returnHistory = checkouts.filter(c => c.status === 'Returned');

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
        categories: new Set(books.map(b => b.category)).size,
        assetValue: assets.reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0), 0),
        checkoutsThisMonth: checkouts.filter(c => {
            const d = new Date(c.checkout_date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
    }), [books, checkouts, assets, activeCheckouts, overdueCheckouts]);

    // ─── Data fetching ───────────────────────────────────────────────────────
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
            console.error('Fetch error:', e);
            toast.error('Failed to load data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (checkoutForm.checkout_date && checkoutForm.loan_period) {
            const d = new Date(checkoutForm.checkout_date);
            d.setDate(d.getDate() + checkoutForm.loan_period);
            setCheckoutForm(prev => ({ ...prev, due_date: d.toISOString().split('T')[0] }));
        }
    }, [checkoutForm.checkout_date, checkoutForm.loan_period]);

    // ─── Sort handler ────────────────────────────────────────────────────────
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
        setPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        sortField === field
            ? (sortDir === 'asc'
                ? <FiChevronUp size={12} className="inline ml-1 text-teal-500" />
                : <FiChevronDown size={12} className="inline ml-1 text-teal-500" />)
            : <span className="inline ml-1 text-gray-300">↕</span>
    );

    // ─── Book CRUD ───────────────────────────────────────────────────────────
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
            toast.error('Available copies cannot exceed total copies');
            return;
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
                const { error } = await supabase
                    .from('school_library_books')
                    .update(payload as any)
                    .eq('id', editingBook.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('school_library_books')
                    .insert([payload]);
                if (error) throw error;
            }

            toast.success(editingBook ? '✅ Book updated successfully' : '✅ Book added to catalog');
            setShowBookModal(false);
            setEditingBook(null);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Failed to save book');
        }
        setSaving(false);
    };

    const handleDeleteBook = async (id: number) => {
        const hasCheckouts = activeCheckouts.some(c => c.book_id === id);
        if (hasCheckouts) {
            toast.error('Cannot delete — this book has active checkouts');
            return;
        }
        if (!confirm('Permanently delete this book from the catalog?')) return;
        const { error } = await supabase.from('school_library_books').delete().eq('id', id);
        if (error) { toast.error('Delete failed'); return; }
        toast.success('Book removed from catalog');
        fetchData();
    };

    // ─── Checkout ────────────────────────────────────────────────────────────
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
                toast.error('No copies available for checkout');
                setSaving(false);
                return;
            }

            const { error: checkoutErr } = await supabase
                .from('school_library_checkouts')
                .insert([{
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
            if (checkoutErr) throw checkoutErr;

            // FIX 1: cast update payload as any to avoid Supabase generated type mismatch
            const { error: updateErr } = await supabase
                .from('school_library_books')
                .update({ available_copies: book.available_copies - 1 } as any)
                .eq('id', book.id);
            if (updateErr) throw updateErr;

            toast.success(`📤 "${book.title}" issued to ${checkoutForm.borrower_name}`);
            setShowCheckoutModal(false);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Checkout failed');
        }
        setSaving(false);
    };

    // ─── Return ──────────────────────────────────────────────────────────────
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

            // FIX 2: cast update payload as any to avoid Supabase generated type mismatch
            const { error: returnErr } = await supabase
                .from('school_library_checkouts')
                .update({
                    status: 'Returned',
                    return_date: new Date().toISOString().split('T')[0],
                    fine_amount: finalFine,
                } as any)
                .eq('id', selectedCheckout.id);
            if (returnErr) throw returnErr;

            const book = books.find(b => b.id === selectedCheckout.book_id);
            if (book) {
                // FIX 3: cast update payload as any to avoid Supabase generated type mismatch
                const { error: bookErr } = await supabase
                    .from('school_library_books')
                    .update({ available_copies: (book.available_copies || 0) + 1 } as any)
                    .eq('id', book.id);
                if (bookErr) console.error('Book update error:', bookErr);
            }

            toast.success(`📥 "${selectedCheckout.book_title}" returned${finalFine > 0 ? ` — Fine: ${fmt(finalFine)}` : ''}`);
            setShowReturnModal(false);
            setSelectedCheckout(null);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Return failed');
        }
        setSaving(false);
    };

    // ─── Renew ───────────────────────────────────────────────────────────────
    const handleRenew = async (checkout: Checkout, extraDays: number) => {
        setSaving(true);
        try {
            const newDue = new Date(checkout.due_date);
            newDue.setDate(newDue.getDate() + extraDays);

            // FIX 4: cast update payload as any to avoid Supabase generated type mismatch
            const { error: renewErr } = await supabase
                .from('school_library_checkouts')
                .update({
                    due_date: newDue.toISOString().split('T')[0],
                    renewed_count: (checkout.renewed_count || 0) + 1,
                } as any)
                .eq('id', checkout.id);
            if (renewErr) throw renewErr;
            toast.success(`🔄 Renewed for ${extraDays} more days`);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || 'Renewal failed');
        }
        setSaving(false);
    };

    // ─── Export functions ────────────────────────────────────────────────────
    const exportCatalogCSV = () => {
        if (filteredBooks.length === 0) { toast.error('No books to export'); return; }
        const headers = ['#', 'Title', 'Author', 'ISBN', 'Category', 'Publisher', 'Year', 'Total Copies', 'Available', 'Shelf', 'Condition', 'Status'];
        const rows = filteredBooks.map((b, i) => [
            i + 1, `"${b.title}"`, `"${b.author || ''}"`, b.isbn || '',
            b.category, `"${b.publisher || ''}"`, b.year_published,
            b.total_copies, b.available_copies, b.shelf_location || '', b.condition, b.status
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
        const headers = ['#', 'Book Title', 'Borrower', 'Type', 'ID/Adm No', 'Checkout Date', 'Due Date', 'Return Date', 'Status', 'Fine (KES)'];
        const rows = activeCheckouts.map((c, i) => [
            i + 1, `"${c.book_title}"`, `"${c.borrower_name}"`,
            c.borrower_type, c.borrower_id || '',
            c.checkout_date, c.due_date, c.return_date || 'N/A', c.status, c.fine_amount || 0
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `active_checkouts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Checkouts exported');
    };

    const printOverdueReport = () => {
        const html = `
            <html><head><title>Overdue Books Report</title>
            <style>
                body { font-family: Arial; font-size: 12px; }
                h1 { color: #dc2626; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th { background: #dc2626; color: white; padding: 8px; text-align: left; font-size: 11px; }
                td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; }
                tr:nth-child(even) { background: #fff5f5; }
                .fine { color: #dc2626; font-weight: bold; }
            </style>
            </head><body>
            <h1>⚠ Overdue Books Report</h1>
            <p>Generated: ${new Date().toLocaleString('en-KE')} | Total Overdue: ${overdueCheckouts.length}</p>
            <table>
                <thead><tr>
                    <th>#</th><th>Book Title</th><th>Borrower</th><th>Type</th>
                    <th>ID/Adm No</th><th>Due Date</th><th>Days Overdue</th><th>Fine (KES)</th>
                </tr></thead>
                <tbody>
                ${overdueCheckouts.map((c, i) => {
            const days = Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000);
            const fine = Math.max(0, days) * FINE_PER_DAY;
            return `<tr>
                        <td>${i + 1}</td>
                        <td><strong>${c.book_title}</strong></td>
                        <td>${c.borrower_name}</td>
                        <td>${c.borrower_type}</td>
                        <td>${c.borrower_id || '-'}</td>
                        <td>${fmtDate(c.due_date)}</td>
                        <td style="color:#dc2626;font-weight:bold">${days} days</td>
                        <td class="fine">KES ${fine.toLocaleString()}</td>
                    </tr>`;
        }).join('')}
                <tr style="background:#fee2e2">
                    <td colspan="7"><strong>TOTAL OUTSTANDING FINES</strong></td>
                    <td class="fine">KES ${stats.totalFines.toLocaleString()}</td>
                </tr>
                </tbody>
            </table>
            </body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ─── Loading state ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', opacity: 0.15 }} />
                    <div className="absolute inset-0 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
                    <FiBookOpen className="absolute inset-0 m-auto text-teal-500" size={22} />
                </div>
                <p className="text-sm font-bold text-gray-600">Loading Library System...</p>
                <p className="text-xs text-gray-400 mt-1">Fetching books, checkouts & assets</p>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-8">
            <style>{`
                .tbl th { position: sticky; top: 0; }
                .badge-overdue { animation: pulseBadge 2s infinite; }
                @keyframes pulseBadge { 0%,100% { opacity:1 } 50% { opacity:0.6 } }
                .tab-active { background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            `}</style>

            {/* ── PAGE HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                            <FiBookOpen size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                                Library & Inventory
                            </h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                Comprehensive library management · Books · Checkouts · Assets · Reports
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {stats.overdue > 0 && (
                        <button onClick={() => setTab('checkout')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold hover:bg-red-100 transition-colors badge-overdue">
                            <FiBell size={13} /> {stats.overdue} Overdue
                        </button>
                    )}
                    <button onClick={fetchData}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-sm">
                        <FiRefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* ── STATS GRID ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Total Volumes" value={stats.totalCopies}
                    sub={`${stats.uniqueTitles} unique titles`}
                    gradient="linear-gradient(135deg, #0d9488, #14b8a6)"
                    icon={FiBookOpen} onClick={() => { setTab('books'); setFilterAvailability('all'); }} />
                <StatCard label="Available Now" value={stats.availableCopies}
                    sub={`${stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0}% of collection`}
                    gradient="linear-gradient(135deg, #16a34a, #22c55e)"
                    icon={FiCheckCircle} onClick={() => { setTab('books'); setFilterAvailability('available'); }} />
                <StatCard label="Checked Out" value={stats.checkedOut}
                    sub={`${stats.checkoutsThisMonth} issued this month`}
                    gradient="linear-gradient(135deg, #2563eb, #3b82f6)"
                    icon={FiUsers} onClick={() => setTab('checkout')} />
                <StatCard label="Overdue" value={stats.overdue}
                    sub={stats.overdue > 0 ? `Fines: ${fmt(stats.totalFines)}` : 'All on time ✓'}
                    gradient={stats.overdue > 0 ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #6b7280, #9ca3af)"}
                    icon={FiAlertCircle} pulse={stats.overdue > 0}
                    onClick={() => setTab('checkout')} />
                <StatCard label="Asset Value" value={fmt(stats.assetValue)}
                    sub={`${assets.length} assets registered`}
                    gradient="linear-gradient(135deg, #7c3aed, #8b5cf6)"
                    icon={FiBox} onClick={() => setTab('assets')} />
            </div>

            {/* ── SECONDARY STATS ── */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                    { label: 'Categories', value: stats.categories, color: '#d97706' },
                    { label: 'Textbooks', value: books.filter(b => b.category === 'Textbook').length, color: '#0891b2' },
                    { label: 'Reference', value: books.filter(b => b.category === 'Reference').length, color: '#7c3aed' },
                    { label: 'Fiction', value: books.filter(b => b.category === 'Fiction').length, color: '#db2777' },
                    { label: 'Good Condition', value: books.filter(b => ['New', 'Good'].includes(b.condition)).length, color: '#16a34a' },
                    { label: 'Needs Repair', value: books.filter(b => ['Poor', 'Damaged'].includes(b.condition)).length, color: '#dc2626' },
                ].map((s, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1.5 overflow-x-auto">
                {([
                    { key: 'books' as LibraryTab, label: 'Book Catalog', icon: FiBookOpen, count: books.length },
                    { key: 'checkout' as LibraryTab, label: 'Active Loans', icon: FiClock, count: stats.checkedOut, alert: stats.overdue > 0 },
                    { key: 'history' as LibraryTab, label: 'Return History', icon: FiArchive, count: returnHistory.length },
                    { key: 'assets' as LibraryTab, label: 'Assets', icon: FiBox, count: assets.length },
                    { key: 'reports' as LibraryTab, label: 'Reports', icon: FiBarChart2 },
                    { key: 'stores' as LibraryTab, label: 'Stores', icon: FiPackage },
                ] as Array<{ key: LibraryTab; label: string; icon: React.ElementType; count?: number; alert?: boolean }>).map(t => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${active ? 'tab-active text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={13} />
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${active ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'} ${t.alert ? '!bg-red-100 !text-red-600' : ''}`}>
                                    {t.count}
                                </span>
                            )}
                            {t.alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                BOOKS TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'books' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input type="text"
                                    placeholder="Search by title, author, ISBN, shelf, publisher..."
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
                            <select value={filterAvailability}
                                onChange={e => { setFilterAvailability(e.target.value as any); setPage(1); }}
                                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none cursor-pointer min-w-[130px]">
                                <option value="all">All Status</option>
                                <option value="available">Available</option>
                                <option value="unavailable">All Out</option>
                            </select>
                            <select value={filterCondition}
                                onChange={e => { setFilterCondition(e.target.value); setPage(1); }}
                                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-400 outline-none cursor-pointer min-w-[130px]">
                                <option value="all">All Conditions</option>
                                {Object.keys(conditionConfig).map(c => <option key={c} value={c}>{c}</option>)}
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
                                        <FiList size={14} />
                                    </button>
                                    <button onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-gray-400'}`}>
                                        <FiGrid size={14} />
                                    </button>
                                </div>
                                <button onClick={exportCatalogCSV}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors">
                                    <FiDownload size={13} /> Export CSV
                                </button>
                                <button onClick={openAddBook}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                                    <FiPlus size={13} /> Add Book
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid View */}
                    {viewMode === 'grid' ? (
                        paginatedBooks.length === 0 ? (
                            <EmptyState icon={FiBookOpen}
                                title="No books found"
                                sub="Try adjusting your filters or add books to the catalog"
                                action={
                                    <button onClick={openAddBook}
                                        className="px-5 py-2.5 text-sm font-bold text-white rounded-xl"
                                        style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
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
                                <table className="w-full tbl">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-200">
                                            {[
                                                { key: null, label: '#', cls: 'w-10' },
                                                { key: 'title' as SortField, label: 'Title & Publisher', cls: 'min-w-[220px]' },
                                                { key: 'author' as SortField, label: 'Author', cls: '' },
                                                { key: null, label: 'ISBN', cls: '' },
                                                { key: 'category' as SortField, label: 'Category', cls: '' },
                                                { key: 'available_copies' as SortField, label: 'Availability', cls: '' },
                                                { key: null, label: 'Shelf', cls: '' },
                                                { key: null, label: 'Condition', cls: '' },
                                                { key: null, label: 'Actions', cls: 'w-28' },
                                            ].map((col, ci) => (
                                                <th key={ci}
                                                    className={`px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest ${col.cls} ${col.key ? 'cursor-pointer hover:text-gray-600' : ''}`}
                                                    onClick={() => col.key && handleSort(col.key)}>
                                                    {col.label} {col.key && <SortIcon field={col.key} />}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedBooks.length === 0 ? (
                                            <tr>
                                                <td colSpan={9}>
                                                    <EmptyState icon={FiBookOpen}
                                                        title="No books found"
                                                        sub="Try adjusting your filters or search terms"
                                                        action={
                                                            <button onClick={openAddBook}
                                                                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl"
                                                                style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                                                                Add First Book
                                                            </button>
                                                        } />
                                                </td>
                                            </tr>
                                        ) : paginatedBooks.map((b, i) => {
                                            const color = b.cover_color || coverColors[b.id % coverColors.length];
                                            return (
                                                <tr key={b.id}
                                                    className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors group">
                                                    <td className="px-4 py-3 text-xs text-gray-300 font-mono">
                                                        {(page - 1) * perPage + i + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-10 rounded-full flex-shrink-0"
                                                                style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)` }} />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 leading-tight">{b.title}</p>
                                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                                    {[b.publisher, b.year_published].filter(Boolean).join(' · ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{b.author || <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{b.isbn || <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge color="#0891b2" bg="#cffafe">{b.category}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <AvailabilityBar total={b.total_copies} available={b.available_copies} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {b.shelf_location
                                                            ? <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg"><FiMapPin size={10} />{b.shelf_location}</span>
                                                            : <span className="text-gray-300 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <ConditionBadge condition={b.condition} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openIssueBook(b)}
                                                                disabled={b.available_copies === 0}
                                                                title="Issue book"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                                <FiArrowRight size={14} />
                                                            </button>
                                                            <button onClick={() => openEditBook(b)}
                                                                title="Edit book"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteBook(b.id)}
                                                                title="Delete book"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                                <FiTrash2 size={14} />
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
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 font-medium">First</button>
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                                            <FiChevronLeft size={14} />
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
                                            <FiChevronRight size={14} />
                                        </button>
                                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 font-medium">Last</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ACTIVE LOANS TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'checkout' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {overdueCheckouts.length > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                                    <FiAlertCircle size={14} className="text-red-600" />
                                    <span className="text-sm font-bold text-red-700">
                                        {overdueCheckouts.length} overdue · {fmt(stats.totalFines)} outstanding
                                    </span>
                                    <button onClick={printOverdueReport}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
                                        <FiPrinter size={11} /> Print Report
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={exportCheckoutsCSV}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
                                <FiDownload size={13} /> Export
                            </button>
                            <button onClick={() => openIssueBook()}
                                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
                                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                                <FiPlus size={15} /> Issue Book
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <SectionHeader
                            title="Active Checkouts"
                            sub={`${activeCheckouts.length} books currently borrowed`}
                            icon={FiClock} color="#2563eb"
                            actions={<span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{activeCheckouts.length}</span>}
                        />
                        {activeCheckouts.length === 0 ? (
                            <EmptyState icon={FiCheckCircle}
                                title="No active checkouts"
                                sub="All books are currently in the library. Issue a book to get started." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
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
                                            return (
                                                <tr key={c.id}
                                                    className={`border-b border-gray-100 transition-colors ${isOverdue ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50'}`}>
                                                    <td className="px-4 py-3.5 text-xs text-gray-300 font-mono">{i + 1}</td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-sm font-bold text-gray-800">{c.book_title}</p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="text-sm font-semibold text-gray-700">{c.borrower_name}</p>
                                                        <Badge
                                                            color={c.borrower_type === 'Student' ? '#0891b2' : c.borrower_type === 'Teacher' ? '#7c3aed' : '#d97706'}
                                                            bg={c.borrower_type === 'Student' ? '#cffafe' : c.borrower_type === 'Teacher' ? '#ede9fe' : '#fef3c7'}>
                                                            {c.borrower_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-500">{c.borrower_id || '—'}</td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">{fmtDate(c.checkout_date)}</td>
                                                    <td className="px-4 py-3.5">
                                                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                                                            {fmtDate(c.due_date)}
                                                        </p>
                                                        {isOverdue
                                                            ? <OverdueDaysTag dueDate={c.due_date} />
                                                            : <p className="text-[10px] text-gray-400">{daysLeft}d remaining</p>}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {isOverdue
                                                            ? <Badge color="#dc2626" bg="#fee2e2">🔴 Overdue</Badge>
                                                            : daysLeft <= 3
                                                                ? <Badge color="#d97706" bg="#fef3c7">⚠ Due Soon</Badge>
                                                                : <Badge color="#16a34a" bg="#dcfce7">✓ On Time</Badge>}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className="text-xs font-bold text-gray-500">{c.renewed_count || 0}x</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-1">
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

            {/* ════════════════════════════════════════════════════════════════
                RETURN HISTORY TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'history' && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <SectionHeader title="Return History" sub={`${returnHistory.length} transactions recorded`}
                        icon={FiArchive} color="#7c3aed"
                        actions={
                            <span className="text-xs text-gray-400 font-medium">
                                Total fines collected: <strong className="text-purple-600">
                                    {fmt(returnHistory.reduce((s, c) => s + Number(c.fine_amount || 0), 0))}
                                </strong>
                            </span>
                        }
                    />
                    {returnHistory.length === 0 ? (
                        <EmptyState icon={FiArchive} title="No return history yet"
                            sub="Returned books will appear here with full transaction records" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200">
                                        {['#', 'Book Title', 'Borrower', 'Type', 'Checked Out', 'Returned', 'Duration', 'Fine', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {returnHistory.map((c, i) => {
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
            )}

            {/* ════════════════════════════════════════════════════════════════
                ASSETS TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'assets' && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <SectionHeader title="School Assets Register" sub={`${assets.length} assets · Total value: ${fmt(stats.assetValue)}`}
                        icon={FiBox} color="#7c3aed"
                        actions={
                            <a href="/dashboard/assets"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                                Manage Assets <FiArrowRight size={11} />
                            </a>
                        }
                    />
                    {assets.length === 0 ? (
                        <EmptyState icon={FiBox} title="No assets registered"
                            sub="Use the Assets Manager to register school assets"
                            action={
                                <a href="/dashboard/assets"
                                    className="px-5 py-2.5 text-sm font-bold text-white rounded-xl inline-flex items-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
                                    <FiArrowRight size={14} /> Go to Assets Manager
                                </a>
                            } />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200">
                                        {['#', 'Asset Name', 'Code', 'Category', 'Location', 'Qty', 'Purchase Value', 'Current Value', 'Condition', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((a, i) => (
                                        <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-xs text-gray-300 font-mono">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{a.asset_name}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-purple-600 bg-purple-50 rounded">{a.asset_code || '—'}</td>
                                            <td className="px-4 py-3"><Badge color="#0891b2" bg="#cffafe">{a.category || '—'}</Badge></td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{a.location || '—'}</td>
                                            <td className="px-4 py-3 text-center font-black text-gray-700">{a.quantity || 1}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{fmt(Number(a.purchase_price || 0))}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-green-600">{fmt(Number(a.current_value || a.purchase_price || 0))}</td>
                                            <td className="px-4 py-3">
                                                <ConditionBadge condition={a.condition || 'Good'} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge color={a.status === 'Active' ? '#16a34a' : '#dc2626'}
                                                    bg={a.status === 'Active' ? '#dcfce7' : '#fee2e2'}>
                                                    {a.status || 'Active'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-purple-50 border-t-2 border-purple-100">
                                        <td colSpan={6} className="px-4 py-3 text-xs font-black text-purple-700 uppercase tracking-wide">
                                            Total Asset Value
                                        </td>
                                        <td className="px-4 py-3 text-sm font-black text-gray-500">
                                            {fmt(assets.reduce((s, a) => s + Number(a.purchase_price || 0), 0))}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-black text-purple-700">
                                            {fmt(stats.assetValue)}
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                REPORTS TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'reports' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Books by Category */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                                <FiBarChart2 className="text-teal-500" size={16} /> Books by Category
                            </h3>
                            <div className="space-y-3">
                                {bookCategories
                                    .map(cat => ({ cat, count: books.filter(b => b.category === cat).length }))
                                    .filter(x => x.count > 0)
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 8)
                                    .map(({ cat, count }) => {
                                        const pct = books.length > 0 ? (count / books.length) * 100 : 0;
                                        return (
                                            <div key={cat}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-600">{cat}</span>
                                                    <span className="text-xs font-black text-gray-800">{count} <span className="text-gray-400 font-normal">titles</span></span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(to right, #0d9488, #14b8a6)' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Condition breakdown */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                                <FiActivity className="text-blue-500" size={16} /> Book Conditions
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(conditionConfig).map(([cond, cfg]) => {
                                    const count = books.filter(b => b.condition === cond).length;
                                    const pct = books.length > 0 ? (count / books.length) * 100 : 0;
                                    return (
                                        <div key={cond}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cond}</span>
                                                <span className="text-xs font-black text-gray-700">{count} <span className="text-gray-400 font-normal">({Math.round(pct)}%)</span></span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Borrower type breakdown */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                                <FiUsers className="text-purple-500" size={16} /> Borrower Summary
                            </h3>
                            <div className="space-y-3">
                                {['Student', 'Teacher', 'Staff'].map(type => {
                                    const total = checkouts.filter(c => c.borrower_type === type).length;
                                    const active = activeCheckouts.filter(c => c.borrower_type === type).length;
                                    const overdue = overdueCheckouts.filter(c => c.borrower_type === type).length;
                                    const colors: Record<string, string> = { Student: '#0891b2', Teacher: '#7c3aed', Staff: '#d97706' };
                                    return (
                                        <div key={type} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-black" style={{ color: colors[type] }}>{type}s</span>
                                                <span className="text-xs font-bold text-gray-600">{total} total borrows</span>
                                            </div>
                                            <div className="flex gap-3 text-[10px]">
                                                <span className="text-blue-600 font-bold">{active} active</span>
                                                {overdue > 0 && <span className="text-red-600 font-bold">{overdue} overdue</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                            <FiZap className="text-amber-500" size={16} /> Quick Reports & Exports
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Full Book Catalog', sub: `${books.length} titles`, icon: FiDownload, color: '#0d9488', action: exportCatalogCSV },
                                { label: 'Active Checkouts', sub: `${activeCheckouts.length} records`, icon: FiDownload, color: '#2563eb', action: exportCheckoutsCSV },
                                { label: 'Overdue Report', sub: `${overdueCheckouts.length} books`, icon: FiPrinter, color: '#dc2626', action: printOverdueReport },
                                {
                                    label: 'Return History', sub: `${returnHistory.length} returns`, icon: FiDownload, color: '#7c3aed', action: () => {
                                        const headers = ['#', 'Book', 'Borrower', 'Type', 'Checked Out', 'Returned', 'Fine'];
                                        const rows = returnHistory.map((c, i) => [i + 1, `"${c.book_title}"`, `"${c.borrower_name}"`, c.borrower_type, c.checkout_date, c.return_date || '', c.fine_amount || 0]);
                                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                                        const a = document.createElement('a');
                                        a.href = URL.createObjectURL(blob);
                                        a.download = `return_history_${new Date().toISOString().split('T')[0]}.csv`;
                                        a.click();
                                        toast.success('History exported');
                                    }
                                },
                            ].map((item, i) => (
                                <button key={i} onClick={item.action}
                                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                                        style={{ backgroundColor: `${item.color}15` }}>
                                        <item.icon size={16} style={{ color: item.color }} />
                                    </div>
                                    <p className="text-xs font-black text-gray-700 group-hover:text-gray-900">{item.label}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STORES TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'stores' && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <SectionHeader title="Store Items & Consumables" sub="Quick links to consumable inventory modules"
                        icon={FiPackage} color="#d97706" />
                    <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            {[
                                // FIX 5: replaced FiCopy (was not imported) — now imported at top
                                { href: '/dashboard/rim-paper', icon: FiCopy, label: 'Rim Paper', sub: 'Track paper stock & usage', color: '#d97706', bg: '#fffbeb' },
                                { href: '/dashboard/assets', icon: FiBox, label: 'Assets Manager', sub: 'Manage all school assets', color: '#7c3aed', bg: '#faf5ff' },
                                { href: '/dashboard/stores', icon: FiPackage, label: 'General Stores', sub: 'Lab, Kitchen & more', color: '#0891b2', bg: '#f0f9ff' },
                            ].map((item, i) => (
                                <a key={i} href={item.href}
                                    className="rounded-2xl p-6 border-2 hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col items-center text-center"
                                    style={{ backgroundColor: item.bg, borderColor: `${item.color}30` }}>
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                        style={{ backgroundColor: `${item.color}15` }}>
                                        <item.icon size={28} style={{ color: item.color }} />
                                    </div>
                                    <p className="text-sm font-black text-gray-800 group-hover:text-gray-900">{item.label}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                                    <span className="mt-4 flex items-center gap-1 text-xs font-bold" style={{ color: item.color }}>
                                        Open Module <FiArrowRight size={11} />
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODALS
            ════════════════════════════════════════════════════════════════ */}

            {/* ── ADD / EDIT BOOK MODAL ── */}
            {showBookModal && (
                <Modal
                    title={editingBook ? 'Edit Book Record' : 'Add New Book'}
                    subtitle={editingBook ? `Updating: ${editingBook.title}` : 'Add a new book to the library catalog'}
                    onClose={() => { setShowBookModal(false); setEditingBook(null); }}
                    headerColor="#0d9488"
                    wide>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <FormField label="Book Title" required>
                                <input type="text" value={bookForm.title}
                                    onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                                    className={inputCls} placeholder="Enter the full book title" autoFocus />
                            </FormField>
                        </div>
                        <FormField label="Author">
                            <input type="text" value={bookForm.author}
                                onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                                className={inputCls} placeholder="Author name(s)" />
                        </FormField>
                        <FormField label="ISBN" hint="International Standard Book Number">
                            <input type="text" value={bookForm.isbn}
                                onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                                className={inputCls} placeholder="e.g. 978-0-00-000000-0" />
                        </FormField>
                        <FormField label="Category" required>
                            <select value={bookForm.category}
                                onChange={e => setBookForm({ ...bookForm, category: e.target.value })}
                                className={selectCls}>
                                {bookCategories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Publisher">
                            <input type="text" value={bookForm.publisher}
                                onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })}
                                className={inputCls} placeholder="Publishing house" />
                        </FormField>
                        <FormField label="Year Published">
                            <input type="number" value={bookForm.year_published} min={1900} max={new Date().getFullYear()}
                                onChange={e => setBookForm({ ...bookForm, year_published: Number(e.target.value) })}
                                className={inputCls} />
                        </FormField>
                        <FormField label="Shelf Location" hint="e.g. A1, B3, C-12">
                            <input type="text" value={bookForm.shelf_location}
                                onChange={e => setBookForm({ ...bookForm, shelf_location: e.target.value })}
                                className={inputCls} placeholder="Shelf / rack location" />
                        </FormField>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Copy Inventory
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Total Copies">
                                    <input type="number" value={bookForm.total_copies} min={1}
                                        onChange={e => {
                                            const total = Number(e.target.value);
                                            setBookForm({ ...bookForm, total_copies: total, available_copies: Math.min(bookForm.available_copies, total) });
                                        }}
                                        className={inputCls} />
                                </FormField>
                                <FormField label="Available Copies" hint="Must not exceed total">
                                    <input type="number" value={bookForm.available_copies} min={0} max={bookForm.total_copies}
                                        onChange={e => setBookForm({ ...bookForm, available_copies: Math.min(Number(e.target.value), bookForm.total_copies) })}
                                        className={inputCls} />
                                </FormField>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{
                                        width: `${bookForm.total_copies > 0 ? (bookForm.available_copies / bookForm.total_copies) * 100 : 0}%`,
                                        backgroundColor: '#0d9488'
                                    }} />
                                </div>
                                <span className="text-xs text-gray-500 font-medium">
                                    {bookForm.available_copies}/{bookForm.total_copies} available
                                </span>
                            </div>
                        </div>
                        <FormField label="Condition">
                            <select value={bookForm.condition}
                                onChange={e => setBookForm({ ...bookForm, condition: e.target.value })}
                                className={selectCls}>
                                {Object.keys(conditionConfig).map(c => <option key={c}>{c}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select value={bookForm.status}
                                onChange={e => setBookForm({ ...bookForm, status: e.target.value })}
                                className={selectCls}>
                                <option>Active</option>
                                <option>Withdrawn</option>
                                <option>Lost</option>
                                <option>On Repair</option>
                            </select>
                        </FormField>
                        <div className="sm:col-span-2">
                            <FormField label="Cover Color" hint="Used for visual identification in grid view">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {coverColors.map(color => (
                                        <button key={color} type="button"
                                            onClick={() => setBookForm({ ...bookForm, cover_color: color })}
                                            className={`w-8 h-8 rounded-xl border-2 transition-all ${bookForm.cover_color === color ? 'scale-125 shadow-lg' : 'border-transparent'}`}
                                            style={{ backgroundColor: color, borderColor: bookForm.cover_color === color ? '#374151' : 'transparent' }} />
                                    ))}
                                </div>
                            </FormField>
                        </div>
                        <div className="sm:col-span-2">
                            <FormField label="Notes">
                                <textarea value={bookForm.notes}
                                    onChange={e => setBookForm({ ...bookForm, notes: e.target.value })}
                                    className={inputCls} rows={2}
                                    placeholder="Any additional notes about this book..." />
                            </FormField>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button onClick={() => { setShowBookModal(false); setEditingBook(null); }}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSaveBook} disabled={saving}
                            className="px-8 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                            {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                            {editingBook ? 'Update Book' : 'Add to Catalog'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── ISSUE BOOK MODAL ── */}
            {showCheckoutModal && (
                <Modal
                    title="Issue Book to Borrower"
                    subtitle="Complete the form to check out a book"
                    onClose={() => setShowCheckoutModal(false)}
                    headerColor="#2563eb">
                    <div className="space-y-4">
                        <FormField label="Select Book" required>
                            <select value={checkoutForm.book_id}
                                onChange={e => {
                                    const b = books.find(bb => bb.id === Number(e.target.value));
                                    setCheckoutForm({ ...checkoutForm, book_id: Number(e.target.value), book_title: b?.title || '' });
                                }}
                                className={selectCls}>
                                <option value={0}>— Choose a book —</option>
                                {books.filter(b => b.available_copies > 0 && b.status === 'Active').map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.title} · {b.category} · {b.available_copies} avail.
                                    </option>
                                ))}
                            </select>
                            {checkoutForm.book_id > 0 && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    {(() => {
                                        const b = books.find(bb => bb.id === checkoutForm.book_id);
                                        return b ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-10 rounded-md flex-shrink-0"
                                                    style={{ background: b.cover_color || coverColors[b.id % coverColors.length] }} />
                                                <div>
                                                    <p className="text-xs font-black text-gray-800">{b.title}</p>
                                                    <p className="text-[10px] text-gray-500">{b.author} · {b.category} · Shelf: {b.shelf_location || 'N/A'}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 mt-0.5">{b.available_copies} of {b.total_copies} copies available</p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </FormField>
                        <FormField label="Borrower Full Name" required>
                            <input type="text" value={checkoutForm.borrower_name}
                                onChange={e => setCheckoutForm({ ...checkoutForm, borrower_name: e.target.value })}
                                className={inputCls} placeholder="Enter full name" />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Borrower Type">
                                <select value={checkoutForm.borrower_type}
                                    onChange={e => setCheckoutForm({ ...checkoutForm, borrower_type: e.target.value })}
                                    className={selectCls}>
                                    <option>Student</option>
                                    <option>Teacher</option>
                                    <option>Staff</option>
                                </select>
                            </FormField>
                            <FormField label="Adm / Staff No" hint="Optional">
                                <input type="text" value={checkoutForm.borrower_id}
                                    onChange={e => setCheckoutForm({ ...checkoutForm, borrower_id: e.target.value })}
                                    className={inputCls} placeholder="e.g. 4521" />
                            </FormField>
                        </div>
                        <FormField label="Loan Period">
                            <div className="flex gap-2">
                                {LOAN_PERIODS.map(days => (
                                    <button key={days} type="button"
                                        onClick={() => setCheckoutForm({ ...checkoutForm, loan_period: days })}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${checkoutForm.loan_period === days ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                        {days}d
                                    </button>
                                ))}
                            </div>
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Issue Date">
                                <input type="date" value={checkoutForm.checkout_date}
                                    onChange={e => setCheckoutForm({ ...checkoutForm, checkout_date: e.target.value })}
                                    className={inputCls} />
                            </FormField>
                            <FormField label="Due Date">
                                <input type="date" value={checkoutForm.due_date}
                                    onChange={e => setCheckoutForm({ ...checkoutForm, due_date: e.target.value })}
                                    className={inputCls} />
                            </FormField>
                        </div>
                        <FormField label="Notes" hint="Optional">
                            <textarea value={checkoutForm.notes}
                                onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                                className={inputCls} rows={2} placeholder="Any remarks..." />
                        </FormField>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button onClick={() => setShowCheckoutModal(false)}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                        <button onClick={handleCheckout} disabled={saving}
                            className="px-8 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                            {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiArrowRight size={14} />}
                            Issue Book
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── RETURN BOOK MODAL ── */}
            {showReturnModal && selectedCheckout && (
                <Modal
                    title="Return Book"
                    subtitle={`Processing return for: ${selectedCheckout.book_title}`}
                    onClose={() => { setShowReturnModal(false); setSelectedCheckout(null); }}
                    headerColor="#16a34a">
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div><span className="text-gray-400 font-semibold">Book</span><p className="font-black text-gray-800 mt-0.5">{selectedCheckout.book_title}</p></div>
                                <div><span className="text-gray-400 font-semibold">Borrower</span><p className="font-black text-gray-800 mt-0.5">{selectedCheckout.borrower_name}</p></div>
                                <div><span className="text-gray-400 font-semibold">Issued</span><p className="font-bold text-gray-700 mt-0.5">{fmtDate(selectedCheckout.checkout_date)}</p></div>
                                <div>
                                    <span className="text-gray-400 font-semibold">Due Date</span>
                                    <p className={`font-bold mt-0.5 ${new Date(selectedCheckout.due_date) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                                        {fmtDate(selectedCheckout.due_date)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {returnFineAmount > 0 ? (
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-black text-red-700 flex items-center gap-1.5">
                                            <FiAlertCircle size={14} /> Overdue Fine
                                        </p>
                                        <p className="text-[11px] text-red-500 mt-1">
                                            {fmt(FINE_PER_DAY)} per day ×{' '}
                                            {Math.floor((Date.now() - new Date(selectedCheckout.due_date).getTime()) / 86400000)} days
                                        </p>
                                    </div>
                                    <p className="text-2xl font-black text-red-700">{fmt(returnFineAmount)}</p>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        onClick={() => setFineWaived(!fineWaived)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${fineWaived ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                        {fineWaived ? <FiCheckCircle size={13} /> : <FiXCircle size={13} />}
                                        {fineWaived ? 'Fine Waived' : 'Waive Fine'}
                                    </button>
                                    {fineWaived && <span className="text-xs text-green-600 font-semibold">Fine has been waived</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                                <FiCheckCircle size={20} className="text-green-600" />
                                <div>
                                    <p className="text-sm font-black text-green-700">No Fine — Returned on Time</p>
                                    <p className="text-xs text-green-500">Book returned before due date</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs font-semibold text-gray-500">Return Date</span>
                            <span className="text-sm font-black text-gray-800">
                                {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button onClick={() => { setShowReturnModal(false); setSelectedCheckout(null); }}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                        <button onClick={handleReturn} disabled={saving}
                            className="px-8 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
                            {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />}
                            Confirm Return {returnFineAmount > 0 && !fineWaived && `· ${fmt(returnFineAmount)}`}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

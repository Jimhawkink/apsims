'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBookOpen, FiPlus, FiSearch, FiEdit2, FiTrash2, FiDownload, FiX, FiSave, FiFilter, FiChevronLeft, FiChevronRight, FiBarChart2, FiGrid } from 'react-icons/fi';

const bookCategories = ['Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Language', 'Religious', 'General', 'Periodical', 'Encyclopedia', 'Biography'];

export default function CatalogPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterCondition, setFilterCondition] = useState('all');
    const [view, setView] = useState<'table' | 'grid'>('table');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [page, setPage] = useState(1);
    const perPage = 20;
    const [form, setForm] = useState({
        title: '', author: '', isbn: '', category: 'Textbook', publisher: '',
        year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1,
        shelf_location: '', condition: 'Good', notes: '', status: 'Active',
    });

    const fetchBooks = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('school_library_books').select('*').order('title');
        setBooks(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchBooks(); }, [fetchBooks]);

    const filtered = books.filter(b => {
        if (filterCategory !== 'all' && b.category !== filterCategory) return false;
        if (filterCondition !== 'all' && b.condition !== filterCondition) return false;
        if (search) { const q = search.toLowerCase(); return b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').includes(q); }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    const totalCopies = books.reduce((s, b) => s + (b.total_copies || 0), 0);
    const availableCopies = books.reduce((s, b) => s + (b.available_copies || 0), 0);
    const categoryStats = bookCategories.map(c => ({ name: c, count: books.filter(b => b.category === c).length })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title required'); return; }
        setSaving(true);
        const payload = { title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim() || null, category: form.category, publisher: form.publisher.trim() || null, year_published: form.year_published, total_copies: form.total_copies, available_copies: form.available_copies, shelf_location: form.shelf_location.trim() || null, condition: form.condition, notes: form.notes || null, status: form.status };
        let error;
        if (editing) { ({ error } = await supabase.from('school_library_books').update(payload).eq('id', editing.id)); }
        else { ({ error } = await supabase.from('school_library_books').insert([payload])); }
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Book updated ✅' : 'Book added ✅');
        setShowModal(false); setEditing(null); fetchBooks();
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this book?')) return;
        await supabase.from('school_library_books').delete().eq('id', id);
        toast.success('Book deleted'); fetchBooks();
    };

    const openCreate = () => { setEditing(null); setForm({ title: '', author: '', isbn: '', category: 'Textbook', publisher: '', year_published: new Date().getFullYear(), total_copies: 1, available_copies: 1, shelf_location: '', condition: 'Good', notes: '', status: 'Active' }); setShowModal(true); };
    const openEdit = (b: any) => { setEditing(b); setForm({ title: b.title, author: b.author || '', isbn: b.isbn || '', category: b.category, publisher: b.publisher || '', year_published: b.year_published, total_copies: b.total_copies, available_copies: b.available_copies, shelf_location: b.shelf_location || '', condition: b.condition, notes: b.notes || '', status: b.status }); setShowModal(true); };

    const exportCSV = () => {
        const headers = ['Title', 'Author', 'ISBN', 'Category', 'Publisher', 'Year', 'Total', 'Available', 'Shelf', 'Condition'];
        const rows = filtered.map(b => [b.title, b.author, b.isbn, b.category, b.publisher, b.year_published, b.total_copies, b.available_copies, b.shelf_location, b.condition]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `book_catalog_${new Date().toISOString().split('T')[0]}.csv`; a.click(); toast.success('Exported ✅');
    };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-teal-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-teal-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiBookOpen className="text-teal-500" /> Book Catalog</h1>
                <p className="text-sm text-gray-500 mt-1">Complete book inventory — Add, edit, search & manage library collection</p></div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50"><FiDownload size={14} /> Export</button>
                    <button onClick={openCreate} className="px-5 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}><FiPlus size={14} /> Add Book</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}><p className="text-xs font-semibold opacity-80 uppercase">Total Titles</p><p className="text-2xl font-extrabold mt-1">{books.length}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><p className="text-xs font-semibold opacity-80 uppercase">Total Copies</p><p className="text-2xl font-extrabold mt-1">{totalCopies}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><p className="text-xs font-semibold opacity-80 uppercase">Available</p><p className="text-2xl font-extrabold mt-1">{availableCopies}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><p className="text-xs font-semibold opacity-80 uppercase">Lent Out</p><p className="text-2xl font-extrabold mt-1">{totalCopies - availableCopies}</p></div>
            </div>

            {/* Category breakdown */}
            {categoryStats.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Categories</p>
                    <div className="flex flex-wrap gap-2">{categoryStats.map(c => (
                        <button key={c.name} onClick={() => { setFilterCategory(c.name === filterCategory ? 'all' : c.name); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCategory === c.name ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {c.name} <span className="ml-1 text-gray-400">({c.count})</span>
                        </button>
                    ))}</div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title, author, ISBN..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 outline-none" /></div>
                <select value={filterCondition} onChange={e => { setFilterCondition(e.target.value); setPage(1); }} className="select-modern text-sm"><option value="all">All Conditions</option>{['New', 'Good', 'Fair', 'Poor', 'Damaged'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setView('table')} className={`p-2 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm' : ''}`}><FiFilter size={14} /></button>
                    <button onClick={() => setView('grid')} className={`p-2 rounded-md transition-all ${view === 'grid' ? 'bg-white shadow-sm' : ''}`}><FiGrid size={14} /></button>
                </div>
            </div>

            {/* Table View */}
            {view === 'table' ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
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
                    </tr></thead><tbody>
                        {paginated.map((b, i) => (
                            <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                <td className="px-4 py-2.5"><p className="text-sm font-semibold text-gray-800">{b.title}</p>{b.publisher && <p className="text-[10px] text-gray-400">{b.publisher} ({b.year_published})</p>}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{b.author || '-'}</td>
                                <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{b.isbn || '-'}</td>
                                <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-xs font-semibold">{b.category}</span></td>
                                <td className="px-4 py-2.5 text-center font-semibold text-gray-700">{b.total_copies}</td>
                                <td className="px-4 py-2.5 text-center"><span className={`font-bold ${b.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>{b.available_copies}</span></td>
                                <td className="px-4 py-2.5 text-sm text-gray-500">{b.shelf_location || '-'}</td>
                                <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${b.condition === 'New' || b.condition === 'Good' ? 'bg-green-50 text-green-700' : b.condition === 'Fair' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{b.condition}</span></td>
                                <td className="px-4 py-2.5 text-center"><div className="flex items-center justify-center gap-1">
                                    <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><FiEdit2 size={14} /></button>
                                    <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><FiTrash2 size={14} /></button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody></table>
                    {totalPages > 1 && (<div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between"><p className="text-xs text-gray-500">Page {page} of {totalPages}</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-2 rounded-lg border text-gray-500 disabled:opacity-30"><FiChevronLeft size={16} /></button><button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-2 rounded-lg border text-gray-500 disabled:opacity-30"><FiChevronRight size={16} /></button></div></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {paginated.map(b => (
                        <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all group">
                            <div className="w-full h-28 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)' }}>
                                <FiBookOpen size={32} className="text-teal-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 line-clamp-2">{b.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{b.author || 'Unknown'}</p>
                            <div className="flex items-center justify-between mt-3">
                                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-semibold">{b.category}</span>
                                <span className={`text-xs font-bold ${b.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>{b.available_copies}/{b.total_copies}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Book' : 'Add New Book'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className={labelCls}>Title *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Author</label><input type="text" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>ISBN</label><input type="text" value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls}>{bookCategories.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className={labelCls}>Publisher</label><input type="text" value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Year</label><input type="number" value={form.year_published} onChange={e => setForm({...form, year_published: Number(e.target.value)})} className={inputCls} /></div>
                                <div><label className={labelCls}>Total Copies</label><input type="number" value={form.total_copies} onChange={e => setForm({...form, total_copies: Number(e.target.value)})} className={inputCls} /></div>
                                <div><label className={labelCls}>Available</label><input type="number" value={form.available_copies} onChange={e => setForm({...form, available_copies: Number(e.target.value)})} className={inputCls} /></div>
                                <div><label className={labelCls}>Shelf</label><input type="text" value={form.shelf_location} onChange={e => setForm({...form, shelf_location: e.target.value})} className={inputCls} placeholder="e.g. A1" /></div>
                                <div><label className={labelCls}>Condition</label><select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className={inputCls}><option>New</option><option>Good</option><option>Fair</option><option>Poor</option><option>Damaged</option></select></div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={inputCls} rows={2} /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}><FiSave size={14} /> {editing ? 'Update' : 'Add Book'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

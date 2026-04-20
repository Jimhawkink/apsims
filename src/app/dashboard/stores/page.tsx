'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBox, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiSave, FiDownload, FiAlertCircle, FiMinus, FiArrowUp } from 'react-icons/fi';

const categories = ['Stationery', 'Cleaning', 'Laboratory', 'Kitchen', 'Sports', 'Uniforms', 'Toiletries', 'Maintenance', 'Office', 'First Aid', 'Electrical', 'Other'];

export default function StoresPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showIssuanceModal, setShowIssuanceModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [tab, setTab] = useState<'items' | 'issue' | 'low'>('items');

    const [form, setForm] = useState({
        item_name: '', item_code: '', category: 'Stationery', unit: 'Pieces',
        quantity: 0, reorder_level: 5, unit_price: 0, location: '', supplier: '', notes: '',
    });

    const [issueForm, setIssueForm] = useState({
        item_id: 0, item_name: '', issued_to: '', department: '', quantity: 1, notes: '',
    });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [it, is] = await Promise.all([
            supabase.from('school_store_items').select('*').order('item_name'),
            supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }),
        ]);
        setItems(it.data || []);
        setIssuances(is.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = items.filter(i => {
        if (filterCategory && i.category !== filterCategory) return false;
        if (search) { const q = search.toLowerCase(); return i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q); }
        return true;
    });

    const lowStockItems = items.filter(i => i.quantity <= (i.reorder_level || 5));
    const totalValue = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

    const handleSave = async () => {
        if (!form.item_name.trim()) { toast.error('Item name required'); return; }
        setSaving(true);
        const payload = {
            item_name: form.item_name.trim(), item_code: form.item_code.trim() || null,
            category: form.category, unit: form.unit, quantity: form.quantity || 0,
            reorder_level: form.reorder_level || 5, unit_price: form.unit_price || 0,
            location: form.location || null, supplier: form.supplier || null, notes: form.notes || null,
        };
        let error;
        if (editing) { ({ error } = await supabase.from('school_store_items').update(payload).eq('id', editing.id)); }
        else { ({ error } = await supabase.from('school_store_items').insert([payload])); }
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Item updated ✅' : 'Item added ✅');
        setShowModal(false); setEditing(null); fetchAll();
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this store item?')) return;
        await supabase.from('school_store_items').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    const handleIssue = async () => {
        if (!issueForm.item_id || !issueForm.issued_to.trim() || issueForm.quantity < 1) { toast.error('Fill all required fields'); return; }
        const item = items.find(i => i.id === issueForm.item_id);
        if (!item || item.quantity < issueForm.quantity) { toast.error('Insufficient stock'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_store_issuances').insert([{
            item_id: issueForm.item_id, item_name: item.item_name, issued_to: issueForm.issued_to.trim(),
            department: issueForm.department || null, quantity: issueForm.quantity, notes: issueForm.notes || null,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_items').update({ quantity: item.quantity - issueForm.quantity }).eq('id', item.id);
        toast.success('Item issued ✅');
        setShowIssuanceModal(false); fetchAll();
        setSaving(false);
    };

    const openCreate = () => { setEditing(null); setForm({ item_name: '', item_code: '', category: 'Stationery', unit: 'Pieces', quantity: 0, reorder_level: 5, unit_price: 0, location: '', supplier: '', notes: '' }); setShowModal(true); };
    const openEdit = (i: any) => { setEditing(i); setForm({ item_name: i.item_name, item_code: i.item_code || '', category: i.category, unit: i.unit || 'Pieces', quantity: i.quantity, reorder_level: i.reorder_level || 5, unit_price: i.unit_price || 0, location: i.location || '', supplier: i.supplier || '', notes: i.notes || '' }); setShowModal(true); };

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-amber-400 outline-none";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiBox className="text-amber-500" /> Store Items</h1>
                <p className="text-sm text-gray-500 mt-1">Manage school consumables, stationery & supplies inventory</p></div>
                <div className="flex gap-2">
                    <button onClick={() => { setIssueForm({ item_id: 0, item_name: '', issued_to: '', department: '', quantity: 1, notes: '' }); setShowIssuanceModal(true); }}
                        className="px-4 py-2.5 text-sm font-bold text-amber-700 bg-amber-100 rounded-xl flex items-center gap-2 hover:bg-amber-200"><FiMinus size={14} /> Issue</button>
                    <button onClick={openCreate} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FiPlus size={14} /> Add Item</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><p className="text-xs font-semibold opacity-80 uppercase">Total Items</p><p className="text-2xl font-extrabold mt-1">{items.length}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><p className="text-xs font-semibold opacity-80 uppercase">Stock Value</p><p className="text-2xl font-extrabold mt-1">{fmt(totalValue)}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${lowStockItems.length > 0 ? '#ef4444, #dc2626' : '#22c55e, #16a34a'})` }}><p className="text-xs font-semibold opacity-80 uppercase">Low Stock</p><p className="text-2xl font-extrabold mt-1">{lowStockItems.length}</p></div>
                <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><p className="text-xs font-semibold opacity-80 uppercase">Issuances</p><p className="text-2xl font-extrabold mt-1">{issuances.length}</p></div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[{key:'items',label:`All Items (${items.length})`},{key:'issue',label:`Issuance History (${issuances.length})`},{key:'low',label:`Low Stock (${lowStockItems.length})`}].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow-md text-amber-700' : 'text-gray-500'}`}>{t.label}</button>
                ))}
            </div>

            {tab === 'items' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select-modern text-sm"><option value="">All Categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Item Name</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Unit</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Value</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Stock</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-24">Actions</th>
                        </tr></thead><tbody>
                            {filtered.map((i, idx) => {
                                const isLow = i.quantity <= (i.reorder_level || 5);
                                return (
                                    <tr key={i.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-2.5 text-xs font-mono text-amber-600 font-bold">{i.item_code || '-'}</td>
                                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{i.item_name}</td>
                                        <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-semibold">{i.category}</span></td>
                                        <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-800">{i.quantity}</td>
                                        <td className="px-4 py-2.5 text-center text-xs text-gray-500">{i.unit || 'Pcs'}</td>
                                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(i.unit_price || 0)}</td>
                                        <td className="px-4 py-2.5 text-right text-sm font-bold text-green-600">{fmt((i.quantity || 0) * (i.unit_price || 0))}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-500">{i.location || '-'}</td>
                                        <td className="px-4 py-2.5 text-center">{isLow ? <span className="flex items-center justify-center gap-1 text-red-600 text-xs font-bold"><FiAlertCircle size={12} /> Low</span> : <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><FiArrowUp size={12} /> OK</span>}</td>
                                        <td className="px-4 py-2.5 text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><FiEdit2 size={14} /></button><button onClick={() => handleDelete(i.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><FiTrash2 size={14} /></button></div></td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && <tr><td colSpan={11} className="text-center py-12 text-gray-400"><FiBox className="mx-auto mb-2" size={28} /><p>No items found</p></td></tr>}
                        </tbody></table>
                    </div>
                </div>
            )}

            {tab === 'issue' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Issued To</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Notes</th>
                    </tr></thead><tbody>
                        {issuances.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-gray-400">No issuances recorded</td></tr>) :
                        issuances.map((is, i) => (
                            <tr key={is.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{is.item_name}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{is.issued_to}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-500">{is.department || '-'}</td>
                                <td className="px-4 py-2.5 text-center text-sm font-bold text-amber-600">{is.quantity}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{is.created_at ? new Date(is.created_at).toLocaleDateString('en-GB') : '-'}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-400">{is.notes || '-'}</td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
            )}

            {tab === 'low' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-red-50"><h3 className="font-bold text-red-700 text-sm flex items-center gap-2"><FiAlertCircle size={16} /> Items Below Reorder Level</h3></div>
                    {lowStockItems.length === 0 ? (<div className="text-center py-12 text-gray-400"><p className="text-lg mb-1">✅</p><p>All items adequately stocked</p></div>) : (
                        <table className="w-full"><thead><tr className="bg-red-50/50 border-b border-red-200">
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-red-600 uppercase">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-red-600 uppercase">Item</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-red-600 uppercase">Current</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-red-600 uppercase">Reorder At</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-red-600 uppercase">Shortfall</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-red-600 uppercase">Supplier</th>
                        </tr></thead><tbody>
                            {lowStockItems.map((i, idx) => (
                                <tr key={i.id} className="border-b border-gray-100">
                                    <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{i.item_name}</td>
                                    <td className="px-4 py-2.5 text-center text-lg font-extrabold text-red-600">{i.quantity}</td>
                                    <td className="px-4 py-2.5 text-center text-sm text-gray-600">{i.reorder_level || 5}</td>
                                    <td className="px-4 py-2.5 text-center text-sm font-bold text-red-600">-{Math.max(0, (i.reorder_level || 5) - i.quantity)}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-500">{i.supplier || '-'}</td>
                                </tr>
                            ))}
                        </tbody></table>
                    )}
                </div>
            )}

            {/* Add/Edit Item Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Item' : 'Add Store Item'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className={labelCls}>Item Name *</label><input type="text" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Code</label><input type="text" value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value})} className={inputCls} placeholder="e.g. STA-001" /></div>
                                <div><label className={labelCls}>Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className={labelCls}>Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className={inputCls} min="0" /></div>
                                <div><label className={labelCls}>Unit</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputCls}><option>Pieces</option><option>Packets</option><option>Boxes</option><option>Reams</option><option>Litres</option><option>Kgs</option><option>Rolls</option><option>Pairs</option><option>Sets</option></select></div>
                                <div><label className={labelCls}>Unit Price (KES)</label><input type="number" value={form.unit_price} onChange={e => setForm({...form, unit_price: Number(e.target.value)})} className={inputCls} /></div>
                                <div><label className={labelCls}>Reorder Level</label><input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: Number(e.target.value)})} className={inputCls} /></div>
                                <div><label className={labelCls}>Location</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Supplier</label><input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className={inputCls} /></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FiSave size={14} /> {editing ? 'Update' : 'Add'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Modal */}
            {showIssuanceModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowIssuanceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <h2 className="text-lg font-bold text-white">Issue Store Item</h2>
                            <button onClick={() => setShowIssuanceModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Item *</label><select value={issueForm.item_id} onChange={e => setIssueForm({...issueForm, item_id: Number(e.target.value)})} className={inputCls}><option value={0}>Select item</option>{items.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.quantity} {i.unit || 'pcs'})</option>)}</select></div>
                            <div><label className={labelCls}>Issued To *</label><input type="text" value={issueForm.issued_to} onChange={e => setIssueForm({...issueForm, issued_to: e.target.value})} className={inputCls} placeholder="Teacher/Department name" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Department</label><input type="text" value={issueForm.department} onChange={e => setIssueForm({...issueForm, department: e.target.value})} className={inputCls} /></div>
                                <div><label className={labelCls}>Quantity</label><input type="number" value={issueForm.quantity} onChange={e => setIssueForm({...issueForm, quantity: Number(e.target.value)})} className={inputCls} min="1" /></div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea value={issueForm.notes} onChange={e => setIssueForm({...issueForm, notes: e.target.value})} className={inputCls} rows={2} /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowIssuanceModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleIssue} disabled={saving} className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><FiMinus size={14} /> Issue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch } from 'react-icons/fi';

interface Asset { id: number; asset_name: string; asset_code?: string; category: string; description?: string; purchase_date?: string; purchase_price: number; current_value: number; location?: string; condition: string; quantity: number; supplier?: string; status: string; }

const conditions = ['New', 'Good', 'Fair', 'Worn', 'Damaged', 'Obsolete'];
const statuses = ['Active', 'Under Repair', 'Disposed', 'Lost'];
const categories = ['Furniture', 'Electronics', 'Lab Equipment', 'Sports', 'Vehicles', 'Books & Library', 'Kitchen', 'Office', 'Building', 'Tools', 'Uniform & Textiles', 'Other'];

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterCondition, setFilterCondition] = useState('');

    const [form, setForm] = useState({
        asset_name: '', asset_code: '', category: 'Furniture', description: '',
        purchase_date: '', purchase_price: '', current_value: '', location: '',
        condition: 'New', quantity: '1', supplier: '', status: 'Active',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data } = await (supabase as any).from('school_assets').select('*').order('asset_name');
        setAssets(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);
    const totalValue = assets.filter(a => a.status === 'Active').reduce((s, a) => s + Number(a.current_value) * Number(a.quantity), 0);
    const totalAssets = assets.reduce((s, a) => s + Number(a.quantity), 0);

    const resetForm = () => {
        setForm({ asset_name: '', asset_code: '', category: 'Furniture', description: '', purchase_date: '', purchase_price: '', current_value: '', location: '', condition: 'New', quantity: '1', supplier: '', status: 'Active' });
        setEditingId(null);
    };

    const openEdit = (a: Asset) => {
        setEditingId(a.id);
        setForm({
            asset_name: a.asset_name, asset_code: a.asset_code || '', category: a.category,
            description: a.description || '', purchase_date: a.purchase_date || '',
            purchase_price: String(a.purchase_price || ''), current_value: String(a.current_value || ''),
            location: a.location || '', condition: a.condition, quantity: String(a.quantity),
            supplier: a.supplier || '', status: a.status,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.asset_name) { toast.error('Asset name required'); return; }
        const payload = {
            asset_name: form.asset_name.trim(), asset_code: form.asset_code || null,
            category: form.category, description: form.description || null,
            purchase_date: form.purchase_date || null, purchase_price: Number(form.purchase_price) || 0,
            current_value: Number(form.current_value) || 0, location: form.location || null,
            condition: form.condition, quantity: Number(form.quantity) || 1,
            supplier: form.supplier || null, status: form.status,
        };
        let error;
        if (editingId) ({ error } = await (supabase as any).from('school_assets').update(payload).eq('id', editingId));
        else ({ error } = await (supabase as any).from('school_assets').insert([payload]));
        if (error) { toast.error('Failed to save asset'); return; }
        toast.success(editingId ? 'Asset updated! ✅' : 'Asset added! 🏫');
        setShowModal(false);
        resetForm();
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this asset?')) return;
        await (supabase as any).from('school_assets').delete().eq('id', id);
        toast.success('Asset deleted');
        fetchData();
    };

    const filtered = assets.filter(a => {
        const matchSearch = searchTerm === '' || `${a.asset_name} ${a.asset_code || ''} ${a.location || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = !filterCategory || a.category === filterCategory;
        const matchCondition = !filterCondition || a.condition === filterCondition;
        return matchSearch && matchCategory && matchCondition;
    });

    const conditionColor = (c: string) => c === 'New' ? 'badge-success' : c === 'Good' ? 'badge-info' : c === 'Fair' ? 'badge-warning' : 'badge-danger';
    const statusColor = (s: string) => s === 'Active' ? 'badge-success' : s === 'Under Repair' ? 'badge-warning' : 'badge-danger';

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🏫 School Assets</h1>
                    <p className="text-sm text-gray-500 mt-1">Inventory and asset management</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2 self-start"><FiPlus size={16} /> Add Asset</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="stat-card"><p className="text-xs text-gray-500">🏫 Total Assets</p><p className="text-lg font-bold text-blue-600 mt-1">{totalAssets}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">💰 Total Value</p><p className="text-lg font-bold text-green-600 mt-1">{fmt(totalValue)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">✅ Active</p><p className="text-lg font-bold text-emerald-600 mt-1">{assets.filter(a => a.status === 'Active').length}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">🔧 Under Repair</p><p className="text-lg font-bold text-orange-500 mt-1">{assets.filter(a => a.status === 'Under Repair').length}</p></div>
            </div>

            <div className="filter-bar">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search assets..." className="input-modern pl-10 py-2.5 text-sm" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select-modern">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="select-modern">
                    <option value="">All Conditions</option>
                    {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#3b82f6', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">🏫</span><p className="font-medium">No assets found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>Code</th><th>Asset Name</th><th>Category</th><th>Qty</th><th>Value</th><th>Location</th><th>Condition</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((a, i) => (
                                        <tr key={a.id}>
                                            <td className="text-xs text-gray-400">{i + 1}</td>
                                            <td className="font-semibold text-blue-600">{a.asset_code || '-'}</td>
                                            <td className="font-medium">{a.asset_name}</td>
                                            <td><span className="badge badge-purple">{a.category}</span></td>
                                            <td className="font-semibold">{a.quantity}</td>
                                            <td className="font-bold">{fmt(a.current_value)}</td>
                                            <td className="text-sm">{a.location || '-'}</td>
                                            <td><span className={`badge ${conditionColor(a.condition)}`}>{a.condition}</span></td>
                                            <td><span className={`badge ${statusColor(a.status)}`}>{a.status}</span></td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 size={14} /></button>
                                                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 size={14} /></button>
                                                </div>
                                            </td>
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
                            <h3 className="text-lg font-bold text-gray-800">🏫 {editingId ? 'Edit' : 'Add'} Asset</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Asset Name *</label><input type="text" value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" required /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Code</label><input type="text" value={form.asset_code} onChange={e => setForm({ ...form, asset_code: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. FRN-001" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="select-modern w-full">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" min="1" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Price</label><input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Current Value</label><input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label><select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="select-modern w-full">{conditions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="select-modern w-full">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Location</label><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. Form 1 Classroom" /></div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label><input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-modern pl-4 py-2.5 text-sm h-16 resize-none" /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">🏫 {editingId ? 'Update' : 'Add'} Asset</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

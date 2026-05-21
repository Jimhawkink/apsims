'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBox, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiSave,
    FiDownload, FiAlertCircle, FiMinus, FiArrowUp, FiClipboard, FiTruck,
    FiShoppingCart, FiCheckCircle, FiFilter, FiClock, FiTrendingDown
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
const CATEGORIES = ['Kitchen Provisions', 'Cleaning Supplies', 'Stationery', 'Laboratory', 'Sports', 'Uniforms', 'Toiletries', 'Maintenance', 'Office', 'First Aid', 'Electrical', 'Furniture', 'Fuel', 'Other'];
const UNITS = ['Kgs', 'Litres', 'Pieces', 'Packets', 'Boxes', 'Reams', 'Rolls', 'Pairs', 'Sets', 'Dozens', 'Bags', 'Trays', 'Crates', 'Cartons', 'Bottles', 'Tins', 'Bundles'];
type Tab = 'inventory' | 'kitchen' | 'issue' | 'purchase' | 'low';

export default function UltraStoresPage() {
    const [tab, setTab] = useState<Tab>('inventory');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [saving, setSaving] = useState(false);

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    // Forms
    const emptyItem = { item_name: '', item_code: '', category: 'Kitchen Provisions', unit: 'Kgs', quantity: 0, reorder_level: 10, unit_price: 0, location: '', supplier: '', notes: '', is_kitchen: false };
    const emptyIssue = { item_id: 0, issued_to: '', department: '', quantity: 1, purpose: '', notes: '' };
    const emptyReceive = { item_id: 0, quantity: 0, supplier: '', invoice_ref: '', unit_cost: 0, notes: '' };

    const [itemForm, setItemForm] = useState(emptyItem);
    const [issueForm, setIssueForm] = useState(emptyIssue);
    const [receiveForm, setReceiveForm] = useState(emptyReceive);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [iRes, isRes, pRes] = await Promise.all([
            supabase.from('school_store_items').select('*').order('item_name'),
            supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_store_purchases').select('*').order('created_at', { ascending: false }).limit(500),
        ]);
        setItems(iRes.data || []);
        setIssuances(isRes.data || []);
        setPurchases(pRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Stats
    const kitchenItems = items.filter(i => i.category === 'Kitchen Provisions' || i.is_kitchen);
    const lowStockItems = items.filter(i => i.quantity <= (i.reorder_level || 5));
    const totalValue = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const todayIssues = issuances.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString());

    const filtered = useMemo(() => {
        return items.filter(i => {
            if (tab === 'kitchen' && i.category !== 'Kitchen Provisions' && !i.is_kitchen) return false;
            if (filterCat !== 'All' && i.category !== filterCat) return false;
            if (search) { const q = search.toLowerCase(); return i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q); }
            return true;
        });
    }, [items, tab, filterCat, search]);

    // Save Item
    const saveItem = async () => {
        if (!itemForm.item_name.trim()) { toast.error('Item name required'); return; }
        setSaving(true);
        const payload = { ...itemForm, is_kitchen: itemForm.category === 'Kitchen Provisions' || itemForm.is_kitchen };
        if (editing) {
            const { error } = await supabase.from('school_store_items').update(payload).eq('id', editing.id);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Item updated ✅');
        } else {
            const { error } = await supabase.from('school_store_items').insert([payload]);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Item added ✅');
        }
        setShowItemModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    // Issue Item
    const issueItem = async () => {
        if (!issueForm.item_id || !issueForm.issued_to.trim() || issueForm.quantity < 1) { toast.error('Fill all required fields'); return; }
        const item = items.find(i => i.id === issueForm.item_id);
        if (!item || item.quantity < issueForm.quantity) { toast.error('Insufficient stock'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_store_issuances').insert([{
            item_id: issueForm.item_id, item_name: item.item_name, issued_to: issueForm.issued_to,
            department: issueForm.department || null, quantity: issueForm.quantity,
            purpose: issueForm.purpose || null, notes: issueForm.notes || null,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_items').update({ quantity: item.quantity - issueForm.quantity }).eq('id', item.id);
        toast.success(`${issueForm.quantity} ${item.unit || 'units'} of ${item.item_name} issued ✅`);
        setShowIssueModal(false); setIssueForm(emptyIssue); setSaving(false); fetchAll();
    };

    // Receive Stock (GRN)
    const receiveStock = async () => {
        if (!receiveForm.item_id || receiveForm.quantity <= 0) { toast.error('Select item and quantity'); return; }
        const item = items.find(i => i.id === receiveForm.item_id);
        if (!item) return;
        setSaving(true);
        await supabase.from('school_store_purchases').insert([{
            item_id: receiveForm.item_id, item_name: item.item_name, quantity: receiveForm.quantity,
            supplier: receiveForm.supplier || null, invoice_ref: receiveForm.invoice_ref || null,
            unit_cost: receiveForm.unit_cost || item.unit_price || 0, total_cost: receiveForm.quantity * (receiveForm.unit_cost || item.unit_price || 0),
            notes: receiveForm.notes || null,
        }]);
        await supabase.from('school_store_items').update({
            quantity: item.quantity + receiveForm.quantity,
            unit_price: receiveForm.unit_cost || item.unit_price,
        }).eq('id', item.id);
        toast.success(`${receiveForm.quantity} ${item.unit} received into stock ✅`);
        setShowReceiveModal(false); setReceiveForm(emptyReceive); setSaving(false); fetchAll();
    };

    const deleteItem = async (id: number) => {
        if (!confirm('Delete this store item?')) return;
        await supabase.from('school_store_items').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    const exportCSV = () => {
        const rows = filtered.map(i => ({ Code: i.item_code || '', Name: i.item_name, Category: i.category, Qty: i.quantity, Unit: i.unit, Price: i.unit_price, Value: (i.quantity * i.unit_price), Reorder: i.reorder_level, Location: i.location || '', Supplier: i.supplier || '' }));
        if (!rows.length) return;
        const h = Object.keys(rows[0]);
        const csv = [h.join(','), ...rows.map(r => h.map(k => `"${(r as any)[k] ?? ''}"`).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `stores_inventory.csv`; a.click();
    };

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-amber-200 outline-none";

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>📦</div>
            <p className="text-sm font-bold text-gray-500">Loading Ultra Stores…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <FiBox className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                📦 Ultra Stores & Kitchen
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">ULTRA</span>
                            </h1>
                            <p className="text-amber-300 text-xs mt-0.5 font-medium">Inventory • Kitchen Provisions • GRN • Issuances • Reorder Alerts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setItemForm(emptyItem); setEditing(null); setShowItemModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 shadow-md"><FiPlus size={12} /> Add Item</button>
                        <button onClick={() => { setReceiveForm(emptyReceive); setShowReceiveModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 flex items-center gap-1.5 shadow-md"><FiTruck size={12} /> Receive Stock</button>
                        <button onClick={() => { setIssueForm(emptyIssue); setShowIssueModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-1.5 shadow-md"><FiMinus size={12} /> Issue</button>
                        <button onClick={exportCSV} className="px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"><FiDownload size={12} /> Export</button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Items', value: String(items.length), emoji: '📦' },
                            { label: 'Stock Value', value: fmt(totalValue), emoji: '💰' },
                            { label: 'Kitchen Items', value: String(kitchenItems.length), emoji: '🍳' },
                            { label: 'Low Stock', value: String(lowStockItems.length), emoji: '⚠️', pulse: lowStockItems.length > 0 },
                            { label: "Today's Issues", value: String(todayIssues.length), emoji: '📋' },
                            { label: 'Total Issues', value: String(issuances.length), emoji: '📤' },
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
                    { k: 'inventory', l: '📦 All Inventory', count: items.length },
                    { k: 'kitchen', l: '🍳 Kitchen Provisions', count: kitchenItems.length },
                    { k: 'issue', l: '📤 Issuance Log', count: issuances.length },
                    { k: 'purchase', l: '📥 Goods Received', count: purchases.length },
                    { k: 'low', l: '⚠️ Low Stock', count: lowStockItems.length },
                ] as { k: Tab; l: string; count: number }[]).map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                        style={tab === t.k ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        {t.l} <span className="text-[10px] font-bold opacity-60">({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            {(tab === 'inventory' || tab === 'kitchen') && (
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-white" /></div>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none bg-white"><option value="All">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                </div>
            )}

            {/* ═══ INVENTORY TABLE ═══ */}
            {(tab === 'inventory' || tab === 'kitchen') && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Code', 'Item Name', 'Category', 'Qty', 'Unit', 'Price', 'Value', 'Reorder', 'Stock', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">📦</span><p className="text-sm font-medium">No items found</p></td></tr>
                                ) : filtered.map((i, idx) => {
                                    const isLow = i.quantity <= (i.reorder_level || 5);
                                    return (
                                        <tr key={i.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono font-bold text-amber-600">{i.item_code || '-'}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">
                                                {i.item_name}
                                                {(i.category === 'Kitchen Provisions' || i.is_kitchen) && <span className="ml-1.5 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">🍳 KITCHEN</span>}
                                            </td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{i.category}</span></td>
                                            <td className="px-3 py-2.5 text-center text-sm font-extrabold" style={{ color: isLow ? '#ef4444' : '#1f2937' }}>{i.quantity}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{i.unit || 'Pcs'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600">{fmt(i.unit_price || 0)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt((i.quantity || 0) * (i.unit_price || 0))}</td>
                                            <td className="px-3 py-2.5 text-center text-xs text-gray-500">{i.reorder_level || 5}</td>
                                            <td className="px-3 py-2.5">{isLow ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiAlertCircle size={10} /> LOW</span> : <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiCheckCircle size={10} /> OK</span>}</td>
                                            <td className="px-3 py-2.5 flex items-center gap-1">
                                                <button onClick={() => { setEditing(i); setItemForm({ ...emptyItem, ...i }); setShowItemModal(true); }} className="p-1.5 rounded hover:bg-blue-50"><FiEdit2 size={12} className="text-blue-500" /></button>
                                                <button onClick={() => deleteItem(i.id)} className="p-1.5 rounded hover:bg-red-50"><FiTrash2 size={12} className="text-red-400" /></button>
                                                <button onClick={() => { setIssueForm({ ...emptyIssue, item_id: i.id }); setShowIssueModal(true); }} className="p-1.5 rounded hover:bg-amber-50"><FiMinus size={12} className="text-amber-500" /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                        <span>Showing {filtered.length} items • Total Value: <strong className="text-green-600">{fmt(filtered.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}</strong></span>
                    </div>
                </div>
            )}

            {/* ═══ ISSUANCE LOG ═══ */}
            {tab === 'issue' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Item', 'Qty', 'Issued To', 'Department', 'Purpose', 'Notes'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {issuances.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">📤</span><p className="text-sm">No issuances recorded</p></td></tr>
                                ) : issuances.map((is, i) => (
                                    <tr key={is.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(is.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{is.item_name}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-amber-600">{is.quantity}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-700">{is.issued_to}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{is.department || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{is.purpose || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{is.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ GOODS RECEIVED ═══ */}
            {tab === 'purchase' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Item', 'Qty', 'Unit Cost', 'Total', 'Supplier', 'Invoice Ref', 'Notes'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {purchases.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">📥</span><p className="text-sm">No goods received notes yet</p></td></tr>
                                ) : purchases.map((p, i) => (
                                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{p.item_name}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-green-600">+{p.quantity}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600">{fmt(p.unit_cost)}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{fmt(p.total_cost)}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{p.supplier || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{p.invoice_ref || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{p.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ LOW STOCK ALERTS ═══ */}
            {tab === 'low' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-red-50 border-b border-red-200"><p className="text-xs font-bold text-red-700 flex items-center gap-2"><FiAlertCircle size={14} /> ⚠️ {lowStockItems.length} items below reorder level — requires immediate action</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-red-50/50 border-b border-red-200">
                                {['#', 'Item', 'Category', 'Current Qty', 'Reorder Level', 'Shortfall', 'Supplier', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-red-600 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {lowStockItems.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">✅</span><p className="text-sm font-medium">All items adequately stocked!</p></td></tr>
                                ) : lowStockItems.map((i, idx) => (
                                    <tr key={i.id} className="border-b border-gray-100">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{i.item_name}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{i.category}</span></td>
                                        <td className="px-3 py-2.5 text-center text-lg font-extrabold text-red-600">{i.quantity}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-gray-600">{i.reorder_level || 5}</td>
                                        <td className="px-3 py-2.5 text-center text-sm font-bold text-red-600">-{Math.max(0, (i.reorder_level || 5) - i.quantity)}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{i.supplier || '-'}</td>
                                        <td className="px-3 py-2.5"><button onClick={() => { setReceiveForm({ ...emptyReceive, item_id: i.id }); setShowReceiveModal(true); }} className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>Restock</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ ADD/EDIT ITEM MODAL ═══ */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowItemModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiBox /> {editing ? 'Edit Item' : 'Add Store Item'}</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Item Name *</label><input value={itemForm.item_name} onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Code</label><input value={itemForm.item_code} onChange={e => setItemForm({ ...itemForm, item_code: e.target.value })} className={inputCls} placeholder="e.g. KIT-001" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label><select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label><input type="number" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} className={inputCls} min="0" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Unit</label><select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} className={inputCls}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Unit Price (KES)</label><input type="number" value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reorder Level</label><input type="number" value={itemForm.reorder_level} onChange={e => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Location</label><input value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} className={inputCls} placeholder="e.g. Store Room A" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier</label><input value={itemForm.supplier} onChange={e => setItemForm({ ...itemForm, supplier: e.target.value })} className={inputCls} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={saveItem} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Item'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ISSUE MODAL ═══ */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowIssueModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiMinus /> Issue Store Item</h3></div>
                        <div className="p-6 space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Item *</label><select value={issueForm.item_id} onChange={e => setIssueForm({ ...issueForm, item_id: Number(e.target.value) })} className={inputCls}><option value={0}>Select item</option>{items.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.quantity} {i.unit})</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Issued To *</label><input value={issueForm.issued_to} onChange={e => setIssueForm({ ...issueForm, issued_to: e.target.value })} className={inputCls} placeholder="Teacher / Department name" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Department</label><input value={issueForm.department} onChange={e => setIssueForm({ ...issueForm, department: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label><input type="number" value={issueForm.quantity} onChange={e => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })} className={inputCls} min="1" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Purpose</label><input value={issueForm.purpose} onChange={e => setIssueForm({ ...issueForm, purpose: e.target.value })} className={inputCls} placeholder="e.g. Boarding kitchen, Lab practical" /></div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={issueItem} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>{saving ? 'Issuing...' : 'Issue Item'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ RECEIVE STOCK MODAL (GRN) ═══ */}
            {showReceiveModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowReceiveModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiTruck /> Receive Stock (GRN)</h3></div>
                        <div className="p-6 space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Item *</label><select value={receiveForm.item_id} onChange={e => setReceiveForm({ ...receiveForm, item_id: Number(e.target.value) })} className={inputCls}><option value={0}>Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_name} (Current: {i.quantity} {i.unit})</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity Received *</label><input type="number" value={receiveForm.quantity} onChange={e => setReceiveForm({ ...receiveForm, quantity: Number(e.target.value) })} className={inputCls} min="1" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Unit Cost (KES)</label><input type="number" value={receiveForm.unit_cost} onChange={e => setReceiveForm({ ...receiveForm, unit_cost: Number(e.target.value) })} className={inputCls} /></div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier</label><input value={receiveForm.supplier} onChange={e => setReceiveForm({ ...receiveForm, supplier: e.target.value })} className={inputCls} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Invoice / Delivery Note Ref</label><input value={receiveForm.invoice_ref} onChange={e => setReceiveForm({ ...receiveForm, invoice_ref: e.target.value })} className={inputCls} placeholder="INV-12345" /></div>
                            {receiveForm.quantity > 0 && receiveForm.unit_cost > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                                    <p className="text-xs text-green-700 font-bold">Total Cost: <span className="text-lg">{fmt(receiveForm.quantity * receiveForm.unit_cost)}</span></p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowReceiveModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={receiveStock} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>{saving ? 'Receiving...' : 'Receive into Stock'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

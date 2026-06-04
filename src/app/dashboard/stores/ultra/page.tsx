'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBox, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
    FiDownload, FiAlertCircle, FiMinus, FiTruck, FiShoppingCart,
    FiCheckCircle, FiFilter, FiPrinter, FiArrowRight,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CATEGORIES = [
    'Kitchen Provisions', 'Cleaning Supplies', 'Stationery', 'Laboratory',
    'Sports', 'Uniforms', 'Toiletries', 'Maintenance', 'Office',
    'First Aid', 'Electrical', 'Furniture', 'Fuel', 'Other',
];
const UNITS = ['Kgs', 'Litres', 'Pieces', 'Packets', 'Boxes', 'Reams', 'Rolls', 'Pairs', 'Sets', 'Dozens', 'Bags', 'Trays', 'Crates', 'Cartons', 'Bottles', 'Tins', 'Bundles'];
const DEPARTMENTS = ['Principal Office', 'Boarding', 'Kitchen', 'Library', 'Laboratory', 'Sports', 'Accounts', 'Security', 'Grounds', 'Medical'];
const CAT_PREFIX: Record<string, string> = {
    'Kitchen Provisions': 'KIT', 'Cleaning Supplies': 'CLN', 'Stationery': 'STA',
    'Laboratory': 'LAB', 'Sports': 'SPT', 'Uniforms': 'UNF', 'Toiletries': 'TOI',
    'Maintenance': 'MNT', 'Office': 'OFF', 'First Aid': 'FAD', 'Electrical': 'ELC',
    'Furniture': 'FUR', 'Fuel': 'FUL', 'Other': 'OTH',
};

type Tab = 'inventory' | 'kitchen' | 'issue' | 'grn' | 'low';

/** Auto-generate item code: KIT-00001, STA-00003, etc. */
const genItemCode = (category: string, existingItems: any[]) => {
    const pfx = CAT_PREFIX[category] || 'STR';
    const count = existingItems.filter(i => (i.item_code || '').startsWith(pfx)).length + 1;
    return `${pfx}-${String(count).padStart(5, '0')}`;
};

export default function UltraStoresPage() {
    const [tab, setTab] = useState<Tab>('inventory');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [grns, setGrns] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);           // ← from school_suppliers
    const [procInvoices, setProcInvoices] = useState<any[]>([]);     // ← from school_supplier_invoices
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [saving, setSaving] = useState(false);

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showGRNModal, setShowGRNModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    // Forms
    const emptyItem = {
        item_name: '', item_code: '', category: 'Kitchen Provisions', unit: 'Kgs',
        quantity: 0, reorder_level: 10, unit_price: 0, location: '',
        supplier_id: '', supplier: '', notes: '', is_kitchen: false,
    };
    const emptyIssue = { item_id: 0, issued_to: '', department: '', quantity: 1, purpose: '', notes: '' };
    const emptyGRN = {
        item_id: 0, quantity: 0, supplier_id: '', invoice_ref: '',
        proc_invoice_id: '', unit_cost: 0, notes: '', received_by: 'Store Keeper',
        grn_number: '',
    };

    const [itemForm, setItemForm] = useState(emptyItem);
    const [issueForm, setIssueForm] = useState(emptyIssue);
    const [grnForm, setGrnForm] = useState(emptyGRN);

    /* ─── FETCH ALL ─────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [iRes, isRes, gRes, supRes, invRes, scRes] = await Promise.all([
            supabase.from('school_store_items').select('*').order('item_name'),
            supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_store_purchases').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_suppliers').select('id,supplier_name,phone,category,status').order('supplier_name'),
            supabase.from('school_supplier_invoices').select('id,invoice_number,supplier_id,total_amount,balance,status,due_date').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
        ]);
        setItems(iRes.data || []);
        setIssuances(isRes.data || []);
        setGrns(gRes.data || []);
        setSuppliers(supRes.data || []);
        setProcInvoices(invRes.data || []);
        setSchoolInfo(scRes.data || {});
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ─── STATS ─────────────────────────────────────── */
    const kitchenItems = items.filter(i => i.category === 'Kitchen Provisions' || i.is_kitchen);
    const lowStockItems = items.filter(i => i.quantity <= (i.reorder_level || 5));
    const totalValue = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const todayIssues = issuances.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString());

    const filtered = useMemo(() => items.filter(i => {
        if (tab === 'kitchen' && i.category !== 'Kitchen Provisions' && !i.is_kitchen) return false;
        if (filterCat !== 'All' && i.category !== filterCat) return false;
        if (search) { const q = search.toLowerCase(); return i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q); }
        return true;
    }), [items, tab, filterCat, search]);

    /* ─── SAVE ITEM ─────────────────────────────────── */
    const saveItem = async () => {
        if (!itemForm.item_name.trim()) { toast.error('Item name is required'); return; }
        setSaving(true);
        const sup = suppliers.find(s => String(s.id) === String(itemForm.supplier_id));
        const payload = {
            ...itemForm,
            supplier: sup?.supplier_name || itemForm.supplier || '',
            is_kitchen: itemForm.category === 'Kitchen Provisions' || itemForm.is_kitchen,
        };
        const { error } = editing
            ? await supabase.from('school_store_items').update(payload).eq('id', editing.id)
            : await supabase.from('school_store_items').insert([payload]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? '✅ Item updated!' : '✅ Item added!');
        setShowItemModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    /* ─── ISSUE ITEM ────────────────────────────────── */
    const issueItem = async () => {
        if (!issueForm.item_id || !issueForm.issued_to.trim() || issueForm.quantity < 1) {
            toast.error('Fill all required fields'); return;
        }
        const item = items.find(i => i.id === issueForm.item_id);
        if (!item || item.quantity < issueForm.quantity) { toast.error('Insufficient stock'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_store_issuances').insert([{
            item_id: issueForm.item_id, item_name: item.item_name,
            issued_to: issueForm.issued_to, department: issueForm.department || null,
            quantity: issueForm.quantity, purpose: issueForm.purpose || null, notes: issueForm.notes || null,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_items').update({ quantity: item.quantity - issueForm.quantity }).eq('id', item.id);
        toast.success(`✅ ${issueForm.quantity} ${item.unit} of ${item.item_name} issued`);
        setShowIssueModal(false); setIssueForm(emptyIssue); setSaving(false); fetchAll();
    };

    /* ─── RECEIVE STOCK (GRN) ────────────────────────── */
    const receiveStock = async () => {
        if (!grnForm.item_id || grnForm.quantity <= 0) { toast.error('Select item and enter quantity'); return; }
        const item = items.find(i => i.id === grnForm.item_id);
        if (!item) return;

        // Duplicate check on invoice_ref
        if (grnForm.invoice_ref.trim()) {
            const { data: existing } = await supabase
                .from('school_store_purchases')
                .select('id')
                .eq('invoice_ref', grnForm.invoice_ref.trim())
                .maybeSingle();
            if (existing) {
                toast.error(`⚠️ Invoice ${grnForm.invoice_ref} already received into stock!`);
                return;
            }
        }

        setSaving(true);
        const sup = suppliers.find(s => String(s.id) === String(grnForm.supplier_id));
        const procInv = procInvoices.find(i => String(i.id) === String(grnForm.proc_invoice_id));
        const totalCost = grnForm.quantity * (grnForm.unit_cost || item.unit_price || 0);
        const grnNumber = `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}`;

        const { error } = await supabase.from('school_store_purchases').insert([{
            item_id: grnForm.item_id, item_name: item.item_name,
            quantity: grnForm.quantity, supplier_id: grnForm.supplier_id || null,
            supplier: sup?.supplier_name || '', invoice_ref: grnForm.invoice_ref || procInv?.invoice_number || null,
            proc_invoice_id: grnForm.proc_invoice_id || null,
            unit_cost: grnForm.unit_cost || item.unit_price || 0,
            total_cost: totalCost, grn_number: grnNumber,
            received_by: grnForm.received_by || 'Store Keeper', notes: grnForm.notes || null,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_items').update({
            quantity: item.quantity + grnForm.quantity,
            unit_price: grnForm.unit_cost || item.unit_price,
            supplier: sup?.supplier_name || item.supplier,
            supplier_id: grnForm.supplier_id || item.supplier_id,
        }).eq('id', item.id);

        toast.success(`✅ ${grnForm.quantity} ${item.unit} of ${item.item_name} received • ${grnNumber}`);
        setShowGRNModal(false); setGrnForm(emptyGRN); setSaving(false); fetchAll();
    };

    const deleteItem = async (id: number) => {
        if (!confirm('Delete this store item? This cannot be undone.')) return;
        await supabase.from('school_store_items').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    /* ─── PRINT GRN ─────────────────────────────────── */
    const printGRN = (grn: any) => {
        const item = items.find(i => i.id === grn.item_id);
        const sup = suppliers.find(s => s.id === grn.supplier_id);
        const w = window.open('', '_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>${grn.grn_number || 'GRN'}</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;font-size:13px;}
.h{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #16a34a;}
.hn{font-size:18px;font-weight:900;color:#16a34a;}.b{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;}
table{width:100%;border-collapse:collapse;margin:12px 0;}td,th{padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;}
th{background:#f8fafc;font-weight:700;text-transform:uppercase;font-size:10px;}
.total{background:#16a34a;color:#fff;font-weight:900;}.footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
.sb{border-top:2px solid #334155;padding-top:8px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
</style></head><body>
<div class="h"><div><p class="hn">${schoolInfo?.school_name || 'APSIMS School'}</p>
<p style="font-size:11px;color:#64748b">${schoolInfo?.address || ''} | ${schoolInfo?.phone || ''}</p></div>
<div style="text-align:right"><p style="font-size:10px;text-transform:uppercase;color:#64748b">Goods Received Note</p>
<p style="font-size:20px;font-weight:900;color:#16a34a">${grn.grn_number || 'GRN'}</p>
<p style="font-size:11px">${fmtDate(grn.created_at)}</p></div></div>
<div class="b"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b">Supplier</p>
<p style="font-weight:700">${sup?.supplier_name || grn.supplier || '—'}</p><p style="font-size:12px">${sup?.phone || ''}</p></div>
<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b">Invoice Reference</p>
<p style="font-weight:700;font-family:monospace">${grn.invoice_ref || '—'}</p>
<p style="font-size:12px">Received by: ${grn.received_by || '—'}</p></div></div></div>
<table><thead><tr><th>Item</th><th>Category</th><th>Qty Received</th><th>Unit</th><th>Unit Cost (KES)</th><th>Total Cost (KES)</th></tr></thead>
<tbody><tr><td>${grn.item_name}</td><td>${item?.category || '—'}</td><td style="text-align:center;font-weight:700">${grn.quantity}</td>
<td>${item?.unit || '—'}</td><td style="text-align:right">${Number(grn.unit_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
<td style="text-align:right;font-weight:900">${Number(grn.total_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr>
<tr class="total"><td colspan="5" style="text-align:right">TOTAL VALUE RECEIVED</td>
<td style="text-align:right">KES ${Number(grn.total_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr></tbody></table>
${grn.notes ? `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:12px"><strong>Notes:</strong> ${grn.notes}</div>` : ''}
<div class="footer">
<div class="sb">Store Keeper<br/>${grn.received_by || '___________'}</div>
<div class="sb">Head of Department<br/>___________</div>
<div class="sb">Authorized by<br/>Principal / Bursar</div></div>
<p style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8">APSIMS · ${new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
<script>window.onload=()=>{window.print();}</script></body></html>`);
        w?.document.close();
    };

    const exportCSV = () => {
        const rows = filtered.map(i => ({ Code: i.item_code || '', Name: i.item_name, Category: i.category, Qty: i.quantity, Unit: i.unit, Price: i.unit_price, Value: i.quantity * i.unit_price, Reorder: i.reorder_level, Location: i.location || '', Supplier: i.supplier || '' }));
        if (!rows.length) return;
        const h = Object.keys(rows[0]);
        const csv = [h.join(','), ...rows.map(r => h.map(k => `"${(r as any)[k] ?? ''}"`).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `stores_inventory_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    };

    const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-amber-200 outline-none transition';

    const tabs = [
        { k: 'inventory', l: '📦 All Inventory', count: items.length },
        { k: 'kitchen', l: '🍳 Kitchen', count: kitchenItems.length },
        { k: 'issue', l: '📤 Issuance Log', count: issuances.length },
        { k: 'grn', l: '📥 Goods Received', count: grns.length },
        { k: 'low', l: '⚠️ Low Stock', count: lowStockItems.length },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>📦</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-amber-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Ultra Stores…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ════ HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#78350f 0%,#92400e 40%,#b45309 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fbbf24,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl p-2.5" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                <FiBox className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    📦 Ultra Stores & Kitchen
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>ULTRA</span>
                                </h1>
                                <p className="text-amber-300 text-xs mt-0.5 font-medium">Inventory · GRN · Issuances · Low Stock · Linked to Procurement</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => { setItemForm({ ...emptyItem, item_code: genItemCode('Kitchen Provisions', items) }); setEditing(null); setShowItemModal(true); }}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 shadow-md transition">
                                <FiPlus size={12} /> Add Item
                            </button>
                            <button onClick={() => { setGrnForm({ ...emptyGRN, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                <FiTruck size={12} /> Receive Stock (GRN)
                            </button>
                            <button onClick={() => { setIssueForm(emptyIssue); setShowIssueModal(true); }}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-1.5 shadow-md transition">
                                <FiMinus size={12} /> Issue Items
                            </button>
                            <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition">
                                <FiDownload size={12} /> Export
                            </button>
                            <button onClick={fetchAll} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Total Items', value: items.length, icon: '📦' },
                            { label: 'Stock Value', value: fmt(totalValue), icon: '💰' },
                            { label: 'Kitchen Items', value: kitchenItems.length, icon: '🍳' },
                            { label: 'Low Stock', value: lowStockItems.length, icon: '⚠️', pulse: lowStockItems.length > 0 },
                            { label: "Today's Issues", value: todayIssues.length, icon: '📋' },
                            { label: 'Total GRNs', value: grns.length, icon: '📥' },
                        ].map((c: any, i) => (
                            <div key={i} className={`rounded-xl p-3 transition-all hover:scale-[1.03] ${c.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-1.5 mb-1"><span className="text-sm">{c.icon}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.label}</span></div>
                                <p className="text-xl font-black text-white">{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                    {tabs.map(t => (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={tab === t.k ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {t.l} <span className="text-[10px] font-bold opacity-60">({t.count})</span>
                        </button>
                    ))}
                </div>
                {(tab === 'inventory' || tab === 'kitchen') && (
                    <div className="flex gap-2 flex-wrap">
                        <div className="relative min-w-[200px]">
                            <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none bg-white" />
                        </div>
                        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none bg-white">
                            <option value="All">All Categories</option>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* ════ INVENTORY TABLE ════ */}
            {(tab === 'inventory' || tab === 'kitchen') && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Code', 'Item Name', 'Category', 'Qty', 'Unit', 'Price', 'Value', 'Reorder', 'Stock', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">📦</span><p className="text-sm font-medium">No items found</p></td></tr>
                                ) : filtered.map((item, idx) => {
                                    const isLow = item.quantity <= (item.reorder_level || 5);
                                    return (
                                        <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono font-bold text-amber-600">{item.item_code || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">
                                                {item.item_name}
                                                {(item.category === 'Kitchen Provisions' || item.is_kitchen) && <span className="ml-1.5 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">🍳 KITCHEN</span>}
                                            </td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{item.category}</span></td>
                                            <td className="px-3 py-2.5 text-center text-sm font-extrabold" style={{ color: isLow ? '#ef4444' : '#1f2937' }}>{item.quantity}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{item.unit}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600">{fmt(item.unit_price)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt((item.quantity || 0) * (item.unit_price || 0))}</td>
                                            <td className="px-3 py-2.5 text-center text-xs text-gray-500">{item.reorder_level || 5}</td>
                                            <td className="px-3 py-2.5">
                                                {isLow
                                                    ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiAlertCircle size={9} /> LOW</span>
                                                    : <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><FiCheckCircle size={9} /> OK</span>}
                                            </td>
                                            <td className="px-3 py-2.5 flex items-center gap-1">
                                                <button onClick={() => { setEditing(item); setItemForm({ ...emptyItem, ...item }); setShowItemModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 transition"><FiEdit2 size={12} className="text-blue-500" /></button>
                                                <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition"><FiTrash2 size={12} className="text-red-400" /></button>
                                                <button onClick={() => { setIssueForm({ ...emptyIssue, item_id: item.id }); setShowIssueModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 transition"><FiMinus size={12} className="text-amber-500" /></button>
                                                <button onClick={() => { setGrnForm({ ...emptyGRN, item_id: item.id, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }} className="p-1.5 rounded-lg hover:bg-green-50 transition"><FiTruck size={12} className="text-green-500" /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                        <span>Showing {filtered.length} items</span>
                        <span>Total Value: <strong className="text-green-600">{fmt(filtered.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}</strong></span>
                    </div>
                </div>
            )}

            {/* ════ ISSUANCE LOG ════ */}
            {tab === 'issue' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Item', 'Qty', 'Issued To', 'Department', 'Purpose', 'Notes'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {issuances.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">📤</span><p className="text-sm">No issuances recorded</p></td></tr>
                                ) : issuances.map((is, i) => (
                                    <tr key={is.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDate(is.created_at)}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{is.item_name}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-amber-600">{is.quantity}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-700">{is.issued_to}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{is.department || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{is.purpose || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{is.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ GOODS RECEIVED (GRN) ════ */}
            {tab === 'grn' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'GRN No.', 'Date', 'Item', 'Qty', 'Unit Cost', 'Total', 'Supplier', 'Invoice Ref', 'Received By', 'Print'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {grns.length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">📥</span><p className="text-sm">No goods received notes yet</p></td></tr>
                                ) : grns.map((g, i) => (
                                    <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono font-bold text-green-600">{g.grn_number || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDate(g.created_at)}</td>
                                        <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{g.item_name}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-green-600">+{g.quantity}</td>
                                        <td className="px-3 py-2.5 text-sm text-gray-600">{fmt(g.unit_cost)}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{fmt(g.total_cost)}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{g.supplier || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{g.invoice_ref || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{g.received_by || '—'}</td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => printGRN(g)} className="p-1.5 rounded-lg hover:bg-green-50 transition"><FiPrinter size={12} className="text-green-600" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ LOW STOCK ALERTS ════ */}
            {tab === 'low' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {lowStockItems.length > 0 && (
                        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2">
                            <FiAlertCircle className="text-red-500" size={14} />
                            <p className="text-xs font-bold text-red-700">⚠️ {lowStockItems.length} items below reorder level</p>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-red-50/50 border-b border-red-200">
                                {['#', 'Item', 'Category', 'Current', 'Reorder', 'Shortfall', 'Supplier', 'Action'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-red-600 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {lowStockItems.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">✅</span><p className="text-sm font-medium">All items adequately stocked!</p></td></tr>
                                ) : lowStockItems.map((item, idx) => (
                                    <tr key={item.id} className="border-b border-gray-100">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{item.item_name}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{item.category}</span></td>
                                        <td className="px-3 py-2.5 text-center text-lg font-extrabold text-red-600">{item.quantity}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-gray-600">{item.reorder_level || 5}</td>
                                        <td className="px-3 py-2.5 text-center text-sm font-bold text-red-600">-{Math.max(0, (item.reorder_level || 5) - item.quantity)}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{item.supplier || '—'}</td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => { setGrnForm({ ...emptyGRN, item_id: item.id, supplier_id: item.supplier_id || '', grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }}
                                                className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                📥 Restock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ ADD/EDIT ITEM MODAL ════ */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowItemModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiBox /> {editing ? 'Edit Item' : 'Add Store Item'}</h3>
                            <button onClick={() => setShowItemModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Item Name *</label>
                                    <input value={itemForm.item_name} onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })} className={inputCls} placeholder="e.g. Maize Flour 2kg" />
                                </div>

                                {/* Auto-generated code */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Item Code (auto-generated)</label>
                                    <div className="flex gap-1.5">
                                        <input value={itemForm.item_code} onChange={e => setItemForm({ ...itemForm, item_code: e.target.value })} className={`${inputCls} font-mono text-amber-700`} placeholder="KIT-00001" />
                                        {!editing && (
                                            <button onClick={() => setItemForm(f => ({ ...f, item_code: genItemCode(f.category, items) }))}
                                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition" title="Regenerate">
                                                <FiRefreshCw size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category</label>
                                    <select value={itemForm.category}
                                        onChange={e => setItemForm(f => ({ ...f, category: e.target.value, item_code: editing ? f.item_code : genItemCode(e.target.value, items) }))}
                                        className={inputCls}>
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Quantity</label>
                                    <input type="number" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} className={inputCls} min="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Unit</label>
                                    <select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} className={inputCls}>
                                        {UNITS.map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Unit Price (KES)</label>
                                    <input type="number" value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })} className={inputCls} min="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reorder Level</label>
                                    <input type="number" value={itemForm.reorder_level} onChange={e => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })} className={inputCls} min="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Location</label>
                                    <input value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} className={inputCls} placeholder="e.g. Store Room A" />
                                </div>

                                {/* ✅ SUPPLIER FROM DB */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier (from Procurement)</label>
                                    <select value={itemForm.supplier_id} onChange={e => setItemForm({ ...itemForm, supplier_id: e.target.value })} className={inputCls}>
                                        <option value="">— None / Manual —</option>
                                        {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label>
                                    <textarea value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} className={inputCls} rows={2} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={saveItem} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                {saving ? 'Saving…' : editing ? 'Update Item' : '📦 Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ ISSUE MODAL ════ */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowIssueModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiMinus /> Issue Store Item</h3>
                            <button onClick={() => setShowIssueModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Item *</label>
                                <select value={issueForm.item_id} onChange={e => setIssueForm({ ...issueForm, item_id: Number(e.target.value) })} className={inputCls}>
                                    <option value={0}>Select item…</option>
                                    {items.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.item_name} — {i.quantity} {i.unit} in stock</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Issued To *</label>
                                <input value={issueForm.issued_to} onChange={e => setIssueForm({ ...issueForm, issued_to: e.target.value })} className={inputCls} placeholder="Teacher / Staff name" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Department</label>
                                    <select value={issueForm.department} onChange={e => setIssueForm({ ...issueForm, department: e.target.value })} className={inputCls}>
                                        <option value="">Select…</option>
                                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Quantity *</label>
                                    <input type="number" value={issueForm.quantity} onChange={e => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })} className={inputCls} min="1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Purpose</label>
                                <input value={issueForm.purpose} onChange={e => setIssueForm({ ...issueForm, purpose: e.target.value })} className={inputCls} placeholder="e.g. Boarding kitchen, Lab practical…" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label>
                                <textarea value={issueForm.notes} onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} className={inputCls} rows={2} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={issueItem} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                {saving ? 'Issuing…' : '📤 Issue Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ GRN MODAL ════ */}
            {showGRNModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowGRNModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiTruck /> Receive Stock — Goods Received Note</h3>
                            <button onClick={() => setShowGRNModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            {/* GRN Number */}
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-[10px] font-bold text-green-700 uppercase">GRN Reference Number</p>
                                <p className="text-base font-black text-green-800 font-mono">{grnForm.grn_number}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Item *</label>
                                    <select value={grnForm.item_id} onChange={e => { const item = items.find(i => i.id === Number(e.target.value)); setGrnForm({ ...grnForm, item_id: Number(e.target.value), unit_cost: item?.unit_price || 0, supplier_id: item?.supplier_id || '' }); }} className={inputCls}>
                                        <option value={0}>Select item…</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.item_name} — Current: {i.quantity} {i.unit}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Qty Received *</label>
                                    <input type="number" value={grnForm.quantity} onChange={e => setGrnForm({ ...grnForm, quantity: Number(e.target.value) })} className={inputCls} min="1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Unit Cost (KES)</label>
                                    <input type="number" value={grnForm.unit_cost} onChange={e => setGrnForm({ ...grnForm, unit_cost: Number(e.target.value) })} className={inputCls} min="0" />
                                </div>

                                {/* ✅ SUPPLIER FROM DB */}
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier (from Procurement Suppliers)</label>
                                    <select value={grnForm.supplier_id} onChange={e => setGrnForm({ ...grnForm, supplier_id: e.target.value })} className={inputCls}>
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                    </select>
                                </div>

                                {/* ✅ LINK TO PROCUREMENT INVOICE */}
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Link to Procurement Invoice (optional — auto-fills ref)</label>
                                    <select value={grnForm.proc_invoice_id} onChange={e => {
                                        const inv = procInvoices.find(i => String(i.id) === e.target.value);
                                        setGrnForm({ ...grnForm, proc_invoice_id: e.target.value, invoice_ref: inv?.invoice_number || grnForm.invoice_ref, supplier_id: inv ? String(inv.supplier_id) : grnForm.supplier_id });
                                    }} className={inputCls}>
                                        <option value="">— No linked invoice —</option>
                                        {procInvoices.map(i => <option key={i.id} value={String(i.id)}>{i.invoice_number} — {fmt(i.total_amount)} [{i.status}]</option>)}
                                    </select>
                                    {grnForm.proc_invoice_id && <p className="text-[10px] text-green-600 font-bold mt-1">✅ Linked to procurement invoice — fully traceable</p>}
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Invoice / Delivery Note Ref</label>
                                    <input value={grnForm.invoice_ref} onChange={e => setGrnForm({ ...grnForm, invoice_ref: e.target.value })} className={`${inputCls} font-mono`} placeholder="e.g. SINV-2026-00001" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Received By</label>
                                    <input value={grnForm.received_by} onChange={e => setGrnForm({ ...grnForm, received_by: e.target.value })} className={inputCls} placeholder="Store Keeper name" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label>
                                    <input value={grnForm.notes} onChange={e => setGrnForm({ ...grnForm, notes: e.target.value })} className={inputCls} />
                                </div>
                            </div>

                            {grnForm.quantity > 0 && grnForm.unit_cost > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                                    <span className="text-xs font-bold text-green-700">Total Value Received:</span>
                                    <span className="text-xl font-black text-green-800">{fmt(grnForm.quantity * grnForm.unit_cost)}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowGRNModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={receiveStock} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                {saving ? 'Receiving…' : '📥 Receive into Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBox, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiSave,
    FiDownload, FiAlertCircle, FiTool, FiCamera, FiHash, FiMapPin,
    FiCheckCircle, FiTrendingDown, FiCalendar, FiDollarSign, FiFilter
} from 'react-icons/fi';

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;
const CATEGORIES = ['Furniture', 'Electronics', 'Vehicles', 'Lab Equipment', 'Sports', 'Kitchen', 'Office', 'ICT & Computers', 'Musical Instruments', 'Buildings', 'Textbooks', 'Library', 'Dormitory', 'Other'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Disposed'];
const STATUSES = ['Active', 'Under Repair', 'Disposed', 'Lost', 'Donated'];

export default function UltraAssetsPage() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'register' | 'maintenance' | 'depreciation'>('register');

    // Modals
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const emptyAsset = { asset_name: '', asset_code: '', category: 'Furniture', description: '', serial_number: '', purchase_date: '', purchase_price: 0, current_value: 0, supplier: '', warranty_expiry: '', location: '', assigned_to: '', condition: 'Good', status: 'Active', depreciation_rate: 10, barcode: '', notes: '' };
    const emptyMaint = { asset_id: 0, maintenance_type: 'Repair', description: '', cost: 0, performed_by: '', vendor: '', maintenance_date: new Date().toISOString().split('T')[0], next_due_date: '', notes: '' };

    const [assetForm, setAssetForm] = useState(emptyAsset);
    const [maintForm, setMaintForm] = useState(emptyMaint);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [aRes, mRes] = await Promise.all([
            supabase.from('school_assets').select('*').order('asset_name'),
            supabase.from('school_asset_maintenance').select('*').order('created_at', { ascending: false }).limit(500),
        ]);
        setAssets(aRes.data || []);
        setMaintenance(mRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Stats
    const totalAssetValue = assets.reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0), 0);
    const totalPurchaseValue = assets.reduce((s, a) => s + Number(a.purchase_price || 0), 0);
    const totalDepreciation = totalPurchaseValue - totalAssetValue;
    const underRepair = assets.filter(a => a.status === 'Under Repair').length;
    const dueForMaint = assets.filter(a => a.next_maintenance_date && new Date(a.next_maintenance_date) <= new Date()).length;
    const activeAssets = assets.filter(a => a.status === 'Active').length;

    const filtered = useMemo(() => {
        return assets.filter(a => {
            if (filterCat !== 'All' && a.category !== filterCat) return false;
            if (filterStatus !== 'All' && a.status !== filterStatus) return false;
            if (search) { const q = search.toLowerCase(); return a.asset_name.toLowerCase().includes(q) || (a.asset_code || '').toLowerCase().includes(q) || (a.serial_number || '').toLowerCase().includes(q) || (a.location || '').toLowerCase().includes(q); }
            return true;
        });
    }, [assets, filterCat, filterStatus, search]);

    const saveAsset = async () => {
        if (!assetForm.asset_name.trim()) { toast.error('Asset name required'); return; }
        setSaving(true);
        const code = assetForm.asset_code || `AST-${new Date().getFullYear()}-${String(assets.length + 1).padStart(4, '0')}`;
        const payload = { ...assetForm, asset_code: code, current_value: assetForm.current_value || assetForm.purchase_price };
        if (editing) {
            const { error } = await supabase.from('school_assets').update(payload).eq('id', editing.id);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Asset updated ✅');
        } else {
            const { error } = await supabase.from('school_assets').insert([payload]);
            if (error) { toast.error(error.message); setSaving(false); return; }
            toast.success('Asset registered ✅');
        }
        setShowAssetModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    const saveMaintenance = async () => {
        if (!maintForm.asset_id || !maintForm.description) { toast.error('Select asset and add description'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_asset_maintenance').insert([maintForm]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        // Update asset last/next maintenance dates
        await supabase.from('school_assets').update({
            last_maintenance_date: maintForm.maintenance_date,
            next_maintenance_date: maintForm.next_due_date || null,
            condition: 'Good',
        }).eq('id', maintForm.asset_id);
        toast.success('Maintenance logged ✅');
        setShowMaintenanceModal(false); setMaintForm(emptyMaint); setSaving(false); fetchAll();
    };

    const conditionColors: Record<string, string> = { Excellent: 'bg-emerald-100 text-emerald-700', Good: 'bg-green-100 text-green-700', Fair: 'bg-amber-100 text-amber-700', Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700', Disposed: 'bg-gray-100 text-gray-500' };
    const statusColors: Record<string, string> = { Active: 'bg-green-100 text-green-700', 'Under Repair': 'bg-amber-100 text-amber-700', Disposed: 'bg-gray-100 text-gray-500', Lost: 'bg-red-100 text-red-700', Donated: 'bg-blue-100 text-blue-700' };

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-purple-200 outline-none";

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>🏗️</div>
            <p className="text-sm font-bold text-gray-500">Loading Asset Register…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ═══ ULTRA HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 40%, #7c3aed 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}>
                            <FiBox className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                🏗️ Ultra Asset Management
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full">ULTRA</span>
                            </h1>
                            <p className="text-purple-300 text-xs mt-0.5 font-medium">Asset Register • Depreciation • Maintenance • Barcode Tracking • Disposal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setAssetForm(emptyAsset); setEditing(null); setShowAssetModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 flex items-center gap-1.5 shadow-md"><FiPlus size={12} /> Register Asset</button>
                        <button onClick={() => { setMaintForm(emptyMaint); setShowMaintenanceModal(true); }} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 shadow-md"><FiTool size={12} /> Log Maintenance</button>
                    </div>
                </div>
                <div className="px-6 pb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: 'Total Assets', value: String(assets.length), emoji: '📦' },
                            { label: 'Active', value: String(activeAssets), emoji: '✅' },
                            { label: 'Current Value', value: fmt(totalAssetValue), emoji: '💰' },
                            { label: 'Depreciation', value: fmt(totalDepreciation), emoji: '📉' },
                            { label: 'Under Repair', value: String(underRepair), emoji: '🔧', pulse: underRepair > 0 },
                            { label: 'Maintenance Due', value: String(dueForMaint), emoji: '⏰', pulse: dueForMaint > 0 },
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
                    { k: 'register', l: '📦 Asset Register', count: assets.length },
                    { k: 'maintenance', l: '🔧 Maintenance Log', count: maintenance.length },
                    { k: 'depreciation', l: '📉 Depreciation Report', count: assets.length },
                ] as { k: typeof tab; l: string; count: number }[]).map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                        style={tab === t.k ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(139,92,246,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        {t.l} <span className="text-[10px] font-bold opacity-60">({t.count})</span>
                    </button>
                ))}
            </div>

            {tab === 'register' && (
                <>
                    {/* Filters */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-md"><FiSearch size={14} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets, code, serial, location..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 bg-white" /></div>
                        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none bg-white"><option value="All">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium outline-none bg-white"><option value="All">All Statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                    </div>

                    {/* Asset Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    {['#', 'Code', 'Asset Name', 'Category', 'Location', 'Condition', 'Status', 'Purchase Price', 'Current Value', 'Actions'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🏗️</span><p className="text-sm font-medium">No assets registered yet</p></td></tr>
                                    ) : filtered.map((a, i) => (
                                        <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono font-bold text-purple-600">{a.asset_code || '-'}</td>
                                            <td className="px-3 py-2.5">
                                                <p className="text-sm font-semibold text-gray-800">{a.asset_name}</p>
                                                {a.serial_number && <p className="text-[10px] text-gray-400 font-mono">S/N: {a.serial_number}</p>}
                                            </td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{a.category}</span></td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 flex items-center gap-1"><FiMapPin size={10} /> {a.location || '-'}</td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conditionColors[a.condition] || 'bg-gray-100 text-gray-500'}`}>{a.condition}</span></td>
                                            <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[a.status] || 'bg-gray-100 text-gray-500'}`}>{a.status}</span></td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600">{fmt(a.purchase_price)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(a.current_value || a.purchase_price)}</td>
                                            <td className="px-3 py-2.5 flex items-center gap-1">
                                                <button onClick={() => { setEditing(a); setAssetForm({ ...emptyAsset, ...a }); setShowAssetModal(true); }} className="p-1.5 rounded hover:bg-blue-50"><FiEdit2 size={12} className="text-blue-500" /></button>
                                                <button onClick={() => { setMaintForm({ ...emptyMaint, asset_id: a.id }); setShowMaintenanceModal(true); }} className="p-1.5 rounded hover:bg-amber-50"><FiTool size={12} className="text-amber-500" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                            {filtered.length} assets • Purchase: <strong>{fmt(filtered.reduce((s, a) => s + Number(a.purchase_price || 0), 0))}</strong> • Current: <strong className="text-green-600">{fmt(filtered.reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0), 0))}</strong>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ MAINTENANCE LOG ═══ */}
            {tab === 'maintenance' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Date', 'Asset', 'Type', 'Description', 'Cost', 'Performed By', 'Next Due', 'Status'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {maintenance.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-3">🔧</span><p className="text-sm">No maintenance records</p></td></tr>
                                ) : maintenance.map((m, i) => {
                                    const asset = assets.find(a => a.id === m.asset_id);
                                    return (
                                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(m.maintenance_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{asset?.asset_name || '-'}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{m.maintenance_type}</span></td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{m.description}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-red-600">{fmt(m.cost)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{m.performed_by || '-'}</td>
                                            <td className="px-3 py-2.5 text-xs" style={{ color: m.next_due_date && new Date(m.next_due_date) <= new Date() ? '#ef4444' : '#6b7280' }}>{m.next_due_date ? new Date(m.next_due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '-'}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{m.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ DEPRECIATION REPORT ═══ */}
            {tab === 'depreciation' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">Total Purchase Value</p><p className="text-2xl font-black text-gray-800 mt-1">{fmt(totalPurchaseValue)}</p></div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">Current Book Value</p><p className="text-2xl font-black text-green-600 mt-1">{fmt(totalAssetValue)}</p></div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">Total Depreciation</p><p className="text-2xl font-black text-red-600 mt-1">{fmt(totalDepreciation)}</p></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    {['Asset', 'Category', 'Purchase Date', 'Purchase Price', 'Rate %', 'Age (Yrs)', 'Depreciation', 'Book Value'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {assets.filter(a => a.status === 'Active').map(a => {
                                        const age = a.purchase_date ? Math.max(0, (Date.now() - new Date(a.purchase_date).getTime()) / (365.25 * 86400000)) : 0;
                                        const rate = a.depreciation_rate || 10;
                                        const depr = Math.min(Number(a.purchase_price || 0), Number(a.purchase_price || 0) * (rate / 100) * age);
                                        const bookVal = Math.max(0, Number(a.purchase_price || 0) - depr);
                                        return (
                                            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{a.asset_name}</td>
                                                <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{a.category}</span></td>
                                                <td className="px-3 py-2.5 text-xs text-gray-500">{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString('en-KE') : '-'}</td>
                                                <td className="px-3 py-2.5 text-sm text-gray-700">{fmt(a.purchase_price)}</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-500">{rate}%</td>
                                                <td className="px-3 py-2.5 text-xs text-gray-500">{age.toFixed(1)}</td>
                                                <td className="px-3 py-2.5 text-sm font-bold text-red-600">-{fmt(depr)}</td>
                                                <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(bookVal)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ASSET MODAL ═══ */}
            {showAssetModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssetModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiBox /> {editing ? 'Edit Asset' : 'Register New Asset'}</h3></div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Asset Name *</label><input value={assetForm.asset_name} onChange={e => setAssetForm({ ...assetForm, asset_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Asset Code</label><input value={assetForm.asset_code} onChange={e => setAssetForm({ ...assetForm, asset_code: e.target.value })} className={inputCls} placeholder="Auto-generated" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label><select value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Serial Number</label><input value={assetForm.serial_number} onChange={e => setAssetForm({ ...assetForm, serial_number: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Barcode</label><input value={assetForm.barcode} onChange={e => setAssetForm({ ...assetForm, barcode: e.target.value })} className={inputCls} placeholder="Scan or type barcode" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Purchase Date</label><input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Purchase Price (KES)</label><input type="number" value={assetForm.purchase_price} onChange={e => setAssetForm({ ...assetForm, purchase_price: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Depreciation Rate %/yr</label><input type="number" value={assetForm.depreciation_rate} onChange={e => setAssetForm({ ...assetForm, depreciation_rate: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Condition</label><select value={assetForm.condition} onChange={e => setAssetForm({ ...assetForm, condition: e.target.value })} className={inputCls}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Location</label><input value={assetForm.location} onChange={e => setAssetForm({ ...assetForm, location: e.target.value })} className={inputCls} placeholder="e.g. Physics Lab, Admin Block" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Assigned To</label><input value={assetForm.assigned_to} onChange={e => setAssetForm({ ...assetForm, assigned_to: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier</label><input value={assetForm.supplier} onChange={e => setAssetForm({ ...assetForm, supplier: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Warranty Expiry</label><input type="date" value={assetForm.warranty_expiry} onChange={e => setAssetForm({ ...assetForm, warranty_expiry: e.target.value })} className={inputCls} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowAssetModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={saveAsset} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Register Asset'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MAINTENANCE MODAL ═══ */}
            {showMaintenanceModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMaintenanceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><FiTool /> Log Maintenance</h3></div>
                        <div className="p-6 space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Asset *</label><select value={maintForm.asset_id} onChange={e => setMaintForm({ ...maintForm, asset_id: Number(e.target.value) })} className={inputCls}><option value={0}>Select asset</option>{assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_code})</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Type</label><select value={maintForm.maintenance_type} onChange={e => setMaintForm({ ...maintForm, maintenance_type: e.target.value })} className={inputCls}><option>Repair</option><option>Service</option><option>Inspection</option><option>Replacement</option></select></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description *</label><textarea value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} className={inputCls} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cost (KES)</label><input type="number" value={maintForm.cost} onChange={e => setMaintForm({ ...maintForm, cost: Number(e.target.value) })} className={inputCls} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Date</label><input type="date" value={maintForm.maintenance_date} onChange={e => setMaintForm({ ...maintForm, maintenance_date: e.target.value })} className={inputCls} /></div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Performed By</label><input value={maintForm.performed_by} onChange={e => setMaintForm({ ...maintForm, performed_by: e.target.value })} className={inputCls} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Next Due Date</label><input type="date" value={maintForm.next_due_date} onChange={e => setMaintForm({ ...maintForm, next_due_date: e.target.value })} className={inputCls} /></div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowMaintenanceModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                            <button onClick={saveMaintenance} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{saving ? 'Saving...' : 'Log Maintenance'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

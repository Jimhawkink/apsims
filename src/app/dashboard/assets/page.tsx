'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiPrinter, FiRefreshCw, FiTag, FiMapPin, FiPackage, FiTrendingDown, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface Asset {
  id: number;
  asset_name: string;
  asset_code?: string;
  category: string;
  description?: string;
  notes?: string;
  purchase_date?: string;
  purchase_price: number;
  current_value: number;
  location?: string;
  condition: string;
  quantity: number;
  supplier?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

const conditions = ['New', 'Good', 'Fair', 'Worn', 'Damaged', 'Obsolete'];
const statuses = ['Active', 'Under Repair', 'Disposed', 'Lost'];

const categories = [
  { name: 'Furniture', icon: '🪑', color: '#f59e0b' },
  { name: 'Electronics', icon: '💻', color: '#3b82f6' },
  { name: 'Lab Equipment', icon: '🔬', color: '#8b5cf6' },
  { name: 'Sports', icon: '⚽', color: '#10b981' },
  { name: 'Vehicles', icon: '🚌', color: '#ef4444' },
  { name: 'Books & Library', icon: '📚', color: '#06b6d4' },
  { name: 'Kitchen', icon: '🍳', color: '#f97316' },
  { name: 'Office', icon: '📋', color: '#6366f1' },
  { name: 'Building', icon: '🏗️', color: '#64748b' },
  { name: 'Tools', icon: '🔧', color: '#84cc16' },
  { name: 'Uniform & Textiles', icon: '👕', color: '#ec4899' },
  { name: 'Other', icon: '📦', color: '#9ca3af' },
];

const getCategoryIcon = (cat: string) => categories.find(c => c.name === cat)?.icon || '📦';
const getCategoryColor = (cat: string) => categories.find(c => c.name === cat)?.color || '#9ca3af';

const conditionConfig: Record<string, { bg: string; text: string; dot: string }> = {
  New:      { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Good:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  Fair:     { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  Worn:     { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  Damaged:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  Obsolete: { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' },
};

const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
  'Active':       { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✅' },
  'Under Repair': { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '🔧' },
  'Disposed':     { bg: 'bg-gray-100',    text: 'text-gray-500',    icon: '🗑️' },
  'Lost':         { bg: 'bg-red-100',     text: 'text-red-700',     icon: '❌' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

const emptyForm = {
  asset_name: '', asset_code: '', category: 'Furniture', description: '',
  purchase_date: '', purchase_price: '', current_value: '', location: '',
  condition: 'Good', quantity: '1', supplier: '', status: 'Active', notes: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('school_assets').select('*').order('asset_name');
    if (error) toast.error('Failed to load assets');
    setAssets(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Summary stats ────────────────────────────────────────────────
  const activeAssets = assets.filter(a => a.status === 'Active');
  const totalValue = activeAssets.reduce((s, a) => s + Number(a.current_value) * Number(a.quantity), 0);
  const totalPurchaseValue = assets.reduce((s, a) => s + Number(a.purchase_price) * Number(a.quantity), 0);
  const totalDepreciation = totalPurchaseValue - totalValue;
  const underRepair = assets.filter(a => a.status === 'Under Repair').length;
  const totalItems = assets.reduce((s, a) => s + Number(a.quantity), 0);

  // ── Category breakdown ──────────────────────────────────────────
  const categoryStats = categories.map(cat => ({
    ...cat,
    count: assets.filter(a => a.category === cat.name).reduce((s, a) => s + Number(a.quantity), 0),
    value: assets.filter(a => a.category === cat.name && a.status === 'Active')
                 .reduce((s, a) => s + Number(a.current_value) * Number(a.quantity), 0),
  })).filter(c => c.count > 0);

  // ── Filtering ───────────────────────────────────────────────────
  const filtered = assets.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || `${a.asset_name} ${a.asset_code || ''} ${a.location || ''} ${a.supplier || ''}`.toLowerCase().includes(q);
    const matchCat = !filterCategory || a.category === filterCategory;
    const matchCond = !filterCondition || a.condition === filterCondition;
    const matchStat = !filterStatus || a.status === filterStatus;
    return matchSearch && matchCat && matchCond && matchStat;
  });

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); };
  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (a: Asset) => {
    setEditingId(a.id);
    setForm({
      asset_name: a.asset_name, asset_code: a.asset_code || '', category: a.category,
      description: a.description || '', purchase_date: a.purchase_date || '',
      purchase_price: String(a.purchase_price || ''), current_value: String(a.current_value || ''),
      location: a.location || '', condition: a.condition, quantity: String(a.quantity),
      supplier: a.supplier || '', status: a.status, notes: a.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_name.trim()) { toast.error('Asset name is required'); return; }
    setSaving(true);
    const payload = {
      asset_name: form.asset_name.trim(),
      asset_code: form.asset_code.trim() || null,
      category: form.category,
      // DB has 'notes' column only (no 'description') — combine both fields
      notes: [form.description.trim(), form.notes.trim()].filter(Boolean).join(' | ') || null,
      purchase_date: form.purchase_date || null,
      purchase_price: Number(form.purchase_price) || 0,
      current_value: Number(form.current_value) || 0,
      location: form.location.trim() || null,
      condition: form.condition,
      quantity: Number(form.quantity) || 1,
      supplier: form.supplier.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('school_assets').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('school_assets').insert([payload]));
    }
    setSaving(false);
    if (error) { toast.error(`Failed to save: ${error.message}`); return; }
    toast.success(editingId ? '✅ Asset updated successfully!' : '✅ Asset added successfully!');
    setShowModal(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    const { error } = await supabase.from('school_assets').delete().eq('id', id);
    setDeleting(null);
    if (error) { toast.error('Failed to delete asset'); return; }
    toast.success('Asset deleted');
    fetchData();
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Category', 'Qty', 'Location', 'Condition', 'Status', 'Purchase Price', 'Current Value', 'Supplier', 'Purchase Date'];
    const rows = filtered.map(a => [
      a.asset_code || '', a.asset_name, a.category, a.quantity,
      a.location || '', a.condition, a.status,
      a.purchase_price, a.current_value, a.supplier || '', a.purchase_date || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `asset_register_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const handlePrint = () => window.print();

  // ── Depreciation rate calculation ──────────────────────────────
  const getDepreciationPct = (asset: Asset) => {
    if (!asset.purchase_price || asset.purchase_price === 0) return 0;
    return Math.max(0, Math.round((1 - asset.current_value / asset.purchase_price) * 100));
  };

  return (
    <div className="space-y-6 animate-fade-in" id="print-area">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            🏗️ Asset Register
            <span className="text-xs font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white px-2 py-0.5 rounded-full ml-1">PRO</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inventory management · Depreciation tracking · {totalItems} items registered</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors no-print">
            <FiPrinter size={14} /> Print
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-green-700 text-sm hover:bg-green-50 transition-colors no-print">
            <FiDownload size={14} /> Export CSV
          </button>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors no-print">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-violet-700 transition-all no-print">
            <FiPlus size={16} /> Add Asset
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Items</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-2xl font-black text-blue-700">{totalItems}</p>
          <p className="text-xs text-blue-500 mt-1">{assets.length} asset types</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Current Value</span>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-xl font-black text-emerald-700">{fmt(totalValue)}</p>
          <p className="text-xs text-emerald-500 mt-1">Active assets only</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Cost Value</span>
            <span className="text-lg">🏷️</span>
          </div>
          <p className="text-xl font-black text-violet-700">{fmt(totalPurchaseValue)}</p>
          <p className="text-xs text-violet-500 mt-1">Original purchase</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Depreciation</span>
            <FiTrendingDown size={14} className="text-orange-600" />
          </div>
          <p className="text-xl font-black text-orange-700">{fmt(totalDepreciation)}</p>
          <p className="text-xs text-orange-500 mt-1">Total book loss</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Under Repair</span>
            <FiAlertTriangle size={14} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{underRepair}</p>
          <p className="text-xs text-amber-500 mt-1">{assets.filter(a => a.status === 'Disposed').length} disposed</p>
        </div>
      </div>

      {/* ── Category Breakdown chips ── */}
      {categoryStats.length > 0 && (
        <div className="flex flex-wrap gap-2 no-print">
          <span className="text-xs font-semibold text-gray-500 self-center mr-1">By Category:</span>
          {categoryStats.map(c => (
            <button
              key={c.name}
              onClick={() => setFilterCategory(filterCategory === c.name ? '' : c.name)}
              style={{ borderColor: filterCategory === c.name ? c.color : 'transparent', backgroundColor: filterCategory === c.name ? `${c.color}18` : '#f8fafc' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium text-gray-700 hover:opacity-90 transition-all"
            >
              <span>{c.icon}</span> {c.name} <span className="font-bold">({c.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-3 items-center no-print">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search assets, codes, locations…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Conditions</option>
          {conditions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* View toggle */}
        <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            ≡ Table
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            ⊞ Grid
          </button>
        </div>
        {(searchTerm || filterCategory || filterCondition || filterStatus) && (
          <button onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterCondition(''); setFilterStatus(''); }}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
            <FiX size={12} /> Clear filters ({filtered.length} shown)
          </button>
        )}
      </div>

      {/* ── Main Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading asset register…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20">
          <span className="text-6xl mb-4">🏗️</span>
          <p className="text-gray-600 font-semibold text-lg">No assets found</p>
          <p className="text-gray-400 text-sm mt-1">
            {assets.length === 0 ? 'Start by adding your first asset' : 'Try adjusting your filters'}
          </p>
          {assets.length === 0 && (
            <button onClick={openAdd} className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow">
              <FiPlus size={16} /> Add First Asset
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm" ref={printRef}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-slate-100 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Value</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Current Value</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Depreciation</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a, i) => {
                  const deprPct = getDepreciationPct(a);
                  const cond = conditionConfig[a.condition] || conditionConfig.Fair;
                  const stat = statusConfig[a.status] || statusConfig.Active;
                  return (
                    <tr key={a.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{a.asset_code || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{a.asset_name}</div>
                        {a.supplier && <div className="text-xs text-gray-400">From: {a.supplier}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: getCategoryColor(a.category) }}>
                          <span>{getCategoryIcon(a.category)}</span> {a.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">{a.quantity}</td>
                      <td className="px-4 py-3">
                        {a.location ? (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <FiMapPin size={11} className="text-gray-400" /> {a.location}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(a.purchase_price)}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{fmt(a.current_value)}</td>
                      <td className="px-4 py-3">
                        {a.purchase_price > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${deprPct}%`, backgroundColor: deprPct > 50 ? '#ef4444' : deprPct > 25 ? '#f97316' : '#10b981' }} />
                            </div>
                            <span className={`text-xs font-bold ${deprPct > 50 ? 'text-red-600' : deprPct > 25 ? 'text-orange-600' : 'text-emerald-600'}`}>{deprPct}%</span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cond.bg} ${cond.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cond.dot}`} />
                          {a.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${stat.bg} ${stat.text}`}>
                          {stat.icon} {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 no-print">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(a.id, a.asset_name)}
                            disabled={deleting === a.id}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50">
                            {deleting === a.id ? <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /> : <FiTrash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-50 to-slate-100 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">TOTALS ({filtered.length} assets)</td>
                  <td className="px-4 py-3 text-sm font-black text-gray-800">{filtered.reduce((s, a) => s + Number(a.quantity), 0)}</td>
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-500">{fmt(filtered.reduce((s, a) => s + Number(a.purchase_price) * Number(a.quantity), 0))}</td>
                  <td className="px-4 py-3 text-sm font-black text-emerald-700">{fmt(filtered.reduce((s, a) => s + Number(a.current_value) * Number(a.quantity), 0))}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(a => {
            const deprPct = getDepreciationPct(a);
            const cond = conditionConfig[a.condition] || conditionConfig.Fair;
            const stat = statusConfig[a.status] || statusConfig.Active;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group relative">
                {/* Category colour bar */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: getCategoryColor(a.category) }} />
                <div className="flex items-start justify-between mb-3 pt-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${getCategoryColor(a.category)}20` }}>
                    {getCategoryIcon(a.category)}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"><FiEdit2 size={13} /></button>
                    <button onClick={() => handleDelete(a.id, a.asset_name)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><FiTrash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">{a.asset_name}</h3>
                {a.asset_code && <p className="text-xs font-mono text-blue-600 mb-2">{a.asset_code}</p>}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Current Value</span>
                    <span className="font-bold text-gray-800">{fmt(a.current_value)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Qty</span>
                    <span className="font-semibold">{a.quantity}</span>
                  </div>
                  {a.location && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-gray-700 truncate max-w-24">{a.location}</span>
                    </div>
                  )}
                </div>
                {a.purchase_price > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Depreciation</span><span className="font-bold">{deprPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${deprPct}%`, backgroundColor: deprPct > 50 ? '#ef4444' : deprPct > 25 ? '#f97316' : '#10b981' }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cond.bg} ${cond.text}`}>{a.condition}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stat.bg} ${stat.text}`}>{stat.icon} {a.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">🏗️ {editingId ? 'Edit' : 'Add New'} Asset</h3>
                <p className="text-blue-200 text-xs mt-0.5">Fill in the asset details below</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <FiX size={20} />
              </button>
            </div>
            {/* Modal body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Asset Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Wooden Chair" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Asset Code</label>
                    <input type="text" value={form.asset_code} onChange={e => setForm({ ...form, asset_code: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="e.g. FRN-001" />
                  </div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1" />
                  </div>
                </div>
                {/* Row 3 — Values */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Purchase Price (Ksh)</label>
                    <input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Current Value (Ksh)</label>
                    <input type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Purchase Date</label>
                    <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {/* Row 4 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Condition</label>
                    <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {statuses.map(s => <option key={s} value={s}>{statusConfig[s]?.icon} {s}</option>)}
                    </select>
                  </div>
                </div>
                {/* Row 5 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Location</label>
                    <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Form 1 Classroom" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Supplier</label>
                    <input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Supplier name" />
                  </div>
                </div>
                {/* Description + Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Description / Notes</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                    placeholder="Any additional details about this asset…" />
                </div>
              </div>
              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow hover:shadow-md disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : <><FiCheckCircle size={15} /> {editingId ? 'Update Asset' : 'Save Asset'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiRefreshCw, FiPackage, FiAlertTriangle, FiCheckCircle, FiTool, FiMapPin, FiCalendar, FiBarChart2, FiFilter } from 'react-icons/fi';

const ASSET_CATEGORIES = [
  { name: 'Furniture & Fittings', emoji: '🪑', color: '#b45309', bg: '#fef3c7' },
  { name: 'ICT Equipment', emoji: '💻', color: '#1d4ed8', bg: '#eff6ff' },
  { name: 'Laboratory Equipment', emoji: '🔬', color: '#0891b2', bg: '#e0f2fe' },
  { name: 'Sports Equipment', emoji: '⚽', color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Kitchen & Catering', emoji: '🍳', color: '#dc2626', bg: '#fef2f2' },
  { name: 'Library Books & Media', emoji: '📚', color: '#7c3aed', bg: '#f5f3ff' },
  { name: 'Vehicles & Transport', emoji: '🚌', color: '#0f766e', bg: '#f0fdfa' },
  { name: 'Musical Instruments', emoji: '🎸', color: '#ec4899', bg: '#fdf2f8' },
  { name: 'Classroom Equipment', emoji: '🖊️', color: '#6366f1', bg: '#eef2ff' },
  { name: 'Security Equipment', emoji: '🛡️', color: '#374151', bg: '#f9fafb' },
  { name: 'Medical Equipment', emoji: '🏥', color: '#059669', bg: '#ecfdf5' },
  { name: 'Other Assets', emoji: '📦', color: '#6b7280', bg: '#f9fafb' },
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Condemned'];
const STATUSES = ['Active', 'Under Maintenance', 'Disposed', 'Lost/Stolen', 'Donated'];

const fmtKES = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CONDITION_CFG: Record<string, { color: string; bg: string }> = {
  Excellent: { color: '#16a34a', bg: '#f0fdf4' },
  Good: { color: '#2563eb', bg: '#eff6ff' },
  Fair: { color: '#d97706', bg: '#fffbeb' },
  Poor: { color: '#dc2626', bg: '#fef2f2' },
  Condemned: { color: '#374151', bg: '#f9fafb' },
};

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Active: { color: '#16a34a', bg: '#f0fdf4' },
  'Under Maintenance': { color: '#d97706', bg: '#fffbeb' },
  Disposed: { color: '#6b7280', bg: '#f9fafb' },
  'Lost/Stolen': { color: '#dc2626', bg: '#fef2f2' },
  Donated: { color: '#7c3aed', bg: '#f5f3ff' },
};

export default function UltraAssetManagerPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeTab, setActiveTab] = useState<'assets' | 'maintenance' | 'disposal' | 'summary'>('assets');
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const emptyForm = {
    asset_name: '', asset_code: '', category: 'Furniture & Fittings',
    description: '', location: '', assigned_to: '', serial_number: '',
    purchase_date: '', purchase_price: '', current_value: '',
    condition: 'Good', status: 'Active', warranty_expiry: '',
    supplier: '', depreciation_rate: 20, useful_life_years: 5, notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const emptyMaint = { asset_id: 0, maintenance_date: new Date().toISOString().split('T')[0], maintenance_type: 'Routine', description: '', cost: '', technician: '', next_maintenance: '', status: 'Completed' };
  const [maintForm, setMaintForm] = useState(emptyMaint);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [aR, mR] = await Promise.all([
      supabase.from('school_assets_ultra').select('*').order('asset_name'),
      supabase.from('school_asset_maintenance').select('*, school_assets_ultra(asset_name,asset_code)').order('maintenance_date', { ascending: false }).limit(50),
    ]);
    setAssets(aR.data || []);
    setMaintenance(mR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.asset_name) { toast.error('Asset name required'); return; }
    setSaving(true);
    const payload = {
      ...form,
      purchase_price: Number(form.purchase_price) || null,
      current_value: Number(form.current_value) || null,
      depreciation_rate: Number(form.depreciation_rate) || 20,
      useful_life_years: Number(form.useful_life_years) || 5,
    };
    const { error } = editId
      ? await supabase.from('school_assets_ultra').update(payload).eq('id', editId)
      : await supabase.from('school_assets_ultra').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Asset updated' : '📦 Asset added!');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const saveMaint = async () => {
    if (!maintForm.asset_id || !maintForm.description) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_asset_maintenance').insert([{ ...maintForm, cost: Number(maintForm.cost) || 0 }]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Maintenance record saved');
    setShowMaintModal(false); setMaintForm(emptyMaint); setSaving(false); fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this asset?')) return;
    await supabase.from('school_assets_ultra').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('school_assets_ultra').update({ status }).eq('id', id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast.success(`Asset marked as ${status}`);
  };

  // Compute depreciated value
  const getDepreciatedValue = (asset: any) => {
    if (!asset.purchase_price || !asset.purchase_date) return asset.current_value || 0;
    const years = (Date.now() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const rate = (asset.depreciation_rate || 20) / 100;
    return Math.max(0, Number(asset.purchase_price) * Math.pow(1 - rate, years));
  };

  const filtered = assets.filter(a =>
    (filterCat === 'All' || a.category === filterCat) &&
    (filterStatus === 'All' || a.status === filterStatus) &&
    (search === '' || `${a.asset_name} ${a.asset_code || ''} ${a.location || ''}`.toLowerCase().includes(search.toLowerCase()))
  );

  // Stats
  const totalValue = assets.reduce((s, a) => s + (Number(a.current_value) || Number(a.purchase_price) || 0), 0);
  const depreciatedTotal = assets.reduce((s, a) => s + getDepreciatedValue(a), 0);
  const activeAssets = assets.filter(a => a.status === 'Active').length;
  const needsMaint = assets.filter(a => a.condition === 'Poor' || a.status === 'Under Maintenance').length;
  const catStats = ASSET_CATEGORIES.map(c => ({ ...c, count: assets.filter(a => a.category === c.name).length, value: assets.filter(a => a.category === c.name).reduce((s, a) => s + (Number(a.purchase_price) || 0), 0) }));

  const exportCSV = () => {
    const headers = ['Asset Name', 'Code', 'Category', 'Location', 'Condition', 'Status', 'Purchase Date', 'Purchase Price', 'Current Value', 'Serial Number', 'Assigned To'];
    const rows = assets.map(a => [a.asset_name, a.asset_code || '', a.category, a.location || '', a.condition || '', a.status || '', a.purchase_date || '', a.purchase_price || '', a.current_value || '', a.serial_number || '', a.assigned_to || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `assets_register_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('Assets register exported!');
  };

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#1c1917,#292524,#44403c)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🗄️</div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Ultra Asset Manager</h1>
                <p className="text-stone-300 text-sm">{assets.length} assets · Total value: {fmtKES(totalValue)} · {needsMaint} need attention</p>
                <p className="text-stone-400 text-xs mt-1">Depreciated value: {fmtKES(Math.round(depreciatedTotal))} · {activeAssets} active</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
                <FiDownload size={14} /> Export CSV
              </button>
              <button onClick={() => { setShowMaintModal(true); setMaintForm(emptyMaint); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-400 transition shadow">
                <FiTool size={14} /> Log Maintenance
              </button>
              <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-stone-800 text-sm font-bold hover:bg-stone-100 transition shadow">
                <FiPlus size={14} /> Add Asset
              </button>
            </div>
          </div>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Total Assets', value: assets.length, icon: '📦', sub: `${activeAssets} active` },
              { label: 'Total Value', value: fmtKES(Math.round(totalValue)), icon: '💰', sub: 'Purchase price' },
              { label: 'Depreciated Value', value: fmtKES(Math.round(depreciatedTotal)), icon: '📉', sub: 'Current book value' },
              { label: 'Need Attention', value: needsMaint, icon: '⚠️', sub: 'Poor condition or in repair' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-black text-white leading-tight">{s.value}</div>
                <div className="text-[9px] text-stone-300">{s.label}</div>
                <div className="text-[8px] text-stone-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {catStats.filter(c => c.count > 0 || true).slice(0, 12).map(c => (
          <button key={c.name} onClick={() => setFilterCat(filterCat === c.name ? 'All' : c.name)}
            className={`bg-white rounded-xl border shadow-sm p-2.5 text-center hover:shadow-md transition ${filterCat === c.name ? 'ring-2 border-amber-300' : 'border-gray-100'}`}
            style={filterCat === c.name ? { background: c.bg } : {}}>
            <div className="text-xl mb-1">{c.emoji}</div>
            <div className="text-sm font-black" style={{ color: c.color }}>{c.count}</div>
            <div className="text-[8px] text-gray-500 leading-tight">{c.name.split(' ')[0]}</div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm w-fit">
        {([['assets','📦 All Assets'],['maintenance','🔧 Maintenance Log'],['disposal','🗑️ Disposed'],['summary','📊 Summary']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={`px-5 py-2.5 text-sm font-bold transition ${activeTab===v?'bg-stone-800 text-white':'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {/* Search + filter bar */}
      {activeTab === 'assets' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FiSearch className="text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, location…" className="flex-1 text-sm outline-none bg-transparent text-gray-700" />
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {['All', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2.5 text-xs font-bold transition ${filterStatus === s ? 'bg-stone-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" /></div>
      ) : activeTab === 'assets' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">Asset Register</h3><p className="text-xs text-gray-500">{filtered.length} of {assets.length} shown</p></div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">📦</div>
              <p className="font-black text-gray-600 mb-1">No assets found</p>
              <p className="text-sm text-gray-400 mb-4">Start by adding your first school asset</p>
              <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#44403c,#292524)' }}>Add First Asset</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {['Asset','Code','Category','Location','Condition','Status','Purchase Date','Value','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a => {
                    const catCfg = ASSET_CATEGORIES.find(c => c.name === a.category) || ASSET_CATEGORIES[11];
                    const condCfg = CONDITION_CFG[a.condition] || CONDITION_CFG.Good;
                    const statCfg = STATUS_CFG[a.status] || STATUS_CFG.Active;
                    const depVal = getDepreciatedValue(a);
                    return (
                      <tr key={a.id} className={`hover:bg-stone-50/50 transition group ${a.condition === 'Poor' || a.status === 'Under Maintenance' ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: catCfg.bg }}>{catCfg.emoji}</div>
                            <div>
                              <p className="font-black text-gray-800 text-xs">{a.asset_name}</p>
                              {a.serial_number && <p className="text-[9px] text-gray-400 font-mono">S/N: {a.serial_number}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{a.asset_code || '—'}</td>
                        <td className="px-4 py-3"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: catCfg.bg, color: catCfg.color }}>{a.category}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-600">{a.location || '—'}</td>
                        <td className="px-4 py-3"><span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={condCfg}>{a.condition || '—'}</span></td>
                        <td className="px-4 py-3">
                          <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                            className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none">
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(a.purchase_date)}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-black text-gray-800">{a.purchase_price ? fmtKES(a.purchase_price) : '—'}</p>
                          {a.purchase_date && a.purchase_price && <p className="text-[9px] text-gray-400">Book: {fmtKES(Math.round(depVal))}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setSelectedAsset(a); setMaintForm({ ...emptyMaint, asset_id: a.id }); setShowMaintModal(true); }}
                              title="Log maintenance" className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><FiTool size={12} /></button>
                            <button onClick={() => { setForm({ asset_name: a.asset_name, asset_code: a.asset_code || '', category: a.category, description: a.description || '', location: a.location || '', assigned_to: a.assigned_to || '', serial_number: a.serial_number || '', purchase_date: a.purchase_date || '', purchase_price: a.purchase_price || '', current_value: a.current_value || '', condition: a.condition || 'Good', status: a.status || 'Active', warranty_expiry: a.warranty_expiry || '', supplier: a.supplier || '', depreciation_rate: a.depreciation_rate || 20, useful_life_years: a.useful_life_years || 5, notes: a.notes || '' }); setEditId(a.id); setShowModal(true); }}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"><FiEdit2 size={12} /></button>
                            <button onClick={() => del(a.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><FiTrash2 size={12} /></button>
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
      ) : activeTab === 'maintenance' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">🔧 Maintenance Log</h3><p className="text-xs text-gray-500">{maintenance.length} maintenance records</p></div>
            <button onClick={() => { setShowMaintModal(true); setMaintForm(emptyMaint); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}>
              <FiPlus size={13} /> Log Maintenance
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {maintenance.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No maintenance records yet</div>
            : maintenance.map(m => (
              <div key={m.id} className="px-5 py-4 flex items-start gap-4 hover:bg-amber-50/20 transition">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">🔧</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-gray-800 text-sm">{(m.school_assets_ultra as any)?.asset_name || 'Unknown Asset'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{m.maintenance_type} · {m.description}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {m.technician && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">👤 {m.technician}</span>}
                        {m.cost > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">💰 {fmtKES(m.cost)}</span>}
                        {m.next_maintenance && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">⏭️ Next: {fmtDate(m.next_maintenance)}</span>}
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${m.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(m.maintenance_date)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'disposal' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">🗑️ Disposed / Written-Off Assets</h3></div>
          <div className="divide-y divide-gray-50">
            {assets.filter(a => a.status === 'Disposed' || a.status === 'Lost/Stolen' || a.condition === 'Condemned').length === 0
              ? <div className="py-12 text-center text-gray-400 text-sm">No disposed assets</div>
              : assets.filter(a => a.status === 'Disposed' || a.status === 'Lost/Stolen' || a.condition === 'Condemned').map(a => {
                const catCfg = ASSET_CATEGORIES.find(c => c.name === a.category) || ASSET_CATEGORIES[11];
                return (
                  <div key={a.id} className="px-5 py-4 flex items-center gap-4 hover:bg-red-50/20 transition">
                    <div className="text-2xl flex-shrink-0">{catCfg.emoji}</div>
                    <div className="flex-1">
                      <p className="font-black text-gray-600 line-through text-sm">{a.asset_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{a.status}</span>
                        <span className="text-[9px] text-gray-400">{a.category}</span>
                        {a.purchase_price && <span className="text-[9px] text-gray-400">Purchased at {fmtKES(a.purchase_price)}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{fmtDate(a.purchase_date)}</p>
                  </div>
                );
              })
            }
          </div>
        </div>
      ) : (
        /* SUMMARY */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Assets by Category</h3>
            <div className="space-y-3">
              {catStats.filter(c => c.count > 0).map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.emoji}</span>
                      <span className="text-xs font-bold text-gray-700">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black" style={{ color: c.color }}>{c.count} assets</span>
                      {c.value > 0 && <span className="text-[9px] text-gray-400 ml-2">{fmtKES(c.value)}</span>}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.round(c.count / Math.max(assets.length, 1) * 100)}%`, background: c.color }} />
                  </div>
                </div>
              ))}
              {catStats.every(c => c.count === 0) && <p className="text-sm text-gray-400 text-center py-6">Add assets to see summary</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📈 Asset Condition Summary</h3>
            <div className="space-y-3">
              {CONDITIONS.map(c => {
                const count = assets.filter(a => a.condition === c).length;
                const pct = assets.length > 0 ? Math.round(count / assets.length * 100) : 0;
                const cfg = CONDITION_CFG[c];
                return (
                  <div key={c}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{c}</span>
                      <span className="text-xs font-black" style={{ color: cfg.color }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="font-black text-gray-700 text-sm mb-3">💰 Financial Summary</h4>
              <div className="space-y-2">
                {[
                  { label: 'Total Purchase Value', value: fmtKES(Math.round(totalValue)), color: '#6366f1' },
                  { label: 'Current Book Value', value: fmtKES(Math.round(depreciatedTotal)), color: '#16a34a' },
                  { label: 'Total Depreciation', value: fmtKES(Math.round(totalValue - depreciatedTotal)), color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="font-black" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL (run in Supabase)</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_assets_ultra (
  id               serial PRIMARY KEY,
  asset_name       text NOT NULL,
  asset_code       text UNIQUE,
  category         text,
  description      text,
  location         text,
  assigned_to      text,
  serial_number    text,
  purchase_date    date,
  purchase_price   numeric DEFAULT 0,
  current_value    numeric DEFAULT 0,
  condition        text DEFAULT 'Good',
  status           text DEFAULT 'Active',
  warranty_expiry  date,
  supplier         text,
  depreciation_rate numeric DEFAULT 20,
  useful_life_years int DEFAULT 5,
  notes            text,
  created_at       timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_asset_maintenance (
  id               serial PRIMARY KEY,
  asset_id         int REFERENCES school_assets_ultra(id) ON DELETE CASCADE,
  maintenance_date date NOT NULL,
  maintenance_type text DEFAULT 'Routine',
  description      text,
  cost             numeric DEFAULT 0,
  technician       text,
  next_maintenance date,
  status           text DEFAULT 'Completed',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE school_assets_ultra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_asset_maintenance  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_assets_ultra" ON school_assets_ultra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_asset_maint"  ON school_asset_maintenance FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 bg-gradient-to-r from-stone-50 to-stone-100">
              <h2 className="font-black text-gray-800">📦 {editId ? 'Edit Asset' : 'Add New Asset'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Asset Name *</label>
                  <input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} placeholder="e.g. HP Laptop ProBook 450 G8" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                {[
                  { label: 'Asset Code', key: 'asset_code', ph: 'e.g. ICT-001' },
                  { label: 'Serial Number', key: 'serial_number', ph: 'e.g. SN123456789' },
                  { label: 'Location', key: 'location', ph: 'e.g. Room 4, Lab 1, Office…' },
                  { label: 'Assigned To', key: 'assigned_to', ph: 'e.g. Mr. Kamau, Form 2B' },
                  { label: 'Supplier', key: 'supplier', ph: 'e.g. ABC Computers Ltd' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-black text-gray-600 block mb-1.5">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300">
                    {ASSET_CATEGORIES.map(c => <option key={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300">
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Warranty Expiry</label>
                  <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Purchase Price (KES)</label>
                  <input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Current Value (KES)</label>
                  <input type="number" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Depreciation Rate (%/year)</label>
                  <input type="number" value={form.depreciation_rate} onChange={e => setForm(f => ({ ...f, depreciation_rate: Number(e.target.value) }))} min="0" max="100" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Useful Life (years)</label>
                  <input type="number" value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: Number(e.target.value) }))} min="1" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#44403c,#292524)' }}>
                {saving ? <FiRefreshCw size={14} className="inline animate-spin mr-2" /> : null}{editId ? '✅ Update Asset' : '📦 Add Asset'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MAINTENANCE MODAL */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <h2 className="font-black text-gray-800">🔧 Log Maintenance</h2>
              <button onClick={() => setShowMaintModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Asset *</label>
                <select value={maintForm.asset_id} onChange={e => setMaintForm(f => ({ ...f, asset_id: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300">
                  <option value={0}>Select asset…</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} {a.asset_code ? `(${a.asset_code})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Date</label>
                  <input type="date" value={maintForm.maintenance_date} onChange={e => setMaintForm(f => ({ ...f, maintenance_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Type</label>
                  <select value={maintForm.maintenance_type} onChange={e => setMaintForm(f => ({ ...f, maintenance_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300">
                    {['Routine','Repair','Overhaul','Inspection','Replacement','Calibration'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Description *</label>
                <textarea value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What was done? e.g. Replaced battery, cleaned, repaired screen…" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Cost (KES)</label>
                  <input type="number" value={maintForm.cost} onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Technician</label>
                  <input value={maintForm.technician} onChange={e => setMaintForm(f => ({ ...f, technician: e.target.value }))} placeholder="Name…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Next Maintenance Date</label>
                <input type="date" value={maintForm.next_maintenance} onChange={e => setMaintForm(f => ({ ...f, next_maintenance: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveMaint} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}>
                {saving ? '…' : '🔧 Save Maintenance Record'}
              </button>
              <button onClick={() => setShowMaintModal(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

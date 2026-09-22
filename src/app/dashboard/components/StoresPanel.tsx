'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import Link from 'next/link';
import {
  FiChevronRight, FiAlertTriangle, FiRefreshCw,
  FiPackage, FiBook, FiTrendingUp, FiCheckCircle,
} from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `KES ${(n / 1000).toFixed(0)}K` : `KES ${n}`;
const fmtN = (n: number) => new Intl.NumberFormat('en-KE').format(n || 0);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const COND_COLORS: Record<string, string> = {
  Excellent: '#10b981', Good: '#3b82f6', Fair: '#f59e0b',
  Poor: '#f97316', Damaged: '#ef4444',
};
const CAT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0891b2', '#16a34a'];

function SH({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-xs font-black text-gray-800 tracking-tight">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:underline">{linkLabel || 'View All'} <FiChevronRight size={11} /></Link>}
    </div>
  );
}

export default function StoresPanel() {
  const [assets, setAssets] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [issuances, setIssuances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<'overview' | 'assets' | 'library' | 'inventory'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: a }, { data: b }, { data: t }, { data: s }, { data: iss },
      ] = await Promise.all([
        supabase.from('school_assets').select('*'),
        supabase.from('school_library_books').select('*').order('created_at', { ascending: false }),
        supabase.from('school_digital_textbooks').select('*'),
        supabase.from('school_store_items').select('*').order('item_name'),
        supabase.from('school_book_issuances').select('*').order('issue_date', { ascending: false }).limit(50),
      ]);
      setAssets(a || []); setBooks(b || []); setTextbooks(t || []);
      setStores(s || []); setIssuances(iss || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
        <FiPackage size={22} className="text-teal-600 animate-pulse" />
      </div>
      <p className="text-xs text-gray-400 font-bold">Loading stores intelligence…</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );

  // ── Computed ──
  const totalAssetValue = assets.reduce((s, a) => s + Number(a.current_value || a.purchase_price || 0) * Number(a.quantity || 1), 0);
  const depreciatedValue = assets.reduce((s, a) => s + Number(a.depreciated_value || a.current_value || a.purchase_price || 0) * Number(a.quantity || 1), 0);
  const issuedBooks = books.filter(b => b.status === 'Issued').length;
  const availableBooks = books.filter(b => b.status !== 'Issued').length;
  const lowStock = stores.filter(s => Number(s.quantity || 0) <= Number(s.reorder_level || 5));
  const outOfStock = stores.filter(s => Number(s.quantity || 0) === 0);
  const goodStock = stores.filter(s => Number(s.quantity || 0) > Number(s.reorder_level || 5));
  const totalStoreValue = stores.reduce((s, i) => s + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0);

  // Asset conditions
  const conditions: Record<string, number> = {};
  assets.forEach(a => { const c = a.condition || 'Good'; conditions[c] = (conditions[c] || 0) + 1; });
  const condChart = {
    labels: Object.keys(conditions),
    datasets: [{ data: Object.values(conditions), backgroundColor: Object.keys(conditions).map(c => COND_COLORS[c] || '#9ca3af'), borderWidth: 0, hoverOffset: 6 }],
  };

  // Asset categories
  const cats: Record<string, number> = {};
  assets.forEach(a => { const c = a.category || 'General'; cats[c] = (cats[c] || 0) + 1; });
  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const catChart = {
    labels: catEntries.map(([k]) => k),
    datasets: [{ data: catEntries.map(([, v]) => v), backgroundColor: CAT_COLORS, borderRadius: 8, barThickness: 18, borderSkipped: false as const }],
  };

  // Book categories
  const bookCats: Record<string, number> = {};
  books.forEach(b => { const c = b.category || b.genre || 'General'; bookCats[c] = (bookCats[c] || 0) + 1; });

  // Store items by category
  const itemCats: Record<string, number> = {};
  stores.forEach(s => { const c = s.category || 'General'; itemCats[c] = (itemCats[c] || 0) + 1; });

  const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } };
  const barOpts = { responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#f8fafc' }, ticks: { font: { size: 9 } }, beginAtZero: true }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } } };

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#0d9488,#0891b2,#6366f1,#8b5cf6,#10b981)' }} />
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">🏬</div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Stores, Library & Asset Intelligence</h2>
              <p className="text-[10px] text-gray-400">Assets · Library · Inventory · Digital Resources</p>
            </div>
            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${lowStock.length > 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
              {lowStock.length > 0 ? `⚠️ ${lowStock.length} Low Stock` : '✅ All Stocked'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(['overview', 'assets', 'library', 'inventory'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all ${view === v ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-teal-50 hover:text-teal-600'}`}>
                {v === 'overview' ? '📊 Overview' : v === 'assets' ? '🏗️ Assets' : v === 'library' ? '📚 Library' : '📦 Inventory'}
              </button>
            ))}
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-100 hover:bg-teal-50 hover:text-teal-600 text-gray-400 border border-gray-200 transition"><FiRefreshCw size={13} /></button>
          </div>
        </div>
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {view === 'overview' && (
        <div className="space-y-4">

          {/* KPIs Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🏗️', label: 'Total Assets', value: fmtN(assets.length), sub: `Value: ${fmtShort(totalAssetValue)}`, color: '#4f46e5', bg: '#eef2ff', tag: `${assets.filter(a => a.condition === 'Excellent' || a.condition === 'Good').length} good` },
              { icon: '💎', label: 'Asset Value', value: fmtShort(totalAssetValue), sub: `Depreciated: ${fmtShort(depreciatedValue)}`, color: '#059669', bg: '#ecfdf5', tag: `${assets.length} items` },
              { icon: '📚', label: 'Library Books', value: fmtN(books.length), sub: `${issuedBooks} issued · ${availableBooks} available`, color: '#0891b2', bg: '#e0f2fe', tag: `${textbooks.length} digital` },
              { icon: '📦', label: 'Store Items', value: fmtN(stores.length), sub: `Stock value: ${fmtShort(totalStoreValue)}`, color: '#d97706', bg: '#fef3c7', tag: lowStock.length > 0 ? `⚠️ ${lowStock.length} low` : '✅ OK' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: m.bg }}>{m.icon}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{m.tag}</span>
                </div>
                <p className="text-2xl font-black leading-none mb-1" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* KPIs Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Low Stock Items', value: lowStock.length, icon: '⚠️', color: lowStock.length > 0 ? '#dc2626' : '#059669', bg: lowStock.length > 0 ? '#fee2e2' : '#ecfdf5', sub: 'Need reorder' },
              { label: 'Out of Stock', value: outOfStock.length, icon: '❌', color: outOfStock.length > 0 ? '#dc2626' : '#059669', bg: outOfStock.length > 0 ? '#fee2e2' : '#ecfdf5', sub: 'Zero quantity' },
              { label: 'Books Issued', value: issuedBooks, icon: '📖', color: '#f59e0b', bg: '#fef3c7', sub: `${pct(issuedBooks, books.length)}% issue rate` },
              { label: 'Digital Textbooks', value: textbooks.length, icon: '💻', color: '#8b5cf6', bg: '#f5f3ff', sub: 'e-Learning resources' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Low stock alert banner */}
          {lowStock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertTriangle size={16} className="text-red-500" />
                <p className="text-sm font-black text-red-800">⚠️ {lowStock.length} Items Need Restocking</p>
                <Link href="/dashboard/stores/inventory" className="ml-auto text-[11px] font-black text-red-600 underline">Reorder Now →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {lowStock.slice(0, 8).map((s: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl p-2.5 border border-red-200 flex items-center gap-2">
                    <span className="text-sm">📦</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-gray-800 truncate">{s.item_name}</p>
                      <p className="text-[9px] text-red-500 font-bold">Qty: {s.quantity || 0} / Min: {s.reorder_level || 5}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Asset condition */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="🔧 Asset Condition" sub={`${assets.length} total assets`} />
              <div style={{ height: 150 }}>
                {Object.keys(conditions).length > 0
                  ? <Doughnut data={condChart} options={donutOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiPackage size={26} /><p className="text-xs text-gray-400 mt-2">No assets</p></div>}
              </div>
              <div className="mt-3 space-y-1.5">
                {Object.entries(conditions).map(([c, v], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COND_COLORS[c] || '#9ca3af' }} />
                    <span className="text-[10px] text-gray-500 flex-1 font-semibold">{c}</span>
                    <span className="text-[10px] font-black text-gray-700">{v}</span>
                    <span className="text-[9px] text-gray-400">({pct(v, assets.length)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset by category bar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📊 Assets by Category" sub="Inventory breakdown" href="/dashboard/stores/assets" linkLabel="Asset Register" />
              <div style={{ height: 220 }}>
                {catEntries.length > 0
                  ? <Bar data={catChart} options={barOpts} />
                  : <div className="flex flex-col items-center justify-center h-full text-gray-300"><FiPackage size={26} /><p className="text-xs text-gray-400 mt-2">No assets recorded</p></div>}
              </div>
            </div>
          </div>

          {/* Book issue rate + Top assets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Library overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📚 Library Overview" sub={`${books.length} titles registered`} href="/dashboard/library" linkLabel="Library" />
              <div className="space-y-3 mb-4">
                {[
                  { label: 'Available', count: availableBooks, total: books.length, color: '#10b981', icon: '✅' },
                  { label: 'Issued Out', count: issuedBooks, total: books.length, color: '#f59e0b', icon: '📖' },
                  { label: 'Digital', count: textbooks.length, total: Math.max(books.length + textbooks.length, 1), color: '#6366f1', icon: '💻' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-base w-6">{b.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-gray-600">{b.label}</span>
                        <span className="text-[10px] font-black text-gray-800">{b.count}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct(b.count, b.total)}%`, background: b.color }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-black w-10 text-right" style={{ color: b.color }}>{pct(b.count, b.total)}%</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(bookCats).slice(0, 4).map(([c, v], i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{c}: {v}</span>
                ))}
              </div>
            </div>

            {/* Inventory overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SH title="📦 Store Inventory Overview" sub={`${stores.length} item types · ${fmtShort(totalStoreValue)} value`} href="/dashboard/stores/inventory" linkLabel="Inventory" />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'In Stock', v: goodStock.length, color: '#10b981', bg: '#ecfdf5', icon: '✅' },
                  { label: 'Low Stock', v: lowStock.length, color: '#f59e0b', bg: '#fef3c7', icon: '⚠️' },
                  { label: 'Out of Stock', v: outOfStock.length, color: '#ef4444', bg: '#fee2e2', icon: '❌' },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl p-3 text-center" style={{ background: m.bg }}>
                    <div className="text-xl mb-1">{m.icon}</div>
                    <p className="text-xl font-black" style={{ color: m.color }}>{m.v}</p>
                    <p className="text-[8px] font-bold text-gray-500 uppercase">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {stores.filter(s => Number(s.quantity || 0) <= Number(s.reorder_level || 5)).slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                    <span className="text-sm">📦</span>
                    <span className="text-[10px] font-black text-gray-800 flex-1 truncate">{s.item_name}</span>
                    <span className="text-[9px] font-black text-red-600">Qty: {s.quantity || 0}</span>
                    <FiAlertTriangle size={11} className="text-red-400 flex-shrink-0" />
                  </div>
                ))}
                {lowStock.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
                    <FiCheckCircle size={14} className="text-emerald-500" />
                    <p className="text-[10px] font-bold text-emerald-700">All items are adequately stocked</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '🏗️ Asset Register', href: '/dashboard/stores/assets', desc: 'All school assets', color: '#6366f1', bg: '#eef2ff' },
              { label: '📚 Library', href: '/dashboard/library', desc: 'Books & issuances', color: '#0891b2', bg: '#e0f2fe' },
              { label: '📦 Inventory', href: '/dashboard/stores/inventory', desc: 'Stock management', color: '#d97706', bg: '#fef3c7' },
              { label: '💻 e-Resources', href: '/dashboard/library/digital', desc: 'Digital textbooks', color: '#8b5cf6', bg: '#f5f3ff' },
            ].map((a, i) => (
              <Link key={i} href={a.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                style={{ borderTopWidth: 3, borderTopColor: a.color }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: a.bg }}>{a.label.split(' ')[0]}</div>
                <p className="text-xs font-black text-gray-700">{a.label.split(' ').slice(1).join(' ')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ ASSETS VIEW ══════════ */}
      {view === 'assets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Assets', value: assets.length, icon: '🏗️', color: '#4f46e5', bg: '#eef2ff', sub: 'All categories' },
              { label: 'Total Value', value: fmtShort(totalAssetValue), icon: '💎', color: '#059669', bg: '#ecfdf5', sub: 'Purchase / current' },
              { label: 'Good Condition', value: assets.filter(a => ['Excellent', 'Good'].includes(a.condition || 'Good')).length, icon: '✅', color: '#0891b2', bg: '#e0f2fe', sub: 'Excellent + Good' },
              { label: 'Need Repair', value: assets.filter(a => ['Poor', 'Damaged'].includes(a.condition || '')).length, icon: '🔧', color: '#dc2626', bg: '#fee2e2', sub: 'Poor + Damaged' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="🏗️ Full Asset Register" sub={`${assets.length} assets · ${fmtShort(totalAssetValue)} total value`} href="/dashboard/stores/assets" linkLabel="Manage" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['#', 'Asset', 'Category', 'Qty', 'Purchase Price', 'Current Value', 'Condition', 'Location'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{a.asset_name || a.name}</td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{a.category || 'General'}</span></td>
                      <td className="px-4 py-2.5 text-[10px] font-mono font-black text-gray-700">{a.quantity || 1}</td>
                      <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-600">{fmt(Number(a.purchase_price || 0))}</td>
                      <td className="px-4 py-2.5 text-[10px] font-semibold text-emerald-600">{fmt(Number(a.current_value || a.purchase_price || 0))}</td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ background: (COND_COLORS[a.condition || 'Good'] || '#3b82f6') + '20', color: COND_COLORS[a.condition || 'Good'] || '#3b82f6' }}>{a.condition || 'Good'}</span></td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{a.location || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && <div className="py-10 text-center text-gray-400"><FiPackage size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No assets registered yet</p><Link href="/dashboard/stores/assets" className="text-teal-500 text-xs font-bold hover:underline mt-1 inline-block">Add Assets →</Link></div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ LIBRARY VIEW ══════════ */}
      {view === 'library' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Books', value: books.length, icon: '📚', color: '#0891b2', bg: '#e0f2fe', sub: 'Library collection' },
              { label: 'Available', value: availableBooks, icon: '✅', color: '#059669', bg: '#ecfdf5', sub: 'Ready to issue' },
              { label: 'Currently Issued', value: issuedBooks, icon: '📖', color: '#d97706', bg: '#fef3c7', sub: `${pct(issuedBooks, books.length)}% issue rate` },
              { label: 'Digital Textbooks', value: textbooks.length, icon: '💻', color: '#8b5cf6', bg: '#f5f3ff', sub: 'e-Learning resources' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📚 Library Book Register" sub={`${books.length} books`} href="/dashboard/library" linkLabel="Manage Library" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['#', 'Title', 'Author', 'ISBN', 'Category', 'Copies', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {books.map((b: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800 max-w-[160px] truncate">{b.title}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{b.author || '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-400">{b.isbn || '—'}</td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{b.category || b.genre || 'General'}</span></td>
                      <td className="px-4 py-2.5 text-[10px] font-black text-gray-700">{b.copies || b.total_copies || 1}</td>
                      <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${b.status === 'Issued' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{b.status || 'Available'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {books.length === 0 && <div className="py-10 text-center text-gray-400"><FiBook size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No books in library yet</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ INVENTORY VIEW ══════════ */}
      {view === 'inventory' && (
        <div className="space-y-4">
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
              <FiAlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-800 flex-1">{lowStock.length} items are below reorder level — {outOfStock.length} completely out of stock</p>
              <Link href="/dashboard/stores/inventory" className="text-[11px] font-black text-red-600 underline">Reorder →</Link>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Items', value: stores.length, icon: '📦', color: '#6366f1', bg: '#eef2ff', sub: 'All stock types' },
              { label: 'Stock Value', value: fmtShort(totalStoreValue), icon: '💰', color: '#059669', bg: '#ecfdf5', sub: 'Total inventory value' },
              { label: 'Low / Out', value: `${lowStock.length}/${outOfStock.length}`, icon: '⚠️', color: lowStock.length > 0 ? '#dc2626' : '#059669', bg: lowStock.length > 0 ? '#fee2e2' : '#ecfdf5', sub: 'Need restocking' },
              { label: 'Categories', value: Object.keys(itemCats).length, icon: '🗂️', color: '#0891b2', bg: '#e0f2fe', sub: 'Item groups' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: m.bg }}>{m.icon}</div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <SH title="📦 Full Stock Inventory" sub={`${stores.length} item types`} href="/dashboard/stores/inventory" linkLabel="Manage Stock" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50">{['#', 'Item', 'Category', 'Qty', 'Unit', 'Unit Price', 'Total Value', 'Min Level', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {stores.map((s: any, i: number) => {
                    const isLow = Number(s.quantity || 0) <= Number(s.reorder_level || 5);
                    const isOut = Number(s.quantity || 0) === 0;
                    const totalVal = Number(s.unit_price || 0) * Number(s.quantity || 0);
                    return (
                      <tr key={i} className={`transition-colors ${isOut ? 'bg-red-50' : isLow ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-2.5 text-[10px] text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{s.item_name}</td>
                        <td className="px-4 py-2.5"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{s.category || 'General'}</span></td>
                        <td className="px-4 py-2.5 text-sm font-black" style={{ color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669' }}>{s.quantity || 0}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500">{s.unit || 'pcs'}</td>
                        <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-600">{fmt(Number(s.unit_price || 0))}</td>
                        <td className="px-4 py-2.5 text-[10px] font-black text-indigo-600">{fmtShort(totalVal)}</td>
                        <td className="px-4 py-2.5 text-[10px] text-gray-500">{s.reorder_level || 5}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full ${isOut ? 'bg-red-200 text-red-800' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isOut ? '❌ Empty' : isLow ? '⚠️ Low' : '✅ OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {stores.length === 0 && <div className="py-10 text-center text-gray-400"><FiPackage size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-xs">No inventory items yet</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

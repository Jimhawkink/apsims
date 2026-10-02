'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiTrendingUp, FiBarChart2, FiFilter, FiAlertCircle } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEARS = ['2023', '2024', '2025', '2026'];
const CATEGORIES = ['Kitchen Provisions', 'Stationery', 'Cleaning Supplies', 'Sports Equipment', 'Lab Supplies', 'Maintenance', 'Other'];

const BAR_COLORS = ['#0d9488', '#0891b2', '#6366f1', '#f59e0b', '#dc2626', '#16a34a', '#7c3aed'];

export default function StoresConsumptionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [issuances, setIssuances] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('2026');
  const [filterCat, setFilterCat] = useState('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'byterm' | 'byitem' | 'trends' | 'alerts'>('overview');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Always fetch store items first (always exists)
    const iR = await supabase.from('school_store_items').select('*').order('item_name');
    setItems(iR.data || []);
    // Fetch issuances & GRNs (new tables - graceful if missing)
    const [isR, gR] = await Promise.all([
      supabase.from('school_store_issuances').select('*, school_store_items(item_name,category,unit,unit_price)').order('created_at', { ascending: false }),
      supabase.from('school_store_grns').select('*, school_store_items(item_name,category)').order('created_at', { ascending: false }),
    ]);
    if (!isR.error) setIssuances(isR.data || []);
    if (!gR.error) setGrns(gR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter to selected year
  const yearIssuances = useMemo(() => issuances.filter(i => (i.created_at || '').startsWith(filterYear)), [issuances, filterYear]);
  const catIssuances = useMemo(() => filterCat === 'All' ? yearIssuances : yearIssuances.filter(i => i.school_store_items?.category === filterCat), [yearIssuances, filterCat]);

  // Term breakdown
  const termData = useMemo(() => TERMS.map((term, ti) => {
    // Term 1: Jan-Apr, Term 2: May-Aug, Term 3: Sep-Dec
    const months = ti === 0 ? [1,2,3,4] : ti === 1 ? [5,6,7,8] : [9,10,11,12];
    const termIss = catIssuances.filter(i => {
      const m = new Date(i.created_at).getMonth() + 1;
      return months.includes(m);
    });
    const issued = termIss.reduce((s, i) => s + Number(i.quantity_issued || 0), 0);
    const value = termIss.reduce((s, i) => s + Number(i.quantity_issued || 0) * Number(i.school_store_items?.unit_price || 0), 0);
    const received = grns.filter(g => {
      const m = new Date(g.created_at).getMonth() + 1;
      return months.includes(m) && (g.created_at || '').startsWith(filterYear);
    }).reduce((s, g) => s + Number(g.quantity_received || 0), 0);
    return { term, issued, value, received, items: [...new Set(termIss.map(i => i.item_id))].length };
  }), [catIssuances, grns, filterYear]);

  // By item consumption
  const itemConsumption = useMemo(() => {
    const map: Record<number, { name: string; category: string; unit: string; qty: number; value: number; count: number }> = {};
    catIssuances.forEach(i => {
      const id = i.item_id;
      if (!map[id]) map[id] = { name: i.school_store_items?.item_name || '?', category: i.school_store_items?.category || '?', unit: i.school_store_items?.unit || 'units', qty: 0, value: 0, count: 0 };
      map[id].qty += Number(i.quantity_issued || 0);
      map[id].value += Number(i.quantity_issued || 0) * Number(i.school_store_items?.unit_price || 0);
      map[id].count++;
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.value - a.value);
  }, [catIssuances]);

  // Category breakdown
  const categoryData = useMemo(() => CATEGORIES.map((cat, i) => {
    const catIss = yearIssuances.filter(x => x.school_store_items?.category === cat);
    const qty = catIss.reduce((s, x) => s + Number(x.quantity_issued || 0), 0);
    const val = catIss.reduce((s, x) => s + Number(x.quantity_issued || 0) * Number(x.school_store_items?.unit_price || 0), 0);
    return { cat, qty, val, color: BAR_COLORS[i % BAR_COLORS.length], issues: catIss.length };
  }).filter(c => c.qty > 0).sort((a, b) => b.val - a.val), [yearIssuances]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, mi) => {
      const m = mi + 1;
      const mIss = catIssuances.filter(i => new Date(i.created_at).getMonth() + 1 === m);
      const val = mIss.reduce((s, i) => s + Number(i.quantity_issued || 0) * Number(i.school_store_items?.unit_price || 0), 0);
      const qty = mIss.reduce((s, i) => s + Number(i.quantity_issued || 0), 0);
      return { month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mi], val, qty };
    });
  }, [catIssuances]);

  // Low stock alerts
  const lowStock = items.filter(i => i.quantity <= (i.reorder_level || 5));
  const zeroStock = items.filter(i => i.quantity === 0);

  const totalValue = catIssuances.reduce((s, i) => s + Number(i.quantity_issued || 0) * Number(i.school_store_items?.unit_price || 0), 0);
  const totalQty = catIssuances.reduce((s, i) => s + Number(i.quantity_issued || 0), 0);
  const maxMonthVal = Math.max(...monthlyTrend.map(m => m.val), 1);
  const maxCatVal = Math.max(...categoryData.map(c => c.val), 1);

  const exportReport = () => {
    const rows = [['Item', 'Category', 'Qty Issued', 'Value (KES)', 'Issue Count']];
    itemConsumption.forEach(i => rows.push([i.name, i.category, String(i.qty), String(Math.round(i.value)), String(i.count)]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `stores_consumption_${filterYear}.csv`; a.click();
    toast.success('Report exported!');
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'byterm', label: '📅 Term Breakdown' },
    { id: 'byitem', label: '📦 By Item' },
    { id: 'trends', label: '📈 Monthly Trends' },
    { id: 'alerts', label: `🚨 Low Stock (${lowStock.length})` },
  ] as const;

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46,#047857)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">📊</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Stores Consumption Analytics</h1>
              <p className="text-green-200 text-sm mt-0.5">Term-by-term · {items.length} items · {issuances.length} issuances tracked · {zeroStock.length} out of stock</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {YEARS.map(y => <button key={y} onClick={() => setFilterYear(y)} className={`px-4 py-2 rounded-xl text-sm font-black transition border ${filterYear === y ? 'bg-white text-green-800 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}>{y}</button>)}
            <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-green-900 font-black text-sm hover:bg-amber-300 transition"><FiDownload size={14} /> Export</button>
          </div>
        </div>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-6">
          {[
            { icon: '📦', label: 'Total Issued', val: totalQty.toLocaleString(), sub: 'units' },
            { icon: '💰', label: 'Total Value', val: KES(totalValue), sub: filterYear },
            { icon: '📋', label: 'Issue Transactions', val: catIssuances.length, sub: 'records' },
            { icon: '🚨', label: 'Low Stock Items', val: lowStock.length, sub: `${zeroStock.length} zero stock` },
            { icon: '📦', label: 'Categories Active', val: categoryData.length, sub: 'of ' + CATEGORIES.length },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-sm font-black text-white leading-tight">{s.val}</div>
              <div className="text-[9px] text-green-200 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
              <div className="text-[8px] text-green-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS + FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab === t.id ? 'bg-green-700 text-white border-green-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>)}
        </div>
        <div className="flex gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white shadow-sm">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={fetchAll} className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-24"><div className="w-12 h-12 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>
      : activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 text-base mb-5">💰 Consumption Value by Category — {filterYear}</h3>
            <div className="space-y-4">
              {categoryData.map((c, i) => (
                <div key={c.cat}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} /><span className="text-sm font-bold text-gray-700">{c.cat}</span></div>
                    <div className="text-right"><span className="font-black text-sm text-gray-800">{KES(c.val)}</span><span className="text-[10px] text-gray-400 ml-2">{c.qty.toLocaleString()} units</span></div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${Math.round(c.val / maxCatVal * 100)}%`, background: c.color }} />
                  </div>
                </div>
              ))}
              {categoryData.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No issuances recorded for {filterYear}</p>}
            </div>
          </div>

          {/* Summary stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-gray-800 text-base mb-4">📊 Year at a Glance — {filterYear}</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: 'Total Items Issued', v: totalQty.toLocaleString() + ' units', c: '#0d9488' },
                  { l: 'Total Value', v: KES(totalValue), c: '#0891b2' },
                  { l: 'Avg Monthly', v: KES(totalValue / 12), c: '#6366f1' },
                  { l: 'Issue Transactions', v: catIssuances.length.toString(), c: '#d97706' },
                  { l: 'Unique Items Used', v: itemConsumption.length.toString(), c: '#16a34a' },
                  { l: 'Most Consumed', v: itemConsumption[0]?.name || '—', c: '#dc2626' },
                ].map(s => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{s.l}</p>
                    <p className="font-black mt-1 text-sm leading-tight" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-3">🏆 Top 5 Most Consumed (by Value)</h3>
              <div className="space-y-2">
                {itemConsumption.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-base w-8 text-center">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                    <div className="flex-1 min-w-0"><p className="font-bold text-gray-800 text-sm truncate">{item.name}</p><p className="text-[10px] text-gray-400">{item.category} · {item.qty.toLocaleString()} {item.unit}</p></div>
                    <span className="font-black text-green-700 text-sm flex-shrink-0">{KES(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'byterm' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {termData.map((t, i) => (
            <div key={t.term} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5" style={{ background: ['linear-gradient(135deg,#eff6ff,#dbeafe)', 'linear-gradient(135deg,#f0fdf4,#dcfce7)', 'linear-gradient(135deg,#fdf4ff,#f3e8ff)'][i] }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg">{t.term}</h3>
                    <p className="text-xs text-gray-500">{filterYear}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${['bg-blue-100','bg-green-100','bg-purple-100'][i]}`}>
                    {['📘','📗','📙'][i]}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: 'Value Consumed', v: KES(t.value), big: true },
                    { l: 'Units Issued', v: t.issued.toLocaleString(), big: false },
                    { l: 'Items Used', v: t.items.toString(), big: false },
                    { l: 'Stock Received', v: t.received.toLocaleString(), big: false },
                  ].map(s => (
                    <div key={s.l} className="bg-white/70 rounded-xl p-3">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p>
                      <p className={`font-black mt-0.5 ${s.big ? 'text-base' : 'text-sm'} text-gray-800`}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-5 pt-3">
                <p className="text-xs font-black text-gray-600 mb-2">Top Items This Term</p>
                <div className="space-y-1.5">
                  {catIssuances.filter(iss => {
                    const m = new Date(iss.created_at).getMonth() + 1;
                    return (i === 0 ? [1,2,3,4] : i === 1 ? [5,6,7,8] : [9,10,11,12]).includes(m);
                  }).reduce((acc: any, iss) => {
                    const n = iss.school_store_items?.item_name || '?';
                    acc[n] = (acc[n] || 0) + Number(iss.quantity_issued || 0);
                    return acc;
                  }, {} as any) && Object.entries(catIssuances.filter(iss => { const m = new Date(iss.created_at).getMonth() + 1; return (i === 0 ? [1,2,3,4] : i === 1 ? [5,6,7,8] : [9,10,11,12]).includes(m); }).reduce((acc: any, iss) => { const n = iss.school_store_items?.item_name || '?'; acc[n] = (acc[n] || 0) + Number(iss.quantity_issued || 0); return acc; }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([name, qty]: any) => (
                    <div key={name} className="flex justify-between text-xs py-1 border-b border-gray-50">
                      <span className="text-gray-700 truncate">{name}</span>
                      <span className="font-black text-gray-600 flex-shrink-0 ml-2">{Number(qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'byitem' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">All Items — Consumption Report {filterYear}</h3><p className="text-xs text-gray-400">{itemConsumption.length} items consumed</p></div>
          </div>
          {itemConsumption.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">📦</div><p className="font-black text-gray-600">No issuances recorded for {filterYear}</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">{['Rank','Item Name','Category','Qty Issued','Unit','Value Consumed','Issues','% of Total'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {itemConsumption.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-green-50/20 transition">
                      <td className="px-4 py-3 text-center font-black text-gray-400 text-sm">{idx < 3 ? ['🥇','🥈','🥉'][idx] : `${idx+1}`}</td>
                      <td className="px-4 py-3 font-black text-gray-800 text-sm">{item.name}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{item.category}</span></td>
                      <td className="px-4 py-3 font-black text-gray-800">{item.qty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.unit}</td>
                      <td className="px-4 py-3 font-black text-green-700">{KES(item.value)}</td>
                      <td className="px-4 py-3 text-center text-gray-600 text-sm">{item.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${Math.round(item.value / Math.max(totalValue, 1) * 100)}%` }} /></div>
                          <span className="text-[10px] font-black text-gray-600">{Math.round(item.value / Math.max(totalValue, 1) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'trends' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gray-800 text-base mb-6">📈 Monthly Consumption Trend — {filterYear}</h3>
          <div className="flex items-end gap-2 h-48 mb-3">
            {monthlyTrend.map((m, i) => {
              const height = Math.round(m.val / maxMonthVal * 100);
              const isSchoolTerm = [1,2,3,4,5,6,7,8,9,10,11,12].includes(i + 1);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                    {KES(m.val)}<br />{m.qty.toLocaleString()} units
                  </div>
                  <div className="w-full rounded-t-lg transition-all duration-500 cursor-pointer hover:opacity-80" style={{ height: `${Math.max(height, 2)}%`, background: m.val > 0 ? 'linear-gradient(to top,#065f46,#0d9488)' : '#e5e7eb', minHeight: 4 }} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {monthlyTrend.map(m => <span key={m.month} className="flex-1 text-center text-[10px] font-bold text-gray-500 min-w-[20px]">{m.month}</span>)}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            {monthlyTrend.reduce((acc, m, i) => {
              const term = i < 4 ? 0 : i < 8 ? 1 : 2;
              acc[term] = (acc[term] || 0) + m.val;
              return acc;
            }, [0,0,0] as number[]).map((val, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${['bg-blue-50','bg-green-50','bg-purple-50'][i]}`}>
                <p className="text-xs font-black text-gray-600 mb-1">{TERMS[i]}</p>
                <p className="font-black text-base" style={{ color: BAR_COLORS[i] }}>{KES(val)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ALERTS TAB */
        <div className="space-y-4">
          {zeroStock.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4"><FiAlertCircle className="text-red-600" size={22} /><h3 className="font-black text-red-800 text-lg">🔴 Zero Stock — {zeroStock.length} Items Completely Out</h3></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {zeroStock.map(item => (
                  <div key={item.id} className="bg-white border border-red-200 rounded-xl p-3">
                    <p className="font-black text-gray-800 text-sm">{item.item_name}</p>
                    <p className="text-[10px] text-red-500 font-bold">{item.category} · 0 {item.unit}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Min: {item.reorder_level || 5}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-black text-amber-800 text-lg">Low Stock — {lowStock.length} Items Below Reorder Level</h3>
              <button onClick={() => { const msg = `🚨 LOW STOCK ALERT\n\nAlphaSchool Stores — ${new Date().toLocaleDateString('en-KE')}\n\n${lowStock.slice(0,10).map(i=>`• ${i.item_name}: ${i.quantity} ${i.unit||'units'} (min: ${i.reorder_level||5})`).join('\n')}${lowStock.length>10?`\n...and ${lowStock.length-10} more`:''}\n\nPlease restock urgently!`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank'); }} className="ml-auto px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-black hover:bg-green-400 transition">📱 WhatsApp Alert</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-amber-200 bg-amber-100/50">{['Item','Category','Current Stock','Min Level','Gap','Unit Price','Est. Cost to Restock'].map(h=><th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-amber-800 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-amber-100">
                  {lowStock.sort((a,b)=>a.quantity-b.quantity).map(item=>{
                    const gap = Math.max(0,(item.reorder_level||5)-item.quantity);
                    const costToRestock = gap*(item.unit_price||0);
                    return(
                      <tr key={item.id} className={`${item.quantity===0?'bg-red-50':''} hover:bg-amber-50 transition`}>
                        <td className="px-4 py-2.5 font-black text-gray-800 text-sm">{item.item_name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{item.category||'—'}</td>
                        <td className="px-4 py-2.5"><span className={`font-black text-base ${item.quantity===0?'text-red-600':'text-amber-600'}`}>{item.quantity}</span><span className="text-[10px] text-gray-400 ml-1">{item.unit||'units'}</span></td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{item.reorder_level||5}</td>
                        <td className="px-4 py-2.5 font-black text-red-600">{gap}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{KES(item.unit_price||0)}</td>
                        <td className="px-4 py-2.5 font-black text-green-700">{KES(costToRestock)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-300 bg-amber-100">
                    <td colSpan={6} className="px-4 py-3 font-black text-amber-800 text-sm">Total Estimated Restock Cost</td>
                    <td className="px-4 py-3 font-black text-green-800 text-base">{KES(lowStock.reduce((s,i)=>{const gap=Math.max(0,(i.reorder_level||5)-i.quantity);return s+gap*(i.unit_price||0)},0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

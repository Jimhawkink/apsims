'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar, Doughnut } from 'react-chartjs-2';

export default function StoresPanel() {
  const [data, setData] = useState<any>({ assets: [], books: [], textbooks: [], stores: [] });
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    (async () => {
      const [{ data: assets }, { data: books }, { data: textbooks }, { data: stores }] = await Promise.all([
        supabase.from('school_assets').select('*'),
        supabase.from('school_library_books').select('*'),
        supabase.from('school_digital_textbooks').select('*'),
        supabase.from('school_store_items').select('*'),
      ]);
      setData({ assets: assets || [], books: books || [], textbooks: textbooks || [], stores: stores || [] });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading stores data...</div>;

  const totalAssetValue = data.assets.reduce((s: number, a: any) => s + Number(a.current_value || a.purchase_price || 0) * Number(a.quantity || 1), 0);
  const totalBooks = data.books.length;
  const issuedBooks = data.books.filter((b: any) => b.status === 'Issued').length;
  const totalStoreItems = data.stores.length;
  const lowStock = data.stores.filter((s: any) => Number(s.quantity || 0) <= Number(s.reorder_level || 5)).length;

  // Asset condition
  const conditions: Record<string, number> = {};
  data.assets.forEach((a: any) => { const c = a.condition || 'Good'; conditions[c] = (conditions[c] || 0) + 1; });
  const condColors: Record<string, string> = { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Fair': '#f59e0b', 'Poor': '#ef4444', 'Damaged': '#dc2626' };
  const condChart = {
    labels: Object.keys(conditions),
    datasets: [{ data: Object.values(conditions), backgroundColor: Object.keys(conditions).map(c => condColors[c] || '#9ca3af'), borderWidth: 0 }],
  };

  // Asset categories
  const cats: Record<string, number> = {};
  data.assets.forEach((a: any) => { const c = a.category || 'General'; cats[c] = (cats[c] || 0) + 1; });
  const catChart = {
    labels: Object.keys(cats).slice(0, 6),
    datasets: [{ data: Object.values(cats).slice(0, 6), backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'], borderRadius: 6, barThickness: 20 }],
  };

  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } };
  const bOpts = { responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 } }, beginAtZero: true }, y: { grid: { display: false }, ticks: { font: { size: 9 } } } } };

  return (
    <div className="space-y-4 ultra-animate">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Total Assets', value: data.assets.length, icon: '🏗️', color: '#6366f1' },
          { label: 'Asset Value', value: fmt(totalAssetValue), icon: '💎', color: '#10b981' },
          { label: 'Library Books', value: totalBooks, icon: '📚', color: '#3b82f6' },
          { label: 'Books Issued', value: issuedBooks, icon: '📖', color: '#f59e0b' },
          { label: 'Store Items', value: totalStoreItems, icon: '📦', color: '#8b5cf6' },
          { label: 'Low Stock', value: lowStock, icon: '⚠️', color: lowStock > 0 ? '#ef4444' : '#10b981' },
        ].map((c, i) => (
          <div key={i} className="ultra-card">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.color }} />
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[9px] text-gray-400 uppercase font-semibold">{c.label}</span></div>
            <p className="text-[18px] font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">🔧 Asset Condition</h3>
          <div style={{ height: 150 }}>{Object.keys(conditions).length > 0 ? <Doughnut data={condChart} options={dOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>}</div>
          <div className="mt-2 space-y-1">{Object.entries(conditions).map(([c, v], i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: condColors[c] || '#9ca3af' }} /><span className="text-gray-400 flex-1">{c}</span><span className="font-semibold">{v}</span></div>
          ))}</div>
        </div>
        <div className="ultra-panel lg:col-span-2">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📊 Assets by Category</h3>
          <div style={{ height: 180 }}>{Object.keys(cats).length > 0 ? <Bar data={catChart} options={bOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No assets recorded</div>}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📚 Library Books</h3>
          {data.books.length === 0 ? <div className="text-center py-8 text-gray-400 text-[11px]">No books registered</div> : (
            <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Title</th><th>Author</th><th>Status</th></tr></thead><tbody>
              {data.books.slice(0, 8).map((b: any, i: number) => (
                <tr key={i}><td className="font-medium text-[11px]">{b.title}</td><td className="text-[10px] text-gray-400">{b.author || '—'}</td>
                  <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${b.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{b.status || 'Available'}</span></td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📦 Store Inventory</h3>
          {data.stores.length === 0 ? <div className="text-center py-8 text-gray-400 text-[11px]">No store items</div> : (
            <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Item</th><th>Qty</th><th>Status</th></tr></thead><tbody>
              {data.stores.slice(0, 8).map((s: any, i: number) => {
                const isLow = Number(s.quantity || 0) <= Number(s.reorder_level || 5);
                return (<tr key={i}><td className="font-medium text-[11px]">{s.item_name}</td><td className="font-mono text-[11px]">{s.quantity || 0}</td>
                  <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${isLow ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{isLow ? 'Low Stock' : 'OK'}</span></td></tr>);
              })}
            </tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}

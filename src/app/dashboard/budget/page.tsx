'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const HEADS = ['Salaries & wages', 'Operations', 'Procurement', 'Infrastructure', 'Library & ICT', 'Extra-curricular', 'Boarding', 'Transport', 'Medical', 'Utilities', 'Maintenance', 'Other'];

export default function BudgetPage() {
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const year = new Date().getFullYear();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_budget_votes').select('*').eq('academic_year', year).order('budget_amount', { ascending: false });
    setVotes(data || []);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!form.vote_head || !form.budget_amount) return toast.error('Vote head and budget amount required');
    const payload = { ...form, budget_amount: Number(form.budget_amount), actual_amount: Number(form.actual_amount || 0), academic_year: year };
    const { error } = editId
      ? await supabase.from('school_budget_votes').update(payload).eq('id', editId)
      : await supabase.from('school_budget_votes').insert([payload]);
    if (error) return toast.error(error.message);
    toast.success(editId ? 'Updated!' : 'Budget vote added!');
    setShowModal(false); setEditId(null);
    setForm({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget vote?')) return;
    await supabase.from('school_budget_votes').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const totalBudget = votes.reduce((s, v) => s + Number(v.budget_amount || 0), 0);
  const totalActual = votes.reduce((s, v) => s + Number(v.actual_amount || 0), 0);
  const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
  const variance = totalBudget - totalActual;

  const pctColor = (p: number) => p > 100 ? 'text-red-600' : p > 80 ? 'text-amber-600' : 'text-emerald-600';
  const barColor = (p: number) => p > 100 ? 'bg-red-500' : p > 80 ? 'bg-amber-500' : 'bg-emerald-500';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} /><p className="text-sm text-gray-400">Loading budget data…</p></div></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">📊 Budget vs Actual — {year}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track budget allocation, expenditure and variance by vote head</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditId(null); setForm({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' }); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all"><FiPlus size={14} /> Add Vote Head</button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiDownload size={16} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Budget', value: fmt(totalBudget), color: '#3b82f6', icon: '💰' },
          { label: 'Actual Spend', value: fmt(totalActual), color: '#8b5cf6', icon: '💳' },
          { label: 'Utilization', value: `${utilization}%`, color: utilization > 90 ? '#ef4444' : utilization > 70 ? '#f59e0b' : '#10b981', icon: '📈' },
          { label: 'Variance', value: fmt(variance), color: variance >= 0 ? '#10b981' : '#ef4444', icon: variance >= 0 ? '✅' : '⚠️' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase">{c.label}</p><span className="text-lg">{c.icon}</span></div>
            <p className="text-xl font-extrabold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Budget Table with Progress Bars */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700">📋 Vote Head Breakdown</h3>
          <span className="text-[10px] text-gray-400">{votes.length} vote heads</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Vote Head', 'Category', 'Budget', 'Actual', '% Used', 'Progress', 'Variance', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {votes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No budget votes yet. Click &quot;Add Vote Head&quot; to get started.</td></tr>
              ) : votes.map(v => {
                const pct = Number(v.budget_amount) > 0 ? Math.round((Number(v.actual_amount) / Number(v.budget_amount)) * 100) : 0;
                const diff = Number(v.budget_amount) - Number(v.actual_amount);
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs font-bold text-gray-800">{v.vote_head}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{v.category}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{fmt(v.budget_amount)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-800">{fmt(v.actual_amount)}</td>
                    <td className={`px-4 py-3 text-xs font-extrabold ${pctColor(pct)}`}>{pct}%</td>
                    <td className="px-4 py-3 w-40">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(diff)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setForm({ vote_head: v.vote_head, category: v.category, budget_amount: String(v.budget_amount), actual_amount: String(v.actual_amount), notes: v.notes || '' }); setEditId(v.id); setShowModal(true); }} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                        <button onClick={() => handleDelete(v.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {votes.length > 0 && (
              <tfoot><tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3 text-xs">TOTALS</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-xs">{fmt(totalBudget)}</td>
                <td className="px-4 py-3 text-xs">{fmt(totalActual)}</td>
                <td className={`px-4 py-3 text-xs font-extrabold ${pctColor(utilization)}`}>{utilization}%</td>
                <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor(utilization)}`} style={{ width: `${Math.min(utilization, 100)}%` }} /></div></td>
                <td className={`px-4 py-3 text-xs font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(variance)}</td>
                <td></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} Budget Vote</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Vote Head *</label>
                <select value={form.vote_head} onChange={e => setForm({ ...form, vote_head: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  <option value="">Select or type...</option>
                  {HEADS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                    {['Recurrent', 'Capital', 'Operations', 'Personnel'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Budget (KES) *</label>
                  <input type="number" value={form.budget_amount} onChange={e => setForm({ ...form, budget_amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Actual Spent (KES)</label>
                <input type="number" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">{editId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

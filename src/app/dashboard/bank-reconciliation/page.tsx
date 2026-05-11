'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiDownload, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '', account_type: 'Current', book_balance: '', bank_balance: '', reconciliation_status: 'Pending', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_bank_accounts').select('*').order('bank_name');
    setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!form.bank_name || !form.account_number) return toast.error('Bank name and account number required');
    const payload = { ...form, book_balance: Number(form.book_balance || 0), bank_balance: Number(form.bank_balance || 0), last_reconciled_at: form.reconciliation_status === 'Reconciled' ? new Date().toISOString() : null };
    const { error } = editId
      ? await supabase.from('school_bank_accounts').update(payload).eq('id', editId)
      : await supabase.from('school_bank_accounts').insert([payload]);
    if (error) return toast.error(error.message);
    toast.success(editId ? 'Updated!' : 'Bank account added!');
    setShowModal(false); setEditId(null);
    setForm({ bank_name: '', account_number: '', account_name: '', account_type: 'Current', book_balance: '', bank_balance: '', reconciliation_status: 'Pending', notes: '' });
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this bank account?')) return;
    await supabase.from('school_bank_accounts').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const totalBook = accounts.reduce((s, a) => s + Number(a.book_balance || 0), 0);
  const totalBank = accounts.reduce((s, a) => s + Number(a.bank_balance || 0), 0);
  const totalDiff = totalBank - totalBook;
  const reconciled = accounts.filter(a => a.reconciliation_status === 'Reconciled').length;
  const unreconciled = accounts.filter(a => a.reconciliation_status !== 'Reconciled').length;

  const statusColor = (s: string) => ({ Reconciled: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Unreconciled: 'bg-red-50 text-red-700' }[s] || 'bg-gray-50 text-gray-600');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-10 h-10 border-3 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} /><p className="text-sm text-gray-400">Loading bank accounts…</p></div></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">🔄 Bank Reconciliation</h1>
          <p className="text-xs text-gray-400 mt-0.5">Match book balances with bank statements — identify discrepancies</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditId(null); setForm({ bank_name: '', account_number: '', account_name: '', account_type: 'Current', book_balance: '', bank_balance: '', reconciliation_status: 'Pending', notes: '' }); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-all"><FiPlus size={14} /> Add Account</button>
          <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiRefreshCw size={16} /></button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiDownload size={16} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Book Balance', value: fmt(totalBook), color: '#3b82f6', icon: '📒' },
          { label: 'Total Bank Balance', value: fmt(totalBank), color: '#8b5cf6', icon: '🏦' },
          { label: 'Total Difference', value: fmt(Math.abs(totalDiff)), color: totalDiff === 0 ? '#10b981' : '#ef4444', icon: totalDiff === 0 ? '✅' : '⚠️' },
          { label: 'Reconciled', value: `${reconciled}/${accounts.length}`, color: '#10b981', icon: '🔄' },
          { label: 'Unreconciled', value: String(unreconciled), color: unreconciled > 0 ? '#ef4444' : '#10b981', icon: '📊' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase">{c.label}</p><span className="text-base">{c.icon}</span></div>
            <p className="text-lg font-extrabold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Bank Accounts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700">🏦 Bank Accounts</h3>
          <span className="text-[10px] text-gray-400">{accounts.length} accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Bank', 'Account No.', 'Account Name', 'Type', 'Book Balance', 'Bank Balance', 'Difference', 'Last Reconciled', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">No bank accounts configured. Click &quot;Add Account&quot; to set up.</td></tr>
              ) : accounts.map(a => {
                const diff = Number(a.bank_balance || 0) - Number(a.book_balance || 0);
                return (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs font-bold text-gray-800">{a.bank_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.account_number}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.account_name || '—'}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{a.account_type}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{fmt(a.book_balance)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{fmt(a.bank_balance)}</td>
                    <td className={`px-4 py-3 text-xs font-bold ${diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>{diff === 0 ? 'KES 0' : fmt(diff)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.last_reconciled_at ? new Date(a.last_reconciled_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor(a.reconciliation_status)}`}>{a.reconciliation_status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setForm({ bank_name: a.bank_name, account_number: a.account_number, account_name: a.account_name || '', account_type: a.account_type, book_balance: String(a.book_balance), bank_balance: String(a.bank_balance), reconciliation_status: a.reconciliation_status, notes: a.notes || '' }); setEditId(a.id); setShowModal(true); }} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {accounts.length > 0 && (
              <tfoot><tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3 text-xs" colSpan={4}>TOTALS</td>
                <td className="px-4 py-3 text-xs">{fmt(totalBook)}</td>
                <td className="px-4 py-3 text-xs">{fmt(totalBank)}</td>
                <td className={`px-4 py-3 text-xs font-bold ${totalDiff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalDiff)}</td>
                <td colSpan={3}></td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} Bank Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Bank Name *</label><input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="e.g. KCB" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Account No. *</label><input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="1120..." /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Account Name</label><input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Type</label><select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"><option>Current</option><option>Savings</option><option>M-Pesa</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Book Balance (KES)</label><input type="number" value={form.book_balance} onChange={e => setForm({ ...form, book_balance: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="0" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Bank Balance (KES)</label><input type="number" value={form.bank_balance} onChange={e => setForm({ ...form, bank_balance: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="0" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label><select value={form.reconciliation_status} onChange={e => setForm({ ...form, reconciliation_status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"><option>Pending</option><option>Reconciled</option><option>Unreconciled</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">{editId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

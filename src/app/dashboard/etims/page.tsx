'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiRefreshCw, FiUpload, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

export default function EtimsPage() {
  const [config, setConfig] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ kra_pin: '', vscu_status: 'Active', token_expiry: '', receipts_pending: 0, paye_status: 'Pending', paye_amount: '', nssf_status: 'Pending', nssf_amount: '', nssf_due_date: '', tcc_valid: true, tcc_expiry: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('school_etims_config').select('*').limit(1),
      supabase.from('school_fee_payments').select('id, amount, payment_date, receipt_number, payment_method, student_id').order('payment_date', { ascending: false }).limit(50),
    ]);
    const cfg = c?.[0] || null;
    setConfig(cfg);
    setPayments(p || []);
    if (cfg) setForm({ kra_pin: cfg.kra_pin || '', vscu_status: cfg.vscu_status || 'Active', token_expiry: cfg.token_expiry || '', receipts_pending: cfg.receipts_pending || 0, paye_status: cfg.paye_status || 'Pending', paye_amount: String(cfg.paye_amount || ''), nssf_status: cfg.nssf_status || 'Pending', nssf_amount: String(cfg.nssf_amount || ''), nssf_due_date: cfg.nssf_due_date || '', tcc_valid: cfg.tcc_valid !== false, tcc_expiry: cfg.tcc_expiry || '' });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    const payload = { ...form, paye_amount: Number(form.paye_amount || 0), nssf_amount: Number(form.nssf_amount || 0), receipts_pending: Number(form.receipts_pending), updated_at: new Date().toISOString() };
    let error;
    if (config?.id) {
      ({ error } = await supabase.from('school_etims_config').update(payload).eq('id', config.id));
    } else {
      ({ error } = await supabase.from('school_etims_config').insert([payload]));
    }
    if (error) return toast.error(error.message);
    toast.success('eTIMS configuration saved!');
    setShowEdit(false);
    fetchAll();
  };

  const pendingReceipts = payments.filter(p => !p.receipt_number);
  const postedReceipts = payments.filter(p => p.receipt_number);
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const statusBadge = (ok: boolean, label: string) => (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {ok ? <FiCheckCircle size={11} /> : <FiAlertTriangle size={11} />} {label}
    </span>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-10 h-10 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} /><p className="text-sm text-gray-400">Loading eTIMS data…</p></div></div>;

  const cfg = config || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">🧾 KRA eTIMS & Compliance</h1>
          <p className="text-xs text-gray-400 mt-0.5">Electronic Tax Invoice Management System — receipts, PAYE, NSSF, TCC</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 shadow-sm transition-all">⚙️ Configure</button>
          <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiRefreshCw size={16} /></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'KRA PIN', value: cfg.kra_pin || 'Not set', color: '#6366f1', icon: '🏢' },
          { label: 'VSCU Status', value: cfg.vscu_status || 'Active', color: cfg.vscu_status === 'Active' ? '#10b981' : '#ef4444', icon: '🔌' },
          { label: 'Pending Receipts', value: String(pendingReceipts.length), color: pendingReceipts.length > 0 ? '#f59e0b' : '#10b981', icon: '📄' },
          { label: 'Posted Receipts', value: String(postedReceipts.length), color: '#10b981', icon: '✅' },
          { label: 'Total Revenue', value: fmt(totalRevenue), color: '#3b82f6', icon: '💰' },
          { label: 'TCC Status', value: cfg.tcc_valid !== false ? 'Valid' : 'Expired', color: cfg.tcc_valid !== false ? '#10b981' : '#ef4444', icon: '📋' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase">{c.label}</p><span className="text-base">{c.icon}</span></div>
            <p className="text-lg font-extrabold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Compliance Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* VSCU */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">🔌 eTIMS VSCU</h3>
            {statusBadge(cfg.vscu_status === 'Active', cfg.vscu_status || 'Active')}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-400">Token expiry</span><span className="font-semibold text-gray-700">{cfg.token_expiry || '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Pending upload</span><span className="font-bold text-amber-600">{pendingReceipts.length} receipts</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Last sync</span><span className="text-gray-600">{cfg.last_sync_at ? new Date(cfg.last_sync_at).toLocaleString('en-KE') : '—'}</span></div>
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors"><FiUpload size={12} /> Sync receipts now</button>
        </div>

        {/* PAYE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">🏦 PAYE Returns</h3>
            {statusBadge(cfg.paye_status === 'Filed', cfg.paye_status || 'Pending')}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-400">Amount</span><span className="font-bold text-gray-700">{cfg.paye_amount ? fmt(cfg.paye_amount) : '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Filing status</span><span className={`font-semibold ${cfg.paye_status === 'Filed' ? 'text-emerald-600' : 'text-amber-600'}`}>{cfg.paye_status || 'Pending'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Reference</span><span className="font-mono text-gray-500">{cfg.paye_reference || '—'}</span></div>
          </div>
        </div>

        {/* NSSF */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">🛡️ NSSF / NHIF</h3>
            {statusBadge(cfg.nssf_status !== 'Pending', cfg.nssf_status || 'Pending')}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-400">NSSF amount</span><span className="font-bold text-gray-700">{cfg.nssf_amount ? fmt(cfg.nssf_amount) : '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Due date</span><span className={`font-semibold ${cfg.nssf_status === 'Pending' ? 'text-red-600' : 'text-gray-600'}`}>{cfg.nssf_due_date || '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">TCC expiry</span><span className="font-semibold text-gray-600">{cfg.tcc_expiry || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Receipt Upload Queue */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700">📄 Recent Receipts ({payments.length})</h3>
          <span className="text-[10px] font-bold text-amber-600">{pendingReceipts.length} pending upload</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Date', 'Amount', 'Method', 'Receipt No.', 'eTIMS Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {payments.slice(0, 15).map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{fmt(p.amount)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{p.payment_method || 'Cash'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{p.receipt_number || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${p.receipt_number ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.receipt_number ? 'Posted' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">⚙️ eTIMS Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">KRA PIN</label><input value={form.kra_pin} onChange={e => setForm({ ...form, kra_pin: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="P0..." /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">VSCU Status</label><select value={form.vscu_status} onChange={e => setForm({ ...form, vscu_status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"><option>Active</option><option>Expired</option><option>Suspended</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Token Expiry</label><input type="date" value={form.token_expiry} onChange={e => setForm({ ...form, token_expiry: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">PAYE Status</label><select value={form.paye_status} onChange={e => setForm({ ...form, paye_status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"><option>Pending</option><option>Filed</option><option>Overdue</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">PAYE Amount</label><input type="number" value={form.paye_amount} onChange={e => setForm({ ...form, paye_amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">NSSF Status</label><select value={form.nssf_status} onChange={e => setForm({ ...form, nssf_status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none"><option>Pending</option><option>Remitted</option><option>Overdue</option></select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">NSSF Amount</label><input type="number" value={form.nssf_amount} onChange={e => setForm({ ...form, nssf_amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">NSSF Due Date</label><input type="date" value={form.nssf_due_date} onChange={e => setForm({ ...form, nssf_due_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">TCC Expiry</label><input type="date" value={form.tcc_expiry} onChange={e => setForm({ ...form, tcc_expiry: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm">Save Config</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

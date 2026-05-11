'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FiPlus, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

export default function CapitationPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ form_id: '', stream_id: '', amount: '', source: 'MoE', disbursement_date: '', status: 'Pending', reference_number: '', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: f }, { data: st }, { data: s }] = await Promise.all([
      supabase.from('school_capitation').select('*').order('created_at', { ascending: false }),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*'),
      supabase.from('school_students').select('id, form_id, status').eq('status', 'Active'),
    ]);
    setRecords(c || []); setForms(f || []); setStreams(st || []); setStudents(s || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!form.form_id || !form.amount) return toast.error('Form and amount required');
    const payload = { ...form, amount: Number(form.amount), form_id: Number(form.form_id), stream_id: form.stream_id ? Number(form.stream_id) : null };
    const { error } = editId
      ? await supabase.from('school_capitation').update(payload).eq('id', editId)
      : await supabase.from('school_capitation').insert([payload]);
    if (error) return toast.error(error.message);
    toast.success(editId ? 'Updated!' : 'Capitation recorded!');
    setShowModal(false); setEditId(null);
    setForm({ form_id: '', stream_id: '', amount: '', source: 'MoE', disbursement_date: '', status: 'Pending', reference_number: '', notes: '' });
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this capitation record?')) return;
    await supabase.from('school_capitation').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const totalReceived = records.filter(r => r.status === 'Credited' || r.status === 'Received').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPending = records.filter(r => r.status === 'Pending').reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotal = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const perCapita = students.length > 0 ? Math.round(grandTotal / students.length) : 0;

  // Chart: per form
  const formData = forms.map(f => ({
    name: f.form_name,
    amount: records.filter(r => r.form_id === f.id).reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
    students: students.filter((s: any) => s.form_id === f.id).length,
  }));

  const chartData = {
    labels: formData.map(f => f.name),
    datasets: [
      { label: 'Capitation (KES)', data: formData.map(f => f.amount), backgroundColor: '#6366f1', borderRadius: 6, barPercentage: 0.5 },
      { label: 'Students', data: formData.map(f => f.students * 1000), backgroundColor: '#22d3ee', borderRadius: 6, barPercentage: 0.5 },
    ],
  };

  const statusColor = (s: string) => ({ Credited: 'bg-emerald-50 text-emerald-700', Received: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Rejected: 'bg-red-50 text-red-700' }[s] || 'bg-gray-50 text-gray-600');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} /><p className="text-sm text-gray-400">Loading capitation data…</p></div></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">🏛️ Capitation Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">MoE capitation grants — allocation per form & stream</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditId(null); setForm({ form_id: '', stream_id: '', amount: '', source: 'MoE', disbursement_date: '', status: 'Pending', reference_number: '', notes: '' }); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all"><FiPlus size={14} /> Record Capitation</button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiDownload size={16} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Capitation', value: fmt(grandTotal), color: '#6366f1', icon: '🏛️' },
          { label: 'Received', value: fmt(totalReceived), color: '#10b981', icon: '✅' },
          { label: 'Pending', value: fmt(totalPending), color: '#f59e0b', icon: '⏳' },
          { label: 'Per Student', value: fmt(perCapita), color: '#3b82f6', icon: '👤' },
          { label: 'Active Students', value: students.length.toLocaleString(), color: '#8b5cf6', icon: '👨‍🎓' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p><span className="text-base">{c.icon}</span></div>
            <p className="text-lg font-extrabold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-gray-700 mb-3">📊 Capitation by Form</h3>
          <div style={{ height: 240 }}>
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } } }, scales: { y: { beginAtZero: true, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } } }} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700">📋 Capitation Records</h3>
            <span className="text-[10px] text-gray-400">{records.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {['Form', 'Stream', 'Amount', 'Source', 'Date', 'Ref', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {records.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No records yet</td></tr>
                ) : records.map(r => {
                  const f = forms.find((fo: any) => fo.id === r.form_id);
                  const st = streams.find((s: any) => s.id === r.stream_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{f?.form_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{st?.stream_name || 'All'}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{fmt(r.amount)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.source}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.disbursement_date ? new Date(r.disbursement_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{r.reference_number || '—'}</td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setForm({ form_id: String(r.form_id), stream_id: String(r.stream_id || ''), amount: String(r.amount), source: r.source, disbursement_date: r.disbursement_date || '', status: r.status, reference_number: r.reference_number || '', notes: r.notes || '' }); setEditId(r.id); setShowModal(true); }} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                          <button onClick={() => handleDelete(r.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">{editId ? 'Edit' : 'Record'} Capitation</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Form *</label>
                <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  <option value="">Select form...</option>
                  {forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Stream</label>
                <select value={form.stream_id} onChange={e => setForm({ ...form, stream_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  <option value="">All streams</option>
                  {streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Amount (KES) *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Source</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  {['MoE', 'County', 'CDF', 'Other'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Disbursement Date</label>
                <input type="date" value={form.disbursement_date} onChange={e => setForm({ ...form, disbursement_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Reference</label>
                <input type="text" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  {['Pending', 'Credited', 'Received', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">{editId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

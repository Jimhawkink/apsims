'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiSearch, FiDownload, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const TYPES = ['HELB', 'County Bursary', 'CDF', 'NGO', 'Other'] as const;
const STATUSES = ['Pending', 'Credited', 'Queued', 'Rejected'] as const;

export default function BursaryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [form, setForm] = useState({ student_id: '', bursary_type: 'HELB', amount: '', disbursement_date: '', reference_number: '', status: 'Pending', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: s }, { data: f }] = await Promise.all([
      supabase.from('school_bursary_records').select('*').order('created_at', { ascending: false }),
      supabase.from('school_students').select('id, first_name, last_name, admission_no, admission_number, form_id, status').eq('status', 'Active'),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    setRecords(b || []);
    setStudents(s || []);
    setForms(f || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!form.student_id || !form.amount) return toast.error('Student and amount are required');
    const payload = { ...form, amount: Number(form.amount), student_id: Number(form.student_id) };
    let err;
    if (editId) {
      const { error } = await supabase.from('school_bursary_records').update(payload).eq('id', editId);
      err = error;
    } else {
      const { error } = await supabase.from('school_bursary_records').insert([payload]);
      err = error;
    }
    if (err) return toast.error(err.message);
    toast.success(editId ? 'Record updated!' : 'Bursary record added!');
    setShowModal(false);
    setEditId(null);
    setForm({ student_id: '', bursary_type: 'HELB', amount: '', disbursement_date: '', reference_number: '', status: 'Pending', notes: '' });
    fetchAll();
  };

  const openEdit = (r: any) => {
    setForm({ student_id: String(r.student_id), bursary_type: r.bursary_type, amount: String(r.amount), disbursement_date: r.disbursement_date || '', reference_number: r.reference_number || '', status: r.status, notes: r.notes || '' });
    setEditId(r.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this bursary record?')) return;
    await supabase.from('school_bursary_records').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  // Computed
  const helbTotal = records.filter(r => r.bursary_type === 'HELB').reduce((s, r) => s + Number(r.amount || 0), 0);
  const countyTotal = records.filter(r => r.bursary_type === 'County Bursary').reduce((s, r) => s + Number(r.amount || 0), 0);
  const cdfTotal = records.filter(r => r.bursary_type === 'CDF').reduce((s, r) => s + Number(r.amount || 0), 0);
  const ngoTotal = records.filter(r => r.bursary_type === 'NGO' || r.bursary_type === 'Other').reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotal = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const credited = records.filter(r => r.status === 'Credited').reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = records.filter(r => r.status === 'Pending' || r.status === 'Queued').reduce((s, r) => s + Number(r.amount || 0), 0);

  const filtered = records.filter(r => {
    if (filterType !== 'All' && r.bursary_type !== filterType) return false;
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    if (search) {
      const st = students.find((s: any) => s.id === r.student_id);
      const name = st ? `${st.first_name} ${st.last_name}`.toLowerCase() : '';
      if (!name.includes(search.toLowerCase()) && !(r.reference_number || '').toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const getName = (id: number) => { const s = students.find((st: any) => st.id === id); return s ? `${s.first_name} ${s.last_name}` : '—'; };
  const getAdm = (id: number) => { const s = students.find((st: any) => st.id === id); return s?.admission_no || s?.admission_number || '—'; };
  const getForm = (id: number) => { const s = students.find((st: any) => st.id === id); const f = forms.find((fo: any) => fo.id === s?.form_id); return f?.form_name || '—'; };

  const statusColor = (s: string) => ({ Credited: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Queued: 'bg-blue-50 text-blue-700', Rejected: 'bg-red-50 text-red-700' }[s] || 'bg-gray-50 text-gray-600');
  const typeColor = (t: string) => ({ HELB: 'bg-purple-50 text-purple-700', 'County Bursary': 'bg-blue-50 text-blue-700', CDF: 'bg-emerald-50 text-emerald-700', NGO: 'bg-amber-50 text-amber-700', Other: 'bg-gray-50 text-gray-600' }[t] || 'bg-gray-50 text-gray-600');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} /><p className="text-sm text-gray-400">Loading bursary records…</p></div></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">🎓 HELB & Bursary Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track HELB loans, county bursaries, CDF & NGO disbursements</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditId(null); setForm({ student_id: '', bursary_type: 'HELB', amount: '', disbursement_date: '', reference_number: '', status: 'Pending', notes: '' }); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 shadow-sm shadow-purple-200 transition-all">
            <FiPlus size={14} /> Add Record
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiDownload size={16} /></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'HELB', value: fmt(helbTotal), color: '#8b5cf6', count: records.filter(r => r.bursary_type === 'HELB').length },
          { label: 'County Bursary', value: fmt(countyTotal), color: '#3b82f6', count: records.filter(r => r.bursary_type === 'County Bursary').length },
          { label: 'CDF', value: fmt(cdfTotal), color: '#10b981', count: records.filter(r => r.bursary_type === 'CDF').length },
          { label: 'NGO / Other', value: fmt(ngoTotal), color: '#f59e0b', count: records.filter(r => r.bursary_type === 'NGO' || r.bursary_type === 'Other').length },
          { label: 'Grand Total', value: fmt(grandTotal), color: '#6366f1', count: records.length },
          { label: 'Credited', value: fmt(credited), color: '#22c55e', count: records.filter(r => r.status === 'Credited').length },
          { label: 'Pending', value: fmt(pending), color: '#ef4444', count: records.filter(r => r.status === 'Pending' || r.status === 'Queued').length },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: c.color }}>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-lg font-extrabold text-gray-800 mt-1">{c.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{c.count} records</p>
            <div className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full opacity-[0.06]" style={{ background: c.color }} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
          <input type="text" placeholder="Search student or reference..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white">
          <option value="All">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white">
          <option value="All">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Adm No', 'Student', 'Form', 'Type', 'Amount', 'Date', 'Reference', 'Status', 'Notes', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">No bursary records found. Click &quot;Add Record&quot; to create one.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{getAdm(r.student_id)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{getName(r.student_id)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{getForm(r.student_id)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${typeColor(r.bursary_type)}`}>{r.bursary_type}</span></td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-800">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.disbursement_date ? new Date(r.disbursement_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{r.reference_number || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">{editId ? 'Edit' : 'Add'} Bursary Record</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Student *</label>
                <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none">
                  <option value="">Select student...</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no || s.admission_number || s.id})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Type *</label>
                <select value={form.bursary_type} onChange={e => setForm({ ...form, bursary_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Amount (KES) *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Disbursement Date</label>
                <input type="date" value={form.disbursement_date} onChange={e => setForm({ ...form, disbursement_date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Reference No.</label>
                <input type="text" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none" placeholder="e.g. HELB-2026-001" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm">
                {editId ? 'Update' : 'Save'} Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiRefreshCw, FiDownload, FiCheck, FiClock, FiAlertCircle, FiCalendar, FiUser } from 'react-icons/fi';

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Compassionate Leave', 'Study Leave', 'Unpaid Leave', 'Emergency Leave', 'TSC Leave'];
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'On Leave'];
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  Pending: { bg: '#fef9c3', color: '#854d0e' }, Approved: { bg: '#dcfce7', color: '#166534' },
  Rejected: { bg: '#fee2e2', color: '#991b1b' }, Cancelled: { bg: '#f3f4f6', color: '#4b5563' }, 'On Leave': { bg: '#dbeafe', color: '#1e40af' },
};
const DAYS_PER_TYPE: Record<string, number> = { 'Annual Leave': 21, 'Sick Leave': 14, 'Maternity Leave': 90, 'Paternity Leave': 14, 'Compassionate Leave': 5, 'Study Leave': 30, 'Unpaid Leave': 365, 'Emergency Leave': 3, 'TSC Leave': 10 };

const getDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};

export default function StaffLeavePage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [activeTab, setActiveTab] = useState<'applications' | 'calendar' | 'balance' | 'summary'>('applications');

  const emptyForm = { staff_id: '', leave_type: 'Annual Leave', start_date: '', end_date: '', reason: '', status: 'Pending', approved_by: '', notes: '', substitute_teacher: '' };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [lR, sR] = await Promise.all([
      supabase.from('school_staff_leave').select('*, school_teachers(first_name,last_name,tsc_number,role,department)').order('created_at', { ascending: false }),
      supabase.from('school_teachers').select('id,first_name,last_name,tsc_number,role,department').order('first_name'),
    ]);
    setLeaves(lR.data || []); setStaff(sR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.staff_id || !form.start_date || !form.end_date) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    const days = getDays(form.start_date, form.end_date);
    const payload = { ...form, staff_id: Number(form.staff_id), days_taken: days };
    const { error } = editId
      ? await supabase.from('school_staff_leave').update(payload).eq('id', editId)
      : await supabase.from('school_staff_leave').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Leave updated' : '✅ Leave application saved');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('school_staff_leave').update({ status }).eq('id', id);
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    toast.success(`Leave ${status}`);
  };

  const del = async (id: number) => {
    if (!confirm('Delete this leave record?')) return;
    await supabase.from('school_staff_leave').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Staff', 'TSC', 'Type', 'Start', 'End', 'Days', 'Status', 'Reason']];
    filtered.forEach(l => rows.push([`${l.school_teachers?.first_name} ${l.school_teachers?.last_name}`, l.school_teachers?.tsc_number || '', l.leave_type, l.start_date, l.end_date, String(l.days_taken || getDays(l.start_date, l.end_date)), l.status, l.reason || '']));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `leave_register_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('Leave register exported!');
  };

  const filtered = leaves.filter(l =>
    (filterStatus === 'All' || l.status === filterStatus) &&
    (filterType === 'All' || l.leave_type === filterType) &&
    (search === '' || `${l.school_teachers?.first_name} ${l.school_teachers?.last_name} ${l.school_teachers?.tsc_number || ''}`.toLowerCase().includes(search.toLowerCase()))
  );

  const today = new Date().toISOString().split('T')[0];
  const onLeaveNow = leaves.filter(l => l.status === 'Approved' && l.start_date <= today && l.end_date >= today);
  const pending = leaves.filter(l => l.status === 'Pending');
  const thisMonth = leaves.filter(l => l.start_date?.startsWith(new Date().toISOString().slice(0, 7)));
  const totalDays = leaves.filter(l => l.status === 'Approved').reduce((s, l) => s + (l.days_taken || 0), 0);

  // Leave balance per staff
  const balances = staff.map(s => {
    const taken = leaves.filter(l => l.staff_id === s.id && l.status === 'Approved' && l.leave_type === 'Annual Leave').reduce((sum, l) => sum + (l.days_taken || 0), 0);
    return { ...s, entitlement: DAYS_PER_TYPE['Annual Leave'], taken, balance: DAYS_PER_TYPE['Annual Leave'] - taken };
  });

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />
      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46,#059669)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🏖️</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Staff Leave Management</h1>
              <p className="text-emerald-200 text-sm">{staff.length} staff · {onLeaveNow.length} currently on leave · {pending.length} pending approval</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition"><FiDownload size={14} /> Export</button>
            <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-black text-sm hover:bg-emerald-50 transition shadow"><FiPlus size={14} /> Apply Leave</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-6">
          {[
            { icon: '🏖️', label: 'Currently On Leave', val: onLeaveNow.length, sub: 'As of today' },
            { icon: '⏳', label: 'Pending Approval', val: pending.length, sub: 'Awaiting action' },
            { icon: '📅', label: 'This Month', val: thisMonth.length, sub: 'Applications' },
            { icon: '📊', label: 'Total Days Approved', val: totalDays, sub: 'This year' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-[9px] text-emerald-200 font-bold uppercase">{s.label}</div>
              <div className="text-[8px] text-emerald-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm w-fit">
        {([['applications','📋 Applications'],['balance','💰 Leave Balance'],['calendar','📅 Calendar'],['summary','📊 Summary']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} className={`px-5 py-2.5 text-sm font-bold transition ${activeTab===v?'bg-emerald-700 text-white':'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {/* FILTERS */}
      {activeTab === 'applications' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FiSearch className="text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff name or TSC number…" className="flex-1 text-sm outline-none bg-transparent" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none shadow-sm bg-white">
            <option value="All">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {['All', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2.5 text-xs font-bold transition ${filterStatus === s ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
      ) : activeTab === 'applications' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">Leave Applications</h3><p className="text-xs text-gray-500">{filtered.length} records</p></div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">🏖️</div>
              <p className="font-black text-gray-600 mb-2">No leave applications found</p>
              <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)' }}>Apply for Leave</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  {['Staff Member', 'Leave Type', 'Period', 'Days', 'Status', 'Reason', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(l => {
                    const st = l.school_teachers;
                    const days = l.days_taken || getDays(l.start_date, l.end_date);
                    const cfg = STATUS_CFG[l.status] || STATUS_CFG.Pending;
                    const isOnLeave = l.status === 'Approved' && l.start_date <= today && l.end_date >= today;
                    return (
                      <tr key={l.id} className={`hover:bg-emerald-50/30 transition group ${isOnLeave ? 'bg-blue-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700 flex-shrink-0">{st?.first_name?.[0]}{st?.last_name?.[0]}</div>
                            <div>
                              <p className="font-black text-gray-800 text-xs">{st?.first_name} {st?.last_name}</p>
                              <p className="text-[9px] text-gray-400">{st?.tsc_number || st?.role || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{l.leave_type}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(l.start_date)} → {fmtDate(l.end_date)}</td>
                        <td className="px-4 py-3 text-center"><span className="font-black text-gray-800 text-sm">{days}</span><span className="text-xs text-gray-400 ml-1">days</span></td>
                        <td className="px-4 py-3">
                          <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                            className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none font-bold"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate">{l.reason || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            {l.status === 'Pending' && (
                              <>
                                <button onClick={() => updateStatus(l.id, 'Approved')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Approve"><FiCheck size={12} /></button>
                                <button onClick={() => updateStatus(l.id, 'Rejected')} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100" title="Reject"><FiX size={12} /></button>
                              </>
                            )}
                            <button onClick={() => { setForm({ staff_id: String(l.staff_id), leave_type: l.leave_type, start_date: l.start_date, end_date: l.end_date, reason: l.reason || '', status: l.status, approved_by: l.approved_by || '', notes: l.notes || '', substitute_teacher: l.substitute_teacher || '' }); setEditId(l.id); setShowModal(true); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"><FiEdit2 size={12} /></button>
                            <button onClick={() => del(l.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><FiTrash2 size={12} /></button>
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
      ) : activeTab === 'balance' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">📊 Annual Leave Balance — All Staff</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                {['Staff', 'TSC No', 'Entitlement', 'Days Taken', 'Balance', 'Utilization'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {balances.map(b => {
                  const pct = Math.round(b.taken / b.entitlement * 100);
                  const color = pct > 80 ? '#dc2626' : pct > 50 ? '#d97706' : '#16a34a';
                  return (
                    <tr key={b.id} className="hover:bg-emerald-50/20 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700">{b.first_name?.[0]}{b.last_name?.[0]}</div>
                          <p className="font-black text-gray-800 text-xs">{b.first_name} {b.last_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{b.tsc_number || '—'}</td>
                      <td className="px-4 py-3 text-center font-black text-gray-700">{b.entitlement} days</td>
                      <td className="px-4 py-3 text-center font-black text-gray-700">{b.taken} days</td>
                      <td className="px-4 py-3 text-center font-black" style={{ color }}>{b.balance} days</td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-800 mb-4">📅 Currently On Leave</h3>
          {onLeaveNow.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No staff currently on leave</p>
          : (
            <div className="space-y-3">
              {onLeaveNow.map(l => (
                <div key={l.id} className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-black text-blue-800 flex-shrink-0">{l.school_teachers?.first_name?.[0]}{l.school_teachers?.last_name?.[0]}</div>
                  <div className="flex-1">
                    <p className="font-black text-gray-800">{l.school_teachers?.first_name} {l.school_teachers?.last_name}</p>
                    <p className="text-xs text-blue-600">{l.leave_type} · Returns: {fmtDate(l.end_date)}</p>
                  </div>
                  <span className="text-xs font-black bg-blue-600 text-white px-2 py-1 rounded-full">{getDays(today, l.end_date)} days left</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 pt-5 border-t">
            <h4 className="font-black text-gray-800 mb-3">⏳ Pending Approval ({pending.length})</h4>
            <div className="space-y-2">
              {pending.map(l => (
                <div key={l.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-lg">⏳</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-800">{l.school_teachers?.first_name} {l.school_teachers?.last_name}</p>
                    <p className="text-xs text-amber-700">{l.leave_type} · {fmtDate(l.start_date)} → {fmtDate(l.end_date)} ({getDays(l.start_date, l.end_date)} days)</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(l.id, 'Approved')} className="px-3 py-1.5 text-xs font-black rounded-lg bg-green-600 text-white hover:bg-green-500">✓ Approve</button>
                    <button onClick={() => updateStatus(l.id, 'Rejected')} className="px-3 py-1.5 text-xs font-black rounded-lg bg-red-100 text-red-700 hover:bg-red-200">✗ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Leave by Type</h3>
            <div className="space-y-3">
              {LEAVE_TYPES.map(t => {
                const count = leaves.filter(l => l.leave_type === t && l.status === 'Approved').length;
                const days = leaves.filter(l => l.leave_type === t && l.status === 'Approved').reduce((s, l) => s + (l.days_taken || 0), 0);
                if (count === 0) return null;
                return (
                  <div key={t}>
                    <div className="flex justify-between mb-1"><span className="text-xs font-bold text-gray-700">{t}</span><span className="text-xs font-black text-emerald-700">{count} staff · {days} days</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${Math.round(count / Math.max(staff.length, 1) * 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📈 Leave Statistics</h3>
            <div className="space-y-3">
              {[
                { l: 'Total Applications', v: leaves.length, c: '#6366f1' },
                { l: 'Approved', v: leaves.filter(l => l.status === 'Approved').length, c: '#16a34a' },
                { l: 'Pending', v: pending.length, c: '#d97706' },
                { l: 'Rejected', v: leaves.filter(l => l.status === 'Rejected').length, c: '#dc2626' },
                { l: 'Total Days Approved', v: totalDays, c: '#0891b2' },
                { l: 'Staff Currently Away', v: onLeaveNow.length, c: '#7c3aed' },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">{s.l}</span>
                  <span className="font-black text-base" style={{ color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SQL SETUP */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_staff_leave (
  id                  serial PRIMARY KEY,
  staff_id            int REFERENCES school_teachers(id) ON DELETE CASCADE,
  leave_type          text NOT NULL,
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  days_taken          int DEFAULT 0,
  reason              text,
  status              text DEFAULT 'Pending',
  approved_by         text,
  substitute_teacher  text,
  notes               text,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE school_staff_leave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_staff_leave" ON school_staff_leave FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
              <h2 className="font-black text-gray-800">🏖️ {editId ? 'Edit' : 'Apply for'} Leave</h2>
              <button onClick={() => setShowModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Staff Member *</label>
                <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                  <option value="">Select staff…</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.tsc_number ? `(${s.tsc_number})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Leave Type *</label>
                <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Entitlement: {DAYS_PER_TYPE[form.leave_type]} days/year</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>
              {form.start_date && form.end_date && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-center">
                  <span className="font-black text-emerald-800 text-lg">{getDays(form.start_date, form.end_date)}</span>
                  <span className="text-emerald-600 text-sm ml-2">calendar days</span>
                </div>
              )}
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Substitute Teacher</label>
                <input value={form.substitute_teacher} onChange={e => setForm(f => ({ ...f, substitute_teacher: e.target.value }))} placeholder="Who covers during absence?" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
              </div>
              {editId && (
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#064e3b,#059669)' }}>
                {saving ? '…' : editId ? '✅ Update Leave' : '🏖️ Submit Application'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

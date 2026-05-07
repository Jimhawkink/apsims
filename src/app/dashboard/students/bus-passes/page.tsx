'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiAlertTriangle, FiSearch } from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BusPass {
  id: number;
  student_id: number;
  route_name: string;
  driver_name?: string;
  pickup_point?: string;
  issue_date: string;
  expiry_date: string;
  status: 'Active' | 'Inactive';
  deactivation_date?: string;
  deactivation_reason?: string;
  school_students?: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number?: string;
    admission_no?: string;
    form_id?: number;
  };
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number?: string;
  admission_no?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdmNo(s: any) {
  return s?.admission_number || s?.admission_no || '-';
}

function daysUntilExpiry(expiryDate: string) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Student Picker ───────────────────────────────────────────────────────────

function StudentPicker({ students, value, onChange }: { students: Student[]; value: number; onChange: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);
  const filtered = q.trim()
    ? students.filter((s) => `${s.first_name} ${s.last_name} ${getAdmNo(s)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50)
    : [];

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm cursor-pointer flex items-center justify-between hover:border-blue-400 transition-all"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
          {selected ? `${selected.first_name} ${selected.last_name} (${getAdmNo(selected)})` : '🔍 Search student…'}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type name or admission number…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {q.trim().length === 0 && <div className="px-4 py-3 text-xs text-gray-400 text-center">Start typing to search</div>}
            {q.trim().length > 0 && filtered.length === 0 && <div className="px-4 py-3 text-xs text-gray-400 text-center">No students found</div>}
            {filtered.map((s) => (
              <div key={s.id} className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm transition-colors ${value === s.id ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                onClick={() => { onChange(s.id); setOpen(false); setQ(''); }}>
                <span className="font-semibold">{s.first_name} {s.last_name}</span>
                <span className="text-gray-400 ml-2 text-xs">({getAdmNo(s)})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Issue Bus Pass Modal ─────────────────────────────────────────────────────

function IssueBusPassModal({ students, onClose, onSaved }: { students: Student[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ student_id: 0, route_name: '', driver_name: '', pickup_point: '', issue_date: new Date().toISOString().split('T')[0], expiry_date: '' });
  const [saving, setSaving] = useState(false);
  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Please select a student');
    if (!form.route_name.trim()) return toast.error('Route name is required');
    if (!form.expiry_date) return toast.error('Expiry date is required');
    setSaving(true);
    try {
      const res = await fetch('/api/bus-passes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (res.status === 409) throw new Error(result.error);
      if (!res.ok) throw new Error(result.error || 'Failed to issue pass');
      toast.success('Bus pass issued ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🚌</div>
            <div><h2 className="text-lg font-bold text-white">Issue Bus Pass</h2><p className="text-xs text-white/70">Assign a new bus pass to a student</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Student *</label><StudentPicker students={students} value={form.student_id} onChange={(id) => setForm({ ...form, student_id: id })} /></div>
          <div><label className={lbl}>Route Name *</label><input type="text" value={form.route_name} onChange={(e) => setForm({ ...form, route_name: e.target.value })} placeholder="e.g. Nairobi - Thika Road" className={inp} /></div>
          <div><label className={lbl}>Driver Name</label><input type="text" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} placeholder="e.g. Mr. Kamau" className={inp} /></div>
          <div><label className={lbl}>Pickup Point</label><input type="text" value={form.pickup_point} onChange={(e) => setForm({ ...form, pickup_point: e.target.value })} placeholder="e.g. Roysambu Stage" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Issue Date</label><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inp} /></div>
            <div><label className={lbl}>Expiry Date *</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inp} /></div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />} Issue Pass
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deactivate Modal ─────────────────────────────────────────────────────────

function DeactivatePassModal({ pass, onClose, onSaved }: { pass: BusPass; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const studentName = pass.school_students ? `${pass.school_students.first_name} ${pass.school_students.last_name}` : 'this student';

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bus-passes/${pass.id}/deactivate`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to deactivate');
      toast.success('Bus pass deactivated ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
          <h2 className="text-lg font-bold text-white">Deactivate Bus Pass</h2>
          <p className="text-xs text-white/70 mt-1">Deactivate pass for {studentName}</p>
        </div>
        <div className="p-6">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reason for Deactivation</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Student transferred, pass expired early…"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 transition-all" />
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2 disabled:opacity-50 transition">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null} Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BusPassesPage() {
  const [passes, setPasses] = useState<BusPass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoute, setFilterRoute] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [deactivatePass, setDeactivatePass] = useState<BusPass | null>(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((j) => { if (j.user) setUserRole(j.user.role || ''); }).catch(() => {});
    supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no').eq('status', 'Active').order('first_name')
      .then(({ data }) => setStudents(data || []));
  }, []);

  const fetchPasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRoute) params.set('route', filterRoute);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/bus-passes?${params}`);
      const result = await res.json();
      setPasses(result.data || []);
    } catch { toast.error('Failed to load bus passes'); } finally { setLoading(false); }
  }, [filterRoute, filterStatus]);

  useEffect(() => { fetchPasses(); }, [fetchPasses]);

  const canWrite = ['admin', 'bursar'].includes(userRole?.toLowerCase());
  const routes = [...new Set(passes.map((p) => p.route_name).filter(Boolean))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🚌</div>
            <div><h1 className="text-xl font-extrabold">Bus Pass Cards</h1><p className="text-sm text-white/70 mt-0.5">Manage student transport passes</p></div>
          </div>
          {canWrite && (
            <button onClick={() => setShowIssueModal(true)} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiPlus size={16} /> Issue Pass
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Passes', value: passes.length, color: 'border-l-blue-500', bg: 'bg-blue-50', icon: '🚌' },
          { label: 'Active', value: passes.filter((p) => p.status === 'Active').length, color: 'border-l-green-500', bg: 'bg-green-50', icon: '✅' },
          { label: 'Expiring Soon', value: passes.filter((p) => { const d = daysUntilExpiry(p.expiry_date); return d <= 7 && d >= 0 && p.status === 'Active'; }).length, color: 'border-l-yellow-500', bg: 'bg-yellow-50', icon: '⚠️' },
        ].map((c, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 ${c.color} flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-xl flex-shrink-0`}>{c.icon}</div>
            <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p><p className="text-2xl font-extrabold text-gray-800">{c.value}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Expired">Expired</option>
        </select>
        <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none min-w-[180px]">
          <option value="">All Routes</option>
          {routes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{passes.length} pass{passes.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Bus Pass Records</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : passes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400"><span className="text-5xl mb-3">🚌</span><p className="text-sm font-semibold">No bus passes found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {['Student', 'Adm No', 'Route', 'Driver', 'Pickup Point', 'Issue Date', 'Expiry Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {passes.map((pass) => {
                  const days = daysUntilExpiry(pass.expiry_date);
                  const showWarning = days <= 7 && days >= 0 && pass.status === 'Active';
                  const s = pass.school_students;
                  return (
                    <tr key={pass.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{s ? `${s.first_name} ${s.last_name}` : '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s ? getAdmNo(s) : '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{pass.route_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{pass.driver_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{pass.pickup_point || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{pass.issue_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">{pass.expiry_date}</span>
                          {showWarning && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">
                              <FiAlertTriangle size={9} /> {days}d
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${pass.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {pass.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && pass.status === 'Active' && (
                          <button onClick={() => setDeactivatePass(pass)} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition whitespace-nowrap">
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showIssueModal && <IssueBusPassModal students={students} onClose={() => setShowIssueModal(false)} onSaved={fetchPasses} />}
      {deactivatePass && <DeactivatePassModal pass={deactivatePass} onClose={() => setDeactivatePass(null)} onSaved={fetchPasses} />}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiCalendar, FiClock, FiCheck, FiX, FiPlus, FiSearch,
  FiRefreshCw, FiDownload, FiFileText, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiEdit2, FiTrash2,
  FiUsers, FiActivity,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
type LeaveType = 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Compassionate' | 'Study' | 'Emergency' | 'Unpaid';

interface LeaveApplication {
  id?: number;
  teacher_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: LeaveStatus;
  rejection_reason?: string | null;
  substitute_teacher_id?: number | null;
  created_at?: string;
}

const LEAVE_CONFIG: Record<LeaveType, { color: string; bg: string; border: string; days: number }> = {
  Annual:        { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', days: 30  },
  Sick:          { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', days: 14  },
  Maternity:     { color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', days: 90  },
  Paternity:     { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', days: 14  },
  Compassionate: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', days: 5   },
  Study:         { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', days: 21  },
  Emergency:     { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', days: 7   },
  Unpaid:        { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', days: 999 },
};

const STATUS_CONFIG: Record<LeaveStatus, { color: string; bg: string; border: string; icon: any }> = {
  Pending:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: FiClock       },
  Approved:  { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', icon: FiCheckCircle },
  Rejected:  { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: FiXCircle     },
  Cancelled: { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', icon: FiX           },
};

const LEAVE_TYPES = Object.keys(LEAVE_CONFIG) as LeaveType[];

function calcDays(s: string, e: string) {
  if (!s || !e) return 0;
  return Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ value, label, sub, icon: Icon, gradient }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -left-2 w-28 h-28 rounded-full opacity-5 bg-white" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      <Icon size={10} /> {status}
    </span>
  );
}

function TypeBadge({ type }: { type: LeaveType }) {
  const cfg = LEAVE_CONFIG[type];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {type}
    </span>
  );
}

// ─── Application Modal ────────────────────────────────────────────────────────
function AppModal({ teachers, onClose, onSave, edit }: { teachers: any[]; onClose: () => void; onSave: (d: Partial<LeaveApplication>) => void; edit?: Partial<LeaveApplication> }) {
  const [f, setF] = useState<Partial<LeaveApplication>>({ leave_type: 'Annual', start_date: '', end_date: '', reason: '', status: 'Pending', teacher_id: 0, substitute_teacher_id: null, ...edit });
  const days = calcDays(f.start_date || '', f.end_date || '');
  const set = (patch: Partial<LeaveApplication>) => setF(prev => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <FiCalendar size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{edit?.id ? 'Edit Leave Application' : 'New Leave Application'}</h3>
              <p className="text-xs text-gray-400">TSC/MoE Leave Management</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Teacher */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Teacher *</label>
            <select value={f.teacher_id || ''} onChange={e => set({ teacher_id: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50">
              <option value="">Select teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} — {t.tsc_number || t.email}</option>)}
            </select>
          </div>
          {/* Leave Type */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Leave Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {LEAVE_TYPES.map(lt => (
                <button key={lt} onClick={() => set({ leave_type: lt })}
                  className={`py-2 text-[10px] font-bold rounded-xl border-2 transition-all ${f.leave_type === lt ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  style={f.leave_type === lt ? { background: LEAVE_CONFIG[lt].color, borderColor: LEAVE_CONFIG[lt].color } : {}}>
                  {lt}
                </button>
              ))}
            </div>
            {f.leave_type && <p className="text-[11px] text-gray-400 mt-1.5">Entitlement: <span className="font-bold text-gray-600">{LEAVE_CONFIG[f.leave_type].days === 999 ? 'As negotiated' : `${LEAVE_CONFIG[f.leave_type].days} days/year`}</span></p>}
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Start Date *</label>
              <input type="date" value={f.start_date || ''} onChange={e => set({ start_date: e.target.value, days_requested: calcDays(e.target.value, f.end_date || '') })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">End Date *</label>
              <input type="date" value={f.end_date || ''} onChange={e => set({ end_date: e.target.value, days_requested: calcDays(f.start_date || '', e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50" />
            </div>
          </div>
          {days > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <FiClock size={14} className="text-white" />
              <p className="text-sm font-bold text-white">{days} day{days !== 1 ? 's' : ''} requested</p>
            </div>
          )}
          {/* Substitute */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Substitute Teacher (optional)</label>
            <select value={f.substitute_teacher_id || ''} onChange={e => set({ substitute_teacher_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50">
              <option value="">No substitute assigned</option>
              {teachers.filter(t => t.id !== f.teacher_id).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Reason / Supporting Notes *</label>
            <textarea value={f.reason || ''} onChange={e => set({ reason: e.target.value })} rows={3}
              placeholder="Briefly describe reason for leave application…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={() => {
            if (!f.teacher_id || !f.start_date || !f.end_date || !f.reason?.trim()) { toast.error('Fill all required fields'); return; }
            onSave({ ...f, days_requested: days });
          }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            {edit?.id ? 'Save Changes' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ app, teachers, onClose, onAction }: { app: LeaveApplication; teachers: any[]; onClose: () => void; onAction: (id: number, status: 'Approved' | 'Rejected', reason?: string) => void }) {
  const [action, setAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [reason, setReason] = useState('');
  const teacher = teachers.find(t => t.id === app.teacher_id);
  const sub = teachers.find(t => t.id === app.substitute_teacher_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Review Leave Application</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {teacher?.first_name?.[0]}{teacher?.last_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{teacher?.first_name} {teacher?.last_name}</p>
                <p className="text-[10px] text-gray-400">{teacher?.tsc_number || teacher?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-center">
              <div><p className="text-[10px] text-gray-400 uppercase">Type</p><p className="text-xs font-bold text-gray-700 mt-0.5">{app.leave_type}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Days</p><p className="text-xs font-bold text-gray-700 mt-0.5">{app.days_requested}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Period</p><p className="text-[10px] font-bold text-gray-700 mt-0.5">{fmtDate(app.start_date)} – {fmtDate(app.end_date)}</p></div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase mb-0.5">Reason</p>
              <p className="text-xs text-gray-700">{app.reason}</p>
            </div>
            {sub && <div className="pt-2 border-t border-gray-200"><p className="text-[10px] text-gray-400 uppercase mb-0.5">Substitute</p><p className="text-xs font-bold text-gray-700">{sub.first_name} {sub.last_name}</p></div>}
          </div>
          <div className="flex gap-2">
            {(['Approved', 'Rejected'] as const).map(a => (
              <button key={a} onClick={() => setAction(a)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${action === a ? (a === 'Approved' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                {a === 'Approved' ? <FiCheck size={15} /> : <FiX size={15} />} {a}
              </button>
            ))}
          </div>
          {action === 'Rejected' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Rejection Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Provide reason for rejection…"
                className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-red-50/50 resize-none" />
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={() => {
            if (action === 'Rejected' && !reason.trim()) { toast.error('Provide rejection reason'); return; }
            onAction(app.id!, action, reason);
          }} className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherLeavePage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [apps, setApps] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState<Partial<LeaveApplication> | undefined>();
  const [reviewApp, setReviewApp] = useState<LeaveApplication | null>(null);
  const [tab, setTab] = useState<'applications' | 'balance' | 'calendar'>('applications');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, aRes] = await Promise.all([
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('teacher_leaves').select('*').order('created_at', { ascending: false }),
    ]);
    setTeachers(tRes.data || []);
    if (!aRes.error) setApps(aRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '—'; };

  const pending = apps.filter(a => a.status === 'Pending').length;
  const approved = apps.filter(a => a.status === 'Approved').length;
  const now = new Date();
  const onLeave = apps.filter(a => a.status === 'Approved' && now >= new Date(a.start_date) && now <= new Date(a.end_date)).length;
  const totalDays = apps.filter(a => a.status === 'Approved').reduce((s, a) => s + (a.days_requested || 0), 0);

  const filtered = useMemo(() => apps.filter(a => {
    const q = searchQ.toLowerCase();
    if (q && !getName(a.teacher_id).toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all' && a.leave_type !== filterType) return false;
    if (filterTeacher && String(a.teacher_id) !== filterTeacher) return false;
    return true;
  }), [apps, searchQ, filterStatus, filterType, filterTeacher, teachers]);

  const handleSave = async (data: Partial<LeaveApplication>) => {
    const tid = toast.loading(data.id ? 'Updating…' : 'Submitting…');
    try {
      if (data.id) {
        const { error } = await supabase.from('teacher_leaves').update(data).eq('id', data.id);
        if (error) throw error;
        toast.success('Updated!', { id: tid });
      } else {
        const { error } = await supabase.from('teacher_leaves').insert({ ...data, created_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('Application submitted!', { id: tid });
      }
      setShowModal(false); setEditApp(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleAction = async (id: number, status: 'Approved' | 'Rejected', rejection_reason?: string) => {
    const tid = toast.loading('Processing…');
    try {
      const { error } = await supabase.from('teacher_leaves').update({ status, rejection_reason: rejection_reason || null, approved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success(`${status}!`, { id: tid });
      setReviewApp(null); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this application?')) return;
    const { error } = await supabase.from('teacher_leaves').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Teacher', 'Type', 'Start', 'End', 'Days', 'Status', 'Substitute', 'Reason'],
      ...apps.map(a => [getName(a.teacher_id), a.leave_type, fmtDate(a.start_date), fmtDate(a.end_date), a.days_requested, a.status, a.substitute_teacher_id ? getName(a.substitute_teacher_id) : '—', a.reason])];
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `teacher-leave-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          <FiCalendar size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Loading teacher leave management…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <AppModal teachers={teachers} onClose={() => { setShowModal(false); setEditApp(undefined); }} onSave={handleSave} edit={editApp} />}
      {reviewApp && <ReviewModal app={reviewApp} teachers={teachers} onClose={() => setReviewApp(null)} onAction={handleAction} />}

      <div className="space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <FiCalendar size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Teacher Leave Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">TSC/MoE-Compliant · Apply · Approve · Monitor · Substitute Assignment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FiDownload size={14} /> Export</button>
            <button onClick={() => { setEditApp(undefined); setShowModal(true); }} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <FiPlus size={14} /> New Application
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard value={apps.length} label="Total Applications" sub="All time records"          icon={FiFileText}     gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
          <KPICard value={pending}     label="Awaiting Approval"  sub="Requires action"            icon={FiClock}        gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
          <KPICard value={onLeave}     label="Currently on Leave" sub="Absent today"               icon={FiUsers}        gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
          <KPICard value={totalDays}   label="Total Days Approved" sub={`${approved} applications`} icon={FiCheckCircle}  gradient="linear-gradient(135deg,#10b981,#059669)" />
        </div>

        {/* PENDING ALERT */}
        {pending > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
              <FiAlertCircle size={18} style={{ color: '#D97706' }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">{pending} application{pending > 1 ? 's' : ''} awaiting approval</p>
              <p className="text-xs text-amber-700 mt-0.5">Review promptly to ensure proper class coverage and substitution planning.</p>
            </div>
            <button onClick={() => setFilterStatus('Pending')} className="px-3 py-1.5 text-xs font-bold rounded-lg flex-shrink-0" style={{ background: '#FEF3C7', color: '#92400E' }}>Review Now</button>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          {([['applications', 'Applications', FiFileText], ['balance', 'Leave Balance', FiActivity], ['calendar', 'Calendar', FiCalendar]] as const).map(([t, l, Icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>

        {/* APPLICATIONS TAB */}
        {tab === 'applications' && <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
                <div className="relative">
                  <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Teacher name…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50" />
                </div>
              </div>
              {[['Status', filterStatus, setFilterStatus, ['all', 'Pending', 'Approved', 'Rejected', 'Cancelled']],
                ['Type', filterType, setFilterType, ['all', ...LEAVE_TYPES]]].map(([label, val, setter, opts]: any) => (
                <div key={label} className="min-w-[150px]">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                  <select value={val} onChange={e => setter(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
                    {opts.map((o: string) => <option key={o} value={o}>{o === 'all' ? `All ${label}s` : o}</option>)}
                  </select>
                </div>
              ))}
              <div className="min-w-[160px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teacher</label>
                <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
                  <option value="">All Teachers</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{apps.length}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['#', 'Teacher', 'Type', 'Duration', 'Days', 'Status', 'Substitute', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-16 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center"><FiCalendar size={24} className="text-gray-300" /></div>
                      <p className="text-gray-400 font-semibold text-sm">No leave applications found</p>
                      <p className="text-xs text-gray-300 mt-1">Click "New Application" to submit a leave request</p>
                    </td></tr>
                  ) : filtered.map((app, idx) => {
                    const t = teachers.find(t => t.id === app.teacher_id);
                    const s = teachers.find(t => t.id === app.substitute_teacher_id);
                    return (
                      <tr key={app.id} className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                        <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                              {t?.first_name?.[0]}{t?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{t?.first_name} {t?.last_name}</p>
                              <p className="text-[10px] text-gray-400">{t?.tsc_number || t?.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={app.leave_type} /></td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700">{fmtDate(app.start_date)}</p>
                          <p className="text-[10px] text-gray-400">to {fmtDate(app.end_date)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{app.days_requested}</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3">
                          {s ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-black text-green-700">{s.first_name?.[0]}{s.last_name?.[0]}</div><span className="text-xs text-gray-600">{s.first_name} {s.last_name}</span></div>
                            : <span className="text-xs text-gray-300 italic">None</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {app.status === 'Pending' && (
                              <button onClick={() => setReviewApp(app)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Review</button>
                            )}
                            <button onClick={() => { setEditApp(app); setShowModal(true); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"><FiEdit2 size={12} /></button>
                            <button onClick={() => app.id && handleDelete(app.id)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"><FiTrash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500"><span className="font-bold text-amber-600">{pending} pending</span> · <span className="font-bold text-green-600">{approved} approved</span> · <span className="font-bold text-gray-600">{apps.length} total</span></p>
              <p className="text-xs text-gray-400">Teacher Leave · TSC Compliant</p>
            </div>
          </div>
        </>}

        {/* LEAVE BALANCE TAB */}
        {tab === 'balance' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiActivity size={15} className="text-indigo-500" /> Leave Balance Per Teacher (Approved Days Used)</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teacher</th>
                    {LEAVE_TYPES.map(lt => <th key={lt} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: LEAVE_CONFIG[lt].color }}>{lt}</th>)}
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, idx) => {
                    const tApps = apps.filter(a => a.teacher_id === teacher.id && a.status === 'Approved');
                    const used: Record<string, number> = {};
                    LEAVE_TYPES.forEach(lt => { used[lt] = tApps.filter(a => a.leave_type === lt).reduce((s, a) => s + (a.days_requested || 0), 0); });
                    const total = Object.values(used).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={teacher.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{teacher.first_name?.[0]}{teacher.last_name?.[0]}</div>
                            <div><p className="text-xs font-semibold text-gray-800">{teacher.first_name} {teacher.last_name}</p><p className="text-[10px] text-gray-400">{teacher.tsc_number || '—'}</p></div>
                          </div>
                        </td>
                        {LEAVE_TYPES.map(lt => (
                          <td key={lt} className="px-3 py-3 text-center">
                            {used[lt] > 0 ? (
                              <div>
                                <span className="text-xs font-bold" style={{ color: LEAVE_CONFIG[lt].color }}>{used[lt]}d</span>
                                <div className="w-full h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min((used[lt] / Math.min(LEAVE_CONFIG[lt].days, 30)) * 100, 100)}%`, background: LEAVE_CONFIG[lt].color }} />
                                </div>
                              </div>
                            ) : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black" style={{ background: total > 0 ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f3f4f6', color: total > 0 ? 'white' : '#9ca3af' }}>{total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {tab === 'calendar' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><FiCalendar size={15} className="text-indigo-500" /> Approved Leave Timeline</h2>
            <div className="space-y-3">
              {apps.filter(a => a.status === 'Approved').sort((a, b) => a.start_date.localeCompare(b.start_date)).map(app => {
                const t = teachers.find(t => t.id === app.teacher_id);
                const cfg = LEAVE_CONFIG[app.leave_type];
                const isActive = now >= new Date(app.start_date) && now <= new Date(app.end_date);
                const isPast = now > new Date(app.end_date);
                return (
                  <div key={app.id} className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm" style={{ borderColor: isActive ? cfg.color : '#e5e7eb', background: isActive ? cfg.bg : 'white' }}>
                    <div className="w-2 self-stretch rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{t?.first_name?.[0]}{t?.last_name?.[0]}</div>
                      <div><p className="text-sm font-bold text-gray-800">{t?.first_name} {t?.last_name}</p><TypeBadge type={app.leave_type} /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-600">{fmtDate(app.start_date)} — {fmtDate(app.end_date)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{app.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: cfg.color + '20', color: cfg.color }}>{app.days_requested}d</span>
                      {isActive && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-100 text-green-700 animate-pulse">ACTIVE</span>}
                      {isPast && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400">PAST</span>}
                    </div>
                  </div>
                );
              })}
              {apps.filter(a => a.status === 'Approved').length === 0 && (
                <div className="text-center py-12"><div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center"><FiCalendar size={24} className="text-gray-300" /></div><p className="text-gray-400 font-semibold text-sm">No approved leave yet</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiCalendar, FiClock, FiCheck, FiX, FiPlus, FiSearch,
  FiRefreshCw, FiDownload, FiFileText, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiEdit2, FiTrash2,
  FiUsers, FiActivity, FiPrinter, FiBarChart2, FiArrowRight,
  FiAlertTriangle, FiTrendingUp, FiShield,
} from 'react-icons/fi';

// ─── Types ─────────────────────────────────────────────────────────────────────
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Returned';
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
  return_date?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
}

const LEAVE_CONFIG: Record<LeaveType, { color: string; bg: string; border: string; days: number; icon: string }> = {
  Annual:        { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', days: 30,  icon: '🌴' },
  Sick:          { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', days: 14,  icon: '🏥' },
  Maternity:     { color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', days: 90,  icon: '👶' },
  Paternity:     { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', days: 14,  icon: '👨‍👧' },
  Compassionate: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', days: 5,   icon: '🕊️' },
  Study:         { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', days: 21,  icon: '📚' },
  Emergency:     { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', days: 7,   icon: '🚨' },
  Unpaid:        { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', days: 999, icon: '📋' },
};

const STATUS_CFG: Record<LeaveStatus, { color: string; bg: string; border: string; icon: any }> = {
  Pending:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: FiClock       },
  Approved:  { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', icon: FiCheckCircle },
  Rejected:  { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: FiXCircle     },
  Cancelled: { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', icon: FiX           },
  Returned:  { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', icon: FiArrowRight  },
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
function fmtLong(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeaveStatus }) {
  const c = STATUS_CFG[status] || STATUS_CFG.Cancelled;
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      <Icon size={10} /> {status}
    </span>
  );
}

function TypeBadge({ type }: { type: LeaveType }) {
  const c = LEAVE_CONFIG[type];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      {c.icon} {type}
    </span>
  );
}

// ─── Application Modal ─────────────────────────────────────────────────────────
function AppModal({ teachers, apps, onClose, onSave, edit }: {
  teachers: any[]; apps: LeaveApplication[]; onClose: () => void;
  onSave: (d: Partial<LeaveApplication>) => void; edit?: Partial<LeaveApplication>;
}) {
  const [f, setF] = useState<Partial<LeaveApplication>>({
    leave_type: 'Annual', start_date: '', end_date: '', reason: '', status: 'Pending',
    teacher_id: 0, substitute_teacher_id: null, ...edit,
  });
  const days = calcDays(f.start_date || '', f.end_date || '');
  const set = (patch: Partial<LeaveApplication>) => setF(prev => ({ ...prev, ...patch }));

  // Conflict detection
  const conflict = useMemo(() => {
    if (!f.teacher_id || !f.start_date || !f.end_date) return null;
    return apps.find(a =>
      a.id !== f.id && a.teacher_id === f.teacher_id &&
      a.status === 'Approved' &&
      new Date(a.start_date) <= new Date(f.end_date!) &&
      new Date(a.end_date) >= new Date(f.start_date!)
    );
  }, [f.teacher_id, f.start_date, f.end_date, apps, f.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: '24px 24px 0 0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20"><FiCalendar size={18} className="text-white" /></div>
            <div>
              <h3 className="font-black text-white text-sm">{edit?.id ? '✏️ Edit Leave Application' : '🏖️ New Leave Application'}</h3>
              <p className="text-indigo-200 text-[11px]">TSC / MoE Compliant Leave System</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all"><FiX size={14} /></button>
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
                  {LEAVE_CONFIG[lt].icon} {lt}
                </button>
              ))}
            </div>
            {f.leave_type && <p className="text-[11px] text-gray-400 mt-1.5">Annual entitlement: <span className="font-bold text-gray-600">{LEAVE_CONFIG[f.leave_type].days === 999 ? 'As negotiated' : `${LEAVE_CONFIG[f.leave_type].days} days/year`}</span></p>}
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
          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
              <FiAlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={15} />
              <div>
                <p className="text-xs font-bold text-red-700">⚠️ Overlap Conflict!</p>
                <p className="text-[11px] text-red-600">This teacher is already on approved leave from <strong>{fmtDate(conflict.start_date)}</strong> to <strong>{fmtDate(conflict.end_date)}</strong>.</p>
              </div>
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
            if (conflict) { toast.error('Resolve overlap conflict first'); return; }
            onSave({ ...f, days_requested: days });
          }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            {edit?.id ? 'Save Changes' : '✅ Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ app, teachers, schoolInfo, onClose, onAction }: {
  app: LeaveApplication; teachers: any[]; schoolInfo: any; onClose: () => void;
  onAction: (id: number, status: 'Approved' | 'Rejected', reason?: string, approvedBy?: string) => void;
}) {
  const [action, setAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [reason, setReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('Principal');
  const teacher = teachers.find(t => t.id === app.teacher_id);
  const sub = teachers.find(t => t.id === app.substitute_teacher_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">📋 Review Leave Application</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"><FiX size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {teacher?.first_name?.[0]}{teacher?.last_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{teacher?.first_name} {teacher?.last_name}</p>
                <p className="text-[10px] text-gray-400">{teacher?.tsc_number || teacher?.email} · {teacher?.department || ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-center">
              <div><p className="text-[10px] text-gray-400 uppercase">Type</p><TypeBadge type={app.leave_type} /></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Days</p><p className="text-lg font-black text-indigo-600 mt-0.5">{app.days_requested}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Period</p><p className="text-[10px] font-bold text-gray-700 mt-0.5">{fmtDate(app.start_date)} – {fmtDate(app.end_date)}</p></div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase mb-0.5">Reason</p>
              <p className="text-xs text-gray-700">{app.reason}</p>
            </div>
            {sub && <div className="pt-2 border-t border-gray-200"><p className="text-[10px] text-gray-400 uppercase mb-0.5">Substitute</p><p className="text-xs font-bold text-gray-700">{sub.first_name} {sub.last_name}</p></div>}
          </div>
          <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Authorized By</label>
            <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50" placeholder="Principal / HOD name…" />
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
            onAction(app.id!, action, reason, approvedBy);
          }} className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherLeavePage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [apps, setApps] = useState<LeaveApplication[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState<Partial<LeaveApplication> | undefined>();
  const [reviewApp, setReviewApp] = useState<LeaveApplication | null>(null);
  const [tab, setTab] = useState<'applications' | 'balance' | 'calendar' | 'reports'>('applications');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, aRes, scRes] = await Promise.all([
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('teacher_leaves').select('*').order('created_at', { ascending: false }),
      supabase.from('school_details').select('*').maybeSingle(),
    ]);
    setTeachers(tRes.data || []);
    if (!aRes.error) setApps(aRes.data || []);
    setSchoolInfo(scRes.data || {});
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '—'; };
  const getTeacher = (id: number) => teachers.find(t => t.id === id);

  const now = new Date();
  const pending   = apps.filter(a => a.status === 'Pending').length;
  const approved  = apps.filter(a => a.status === 'Approved').length;
  const onLeave   = apps.filter(a => a.status === 'Approved' && now >= new Date(a.start_date) && now <= new Date(a.end_date)).length;
  const totalDays = apps.filter(a => a.status === 'Approved').reduce((s, a) => s + (a.days_requested || 0), 0);
  const rejected  = apps.filter(a => a.status === 'Rejected').length;

  const filtered = useMemo(() => apps.filter(a => {
    const q = searchQ.toLowerCase();
    if (q && !getName(a.teacher_id).toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all' && a.leave_type !== filterType) return false;
    if (filterTeacher && String(a.teacher_id) !== filterTeacher) return false;
    if (dateFrom && a.start_date < dateFrom) return false;
    if (dateTo && a.start_date > dateTo) return false;
    return true;
  }), [apps, searchQ, filterStatus, filterType, filterTeacher, dateFrom, dateTo, teachers]);

  /* ── CRUD ──────────────────────────────────────────── */
  const handleSave = async (data: Partial<LeaveApplication>) => {
    const tid = toast.loading(data.id ? 'Updating…' : 'Submitting…');
    try {
      if (data.id) {
        const { error } = await supabase.from('teacher_leaves').update(data).eq('id', data.id);
        if (error) throw error;
        toast.success('Updated ✅', { id: tid });
      } else {
        const { error } = await supabase.from('teacher_leaves').insert({ ...data, created_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('Application submitted ✅', { id: tid });
      }
      setShowModal(false); setEditApp(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleAction = async (id: number, status: 'Approved' | 'Rejected', rejection_reason?: string, approved_by?: string) => {
    const tid = toast.loading('Processing…');
    try {
      const { error } = await supabase.from('teacher_leaves').update({
        status, rejection_reason: rejection_reason || null,
        approved_by: approved_by || null,
        approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success(`${status} ✅`, { id: tid });
      setReviewApp(null); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this application?')) return;
    const { error } = await supabase.from('teacher_leaves').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchAll();
  };

  const markReturned = async (app: LeaveApplication) => {
    const returnDate = prompt('Enter return date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!returnDate) return;
    await supabase.from('teacher_leaves').update({ status: 'Returned', return_date: returnDate }).eq('id', app.id!);
    toast.success('✅ Teacher marked as Returned'); fetchAll();
  };

  /* ── PREMIUM EXCEL EXPORT ──────────────────────────── */
  const exportExcel = () => {
    const headers = ['#', 'Teacher', 'TSC Number', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Substitute', 'Approved By', 'Return Date', 'Reason', 'Rejection Reason'];
    const rows = apps.map((a, i) => [
      i + 1, getName(a.teacher_id), getTeacher(a.teacher_id)?.tsc_number || '',
      a.leave_type, fmtDate(a.start_date), fmtDate(a.end_date), a.days_requested, a.status,
      a.substitute_teacher_id ? getName(a.substitute_teacher_id) : '—',
      a.approved_by || '—', a.return_date ? fmtDate(a.return_date) : '—',
      a.reason, a.rejection_reason || '—',
    ]);
    const summaryRows: any[] = [
      [], ['SUMMARY'], ['Total Applications', apps.length], ['Approved', approved],
      ['Pending', pending], ['Rejected', rejected], ['Total Approved Days', totalDays],
      ['Currently on Leave', onLeave],
    ];
    const csv = '\uFEFF' + [...[headers, ...rows], ...summaryRows]
      .map(r => Array.isArray(r) ? r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',') : `"${r}"`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Teacher_Leave_Register_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('✅ Excel export complete!');
  };

  /* ── PRINT LEAVE FORM (TSC official) ──────────────── */
  const printLeaveForm = (app: LeaveApplication) => {
    const t = getTeacher(app.teacher_id);
    const sub = app.substitute_teacher_id ? getTeacher(app.substitute_teacher_id) : null;
    const w = window.open('', '_blank');
    w?.document.write(`<!DOCTYPE html><html><head><title>Leave Form - ${getName(app.teacher_id)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1e293b;font-size:13px;}
  .header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px double #1e293b;}
  .header h1{font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:2px;}
  .header h2{font-size:14px;font-weight:700;margin-top:4px;}
  .header p{font-size:11px;color:#64748b;margin-top:2px;}
  .section{margin:16px 0;}
  .section h3{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;}
  .field{display:grid;grid-template-columns:160px 1fr;margin:8px 0;align-items:start;}
  .field-label{font-size:11px;font-weight:700;color:#374151;}
  .field-value{font-size:12px;color:#1e293b;border-bottom:1px solid #94a3b8;padding-bottom:2px;min-height:22px;}
  .leave-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0;}
  .lt-box{border:2px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center;font-size:11px;font-weight:700;}
  .lt-selected{background:#1e40af;color:#fff;border-color:#1e40af;}
  .signature-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:32px;}
  .sig-box{text-align:center;}
  .sig-line{border-top:1px solid #334155;margin-top:36px;padding-top:6px;font-size:10px;color:#64748b;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;background:#dbeafe;color:#1e40af;}
  @media print{body{padding:16px 20px;}@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="header">
  <h1>${schoolInfo?.school_name || 'ALPHA SCHOOL'}</h1>
  <h2>${schoolInfo?.address || ''}</h2>
  <p>Tel: ${schoolInfo?.phone || ''} | Email: ${schoolInfo?.email || ''}</p>
  <div style="margin-top:12px;padding:8px 0;border:2px solid #1e293b;border-radius:6px;">
    <span style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:3px">TEACHER LEAVE APPLICATION FORM</span>
    <br><span style="font-size:10px;color:#64748b">TSC/MoE Compliant · ${new Date().getFullYear()}</span>
  </div>
</div>

<div class="section">
  <h3>A. Personal Information</h3>
  <div class="field"><span class="field-label">Full Name:</span><span class="field-value">${t?.first_name || ''} ${t?.last_name || ''}</span></div>
  <div class="field"><span class="field-label">TSC Number:</span><span class="field-value">${t?.tsc_number || '___________________'}</span></div>
  <div class="field"><span class="field-label">Designation:</span><span class="field-value">${t?.designation || t?.role || '___________________'}</span></div>
  <div class="field"><span class="field-label">Department:</span><span class="field-value">${t?.department || '___________________'}</span></div>
  <div class="field"><span class="field-label">Employee No.:</span><span class="field-value">${t?.employee_number || '___________________'}</span></div>
</div>

<div class="section">
  <h3>B. Leave Details</h3>
  <p style="font-size:11px;font-weight:700;color:#374151;margin-bottom:8px">Type of Leave Applied For:</p>
  <div class="leave-type-grid">
    ${LEAVE_TYPES.map(lt => `<div class="lt-box ${app.leave_type === lt ? 'lt-selected' : ''}">${LEAVE_CONFIG[lt].icon} ${lt}</div>`).join('')}
  </div>
  <div style="margin-top:12px">
    <div class="field"><span class="field-label">Start Date:</span><span class="field-value"><strong>${fmtLong(app.start_date)}</strong></span></div>
    <div class="field"><span class="field-label">End Date:</span><span class="field-value"><strong>${fmtLong(app.end_date)}</strong></span></div>
    <div class="field"><span class="field-label">No. of Days:</span><span class="field-value"><strong style="font-size:16px;color:#1e40af">${app.days_requested} day${app.days_requested !== 1 ? 's' : ''}</strong></span></div>
    <div class="field"><span class="field-label">Entitlement/Year:</span><span class="field-value">${LEAVE_CONFIG[app.leave_type].days === 999 ? 'As negotiated' : LEAVE_CONFIG[app.leave_type].days + ' days'}</span></div>
  </div>
</div>

<div class="section">
  <h3>C. Reason for Leave</h3>
  <div class="info-box">${app.reason}</div>
</div>

${sub ? `
<div class="section">
  <h3>D. Substitute / Cover Teacher</h3>
  <div class="field"><span class="field-label">Substitute Name:</span><span class="field-value"><strong>${sub.first_name} ${sub.last_name}</strong></span></div>
  <div class="field"><span class="field-label">TSC No.:</span><span class="field-value">${sub.tsc_number || '___________________'}</span></div>
</div>` : '<div class="section"><h3>D. Substitute / Cover Teacher</h3><div class="field"><span class="field-label">Substitute Name:</span><span class="field-value">___________________</span></div></div>'}

<div class="section">
  <h3>E. Status & Decision</h3>
  <div class="field"><span class="field-label">Application Status:</span><span class="field-value"><span class="badge">${app.status}</span></span></div>
  ${app.approved_by ? `<div class="field"><span class="field-label">Authorized By:</span><span class="field-value">${app.approved_by}</span></div>` : ''}
  ${app.approved_at ? `<div class="field"><span class="field-label">Date Authorized:</span><span class="field-value">${fmtLong(app.approved_at.split('T')[0])}</span></div>` : ''}
  ${app.rejection_reason ? `<div class="field"><span class="field-label">Rejection Reason:</span><span class="field-value" style="color:#dc2626">${app.rejection_reason}</span></div>` : ''}
  ${app.return_date ? `<div class="field"><span class="field-label">Return Date:</span><span class="field-value"><strong>${fmtLong(app.return_date)}</strong></span></div>` : ''}
</div>

<div class="signature-grid">
  <div class="sig-box"><div class="sig-line">Applicant's Signature & Date</div></div>
  <div class="sig-box"><div class="sig-line">HOD / Deputy Principal</div></div>
  <div class="sig-box"><div class="sig-line">Principal's Signature & Stamp</div></div>
</div>
<p style="text-align:center;margin-top:20px;font-size:10px;color:#94a3b8">Generated by APSIMS Teacher Leave System · ${new Date().toLocaleDateString('en-KE')}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w?.document.close();
  };

  /* ── PRINT APPROVAL LETTER ─────────────────────────── */
  const printApprovalLetter = (app: LeaveApplication) => {
    if (app.status !== 'Approved') { toast.error('Only approved leaves can have an approval letter'); return; }
    const t = getTeacher(app.teacher_id);
    const w = window.open('', '_blank');
    w?.document.write(`<!DOCTYPE html><html><head><title>Leave Approval - ${getName(app.teacher_id)}</title>
<style>
  body{font-family:'Times New Roman',Times,serif;padding:40px 60px;color:#1e293b;font-size:13px;line-height:1.8;}
  .letterhead{text-align:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #1e293b;}
  .ref{display:flex;justify-content:space-between;margin-bottom:24px;font-size:12px;}
  p{margin:12px 0;text-align:justify;}
  .sig{margin-top:48px;}
  .sig-line{border-top:1px solid #334155;margin-top:40px;padding-top:8px;font-size:11px;width:200px;}
  @media print{@page{size:A4;margin:20mm;}}
</style></head><body>
<div class="letterhead">
  <h1 style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px">${schoolInfo?.school_name || 'ALPHA SCHOOL'}</h1>
  <p style="font-size:12px;color:#475569">${schoolInfo?.address || ''} | Tel: ${schoolInfo?.phone || ''}</p>
  <p style="font-size:11px;color:#94a3b8">Email: ${schoolInfo?.email || ''}</p>
</div>
<div class="ref">
  <div><strong>Ref: LEAVE/${new Date().getFullYear()}/${app.id || '___'}</strong></div>
  <div>${fmtLong(app.approved_at?.split('T')[0] || new Date().toISOString().split('T')[0])}</div>
</div>
<p><strong>${t?.first_name || ''} ${t?.last_name || ''}</strong><br>
TSC No: ${t?.tsc_number || '___________________'}<br>
${schoolInfo?.school_name || 'This School'}</p>

<p>Dear ${t?.first_name || 'Teacher'},</p>

<p><strong>RE: APPROVAL OF ${app.leave_type.toUpperCase()} LEAVE — ${app.days_requested} DAYS</strong></p>

<p>I write to inform you that your application for <strong>${app.leave_type} Leave</strong> has been <strong>APPROVED</strong>. The details of your approved leave are as follows:</p>

<table style="width:60%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 0;font-weight:700;width:50%">Leave Type:</td><td>${app.leave_type} Leave</td></tr>
  <tr><td style="padding:4px 0;font-weight:700">Start Date:</td><td>${fmtLong(app.start_date)}</td></tr>
  <tr><td style="padding:4px 0;font-weight:700">End Date:</td><td>${fmtLong(app.end_date)}</td></tr>
  <tr><td style="padding:4px 0;font-weight:700">No. of Days:</td><td><strong>${app.days_requested} days</strong></td></tr>
  <tr><td style="padding:4px 0;font-weight:700">Expected Return:</td><td>${app.return_date ? fmtLong(app.return_date) : fmtLong(app.end_date)}</td></tr>
</table>

<p>You are required to hand over all your duties, class records, and any pending matters to the class teacher/substitute before proceeding on leave. Please ensure all your duties are covered.</p>

<p>You are expected to resume duty on <strong>${app.return_date ? fmtLong(app.return_date) : 'the next working day after ' + fmtLong(app.end_date)}</strong> and to report to the office immediately upon return.</p>

<p>Wishing you well during your leave period.</p>

<div class="sig">
  <p>Yours faithfully,</p>
  <div class="sig-line">${app.approved_by || 'Principal'}<br>Principal<br>${schoolInfo?.school_name || ''}</div>
</div>
<p style="margin-top:24px;font-size:11px;color:#94a3b8">cc: TSC File | Staff File | Accounts</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w?.document.close();
  };

  /* ── Analytics helpers ─────────────────────────────── */
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    LEAVE_TYPES.forEach(lt => { map[lt] = apps.filter(a => a.leave_type === lt && a.status === 'Approved').reduce((s, a) => s + (a.days_requested || 0), 0); });
    return Object.entries(map).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [apps]);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    apps.filter(a => a.status === 'Approved').forEach(a => {
      const k = a.start_date?.slice(0, 7);
      if (k) map[k] = (map[k] || 0) + (a.days_requested || 0);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [apps]);

  const topAbsentees = useMemo(() => {
    const map: Record<number, number> = {};
    apps.filter(a => a.status === 'Approved').forEach(a => { map[a.teacher_id] = (map[a.teacher_id] || 0) + (a.days_requested || 0); });
    return Object.entries(map).map(([id, days]) => ({ teacher: getTeacher(Number(id)), days })).sort((a, b) => b.days - a.days).slice(0, 10);
  }, [apps, teachers]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          <FiCalendar size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Loading Teacher Leave Management…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <AppModal teachers={teachers} apps={apps} onClose={() => { setShowModal(false); setEditApp(undefined); }} onSave={handleSave} edit={editApp} />}
      {reviewApp && <ReviewModal app={reviewApp} teachers={teachers} schoolInfo={schoolInfo} onClose={() => setReviewApp(null)} onAction={handleAction} />}

      <div className="space-y-5">

        {/* ════ ULTRA HERO ════ */}
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#312e81 0%,#4338ca 40%,#6366f1 100%)' }}>
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5b4fc,transparent)', transform: 'translate(30%,-30%)' }} />
          <div className="relative px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl p-3" style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)' }}>
                  <FiCalendar className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                    🏖️ Teacher Leave Management
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#818cf8,#06b6d4)' }}>ULTRA</span>
                    {pending > 0 && <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 animate-pulse">{pending} PENDING</span>}
                  </h1>
                  <p className="text-indigo-300 text-xs mt-0.5">TSC/MoE Compliant · Apply · Approve · Balance Tracker · Conflict Detection · PDF Letters · Reports</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { setEditApp(undefined); setShowModal(true); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)' }}><FiPlus size={12} /> New Application</button>
                <button onClick={exportExcel} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500/80 hover:bg-emerald-500 flex items-center gap-1.5 transition"><FiDownload size={12} /> Excel</button>
                <button onClick={fetchAll} className="p-2 rounded-xl text-white hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
              </div>
            </div>
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-white/10">
              {[
                { label: 'Total Applications', value: apps.length, icon: '📋', pulse: false },
                { label: 'Pending Approval', value: pending, icon: '⏳', pulse: pending > 0 },
                { label: 'Currently on Leave', value: onLeave, icon: '🏖️', pulse: onLeave > 0 },
                { label: 'Total Days Approved', value: totalDays, icon: '📅', pulse: false },
                { label: 'Approved', value: approved, icon: '✅', pulse: false },
                { label: 'Rejected', value: rejected, icon: '❌', pulse: false },
              ].map((card, i) => (
                <div key={i} className={`rounded-xl p-2.5 transition-all hover:scale-[1.02] cursor-default ${card.pulse ? 'animate-pulse' : ''}`} style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.13)' }}>
                  <div className="flex items-center gap-1 mb-1"><span className="text-sm">{card.icon}</span><span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span></div>
                  <p className="text-xl font-black text-white leading-tight">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending alert */}
        {pending > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}><FiAlertCircle size={18} style={{ color: '#D97706' }} /></div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">{pending} application{pending > 1 ? 's' : ''} awaiting approval</p>
              <p className="text-xs text-amber-700 mt-0.5">Review promptly to ensure proper class coverage and substitution planning.</p>
            </div>
            <button onClick={() => { setTab('applications'); setFilterStatus('Pending'); }} className="px-3 py-1.5 text-xs font-bold rounded-lg flex-shrink-0" style={{ background: '#FEF3C7', color: '#92400E' }}>Review Now →</button>
          </div>
        )}

        {/* ════ TABS ════ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
          {([
            ['applications', '📋 Applications', apps.length],
            ['balance', '📊 Leave Balance', teachers.length],
            ['calendar', '📅 Calendar', apps.filter(a => a.status === 'Approved').length],
            ['reports', '📈 Reports', 0],
          ] as const).map(([t, l, count]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
              style={tab === t
                ? { background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)' }
                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {l}{count > 0 && <span className="text-[10px] font-bold opacity-60">({count})</span>}
            </button>
          ))}
        </div>

        {/* ════ APPLICATIONS TAB ════ */}
        {tab === 'applications' && <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
                <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Teacher name…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50" />
                </div>
              </div>
              <div className="min-w-[130px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
                  <option value="all">All Statuses</option>
                  {['Pending', 'Approved', 'Rejected', 'Cancelled', 'Returned'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="min-w-[130px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
                  <option value="all">All Types</option>
                  {LEAVE_TYPES.map(lt => <option key={lt}>{lt}</option>)}
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teacher</label>
                <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
                  <option value="">All Teachers</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50" />
              </div>
              {(searchQ || filterStatus !== 'all' || filterType !== 'all' || filterTeacher || dateFrom || dateTo) && (
                <button onClick={() => { setSearchQ(''); setFilterStatus('all'); setFilterType('all'); setFilterTeacher(''); setDateFrom(''); setDateTo(''); }}
                  className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition flex items-center gap-1"><FiX size={11} />Clear</button>
              )}
              <p className="text-sm text-gray-500 pb-2 ml-auto"><span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{apps.length}</span> records</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['#', 'Teacher', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Substitute', 'Approved By', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-16 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center"><FiCalendar size={24} className="text-gray-300" /></div>
                      <p className="text-gray-400 font-semibold text-sm">No leave applications found</p>
                      <button onClick={() => { setEditApp(undefined); setShowModal(true); }} className="mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}><FiPlus size={11} className="inline mr-1" />New Application</button>
                    </td></tr>
                  ) : filtered.map((app, idx) => {
                    const t = getTeacher(app.teacher_id);
                    const s = app.substitute_teacher_id ? getTeacher(app.substitute_teacher_id) : null;
                    const isActive = app.status === 'Approved' && now >= new Date(app.start_date) && now <= new Date(app.end_date);
                    return (
                      <tr key={app.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors ${isActive ? 'bg-green-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
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
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(app.start_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(app.end_date)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{app.days_requested}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={app.status} />
                            {isActive && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 animate-pulse w-fit">● ON LEAVE NOW</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s ? <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-black text-green-700">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                            <span className="text-xs text-gray-600">{s.first_name} {s.last_name}</span>
                          </div> : <span className="text-xs text-gray-300 italic">None</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{app.approved_by || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {app.status === 'Pending' && <button onClick={() => setReviewApp(app)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Review</button>}
                            {app.status === 'Approved' && isActive && <button onClick={() => markReturned(app)} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>Returned</button>}
                            <button onClick={() => printLeaveForm(app)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all" title="Print Form"><FiPrinter size={12} /></button>
                            {app.status === 'Approved' && <button onClick={() => printApprovalLetter(app)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all" title="Approval Letter"><FiFileText size={12} /></button>}
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
            <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-500"><span className="font-bold text-amber-600">{pending} pending</span> · <span className="font-bold text-green-600">{approved} approved</span> · <span className="font-bold text-red-500">{rejected} rejected</span> · <span className="font-bold text-gray-600">{apps.length} total</span></p>
              <p className="text-xs text-gray-400">🔒 TSC/MoE Compliant Leave System</p>
            </div>
          </div>
        </>}

        {/* ════ LEAVE BALANCE TAB ════ */}
        {tab === 'balance' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FiActivity size={15} className="text-indigo-500" /> Leave Balance — Entitlement vs Used vs Remaining (Current Year)</h2>
                <p className="text-xs text-gray-400 mt-1">Approved leaves only · Annual entitlements per TSC guidelines</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teacher</th>
                      {LEAVE_TYPES.map(lt => (
                        <th key={lt} className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: LEAVE_CONFIG[lt].color }}>
                          {LEAVE_CONFIG[lt].icon}<br />{lt}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher, idx) => {
                      const tApps = apps.filter(a => a.teacher_id === teacher.id && a.status === 'Approved');
                      const used: Record<string, number> = {};
                      LEAVE_TYPES.forEach(lt => { used[lt] = tApps.filter(a => a.leave_type === lt).reduce((s, a) => s + (a.days_requested || 0), 0); });
                      const total = Object.values(used).reduce((a, b) => a + b, 0);
                      return (
                        <tr key={teacher.id} className={`border-b border-gray-100 hover:bg-indigo-50/20 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{teacher.first_name?.[0]}{teacher.last_name?.[0]}</div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{teacher.first_name} {teacher.last_name}</p>
                                <p className="text-[10px] text-gray-400">{teacher.tsc_number || '—'}</p>
                              </div>
                            </div>
                          </td>
                          {LEAVE_TYPES.map(lt => {
                            const maxDays = LEAVE_CONFIG[lt].days === 999 ? 30 : LEAVE_CONFIG[lt].days;
                            const pct = Math.min((used[lt] / maxDays) * 100, 100);
                            const remaining = Math.max(0, maxDays - used[lt]);
                            const overused = used[lt] > maxDays;
                            return (
                              <td key={lt} className="px-2 py-3 text-center">
                                {used[lt] > 0 ? (
                                  <div>
                                    <span className="text-xs font-black" style={{ color: overused ? '#dc2626' : LEAVE_CONFIG[lt].color }}>{used[lt]}d</span>
                                    <div className="text-[9px] text-gray-400">/{LEAVE_CONFIG[lt].days === 999 ? '∞' : LEAVE_CONFIG[lt].days}</div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: overused ? '#dc2626' : LEAVE_CONFIG[lt].color }} />
                                    </div>
                                    {LEAVE_CONFIG[lt].days !== 999 && <div className="text-[9px] font-bold mt-0.5" style={{ color: remaining > 0 ? '#059669' : '#dc2626' }}>{remaining}d left</div>}
                                  </div>
                                ) : <span className="text-gray-200 text-xs">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black" style={{ background: total > 0 ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f3f4f6', color: total > 0 ? 'white' : '#9ca3af' }}>{total}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-wrap gap-4">
                  {LEAVE_TYPES.map(lt => (
                    <div key={lt} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: LEAVE_CONFIG[lt].color }} />
                      <span className="text-[10px] font-bold text-gray-600">{lt}: {LEAVE_CONFIG[lt].days === 999 ? '∞' : LEAVE_CONFIG[lt].days}d/yr</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ CALENDAR TAB ════ */}
        {tab === 'calendar' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><FiCalendar size={15} className="text-indigo-500" /> Approved Leave Timeline</h2>
            {apps.filter(a => a.status === 'Approved').length === 0 ? (
              <div className="text-center py-12"><div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center"><FiCalendar size={24} className="text-gray-300" /></div><p className="text-gray-400 font-semibold text-sm">No approved leave yet</p></div>
            ) : (
              <div className="space-y-3">
                {apps.filter(a => a.status === 'Approved').sort((a, b) => a.start_date.localeCompare(b.start_date)).map(app => {
                  const t = getTeacher(app.teacher_id);
                  const sub = app.substitute_teacher_id ? getTeacher(app.substitute_teacher_id) : null;
                  const cfg = LEAVE_CONFIG[app.leave_type];
                  const isActive = now >= new Date(app.start_date) && now <= new Date(app.end_date);
                  const isPast = now > new Date(app.end_date);
                  const isUpcoming = now < new Date(app.start_date);
                  return (
                    <div key={app.id} className="flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm" style={{ borderColor: isActive ? cfg.color : '#e5e7eb', background: isActive ? cfg.bg : 'white' }}>
                      <div className="w-2 self-stretch rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{t?.first_name?.[0]}{t?.last_name?.[0]}</div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{t?.first_name} {t?.last_name}</p>
                          <TypeBadge type={app.leave_type} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600">{fmtDate(app.start_date)} — {fmtDate(app.end_date)} · {app.days_requested}d</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{app.reason}</p>
                        {sub && <p className="text-[10px] text-blue-600 mt-0.5">Sub: {sub.first_name} {sub.last_name}</p>}
                        {app.approved_by && <p className="text-[10px] text-gray-400">Auth: {app.approved_by}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {isActive && <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-100 text-green-700 animate-pulse">🟢 ACTIVE</span>}
                        {isUpcoming && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">🔵 UPCOMING</span>}
                        {isPast && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400">⚫ PAST</span>}
                        <button onClick={() => printLeaveForm(app)} className="p-1.5 rounded-lg hover:bg-purple-50 border border-gray-200 transition" title="Print"><FiPrinter size={12} className="text-gray-400" /></button>
                        <button onClick={() => printApprovalLetter(app)} className="p-1.5 rounded-lg hover:bg-green-50 border border-gray-200 transition" title="Letter"><FiFileText size={12} className="text-gray-400" /></button>
                        {isActive && <button onClick={() => markReturned(app)} className="px-2 py-1 text-[10px] font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>Returned</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ REPORTS TAB ════ */}
        {tab === 'reports' && (
          <div className="space-y-5">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { l: 'Total Applications', v: apps.length, c: '#4338ca', icon: '📋' },
                { l: 'Total Days Approved', v: totalDays, c: '#059669', icon: '📅' },
                { l: 'Avg Days per Application', v: approved > 0 ? (totalDays / approved).toFixed(1) : '0', c: '#d97706', icon: '📊' },
                { l: 'Teachers with Leave', v: new Set(apps.filter(a => a.status === 'Approved').map(a => a.teacher_id)).size, c: '#0891b2', icon: '👩‍🏫' },
              ].map((k, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="text-2xl mb-2">{k.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.l}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: k.c, marginTop: 4 }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Leave by Type */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBarChart2 size={14} className="text-indigo-500" /> Days Approved by Leave Type</h3>
                <button onClick={() => {
                  const headers = ['Leave Type', 'Applications', 'Total Days Approved', 'Entitlement/Year'];
                  const rows = LEAVE_TYPES.map(lt => [lt, apps.filter(a => a.leave_type === lt && a.status === 'Approved').length, apps.filter(a => a.leave_type === lt && a.status === 'Approved').reduce((s, a) => s + (a.days_requested || 0), 0), LEAVE_CONFIG[lt].days === 999 ? 'Negotiated' : LEAVE_CONFIG[lt].days]);
                  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Leave_By_Type.csv'; a.click();
                  toast.success('Exported!');
                }} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1"><FiDownload size={11} />Export</button>
              </div>
              <div className="p-5 space-y-3">
                {byType.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No approved leave data yet</p> : byType.map(([lt, days]) => {
                  const maxDays = Math.max(...byType.map(([, v]) => v), 1);
                  const pct = (days / maxDays) * 100;
                  const cfg = LEAVE_CONFIG[lt as LeaveType];
                  const count = apps.filter(a => a.leave_type === lt && a.status === 'Approved').length;
                  return (
                    <div key={lt} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-bold text-gray-600 flex-shrink-0 flex items-center gap-1">{cfg.icon} {lt}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                        <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 20, transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                          {pct > 15 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{days}d</span>}
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm font-black" style={{ color: cfg.color }}>{days}d</div>
                      <div className="w-16 text-right text-xs text-gray-400">{count} apps</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiTrendingUp size={14} className="text-green-500" /> Monthly Leave Days Trend (Last 12 Months)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50"><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Month</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Days</th><th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Bar</th></tr></thead>
                  <tbody>
                    {byMonth.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-400">No data yet</td></tr> : byMonth.map(([mo, days]) => {
                      const maxD = Math.max(...byMonth.map(([, v]) => v), 1);
                      return (
                        <tr key={mo} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-bold text-gray-700">{mo}</td>
                          <td className="px-5 py-3 text-sm font-black text-indigo-600 text-right">{days}d</td>
                          <td className="px-5 py-3">
                            <div className="bg-gray-100 rounded-full h-5 overflow-hidden w-48">
                              <div style={{ width: `${(days / maxD) * 100}%`, height: '100%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 20 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Absentees */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiUsers size={14} className="text-red-500" /> Top Teachers by Leave Days Taken</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50">
                    {['#', 'Teacher', 'TSC No.', 'Annual Used', 'Sick Used', 'Total Days', 'Applications'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {topAbsentees.filter(r => r.teacher).map((row, i) => {
                      const tApps = apps.filter(a => a.teacher_id === row.teacher.id && a.status === 'Approved');
                      return (
                        <tr key={row.teacher.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white inline-flex" style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#6b7280' }}>{i + 1}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-800">{row.teacher.first_name} {row.teacher.last_name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{row.teacher.tsc_number || '—'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{tApps.filter(a => a.leave_type === 'Annual').reduce((s, a) => s + (a.days_requested || 0), 0)}d</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-500">{tApps.filter(a => a.leave_type === 'Sick').reduce((s, a) => s + (a.days_requested || 0), 0)}d</td>
                          <td className="px-4 py-3 text-xl font-black text-indigo-600">{row.days}d</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-600">{tApps.length}</td>
                        </tr>
                      );
                    })}
                    {topAbsentees.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No approved leave data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiShield size={14} className="text-amber-500" /> Application Status Breakdown</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {(['Pending', 'Approved', 'Rejected', 'Cancelled', 'Returned'] as LeaveStatus[]).map(status => {
                    const count = apps.filter(a => a.status === status).length;
                    const pct = apps.length > 0 ? ((count / apps.length) * 100).toFixed(1) : '0';
                    const c = STATUS_CFG[status];
                    return (
                      <div key={status} className="rounded-xl p-4 text-center border" style={{ background: c.bg, borderColor: c.border }}>
                        <p className="text-2xl font-black" style={{ color: c.color }}>{count}</p>
                        <p className="text-xs font-bold mt-1" style={{ color: c.color }}>{status}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

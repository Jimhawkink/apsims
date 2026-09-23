'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiShield, FiRefreshCw, FiSearch, FiDownload, FiClock, FiUser, FiDollarSign, FiAlertTriangle, FiFilter, FiLock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const KES = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtT = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
};

/* ─── Unified event type ─── */
interface AuditEvent {
  id: string;
  source: string;   // which table
  action: string;
  emoji: string;
  color: string;
  bg: string;
  actor: string;
  actorRole: string;
  target: string;
  amount: number;
  detail: string;
  ipAddress: string;
  rawDetails: any;
  created_at: string;
}

/* ─── Source config ─── */
const SOURCE_CFG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  // school_audit_log
  login_success:        { label: 'Login Success',       emoji: '🔑', color: '#6366f1', bg: '#eef2ff' },
  login_failed:         { label: 'Login Failed',        emoji: '❌', color: '#dc2626', bg: '#fef2f2' },
  logout:               { label: 'User Logout',          emoji: '🚪', color: '#94a3b8', bg: '#f8fafc' },
  'User Logout':        { label: 'User Logout',          emoji: '🚪', color: '#94a3b8', bg: '#f8fafc' },
  portal_login_success: { label: 'Portal Login',        emoji: '🌐', color: '#0ea5e9', bg: '#f0f9ff' },
  portal_login_failed:  { label: 'Portal Login Failed', emoji: '🌐', color: '#dc2626', bg: '#fef2f2' },
  payment_created:      { label: 'Payment Created',     emoji: '💰', color: '#22c55e', bg: '#f0fdf4' },
  payment_deleted:      { label: 'Payment Deleted',     emoji: '🗑️', color: '#ef4444', bg: '#fef2f2' },
  payment_voided:       { label: 'Payment Voided',      emoji: '🔴', color: '#ef4444', bg: '#fef2f2' },
  payment_reversed:     { label: 'Payment Reversed',    emoji: '↩️', color: '#dc2626', bg: '#fef2f2' },
  fee_adjusted:         { label: 'Fee Adjusted',        emoji: '✏️', color: '#f97316', bg: '#fff7ed' },
  structure_changed:    { label: 'Structure Changed',   emoji: '🏗️', color: '#7c3aed', bg: '#faf5ff' },
  student_enrolled:     { label: 'Student Enrolled',    emoji: '🎓', color: '#059669', bg: '#ecfdf5' },
  user_created:         { label: 'User Created',        emoji: '👤', color: '#0ea5e9', bg: '#f0f9ff' },
  user_updated:         { label: 'User Updated',        emoji: '✏️', color: '#f59e0b', bg: '#fffbeb' },
  scholarship_applied:  { label: 'Scholarship Applied', emoji: '🎓', color: '#10b981', bg: '#ecfdf5' },
  // synthesized sources
  fee_payment:          { label: 'Fee Payment',         emoji: '💵', color: '#16a34a', bg: '#f0fdf4' },
  expense:              { label: 'Expense Recorded',    emoji: '📤', color: '#f97316', bg: '#fff7ed' },
  payroll:              { label: 'Payroll Entry',        emoji: '💼', color: '#7c3aed', bg: '#faf5ff' },
  student_admission:    { label: 'Student Admitted',    emoji: '🎓', color: '#059669', bg: '#ecfdf5' },
  backup:               { label: 'Backup Created',      emoji: '💾', color: '#0891b2', bg: '#ecfeff' },
  announcement:         { label: 'Announcement',        emoji: '📢', color: '#0ea5e9', bg: '#f0f9ff' },
  mpesa_transaction:    { label: 'M-Pesa Transaction',  emoji: '📱', color: '#059669', bg: '#ecfdf5' },
  library:              { label: 'Library Activity',    emoji: '📚', color: '#8b5cf6', bg: '#faf5ff' },
  attendance:           { label: 'Attendance Recorded', emoji: '📋', color: '#06b6d4', bg: '#ecfeff' },
  discipline:           { label: 'Discipline Record',   emoji: '⚠️', color: '#f59e0b', bg: '#fffbeb' },
  visitor:              { label: 'Visitor Logged',       emoji: '🪪', color: '#64748b', bg: '#f8fafc' },
  message_sent:         { label: 'Message Sent',        emoji: '💬', color: '#6366f1', bg: '#eef2ff' },
};

const getCfg = (action: string) =>
  SOURCE_CFG[action] ?? { label: action || 'System Event', emoji: '📋', color: '#6b7280', bg: '#f9fafb' };

/* ─── Pagination ─── */
const PAGE_SIZE = 25;

function StatCard({ label, value, icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function FeeAuditPage() {
  const [loading, setLoading]       = useState(true);
  const [events, setEvents]         = useState<AuditEvent[]>([]);
  const [search, setSearch]         = useState('');
  const [sourceFilter, setSource]   = useState('All');
  const [dateFrom, setDateFrom]     = useState(new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [dateTo, setDateTo]         = useState(new Date().toISOString().split('T')[0]);
  const [expandedId, setExpanded]   = useState<string | null>(null);
  const [page, setPage]             = useState(1);

  /* ════════════════════════════════════════════
     FETCH ALL — pull from every major table
  ════════════════════════════════════════════ */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        auditRes,
        paymentsRes,
        expensesRes,
        payrollRes,
        studentsRes,
        backupsRes,
        announcementsRes,
        libraryRes,
        disciplineRes,
        visitorsRes,
        messagesRes,
        mpesaRes,
      ] = await Promise.all([
        /* 1. Real audit log — login/logout/system events */
        supabase.from('school_audit_log')
          .select('*').order('created_at', { ascending: false }).limit(500),

        /* 2. Fee payments */
        supabase.from('school_fee_payments')
          .select('id,student_id,amount,payment_date,payment_method,receipt_number,received_by,created_at')
          .order('created_at', { ascending: false }).limit(300),

        /* 3. Expenses */
        supabase.from('expenses')
          .select('expense_id,expense_name,amount,expense_type,payment_mode,created_by,created_at,expense_date')
          .order('created_at', { ascending: false }).limit(200),

        /* 4. Payroll */
        supabase.from('school_payroll')
          .select('id,staff_name,staff_type,net_pay,pay_period,status,approved_by,created_at')
          .order('created_at', { ascending: false }).limit(200),

        /* 5. Students (recent admissions) */
        supabase.from('school_students')
          .select('id,first_name,last_name,admission_number,admission_no,created_at,status')
          .order('created_at', { ascending: false }).limit(100),

        /* 6. Backup logs */
        supabase.from('school_backup_logs')
          .select('id,backup_type,table_count,record_count,status,created_by,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 7. Announcements */
        supabase.from('school_announcements')
          .select('id,title,category,priority,published_by,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 8. Library transactions */
        supabase.from('school_library_transactions')
          .select('id,borrower_name,status,issued_by,borrow_date,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 9. Discipline records */
        supabase.from('school_discipline_records')
          .select('id,category,severity,reported_by,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 10. Visitor log */
        supabase.from('school_visitor_log')
          .select('id,visitor_name,purpose,recorded_by,check_in,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 11. Message logs */
        supabase.from('school_message_logs')
          .select('id,message_type,recipient_count,status,sent_by,sent_at,created_at')
          .order('created_at', { ascending: false }).limit(100),

        /* 12. M-Pesa transactions (mpesa_transactions table) */
        supabase.from('mpesa_transactions')
          .select('id,phone_number,amount,mpesa_receipt_number,status,customer_name,invoice_no,created_at')
          .order('created_at', { ascending: false }).limit(200),
      ]);

      const all: AuditEvent[] = [];
      let counter = 0;

      /* 1 — school_audit_log */
      for (const r of auditRes.data || []) {
        const cfg = getCfg(r.action);
        all.push({
          id: `audit-${r.id ?? counter++}`,
          source: 'school_audit_log',
          action: r.action,
          emoji: cfg.emoji, color: cfg.color, bg: cfg.bg,
          actor: r.actor_name || '—',
          actorRole: r.actor_role || '',
          target: r.target_type ? `${r.target_type}${r.target_id ? ` #${r.target_id}` : ''}` : '',
          amount: r.details?.amount || 0,
          detail: r.details?.username || r.details?.email || '',
          ipAddress: r.ip_address || '',
          rawDetails: r.details || {},
          created_at: r.created_at,
        });
      }

      /* 2 — Fee payments */
      for (const r of paymentsRes.data || []) {
        all.push({
          id: `pay-${r.id}`,
          source: 'school_fee_payments',
          action: 'fee_payment',
          emoji: '💵', color: '#16a34a', bg: '#f0fdf4',
          actor: r.received_by || 'System',
          actorRole: 'Cashier',
          target: `Student #${r.student_id}`,
          amount: Number(r.amount || 0),
          detail: `${r.payment_method || '—'} · ${r.receipt_number || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at || r.payment_date,
        });
      }

      /* 3 — Expenses */
      for (const r of expensesRes.data || []) {
        all.push({
          id: `exp-${r.expense_id}`,
          source: 'expenses',
          action: 'expense',
          emoji: '📤', color: '#f97316', bg: '#fff7ed',
          actor: r.created_by || 'System',
          actorRole: 'Admin',
          target: r.expense_name || 'Expense',
          amount: Number(r.amount || 0),
          detail: `${r.expense_type || ''} · ${r.payment_mode || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at || r.expense_date,
        });
      }

      /* 4 — Payroll */
      for (const r of payrollRes.data || []) {
        all.push({
          id: `pr-${r.id}`,
          source: 'school_payroll',
          action: 'payroll',
          emoji: '💼', color: '#7c3aed', bg: '#faf5ff',
          actor: r.approved_by || 'System',
          actorRole: 'Admin',
          target: `${r.staff_name || '—'} (${r.staff_type || ''})`,
          amount: Number(r.net_pay || 0),
          detail: `${r.pay_period || ''} · ${r.status || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* 5 — Student admissions (recent) */
      for (const r of studentsRes.data || []) {
        all.push({
          id: `stu-${r.id}`,
          source: 'school_students',
          action: 'student_admission',
          emoji: '🎓', color: '#059669', bg: '#ecfdf5',
          actor: 'Admin',
          actorRole: 'Registrar',
          target: `${r.first_name || ''} ${r.last_name || ''}`,
          amount: 0,
          detail: `Adm: ${r.admission_no || r.admission_number || '—'} · ${r.status || 'Active'}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* 6 — Backup logs */
      for (const r of backupsRes.data || []) {
        all.push({
          id: `bk-${r.id}`,
          source: 'school_backup_logs',
          action: 'backup',
          emoji: '💾', color: '#0891b2', bg: '#ecfeff',
          actor: r.created_by || 'System',
          actorRole: 'System',
          target: `${r.backup_type || 'Full'} Backup`,
          amount: 0,
          detail: `${r.table_count || 0} tables · ${r.record_count || 0} records · ${r.status || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* 7 — Announcements */
      for (const r of announcementsRes.data || []) {
        all.push({
          id: `ann-${r.id}`,
          source: 'school_announcements',
          action: 'announcement',
          emoji: '📢', color: '#0ea5e9', bg: '#f0f9ff',
          actor: r.published_by || 'Admin',
          actorRole: 'Admin',
          target: r.title || 'Announcement',
          amount: 0,
          detail: `${r.category || ''} · ${r.priority || 'Normal'}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* 8 — Library */
      for (const r of libraryRes.data || []) {
        all.push({
          id: `lib-${r.id}`,
          source: 'school_library_transactions',
          action: 'library',
          emoji: '📚', color: '#8b5cf6', bg: '#faf5ff',
          actor: r.issued_by || 'Librarian',
          actorRole: 'Librarian',
          target: r.borrower_name || '—',
          amount: 0,
          detail: r.status || 'Borrowed',
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at || r.borrow_date,
        });
      }

      /* 9 — Discipline */
      for (const r of disciplineRes.data || []) {
        all.push({
          id: `dis-${r.id}`,
          source: 'school_discipline_records',
          action: 'discipline',
          emoji: '⚠️', color: '#f59e0b', bg: '#fffbeb',
          actor: r.reported_by || 'Teacher',
          actorRole: 'Teacher',
          target: `Student #${r.id}`,
          amount: 0,
          detail: `${r.category || ''} · ${r.severity || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* 10 — Visitors */
      for (const r of visitorsRes.data || []) {
        all.push({
          id: `vis-${r.id}`,
          source: 'school_visitor_log',
          action: 'visitor',
          emoji: '🪪', color: '#64748b', bg: '#f8fafc',
          actor: r.recorded_by || 'Security',
          actorRole: 'Security',
          target: r.visitor_name || '—',
          amount: 0,
          detail: r.purpose || '',
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at || r.check_in,
        });
      }

      /* 11 — Messages */
      for (const r of messagesRes.data || []) {
        all.push({
          id: `msg-${r.id}`,
          source: 'school_message_logs',
          action: 'message_sent',
          emoji: '💬', color: '#6366f1', bg: '#eef2ff',
          actor: r.sent_by || 'Admin',
          actorRole: 'Admin',
          target: `${r.recipient_count || 0} recipients`,
          amount: 0,
          detail: `${r.message_type || 'SMS'} · ${r.status || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at || r.sent_at,
        });
      }

      /* 12 — M-Pesa transactions */
      for (const r of mpesaRes.data || []) {
        all.push({
          id: `mpesa-${r.id}`,
          source: 'mpesa_transactions',
          action: 'mpesa_transaction',
          emoji: '📱', color: '#059669', bg: '#ecfdf5',
          actor: r.customer_name || r.phone_number || '—',
          actorRole: 'Customer',
          target: r.invoice_no || '—',
          amount: Number(r.amount || 0),
          detail: `${r.mpesa_receipt_number || ''} · ${r.status || ''}`,
          ipAddress: '',
          rawDetails: r,
          created_at: r.created_at,
        });
      }

      /* Sort all by time desc */
      all.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setEvents(all);
    } catch (e: any) {
      console.error(e);
      toast.error('Error loading audit data');
    }
    setLoading(false);
    setPage(1);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter(e => {
      if (sourceFilter !== 'All' && e.action !== sourceFilter && e.source !== sourceFilter) return false;
      if (dateFrom && e.created_at < dateFrom) return false;
      if (dateTo && e.created_at > dateTo + 'T23:59:59') return false;
      if (q) {
        const blob = [e.actor, e.actorRole, e.action, e.target, e.detail, e.ipAddress, JSON.stringify(e.rawDetails)].join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [events, sourceFilter, dateFrom, dateTo, search]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      todayCount:    events.filter(e => e.created_at?.startsWith(today)).length,
      paymentTotal:  events.filter(e => e.action === 'fee_payment').reduce((s, e) => s + e.amount, 0),
      expenseTotal:  events.filter(e => e.action === 'expense').reduce((s, e) => s + e.amount, 0),
      uniqueActors:  new Set(events.map(e => e.actor).filter(Boolean)).size,
    };
  }, [events]);

  /* ─── Unique action types ─── */
  const usedActions = useMemo(() => [...new Set(events.map(e => e.action).filter(Boolean))] as string[], [events]);

  /* ─── Pagination ─── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  /* ─── Export ─── */
  const exportCSV = () => {
    const rows = [['Time', 'Action', 'Actor', 'Role', 'Target', 'Amount', 'Detail', 'Source', 'IP']];
    filtered.forEach(e => rows.push([fmtT(e.created_at), e.action, e.actor, e.actorRole, e.target, String(e.amount || ''), e.detail, e.source, e.ipAddress]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `full_audit_${dateFrom}_${dateTo}.csv`;
    a.click();
    toast.success(`Exported ${filtered.length} rows`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 font-semibold">Loading all system activities…</p>
        <p className="text-gray-400 text-xs mt-1">Pulling from 12 tables: payments, expenses, payroll, logins, students, backups, messages…</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#4f46e5,#1e40af)' }}><FiShield size={18} /></span>
            Full System Audit Trail
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">
            {events.length.toLocaleString()} events across 12 tables &bull; payments, expenses, payroll, logins, messages &amp; more
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export CSV</button>
          <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
        </div>
      </div>

      {/* ── Tamper-proof notice ── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
        <FiLock className="text-indigo-500 shrink-0" size={16} />
        <p className="text-xs font-bold text-indigo-800">🔒 This trail reads directly from your database tables. All entries are generated by system actions (fee payments, expense entries, payroll, logins, student admissions) and cannot be manually modified here.</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today's Events"   value={String(stats.todayCount)}            icon={<FiClock size={18} />}         color="linear-gradient(135deg,#4f46e5,#1e40af)" sub="across all modules" />
        <StatCard label="Fees Collected"   value={KES(stats.paymentTotal)}             icon={<FiDollarSign size={18} />}    color="linear-gradient(135deg,#16a34a,#15803d)" sub="all-time fee payments" />
        <StatCard label="Expenses Logged"  value={KES(stats.expenseTotal)}             icon={<FiAlertTriangle size={18} />} color="linear-gradient(135deg,#f97316,#ea580c)" sub="all recorded expenses" />
        <StatCard label="Unique Actors"    value={String(stats.uniqueActors)}          icon={<FiUser size={18} />}          color="linear-gradient(135deg,#7c3aed,#5b21b6)" sub="staff &amp; system users" />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search actor, action, target, amount…" className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
        </div>
        <select value={sourceFilter} onChange={e => { setSource(e.target.value); setPage(1); }} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
          <option value="All">All Activities ({events.length})</option>
          {usedActions.map(a => {
            const cfg = getCfg(a);
            const cnt = events.filter(e => e.action === a).length;
            return <option key={a} value={a}>{cfg.emoji} {cfg.label} ({cnt})</option>;
          })}
        </select>
        <div className="flex items-center gap-1.5">
          <FiFilter size={13} className="text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length.toLocaleString()} events</span>
      </div>

      {/* ── Activity type pills ── */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => { setSource('All'); setPage(1); }}
          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${sourceFilter === 'All' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>
          All ({events.length})
        </button>
        {usedActions.map(key => {
          const cfg = getCfg(key);
          const cnt = events.filter(e => e.action === key).length;
          return (
            <button key={key} onClick={() => { setSource(sourceFilter === key ? 'All' : key); setPage(1); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${sourceFilter === key ? 'ring-2 ring-offset-1' : ''}`}
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
              {cfg.emoji} {cfg.label} <span className="bg-white/60 px-1 rounded-full">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── Event list ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <FiShield size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="font-bold text-gray-500">No events match your filters</p>
            <p className="text-sm mt-1 text-gray-400">Try widening the date range or clearing the activity filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map(ev => {
              const isExp = expandedId === ev.id;
              return (
                <div key={ev.id} className="px-4 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors" onClick={() => setExpanded(isExp ? null : ev.id)}>
                  <div className="flex items-start gap-3">
                    {/* Emoji badge */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: ev.bg }}>{ev.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-gray-800">{getCfg(ev.action).label}</span>
                        {ev.target && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 truncate max-w-[180px]">{ev.target}</span>}
                        {ev.amount > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{KES(ev.amount)}</span>}
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 ml-auto">{ev.source}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                        {ev.actor && <span className="flex items-center gap-1"><FiUser size={10} /><b className="text-gray-700">{ev.actor}</b>{ev.actorRole && <span className="text-gray-400">({ev.actorRole})</span>}</span>}
                        <span className="flex items-center gap-1"><FiClock size={10} />{fmtT(ev.created_at)}</span>
                        {ev.ipAddress && <span className="text-gray-400">IP:{ev.ipAddress}</span>}
                      </div>
                      {ev.detail && !isExp && <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.detail}</p>}
                      {isExp && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
                          <p><b className="text-gray-600">ID:</b> {ev.id} &nbsp;|&nbsp; <b className="text-gray-600">Source Table:</b> {ev.source}</p>
                          <p><b className="text-gray-600">Action:</b> {ev.action}</p>
                          <p><b className="text-gray-600">Actor:</b> {ev.actor} ({ev.actorRole})</p>
                          {ev.target && <p><b className="text-gray-600">Target:</b> {ev.target}</p>}
                          {ev.amount > 0 && <p><b className="text-gray-600">Amount:</b> {KES(ev.amount)}</p>}
                          {ev.detail && <p><b className="text-gray-600">Detail:</b> {ev.detail}</p>}
                          {ev.ipAddress && <p><b className="text-gray-600">IP:</b> {ev.ipAddress}</p>}
                          <p><b className="text-gray-600">Time:</b> {fmtT(ev.created_at)}</p>
                          <div>
                            <p className="font-bold text-gray-600 mb-1">Raw record:</p>
                            <div className="bg-white border border-gray-100 rounded-lg p-2 font-mono text-[10px] text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                              {JSON.stringify(ev.rawDetails, null, 2)}
                            </div>
                          </div>
                          <p className="text-indigo-500 font-bold">🔒 Read directly from database — immutable.</p>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{isExp ? '▲' : '▼'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-500 font-semibold">
            Showing <b className="text-gray-800">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</b> of <b className="text-gray-800">{filtered.length.toLocaleString()}</b> events
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => goPage(1)} disabled={page === 1} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-30 hover:bg-gray-50">«</button>
            <button onClick={() => goPage(page - 1)} disabled={page === 1} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><FiChevronLeft size={14} /></button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) { p = i + 1; }
              else if (page <= 4) { p = i + 1; }
              else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
              else { p = page - 3 + i; }
              return (
                <button key={p} onClick={() => goPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${page === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              );
            })}

            <button onClick={() => goPage(page + 1)} disabled={page === totalPages} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><FiChevronRight size={14} /></button>
            <button onClick={() => goPage(totalPages)} disabled={page === totalPages} className="px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-200 disabled:opacity-30 hover:bg-gray-50">»</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Page</span>
            <input type="number" min={1} max={totalPages} value={page} onChange={e => goPage(Number(e.target.value))}
              className="w-14 px-2 py-1 text-xs border border-gray-200 rounded-lg text-center focus:outline-none focus:border-indigo-400" />
            <span className="text-xs text-gray-400">of {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
}

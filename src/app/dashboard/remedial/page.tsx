'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiSearch, FiDollarSign, FiList, FiBarChart2, FiDownload,
  FiUser, FiX, FiCheckCircle, FiBookOpen, FiUsers, FiSettings,
  FiEdit2, FiTrash2, FiEye, FiZap, FiPlus, FiRefreshCw,
  FiChevronUp, FiChevronDown, FiAlertTriangle, FiPrinter,
  FiGrid, FiFilter, FiSend
} from 'react-icons/fi';

type RemTab = 'roster' | 'pay' | 'statement' | 'reports' | 'balances' | 'settings';
const PAY_METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'Card'];
const DEFAULT_AMOUNTS = [1500, 2000, 2500, 3000, 5000];

// â”€â”€ Status logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getStatus(due: number, paid: number) {
  if (paid <= 0) return { label: 'Not Paid', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
  if (paid >= due) return { label: paid > due ? 'Overpaid' : 'Fully Paid', color: '#059669', bg: '#f0fdf4', border: '#86efac' };
  const pct = (paid / due) * 100;
  if (pct >= 50) return { label: 'Partial', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' };
  return { label: 'Low', color: '#dc2626', bg: '#fff7ed', border: '#fdba74' };
}

// â”€â”€ Modal wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: wide ? 760 : 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1.5px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h3 style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><FiX size={16} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// â”€â”€ Stat card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ label, value, icon, color, sub }: { label: string; value: string; icon: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid #e2e8f0`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function RemedialPage() {
  const [tab, setTab] = useState<RemTab>('roster');
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // â”€â”€ Roster filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rosterTerm, setRosterTerm] = useState('');
  const [rosterForm, setRosterForm] = useState('');
  const [rosterStream, setRosterStream] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterSort, setRosterSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'name', dir: 'asc' });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // â”€â”€ Quick Pay modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [quickPayTarget, setQuickPayTarget] = useState<any>(null);
  const [qpAmount, setQpAmount] = useState('');
  const [qpMethod, setQpMethod] = useState('Cash');
  const [qpReceipt, setQpReceipt] = useState('');
  const [qpNotes, setQpNotes] = useState('');
  const [qpSaving, setQpSaving] = useState(false);

  // â”€â”€ Edit enrollment modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // â”€â”€ Delete modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // â”€â”€ Statement modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [stmtTarget, setStmtTarget] = useState<any>(null);

  // â”€â”€ Record payment tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [search, setSearch] = useState('');
  const [selStudent, setSelStudent] = useState<any>(null);
  const [selTermId, setSelTermId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payReceipt, setPayReceipt] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // â”€â”€ Statement tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [stmtSearch, setStmtSearch] = useState('');
  const [stmtStudent, setStmtStudent] = useState<any>(null);

  // â”€â”€ Reports tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rptForm, setRptForm] = useState('');
  const [rptStream, setRptStream] = useState('');
  const [rptTerm, setRptTerm] = useState('');
  const [rptDateFrom, setRptDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [rptDateTo, setRptDateTo] = useState(new Date().toISOString().split('T')[0]);

  // â”€â”€ Balances tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [balForm, setBalForm] = useState('');
  const [balStream, setBalStream] = useState('');
  const [balTerm, setBalTerm] = useState('');
  const [balSearch, setBalSearch] = useState('');

  // â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [newTermName, setNewTermName] = useState('');
  const [newTermYear, setNewTermYear] = useState(String(new Date().getFullYear()));
  const [newTermFee, setNewTermFee] = useState('1500');
  const [newTermSaving, setNewTermSaving] = useState(false);
  const [editTerm, setEditTerm] = useState<any>(null);
  const [editTermFee, setEditTermFee] = useState('');
  const [massEnrollTerm, setMassEnrollTerm] = useState('');
  const [massEnrollForm, setMassEnrollForm] = useState('');
  const [massEnrollStream, setMassEnrollStream] = useState('');
  const [massEnrolling, setMassEnrolling] = useState(false);

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [s, f, st, t, e, p] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,admission_number,form_id,stream_id').eq('status', 'Active').order('first_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_remedial_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_remedial_enrollments').select('*, school_students(id,first_name,last_name,admission_number,form_id,stream_id), school_remedial_terms(id,term_name,fee_amount)').order('enrolled_at', { ascending: false }),
      supabase.from('school_remedial_payments').select('*, school_students(id,first_name,last_name,admission_number,form_id,stream_id), school_remedial_terms(id,term_name)').order('created_at', { ascending: false }),
    ]);
    setStudents(s.data || []);
    setForms(f.data || []);
    setStreams(st.data || []);
    setTerms(t.data || []);
    setEnrollments(e.data || []);
    setPayments(p.data || []);
    if (t.data?.length) {
      if (!rosterTerm) setRosterTerm(String(t.data[0].id));
      if (!selTermId) setSelTermId(String(t.data[0].id));
      if (!rptTerm) setRptTerm(String(t.data[0].id));
      if (!balTerm) setBalTerm(String(t.data[0].id));
      if (!massEnrollTerm) setMassEnrollTerm(String(t.data[0].id));
    }
    if (!silent) setLoading(false); else setRefreshing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getFormName = (fid: any) => forms.find(f => f.id === fid)?.form_name || forms.find(f => f.id === fid)?.form_level?.toString() || '-';
  const getStreamName = (sid: any) => streams.find(s => s.id === sid)?.stream_name || '-';
  const getPaidForEnrollment = (studentId: number, termId: number) =>
    payments.filter(p => p.student_id === studentId && p.term_id === termId).reduce((s, p) => s + Number(p.amount), 0);

  const genReceipt = () => {
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `REM-${ds}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // â”€â”€ ROSTER DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rosterData = useMemo(() => {
    if (!rosterTerm) return [];
    const termNum = Number(rosterTerm);
    const term = terms.find(t => t.id === termNum);

    // Build rows from enrollments for this term, augmented with student info
    const rows = enrollments
      .filter(e => e.term_id === termNum)
      .map(e => {
        const st = e.school_students || students.find(s => s.id === e.student_id);
        const paid = getPaidForEnrollment(e.student_id, termNum);
        const due = Number(term?.fee_amount || 0);
        const balance = due - paid;
        const status = getStatus(due, paid);
        return {
          enrId: e.id,
          studentId: e.student_id,
          admNo: st?.admission_number || '-',
          name: st ? `${st.first_name} ${st.last_name}` : '-',
          formId: st?.form_id,
          streamId: st?.stream_id,
          formName: getFormName(st?.form_id),
          streamName: getStreamName(st?.stream_id),
          termName: `${e.school_remedial_terms?.term_name || term?.term_name || ''}`,
          due, paid, balance, status,
          enrolledAt: e.enrolled_at,
        };
      });

    // Filters
    return rows.filter(r => {
      if (rosterForm && String(r.formId) !== rosterForm) return false;
      if (rosterStream && String(r.streamId) !== rosterStream) return false;
      if (rosterSearch) {
        const q = rosterSearch.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.admNo.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dir = rosterSort.dir === 'asc' ? 1 : -1;
      if (rosterSort.col === 'name') return a.name.localeCompare(b.name) * dir;
      if (rosterSort.col === 'admNo') return a.admNo.localeCompare(b.admNo) * dir;
      if (rosterSort.col === 'form') return a.formName.localeCompare(b.formName) * dir;
      if (rosterSort.col === 'due') return (a.due - b.due) * dir;
      if (rosterSort.col === 'paid') return (a.paid - b.paid) * dir;
      if (rosterSort.col === 'balance') return (a.balance - b.balance) * dir;
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, payments, rosterTerm, rosterForm, rosterStream, rosterSearch, rosterSort, students, forms, streams, terms]);

  const rosterStats = useMemo(() => {
    const all = rosterData;
    return {
      total: all.length,
      fullyPaid: all.filter(r => r.paid >= r.due && r.due > 0).length,
      partial: all.filter(r => r.paid > 0 && r.paid < r.due).length,
      notPaid: all.filter(r => r.paid <= 0).length,
      totalDue: all.reduce((s, r) => s + r.due, 0),
      totalPaid: all.reduce((s, r) => s + r.paid, 0),
      totalBalance: all.reduce((s, r) => s + r.balance, 0),
    };
  }, [rosterData]);

  // Sort toggle
  const toggleSort = (col: string) => {
    setRosterSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  };
  const SortIcon = ({ col }: { col: string }) => (
    <span style={{ marginLeft: 4, opacity: rosterSort.col === col ? 1 : 0.3 }}>
      {rosterSort.col === col && rosterSort.dir === 'desc' ? <FiChevronDown size={11} /> : <FiChevronUp size={11} />}
    </span>
  );

  // â”€â”€ QUICK PAY SUBMIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitQuickPay = async () => {
    if (!quickPayTarget || !qpAmount) return toast.error('Enter amount');
    const amt = Number(qpAmount);
    if (amt <= 0) return toast.error('Invalid amount');
    setQpSaving(true);
    const { error } = await supabase.from('school_remedial_payments').insert([{
      student_id: quickPayTarget.studentId,
      term_id: Number(rosterTerm),
      amount: amt,
      payment_method: qpMethod,
      receipt_number: qpReceipt || genReceipt(),
      notes: qpNotes || null,
    }]);
    if (error) { toast.error('Payment failed: ' + error.message); setQpSaving(false); return; }

    // Check carryforward: if overpaid, auto-enroll into next term
    const newPaid = quickPayTarget.paid + amt;
    const credit = newPaid - quickPayTarget.due;
    if (credit > 0) {
      const sortedTerms = [...terms].sort((a, b) => a.id - b.id);
      const currentIdx = sortedTerms.findIndex(t => t.id === Number(rosterTerm));
      const nextTerm = sortedTerms[currentIdx + 1];
      if (nextTerm) {
        const alreadyEnrolled = enrollments.find(e => e.student_id === quickPayTarget.studentId && e.term_id === nextTerm.id);
        if (!alreadyEnrolled) {
          await supabase.from('school_remedial_enrollments').insert([{
            student_id: quickPayTarget.studentId,
            term_id: nextTerm.id,
          }]).then(({ error: e2 }) => {
            if (!e2) toast(`KES ${credit.toLocaleString()} credit noted for ${nextTerm.term_name}`, { icon: 'ðŸ’³' });
          });
        }
      }
    }

    toast.success(`âœ… KES ${amt.toLocaleString()} recorded`);
    setQuickPayTarget(null); setQpAmount(''); setQpReceipt(''); setQpNotes('');
    fetchAll(true);
    setQpSaving(false);
  };

  // â”€â”€ EDIT ENROLLMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitEdit = async () => {
    if (!editTarget) return;
    const amt = Number(editAmount);
    if (!amt || amt <= 0) return toast.error('Enter valid amount');
    setEditSaving(true);
    // amount_due does not exist on enrollments â€” update the term fee instead
    const termId = Number(rosterTerm);
    const { error } = await supabase.from('school_remedial_terms').update({ fee_amount: amt }).eq('id', termId);
    if (error) { toast.error('Update failed: ' + error.message); setEditSaving(false); return; }
    toast.success('Term fee updated for all students in this term');
    setEditTarget(null); fetchAll(true); setEditSaving(false);
  };

  // â”€â”€ DELETE ENROLLMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete payments first then enrollment
    await supabase.from('school_remedial_payments').delete().eq('student_id', deleteTarget.studentId).eq('term_id', Number(rosterTerm));
    const { error } = await supabase.from('school_remedial_enrollments').delete().eq('id', deleteTarget.enrId);
    if (error) { toast.error('Delete failed: ' + error.message); setDeleting(false); return; }
    toast.success('Enrollment removed');
    setDeleteTarget(null); fetchAll(true); setDeleting(false);
  };

  // â”€â”€ RECORD PAYMENT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredStudents = search.length >= 2 ? students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8) : [];

  const getStudentBalance = (studentId: number, termId: number) => {
    const enr = enrollments.find(e => e.student_id === studentId && e.term_id === termId);
    if (!enr) return null;
    const due = Number(terms.find(t => t.id === termId)?.fee_amount || 0);
    const paid = getPaidForEnrollment(studentId, termId);
    return { due, paid, balance: due - paid };
  };

  const handleEnrollAndPay = async () => {
    if (!selStudent || !selTermId) { toast.error('Select student and term'); return; }
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
    setPaying(true);
    const termId = Number(selTermId);
    const term = terms.find(t => t.id === termId);
    const existing = enrollments.find(e => e.student_id === selStudent.id && e.term_id === termId);
    if (!existing) {
      const { error: enrErr } = await supabase.from('school_remedial_enrollments').insert([{
        student_id: selStudent.id, term_id: termId
      }]);
      if (enrErr && !enrErr.message.includes('duplicate')) {
        toast.error('Enrollment failed: ' + enrErr.message); setPaying(false); return;
      }
    }
    const receiptNo = payReceipt || genReceipt();
    const { error } = await supabase.from('school_remedial_payments').insert([{
      student_id: selStudent.id, term_id: termId, amount: amt,
      payment_method: payMethod, receipt_number: receiptNo,
      notes: payNotes || null
    }]);
    if (error) { toast.error('Payment failed: ' + error.message); setPaying(false); return; }
    toast.success(`KES ${amt.toLocaleString()} recorded for ${selStudent.first_name} ${selStudent.last_name}`);
    setPayAmount(''); setPayReceipt(''); setPayNotes(''); setSelStudent(null); setSearch('');
    fetchAll(true); setPaying(false);
  };

  // â”€â”€ MASS ENROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMassEnroll = async () => {
    if (!massEnrollTerm) return toast.error('Select term');
    setMassEnrolling(true);
    const termNum = Number(massEnrollTerm);
    const term = terms.find(t => t.id === termNum);
    let filtered = students.filter(s => {
      if (massEnrollForm && String(s.form_id) !== massEnrollForm) return false;
      if (massEnrollStream && String(s.stream_id) !== massEnrollStream) return false;
      return true;
    });
    const alreadyEnrolled = new Set(enrollments.filter(e => e.term_id === termNum).map(e => e.student_id));
    const toEnroll = filtered.filter(s => !alreadyEnrolled.has(s.id));
    if (toEnroll.length === 0) { toast('All selected students already enrolled'); setMassEnrolling(false); return; }
    const inserts = toEnroll.map(s => ({
      student_id: s.id, term_id: termNum
    }));
    const { error } = await supabase.from('school_remedial_enrollments').insert(inserts);
    if (error) { toast.error('Mass enroll failed: ' + error.message); setMassEnrolling(false); return; }
    toast.success(`${toEnroll.length} students enrolled for ${term?.term_name}`);
    fetchAll(true); setMassEnrolling(false);
  };

  // â”€â”€ CREATE TERM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCreateTerm = async () => {
    if (!newTermName || !newTermFee) return toast.error('Fill all term fields');
    setNewTermSaving(true);
    const fullName = newTermYear ? `${newTermName} ${newTermYear}` : newTermName;
    const { error } = await supabase.from('school_remedial_terms').insert([{
      term_name: fullName, fee_amount: Number(newTermFee)
    }]);
    if (error) { toast.error('Failed: ' + error.message); setNewTermSaving(false); return; }
    toast.success(`Term "${fullName}" created`);
    setNewTermName(''); setNewTermSaving(false); fetchAll(true);
  };

  // â”€â”€ UPDATE TERM FEE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUpdateTermFee = async () => {
    if (!editTerm || !editTermFee) return;
    const { error } = await supabase.from('school_remedial_terms').update({ fee_amount: Number(editTermFee) }).eq('id', editTerm.id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Fee updated');
    setEditTerm(null); fetchAll(true);
  };

  // â”€â”€ REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rptPayments = payments.filter(p => {
    if (rptTerm && p.term_id !== Number(rptTerm)) return false;
    const d = new Date(p.payment_date || p.created_at).toISOString().split('T')[0];
    if (d < rptDateFrom || d > rptDateTo) return false;
    const st = p.school_students;
    if (rptForm && st?.form_id !== Number(rptForm)) return false;
    if (rptStream && st?.stream_id !== Number(rptStream)) return false;
    return true;
  });
  const rptTotal = rptPayments.reduce((s, p) => s + Number(p.amount), 0);

  // â”€â”€ BALANCES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const balanceData = useMemo(() => {
    return enrollments.filter(e => {
      if (balTerm && e.term_id !== Number(balTerm)) return false;
      const st = e.school_students;
      if (balForm && st?.form_id !== Number(balForm)) return false;
      if (balStream && st?.stream_id !== Number(balStream)) return false;
      if (balSearch) {
        const q = balSearch.toLowerCase();
        const name = `${st?.first_name || ''} ${st?.last_name || ''} ${st?.admission_number || ''}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    }).map(e => {
      const due = Number(terms.find(t => t.id === e.term_id)?.fee_amount || 0);
      const paid = getPaidForEnrollment(e.student_id, e.term_id);
      return { ...e, due, paid, balance: due - paid, amount_due: due, status: getStatus(due, paid) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, payments, balTerm, balForm, balStream, balSearch, terms]);

  const totalDue = balanceData.reduce((s, b) => s + b.due, 0);
  const totalPaid2 = balanceData.reduce((s, b) => s + b.paid, 0);
  const totalBal = balanceData.reduce((s, b) => s + b.balance, 0);

  // â”€â”€ EXPORT CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const exportCSV = (data: any[], filename: string, headers: string[], rowFn: (item: any, i: number) => any[]) => {
    const rows = data.map((d, i) => rowFn(d, i));
    const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename; a.click(); toast.success('Exported');
  };

  // â”€â”€ STATEMENT DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stmtFilteredStudents = stmtSearch.length >= 2 ? students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(stmtSearch.toLowerCase())
  ).slice(0, 8) : [];
  const stmtPayments = stmtStudent ? payments.filter(p => p.student_id === stmtStudent.id) : [];
  const stmtEnrollments = stmtStudent ? enrollments.filter(e => e.student_id === stmtStudent.id) : [];

  // â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const TABS: { key: RemTab; label: string; icon: any }[] = [
    { key: 'roster', label: 'ðŸ“Š Class Roster', icon: FiGrid },
    { key: 'pay', label: 'ðŸ’³ Record Payment', icon: FiDollarSign },
    { key: 'statement', label: 'ðŸ“„ Statement', icon: FiUser },
    { key: 'reports', label: 'ðŸ“ˆ Reports', icon: FiBarChart2 },
    { key: 'balances', label: 'âš–ï¸ Balances', icon: FiList },
    { key: 'settings', label: 'âš™ï¸ Settings', icon: FiSettings },
  ];

  // â”€â”€ HEADER STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allPaid = enrollments.reduce((s, e) => s + getPaidForEnrollment(e.student_id, e.term_id), 0);
  const allBal = enrollments.reduce((s, e) => {
    const fee = Number(terms.find(t => t.id === e.term_id)?.fee_amount || 0);
    return s + Math.max(0, fee - getPaidForEnrollment(e.student_id, e.term_id));
  }, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading Remedial Program...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24 }}>

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiBookOpen style={{ color: '#7c3aed' }} /> Remedial Program Management
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>Fee collection, balances, student roster & payment tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => fetchAll(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
            <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <div style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800 }}>
            <FiUsers style={{ display: 'inline', marginRight: 4 }} size={13} />{enrollments.length} Enrolled
          </div>
          <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800 }}>
            KES {allPaid.toLocaleString()} Collected
          </div>
          <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800 }}>
            KES {Math.max(0, allBal).toLocaleString()} Pending
          </div>
        </div>
      </div>

      {/* â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: tab === t.key ? 'linear-gradient(135deg,#7c3aed,#6366f1)' : '#fff',
              color: tab === t.key ? '#fff' : '#475569',
              boxShadow: tab === t.key ? '0 4px 12px rgba(124,58,237,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: CLASS ROSTER (Premium Data Grid)                                 */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters row */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '14px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Term *</label>
                <select value={rosterTerm} onChange={e => setRosterTerm(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  <option value="">Select term...</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year} â€” KES {Number(t.fee_amount).toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Form / Grade</label>
                <select value={rosterForm} onChange={e => setRosterForm(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <option value="">All Forms</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.form_name || `Form ${f.form_level}`}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Stream</label>
                <select value={rosterStream} onChange={e => setRosterStream(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <option value="">All Streams</option>
                  {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Search Student</label>
                <div style={{ position: 'relative' }}>
                  <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)} placeholder="Name or admission number..."
                    style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => exportCSV(rosterData, `remedial_roster_${rosterTerm}.csv`,
                  ['#', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Amount Due', 'Paid', 'Balance', 'Status'],
                  (r, i) => [i+1, r.admNo, r.name, r.formName, r.streamName, r.termName, r.due, r.paid, r.balance, r.status.label]
                )} style={{ width: '100%', padding: '8px 12px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#475569' }}>
                  <FiDownload size={13} /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
            <StatCard label="Total Students" value={String(rosterStats.total)} icon="ðŸ‘¥" color="#7c3aed" />
            <StatCard label="Fully Paid" value={String(rosterStats.fullyPaid)} icon="âœ…" color="#059669" />
            <StatCard label="Partial" value={String(rosterStats.partial)} icon="âš ï¸" color="#d97706" />
            <StatCard label="Not Paid" value={String(rosterStats.notPaid)} icon="âŒ" color="#dc2626" />
            <StatCard label="Total Due" value={`KES ${rosterStats.totalDue.toLocaleString()}`} icon="ðŸ’°" color="#1e40af" />
            <StatCard label="Collected" value={`KES ${rosterStats.totalPaid.toLocaleString()}`} icon="ðŸ’µ" color="#059669" />
            <StatCard label="Outstanding" value={`KES ${Math.max(0, rosterStats.totalBalance).toLocaleString()}`} icon="âš–ï¸" color="#dc2626" />
          </div>

          {/* Premium Data Grid */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiGrid size={15} style={{ color: '#7c3aed' }} /> Student Roster â€” {rosterData.length} student{rosterData.length !== 1 ? 's' : ''}
              </div>
              {rosterTerm && (
                <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>
                  {terms.find(t => String(t.id) === rosterTerm)?.term_name} {terms.find(t => String(t.id) === rosterTerm)?.year}
                  {' '}&nbsp;â€¢&nbsp; Fee: KES {Number(terms.find(t => String(t.id) === rosterTerm)?.fee_amount || 0).toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>#</th>
                    <th onClick={() => toggleSort('admNo')} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Adm No <SortIcon col="admNo" /></th>
                    <th onClick={() => toggleSort('name')} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Student Name <SortIcon col="name" /></th>
                    <th onClick={() => toggleSort('form')} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Form <SortIcon col="form" /></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Stream</th>
                    <th onClick={() => toggleSort('due')} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Amount Due <SortIcon col="due" /></th>
                    <th onClick={() => toggleSort('paid')} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Paid <SortIcon col="paid" /></th>
                    <th onClick={() => toggleSort('balance')} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Balance <SortIcon col="balance" /></th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                      {rosterTerm ? 'No students enrolled for this term. Go to Settings â†’ Mass Enroll to load students.' : 'Select a term to view the class roster.'}
                    </td></tr>
                  ) : rosterData.map((r, i) => {
                    // Progress bar width
                    const pct = r.due > 0 ? Math.min(100, Math.round((r.paid / r.due) * 100)) : 0;
                    return (
                      <tr key={r.enrId} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc')}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace', fontSize: 11 }}>{r.admNo}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                              {r.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{r.formName}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#475569', fontWeight: 600 }}>{r.streamName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>KES {r.due.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#059669' }}>KES {r.paid.toLocaleString()}</div>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 3, minWidth: 60 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#059669' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: r.balance > 0 ? '#dc2626' : r.balance < 0 ? '#7c3aed' : '#059669' }}>
                          KES {Math.abs(r.balance).toLocaleString()}{r.balance < 0 ? ' CR' : ''}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ background: r.status.bg, color: r.status.color, border: `1.5px solid ${r.status.border}`, borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {r.status.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                            {/* Quick Pay */}
                            <button onClick={() => { setQuickPayTarget(r); setQpAmount(String(Math.max(0, r.balance))); }}
                              title="Quick Pay"
                              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700 }}>
                              <FiZap size={11} /> Pay
                            </button>
                            {/* View Statement */}
                            <button onClick={() => { setStmtTarget(r); }}
                              title="View Statement"
                              style={{ background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <FiEye size={12} />
                            </button>
                            {/* Edit amount */}
                            <button onClick={() => { setEditTarget(r); setEditAmount(String(r.due)); }}
                              title="Edit Amount Due"
                              style={{ background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <FiEdit2 size={12} />
                            </button>
                            {/* Delete */}
                            <button onClick={() => setDeleteTarget(r)}
                              title="Remove Enrollment"
                              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rosterData.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', fontWeight: 900 }}>
                      <td colSpan={5} style={{ padding: '10px 12px', fontSize: 12, color: '#6d28d9', textAlign: 'right' }}>TOTALS ({rosterData.length} students):</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#1e293b' }}>KES {rosterStats.totalDue.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#059669' }}>KES {rosterStats.totalPaid.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#dc2626' }}>KES {Math.max(0, rosterStats.totalBalance).toLocaleString()}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: RECORD PAYMENT                                                    */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'pay' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', borderRadius: 12, padding: '16px 20px', color: '#fff', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 900, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FiDollarSign size={18} /> Record Remedial Payment</h3>
            <p style={{ opacity: 0.85, fontSize: 12, margin: '4px 0 0' }}>Search student, select term, enter amount. Overpayments carry forward automatically.</p>
          </div>

          {/* Student search */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Search Student *</label>
            <div style={{ position: 'relative' }}>
              <FiSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setSelStudent(null); }} placeholder="Type admission number or student name..."
                style={{ width: '100%', paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11, border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {filteredStudents.length > 0 && !selStudent && (
              <div style={{ marginTop: 4, border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', background: '#fff', maxHeight: 220, overflowY: 'auto' }}>
                {filteredStudents.map(s => (
                  <button key={s.id} onClick={() => { setSelStudent(s); setSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700 }}>{s.admission_number}</span>
                      <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                      <span>{s.first_name} {s.last_name}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>{getFormName(s.form_id)} â€¢ {getStreamName(s.stream_id)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected student card */}
          {selStudent && (
            <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, flexShrink: 0 }}>
                {selStudent.first_name?.[0]}{selStudent.last_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', margin: '0 0 4px' }}>{selStudent.first_name} {selStudent.last_name}</h4>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569', flexWrap: 'wrap' }}>
                  <span><b>Adm:</b> {selStudent.admission_number}</span>
                  <span><b>Form:</b> {getFormName(selStudent.form_id)}</span>
                  <span><b>Stream:</b> {getStreamName(selStudent.stream_id)}</span>
                </div>
                {selTermId && (() => {
                  const bal = getStudentBalance(selStudent.id, Number(selTermId));
                  return bal ? (
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: '#1e40af' }}>Due: <b>KES {bal.due.toLocaleString()}</b></span>
                      <span style={{ color: '#059669' }}>Paid: <b>KES {bal.paid.toLocaleString()}</b></span>
                      <span style={{ color: bal.balance > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>Balance: KES {bal.balance.toLocaleString()}</span>
                    </div>
                  ) : <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Not yet enrolled for this term â€” will auto-enroll on payment</p>;
                })()}
              </div>
              <button onClick={() => { setSelStudent(null); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={18} /></button>
            </div>
          )}

          {/* Term, Amount, Method */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Remedial Term *</label>
              <select value={selTermId} onChange={e => setSelTermId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year} (KES {Number(t.fee_amount).toLocaleString()})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Amount (KES) *</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 1500"
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {DEFAULT_AMOUNTS.map(a => <button key={a} onClick={() => setPayAmount(String(a))}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: payAmount === String(a) ? '#7c3aed' : '#fff', color: payAmount === String(a) ? '#fff' : '#475569', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{a.toLocaleString()}</button>)}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Receipt No. <span style={{ color: '#7c3aed', fontWeight: 600, textTransform: 'none' }}>(auto if blank)</span></label>
              <input type="text" value={payReceipt} onChange={e => setPayReceipt(e.target.value)} placeholder="Auto-generated: REM-YYYYMMDD-XXXX"
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notes</label>
              <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional notes..."
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={handleEnrollAndPay} disabled={paying || !selStudent || !payAmount}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 900, cursor: paying || !selStudent || !payAmount ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: paying || !selStudent || !payAmount ? 0.6 : 1, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' }}>
            {paying ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Processing...</> : <><FiCheckCircle size={16} /> Record Payment</>}
          </button>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: STATEMENT                                                          */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'statement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Search Student</label>
            <div style={{ position: 'relative' }}>
              <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={stmtSearch} onChange={e => { setStmtSearch(e.target.value); setStmtStudent(null); }} placeholder="Type admission number or student name..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {stmtFilteredStudents.length > 0 && !stmtStudent && (
              <div style={{ marginTop: 4, border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff', maxHeight: 200, overflowY: 'auto' }}>
                {stmtFilteredStudents.map(s => (
                  <button key={s.id} onClick={() => { setStmtStudent(s); setStmtSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12 }}>
                    <b>{s.admission_number}</b> | {s.first_name} {s.last_name} <span style={{ color: '#94a3b8', fontSize: 11 }}>{getFormName(s.form_id)} â€¢ {getStreamName(s.stream_id)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {stmtStudent && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', padding: '16px 20px', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
                  {stmtStudent.first_name?.[0]}{stmtStudent.last_name?.[0]}
                </div>
                <div>
                  <h3 style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', margin: 0 }}>{stmtStudent.first_name} {stmtStudent.last_name}</h3>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>Adm: {stmtStudent.admission_number} | {getFormName(stmtStudent.form_id)} | {getStreamName(stmtStudent.stream_id)}</p>
                </div>
              </div>
              {stmtEnrollments.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No remedial enrollments found for this student.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, padding: 16 }}>
                    {stmtEnrollments.map(e => {
                      const b = getStudentBalance(stmtStudent.id, e.term_id);
                      const t = e.school_remedial_terms;
                      const st = getStatus(b?.due || 0, b?.paid || 0);
                      return (
                        <div key={e.id} style={{ border: `1.5px solid ${st.border}`, borderRadius: 12, padding: 14, background: st.bg }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>{t?.term_name} {t?.year}</div>
                          <div style={{ fontSize: 10, background: st.bg, color: st.color, border: `1.5px solid ${st.border}`, borderRadius: 6, padding: '2px 8px', display: 'inline-block', fontWeight: 800, marginBottom: 8 }}>{st.label}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Due:</span><span style={{ fontWeight: 800 }}>KES {b?.due.toLocaleString()}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Paid:</span><span style={{ fontWeight: 800, color: '#059669' }}>KES {b?.paid.toLocaleString()}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 2 }}><span style={{ color: '#64748b' }}>Balance:</span><span style={{ fontWeight: 900, color: (b?.balance || 0) > 0 ? '#dc2626' : '#059669' }}>KES {b?.balance.toLocaleString()}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <h4 style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 10 }}>Full Payment History</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          {['#', 'Date', 'Term', 'Amount', 'Method', 'Receipt', 'Notes'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stmtPayments.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No payments recorded</td></tr> :
                          stmtPayments.map((p, i) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{i + 1}</td>
                              <td style={{ padding: '8px 10px' }}>{new Date(p.payment_date || p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td style={{ padding: '8px 10px' }}>{p.school_remedial_terms?.term_name} {p.school_remedial_terms?.year}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>KES {Number(p.amount).toLocaleString()}</td>
                              <td style={{ padding: '8px 10px' }}><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{p.payment_method}</span></td>
                              <td style={{ padding: '8px 10px', fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{p.receipt_number || '-'}</td>
                              <td style={{ padding: '8px 10px', fontSize: 11, color: '#64748b' }}>{p.notes || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: REPORTS                                                            */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {[
                { label: 'Term', state: rptTerm, set: setRptTerm, opts: [{ v: '', l: 'All Terms' }, ...terms.map(t => ({ v: String(t.id), l: `${t.term_name} ${t.year}` }))] },
                { label: 'Form', state: rptForm, set: setRptForm, opts: [{ v: '', l: 'All Forms' }, ...forms.map(f => ({ v: String(f.id), l: f.form_name }))] },
                { label: 'Stream', state: rptStream, set: setRptStream, opts: [{ v: '', l: 'All Streams' }, ...streams.map(s => ({ v: String(s.id), l: s.stream_name }))] },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <select value={f.state} onChange={e => f.set(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={rptDateFrom} onChange={e => setRptDateFrom(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={rptDateTo} onChange={e => setRptDateTo(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => exportCSV(rptPayments, `remedial_payments.csv`,
                  ['#', 'Date', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Amount', 'Method', 'Receipt'],
                  (p, i) => { const st = p.school_students; return [i+1, new Date(p.payment_date||p.created_at).toLocaleDateString(), st?.admission_number||'', st ? `${st.first_name} ${st.last_name}` : '', getFormName(st?.form_id), getStreamName(st?.stream_id), `${p.school_remedial_terms?.term_name} ${p.school_remedial_terms?.year}`, p.amount, p.payment_method, p.receipt_number||'']; }
                )} style={{ width: '100%', padding: '8px 12px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FiDownload size={13} /> Export CSV
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <StatCard label="Payments" value={String(rptPayments.length)} icon="ðŸ“‹" color="#7c3aed" />
            <StatCard label="Total Collected" value={`KES ${rptTotal.toLocaleString()}`} icon="ðŸ’µ" color="#059669" />
            <StatCard label="Unique Students" value={String(new Set(rptPayments.map(p => p.student_id)).size)} icon="ðŸ‘¥" color="#1e40af" />
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: 13, color: '#1e293b' }}>
              Payment Records â€” {rptPayments.length}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Date', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Amount', 'Method', 'Receipt'].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rptPayments.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No payments found</td></tr> :
                    rptPayments.map((p, i) => {
                      const st = p.school_students;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '9px 10px', color: '#94a3b8' }}>{i+1}</td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{new Date(p.payment_date||p.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace', fontSize: 11 }}>{st?.admission_number||'-'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{st ? `${st.first_name} ${st.last_name}` : '-'}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{getFormName(st?.form_id)}</span></td>
                          <td style={{ padding: '9px 10px', fontSize: 11, color: '#475569' }}>{getStreamName(st?.stream_id)}</td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', fontSize: 11 }}>{p.school_remedial_terms?.term_name} {p.school_remedial_terms?.year}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>KES {Number(p.amount).toLocaleString()}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{p.payment_method}</span></td>
                          <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{p.receipt_number||'-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
                {rptPayments.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f5f3ff', fontWeight: 900 }}>
                      <td colSpan={7} style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#6d28d9' }}>TOTAL:</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 13, color: '#059669' }}>KES {rptTotal.toLocaleString()}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: BALANCES                                                           */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'balances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {[
                { label: 'Term', state: balTerm, set: setBalTerm, opts: [{ v: '', l: 'All Terms' }, ...terms.map(t => ({ v: String(t.id), l: `${t.term_name} ${t.year}` }))] },
                { label: 'Form', state: balForm, set: setBalForm, opts: [{ v: '', l: 'All Forms' }, ...forms.map(f => ({ v: String(f.id), l: f.form_name }))] },
                { label: 'Stream', state: balStream, set: setBalStream, opts: [{ v: '', l: 'All Streams' }, ...streams.map(s => ({ v: String(s.id), l: s.stream_name }))] },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <select value={f.state} onChange={e => f.set(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Search</label>
                <div style={{ position: 'relative' }}>
                  <FiSearch size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input value={balSearch} onChange={e => setBalSearch(e.target.value)} placeholder="Name or admission number..."
                    style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => exportCSV(balanceData, 'remedial_balances.csv',
                  ['#', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Due', 'Paid', 'Balance', 'Status'],
                  (b, i) => { const st = b.school_students; const t = b.school_remedial_terms; return [i+1, st?.admission_number||'', st ? `${st.first_name} ${st.last_name}` : '', getFormName(st?.form_id), getStreamName(st?.stream_id), `${t?.term_name} ${t?.year}`, b.amount_due, b.paid, b.balance, b.status.label]; }
                )} style={{ width: '100%', padding: '8px 12px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FiDownload size={13} /> Export
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <StatCard label="Total Due" value={`KES ${totalDue.toLocaleString()}`} icon="ðŸ’°" color="#1e40af" />
            <StatCard label="Total Paid" value={`KES ${totalPaid2.toLocaleString()}`} icon="âœ…" color="#059669" />
            <StatCard label="Outstanding" value={`KES ${Math.max(0, totalBal).toLocaleString()}`} icon="âš ï¸" color="#dc2626" />
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: 13, color: '#1e293b' }}>
              Student Balances â€” {balanceData.length}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Adm No', 'Student', 'Form', 'Stream', 'Term', 'Due', 'Paid', 'Balance', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: ['Due','Paid','Balance'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {balanceData.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No enrollments found</td></tr> :
                    balanceData.map((b, i) => {
                      const st = b.school_students;
                      const t = b.school_remedial_terms;
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: b.balance <= 0 ? '#f0fdf4' : 'transparent' }}>
                          <td style={{ padding: '9px 10px', color: '#94a3b8' }}>{i+1}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace', fontSize: 11 }}>{st?.admission_number||'-'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600 }}>{st ? `${st.first_name} ${st.last_name}` : '-'}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{getFormName(st?.form_id)}</span></td>
                          <td style={{ padding: '9px 10px', fontSize: 11, color: '#475569' }}>{getStreamName(st?.stream_id)}</td>
                          <td style={{ padding: '9px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>{t?.term_name} {t?.year}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800 }}>KES {Number(b.amount_due).toLocaleString()}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>KES {b.paid.toLocaleString()}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: b.balance > 0 ? '#dc2626' : '#059669' }}>KES {Math.abs(b.balance).toLocaleString()}{b.balance < 0 ? ' CR' : ''}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ background: b.status.bg, color: b.status.color, border: `1.5px solid ${b.status.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>{b.status.label}</span></td>
                        </tr>
                      );
                    })}
                </tbody>
                {balanceData.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f5f3ff', fontWeight: 900 }}>
                      <td colSpan={6} style={{ padding: '9px 10px', textAlign: 'right', fontSize: 11, color: '#6d28d9' }}>TOTALS:</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12 }}>KES {totalDue.toLocaleString()}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, color: '#059669' }}>KES {totalPaid2.toLocaleString()}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12, color: '#dc2626' }}>KES {Math.max(0, totalBal).toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: SETTINGS                                                           */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Create new term */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiPlus size={15} style={{ color: '#7c3aed' }} /> Create New Remedial Term</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Term Name *</label>
                <input value={newTermName} onChange={e => setNewTermName(e.target.value)} placeholder="e.g. Term 1, Term 2, Term 3..."
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Year *</label>
                <input type="number" value={newTermYear} onChange={e => setNewTermYear(e.target.value)} placeholder="2024"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Fee Amount (KES) *</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  {DEFAULT_AMOUNTS.map(a => <button key={a} onClick={() => setNewTermFee(String(a))}
                    style={{ padding: '5px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: newTermFee === String(a) ? '#7c3aed' : '#fff', color: newTermFee === String(a) ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {a.toLocaleString()}
                  </button>)}
                </div>
                <input type="number" value={newTermFee} onChange={e => setNewTermFee(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleCreateTerm} disabled={newTermSaving}
                style={{ padding: '11px', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {newTermSaving ? 'Creating...' : 'âœ… Create Term'}
              </button>
            </div>
          </div>

          {/* Existing terms + edit fee */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><FiSettings size={14} style={{ color: '#7c3aed' }} /> Existing Terms & Fees</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {terms.length === 0 && <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>No terms created yet.</p>}
              {terms.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{t.term_name} {t.year}</div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>KES {Number(t.fee_amount).toLocaleString()} / student</div>
                  </div>
                  <button onClick={() => { setEditTerm(t); setEditTermFee(String(t.fee_amount)); }}
                    style={{ background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
                    <FiEdit2 size={11} /> Edit Fee
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mass Enroll */}
          <div style={{ gridColumn: '1/-1', background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><FiUsers size={14} style={{ color: '#7c3aed' }} /> Mass Enroll Students into Term</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Automatically enroll all active students (or a filtered subset) into a remedial term at the term's set fee amount.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Target Term *</label>
                <select value={massEnrollTerm} onChange={e => setMassEnrollTerm(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <option value="">Select term...</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year} â€” KES {Number(t.fee_amount).toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Form / Grade (optional)</label>
                <select value={massEnrollForm} onChange={e => setMassEnrollForm(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <option value="">All Forms</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.form_name || `Form ${f.form_level}`}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Stream (optional)</label>
                <select value={massEnrollStream} onChange={e => setMassEnrollStream(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <option value="">All Streams</option>
                  {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#92400e', marginBottom: 14 }}>
              âš ï¸ This will enroll all active students matching the filter who are NOT yet enrolled in the selected term. Students already enrolled will be skipped.
              &nbsp;â€¢ <b>{students.filter(s => (!massEnrollForm || String(s.form_id) === massEnrollForm) && (!massEnrollStream || String(s.stream_id) === massEnrollStream)).length}</b> students match current filter.
            </div>
            <button onClick={handleMassEnroll} disabled={massEnrolling || !massEnrollTerm}
              style={{ padding: '11px 28px', background: massEnrollTerm ? 'linear-gradient(135deg,#059669,#10b981)' : '#e2e8f0', color: massEnrollTerm ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: massEnrollTerm ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
              {massEnrolling ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Enrolling...</> : <><FiUsers size={14} /> Mass Enroll Students</>}
            </button>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* MODALS                                                                  */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* Quick Pay Modal */}
      <Modal open={!!quickPayTarget} onClose={() => setQuickPayTarget(null)} title={`âš¡ Quick Pay â€” ${quickPayTarget?.name}`}>
        {quickPayTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
              <div><div style={{ fontWeight: 900, fontSize: 16 }}>KES {quickPayTarget.due.toLocaleString()}</div><div style={{ fontSize: 10, color: '#64748b' }}>Amount Due</div></div>
              <div><div style={{ fontWeight: 900, fontSize: 16, color: '#059669' }}>KES {quickPayTarget.paid.toLocaleString()}</div><div style={{ fontSize: 10, color: '#64748b' }}>Paid</div></div>
              <div><div style={{ fontWeight: 900, fontSize: 16, color: quickPayTarget.balance > 0 ? '#dc2626' : '#059669' }}>KES {Math.abs(quickPayTarget.balance).toLocaleString()}</div><div style={{ fontSize: 10, color: '#64748b' }}>{quickPayTarget.balance > 0 ? 'Balance' : 'Credit'}</div></div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>Amount Paying (KES) *</label>
              <input type="number" value={qpAmount} onChange={e => setQpAmount(e.target.value)} placeholder="Enter amount..."
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[quickPayTarget.balance, ...DEFAULT_AMOUNTS].filter((a, i, arr) => a > 0 && arr.indexOf(a) === i).slice(0, 5).map(a => (
                  <button key={a} onClick={() => setQpAmount(String(a))}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: qpAmount === String(a) ? '#7c3aed' : '#fff', color: qpAmount === String(a) ? '#fff' : '#475569', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    {Number(a).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>Payment Method</label>
                <select value={qpMethod} onChange={e => setQpMethod(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                  {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>Receipt No. (auto if blank)</label>
                <input value={qpReceipt} onChange={e => setQpReceipt(e.target.value)} placeholder="Auto-generated"
                  style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>Notes</label>
              <input value={qpNotes} onChange={e => setQpNotes(e.target.value)} placeholder="Optional..."
                style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            {Number(qpAmount) > quickPayTarget.balance && quickPayTarget.balance > 0 && (
              <div style={{ background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#6d28d9' }}>
                ðŸ’³ KES {(Number(qpAmount) - quickPayTarget.balance).toLocaleString()} will be carried forward as credit to the next term automatically.
              </div>
            )}
            <button onClick={submitQuickPay} disabled={qpSaving || !qpAmount}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {qpSaving ? 'Recording...' : <><FiSend size={14} /> Record Payment</>}
            </button>
          </div>
        )}
      </Modal>

      {/* Edit Amount Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`âœï¸ Edit Amount Due â€” ${editTarget?.name}`}>
        {editTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Current amount due: <b>KES {editTarget.due.toLocaleString()}</b></p>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>New Amount Due (KES) *</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {DEFAULT_AMOUNTS.map(a => <button key={a} onClick={() => setEditAmount(String(a))}
                  style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: editAmount === String(a) ? '#7c3aed' : '#fff', color: editAmount === String(a) ? '#fff' : '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {a.toLocaleString()}
                </button>)}
              </div>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="Enter new amount..."
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <button onClick={submitEdit} disabled={editSaving}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              {editSaving ? 'Updating...' : 'âœ… Update Amount'}
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="ðŸ—‘ï¸ Remove Enrollment">
        {deleteTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <FiAlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 800, color: '#1e293b', margin: '0 0 4px', fontSize: 13 }}>This will permanently delete:</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  <li>The enrollment record for <b>{deleteTarget.name}</b></li>
                  <li>All remedial payments made by this student for the selected term</li>
                </ul>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '11px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitDelete} disabled={deleting}
                style={{ padding: '11px', background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {deleting ? 'Deleting...' : 'ðŸ—‘ï¸ Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Term Fee Modal */}
      <Modal open={!!editTerm} onClose={() => setEditTerm(null)} title={`âœï¸ Edit Fee â€” ${editTerm?.term_name} ${editTerm?.year}`}>
        {editTerm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Current fee: <b>KES {Number(editTerm.fee_amount).toLocaleString()}</b></p>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {DEFAULT_AMOUNTS.map(a => <button key={a} onClick={() => setEditTermFee(String(a))}
                  style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: editTermFee === String(a) ? '#7c3aed' : '#fff', color: editTermFee === String(a) ? '#fff' : '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {a.toLocaleString()}
                </button>)}
              </div>
              <input type="number" value={editTermFee} onChange={e => setEditTermFee(e.target.value)} placeholder="New fee amount..."
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleUpdateTermFee} style={{ padding: '11px', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>âœ… Update Fee</button>
          </div>
        )}
      </Modal>

      {/* Statement Modal (from grid) */}
      <Modal open={!!stmtTarget} onClose={() => setStmtTarget(null)} title={`ðŸ“„ Statement â€” ${stmtTarget?.name}`} wide>
        {stmtTarget && (() => {
          const sp = payments.filter(p => p.student_id === stmtTarget.studentId);
          const se = enrollments.filter(e => e.student_id === stmtTarget.studentId);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                {se.map(e => {
                  const paid = getPaidForEnrollment(stmtTarget.studentId, e.term_id);
                  const due = Number(e.amount_due);
                  const st = getStatus(due, paid);
                  const t = e.school_remedial_terms;
                  return (
                    <div key={e.id} style={{ background: st.bg, border: `1.5px solid ${st.border}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', marginBottom: 6 }}>{t?.term_name} {t?.year}</div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b' }}>KES {due.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>Paid: KES {paid.toLocaleString()}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: (due - paid) > 0 ? '#dc2626' : '#059669' }}>Bal: KES {Math.abs(due - paid).toLocaleString()}</div>
                      <div style={{ fontSize: 9, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 4, padding: '1px 6px', display: 'inline-block', marginTop: 4, fontWeight: 800 }}>{st.label}</div>
                    </div>
                  );
                })}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Date', 'Term', 'Amount', 'Method', 'Receipt'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sp.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No payments recorded</td></tr> :
                    sp.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{i+1}</td>
                        <td style={{ padding: '8px 10px' }}>{new Date(p.payment_date || p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '8px 10px', fontSize: 11 }}>{p.school_remedial_terms?.term_name} {p.school_remedial_terms?.year}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>KES {Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 5, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>{p.payment_method}</span></td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{p.receipt_number || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


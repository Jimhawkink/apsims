'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

/* ═══════════════════════════ TYPES ═══════════════════════════ */
interface Student { id: number; first_name: string; last_name: string; admission_no: string; guardian_name: string; guardian_phone: string; form_id: number; stream_id: number; }
interface Term { id: number; term_name: string; is_current: boolean; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; form_id: number; }
interface Installment { id: number; plan_id: number; installment_no: number; due_date: string; amount: number; paid_amount: number; status: string; paid_date: string | null; }
interface Plan { id: number; student_id: number; term_id: number; plan_type: string; total_amount: number; installment_count: number; start_date: string; due_day: number; status: string; notes: string; created_at: string; student?: Student; installments?: Installment[]; }

/* ═══════════════════════════ HELPERS ════════════════════════ */
const F = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const KES = (n: number) => `KES ${Number(n||0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const D = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const daysDiff = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const getPct = (paid: number, total: number) => total > 0 ? Math.min(100, (paid / total) * 100) : 0;
const PLAN_TYPES = ['Monthly', 'Termly', 'Weekly', 'Bi-Monthly', 'Custom'];

function getPlanStatus(plan: Plan): { label: string; color: string; bg: string } {
  const paid = (plan.installments || []).reduce((a, i) => a + Number(i.paid_amount || 0), 0);
  if (paid >= plan.total_amount) return { label: 'Completed', color: '#059669', bg: '#d1fae5' };
  const hasOverdue = (plan.installments || []).some(i => i.status !== 'paid' && daysDiff(i.due_date) > 0);
  if (hasOverdue) return { label: 'Overdue', color: '#dc2626', bg: '#fee2e2' };
  return { label: 'On Track', color: '#4f46e5', bg: '#ede9fe' };
}

/* ═══════════════════════════ SKELETON ════════════════════════ */
function Skeleton({ w, h, r = 6 }: { w: number|string; h: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />;
}

/* ═══════════════════════════ KPI CARD ════════════════════════ */
function KPICard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 160, flex: '1 1 160px' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: color || '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 1 }}>{sub}</div>}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ PROGRESS BAR ════════════════════ */
function ProgressBar({ pct, height = 6, showLabel = false }: { pct: number; height?: number; showLabel?: boolean }) {
  const c = pct >= 80 ? '#059669' : pct >= 50 ? '#4f46e5' : pct >= 25 ? '#f59e0b' : '#dc2626';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height, width: `${pct}%`, background: c, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      {showLabel && <div style={{ fontSize: 10, fontWeight: 700, color: c, marginTop: 2 }}>{pct.toFixed(0)}% paid</div>}
    </div>
  );
}

/* ═══════════════════════════ BADGE ════════════════════════════ */
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>;
}

/* ═══════════════════════════ MODAL ════════════════════════════ */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', fontFamily: F, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ SORT HEADER ══════════════════════ */
function SortTH({ label, field, sort, setSort }: { label: string; field: string; sort: [string, 'asc'|'desc']; setSort: any }) {
  const active = sort[0] === field;
  return (
    <th onClick={() => setSort([field, active && sort[1] === 'asc' ? 'desc' : 'asc'])} style={{ ...TH, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ color: active ? '#4f46e5' : '#cbd5e1', fontSize: 10 }}>{active ? (sort[1] === 'asc' ? '↑' : '↓') : '↕'}</span>
      </div>
    </th>
  );
}

/* ═══════════════════════════ MAIN PAGE ═══════════════════════ */
export default function PaymentPlansPage() {
  /* — state — */
  const [tab, setTab] = useState<'active'|'overdue'|'completed'|'all'|'new'>('active');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<[string, 'asc'|'desc']>(['created_at', 'desc']);
  const [page, setPage] = useState(0);
  const PER_PAGE = 25;

  /* — modals — */
  const [detailPlan, setDetailPlan] = useState<Plan|null>(null);
  const [payModal, setPayModal] = useState<{ plan: Plan; inst: Installment } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [savingPay, setSavingPay] = useState(false);

  /* — new plan — */
  const [np, setNp] = useState({ student_id: '', term_id: '', plan_type: 'Monthly', total_amount: '', installment_count: '3', start_date: new Date().toISOString().slice(0,10), due_day: '5', notes: '' });
  const [preview, setPreview] = useState<{ due_date: string; amount: number }[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDrop, setShowStudentDrop] = useState(false);

  /* — load — */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, fRes, stRes, tRes] = await Promise.all([
        supabase.from('school_payment_plans').select(`*, school_students(id,first_name,last_name,admission_no,guardian_name,guardian_phone,form_id,stream_id), school_plan_installments(*)`).order('id', { ascending: false }),
        supabase.from('school_students').select('id,first_name,last_name,admission_no,guardian_name,guardian_phone,form_id,stream_id').eq('status','Active').order('first_name'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*').order('stream_name'),
        supabase.from('school_terms').select('*').order('id', { ascending: false }),
      ]);
      const raw = (pRes.data || []).map((p: any) => ({ ...p, student: p.school_students, installments: p.school_plan_installments || [] }));
      setPlans(raw);
      setStudents(sRes.data || []);
      setForms(fRes.data || []);
      setStreams(stRes.data || []);
      const tData = tRes.data || [];
      setTerms(tData);
      const cur = tData.find((t: Term) => t.is_current) || tData[0];
      if (cur && !np.term_id) setNp(prev => ({ ...prev, term_id: String(cur.id) }));
    } catch { toast.error('Failed to load plans'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* — kpis — */
  const kpis = useMemo(() => {
    const totalPledged = plans.reduce((a, p) => a + Number(p.total_amount), 0);
    const totalCollected = plans.reduce((a, p) => a + (p.installments||[]).reduce((b, i) => b + Number(i.paid_amount||0), 0), 0);
    const overdue = plans.filter(p => getPlanStatus(p).label === 'Overdue');
    const active = plans.filter(p => getPlanStatus(p).label === 'On Track');
    return { total: plans.length, active: active.length, overdue: overdue.length, totalPledged, totalCollected, pct: getPct(totalCollected, totalPledged) };
  }, [plans]);

  /* — filtered + sorted + paged — */
  const filtered = useMemo(() => {
    let list = plans.map(p => {
      const st = getPlanStatus(p);
      const paid = (p.installments||[]).reduce((a, i) => a + Number(i.paid_amount||0), 0);
      return { ...p, _status: st, _paid: paid, _bal: p.total_amount - paid, _pct: getPct(paid, p.total_amount) };
    });
    if (tab === 'active') list = list.filter(p => p._status.label === 'On Track');
    else if (tab === 'overdue') list = list.filter(p => p._status.label === 'Overdue');
    else if (tab === 'completed') list = list.filter(p => p._status.label === 'Completed');
    if (selForm) list = list.filter(p => String(p.student?.form_id) === selForm);
    if (search) list = list.filter(p => `${p.student?.first_name} ${p.student?.last_name} ${p.student?.admission_no}`.toLowerCase().includes(search.toLowerCase()));
    list.sort((a: any, b: any) => {
      const av = a[sort[0]] ?? (a.student?.[sort[0]] ?? '');
      const bv = b[sort[0]] ?? (b.student?.[sort[0]] ?? '');
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort[1] === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [plans, tab, selForm, search, sort]);

  const pageCount = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  /* — preview schedule — */
  const buildPreview = useCallback(() => {
    const total = parseFloat(np.total_amount) || 0;
    const n = Math.max(1, parseInt(np.installment_count) || 1);
    const amt = parseFloat((total / n).toFixed(2));
    const lastAmt = parseFloat((total - amt * (n - 1)).toFixed(2));
    const start = new Date(np.start_date || new Date().toISOString().slice(0,10));
    const res: { due_date: string; amount: number }[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      if (np.plan_type === 'Monthly' || np.plan_type === 'Bi-Monthly') d.setMonth(d.getMonth() + i * (np.plan_type === 'Bi-Monthly' ? 2 : 1));
      else if (np.plan_type === 'Weekly') d.setDate(d.getDate() + i * 7);
      else if (np.plan_type === 'Termly') d.setMonth(d.getMonth() + i * 4);
      else d.setDate(d.getDate() + i * 30);
      const due = parseInt(np.due_day) || 5;
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(due, maxDay));
      res.push({ due_date: d.toISOString().slice(0,10), amount: i === n - 1 ? lastAmt : amt });
    }
    setPreview(res);
  }, [np]);

  /* — save plan — */
  const savePlan = async () => {
    if (!np.student_id || !np.term_id || !np.total_amount || !np.start_date) { toast.error('Fill all required fields'); return; }
    if (preview.length === 0) { toast.error('Click "Preview Schedule" first'); return; }
    setSavingPlan(true);
    try {
      const { data: plan, error } = await supabase.from('school_payment_plans').insert({
        student_id: parseInt(np.student_id), term_id: parseInt(np.term_id), plan_type: np.plan_type,
        total_amount: parseFloat(np.total_amount), installment_count: parseInt(np.installment_count),
        start_date: np.start_date, due_day: parseInt(np.due_day), status: 'active', notes: np.notes,
      }).select().single();
      if (error) throw error;
      await supabase.from('school_plan_installments').insert(
        preview.map((p, i) => ({ plan_id: plan.id, installment_no: i + 1, due_date: p.due_date, amount: p.amount, paid_amount: 0, status: 'pending' }))
      );
      toast.success('✅ Payment plan created successfully!');
      setNp({ student_id: '', term_id: np.term_id, plan_type: 'Monthly', total_amount: '', installment_count: '3', start_date: new Date().toISOString().slice(0,10), due_day: '5', notes: '' });
      setPreview([]);
      setStudentSearch('');
      setTab('active');
      load();
    } catch (e: any) { toast.error(e.message); }
    setSavingPlan(false);
  };

  /* — record payment — */
  const recordPayment = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) { toast.error('Enter a valid amount'); return; }
    setSavingPay(true);
    const { error } = await supabase.from('school_plan_installments').update({ paid_amount: amt, status: 'paid', paid_date: new Date().toISOString().slice(0,10) }).eq('id', payModal.inst.id);
    if (error) { toast.error(error.message); }
    else { toast.success(`💳 Payment of ${KES(amt)} recorded!`); setPayModal(null); setPayAmount(''); load(); }
    setSavingPay(false);
  };

  /* — export — */
  const exportCSV = () => {
    const rows = [['Plan ID','Student','Adm No','Form','Plan Type','Total Fee','Total Paid','Balance','Status','Next Due'],
      ...filtered.map((p: any) => {
        const form = forms.find(f => f.id === p.student?.form_id);
        const next = (p.installments||[]).find((i: Installment) => i.status !== 'paid');
        return [p.id, `${p.student?.first_name} ${p.student?.last_name}`, p.student?.admission_no, form?.form_name||'', p.plan_type, p.total_amount, p._paid.toFixed(2), p._bal.toFixed(2), p._status.label, next?.due_date||''];
      })];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'payment_plans.csv' });
    a.click(); toast.success('CSV exported');
  };

  /* ═══ filtered students dropdown ═══ */
  const filteredStudents = useMemo(() => students.filter(s => `${s.first_name} ${s.last_name} ${s.admission_no}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0,12), [students, studentSearch]);
  const selStudent = students.find(s => String(s.id) === np.student_id);

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ fontFamily: F, background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} *{box-sizing:border-box}`}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4f46e5 100%)', padding: '28px 32px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Finance Module</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>💳 Fee Payment Plans & Pledges</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Installment tracking · Pledge management · Automated reminders · Demand integration</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={exportCSV} style={HB}>📥 Export CSV</button>
              <button onClick={() => { setTab('new'); setPreview([]); }} style={{ ...HB, background: '#fff', color: '#4f46e5', border: 'none', fontWeight: 900 }}>+ New Plan</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <KPICard icon="📋" label="Total Plans" value={String(kpis.total)} />
            <KPICard icon="✅" label="Active" value={String(kpis.active)} color="#86efac" />
            <KPICard icon="🚨" label="Overdue" value={String(kpis.overdue)} color="#fca5a5" />
            <KPICard icon="💰" label="Total Pledged" value={KES(kpis.totalPledged)} sub={`${kpis.pct.toFixed(0)}% collected`} />
            <KPICard icon="💳" label="Collected" value={KES(kpis.totalCollected)} color="#86efac" />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', overflow: 'auto' }}>
        {[
          { id: 'active', label: `✅ On Track`, count: plans.filter(p => getPlanStatus(p).label === 'On Track').length },
          { id: 'overdue', label: `🚨 Overdue`, count: kpis.overdue },
          { id: 'completed', label: `🏁 Completed`, count: plans.filter(p => getPlanStatus(p).label === 'Completed').length },
          { id: 'all', label: `📋 All Plans`, count: kpis.total },
          { id: 'new', label: `➕ New Plan`, count: null },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); setPage(0); }} style={{ padding: '13px 20px', fontFamily: F, fontSize: 12, fontWeight: 800, background: 'none', border: 'none', borderBottom: tab === t.id ? '3px solid #4f46e5' : '3px solid transparent', color: tab === t.id ? '#4f46e5' : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {t.count !== null && <span style={{ background: tab === t.id ? '#ede9fe' : '#f1f5f9', color: tab === t.id ? '#4f46e5' : '#64748b', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 900 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* ══════════════════ NEW PLAN FORM ══════════════════ */}
        {tab === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* LEFT: form */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin: '0 0 22px', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>📋 Plan Configuration</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Student search */}
                <div>
                  <label style={LB}>Student *</label>
                  <div style={{ position: 'relative' }}>
                    <input value={selStudent ? `${selStudent.first_name} ${selStudent.last_name} (${selStudent.admission_no})` : studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); setNp(p => ({ ...p, student_id: '' })); setShowStudentDrop(true); }}
                      onFocus={() => setShowStudentDrop(true)}
                      placeholder="Search student name or admission no…"
                      style={IN} />
                    {showStudentDrop && filteredStudents.length > 0 && !np.student_id && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 99, maxHeight: 220, overflow: 'auto' }}>
                        {filteredStudents.map(s => (
                          <div key={s.id} onClick={() => { setNp(p => ({ ...p, student_id: String(s.id) })); setStudentSearch(''); setShowStudentDrop(false); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <div><div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.first_name} {s.last_name}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{s.admission_no}</div></div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{forms.find(f => f.id === s.form_id)?.form_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selStudent && <div style={{ marginTop: 6, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>✓ {selStudent.first_name} {selStudent.last_name} · {selStudent.admission_no}</span>
                    <button onClick={() => { setNp(p => ({ ...p, student_id: '' })); setStudentSearch(''); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={LB}>Term *</label><select value={np.term_id} onChange={e => setNp(p => ({ ...p, term_id: e.target.value }))} style={IN}><option value="">— Select term —</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' (Current)' : ''}</option>)}</select></div>
                  <div><label style={LB}>Plan Type</label><select value={np.plan_type} onChange={e => setNp(p => ({ ...p, plan_type: e.target.value }))} style={IN}>{PLAN_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={LB}>Total Amount (KES) *</label><input type="number" value={np.total_amount} onChange={e => setNp(p => ({ ...p, total_amount: e.target.value }))} placeholder="e.g. 45000" style={IN} /></div>
                  <div><label style={LB}>No. of Installments</label><input type="number" value={np.installment_count} onChange={e => setNp(p => ({ ...p, installment_count: e.target.value }))} min={1} max={36} style={IN} /></div>
                  <div><label style={LB}>Start Date *</label><input type="date" value={np.start_date} onChange={e => setNp(p => ({ ...p, start_date: e.target.value }))} style={IN} /></div>
                  <div><label style={LB}>Due Day of Month</label><input type="number" value={np.due_day} onChange={e => setNp(p => ({ ...p, due_day: e.target.value }))} min={1} max={28} style={IN} /></div>
                </div>
                <div><label style={LB}>Notes (optional)</label><textarea value={np.notes} onChange={e => setNp(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="e.g. Student approved for installments by bursar" style={{ ...IN, resize: 'vertical' }} /></div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={buildPreview} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: F, color: '#0f172a' }}>👁 Preview Schedule</button>
                  <button onClick={savePlan} disabled={savingPlan || preview.length === 0} style={{ flex: 1, padding: '11px', background: preview.length > 0 ? '#4f46e5' : '#c7d2fe', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 900, fontSize: 13, cursor: preview.length > 0 ? 'pointer' : 'not-allowed', fontFamily: F }}>
                    {savingPlan ? '⏳ Saving…' : '✅ Create Plan'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: preview */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin: '0 0 22px', fontSize: 16, fontWeight: 900, color: '#0f172a' }}>📅 Installment Schedule Preview</h2>
              {preview.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 56 }}>📅</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#64748b', marginTop: 12 }}>No Preview Yet</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Fill the form and click "Preview Schedule"</div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>{np.plan_type} Plan · {preview.length} installments</div><div style={{ fontSize: 16, fontWeight: 900, color: '#059669', marginTop: 2 }}>{KES(parseFloat(np.total_amount)||0)} total</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#065f46' }}>Per Installment</div><div style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>{KES(preview[0]?.amount||0)}</div></div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>{['#','Due Date','Amount','Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={TC}><span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>#{i+1}</span></td>
                          <td style={{ ...TC, fontWeight: 700 }}>{D(p.due_date)}</td>
                          <td style={{ ...TC, color: '#059669', fontWeight: 900 }}>{KES(p.amount)}</td>
                          <td style={TC}><Badge label="Pending" color="#d97706" bg="#fef3c7" /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background: '#f8fafc', borderTop: '2px solid #4f46e5' }}>
                      <td colSpan={2} style={{ ...TC, fontWeight: 900, textTransform: 'uppercase', fontSize: 11, color: '#0f172a' }}>Total</td>
                      <td style={{ ...TC, color: '#4f46e5', fontWeight: 900, fontSize: 15 }}>{KES(preview.reduce((a,p) => a+p.amount, 0))}</td>
                      <td style={TC} />
                    </tr></tfoot>
                  </table>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ PLANS LIST ══════════════════ */}
        {tab !== 'new' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="🔍 Search student name or admission no…" style={{ ...IN, flex: 1, minWidth: 260 }} />
              <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ ...IN, width: 150 }}><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
              {selected.size > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => toast.success(`📲 Sending SMS reminders to ${selected.size} plan holders…`)} style={AB('#4f46e5')}>📲 SMS {selected.size}</button>
                  <button onClick={() => { setSelected(new Set()); }} style={AB('#dc2626')}>✕ Deselect</button>
                </div>
              )}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 700 }}>{filtered.length} plans</div>
            </div>

            {loading ? (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <Skeleton w={120} h={14} /><Skeleton w={80} h={14} /><Skeleton w={90} h={14} /><Skeleton w={90} h={14} /><Skeleton w={100} h={6} r={99} /><Skeleton w={60} h={22} r={99} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 0', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 56 }}>💳</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 12 }}>No Plans Found</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                  {tab === 'overdue' ? 'No overdue plans! Great work! 🎉' : 'No payment plans match your filters.'}
                </div>
                <button onClick={() => setTab('new')} style={{ marginTop: 16, background: '#4f46e5', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: F }}>+ Create First Plan</button>
              </div>
            ) : (
              <>
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ ...TH, width: 40 }}><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(paged.map(p => p.id)) : new Set())} /></th>
                        <SortTH label="Student" field="student_id" sort={sort} setSort={setSort} />
                        <SortTH label="Plan Type" field="plan_type" sort={sort} setSort={setSort} />
                        <SortTH label="Total Fee" field="total_amount" sort={sort} setSort={setSort} />
                        <SortTH label="Paid" field="_paid" sort={sort} setSort={setSort} />
                        <SortTH label="Balance" field="_bal" sort={sort} setSort={setSort} />
                        <th style={{ ...TH, minWidth: 120 }}>Progress</th>
                        <th style={TH}>Next Due</th>
                        <th style={TH}>Status</th>
                        <th style={{ ...TH, minWidth: 180 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paged as any[]).map((plan, i) => {
                        const nextDue = (plan.installments||[]).find((ins: Installment) => ins.status !== 'paid');
                        const isOverdue = nextDue && daysDiff(nextDue.due_date) > 0;
                        const form = forms.find(f => f.id === plan.student?.form_id);
                        return (
                          <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')} onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc')}>
                            <td style={TC}><input type="checkbox" checked={selected.has(plan.id)} onChange={e => { const s = new Set(selected); e.target.checked ? s.add(plan.id) : s.delete(plan.id); setSelected(s); }} /></td>
                            <td style={TC}>
                              <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a' }}>{plan.student?.first_name} {plan.student?.last_name}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{plan.student?.admission_no} · {form?.form_name}</div>
                            </td>
                            <td style={TC}><Badge label={plan.plan_type} color="#6d28d9" bg="#ede9fe" /></td>
                            <td style={{ ...TC, fontWeight: 800 }}>{KES(plan.total_amount)}</td>
                            <td style={{ ...TC, color: '#059669', fontWeight: 800 }}>{KES(plan._paid)}</td>
                            <td style={{ ...TC, color: plan._bal > 0 ? '#dc2626' : '#059669', fontWeight: 900 }}>{KES(plan._bal)}</td>
                            <td style={{ ...TC, minWidth: 120 }}><ProgressBar pct={plan._pct} showLabel /></td>
                            <td style={TC}>
                              {nextDue ? (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? '#dc2626' : '#0f172a' }}>{D(nextDue.due_date)}</div>
                                  {isOverdue && <div style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>⚠ {daysDiff(nextDue.due_date)}d overdue</div>}
                                </div>
                              ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={TC}><Badge label={plan._status.label} color={plan._status.color} bg={plan._status.bg} /></td>
                            <td style={TC}>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <button onClick={() => setDetailPlan(plan)} style={AB2('#4f46e5')}>📄 Details</button>
                                {nextDue && plan._bal > 0 && <button onClick={() => { setPayModal({ plan, inst: nextDue }); setPayAmount(String(nextDue.amount)); }} style={AB2('#059669')}>💳 Pay</button>}
                                <button onClick={() => toast.success(`📲 SMS sent to ${plan.student?.guardian_phone}`)} style={AB2('#0ea5e9')}>📲</button>
                                {isOverdue && <button onClick={() => toast.success('📨 Demand letter generated')} style={AB2('#dc2626')}>📨</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {pageCount > 1 && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Showing {page*PER_PAGE+1}–{Math.min((page+1)*PER_PAGE, filtered.length)} of {filtered.length}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} style={PGB}>← Prev</button>
                        {Array.from({ length: Math.min(7, pageCount) }, (_,i) => i + Math.max(0, page - 3)).filter(i => i < pageCount).map(i => (
                          <button key={i} onClick={() => setPage(i)} style={{ ...PGB, background: page===i ? '#4f46e5':'#fff', color: page===i?'#fff':'#64748b', borderColor: page===i?'#4f46e5':'#e2e8f0' }}>{i+1}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(pageCount-1,p+1))} disabled={page>=pageCount-1} style={PGB}>Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ══ Detail Modal ══ */}
      <Modal open={!!detailPlan} onClose={() => setDetailPlan(null)} title={`📄 Plan #${detailPlan?.id} — ${detailPlan?.student?.first_name} ${detailPlan?.student?.last_name}`}>
        {detailPlan && (() => {
          const paid = (detailPlan.installments||[]).reduce((a,i) => a+Number(i.paid_amount||0), 0);
          const pct = getPct(paid, detailPlan.total_amount);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Student', `${detailPlan.student?.first_name} ${detailPlan.student?.last_name}`], ['Admission No', detailPlan.student?.admission_no], ['Plan Type', detailPlan.plan_type], ['Installments', detailPlan.installment_count], ['Guardian', detailPlan.student?.guardian_name||'—'], ['Phone', detailPlan.student?.guardian_phone||'—']].map(([k,v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>Payment Progress</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>{pct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={pct} height={10} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>Paid: <strong style={{ color: '#059669' }}>{KES(paid)}</strong></span>
                  <span style={{ color: '#64748b' }}>Balance: <strong style={{ color: '#dc2626' }}>{KES(detailPlan.total_amount - paid)}</strong></span>
                  <span style={{ color: '#64748b' }}>Total: <strong style={{ color: '#0f172a' }}>{KES(detailPlan.total_amount)}</strong></span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Installment Schedule</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}>{['#','Due Date','Amount','Paid','Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {(detailPlan.installments||[]).sort((a,b) => a.installment_no-b.installment_no).map(ins => (
                      <tr key={ins.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={TC}><span style={{ fontSize: 11, fontWeight: 700 }}>#{ins.installment_no}</span></td>
                        <td style={TC}>{D(ins.due_date)}</td>
                        <td style={{ ...TC, fontWeight: 700 }}>{KES(ins.amount)}</td>
                        <td style={{ ...TC, color: '#059669', fontWeight: 700 }}>{ins.paid_amount > 0 ? KES(ins.paid_amount) : '—'}</td>
                        <td style={TC}><Badge label={ins.status} color={ins.status==='paid'?'#059669':daysDiff(ins.due_date)>0?'#dc2626':'#d97706'} bg={ins.status==='paid'?'#d1fae5':daysDiff(ins.due_date)>0?'#fee2e2':'#fef3c7'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ══ Payment Modal ══ */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`💳 Record Payment — Installment #${payModal?.inst.installment_no}`}>
        {payModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#065f46', fontWeight: 700 }}>{payModal.plan.student?.first_name} {payModal.plan.student?.last_name} · {payModal.plan.student?.admission_no}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Due: {D(payModal.inst.due_date)} · Expected: {KES(payModal.inst.amount)}</div>
            </div>
            <div><label style={LB}>Payment Amount (KES)</label><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Enter amount paid" style={IN} autoFocus /></div>
            <div><label style={LB}>Payment Method</label><select style={IN}><option>Cash</option><option>M-Pesa</option><option>Bank Transfer</option><option>Cheque</option></select></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayModal(null)} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F }}>Cancel</button>
              <button onClick={recordPayment} disabled={savingPay} style={{ flex: 1, padding: '11px', background: '#059669', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: F }}>
                {savingPay ? '⏳ Saving…' : '💾 Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ════════════════════ STYLE HELPERS ════════════════════ */
const TH: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
const TC: React.CSSProperties = { padding: '12px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' };
const IN: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.15s' };
const LB: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };
const HB: React.CSSProperties = { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)' };
const AB = (c: string): React.CSSProperties => ({ background: c+'18', border: `1px solid ${c}33`, color: c, borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' });
const AB2 = (c: string): React.CSSProperties => ({ background: c+'12', border: `1px solid ${c}25`, color: c, borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });
const PGB: React.CSSProperties = { padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700 };

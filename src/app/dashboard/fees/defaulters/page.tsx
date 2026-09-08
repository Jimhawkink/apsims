'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiAlertTriangle, FiDownload, FiPrinter, FiRefreshCw, FiFilter, FiUsers, FiMessageSquare } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

interface DefaulterRow {
  studentId: number; name: string; admNo: string; formName: string; streamName: string;
  guardianName: string; guardianPhone: string; totalFees: number; paid: number; balance: number;
  daysSinceTerm: number; bucket: string;
}

export default function FeeDefaultersPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [minBalance, setMinBalance] = useState(0);
  const [selBucket, setSelBucket] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<[string,'asc'|'desc']>(['balance','desc']);
  const [sending, setSending] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Use select('*') — same as useFeeData — NO status filter, get all students
    const [sRes, pRes, fsRes, fRes, stRes, tRes] = await Promise.all([
      supabase.from('school_students').select('*').order('first_name'),
      supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('school_fee_structures').select('*'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
    ]);
    setStudents(sRes.data || []);
    setPayments(pRes.data || []);
    setStructures(fsRes.data || []);
    setForms(fRes.data || []);
    setStreams(stRes.data || []);
    setTerms(tRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentTerm = terms.find(t => t.is_current) || terms[0];
  const termStart = currentTerm?.start_date ? new Date(currentTerm.start_date) : new Date();
  const currentYear = new Date().getFullYear();

  const defaulters = useMemo<DefaulterRow[]>(() => {
    const formMap: Record<number, string> = {};
    forms.forEach(f => formMap[f.id] = f.form_name);
    const streamMap: Record<number, string> = {};
    streams.forEach(s => streamMap[s.id] = s.stream_name);

    // Only include active/enrolled students — check multiple possible status values
    const activeStudents = students.filter(s => {
      const st = (s.status || '').toLowerCase();
      return !st || st === 'active' || st === 'enrolled' || st === 'current';
    });

    return activeStudents.map(s => {
      // Match useFeeData getStudentFees logic exactly
      const applicableFees = structures.filter(f => !f.form_id || f.form_id === s.form_id);
      let yearFiltered = applicableFees.filter(f => !f.year || f.year === currentYear);
      if (yearFiltered.length === 0 && applicableFees.length > 0) {
        const maxYear = Math.max(...applicableFees.map(f => f.year || 0));
        yearFiltered = applicableFees.filter(f => !f.year || f.year === maxYear);
      }
      // Annual total
      const total = yearFiltered.reduce((a, f) => a + Number(f.amount || 0), 0);
      // CRITICAL: coerce student_id to string for comparison — Supabase may return different types
      const sid = String(s.id);
      const paid = payments.filter(p => String(p.student_id) === sid).reduce((a, p) => a + Number(p.amount || 0), 0);
      const balance = Math.max(0, total - paid);
      const daysSinceTerm = Math.floor((Date.now() - termStart.getTime()) / 86400000);
      const bucket = balance <= 0 ? 'Cleared'
        : daysSinceTerm <= 30 ? '0–30 Days'
        : daysSinceTerm <= 60 ? '31–60 Days'
        : daysSinceTerm <= 90 ? '61–90 Days'
        : '90+ Days (Critical)';
      return {
        studentId: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        admNo: s.admission_no || s.admission_number || '',
        formName: formMap[s.form_id] || '',
        streamName: streamMap[s.stream_id] || '',
        guardianName: s.guardian_name || '',
        guardianPhone: s.guardian_phone || '',
        totalFees: total, paid, balance, daysSinceTerm, bucket,
      };
    }).filter(r => r.balance > 0);
  }, [students, payments, structures, forms, streams, termStart, currentYear]);

  const filtered = useMemo(() => {
    let rows = defaulters;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.admNo.toLowerCase().includes(q) || r.guardianName.toLowerCase().includes(q));
    }
    if (selForm) rows = rows.filter(r => r.formName === selForm);
    if (selStream) rows = rows.filter(r => r.streamName === selStream);
    if (minBalance > 0) rows = rows.filter(r => r.balance >= minBalance);
    if (selBucket) rows = rows.filter(r => r.bucket === selBucket);
    const [field, dir] = sort;
    return [...rows].sort((a, b) => {
      const av = (a as any)[field] ?? '';
      const bv = (b as any)[field] ?? '';
      return dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [defaulters, search, selForm, selStream, minBalance, selBucket, sort]);

  const kpis = useMemo(() => ({
    total: defaulters.length,
    critical: defaulters.filter(r => r.bucket === '90+ Days (Critical)').length,
    totalOwed: defaulters.reduce((a, r) => a + r.balance, 0),
    avgBalance: defaulters.length > 0 ? defaulters.reduce((a, r) => a + r.balance, 0) / defaulters.length : 0,
  }), [defaulters]);

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(r => r.studentId)));

  const handleBulkSMS = async () => {
    const targets = filtered.filter(r => selected.has(r.studentId) && r.guardianPhone);
    if (targets.length === 0) { toast.error('Select students with phone numbers'); return; }
    setSending(true);
    let sent = 0;
    for (const t of targets) {
      const msg = `Dear ${t.guardianName || 'Parent'}, ${t.name}'s school fee balance is ${KES(t.balance)}. Please pay to avoid disruption. - School`;
      await supabase.from('school_notifications').insert([{
        notification_type: 'Defaulter', channel: 'SMS',
        recipient_name: t.guardianName, recipient_phone: t.guardianPhone,
        student_id: t.studentId, message: msg, status: 'Queued',
      }]);
      sent++;
    }
    toast.success(`✅ ${sent} SMS reminders queued`);
    setSending(false);
  };

  const exportCSV = () => {
    const header = 'Adm No,Name,Form,Stream,Guardian,Phone,Total Fees,Paid,Balance,Bucket';
    const rows = filtered.map(r =>
      `${r.admNo},"${r.name}",${r.formName},${r.streamName},"${r.guardianName}",${r.guardianPhone},${r.totalFees},${r.paid},${r.balance},"${r.bucket}"`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fee_defaulters_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const sortBy = (field: string) => setSort(([f, d]) => [field, f === field && d === 'desc' ? 'asc' : 'desc']);
  const SortArrow = ({ field }: { field: string }) => sort[0] === field ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : '';

  const bucketColor: Record<string, string> = {
    '0–30 Days': '#f59e0b',
    '31–60 Days': '#f97316',
    '61–90 Days': '#ef4444',
    '90+ Days (Critical)': '#7f1d1d',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🚨</div>
      <p style={{ fontWeight: 900, color: '#dc2626', fontSize: 14 }}>Loading fee defaulters…</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", padding: '0 0 40px' }}>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b,#dc2626)', borderRadius: 20, padding: '28px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 36 }}>🚨</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>Fee Defaulters</h1>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  {currentTerm ? `${currentTerm.term_name}` : 'Current Term'} — {students.filter(s => { const st=(s.status||'').toLowerCase(); return !st||st==='active'||st==='enrolled'||st==='current'; }).length} active students
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 14px', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button onClick={exportCSV} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 14px', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiDownload size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Total Defaulters', value: kpis.total, icon: '👥', color: '#fca5a5' },
            { label: 'Critical (90+ Days)', value: kpis.critical, icon: '🔴', color: '#fca5a5' },
            { label: 'Total Outstanding', value: KES(kpis.totalOwed), icon: '💸', color: '#fcd34d' },
            { label: 'Average Balance', value: KES(kpis.avgBalance), icon: '📊', color: '#fcd34d' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Search</label>
          <div style={{ position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, Adm No, Guardian…" style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px 9px 32px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Form</label>
          <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
            <option value="">All Forms</option>
            {forms.map(f => <option key={f.id} value={f.form_name}>{f.form_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stream</label>
          <select value={selStream} onChange={e => setSelStream(e.target.value)} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
            <option value="">All Streams</option>
            {streams.map(s => <option key={s.id} value={s.stream_name}>{s.stream_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aging Bucket</label>
          <select value={selBucket} onChange={e => setSelBucket(e.target.value)} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
            <option value="">All Buckets</option>
            {['0–30 Days','31–60 Days','61–90 Days','90+ Days (Critical)'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Balance (KES)</label>
          <input type="number" value={minBalance} onChange={e => setMinBalance(Number(e.target.value))} min={0} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', width: 120 }} />
        </div>
        {selected.size > 0 && (
          <button onClick={handleBulkSMS} disabled={sending} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiMessageSquare size={14} /> {sending ? 'Sending…' : `SMS ${selected.size} Selected`}
          </button>
        )}
      </div>

      {/* TABLE */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiUsers size={16} color="#dc2626" />
            <span style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>
              {filtered.length} Defaulters
            </span>
            {filtered.length !== defaulters.length && <span style={{ fontSize: 12, color: '#64748b' }}>({defaulters.length} total)</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#374151' }}>
              <FiPrinter size={13} /> Print
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                {[['admNo','Adm No'],['name','Student Name'],['formName','Form'],['streamName','Stream'],['totalFees','Total Fees'],['paid','Paid'],['balance','Balance'],['bucket','Aging']].map(([f, l]) => (
                  <th key={f} onClick={() => sortBy(f)} style={{ padding: '12px 16px', textAlign: f === 'totalFees' || f === 'paid' || f === 'balance' ? 'right' : 'left', fontWeight: 900, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {l}<SortArrow field={f} />
                  </th>
                ))}
                <th style={{ padding: '12px 16px', fontWeight: 900, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Guardian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.studentId} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <input type="checkbox" checked={selected.has(r.studentId)} onChange={() => toggleSelect(r.studentId)} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>{r.admNo}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a' }}>{r.name}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>{r.formName}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{r.streamName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{KES(r.totalFees)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{KES(r.paid)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: 14 }}>{KES(r.balance)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: (bucketColor[r.bucket] || '#64748b') + '20', color: bucketColor[r.bucket] || '#64748b', fontWeight: 800, fontSize: 11, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>{r.bucket}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                    <div style={{ fontWeight: 700, color: '#374151' }}>{r.guardianName}</div>
                    <div style={{ color: '#94a3b8' }}>{r.guardianPhone}</div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#374151' }}>No defaulters found!</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>All students have paid or no data loaded yet</div>
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b)', color: '#fff', fontWeight: 900 }}>
                  <td colSpan={4} style={{ padding: '14px 16px', fontSize: 13 }}>TOTALS — {filtered.length} Students</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13 }}>{KES(filtered.reduce((a,r)=>a+r.totalFees,0))}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: '#86efac' }}>{KES(filtered.reduce((a,r)=>a+r.paid,0))}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 15, color: '#fca5a5' }}>{KES(filtered.reduce((a,r)=>a+r.balance,0))}</td>
                  <td colSpan={2} style={{ padding: '14px 16px' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

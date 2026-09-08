'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiAlertTriangle, FiDownload, FiMessageSquare, FiPrinter, FiRefreshCw, FiFilter, FiUsers } from 'react-icons/fi';

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
    const [sRes, pRes, fsRes, fRes, stRes, tRes] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,guardian_name,guardian_phone,status').eq('status','Active'),
      supabase.from('school_fee_payments').select('student_id,amount,payment_date'),
      supabase.from('school_fee_structures').select('form_id,amount,tuition,category'),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_streams').select('id,stream_name,form_id').order('stream_name'),
      supabase.from('school_terms').select('id,term_name,start_date,is_current').order('id',{ascending:false}),
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

  const defaulters = useMemo<DefaulterRow[]>(() => {
    const formMap: Record<number,string> = {};
    forms.forEach(f => formMap[f.id] = f.form_name);
    const streamMap: Record<number,string> = {};
    streams.forEach(s => streamMap[s.id] = s.stream_name);

    return students.map(s => {
      const fs = structures.filter(f => f.form_id === s.form_id);
      const total = fs.reduce((a, f) => a + Number(f.amount || f.tuition || 0), 0);
      const paid = payments.filter(p => p.student_id === s.id).reduce((a, p) => a + Number(p.amount || 0), 0);
      const balance = Math.max(0, total - paid);
      const daysSinceTerm = Math.floor((Date.now() - termStart.getTime()) / 86400000);
      const bucket = balance <= 0 ? 'Cleared' : daysSinceTerm <= 30 ? '0-30 Days' : daysSinceTerm <= 60 ? '31-60 Days' : daysSinceTerm <= 90 ? '61-90 Days' : '90+ Days (Critical)';
      return {
        studentId: s.id, name: `${s.first_name} ${s.last_name}`,
        admNo: s.admission_no || s.admission_number || '', formName: formMap[s.form_id] || '',
        streamName: streamMap[s.stream_id] || '', guardianName: s.guardian_name || '',
        guardianPhone: s.guardian_phone || '', totalFees: total, paid, balance, daysSinceTerm, bucket,
      };
    }).filter(r => r.balance > 0);
  }, [students, payments, structures, forms, streams, termStart]);

  const filtered = useMemo(() => {
    let rows = defaulters;
    if (search) { const q = search.toLowerCase(); rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.admNo.toLowerCase().includes(q) || r.guardianName.toLowerCase().includes(q)); }
    if (selForm) rows = rows.filter(r => r.formName === selForm);
    if (selStream) rows = rows.filter(r => r.streamName === selStream);
    if (minBalance > 0) rows = rows.filter(r => r.balance >= minBalance);
    if (selBucket) rows = rows.filter(r => r.bucket === selBucket);
    const [field, dir] = sort;
    return [...rows].sort((a, b) => {
      const av = (a as any)[field] ?? ''; const bv = (b as any)[field] ?? '';
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
      const msg = `Dear ${t.guardianName || 'Parent'}, ${t.name}'s school fee balance is ${KES(t.balance)}. Please pay to avoid disruption. - APSIMS`;
      await supabase.from('school_notifications').insert([{ notification_type: 'Defaulter', channel: 'SMS', recipient_name: t.guardianName, recipient_phone: t.guardianPhone, student_id: t.studentId, message: msg, status: 'Queued' }]);
      sent++;
    }
    toast.success(`✅ ${sent} SMS reminders queued successfully`);
    setSending(false);
  };

  const exportCSV = () => {
    const header = 'Adm No,Name,Form,Stream,Guardian,Phone,Total Fees,Paid,Balance,Bucket';
    const rows = filtered.map(r => `${r.admNo},"${r.name}",${r.formName},${r.streamName},"${r.guardianName}",${r.guardianPhone},${r.totalFees},${r.paid},${r.balance},"${r.bucket}"`);
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fee_defaulters_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success('CSV exported!');
  };

  const printList = () => {
    const w = window.open('', '_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Fee Defaulters List</title><style>
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      h1{color:#dc2626;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#dc2626;color:#fff;padding:8px;text-align:left;font-size:11px}
      td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
      tr:nth-child(even){background:#fef2f2}
      .critical{color:#dc2626;font-weight:bold}
      @page{size:A4 landscape;margin:12mm}
    </style></head><body>
      <h1>⚠️ Fee Defaulters List</h1>
      <p>Generated: ${new Date().toLocaleDateString('en-KE')} | Term: ${currentTerm?.term_name || ''} | Total: ${filtered.length} students | Total Owed: ${KES(kpis.totalOwed)}</p>
      <table><tr><th>#</th><th>Adm No</th><th>Name</th><th>Form</th><th>Stream</th><th>Guardian</th><th>Phone</th><th>Total Fees</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
      ${filtered.map((r, i) => `<tr><td>${i+1}</td><td>${r.admNo}</td><td>${r.name}</td><td>${r.formName}</td><td>${r.streamName}</td><td>${r.guardianName}</td><td>${r.guardianPhone}</td><td>${KES(r.totalFees)}</td><td>${KES(r.paid)}</td><td class="critical">${KES(r.balance)}</td><td>${r.bucket}</td></tr>`).join('')}
      </table></body></html>`);
    setTimeout(() => w.print(), 400);
  };

  const bucketColor: Record<string, string> = { '0-30 Days': '#854d0e', '31-60 Days': '#c2410c', '61-90 Days': '#b91c1c', '90+ Days (Critical)': '#dc2626' };
  const bucketBg: Record<string, string> = { '0-30 Days': '#fef9c3', '31-60 Days': '#ffedd5', '61-90 Days': '#fee2e2', '90+ Days (Critical)': '#fecaca' };
  const TH = { padding: '10px 12px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', cursor: 'pointer', userSelect: 'none' as const };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 60%,#ef4444 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, backdropFilter: 'blur(8px)' }}>⚠️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>Fee Defaulters List</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Real-time defaulters from {currentTerm?.term_name || 'current term'} — filter, SMS, export, print</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}><FiRefreshCw size={14} /> Refresh</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { icon: '👥', label: 'Total Defaulters', val: kpis.total, sub: `of ${students.length} students` },
              { icon: '🚨', label: 'Critical (90+ days)', val: kpis.critical, sub: 'Needs immediate action' },
              { icon: '💰', label: 'Total Owed', val: KES(kpis.totalOwed), sub: 'Outstanding balance' },
              { icon: '📊', label: 'Average Balance', val: KES(kpis.avgBalance), sub: 'Per defaulter' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>{k.val}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{k.sub}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
        {/* FILTERS */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '16px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 200px' }}>
            <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, adm no, guardian…" style={{ width: '100%', paddingLeft: 34, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ flex: '1 1 130px', padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Forms</option>
            {forms.map(f => <option key={f.id} value={f.form_name}>{f.form_name}</option>)}
          </select>
          <select value={selStream} onChange={e => setSelStream(e.target.value)} style={{ flex: '1 1 130px', padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Streams</option>
            {streams.filter(s => !selForm || forms.find(f => f.form_name === selForm)?.id === s.form_id).map(s => <option key={s.id} value={s.stream_name}>{s.stream_name}</option>)}
          </select>
          <select value={selBucket} onChange={e => setSelBucket(e.target.value)} style={{ flex: '1 1 160px', padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Buckets</option>
            {['0-30 Days','31-60 Days','61-90 Days','90+ Days (Critical)'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={minBalance} onChange={e => setMinBalance(Number(e.target.value))} style={{ flex: '1 1 140px', padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value={0}>Any Balance</option>
            {[1000,5000,10000,20000,50000].map(v => <option key={v} value={v}>≥ {KES(v)}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {selected.size > 0 && <button onClick={handleBulkSMS} disabled={sending} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiMessageSquare size={14} /> SMS {selected.size}</button>}
            <button onClick={exportCSV} style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={14} /> CSV</button>
            <button onClick={printList} style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print</button>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiUsers size={16} color="#dc2626" />
            <span style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>{filtered.length} Defaulters</span>
            {selected.size > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{selected.size} selected</span>}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #fecaca', borderTop: '3px solid #dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
              <div>Loading defaulters…</div>
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={TH}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                    <th style={TH}>#</th>
                    {[['name','Student'],['formName','Form'],['guardianPhone','Phone'],['totalFees','Total Fees'],['paid','Paid'],['balance','Balance ↓'],['bucket','Aging']].map(([f,l]) => (
                      <th key={f} style={TH} onClick={() => setSort([f, sort[0]===f && sort[1]==='desc' ? 'asc' : 'desc'])}>
                        {l} {sort[0]===f ? (sort[1]==='desc'?'↓':'↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.studentId} style={{ borderBottom: '1px solid #f1f5f9', background: selected.has(r.studentId) ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 12px' }}><input type="checkbox" checked={selected.has(r.studentId)} onChange={() => toggleSelect(r.studentId)} /></td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{r.admNo} · {r.streamName}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4f46e5' }}>{r.formName}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{r.guardianPhone || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{KES(r.totalFees)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#15803d' }}>{KES(r.paid)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: '#dc2626', fontSize: 14 }}>{KES(r.balance)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: bucketBg[r.bucket] || '#f1f5f9', color: bucketColor[r.bucket] || '#374151', fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>{r.bucket}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                      <FiAlertTriangle size={32} style={{ marginBottom: 8 }} /><br />No defaulters matching your filters 🎉
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

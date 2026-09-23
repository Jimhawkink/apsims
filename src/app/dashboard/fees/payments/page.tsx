'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, getMethodColor } from '../useFeeData';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════════ */
type SortKey = 'payment_date' | 'amount' | 'student' | 'receipt_number' | 'payment_method';
type SortDir = 'asc' | 'desc';
type View = 'table' | 'grid' | 'analytics';
interface EditModal { open: boolean; payment: any | null; }

/* ══════════════════════════════════════════════════════════════════════════════
   THEME CONSTANTS
══════════════════════════════════════════════════════════════════════════════ */
const T = {
  bg:        '#f8fafc',
  card:      '#ffffff',
  border:    '#e2e8f0',
  borderHov: '#c7d2fe',
  text:      '#0f172a',
  sub:       '#64748b',
  muted:     '#94a3b8',
  indigo:    '#4f46e5',
  indigoL:   '#eef2ff',
  indigoBd:  '#c7d2fe',
  green:     '#16a34a',
  greenL:    '#f0fdf4',
  greenBd:   '#bbf7d0',
  amber:     '#d97706',
  amberL:    '#fffbeb',
  red:       '#dc2626',
  redL:      '#fef2f2',
  blue:      '#2563eb',
  blueL:     '#eff6ff',
  redBd:     '#fecaca',
};

const METHOD_COLORS: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
  'M-Pesa':        { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', icon: '📱' },
  'Cash':          { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b', icon: '💵' },
  'Bank Transfer': { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', icon: '🏦' },
  'Bank':          { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', icon: '🏦' },
  'Cheque':        { bg: '#faf5ff', text: '#6d28d9', dot: '#8b5cf6', icon: '📄' },
  'In-Kind':       { bg: '#fdf4ff', text: '#a21caf', dot: '#d946ef', icon: '🎁' },
};
const getM = (m: string) => METHOD_COLORS[m] ?? { bg: '#f8fafc', text: '#475569', dot: '#94a3b8', icon: '💳' };

const fmtDate     = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateLong = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtKES      = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtK        = (n: number) => n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `KES ${(n/1_000).toFixed(0)}K` : `KES ${n}`;

/* ══════════════════════════════════════════════════════════════════════════════
   METHOD PILL  (light)
══════════════════════════════════════════════════════════════════════════════ */
function MethodPill({ method }: { method: string }) {
  const m = getM(method);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: m.bg, color: m.text, fontSize: 11, fontWeight: 700, border: `1px solid ${m.dot}40` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {method || '—'}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   KPI CARD  (light premium)
══════════════════════════════════════════════════════════════════════════════ */
function KPICard({ label, value, sub, color, colorL, colorBd, icon }: any) {
  return (
    <div style={{ background: T.card, border: `1.5px solid ${colorBd}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden', fontFamily: "'Inter','Outfit',sans-serif" }}>
      <div style={{ position: 'absolute', top: -16, right: -16, width: 70, height: 70, borderRadius: '50%', background: color, opacity: 0.07 }} />
      <div style={{ width: 38, height: 38, borderRadius: 11, background: colorL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: T.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>{sub}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SORTABLE COLUMN HEADER
══════════════════════════════════════════════════════════════════════════════ */
function ColH({ label, sk, current, dir, onSort }: { label: string; sk: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sk;
  return (
    <th style={{ padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
      <button onClick={() => onSort(sk)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: active ? T.indigo : T.sub, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Inter',sans-serif" }}>
        {label}
        <span style={{ fontSize: 9 }}>{active ? (dir === 'asc' ? '↑' : '↓') : '⇅'}</span>
      </button>
    </th>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ANALYTICS VIEW  (light)
══════════════════════════════════════════════════════════════════════════════ */
function AnalyticsView({ payments, students, terms, getFormName }: any) {
  const grandTotal = useMemo(() => payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), [payments]);
  const COLORS = ['#4f46e5','#16a34a','#0ea5e9','#d97706','#8b5cf6','#ef4444','#0d9488'];

  const byMethod = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => { const m = p.payment_method || 'Unknown'; if (!map[m]) map[m] = { count: 0, total: 0 }; map[m].count++; map[m].total += Number(p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments]);

  const byForm = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => { const s = students.find((st: any) => st.id === p.student_id); const form = s ? getFormName(s.form_id) : 'Unknown'; if (!map[form]) map[form] = { count: 0, total: 0 }; map[form].count++; map[form].total += Number(p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments, students, getFormName]);

  const byTerm = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => { const t = terms.find((tm: any) => Number(tm.id) === Number(p.term_id)); const tn = t?.term_name || 'No Term'; if (!map[tn]) map[tn] = { count: 0, total: 0 }; map[tn].count++; map[tn].total += Number(p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments, terms]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); map[d.toISOString().split('T')[0]] = 0; }
    payments.forEach((p: any) => { if (Object.prototype.hasOwnProperty.call(map, p.payment_date)) map[p.payment_date] += Number(p.amount || 0); });
    return Object.entries(map);
  }, [payments]);
  const maxDay = Math.max(...dailyTrend.map(d => d[1]), 1);

  const PBar = ({ pct, color }: { pct: number; color: string }) => (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.7s ease' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 14-day trend bars */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: T.text, fontFamily: "'Outfit',sans-serif" }}>14-Day Collection Trend</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Daily fee receipts over the past two weeks</div>
          </div>
          <div style={{ background: T.indigoL, color: T.indigo, borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 800 }}>{fmtKES(grandTotal)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 150 }}>
          {dailyTrend.map(([date, amount]) => {
            const p = (amount / maxDay) * 100;
            const label = new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
            const isToday = date === new Date().toISOString().split('T')[0];
            return (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div title={`${label}: KES ${amount.toLocaleString()}`}
                  style={{ width: '100%', background: amount > 0 ? (isToday ? T.indigo : '#818cf8') : '#f1f5f9', borderRadius: '5px 5px 0 0', minHeight: 4, height: `${Math.max(p, 3)}%`, transition: 'height 0.6s ease', cursor: 'pointer', boxShadow: amount > 0 ? `0 2px 8px ${T.indigo}30` : 'none' }} />
                <span style={{ fontSize: 8, color: T.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 breakdown cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {[
          { title: 'By Payment Method', data: byMethod, colors: COLORS },
          { title: 'By Form / Class',   data: byForm.slice(0,6), colors: ['#4f46e5','#16a34a','#0ea5e9','#8b5cf6','#d97706','#ef4444'] },
          { title: 'By Term',           data: byTerm, colors: ['#4f46e5','#0d9488','#d97706','#8b5cf6','#16a34a'] },
        ].map((section, si) => (
          <div key={si} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.text, marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>{section.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {section.data.map(([name, val]: any, i: number) => {
                const p = grandTotal > 0 ? (val.total / grandTotal) * 100 : 0;
                const col = section.colors[i % section.colors.length];
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: T.text }}>{fmt(val.total)}</span>
                    </div>
                    <PBar pct={p} color={col} />
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{val.count} payments · {p.toFixed(1)}%</div>
                  </div>
                );
              })}
              {section.data.length === 0 && <div style={{ textAlign: 'center', color: T.muted, padding: 24 }}>No data</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EDIT MODAL  (light)
══════════════════════════════════════════════════════════════════════════════ */
function EditModal({ modal, onClose, onSave, students, terms, getFormName }: any) {
  const p = modal.payment;
  const s = p ? students.find((st: any) => st.id === p.student_id) : null;
  const [form, setForm] = useState({ amount: '', payment_method: 'Cash', reference_number: '', mpesa_code: '', bank_name: '', payment_date: '', term_id: '', notes: '', received_by: '' });
  useEffect(() => { if (p) setForm({ amount: p.amount || '', payment_method: p.payment_method || 'Cash', reference_number: p.reference_number || '', mpesa_code: p.mpesa_code || '', bank_name: p.bank_name || '', payment_date: p.payment_date || '', term_id: p.term_id || '', notes: p.notes || '', received_by: p.received_by || '' }); }, [p]);
  if (!modal.open || !p) return null;

  const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.text, outline: 'none', fontFamily: "'Inter',sans-serif", background: T.bg };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };
  const methods = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Inter','Outfit',sans-serif" }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>Edit Payment</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{s ? `${s.first_name} ${s.last_name}` : ''} · {p.receipt_number}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', fontSize: 16, color: T.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Amount (KES)</label><input type="number" style={inp} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            <div><label style={lbl}>Payment Date</label><input type="date" style={inp} value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
          </div>
          <div>
            <label style={lbl}>Payment Method</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {methods.map(m => {
                const mc = getM(m);
                const active = form.payment_method === m;
                return (
                  <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))} style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${active ? mc.dot : T.border}`, background: active ? mc.bg : T.card, color: active ? mc.text : T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {mc.icon} {m}
                  </button>
                );
              })}
            </div>
          </div>
          {form.payment_method === 'M-Pesa' && (
            <div><label style={lbl}>M-Pesa Code</label><input style={inp} value={form.mpesa_code} onChange={e => setForm(f => ({ ...f, mpesa_code: e.target.value.toUpperCase() }))} placeholder="e.g. RCK1AB2CD3" /></div>
          )}
          {(form.payment_method === 'Bank Transfer' || form.payment_method === 'Bank') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Bank Name</label><input style={inp} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Equity, KCB..." /></div>
              <div><label style={lbl}>Reference No.</label><input style={inp} value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Trans ref" /></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Term</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))}>
                <option value="">— Any term —</option>
                {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Received By</label><input style={inp} value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} placeholder="Bursar name" /></div>
          </div>
          <div><label style={lbl}>Notes</label><textarea style={{ ...inp, resize: 'none', height: 70 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." /></div>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.card, color: T.sub, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSave({ ...p, ...form })} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: T.indigo, color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRINT RECEIPT (unchanged logic, light-styled HTML)
══════════════════════════════════════════════════════════════════════════════ */
function buildReceipt(p: any, s: any, fees: any, formName: string, termName: string): string {
  return `<!DOCTYPE html><html><head><title>Receipt – ${p.receipt_number}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap');
@page{size:80mm auto;margin:4mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;padding:14px;max-width:340px;color:#111;font-size:11.5px;line-height:1.4}
.brand{text-align:center;padding-bottom:14px;border-bottom:3px double #111;margin-bottom:14px}
.brand-name{font-size:18px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
.brand-sub{font-size:9.5px;color:#666;margin-top:2px;font-weight:600;letter-spacing:0.5px}
.rcpt-badge{text-align:center;margin:12px 0}
.rcpt-badge span{font-family:'Courier New',monospace;font-size:15px;font-weight:700;background:#f1f5f9;padding:5px 14px;border-radius:6px;letter-spacing:1px;border:1.5px solid #e2e8f0}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f1f1}
.row .k{font-size:9.5px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:0.5px}
.row .v{font-weight:700;font-size:11px;text-align:right;max-width:60%}
.amt-block{margin:16px 0;padding:16px;border:2.5px solid #4f46e5;border-radius:10px;text-align:center;background:#eef2ff}
.amt-block .lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#4f46e5}
.amt-block .num{font-size:28px;font-weight:900;margin-top:4px;letter-spacing:-1px;color:#312e81}
.balances{margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px}
.bal-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}
.bal-row .label{color:#666;font-weight:600}.bal-row .value{font-weight:900}
.red{color:#dc2626}.green{color:#16a34a}
.footer{margin-top:16px;padding-top:12px;border-top:3px double #111;text-align:center}
.footer p{font-size:9px;color:#888;margin:2px 0}
</style></head><body>
<div class="brand">
  <div class="brand-name">Alpha Premier School</div>
  <div class="brand-sub">P.O. Box 000 · Tel: 0700 000 000 · info@alphapremier.ac.ke</div>
  <div style="font-size:10.5px;font-weight:700;margin-top:6px;letter-spacing:1px">🎓 OFFICIAL FEE PAYMENT RECEIPT</div>
</div>
<div class="rcpt-badge"><span>${p.receipt_number || '—'}</span></div>
<div>
  <div class="row"><span class="k">Date</span><span class="v">${fmtDateLong(p.payment_date)}</span></div>
  <div class="row"><span class="k">Student</span><span class="v">${s ? `${s.first_name} ${s.last_name}` : '—'}</span></div>
  <div class="row"><span class="k">Adm No</span><span class="v">${s?.admission_no || s?.admission_number || '—'}</span></div>
  <div class="row"><span class="k">Form / Class</span><span class="v">${formName}</span></div>
  <div class="row"><span class="k">Term</span><span class="v">${termName}</span></div>
  <div class="row"><span class="k">Payment Method</span><span class="v">${p.payment_method || '—'}</span></div>
  ${p.mpesa_code || p.reference_number ? `<div class="row"><span class="k">Reference</span><span class="v" style="font-family:monospace">${p.mpesa_code || p.reference_number}</span></div>` : ''}
  ${p.bank_name ? `<div class="row"><span class="k">Bank</span><span class="v">${p.bank_name}</span></div>` : ''}
  ${p.received_by ? `<div class="row"><span class="k">Received By</span><span class="v">${p.received_by}</span></div>` : ''}
</div>
<div class="amt-block">
  <div class="lbl">Amount Received</div>
  <div class="num">KES ${Number(p.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
</div>
${fees ? `<div class="balances">
  <div class="bal-row"><span class="label">Total Paid (All Time)</span><span class="value green">KES ${fees.totalPaid.toLocaleString()}</span></div>
  <div class="bal-row"><span class="label">Term Balance Due</span><span class="value red">KES ${fees.termBalance.toLocaleString()}</span></div>
  <div class="bal-row"><span class="label">Annual Balance Due</span><span class="value red">KES ${fees.annualBalance.toLocaleString()}</span></div>
</div>` : ''}
${p.notes ? `<div style="margin:10px 0;padding:8px;background:#fffbeb;border-radius:6px;border:1px solid #fde68a;font-size:10px;color:#92400e"><strong>Note:</strong> ${p.notes}</div>` : ''}
<div class="footer">
  <p>✅ Thank you for your payment!</p>
  <p>This is a computer-generated receipt. No signature required.</p>
  <p>Printed: ${new Date().toLocaleString('en-KE')}</p>
  <p style="margin-top:6px;font-size:8.5px;font-style:italic">Powered by AlphaSIMS School Management System</p>
</div>
</body></html>`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PaymentHistoryPage() {
  const { students, payments, terms, loading, fetchAll, getFormName, getStreamName, getStudentFees } = useFeeData();

  // ── Filters ──
  const [search, setSearch]           = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterForm, setFilterForm]   = useState('');
  const [filterTerm, setFilterTerm]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [amtMin, setAmtMin]           = useState('');
  const [amtMax, setAmtMax]           = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Sort / Pagination / View ──
  const [sortKey, setSortKey]   = useState<SortKey>('payment_date');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(25);
  const [view, setView]         = useState<View>('table');

  // ── Selection / Modals ──
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [editModal, setEditModal]     = useState<EditModal>({ open: false, payment: null });
  const [previewPayment, setPreviewPayment] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const formOptions = useMemo(() => { const s = new Set<string>(); students.forEach(st => { const n = getFormName(st.form_id); if (n) s.add(n); }); return Array.from(s).sort(); }, [students, getFormName]);

  // ── Filtering + sorting ──
  const filtered = useMemo(() => {
    let list = [...payments];
    if (search) { const q = search.toLowerCase(); list = list.filter(p => { const s = students.find(st => st.id === p.student_id); return (s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)) || (p.receipt_number || '').toLowerCase().includes(q) || (s && (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q)) || (p.mpesa_code || '').toLowerCase().includes(q) || (p.reference_number || '').toLowerCase().includes(q) || (p.bank_name || '').toLowerCase().includes(q); }); }
    if (filterMethod) list = list.filter(p => p.payment_method === filterMethod);
    if (filterForm)   list = list.filter(p => { const s = students.find(st => st.id === p.student_id); return s && getFormName(s.form_id) === filterForm; });
    if (filterTerm)   list = list.filter(p => String(p.term_id) === filterTerm);
    if (dateFrom)     list = list.filter(p => p.payment_date >= dateFrom);
    if (dateTo)       list = list.filter(p => p.payment_date <= dateTo);
    if (amtMin)       list = list.filter(p => Number(p.amount) >= Number(amtMin));
    if (amtMax)       list = list.filter(p => Number(p.amount) <= Number(amtMax));
    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'amount') { av = Number(a.amount); bv = Number(b.amount); }
      else if (sortKey === 'student') { const sa = students.find(st => st.id === a.student_id); const sb = students.find(st => st.id === b.student_id); av = sa ? `${sa.first_name} ${sa.last_name}` : ''; bv = sb ? `${sb.first_name} ${sb.last_name}` : ''; }
      else if (sortKey === 'payment_method') { av = a.payment_method || ''; bv = b.payment_method || ''; }
      else if (sortKey === 'receipt_number') { av = a.receipt_number || ''; bv = b.receipt_number || ''; }
      else { av = a.payment_date || ''; bv = b.payment_date || ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [payments, students, search, filterMethod, filterForm, filterTerm, dateFrom, dateTo, amtMin, amtMax, sortKey, sortDir, getFormName]);

  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount || 0), 0), [filtered]);
  const totalPages  = Math.ceil(filtered.length / perPage);
  const paginated   = filtered.slice((page - 1) * perPage, page * perPage);
  const hasFilters  = !!(search || filterMethod || filterForm || filterTerm || dateFrom || dateTo || amtMin || amtMax);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal  = payments.filter(p => p.payment_date === today).reduce((s, p) => s + Number(p.amount || 0), 0);
    const mpesaTotal  = payments.filter(p => p.payment_method === 'M-Pesa').reduce((s, p) => s + Number(p.amount || 0), 0);
    const grandTotal  = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const avgPayment  = payments.length ? grandTotal / payments.length : 0;
    return { todayTotal, mpesaTotal, grandTotal, avgPayment, count: payments.length };
  }, [payments]);

  const handleSort = useCallback((k: SortKey) => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('desc'); } setPage(1); }, [sortKey]);

  const allPageIds     = paginated.map(p => p.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));
  const toggleAll = () => { const next = new Set(selected); if (allPageSelected) allPageIds.forEach(id => next.delete(id)); else allPageIds.forEach(id => next.add(id)); setSelected(next); };
  const toggleOne = (id: number) => { const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };

  const printReceipt = (p: any) => {
    const s = students.find(st => st.id === p.student_id);
    const fees = s ? getStudentFees(s.id, s.form_id) : null;
    const formName = s ? getFormName(s.form_id) : '—';
    const term = terms.find((t: any) => Number(t.id) === Number(p.term_id));
    const html = buildReceipt(p, s, fees, formName, term?.term_name || '—');
    const w = window.open('', '_blank', 'width=420,height=700');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  };

  const copyReceipt = (p: any) => {
    const s = students.find(st => st.id === p.student_id);
    const txt = `Receipt: ${p.receipt_number}\nStudent: ${s ? `${s.first_name} ${s.last_name}` : '—'}\nAmount: ${fmt(Number(p.amount))}\nDate: ${fmtDate(p.payment_date)}\nMethod: ${p.payment_method}${p.mpesa_code ? `\nM-Pesa: ${p.mpesa_code}` : ''}`;
    navigator.clipboard.writeText(txt).then(() => toast.success('Receipt details copied!'));
  };

  const exportCSV = () => {
    const rows = [
      ['Receipt No','Student','Adm No','Form','Amount','Method','M-Pesa Code','Reference','Bank','Date','Term','Received By','Notes'],
      ...filtered.map(p => { const s = students.find(st => st.id === p.student_id); const t = terms.find((tm: any) => Number(tm.id) === Number(p.term_id)); return [p.receipt_number, s ? `${s.first_name} ${s.last_name}` : '', s?.admission_no || s?.admission_number || '', s ? getFormName(s.form_id) : '', p.amount, p.payment_method, p.mpesa_code || '', p.reference_number || '', p.bank_name || '', p.payment_date, t?.term_name || '', p.received_by || '', p.notes || '']; }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `fee_payments_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return;
    const { error } = await supabase.from('school_fee_payments').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else { toast.success('Payment deleted'); fetchAll(); setSelected(s => { const n = new Set(s); n.delete(id); return n; }); }
  };

  const handleSave = async (data: any) => {
    const { error } = await supabase.from('school_fee_payments').update({ amount: Number(data.amount), payment_method: data.payment_method, reference_number: data.reference_number, mpesa_code: data.mpesa_code, bank_name: data.bank_name, payment_date: data.payment_date, term_id: data.term_id || null, notes: data.notes, received_by: data.received_by }).eq('id', data.id);
    if (error) toast.error('Update failed: ' + error.message);
    else { toast.success('Payment updated ✓'); fetchAll(); setEditModal({ open: false, payment: null }); }
  };

  const clearFilters = () => { setSearch(''); setFilterMethod(''); setFilterForm(''); setFilterTerm(''); setDateFrom(''); setDateTo(''); setAmtMin(''); setAmtMax(''); setPage(1); };

  // ── Inline styles ──
  const inputStyle: React.CSSProperties = { background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: T.text, outline: 'none', fontFamily: "'Inter',sans-serif" };

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }
        input:focus, select:focus, textarea:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
        tr.pay-row:hover td { background: #f8fafc !important; }
        .pay-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '18px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Link href="/dashboard/fees" style={{ fontSize: 11, color: T.sub, fontWeight: 700 }}>← Fees</Link>
              <span style={{ color: T.muted }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo }}>Payment History</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', fontFamily: "'Outfit',sans-serif" }}>Fee Payment History</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: T.sub }}>{payments.length.toLocaleString()} total records · AlphaSIMS</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 11, padding: 3, gap: 2 }}>
              {(['table','grid','analytics'] as View[]).map(v => (
                <button key={v} onClick={() => { setView(v); setPage(1); }} style={{ padding: '6px 14px', borderRadius: 9, border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer', fontFamily: "'Inter',sans-serif", background: view === v ? T.card : 'transparent', color: view === v ? T.indigo : T.sub, boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>{v}</button>
              ))}
            </div>
            <button onClick={exportCSV} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>↓ Export</button>
            <button onClick={fetchAll} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>↺ Refresh</button>
            <Link href="/dashboard/fees/collect" style={{ background: T.green, color: '#fff', borderRadius: 10, padding: '9px 18px', fontWeight: 800, fontSize: 12, boxShadow: '0 3px 10px rgba(22,163,74,0.3)' }}>+ Record Payment</Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── KPI CARDS ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {[...Array(4)].map((_, i) => <div key={i} style={{ height: 110, borderRadius: 16, background: '#f1f5f9', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }} className="fade-in">
            <KPICard label="Grand Total Collected" value={fmtK(stats.grandTotal)}  sub={`${stats.count.toLocaleString()} payments`}  icon="💰" color={T.indigo} colorL={T.indigoL} colorBd={T.indigoBd} />
            <KPICard label="Today's Collections"   value={fmtK(stats.todayTotal)}  sub={new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'short'})} icon="📅" color={T.green}  colorL={T.greenL}  colorBd={T.greenBd} />
            <KPICard label="M-Pesa Collections"    value={fmtK(stats.mpesaTotal)}  sub={`${((stats.mpesaTotal/(stats.grandTotal||1))*100).toFixed(1)}% of total`} icon="📱" color="#15803d" colorL="#f0fdf4" colorBd="#bbf7d0" />
            <KPICard label="Average Payment"        value={fmtK(stats.avgPayment)}  sub="Per transaction" icon="📊" color={T.amber} colorL={T.amberL} colorBd="#fde68a" />
          </div>
        )}

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: 220 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: T.muted }}>🔍</span>
              <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search student, receipt, M-Pesa code… (Ctrl+F)"
                style={{ ...inputStyle, width: '100%', paddingLeft: 36 }} />
              {search && <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: T.muted }}>×</button>}
            </div>
            {['M-Pesa','Cash','Bank Transfer'].map(m => {
              const mc = getM(m);
              return (
                <button key={m} onClick={() => { setFilterMethod(filterMethod === m ? '' : m); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${filterMethod === m ? mc.dot : T.border}`, background: filterMethod === m ? mc.bg : T.card, color: filterMethod === m ? mc.text : T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {mc.icon} {m}
                </button>
              );
            })}
            <button onClick={() => setShowFilters(s => !s)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: showFilters || hasFilters ? T.indigo : T.sub, borderColor: showFilters || hasFilters ? T.indigo : T.border }}>
              ⚙ Filters {hasFilters && <span style={{ width: 16, height: 16, borderRadius: '50%', background: T.indigo, color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>!</span>}
            </button>
            {hasFilters && <button onClick={clearFilters} style={{ ...inputStyle, cursor: 'pointer', color: T.red, borderColor: '#fecaca', fontWeight: 700 }}>✕ Clear</button>}
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ ...inputStyle, cursor: 'pointer', marginLeft: 'auto' }}>
              {[10,25,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>

          {showFilters && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }} style={inputStyle}>
                <option value="">All Forms</option>
                {formOptions.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }} style={inputStyle}>
                <option value="">All Terms</option>
                {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={inputStyle} placeholder="From" />
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={inputStyle} placeholder="To" />
              <input type="number" value={amtMin} onChange={e => { setAmtMin(e.target.value); setPage(1); }} style={inputStyle} placeholder="Min amount" />
              <input type="number" value={amtMax} onChange={e => { setAmtMax(e.target.value); setPage(1); }} style={inputStyle} placeholder="Max amount" />
            </div>
          )}
        </div>

        {/* ── Results summary ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{filtered.length.toLocaleString()} results {hasFilters && <span style={{ color: T.indigo }}>(filtered)</span>}</span>
            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.indigoL, border: `1px solid ${T.indigoBd}`, borderRadius: 8, padding: '4px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo }}>{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: 10, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕ clear</button>
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{fmt(totalAmount)}</span>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9' }} />
                <div style={{ flex: 1, height: 12, borderRadius: 8, background: '#f1f5f9', maxWidth: '40%' }} />
                <div style={{ width: 80, height: 12, borderRadius: 8, background: '#f1f5f9' }} />
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TABLE VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && view === 'table' && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }} className="fade-in">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${T.border}` }}>
                    <th style={{ padding: '11px 14px', width: 40 }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleAll} style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }} />
                    </th>
                    <ColH label="Receipt #"  sk="receipt_number"  current={sortKey} dir={sortDir} onSort={handleSort} />
                    <ColH label="Student"    sk="student"         current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.sub }}>Form</th>
                    <ColH label="Amount"     sk="amount"          current={sortKey} dir={sortDir} onSort={handleSort} />
                    <ColH label="Method"     sk="payment_method"  current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.sub }}>Ref / Code</th>
                    <ColH label="Date"       sk="payment_date"    current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.sub }}>Term</th>
                    <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.sub }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <p style={{ fontWeight: 700, color: T.sub }}>No payments found</p>
                      <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Try adjusting your filters</p>
                    </td></tr>
                  )}
                  {paginated.map((p, i) => {
                    const s = students.find(st => st.id === p.student_id);
                    const t = terms.find((tm: any) => Number(tm.id) === Number(p.term_id));
                    const isSel = selected.has(p.id);
                    const COLORS = ['#4f46e5','#16a34a','#0ea5e9','#d97706','#8b5cf6','#ef4444','#0d9488'];
                    const avatarColor = COLORS[i % COLORS.length];
                    const initials = s ? `${s.first_name?.[0]||''}${s.last_name?.[0]||''}`.toUpperCase() : '?';
                    return (
                      <tr key={p.id} className="pay-row" onClick={() => setPreviewPayment(p)} style={{ borderBottom: `1px solid ${T.border}`, background: isSel ? T.indigoL : '#fff', cursor: 'pointer', transition: 'background 0.12s' }}>
                        <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.id)} style={{ width: 14, height: 14, accentColor: T.indigo, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: T.indigo, background: T.indigoL, padding: '2px 7px', borderRadius: 6 }}>{p.receipt_number || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${avatarColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: avatarColor, flexShrink: 0 }}>{initials}</div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 12, color: T.text }}>{s ? `${s.first_name} ${s.last_name}` : <span style={{ color: T.muted }}>Unknown</span>}</div>
                              <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', marginTop: 1 }}>{s?.admission_no || s?.admission_number || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, background: '#f8fafc', padding: '2px 8px', borderRadius: 6 }}>{s ? getFormName(s.form_id) : '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{fmt(Number(p.amount || 0))}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}><MethodPill method={p.payment_method} /></td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.sub }}>{p.mpesa_code || p.reference_number || p.bank_name || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, whiteSpace: 'nowrap' }}>{fmtDate(p.payment_date)}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {t ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', background: '#faf5ff', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 6 }}>{t.term_name}</span>
                          ) : <span style={{ color: T.muted, fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                            {[
                              { icon: '👁', title: 'Preview', fn: () => setPreviewPayment(p), color: T.indigo },
                              { icon: '🖨', title: 'Print',   fn: () => printReceipt(p),       color: T.green },
                              { icon: '📋', title: 'Copy',    fn: () => copyReceipt(p),         color: T.blue },
                              { icon: '✏',  title: 'Edit',   fn: () => setEditModal({ open: true, payment: p }), color: T.amber },
                              { icon: '🗑', title: 'Delete',  fn: () => handleDelete(p.id),     color: T.red },
                            ].map(btn => (
                              <button key={btn.title} onClick={btn.fn} title={btn.title} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, transition: 'all 0.12s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${btn.color}12`; (e.currentTarget as HTMLElement).style.borderColor = `${btn.color}50`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.card; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                                {btn.icon}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: `2px solid ${T.border}` }}>
                    <td colSpan={4} style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{filtered.length.toLocaleString()} payments {selected.size > 0 && <span style={{ color: T.indigo }}>· {selected.size} selected</span>}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{fmt(totalAmount)}</span>
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Showing {(page-1)*perPage+1}–{Math.min(page*perPage, filtered.length)} of {filtered.length.toLocaleString()}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[{ label: '«', action: () => setPage(1), dis: page === 1 }, { label: '‹', action: () => setPage(p => Math.max(1, p-1)), dis: page === 1 }].map(({ label, action, dis }) => (
                    <button key={label} onClick={action} disabled={dis} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: dis ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 800, color: T.sub, opacity: dis ? 0.4 : 1 }}>{label}</button>
                  ))}
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pg: number;
                    if (totalPages <= 7) pg = i + 1;
                    else if (page <= 4) pg = i + 1;
                    else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                    else pg = page - 3 + i;
                    return (
                      <button key={pg} onClick={() => setPage(pg)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${page === pg ? T.indigo : T.border}`, background: page === pg ? T.indigo : T.card, color: page === pg ? '#fff' : T.sub, cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>{pg}</button>
                    );
                  })}
                  {[{ label: '›', action: () => setPage(p => Math.min(totalPages, p+1)), dis: page === totalPages }, { label: '»', action: () => setPage(totalPages), dis: page === totalPages }].map(({ label, action, dis }) => (
                    <button key={label} onClick={action} disabled={dis} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: dis ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 800, color: T.sub, opacity: dis ? 0.4 : 1 }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CARD / GRID VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && view === 'grid' && (
          <div className="fade-in">
            {paginated.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                <p style={{ fontWeight: 700, color: T.sub }}>No payments match your filters</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                  {paginated.map(p => {
                    const s = students.find(st => st.id === p.student_id);
                    const t = terms.find((tm: any) => Number(tm.id) === Number(p.term_id));
                    const mc = getM(p.payment_method);
                    const isSel = selected.has(p.id);
                    return (
                      <div key={p.id} className="pay-card" onClick={() => setPreviewPayment(p)} style={{ background: T.card, border: `1.5px solid ${isSel ? T.indigo : T.border}`, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.18s' }}>
                        <div style={{ height: 4, background: mc.dot, borderRadius: '18px 18px 0 0' }} />
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 11, background: mc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{mc.icon}</div>
                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                              {[
                                { icon: '🖨', fn: () => printReceipt(p) },
                                { icon: '✏', fn: () => setEditModal({ open: true, payment: p }) },
                                { icon: '🗑', fn: () => handleDelete(p.id) },
                              ].map((btn, bi) => (
                                <button key={bi} onClick={btn.fn} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{btn.icon}</button>
                              ))}
                            </div>
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: T.green, letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(Number(p.amount || 0))}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s ? `${s.first_name} ${s.last_name}` : <span style={{ color: T.muted }}>Unknown</span>}</div>
                          <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', marginTop: 2 }}>{s?.admission_no || s?.admission_number || '—'} · {s ? getFormName(s.form_id) : '—'}</div>
                          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 10, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <MethodPill method={p.payment_method} />
                            <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{fmtDate(p.payment_date)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: T.indigo, fontWeight: 700, background: T.indigoL, padding: '1px 6px', borderRadius: 5 }}>{p.receipt_number || '—'}</span>
                            <span style={{ fontSize: 10, color: '#6d28d9', fontWeight: 700 }}>{t?.term_name || '—'}</span>
                          </div>
                          {p.mpesa_code && <div style={{ marginTop: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '4px 8px', fontSize: 10, fontFamily: 'monospace', color: '#15803d' }}>📱 {p.mpesa_code}</div>}
                        </div>
                        <div style={{ position: 'absolute', top: 10, right: 10 }} onClick={e => { e.stopPropagation(); toggleOne(p.id); }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? T.indigo : T.border}`, background: isSel ? T.indigo : T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {isSel && <span style={{ fontSize: 8, color: '#fff', fontWeight: 900 }}>✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.sub, fontWeight: 800, fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.sub, fontWeight: 800, fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ANALYTICS VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {!loading && view === 'analytics' && (
          <div className="fade-in">
            <AnalyticsView payments={filtered} students={students} terms={terms} getFormName={getFormName} />
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      <EditModal modal={editModal} onClose={() => setEditModal({ open: false, payment: null })} onSave={handleSave} students={students} terms={terms} getFormName={getFormName} />

      {/* ── RECEIPT PREVIEW MODAL ── */}
      {previewPayment && (() => {
        const p = previewPayment;
        const s = students.find((st: any) => st.id === p.student_id);
        const fees = s ? getStudentFees(s.id, s.form_id) : null;
        const mc = getM(p.payment_method);
        const term = terms.find((t: any) => Number(t.id) === Number(p.term_id));
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(8px)' }} onClick={() => setPreviewPayment(null)}>
            <div style={{ width: '100%', maxWidth: 400, borderRadius: 22, background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: "'Inter','Outfit',sans-serif" }} onClick={e => e.stopPropagation()}>
              {/* Coloured header */}
              <div style={{ background: mc.bg, borderBottom: `2px solid ${mc.dot}30`, padding: '24px 20px 20px', textAlign: 'center', position: 'relative' }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 10px', boxShadow: `0 4px 14px ${mc.dot}40` }}>{mc.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.text, fontFamily: "'Outfit',sans-serif" }}>Payment Receipt</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: T.sub, marginTop: 3 }}>{p.receipt_number}</div>
                <button onClick={() => setPreviewPayment(null)} style={{ position: 'absolute', top: 12, right: 14, width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontSize: 16, color: T.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Big amount */}
                <div style={{ background: T.greenL, border: `1.5px solid ${T.greenBd}`, borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Amount Paid</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#14532d', letterSpacing: '-0.03em' }}>{fmt(Number(p.amount))}</div>
                </div>

                {/* Details list */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {([
                    ['Student',    s ? `${s.first_name} ${s.last_name}` : '—'],
                    ['Adm No',     s?.admission_no || s?.admission_number || '—'],
                    ['Form',       s ? getFormName(s.form_id) : '—'],
                    ['Date',       fmtDateLong(p.payment_date)],
                    ['Method',     p.payment_method],
                    ...(p.mpesa_code      ? [['M-Pesa Code', p.mpesa_code]]         : []),
                    ...(p.bank_name      ? [['Bank', p.bank_name]]                   : []),
                    ...(p.reference_number ? [['Reference', p.reference_number]]     : []),
                    ...(term             ? [['Term', term.term_name]]                 : []),
                    ...(p.received_by    ? [['Received By', p.received_by]]           : []),
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: k === 'M-Pesa Code' ? T.green : T.text, fontFamily: k === 'M-Pesa Code' ? 'monospace' : "'Inter',sans-serif", textAlign: 'right', maxWidth: '55%' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Fee summary */}
                {fees && (
                  <div style={{ background: T.redL, border: `1.5px solid ${T.redBd}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Outstanding Balance</div>
                    {[['Term Balance', fees.termBalance], ['Annual Balance', fees.annualBalance], ['Total Paid', fees.totalPaid]].map(([k, v]: any) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>{k}</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: k === 'Total Paid' ? T.green : T.red }}>KES {v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
                <button onClick={() => copyReceipt(p)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.card, color: T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📋 Copy</button>
                <button onClick={() => { printReceipt(p); setPreviewPayment(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: T.indigo, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>🖨 Print</button>
                <button onClick={() => { setEditModal({ open: true, payment: p }); setPreviewPayment(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: T.amber, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>✏ Edit</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

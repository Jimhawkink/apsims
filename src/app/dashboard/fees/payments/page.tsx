'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, getMethodColor } from '../useFeeData';

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════════ */
type SortKey = 'payment_date' | 'amount' | 'student' | 'receipt_number' | 'payment_method';
type SortDir = 'asc' | 'desc';
type View = 'grid' | 'table' | 'analytics';

interface EditModal { open: boolean; payment: any | null; }

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════════ */
const METHOD_META: Record<string, { gradient: string; glow: string; icon: string; tag: string; chip: string }> = {
  'M-Pesa':        { gradient: 'from-emerald-500 to-green-600',   glow: '#10b981',  icon: '📱', tag: 'text-emerald-700 bg-emerald-50 ring-emerald-200',  chip: 'bg-emerald-500' },
  'Cash':          { gradient: 'from-amber-400 to-orange-500',    glow: '#f59e0b',  icon: '💵', tag: 'text-amber-700 bg-amber-50 ring-amber-200',         chip: 'bg-amber-500'   },
  'Bank Transfer': { gradient: 'from-sky-500 to-blue-600',        glow: '#0ea5e9',  icon: '🏦', tag: 'text-sky-700 bg-sky-50 ring-sky-200',               chip: 'bg-sky-500'     },
  'Bank':          { gradient: 'from-sky-500 to-blue-600',        glow: '#0ea5e9',  icon: '🏦', tag: 'text-sky-700 bg-sky-50 ring-sky-200',               chip: 'bg-sky-500'     },
  'Cheque':        { gradient: 'from-violet-500 to-purple-600',   glow: '#8b5cf6',  icon: '📄', tag: 'text-violet-700 bg-violet-50 ring-violet-200',      chip: 'bg-violet-500'  },
  'In-Kind':       { gradient: 'from-rose-500 to-pink-600',       glow: '#f43f5e',  icon: '🎁', tag: 'text-rose-700 bg-rose-50 ring-rose-200',            chip: 'bg-rose-500'    },
};
const getMeta = (m: string) => METHOD_META[m] ?? { gradient: 'from-slate-400 to-slate-500', glow: '#94a3b8', icon: '💳', tag: 'text-slate-600 bg-slate-50 ring-slate-200', chip: 'bg-slate-400' };

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateLong = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

/* ═══════════════════════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════════════════════ */

/** Neon-glow method chip */
function MethodPill({ method }: { method: string }) {
  const m = getMeta(method);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${m.tag}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.chip}`} />
      {method || '—'}
    </span>
  );
}

/** Premium stat card with animated gradient border */
function KPICard({ label, value, sub, gradient, icon, glow }: { label: string; value: string; sub: string; gradient: string; icon: string; glow: string }) {
  return (
    <div className="relative group overflow-hidden rounded-2xl" style={{ background: '#0f172a' }}>
      {/* Animated glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${glow}25 0%, transparent 70%)` }} />
      {/* Top accent bar */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg mb-3 shadow-lg`}>
          {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-white tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-slate-500 mt-1.5 font-semibold">{sub}</p>
      </div>
    </div>
  );
}

/** Sortable column header */
function ColHeader({ label, sortKey: sk, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sk;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(sk)}
        className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-200'}`}>
        {label}
        <span className="text-[9px]">{active ? (dir === 'asc' ? '↑' : '↓') : '⇅'}</span>
      </button>
    </th>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ANALYTICS VIEW
═══════════════════════════════════════════════════════════════════════════════ */
function AnalyticsView({ payments, students, terms, getFormName }: any) {
  const grandTotal = useMemo(() => payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), [payments]);

  const byMethod = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => {
      const m = p.payment_method || 'Unknown';
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count++;
      map[m].total += Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments]);

  const byForm = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => {
      const s = students.find((st: any) => st.id === p.student_id);
      const form = s ? getFormName(s.form_id) : 'Unknown';
      if (!map[form]) map[form] = { count: 0, total: 0 };
      map[form].count++;
      map[form].total += Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments, students, getFormName]);

  const byTerm = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => {
      const t = terms.find((tm: any) => tm.id === p.term_id);
      const tn = t?.term_name || 'No Term';
      if (!map[tn]) map[tn] = { count: 0, total: 0 };
      map[tn].count++;
      map[tn].total += Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [payments, terms]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }
    payments.forEach((p: any) => { if (map.hasOwnProperty(p.payment_date)) map[p.payment_date] += Number(p.amount || 0); });
    return Object.entries(map);
  }, [payments]);

  const maxDay = Math.max(...dailyTrend.map(d => d[1]), 1);

  return (
    <div className="space-y-5">
      {/* 14-Day Trend */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white">14-Day Collection Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Daily fee receipts over the past two weeks</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-[11px] font-black text-indigo-300" style={{ background: '#1e293b' }}>
            {fmtKES(grandTotal)}
          </div>
        </div>
        <div className="px-6 pb-6 flex items-end gap-1.5" style={{ height: '160px' }}>
          {dailyTrend.map(([date, amount]) => {
            const pct = (amount / maxDay) * 100;
            const label = new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full relative flex-1 flex items-end">
                  <div title={`${label}: ${fmt(amount)}`}
                    className="w-full rounded-t-lg transition-all duration-700 group-hover:brightness-125 cursor-pointer"
                    style={{
                      height: `${Math.max(pct, 3)}%`,
                      background: amount > 0
                        ? 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)'
                        : '#1e293b',
                      boxShadow: amount > 0 ? '0 0 12px #4f46e540' : 'none',
                      minHeight: 4,
                    }} />
                </div>
                <span className="text-[8px] text-slate-500 font-semibold whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Method */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">By Payment Method</h3>
          {byMethod.map(([method, { count, total }]) => {
            const m = getMeta(method);
            const pct = (total / grandTotal) * 100;
            return (
              <div key={method}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">{m.icon} {method}</span>
                  <span className="text-xs font-black text-white">{fmt(total)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  <div className={`h-full rounded-full bg-gradient-to-r ${m.gradient} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{count} payments · {pct.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>

        {/* By Form */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">By Form / Class</h3>
          {byForm.slice(0, 6).map(([form, { count, total }]) => {
            const pct = (total / grandTotal) * 100;
            return (
              <div key={form}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">{form}</span>
                  <span className="text-xs font-black text-white">{fmt(total)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{count} payments · {pct.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>

        {/* By Term */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">By Term</h3>
          {byTerm.map(([term, { count, total }]) => {
            const pct = (total / grandTotal) * 100;
            return (
              <div key={term}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300">{term}</span>
                  <span className="text-xs font-black text-white">{fmt(total)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{count} payments · {pct.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════════════════════════════════════════ */
function EditModal({ modal, onClose, onSave, students, terms, getFormName }: any) {
  const p = modal.payment;
  const s = p ? students.find((st: any) => st.id === p.student_id) : null;
  const [form, setForm] = useState({
    amount: '', payment_method: 'Cash', reference_number: '',
    mpesa_code: '', bank_name: '', payment_date: '',
    term_id: '', notes: '', received_by: '',
  });

  useEffect(() => {
    if (p) setForm({
      amount: p.amount || '', payment_method: p.payment_method || 'Cash',
      reference_number: p.reference_number || '', mpesa_code: p.mpesa_code || '',
      bank_name: p.bank_name || '', payment_date: p.payment_date || '',
      term_id: p.term_id || '', notes: p.notes || '', received_by: p.received_by || '',
    });
  }, [p]);

  if (!modal.open || !p) return null;

  const inp = `w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all 
    text-slate-100 placeholder:text-slate-500 
    focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0`
    + ' ' + 'bg-slate-800 border border-slate-700 focus:border-indigo-500';

  const methods = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Edit Payment</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {s ? `${s.first_name} ${s.last_name}` : ''} · {p.receipt_number}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 transition-all text-lg font-bold">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (KES)</label>
              <input type="number" className={inp} value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Date</label>
              <input type="date" className={inp} value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {methods.map(m => {
                const meta = getMeta(m);
                const active = form.payment_method === m;
                return (
                  <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                      ${active
                        ? `bg-gradient-to-r ${meta.gradient} border-transparent text-white shadow-lg`
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                    {meta.icon} {m}
                  </button>
                );
              })}
            </div>
          </div>

          {form.payment_method === 'M-Pesa' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">M-Pesa Code</label>
              <input className={inp} value={form.mpesa_code}
                onChange={e => setForm(f => ({ ...f, mpesa_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. RCK1AB2CD3" />
            </div>
          )}

          {(form.payment_method === 'Bank Transfer' || form.payment_method === 'Bank') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bank Name</label>
                <input className={inp} value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Equity, KCB..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reference No.</label>
                <input className={inp} value={form.reference_number}
                  onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Trans ref" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Term</label>
              <select className={inp} value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))}>
                <option value="">— Any term —</option>
                {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Received By</label>
              <input className={inp} value={form.received_by}
                onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} placeholder="Bursar name" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
            <textarea className={inp + ' resize-none h-16'} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 border border-slate-700 hover:border-slate-500 transition-all">
            Cancel
          </button>
          <button onClick={() => onSave({ ...p, ...form })}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRINT RECEIPT
═══════════════════════════════════════════════════════════════════════════════ */
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
.amt-block{margin:16px 0;padding:16px;border:2.5px solid #111;border-radius:10px;text-align:center;background:#fafafa}
.amt-block .lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#666}
.amt-block .num{font-size:28px;font-weight:900;margin-top:4px;letter-spacing:-1px}
.balances{margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px}
.bal-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}
.bal-row .label{color:#666;font-weight:600}
.bal-row .value{font-weight:900}
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

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════════ */
export default function PaymentHistoryPage() {
  const { students, payments, terms, loading, fetchAll, getFormName, getStreamName, getStudentFees } = useFeeData();

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amtMin, setAmtMin] = useState('');
  const [amtMax, setAmtMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Sort / Pagination / View ──
  const [sortKey, setSortKey] = useState<SortKey>('payment_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [view, setView] = useState<View>('table');

  // ── Selection / Modals ──
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editModal, setEditModal] = useState<EditModal>({ open: false, payment: null });
  const [previewPayment, setPreviewPayment] = useState<any>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcut: Ctrl+F → focus search ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Form options ──
  const formOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { const n = getFormName(s.form_id); if (n) set.add(n); });
    return Array.from(set).sort();
  }, [students, getFormName]);

  // ── Filtering + sorting ──
  const filtered = useMemo(() => {
    let list = [...payments];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const s = students.find(st => st.id === p.student_id);
        return (
          (s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)) ||
          (p.receipt_number || '').toLowerCase().includes(q) ||
          (s && (s.admission_no || s.admission_number || '').toString().toLowerCase().includes(q)) ||
          (p.mpesa_code || '').toLowerCase().includes(q) ||
          (p.reference_number || '').toLowerCase().includes(q) ||
          (p.bank_name || '').toLowerCase().includes(q)
        );
      });
    }
    if (filterMethod) list = list.filter(p => p.payment_method === filterMethod);
    if (filterForm) list = list.filter(p => {
      const s = students.find(st => st.id === p.student_id);
      return s && getFormName(s.form_id) === filterForm;
    });
    if (filterTerm) list = list.filter(p => String(p.term_id) === filterTerm);
    if (dateFrom) list = list.filter(p => p.payment_date >= dateFrom);
    if (dateTo)   list = list.filter(p => p.payment_date <= dateTo);
    if (amtMin)   list = list.filter(p => Number(p.amount) >= Number(amtMin));
    if (amtMax)   list = list.filter(p => Number(p.amount) <= Number(amtMax));

    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'amount') { av = Number(a.amount); bv = Number(b.amount); }
      else if (sortKey === 'student') {
        const sa = students.find(st => st.id === a.student_id);
        const sb = students.find(st => st.id === b.student_id);
        av = sa ? `${sa.first_name} ${sa.last_name}` : '';
        bv = sb ? `${sb.first_name} ${sb.last_name}` : '';
      } else if (sortKey === 'payment_method') { av = a.payment_method || ''; bv = b.payment_method || ''; }
      else if (sortKey === 'receipt_number') { av = a.receipt_number || ''; bv = b.receipt_number || ''; }
      else { av = a.payment_date || ''; bv = b.payment_date || ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [payments, students, search, filterMethod, filterForm, filterTerm, dateFrom, dateTo, amtMin, amtMax, sortKey, sortDir, getFormName]);

  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount || 0), 0), [filtered]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const hasActiveFilters = !!(search || filterMethod || filterForm || filterTerm || dateFrom || dateTo || amtMin || amtMax);

  // ── KPI stats ──
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = payments.filter(p => p.payment_date === today).reduce((s, p) => s + Number(p.amount || 0), 0);
    const mpesaTotal = payments.filter(p => p.payment_method === 'M-Pesa').reduce((s, p) => s + Number(p.amount || 0), 0);
    const grandTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const avgPayment = payments.length ? grandTotal / payments.length : 0;
    return { todayTotal, mpesaTotal, grandTotal, avgPayment, count: payments.length };
  }, [payments]);

  // ── Sort handler ──
  const handleSort = useCallback((k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
    setPage(1);
  }, [sortKey]);

  // ── Selection ──
  const allPageIds = paginated.map(p => p.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) allPageIds.forEach(id => next.delete(id));
    else allPageIds.forEach(id => next.add(id));
    setSelected(next);
  };
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // ── Actions ──
  const printReceipt = (p: any) => {
    const s = students.find(st => st.id === p.student_id);
    const fees = s ? getStudentFees(s.id, s.form_id) : null;
    const formName = s ? getFormName(s.form_id) : '—';
    const term = terms.find((t: any) => t.id === p.term_id);
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
      ['Receipt No', 'Student', 'Adm No', 'Form', 'Amount', 'Method', 'M-Pesa Code', 'Reference', 'Bank', 'Date', 'Term', 'Received By', 'Notes'],
      ...filtered.map(p => {
        const s = students.find(st => st.id === p.student_id);
        const t = terms.find((tm: any) => tm.id === p.term_id);
        return [
          p.receipt_number, s ? `${s.first_name} ${s.last_name}` : '',
          s?.admission_no || s?.admission_number || '', s ? getFormName(s.form_id) : '',
          p.amount, p.payment_method, p.mpesa_code || '', p.reference_number || '',
          p.bank_name || '', p.payment_date, t?.term_name || '', p.received_by || '', p.notes || '',
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `fee_payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return;
    const { error } = await supabase.from('school_fee_payments').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else { toast.success('Payment deleted'); fetchAll(); setSelected(s => { const n = new Set(s); n.delete(id); return n; }); }
  };

  const handleSave = async (data: any) => {
    const { error } = await supabase.from('school_fee_payments').update({
      amount: Number(data.amount), payment_method: data.payment_method,
      reference_number: data.reference_number, mpesa_code: data.mpesa_code,
      bank_name: data.bank_name, payment_date: data.payment_date,
      term_id: data.term_id || null, notes: data.notes, received_by: data.received_by,
    }).eq('id', data.id);
    if (error) toast.error('Update failed: ' + error.message);
    else { toast.success('Payment updated ✓'); fetchAll(); setEditModal({ open: false, payment: null }); }
  };

  const clearFilters = () => {
    setSearch(''); setFilterMethod(''); setFilterForm('');
    setFilterTerm(''); setDateFrom(''); setDateTo('');
    setAmtMin(''); setAmtMax(''); setPage(1);
  };

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: '#060b14' }}>
      {/* ── Ambient glow bg ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── PAGE HEADER ── */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #1e293b' }}>
          <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/fees" className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">
                  ← Fees
                </Link>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-bold text-indigo-400">Payment History</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">Fee Payment History</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {payments.length.toLocaleString()} records · AlphaSchool SMS
              </p>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                {([
                  { v: 'table' as View,     icon: '⊞', label: 'Table'     },
                  { v: 'grid' as View,      icon: '⊟', label: 'Cards'     },
                  { v: 'analytics' as View, icon: '⌁', label: 'Analytics' },
                ] as const).map(({ v, icon, label }) => (
                  <button key={v} onClick={() => { setView(v); setPage(1); }}
                    title={label}
                    className={`px-3.5 py-2 text-xs font-black transition-all ${
                      view === v
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                    style={{
                      background: view === v ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#0f172a'
                    }}>
                    {icon}
                  </button>
                ))}
              </div>

              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
                style={{ background: '#0f172a' }}>
                ↓ Export
              </button>

              <button onClick={() => fetchAll()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
                style={{ background: '#0f172a' }}>
                ↺ Refresh
              </button>

              <Link href="/fees/record"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                + Record Payment
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
          {/* ── KPI CARDS ── */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: '#0f172a' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Grand Total Collected"
                value={fmt(stats.grandTotal)}
                sub={`${stats.count.toLocaleString()} payments total`}
                gradient="from-indigo-500 to-violet-600"
                glow="#6366f1"
                icon="💰"
              />
              <KPICard
                label="Today's Collections"
                value={fmt(stats.todayTotal)}
                sub={new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}
                gradient="from-emerald-500 to-teal-600"
                glow="#10b981"
                icon="📅"
              />
              <KPICard
                label="M-Pesa Collections"
                value={fmt(stats.mpesaTotal)}
                sub={`${((stats.mpesaTotal / (stats.grandTotal || 1)) * 100).toFixed(1)}% of total`}
                gradient="from-green-500 to-emerald-600"
                glow="#22c55e"
                icon="📱"
              />
              <KPICard
                label="Average Payment"
                value={fmt(stats.avgPayment)}
                sub="Per transaction"
                gradient="from-amber-400 to-orange-500"
                glow="#f59e0b"
                icon="📊"
              />
            </div>
          )}

          {/* ── SEARCH + FILTERS BAR ── */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
            <div className="flex gap-2 flex-wrap items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search student, receipt, M-Pesa code… (Ctrl+F)"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                  style={{ background: '#1e293b', border: '1px solid #334155' }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); searchRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg transition-colors">
                    ×
                  </button>
                )}
              </div>

              {/* Quick filter pills */}
              {['M-Pesa', 'Cash', 'Bank Transfer'].map(m => (
                <button key={m} onClick={() => { setFilterMethod(filterMethod === m ? '' : m); setPage(1); }}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all border
                    ${filterMethod === m
                      ? `bg-gradient-to-r ${getMeta(m).gradient} border-transparent text-white`
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                  style={{ background: filterMethod === m ? undefined : '#1e293b' }}>
                  {getMeta(m).icon} {m}
                </button>
              ))}

              <button onClick={() => setShowFilters(s => !s)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all border
                  ${showFilters || hasActiveFilters
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                style={{ background: '#1e293b' }}>
                ⚙ Filters {hasActiveFilters && <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center">!</span>}
              </button>

              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700/50 transition-all"
                  style={{ background: '#1e293b' }}>
                  ✕ Clear
                </button>
              )}

              {/* Per page */}
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs font-black text-slate-300 border border-slate-700 outline-none transition-all focus:border-indigo-500 ml-auto"
                style={{ background: '#1e293b' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>

            {/* ── Advanced filters panel ── */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2" style={{ borderTop: '1px solid #1e293b' }}>
                <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }}>
                  <option value="">All Forms</option>
                  {formOptions.map(f => <option key={f}>{f}</option>)}
                </select>
                <select value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }}>
                  <option value="">All Terms</option>
                  {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }} placeholder="From" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }} placeholder="To" />
                <input type="number" value={amtMin} onChange={e => { setAmtMin(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }} placeholder="Min amount" />
                <input type="number" value={amtMax} onChange={e => { setAmtMax(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 outline-none focus:border-indigo-500"
                  style={{ background: '#1e293b' }} placeholder="Max amount" />
              </div>
            )}
          </div>

          {/* ── Results summary line ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">
                {filtered.length.toLocaleString()} results
                {hasActiveFilters && <span className="text-indigo-400 ml-1">(filtered)</span>}
              </span>
              {selected.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ background: '#1e293b' }}>
                  <span className="text-xs font-black text-indigo-300">{selected.size} selected</span>
                  <button onClick={() => setSelected(new Set())} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">✕ clear</button>
                </div>
              )}
            </div>
            <span className="text-xs font-black text-emerald-400">{fmt(totalAmount)}</span>
          </div>

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b animate-pulse" style={{ borderColor: '#1e293b' }}>
                  <div className="w-8 h-8 rounded-lg" style={{ background: '#1e293b' }} />
                  <div className="flex-1 h-3 rounded-lg" style={{ background: '#1e293b', maxWidth: '40%' }} />
                  <div className="w-20 h-3 rounded-lg ml-auto" style={{ background: '#1e293b' }} />
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TABLE VIEW
          ════════════════════════════════════════════════════════════════ */}
          {!loading && view === 'table' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#0c1425', borderBottom: '1px solid #1e293b' }}>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                          className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                      </th>
                      <ColHeader label="Receipt #"    sortKey="receipt_number" current={sortKey} dir={sortDir} onSort={handleSort} />
                      <ColHeader label="Student"      sortKey="student"        current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Form</th>
                      <ColHeader label="Amount"       sortKey="amount"         current={sortKey} dir={sortDir} onSort={handleSort} />
                      <ColHeader label="Method"       sortKey="payment_method" current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Ref / Code</th>
                      <ColHeader label="Date"         sortKey="payment_date"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Term</th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-5 py-16 text-center">
                          <div className="text-3xl mb-2">🔍</div>
                          <p className="text-slate-400 font-bold text-sm">No payments found</p>
                          <p className="text-slate-600 text-xs mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    )}
                    {paginated.map((p, i) => {
                      const s = students.find(st => st.id === p.student_id);
                      const t = terms.find((tm: any) => tm.id === p.term_id);
                      const meta = getMeta(p.payment_method);
                      const isSel = selected.has(p.id);
                      return (
                        <tr key={p.id}
                          className={`group transition-colors cursor-pointer border-b
                            ${isSel ? '' : 'hover:bg-slate-800/40'}`}
                          style={{
                            borderColor: '#1e293b',
                            background: isSel ? '#1e293b' : undefined,
                          }}
                          onClick={() => setPreviewPayment(p)}>
                          {/* Checkbox */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleOne(p.id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer" />
                          </td>
                          {/* Receipt */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-indigo-400 tracking-wide">{p.receipt_number || '—'}</span>
                          </td>
                          {/* Student */}
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-xs font-black text-slate-100">
                                {s ? `${s.first_name} ${s.last_name}` : <span className="text-slate-500">Unknown</span>}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {s?.admission_no || s?.admission_number || '—'}
                              </p>
                            </div>
                          </td>
                          {/* Form */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-bold text-slate-400">
                              {s ? getFormName(s.form_id) : '—'}
                            </span>
                          </td>
                          {/* Amount */}
                          <td className="px-4 py-3">
                            <span className="text-sm font-black text-emerald-400 tabular-nums">
                              {fmt(Number(p.amount || 0))}
                            </span>
                          </td>
                          {/* Method */}
                          <td className="px-4 py-3">
                            <MethodPill method={p.payment_method} />
                          </td>
                          {/* Ref */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-slate-400 tracking-wider">
                              {p.mpesa_code || p.reference_number || p.bank_name || '—'}
                            </span>
                          </td>
                          {/* Date */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                              {fmtDate(p.payment_date)}
                            </span>
                          </td>
                          {/* Term */}
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-slate-500 font-semibold">{t?.term_name || '—'}</span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPreviewPayment(p)} title="Preview" 
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all text-xs">
                                👁
                              </button>
                              <button onClick={() => printReceipt(p)} title="Print"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all text-xs">
                                🖨
                              </button>
                              <button onClick={() => copyReceipt(p)} title="Copy"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all text-xs">
                                📋
                              </button>
                              <button onClick={() => setEditModal({ open: true, payment: p })} title="Edit"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all text-xs">
                                ✏
                              </button>
                              <button onClick={() => handleDelete(p.id)} title="Delete"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs">
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#0c1425', borderTop: '1px solid #1e293b' }}>
                      <td colSpan={4} className="px-5 py-3">
                        <span className="text-xs font-black text-slate-500">
                          {filtered.length.toLocaleString()} payments
                          {selected.size > 0 && <span className="ml-2 text-indigo-400">· {selected.size} selected</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-emerald-400">{fmt(totalAmount)}</span>
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: '1px solid #1e293b' }}>
                  <p className="text-xs text-slate-500 font-semibold">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '«', action: () => setPage(1), dis: page === 1 },
                      { label: '‹', action: () => setPage(p => Math.max(1, p - 1)), dis: page === 1 },
                    ].map(({ label, action, dis }) => (
                      <button key={label} onClick={action} disabled={dis}
                        className="w-7 h-7 rounded-lg text-xs font-black text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                        style={{ background: '#1e293b' }}>
                        {label}
                      </button>
                    ))}
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let pg: number;
                      if (totalPages <= 7) pg = i + 1;
                      else if (page <= 4) pg = i + 1;
                      else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                      else pg = page - 3 + i;
                      return (
                        <button key={pg} onClick={() => setPage(pg)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all
                            ${page === pg ? 'text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                          style={{
                            background: page === pg ? 'linear-gradient(135deg, #6366f1, #4338ca)' : '#1e293b'
                          }}>
                          {pg}
                        </button>
                      );
                    })}
                    {[
                      { label: '›', action: () => setPage(p => Math.min(totalPages, p + 1)), dis: page === totalPages },
                      { label: '»', action: () => setPage(totalPages), dis: page === totalPages },
                    ].map(({ label, action, dis }) => (
                      <button key={label} onClick={action} disabled={dis}
                        className="w-7 h-7 rounded-lg text-xs font-black text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                        style={{ background: '#1e293b' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              CARD / GRID VIEW
          ════════════════════════════════════════════════════════════════ */}
          {!loading && view === 'grid' && (
            <>
              {paginated.length === 0 ? (
                <div className="rounded-2xl p-16 text-center" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-400 font-bold">No payments match your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {paginated.map(p => {
                    const s = students.find(st => st.id === p.student_id);
                    const t = terms.find((tm: any) => tm.id === p.term_id);
                    const meta = getMeta(p.payment_method);
                    const isSel = selected.has(p.id);
                    return (
                      <div key={p.id}
                        onClick={() => setPreviewPayment(p)}
                        className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: '#0f172a',
                          border: isSel ? '1px solid #6366f1' : '1px solid #1e293b',
                          boxShadow: isSel ? '0 0 0 1px #6366f140' : undefined,
                        }}>
                        {/* Top gradient accent */}
                        <div className={`h-0.5 w-full bg-gradient-to-r ${meta.gradient} rounded-t-2xl`} />

                        <div className="p-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base shadow-md`}>
                              {meta.icon}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button onClick={() => printReceipt(p)} title="Print"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 text-[11px] transition-colors">🖨</button>
                              <button onClick={() => setEditModal({ open: true, payment: p })} title="Edit"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-400 text-[11px] transition-colors">✏</button>
                              <button onClick={() => handleDelete(p.id)} title="Delete"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 text-[11px] transition-colors">🗑</button>
                            </div>
                          </div>

                          {/* Amount */}
                          <p className="text-xl font-black text-emerald-400 tabular-nums leading-none mb-1">
                            {fmt(Number(p.amount || 0))}
                          </p>

                          {/* Student */}
                          <p className="text-xs font-black text-slate-100 truncate">
                            {s ? `${s.first_name} ${s.last_name}` : <span className="text-slate-500">Unknown</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {s?.admission_no || s?.admission_number || '—'} · {s ? getFormName(s.form_id) : '—'}
                          </p>

                          {/* Divider */}
                          <div className="my-3" style={{ borderTop: '1px solid #1e293b' }} />

                          {/* Meta row */}
                          <div className="flex items-center justify-between">
                            <MethodPill method={p.payment_method} />
                            <span className="text-[10px] text-slate-500 font-semibold">{fmtDate(p.payment_date)}</span>
                          </div>

                          {/* Receipt + term */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-[10px] text-indigo-400/80 font-bold">{p.receipt_number || '—'}</span>
                            <span className="text-[10px] text-slate-600 font-semibold">{t?.term_name || '—'}</span>
                          </div>

                          {/* M-Pesa code if present */}
                          {p.mpesa_code && (
                            <div className="mt-2 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-400/80"
                              style={{ background: '#0d1f17' }}>
                              📱 {p.mpesa_code}
                            </div>
                          )}
                        </div>

                        {/* Select overlay */}
                        <div className="absolute top-3 right-3" onClick={e => { e.stopPropagation(); toggleOne(p.id); }}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                            ${isSel ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 opacity-0 group-hover:opacity-100'}`}>
                            {isSel && <span className="text-[8px] text-white font-black">✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Card pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-xl text-xs font-black text-slate-400 border border-slate-700 disabled:opacity-30 hover:border-slate-500 hover:text-slate-200 transition-all"
                    style={{ background: '#0f172a' }}>
                    ← Prev
                  </button>
                  <span className="text-xs font-black text-slate-500 px-4">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl text-xs font-black text-slate-400 border border-slate-700 disabled:opacity-30 hover:border-slate-500 hover:text-slate-200 transition-all"
                    style={{ background: '#0f172a' }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              ANALYTICS VIEW
          ════════════════════════════════════════════════════════════════ */}
          {!loading && view === 'analytics' && (
            <AnalyticsView payments={filtered} students={students} terms={terms} getFormName={getFormName} />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <EditModal
        modal={editModal}
        onClose={() => setEditModal({ open: false, payment: null })}
        onSave={handleSave}
        students={students}
        terms={terms}
        getFormName={getFormName}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          RECEIPT PREVIEW MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {previewPayment && (() => {
        const p = previewPayment;
        const s = students.find((st: any) => st.id === p.student_id);
        const fees = s ? getStudentFees(s.id, s.form_id) : null;
        const meta = getMeta(p.payment_method);
        const term = terms.find((t: any) => t.id === p.term_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setPreviewPayment(null)}>
            <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
              onClick={e => e.stopPropagation()}>
              {/* Gradient header */}
              <div className={`px-6 pt-8 pb-6 text-center bg-gradient-to-b ${meta.gradient}`}
                style={{ position: 'relative' }}>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl mx-auto mb-3 shadow-xl">
                  {meta.icon}
                </div>
                <h2 className="text-lg font-black text-white">Payment Receipt</h2>
                <p className="font-mono text-sm font-bold text-white/70 mt-0.5">{p.receipt_number}</p>
                <button onClick={() => setPreviewPayment(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-base font-bold flex items-center justify-center transition-all">
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Big amount */}
                <div className="rounded-xl p-4 text-center" style={{ background: '#0c1a0f', border: '1px solid #14532d' }}>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Amount Paid</p>
                  <p className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">{fmt(Number(p.amount))}</p>
                </div>

                {/* Details */}
                <div className="space-y-0">
                  {([
                    ['Student', s ? `${s.first_name} ${s.last_name}` : '—'],
                    ['Adm No', s?.admission_no || s?.admission_number || '—'],
                    ['Form', s ? getFormName(s.form_id) : '—'],
                    ['Date', fmtDateLong(p.payment_date)],
                    ['Method', p.payment_method],
                    ...(p.mpesa_code    ? [['M-Pesa Code', p.mpesa_code]]         : []),
                    ...(p.bank_name    ? [['Bank', p.bank_name]]                  : []),
                    ...(p.reference_number ? [['Reference', p.reference_number]]  : []),
                    ...(term           ? [['Term', term.term_name]]                : []),
                    ...(p.received_by  ? [['Received By', p.received_by]]          : []),
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e293b' }}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k}</span>
                      <span className={`text-xs font-black text-right max-w-[55%] ${k === 'M-Pesa Code' ? 'font-mono text-emerald-400' : 'text-slate-200'}`}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Fee summary */}
                {fees && (
                  <div className="rounded-xl p-3 space-y-2" style={{ background: '#1a0a0a', border: '1px solid #7f1d1d' }}>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Outstanding Balance</p>
                    {[
                      ['Term Balance', fees.termBalance],
                      ['Annual Balance', fees.annualBalance],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between">
                        <span className="text-[11px] text-slate-500 font-semibold">{k}</span>
                        <span className="text-[11px] font-black text-red-400">KES {(v as number).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">Total Paid</span>
                      <span className="text-[11px] font-black text-emerald-400">KES {fees.totalPaid.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => copyReceipt(p)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-all"
                  style={{ background: '#1e293b' }}>
                  📋 Copy
                </button>
                <button onClick={() => { printReceipt(p); setPreviewPayment(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
                  🖨 Print
                </button>
                <button onClick={() => { setEditModal({ open: true, payment: p }); setPreviewPayment(null); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  ✏ Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

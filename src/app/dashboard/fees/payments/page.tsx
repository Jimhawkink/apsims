'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, getMethodColor } from '../useFeeData';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type SortKey = 'payment_date' | 'amount' | 'student' | 'receipt_number' | 'payment_method';
type SortDir = 'asc' | 'desc';
type View = 'table' | 'cards' | 'analytics';

interface EditModal {
  open: boolean;
  payment: any | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER: payment method config
───────────────────────────────────────────────────────────────────────────── */
const METHOD_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
  'M-Pesa':        { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '📱' },
  'Cash':          { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-500',   icon: '💵' },
  'Bank Transfer': { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-700',    dot: 'bg-blue-500',    icon: '🏦' },
  'Bank':          { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-700',    dot: 'bg-blue-500',    icon: '🏦' },
  'Cheque':        { bg: 'bg-violet-50 border-violet-200',   text: 'text-violet-700',  dot: 'bg-violet-500',  icon: '📄' },
  'In-Kind':       { bg: 'bg-rose-50 border-rose-200',       text: 'text-rose-700',    dot: 'bg-rose-500',    icon: '🎁' },
};
const getMethodConfig = (m: string) => METHOD_CONFIG[m] ?? { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400', icon: '💳' };

const fmtDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateLong = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${color} shadow-lg`}>
      <div className="absolute -right-4 -top-4 text-5xl opacity-20 select-none">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
      <p className="text-[10px] opacity-70 mt-1.5 font-semibold">{sub}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cfg = getMethodConfig(method);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {method || '—'}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANALYTICS VIEW
───────────────────────────────────────────────────────────────────────────── */
function AnalyticsView({ payments, students, terms, getFormName }: any) {
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

  // Daily trend (last 14 days)
  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }
    payments.forEach((p: any) => {
      if (map.hasOwnProperty(p.payment_date)) map[p.payment_date] += Number(p.amount || 0);
    });
    return Object.entries(map);
  }, [payments]);

  const maxDay = Math.max(...dailyTrend.map(d => d[1]), 1);
  const grandTotal = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Daily Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-black text-gray-800 mb-5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs">📈</span>
          14-Day Collection Trend
        </h3>
        <div className="flex items-end gap-1.5 h-32">
          {dailyTrend.map(([date, amount]) => {
            const pct = (amount / maxDay) * 100;
            const label = new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1 group" title={`${label}: ${fmt(amount)}`}>
                <div className="w-full relative" style={{ height: '96px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-500 group-hover:opacity-80"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: amount > 0
                        ? 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)'
                        : '#f1f5f9',
                    }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-semibold rotate-45 origin-left ml-1">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* By Method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-800 mb-4">By Payment Method</h3>
          <div className="space-y-3">
            {byMethod.map(([method, { count, total }]) => {
              const cfg = getMethodConfig(method);
              const pct = (total / grandTotal) * 100;
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${cfg.text}`}>{cfg.icon} {method}</span>
                    <span className="text-xs font-black text-gray-700">{fmt(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.dot} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} payments · {pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-800 mb-4">By Form / Class</h3>
          <div className="space-y-3">
            {byForm.slice(0, 6).map(([form, { count, total }]) => {
              const pct = (total / grandTotal) * 100;
              return (
                <div key={form}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{form}</span>
                    <span className="text-xs font-black text-gray-700">{fmt(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} payments · {pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Term */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-800 mb-4">By Term</h3>
          <div className="space-y-3">
            {byTerm.map(([term, { count, total }]) => {
              const pct = (total / grandTotal) * 100;
              return (
                <div key={term}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{term}</span>
                    <span className="text-xs font-black text-gray-700">{fmt(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} payments · {pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function EditModal({ modal, onClose, onSave, students, terms, getFormName }: {
  modal: EditModal;
  onClose: () => void;
  onSave: (data: any) => void;
  students: any[];
  terms: any[];
  getFormName: (id: number) => string;
}) {
  const p = modal.payment;
  const s = p ? students.find((st: any) => st.id === p.student_id) : null;
  const [form, setForm] = useState({
    amount: p?.amount || '',
    payment_method: p?.payment_method || 'Cash',
    reference_number: p?.reference_number || '',
    mpesa_code: p?.mpesa_code || '',
    bank_name: p?.bank_name || '',
    payment_date: p?.payment_date || '',
    term_id: p?.term_id || '',
    notes: p?.notes || '',
    received_by: p?.received_by || '',
  });

  useEffect(() => {
    if (p) setForm({
      amount: p.amount || '',
      payment_method: p.payment_method || 'Cash',
      reference_number: p.reference_number || '',
      mpesa_code: p.mpesa_code || '',
      bank_name: p.bank_name || '',
      payment_date: p.payment_date || '',
      term_id: p.term_id || '',
      notes: p.notes || '',
      received_by: p.received_by || '',
    });
  }, [p]);

  if (!modal.open || !p) return null;

  const inp = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold bg-white focus:border-indigo-400 outline-none transition-all placeholder:font-normal placeholder:text-gray-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Edit Payment</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {s ? `${s.first_name} ${s.last_name}` : ''} · {p.receipt_number}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors text-gray-500 text-lg font-bold">×</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Amount (KES)</label>
              <input type="number" className={inp} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Payment Date</label>
              <input type="date" className={inp} value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
            <select className={inp} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              {['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {form.payment_method === 'M-Pesa' && (
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">M-Pesa Code</label>
              <input type="text" className={inp} value={form.mpesa_code} onChange={e => setForm(f => ({ ...f, mpesa_code: e.target.value.toUpperCase() }))} placeholder="e.g. QHR4K..." />
            </div>
          )}
          {(form.payment_method === 'Bank Transfer' || form.payment_method === 'Cheque') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Bank Name</label>
                <input type="text" className={inp} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="KCB, Equity..." />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Reference No</label>
                <input type="text" className={inp} value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Term</label>
              <select className={inp} value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: Number(e.target.value) }))}>
                <option value="">— No Term —</option>
                {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Received By</label>
              <input type="text" className={inp} value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} placeholder="Cashier name" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea rows={2} className={inp + ' resize-none'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ ...p, ...form })}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all hover:shadow-indigo-300/60 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRINT RECEIPT
───────────────────────────────────────────────────────────────────────────── */
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
.red{color:#dc2626}
.green{color:#16a34a}
.footer{margin-top:16px;padding-top:12px;border-top:3px double #111;text-align:center}
.footer p{font-size:9px;color:#888;margin:2px 0}
.watermark{position:absolute;opacity:0.03;font-size:80px;font-weight:900;transform:rotate(-30deg);top:40%;left:0;right:0;text-align:center;pointer-events:none}
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

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function PaymentHistoryPage() {
  const { students, payments, terms, loading, fetchAll, getFormName, getStreamName, getStudentFees } = useFeeData();

  // Filters
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amtMin, setAmtMin] = useState('');
  const [amtMax, setAmtMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('payment_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // View
  const [view, setView] = useState<View>('table');

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modals
  const [editModal, setEditModal] = useState<EditModal>({ open: false, payment: null });
  const [previewPayment, setPreviewPayment] = useState<any>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── derived: unique form names for filter ── */
  const formOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { const n = getFormName(s.form_id); if (n) set.add(n); });
    return Array.from(set).sort();
  }, [students, getFormName]);

  /* ── filtering + sorting ── */
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
    if (dateTo) list = list.filter(p => p.payment_date <= dateTo);
    if (amtMin) list = list.filter(p => Number(p.amount) >= Number(amtMin));
    if (amtMax) list = list.filter(p => Number(p.amount) <= Number(amtMax));

    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'amount') { av = Number(a.amount); bv = Number(b.amount); }
      else if (sortKey === 'student') {
        const sa = students.find(st => st.id === a.student_id);
        const sb = students.find(st => st.id === b.student_id);
        av = sa ? `${sa.first_name} ${sa.last_name}` : '';
        bv = sb ? `${sb.first_name} ${sb.last_name}` : '';
      } else {
        av = (a as any)[sortKey] || '';
        bv = (b as any)[sortKey] || '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [payments, students, search, filterMethod, filterForm, filterTerm, dateFrom, dateTo, amtMin, amtMax, sortKey, sortDir, getFormName]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);
  const avgAmount = filtered.length ? totalAmount / filtered.length : 0;

  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.payment_date === today);
  const todayTotal = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // This week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split('T')[0];
  const weekTotal = payments.filter(p => p.payment_date >= weekStr).reduce((s, p) => s + Number(p.amount || 0), 0);

  const grandTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const hasActiveFilters = !!(search || filterMethod || filterForm || filterTerm || dateFrom || dateTo || amtMin || amtMax);
  const activeFilterCount = [search, filterMethod, filterForm, filterTerm, dateFrom, dateTo, amtMin, amtMax].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setFilterMethod(''); setFilterForm(''); setFilterTerm('');
    setDateFrom(''); setDateTo(''); setAmtMin(''); setAmtMax('');
    setPage(1);
  };

  /* ── sort helper ── */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 opacity-50">
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  /* ── selection ── */
  const toggleSelect = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(paginated.map(p => p.id)));
  const clearSelection = () => setSelected(new Set());
  const isAllSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id));

  /* ── export ── */
  const exportCSV = () => {
    const headers = ['#', 'Date', 'Receipt No', 'Adm No', 'Student Name', 'Form', 'Stream', 'Amount (KES)', 'Payment Method', 'M-Pesa Code', 'Bank Name', 'Reference No', 'Term', 'Received By', 'Notes'];
    const rows = filtered.map((p, i) => {
      const s = students.find(st => st.id === p.student_id);
      return [
        i + 1,
        p.payment_date,
        p.receipt_number || '',
        s?.admission_no || s?.admission_number || '',
        s ? `${s.first_name} ${s.last_name}` : '',
        s ? getFormName(s.form_id) : '',
        s ? getStreamName(s.stream_id) : '',
        p.amount,
        p.payment_method || '',
        p.mpesa_code || '',
        p.bank_name || '',
        p.reference_number || '',
        terms.find(t => t.id === p.term_id)?.term_name || '',
        p.received_by || '',
        (p.notes || '').replace(/,/g, ';'),
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fee_payments_${today}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  /* ── delete ── */
  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this payment record? This action cannot be undone.')) return;
    const { error } = await supabase.from('school_fee_payments').delete().eq('id', id);
    if (error) { toast.error('Delete failed: ' + error.message); return; }
    toast.success('Payment deleted');
    fetchAll();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected payment(s)? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('school_fee_payments').delete().in('id', ids);
    if (error) { toast.error('Bulk delete failed'); return; }
    toast.success(`${ids.length} payment(s) deleted`);
    setSelected(new Set());
    fetchAll();
  };

  /* ── edit/save ── */
  const handleSave = async (data: any) => {
    const { error } = await supabase.from('school_fee_payments').update({
      amount: Number(data.amount),
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      mpesa_code: data.mpesa_code,
      bank_name: data.bank_name,
      payment_date: data.payment_date,
      term_id: data.term_id || null,
      notes: data.notes,
      received_by: data.received_by,
    }).eq('id', data.id);
    if (error) { toast.error('Update failed'); return; }
    toast.success('Payment updated');
    setEditModal({ open: false, payment: null });
    fetchAll();
  };

  /* ── print ── */
  const printReceipt = (p: any) => {
    const s = students.find(st => st.id === p.student_id);
    const fees = s ? getStudentFees(s.id, s.form_id) : null;
    const formName = s ? getFormName(s.form_id) : '—';
    const termName = terms.find(t => t.id === p.term_id)?.term_name || '—';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildReceipt(p, s, fees, formName, termName));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  /* ── copy receipt ── */
  const copyReceipt = (p: any) => {
    const s = students.find(st => st.id === p.student_id);
    const text = `Fee Receipt\nReceipt: ${p.receipt_number}\nStudent: ${s ? `${s.first_name} ${s.last_name}` : '—'}\nDate: ${fmtDate(p.payment_date)}\nAmount: KES ${Number(p.amount).toLocaleString()}\nMethod: ${p.payment_method}\n${p.mpesa_code ? `M-Pesa: ${p.mpesa_code}` : ''}`;
    navigator.clipboard.writeText(text).then(() => toast.success('Receipt details copied'));
  };

  /* ── loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-sm font-bold text-gray-500">Loading payment records…</p>
      </div>
    </div>
  );

  const inputCls = "px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold bg-white focus:border-indigo-400 outline-none transition-all placeholder:font-normal placeholder:text-gray-400";

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-300/50 text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' }}>
            💳
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payment History</h1>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">{payments.length.toLocaleString()} total records · All fee transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View toggles */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {(['table', 'cards', 'analytics'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${view === v ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'table' ? '⊞ Table' : v === 'cards' ? '⊟ Cards' : '📊 Analytics'}
              </button>
            ))}
          </div>
          <Link href="/dashboard/fees"
            className="px-4 py-2 rounded-xl text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
            ← Fee Dashboard
          </Link>
          <Link href="/dashboard/fees/collect"
            className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md shadow-emerald-300/40 flex items-center gap-1.5 transition-all hover:shadow-emerald-400/60 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            + Record Payment
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today" value={fmt(todayTotal)} sub={`${todayPayments.length} payments`} color="bg-gradient-to-br from-emerald-500 to-teal-600" icon="📅" />
        <StatCard label="This Week" value={fmt(weekTotal)} sub="last 7 days" color="bg-gradient-to-br from-blue-500 to-indigo-600" icon="📆" />
        <StatCard label="All Time" value={fmt(grandTotal)} sub={`${payments.length} records`} color="bg-gradient-to-br from-violet-500 to-purple-700" icon="🏦" />
        <StatCard label="Avg Payment" value={fmt(avgAmount)} sub="per transaction" color="bg-gradient-to-br from-amber-500 to-orange-600" icon="📊" />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, admission no, receipt, M-Pesa code…"
              className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-indigo-400 outline-none transition-all placeholder:font-normal placeholder:text-gray-400 bg-gray-50/50"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs text-gray-600 transition-colors">×</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${showFilters ? 'bg-indigo-600 text-white shadow-md' : 'border-2 border-gray-200 text-gray-600 hover:border-indigo-300'}`}
            >
              ⚙ Filters
              {activeFilterCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${showFilters ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>{activeFilterCount}</span>
              )}
            </button>

            <button onClick={exportCSV}
              className="px-4 py-2.5 rounded-xl text-sm font-black text-white flex items-center gap-1.5 shadow-md shadow-blue-300/40 transition-all hover:shadow-blue-400/60 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50/80 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1); }} className={inputCls + ' w-full'}>
                  <option value="">All Methods</option>
                  {['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'In-Kind'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Form / Class</label>
                <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }} className={inputCls + ' w-full'}>
                  <option value="">All Forms</option>
                  {formOptions.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Term</label>
                <select value={filterTerm} onChange={e => { setFilterTerm(e.target.value); setPage(1); }} className={inputCls + ' w-full'}>
                  <option value="">All Terms</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Rows Per Page</label>
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className={inputCls + ' w-full'}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} rows</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Date From</label>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Date To</label>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Min Amount (KES)</label>
                <input type="number" value={amtMin} onChange={e => { setAmtMin(e.target.value); setPage(1); }} placeholder="0" className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Max Amount (KES)</label>
                <input type="number" value={amtMax} onChange={e => { setAmtMax(e.target.value); setPage(1); }} placeholder="999,999" className={inputCls + ' w-full'} />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-semibold">Active filters:</span>
                {search && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">Search: "{search}" <button onClick={() => setSearch('')} className="hover:text-red-600 ml-0.5">×</button></span>}
                {filterMethod && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">Method: {filterMethod} <button onClick={() => setFilterMethod('')} className="hover:text-red-600 ml-0.5">×</button></span>}
                {filterForm && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">Form: {filterForm} <button onClick={() => setFilterForm('')} className="hover:text-red-600 ml-0.5">×</button></span>}
                {filterTerm && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">Term <button onClick={() => setFilterTerm('')} className="hover:text-red-600 ml-0.5">×</button></span>}
                {(dateFrom || dateTo) && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">Date range <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:text-red-600 ml-0.5">×</button></span>}
                <button onClick={clearFilters} className="px-3 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-colors">Clear All</button>
              </div>
            )}
          </div>
        )}

        {/* Results bar */}
        <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <p className="text-xs font-black text-gray-600">
              {filtered.length.toLocaleString()} payments
              {hasActiveFilters && <span className="text-gray-400 font-semibold"> (filtered from {payments.length.toLocaleString()})</span>}
            </p>
            <span className="text-gray-300">|</span>
            <p className="text-xs font-black text-emerald-700">Total: {fmt(totalAmount)}</p>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600">{selected.size} selected</span>
              <button onClick={handleBulkDelete} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-black hover:bg-red-700 transition-colors">Delete Selected</button>
              <button onClick={clearSelection} className="px-3 py-1 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300 transition-colors">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Analytics view ── */}
      {view === 'analytics' && (
        <AnalyticsView payments={filtered} students={students} terms={terms} getFormName={getFormName} />
      )}

      {/* ── Cards view ── */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-300">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-bold">No payments found</p>
            </div>
          ) : paginated.map(p => {
            const s = students.find(st => st.id === p.student_id);
            const cfg = getMethodConfig(p.payment_method);
            return (
              <div key={p.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-all ${selected.has(p.id) ? 'border-indigo-400 shadow-indigo-100' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{p.receipt_number || '—'}</span>
                  </div>
                  <MethodBadge method={p.payment_method} />
                </div>
                <div className="mb-3">
                  <p className="font-black text-gray-900 text-base">{s ? `${s.first_name} ${s.last_name}` : '—'}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">
                    {s?.admission_no || s?.admission_number || '—'} · {s ? getFormName(s.form_id) : '—'}
                  </p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Amount</p>
                    <p className="text-xl font-black text-emerald-600">{fmt(Number(p.amount))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-semibold">{fmtDate(p.payment_date)}</p>
                    {p.mpesa_code && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{p.mpesa_code}</p>}
                  </div>
                </div>
                {terms.find(t => t.id === p.term_id) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                      {terms.find(t => t.id === p.term_id)?.term_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => printReceipt(p)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">🖨 Print</button>
                  <button onClick={() => copyReceipt(p)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">📋 Copy</button>
                  <button onClick={() => setEditModal({ open: true, payment: p })} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1">✏ Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">📭</p>
              <p className="text-sm font-black text-gray-400">No payments found</p>
              {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-xs text-indigo-600 font-bold hover:underline">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b-2 border-gray-100">
                      <th className="px-4 py-3.5 w-10">
                        <input type="checkbox" checked={isAllSelected} onChange={isAllSelected ? clearSelection : selectAll} className="w-4 h-4 rounded accent-indigo-600" />
                      </th>
                      <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider w-8">#</th>
                      <th onClick={() => toggleSort('receipt_number')} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none">
                        Receipt <SortIcon k="receipt_number" />
                      </th>
                      <th onClick={() => toggleSort('payment_date')} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap">
                        Date <SortIcon k="payment_date" />
                      </th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Adm No</th>
                      <th onClick={() => toggleSort('student')} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none">
                        Student <SortIcon k="student" />
                      </th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Form</th>
                      <th onClick={() => toggleSort('amount')} className="px-4 py-3.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none">
                        Amount <SortIcon k="amount" />
                      </th>
                      <th onClick={() => toggleSort('payment_method')} className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none">
                        Method <SortIcon k="payment_method" />
                      </th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Term</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Received By</th>
                      <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((p, i) => {
                      const s = students.find(st => st.id === p.student_id);
                      const isToday = p.payment_date === today;
                      return (
                        <tr
                          key={p.id}
                          className={`group transition-colors ${selected.has(p.id) ? 'bg-indigo-50/70' : 'hover:bg-slate-50/70'} ${isToday ? 'ring-1 ring-inset ring-emerald-200' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded accent-indigo-600" />
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-300 font-bold tabular-nums">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Today" />}
                              <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{p.receipt_number || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm font-bold text-gray-800">{fmtDate(p.payment_date)}</p>
                            {isToday && <p className="text-[10px] text-emerald-600 font-bold">Today</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-black text-indigo-600">{s?.admission_no || s?.admission_number || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{s ? `${s.first_name} ${s.last_name}` : '—'}</p>
                            {s?.guardian_phone && <p className="text-[10px] text-gray-400 font-semibold">{s.guardian_phone}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">{s ? getFormName(s.form_id) : '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-black text-emerald-600 text-sm tabular-nums">{fmt(Number(p.amount))}</p>
                          </td>
                          <td className="px-4 py-3">
                            <MethodBadge method={p.payment_method} />
                          </td>
                          <td className="px-4 py-3">
                            {(p.mpesa_code || p.reference_number) ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{p.mpesa_code || p.reference_number}</span>
                                <button onClick={() => { navigator.clipboard.writeText(p.mpesa_code || p.reference_number); toast.success('Copied!'); }} className="text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100 text-xs">📋</button>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {p.term_id ? (
                              <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {terms.find(t => t.id === p.term_id)?.term_name || '—'}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500 font-semibold">{p.received_by || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPreviewPayment(p)} title="Preview" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm">👁</button>
                              <button onClick={() => printReceipt(p)} title="Print Receipt" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm">🖨</button>
                              <button onClick={() => copyReceipt(p)} title="Copy Receipt Details" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-sm">📋</button>
                              <button onClick={() => setEditModal({ open: true, payment: p })} title="Edit Payment" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors text-sm">✏</button>
                              <button onClick={() => handleDelete(p.id)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors text-sm">🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-t-2 border-gray-100">
                      <td colSpan={7} className="px-4 py-3">
                        <span className="text-xs font-black text-gray-600">{filtered.length.toLocaleString()} payments shown</span>
                        {selected.size > 0 && <span className="ml-3 text-xs font-bold text-indigo-600">· {selected.size} selected</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-black text-emerald-700">{fmt(totalAmount)}</p>
                        {hasActiveFilters && <p className="text-[10px] text-gray-400 font-semibold">Filtered total</p>}
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <p className="text-xs text-gray-500 font-semibold">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="w-8 h-8 rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-white hover:border-indigo-300 disabled:opacity-30 text-xs font-black transition-all">«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-white hover:border-indigo-300 disabled:opacity-30 text-xs font-black transition-all">‹</button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let p;
                      if (totalPages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg border-2 text-xs font-black transition-all ${page === p ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-white'}`}>
                          {p}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-white hover:border-indigo-300 disabled:opacity-30 text-xs font-black transition-all">›</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="w-8 h-8 rounded-lg border-2 border-gray-200 text-gray-500 hover:bg-white hover:border-indigo-300 disabled:opacity-30 text-xs font-black transition-all">»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pagination for card view */}
      {view === 'cards' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:border-indigo-300 disabled:opacity-30 transition-all">← Prev</button>
          <span className="text-sm font-black text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:border-indigo-300 disabled:opacity-30 transition-all">Next →</button>
        </div>
      )}

      {/* ── Edit Modal ── */}
      <EditModal
        modal={editModal}
        onClose={() => setEditModal({ open: false, payment: null })}
        onSave={handleSave}
        students={students}
        terms={terms}
        getFormName={getFormName}
      />

      {/* ── Preview Modal ── */}
      {previewPayment && (() => {
        const p = previewPayment;
        const s = students.find((st: any) => st.id === p.student_id);
        const fees = s ? getStudentFees(s.id, s.form_id) : null;
        const cfg = getMethodConfig(p.payment_method);
        const term = terms.find((t: any) => t.id === p.term_id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPreviewPayment(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-6 text-center border-b border-gray-100">
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl border-2 ${cfg.bg}`}>{cfg.icon}</div>
                <h2 className="text-xl font-black text-gray-900">Payment Receipt</h2>
                <p className="font-mono text-sm font-bold text-indigo-600 mt-0.5">{p.receipt_number}</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Amount Paid</p>
                  <p className="text-3xl font-black text-emerald-700 mt-1">{fmt(Number(p.amount))}</p>
                </div>
                {[
                  ['Student', s ? `${s.first_name} ${s.last_name}` : '—'],
                  ['Adm No', s?.admission_no || s?.admission_number || '—'],
                  ['Form', s ? getFormName(s.form_id) : '—'],
                  ['Date', fmtDateLong(p.payment_date)],
                  ['Method', p.payment_method],
                  ...(p.mpesa_code ? [['M-Pesa Code', p.mpesa_code]] : []),
                  ...(p.bank_name ? [['Bank', p.bank_name]] : []),
                  ...(p.reference_number ? [['Reference', p.reference_number]] : []),
                  ...(term ? [['Term', term.term_name]] : []),
                  ...(p.received_by ? [['Received By', p.received_by]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{k}</span>
                    <span className="text-xs font-black text-gray-800 text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
                {fees && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1.5">
                    <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Term Balance</span><span className="text-xs font-black text-red-600">KES {fees.termBalance.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Annual Balance</span><span className="text-xs font-black text-red-600">KES {fees.annualBalance.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Total Paid</span><span className="text-xs font-black text-emerald-600">KES {fees.totalPaid.toLocaleString()}</span></div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-2">
                <button onClick={() => setPreviewPayment(null)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
                <button onClick={() => { printReceipt(p); setPreviewPayment(null); }}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
                  🖨 Print
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

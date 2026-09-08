'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiPrinter, FiDownload } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const PCT = (a: number, b: number) => b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0;

export default function BudgetPage() {
  const [loading, setLoading] = useState(true);
  const [heads, setHeads] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editAlloc, setEditAlloc] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ budget_head_id: '', year: new Date().getFullYear(), allocated_amount: '', q1_amount: '', q2_amount: '', q3_amount: '', notes: '', status: 'Draft' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [hRes, aRes, pRes, eRes, fpRes] = await Promise.all([
      supabase.from('school_budget_heads').select('*').order('vote_head_code'),
      supabase.from('school_budget_allocations').select('*').eq('year', year),
      supabase.from('school_payroll').select('id,staff_name,net_pay,gross_pay,payment_date,status').eq('status', 'Paid'),
      supabase.from('school_expenses').select('id,expense_name,amount,category,expense_date').eq('year', year).order('expense_date', { ascending: false }),
      supabase.from('school_fee_payments').select('amount,payment_date'),
    ]);
    setHeads(hRes.data || []);
    setAllocations(aRes.data || []);
    setPayroll(pRes.data || []);
    setExpenses(eRes.data || []);
    setFeePayments(fpRes.data || []);
    setLoading(false);
  }, [year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Compute actual spending per head using real data
  const budgetRows = useMemo(() => {
    const salariesActual = payroll.filter(p => {
      const d = new Date(p.payment_date || '');
      return d.getFullYear() === year;
    }).reduce((a, p) => a + Number(p.gross_pay || 0), 0);

    return heads.map(h => {
      const alloc = allocations.find(a => a.budget_head_id === h.id);
      const allocated = Number(alloc?.allocated_amount || 0);
      // Map actual spending from real tables
      let actual = 0;
      if (h.vote_head_code === 'VH002') {
        actual = salariesActual; // Salaries from real payroll
      } else {
        // Other vote heads: match expenses by category
        actual = expenses
          .filter(e => (e.category || '').toLowerCase().includes((h.vote_head_name || '').split('/')[0].toLowerCase().trim().slice(0, 6)))
          .reduce((a, e) => a + Number(e.amount || 0), 0);
      }
      const balance = allocated - actual;
      const pct = PCT(actual, allocated);
      return { head: h, alloc, allocated, actual, balance, pct, status: alloc?.status || 'No Budget' };
    });
  }, [heads, allocations, payroll, expenses, year]);

  const totals = useMemo(() => ({
    allocated: budgetRows.reduce((a, r) => a + r.allocated, 0),
    actual: budgetRows.reduce((a, r) => a + r.actual, 0),
    income: feePayments.filter(p => new Date(p.payment_date || '').getFullYear() === year).reduce((a, p) => a + Number(p.amount || 0), 0),
  }), [budgetRows, feePayments, year]);

  const openNew = () => { setEditAlloc(null); setForm({ budget_head_id: '', year, allocated_amount: '', q1_amount: '', q2_amount: '', q3_amount: '', notes: '', status: 'Draft' }); setShowModal(true); };
  const openEdit = (row: any) => {
    setEditAlloc(row.alloc);
    setForm({ budget_head_id: String(row.head.id), year: row.alloc?.year || year, allocated_amount: String(row.allocated), q1_amount: String(row.alloc?.q1_amount || ''), q2_amount: String(row.alloc?.q2_amount || ''), q3_amount: String(row.alloc?.q3_amount || ''), notes: row.alloc?.notes || '', status: row.alloc?.status || 'Draft' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.budget_head_id || !form.allocated_amount) { toast.error('Select vote head and enter budget amount'); return; }
    setSaving(true);
    const payload = { budget_head_id: Number(form.budget_head_id), year: Number(form.year), allocated_amount: Number(form.allocated_amount), q1_amount: Number(form.q1_amount || 0), q2_amount: Number(form.q2_amount || 0), q3_amount: Number(form.q3_amount || 0), notes: form.notes, status: form.status };
    let error;
    if (editAlloc) {
      ({ error } = await supabase.from('school_budget_allocations').update(payload).eq('id', editAlloc.id));
    } else {
      ({ error } = await supabase.from('school_budget_allocations').insert([payload]));
    }
    if (error) { toast.error(error.message); } else { toast.success('Budget saved ✅'); setShowModal(false); loadAll(); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget allocation?')) return;
    const { error } = await supabase.from('school_budget_allocations').delete().eq('id', id);
    if (error) { toast.error(error.message); } else { toast.success('Deleted'); loadAll(); }
  };

  const exportCSV = () => {
    const h = 'Vote Head,Code,Category,Allocated,Actual Spent,Balance,Utilization %,Status';
    const rows = budgetRows.map(r => `"${r.head.vote_head_name}",${r.head.vote_head_code},${r.head.category},${r.allocated},${r.actual},${r.balance},${r.pct}%,${r.status}`);
    const blob = new Blob([h + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `budget_${year}.csv`; a.click();
    toast.success('CSV exported');
  };

  const printBudget = () => {
    const w = window.open('', '_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Budget ${year}</title><style>
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#1d4ed8}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#1d4ed8;color:#fff;padding:8px;text-align:left;font-size:11px}
      td{padding:7px 8px;border-bottom:1px solid #e5e7eb}
      tr:nth-child(even){background:#eff6ff}
      .over{color:#dc2626;font-weight:bold}.ok{color:#15803d;font-weight:bold}
      @page{size:A4 landscape;margin:12mm}
    </style></head><body>
      <h1>📊 Annual Budget — ${year}</h1>
      <p>Total Budget: ${KES(totals.allocated)} | Spent: ${KES(totals.actual)} | Income: ${KES(totals.income)}</p>
      <table><tr><th>#</th><th>Vote Head</th><th>Code</th><th>Category</th><th>Allocated</th><th>Actual Spent</th><th>Balance</th><th>Utilization</th><th>Status</th></tr>
      ${budgetRows.map((r, i) => `<tr><td>${i+1}</td><td>${r.head.vote_head_name}</td><td>${r.head.vote_head_code}</td><td>${r.head.category}</td><td>${KES(r.allocated)}</td><td>${KES(r.actual)}</td><td class="${r.balance < 0 ? 'over' : 'ok'}">${KES(r.balance)}</td><td class="${r.pct > 100 ? 'over' : r.pct > 80 ? '' : 'ok'}">${r.pct}%</td><td>${r.status}</td></tr>`).join('')}
      <tr style="font-weight:bold;background:#dbeafe"><td colspan="4">TOTALS</td><td>${KES(totals.allocated)}</td><td>${KES(totals.actual)}</td><td>${KES(totals.allocated - totals.actual)}</td><td>${PCT(totals.actual, totals.allocated)}%</td><td></td></tr>
      </table></body></html>`);
    setTimeout(() => w.print(), 400);
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Approved': { bg: '#dcfce7', color: '#15803d' }, 'Draft': { bg: '#fef9c3', color: '#854d0e' },
    'Revised': { bg: '#dbeafe', color: '#1d4ed8' }, 'No Budget': { bg: '#f1f5f9', color: '#64748b' },
  };
  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#3b82f6 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📊</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>Annual Budget Planner</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Budget vs Actual spending by vote head — actuals from real payroll & expenses</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 14, outline: 'none' }}>
                {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y} style={{ color: '#000' }}>{y}</option>)}
              </select>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiRefreshCw size={14} /> Refresh</button>
              <button onClick={openNew} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#1d4ed8', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPlus size={14} /> Add Budget</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { icon: '📋', label: 'Total Budget', val: KES(totals.allocated), sub: `${year} annual plan` },
              { icon: '💸', label: 'Actual Spent', val: KES(totals.actual), sub: `${PCT(totals.actual, totals.allocated)}% utilization` },
              { icon: '💰', label: 'Balance', val: KES(totals.allocated - totals.actual), sub: totals.actual > totals.allocated ? '⚠️ OVER BUDGET' : 'Remaining' },
              { icon: '📈', label: 'Fee Income', val: KES(totals.income), sub: `vs ${KES(totals.actual)} spent` },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 20 }}>{k.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 4 }}>{k.val}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{k.sub}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' }}>
          <button onClick={exportCSV} style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={14} /> Export CSV</button>
          <button onClick={printBudget} style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print Budget</button>
        </div>

        {/* Budget Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading budget…</div> : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Code', 'Vote Head', 'Category', 'Allocated', 'Actual (Real DB)', 'Balance', 'Utilization', 'Status', 'Actions'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row, i) => {
                    const isOver = row.pct > 100;
                    const isWarn = row.pct > 80 && row.pct <= 100;
                    const sc = statusColors[row.status] || statusColors['No Budget'];
                    return (
                      <tr key={row.head.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOver ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', color: '#6366f1', fontWeight: 700, fontFamily: 'monospace' }}>{row.head.vote_head_code}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                          {isOver && <FiAlertTriangle size={12} color="#dc2626" style={{ marginRight: 4 }} />}
                          {row.head.vote_head_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                          <span style={{ background: row.head.category === 'Capital' ? '#ede9fe' : '#dbeafe', color: row.head.category === 'Capital' ? '#7c3aed' : '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{row.head.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{row.allocated > 0 ? KES(row.allocated) : <span style={{ color: '#94a3b8' }}>No budget set</span>}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0891b2' }}>{KES(row.actual)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: isOver ? '#dc2626' : '#15803d' }}>{KES(row.balance)}</td>
                        <td style={{ padding: '12px 14px', width: 140 }}>
                          {row.allocated > 0 ? (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: isOver ? '#dc2626' : isWarn ? '#d97706' : '#15803d' }}>{row.pct}%</span>
                              </div>
                              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: 8, width: `${Math.min(100, row.pct)}%`, background: isOver ? '#dc2626' : isWarn ? '#f59e0b' : '#22c55e', borderRadius: 99, transition: 'width 0.5s' }} />
                              </div>
                            </div>
                          ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 99 }}>{row.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(row)} style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#1d4ed8' }}><FiEdit2 size={12} /></button>
                            {row.alloc && <button onClick={() => handleDelete(row.alloc.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#dc2626' }}><FiTrash2 size={12} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#dbeafe', fontWeight: 900 }}>
                    <td colSpan={3} style={{ padding: '12px 14px', color: '#1d4ed8', fontWeight: 900, fontSize: 14 }}>TOTALS</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#1d4ed8' }}>{KES(totals.allocated)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#0891b2' }}>{KES(totals.actual)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: totals.actual > totals.allocated ? '#dc2626' : '#15803d' }}>{KES(totals.allocated - totals.actual)}</td>
                    <td colSpan={3} style={{ padding: '12px 14px', fontSize: 14, color: '#1d4ed8' }}>{PCT(totals.actual, totals.allocated)}% utilized</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{editAlloc ? 'Edit Budget Allocation' : 'Add Budget Allocation'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Vote Head *', key: 'budget_head_id', type: 'select', options: heads.map(h => ({ value: h.id, label: `${h.vote_head_code} — ${h.vote_head_name}` })) },
                { label: 'Year *', key: 'year', type: 'number' },
                { label: 'Total Allocated Amount (KES) *', key: 'allocated_amount', type: 'number' },
                { label: 'Term 1 Amount', key: 'q1_amount', type: 'number' },
                { label: 'Term 2 Amount', key: 'q2_amount', type: 'number' },
                { label: 'Term 3 Amount', key: 'q3_amount', type: 'number' },
                { label: 'Status', key: 'status', type: 'select', options: ['Draft','Approved','Revised'].map(v => ({ value: v, label: v })) },
                { label: 'Notes', key: 'notes', type: 'textarea' },
              ].map(({ label, key, type, options }: any) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                  {type === 'select' ? (
                    <select value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
                      <option value="">Select…</option>
                      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={2} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  ) : (
                    <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {saving ? 'Saving…' : <><FiCheckCircle size={16} /> {editAlloc ? 'Update Budget' : 'Save Budget'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

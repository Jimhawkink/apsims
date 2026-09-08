'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPrinter, FiRefreshCw, FiDownload } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function VoteHeadLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [fsRes, aRes, eRes, pRes, fRes, tRes] = await Promise.all([
      supabase.from('school_fee_structures').select('id,vote_head_id,vote_head_name,form_id,amount,tuition,category').order('vote_head_name'),
      supabase.from('school_budget_allocations').select('*').eq('year', selYear),
      supabase.from('school_expenses').select('id,expense_name,amount,category,expense_date,vote_head,payment_method').order('expense_date', { ascending: false }),
      supabase.from('school_fee_payments').select('amount,payment_date,student_id,term_id,payment_method').order('payment_date'),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
      supabase.from('school_terms').select('id,term_name,start_date,end_date,is_current,year').order('id',{ascending:false}),
    ]);
    setStructures(fsRes.data || []);
    setAllocations(aRes.data || []);
    setExpenses(eRes.data || []);
    setPayments(pRes.data || []);
    setForms(fRes.data || []);
    setTerms(tRes.data || []);
    const cur = (tRes.data || []).find((t: any) => t.is_current) || (tRes.data || [])[0];
    if (cur) setSelTerm(String(cur.id));
    setLoading(false);
  }, [selYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Unique vote heads from real school_fee_structures
  const voteHeads = useMemo(() => {
    const seen = new Set<string>();
    const heads: { id: any; name: string; category: string }[] = [];
    structures.forEach(s => {
      const key = s.vote_head_id ? String(s.vote_head_id) : s.vote_head_name;
      if (key && !seen.has(key)) {
        seen.add(key);
        heads.push({ id: s.vote_head_id || key, name: s.vote_head_name || 'General', category: s.category || 'Recurrent' });
      }
    });
    if (heads.length === 0) {
      // Fallback: group by category if no vote heads
      const cats = new Set(structures.map(s => s.category || 'General'));
      cats.forEach(c => heads.push({ id: c, name: c, category: 'Recurrent' }));
    }
    return heads;
  }, [structures]);

  const ledgerRows = useMemo(() => {
    return voteHeads.map(vh => {
      // Income: sum of payments for fee structures belonging to this vote head
      const vhStructures = structures.filter(s => (s.vote_head_id ? String(s.vote_head_id) : s.vote_head_name) === String(vh.id) || s.category === vh.name);
      const formIds = new Set(vhStructures.map(s => s.form_id));
      const termPays = selTerm ? payments.filter(p => String(p.term_id) === selTerm) : payments;
      // Budget from allocations
      const alloc = allocations.find(a => String(a.budget_head_id) === String(vh.id));
      const budgeted = alloc ? Number(alloc.allocated_amount || 0) : 0;
      // Expenses for this vote head
      const vhExpenses = expenses.filter(e => {
        if (e.vote_head) return String(e.vote_head).toLowerCase().includes(vh.name.toLowerCase().slice(0, 5));
        return (e.category || '').toLowerCase().includes(vh.name.toLowerCase().slice(0, 5));
      });
      const expenseAmt = vhExpenses.filter(e => new Date(e.expense_date || '').getFullYear() === selYear).reduce((a, e) => a + Number(e.amount || 0), 0);
      // Fee income for this vote head (proportional)
      const totalFees = vhStructures.reduce((a, s) => a + Number(s.amount || s.tuition || 0), 0);
      const allFeeTotal = structures.reduce((a, s) => a + Number(s.amount || s.tuition || 0), 0);
      const share = allFeeTotal > 0 ? totalFees / allFeeTotal : 0;
      const income = termPays.reduce((a, p) => a + Number(p.amount || 0), 0) * share;
      const balance = budgeted > 0 ? budgeted - expenseAmt : income - expenseAmt;
      return { vh, budgeted, income: Math.round(income), expenses: expenseAmt, balance, expenseList: vhExpenses.slice(0, 5) };
    });
  }, [voteHeads, structures, payments, expenses, allocations, selTerm, selYear]);

  const totals = useMemo(() => ({
    budgeted: ledgerRows.reduce((a, r) => a + r.budgeted, 0),
    income: ledgerRows.reduce((a, r) => a + r.income, 0),
    expenses: ledgerRows.reduce((a, r) => a + r.expenses, 0),
    balance: ledgerRows.reduce((a, r) => a + r.balance, 0),
  }), [ledgerRows]);

  const exportCSV = () => {
    const h = 'Vote Head,Category,Budgeted,Income Allocated,Expenses,Balance';
    const rows = ledgerRows.map(r => `"${r.vh.name}",${r.vh.category},${r.budgeted},${r.income},${r.expenses},${r.balance}`);
    const blob = new Blob([h + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vote_head_ledger_${selYear}.csv`; a.click();
    toast.success('CSV exported');
  };

  const printLedger = () => {
    const w = window.open('','_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Vote Head Ledger</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#7c3aed}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#7c3aed;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#faf5ff}.total{background:#ede9fe;font-weight:bold}@page{size:A4 landscape;margin:12mm}</style></head><body>
      <h1>📋 Vote Head Ledger — ${selYear}</h1>
      <table><tr><th>#</th><th>Vote Head</th><th>Category</th><th>Budgeted</th><th>Income Allocated</th><th>Expenses</th><th>Balance</th></tr>
      ${ledgerRows.map((r, i) => `<tr><td>${i+1}</td><td>${r.vh.name}</td><td>${r.vh.category}</td><td>${KES(r.budgeted)}</td><td>${KES(r.income)}</td><td>${KES(r.expenses)}</td><td style="color:${r.balance<0?'#dc2626':'#15803d'};font-weight:bold">${KES(r.balance)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTALS</td><td>${KES(totals.budgeted)}</td><td>${KES(totals.income)}</td><td>${KES(totals.expenses)}</td><td>${KES(totals.balance)}</td></tr>
      </table></body></html>`);
    setTimeout(() => w.print(), 300);
  };

  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#a78bfa 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📋</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Vote Head Ledger</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Treasurer's ledger — budget vs actual by vote head from real fee structures</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }}>
                {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y} style={{ color: '#000' }}>{y}</option>)}
              </select>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }}>
                <option value="" style={{ color: '#000' }}>All Terms</option>
                {terms.slice(0,6).map(t => <option key={t.id} value={t.id} style={{ color: '#000' }}>{t.term_name}</option>)}
              </select>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer' }}><FiRefreshCw size={14} /></button>
              <button onClick={exportCSV} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={14} /> CSV</button>
              <button onClick={printLedger} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#7c3aed', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['📋','Vote Heads',voteHeads.length],['💰','Total Budgeted',KES(totals.budgeted)],['💸','Total Expenses',KES(totals.expenses)],['💚',totals.balance >= 0 ? 'Surplus' : 'Deficit',KES(Math.abs(totals.balance))]].map(([icon,label,val],i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{val}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading vote head ledger…</div> : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>
                  {['#','Vote Head','Category','Budgeted','Income Allocated','Expenses (Real DB)','Balance','Utilization'].map(h => <th key={h} style={TH}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ledgerRows.map((row, i) => {
                    const pct = row.budgeted > 0 ? Math.min(999, Math.round((row.expenses / row.budgeted) * 100)) : (row.income > 0 ? Math.min(999, Math.round((row.expenses / row.income) * 100)) : 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: row.balance < 0 ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: '#4c1d95', fontSize: 14 }}>{row.vh.name}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: row.vh.category === 'Capital' ? '#ede9fe' : '#dbeafe', color: row.vh.category === 'Capital' ? '#7c3aed' : '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{row.vh.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{row.budgeted > 0 ? KES(row.budgeted) : <span style={{ color: '#94a3b8', fontSize: 12 }}>Not set</span>}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d' }}>{KES(row.income)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#dc2626' }}>{KES(row.expenses)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: row.balance < 0 ? '#dc2626' : '#15803d', fontSize: 14 }}>{KES(row.balance)}</td>
                        <td style={{ padding: '12px 14px', width: 130 }}>
                          {pct > 0 ? (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#15803d', marginBottom: 4 }}>{pct}%</div>
                              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                                <div style={{ height: 8, width: `${Math.min(100, pct)}%`, background: pct > 100 ? '#dc2626' : pct > 80 ? '#f59e0b' : '#22c55e', borderRadius: 99 }} />
                              </div>
                            </div>
                          ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#ede9fe', fontWeight: 900 }}>
                    <td colSpan={3} style={{ padding: '12px 14px', color: '#4c1d95', fontWeight: 900, fontSize: 14 }}>TOTALS</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#4c1d95' }}>{KES(totals.budgeted)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#15803d' }}>{KES(totals.income)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: '#dc2626' }}>{KES(totals.expenses)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, color: totals.balance < 0 ? '#dc2626' : '#15803d' }}>{KES(totals.balance)}</td>
                    <td style={{ padding: '12px 14px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

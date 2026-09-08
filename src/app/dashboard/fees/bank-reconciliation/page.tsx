'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiUpload, FiRefreshCw, FiPrinter, FiDownload, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function BankReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selAccount, setSelAccount] = useState('');
  const [selMonth, setSelMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showUpload, setShowUpload] = useState(false);
  const [csvRows, setCsvRows] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [baRes, stRes, pRes, eRes] = await Promise.all([
      supabase.from('school_bank_accounts').select('id,bank_name,account_name,account_number,book_balance,bank_balance,is_active').eq('is_active', true),
      supabase.from('school_bank_statement_rows').select('*').order('transaction_date', { ascending: false }),
      supabase.from('school_fee_payments').select('id,amount,payment_date,receipt_number,mpesa_code,payment_method,notes').order('payment_date', { ascending: false }),
      supabase.from('school_expenses').select('id,expense_name,amount,expense_date,category,reference_no').order('expense_date', { ascending: false }),
    ]);
    setBankAccounts(baRes.data || []);
    setStatements(stRes.data || []);
    setPayments(pRes.data || []);
    setExpenses(eRes.data || []);
    if ((baRes.data || []).length > 0 && !selAccount) setSelAccount(String((baRes.data || [])[0].id));
    setLoading(false);
  }, [selAccount]);

  useEffect(() => { loadAll(); }, []);

  const [monthStart, monthEnd] = useMemo(() => {
    const [y, m] = selMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return [start, end];
  }, [selMonth]);

  const inRange = (dateStr: string) => { const d = new Date(dateStr || ''); return d >= monthStart && d <= monthEnd; };

  const acctStatements = statements.filter(s => (!selAccount || String(s.bank_account_id) === selAccount) && inRange(s.transaction_date));
  const monthPayments = payments.filter(p => inRange(p.payment_date));
  const monthExpenses = expenses.filter(e => inRange(e.expense_date));

  // Auto-match logic
  const reconciled = useMemo(() => {
    const matched: { stmt: any; match: any; type: string }[] = [];
    const unmatched: any[] = [];
    acctStatements.forEach(stmt => {
      const amt = Number(stmt.amount || 0);
      const ref = (stmt.reference || stmt.description || '').toLowerCase();
      // Try matching to fee payments
      const payMatch = monthPayments.find(p =>
        Math.abs(Number(p.amount) - amt) < 1 ||
        (p.mpesa_code && ref.includes(p.mpesa_code.toLowerCase())) ||
        (p.receipt_number && ref.includes(p.receipt_number.toLowerCase()))
      );
      if (payMatch) { matched.push({ stmt, match: payMatch, type: 'Fee Payment' }); return; }
      // Try matching to expenses
      const expMatch = monthExpenses.find(e =>
        Math.abs(Number(e.amount) - Math.abs(amt)) < 1 ||
        (e.reference_no && ref.includes((e.reference_no || '').toLowerCase()))
      );
      if (expMatch) { matched.push({ stmt, match: expMatch, type: 'Expense' }); return; }
      unmatched.push(stmt);
    });
    return { matched, unmatched };
  }, [acctStatements, monthPayments, monthExpenses]);

  const selectedAccount = bankAccounts.find(b => String(b.id) === selAccount);
  const stmtDebits = acctStatements.filter(s => Number(s.amount || 0) < 0).reduce((a, s) => a + Math.abs(Number(s.amount || 0)), 0);
  const stmtCredits = acctStatements.filter(s => Number(s.amount || 0) >= 0).reduce((a, s) => a + Number(s.amount || 0), 0);
  const bookCredits = monthPayments.reduce((a, p) => a + Number(p.amount || 0), 0);

  const importCSV = async () => {
    if (!csvRows.trim() || !selAccount) { toast.error('Paste CSV data and select account'); return; }
    setSaving(true);
    const lines = csvRows.trim().split('\n').filter(l => l.trim());
    const toInsert = [];
    for (const line of lines.slice(1)) { // skip header
      const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) continue;
      const [date, desc, amount, balance, ref] = parts;
      if (!date || isNaN(Number(amount))) continue;
      toInsert.push({ bank_account_id: Number(selAccount), transaction_date: date, description: desc || '', amount: Number(amount), running_balance: balance ? Number(balance) : null, reference: ref || '', reconciled: false });
    }
    if (toInsert.length === 0) { toast.error('No valid rows found. Expected: Date,Description,Amount,Balance,Reference'); setSaving(false); return; }
    const { error } = await supabase.from('school_bank_statement_rows').insert(toInsert);
    if (error) { toast.error(error.message); } else { toast.success(`✅ Imported ${toInsert.length} bank statement rows`); setShowUpload(false); setCsvRows(''); loadAll(); }
    setSaving(false);
  };

  const markReconciled = async (id: number) => {
    await supabase.from('school_bank_statement_rows').update({ reconciled: true, reconciled_at: new Date().toISOString() }).eq('id', id);
    toast.success('Marked reconciled'); loadAll();
  };

  const printRecon = () => {
    const w = window.open('','_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Bank Reconciliation</title><style>
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#0891b2}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#0891b2;color:#fff;padding:8px;text-align:left;font-size:11px}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
      .matched{color:#15803d}.unmatched{color:#dc2626;font-weight:bold}
      @page{size:A4 landscape;margin:12mm}
    </style></head><body>
      <h1>🧾 Bank Reconciliation — ${selMonth}</h1>
      <p>Account: ${selectedAccount?.bank_name} — ${selectedAccount?.account_name}</p>
      <p>Bank Credits: ${KES(stmtCredits)} | Bank Debits: ${KES(stmtDebits)} | Book Credits: ${KES(bookCredits)} | Variance: ${KES(stmtCredits - bookCredits)}</p>
      <h3>Matched Transactions (${reconciled.matched.length})</h3>
      <table><tr><th>Date</th><th>Description</th><th>Bank Amount</th><th>Matched To</th><th>Type</th></tr>
      ${reconciled.matched.map(r => `<tr class="matched"><td>${r.stmt.transaction_date}</td><td>${r.stmt.description}</td><td>${KES(Number(r.stmt.amount))}</td><td>${r.match.receipt_number || r.match.expense_name || ''}</td><td>${r.type}</td></tr>`).join('')}
      </table>
      <h3>Unmatched Transactions (${reconciled.unmatched.length})</h3>
      <table><tr><th>Date</th><th>Description</th><th>Amount</th><th>Reference</th></tr>
      ${reconciled.unmatched.map(r => `<tr class="unmatched"><td>${r.transaction_date}</td><td>${r.description}</td><td>${KES(Number(r.amount))}</td><td>${r.reference || '—'}</td></tr>`).join('')}
      </table>
    </body></html>`);
    setTimeout(() => w.print(), 300);
  };

  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#22d3ee 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🧾</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Bank Reconciliation</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Auto-match bank statement to school_fee_payments & school_expenses — identify discrepancies instantly</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={selAccount} onChange={e => setSelAccount(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }}>
                {bankAccounts.map(b => <option key={b.id} value={b.id} style={{ color: '#000' }}>{b.bank_name} — {b.account_name}</option>)}
              </select>
              <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }} />
              <button onClick={() => setShowUpload(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiUpload size={14} /> Import Statement</button>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer' }}><FiRefreshCw size={14} /></button>
              <button onClick={printRecon} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#0891b2', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={14} /> Print</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              ['🏦','Bank Credits',KES(stmtCredits)],['💸','Bank Debits',KES(stmtDebits)],['📚','Book Credits',KES(bookCredits)],
              ['✅','Matched',reconciled.matched.length + ' txns'],['❌','Unmatched',reconciled.unmatched.length + ' txns'],
            ].map(([icon,label,val],i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div>{icon}</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{val}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {/* Variance Card */}
        {acctStatements.length > 0 && (
          <div style={{ background: Math.abs(stmtCredits - bookCredits) < 100 ? '#dcfce7' : '#fee2e2', border: `1px solid ${Math.abs(stmtCredits - bookCredits) < 100 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            {Math.abs(stmtCredits - bookCredits) < 100 ? <FiCheckCircle size={24} color="#15803d" /> : <FiAlertTriangle size={24} color="#dc2626" />}
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: Math.abs(stmtCredits - bookCredits) < 100 ? '#15803d' : '#dc2626' }}>
                {Math.abs(stmtCredits - bookCredits) < 100 ? '✅ Bank and books are reconciled!' : `⚠️ Variance of ${KES(Math.abs(stmtCredits - bookCredits))} — investigate unmatched transactions`}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Bank credits: {KES(stmtCredits)} | Book credits: {KES(bookCredits)} | Difference: {KES(stmtCredits - bookCredits)}</div>
            </div>
          </div>
        )}

        {/* No statement data */}
        {acctStatements.length === 0 && !loading && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 60, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>No Bank Statement Uploaded</div>
            <div style={{ color: '#64748b', marginBottom: 20 }}>Import your bank statement (CSV format) to start reconciliation</div>
            <button onClick={() => setShowUpload(true)} style={{ background: 'linear-gradient(135deg,#0c4a6e,#0891b2)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FiUpload size={16} /> Import Bank Statement
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
              CSV format: <code>Date,Description,Amount,Balance,Reference</code><br />
              (Amount: positive = credit, negative = debit)
            </div>
          </div>
        )}

        {/* Matched Transactions */}
        {reconciled.matched.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCheckCircle color="#15803d" size={16} />
              <span style={{ fontWeight: 900, fontSize: 14, color: '#15803d' }}>Matched Transactions ({reconciled.matched.length})</span>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Date','Bank Description','Bank Amount','Matched Record','Type','Action'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {reconciled.matched.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{r.stmt.transaction_date}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{r.stmt.description}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 900, color: Number(r.stmt.amount) >= 0 ? '#15803d' : '#dc2626' }}>{KES(Math.abs(Number(r.stmt.amount)))}</td>
                      <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700 }}>{r.match.receipt_number || r.match.expense_name || r.match.mpesa_code || '—'}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ background: r.type === 'Fee Payment' ? '#dcfce7' : '#fef2f2', color: r.type === 'Fee Payment' ? '#15803d' : '#dc2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{r.type}</span></td>
                      <td style={{ padding: '10px 14px' }}>
                        {!r.stmt.reconciled && <button onClick={() => markReconciled(r.stmt.id)} style={{ background: '#dcfce7', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#15803d', fontWeight: 700, fontSize: 12 }}>✓ Confirm</button>}
                        {r.stmt.reconciled && <span style={{ color: '#15803d', fontSize: 12, fontWeight: 700 }}>✅ Confirmed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unmatched Transactions */}
        {reconciled.unmatched.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiXCircle color="#dc2626" size={16} />
              <span style={{ fontWeight: 900, fontSize: 14, color: '#dc2626' }}>Unmatched Transactions ({reconciled.unmatched.length}) — Requires Investigation</span>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Date','Description','Amount','Balance','Reference','Action'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {reconciled.unmatched.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fff5f5' }}>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{r.transaction_date}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626' }}>{r.description}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 900, color: Number(r.amount) >= 0 ? '#15803d' : '#dc2626' }}>{KES(Math.abs(Number(r.amount)))}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.running_balance ? KES(Number(r.running_balance)) : '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{r.reference || '—'}</td>
                      <td style={{ padding: '10px 14px' }}><button onClick={() => markReconciled(r.id)} style={{ background: '#fef9c3', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#854d0e', fontWeight: 700, fontSize: 12 }}>Force OK</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowUpload(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>📤 Import Bank Statement (CSV)</h3>
              <button onClick={() => setShowUpload(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#0c4a6e' }}>
                <strong>CSV Format:</strong><br />
                <code>Date,Description,Amount,Balance,Reference</code><br />
                <code>2026-09-01,KCB PAYBILL,5000,125000,BC001</code><br />
                <span style={{ fontSize: 11, color: '#64748b' }}>Amount: positive = credit/income, negative = debit/expense</span>
              </div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Paste CSV Data (include header row)</label>
              <textarea
                value={csvRows}
                onChange={e => setCsvRows(e.target.value)}
                placeholder={"Date,Description,Amount,Balance,Reference\n2026-09-01,School Fees Payment,50000,500000,REF001\n2026-09-02,Supplier Payment,-15000,485000,REF002"}
                rows={12}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button onClick={importCSV} disabled={saving} style={{ background: 'linear-gradient(135deg,#0c4a6e,#0891b2)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', fontWeight: 900, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? 'Importing…' : <><FiUpload size={16} /> Import & Auto-Match</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

const exportTypes = [
  { id: 'fee_payments', label: 'Fee Payments', icon: '💰', description: 'All student fee payments with dates, methods and receipts', color: '#15803d', table: 'school_fee_payments', columns: 'id,student_id,amount,payment_date,payment_method,receipt_number,mpesa_code,term_id,notes', filename: 'fee_payments' },
  { id: 'defaulters', label: 'Fee Defaulters', icon: '⚠️', description: 'Students with outstanding balances', color: '#dc2626', custom: 'defaulters', filename: 'fee_defaulters' },
  { id: 'expenses', label: 'School Expenses', icon: '💸', description: 'All expense records with categories and amounts', color: '#d97706', table: 'school_expenses', columns: '*', filename: 'school_expenses' },
  { id: 'payroll', label: 'Payroll Summary', icon: '👥', description: 'Staff payroll with deductions (PAYE, NHIF, NSSF)', color: '#7c3aed', table: 'school_payroll', columns: 'id,staff_name,staff_type,gross_pay,net_pay,paye,nhif,nssf,housing_levy,payment_date,status', filename: 'payroll_summary' },
  { id: 'students', label: 'Student Register', icon: '📚', description: 'All active students with form, stream and guardian info', color: '#1d4ed8', table: 'school_students', columns: 'id,first_name,last_name,admission_no,admission_number,form_id,stream_id,guardian_name,guardian_phone,status,dob', filename: 'student_register' },
  { id: 'kcb_pushes', label: 'KCB Buni Transactions', icon: '🏦', description: 'KCB STK push history and payment status', color: '#0891b2', table: 'school_mpesa_transactions', columns: 'id,student_id,phone_number,amount,status,payment_method,mpesa_receipt,checkout_request_id,created_at', filename: 'kcb_buni_transactions' },
  { id: 'bank_accounts', label: 'Bank Accounts', icon: '🏛️', description: 'School bank accounts with current balances', color: '#0c4a6e', table: 'school_bank_accounts', columns: '*', filename: 'bank_accounts' },
  { id: 'assets', label: 'Asset Register', icon: '🏗️', description: 'Fixed assets with values and depreciation', color: '#064e3b', table: 'school_assets', columns: '*', filename: 'asset_register' },
  { id: 'budgets', label: 'Budget Allocations', icon: '📊', description: 'Annual budget by vote head with status', color: '#312e81', table: 'school_budget_allocations', columns: '*', filename: 'budget_allocations' },
  { id: 'capitation', label: 'Capitation Grants', icon: '🏫', description: 'Government capitation grants received and pending', color: '#14532d', table: 'school_capitation', columns: '*', filename: 'capitation_grants' },
  { id: 'notifications', label: 'Notifications Log', icon: '🔔', description: 'All SMS/email notifications sent to parents', color: '#713f12', table: 'school_notifications', columns: '*', filename: 'notifications_log' },
  { id: 'fee_structures', label: 'Fee Structures', icon: '📋', description: 'Fee structures by form, category and vote head', color: '#4f46e5', table: 'school_fee_structures', columns: '*', filename: 'fee_structures' },
];

function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) { toast.error('No data to export'); return 0; }
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map(row => keys.map(k => {
    const v = row[k];
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  const csv = header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  return data.length;
}

export default function ExportCenterPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const exportData = useCallback(async (exp: typeof exportTypes[0]) => {
    setLoading(l => ({ ...l, [exp.id]: true }));
    try {
      let data: any[] = [];

      if (exp.custom === 'defaulters') {
        // Build defaulters from real tables
        const [sRes, pRes, fsRes, fRes] = await Promise.all([
          supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,guardian_name,guardian_phone,status').eq('status','Active'),
          supabase.from('school_fee_payments').select('student_id,amount'),
          supabase.from('school_fee_structures').select('form_id,amount,tuition'),
          supabase.from('school_forms').select('id,form_name').order('form_level'),
        ]);
        const formMap: Record<number,string> = {};
        (fRes.data||[]).forEach((f: any) => formMap[f.id] = f.form_name);
        const rows: any[] = [];
        (sRes.data||[]).forEach((s: any) => {
          const total = (fsRes.data||[]).filter((f: any) => f.form_id === s.form_id).reduce((a: number, f: any) => a + Number(f.amount||f.tuition||0), 0);
          const paid = (pRes.data||[]).filter((p: any) => p.student_id === s.id).reduce((a: number, p: any) => a + Number(p.amount||0), 0);
          const balance = total - paid;
          if (balance > 0) rows.push({ name: `${s.first_name} ${s.last_name}`, admission_no: s.admission_no||s.admission_number, form: formMap[s.form_id]||'', guardian: s.guardian_name||'', phone: s.guardian_phone||'', total_fees: total, paid, balance });
        });
        data = rows.sort((a, b) => b.balance - a.balance);
      } else if (exp.table) {
        let q = supabase.from(exp.table).select(exp.columns);
        if (dateFrom && ['school_fee_payments','school_expenses','school_payroll'].includes(exp.table)) {
          const dateCol = exp.table === 'school_payroll' ? 'payment_date' : exp.table === 'school_expenses' ? 'expense_date' : 'payment_date';
          if (dateFrom) q = q.gte(dateCol, dateFrom);
          if (dateTo) q = q.lte(dateCol, dateTo);
        }
        const { data: d, error } = await q.limit(10000);
        if (error) throw error;
        data = d || [];
      }

      const count = downloadCSV(data, exp.filename);
      if (count > 0) {
        toast.success(`✅ Exported ${count} rows as ${exp.filename}.csv`);
        setCounts(c => ({ ...c, [exp.id]: count }));
      }
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    }
    setLoading(l => ({ ...l, [exp.id]: false }));
  }, [dateFrom, dateTo]);

  const exportAll = async () => {
    toast('Exporting all datasets…', { icon: '📦' });
    for (const exp of exportTypes) {
      await exportData(exp);
      await new Promise(r => setTimeout(r, 500));
    }
    toast.success('✅ All exports complete!');
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📤</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Export Centre</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Export any financial dataset from the real database as CSV — Excel-compatible</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={exportAll} style={{ background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiDownload size={15} /> Export All Datasets
              </button>
            </div>
          </div>
          {/* Date filter */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>📅 Optional Date Filter (for payments, expenses, payroll):</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, opacity: 0.7 }}>From:</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, opacity: 0.7 }}>To:</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 13, outline: 'none' }} />
            </div>
            {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ background: 'rgba(220,38,38,0.3)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 6, color: '#fca5a5', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Clear Filter</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {exportTypes.map(exp => (
            <div key={exp.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20, border: `1px solid ${exp.color}20`, transition: 'transform 0.2s,box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${exp.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{exp.icon}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#0f172a' }}>{exp.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{exp.description}</div>
                </div>
              </div>
              {counts[exp.id] && (
                <div style={{ background: `${exp.color}10`, border: `1px solid ${exp.color}25`, borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 12, color: exp.color, fontWeight: 700 }}>
                  ✅ Last export: {counts[exp.id].toLocaleString()} rows
                </div>
              )}
              <button
                onClick={() => exportData(exp)}
                disabled={loading[exp.id]}
                style={{ width: '100%', background: loading[exp.id] ? '#f1f5f9' : `linear-gradient(135deg,${exp.color},${exp.color}cc)`, color: loading[exp.id] ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 900, fontSize: 13, cursor: loading[exp.id] ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                {loading[exp.id] ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid #94a3b8', borderTop: '2px solid #475569', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Exporting…</>
                ) : (
                  <><FiDownload size={14} /> Download CSV</>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Format Guide */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 20, marginTop: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontWeight: 900, fontSize: 15, color: '#0f172a' }}>📖 Export Guide</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, fontSize: 13, color: '#374151' }}>
            {[
              { icon: '📊', title: 'Open in Excel', body: 'Open any CSV in Excel → Data → From Text/CSV → select comma delimiter → Load' },
              { icon: '🔢', title: 'Open in Google Sheets', body: 'Upload to Google Drive → right-click → Open with Google Sheets — auto-detects CSV format' },
              { icon: '📅', title: 'Date Filtering', body: 'Use the date filter above to export only a specific period for payments, expenses and payroll' },
            ].map((g, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>{g.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{g.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

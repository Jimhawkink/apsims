'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiSend, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiPhone, FiDollarSign, FiUser, FiAlertTriangle, FiList } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

type PushStatus = 'idle' | 'sending' | 'polling' | 'success' | 'failed';

interface Student { id: number; first_name: string; last_name: string; admission_no: string; admission_number: string; guardian_name: string; guardian_phone: string; form_id: number; status: string; }
interface FeeInfo { total: number; paid: number; balance: number; }

export default function KCBBuniPushPage() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [feeInfo, setFeeInfo] = useState<FeeInfo>({ total: 0, paid: 0, balance: 0 });
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [checkoutId, setCheckoutId] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [receipt, setReceipt] = useState('');
  const [failMsg, setFailMsg] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const pollRef = useRef<any>(null);
  const countRef = useRef<any>(null);

  const loadBase = useCallback(async () => {
    const [fRes, stRes, paRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_fee_structures').select('*'),
      supabase.from('school_fee_payments').select('id,student_id,amount'),
    ]);
    setForms(fRes.data || []);
    setStructures(stRes.data || []);
    setPayments(paRes.data || []);
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    // Read from BOTH tables:
    // 1. school_mpesa_transactions = STK push requests (pending/polling)
    // 2. school_fee_payments = completed KCB payments (method = 'KCB' or contains 'KCB')
    const [txRes, feeRes] = await Promise.all([
      supabase.from('school_mpesa_transactions')
        .select('checkout_request_id,student_id,amount,phone_number,status,mpesa_receipt,payment_method,created_at')
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('school_fee_payments')
        .select('id,student_id,amount,payment_date,payment_method,receipt_number,mpesa_code')
        .ilike('payment_method', '%KCB%')
        .order('payment_date', { ascending: false }).limit(30),
    ]);
    // Merge: STK push requests + completed fee payments (mark completed ones as 'Completed')
    const txRows = (txRes.data || []).map((r: any) => ({ ...r, _source: 'stk' }));
    const feeRows = (feeRes.data || []).map((r: any) => ({
      checkout_request_id: r.receipt_number || r.id,
      student_id: r.student_id,
      amount: r.amount,
      phone_number: '',
      status: 'Completed',
      mpesa_receipt: r.mpesa_code || r.receipt_number,
      payment_method: r.payment_method,
      created_at: r.payment_date,
      _source: 'fee',
    }));
    // Deduplicate by receipt — STK entries take precedence
    const all = [...txRows, ...feeRows];
    const seen = new Set<string>();
    const deduped = all.filter(r => {
      const key = String(r.mpesa_receipt || r.checkout_request_id || r.amount);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setHistory(deduped.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadBase(); loadHistory(); }, [loadBase, loadHistory]);

  const searchStudents = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setStudents([]); return; }
    const { data } = await supabase.from('school_students')
      .select('id,first_name,last_name,admission_no,admission_number,guardian_name,guardian_phone,form_id,status')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,admission_no.ilike.%${q}%,admission_number.ilike.%${q}%`)
      .limit(10);
    setStudents(data || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchStudents(search), 300);
    return () => clearTimeout(t);
  }, [search, searchStudents]);

  const selectStudent = (s: Student) => {
    setSelected(s);
    setStudents([]);
    setSearch(`${s.first_name} ${s.last_name} (${s.admission_no || s.admission_number})`);
    const phone_val = s.guardian_phone || '';
    setPhone(phone_val);
    const fs = structures.filter(f => f.form_id === s.form_id);
    const total = fs.reduce((a, f) => a + Number(f.amount || f.tuition || 0), 0);
    const paid = payments.filter(p => p.student_id === s.id).reduce((a, p) => a + Number(p.amount || 0), 0);
    setFeeInfo({ total, paid, balance: Math.max(0, total - paid) });
    setAmount(String(Math.max(0, total - paid)));
    setPushStatus('idle');
    setReceipt('');
    setFailMsg('');
  };

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countRef.current) clearInterval(countRef.current);
  };

  const startPolling = (cId: string) => {
    setCountdown(30);
    countRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { stopPolling(); setPushStatus('failed'); setFailMsg('KCB payment timed out. If money was deducted, contact school with your KCB SMS code.'); return 0; }
        return c - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/kcb-status?checkoutRequestId=${encodeURIComponent(cId)}`);
        const data = await res.json();
        const s = (data.status || '').toLowerCase();
        if (s === 'success') {
          stopPolling();
          setPushStatus('success');
          setReceipt(data.receipt || '');
          toast.success(`✅ KCB Payment confirmed! Code: ${data.receipt}`);
          loadHistory();
          loadBase();
        } else if (s === 'failed') {
          stopPolling();
          setPushStatus('failed');
          setFailMsg(data.result_desc || 'Payment was cancelled or failed.');
          toast.error('❌ KCB payment failed');
        }
      } catch {}
    }, 3000);
  };

  const handlePush = async () => {
    if (!selected) { toast.error('Select a student first'); return; }
    if (!phone || phone.length < 9) { toast.error('Enter a valid phone number'); return; }
    if (!amount || Number(amount) < 1) { toast.error('Enter a valid amount'); return; }
    setPushStatus('sending');
    setReceipt(''); setFailMsg('');
    try {
      const res = await fetch('/api/payments/kcb-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount: Number(amount), studentId: selected.id, description: 'School Fee Payment' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setPushStatus('failed'); setFailMsg(data.error || 'KCB Push failed'); toast.error(data.error || 'KCB STK Push failed'); return; }
      setCheckoutId(data.checkoutRequestId || '');
      setPushStatus('polling');
      toast.success('🏦 KCB STK Push sent! Check your phone.');
      startPolling(data.checkoutRequestId);
    } catch (e: any) { setPushStatus('failed'); setFailMsg(e.message || 'Network error'); }
  };

  useEffect(() => () => stopPolling(), []);

  const formName = (id: number) => forms.find(f => f.id === id)?.form_name || '';

  const statusBg: Record<string, string> = { success: '#dcfce7', failed: '#fee2e2', completed: '#dcfce7', pending: '#fef9c3' };
  const statusColor: Record<string, string> = { success: '#15803d', failed: '#dc2626', completed: '#15803d', pending: '#854d0e' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#06b6d4 100%)', padding: '32px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>🏦</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>KCB Buni Push</h1>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8, marginTop: 2 }}>Instant payment prompt directly to parent's KCB / Safaricom phone — no other system in Kenya does this</p>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '8px 16px', fontSize: 13, fontWeight: 700, backdropFilter: 'blur(8px)' }}>
              🟢 LIVE API
            </div>
          </div>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: '📨', label: 'Pushes Today', val: history.filter(h => h.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length },
              { icon: '✅', label: 'Successful', val: history.filter(h => ['success','completed'].includes((h.status||'').toLowerCase())).length },
              { icon: '⏳', label: 'Pending', val: history.filter(h => (h.status||'').toLowerCase() === 'pending').length },
              { icon: '💰', label: 'Total Collected', val: KES(history.filter(h => ['success','completed'].includes((h.status||'').toLowerCase())).reduce((a, h) => a + Number(h.amount || 0), 0)) },
            ].map((k, i) => (
              <div key={i} style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 20 }}>{k.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{k.val}</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── LEFT: PUSH FORM ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSend size={16} /> Send KCB Buni Push
            </h2>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Student search */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Student</label>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} size={16} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or admission no..." style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              {students.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: '#fff', maxHeight: 220, overflow: 'auto', position: 'relative', zIndex: 50 }}>
                  {students.map(s => (
                    <div key={s.id} onClick={() => selectStudent(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{s.admission_no || s.admission_number} · {formName(s.form_id)}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#0891b2', fontWeight: 700 }}>{s.guardian_phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student info card */}
            {selected && (
              <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1px solid #bae6fd', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#0c4a6e,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15 }}>{selected.first_name[0]}{selected.last_name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: '#0c4a6e' }}>{selected.first_name} {selected.last_name}</div>
                    <div style={{ fontSize: 11, color: '#0891b2' }}>{selected.admission_no || selected.admission_number} · {formName(selected.form_id)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[['Total Fees', KES(feeInfo.total), '#0c4a6e'], ['Paid', KES(feeInfo.paid), '#15803d'], ['Balance', KES(feeInfo.balance), feeInfo.balance > 0 ? '#dc2626' : '#15803d']].map(([l, v, c]) => (
                    <div key={l as string} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: c as string }}>{v}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏦 KCB / Safaricom Phone</label>
              <div style={{ position: 'relative' }}>
                <FiPhone style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} size={16} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712345678" style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Enter guardian's KCB or Safaricom number. STK prompt will appear on their phone.</div>
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (KES)</label>
              <div style={{ position: 'relative' }}>
                <FiDollarSign style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} size={16} />
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={1} placeholder="Enter amount" style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              {feeInfo.balance > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {[feeInfo.balance, Math.round(feeInfo.balance / 2), 5000, 10000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map(v => (
                    <button key={v} onClick={() => setAmount(String(v))} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#0891b2', cursor: 'pointer' }}>{KES(v)}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Status area */}
            {pushStatus === 'polling' && (
              <div style={{ background: 'linear-gradient(135deg,#fef9c3,#fef3c7)', border: '1px solid #fde68a', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#854d0e' }}>KCB STK Push Sent!</div>
                <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>Enter M-Pesa PIN on your phone when prompted</div>
                <div style={{ marginTop: 12, width: 56, height: 56, borderRadius: '50%', background: 'rgba(133,77,14,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px auto 0', fontSize: 22, fontWeight: 900, color: '#854d0e' }}>{countdown}</div>
                <div style={{ fontSize: 11, color: '#a16207', marginTop: 4 }}>Seconds remaining</div>
              </div>
            )}
            {pushStatus === 'success' && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <FiCheckCircle size={32} color="#15803d" />
                <div style={{ fontWeight: 900, fontSize: 15, color: '#15803d', marginTop: 8 }}>Payment Confirmed!</div>
                {receipt && <div style={{ fontSize: 13, color: '#166534', marginTop: 4 }}>KCB Code: <strong>{receipt}</strong></div>}
                <button onClick={() => { setPushStatus('idle'); setReceipt(''); setSelected(null); setSearch(''); setAmount(''); }} style={{ marginTop: 12, background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Start New Push</button>
              </div>
            )}
            {pushStatus === 'failed' && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <FiXCircle size={32} color="#dc2626" />
                <div style={{ fontWeight: 900, fontSize: 15, color: '#dc2626', marginTop: 8 }}>Payment Failed</div>
                <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>{failMsg}</div>
                <button onClick={() => setPushStatus('idle')} style={{ marginTop: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try Again</button>
              </div>
            )}

            {/* Send button */}
            {(pushStatus === 'idle' || pushStatus === 'failed') && (
              <button onClick={handlePush} disabled={!selected || pushStatus === 'sending'} style={{ background: selected ? 'linear-gradient(135deg,#0c4a6e,#0891b2)' : '#e2e8f0', color: selected ? '#fff' : '#94a3b8', border: 'none', borderRadius: 12, padding: '14px 20px', fontWeight: 900, fontSize: 15, cursor: selected ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                <span>🏦</span> {pushStatus === 'sending' ? 'Sending KCB Push…' : `Send KCB Buni Push${amount ? ` — ${KES(Number(amount))}` : ''}`}
              </button>
            )}
            {pushStatus === 'sending' && (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #bae6fd', borderTop: '3px solid #0891b2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#0891b2', fontWeight: 700, marginTop: 8 }}>Connecting to KCB Buni…</div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: TRANSACTION HISTORY ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 8 }}><FiList size={16} /> KCB Push History</h2>
            <button onClick={loadHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}><FiRefreshCw size={14} /> Refresh</button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 520 }}>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}><FiClock size={32} style={{ marginBottom: 8 }} /><br />No KCB pushes yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Phone', 'Amount', 'Status', 'Time'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const st = (h.status || 'pending').toLowerCase();
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600 }}>{(h.phone_number || '').replace('254', '0').slice(0, 11)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 900, color: '#0c4a6e' }}>{KES(Number(h.amount || 0))}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: statusBg[st] || '#f1f5f9', color: statusColor[st] || '#374151', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 99, textTransform: 'uppercase' }}>{h.status || 'Pending'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{h.created_at ? new Date(h.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

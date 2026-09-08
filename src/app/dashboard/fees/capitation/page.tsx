'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiRefreshCw, FiPrinter, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';

const KES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function CapitationPage() {
  const [loading, setLoading] = useState(true);
  const [capitation, setCapitation] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ term_id: '', year: new Date().getFullYear(), amount_expected: '', amount_received: '', per_student_rate: '22015', gov_student_count: '', grant_type: 'Day School', bank_ref: '', receipt_date: '', notes: '', status: 'Pending' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [cRes, sRes, tRes, fRes] = await Promise.all([
      supabase.from('school_capitation').select('*').order('id', { ascending: false }),
      supabase.from('school_students').select('id,status,form_id').eq('status', 'Active'),
      supabase.from('school_terms').select('id,term_name,year,start_date,end_date,is_current').order('id', { ascending: false }),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
    ]);
    setCapitation(cRes.data || []);
    setStudents(sRes.data || []);
    setTerms(tRes.data || []);
    setForms(fRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeStudents = students.filter(s => s.status === 'Active');
  const yearCapitation = capitation.filter(c => c.year === selYear);
  const totalExpected = yearCapitation.reduce((a, c) => a + Number(c.amount_expected || 0), 0);
  const totalReceived = yearCapitation.reduce((a, c) => a + Number(c.amount_received || 0), 0);
  const outstanding = Math.max(0, totalExpected - totalReceived);
  const perStudentRate = Number(form.per_student_rate || 22015);

  const termName = (id: any) => terms.find(t => t.id === Number(id) || String(t.id) === String(id))?.term_name || '—';

  const openNew = () => {
    const cur = terms.find(t => t.is_current) || terms[0];
    setEditItem(null);
    setForm({
      term_id: cur ? String(cur.id) : '',
      year: selYear,
      amount_expected: String(Math.round(activeStudents.length * perStudentRate / 3)),
      amount_received: '',
      per_student_rate: '22015',
      gov_student_count: String(activeStudents.length),
      grant_type: 'Day School',
      bank_ref: '',
      receipt_date: '',
      notes: '',
      status: 'Pending',
    });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ term_id: String(c.term_id || ''), year: c.year || selYear, amount_expected: String(c.amount_expected || ''), amount_received: String(c.amount_received || ''), per_student_rate: String(c.per_student_rate || 22015), gov_student_count: String(c.gov_student_count || ''), grant_type: c.grant_type || 'Day School', bank_ref: c.bank_ref || '', receipt_date: c.receipt_date || '', notes: c.notes || '', status: c.status || 'Pending' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.term_id || !form.amount_expected) { toast.error('Fill term and expected amount'); return; }
    setSaving(true);
    const payload = { term_id: Number(form.term_id), year: Number(form.year), amount_expected: Number(form.amount_expected), amount_received: Number(form.amount_received || 0), per_student_rate: Number(form.per_student_rate || 0), gov_student_count: Number(form.gov_student_count || 0), grant_type: form.grant_type, bank_ref: form.bank_ref, receipt_date: form.receipt_date || null, notes: form.notes, status: form.status };
    let error;
    if (editItem) { ({ error } = await supabase.from('school_capitation').update(payload).eq('id', editItem.id)); }
    else { ({ error } = await supabase.from('school_capitation').insert([payload])); }
    if (error) { toast.error(error.message); } else { toast.success('Capitation record saved ✅'); setShowModal(false); loadAll(); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this capitation record?')) return;
    await supabase.from('school_capitation').delete().eq('id', id);
    toast.success('Deleted'); loadAll();
  };

  const statusColor: Record<string, { bg: string; color: string }> = {
    'Received': { bg: '#dcfce7', color: '#15803d' },
    'Pending': { bg: '#fef9c3', color: '#854d0e' },
    'Partial': { bg: '#dbeafe', color: '#1d4ed8' },
    'Overdue': { bg: '#fef2f2', color: '#dc2626' },
  };
  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#14532d 0%,#15803d 60%,#22c55e 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💰</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Capitation Tracking</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>Government capitation grants — track receipt, allocation and outstanding from real student data</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13, outline: 'none' }}>
                {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y} style={{ color: '#000' }}>{y}</option>)}
              </select>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer' }}><FiRefreshCw size={14} /></button>
              <button onClick={openNew} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#15803d', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPlus size={14} /> Record Capitation</button>
            </div>
          </div>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              { icon: '👥', label: 'Active Students', val: activeStudents.length },
              { icon: '📋', label: 'Rate/Student', val: KES(perStudentRate) },
              { icon: '📈', label: 'Expected (Year)', val: KES(totalExpected) },
              { icon: '✅', label: 'Received', val: KES(totalReceived) },
              { icon: '⏳', label: 'Outstanding', val: KES(outstanding) },
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div>{k.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{k.val}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {/* Calculation Helper */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: '#14532d', marginBottom: 8 }}>📊 Capitation Calculator (Kenya 2026 Rates)</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#166534' }}>
            <div>Day Secondary: <strong>KES 22,015/student/year</strong> = KES {Math.round(activeStudents.length * 22015).toLocaleString()} expected</div>
            <div>|</div>
            <div>Boarding: <strong>KES 53,554/student/year</strong></div>
            <div>|</div>
            <div>Active Students: <strong>{activeStudents.length}</strong> from real DB</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading capitation data…</div> : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Term','Year','Grant Type','Students','Rate/Student','Expected','Received','Balance','Receipt Date','Status','Actions'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {yearCapitation.map((c, i) => {
                    const sc = statusColor[c.status] || statusColor['Pending'];
                    const balance = Number(c.amount_expected || 0) - Number(c.amount_received || 0);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: '#14532d' }}>{termName(c.term_id)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{c.year}</td>
                        <td style={{ padding: '12px 14px' }}><span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{c.grant_type || 'Day School'}</span></td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{c.gov_student_count || activeStudents.length}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.per_student_rate ? KES(Number(c.per_student_rate)) : '—'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{KES(Number(c.amount_expected || 0))}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: '#15803d' }}>{KES(Number(c.amount_received || 0))}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 900, color: balance > 0 ? '#dc2626' : '#15803d' }}>{KES(balance)}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{c.receipt_date ? new Date(c.receipt_date).toLocaleDateString('en-KE') : '—'}</td>
                        <td style={{ padding: '12px 14px' }}><span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 99 }}>{c.status}</span></td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(c)} style={{ background: '#f0fdf4', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#15803d' }}><FiEdit2 size={12} /></button>
                            <button onClick={() => handleDelete(c.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#dc2626' }}><FiTrash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {yearCapitation.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>💰 No capitation records for {selYear}. Click "Record Capitation" to add.</td></tr>}
                  {yearCapitation.length > 0 && (
                    <tr style={{ background: '#dcfce7', fontWeight: 900 }}>
                      <td colSpan={5} style={{ padding: '12px 14px', color: '#14532d', fontWeight: 900, fontSize: 14 }}>TOTALS — {selYear}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14 }}>{KES(totalExpected)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#15803d' }}>{KES(totalReceived)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: outstanding > 0 ? '#dc2626' : '#15803d' }}>{KES(outstanding)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>{editItem ? 'Edit Capitation Record' : '💰 Record Government Capitation'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Term *', key: 'term_id', type: 'select', options: terms.slice(0,9).map(t => ({ value: t.id, label: `${t.term_name} ${t.year}` })) },
                { label: 'Year *', key: 'year', type: 'number' },
                { label: 'Grant Type', key: 'grant_type', type: 'select', options: ['Day School','Boarding','Special Needs','NEPAD'].map(v => ({ value: v, label: v })) },
                { label: 'Govt Student Count', key: 'gov_student_count', type: 'number', placeholder: `Real: ${activeStudents.length} students` },
                { label: 'Rate per Student (KES)', key: 'per_student_rate', type: 'number', placeholder: '22015 (day) or 53554 (boarding)' },
                { label: 'Expected Amount (KES) *', key: 'amount_expected', type: 'number' },
                { label: 'Amount Received (KES)', key: 'amount_received', type: 'number' },
                { label: 'Bank Reference / Cheque No', key: 'bank_ref', type: 'text' },
                { label: 'Receipt Date', key: 'receipt_date', type: 'date' },
                { label: 'Status', key: 'status', type: 'select', options: ['Pending','Partial','Received','Overdue'].map(v => ({ value: v, label: v })) },
                { label: 'Notes', key: 'notes', type: 'textarea' },
              ].map(({ label, key, type, options, placeholder }: any) => (
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
                    <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder || ''} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#14532d,#15803d)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {saving ? 'Saving…' : <><FiCheckCircle size={16} /> {editItem ? 'Update Record' : 'Save Capitation Record'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

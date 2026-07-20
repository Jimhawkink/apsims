'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

export default function ArrearsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);

  // Student search
  const [search, setSearch] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Arrears modal
  const [selected, setSelected] = useState<any>(null);       // student selected for entry
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [studentStructures, setStudentStructures] = useState<any[]>([]);
  const [obAmount, setObAmount] = useState('');
  const [obNotes, setObNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Load terms & forms ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('school_terms').select('id,term_name,year,is_current').order('year').order('id'),
      supabase.from('school_forms').select('id,form_name').order('form_name'),
      supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id').order('last_name').order('first_name'),
    ]).then(([tRes, fRes, sRes]) => {
      const ts = tRes.data || [];
      setTerms(ts);
      const prev = ts.find(t => !t.is_current) || ts[0];
      setSelectedTerm(prev);
      setForms(fRes.data || []);
      setAllStudents(sRes.data || []);
      setFilteredStudents(sRes.data || []);
    });
  }, []);

  // ── Filter students by search ────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setFilteredStudents(allStudents); setPage(0); return; }
    const q = search.toLowerCase();
    setFilteredStudents(allStudents.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const adm  = (s.admission_no || s.admission_number || '').toLowerCase();
      return name.includes(q) || adm.includes(q);
    }));
    setPage(0);
  }, [search, allStudents]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const pagedStudents = filteredStudents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Load student detail when selected ───────────────────────
  const openDetail = useCallback(async (student: any) => {
    if (!selectedTerm) return;
    setSelected(student);
    setLoadingDetail(true);
    setObAmount('');
    setObNotes('');
    try {
      const [payRes, structRes] = await Promise.all([
        supabase
          .from('school_fee_payments')
          .select('id,amount,payment_date,payment_method,notes,term_id,year')
          .eq('student_id', student.id)
          .eq('term_id', selectedTerm.id)
          .order('payment_date'),
        supabase
          .from('school_fee_structures')
          .select('id,category,amount,term_id')
          .eq('form_id', student.form_id)
          .eq('term_id', selectedTerm.id),
      ]);
      setStudentPayments(payRes.data || []);
      setStudentStructures(structRes.data || []);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedTerm]);

  const totalExpected = studentStructures.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPaid     = studentPayments.reduce((s, r) => s + Number(r.amount || 0), 0);
  const arrears       = Math.max(0, totalExpected - totalPaid);
  const formName = (formId: any) =>
    forms.find(f => String(f.id) === String(formId))?.form_name || 'Unknown';

  // ── Save opening balance ─────────────────────────────────────
  const handleSave = async () => {
    if (!selected || !selectedTerm || obAmount === '' || obAmount === null) {
      toast.error('Enter an amount (enter 0 if student paid nothing)'); return;
    }
    const amt = Number(obAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      // If amt = 0, we record it to explicitly mark that student paid nothing
      const { error } = await supabase.from('school_fee_payments').insert([{
        student_id:     selected.id,
        amount:         amt,
        payment_date:   new Date().toISOString().split('T')[0],
        payment_method: amt === 0 ? 'Opening Balance (Nil)' : 'Opening Balance',
        receipt_number: `OB-${Date.now().toString().slice(-6)}`,
        term_id:        selectedTerm.id,
        year:           selectedTerm.year,
        notes: obNotes.trim() ||
          (amt === 0
            ? `Student paid nothing in ${selectedTerm.term_name} ${selectedTerm.year} — full arrears confirmed`
            : `Opening balance — amount paid before system for ${selectedTerm.term_name} ${selectedTerm.year}`),
      }]);
      if (error) throw new Error(error.message);
      toast.success(
        amt === 0
          ? `✅ Confirmed: ${selected.first_name} paid KES 0 in ${selectedTerm.term_name} — full arrears noted`
          : `✅ KES ${amt.toLocaleString('en-KE')} recorded for ${selected.first_name}`
      );
      // Reload payments
      await openDetail(selected);
      setObAmount('');
      setObNotes('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const arrearsAfterEntry = Math.max(0, arrears - Number(obAmount || 0));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af,#6366f1)', padding: '20px 24px', color: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
          ⚠️ Arrears &amp; Opening Balances
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
          Search a student → select the term → enter how much they already paid before this system started.
          Arrears are then deducted automatically (Priority 1) when they next pay fees.
        </p>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 0 }}>

        {/* ── LEFT PANEL: Term + Student List ── */}
        <div style={{ width: 320, minWidth: 280, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>

          {/* Term selector */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Term for Arrears
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {terms.map(t => (
                <button key={t.id}
                  onClick={() => { setSelectedTerm(t); setSelected(null); }}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '2px solid', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, textAlign: 'left', transition: 'all 0.15s',
                    borderColor: selectedTerm?.id === t.id ? '#6366f1' : '#e2e8f0',
                    background:  selectedTerm?.id === t.id ? '#6366f1' : '#fff',
                    color:       selectedTerm?.id === t.id ? '#fff' : '#374151',
                  }}>
                  {t.term_name} {t.year}
                  {t.is_current && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>(Current)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search student name or adm no..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>{filteredStudents.length} students</p>
          </div>

          {/* Student list — paginated */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStudents.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No students found
              </div>
            )}
            {pagedStudents.map(s => (
              <button key={s.id}
                onClick={() => openDetail(s)}
                style={{
                  width: '100%', padding: '11px 16px', border: 'none', borderBottom: '1px solid #f1f5f9',
                  background: selected?.id === s.id ? '#eef2ff' : '#fff',
                  borderLeft: selected?.id === s.id ? '4px solid #6366f1' : '4px solid transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  {s.first_name} {s.last_name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  {s.admission_no || s.admission_number || 'No Adm#'} · {formName(s.form_id)}
                </p>
              </button>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 0 ? '#f1f5f9' : '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13, color: page === 0 ? '#cbd5e1' : '#374151', fontWeight: 700 }}>‹ Prev</button>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Page {page + 1} / {totalPages}
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>({filteredStudents.length} total)</span>
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page >= totalPages - 1 ? '#f1f5f9' : '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 13, color: page >= totalPages - 1 ? '#cbd5e1' : '#374151', fontWeight: 700 }}>Next ›</button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Student Arrears Detail ── */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {!selected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340, gap: 12, color: '#94a3b8' }}>
              <span style={{ fontSize: 60 }}>👈</span>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Select a student from the list</p>
              <p style={{ margin: 0, fontSize: 13 }}>Then enter how much they paid in the selected term</p>
            </div>
          )}

          {selected && (
            <>
              {/* Student header */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 900, flexShrink: 0 }}>
                  {selected.first_name?.[0]}{selected.last_name?.[0]}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 18, color: '#1e293b' }}>
                    {selected.first_name} {selected.last_name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                    {selected.admission_no || selected.admission_number || 'No Adm#'} · {formName(selected.form_id)}
                    &nbsp;·&nbsp;<strong>{selectedTerm?.term_name} {selectedTerm?.year}</strong>
                  </p>
                </div>
              </div>

              {loadingDetail ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
              ) : (
                <>
                  {/* Fee structure for this term */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Fee Structure — {selectedTerm?.term_name} {selectedTerm?.year}
                    </p>
                    {studentStructures.length === 0 ? (
                      <div style={{ padding: '10px 14px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', fontSize: 13, color: '#92400e' }}>
                        ⚠️ No fee structure set for this class &amp; term.
                        <a href="/dashboard/fees/structure" style={{ color: '#6366f1', fontWeight: 700, marginLeft: 6 }}>Set up Fee Structure →</a>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {studentStructures.map((s, i) => (
                            <tr key={i}>
                              <td style={{ padding: '6px 0', fontSize: 14, color: '#374151' }}>{s.category}</td>
                              <td style={{ padding: '6px 0', fontSize: 14, fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmt(s.amount)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 0', fontWeight: 900, color: '#1e293b' }}>Total Expected</td>
                            <td style={{ padding: '8px 0', fontWeight: 900, color: '#1e293b', textAlign: 'right', fontSize: 16 }}>{fmt(totalExpected)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Payments recorded for this term */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Payments Recorded — {selectedTerm?.term_name} {selectedTerm?.year}
                    </p>
                    {studentPayments.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No payments recorded yet for this term.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {['Date','Method','Notes','Amount'].map(h => (
                              <th key={h} style={{ padding: '4px 0', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: h === 'Amount' ? 'right' : 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {studentPayments.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '6px 0', fontSize: 12, color: '#475569' }}>{p.payment_date}</td>
                              <td style={{ padding: '6px 0', fontSize: 12 }}>
                                <span style={{ padding: '2px 7px', borderRadius: 6, background: p.payment_method === 'Opening Balance' ? '#ecfdf5' : '#eef2ff', color: p.payment_method === 'Opening Balance' ? '#16a34a' : '#4f46e5', fontWeight: 700, fontSize: 11 }}>
                                  {p.payment_method}
                                </span>
                              </td>
                              <td style={{ padding: '6px 0', fontSize: 11, color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                              <td style={{ padding: '6px 0', fontSize: 13, fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>{fmt(p.amount)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                            <td colSpan={3} style={{ padding: '8px 0', fontWeight: 900, color: '#1e293b' }}>Total Paid</td>
                            <td style={{ padding: '8px 0', fontWeight: 900, color: '#16a34a', textAlign: 'right', fontSize: 16 }}>{fmt(totalPaid)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Arrears summary */}
                  <div style={{ background: arrears > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 14, padding: '14px 20px', marginBottom: 20, border: `1px solid ${arrears > 0 ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: arrears > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {arrears > 0 ? '⚠️ Outstanding Arrears' : '✅ Fully Paid'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                        {fmt(totalExpected)} expected − {fmt(totalPaid)} paid
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: arrears > 0 ? '#dc2626' : '#16a34a' }}>{fmt(arrears)}</p>
                  </div>

                  {/* Opening Balance Entry */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '2px solid #6366f1' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 900, color: '#1e293b' }}>
                      ➕ Enter Amount Already Paid (Opening Balance)
                    </p>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
                      If this student paid fees <strong>before the system started</strong>, enter that amount here.
                      It will be recorded as an <em>Opening Balance</em> payment for {selectedTerm?.term_name} {selectedTerm?.year}.
                    </p>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Amount Paid (KES) *
                      </label>
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        value={obAmount}
                        onChange={e => setObAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="e.g. 5000"
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 28, fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Notes (optional)
                      </label>
                      <input type="text" value={obNotes} onChange={e => setObNotes(e.target.value)}
                        placeholder="e.g. Paid cash to bursar before system started"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    {obAmount !== '' && obAmount !== null && !isNaN(Number(obAmount)) && (
                      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#166534' }}>Arrears after this entry:</span>
                        <strong style={{ color: arrearsAfterEntry > 0 ? '#dc2626' : '#16a34a' }}>{fmt(arrearsAfterEntry)}</strong>
                      </div>
                    )}

                    <button onClick={handleSave} disabled={saving || obAmount === '' || isNaN(Number(obAmount)) || Number(obAmount) < 0}
                      style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 15, cursor: (saving || obAmount === '' || isNaN(Number(obAmount)) || Number(obAmount) < 0) ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        background: (saving || obAmount === '' || isNaN(Number(obAmount)) || Number(obAmount) < 0) ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: (saving || obAmount === '' || isNaN(Number(obAmount)) || Number(obAmount) < 0) ? '#94a3b8' : '#fff' }}>
                      {saving ? '⏳ Saving...' : obAmount === '' ? 'Enter an amount above' : `✅ Record KES ${Number(obAmount).toLocaleString('en-KE')} as Opening Balance`}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

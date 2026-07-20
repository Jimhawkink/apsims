'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export default function ArrearsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterForm, setFilterForm] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'arrears' | 'cleared'>('arrears');
  const [searchTerm, setSearchTerm] = useState('');

  // Opening balance modal
  const [modalStudent, setModalStudent] = useState<any>(null);
  const [obAmount, setObAmount] = useState('');
  const [obNotes, setObNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load terms
  useEffect(() => {
    supabase.from('school_terms').select('id,term_name,year,is_current').order('year').order('id').then(({ data }) => {
      if (data) {
        setTerms(data);
        // Default to previous term (first non-current)
        const prev = data.find(t => !t.is_current) || data[0];
        setSelectedTerm(prev);
      }
    });
    supabase.from('school_forms').select('id,form_name').order('form_name').then(({ data }) => {
      if (data) setForms(data);
    });
  }, []);

  // Load data when term changes
  const loadData = useCallback(async () => {
    if (!selectedTerm) return;
    setLoading(true);
    try {
      const [studRes, structRes, payRes] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id').eq('is_active', true).order('last_name'),
        supabase.from('school_fee_structures').select('form_id,category,amount,term_id,year').eq('term_id', selectedTerm.id).eq('year', selectedTerm.year),
        supabase.from('school_fee_payments').select('student_id,amount,term_id,year').eq('term_id', selectedTerm.id).eq('year', selectedTerm.year),
      ]);
      setStudents(studRes.data || []);
      setFeeStructures(structRes.data || []);
      setPayments(payRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [selectedTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate arrears per student
  const studentRows = students.map(s => {
    const structs = feeStructures.filter(f => String(f.form_id) === String(s.form_id));
    const expected = structs.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const paid = payments.filter(p => String(p.student_id) === String(s.id)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const arrears = Math.max(0, expected - paid);
    return { ...s, expected, paid, arrears, formName: forms.find(f => String(f.id) === String(s.form_id))?.form_name || 'Unknown' };
  });

  // Filters
  const filtered = studentRows.filter(s => {
    if (filterForm !== 'all' && String(s.form_id) !== filterForm) return false;
    if (filterStatus === 'arrears' && s.arrears <= 0) return false;
    if (filterStatus === 'cleared' && s.arrears > 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const adm = (s.admission_no || s.admission_number || '').toLowerCase();
      if (!name.includes(q) && !adm.includes(q)) return false;
    }
    return true;
  });

  const totalArrears = studentRows.reduce((s, r) => s + r.arrears, 0);
  const studentsWithArrears = studentRows.filter(r => r.arrears > 0).length;

  // Record opening balance
  const handleSaveOB = async () => {
    if (!modalStudent || !selectedTerm || !obAmount || Number(obAmount) <= 0) {
      toast.error('Enter a valid amount'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('school_fee_payments').insert([{
        student_id: modalStudent.id,
        amount: Number(obAmount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Opening Balance',
        receipt_number: `OB-${selectedTerm.term_name.replace(/\s/g,'-')}-${Date.now().toString().slice(-6)}`,
        term_id: selectedTerm.id,
        year: selectedTerm.year,
        notes: obNotes || `Opening balance / amount paid before system — ${selectedTerm.term_name} ${selectedTerm.year}`,
      }]);
      if (error) throw new Error(error.message);
      toast.success(`Opening balance of ${fmt(Number(obAmount))} recorded for ${modalStudent.first_name}`);
      setModalStudent(null); setObAmount(''); setObNotes('');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', margin: 0 }}>📋 Fee Arrears &amp; Opening Balances</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
          Enter what students paid in previous terms before this system started. The system will automatically deduct arrears first when they pay their next term fees.
        </p>
      </div>

      {/* How it works banner */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af,#6366f1)', borderRadius: 16, padding: '16px 20px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>💡</span>
        <div>
          <p style={{ fontWeight: 800, margin: '0 0 4px', fontSize: 15 }}>How arrears work in this system</p>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
            <strong>Step 1:</strong> Set up your fee structures for ALL terms (including past terms) under <em>Fees → Fee Structure</em>.<br/>
            <strong>Step 2:</strong> Use this page to enter what each student <em>already paid</em> in previous terms (opening balances).<br/>
            <strong>Step 3:</strong> When collecting fees, the system automatically checks arrears first (Priority 1 — ARREARS vote head) and deducts before allocating to current term vote heads.
          </p>
        </div>
      </div>

      {/* Term Selector */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>SELECT PREVIOUS TERM TO VIEW/ENTER ARREARS</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {terms.map(t => (
              <button key={t.id} onClick={() => setSelectedTerm(t)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '2px solid', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                  borderColor: selectedTerm?.id === t.id ? '#6366f1' : '#e2e8f0',
                  background: selectedTerm?.id === t.id ? '#6366f1' : '#fff',
                  color: selectedTerm?.id === t.id ? '#fff' : '#374151' }}>
                {t.term_name} {t.year} {t.is_current ? '(Current)' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Arrears', val: fmt(totalArrears), color: '#dc2626', bg: '#fef2f2', icon: '⚠️' },
          { label: 'Students with Arrears', val: studentsWithArrears, color: '#d97706', bg: '#fffbeb', icon: '👥' },
          { label: 'Students Cleared', val: studentRows.length - studentsWithArrears, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
          { label: 'Total Students', val: studentRows.length, color: '#6366f1', bg: '#eef2ff', icon: '🏫' },
        ].map((c, i) => (
          <div key={i} style={{ background: c.bg, borderRadius: 14, padding: '16px', border: `1px solid ${c.color}22` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{c.icon} {c.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: c.color }}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name or admission no..."
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        <select value={filterForm} onChange={e => setFilterForm(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none' }}>
          <option value="all">All Classes</option>
          {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
        </select>
        {['all','arrears','cleared'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s as any)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
              borderColor: filterStatus === s ? '#6366f1' : '#e2e8f0',
              background: filterStatus === s ? '#6366f1' : '#fff',
              color: filterStatus === s ? '#fff' : '#374151' }}>
            {s === 'all' ? 'All' : s === 'arrears' ? '⚠️ Has Arrears' : '✅ Cleared'}
          </button>
        ))}
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{filtered.length} students</span>
      </div>

      {/* Student Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Student','Class','Expected Fees','Already Paid','ARREARS','Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                {filterStatus === 'arrears' ? '🎉 No students with arrears in this term!' : 'No students found'}
              </td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbff')}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{s.first_name} {s.last_name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{s.admission_no || s.admission_number || '—'}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{s.formName}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>{fmt(s.expected)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{fmt(s.paid)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {s.arrears > 0
                    ? <span style={{ fontWeight: 900, color: '#dc2626', fontSize: 15 }}>{fmt(s.arrears)}</span>
                    : <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✅ Cleared</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {s.expected > 0 && (
                    <button onClick={() => { setModalStudent(s); setObAmount(String(s.arrears > 0 ? s.arrears : '')); setObNotes(''); }}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                        background: s.arrears > 0 ? '#fef2f2' : '#f0fdf4',
                        color: s.arrears > 0 ? '#dc2626' : '#16a34a' }}>
                      {s.arrears > 0 ? '+ Enter Paid Amt' : '✎ Adjust'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note at bottom */}
      <div style={{ marginTop: 20, padding: '14px 18px', background: '#fff7ed', borderRadius: 12, border: '1px solid #fed7aa', fontSize: 13, color: '#92400e' }}>
        <strong>💡 Tip for Kenyan Schools joining mid-year:</strong> For students who paid Term 1 fees manually (before this system), 
        click <em>"+ Enter Paid Amt"</em> and enter what they paid. The system will record it as an <strong>Opening Balance</strong> for that term. 
        Next time they pay, their remaining arrears will be deducted first automatically before Term 2 vote heads.
      </div>

      {/* Opening Balance Modal */}
      {modalStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Enter Opening Balance</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
              {modalStudent.first_name} {modalStudent.last_name} — {selectedTerm?.term_name} {selectedTerm?.year}
            </p>

            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Arrears outstanding: {fmt(modalStudent.arrears)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Expected: {fmt(modalStudent.expected)} | Already recorded: {fmt(modalStudent.paid)}</p>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              AMOUNT STUDENT ALREADY PAID (KES) *
            </label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={obAmount}
              onChange={e => setObAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 3000"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid #e2e8f0', fontSize: 24, fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>NOTES (Optional)</label>
            <input
              type="text" value={obNotes} onChange={e => setObNotes(e.target.value)}
              placeholder="e.g. Paid cash to bursar before system"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
            />

            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginBottom: 20, fontSize: 12, color: '#166534' }}>
              After saving, arrears will be: <strong>{fmt(Math.max(0, modalStudent.arrears - Number(obAmount || 0)))}</strong>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalStudent(null)} disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#64748b' }}>
                Cancel
              </button>
              <button onClick={handleSaveOB} disabled={saving || !obAmount || Number(obAmount) <= 0}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: saving ? '#94a3b8' : '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : `✅ Record KES ${obAmount ? Number(obAmount).toLocaleString('en-KE') : '0'} Paid`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

function validateNEMIS(n: string) {
  if (!n) return false;
  return /^\d{8,12}$/.test(n.trim());
}

export default function NEMISExportPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);
  const [editNEMIS, setEditNEMIS] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes, stRes] = await Promise.all([
        supabase.from('school_students').select('id,admission_no,first_name,last_name,gender,date_of_birth,form_id,stream_id,status,nemis_no').eq('status', 'Active').order('first_name'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*').order('stream_name'),
      ]);
      setStudents(sRes.data || []);
      setForms(fRes.data || []);
      setStreams(stRes.data || []);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveNEMIS = async (studentId: number) => {
    const nemis = (editNEMIS[studentId] || '').trim();
    if (!validateNEMIS(nemis)) { toast.error('NEMIS No must be 8–12 digits'); return; }
    setSaving(prev => new Set(prev).add(studentId));
    const { error } = await supabase.from('school_students').update({ nemis_no: nemis }).eq('id', studentId);
    if (error) toast.error(error.message);
    else {
      toast.success('NEMIS number saved ✓');
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, nemis_no: nemis } : s));
    }
    setSaving(prev => { const n = new Set(prev); n.delete(studentId); return n; });
  };

  const enriched = useMemo(() => students.map(s => ({
    ...s,
    formName: forms.find(f => f.id === s.form_id)?.form_name || '',
    streamName: streams.find(st => st.id === s.stream_id)?.stream_name || '',
    hasNEMIS: validateNEMIS(s.nemis_no || ''),
  })), [students, forms, streams]);

  const filtered = useMemo(() => enriched
    .filter(s => !selForm || String(s.form_id) === selForm)
    .filter(s => !selStream || String(s.stream_id) === selStream)
    .filter(s => !filterMissing || !s.hasNEMIS)
    .filter(s => !search || `${s.first_name} ${s.last_name} ${s.admission_no} ${s.nemis_no || ''}`.toLowerCase().includes(search.toLowerCase())),
    [enriched, selForm, selStream, filterMissing, search]);

  const kpis = useMemo(() => ({
    total: enriched.length,
    hasNEMIS: enriched.filter(s => s.hasNEMIS).length,
    missing: enriched.filter(s => !s.hasNEMIS).length,
    pct: enriched.length > 0 ? Math.round((enriched.filter(s => s.hasNEMIS).length / enriched.length) * 100) : 0,
  }), [enriched]);

  const exportCSV = (rows: any[]) => {
    const headers = ['Reg No', 'NEMIS No', 'First Name', 'Middle Name', 'Surname', 'Gender', 'Date of Birth', 'Form', 'Stream'];
    const data = rows.map(s => {
      const names = `${s.first_name} ${s.last_name}`.split(' ');
      return [s.admission_no, s.nemis_no || '', names[0] || '', names[1] || '', names[2] || '', s.gender || '', fmtDate(s.date_of_birth), s.formName, s.streamName];
    });
    const csv = [headers, ...data].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nemis_export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} students to CSV`);
  };

  const hdr: React.CSSProperties = { fontFamily: FONT, background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)', padding: '32px 36px 28px', position: 'relative', overflow: 'hidden' };

  return (
    <div style={{ fontFamily: FONT, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={hdr}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%,rgba(255,255,255,0.06) 0%,transparent 60%)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>🏛️ NEMIS Data Export & Compliance</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Ministry of Education NEMIS integration · Validate, edit and export student numbers</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => exportCSV(filtered.filter(s => s.hasNEMIS))} style={hBtn}>📥 Export Valid CSV</button>
              <button onClick={() => exportCSV(filtered)} style={hBtn}>📥 Export All CSV</button>
              {selected.size > 0 && <button onClick={() => exportCSV(filtered.filter(s => selected.has(s.id)))} style={{ ...hBtn, background: '#fff', color: '#059669', border: 'none' }}>📥 Export {selected.size} Selected</button>}
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { icon: '👩‍🎓', label: 'Total Students', value: kpis.total, color: '#fff' },
              { icon: '✅', label: 'Has NEMIS', value: kpis.hasNEMIS, color: '#86efac' },
              { icon: '🚨', label: 'Missing NEMIS', value: kpis.missing, color: '#fca5a5' },
              { icon: '📊', label: 'Compliance', value: `${kpis.pct}%`, color: kpis.pct >= 80 ? '#86efac' : '#fcd34d' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
                <span style={{ fontSize: 20 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                </div>
              </div>
            ))}
            {/* Compliance bar */}
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: '10px 18px', minWidth: 200, flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginBottom: 6 }}>NEMIS Compliance Progress</div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${kpis.pct}%`, height: 8, background: kpis.pct >= 80 ? '#86efac' : kpis.pct >= 50 ? '#fcd34d' : '#fca5a5', borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 800, marginTop: 4 }}>{kpis.hasNEMIS} of {kpis.total} students registered</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name, adm no, NEMIS…" style={{ ...inp, flex: 1, minWidth: 220 }} />
          <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ ...inp, width: 140 }}><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
          <select value={selStream} onChange={e => setSelStream(e.target.value)} style={{ ...inp, width: 140 }}><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={filterMissing} onChange={e => setFilterMissing(e.target.checked)} />
            Show Missing Only
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 700 }}>{filtered.length} students</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 16 }}>⏳ Loading students…</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(s => s.id)) : new Set())} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#065f46' }}>✅ {kpis.hasNEMIS} valid · 🚨 {kpis.missing} missing — click NEMIS field to edit inline</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={th}><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(s => s.id)) : new Set())} /></th>
                  {['#', 'Adm No', 'Full Name', 'Gender', 'DOB', 'Form', 'Stream', 'NEMIS No', 'Status', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const localVal = editNEMIS[s.id] !== undefined ? editNEMIS[s.id] : (s.nemis_no || '');
                  const isValid = validateNEMIS(localVal);
                  const isDirty = editNEMIS[s.id] !== undefined && editNEMIS[s.id] !== (s.nemis_no || '');
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={tc}><input type="checkbox" checked={selected.has(s.id)} onChange={e => { const ns = new Set(selected); e.target.checked ? ns.add(s.id) : ns.delete(s.id); setSelected(ns); }} /></td>
                      <td style={{ ...tc, color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ ...tc, fontWeight: 700, color: '#64748b' }}>{s.admission_no}</td>
                      <td style={tc}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{s.first_name} {s.last_name}</div>
                      </td>
                      <td style={tc}>
                        <span style={{ background: s.gender === 'Male' ? '#dbeafe' : '#fce7f3', color: s.gender === 'Male' ? '#1d4ed8' : '#be185d', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>{s.gender || '—'}</span>
                      </td>
                      <td style={{ ...tc, color: '#64748b', fontSize: 11 }}>{fmtDate(s.date_of_birth)}</td>
                      <td style={tc}><span style={{ fontSize: 11, fontWeight: 700 }}>{s.formName}</span></td>
                      <td style={{ ...tc, color: '#64748b' }}>{s.streamName}</td>
                      <td style={tc}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            value={localVal}
                            onChange={e => setEditNEMIS(prev => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="Enter NEMIS No"
                            maxLength={12}
                            style={{ width: 130, padding: '6px 8px', border: `1.5px solid ${isDirty ? '#f59e0b' : isValid ? '#059669' : '#e2e8f0'}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: isDirty ? '#fefce8' : '#f8fafc', fontWeight: 700 }}
                          />
                        </div>
                      </td>
                      <td style={tc}>
                        {s.hasNEMIS && !isDirty
                          ? <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>✓ Valid</span>
                          : <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>{isDirty ? '⚠ Unsaved' : '✗ Missing'}</span>}
                      </td>
                      <td style={tc}>
                        {isDirty && (
                          <button onClick={() => saveNEMIS(s.id)} disabled={saving.has(s.id)} style={{ background: '#059669', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {saving.has(s.id) ? '⏳' : '💾 Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: 48 }}>🏛️</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>No students match the current filters</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' };
const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
const tc: React.CSSProperties = { padding: '11px 12px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' };
const hBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)' };

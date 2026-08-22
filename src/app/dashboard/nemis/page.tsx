'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiUpload, FiDownload, FiRefreshCw, FiSearch, FiCheck, FiX,
  FiAlertCircle, FiCheckCircle, FiShield, FiUsers, FiFilter,
  FiFileText, FiGrid, FiSend, FiEye, FiAlertTriangle, FiDatabase,
  FiZap, FiTrendingUp, FiBarChart2, FiSave,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type ValidationStatus = 'valid' | 'warning' | 'error' | 'pending';

interface Student {
  id: number; first_name: string; last_name: string; other_name?: string;
  admission_number: string; date_of_birth?: string; gender?: string;
  nemis_no?: string; upi_no?: string; guardian_name?: string;
  guardian_phone?: string; guardian_id_no?: string;
  form_id?: number; nationality?: string; special_needs?: boolean;
}
interface ValidationIssue {
  student_id: number; field: string; message: string; severity: 'error' | 'warning';
}
interface ValidatedStudent extends Student {
  status: ValidationStatus;
  issues: ValidationIssue[];
  form_name?: string;
}
interface Form { id: number; form_name: string; form_level: number; }

const REQUIRED_FIELDS: { field: keyof Student; label: string; severity: 'error' | 'warning' }[] = [
  { field: 'first_name',    label: 'First Name',       severity: 'error' },
  { field: 'last_name',     label: 'Last Name',        severity: 'error' },
  { field: 'date_of_birth', label: 'Date of Birth',    severity: 'error' },
  { field: 'gender',        label: 'Gender',           severity: 'error' },
  { field: 'admission_number', label: 'Admission No',  severity: 'error' },
  { field: 'nemis_no',      label: 'NEMIS Number',     severity: 'warning' },
  { field: 'upi_no',        label: 'UPI Number',       severity: 'warning' },
  { field: 'guardian_name', label: 'Guardian Name',    severity: 'warning' },
  { field: 'guardian_phone','label': 'Guardian Phone', severity: 'warning' },
];

type Tab = 'dashboard' | 'validate' | 'import' | 'sync';

export default function NEMISPage() {
  const [students, setStudents] = useState<ValidatedStudent[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selForm, setSelForm] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | 'all'>('all');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');

  const validate = (student: Student, formName?: string): ValidatedStudent => {
    const issues: ValidationIssue[] = [];
    REQUIRED_FIELDS.forEach(({ field, label, severity }) => {
      if (!student[field] || String(student[field]).trim() === '') {
        issues.push({ student_id: student.id, field, message: `${label} is missing`, severity });
      }
    });
    // DOB format check
    if (student.date_of_birth) {
      const dob = new Date(student.date_of_birth);
      const age = (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 5 || age > 25) issues.push({ student_id: student.id, field: 'date_of_birth', message: 'Age seems unusual (must be 5–25)', severity: 'warning' });
    }
    // Phone format
    if (student.guardian_phone && !/^(07|01|2547|2541)\d{8,9}$/.test(student.guardian_phone.replace(/\s/g, ''))) {
      issues.push({ student_id: student.id, field: 'guardian_phone', message: 'Phone format invalid (Kenya format required)', severity: 'warning' });
    }
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const status: ValidationStatus = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';
    return { ...student, status, issues, form_name: formName };
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    let q = sb.from('school_students')
      .select('id,first_name,last_name,other_name,admission_number,date_of_birth,gender,nemis_no,upi_no,guardian_name,guardian_phone,guardian_id_no,form_id,nationality,special_needs')
      .eq('status', 'Active').order('last_name');
    if (selForm) q = q.eq('form_id', selForm);
    const { data: studs } = await q;
    const { data: fms } = await sb.from('school_forms').select('*').order('form_level');
    setForms(fms || []);
    const formMap: Record<number, string> = {};
    (fms || []).forEach((f: Form) => { formMap[f.id] = f.form_name; });
    const validated = (studs || []).map((s: Student) => validate(s, formMap[s.form_id || 0]));
    setStudents(validated);
    setLoading(false);
  }, [selForm]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = useMemo(() => {
    let r = students;
    if (statusFilter !== 'all') r = r.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q) || (s.nemis_no || '').toLowerCase().includes(q));
    }
    return r;
  }, [students, statusFilter, search]);

  const stats = useMemo(() => ({
    total: students.length,
    valid: students.filter(s => s.status === 'valid').length,
    warning: students.filter(s => s.status === 'warning').length,
    error: students.filter(s => s.status === 'error').length,
    withNemis: students.filter(s => s.nemis_no).length,
    withUpi: students.filter(s => s.upi_no).length,
  }), [students]);

  const exportNEMIS = () => {
    const validStudents = students.filter(s => s.status !== 'error');
    const headers = ['NEMIS_NO', 'UPI_NO', 'SURNAME', 'OTHER_NAMES', 'DOB', 'GENDER', 'FORM', 'ADMISSION_NO', 'GUARDIAN_NAME', 'GUARDIAN_PHONE', 'NATIONALITY', 'SPECIAL_NEEDS'];
    const rows = validStudents.map(s => [
      s.nemis_no || '', s.upi_no || '',
      s.last_name, `${s.first_name} ${s.other_name || ''}`.trim(),
      s.date_of_birth || '', s.gender || '', s.form_name || '',
      s.admission_number, s.guardian_name || '', s.guardian_phone || '',
      s.nationality || 'KENYAN', s.special_needs ? 'YES' : 'NO',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `NEMIS_Export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); toast.success(`Exported ${validStudents.length} students for NEMIS`);
  };

  const parseCSVImport = () => {
    if (!csvText.trim()) { toast.error('Paste CSV data first'); return; }
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
    const preview = lines.slice(1, 11).map(line => {
      const vals = line.split(',');
      const obj: Record<string,string> = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return obj;
    });
    setImportPreview(preview);
    setImportStep('preview');
  };

  const doImport = async () => {
    if (!csvText.trim()) return;
    setSyncing(true);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
      let updated = 0;
      for (const line of lines.slice(1)) {
        const vals = line.split(',');
        const row: Record<string,string> = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
        if (!row.admission_number && !row.admission_no) continue;
        const adm = row.admission_number || row.admission_no;
        const { error } = await sb.from('school_students').update({
          nemis_no: row.nemis_no || row.nemis_number || undefined,
          upi_no: row.upi_no || row.upi || undefined,
        }).eq('admission_number', adm);
        if (!error) updated++;
      }
      toast.success(`✅ Updated NEMIS data for ${updated} students`);
      setImportStep('done');
      fetchStudents();
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

  const STATUS_CONFIG = {
    valid:   { label: 'Valid',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', icon: FiCheckCircle },
    warning: { label: 'Warning',  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', icon: FiAlertCircle },
    error:   { label: 'Error',    color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', icon: FiAlertTriangle },
    pending: { label: 'Pending',  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: FiDatabase },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                <FiShield size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">NEMIS Validation Engine</h1>
                <p className="text-xs text-gray-400">National Education Management Information System · Kenya MOE</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={fetchStudents} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiRefreshCw size={14} /> Refresh
              </button>
              <button onClick={exportNEMIS} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> NEMIS Export
              </button>
              <button onClick={() => setTab('import')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                <FiUpload size={14} /> Import NEMIS Data
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-cyan-300 outline-none">
              <option value="">All Classes</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[140px] focus:ring-2 focus:ring-cyan-300 outline-none">
              <option value="all">All Status</option>
              <option value="error">🔴 Errors Only</option>
              <option value="warning">🟡 Warnings</option>
              <option value="valid">🟢 Valid</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, adm no, NEMIS no..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-cyan-300 outline-none" />
            </div>
          </div>
        </div>
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {([['dashboard','📊 Dashboard'],['validate','✅ Validate'],['import','📥 Import'],['sync','🔄 Sync']] as [Tab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab===t?'border-cyan-500 text-cyan-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Total Students', value: stats.total, color: '#6366F1' },
            { label: '✅ Valid', value: stats.valid, color: '#059669' },
            { label: '⚠️ Warnings', value: stats.warning, color: '#D97706' },
            { label: '🔴 Errors', value: stats.error, color: '#DC2626' },
            { label: 'With NEMIS No', value: stats.withNemis, color: '#0891B2' },
            { label: 'With UPI No', value: stats.withUpi, color: '#7C3AED' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              {stats.total > 0 && <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${Math.round((value/stats.total)*100)}%`, background: color }} /></div>}
            </div>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 className="text-cyan-500" /> NEMIS Compliance Rate</h3>
              <div className="flex items-center gap-5">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0891B2" strokeWidth="3"
                      strokeDasharray={`${stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-black text-gray-800">{stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0}%</span>
                    <span className="text-[9px] text-gray-400">Valid</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {(['valid','warning','error'] as ValidationStatus[]).map(s => {
                    const cnt = students.filter(st => st.status === s).length;
                    const pct = stats.total > 0 ? Math.round((cnt/stats.total)*100) : 0;
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-xs text-gray-600 w-16">{cfg.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background: cfg.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: cfg.color }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiAlertCircle className="text-amber-500" /> Top Validation Issues</h3>
              <div className="space-y-2">
                {REQUIRED_FIELDS.map(({ field, label, severity }) => {
                  const missing = students.filter(s => !s[field] || String(s[field]).trim() === '').length;
                  return missing > 0 ? (
                    <div key={field} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: severity === 'error' ? '#DC2626' : '#D97706' }} />
                        <span className="text-xs text-gray-700">{label} missing</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${severity==='error'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}`}>{missing} students</span>
                    </div>
                  ) : null;
                })}
                {REQUIRED_FIELDS.every(({ field }) => students.every(s => s[field])) && (
                  <div className="flex items-center gap-2 text-green-600 py-4 justify-center">
                    <FiCheckCircle size={18} />
                    <span className="text-sm font-bold">All fields complete! 🎉</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VALIDATE TAB */}
        {tab === 'validate' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">{filtered.length} students · {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter as ValidationStatus].label : 'All'}</h3>
              <span className="text-xs text-gray-400">Click a row to see issues</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Status','Adm No','Student Name','Class','NEMIS No','UPI No','Issues','Guardian Phone'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No students match filters</td></tr>
                  ) : filtered.map((s, idx) => {
                    const cfg = STATUS_CONFIG[s.status];
                    const Icon = cfg.icon;
                    return (
                      <tr key={s.id} className={`border-b border-gray-100 hover:bg-cyan-50/30 transition ${idx%2===0?'bg-white':'bg-gray-50/20'}`}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold border w-fit"
                            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            <Icon size={10} />{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{s.admission_number}</td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                          {s.other_name && <p className="text-[10px] text-gray-400">{s.other_name}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.form_name || '—'}</td>
                        <td className="px-4 py-2.5">
                          {s.nemis_no ? <span className="text-xs font-mono text-green-600">{s.nemis_no}</span>
                            : <span className="text-xs text-red-400 italic">Missing</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {s.upi_no ? <span className="text-xs font-mono text-green-600">{s.upi_no}</span>
                            : <span className="text-xs text-amber-400 italic">Missing</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {s.issues.length > 0 ? (
                            <div className="space-y-0.5">
                              {s.issues.slice(0,2).map((iss,i) => (
                                <p key={i} className="text-[10px]" style={{ color: iss.severity==='error'?'#DC2626':'#D97706' }}>• {iss.message}</p>
                              ))}
                              {s.issues.length > 2 && <p className="text-[10px] text-gray-400">+{s.issues.length-2} more</p>}
                            </div>
                          ) : <span className="text-xs text-green-500">✓ All clear</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.guardian_phone || <span className="text-amber-400 italic">Missing</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IMPORT TAB */}
        {tab === 'import' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-black text-gray-800 text-base mb-2 flex items-center gap-2"><FiUpload className="text-cyan-500" /> Import NEMIS Numbers</h3>
              <p className="text-sm text-gray-500 mb-5">Paste CSV data with columns: <code className="bg-gray-100 px-1 rounded text-xs">admission_number, nemis_no, upi_no</code></p>
              {importStep === 'upload' && (
                <>
                  <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={10}
                    placeholder={"admission_number,nemis_no,upi_no\n2024001,12345678,UPI001\n2024002,23456789,UPI002"}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-cyan-300 outline-none resize-none mb-4" />
                  <button onClick={parseCSVImport} className="w-full py-3 font-bold text-white rounded-xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                    <FiEye size={16} /> Preview Import
                  </button>
                </>
              )}
              {importStep === 'preview' && (
                <>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-4">
                    <div className="px-4 py-2 border-b bg-amber-50 flex items-center gap-2">
                      <FiAlertCircle size={14} className="text-amber-500" />
                      <p className="text-xs text-amber-700 font-bold">Preview (first 10 rows shown)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b">{Object.keys(importPreview[0] || {}).map(k => <th key={k} className="text-left py-2 px-3 font-bold text-gray-500 uppercase">{k}</th>)}</tr></thead>
                        <tbody>{importPreview.map((row, i) => <tr key={i} className="border-b">{Object.values(row).map((v,j) => <td key={j} className="py-1.5 px-3 text-gray-700">{String(v)}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setImportStep('upload')} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">← Back</button>
                    <button onClick={doImport} disabled={syncing} className="flex-1 py-2.5 font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                      style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                      {syncing ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                      {syncing ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </>
              )}
              {importStep === 'done' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><FiCheckCircle size={28} className="text-green-500" /></div>
                  <h3 className="font-black text-gray-800 mb-2">Import Complete!</h3>
                  <p className="text-sm text-gray-500 mb-5">NEMIS numbers have been updated in your database</p>
                  <button onClick={() => { setImportStep('upload'); setCsvText(''); setImportPreview([]); fetchStudents(); setTab('validate'); }}
                    className="px-6 py-2.5 font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                    View Validation Results →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SYNC TAB */}
        {tab === 'sync' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <h3 className="font-black text-gray-800 text-base flex items-center gap-2"><FiZap className="text-cyan-500" /> NEMIS Sync Status</h3>
              {[
                { label: 'Students Ready for NEMIS', value: stats.valid, total: stats.total, color: '#059669' },
                { label: 'Students with Errors (blocked)', value: stats.error, total: stats.total, color: '#DC2626' },
                { label: 'NEMIS Numbers Captured', value: stats.withNemis, total: stats.total, color: '#0891B2' },
                { label: 'UPI Numbers Captured', value: stats.withUpi, total: stats.total, color: '#7C3AED' },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">{label}</span>
                    <span className="text-xs font-black" style={{ color }}>{value}/{total}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${total>0?Math.round((value/total)*100):0}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="border-t pt-4">
                <button onClick={exportNEMIS} className="w-full py-3 font-bold text-white rounded-xl flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0891B2,#6366F1)' }}>
                  <FiSend size={16} /> Generate NEMIS Submission File
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">Exports all valid students in NEMIS CSV format</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

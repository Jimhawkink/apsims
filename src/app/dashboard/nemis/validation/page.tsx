'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw, FiDownload, FiSearch, FiUpload, FiInfo, FiUser, FiFilter } from 'react-icons/fi';

// NEMIS validation rules
const NEMIS_RULES = [
  { id: 'birth_cert', label: 'Birth Certificate No.', field: 'birth_cert_no', required: true, pattern: /^\d{6,12}$/, msg: 'Birth cert must be 6–12 digits' },
  { id: 'upi', label: 'UPI Number', field: 'upi_number', required: false, pattern: /^[A-Z0-9]{8,12}$/, msg: 'UPI must be 8–12 alphanumeric characters' },
  { id: 'gender', label: 'Gender', field: 'gender', required: true, allowed: ['Male','Female'], msg: 'Gender must be Male or Female' },
  { id: 'dob', label: 'Date of Birth', field: 'date_of_birth', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, msg: 'Date of birth required (YYYY-MM-DD)' },
  { id: 'name', label: 'Full Name', field: null, required: true, msg: 'First and last name required' },
  { id: 'admission', label: 'Admission Number', field: 'admission_no', required: true, msg: 'Admission number required' },
  { id: 'nationality', label: 'Nationality', field: 'nationality', required: false, msg: 'Nationality should be specified' },
  { id: 'guardian_phone', label: "Guardian Phone", field: 'guardian_phone', required: false, pattern: /^(07|01)\d{8}$/, msg: 'Phone must be valid Kenyan number (07xx or 01xx)' },
];

type ValidationStatus = 'valid' | 'warning' | 'error' | 'unchecked';

interface StudentValidation {
  student: any;
  errors: string[];
  warnings: string[];
  status: ValidationStatus;
}

const STATUS_META: Record<ValidationStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  valid:     { label: 'Valid',     color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', icon: FiCheckCircle },
  warning:   { label: 'Warning',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: FiAlertTriangle },
  error:     { label: 'Error',    color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: FiXCircle },
  unchecked: { label: 'Not Checked', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: FiInfo },
};

function validateStudent(student: any): StudentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const rule of NEMIS_RULES) {
    const val = rule.field ? student[rule.field] : (student.first_name && student.last_name);
    if (rule.required && !val) { errors.push(rule.msg); continue; }
    if (!val) { if (!rule.required) warnings.push(`${rule.label}: not provided`); continue; }
    if (rule.pattern && !rule.pattern.test(String(val))) errors.push(rule.msg);
    if (rule.allowed && !rule.allowed.includes(val)) errors.push(rule.msg);
  }
  // Age validation
  if (student.date_of_birth) {
    const age = Math.floor((Date.now() - new Date(student.date_of_birth).getTime()) / 31557600000);
    if (age < 4 || age > 25) errors.push(`Age ${age} seems invalid for a school student`);
  }
  const status: ValidationStatus = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';
  return { student, errors, warnings, status };
}

export default function NEMISValidationPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<StudentValidation[]>([]);
  const [filterForm, setFilterForm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'validate'|'export'|'sync'>('validate');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sR, fR, stR] = await Promise.all([
      supabase.from('school_students').select('*').order('last_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
    ]);
    setStudents(sR.data || []); setForms(fR.data || []); setStreams(stR.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runValidation = useCallback(() => {
    setValidating(true);
    const scope = filterForm ? students.filter(s => String(s.form_id) === filterForm) : students;
    setTimeout(() => {
      const res = scope.map(validateStudent);
      setResults(res);
      const errors = res.filter(r => r.status === 'error').length;
      const valid = res.filter(r => r.status === 'valid').length;
      toast.success(`Validated ${res.length} learners — ${valid} valid, ${errors} with errors`);
      setValidating(false);
    }, 500);
  }, [students, filterForm]);

  const filtered = useMemo(() => results.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const name = `${r.student.first_name} ${r.student.last_name}`.toLowerCase();
      if (!name.includes(q) && !(r.student.admission_no || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [results, filterStatus, searchQ]);

  const stats = useMemo(() => ({
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
    completionRate: results.length ? Math.round((results.filter(r => r.status !== 'error').length / results.length) * 100) : 0,
  }), [results]);

  const exportNEMIS = () => {
    const validStudents = results.filter(r => r.status !== 'error').map(r => r.student);
    const rows = [
      ['Admission No', 'First Name', 'Last Name', 'Gender', 'Date of Birth', 'Birth Cert No', 'UPI', 'Nationality', 'Form', 'Stream', 'Guardian Name', 'Guardian Phone', 'Guardian Email'],
      ...validStudents.map(s => [s.admission_no||'', s.first_name||'', s.last_name||'', s.gender||'', s.date_of_birth||'', s.birth_cert_no||'', s.upi_number||'', s.nationality||'Kenya', forms.find(f=>f.id===s.form_id)?.form_name||'', streams.find(st=>st.id===s.stream_id)?.stream_name||'', s.guardian_name||'', s.guardian_phone||'', s.guardian_email||''])
    ];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `nemis-export-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${validStudents.length} valid learners`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiShield size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm">Loading NEMIS Validation Engine…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiShield size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-extrabold text-gray-900">NEMIS Validation Engine</h1><p className="text-sm text-gray-500">Bulk Learner Validation · Error Flagging · NEMIS Export · Sync Status</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
          {results.length > 0 && <button onClick={exportNEMIS} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50"><FiDownload size={14} /> Export NEMIS CSV</button>}
          <button onClick={runValidation} disabled={validating} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
            {validating ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Validating…</> : <><FiShield size={14} /> Run Validation</>}
          </button>
        </div>
      </div>

      {/* Scope filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Form</label>
          <select value={filterForm} onChange={e=>setFilterForm(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50">
            <option value="">All Forms ({students.length} learners)</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select></div>
        <div className="flex-1 min-w-[180px]"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search Learner</label>
          <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Name or admission no…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50" /></div></div>
        {results.length > 0 && <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Filter Status</label>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50">
            <option value="all">All</option>
            {Object.entries(STATUS_META).filter(([k])=>k!=='unchecked').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select></div>}
      </div>

      {/* KPI strip */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label:'Total Validated',   value:stats.total,            color:'#6366f1', emoji:'📋' },
            { label:'Valid',             value:stats.valid,            color:'#059669', emoji:'✅' },
            { label:'Warnings',          value:stats.warnings,         color:'#d97706', emoji:'⚠️' },
            { label:'Errors',            value:stats.errors,           color:'#dc2626', emoji:'❌' },
            { label:'Completion Rate',   value:`${stats.completionRate}%`, color:stats.completionRate>=90?'#059669':'#d97706', emoji:'📊' },
          ].map(({ label, value, color, emoji }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl mb-1">{emoji}</p>
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Validation rules legend */}
      {results.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiShield size={14} className="text-cyan-500" /> NEMIS Validation Rules ({NEMIS_RULES.length} checks)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NEMIS_RULES.map(rule => (
              <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-xl border ${rule.required ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${rule.required ? 'bg-red-400' : 'bg-amber-400'}`} />
                <div>
                  <p className="text-xs font-bold text-gray-800">{rule.label}</p>
                  <p className="text-[10px] text-gray-500">{rule.msg} · <span className={rule.required ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>{rule.required ? 'Required' : 'Optional'}</span></p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center">
            <button onClick={runValidation} disabled={validating} className="px-8 py-3 text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              🔍 Run NEMIS Validation on {students.length} Learners
            </button>
          </div>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{filtered.length}</span> learners</p>
            {stats.errors > 0 && <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">{stats.errors} errors need fixing before NEMIS upload</span>}
          </div>
          {filtered.map(result => {
            const { student, errors, warnings, status } = result;
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const isOpen = expanded.has(student.id);
            const form = forms.find(f => f.id === student.form_id);
            return (
              <div key={student.id} className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden" style={{ borderColor: meta.border }}>
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/30" onClick={() => setExpanded(p => { const n = new Set(p); n.has(student.id) ? n.delete(student.id) : n.add(student.id); return n; })}>
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: meta.bg }}>
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800">{student.first_name} {student.last_name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>{meta.label}</span>
                      {form && <span className="text-[10px] text-gray-400">{form.form_name}</span>}
                      {student.admission_no && <span className="text-[10px] text-gray-400">· {student.admission_no}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {errors.length > 0 && <span className="text-[10px] font-bold text-red-600">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
                      {warnings.length > 0 && <span className="text-[10px] font-bold text-amber-600">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
                      {status === 'valid' && <span className="text-[10px] text-green-600 font-bold">All checks passed ✓</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-4 bg-gray-50/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Student Data</p>
                        <div className="space-y-1">
                          {[['Birth Cert', student.birth_cert_no], ['UPI', student.upi_number], ['Gender', student.gender], ['DOB', student.date_of_birth], ['Nationality', student.nationality], ['Phone', student.guardian_phone]].map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2"><p className="text-[10px] text-gray-500 w-20 flex-shrink-0">{k}:</p><p className={`text-[10px] font-bold ${v ? 'text-gray-800' : 'text-red-400'}`}>{v || '⚠ Missing'}</p></div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {errors.length > 0 && <div><p className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider mb-1">❌ Errors (fix before upload)</p><div className="space-y-1">{errors.map((e, i) => <p key={i} className="text-[10px] text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-100">• {e}</p>)}</div></div>}
                        {warnings.length > 0 && <div><p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider mb-1">⚠ Warnings (recommended)</p><div className="space-y-1">{warnings.map((w, i) => <p key={i} className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">• {w}</p>)}</div></div>}
                        {status === 'valid' && <div className="p-3 rounded-xl bg-green-50 border border-green-100"><p className="text-[10px] font-bold text-green-700">✓ This learner's data is NEMIS-ready for upload</p></div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

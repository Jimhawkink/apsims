'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiSearch, FiCheckCircle, FiAlertCircle, FiXCircle, FiFilter, FiFileText, FiZap } from 'react-icons/fi';

// KNEC portal CBA upload column order (exact match)
const KNEC_COLUMNS = [
  'Admission Number', 'Learner Name', 'Form', 'Stream', 'Gender', 'Date of Birth',
  'Birth Certificate No', 'Subject Code', 'Subject Name',
  'Task 1 Mark', 'Task 1 Max', 'Task 2 Mark', 'Task 2 Max', 'Task 3 Mark', 'Task 3 Max',
  'Task 4 Mark', 'Task 4 Max', 'Task 5 Mark', 'Task 5 Max',
  'Total CBA Mark', 'CBA Max Mark', 'CBA %', 'CBA Grade', 'Teacher Name', 'Teacher TSC',
  'Term', 'Year', 'Assessment Type',
];

type ExportStatus = 'idle' | 'generating' | 'ready' | 'error';

function StatCard({ label, value, sub, color, emoji }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function KNECCBAExportPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [sbaData, setSbaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [preview, setPreview] = useState<any[]>([]);

  // Filters
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());
  const [assessType, setAssessType] = useState('School-Based Assessment');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fR, stR, sR, tR, tcR, stuR, sbaR] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_terms').select('*').order('year', { ascending: false }),
      supabase.from('school_teachers').select('*').order('first_name'),
      supabase.from('school_students').select('*').order('last_name'),
      supabase.from('sba_scores').select('*'),
    ]);
    setForms(fR.data||[]); setStreams(stR.data||[]); setSubjects(sR.data||[]);
    setTerms(tR.data||[]); setTeachers(tcR.data||[]); setStudents(stuR.data||[]);
    if (!sbaR.error) setSbaData(sbaR.data||[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selForm && String(s.form_id) !== selForm) return false;
      if (selStream && String(s.stream_id) !== selStream) return false;
      return true;
    });
  }, [students, selForm, selStream]);

  const buildExportRows = useCallback(() => {
    const rows: any[][] = [];
    const term = terms.find(t => String(t.id) === selTerm);
    const subject = subjects.find(s => String(s.id) === selSubject);

    filteredStudents.forEach(stu => {
      const form = forms.find(f => f.id === stu.form_id);
      const stream = streams.find(s => s.id === stu.stream_id);
      // Get SBA tasks for this student+subject
      const stuScores = sbaData.filter(s => s.student_id === stu.id && (!selSubject || String(s.subject_id) === selSubject));
      const tasks = Array.from({ length: 5 }, (_, i) => {
        const task = stuScores.find(s => s.task_number === i + 1);
        return { mark: task?.score ?? '', max: task?.max_score ?? 20 };
      });
      const totalMark = tasks.reduce((sum, t) => sum + (Number(t.mark) || 0), 0);
      const totalMax = tasks.reduce((sum, t) => sum + (Number(t.max) || 0), 0);
      const pct = totalMax > 0 ? Math.round((totalMark / totalMax) * 100) : 0;
      const grade = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';

      // Teacher for this subject
      const teacherLink = stuScores[0]?.teacher_id;
      const teacher = teachers.find(t => t.id === teacherLink);

      rows.push([
        stu.admission_no || '',
        `${stu.first_name} ${stu.last_name}`,
        form?.form_name || '',
        stream?.stream_name || '',
        stu.gender || '',
        stu.date_of_birth || '',
        stu.birth_cert_no || '',
        subject?.subject_code || selSubject || '',
        subject?.subject_name || '',
        tasks[0].mark, tasks[0].max,
        tasks[1].mark, tasks[1].max,
        tasks[2].mark, tasks[2].max,
        tasks[3].mark, tasks[3].max,
        tasks[4].mark, tasks[4].max,
        totalMark, totalMax,
        pct, grade,
        teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        teacher?.tsc_number || '',
        term?.term_name || selTerm,
        selYear,
        assessType,
      ]);
    });
    return rows;
  }, [filteredStudents, forms, streams, subjects, terms, teachers, sbaData, selSubject, selTerm, selYear, assessType]);

  const handleGenerate = () => {
    if (!selForm) { toast.error('Select a form first'); return; }
    setExportStatus('generating');
    setTimeout(() => {
      const rows = buildExportRows();
      setPreview(rows.slice(0, 10));
      setExportStatus(rows.length > 0 ? 'ready' : 'error');
      toast.success(`${rows.length} learner records prepared for KNEC upload`);
    }, 600);
  };

  const handleDownload = () => {
    const rows = buildExportRows();
    const csvContent = [KNEC_COLUMNS, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const form = forms.find(f => String(f.id) === selForm);
    const subject = subjects.find(s => String(s.id) === selSubject);
    a.href = url;
    a.download = `KNEC-CBA-${form?.form_name||'All'}-${subject?.subject_code||'All'}-${selYear}-T${selTerm}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded KNEC CBA export (${rows.length} learners)`);
  };

  const stats = useMemo(() => {
    const rows = exportStatus === 'ready' ? buildExportRows() : [];
    const filled = rows.filter(r => r[9] !== '').length; // has Task 1 mark
    const missing = rows.filter(r => r[9] === '').length;
    return { total: filteredStudents.length, prepared: rows.length, filled, missing };
  }, [exportStatus, buildExportRows, filteredStudents]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)' }}><FiFileText size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth:3,borderStyle:'solid' }} />
        <p className="text-gray-400 text-sm">Loading KNEC CBA Export…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)' }}><FiFileText size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">KNEC CBA Official Export</h1>
            <p className="text-sm text-gray-500">Bulk export in exact KNEC portal upload format · {KNEC_COLUMNS.length} columns · CSV</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
          {exportStatus === 'ready' && (
            <button onClick={handleDownload} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95" style={{ background:'linear-gradient(135deg,#16a34a,#15803d)' }}>
              <FiDownload size={14} /> Download KNEC CSV
            </button>
          )}
        </div>
      </div>

      {/* Official format info */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><FiCheckCircle size={18} /></div>
          <div>
            <h3 className="font-bold text-base mb-1">KNEC-Compliant Export Format</h3>
            <p className="text-xs text-red-100 leading-relaxed">This export matches the exact column structure required by the KNEC portal for CBA (Competency-Based Assessment) data upload. All {KNEC_COLUMNS.length} columns are included in the correct order.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Admission No', 'Learner Name', 'Form/Stream', 'Task 1–5 Marks', 'CBA Total', 'Grade (EE/ME/AE/BE)', 'Teacher TSC', 'Term & Year'].map(col => (
                <span key={col} className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-lg">{col}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Learners" value={filteredStudents.length} sub="In selection" color="#dc2626" emoji="👨‍🎓" />
        <StatCard label="Records Prepared" value={exportStatus === 'ready' ? stats.prepared : '—'} sub="Ready for KNEC" color="#059669" emoji="📋" />
        <StatCard label="With SBA Data" value={exportStatus === 'ready' ? stats.filled : '—'} sub="Marks captured" color="#7c3aed" emoji="✅" />
        <StatCard label="Missing Marks" value={exportStatus === 'ready' ? stats.missing : '—'} sub="No SBA data yet" color="#d97706" emoji="⚠️" />
      </div>

      {/* Config Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiFilter size={14} className="text-red-500" /> Export Configuration</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {[
            ['Form *', selForm, setSelForm, forms, 'form_name'],
            ['Stream (optional)', selStream, setSelStream, streams, 'stream_name'],
            ['Subject (optional)', selSubject, setSelSubject, subjects, 'subject_name'],
            ['Term *', selTerm, setSelTerm, terms, 'term_name'],
          ].map(([lbl, val, setter, opts, nameKey]: any) => (
            <div key={lbl}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{lbl}</label>
              <select value={val} onChange={e => { setter(e.target.value); setExportStatus('idle'); setPreview([]); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-gray-50">
                <option value="">All / Any</option>
                {opts.map((o: any) => <option key={o.id} value={o.id}>{o[nameKey]}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year *</label>
            <select value={selYear} onChange={e => setSelYear(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
              {[2026,2025,2024,2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assessment Type</label>
            <select value={assessType} onChange={e => setAssessType(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
              {['School-Based Assessment','County Assessment','National Assessment','End-of-Year Assessment'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-700">Export scope: <span className="text-red-600">{filteredStudents.length} learners</span></p>
            <p className="text-xs text-gray-500 mt-0.5">{KNEC_COLUMNS.length} columns · KNEC portal format · UTF-8 CSV</p>
          </div>
          <button onClick={handleGenerate} disabled={exportStatus === 'generating'} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-60" style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
            {exportStatus === 'generating' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</> : <><FiZap size={14} /> Generate Export</>}
          </button>
        </div>
      </div>

      {/* Column Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">KNEC Column Structure ({KNEC_COLUMNS.length} columns)</h3>
        <div className="flex flex-wrap gap-1.5">
          {KNEC_COLUMNS.map((col, i) => (
            <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-lg border" style={{ background:'#fef2f2', color:'#dc2626', borderColor:'#fecaca' }}>
              {i+1}. {col}
            </span>
          ))}
        </div>
      </div>

      {/* Data Preview */}
      {exportStatus === 'ready' && preview.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Preview (first {preview.length} rows)</h3>
            <div className="flex items-center gap-2">
              <FiCheckCircle size={14} className="text-green-500" />
              <span className="text-xs font-bold text-green-600">Ready for KNEC upload</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{KNEC_COLUMNS.slice(0,8).map(c=><th key={c} className="px-3 py-2 text-left font-bold text-gray-500 uppercase whitespace-nowrap">{c}</th>)}<th className="px-3 py-2 text-left font-bold text-gray-500">…+{KNEC_COLUMNS.length-8} more</th></tr></thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    {row.slice(0,8).map((cell: any, j: number) => <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(cell||'—')}</td>)}
                    <td className="px-3 py-2 text-gray-300">…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-500">Showing {preview.length} of {stats.prepared} rows</p>
            <button onClick={handleDownload} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md active:scale-95 flex items-center gap-2" style={{ background:'linear-gradient(135deg,#16a34a,#15803d)' }}>
              <FiDownload size={13} /> Download Full CSV ({stats.prepared} rows)
            </button>
          </div>
        </div>
      )}

      {exportStatus === 'error' && (
        <div className="flex items-center gap-4 p-5 rounded-2xl border-2 border-red-200 bg-red-50">
          <FiXCircle size={20} className="text-red-500 flex-shrink-0" />
          <div><p className="font-bold text-red-800 text-sm">No records matched your selection</p><p className="text-xs text-red-600 mt-0.5">Try changing the form/stream/subject filters</p></div>
        </div>
      )}
    </div>
  );
}

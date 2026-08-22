'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import {
  FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo,
  FiDownload, FiGrid, FiSearch, FiRefreshCw,
  FiChevronDown, FiChevronUp, FiBook, FiUsers, FiShield,
} from 'react-icons/fi';

// ─── Conflict Types ──────────────────────────────────────────────────────────
type ConflictType =
  | 'MISSING_PATHWAY' | 'NO_SUBJECTS' | 'INSUFFICIENT_SUBJECTS'
  | 'TOO_MANY_SUBJECTS' | 'MISSING_COMPULSORY' | 'PATHWAY_MISMATCH';

interface Conflict {
  type: ConflictType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  detail: string;
}

// ─── KICD CBC Compulsory Subjects (Core 3) ───────────────────────────────────
const CORE_REQUIRED = ['english', 'kiswahili', 'mathematics'];

// ─── Pathway Subject Alignment Keywords ─────────────────────────────────────
const PATHWAY_KEYWORDS: Record<string, string[]> = {
  stem:       ['physics', 'chemistry', 'biology', 'computer', 'geography', 'technical', 'agriculture', 'science', 'math'],
  social:     ['history', 'geography', 'economics', 'business', 'sociology', 'social', 'civics'],
  arts:       ['art', 'music', 'drama', 'creative', 'indigenous', 'language', 'literature', 'french', 'german'],
  tvet:       ['technical', 'agriculture', 'home science', 'building', 'electrical', 'mechanical', 'woodwork'],
  sciences:   ['physics', 'chemistry', 'biology', 'computer', 'math'],
  humanities: ['history', 'geography', 'economics', 'business', 'literature', 'language', 'religious'],
};

// ─── Conflict Detection Engine ───────────────────────────────────────────────
function detectConflicts(student: any, allSS: any[], schoolSubs: any[], pathway: any | null): Conflict[] {
  const conflicts: Conflict[] = [];
  const enrolled = allSS.filter(ss => ss.student_id === student.id);
  const subDetails = enrolled.map(ss => schoolSubs.find(s => s.id === ss.subject_id)).filter(Boolean);
  const subNames = subDetails.map((s: any) => (s.subject_name || '').toLowerCase());

  if (!pathway) {
    conflicts.push({ type: 'MISSING_PATHWAY', severity: 'critical',
      message: 'No pathway assigned',
      detail: 'Student must be assigned to a CBC pathway (STEM, Social Sciences, Arts & Sports, or TVET) before KNEC registration.' });
  }
  if (enrolled.length === 0) {
    conflicts.push({ type: 'NO_SUBJECTS', severity: 'critical',
      message: 'Zero subjects enrolled',
      detail: 'Student has no subject enrollments. CBC Senior requires 7 subjects: 4 compulsory + 3 elective minimum.' });
    return conflicts;
  }
  if (enrolled.length < 7) {
    conflicts.push({ type: 'INSUFFICIENT_SUBJECTS', severity: 'critical',
      message: `Only ${enrolled.length} of 7 required subjects enrolled`,
      detail: `Missing ${7 - enrolled.length} subject(s). KICD requires 4 compulsory + 3 pathway electives minimum.` });
  } else if (enrolled.length > 9) {
    conflicts.push({ type: 'TOO_MANY_SUBJECTS', severity: 'warning',
      message: `${enrolled.length} subjects exceeds maximum of 9`,
      detail: `Remove ${enrolled.length - 9} subject(s) to comply with KNEC CBC Senior guidelines.` });
  }
  const missing = CORE_REQUIRED.filter(kw => !subNames.some(sn => sn.includes(kw)));
  if (missing.length > 0) {
    conflicts.push({ type: 'MISSING_COMPULSORY', severity: 'critical',
      message: `Missing compulsory: ${missing.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}`,
      detail: 'All CBC Senior students must study English, Kiswahili, and Mathematics regardless of pathway.' });
  }
  if (pathway) {
    const pName = (pathway.pathway_name || '').toLowerCase();
    const matchKey = Object.keys(PATHWAY_KEYWORDS).find(k => pName.includes(k));
    if (matchKey) {
      const kws = PATHWAY_KEYWORDS[matchKey];
      if (!subNames.some(sn => kws.some(kw => sn.includes(kw)))) {
        conflicts.push({ type: 'PATHWAY_MISMATCH', severity: 'warning',
          message: `No ${pathway.pathway_name} electives selected`,
          detail: `Student is in ${pathway.pathway_name} pathway but elective subjects do not align with KICD requirements.` });
      }
    }
  }
  return conflicts;
}

// ─── Severity config ─────────────────────────────────────────────────────────
const SEV = {
  critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: FiXCircle },
  warning:  { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', icon: FiAlertTriangle },
  info:     { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', icon: FiInfo },
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ value, label, sub, icon: Icon, gradient }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -left-2 w-28 h-28 rounded-full opacity-5 bg-white" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

// ─── Conflict Badge ──────────────────────────────────────────────────────────
function ConflictBadge({ conflict }: { conflict: Conflict }) {
  const cfg = SEV[conflict.severity];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={13} style={{ color: cfg.color }} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold leading-tight" style={{ color: cfg.color }}>{conflict.message}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{conflict.detail}</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SubjectCombinationsPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filterPathway, setFilterPathway] = useState('');
  const [filterStream, setFilterStream] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'conflicts' | 'clean'>('all');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, pathwaysRes, ssRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('cbc_student_subjects').select('*'),
    ]);
    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');
    const cbcFormIds = cbcForms.map(f => f.id);
    setStreams(streamsRes.data || []);
    setSchoolSubjects(subjectsRes.data || []);
    setPathways(pathwaysRes.data || []);
    if (!ssRes.error) setStudentSubjects(ssRes.data || []);
    if (cbcFormIds.length > 0) {
      const { data } = await supabase.from('school_students').select('*')
        .in('form_id', cbcFormIds).eq('status', 'Active').order('first_name');
      setStudents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getPathway = (sid: number) =>
    pathways.find(p => studentSubjects.some(ss => ss.student_id === sid && ss.pathway_id === p.id)
      || students.find(s => s.id === sid)?.pathway_id === p.id) || null;
  const getStream = (id: number) => streams.find(s => s.id === id)?.stream_name || '—';

  const allData = useMemo(() => students.map(student => {
    const pathway = getPathway(student.id);
    const conflicts = detectConflicts(student, studentSubjects, schoolSubjects, pathway);
    const subs = studentSubjects.filter(ss => ss.student_id === student.id)
      .map(ss => schoolSubjects.find(s => s.id === ss.subject_id)).filter(Boolean);
    return { student, pathway, conflicts, subs };
  }), [students, studentSubjects, schoolSubjects, pathways]);

  const total = allData.length;
  const withConflicts = allData.filter(d => d.conflicts.length > 0).length;
  const clean = total - withConflicts;
  const criticalCount = allData.reduce((a, d) => a + d.conflicts.filter(c => c.severity === 'critical').length, 0);
  const noPathway = allData.filter(d => !d.pathway).length;

  const filtered = useMemo(() => allData.filter(d => {
    const q = searchQ.toLowerCase();
    const name = `${d.student.first_name} ${d.student.last_name}`.toLowerCase();
    const adm = (d.student.admission_no || d.student.admission_number || '').toLowerCase();
    if (q && !name.includes(q) && !adm.includes(q)) return false;
    if (filterPathway && String(d.pathway?.id) !== filterPathway) return false;
    if (filterStream && String(d.student.stream_id) !== filterStream) return false;
    if (filterStatus === 'conflicts' && d.conflicts.length === 0) return false;
    if (filterStatus === 'clean' && d.conflicts.length > 0) return false;
    return true;
  }), [allData, searchQ, filterPathway, filterStream, filterStatus]);

  const toggleExpand = (id: number) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const exportCSV = () => {
    const rows = [
      ['Adm No', 'Student Name', 'Stream', 'Pathway', 'Subject Count', 'Subjects', 'Conflict Count', 'Conflicts'],
      ...allData.map(d => [
        d.student.admission_no || d.student.admission_number || '',
        `${d.student.first_name} ${d.student.last_name}`,
        getStream(d.student.stream_id),
        d.pathway?.pathway_name || 'NOT ASSIGNED',
        d.subs.length,
        (d.subs as any[]).map((s: any) => s.subject_name).join('; '),
        d.conflicts.length,
        d.conflicts.map(c => `[${c.severity.toUpperCase()}] ${c.message}`).join('; '),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cbc-conflict-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          <FiShield size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm font-medium">Analysing subject combinations…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <FiShield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Subject Combination Conflict Checker</h1>
            <p className="text-sm text-gray-500 mt-0.5">CBC Senior School (Gr 10–12) · KICD / KNEC Compliance Validation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm" title="Refresh">
            <FiRefreshCw size={15} />
          </button>
          <button onClick={exportCSV} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <FiDownload size={14} /> Export Conflict Report
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard value={total}         label="Total Students"     sub="Grade 10–12 active"                                              icon={FiUsers}        gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
        <KPICard value={clean}         label="Valid Combinations"  sub={`${total > 0 ? Math.round(clean / total * 100) : 0}% compliant`} icon={FiCheckCircle}  gradient="linear-gradient(135deg,#10b981,#059669)" />
        <KPICard value={withConflicts} label="With Conflicts"      sub={`${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''}`} icon={FiAlertTriangle} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
        <KPICard value={noPathway}     label="No Pathway Assigned" sub="Requires immediate action"                                        icon={FiXCircle}      gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
      </div>

      {/* ALERT BANNER */}
      {withConflicts > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
            <FiAlertTriangle size={18} style={{ color: '#D97706' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">
              {withConflicts} student{withConflicts > 1 ? 's have' : ' has'} subject combination conflicts — resolve before KNEC registration
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Click any student row to expand full conflict details and recommended actions.</p>
          </div>
          <button onClick={() => setFilterStatus('conflicts')} className="px-3 py-1.5 text-xs font-bold rounded-lg flex-shrink-0 transition-all" style={{ background: '#FEF3C7', color: '#92400E' }}>
            Show Only
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search Student</label>
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Name or admission no…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-gray-50/50 transition-all" />
            </div>
          </div>
          <div className="min-w-[155px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Pathway</label>
            <select value={filterPathway} onChange={e => setFilterPathway(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
              <option value="">All Pathways</option>
              {pathways.map(p => <option key={p.id} value={p.id}>{p.pathway_name}</option>)}
            </select>
          </div>
          <div className="min-w-[145px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Stream</label>
            <select value={filterStream} onChange={e => setFilterStream(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50">
              <option value="">All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div className="min-w-[190px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status Filter</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(['all', 'conflicts', 'clean'] as const).map((v) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`flex-1 py-2 text-[11px] font-bold transition-all capitalize ${filterStatus === v ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                  {v === 'conflicts' ? '⚠ Conflicts' : v === 'clean' ? '✓ Clean' : 'All'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 pb-2">
            <span className="font-bold text-gray-800">{filtered.length}</span> / <span className="font-bold text-gray-800">{total}</span>
          </p>
        </div>
      </div>

      {/* CONFLICT LEGEND */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Missing Pathway',   color: '#DC2626', bg: '#FEF2F2', desc: 'No CBC pathway assigned'        },
          { label: 'No Subjects',        color: '#DC2626', bg: '#FEF2F2', desc: 'Zero subjects enrolled'         },
          { label: 'Insufficient',       color: '#DC2626', bg: '#FEF2F2', desc: 'Below 7 required subjects'      },
          { label: 'Too Many',           color: '#D97706', bg: '#FFFBEB', desc: 'Exceeds KNEC max of 9'          },
          { label: 'Missing Compulsory', color: '#DC2626', bg: '#FEF2F2', desc: 'Core subjects not enrolled'     },
          { label: 'Pathway Mismatch',   color: '#D97706', bg: '#FFFBEB', desc: "Electives don't match pathway"  },
        ].map(item => (
          <div key={item.label} className="rounded-xl border p-3 shadow-sm" style={{ background: item.bg, borderColor: item.color + '33' }}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <FiGrid size={15} className="text-indigo-500" /> Student Subject Matrix
          </h2>
          <span className="text-[11px] text-gray-400">Click row to expand conflict details</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stream</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pathway</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subjects</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Issues</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <FiShield size={28} className="text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-400 text-sm">No students match your filters</p>
                    <p className="text-xs text-gray-300 mt-1">Adjust filters or enroll Grade 10 CBC students first</p>
                  </td>
                </tr>
              ) : filtered.flatMap(({ student, pathway, conflicts, subs }, idx) => {
                const isOpen = expanded.has(student.id);
                const hasCritical = conflicts.some(c => c.severity === 'critical');
                const isClean = conflicts.length === 0;
                const statusColor = isClean ? '#10b981' : hasCritical ? '#dc2626' : '#f59e0b';
                const statusBg = isClean ? '#f0fdf4' : hasCritical ? '#fef2f2' : '#fffbeb';
                const StatusIcon = isClean ? FiCheckCircle : hasCritical ? FiXCircle : FiAlertTriangle;
                const statusLabel = isClean ? 'Valid' : hasCritical ? 'Critical' : 'Warning';
                return [
                  <tr key={`r${student.id}`} onClick={() => toggleExpand(student.id)}
                    className={`border-b border-gray-100 cursor-pointer select-none transition-colors ${isOpen ? 'bg-indigo-50/60' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-100/60'}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black shadow-sm"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{student.first_name} {student.last_name}</p>
                          <p className="text-[10px] font-mono font-bold text-blue-500">{student.admission_no || student.admission_number || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getStream(student.stream_id)}</td>
                    <td className="px-4 py-3">
                      {pathway
                        ? <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
                        : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 border border-red-100"><FiXCircle size={9} /> Not Assigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {subs.length === 0 ? <span className="text-xs text-gray-400 italic">None enrolled</span>
                          : <>{(subs as any[]).slice(0, 3).map((sub: any) => (
                              <span key={sub.id} className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{sub.subject_name}</span>
                            ))}
                            {subs.length > 3 && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500">+{subs.length - 3}</span>}
                          </>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: statusBg, color: statusColor }}>
                        <StatusIcon size={10} /> {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {conflicts.length > 0
                        ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black text-white shadow-sm" style={{ background: hasCritical ? '#dc2626' : '#f59e0b' }}>{conflicts.length}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOpen ? <FiChevronUp size={14} className="text-indigo-500 mx-auto" /> : <FiChevronDown size={14} className="text-gray-300 mx-auto" />}
                    </td>
                  </tr>,

                  isOpen && (
                    <tr key={`d${student.id}`} className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/40 to-purple-50/20">
                      <td colSpan={8} className="px-6 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <FiAlertTriangle size={11} className="text-amber-500" />
                              Conflict Analysis ({conflicts.length} issue{conflicts.length !== 1 ? 's' : ''})
                            </p>
                            {conflicts.length === 0
                              ? <div className="flex items-center gap-2.5 p-3 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                  <FiCheckCircle size={16} style={{ color: '#10b981' }} />
                                  <div>
                                    <p className="text-xs font-bold text-green-800">Subject combination is fully valid</p>
                                    <p className="text-[10px] text-green-600 mt-0.5">Meets all KICD CBC Senior requirements</p>
                                  </div>
                                </div>
                              : <div className="space-y-2">{conflicts.map((c, i) => <ConflictBadge key={i} conflict={c} />)}</div>}
                          </div>
                          <div>
                            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <FiBook size={11} className="text-indigo-500" />
                              Enrolled Subjects ({subs.length} / min 7)
                            </p>
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${Math.min((subs.length / 9) * 100, 100)}%`,
                                    background: subs.length < 7 ? '#dc2626' : subs.length > 9 ? '#f59e0b' : '#10b981',
                                  }} />
                                </div>
                                <span className="text-xs font-bold text-gray-600">{subs.length}/7–9</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {subs.length === 0
                                ? <p className="text-xs text-gray-400 italic">No subjects enrolled yet</p>
                                : (subs as any[]).map((sub: any) => (
                                    <span key={sub.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 shadow-sm">
                                      <FiBook size={10} className="text-indigo-400" /> {sub.subject_name}
                                    </span>
                                  ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean) as React.ReactNode[];
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span className="text-gray-500">{clean} valid</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /><span className="text-gray-500">{withConflicts} with issues</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span className="text-gray-500">{noPathway} no pathway</span></span>
          </div>
          <p className="text-xs text-gray-400">CBC Senior School · KICD Compliance</p>
        </div>
      </div>
    </div>
  );
}

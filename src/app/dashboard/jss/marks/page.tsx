'use client';

import { useState, useMemo, useCallback } from 'react';
import { useUltraCBCMarks, JSS_LEARNING_AREAS, scoreToLevel } from '@/hooks/useUltraCBCMarks';
import toast from 'react-hot-toast';
import {
  FiSave, FiDownload, FiRefreshCw, FiSearch, FiGrid, FiList,
  FiAlertCircle, FiCheckCircle, FiClock, FiUsers, FiAward,
  FiBarChart2, FiTrendingUp, FiTrendingDown, FiFilter,
  FiChevronRight, FiPrinter, FiInfo, FiZap, FiBook,
  FiStar, FiShield, FiActivity, FiEye,
} from 'react-icons/fi';

// ─── Competency config ────────────────────────────────────────────────────────
const COMP_CFG = {
  EE: { label: 'EE', full: 'Exceeds Expectation',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', ring: 'ring-green-400',  text: 'text-green-700' },
  ME: { label: 'ME', full: 'Meets Expectation',       color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', ring: 'ring-blue-400',   text: 'text-blue-700'  },
  AE: { label: 'AE', full: 'Approaches Expectation',  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', ring: 'ring-amber-400',  text: 'text-amber-700' },
  BE: { label: 'BE', full: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', ring: 'ring-red-400',    text: 'text-red-700'   },
} as const;
type CompKey = keyof typeof COMP_CFG;

// ─── helpers ──────────────────────────────────────────────────────────────────
function getLevel(score: string): CompKey | null {
  const n = parseInt(score, 10);
  if (isNaN(n)) return null;
  if (n >= 80) return 'EE';
  if (n >= 60) return 'ME';
  if (n >= 40) return 'AE';
  return 'BE';
}

function CompBadge({ level, size = 'sm' }: { level: CompKey | null; size?: 'xs' | 'sm' | 'md' }) {
  if (!level) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">—</span>;
  const c = COMP_CFG[level];
  const sz = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center ${sz} rounded font-bold border`} style={{ color: c.color, background: c.bg, borderColor: c.border }}>
      {c.label}
    </span>
  );
}

function DonutChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const keys: CompKey[] = ['EE', 'ME', 'AE', 'BE'];
  let offset = 25;
  const r = 40, circ = 2 * Math.PI * r;
  const segments = keys.map(k => {
    const pct = total > 0 ? (counts[k] || 0) / total : 0;
    const dash = pct * circ;
    const seg = { key: k, dash, offset, color: COMP_CFG[k].color };
    offset += dash;
    return seg;
  });
  const eeMe = total > 0 ? Math.round(((counts.EE || 0) + (counts.ME || 0)) / total * 100) : 0;
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="16" />
        {segments.map(s => (
          <circle key={s.key} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset + 25} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-gray-800">{eeMe}%</span>
        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">On-Track</span>
      </div>
    </div>
  );
}

// ─── Score input cell ─────────────────────────────────────────────────────────
function ScoreCell({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const lvl = getLevel(value);
  const c = lvl ? COMP_CFG[lvl] : null;
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="number" min="0" max="100"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="—"
        className="w-16 text-center text-sm font-bold rounded-lg border-2 py-1.5 focus:outline-none transition-all"
        style={c ? { borderColor: c.border, background: c.bg, color: c.color } : { borderColor: '#E5E7EB', background: '#F9FAFB', color: '#6B7280' }}
      />
      <CompBadge level={lvl} size="xs" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function JSSMarksPage() {
  const hook = useUltraCBCMarks();

  // Force JSS mode
  const {
    mode, setMode,
    loading, saving,
    jssForms, streams, terms,
    selJSSGrade, setSelJSSGrade,
    selStream, setSelStream,
    selTerm, setSelTerm,
    selJSSLA, setSelJSSLA,
    jssFilteredStudents: students,
    jssMarks, setJSSMark,
    saveJSSMarks, jssDirty,
    jssLearningAreas,
    analyticsCounts, completionPct,
    beStudentNames,
    searchQuery, setSearchQuery,
    fetchAll,
  } = hook as any;

  // Ensure JSS mode is set
  if (mode !== 'JSS') { setMode('JSS'); }

  const [view, setView] = useState<'grid' | 'subject'>('grid');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const las = (jssLearningAreas || JSS_LEARNING_AREAS) as typeof JSS_LEARNING_AREAS;

  // Selected LA for subject view
  const selectedLA = useMemo(() =>
    las.find((la: any) => la.code === selJSSLA) || las[0]
  , [las, selJSSLA]);

  // Completion per LA
  const laCompletion = useMemo(() => {
    const result: Record<string, number> = {};
    las.forEach((la: any) => {
      const done = students.filter((s: any) => jssMarks[String(s.id)]?.[la.code]?.level).length;
      result[la.code] = students.length > 0 ? Math.round((done / students.length) * 100) : 0;
    });
    return result;
  }, [las, students, jssMarks]);

  // Export to CSV
  const exportCSV = useCallback(() => {
    if (!students.length) { toast.error('No students to export'); return; }
    const headers = ['Adm No', 'Student Name', ...las.map((la: any) => `${la.code} Score`), ...las.map((la: any) => `${la.code} Level`)];
    const rows = students.map((s: any) => {
      const sid = String(s.id);
      return [
        s.admission_no || s.admission_number || '',
        `${s.first_name} ${s.last_name}`,
        ...las.map((la: any) => jssMarks[sid]?.[la.code]?.score || ''),
        ...las.map((la: any) => jssMarks[sid]?.[la.code]?.level || ''),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map((v: string | number) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `JSS_Marks_Grade${selJSSGrade}_Term${selTerm}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV!');
  }, [students, las, jssMarks, selJSSGrade, selTerm]);

  const totalStudents = students.length;
  const assessedCount = totalStudents - (analyticsCounts?.NA || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                <FiBook className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900 leading-tight">JSS Marks Entry</h1>
                <p className="text-xs text-gray-500 font-medium">Junior Secondary School — Competency-Based Curriculum</p>
              </div>
              {jssDirty && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 animate-pulse">
                  <FiClock size={11} /> Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView(v => v === 'grid' ? 'subject' : 'grid')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                {view === 'grid' ? <FiList size={14} /> : <FiGrid size={14} />}
                {view === 'grid' ? 'Subject View' : 'Overview Grid'}
              </button>
              <button onClick={() => setShowAtRisk(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all">
                <FiAlertCircle size={14} />
                At-Risk {beStudentNames?.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold">{beStudentNames.length}</span>}
              </button>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                <FiDownload size={14} /> Export
              </button>
              <button
                onClick={() => { if (jssDirty) setShowSaveConfirm(true); else toast('No changes to save'); }}
                disabled={saving || !jssDirty}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  jssDirty ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {saving ? <><FiRefreshCw size={14} className="animate-spin" /> Saving…</> : <><FiSave size={14} /> Save All</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <FiFilter size={15} /> Filters:
            </div>
            {/* Grade */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</label>
              <div className="flex gap-1">
                {['7', '8', '9'].map(g => (
                  <button key={g} onClick={() => setSelJSSGrade(g)}
                    className={`w-10 h-9 rounded-lg text-sm font-bold border transition-all ${
                      selJSSGrade === g ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            {/* Stream */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stream</label>
              <select value={selStream} onChange={e => setSelStream(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[120px]">
                <option value="">All Streams</option>
                {streams?.map((s: any) => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
              </select>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            {/* Term */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Term</label>
              <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[130px]">
                <option value="">Select Term</option>
                {terms?.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.term_name} {t.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            {/* Search */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search student…" type="text"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI bar ── */}
        {totalStudents > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['EE','ME','AE','BE'] as CompKey[]).map(k => {
              const cnt = analyticsCounts?.[k] || 0;
              const pct = totalStudents > 0 ? Math.round(cnt / totalStudents * 100) : 0;
              const c = COMP_CFG[k];
              return (
                <div key={k} className="bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: c.bg, color: c.color, border: `2px solid ${c.border}` }}>
                    {k}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-800">{cnt}</p>
                    <p className="text-xs text-gray-500 font-medium">{c.full}</p>
                    <div className="mt-1 w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selJSSGrade && (
          <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <FiBook size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Select a Grade to Begin</h3>
            <p className="text-gray-500 text-sm">Choose Grade 7, 8, or 9 above to load students and enter CBC competency marks</p>
          </div>
        )}

        {selJSSGrade && loading && (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading Grade {selJSSGrade} students…</p>
          </div>
        )}

        {selJSSGrade && !loading && (
          <>
            {/* Progress strip */}
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiActivity size={15} className="text-emerald-600" />
                  <span className="text-sm font-bold text-gray-700">Completion Progress</span>
                  <span className="text-xs text-gray-500">— {assessedCount} of {totalStudents} students assessed</span>
                </div>
                <span className="text-sm font-black text-emerald-600">{completionPct}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              {/* Per-LA completion */}
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-2">
                {las.map((la: any) => (
                  <div key={la.code} className="text-center">
                    <div className="text-[10px] font-bold text-gray-500 mb-1">{la.code}</div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${laCompletion[la.code] || 0}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{laCompletion[la.code] || 0}%</div>
                  </div>
                ))}
              </div>
            </div>

            {view === 'grid' ? (
              /* ── OVERVIEW GRID VIEW ── */
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiGrid size={16} className="text-emerald-600" />
                    <span className="font-bold text-gray-800">All Learning Areas — Grade {selJSSGrade}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{totalStudents} students</span>
                  </div>
                  <div className="flex gap-2">
                    {(['EE','ME','AE','BE'] as CompKey[]).map(k => (
                      <span key={k} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold" style={{ color: COMP_CFG[k].color, background: COMP_CFG[k].bg }}>
                        {k} ≥{k==='EE'?80:k==='ME'?60:k==='AE'?40:0}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">#  Student</th>
                        {las.map((la: any) => (
                          <th key={la.code} className="text-center px-2 py-3 font-semibold min-w-[90px]">
                            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ color: la.color || '#374151', background: la.bg || '#F3F4F6' }}>
                              {la.code}
                            </span>
                            <div className="text-[10px] text-gray-400 font-normal mt-0.5 truncate max-w-[80px]">{la.name?.split(' ')[0]}</div>
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold text-gray-600 sticky right-0 bg-gray-50 min-w-[100px]">Overall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((s: any, idx: number) => {
                        const sid = String(s.id);
                        const studentLevels = Object.values(jssMarks[sid] || {}).map((v: any) => v.level).filter(Boolean) as CompKey[];
                        const counts: Record<string,number> = {EE:0,ME:0,AE:0,BE:0};
                        studentLevels.forEach(l => { if(counts[l]!==undefined) counts[l]++; });
                        const dominant = studentLevels.length > 0
                          ? (['EE','ME','AE','BE'] as CompKey[]).reduce((best,k) => counts[k] > (counts[best]||0) ? k : best, 'ME' as CompKey)
                          : null;
                        return (
                          <tr key={s.id} className={`hover:bg-emerald-50/40 transition-colors ${dominant === 'BE' ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2 sticky left-0 bg-white hover:bg-emerald-50/40 z-10">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-mono w-5">{idx+1}</span>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {s.first_name?.[0]}{s.last_name?.[0]}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800 text-xs leading-tight">{s.first_name} {s.last_name}</div>
                                  <div className="text-[10px] text-gray-400">{s.admission_no || s.admission_number || ''}</div>
                                </div>
                              </div>
                            </td>
                            {las.map((la: any) => {
                              const mark = jssMarks[sid]?.[la.code];
                              return (
                                <td key={la.code} className="px-2 py-1.5 text-center">
                                  <ScoreCell
                                    value={mark?.score || ''}
                                    onChange={v => setJSSMark(s.id, la.code, v)}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center sticky right-0 bg-white">
                              <CompBadge level={dominant} size="md" />
                              {studentLevels.length > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{studentLevels.length}/{las.length}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={las.length + 2} className="text-center py-12 text-gray-400">
                            <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="font-medium">No students found for Grade {selJSSGrade}</p>
                            <p className="text-xs mt-1">Check that students are assigned to this grade in the system</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ── SUBJECT VIEW ── */
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* LA selector sidebar */}
                <div className="bg-white rounded-2xl border shadow-sm p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-2 mb-2">Learning Areas</p>
                  <div className="space-y-1">
                    {las.map((la: any) => {
                      const comp = laCompletion[la.code] || 0;
                      return (
                        <button key={la.code} onClick={() => setSelJSSLA(la.code)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${
                            selJSSLA === la.code ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                          <span className="text-xs font-black w-10 py-0.5 text-center rounded-md" style={{ color: la.color || '#374151', background: la.bg || '#F3F4F6' }}>
                            {la.code}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${selJSSLA === la.code ? 'text-emerald-700' : 'text-gray-700'}`}>{la.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${comp}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400 w-7 text-right">{comp}%</span>
                            </div>
                          </div>
                          {comp === 100 && <FiCheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mark entry panel */}
                <div className="lg:col-span-3 bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3" style={{ background: `${selectedLA?.bg || '#F0FDF4'}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style={{ color: (selectedLA as any)?.color || '#059669', background: 'white', border: `2px solid ${(selectedLA as any)?.border || (selectedLA as any)?.color || '#6EE7B7'}` }}>
                      {selectedLA?.code}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">{selectedLA?.name} — Grade {selJSSGrade}</h2>
                      <p className="text-xs text-gray-500">{students.length} students · {laCompletion[selectedLA?.code] || 0}% complete</p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {(['EE','ME','AE','BE'] as CompKey[]).map(k => {
                        const cnt = students.filter((s: any) => jssMarks[String(s.id)]?.[selectedLA?.code]?.level === k).length;
                        return cnt > 0 ? (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: COMP_CFG[k].color, background: COMP_CFG[k].bg }}>
                            {k}: {cnt}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {students.map((s: any, idx: number) => {
                      const sid = String(s.id);
                      const laCode = selectedLA?.code;
                      const mark = jssMarks[sid]?.[laCode];
                      const lvl = mark?.level as CompKey | null;
                      return (
                        <div key={s.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors ${lvl === 'BE' ? 'bg-red-50/40' : ''}`}>
                          <span className="text-xs text-gray-400 font-mono w-6 text-right flex-shrink-0">{idx+1}</span>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.admission_no || s.admission_number || ''}</p>
                          </div>
                          {/* Quick buttons */}
                          <div className="flex gap-1">
                            {(['EE','ME','AE','BE'] as CompKey[]).map(k => (
                              <button key={k} onClick={() => setJSSMark(s.id, laCode, k === 'EE' ? '90' : k === 'ME' ? '70' : k === 'AE' ? '50' : '25')}
                                className={`w-9 h-8 rounded-lg text-xs font-bold border transition-all ${lvl === k ? 'text-white shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                style={lvl === k ? { background: COMP_CFG[k].color, borderColor: COMP_CFG[k].color } : { background: COMP_CFG[k].bg, borderColor: COMP_CFG[k].border, color: COMP_CFG[k].color }}>
                                {k}
                              </button>
                            ))}
                          </div>
                          {/* Score input */}
                          <ScoreCell value={mark?.score || ''} onChange={v => setJSSMark(s.id, laCode, v)} />
                          {/* Clear */}
                          {lvl && (
                            <button onClick={() => setJSSMark(s.id, laCode, '')}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors w-5 text-center">✕</button>
                          )}
                        </div>
                      );
                    })}
                    {students.length === 0 && (
                      <div className="py-12 text-center text-gray-400">
                        <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-sm">No students found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── At-Risk Modal ── */}
      {showAtRisk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAtRisk(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <FiAlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-800">At-Risk Students (BE)</h3>
                  <p className="text-xs text-red-600">{beStudentNames?.length || 0} students have at least one BE rating</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {(beStudentNames || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiCheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p className="font-medium">All students are meeting expectations!</p>
                </div>
              ) : (beStudentNames || []).map((name: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">{i+1}</div>
                  <span className="text-sm font-semibold text-red-800">{name}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-700 font-bold">BE</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowAtRisk(false)}
                className="w-full py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Confirm Modal ── */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FiSave size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Save JSS Marks</h3>
                  <p className="text-xs text-gray-500">Grade {selJSSGrade} — {totalStudents} students</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">This will save/update <strong>{Object.values(jssMarks).reduce((a: number, s: any) => a + Object.values(s).filter((v: any) => v.level).length, 0)}</strong> competency entries to the database.</p>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs text-amber-700 font-medium">⚠️ Existing marks will be updated. This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-4 flex gap-2 border-t border-gray-100">
              <button onClick={() => setShowSaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={async () => { setShowSaveConfirm(false); await saveJSSMarks(); }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 shadow-sm">
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


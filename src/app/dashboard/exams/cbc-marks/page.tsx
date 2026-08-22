'use client';

import Link from 'next/link';
import { useUltraCBCMarks, JSS_LEARNING_AREAS, scoreToLevel } from '@/hooks/useUltraCBCMarks';
import UltraCBCAnalyticsPanel from '@/components/cbc/UltraCBCAnalyticsPanel';
import UltraCBCStudentRow from '@/components/cbc/UltraCBCStudentRow';
import { UltraCBCFilterBar, UltraCBCProgressStrip, UltraCBCBulkBar } from '@/components/cbc/UltraCBCFilterBar';
import {
  FiDownload, FiSave, FiCheckCircle, FiFileText, FiSettings, FiCheck,
  FiClipboard, FiBarChart2, FiAward, FiClock, FiEdit3, FiBook, FiUsers,
  FiUpload, FiPrinter, FiCpu, FiList, FiStar, FiLayers, FiRefreshCw,
  FiAlertCircle, FiInfo, FiSearch, FiGrid, FiZap,
  FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import { useMemo, useState } from 'react';

// ─── Rubric config (KICD) ─────────────────────────────────────────────────────
const RUBRIC_CFG = [
  { code: 'EE', label: 'Exceeds Expectation',   min: 80, max: 100, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  { code: 'ME', label: 'Meets Expectation',      min: 60, max: 79,  color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  { code: 'AE', label: 'Approaches Expectation', min: 40, max: 59,  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  { code: 'BE', label: 'Below Expectation',       min: 0,  max: 39,  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
] as const;

function getRubric(score: string) {
  const n = parseInt(score, 10);
  if (isNaN(n)) return null;
  return RUBRIC_CFG.find(r => n >= r.min && n <= r.max) || RUBRIC_CFG[3];
}

// ─── Static trend data ────────────────────────────────────────────────────────
const TREND_DATA = [
  { label: 'F1', value: 40, color: '#1D9E75' },
  { label: 'F2', value: 65, color: '#378ADD' },
  { label: 'F3', value: 52, color: '#EF9F27' },
  { label: 'F4', value: 78, color: '#1D9E75' },
  { label: 'S1', value: 45, color: '#E24B4A' },
  { label: 'S2', value: 60, color: '#378ADD' },
];

// ─── JSS Analytics Panel ──────────────────────────────────────────────────────
function JSSAnalyticsSection({ students, jssMarks, jssLearningAreas, selJSSLA }: any) {
  const laList = selJSSLA === 'all' ? jssLearningAreas : jssLearningAreas.filter((la: any) => la.code === selJSSLA);

  const overallCounts = useMemo(() => {
    const c = { EE: 0, ME: 0, AE: 0, BE: 0 };
    students.forEach((s: any) => {
      const sid = String(s.id);
      RUBRIC_CFG.forEach(r => {
        const cnt = laList.filter((la: any) => jssMarks[sid]?.[la.code]?.level === r.code).length;
        c[r.code as keyof typeof c] += cnt;
      });
    });
    return c;
  }, [students, jssMarks, laList]);

  const total = Object.values(overallCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Distribution bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-purple-500" /> Overall Rubric Distribution
        </h3>
        <div className="flex h-8 rounded-full overflow-hidden mb-4 gap-0.5">
          {RUBRIC_CFG.map(r => {
            const cnt = overallCounts[r.code as keyof typeof overallCounts] || 0;
            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
            return pct > 0 ? (
              <div key={r.code} className="flex items-center justify-center text-white text-xs font-black rounded-sm"
                style={{ width: `${pct}%`, background: r.color }}>
                {pct > 8 ? r.code : ''}
              </div>
            ) : null;
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {RUBRIC_CFG.map(r => {
            const cnt = overallCounts[r.code as keyof typeof overallCounts] || 0;
            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
            return (
              <div key={r.code} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: r.bg, borderColor: r.border }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: r.color }}>{r.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: r.color }}>{r.label}</p>
                  <div className="h-1.5 bg-white/60 rounded-full mt-1">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
                <span className="font-black text-lg flex-shrink-0" style={{ color: r.color }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per LA averages */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">📊 Per Learning Area — Class Average</h3>
        <div className="space-y-2.5">
          {laList.map((la: any) => {
            const scores = students
              .map((s: any) => Number(jssMarks[String(s.id)]?.[la.code]?.score || 0))
              .filter((v: number) => v > 0);
            const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
            const rubric = avg !== null ? getRubric(String(avg)) : null;
            const entered = students.filter((s: any) => jssMarks[String(s.id)]?.[la.code]?.level).length;
            return (
              <div key={la.code} className="flex items-center gap-3">
                <span className="text-[10px] font-black w-10 text-center px-1 py-1 rounded-lg text-white flex-shrink-0" style={{ background: la.color }}>{la.code}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-gray-600 font-medium">{la.name}</span>
                    <span className="text-xs text-gray-400">{entered}/{students.length}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${avg || 0}%`, background: la.color }} />
                  </div>
                </div>
                {avg !== null && rubric ? (
                  <div className="flex items-center gap-1.5 w-24 justify-end flex-shrink-0">
                    <span className="text-sm font-black" style={{ color: rubric.color }}>{avg}%</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ background: rubric.color }}>{rubric.code}</span>
                  </div>
                ) : <span className="text-xs text-gray-300 w-24 text-right flex-shrink-0">No data</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* BE Alert */}
      {students.some((s: any) => Object.values(jssMarks[String(s.id)] || {}).some((v: any) => v.level === 'BE')) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2"><FiAlertCircle /> Students Below Expectation — Need Intervention</h3>
          <div className="space-y-2">
            {students.filter((s: any) => Object.values(jssMarks[String(s.id)] || {}).some((v: any) => v.level === 'BE')).map((s: any) => {
              const sid = String(s.id);
              const beLAs = laList.filter((la: any) => jssMarks[sid]?.[la.code]?.level === 'BE').map((la: any) => la.code);
              return (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100">
                  <span className="font-semibold text-sm text-gray-800">{s.last_name}, {s.first_name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {beLAs.map((code: string) => (
                      <span key={code} className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100 text-red-700">{code}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── JSS Marks Grid ───────────────────────────────────────────────────────────
function JSSMarksGrid({ students, jssMarks, jssLearningAreas, selJSSLA, setJSSMark, jssDirty, saveJSSMarks, saving, searchQuery, setSearchQuery }: any) {
  const visibleLAs = selJSSLA === 'all' ? jssLearningAreas : jssLearningAreas.filter((la: any) => la.code === selJSSLA);
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s: any) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.admission_no || s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  if (students.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#EDE9FE,#CCFBF1)' }}>
        <FiUsers size={28} className="text-purple-400" />
      </div>
      <p className="font-bold text-gray-600 text-lg">No students found</p>
      <p className="text-sm text-gray-400 mt-1">Select a Grade and Term to load students</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sub-toolbar */}
      <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2">
          <FiUsers size={14} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">{filtered.length} students</span>
          {jssDirty && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg animate-pulse">● Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student..."
              className="border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-300 outline-none w-44" />
          </div>
          {jssDirty && (
            <button onClick={saveJSSMarks} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
              {saving ? <FiRefreshCw size={12} className="animate-spin" /> : <FiSave size={12} />}
              {saving ? 'Saving…' : 'Save All'}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-20 min-w-[195px] text-[10px] font-black text-gray-500 uppercase tracking-wider">
                # &nbsp; Student
              </th>
              {visibleLAs.map((la: any) => (
                <th key={la.code} className="text-center py-3 px-2 min-w-[96px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg text-white" style={{ background: la.color }}>{la.code}</span>
                    <span className="text-[9px] text-gray-400 font-medium leading-tight text-center max-w-[80px]">{la.name}</span>
                  </div>
                </th>
              ))}
              <th className="text-center py-3 px-3 min-w-[80px] text-[10px] font-black text-gray-500 uppercase tracking-wider">Avg %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student: any, idx: number) => {
              const sid = String(student.id);
              const studentMarks = jssMarks[sid] || {};
              const scores = visibleLAs.map((la: any) => Number(studentMarks[la.code]?.score || 0)).filter((m: number) => m > 0);
              const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
              const avgRubric = avg !== null ? getRubric(String(avg)) : null;
              const enteredCount = visibleLAs.filter((la: any) => studentMarks[la.code]?.level).length;
              const isComplete = enteredCount === visibleLAs.length && visibleLAs.length > 0;

              return (
                <tr key={student.id} className={`border-b border-gray-100 transition hover:bg-purple-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  {/* Student cell */}
                  <td className="px-4 py-2 sticky left-0 z-10 bg-inherit">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: isComplete ? 'linear-gradient(135deg,#059669,#00D9A6)' : 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
                        {isComplete ? <FiCheck size={12} /> : (student.first_name?.[0] || '?')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{student.last_name}, {student.first_name}</p>
                        <p className="text-[10px] text-gray-400">{student.admission_no || student.admission_number || '—'}</p>
                      </div>
                      <span className="ml-auto text-[9px] text-gray-400 flex-shrink-0">{enteredCount}/{visibleLAs.length}</span>
                    </div>
                  </td>

                  {/* Per-LA mark inputs */}
                  {visibleLAs.map((la: any) => {
                    const entry = studentMarks[la.code] || { score: '', level: null };
                    const rubric = entry.level ? RUBRIC_CFG.find(r => r.code === entry.level) : null;
                    return (
                      <td key={la.code} className="px-1.5 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number" min={0} max={100}
                            value={entry.score}
                            onChange={e => setJSSMark(student.id, la.code, e.target.value)}
                            placeholder="0–100"
                            className="w-16 text-center border rounded-lg px-1 py-1.5 text-xs font-bold focus:ring-2 outline-none transition"
                            style={{
                              borderColor: rubric ? rubric.border : '#E5E7EB',
                              background: rubric ? rubric.bg : '#F9FAFB',
                              color: rubric ? rubric.color : '#374151',
                            }}
                          />
                          {rubric ? (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ background: rubric.color }}>
                              {rubric.code}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-medium">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Average */}
                  <td className="px-3 py-2 text-center">
                    {avg !== null && avgRubric ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-black" style={{ color: avgRubric.color }}>{avg}%</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ background: avgRubric.color }}>{avgRubric.code}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating save */}
      {jssDirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <button onClick={saveJSSMarks} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 font-bold text-white rounded-2xl shadow-2xl text-sm transition disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
            {saving ? <FiRefreshCw size={16} className="animate-spin" /> : <FiSave size={16} />}
            {saving ? 'Saving…' : 'Save All Marks'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CBC Senior Sidebar — Collapsible + Paginated ────────────────────────────
const SUBJECTS_PER_PAGE = 8;

function SeniorSidebar({ hook }: { hook: any }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [subjectPage, setSubjectPage] = useState(0);

  const toggle = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const subjects: any[] = hook.availableSubjects || [];
  const totalPages = Math.ceil(subjects.length / SUBJECTS_PER_PAGE);
  const pagedSubjects = subjects.slice(
    subjectPage * SUBJECTS_PER_PAGE,
    subjectPage * SUBJECTS_PER_PAGE + SUBJECTS_PER_PAGE
  );

  const formativeCount = (hook.assessments || []).filter((a: any) => a.assessment_type === 'Formative').length;
  const summativeCount = (hook.assessments || []).filter((a: any) => a.assessment_type === 'Summative').length;

  const SectionHeader = ({ label, skey }: { label: string; skey: string }) => (
    <button
      onClick={() => toggle(skey)}
      className="w-full flex items-center justify-between px-2 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors cursor-pointer"
    >
      <span>{label}</span>
      {collapsed[skey]
        ? <FiChevronRight size={11} />
        : <FiChevronDown size={11} />}
    </button>
  );

  return (
    <div className="w-[210px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="py-4 px-3 flex flex-col gap-0.5">

        {/* ── Top nav ── */}
        <div className={`flex items-center gap-2 py-2 px-2 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 cursor-default`}>
          <FiEdit3 size={14} /> Mark Entry
        </div>
        <div className="flex items-center gap-2 py-2 px-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          <FiUsers size={14} />
          Students
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] text-white font-bold" style={{ background: '#6C63FF' }}>
            {hook.totalStudents || 0}
          </span>
        </div>

        {/* ── Subjects (collapsible + paginated) ── */}
        <SectionHeader label="Subjects" skey="subjects" />
        {!collapsed['subjects'] && (
          <>
            {/* Subject list */}
            <div className="space-y-0.5">
              {pagedSubjects.map((sub: any) => {
                const isActive = String(hook.selSubject) === String(sub.id);
                return (
                  <button key={sub.id}
                    onClick={() => hook.setSelSubject(String(sub.id))}
                    className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}>
                    <FiBook size={13} className={isActive ? 'text-white' : 'text-gray-400'} />
                    <span className="flex-1 truncate">{sub.subject_name}</span>
                    {isActive && hook.assessedCount > 0 && (
                      <span className="text-[10px] bg-white/25 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                        {hook.assessedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Premium pagination */}
            {totalPages > 1 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {/* Page number pills */}
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setSubjectPage(i)}
                      className={`w-6 h-6 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                        i === subjectPage
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      style={i === subjectPage ? { background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' } : {}}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                {/* Prev / Next */}
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => setSubjectPage(p => Math.max(0, p - 1))}
                    disabled={subjectPage === 0}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
                    <FiChevronLeft size={11} /> Prev
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {subjectPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setSubjectPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={subjectPage === totalPages - 1}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
                    Next <FiChevronRight size={11} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center">
                  {subjects.length} subjects total
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Assessments (collapsible) ── */}
        <SectionHeader label="Assessments" skey="assessments" />
        {!collapsed['assessments'] && (
          <div className="space-y-0.5">
            {[
              { label: 'Formative', type: 'Formative', count: formativeCount, bg: '#EFF6FF', color: '#2563EB' },
              { label: 'Summative', type: 'Summative', count: summativeCount, bg: '#F0FDF4', color: '#16A34A' },
            ].map(item => {
              const isActive = hook.selAssessmentType === item.type;
              return (
                <button key={item.type}
                  onClick={() => hook.setSelAssessmentType(item.type)}
                  className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive ? 'font-semibold shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                  style={isActive ? { background: item.bg, color: item.color } : {}}>
                  <FiClipboard size={13} className={isActive ? '' : 'text-gray-400'} />
                  {item.label}
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: isActive ? item.color : '#E5E7EB', color: isActive ? '#fff' : '#6B7280' }}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Tools (collapsible) ── */}
        <SectionHeader label="Tools" skey="tools" />
        {!collapsed['tools'] && (
          <div className="space-y-0.5">
            {[
              { icon: FiCheckCircle, label: 'Bulk Select', onClick: hook.toggleBulk, active: hook.bulkMode },
              { icon: FiDownload,    label: 'Export CSV',  onClick: hook.exportCSV,  active: false },
              { icon: FiPrinter,     label: 'Print',       onClick: () => window.print(), active: false },
            ].map((item, i) => (
              <button key={i} onClick={item.onClick}
                className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg text-xs transition-all cursor-pointer ${
                  item.active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}>
                <item.icon size={13} className="opacity-70" /> {item.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Completion mini-bar ── */}
        {hook.totalStudents > 0 && (
          <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex justify-between text-[10px] font-bold text-indigo-600 mb-1.5">
              <span>Completion</span>
              <span>{hook.completionPct}%</span>
            </div>
            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${hook.completionPct}%`, background: 'linear-gradient(90deg,#6C63FF,#00D9A6)' }} />
            </div>
            <p className="text-[10px] text-indigo-400 mt-1">{hook.assessedCount}/{hook.totalStudents} assessed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function CBCMarksPage() {
  const hook = useUltraCBCMarks();
  const [jssTab, setJssTab] = useState<'grid' | 'analytics'>('grid');
  const [showRubricGuide, setShowRubricGuide] = useState(false);

  if (hook.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"
            style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <p className="text-gray-400 text-sm font-medium">Loading Ultra CBC Assessment System…</p>
        </div>
      </div>
    );
  }

  const isSenior = hook.mode === 'CBC_Senior';
  const isJSS = hook.mode === 'JSS';

  return (
    <div className="animate-fade-in min-h-screen bg-gray-50">

      {/* ── Rubric Guide Modal ─────────────────────────────────────────────── */}
      {showRubricGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRubricGuide(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-800 text-lg mb-1">KICD CBC Rubric Scale</h3>
            <p className="text-xs text-gray-500 mb-5">Enter marks 0–100. The system automatically assigns the competency level.</p>
            <div className="space-y-3">
              {RUBRIC_CFG.map(r => (
                <div key={r.code} className="flex items-center gap-4 p-3 rounded-xl border" style={{ background: r.bg, borderColor: r.border }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0" style={{ background: r.color }}>{r.code}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-xs text-gray-500">Marks: {r.min}–{r.max} out of 100</p>
                  </div>
                  <p className="text-2xl font-black flex-shrink-0" style={{ color: r.color }}>{r.min}–{r.max}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowRubricGuide(false)}
              className="mt-5 w-full py-2.5 font-bold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ── Overwrite Confirm (CBC Senior) ────────────────────────────────── */}
      {hook.showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Overwrite Summative Assessment?</h3>
            <p className="text-sm text-gray-600 mb-5">
              A summative assessment already exists for this subject and term. Saving will overwrite the existing records. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { hook.setShowConfirm(false); hook.setPendingSave(null); }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={async () => { hook.setShowConfirm(false); if (hook.pendingSave) await hook.pendingSave(); hook.setPendingSave(null); }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600">
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between py-2.5 px-5 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm gap-3 flex-wrap">

        {/* Left: Logo + Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
              <FiBook size={14} className="text-white" />
            </div>
            APSIMS
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
            <span>Exams</span><span className="opacity-50">›</span>
            <span>CBC Assessment</span><span className="opacity-50">›</span>
            <span className="text-gray-700 font-medium">Mark Entry</span>
          </div>
        </div>

        {/* Center: Mode Switcher + Nav */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MODE TOGGLE */}
          <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button onClick={() => hook.setMode('CBC_Senior')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${isSenior ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:text-gray-700'}`}>
              <FiLayers size={11} /> Senior (Gr 10–12)
            </button>
            <button onClick={() => hook.setMode('JSS')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${isJSS ? 'bg-white text-purple-700 shadow-sm border border-purple-100' : 'text-gray-500 hover:text-gray-700'}`}>
              <FiGrid size={11} /> JSS (Gr 7–9)
            </button>
          </div>

          {/* CBC Senior sub-tabs */}
          {isSenior && (
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {[
                { id: 'entry', label: 'Mark Entry', icon: FiEdit3, href: '/dashboard/exams/cbc-marks' },
                { id: 'summary', label: 'Summary', icon: FiBarChart2, href: '/dashboard/exams/cbc-marks/summary' },
                { id: 'competency', label: 'Competency', icon: FiAward, href: '/dashboard/exams/cbc-marks/competency' },
                { id: 'history', label: 'History', icon: FiClock, href: '/dashboard/exams/cbc-marks/history' },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <Link key={tab.id} href={tab.href}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs cursor-pointer transition-all no-underline ${
                      tab.id === 'entry' ? 'bg-white text-gray-800 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    <Icon size={12} />{tab.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRubricGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer">
            <FiInfo size={13} /> Rubric Guide
          </button>
          <button onClick={hook.exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer">
            <FiDownload size={13} /> Export
          </button>
          {isSenior && (
            <button onClick={() => hook.triggerSave(false)} disabled={hook.saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60"
              style={{ background: hook.saving ? '#1D9E75' : '#00D9A6' }}>
              {hook.saving ? <><FiCheck size={13} /> Saving…</> : <><FiSave size={13} /> Save All</>}
            </button>
          )}
          {isJSS && hook.jssDirty && (
            <button onClick={hook.saveJSSMarks} disabled={hook.saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
              {hook.saving ? <FiRefreshCw size={13} className="animate-spin" /> : <FiSave size={13} />}
              {hook.saving ? 'Saving…' : 'Save All'}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          JSS MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {isJSS && (
        <div className="flex" style={{ minHeight: 'calc(100vh - 57px)' }}>

          {/* JSS Sidebar */}
          <div className="w-[215px] flex-shrink-0 bg-white border-r border-gray-200 py-4 px-3 flex flex-col gap-2 overflow-y-auto">

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 mb-0.5">Grade</p>
            {[{ label: 'Grade 7', val: '7' }, { label: 'Grade 8', val: '8' }, { label: 'Grade 9', val: '9' }].map(g => (
              <button key={g.val} onClick={() => hook.setSelJSSGrade(g.val)}
                className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left w-full cursor-pointer ${
                  hook.selJSSGrade === g.val ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
                style={hook.selJSSGrade === g.val ? { background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' } : {}}>
                <FiUsers size={13} className="flex-shrink-0" />
                {g.label}
                {hook.selJSSGrade === g.val && hook.students.length > 0 && (
                  <span className="ml-auto bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {hook.students.length}
                  </span>
                )}
              </button>
            ))}

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 mt-3 mb-0.5">Term</p>
            <select value={hook.selTerm} onChange={e => hook.setSelTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white focus:ring-2 focus:ring-purple-300 outline-none font-medium cursor-pointer">
              <option value="">Select Term</option>
              {hook.terms.map((t: any) => (
                <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' ●' : ''}</option>
              ))}
            </select>

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 mt-3 mb-0.5">Filter by Learning Area</p>
            <button onClick={() => hook.setSelJSSLA('all')}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all w-full cursor-pointer ${
                hook.selJSSLA === 'all' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <FiGrid size={12} className="flex-shrink-0" /> All Learning Areas
            </button>

            {hook.jssLearningAreas.map((la: any) => {
              const enteredCount = hook.students.filter((s: any) => hook.jssMarks[String(s.id)]?.[la.code]?.level).length;
              const isActive = hook.selJSSLA === la.code;
              return (
                <button key={la.code} onClick={() => hook.setSelJSSLA(la.code)}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all text-left w-full cursor-pointer ${
                    isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={isActive ? { background: la.color } : {}}>
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                    style={{ background: isActive ? 'rgba(255,255,255,0.3)' : la.color }}>
                    {la.code[0]}
                  </span>
                  <span className="flex-1 leading-tight truncate">{la.name}</span>
                  {hook.students.length > 0 && (
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${isActive ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {enteredCount}/{hook.students.length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Completion progress */}
            {hook.students.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-1.5">Overall Completion</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${hook.completionPct}%`, background: 'linear-gradient(90deg,#6C63FF,#00D9A6)' }} />
                  </div>
                  <span className="text-xs font-black text-gray-700">{hook.completionPct}%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{hook.assessedCount}/{hook.totalStudents} students</p>
              </div>
            )}
          </div>

          {/* JSS Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* JSS page header */}
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>JSS</div>
                  <div>
                    <h2 className="text-base font-black text-gray-800">
                      {hook.selJSSGrade ? `Grade ${hook.selJSSGrade}` : 'JSS'} — CBC Mark Entry
                    </h2>
                    <p className="text-xs text-gray-400">
                      KICD CBC Competency · Marks 0–100, rubric auto-assigns
                      {hook.selJSSLA !== 'all' && ` · ${hook.jssLearningAreas.find((la: any) => la.code === hook.selJSSLA)?.name || ''}`}
                    </p>
                  </div>
                </div>
                {/* Rubric pills */}
                <div className="flex gap-1.5 flex-wrap">
                  {RUBRIC_CFG.map(r => (
                    <div key={r.code} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: r.bg, borderColor: r.border, color: r.color }}>
                      <span className="font-black">{r.code}</span>
                      <span className="hidden sm:inline font-medium text-gray-500">{r.min}–{r.max}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSS Sub-tabs + live counts */}
              <div className="flex items-center gap-1 mt-3 border-t border-gray-100 pt-2.5 flex-wrap">
                {([['grid', 'Marks Grid', FiEdit3], ['analytics', 'Analytics', FiBarChart2]] as const).map(([t, label, Icon]) => (
                  <button key={t} onClick={() => setJssTab(t)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      jssTab === t ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}>
                    <Icon size={12} />{label}
                  </button>
                ))}
                {hook.students.length > 0 && (
                  <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                    {RUBRIC_CFG.map(r => {
                      const cnt = hook.analyticsCounts[r.code as keyof typeof hook.analyticsCounts] as number || 0;
                      if (!cnt) return null;
                      return (
                        <span key={r.code} className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg"
                          style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
                          {r.code}: {cnt}
                        </span>
                      );
                    })}
                    {(hook.analyticsCounts.NA as number) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500">
                        NA: {hook.analyticsCounts.NA as number}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* JSS content */}
            {!hook.selJSSGrade || !hook.selTerm ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg,#EDE9FE,#CCFBF1)' }}>
                  <FiZap size={36} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-black text-gray-700 mb-2">Select Grade &amp; Term</h3>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  Choose Grade 7, 8, or 9 from the sidebar, then select a Term to load students and enter marks.
                </p>
              </div>
            ) : jssTab === 'grid' ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <JSSMarksGrid
                  students={hook.jssFilteredStudents}
                  jssMarks={hook.jssMarks}
                  jssLearningAreas={hook.jssLearningAreas}
                  selJSSLA={hook.selJSSLA}
                  setJSSMark={hook.setJSSMark}
                  jssDirty={hook.jssDirty}
                  saveJSSMarks={hook.saveJSSMarks}
                  saving={hook.saving}
                  searchQuery={hook.searchQuery}
                  setSearchQuery={hook.setSearchQuery}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <JSSAnalyticsSection
                  students={hook.students}
                  jssMarks={hook.jssMarks}
                  jssLearningAreas={hook.jssLearningAreas}
                  selJSSLA={hook.selJSSLA}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CBC SENIOR MODE — 100% ORIGINAL PRESERVED
      ══════════════════════════════════════════════════════════════════════ */}
      {isSenior && (
        <div className="flex" style={{ minHeight: 'calc(100vh - 57px)' }}>

          {/* Left Sidebar — Collapsible + Paginated */}
          <SeniorSidebar hook={hook} />

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="py-4 px-5 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-800 flex items-center gap-2.5">
                    <FiClipboard size={20} className="text-indigo-500" />
                    CBC Mark Entry — {hook.subjectName || 'Select Subject'}
                    <span className="text-[10px] py-0.5 px-2 rounded border border-gray-200 bg-gray-50 text-gray-500 font-medium ml-1">
                      {hook.selAssessmentType} Assessment
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Enter rubric levels and marks. Rubric auto-selects from score.{' '}{hook.termName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={hook.toggleBulk}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      hook.bulkMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    <FiCheckCircle size={13} /> Bulk Select
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer" style={{ background: '#6C63FF' }}>
                    <FiSettings size={13} /> Rubric Config
                  </button>
                </div>
              </div>

              <UltraCBCFilterBar
                forms={hook.forms}
                streams={hook.streams}
                subjects={hook.availableSubjects}
                terms={hook.terms}
                selForm={hook.selForm}
                selStream={hook.selStream}
                selSubject={hook.selSubject}
                selTerm={hook.selTerm}
                selAssessmentType={hook.selAssessmentType}
                searchQuery={hook.searchQuery}
                rubricFilter={hook.rubricFilter}
                taskName={hook.taskName}
                onFormChange={hook.setSelForm}
                onStreamChange={hook.setSelStream}
                onSubjectChange={hook.setSelSubject}
                onTermChange={hook.setSelTerm}
                onAssessmentTypeChange={hook.setSelAssessmentType}
                onSearchChange={hook.setSearchQuery}
                onRubricFilterChange={hook.setRubricFilter}
                onTaskNameChange={hook.setTaskName}
              />
            </div>

            {hook.isReady && hook.totalStudents > 0 && (
              <UltraCBCProgressStrip
                counts={hook.analyticsCounts}
                totalStudents={hook.totalStudents}
                completionPct={hook.completionPct}
              />
            )}

            <UltraCBCBulkBar
              bulkMode={hook.bulkMode}
              selectedCount={hook.selected.size}
              onSelectAll={hook.handleSelectAll}
              onBulkSet={hook.handleBulkSet}
              onClearSelected={hook.handleClearSelected}
            />

            {!hook.isReady ? (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center py-20 text-gray-400">
                  <span className="text-5xl block mb-4">📝</span>
                  <p className="font-semibold text-lg">Select all required filters to enter marks</p>
                  <p className="text-xs mt-1">
                    Form, Subject, Term, Assessment Type{hook.selAssessmentType === 'Formative' ? ', and Task Name' : ''} are required
                  </p>
                </div>
              </div>
            ) : hook.filteredStudents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center py-20 text-gray-400">
                  <span className="text-5xl block mb-4">👥</span>
                  <p className="font-semibold">No students found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search query</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                      {hook.bulkMode && <th className="px-3 py-2 text-left w-9" />}
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-7">#</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Marks <span className="text-gray-300 font-normal">/100</span>
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rubric Level</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Current</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prev Term</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trend</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Form. Avg</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Teacher Note</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hook.filteredStudents.map((student: any, idx: number) => (
                      <UltraCBCStudentRow
                        key={student.id}
                        student={{
                          id: student.id,
                          admNo: student.admission_no || student.admission_number || '—',
                          firstName: student.first_name,
                          lastName: student.last_name,
                          gender: student.gender || '',
                          stream: String(student.stream_id || ''),
                          streamName: '',
                        }}
                        index={idx + 1}
                        score={hook.markScores[student.id] || ''}
                        level={hook.markLevels[student.id] || null}
                        prevLevel={hook.prevTermLevels[student.id] || null}
                        formativeAvgLevel={hook.formativeAvgLevels[student.id] || null}
                        note={hook.markNotes[student.id] || ''}
                        rubricConfig={hook.rubricConfig}
                        bulkMode={hook.bulkMode}
                        isSelected={hook.selected.has(student.id)}
                        onScoreChange={hook.handleScoreChange}
                        onLevelChange={hook.handleLevelChange}
                        onClear={hook.handleClear}
                        onNoteChange={hook.handleNoteChange}
                        onCheckChange={hook.handleCheckChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Analytics Panel */}
          <UltraCBCAnalyticsPanel
            totalStudents={hook.totalStudents}
            marks={hook.markLevels as Record<number, string | null>}
            scores={hook.markScores}
            rubricConfig={hook.rubricConfig}
            subjectName={hook.subjectName}
            termName={hook.termName}
            deadlineDays={3}
            beStudentNames={hook.beStudentNames}
            trendData={TREND_DATA}
          />
        </div>
      )}
    </div>
  );
}

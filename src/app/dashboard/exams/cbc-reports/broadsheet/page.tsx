'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric, RUBRIC_COLORS } from '@/hooks/useCBCReportData';
import {
  FiGrid, FiDownload, FiPrinter, FiSearch, FiFilter,
  FiChevronDown, FiChevronUp, FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus
} from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

function RubricBadge({ level, small }: { level: string | null; small?: boolean }) {
  if (!level) return <span className="text-gray-300 text-[10px]">—</span>;
  const c = getRubricColor(level);
  return (
    <span style={{ background: c.bg, color: c.text }}
      className={`inline-flex items-center justify-center font-bold rounded ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1 min-w-[28px]'}`}>
      {level}
    </span>
  );
}

export default function CBCBroadsheetPage() {
  const data = useCBCReportData();
  const [searchQ, setSearchQ] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showTopN, setShowTopN] = useState(0);

  // Get subjects that have summaries
  const activeSubjectIds = useMemo(() => {
    const ids = new Set(data.filteredSummaries.map(s => s.subject_id));
    return data.subjects.filter(s => ids.has(s.id));
  }, [data.filteredSummaries, data.subjects]);

  // Build broadsheet rows
  const broadsheetRows = useMemo(() => {
    return data.filteredStudents.map(student => {
      const studentSummaries = data.filteredSummaries.filter(s => s.student_id === student.id);
      const subjectLevels: Record<number, { overall: string | null; formative: string | null; summative: string | null }> = {};
      let eeCount = 0, meCount = 0, aeCount = 0, beCount = 0, assessed = 0;
      let totalNumeric = 0;

      activeSubjectIds.forEach(sub => {
        const summary = studentSummaries.find(s => s.subject_id === sub.id);
        const overall = summary?.overall_level || null;
        subjectLevels[sub.id] = {
          overall,
          formative: summary?.formative_level || null,
          summative: summary?.summative_level || null,
        };
        if (overall) {
          assessed++;
          totalNumeric += rubricNumeric(overall);
          if (overall === 'EE') eeCount++;
          else if (overall === 'ME') meCount++;
          else if (overall === 'AE') aeCount++;
          else if (overall === 'BE') beCount++;
        }
      });

      const avgNumeric = assessed > 0 ? totalNumeric / assessed : 0;
      const overallLevel = avgNumeric >= 3.5 ? 'EE' : avgNumeric >= 2.5 ? 'ME' : avgNumeric >= 1.5 ? 'AE' : assessed > 0 ? 'BE' : null;

      // Previous term data for trend
      const prevSummaries = data.prevTermSummaries.filter(s => s.student_id === student.id);
      let prevTotal = 0, prevCount = 0;
      prevSummaries.forEach(s => { if (s.overall_level) { prevTotal += rubricNumeric(s.overall_level); prevCount++; } });
      const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;
      const trend = assessed > 0 && prevCount > 0 ? (avgNumeric > prevAvg ? 'up' : avgNumeric < prevAvg ? 'down' : 'flat') : null;

      return {
        student, subjectLevels, eeCount, meCount, aeCount, beCount,
        assessed, totalNumeric, avgNumeric, overallLevel, trend,
      };
    });
  }, [data.filteredStudents, data.filteredSummaries, activeSubjectIds, data.prevTermSummaries]);

  // Sort by EE count → ME count → AE count → fewest BE
  const sorted = useMemo(() => {
    let arr = [...broadsheetRows];
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      arr = arr.filter(r =>
        `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(q) ||
        (r.student.admission_no || r.student.admission_number || '').toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) => {
      if (b.eeCount !== a.eeCount) return b.eeCount - a.eeCount;
      if (b.meCount !== a.meCount) return b.meCount - a.meCount;
      if (b.aeCount !== a.aeCount) return b.aeCount - a.aeCount;
      return a.beCount - b.beCount;
    });
    // Assign ranks
    arr.forEach((row, i) => {
      if (i === 0) { (row as any).rank = 1; return; }
      const prev = arr[i - 1];
      if (row.eeCount === prev.eeCount && row.meCount === prev.meCount && row.aeCount === prev.aeCount && row.beCount === prev.beCount) {
        (row as any).rank = (prev as any).rank;
      } else {
        (row as any).rank = i + 1;
      }
    });
    if (showTopN > 0) arr = arr.slice(0, showTopN);
    return arr;
  }, [broadsheetRows, searchQ, showTopN]);

  // Subject-level stats
  const subjectStats = useMemo(() => activeSubjectIds.map(sub => {
    const levels = data.filteredSummaries
      .filter(s => s.subject_id === sub.id && s.overall_level)
      .map(s => s.overall_level!);
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    levels.forEach(l => { if (counts[l as keyof typeof counts] !== undefined) counts[l as keyof typeof counts]++; });
    const total = levels.length;
    const meAbove = counts.EE + counts.ME;
    return { subject: sub, counts, total, meAbovePct: total > 0 ? Math.round((meAbove / total) * 100) : 0 };
  }), [activeSubjectIds, data.filteredSummaries]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Rank', 'Adm No', 'Name', 'Gender', 'Stream', ...activeSubjectIds.map(s => s.subject_code || s.subject_name), 'EE', 'ME', 'AE', 'BE', 'Overall', 'Trend'];
    const rows = sorted.map(row => [
      (row as any).rank,
      row.student.admission_no || row.student.admission_number || '',
      `${row.student.first_name} ${row.student.last_name}`,
      row.student.gender || '',
      data.getStreamName(row.student.stream_id),
      ...activeSubjectIds.map(sub => row.subjectLevels[sub.id]?.overall || '—'),
      row.eeCount, row.meCount, row.aeCount, row.beCount,
      row.overallLevel || '—',
      row.trend || '—',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cbc-broadsheet-${data.currentTerm?.term_name || 'report'}.csv`; a.click();
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading CBC Broadsheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 🔍 DEBUG PANEL — remove after fixing */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-xs font-mono space-y-1">
        <p className="font-bold text-yellow-800 text-sm">🔍 DEBUG: Data Pipeline Diagnostics</p>
        <p>📋 Forms (CBC): <b>{data.forms.length}</b> | All Forms: <b>{data.allForms.length}</b></p>
        <p>👨‍🎓 Students (total): <b>{data.students.length}</b> | Filtered: <b>{data.filteredStudents.length}</b></p>
        <p>🔑 selForm: <b>"{data.selForm}"</b> | selTerm: <b>"{data.selTerm}"</b> | selStream: <b>"{data.selStream}"</b></p>
        <p>📊 Assessments (raw from DB): <b className="text-red-600">{data.assessments.length}</b></p>
        <p>📈 Summaries (computed): <b className="text-red-600">{data.summaries.length}</b></p>
        <p>📈 Filtered Summaries: <b className="text-red-600">{data.filteredSummaries.length}</b></p>
        <p>📚 Subjects: <b>{data.subjects.length}</b> | Active (w/ data): <b>{activeSubjectIds.length}</b></p>
        <p>🏫 Terms: <b>{data.terms.length}</b> | Current: <b>{data.currentTerm?.term_name || 'NONE'}</b></p>
        <p>⏳ Loading: <b>{String(data.loading)}</b> | LoadingData: <b>{String(data.loadingData)}</b></p>
        {data.assessments.length > 0 && (
          <p className="text-green-700">✅ Sample assessment: student_id={data.assessments[0].student_id}, subject_id={data.assessments[0].subject_id}, term_id={data.assessments[0].term_id}, rubric={data.assessments[0].rubric_level}, type={data.assessments[0].assessment_type}</p>
        )}
        {data.assessments.length === 0 && (
          <p className="text-red-700 font-bold">❌ ZERO assessments returned from cbc_assessments for term_id={data.selTerm}. Either wrong term or no data in table.</p>
        )}
        {data.filteredStudents.length > 0 && data.summaries.length > 0 && data.filteredSummaries.length === 0 && (
          <p className="text-red-700 font-bold">❌ Summaries exist ({data.summaries.length}) but NONE match filtered students. Student IDs may not match assessment student_ids.</p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
                <FiGrid size={16} />
              </span>
              CBC Broadsheet
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">All students × all subjects — EE/ME/AE/BE competency levels</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiPrinter size={13} /> Print
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <FiDownload size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter size={13} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Form *</label>
            <select value={data.selForm} onChange={e => { data.setSelForm(e.target.value); data.setSelStream(''); }} className="select-modern w-full text-sm">
              <option value="">All CBC Forms</option>
              {data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm">
              <option value="">All Streams</option>
              {data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Term *</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">
              <option value="">Select Term</option>
              {data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Show</label>
            <select value={showTopN} onChange={e => setShowTopN(Number(e.target.value))} className="select-modern w-full text-sm">
              <option value={0}>All Students</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative">
              <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Name or Adm..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Students', value: sorted.length, bg: '#EFF6FF', color: '#1d4ed8' },
            { label: 'Subjects', value: activeSubjectIds.length, bg: '#F5F3FF', color: '#6d28d9' },
            { label: 'EE Count', value: sorted.reduce((a, r) => a + r.eeCount, 0), bg: '#DCFCE7', color: '#15803d' },
            { label: 'ME Count', value: sorted.reduce((a, r) => a + r.meCount, 0), bg: '#DBEAFE', color: '#1d4ed8' },
            { label: 'AE Count', value: sorted.reduce((a, r) => a + r.aeCount, 0), bg: '#FEF3C7', color: '#b45309' },
            { label: 'BE Count', value: sorted.reduce((a, r) => a + r.beCount, 0), bg: '#FEE2E2', color: '#b91c1c' },
            { label: 'ME+ Rate', value: `${sorted.length > 0 ? Math.round((sorted.filter(r => r.overallLevel === 'EE' || r.overallLevel === 'ME').length / sorted.filter(r => r.overallLevel).length) * 100 || 0) : 0}%`, bg: '#ECFDF5', color: '#059669' },
            { label: 'Assessed', value: `${sorted.filter(r => r.assessed > 0).length}/${sorted.length}`, bg: '#F1F5F9', color: '#475569' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: kpi.color }}>{kpi.label}</p>
              <p className="text-lg font-black text-gray-800 mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Broadsheet Table */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading assessment data...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400">
          <FiGrid size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-lg">No data found</p>
          <p className="text-sm mt-1">Select filters and ensure CBC marks have been entered</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-blue-50">
                  <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-0 bg-indigo-50 z-10 w-10">#</th>
                  <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-10 bg-indigo-50 z-10 w-20">Adm</th>
                  <th className="px-2 py-3 text-left font-bold text-gray-500 uppercase border-b-2 border-gray-200 sticky left-[88px] bg-indigo-50 z-10 min-w-[140px]">Name</th>
                  <th className="px-1.5 py-3 text-center font-bold text-gray-400 uppercase border-b-2 border-gray-200 w-10">G</th>
                  <th className="px-1.5 py-3 text-center font-bold text-gray-400 uppercase border-b-2 border-gray-200">Stream</th>
                  {activeSubjectIds.map(sub => (
                    <th key={sub.id} className="px-1.5 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 min-w-[50px]" title={sub.subject_name}>
                      {sub.subject_code || sub.subject_name.substring(0, 4)}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-bold text-green-700 uppercase border-b-2 border-green-200 bg-green-50 w-10">EE</th>
                  <th className="px-2 py-3 text-center font-bold text-blue-700 uppercase border-b-2 border-blue-200 bg-blue-50 w-10">ME</th>
                  <th className="px-2 py-3 text-center font-bold text-amber-700 uppercase border-b-2 border-amber-200 bg-amber-50 w-10">AE</th>
                  <th className="px-2 py-3 text-center font-bold text-red-700 uppercase border-b-2 border-red-200 bg-red-50 w-10">BE</th>
                  <th className="px-2 py-3 text-center font-bold text-purple-700 uppercase border-b-2 border-purple-200 bg-purple-50 w-14">Overall</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-10">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const isExpanded = expandedId === row.student.id;
                  return (
                    <> 
                      <tr key={row.student.id}
                        className={`border-b border-gray-100 cursor-pointer transition-colors
                          ${i % 2 === 0 ? 'hover:bg-indigo-50/30' : 'bg-gray-50/30 hover:bg-indigo-50/30'}
                          ${(row as any).rank === 1 ? 'bg-amber-50/40' : ''}
                        `}
                        onClick={() => setExpandedId(isExpanded ? null : row.student.id)}
                      >
                        <td className="px-2 py-2.5 text-center sticky left-0 bg-inherit z-10">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold
                            ${(row as any).rank === 1 ? 'bg-amber-400 text-white' : (row as any).rank === 2 ? 'bg-gray-400 text-white' : (row as any).rank === 3 ? 'bg-orange-400 text-white' : 'text-gray-600'}`}>
                            {(row as any).rank}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 font-mono text-blue-600 font-bold sticky left-10 bg-inherit z-10 text-[10px]">
                          {row.student.admission_no || row.student.admission_number || '—'}
                        </td>
                        <td className="px-2 py-2.5 font-semibold text-gray-800 sticky left-[88px] bg-inherit z-10 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.student.gender === 'Male' || row.student.gender === 'M' ? 'bg-blue-400' : 'bg-pink-400'}`} />
                            {row.student.first_name} {row.student.last_name}
                            {isExpanded ? <FiChevronUp size={10} className="text-gray-400 ml-1" /> : <FiChevronDown size={10} className="text-gray-300 ml-1" />}
                          </div>
                        </td>
                        <td className="px-1 py-2.5 text-center text-[10px] text-gray-400">
                          {(row.student.gender === 'Male' || row.student.gender === 'M') ? 'M' : 'F'}
                        </td>
                        <td className="px-1 py-2.5 text-center text-[10px] text-gray-500">
                          {data.getStreamName(row.student.stream_id)}
                        </td>
                        {activeSubjectIds.map(sub => (
                          <td key={sub.id} className="px-1 py-2.5 text-center">
                            <RubricBadge level={row.subjectLevels[sub.id]?.overall || null} small />
                          </td>
                        ))}
                        <td className="px-2 py-2.5 text-center font-extrabold text-green-700 bg-green-50/50">{row.eeCount || '—'}</td>
                        <td className="px-2 py-2.5 text-center font-extrabold text-blue-700 bg-blue-50/50">{row.meCount || '—'}</td>
                        <td className="px-2 py-2.5 text-center font-extrabold text-amber-700 bg-amber-50/50">{row.aeCount || '—'}</td>
                        <td className="px-2 py-2.5 text-center font-extrabold text-red-700 bg-red-50/50">{row.beCount || '—'}</td>
                        <td className="px-2 py-2.5 text-center bg-purple-50/50"><RubricBadge level={row.overallLevel} /></td>
                        <td className="px-2 py-2.5 text-center">
                          {row.trend === 'up' ? <FiTrendingUp size={14} className="mx-auto text-green-500" /> :
                           row.trend === 'down' ? <FiTrendingDown size={14} className="mx-auto text-red-500" /> :
                           row.trend === 'flat' ? <FiMinus size={14} className="mx-auto text-gray-400" /> :
                           <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.student.id}-detail`} className="bg-indigo-50/60 border-b border-indigo-100">
                          <td colSpan={6 + activeSubjectIds.length + 6} className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-semibold text-gray-600">Formative vs Summative breakdown:</span>
                              {activeSubjectIds.map(sub => {
                                const sl = row.subjectLevels[sub.id];
                                if (!sl?.overall) return null;
                                return (
                                  <div key={sub.id} className="bg-white rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs">
                                    <div className="font-semibold text-gray-700">{sub.subject_code || sub.subject_name.substring(0, 6)}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-gray-400">F:</span><RubricBadge level={sl.formative} small />
                                      <span className="text-[9px] text-gray-400">S:</span><RubricBadge level={sl.summative} small />
                                      <span className="text-[9px] text-gray-400">→</span><RubricBadge level={sl.overall} small />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              {/* Footer: Subject averages */}
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-3 py-3 text-xs font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">SUBJECT DISTRIBUTION</td>
                  {subjectStats.map(ss => (
                    <td key={ss.subject.id} className="px-1 py-3 text-center">
                      <div className="text-[9px] text-gray-500">{ss.meAbovePct}% ME+</div>
                    </td>
                  ))}
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

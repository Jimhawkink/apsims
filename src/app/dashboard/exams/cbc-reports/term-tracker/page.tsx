'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiTrendingUp, FiArrowLeft, FiDownload, FiSearch } from 'react-icons/fi';

export default function CBCTermTrackerPage() {
  const data = useCBCReportData();
  const [searchQ, setSearchQ] = useState('');
  const [selSubject, setSelSubject] = useState('');

  // Build heatmap data: student × term × subject
  const heatmapData = useMemo(() => {
    const termIds = data.terms.map(t => t.id).reverse(); // chronological order
    const activeSubjectIds = [...new Set(data.allTermSummaries.map(s => s.subject_id))];
    const subjectFilter = selSubject ? [Number(selSubject)] : activeSubjectIds;

    return data.filteredStudents.map(student => {
      const termData = termIds.map(termId => {
        const sums = data.allTermSummaries.filter(s => s.student_id === student.id && s.term_id === termId && subjectFilter.includes(s.subject_id));
        const levels = sums.filter(s => s.overall_level).map(s => ({ subjectId: s.subject_id, level: s.overall_level! }));
        const avgNum = levels.length > 0 ? levels.reduce((a, l) => a + rubricNumeric(l.level), 0) / levels.length : 0;
        const overallLevel = avgNum >= 3.5 ? 'EE' : avgNum >= 2.5 ? 'ME' : avgNum >= 1.5 ? 'AE' : levels.length > 0 ? 'BE' : null;
        return { termId, levels, overallLevel, avgNum, assessed: levels.length };
      });

      // Calculate term-over-term changes
      const changes = termData.map((td, i) => {
        if (i === 0 || !td.overallLevel || !termData[i - 1].overallLevel) return { ...td, change: null as string | null };
        const diff = td.avgNum - termData[i - 1].avgNum;
        return { ...td, change: diff > 0.3 ? 'improved' : diff < -0.3 ? 'declined' : 'stable' };
      });

      return { student, termData: changes };
    }).filter(r => {
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        return `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data.filteredStudents, data.allTermSummaries, data.terms, searchQ, selSubject]);

  const termIds = useMemo(() => data.terms.map(t => t.id).reverse(), [data.terms]);

  // Summary stats
  const summary = useMemo(() => {
    let improved = 0, declined = 0, stable = 0;
    heatmapData.forEach(row => {
      row.termData.forEach(td => {
        if (td.change === 'improved') improved++;
        else if (td.change === 'declined') declined++;
        else if (td.change === 'stable') stable++;
      });
    });
    return { improved, declined, stable };
  }, [heatmapData]);

  const getCellStyle = (level: string | null, change: string | null) => {
    if (!level) return { background: '#F9FAFB', color: '#D1D5DB' };
    const c = getRubricColor(level);
    if (change === 'improved') return { background: '#DCFCE7', color: '#15803D', border: '2px solid #86EFAC' };
    if (change === 'declined') return { background: '#FEE2E2', color: '#991B1B', border: '2px solid #FCA5A5' };
    return { background: c.light, color: c.bg };
  };

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white"><FiTrendingUp size={16} /></span>
              Term-over-Term Progress Tracker
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Visual heatmap of every student across all terms. Green = improved, Red = declined.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Subject</label>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="select-modern w-full text-sm"><option value="">All Subjects</option>{data.subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative"><FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-teal-100" /></div></div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400" />Improved</div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-sm bg-red-200 border border-red-400" />Declined</div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />Stable</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4"><p className="text-[10px] font-bold text-green-700 uppercase">Improvements</p><p className="text-2xl font-black text-green-700">{summary.improved}</p></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4"><p className="text-[10px] font-bold text-red-700 uppercase">Declines</p><p className="text-2xl font-black text-red-700">{summary.declined}</p></div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold text-gray-600 uppercase">Stable</p><p className="text-2xl font-black text-gray-700">{summary.stable}</p></div>
      </div>

      {/* Heatmap Table */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>
      ) : heatmapData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400">
          <FiTrendingUp size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No tracking data available</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b-2 border-gray-200">
                  <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase sticky left-0 bg-teal-50 z-10 min-w-[180px]">Student</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase w-16">Stream</th>
                  {termIds.map(tid => (
                    <th key={tid} className="px-3 py-3 text-center font-bold text-gray-500 uppercase min-w-[80px]">{data.getTermName(tid)}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase min-w-[80px]">Trajectory</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row, i) => {
                  // Overall trajectory
                  const first = row.termData.find(t => t.overallLevel);
                  const last = [...row.termData].reverse().find(t => t.overallLevel);
                  const trajectory = first && last && first !== last
                    ? (last.avgNum > first.avgNum ? '↗ Improving' : last.avgNum < first.avgNum ? '↘ Declining' : '→ Stable')
                    : '—';
                  const trajColor = trajectory.includes('Improving') ? '#15803d' : trajectory.includes('Declining') ? '#b91c1c' : '#6b7280';

                  return (
                    <tr key={row.student.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-3 py-2.5 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${row.student.gender === 'Male' || row.student.gender === 'M' ? 'bg-blue-400' : 'bg-pink-400'}`} />
                          <span className="font-semibold text-gray-800">{row.student.first_name} {row.student.last_name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{row.student.admission_no || row.student.admission_number}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-[10px] text-gray-500">{data.getStreamName(row.student.stream_id)}</td>
                      {row.termData.map((td, idx) => {
                        const style = getCellStyle(td.overallLevel, td.change);
                        return (
                          <td key={idx} className="px-2 py-2.5 text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold transition-all hover:scale-110 cursor-default"
                              style={style} title={`${data.getTermName(td.termId)}: ${td.overallLevel || 'N/A'}${td.change ? ` (${td.change})` : ''}`}>
                              {td.overallLevel || '—'}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-bold" style={{ color: trajColor }}>{trajectory}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

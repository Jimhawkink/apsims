'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiAward, FiDownload, FiPrinter, FiSearch, FiFilter, FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

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

export default function CBCMeritListPage() {
  const data = useCBCReportData();
  const [searchQ, setSearchQ] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [showTopN, setShowTopN] = useState(0);
  const [viewMode, setViewMode] = useState<'combined' | 'gender'>('combined');

  // Build merit rows
  const meritRows = useMemo(() => {
    const activeSubjectIds = new Set(data.filteredSummaries.map(s => s.subject_id));
    return data.filteredStudents.map(student => {
      const studentSummaries = data.filteredSummaries.filter(s => s.student_id === student.id);
      let eeCount = 0, meCount = 0, aeCount = 0, beCount = 0, assessed = 0, totalNumeric = 0;

      studentSummaries.forEach(s => {
        if (s.overall_level && activeSubjectIds.has(s.subject_id)) {
          assessed++;
          totalNumeric += rubricNumeric(s.overall_level);
          if (s.overall_level === 'EE') eeCount++;
          else if (s.overall_level === 'ME') meCount++;
          else if (s.overall_level === 'AE') aeCount++;
          else if (s.overall_level === 'BE') beCount++;
        }
      });

      const avgNumeric = assessed > 0 ? totalNumeric / assessed : 0;
      const overallLevel = avgNumeric >= 3.5 ? 'EE' : avgNumeric >= 2.5 ? 'ME' : avgNumeric >= 1.5 ? 'AE' : assessed > 0 ? 'BE' : null;

      // Prev term
      const prev = data.prevTermSummaries.filter(s => s.student_id === student.id);
      let prevTotal = 0, prevCount = 0;
      prev.forEach(s => { if (s.overall_level) { prevTotal += rubricNumeric(s.overall_level); prevCount++; } });
      const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;
      const trend = assessed > 0 && prevCount > 0 ? (avgNumeric > prevAvg ? 'up' : avgNumeric < prevAvg ? 'down' : 'flat') : null;

      return { student, eeCount, meCount, aeCount, beCount, assessed, totalNumeric, avgNumeric, overallLevel, trend };
    }).filter(r => r.assessed > 0);
  }, [data.filteredStudents, data.filteredSummaries, data.prevTermSummaries]);

  // Sort: EE count desc → ME count desc → AE count desc → BE count asc
  const rankStudents = (rows: typeof meritRows) => {
    const arr = [...rows].sort((a, b) => {
      if (b.eeCount !== a.eeCount) return b.eeCount - a.eeCount;
      if (b.meCount !== a.meCount) return b.meCount - a.meCount;
      if (b.aeCount !== a.aeCount) return b.aeCount - a.aeCount;
      return a.beCount - b.beCount;
    });
    arr.forEach((row, i) => {
      if (i === 0) { (row as any).rank = 1; return; }
      const prev = arr[i - 1];
      (row as any).rank = (row.eeCount === prev.eeCount && row.meCount === prev.meCount && row.aeCount === prev.aeCount && row.beCount === prev.beCount) ? (prev as any).rank : i + 1;
    });
    return arr;
  };

  const filtered = useMemo(() => {
    let arr = meritRows;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      arr = arr.filter(r => `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(q));
    }
    if (genderFilter) arr = arr.filter(r => r.student.gender === genderFilter);
    return arr;
  }, [meritRows, searchQ, genderFilter]);

  const combined = useMemo(() => {
    const ranked = rankStudents(filtered);
    return showTopN > 0 ? ranked.slice(0, showTopN) : ranked;
  }, [filtered, showTopN]);

  const boys = useMemo(() => rankStudents(meritRows.filter(r => r.student.gender === 'Male' || r.student.gender === 'M')), [meritRows]);
  const girls = useMemo(() => rankStudents(meritRows.filter(r => r.student.gender === 'Female' || r.student.gender === 'F')), [meritRows]);

  const exportCSV = () => {
    const headers = ['Position', 'Adm No', 'Name', 'Gender', 'Stream', 'EE', 'ME', 'AE', 'BE', 'Overall', 'Trend'];
    const rows = combined.map(r => [
      (r as any).rank, r.student.admission_no || r.student.admission_number || '',
      `${r.student.first_name} ${r.student.last_name}`, r.student.gender || '',
      data.getStreamName(r.student.stream_id), r.eeCount, r.meCount, r.aeCount, r.beCount, r.overallLevel || '', r.trend || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cbc-merit-list-${data.currentTerm?.term_name || 'report'}.csv`; a.click();
  };

  const renderTable = (rows: typeof combined, title: string) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">{rows.length} students</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-gray-200">
              <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase w-12">Pos</th>
              <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase w-20">Adm</th>
              <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase min-w-[160px]">Student Name</th>
              <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase w-10">G</th>
              <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase">Stream</th>
              <th className="px-2 py-3 text-center font-bold text-green-700 uppercase bg-green-50">EE</th>
              <th className="px-2 py-3 text-center font-bold text-blue-700 uppercase bg-blue-50">ME</th>
              <th className="px-2 py-3 text-center font-bold text-amber-700 uppercase bg-amber-50">AE</th>
              <th className="px-2 py-3 text-center font-bold text-red-700 uppercase bg-red-50">BE</th>
              <th className="px-2 py-3 text-center font-bold text-purple-700 uppercase bg-purple-50">Overall</th>
              <th className="px-2 py-3 text-center font-bold text-gray-500 uppercase w-12">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.student.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}
                ${(row as any).rank === 1 ? 'bg-amber-50/50' : (row as any).rank === 2 ? 'bg-gray-50/40' : (row as any).rank === 3 ? 'bg-orange-50/30' : ''}`}>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                    ${(row as any).rank === 1 ? 'bg-amber-400 text-white shadow-md' :
                      (row as any).rank === 2 ? 'bg-gray-400 text-white' :
                      (row as any).rank === 3 ? 'bg-orange-400 text-white' : 'text-gray-600 bg-gray-100'}`}>
                    {(row as any).rank}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-blue-600 font-bold text-[10px]">{row.student.admission_no || row.student.admission_number}</td>
                <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${row.student.gender === 'Male' || row.student.gender === 'M' ? 'bg-blue-400' : 'bg-pink-400'}`} />
                    {row.student.first_name} {row.student.last_name}
                    {(row as any).rank <= 3 && <span className="text-amber-500 ml-1">{(row as any).rank === 1 ? '🥇' : (row as any).rank === 2 ? '🥈' : '🥉'}</span>}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-[10px] text-gray-400">{(row.student.gender === 'Male' || row.student.gender === 'M') ? 'M' : 'F'}</td>
                <td className="px-2 py-2.5 text-center text-[10px] text-gray-500">{data.getStreamName(row.student.stream_id)}</td>
                <td className="px-2 py-2.5 text-center font-extrabold text-green-700 bg-green-50/50">{row.eeCount}</td>
                <td className="px-2 py-2.5 text-center font-extrabold text-blue-700 bg-blue-50/50">{row.meCount}</td>
                <td className="px-2 py-2.5 text-center font-extrabold text-amber-700 bg-amber-50/50">{row.aeCount}</td>
                <td className="px-2 py-2.5 text-center font-extrabold text-red-700 bg-red-50/50">{row.beCount}</td>
                <td className="px-2 py-2.5 text-center bg-purple-50/50"><RubricBadge level={row.overallLevel} /></td>
                <td className="px-2 py-2.5 text-center">
                  {row.trend === 'up' ? <FiTrendingUp size={14} className="mx-auto text-green-500" /> :
                   row.trend === 'down' ? <FiTrendingDown size={14} className="mx-auto text-red-500" /> :
                   <FiMinus size={14} className="mx-auto text-gray-400" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white"><FiAward size={16} /></span>
              CBC Merit List / Ranking
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Students ranked by EE → ME → AE count with gender split</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"><FiPrinter size={13} /> Print</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FiDownload size={13} /> Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm">
              <option value="">All CBC Forms</option>
              {data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm">
              <option value="">All</option>
              {data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">
              {data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Gender</label>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="select-modern w-full text-sm">
              <option value="">All</option>
              <option value="Male">Boys</option>
              <option value="Female">Girls</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Show</label>
            <select value={showTopN} onChange={e => setShowTopN(Number(e.target.value))} className="select-modern w-full text-sm">
              <option value={0}>All</option><option value={5}>Top 5</option><option value={10}>Top 10</option><option value={20}>Top 20</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">View</label>
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {(['combined', 'gender'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${viewMode === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                  {v === 'combined' ? 'Combined' : 'By Gender'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tables */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading...</p></div>
      ) : viewMode === 'combined' ? (
        renderTable(combined, `Overall Merit List — ${data.currentTerm?.term_name || ''}`)
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {renderTable(boys, `Boys Merit List (${boys.length})`)}
          {renderTable(girls, `Girls Merit List (${girls.length})`)}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiUsers, FiArrowLeft, FiDownload, FiAlertTriangle } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function GenderEquityPage() {
  const data = useCBCReportData();

  const equityData = useMemo(() => {
    const subjectIds = [...new Set(data.filteredSummaries.map(s => s.subject_id))];
    return subjectIds.map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;

      const analyze = (gender: string) => {
        const genderStudentIds = new Set(data.filteredStudents.filter(s => s.gender === gender || s.gender === gender.charAt(0)).map(s => s.id));
        const sums = data.filteredSummaries.filter(s => s.subject_id === subjectId && genderStudentIds.has(s.student_id) && s.overall_level);
        const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
        let totalNum = 0;
        sums.forEach(s => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
        const total = sums.length;
        const avg = total > 0 ? totalNum / total : 0;
        const meAbovePct = total > 0 ? Math.round(((counts.EE + counts.ME) / total) * 100) : 0;
        return { total, counts, avg, meAbovePct };
      };

      const boys = analyze('Male');
      const girls = analyze('Female');
      const gapNum = Math.abs(boys.avg - girls.avg);
      const gapDirection = boys.avg > girls.avg ? 'boys_lead' : boys.avg < girls.avg ? 'girls_lead' : 'equal';
      const hasGap = gapNum >= 0.5;

      return { subject, boys, girls, gapNum, gapDirection, hasGap };
    }).filter(Boolean).sort((a: any, b: any) => b.gapNum - a.gapNum);
  }, [data.filteredSummaries, data.filteredStudents, data.subjects]);

  // Stream equity
  const streamEquity = useMemo(() => {
    return data.streams.map(stream => {
      const streamStudentIds = new Set(data.filteredStudents.filter(s => String(s.stream_id) === String(stream.id)).map(s => s.id));
      const sums = data.filteredSummaries.filter(s => streamStudentIds.has(s.student_id) && s.overall_level);
      if (sums.length === 0) return null;
      let totalNum = 0;
      const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      sums.forEach(s => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
      const avg = totalNum / sums.length;
      const meAbovePct = Math.round(((counts.EE + counts.ME) / sums.length) * 100);
      return { stream, total: sums.length, counts, avg, meAbovePct, studentCount: streamStudentIds.size };
    }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
  }, [data.streams, data.filteredStudents, data.filteredSummaries]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white"><FiUsers size={16} /></span>
            Gender & Stream Equity Report
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Side-by-side EE/ME/AE/BE by gender per subject. Spots systemic gaps. TSC compliant.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* Gender comparison per subject */}
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Gender Equity by Subject</h2>
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto" /></div>
      ) : equityData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><p className="font-semibold">No data available</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {equityData.map((eq: any) => (
            <div key={eq.subject.id} className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${eq.hasGap ? 'border-amber-300' : 'border-gray-200'}`}>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{eq.subject.subject_name}</h3>
                {eq.hasGap && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold flex items-center gap-1">
                    <FiAlertTriangle size={9} /> Gender Gap Detected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {[{ label: '♂ Boys', data: eq.boys, color: '#3B82F6' }, { label: '♀ Girls', data: eq.girls, color: '#EC4899' }].map(side => (
                  <div key={side.label} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: side.color }}>{side.label} ({side.data.total})</span>
                      <span className={`text-xs font-black ${side.data.meAbovePct >= 60 ? 'text-green-600' : side.data.meAbovePct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{side.data.meAbovePct}% ME+</span>
                    </div>
                    <div className="flex h-5 rounded-full overflow-hidden mb-1.5">
                      {LEVELS.map(level => {
                        const cnt = side.data.counts[level] || 0;
                        const w = side.data.total > 0 ? (cnt / side.data.total) * 100 : 0;
                        if (w === 0) return null;
                        const rc = getRubricColor(level);
                        return <div key={level} style={{ width: `${w}%`, background: rc.bg }} className="flex items-center justify-center text-white text-[8px] font-bold" title={`${level}: ${cnt}`}>{w > 10 ? cnt : ''}</div>;
                      })}
                    </div>
                    <div className="flex gap-2">
                      {LEVELS.map(level => {
                        const rc = getRubricColor(level);
                        return <span key={level} className="text-[9px] text-gray-500"><span className="inline-block w-2 h-2 rounded-sm mr-0.5" style={{ background: rc.bg }} />{level}:{side.data.counts[level]||0}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {eq.hasGap && (
                <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 text-[10px] font-medium text-amber-700">
                  📊 {eq.gapDirection === 'boys_lead' ? 'Boys outperform girls' : 'Girls outperform boys'} by {eq.gapNum.toFixed(1)} competency points. Consider targeted support.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stream Comparison */}
      {streamEquity.length > 1 && (
        <>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mt-6">Stream Equity Comparison</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streamEquity.map((se: any, idx: number) => {
              const c = se.avg >= 3 ? '#15803d' : se.avg >= 2 ? '#1d4ed8' : '#b91c1c';
              return (
                <div key={se.stream.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-400' : 'bg-gray-400'}`}>{idx + 1}</span>
                      <div><h3 className="text-sm font-bold text-gray-800">{se.stream.stream_name}</h3><p className="text-[10px] text-gray-400">{se.studentCount} students</p></div>
                    </div>
                    <span className="text-lg font-black" style={{ color: c }}>{se.meAbovePct}%<span className="text-[10px] text-gray-400 font-normal ml-0.5">ME+</span></span>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {LEVELS.map(level => {
                      const cnt = se.counts[level] || 0;
                      const w = se.total > 0 ? (cnt / se.total) * 100 : 0;
                      if (w === 0) return null;
                      const rc = getRubricColor(level);
                      return <div key={level} style={{ width: `${w}%`, background: rc.bg }} className="flex items-center justify-center text-white text-[7px] font-bold">{w > 8 ? level : ''}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

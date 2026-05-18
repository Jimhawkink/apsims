'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiColumns, FiArrowLeft } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function StreamComparisonPage() {
  const data = useCBCReportData();

  const comparison = useMemo(() => {
    const subjectIds = [...new Set(data.summaries.map(s => s.subject_id))];
    return subjectIds.map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;
      const streamData = data.streams.map(stream => {
        const studentIds = new Set(data.students.filter(s => String(s.stream_id) === String(stream.id)).map(s => s.id));
        const sums = data.summaries.filter(s => s.subject_id === subjectId && studentIds.has(s.student_id) && s.overall_level);
        if (sums.length === 0) return null;
        let totalNum = 0;
        const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
        sums.forEach(s => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
        const avg = totalNum / sums.length;
        const meAbovePct = Math.round(((counts.EE + counts.ME) / sums.length) * 100);
        return { stream, total: sums.length, avg, meAbovePct, counts };
      }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
      return { subject, streamData };
    }).filter(Boolean);
  }, [data.summaries, data.subjects, data.streams, data.students]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div><h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white"><FiColumns size={16} /></span>Stream Comparison</h1>
          <p className="text-xs text-gray-500 mt-0.5">Side-by-side performance across streams in same form. Which stream leads?</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
      </div></div>
      {data.loadingData ? <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" /></div> :
      comparison.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><p className="font-semibold">No data</p></div> :
      <div className="space-y-4">{comparison.map((comp: any) => (
        <div key={comp.subject.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-800">{comp.subject.subject_name}</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-gray-100">{comp.streamData.map((sd: any, idx: number) => (
            <div key={sd.stream.id} className={`px-4 py-3 ${idx === 0 ? 'bg-green-50/30' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${idx === 0 ? 'bg-amber-400' : 'bg-gray-400'}`}>{idx + 1}</span>
                  <span className="text-xs font-bold text-gray-800">{sd.stream.stream_name}</span>
                </div>
                <span className={`text-sm font-black ${sd.meAbovePct >= 70 ? 'text-green-600' : sd.meAbovePct >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{sd.meAbovePct}%</span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden">{LEVELS.map(level => {
                const cnt = sd.counts[level] || 0; const w = sd.total > 0 ? (cnt / sd.total) * 100 : 0;
                if (w === 0) return null; const rc = getRubricColor(level);
                return <div key={level} style={{ width: `${w}%`, background: rc.bg }} className="flex items-center justify-center text-white text-[7px] font-bold">{w > 10 ? level : ''}</div>;
              })}</div>
              <p className="text-[10px] text-gray-400 mt-1">{sd.total} students assessed</p>
            </div>
          ))}</div>
        </div>
      ))}</div>}
    </div>
  );
}

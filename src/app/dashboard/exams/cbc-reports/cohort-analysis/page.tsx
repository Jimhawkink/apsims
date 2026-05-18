'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiLayers, FiArrowLeft } from 'react-icons/fi';

export default function CohortAnalysisPage() {
  const data = useCBCReportData();

  const cohortData = useMemo(() => {
    const termIds = data.terms.map(t => t.id).reverse();
    const subjectIds = [...new Set(data.allTermSummaries.map(s => s.subject_id))];

    return subjectIds.map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;

      const termStats = termIds.map(termId => {
        const sums = data.allTermSummaries.filter(s => s.subject_id === subjectId && s.term_id === termId && s.overall_level && data.filteredStudentIds.has(s.student_id));
        const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
        let totalNum = 0;
        sums.forEach(s => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
        const total = sums.length;
        const avg = total > 0 ? totalNum / total : 0;
        const meAbovePct = total > 0 ? Math.round(((counts.EE + counts.ME) / total) * 100) : 0;
        return { termId, total, counts, avg, meAbovePct };
      });

      const firstTerm = termStats.find(t => t.total > 0);
      const lastTerm = [...termStats].reverse().find(t => t.total > 0);
      const valueAdd = firstTerm && lastTerm && firstTerm !== lastTerm ? lastTerm.avg - firstTerm.avg : 0;

      return { subject, termStats, valueAdd };
    }).filter(Boolean).sort((a: any, b: any) => b.valueAdd - a.valueAdd);
  }, [data.allTermSummaries, data.subjects, data.terms, data.filteredStudentIds]);

  const termIds = useMemo(() => data.terms.map(t => t.id).reverse(), [data.terms]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white"><FiLayers size={16} /></span>
            Longitudinal Cohort Analysis
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">New ground</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tracks cohort subject-by-subject, term-by-term. True value-add measurement for board reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        </div>
      </div>

      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>
      ) : cohortData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiLayers size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No longitudinal data available</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase sticky left-0 bg-teal-50 z-10 min-w-[140px]">Subject</th>
                  {termIds.map(tid => (
                    <th key={tid} colSpan={2} className="px-2 py-3 text-center font-bold text-gray-500 uppercase border-l border-gray-200">{data.getTermName(tid)}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase bg-indigo-50 border-l border-gray-200">Value Add</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 z-10" />
                  {termIds.map(tid => (
                    <> 
                      <th key={`${tid}-me`} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400 uppercase border-l border-gray-100">ME+ %</th>
                      <th key={`${tid}-n`} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400 uppercase">N</th>
                    </>
                  ))}
                  <th className="bg-indigo-50 border-l border-gray-200" />
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row: any, i: number) => (
                  <tr key={row.subject.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800 sticky left-0 bg-inherit z-10">{row.subject.subject_name}</td>
                    {row.termStats.map((ts: any, idx: number) => (
                      <> 
                        <td key={`${ts.termId}-me`} className={`px-2 py-3 text-center font-bold border-l border-gray-100 ${ts.meAbovePct >= 70 ? 'text-green-600' : ts.meAbovePct >= 50 ? 'text-blue-600' : ts.meAbovePct > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                          {ts.total > 0 ? `${ts.meAbovePct}%` : '—'}
                        </td>
                        <td key={`${ts.termId}-n`} className="px-2 py-3 text-center text-gray-400">{ts.total || '—'}</td>
                      </>
                    ))}
                    <td className="px-3 py-3 text-center bg-indigo-50/50 border-l border-gray-200">
                      <span className={`text-sm font-black ${row.valueAdd > 0.3 ? 'text-green-600' : row.valueAdd < -0.3 ? 'text-red-600' : 'text-gray-500'}`}>
                        {row.valueAdd > 0 ? '+' : ''}{row.valueAdd.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">Value Add = change in mean competency numeric from first available term to latest. Positive = improvement over time.</p>
          </div>
        </div>
      )}
    </div>
  );
}

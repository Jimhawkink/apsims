'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiLayers, FiArrowLeft, FiTrendingUp, FiTrendingDown, FiMinus, FiDownload, FiBarChart2, FiActivity } from 'react-icons/fi';

const LEVEL_COLORS = {
  EE: { text: '#059669', bg: '#D1FAE5', border: '#6EE7B7', dark: '#047857' },
  ME: { text: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', dark: '#1D4ED8' },
  AE: { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D', dark: '#B45309' },
  BE: { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', dark: '#B91C1C' },
};

function TrendIcon({ valueAdd }: { valueAdd: number }) {
  if (valueAdd > 0.3) return <FiTrendingUp size={14} className="text-green-500" />;
  if (valueAdd < -0.3) return <FiTrendingDown size={14} className="text-red-500" />;
  return <FiMinus size={14} className="text-gray-400" />;
}

function MiniBarChart({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
    </div>
  );
}

export default function CohortAnalysisPage() {
  const data = useCBCReportData();
  const [sortBy, setSortBy] = useState<'valueAdd' | 'name' | 'meRate'>('valueAdd');

  const termIds = useMemo(() => data.terms.map((t: any) => t.id).reverse(), [data.terms]);

  const cohortData = useMemo(() => {
    const subjectIds = [...new Set(data.allTermSummaries.map((s: any) => s.subject_id))];
    return subjectIds.map(subjectId => {
      const subject = data.subjects.find((s: any) => s.id === subjectId);
      if (!subject) return null;
      const termStats = termIds.map(termId => {
        const sums = data.allTermSummaries.filter((s: any) =>
          s.subject_id === subjectId && s.term_id === termId && s.overall_level && data.filteredStudentIds.has(s.student_id)
        );
        const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
        let totalNum = 0;
        sums.forEach((s: any) => {
          counts[s.overall_level]++;
          totalNum += rubricNumeric(s.overall_level);
        });
        const total = sums.length;
        const avg = total > 0 ? totalNum / total : 0;
        const meAbovePct = total > 0 ? Math.round(((counts.EE + counts.ME) / total) * 100) : 0;
        return { termId, total, counts, avg, meAbovePct };
      });
      const firstTerm = termStats.find(t => t.total > 0);
      const lastTerm = [...termStats].reverse().find(t => t.total > 0);
      const valueAdd = firstTerm && lastTerm && firstTerm !== lastTerm ? lastTerm.avg - firstTerm.avg : 0;
      const latestTerm = termStats.slice().reverse().find(t => t.total > 0);
      return { subject, termStats, valueAdd, latestMeRate: latestTerm?.meAbovePct || 0 };
    }).filter(Boolean).sort((a: any, b: any) => {
      if (sortBy === 'name') return a.subject.subject_name.localeCompare(b.subject.subject_name);
      if (sortBy === 'meRate') return b.latestMeRate - a.latestMeRate;
      return b.valueAdd - a.valueAdd;
    });
  }, [data.allTermSummaries, data.subjects, data.terms, data.filteredStudentIds, termIds, sortBy]);

  // Summary KPIs
  const summary = useMemo(() => {
    const improving = cohortData.filter((r: any) => r.valueAdd > 0.3).length;
    const declining = cohortData.filter((r: any) => r.valueAdd < -0.3).length;
    const stable = cohortData.length - improving - declining;
    const avgMeRate = cohortData.length > 0
      ? Math.round(cohortData.reduce((a: number, r: any) => a + r.latestMeRate, 0) / cohortData.length)
      : 0;
    return { improving, declining, stable, avgMeRate };
  }, [cohortData]);

  const exportCSV = () => {
    const headers = ['Subject', ...termIds.map((tid: any) => `${data.getTermName(tid)} ME+%`), 'Value Add', 'Trend'];
    const rows = cohortData.map((row: any) => [
      row.subject.subject_name,
      ...row.termStats.map((ts: any) => ts.total > 0 ? `${ts.meAbovePct}%` : '—'),
      row.valueAdd > 0 ? `+${row.valueAdd.toFixed(2)}` : row.valueAdd.toFixed(2),
      row.valueAdd > 0.3 ? 'Improving' : row.valueAdd < -0.3 ? 'Declining' : 'Stable',
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'Cohort_Analysis.csv'; a.click();
  };

  if (data.loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading cohort data…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-cyan-50/20 p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports"
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-all">
            <FiArrowLeft size={16} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
            <FiLayers className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">Longitudinal Cohort Analysis</h1>
            <p className="text-xs text-gray-500">Track subject growth term-by-term · True value-add measurement for KICD reporting</p>
          </div>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium shadow-sm transition-all">
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">All Forms</option>
              {data.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">All Streams</option>
              {data.streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-semibold text-gray-500">Sort by</label>
            <div className="flex gap-1">
              {[
                { key: 'valueAdd', label: 'Value Add' },
                { key: 'meRate', label: 'ME+ Rate' },
                { key: 'name', label: 'Name' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setSortBy(opt.key as any)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${sortBy === opt.key ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Improving Subjects', value: summary.improving, icon: <FiTrendingUp />, color: '#059669', bg: '#D1FAE5', desc: 'Value add > +0.3' },
          { label: 'Stable Subjects', value: summary.stable, icon: <FiMinus />, color: '#6366F1', bg: '#EEF2FF', desc: 'Within ±0.3' },
          { label: 'Declining Subjects', value: summary.declining, icon: <FiTrendingDown />, color: '#DC2626', bg: '#FEE2E2', desc: 'Value add < -0.3' },
          { label: 'Avg ME+ Rate', value: `${summary.avgMeRate}%`, icon: <FiBarChart2 />, color: '#2563EB', bg: '#DBEAFE', desc: 'Latest term' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: kpi.bg, color: kpi.color }}>
              {kpi.icon}
            </div>
            <p className="text-2xl font-black text-gray-800">{kpi.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Cohort table */}
      {data.loadingData ? (
        <div className="bg-white rounded-2xl border text-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : cohortData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-16">
          <FiLayers size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No longitudinal data yet</p>
          <p className="text-xs text-gray-400 mt-1">Enter CBC marks across multiple terms to see cohort trends</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiActivity size={16} className="text-teal-600" />
                <span className="font-bold text-gray-800">Subject-by-Subject Cohort Trend</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cohortData.length} subjects</span>
              </div>
              <div className="flex gap-2 text-[10px]">
                {Object.entries(LEVEL_COLORS).map(([k, c]) => (
                  <span key={k} className="px-1.5 py-0.5 rounded font-bold" style={{ color: c.text, background: c.bg }}>{k}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase sticky left-0 bg-gradient-to-r from-teal-50 to-cyan-50 z-10 min-w-[160px]">Subject</th>
                  {termIds.map((tid: any) => (
                    <th key={tid} colSpan={2} className="px-2 py-3 text-center font-bold text-gray-600 uppercase border-l border-gray-200">
                      {data.getTermName(tid)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase bg-indigo-50 border-l border-gray-200">Value Add</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase bg-indigo-50">Trend</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 z-10" />
                  {termIds.map((tid: any) => (
                    <>
                      <th key={`${tid}-bar`} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400 border-l border-gray-100 w-20">Distribution</th>
                      <th key={`${tid}-me`} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400">ME+%</th>
                    </>
                  ))}
                  <th className="bg-indigo-50 border-l border-gray-200" />
                  <th className="bg-indigo-50" />
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row: any, i: number) => (
                  <tr key={row.subject.id} className={`border-b border-gray-100 hover:bg-teal-50/30 transition-colors ${i % 2 ? 'bg-gray-50/20' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 rounded-full" style={{
                          background: row.valueAdd > 0.3 ? '#059669' : row.valueAdd < -0.3 ? '#DC2626' : '#94A3B8'
                        }} />
                        {row.subject.subject_name}
                      </div>
                    </td>
                    {row.termStats.map((ts: any) => (
                      <>
                        <td key={`${ts.termId}-bar`} className="px-2 py-2 border-l border-gray-100">
                          {ts.total > 0 ? (
                            <div className="flex gap-0.5 items-center h-4">
                              {(['EE','ME','AE','BE'] as const).map(k => {
                                const pct = ts.counts[k] / ts.total * 100;
                                return pct > 0 ? (
                                  <div key={k} className="h-full rounded-sm transition-all" title={`${k}: ${Math.round(pct)}%`}
                                    style={{ width: `${pct}%`, minWidth: 2, background: LEVEL_COLORS[k].text, opacity: 0.85 }} />
                                ) : null;
                              })}
                            </div>
                          ) : <span className="text-gray-300 text-[10px]">—</span>}
                        </td>
                        <td key={`${ts.termId}-me`} className="px-2 py-2 text-center font-black"
                          style={{ color: ts.total > 0 ? (ts.meAbovePct >= 70 ? '#059669' : ts.meAbovePct >= 50 ? '#2563EB' : '#DC2626') : '#CBD5E1' }}>
                          {ts.total > 0 ? `${ts.meAbovePct}%` : '—'}
                        </td>
                      </>
                    ))}
                    <td className="px-3 py-3 text-center bg-indigo-50/50 border-l border-gray-200">
                      <span className="text-sm font-black" style={{
                        color: row.valueAdd > 0.3 ? '#059669' : row.valueAdd < -0.3 ? '#DC2626' : '#6B7280'
                      }}>
                        {row.valueAdd > 0 ? '+' : ''}{row.valueAdd.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center bg-indigo-50/50">
                      <div className="flex justify-center">
                        <TrendIcon valueAdd={row.valueAdd} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Value Add = change in mean competency numeric from first to latest term. Positive = growth.</p>
            <span className="text-[10px] text-gray-400">{cohortData.length} subjects · {termIds.length} terms</span>
          </div>
        </div>
      )}
    </div>
  );
}


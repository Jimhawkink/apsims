'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiBarChart2, FiArrowLeft, FiDownload, FiTrendingUp, FiTrendingDown, FiMinus, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function CBCSubjectPerformancePage() {
  const data = useCBCReportData();

  const subjectStats = useMemo(() => {
    const subjectIds = new Set(data.filteredSummaries.map(s => s.subject_id));
    return Array.from(subjectIds).map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;
      const sums = data.filteredSummaries.filter(s => s.subject_id === subjectId && s.overall_level);
      const total = sums.length;
      const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      let totalNumeric = 0;
      sums.forEach(s => { counts[s.overall_level!]++; totalNumeric += rubricNumeric(s.overall_level!); });
      const avgNumeric = total > 0 ? totalNumeric / total : 0;
      const meanLevel = avgNumeric >= 3.5 ? 'EE' : avgNumeric >= 2.5 ? 'ME' : avgNumeric >= 1.5 ? 'AE' : total > 0 ? 'BE' : null;
      const meAbove = counts.EE + counts.ME;
      const meAbovePct = total > 0 ? Math.round((meAbove / total) * 100) : 0;

      // Prev term comparison
      const prevSums = data.prevTermSummaries.filter(s => s.subject_id === subjectId && s.overall_level);
      let prevNumeric = 0;
      prevSums.forEach(s => { prevNumeric += rubricNumeric(s.overall_level!); });
      const prevAvg = prevSums.length > 0 ? prevNumeric / prevSums.length : 0;
      const trend = total > 0 && prevSums.length > 0 ? (avgNumeric > prevAvg ? 'up' : avgNumeric < prevAvg ? 'down' : 'flat') : null;

      // Formative vs summative
      const fSums = data.filteredSummaries.filter(s => s.subject_id === subjectId && s.formative_level);
      const sSums = data.filteredSummaries.filter(s => s.subject_id === subjectId && s.summative_level);
      const fCounts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      const sCounts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      fSums.forEach(s => { if (s.formative_level) fCounts[s.formative_level]++; });
      sSums.forEach(s => { if (s.summative_level) sCounts[s.summative_level]++; });

      return { subject, total, counts, avgNumeric, meanLevel, meAbovePct, trend, fCounts, sCounts, fTotal: fSums.length, sTotal: sSums.length };
    }).filter(Boolean).sort((a: any, b: any) => b.avgNumeric - a.avgNumeric);
  }, [data.filteredSummaries, data.subjects, data.prevTermSummaries]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white"><FiBarChart2 size={16} /></span>
              Subject Performance Report
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Per-subject EE/ME/AE/BE distribution, mean competency, trends, formative vs summative</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
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
              <option value="">All Streams</option>
              {data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">
              {data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Subject Cards */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" /></div>
      ) : subjectStats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400">
          <FiBarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-lg">No assessment data found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {subjectStats.map((stat: any) => {
            const c = getRubricColor(stat.meanLevel);
            return (
              <div key={stat.subject.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Subject Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.light, color: c.bg }}>
                      <FiBarChart2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">{stat.subject.subject_name}</h3>
                      <p className="text-[10px] text-gray-400">{stat.total} students assessed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Mean</p>
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold" style={{ background: c.bg, color: c.text }}>
                        {stat.meanLevel || '—'}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">ME+</p>
                      <p className={`text-lg font-black ${stat.meAbovePct >= 70 ? 'text-green-600' : stat.meAbovePct >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{stat.meAbovePct}%</p>
                    </div>
                    {stat.trend && (
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">vs Prev</p>
                        {stat.trend === 'up' ? <FiTrendingUp size={18} className="text-green-500 mx-auto" /> :
                         stat.trend === 'down' ? <FiTrendingDown size={18} className="text-red-500 mx-auto" /> :
                         <FiMinus size={18} className="text-gray-400 mx-auto" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Distribution Bars */}
                <div className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Overall Distribution</p>
                  <div className="flex h-6 rounded-lg overflow-hidden mb-2">
                    {LEVELS.map(level => {
                      const cnt = stat.counts[level] || 0;
                      const w = stat.total > 0 ? (cnt / stat.total) * 100 : 0;
                      if (w === 0) return null;
                      const rc = getRubricColor(level);
                      return (
                        <div key={level} style={{ width: `${w}%`, background: rc.bg }}
                          className="flex items-center justify-center text-white text-[9px] font-bold transition-all" title={`${level}: ${cnt}`}>
                          {w > 8 ? `${level} ${cnt}` : w > 4 ? level : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4">
                    {LEVELS.map(level => {
                      const rc = getRubricColor(level);
                      return (
                        <span key={level} className="flex items-center gap-1 text-[10px] text-gray-600">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: rc.bg }} />
                          {level}: {stat.counts[level] || 0} ({stat.total > 0 ? Math.round(((stat.counts[level] || 0) / stat.total) * 100) : 0}%)
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Formative vs Summative */}
                <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Formative vs Summative</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: 'Formative', counts: stat.fCounts, total: stat.fTotal }, { label: 'Summative', counts: stat.sCounts, total: stat.sTotal }].map(type => (
                      <div key={type.label}>
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">{type.label} ({type.total})</p>
                        <div className="flex gap-1">
                          {LEVELS.map(level => {
                            const rc = getRubricColor(level);
                            return (
                              <div key={level} className="flex-1 text-center">
                                <div className="text-[10px] font-bold" style={{ color: rc.bg }}>{type.counts[level] || 0}</div>
                                <div className="h-1.5 rounded-full mt-0.5" style={{ background: rc.light }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${type.total > 0 ? ((type.counts[level] || 0) / type.total) * 100 : 0}%`, background: rc.bg }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alert */}
                {stat.meAbovePct < 50 && stat.total > 0 && (
                  <div className="px-5 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
                    <FiAlertTriangle size={12} className="text-red-500" />
                    <span className="text-[11px] font-medium text-red-700">⚠️ Below 50% ME+ — urgent intervention needed</span>
                  </div>
                )}
                {stat.meAbovePct >= 80 && (
                  <div className="px-5 py-2 bg-green-50 border-t border-green-100 flex items-center gap-2">
                    <FiCheckCircle size={12} className="text-green-500" />
                    <span className="text-[11px] font-medium text-green-700">✅ Excellent — {stat.meAbovePct}% students at ME or above</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

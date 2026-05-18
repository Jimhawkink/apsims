'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiTarget, FiArrowLeft, FiPrinter } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function GradeProgressPage() {
  const data = useCBCReportData();

  const formSummaries = useMemo(() => {
    return data.forms.map(form => {
      const formStudents = data.students.filter(s => s.form_id === form.id);
      if (formStudents.length === 0) return null;
      const formStudentIds = new Set(formStudents.map(s => s.id));
      const sums = data.summaries.filter(s => formStudentIds.has(s.student_id) && s.overall_level);
      const assessed = new Set(sums.map(s => s.student_id)).size;
      const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      let totalNum = 0;
      sums.forEach(s => { counts[s.overall_level!]++; totalNum += rubricNumeric(s.overall_level!); });
      const avg = sums.length > 0 ? totalNum / sums.length : 0;
      const meanLevel = avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : sums.length > 0 ? 'BE' : null;
      const meAbovePct = sums.length > 0 ? Math.round(((counts.EE + counts.ME) / sums.length) * 100) : 0;
      const assessedPct = formStudents.length > 0 ? Math.round((assessed / formStudents.length) * 100) : 0;

      // Boys vs girls
      const boys = formStudents.filter(s => s.gender === 'Male' || s.gender === 'M');
      const girls = formStudents.filter(s => s.gender === 'Female' || s.gender === 'F');

      // Per-pathway stats
      const pathwayStats = data.pathways.map(pw => {
        const pwStudentIds = data.studentSubjects.filter((ss: any) => ss.pathway_id === pw.id).map((ss: any) => ss.student_id);
        const pwStudents = formStudents.filter(s => pwStudentIds.includes(s.id));
        return { pathway: pw, count: pwStudents.length };
      }).filter(ps => ps.count > 0);

      return {
        form, totalStudents: formStudents.length, assessed, assessedPct,
        counts, meanLevel, meAbovePct, avg, boys: boys.length, girls: girls.length,
        totalAssessments: sums.length, pathwayStats,
      };
    }).filter(Boolean);
  }, [data.forms, data.students, data.summaries, data.pathways, data.studentSubjects]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white"><FiTarget size={16} /></span>
              Form/Grade Progress Summary
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">One-page summary per form for board meetings. {data.currentTerm?.term_name}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg"><FiPrinter size={13} /> Print</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm max-w-xs">
              {data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto" /></div>
      ) : formSummaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><p className="font-semibold">No CBC forms found</p></div>
      ) : (
        <div className="space-y-5">
          {formSummaries.map((fs: any) => {
            const c = getRubricColor(fs.meanLevel);
            return (
              <div key={fs.form.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Form Header */}
                <div className="px-6 py-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-gray-800">{fs.form.form_name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{data.currentTerm?.term_name} · CBC Senior School</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Mean Level</p>
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: c.bg, color: c.text }}>{fs.meanLevel || '—'}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ME+ Rate</p>
                        <p className={`text-2xl font-black ${fs.meAbovePct >= 70 ? 'text-green-600' : fs.meAbovePct >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{fs.meAbovePct}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-0 divide-x divide-y divide-gray-100">
                  <div className="px-4 py-3"><p className="text-[9px] font-bold text-gray-400 uppercase">Total Students</p><p className="text-xl font-black text-gray-800">{fs.totalStudents}</p></div>
                  <div className="px-4 py-3"><p className="text-[9px] font-bold text-gray-400 uppercase">Assessed</p><p className="text-xl font-black text-gray-800">{fs.assessed}<span className="text-xs text-gray-400 font-normal ml-1">({fs.assessedPct}%)</span></p></div>
                  <div className="px-4 py-3"><p className="text-[9px] font-bold text-blue-500 uppercase">Boys</p><p className="text-xl font-black text-blue-600">{fs.boys}</p></div>
                  <div className="px-4 py-3"><p className="text-[9px] font-bold text-pink-500 uppercase">Girls</p><p className="text-xl font-black text-pink-600">{fs.girls}</p></div>
                  {LEVELS.map(level => {
                    const rc = getRubricColor(level);
                    return (
                      <div key={level} className="px-4 py-3" style={{ background: rc.light }}>
                        <p className="text-[9px] font-bold uppercase" style={{ color: rc.bg }}>{level}</p>
                        <p className="text-xl font-black" style={{ color: rc.bg }}>{fs.counts[level] || 0}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Distribution bar */}
                <div className="px-6 py-3 border-t border-gray-100">
                  <div className="flex h-6 rounded-lg overflow-hidden">
                    {LEVELS.map(level => {
                      const cnt = fs.counts[level] || 0;
                      const w = fs.totalAssessments > 0 ? (cnt / fs.totalAssessments) * 100 : 0;
                      if (w === 0) return null;
                      const rc = getRubricColor(level);
                      return <div key={level} style={{ width: `${w}%`, background: rc.bg }} className="flex items-center justify-center text-white text-[9px] font-bold">{w > 8 ? `${level} ${Math.round(w)}%` : ''}</div>;
                    })}
                  </div>
                </div>

                {/* Pathway distribution */}
                {fs.pathwayStats.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Pathway Enrollment</p>
                    <div className="flex gap-3">
                      {fs.pathwayStats.map((ps: any) => (
                        <span key={ps.pathway.id} className="text-[10px] px-2.5 py-1 rounded-lg font-bold text-white" style={{ background: ps.pathway.color_hex || '#6366f1' }}>
                          {ps.pathway.pathway_name}: {ps.count}
                        </span>
                      ))}
                    </div>
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

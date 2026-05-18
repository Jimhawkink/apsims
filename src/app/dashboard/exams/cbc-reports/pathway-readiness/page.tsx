'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiMap, FiArrowLeft, FiStar } from 'react-icons/fi';

export default function PathwayReadinessPage() {
  const data = useCBCReportData();

  const pathwayAnalysis = useMemo(() => {
    return data.filteredStudents.map(student => {
      const sums = data.filteredSummaries.filter(s => s.student_id === student.id && s.overall_level);
      if (sums.length === 0) return null;

      const pathway = data.getStudentPathway(student.id);
      const subjectScores: { subjectId: number; level: string; numeric: number }[] = sums.map(s => ({
        subjectId: s.subject_id, level: s.overall_level!, numeric: rubricNumeric(s.overall_level!),
      }));

      // Readiness score for each pathway based on relevant subject performance
      const pathwayScores = data.pathways.map(pw => {
        // Get subjects associated with this pathway
        const enrolledSubIds = data.studentSubjects
          .filter((ss: any) => ss.student_id === student.id)
          .map((ss: any) => ss.subject_id);
        const relevantScores = subjectScores.filter(s => enrolledSubIds.includes(s.subjectId));
        const avgNum = relevantScores.length > 0 ? relevantScores.reduce((a, s) => a + s.numeric, 0) / relevantScores.length : 0;
        const readinessPct = Math.round((avgNum / 4) * 100);
        const readinessLevel = avgNum >= 3.5 ? 'Excellent' : avgNum >= 2.5 ? 'Good' : avgNum >= 1.5 ? 'Developing' : 'Needs Support';

        return { pathway: pw, avgNum, readinessPct, readinessLevel };
      });

      // Overall readiness
      const overallAvg = subjectScores.length > 0 ? subjectScores.reduce((a, s) => a + s.numeric, 0) / subjectScores.length : 0;
      const overallPct = Math.round((overallAvg / 4) * 100);
      const bestPathway = pathwayScores.sort((a, b) => b.avgNum - a.avgNum)[0];

      return { student, pathway, subjectScores, pathwayScores, overallAvg, overallPct, bestPathway };
    }).filter(Boolean).sort((a: any, b: any) => b.overallPct - a.overallPct);
  }, [data.filteredStudents, data.filteredSummaries, data.pathways, data.studentSubjects, data.getStudentPathway]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white"><FiMap size={16} /></span>
            Pathway Readiness (STEM/Arts/SS)
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Calculates readiness score for each CBC Senior School pathway based on subject competency profile</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* Pathway Summary Cards */}
      {data.pathways.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.pathways.map(pw => {
            const students = pathwayAnalysis.filter((a: any) => a.pathway?.id === pw.id);
            const avgReadiness = students.length > 0 ? Math.round(students.reduce((a: any, s: any) => a + s.overallPct, 0) / students.length) : 0;
            return (
              <div key={pw.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: pw.color_hex || '#6366f1' }}>{pw.pathway_name?.charAt(0)}</div>
                  <div><h3 className="text-sm font-bold text-gray-800">{pw.pathway_name}</h3><p className="text-[10px] text-gray-400">{students.length} students enrolled</p></div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Avg Readiness</p>
                    <p className={`text-3xl font-black ${avgReadiness >= 75 ? 'text-green-600' : avgReadiness >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{avgReadiness}%</p>
                  </div>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${avgReadiness}%`, background: avgReadiness >= 75 ? '#15803d' : avgReadiness >= 50 ? '#1d4ed8' : '#b45309' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Readiness Table */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto" /></div>
      ) : pathwayAnalysis.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiMap size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No readiness data</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-gray-200">
                  <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase min-w-[160px]">Student</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase">Pathway</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase">Stream</th>
                  {data.pathways.map(pw => (
                    <th key={pw.id} className="px-3 py-3 text-center font-bold text-gray-500 uppercase min-w-[90px]" style={{ color: pw.color_hex || '#6366f1' }}>{pw.pathway_name}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase bg-indigo-50">Overall %</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase bg-green-50">Best Match</th>
                </tr>
              </thead>
              <tbody>
                {pathwayAnalysis.map((row: any, i: number) => (
                  <tr key={row.student.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-gray-800">{row.student.first_name} {row.student.last_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{row.student.admission_no || row.student.admission_number}</div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {row.pathway ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: row.pathway.color_hex || '#6366f1' }}>{row.pathway.pathway_name}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center text-[10px] text-gray-500">{data.getStreamName(row.student.stream_id)}</td>
                    {row.pathwayScores.map((ps: any) => (
                      <td key={ps.pathway.id} className="px-2 py-2.5 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold ${ps.readinessPct >= 75 ? 'bg-green-100 text-green-700' : ps.readinessPct >= 50 ? 'bg-blue-100 text-blue-700' : ps.readinessPct >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {ps.readinessPct}%
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center bg-indigo-50/50">
                      <span className="text-sm font-black text-indigo-700">{row.overallPct}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-green-50/50">
                      {row.bestPathway && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white flex items-center gap-1 justify-center" style={{ background: row.bestPathway.pathway.color_hex || '#15803d' }}>
                          <FiStar size={9} />{row.bestPathway.pathway.pathway_name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

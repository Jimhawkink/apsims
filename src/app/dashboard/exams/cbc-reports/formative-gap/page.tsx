'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiGitBranch, FiArrowLeft, FiAlertTriangle, FiDownload } from 'react-icons/fi';

function RubricBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-300 text-[10px]">—</span>;
  const c = getRubricColor(level);
  return <span style={{ background: c.bg, color: c.text }} className="inline-flex items-center justify-center font-bold rounded text-[10px] px-1.5 py-0.5">{level}</span>;
}

export default function FormativeGapPage() {
  const data = useCBCReportData();

  const gapAnalysis = useMemo(() => {
    const results: any[] = [];
    data.filteredStudents.forEach(student => {
      const sums = data.filteredSummaries.filter(s => s.student_id === student.id);
      sums.forEach(s => {
        if (!s.formative_level || !s.summative_level) return;
        const fNum = rubricNumeric(s.formative_level);
        const sNum = rubricNumeric(s.summative_level);
        const gap = fNum - sNum;
        if (Math.abs(gap) >= 1) {
          results.push({
            student, subjectId: s.subject_id, formativeLevel: s.formative_level,
            summativeLevel: s.summative_level, overallLevel: s.overall_level,
            gap, gapType: gap > 0 ? 'summative_below' : 'summative_above',
            severity: Math.abs(gap) >= 2 ? 'critical' : 'moderate',
          });
        }
      });
    });
    return results.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  }, [data.filteredStudents, data.filteredSummaries]);

  const stats = useMemo(() => {
    const below = gapAnalysis.filter(g => g.gapType === 'summative_below');
    const above = gapAnalysis.filter(g => g.gapType === 'summative_above');
    const critical = gapAnalysis.filter(g => g.severity === 'critical');
    return { below: below.length, above: above.length, critical: critical.length, total: gapAnalysis.length };
  }, [gapAnalysis]);

  const exportCSV = () => {
    const headers = ['Student', 'Adm No', 'Subject', 'Formative', 'Summative', 'Gap', 'Type', 'Severity'];
    const rows = gapAnalysis.map(g => [
      `${g.student.first_name} ${g.student.last_name}`, g.student.admission_no || g.student.admission_number || '',
      data.getSubjectName(g.subjectId), g.formativeLevel, g.summativeLevel, g.gap > 0 ? `+${g.gap}` : g.gap,
      g.gapType === 'summative_below' ? 'Summative Below Formative' : 'Summative Above Formative', g.severity,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cbc-formative-gap-${data.currentTerm?.term_name || ''}.csv`; a.click();
  };

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white"><FiGitBranch size={16} /></span>
              Formative vs Summative Gap Analysis
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Identifies students whose summative level differs significantly from formative — flags exam anxiety or integrity issues</p>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg bg-amber-500 hover:bg-amber-600"><FiDownload size={13} /> Export</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold text-gray-400 uppercase">Total Gaps</p><p className="text-2xl font-black text-gray-800">{stats.total}</p></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4"><p className="text-[10px] font-bold text-red-600 uppercase">Summative Below</p><p className="text-2xl font-black text-red-700">{stats.below}</p><p className="text-[10px] text-red-500">Possible exam anxiety</p></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><p className="text-[10px] font-bold text-amber-600 uppercase">Summative Above</p><p className="text-2xl font-black text-amber-700">{stats.above}</p><p className="text-[10px] text-amber-500">Possible integrity flag</p></div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4"><p className="text-[10px] font-bold text-purple-600 uppercase">Critical (±2 levels)</p><p className="text-2xl font-black text-purple-700">{stats.critical}</p></div>
      </div>

      {/* Gap Table */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto" /></div>
      ) : gapAnalysis.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiGitBranch size={40} className="mx-auto mb-3 text-green-400" /><p className="font-semibold text-green-600">No significant gaps detected! ✅</p><p className="text-sm mt-1">Formative and summative levels are aligned</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-gray-200">
                <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Student</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Subject</th>
                <th className="px-3 py-3 text-center font-bold text-blue-600 uppercase bg-blue-50">Formative</th>
                <th className="px-3 py-3 text-center font-bold text-purple-600 uppercase bg-purple-50">Summative</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Gap</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Type</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Severity</th>
                <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Action</th>
              </tr></thead>
              <tbody>
                {gapAnalysis.map((g, i) => (
                  <tr key={`${g.student.id}-${g.subjectId}`} className={`border-b border-gray-100 ${g.severity === 'critical' ? 'bg-red-50/30' : i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2.5"><div className="font-semibold text-gray-800">{g.student.first_name} {g.student.last_name}</div><div className="text-[10px] text-gray-400 font-mono">{g.student.admission_no || g.student.admission_number}</div></td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-700">{data.getSubjectName(g.subjectId)}</td>
                    <td className="px-3 py-2.5 text-center bg-blue-50/50"><RubricBadge level={g.formativeLevel} /></td>
                    <td className="px-3 py-2.5 text-center bg-purple-50/50"><RubricBadge level={g.summativeLevel} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded ${g.gap > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {g.gap > 0 ? `↓ ${g.gap}` : `↑ ${Math.abs(g.gap)}`} level{Math.abs(g.gap) > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${g.gapType === 'summative_below' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {g.gapType === 'summative_below' ? '📉 Exam Anxiety' : '⚠ Integrity Flag'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${g.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {g.severity === 'critical' ? '🔴 Critical' : '🟡 Moderate'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-gray-600">
                      {g.gapType === 'summative_below' ? 'Refer to counselor for exam prep support' : 'Review assessment conditions & verify authenticity'}
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

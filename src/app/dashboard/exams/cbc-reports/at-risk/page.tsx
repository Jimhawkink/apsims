'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiAlertTriangle, FiArrowLeft, FiDownload, FiTrendingDown, FiShield, FiTarget, FiUsers } from 'react-icons/fi';

function RubricBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-300 text-[10px]">—</span>;
  const c = getRubricColor(level);
  return <span style={{ background: c.bg, color: c.text }} className="inline-flex items-center justify-center font-bold rounded text-[10px] px-1.5 py-0.5">{level}</span>;
}

type RiskLevel = 'critical' | 'high' | 'moderate' | 'watch';
const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  high: { label: 'High Risk', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  moderate: { label: 'Moderate', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  watch: { label: 'Watch', bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
};

export default function CBCAtRiskPage() {
  const data = useCBCReportData();

  const atRiskStudents = useMemo(() => {
    return data.filteredStudents.map(student => {
      const currentSums = data.filteredSummaries.filter(s => s.student_id === student.id);
      const prevSums = data.prevTermSummaries.filter(s => s.student_id === student.id);
      let riskScore = 0;
      const riskFactors: string[] = [];
      const interventions: string[] = [];

      // Factor 1: Current BE subjects
      const beSubjects = currentSums.filter(s => s.overall_level === 'BE');
      if (beSubjects.length >= 3) { riskScore += 40; riskFactors.push(`${beSubjects.length} subjects at BE level`); interventions.push('Immediate remedial program across multiple subjects'); }
      else if (beSubjects.length >= 1) { riskScore += 20 * beSubjects.length; riskFactors.push(`${beSubjects.length} subject(s) at BE level`); interventions.push('Targeted subject-specific tutoring'); }

      // Factor 2: Declining trend
      let declineCount = 0;
      currentSums.forEach(cs => {
        if (!cs.overall_level) return;
        const prev = prevSums.find(p => p.subject_id === cs.subject_id);
        if (prev?.overall_level && rubricNumeric(cs.overall_level) < rubricNumeric(prev.overall_level)) declineCount++;
      });
      if (declineCount >= 3) { riskScore += 25; riskFactors.push(`Performance declined in ${declineCount} subjects`); interventions.push('Parent-teacher conference recommended'); }
      else if (declineCount >= 1) { riskScore += 10 * declineCount; riskFactors.push(`Declined in ${declineCount} subject(s) vs last term`); interventions.push('Monitor closely next assessment cycle'); }

      // Factor 3: AE borderline (could drop to BE)
      const aeSubjects = currentSums.filter(s => s.overall_level === 'AE');
      if (aeSubjects.length >= 2) { riskScore += 10; riskFactors.push(`${aeSubjects.length} subjects at AE (borderline)`); interventions.push('Extra practice worksheets and formative check-ins'); }

      // Factor 4: Formative vs Summative gap (summative much lower)
      let gapCount = 0;
      currentSums.forEach(cs => {
        if (cs.formative_level && cs.summative_level) {
          const fNum = rubricNumeric(cs.formative_level);
          const sNum = rubricNumeric(cs.summative_level);
          if (fNum - sNum >= 2) gapCount++;
        }
      });
      if (gapCount >= 1) { riskScore += 15; riskFactors.push(`Summative significantly below formative in ${gapCount} subject(s) — possible exam anxiety`); interventions.push('Exam preparation skills workshop / counseling referral'); }

      // Factor 5: No assessment data
      const assessed = currentSums.filter(s => s.overall_level).length;
      const enrolled = data.getStudentSubjectIds(student.id).length || 7;
      if (assessed < enrolled * 0.5) { riskScore += 10; riskFactors.push(`Only ${assessed}/${enrolled} subjects assessed`); interventions.push('Verify attendance and assessment completion'); }

      // Determine risk level
      let riskLevel: RiskLevel = 'watch';
      if (riskScore >= 60) riskLevel = 'critical';
      else if (riskScore >= 40) riskLevel = 'high';
      else if (riskScore >= 20) riskLevel = 'moderate';

      // Compute overall level
      let totalNum = 0, count = 0;
      currentSums.forEach(s => { if (s.overall_level) { totalNum += rubricNumeric(s.overall_level); count++; } });
      const avgNum = count > 0 ? totalNum / count : 0;
      const overallLevel = avgNum >= 3.5 ? 'EE' : avgNum >= 2.5 ? 'ME' : avgNum >= 1.5 ? 'AE' : count > 0 ? 'BE' : null;

      return { student, riskScore, riskLevel, riskFactors, interventions, beSubjects, declineCount, overallLevel, assessed };
    }).filter(r => r.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore);
  }, [data.filteredStudents, data.filteredSummaries, data.prevTermSummaries, data.getStudentSubjectIds]);

  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = { critical: 0, high: 0, moderate: 0, watch: 0 };
    atRiskStudents.forEach(s => counts[s.riskLevel]++);
    return counts;
  }, [atRiskStudents]);

  const exportCSV = () => {
    const headers = ['Risk Level', 'Score', 'Adm No', 'Name', 'Gender', 'Stream', 'Overall', 'BE Subjects', 'Risk Factors', 'Suggested Interventions'];
    const rows = atRiskStudents.map(r => [
      RISK_CONFIG[r.riskLevel].label, r.riskScore,
      r.student.admission_no || r.student.admission_number || '', `${r.student.first_name} ${r.student.last_name}`,
      r.student.gender || '', data.getStreamName(r.student.stream_id), r.overallLevel || '',
      r.beSubjects.map(s => data.getSubjectName(s.subject_id)).join('; '),
      r.riskFactors.join('; '), r.interventions.join('; '),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cbc-at-risk-predictor-${data.currentTerm?.term_name || 'report'}.csv`; a.click();
  };

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white"><FiAlertTriangle size={16} /></span>
              AI At-Risk Predictor
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Flags students likely to drop to BE next term. Multi-factor risk scoring with intervention suggestions.</p>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          <FiDownload size={13} /> Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All CBC Forms</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* Risk KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['critical', 'high', 'moderate', 'watch'] as const).map(level => {
          const cfg = RISK_CONFIG[level];
          return (
            <div key={level} className="rounded-xl border p-4" style={{ background: cfg.bg, borderColor: cfg.border }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.text }}>{cfg.label}</p>
              <p className="text-3xl font-black mt-1" style={{ color: cfg.text }}>{riskCounts[level]}</p>
              <p className="text-[10px] mt-0.5" style={{ color: cfg.text, opacity: 0.7 }}>students</p>
            </div>
          );
        })}
      </div>

      {/* At-Risk Students List */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" /></div>
      ) : atRiskStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400">
          <FiShield size={40} className="mx-auto mb-3 text-green-400" />
          <p className="font-semibold text-lg text-green-600">No at-risk students detected! 🎉</p>
          <p className="text-sm mt-1">All students are performing within safe ranges</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atRiskStudents.map(risk => {
            const cfg = RISK_CONFIG[risk.riskLevel];
            return (
              <div key={risk.student.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Risk badge */}
                  <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}>
                    <span className="text-lg font-black" style={{ color: cfg.text }}>{risk.riskScore}</span>
                    <span className="text-[8px] font-bold uppercase" style={{ color: cfg.text }}>risk</span>
                  </div>

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${risk.student.gender === 'Male' || risk.student.gender === 'M' ? 'bg-blue-400' : 'bg-pink-400'}`} />
                      <h3 className="text-sm font-bold text-gray-800">{risk.student.first_name} {risk.student.last_name}</h3>
                      <span className="text-[10px] text-gray-400 font-mono">{risk.student.admission_no || risk.student.admission_number}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      <RubricBadge level={risk.overallLevel} />
                    </div>

                    {/* Risk Factors */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {risk.riskFactors.map((factor, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 font-medium">
                          ⚠ {factor}
                        </span>
                      ))}
                    </div>

                    {/* BE Subjects */}
                    {risk.beSubjects.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-semibold text-gray-400">BE in:</span>
                        {risk.beSubjects.map(s => (
                          <span key={s.subject_id} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold border border-red-200">
                            {data.getSubjectName(s.subject_id)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stream info */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400">{data.getStreamName(risk.student.stream_id)}</p>
                    <p className="text-[10px] text-gray-400">{data.getFormName(risk.student.form_id)}</p>
                  </div>
                </div>

                {/* Intervention suggestions */}
                <div className="px-5 py-3 bg-amber-50/50 border-t border-amber-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FiTarget size={11} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Suggested Interventions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {risk.interventions.map((int, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-white text-amber-800 border border-amber-200 font-medium">
                        💡 {int}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

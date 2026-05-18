'use client';

interface CBCReportCardTemplateProps {
  student: any;
  pathway: any;
  subjects: any[];
  summaries: any[];
  rubricConfig: any[];
  schoolDetails: any;
  term: any;
  comments: any;
}

const RUBRIC_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  EE: { label: 'Exceeds Expectation', color: '#15803d', bg: '#f0fdf4', border: '#86efac', emoji: '🌟' },
  ME: { label: 'Meets Expectation', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', emoji: '✅' },
  AE: { label: 'Approaches Expectation', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', emoji: '📈' },
  BE: { label: 'Below Expectation', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', emoji: '⚠️' },
};

function RubricBadge({ level, size = 'md' }: { level: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (!level) return <span className="text-gray-300 text-xs">—</span>;
  const meta = RUBRIC_META[level] || { label: level, color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', emoji: '' };
  const cls = size === 'sm' ? 'w-7 h-5 text-[9px]' : size === 'lg' ? 'w-12 h-8 text-sm' : 'w-9 h-6 text-[10px]';
  return (
    <span className={`inline-flex items-center justify-center rounded-md font-black text-white ${cls}`}
      style={{ background: meta.color }}>{level}</span>
  );
}

function RubricBar({ level }: { level: string | null }) {
  const widths: Record<string, string> = { EE: '100%', ME: '75%', AE: '50%', BE: '25%' };
  const meta = RUBRIC_META[level || ''] || { color: '#e2e8f0', bg: '#f8fafc', border: '#e2e8f0', label: '', emoji: '' };
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: widths[level || ''] || '0%', background: `linear-gradient(90deg, ${meta.color}cc, ${meta.color})` }} />
      </div>
      <RubricBadge level={level} size="sm" />
    </div>
  );
}

export default function CBCReportCardTemplate({
  student, pathway, subjects, summaries, rubricConfig, schoolDetails, term, comments,
}: CBCReportCardTemplateProps) {
  const getSummary = (subjectId: number) => summaries.find((s: any) => s.subject_id === subjectId && s.student_id === student?.id);
  const studentName = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : '—';
  const admissionNo = student?.admission_no || student?.admission_number || '—';
  const streamName = student?.stream_name || '—';
  const termName = term?.term_name || '—';
  const academicYear = term?.academic_year || term?.year || new Date().getFullYear();
  const schoolName = schoolDetails?.school_name || 'ALPHA SCHOOL';
  const schoolLogo = schoolDetails?.logo_url || null;

  // Compute overall summary stats
  const subjectResults = subjects.map((sub: any) => {
    const summary = getSummary(sub.id);
    return { sub, level: summary?.overall_level || null, formative: summary?.formative_level || null, summative: summary?.summative_level || null };
  });
  const assessed = subjectResults.filter(r => r.level);
  const WEIGHTS: Record<string, number> = { EE: 4, ME: 3, AE: 2, BE: 1 };
  const NUM_LEVEL: Record<number, string> = { 4: 'EE', 3: 'ME', 2: 'AE', 1: 'BE' };
  const totalWeight = assessed.reduce((s, r) => s + (WEIGHTS[r.level!] || 0), 0);
  const avgWeight = assessed.length > 0 ? totalWeight / assessed.length : 0;
  const overallLevel = assessed.length > 0 ? (NUM_LEVEL[Math.round(avgWeight)] || 'BE') : null;
  const eeCount = assessed.filter(r => r.level === 'EE').length;
  const meCount = assessed.filter(r => r.level === 'ME').length;
  const aeCount = assessed.filter(r => r.level === 'AE').length;
  const beCount = assessed.filter(r => r.level === 'BE').length;
  const meRate = assessed.length > 0 ? Math.round(((eeCount + meCount) / assessed.length) * 100) : 0;

  const now = new Date();
  const printDate = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-card-page { page-break-after: always; margin: 0; padding: 15mm; box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="report-card-page bg-white rounded-2xl shadow-xl border-2 border-indigo-200 overflow-hidden max-w-[860px] mx-auto"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>

        {/* ═══ SCHOOL HEADER ═══ */}
        <div className="relative overflow-hidden border-b-4 border-indigo-700"
          style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6366f1 70%, #4f46e5 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
          <div className="relative z-10 p-6 text-center">
            {schoolLogo && (
              <img src={schoolLogo} alt="Logo" className="w-16 h-16 mx-auto mb-3 object-contain rounded-full border-2 border-white/40 shadow-lg" />
            )}
            <h1 className="text-2xl font-extrabold text-white uppercase tracking-[0.25em] drop-shadow">
              {schoolName}
            </h1>
            {schoolDetails?.motto && (
              <p className="text-indigo-200 text-sm italic mt-1">"{schoolDetails.motto}"</p>
            )}
            <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-indigo-200 mt-2">
              {schoolDetails?.postal_address && <span>📬 P.O. Box {schoolDetails.postal_address}</span>}
              {schoolDetails?.phone1 && <span>📞 {schoolDetails.phone1}</span>}
              {schoolDetails?.email && <span>✉ {schoolDetails.email}</span>}
            </div>
            <div className="mt-4 inline-block">
              <div className="bg-white/15 border border-white/30 rounded-xl px-8 py-2 backdrop-blur-sm">
                <p className="text-white font-black text-base uppercase tracking-[0.25em]">Student Progress Report</p>
                <p className="text-indigo-200 text-xs mt-0.5">{termName} · CBC Senior School Curriculum</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SUMMARY BAR ═══ */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 border-b-2 border-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50">
          {[
            { icon: '📊', label: 'Subjects Assessed', value: `${assessed.length}`, sub: `of ${subjects.length} enrolled`, color: '#6366f1' },
            { icon: '🏆', label: 'Overall Level', value: overallLevel || '—', sub: overallLevel ? RUBRIC_META[overallLevel]?.label || '' : 'Not assessed', color: RUBRIC_META[overallLevel || '']?.color || '#94a3b8', isLevel: true },
            { icon: '🎯', label: 'ME+ Rate', value: `${meRate}%`, sub: `${eeCount} EE + ${meCount} ME`, color: meRate >= 70 ? '#15803d' : meRate >= 50 ? '#1d4ed8' : '#b91c1c' },
            { icon: '⭐', label: 'Competency Score', value: avgWeight ? avgWeight.toFixed(1) : '—', sub: `out of 4.0`, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} className="py-3 px-3 text-center">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">{s.icon} {s.label}</p>
              {s.isLevel ? (
                <div className="mt-1 flex justify-center">
                  <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-white font-black text-lg"
                    style={{ background: s.color }}>{s.value}</span>
                </div>
              ) : (
                <p className="text-xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
              )}
              <p className="text-[9px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ═══ STUDENT INFO ═══ */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 px-6 py-4 bg-gray-50 border-b border-gray-200 text-[12px]">
          {[
            ['Student Name', studentName],
            ['Adm Number', admissionNo],
            ['Grade / Stream', `Grade 10 / ${streamName}`],
            ['Term', termName],
            ['Pathway', pathway?.pathway_name || 'Not Assigned'],
            ['Guardian', student?.guardian_name || student?.parent_name || '—'],
          ].map(([label, val]) => (
            <div key={label as string} className="flex gap-2">
              <span className="font-bold text-gray-500 w-28 shrink-0">{label}:</span>
              <span className="font-semibold text-gray-900">{val}</span>
            </div>
          ))}
        </div>

        {/* ═══ SUBJECT PERFORMANCE TABLE ═══ */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
            📋 Competency-Based Assessment — Formative + Summative → Overall
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-[11px] min-w-[650px]">
              <thead>
                <tr style={{ background: '#312e81' }}>
                  <th className="border border-indigo-800 px-2 py-2.5 text-left text-white font-bold text-[10px] w-6">#</th>
                  <th className="border border-indigo-800 px-2 py-2.5 text-left text-white font-bold text-[10px]">SUBJECT</th>
                  <th className="border border-indigo-600 px-2 py-2.5 text-center text-indigo-200 font-bold text-[10px] uppercase">Formative</th>
                  <th className="border border-indigo-600 px-2 py-2.5 text-center text-indigo-200 font-bold text-[10px] uppercase">Summative</th>
                  <th className="border border-yellow-500 bg-yellow-600 px-2 py-2.5 text-center text-yellow-100 font-bold text-[10px] uppercase" colSpan={2}>Overall Level</th>
                  <th className="border border-indigo-800 px-2 py-2.5 text-center text-white font-bold text-[10px]">Description</th>
                </tr>
              </thead>
              <tbody>
                {subjectResults.map((r, i) => {
                  const overallMeta = RUBRIC_META[r.level || ''];
                  return (
                    <tr key={r.sub.id} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'}>
                      <td className="border border-gray-200 px-2 py-2 text-gray-400 text-[10px]">{i + 1}</td>
                      <td className="border border-gray-200 px-2 py-2 font-semibold text-gray-800">{r.sub.subject_name}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center"><RubricBadge level={r.formative} size="sm" /></td>
                      <td className="border border-gray-200 px-2 py-2 text-center"><RubricBadge level={r.summative} size="sm" /></td>
                      <td className="border border-gray-200 px-1 py-2 text-center" style={{ background: overallMeta?.bg || 'transparent' }}>
                        <RubricBadge level={r.level} />
                      </td>
                      <td className="border border-gray-200 px-1 py-2 text-center text-[9px] font-bold" style={{ color: overallMeta?.color || '#94a3b8' }}>
                        {overallMeta?.label?.split(' ')[0] || '—'}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-[10px] text-gray-500">
                        {overallMeta?.label || (r.level ? '' : 'Not Assessed')}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ background: '#eef2ff' }}>
                  <td colSpan={2} className="border border-gray-300 px-2 py-2.5 font-black text-gray-700">OVERALL COMPETENCY</td>
                  <td className="border border-gray-300 px-2 py-2.5 text-center font-bold text-[9px] text-gray-500">—</td>
                  <td className="border border-gray-300 px-2 py-2.5 text-center font-bold text-[9px] text-gray-500">—</td>
                  <td className="border border-gray-300 px-1 py-2.5 text-center" style={{ background: RUBRIC_META[overallLevel || '']?.bg }}>
                    <RubricBadge level={overallLevel} size="lg" />
                  </td>
                  <td className="border border-gray-300 px-1 py-2.5 text-center text-[10px] font-black" style={{ color: RUBRIC_META[overallLevel || '']?.color }}>
                    {avgWeight ? avgWeight.toFixed(1) + '/4' : '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-2.5 text-[10px] font-bold text-gray-500">
                    {RUBRIC_META[overallLevel || '']?.label || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ SUMMARY CARDS ═══ */}
        <div className="px-4 pb-4 grid grid-cols-4 gap-3">
          {[
            { icon: '📚', label: 'Total Subjects', value: `${assessed.length}`, color: '#6366f1', bg: '#eef2ff' },
            { icon: '⭐', label: 'Avg Score', value: avgWeight ? avgWeight.toFixed(1) + '/4.0' : '—', color: '#f59e0b', bg: '#fffbeb' },
            { icon: '📊', label: 'ME+ Rate', value: `${meRate}%`, color: '#10b981', bg: '#f0fdf4' },
            { icon: '🏆', label: 'Overall Level', value: overallLevel || '—', color: RUBRIC_META[overallLevel || '']?.color || '#94a3b8', bg: RUBRIC_META[overallLevel || '']?.bg || '#f8fafc' },
          ].map((c, i) => (
            <div key={i} className="rounded-xl border p-3 text-center" style={{ background: c.bg, borderColor: c.color + '30' }}>
              <p className="text-lg mb-0.5">{c.icon}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className="text-lg font-black" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* ═══ COMPETENCY PROFILE (Bar Charts) ═══ */}
        <div className="px-4 pb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">⭐ Subject Competency Profile</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
            {subjectResults.filter(r => r.level).sort((a, b) => (WEIGHTS[b.level!] || 0) - (WEIGHTS[a.level!] || 0)).map(r => (
              <div key={r.sub.id} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-gray-700 w-28 shrink-0 truncate">{r.sub.subject_name}</span>
                <RubricBar level={r.level} />
              </div>
            ))}
            {assessed.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No assessments recorded yet</p>}
          </div>
        </div>

        {/* ═══ RUBRIC DISTRIBUTION ═══ */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">📊 Competency Distribution</p>
            <div className="flex items-end justify-center gap-6 h-24">
              {[
                { level: 'EE', count: eeCount },
                { level: 'ME', count: meCount },
                { level: 'AE', count: aeCount },
                { level: 'BE', count: beCount },
              ].map(d => {
                const maxH = Math.max(eeCount, meCount, aeCount, beCount, 1);
                const h = (d.count / maxH) * 72;
                const meta = RUBRIC_META[d.level];
                return (
                  <div key={d.level} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black" style={{ color: meta.color }}>{d.count}</span>
                    <div className="w-10 rounded-t-md" style={{ height: `${Math.max(h, 4)}px`, background: `linear-gradient(to top, ${meta.color}, ${meta.color}cc)` }} />
                    <span className="text-[9px] font-black" style={{ color: meta.color }}>{d.level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ PATHWAY INFO ═══ */}
        {pathway && (
          <div className="px-4 pb-4">
            <div className="rounded-xl border-2 p-3 flex items-center gap-3" style={{ borderColor: (pathway.color_hex || '#6366f1') + '40', background: (pathway.color_hex || '#6366f1') + '08' }}>
              <span className="text-2xl">🎓</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Learning Pathway</p>
                <p className="text-sm font-black" style={{ color: pathway.color_hex || '#4f46e5' }}>{pathway.pathway_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ COMMENTS ═══ */}
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide mb-2">Class Teacher&apos;s Comment</h3>
            <p className="text-sm text-gray-700 min-h-[50px] leading-relaxed">{comments?.teacher_comment || <span className="text-gray-300 italic">No comment provided.</span>}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide mb-2">Principal&apos;s Comment</h3>
            <p className="text-sm text-gray-700 min-h-[50px] leading-relaxed">{comments?.principal_comment || <span className="text-gray-300 italic">No comment provided.</span>}</p>
          </div>
        </div>

        {/* ═══ SIGNATURES ═══ */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-8">
          {['Class Teacher\'s Signature', 'Principal\'s Signature', 'Parent / Guardian\'s Signature'].map(label => (
            <div key={label} className="text-center">
              <div className="border-b-2 border-gray-400 mb-1.5 h-8" />
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t-4 border-indigo-700 px-6 py-3 text-center" style={{ background: 'linear-gradient(135deg, #312e81, #4338ca)' }}>
          <p className="text-white text-xs font-bold">This report card is computer-generated by Alpha School Management System (APSIMS)</p>
          <p className="text-indigo-300 text-[10px] mt-0.5">Printed on {printDate} · Powered by APSIMS — Kenya&apos;s Leading School Management Platform</p>
        </div>

        {/* ═══ RUBRIC LEGEND ═══ */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide mb-3">Competency Level Reference</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(RUBRIC_META).map(([code, meta]) => (
              <div key={code} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: meta.border, background: meta.bg }}>
                <span className="text-xs font-black flex-shrink-0" style={{ color: meta.color }}>{code}</span>
                <span className="text-[10px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

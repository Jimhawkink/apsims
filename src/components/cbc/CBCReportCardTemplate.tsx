'use client';

interface CBCReportCardTemplateProps {
  student: any; pathway: any; subjects: any[]; summaries: any[]; rubricConfig: any[];
  schoolDetails: any; term: any; comments: any;
  fees?: { charged: number; paid: number; balance: number };
  discipline?: any[]; history?: { termId: number; termName: string; avg: number; count: number }[];
  nextTerm?: any; nextTermFee?: number;
  getTeacherInitial?: (subjectId: number) => string;
}

const R: Record<string, { label: string; color: string; bg: string; border: string }> = {
  EE: { label: 'Exceeds Expectation', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  ME: { label: 'Meets Expectation', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  AE: { label: 'Approaches Expectation', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  BE: { label: 'Below Expectation', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};
const W: Record<string, number> = { EE: 4, ME: 3, AE: 2, BE: 1 };
const NL: Record<number, string> = { 4: 'EE', 3: 'ME', 2: 'AE', 1: 'BE' };

function Badge({ level, sz = 'md' }: { level: string | null; sz?: 'sm' | 'md' | 'lg' }) {
  if (!level) return <span className="text-gray-300 text-xs">—</span>;
  const m = R[level] || { color: '#64748b' };
  const c = sz === 'sm' ? 'w-7 h-5 text-[9px]' : sz === 'lg' ? 'w-12 h-8 text-sm' : 'w-9 h-6 text-[10px]';
  return <span className={`inline-flex items-center justify-center rounded-md font-black text-white ${c}`} style={{ background: m.color }}>{level}</span>;
}

function Spark({ values, labels, h = 48, w = 140 }: { values: number[]; labels?: string[]; h?: number; w?: number }) {
  if (values.length < 2) return <span className="text-[10px] text-gray-400 italic">Not enough data</span>;
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 12) + 6;
    const y = h - 8 - ((v - mn) / rng) * (h - 16);
    return { x, y, v };
  });
  return (
    <svg width={w} height={h + 14} viewBox={`0 0 ${w} ${h + 14}`}>
      <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />)}
      {pts.map((p, i) => <text key={`v${i}`} x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="#4f46e5" fontWeight="bold">{p.v.toFixed(1)}</text>)}
      {labels && pts.map((p, i) => <text key={`l${i}`} x={p.x} y={h + 10} textAnchor="middle" fontSize="7" fill="#94a3b8">{labels[i]}</text>)}
    </svg>
  );
}

export default function CBCReportCardTemplate({ student, pathway, subjects, summaries, rubricConfig, schoolDetails, term, comments, fees, discipline, history, nextTerm, nextTermFee, getTeacherInitial }: CBCReportCardTemplateProps) {
  const getSummary = (sid: number) => summaries.find((s: any) => s.subject_id === sid && s.student_id === student?.id);
  const name = student ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : '—';
  const adm = student?.admission_no || student?.admission_number || '—';
  const stream = student?.stream_name || '—';
  const tName = term?.term_name || '—';
  const yr = term?.year || new Date().getFullYear();
  const sn = schoolDetails?.school_name || 'ALPHA SCHOOL';
  const logo = schoolDetails?.logo_url || null;

  const results = subjects.map((sub: any) => {
    const s = getSummary(sub.id);
    return { sub, level: s?.overall_level || null, f: s?.formative_level || null, sm: s?.summative_level || null };
  });
  const assessed = results.filter(r => r.level);
  const tw = assessed.reduce((s, r) => s + (W[r.level!] || 0), 0);
  const avg = assessed.length > 0 ? tw / assessed.length : 0;
  const overall = assessed.length > 0 ? (NL[Math.round(avg)] || 'BE') : null;
  const ee = assessed.filter(r => r.level === 'EE').length;
  const me = assessed.filter(r => r.level === 'ME').length;
  const ae = assessed.filter(r => r.level === 'AE').length;
  const be = assessed.filter(r => r.level === 'BE').length;
  const meRate = assessed.length > 0 ? Math.round(((ee + me) / assessed.length) * 100) : 0;

  // Deviation from previous term
  const deviation = history && history.length >= 2 ? avg - history[history.length - 2].avg : null;
  const printDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Next term opening
  const nextTermDate = nextTerm?.start_date || nextTerm?.opening_date;
  const nextTermFormatted = nextTermDate ? new Date(nextTermDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const daysToNext = nextTermDate ? Math.ceil((new Date(nextTermDate).getTime() - Date.now()) / 86400000) : null;

  // Fee totals
  const feeBalance = fees?.balance ?? 0;
  const totalDue = feeBalance + (nextTermFee || 0);

  // Discipline
  const discCount = discipline?.length ?? 0;
  const discOpen = discipline?.filter((d: any) => d.status === 'Open').length ?? 0;

  return (
    <>
      <style>{`@media print { .no-print{display:none!important} .report-card-page{page-break-after:always;margin:0;padding:12mm;box-shadow:none!important;border:none!important} body{background:white!important} }`}</style>
      <div className="report-card-page bg-white rounded-2xl shadow-xl border-2 border-indigo-200 overflow-hidden max-w-[860px] mx-auto" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>

        {/* HEADER */}
        <div className="relative overflow-hidden border-b-4 border-indigo-700" style={{ background: 'linear-gradient(135deg, #312e81, #4338ca 40%, #6366f1 70%, #4f46e5)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)' }} />
          <div className="relative z-10 p-5 text-center">
            {logo && <img src={logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain rounded-full border-2 border-white/40 shadow-lg" />}
            <h1 className="text-2xl font-extrabold text-white uppercase tracking-[.25em] drop-shadow">{sn}</h1>
            {schoolDetails?.motto && <p className="text-indigo-200 text-sm italic mt-0.5">&ldquo;{schoolDetails.motto}&rdquo;</p>}
            <div className="flex items-center justify-center flex-wrap gap-3 text-xs text-indigo-200 mt-1.5">
              {schoolDetails?.postal_address && <span>📬 P.O. Box {schoolDetails.postal_address}</span>}
              {schoolDetails?.phone1 && <span>📞 {schoolDetails.phone1}</span>}
              {schoolDetails?.email && <span>✉ {schoolDetails.email}</span>}
            </div>
            <div className="mt-3 inline-block"><div className="bg-white/15 border border-white/30 rounded-xl px-8 py-2 backdrop-blur-sm">
              <p className="text-white font-black text-base uppercase tracking-[.25em]">Student Progress Report</p>
              <p className="text-indigo-200 text-xs mt-0.5">{tName} · CBC Senior School Curriculum</p>
            </div></div>
          </div>
        </div>

        {/* SUMMARY BAR */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 border-b-2 border-gray-200 bg-gradient-to-r from-slate-50 to-indigo-50">
          {[
            { icon: '📊', l: 'Assessed', v: `${assessed.length}/${subjects.length}`, s: 'subjects', c: '#6366f1' },
            { icon: '🏆', l: 'Overall', v: overall || '—', s: R[overall || '']?.label?.split(' ')[0] || '', c: R[overall || '']?.color || '#94a3b8', isLvl: true },
            { icon: '🎯', l: 'ME+ Rate', v: `${meRate}%`, s: `${ee}EE + ${me}ME`, c: meRate >= 70 ? '#15803d' : meRate >= 50 ? '#1d4ed8' : '#b91c1c' },
            { icon: '⭐', l: 'Score', v: avg ? avg.toFixed(1) + '/4' : '—', s: deviation !== null ? `${deviation >= 0 ? '↑' : '↓'}${Math.abs(deviation).toFixed(1)} vs prev` : 'out of 4.0', c: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} className="py-2.5 px-2 text-center">
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-gray-400">{s.icon} {s.l}</p>
              {s.isLvl ? <div className="mt-0.5 flex justify-center"><span className="inline-flex items-center justify-center w-10 h-7 rounded-lg text-white font-black text-base" style={{ background: s.c }}>{s.v}</span></div>
                : <p className="text-lg font-black mt-0.5" style={{ color: s.c }}>{s.v}</p>}
              <p className="text-[8px] text-gray-400">{s.s}</p>
            </div>
          ))}
        </div>

        {/* STUDENT INFO */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px]">
          {[['Student Name', name], ['Adm Number', adm], ['Grade / Stream', `Grade 10 / ${stream}`], ['Term', tName],
            ['Pathway', pathway?.pathway_name || 'Not Assigned'], ['Guardian', student?.guardian_name || '—']
          ].map(([l, v]) => <div key={l as string} className="flex gap-1.5"><span className="font-bold text-gray-500 w-24 shrink-0">{l}:</span><span className="font-semibold text-gray-900">{v}</span></div>)}
        </div>

        {/* SUBJECT TABLE */}
        <div className="px-3 py-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">📋 Competency Assessment — Formative + Summative → Overall</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-[10px]">
              <thead><tr style={{ background: '#312e81' }}>
                <th className="border border-indigo-800 px-1.5 py-2 text-left text-white font-bold w-5">#</th>
                <th className="border border-indigo-800 px-1.5 py-2 text-left text-white font-bold">SUBJECT</th>
                <th className="border border-indigo-600 px-1.5 py-2 text-center text-indigo-200 font-bold">FORM.</th>
                <th className="border border-indigo-600 px-1.5 py-2 text-center text-indigo-200 font-bold">SUMM.</th>
                <th className="border border-yellow-500 bg-yellow-600 px-1.5 py-2 text-center text-yellow-100 font-bold" colSpan={2}>OVERALL</th>
                <th className="border border-indigo-800 px-1.5 py-2 text-center text-white font-bold w-10">INIT.</th>
              </tr></thead>
              <tbody>
                {results.map((r, i) => {
                  const m = R[r.level || ''];
                  return (
                    <tr key={r.sub.id} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'}>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 font-semibold text-gray-800">{r.sub.subject_name}</td>
                      <td className="border border-gray-200 px-1 py-1.5 text-center"><Badge level={r.f} sz="sm" /></td>
                      <td className="border border-gray-200 px-1 py-1.5 text-center"><Badge level={r.sm} sz="sm" /></td>
                      <td className="border border-gray-200 px-1 py-1.5 text-center" style={{ background: m?.bg }}><Badge level={r.level} /></td>
                      <td className="border border-gray-200 px-1 py-1.5 text-center text-[8px] font-bold" style={{ color: m?.color }}>{m?.label?.split(' ')[0] || '—'}</td>
                      <td className="border border-gray-200 px-1 py-1.5 text-center font-bold text-gray-500">{getTeacherInitial?.(r.sub.id) || '—'}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#eef2ff' }}>
                  <td colSpan={2} className="border border-gray-300 px-1.5 py-2 font-black text-gray-700">OVERALL</td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-gray-400">—</td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-gray-400">—</td>
                  <td className="border border-gray-300 px-1 py-2 text-center" style={{ background: R[overall || '']?.bg }}><Badge level={overall} sz="lg" /></td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-[9px] font-black" style={{ color: R[overall || '']?.color }}>{avg ? avg.toFixed(1) + '/4' : '—'}</td>
                  <td className="border border-gray-300" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="px-3 pb-3 grid grid-cols-4 gap-2">
          {[{ i: '📚', l: 'Subjects', v: `${assessed.length}`, c: '#6366f1', b: '#eef2ff' },
            { i: '⭐', l: 'Avg Score', v: avg ? avg.toFixed(1) + '/4.0' : '—', c: '#f59e0b', b: '#fffbeb' },
            { i: '📊', l: 'ME+ Rate', v: `${meRate}%`, c: '#10b981', b: '#f0fdf4' },
            { i: '🏆', l: 'Overall', v: overall || '—', c: R[overall || '']?.color || '#94a3b8', b: R[overall || '']?.bg || '#f8fafc' },
          ].map((c, i) => <div key={i} className="rounded-xl border p-2 text-center" style={{ background: c.b, borderColor: c.c + '30' }}>
            <p className="text-sm">{c.i}</p><p className="text-[8px] font-bold uppercase text-gray-500">{c.l}</p>
            <p className="text-base font-black" style={{ color: c.c }}>{c.v}</p>
          </div>)}
        </div>

        {/* TREND + VALUE ADD ROW */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
            <p className="text-[9px] font-extrabold uppercase text-gray-500 mb-1">📈 Performance Trend</p>
            {history && history.length >= 2 ? (
              <Spark values={history.map(h => h.avg)} labels={history.map(h => h.termName)} />
            ) : <p className="text-[10px] text-gray-400 italic">Not enough history for trend</p>}
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-3">
            <p className="text-[9px] font-extrabold uppercase text-gray-500 mb-1">🔬 Value-Added Analysis</p>
            {deviation !== null ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black ${deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>{deviation >= 0 ? '↑' : '↓'}{Math.abs(deviation).toFixed(2)}</span>
                  <span className="text-[9px] text-gray-500">points vs previous term</span>
                </div>
                <p className="text-[9px] text-gray-500">Current: <b className="text-indigo-600">{avg.toFixed(2)}/4.0</b> | Previous: <b>{(avg - deviation).toFixed(2)}/4.0</b></p>
              </div>
            ) : <p className="text-[10px] text-gray-400 italic">Need previous term data</p>}
          </div>
        </div>

        {/* COMPETENCY PROFILE BARS */}
        <div className="px-3 pb-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">⭐ Subject Competency Profile</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-1.5">
            {results.filter(r => r.level).sort((a, b) => (W[b.level!] || 0) - (W[a.level!] || 0)).map(r => (
              <div key={r.sub.id} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-700 w-24 shrink-0 truncate">{r.sub.subject_name}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: { EE: '100%', ME: '75%', AE: '50%', BE: '25%' }[r.level!] || '0%', background: R[r.level!]?.color }} />
                </div>
                <Badge level={r.level} sz="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* DISCIPLINE + FEES ROW */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-green-200 bg-green-50/30 p-3">
            <p className="text-[9px] font-extrabold uppercase text-green-700 mb-1.5">🛡 Student Discipline</p>
            {discCount === 0 ? (
              <div className="text-center"><span className="text-2xl">✅</span><p className="text-xs font-bold text-green-600 mt-1">Excellent Conduct</p><p className="text-[9px] text-gray-400">No discipline issues recorded</p></div>
            ) : (
              <div><p className="text-sm font-bold text-gray-700">{discCount} record(s)</p><p className="text-[9px] text-gray-500">{discOpen} open · {discCount - discOpen} resolved</p></div>
            )}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3">
            <p className="text-[9px] font-extrabold uppercase text-blue-700 mb-1.5">💰 Fee Statement</p>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between"><span className="text-gray-600">Term Fee Charged</span><span className="font-bold text-gray-800">KES {(fees?.charged ?? 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Amount Paid</span><span className="font-bold text-green-600">KES {(fees?.paid ?? 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-blue-200 pt-0.5 mt-0.5"><span className="font-bold text-gray-700">Current Balance</span><span className={`font-black ${feeBalance <= 0 ? 'text-green-600' : 'text-red-600'}`}>KES {feeBalance.toLocaleString()} {feeBalance <= 0 ? '✓' : ''}</span></div>
            </div>
          </div>
        </div>

        {/* NEXT TERM */}
        {nextTerm && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border-2 border-orange-200 bg-orange-50/40 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-orange-700">Next Term Opening Date</p>
                  <p className="text-sm font-bold text-gray-800">{nextTerm.term_name} — {nextTermFormatted || 'TBA'}</p>
                </div>
              </div>
              <div className="text-right">
                {daysToNext !== null && daysToNext > 0 && <>
                  <p className="text-[9px] text-orange-600 font-bold">Days remaining</p>
                  <p className="text-2xl font-black text-orange-600">{daysToNext}</p>
                </>}
              </div>
            </div>
          </div>
        )}

        {/* COMMENTS */}
        <div className="px-3 pb-3 space-y-2">
          {[['Class Teacher\'s Comment', comments?.teacher_comment], ['Principal\'s Comment', comments?.principal_comment]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-gray-200 p-3">
              <h3 className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wide mb-1">{l}</h3>
              <p className="text-sm text-gray-700 min-h-[40px]">{v || <span className="text-gray-300 italic">No comment provided.</span>}</p>
            </div>
          ))}
        </div>

        {/* SIGNATURES */}
        <div className="px-5 pb-3 grid grid-cols-3 gap-6">
          {["Class Teacher's Signature", "Principal's Signature", "Parent / Guardian's Signature"].map(l => (
            <div key={l} className="text-center"><div className="border-b-2 border-gray-400 mb-1 h-7" /><p className="text-[9px] font-bold text-gray-500 uppercase">{l}</p></div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="border-t-4 border-indigo-700 px-5 py-2.5 text-center" style={{ background: 'linear-gradient(135deg, #312e81, #4338ca)' }}>
          <p className="text-white text-xs font-bold">This report card is computer-generated by Alpha School Management System (APSIMS)</p>
          <p className="text-indigo-300 text-[9px] mt-0.5">Printed on {printDate} · Powered by APSIMS — Kenya&apos;s Leading School Management Platform</p>
        </div>

        {/* RUBRIC LEGEND */}
        <div className="px-3 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[9px] font-extrabold text-gray-500 uppercase mb-2">Competency Level Reference</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(R).map(([code, m]) => (
              <div key={code} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border" style={{ borderColor: m.border, background: m.bg }}>
                <span className="text-xs font-black" style={{ color: m.color }}>{code}</span>
                <span className="text-[9px] font-medium" style={{ color: m.color }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';
import { useState } from 'react';
import { useTimetable } from './TimetableProvider';
import { DAYS, getSubjectColor } from './timetable-colors';
import type { ConflictItem, GenSettings } from './timetable-types';
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiUser, FiPrinter, FiBarChart2 } from 'react-icons/fi';

// ═══ VERIFICATION TAB ════════════════════════════════════════════
export function VerifyTab() {
  const ctx = useTimetable();
  const { runVerification } = ctx;
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [settings] = useState<GenSettings>({ maxConsecutiveSameSubject: 2, spreadEvenly: true, avoidLastPeriod: [], maxTeacherLessonsPerDay: 7 });

  const doVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      const c = runVerification(settings);
      setConflicts(c); setVerifying(false);
      if (c.length === 0) import('react-hot-toast').then(m => m.default.success('✅ No conflicts found!'));
      else import('react-hot-toast').then(m => m.default(`Found ${c.length} issues`, { icon: '⚠️' }));
    }, 500);
  };

  const errors = conflicts.filter(c => c.severity === 'error').length;
  const warnings = conflicts.filter(c => c.severity === 'warning').length;
  const infos = conflicts.filter(c => c.severity === 'info').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-black text-gray-800">✅ Timetable Verification</h1><p className="text-sm text-gray-500 mt-0.5">Check for conflicts, gaps, and constraint violations</p></div>
        <button onClick={doVerify} disabled={verifying} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 hover:shadow-xl transition-all">
          {verifying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking...</> : <><FiCheckCircle size={16} /> Run Verification</>}
        </button>
      </div>

      {conflicts.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Errors', count: errors, color: 'text-red-600 bg-red-50 border-red-200', icon: <FiAlertCircle size={20} /> },
              { label: 'Warnings', count: warnings, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <FiAlertTriangle size={20} /> },
              { label: 'Info', count: infos, color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <FiInfo size={20} /> },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-2xl p-5 text-center border-2`}>
                <div className="flex items-center justify-center gap-2 mb-1">{s.icon}<span className="text-3xl font-black">{s.count}</span></div>
                <p className="text-[10px] uppercase font-bold">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {conflicts.map((c, i) => (
                <div key={i} className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.severity === 'error' ? 'bg-red-100 text-red-600' : c.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {c.severity === 'error' ? <FiAlertCircle size={16} /> : c.severity === 'warning' ? <FiAlertTriangle size={16} /> : <FiInfo size={16} />}
                  </div>
                  <div><p className="text-sm font-bold text-gray-800">{c.message}</p><p className="text-xs text-gray-500 mt-0.5">{c.details}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <FiCheckCircle size={56} className="mx-auto mb-4 text-gray-200" />
          <p className="font-bold text-gray-400 text-lg">Ready to Verify</p>
          <p className="text-sm text-gray-300 mt-1">Click "Run Verification" to check for teacher clashes, missing assignments, and overloads</p>
        </div>
      )}
    </div>
  );
}

// ═══ STATISTICS TAB ══════════════════════════════════════════════
export function StatsTab() {
  const ctx = useTimetable();
  const { termEntries, termReqs, teacherLoads, classStats, totalAvailableSlots, subjects, bTerm, bYear } = ctx;
  const maxLoad = teacherLoads.length ? teacherLoads[0].count : 1;

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black text-gray-800">📊 Statistics & Analytics</h1><p className="text-sm text-gray-500 mt-0.5">{bTerm} {bYear} — Workload distribution & utilization</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { val: termEntries.length, label: 'Lessons Placed', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { val: termReqs.reduce((s, r) => s + r.lessons_per_week, 0), label: 'Required', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
          { val: totalAvailableSlots, label: 'Slots/Class', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { val: teacherLoads.length, label: 'Teachers', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { val: new Set(termEntries.map(e => e.subject_id)).size, label: 'Subjects', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border rounded-2xl p-5 text-center`}><p className={`text-3xl font-black ${s.color}`}>{s.val}</p><p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{s.label}</p></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2 text-sm"><FiUser size={16} className="text-blue-500" /> Teacher Workload Distribution</h3>
        <div className="space-y-2.5">
          {teacherLoads.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No assignments</p> :
            teacherLoads.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">{i + 1}</div>
                <div className="w-36 text-xs font-bold text-gray-700 truncate">{t.name}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-end pr-2.5 transition-all duration-700" style={{ width: `${Math.max((t.count / maxLoad) * 100, 10)}%` }}>
                    <span className="text-[10px] font-black text-white">{t.count}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-16 text-right font-bold">{t.count} L/wk</span>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30"><h3 className="font-bold text-gray-800">Class Completion Matrix</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">{['Class', 'Placed', 'Required', 'Completion'].map(h => <th key={h} className={`px-5 py-3 text-xs font-bold text-gray-500 uppercase ${h !== 'Class' ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
          <tbody>
            {classStats.length === 0 ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">No data</td></tr> :
              classStats.map(c => (
                <tr key={`${c.formId}-${c.streamId}`} className="border-b border-gray-50 hover:bg-blue-50/20">
                  <td className="px-5 py-3 font-bold text-gray-800">{c.formName} {c.streamName}</td>
                  <td className="px-5 py-3 text-center font-bold text-blue-600">{c.filled}</td>
                  <td className="px-5 py-3 text-center text-gray-500">{c.required}</td>
                  <td className="px-5 py-3"><div className="flex items-center justify-center gap-2">
                    <div className="w-28 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct >= 100 ? 'linear-gradient(90deg,#22c55e,#10b981)' : c.pct >= 70 ? 'linear-gradient(90deg,#f59e0b,#f97316)' : 'linear-gradient(90deg,#ef4444,#f43f5e)' }} /></div>
                    <span className={`text-xs font-black ${c.pct >= 100 ? 'text-green-600' : c.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{c.pct}%</span>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══ PRINT CENTER TAB — ASC-STYLE ROBUST REPORTS ════════════════
export function PrintTab() {
  const ctx = useTimetable();
  const { classStats, teacherLoads, termEntries, entries, allPeriodsSorted, subjects, teachers, bTerm, bYear, setTab, lessonPeriods,
    getSubjectName, getSubjectCode, getTeacherShort, getTeacherName, getFormName, getStreamName, printTimetable, buildPrintRows, classKeys } = ctx;

  const printClassTT = (fId: number, sId: number) => {
    printTimetable(`Class Timetable — ${getFormName(fId)} ${getStreamName(sId)}`,
      buildPrintRows((day, p) => entries.find(e => e.day_of_week === day && e.period_id === p.id && e.form_id === fId && e.stream_id === sId && e.term === bTerm && e.year === bYear)));
  };
  const printTeacherTT = (tid: number) => {
    const rows = allPeriodsSorted.map(p => ({
      period: p.period_name, time: `${p.start_time?.substring(0, 5)} - ${p.end_time?.substring(0, 5)}`, type: p.period_type,
      cells: DAYS.map(day => {
        const e = termEntries.find(x => x.teacher_id === tid && x.day_of_week === day && x.period_id === p.id);
        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
        return { subj: e?.subject_id ? getSubjectName(e.subject_id) : '', teacher: e ? `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '', room: e?.room || '', color, classLabel: e ? `🏫 ${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '' };
      })
    }));
    printTimetable(`Teacher Timetable — ${getTeacherName(tid)}`, rows);
  };
  const printAllClassTT = () => { classStats.forEach((c, i) => setTimeout(() => printClassTT(c.formId, c.streamId), i * 300)); };
  const printAllTeacherTT = () => { teacherLoads.forEach((t, i) => setTimeout(() => printTeacherTT(t.id), i * 300)); };

  // ── ASC-STYLE: Master Full-Week (all classes × all days) ──
  const printMasterFullWeek = () => {
    const activeClasses = classKeys.filter(c => termEntries.some(e => e.form_id === c.formId && e.stream_id === c.streamId));
    if (!activeClasses.length) return;
    const w = window.open('', '_blank'); if (!w) return;
    let pages = '';
    DAYS.forEach(day => {
      const dayRows = allPeriodsSorted.map(p => {
        if (p.period_type !== 'lesson') return `<tr><td colspan="${activeClasses.length + 1}" style="background:#fef3c7;padding:6px;font-size:9px;font-weight:700;text-align:center;color:#92400e;border:1px solid #fcd34d">☕ ${p.period_name}</td></tr>`;
        const cells = activeClasses.map(c => {
          const e = termEntries.find(x => x.form_id === c.formId && x.stream_id === c.streamId && x.day_of_week === day && x.period_id === p.id);
          if (!e?.subject_id) return `<td style="border:1px solid #e5e7eb;text-align:center;padding:3px;min-width:70px"><span style="color:#d1d5db;font-size:9px">—</span></td>`;
          const col = getSubjectColor(e.subject_id, subjects);
          return `<td style="border:1px solid #e5e7eb;text-align:center;padding:2px;min-width:70px"><div style="background:${col.bg};border:1.5px solid ${col.border};border-radius:5px;padding:4px 2px"><div style="font-weight:900;color:${col.text};font-size:9px">${getSubjectCode(e.subject_id)}</div><div style="font-size:7px;color:#6b7280;margin-top:1px">${getTeacherShort(e.teacher_id)}</div></div></td>`;
        }).join('');
        return `<tr><td style="background:#f8fafc;padding:6px;font-size:8px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">${p.period_name}<br><span style="font-size:7px;color:#9ca3af">${p.start_time?.substring(0,5)}</span></td>${cells}</tr>`;
      }).join('');
      const headers = activeClasses.map(c => `<th style="background:linear-gradient(135deg,#1e40af,#3730a3);color:#fff;padding:8px 4px;font-size:8px;text-align:center;border:1px solid #1e3a8a">${c.formName}<br>${c.streamName}</th>`).join('');
      pages += `<div class="page"><h2 style="text-align:center;font-size:16px;font-weight:900;color:#1e3a8a;margin:8px 0;text-transform:uppercase;letter-spacing:1px">${day}</h2><table style="width:100%;border-collapse:collapse"><thead><tr><th style="background:#0f172a;color:#fff;padding:8px;font-size:8px;border:1px solid #1e293b">Period</th>${headers}</tr></thead><tbody>${dayRows}</tbody></table></div>`;
    });
    w.document.write(`<!DOCTYPE html><html><head><title>Master Full-Week Timetable</title><style>@page{size:A3 landscape;margin:6mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:10px;background:#fff}.hdr{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:3px solid #1e3a8a}.hdr h1{font-size:20px;color:#1e3a8a;text-transform:uppercase;letter-spacing:2px;font-weight:900}.hdr p{font-size:10px;color:#6b7280;margin-top:3px}.page{margin-bottom:15px;page-break-after:always}@media print{.page{page-break-after:always}}</style></head><body><div class="hdr"><h1>ALPHA SCHOOL — MASTER TIMETABLE</h1><p>Full Week Overview — ${bTerm} ${bYear} • Generated ${new Date().toLocaleDateString('en-GB')}</p></div>${pages}<div style="text-align:center;font-size:7px;color:#9ca3af;margin-top:10px;border-top:1px solid #e5e7eb;padding-top:5px">Generated by APSIMS Timetable Engine • Powered by AlphaSchool</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  // ── ASC-STYLE: Teacher Workload Summary Report ──
  const printWorkloadReport = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const rows = teacherLoads.map((t, i) => {
      const tEntries = termEntries.filter(e => e.teacher_id === t.id);
      const subjectSet = [...new Set(tEntries.map(e => e.subject_id))];
      const classList = [...new Set(tEntries.map(e => `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}`))];
      const dayBreakdown = DAYS.map(d => tEntries.filter(e => e.day_of_week === d).length);
      const maxDay = Math.max(...dayBreakdown);
      const freeSlots = lessonPeriods.length * DAYS.length - t.count;
      return `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px;font-weight:700;color:#1e293b;font-size:11px">${i+1}. ${t.name}</td><td style="padding:10px;text-align:center;font-weight:800;color:#1e40af;font-size:13px">${t.count}</td><td style="padding:10px;text-align:center;font-size:10px;color:#6b7280">${subjectSet.map(s => getSubjectCode(s)).join(', ')}</td><td style="padding:10px;text-align:center;font-size:9px;color:#6b7280">${classList.join(', ')}</td><td style="padding:10px;text-align:center">${dayBreakdown.map(d => `<span style="display:inline-block;width:20px;text-align:center;font-size:9px;font-weight:700;color:${d >= 7 ? '#dc2626' : d >= 5 ? '#f59e0b' : '#22c55e'}">${d}</span>`).join('')}</td><td style="padding:10px;text-align:center;font-weight:700;color:${maxDay >= 7 ? '#dc2626' : '#22c55e'};font-size:11px">${maxDay}</td><td style="padding:10px;text-align:center;color:#6b7280;font-size:10px">${freeSlots}</td></tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Teacher Workload Report</title><style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:20px;background:#fff}table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)}.hdr{text-align:center;margin-bottom:15px;padding-bottom:10px;border-bottom:3px solid #1e3a8a}.hdr h1{font-size:18px;color:#1e3a8a;text-transform:uppercase;letter-spacing:2px}.hdr p{font-size:10px;color:#6b7280;margin-top:4px}</style></head><body><div class="hdr"><h1>TEACHER WORKLOAD SUMMARY</h1><p>${bTerm} ${bYear} • ${teacherLoads.length} Active Teachers • Generated ${new Date().toLocaleDateString('en-GB')}</p></div><table><thead><tr style="background:linear-gradient(135deg,#0f172a,#1e293b)"><th style="padding:12px;color:#fff;font-size:10px;text-align:left">Teacher</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">L/Week</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">Subjects</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">Classes</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">${DAYS.map(d => d.substring(0,2)).join(' ')}</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">Max/Day</th><th style="padding:12px;color:#fff;font-size:10px;text-align:center">Free</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:12px;text-align:center;font-size:7px;color:#9ca3af">APSIMS Timetable Engine — AlphaSchool</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black text-gray-800">🖨️ Print Center</h1><p className="text-sm text-gray-500 mt-0.5">ASC-style professional timetable reports</p></div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { val: classStats.length, label: 'Classes', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
          { val: teacherLoads.length, label: 'Teachers', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { val: termEntries.length, label: 'Lessons', bg: 'bg-purple-50 border-purple-200 text-purple-700' },
          { val: DAYS.length, label: 'Days/Week', bg: 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border rounded-2xl p-4 text-center`}><p className="text-2xl font-black">{s.val}</p><p className="text-[9px] uppercase font-bold opacity-70">{s.label}</p></div>
        ))}
      </div>

      {/* Print Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: '📅 All Class Timetables', desc: `Batch print all ${classStats.length} class timetables (Mon-Fri)`, action: printAllClassTT, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
          { title: '👤 All Teacher Timetables', desc: `Batch print all ${teacherLoads.length} teacher schedules`, action: printAllTeacherTT, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
          { title: '📋 Master Full-Week', desc: 'All classes × all days on separate pages (ASC-style)', action: printMasterFullWeek, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
          { title: '📊 Teacher Workload Report', desc: 'Lessons/week, subjects, daily breakdown, free slots', action: printWorkloadReport, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
          { title: '🔍 Print Single Class', desc: 'Navigate to Class View to select & print', action: () => setTab('class'), gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
          { title: '🔍 Print Single Teacher', desc: 'Navigate to Teacher View to select & print', action: () => setTab('teacher'), gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20' },
        ].map((item, i) => (
          <button key={i} onClick={item.action} className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:shadow-xl transition-all group hover:-translate-y-0.5">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl shadow-lg ${item.shadow} mb-4 group-hover:scale-110 transition-transform`}>{item.title.substring(0, 2)}</div>
            <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{item.title.substring(2)}</h3>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Quick Print Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-800">📅 Class Timetables</h3>
            <button onClick={printAllClassTT} className="text-[10px] px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Print All</button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
            {classStats.map(c => (
              <button key={`${c.formId}-${c.streamId}`} onClick={() => printClassTT(c.formId, c.streamId)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-left">
                <span className="font-bold text-sm text-gray-800">{c.formName} {c.streamName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.pct >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.pct}%</span>
                  <FiPrinter size={13} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-800">👤 Teacher Timetables</h3>
            <button onClick={printAllTeacherTT} className="text-[10px] px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold">Print All</button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
            {teacherLoads.map(t => (
              <button key={t.id} onClick={() => printTeacherTT(t.id)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-emerald-50/50 transition-colors text-left">
                <span className="font-bold text-sm text-gray-800">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{t.count} L/wk</span>
                  <FiPrinter size={13} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

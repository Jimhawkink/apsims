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

// ═══ PRINT CENTER TAB ════════════════════════════════════════════
export function PrintTab() {
  const ctx = useTimetable();
  const { classStats, teacherLoads, termEntries, entries, allPeriodsSorted, subjects, teachers, bTerm, bYear, setTab,
    getSubjectName, getTeacherShort, getTeacherName, getFormName, getStreamName, printTimetable, buildPrintRows } = ctx;

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
        return { subj: e?.subject_id ? getSubjectName(e.subject_id) : '', teacher: e ? `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '', room: e?.room || '', color };
      })
    }));
    printTimetable(`Teacher Timetable — ${getTeacherName(tid)}`, rows);
  };
  const printAllClassTT = () => { classStats.forEach((c, i) => setTimeout(() => printClassTT(c.formId, c.streamId), i * 200)); };
  const printAllTeacherTT = () => { teacherLoads.forEach((t, i) => setTimeout(() => printTeacherTT(t.id), i * 200)); };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black text-gray-800">🖨️ Print Center</h1><p className="text-sm text-gray-500 mt-0.5">Print and export timetables</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Print All Class Timetables', desc: `Print for all ${classStats.length} classes`, icon: '📅', action: printAllClassTT, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
          { title: 'Print All Teacher Timetables', desc: `Print for all ${teacherLoads.length} teachers`, icon: '👤', action: printAllTeacherTT, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
          { title: 'Print Single Class', desc: 'Select and print one class', icon: '📋', action: () => setTab('class'), gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' },
          { title: 'Print Single Teacher', desc: 'Select and print one teacher', icon: '👨‍🏫', action: () => setTab('teacher'), gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
        ].map((item, i) => (
          <button key={i} onClick={item.action} className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:shadow-xl transition-all group hover:-translate-y-0.5">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl shadow-lg ${item.shadow} mb-4 group-hover:scale-110 transition-transform`}>{item.icon}</div>
            <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{item.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

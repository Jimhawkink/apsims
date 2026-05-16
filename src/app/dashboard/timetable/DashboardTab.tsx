'use client';
import { useTimetable } from './TimetableProvider';
import { DAYS, DAY_SHORT, getSubjectColor } from './timetable-colors';
import { FiZap, FiPrinter, FiCheckCircle, FiEye, FiEdit3, FiTrendingUp, FiClock, FiUsers, FiTarget, FiActivity, FiCalendar, FiAward } from 'react-icons/fi';

export default function DashboardTab() {
  const ctx = useTimetable();
  const { termEntries, termReqs, teacherLoads, classStats, setTab, bTerm, bYear, forms, streams, subjects,
    lessonPeriods, allPeriodsSorted, totalAvailableSlots, getSubjectName, getTeacherShort, getFormName, getStreamName } = ctx;

  const totalRequired = termReqs.reduce((s, r) => s + r.lessons_per_week, 0);
  const completionPct = totalRequired ? Math.round(termEntries.length / totalRequired * 100) : 0;
  const maxLoad = teacherLoads.length ? teacherLoads[0].count : 1;
  const avgTeacherLoad = teacherLoads.length ? Math.round(teacherLoads.reduce((s, t) => s + t.count, 0) / teacherLoads.length) : 0;
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todayEntries = termEntries.filter(e => e.day_of_week === todayName);
  const uniqueSubjectsUsed = new Set(termEntries.map(e => e.subject_id)).size;
  const classesComplete = classStats.filter(c => c.pct >= 100).length;

  // Subject distribution for mini chart
  const subjectDistribution = subjects.map(s => ({
    name: s.subject_name,
    code: s.subject_code || s.subject_name?.substring(0, 3),
    count: termEntries.filter(e => e.subject_id === s.id).length,
    color: getSubjectColor(s.id, subjects),
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  const maxSubjCount = subjectDistribution.length ? subjectDistribution[0].count : 1;

  // Day load heatmap
  const dayLoads = DAYS.map(d => ({ day: d, short: DAY_SHORT[d], count: termEntries.filter(e => e.day_of_week === d).length }));
  const maxDayLoad = Math.max(...dayLoads.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-48 translate-x-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-32 -translate-x-32" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FiCalendar className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Timetable Command Center</h1>
                  <p className="text-blue-200/80 text-sm mt-0.5">APSIMS Smart Scheduler • {bTerm} {bYear} • Kenya MoE Compliant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                <p className="text-[10px] text-blue-200 uppercase font-bold">Curriculum</p>
                <p className="text-white font-bold text-sm">8-4-4 / CBC</p>
              </div>
              <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-lg ${completionPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-emerald-500/30' : completionPct >= 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30' : 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-red-500/30'}`}>
                {completionPct}% Complete
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI COMMAND STRIP ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { val: termEntries.length, label: 'Lessons Placed', icon: FiActivity, gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', pulse: false },
          { val: totalRequired, label: 'Total Required', icon: FiTarget, gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', pulse: false },
          { val: teacherLoads.length, label: 'Active Teachers', icon: FiUsers, gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', pulse: false },
          { val: `${classesComplete}/${classStats.length}`, label: 'Classes Done', icon: FiCheckCircle, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', pulse: classesComplete < classStats.length },
          { val: uniqueSubjectsUsed, label: 'Subjects Active', icon: FiAward, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', pulse: false },
          { val: `${avgTeacherLoad}L`, label: 'Avg. Load/Teacher', icon: FiTrendingUp, gradient: 'from-cyan-500 to-teal-600', shadow: 'shadow-cyan-500/20', pulse: false },
        ].map((kpi, i) => (
          <div key={i} className={`group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${kpi.pulse ? 'ring-2 ring-amber-200 ring-offset-1' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-lg ${kpi.shadow} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="text-white" size={18} />
              </div>
              <div>
                <p className="text-xl font-black text-gray-800 leading-tight">{kpi.val}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{kpi.label}</p>
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </div>
        ))}
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
          <FiZap size={16} className="text-amber-500" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Lesson Cards', icon: '📋', tab: 'cards' as const, bg: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
            { label: 'Auto Generate', icon: '⚡', tab: 'generate' as const, bg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md hover:shadow-lg' },
            { label: 'Manual Editor', icon: '✏️', tab: 'editor' as const, bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' },
            { label: 'Class View', icon: '📅', tab: 'class' as const, bg: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
            { label: 'Verify', icon: '✅', tab: 'verify' as const, bg: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' },
            { label: 'Print Center', icon: '🖨️', tab: 'print' as const, bg: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200' },
          ].map((a, i) => (
            <button key={i} onClick={() => setTab(a.tab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border transition-all duration-200 ${a.bg}`}>
              <span className="text-base">{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ═══ TODAY'S SCHEDULE ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><FiClock size={15} className="text-blue-500" /> Today — {todayName}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{todayEntries.length} lessons scheduled</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
            {todayEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {todayName === 'Saturday' || todayName === 'Sunday' ? '🏖️ Weekend — No lessons' : '📝 No lessons scheduled today'}
              </div>
            ) : (
              allPeriodsSorted.filter(p => p.period_type === 'lesson').map(p => {
                const dayEntries = todayEntries.filter(e => e.period_id === p.id);
                if (dayEntries.length === 0) return null;
                return (
                  <div key={p.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{p.period_name}</span>
                      <span className="text-[9px] text-gray-300">{p.start_time?.substring(0, 5)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {dayEntries.slice(0, 4).map((e, i) => {
                        const color = e.subject_id ? getSubjectColor(e.subject_id, subjects) : null;
                        return (
                          <div key={i} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: color?.bg, color: color?.text, border: `1px solid ${color?.border}` }}>
                            {getSubjectName(e.subject_id)} • {getFormName(e.form_id)}
                          </div>
                        );
                      })}
                      {dayEntries.length > 4 && <span className="text-[10px] text-gray-400 px-2 py-1">+{dayEntries.length - 4} more</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ CLASS COMPLETION ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><FiCheckCircle size={15} className="text-emerald-500" /> Class Completion</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{classesComplete}/{classStats.length} classes fully scheduled</p>
          </div>
          <div className="p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
            {classStats.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No requirements defined</div>
            ) : classStats.map(c => (
              <div key={`${c.formId}-${c.streamId}`} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700">{c.formName} {c.streamName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{c.filled}/{c.required}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.pct >= 100 ? 'bg-emerald-100 text-emerald-700' : c.pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct >= 100 ? 'linear-gradient(90deg,#22c55e,#10b981)' : c.pct >= 70 ? 'linear-gradient(90deg,#f59e0b,#f97316)' : 'linear-gradient(90deg,#ef4444,#f43f5e)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ TOP SUBJECT DISTRIBUTION ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><FiAward size={15} className="text-purple-500" /> Subject Distribution</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Top 10 subjects by lesson count</p>
          </div>
          <div className="p-4 space-y-2 max-h-[340px] overflow-y-auto">
            {subjectDistribution.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No lessons placed yet</div>
            ) : subjectDistribution.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: s.color.bg, color: s.color.text }}>{s.code}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-gray-700 truncate">{s.name}</span>
                    <span className="text-[10px] font-bold text-gray-500 flex-shrink-0 ml-2">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.count / maxSubjCount) * 100}%`, background: s.color.text }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ DAY LOAD HEATMAP + TEACHER TOP 5 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><FiCalendar size={15} className="text-blue-500" /> Weekly Load Distribution</h3>
          <div className="grid grid-cols-5 gap-3">
            {dayLoads.map(d => {
              const intensity = d.count / maxDayLoad;
              return (
                <div key={d.day} className="text-center">
                  <div className="w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 cursor-default" style={{ background: `rgba(59,130,246,${0.05 + intensity * 0.35})`, border: `2px solid rgba(59,130,246,${0.1 + intensity * 0.4})` }}>
                    <span className="text-2xl font-black" style={{ color: `rgba(30,64,175,${0.3 + intensity * 0.7})` }}>{d.count}</span>
                    <span className="text-[9px] font-bold text-gray-500 mt-1">lessons</span>
                  </div>
                  <p className="text-xs font-bold text-gray-600 mt-2">{d.short}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><FiUsers size={15} className="text-emerald-500" /> Teacher Workload — Top 5</h3>
          <div className="space-y-3">
            {teacherLoads.slice(0, 5).map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700 truncate">{t.name}</span>
                    <span className="text-xs font-black text-blue-600">{t.count} L/wk</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500" style={{ width: `${(t.count / maxLoad) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {teacherLoads.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No teacher assignments</p>}
            {teacherLoads.length > 5 && (
              <button onClick={() => setTab('stats')} className="w-full text-center text-xs text-blue-600 font-bold hover:text-blue-700 py-2">
                View all {teacherLoads.length} teachers →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useMemo } from 'react';
import { useTimetable } from './TimetableProvider';
import { DAYS, DAY_SHORT, getSubjectColor } from './timetable-colors';
import { FiPrinter, FiDownload, FiUser } from 'react-icons/fi';
import { exportTimetableToCSV } from './ExportUtils';

// ─── STUDENT TIMETABLE TAB ─────────────────────────────────────────
// Shows individual student's weekly schedule (by their form + stream)
// Kenya MoE compliant — shows CBC or 8-4-4 label per subject

export function StudentTimetableTab() {
  const ctx = useTimetable();
  const {
    forms, streams, termEntries, allPeriodsSorted, subjects, bTerm, bYear,
    getSubjectName, getTeacherShort, getFormName, getStreamName,
    getSubjectCode, getTeacherName,
    entries,
  } = ctx;

  const [sForm, setSForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [sStream, setSStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const [viewMode, setViewMode] = useState<'grid' | 'daily'>('grid');
  const [selectedDay, setSelectedDay] = useState('Monday');

  const fid = Number(sForm);
  const sid = Number(sStream);

  const studentEntries = useMemo(() =>
    termEntries.filter(e => e.form_id === fid && e.stream_id === sid),
    [termEntries, fid, sid]
  );

  // Detect curriculum type from form name
  const curriculumType = useMemo(() => {
    const form = forms.find(f => f.id === fid);
    if (!form) return '8-4-4';
    const n = form.form_name?.toLowerCase() || '';
    if (/grade\s*[7-9]|grade\s*(10|11|12)|jss|junior\s*secondary/i.test(n)) return 'CBC';
    return '8-4-4';
  }, [fid, forms]);

  const lessonCount = studentEntries.filter(e => {
    const p = allPeriodsSorted.find(p => p.id === e.period_id);
    return p?.period_type === 'lesson';
  }).length;

  const subjectsSummary = useMemo(() => {
    const subjectIds = [...new Set(studentEntries.filter(e => e.subject_id).map(e => e.subject_id!))];
    return subjectIds.map(subId => ({
      name: getSubjectName(subId),
      count: studentEntries.filter(e => e.subject_id === subId).length,
      color: getSubjectColor(subId, subjects),
    })).sort((a, b) => b.count - a.count);
  }, [studentEntries, subjects]);

  const handleExportCSV = () => {
    exportTimetableToCSV(
      `Student_Timetable_${getFormName(fid)}_${getStreamName(sid)}_${bTerm}_${bYear}`,
      studentEntries,
      allPeriodsSorted,
      getSubjectName,
      getTeacherName,
      getFormName,
      getStreamName,
    );
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const gridRows = allPeriodsSorted.map(p => {
      if (p.period_type !== 'lesson') {
        return `<tr><td colspan="6" style="background:#fef3c7;padding:8px;font-size:10px;font-weight:700;color:#92400e;text-align:center;border:1px solid #fcd34d">☕ ${p.period_name} &nbsp; ${p.start_time?.substring(0,5)||''} – ${p.end_time?.substring(0,5)||''}</td></tr>`;
      }
      const cells = DAYS.map(day => {
        const e = studentEntries.find(x => x.day_of_week === day && x.period_id === p.id);
        if (!e || !e.subject_id) return `<td style="border:1px solid #e5e7eb;padding:6px;text-align:center;color:#d1d5db;font-size:10px">—</td>`;
        return `<td style="border:1px solid #e5e7eb;padding:6px;text-align:center;background:#eff6ff">
          <div style="font-weight:900;font-size:12px;color:#1d4ed8">${getSubjectName(e.subject_id)}</div>
          <div style="font-size:9px;color:#6b7280;margin-top:2px">👤 ${getTeacherShort(e.teacher_id)}</div>
          ${e.room ? `<div style="font-size:8px;color:#9ca3af">📍 ${e.room}</div>` : ''}
        </td>`;
      }).join('');
      return `<tr>
        <td style="background:#f8fafc;padding:8px;font-size:9px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">
          ${p.period_name}<br><span style="font-size:8px;color:#9ca3af">${p.start_time?.substring(0,5)||''} – ${p.end_time?.substring(0,5)||''}</span>
        </td>${cells}</tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Student Timetable</title>
    <style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:15px}table{border-collapse:collapse;width:100%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
    </head><body>
    <div style="border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between">
      <div><h1 style="font-size:20px;font-weight:900;color:#1e3a8a">📅 Student Timetable</h1>
      <p style="font-size:12px;color:#64748b;margin-top:3px">${getFormName(fid)} ${getStreamName(sid)} &nbsp;|&nbsp; ${bTerm} ${bYear} &nbsp;|&nbsp; ${curriculumType}</p></div>
      <div style="font-size:9px;color:#94a3b8">APSIMS Smart Scheduler &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-KE')}</div>
    </div>
    <table>
      <thead><tr>
        <th style="background:#0f172a;color:#fff;padding:10px;font-size:10px;text-align:left">Period</th>
        ${DAYS.map(d=>`<th style="background:linear-gradient(135deg,#1e40af,#3730a3);color:#fff;padding:10px;font-size:10px;text-align:center">${d}</th>`).join('')}
      </tr></thead>
      <tbody>${gridRows}</tbody>
    </table>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
          <select value={sForm} onChange={e => { setSForm(e.target.value); setSStream(''); }}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[140px]">
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream / Class</label>
          <select value={sStream} onChange={e => setSStream(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[140px]">
            <option value="">— All Streams —</option>
            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-1">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>
            📋 Grid
          </button>
          <button onClick={() => setViewMode('daily')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>
            📅 Daily
          </button>
        </div>
        <div className="flex-1" />
        <div className={`px-3 py-2 rounded-xl text-xs font-bold ${curriculumType === 'CBC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {curriculumType === 'CBC' ? '🌿 CBC' : '📚 8-4-4'} &nbsp;|&nbsp; {lessonCount} lessons/week
        </div>
        <button onClick={handleExportCSV}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
          <FiDownload size={14} /> Excel
        </button>
        <button onClick={handlePrint}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
          <FiPrinter size={14} /> Print PDF
        </button>
      </div>

      {sForm && (
        <>
          {/* Header banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📅</div>
              <div>
                <h2 className="text-xl font-black">{getFormName(fid)} {sStream ? getStreamName(sid) : 'All Streams'}</h2>
                <p className="text-blue-200 text-xs mt-0.5">{bTerm} {bYear} &nbsp;·&nbsp; {curriculumType} Curriculum &nbsp;·&nbsp; {lessonCount} lessons/week</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              {subjectsSummary.slice(0,6).map((s,i) => (
                <div key={i} className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold">
                  {s.name} <span className="opacity-70">×{s.count}</span>
                </div>
              ))}
              {subjectsSummary.length > 6 && <div className="px-3 py-1 bg-white/10 rounded-lg text-xs">+{subjectsSummary.length - 6} more</div>}
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* ── Full Week Grid ── */
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead><tr>
                    <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold sticky left-0 z-10 min-w-[80px]">Period</th>
                    <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold min-w-[55px]">Time</th>
                    {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[130px]">{d}</th>)}
                  </tr></thead>
                  <tbody>
                    {allPeriodsSorted.map(p => {
                      if (p.period_type !== 'lesson') return (
                        <tr key={p.id}>
                          <td colSpan={DAYS.length + 2} className="text-center py-2.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100">
                            ☕ {p.period_name} &nbsp; {p.start_time?.substring(0,5)} – {p.end_time?.substring(0,5)}
                          </td>
                        </tr>
                      );
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/20">
                          <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                          <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0,5)}<br />{p.end_time?.substring(0,5)}</td>
                          {DAYS.map(day => {
                            const e = studentEntries.find(x => x.day_of_week === day && x.period_id === p.id);
                            if (!e || !e.subject_id) return <td key={day} className="border border-gray-200 text-center text-gray-200 text-[10px]">—</td>;
                            const color = getSubjectColor(e.subject_id, subjects);
                            return (
                              <td key={day} className="border border-gray-200 text-center p-0.5">
                                <div className="rounded-xl p-2 mx-0.5 transition-all hover:scale-[1.03]"
                                  style={{ background: color.bg, border: `2px solid ${color.border}` }}>
                                  <div className="font-black text-[11px] leading-tight" style={{ color: color.text }}>{getSubjectCode(e.subject_id)}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-semibold">👤 {getTeacherShort(e.teacher_id)}</div>
                                  {e.room && <div className="text-[8px] text-gray-400 mt-0.5">📍 {e.room}</div>}
                                  {e.is_double && <div className="text-[8px] font-black text-amber-700 mt-0.5">2×</div>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Daily View ── */
            <div className="space-y-3">
              <div className="flex gap-2 bg-white rounded-xl border border-gray-200 p-1 w-fit">
                {DAYS.map(d => (
                  <button key={d} onClick={() => setSelectedDay(d)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedDay === d ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {DAY_SHORT[d]}
                    <div className="text-[9px] opacity-70 mt-0.5">
                      {studentEntries.filter(e => e.day_of_week === d && allPeriodsSorted.find(p => p.id === e.period_id)?.period_type === 'lesson').length}
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {allPeriodsSorted.map(p => {
                  const e = studentEntries.find(x => x.day_of_week === selectedDay && x.period_id === p.id);
                  if (p.period_type !== 'lesson') return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-100 border-dashed rounded-xl">
                      <span className="text-lg">☕</span>
                      <div>
                        <div className="text-xs font-bold text-amber-800">{p.period_name}</div>
                        <div className="text-[10px] text-amber-600">{p.start_time?.substring(0,5)} – {p.end_time?.substring(0,5)}</div>
                      </div>
                    </div>
                  );
                  const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : null;
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="w-1 self-stretch" style={{ background: color?.text || '#e2e8f0' }} />
                      <div className="py-3 px-2 text-center min-w-[55px]">
                        <div className="text-xs font-bold text-gray-700">{p.start_time?.substring(0,5)}</div>
                        <div className="text-[9px] text-gray-400">{p.end_time?.substring(0,5)}</div>
                      </div>
                      <div className="text-[9px] text-gray-400 font-semibold min-w-[50px]">{p.period_name}</div>
                      {e && e.subject_id ? (
                        <div className="flex-1 py-3">
                          <div className="font-black text-sm text-gray-900">{getSubjectName(e.subject_id)}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            👤 {getTeacherShort(e.teacher_id)}
                            {e.room && <> &nbsp;·&nbsp; 📍 {e.room}</>}
                            {e.is_double && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">2× Double</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 py-3 text-sm text-gray-300 font-medium">Free Period</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Subjects This Week</h4>
            <div className="flex flex-wrap gap-2">
              {subjectsSummary.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: s.color.bg, color: s.color.text, border: `1.5px solid ${s.color.border}` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color.text }} />
                  {s.name}
                  <span className="opacity-60 ml-1">({s.count}/wk)</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';
import { useState, useMemo } from 'react';
import { useTimetable } from './TimetableProvider';
import { DAYS, DAY_SHORT, getSubjectColor } from './timetable-colors';
import type { Entry, Period } from './timetable-types';
import { FiPrinter, FiUser, FiBook, FiLink } from 'react-icons/fi';

// ═══ Shared Grid Renderer ═══════════════════════════════════════
function UltraGrid({ filterFn, viewMode = 'class' }: {
  filterFn: (day: string, p: Period) => Entry | undefined;
  viewMode?: 'class' | 'teacher' | 'room';
}) {
  const { allPeriodsSorted, subjects, getSubjectCode, getTeacherShort, getFormName, getStreamName } = useTimetable();
  const renderCell = (e: Entry | undefined) => {
    if (!e || !e.subject_id) return <span className="text-gray-200">—</span>;
    const color = getSubjectColor(e.subject_id, subjects);
    const classLabel = `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}`;
    return (
      <div className="rounded-xl p-2 mx-0.5 transition-all hover:scale-[1.03]" style={{ background: color.bg, border: `2px solid ${color.border}` }}>
        <div className="font-black text-[11px] leading-tight" style={{ color: color.text }}>{getSubjectCode(e.subject_id)}</div>
        {viewMode === 'class' ? (
          <div className="text-[9px] text-gray-600 mt-0.5 font-semibold">👤 {getTeacherShort(e.teacher_id)}</div>
        ) : viewMode === 'teacher' ? (
          <div className="text-[9px] font-bold mt-0.5" style={{ color: color.text, opacity: 0.8 }}>🏫 {classLabel}</div>
        ) : (
          <><div className="text-[9px] font-bold mt-0.5" style={{ color: color.text, opacity: 0.8 }}>🏫 {classLabel}</div>
          <div className="text-[8px] text-gray-500">👤 {getTeacherShort(e.teacher_id)}</div></>
        )}
      </div>
    );
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead><tr>
          <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
          <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[55px]">Time</th>
          {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[125px]">{d}</th>)}
        </tr></thead>
        <tbody>
          {allPeriodsSorted.map(p => {
            if (p.period_type !== 'lesson') return (
              <tr key={p.id}><td colSpan={DAYS.length + 2} className="text-center py-2.5 text-[10px] font-bold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                ☕ {p.period_name} ({p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)})
              </td></tr>
            );
            return (
              <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0,5)}<br/>{p.end_time?.substring(0,5)}</td>
                {DAYS.map(day => {
                  const e = filterFn(day, p);
                  return <td key={day} className="border border-gray-200 text-center p-0.5" style={{ minWidth: 135 }}>{renderCell(e)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══ CLASS VIEW ═══════════════════════════════════════════════════
export function ClassViewTab() {
  const ctx = useTimetable();
  const { forms, streams, entries, subjects, termEntries, bTerm, bYear, getFormName, getStreamName, printTimetable, buildPrintRows } = ctx;
  const [cForm, setCForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [cStream, setCStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const classEntries = termEntries.filter(e => e.form_id === Number(cForm) && e.stream_id === Number(cStream));
  const printClassTT = () => {
    printTimetable(`Class Timetable — ${getFormName(Number(cForm))} ${getStreamName(Number(cStream))}`,
      buildPrintRows((day, p) => entries.find(e => e.day_of_week === day && e.period_id === p.id && e.form_id === Number(cForm) && e.stream_id === Number(cStream) && e.term === bTerm && e.year === bYear)));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={cForm} onChange={e => setCForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={cStream} onChange={e => setCStream(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        <div className="flex-1" />
        <div className="px-3 py-2 bg-blue-50 rounded-xl text-xs font-bold text-blue-700">{classEntries.length} lessons</div>
        <button onClick={printClassTT} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPrinter size={14} /> Print</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-black text-lg text-gray-800">📅 {getFormName(Number(cForm))} {getStreamName(Number(cStream))} — {bTerm} {bYear}</h3>
        </div>
        <UltraGrid viewMode="class" filterFn={(day, p) => entries.find(e => e.day_of_week === day && e.period_id === p.id && e.form_id === Number(cForm) && e.stream_id === Number(cStream) && e.term === bTerm && e.year === bYear)} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Subject Legend</h4>
        <div className="flex flex-wrap gap-2">
          {subjects.filter(s => classEntries.some(e => e.subject_id === s.id)).map(s => {
            const color = getSubjectColor(s.id, subjects);
            return <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: color.bg, color: color.text, border: `1.5px solid ${color.border}` }}><div className="w-2 h-2 rounded-full" style={{ background: color.text }} />{s.subject_name} <span className="opacity-60">({classEntries.filter(e => e.subject_id === s.id).length})</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ TEACHER VIEW — shows linked subjects/classes from Settings ══
export function TeacherViewTab() {
  const ctx = useTimetable();
  const { teachers, termEntries, entries, bTerm, bYear, getTeacherName, getSubjectName, getFormName, getStreamName,
    printTimetable, allPeriodsSorted, subjects, subjectTeachers } = ctx;
  const [tTeacher, setTTeacher] = useState('');
  const tid = Number(tTeacher);

  const teacherEntries = tTeacher ? termEntries.filter(e => e.teacher_id === tid) : [];

  // Get linked subjects/classes from Settings for this teacher
  const teacherLinks = useMemo(() => {
    if (!tTeacher) return [];
    return subjectTeachers.filter(st => st.teacher_id === tid).map(st => ({
      subject: getSubjectName(st.subject_id),
      form: st.form_id ? getFormName(st.form_id) : 'All Forms',
      stream: st.stream_id ? getStreamName(st.stream_id) : 'All Streams',
      subjectId: st.subject_id,
    }));
  }, [tTeacher, subjectTeachers]);

  const printTeacherTT = () => {
    const rows = allPeriodsSorted.map(p => ({
      period: p.period_name, time: `${p.start_time?.substring(0,5)} - ${p.end_time?.substring(0,5)}`, type: p.period_type,
      cells: DAYS.map(day => {
        const e = termEntries.find(x => x.teacher_id === tid && x.day_of_week === day && x.period_id === p.id);
        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
        return { subj: e?.subject_id ? getSubjectName(e.subject_id) : '', teacher: e ? `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '', room: e?.room || '', color };
      })
    }));
    printTimetable(`Teacher Timetable — ${getTeacherName(tid)}`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Teacher</label>
          <select value={tTeacher} onChange={e => setTTeacher(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[220px]"><option value="">— Select Teacher —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
        </div>
        {tTeacher && <>
          <div className="px-3 py-2 bg-blue-50 rounded-xl text-xs font-bold text-blue-700">{teacherEntries.length} lessons/week</div>
          <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 flex items-center gap-1.5"><FiLink size={12} /> {teacherLinks.length} subject-class links</div>
          <button onClick={printTeacherTT} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPrinter size={14} /> Print</button>
        </>}
      </div>

      {/* Teacher's linked subjects/classes from Settings */}
      {tTeacher && teacherLinks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><FiBook size={11} /> Linked Subjects & Classes (from Settings)</h4>
          <div className="flex flex-wrap gap-2">
            {teacherLinks.map((lk, i) => {
              const color = getSubjectColor(lk.subjectId, subjects);
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
                  <span style={{ color: color.text }}>📚 {lk.subject}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-700">🏫 {lk.form} {lk.stream}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="font-black text-lg text-gray-800">👤 {getTeacherName(tid)} — {bTerm} {bYear}</h3>
          </div>
          <UltraGrid viewMode="teacher" filterFn={(day, p) => termEntries.find(x => x.teacher_id === tid && x.day_of_week === day && x.period_id === p.id)} />
        </div>
      )}
    </div>
  );
}

// ═══ ROOM VIEW ═══════════════════════════════════════════════════
export function RoomViewTab() {
  const { classrooms, termEntries, bTerm, bYear } = useTimetable();
  const [viewRoom, setViewRoom] = useState('');
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black text-gray-800">🚪 Room View</h1><p className="text-sm text-gray-500 mt-0.5">See room occupancy across the week</p></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Room</label>
        <select value={viewRoom} onChange={e => setViewRoom(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[220px]"><option value="">— Select Room —</option>{classrooms.map(r => <option key={r.id} value={r.room_name}>{r.room_name}</option>)}</select>
      </div>
      {viewRoom && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50"><h3 className="font-black text-lg text-gray-800">🚪 {viewRoom} — {bTerm} {bYear}</h3></div>
          <UltraGrid viewMode="room" filterFn={(day, p) => termEntries.find(x => x.room === viewRoom && x.day_of_week === day && x.period_id === p.id)} />
        </div>
      )}
    </div>
  );
}

// ═══ MASTER TIMETABLE ════════════════════════════════════════════
export function MasterViewTab() {
  const ctx = useTimetable();
  const { termEntries, allPeriodsSorted, subjects, classKeys, bTerm, bYear, getSubjectCode, getTeacherShort, getFormName, getStreamName, printTimetable, getSubjectName } = ctx;
  const [masterDay, setMasterDay] = useState('Monday');

  const activeClasses = classKeys.filter(c => termEntries.some(e => e.form_id === c.formId && e.stream_id === c.streamId));

  const renderCell = (e: Entry | undefined) => {
    if (!e || !e.subject_id) return <span className="text-gray-200 text-[10px]">—</span>;
    const color = getSubjectColor(e.subject_id, subjects);
    return (
      <div className="rounded-lg p-1.5 mx-0.5" style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
        <div className="font-black text-[10px]" style={{ color: color.text }}>{getSubjectCode(e.subject_id)}</div>
        <div className="text-[8px] text-gray-600 mt-0.5 font-semibold">👤 {getTeacherShort(e.teacher_id)}</div>
      </div>
    );
  };

  const printMaster = () => {
    const rows = allPeriodsSorted.map(p => ({
      period: p.period_name, time: `${p.start_time?.substring(0,5)} - ${p.end_time?.substring(0,5)}`, type: p.period_type,
      cells: activeClasses.map(c => {
        const e = termEntries.find(x => x.form_id === c.formId && x.stream_id === c.streamId && x.day_of_week === masterDay && x.period_id === p.id);
        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
        return { subj: e?.subject_id ? getSubjectCode(e.subject_id) : '', teacher: e?.teacher_id ? getTeacherShort(e.teacher_id) : '', room: '', color };
      })
    }));
    const dayHeaders = activeClasses.map(c => `${c.formName} ${c.streamName}`);
    const w = window.open('', '_blank'); if (!w) return;
    const dh = dayHeaders.map(d => `<th style="background:linear-gradient(135deg,#1e40af,#3730a3);color:#fff;padding:10px 6px;font-size:9px;text-align:center;border:1px solid #1e3a8a">${d}</th>`).join('');
    const br = rows.map((r: any) => {
      if (r.type !== 'lesson') return `<tr><td style="background:#fef3c7;padding:8px;font-size:10px;font-weight:700;border:1px solid #fcd34d;text-align:center;color:#92400e" colspan="${activeClasses.length + 1}">☕ ${r.period}</td></tr>`;
      const cells = r.cells.map((c: any) => {
        if (!c.subj) return `<td style="padding:4px;border:1px solid #e5e7eb;text-align:center;min-width:80px"><span style="color:#d1d5db">—</span></td>`;
        const bg = c.color?.bg || '#dbeafe'; const txt = c.color?.text || '#1e40af'; const brd = c.color?.border || '#93c5fd';
        return `<td style="padding:2px;border:1px solid #e5e7eb;text-align:center;min-width:80px"><div style="background:${bg};border:1.5px solid ${brd};border-radius:6px;padding:5px 2px"><div style="font-weight:900;color:${txt};font-size:10px">${c.subj}</div><div style="font-size:8px;color:#6b7280;margin-top:2px">👤 ${c.teacher}</div></div></td>`;
      }).join('');
      return `<tr><td style="background:#f8fafc;padding:8px;font-size:9px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">${r.period}<br><span style="font-size:8px;color:#9ca3af">${r.time}</span></td>${cells}</tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Master Timetable</title><style>@page{size:A3 landscape;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:15px;background:#fff}table{width:100%;border-collapse:collapse}.hdr{text-align:center;margin-bottom:15px;padding-bottom:10px;border-bottom:3px solid #1e3a8a}.hdr h1{font-size:20px;color:#1e3a8a;text-transform:uppercase;letter-spacing:2px;font-weight:900}.hdr p{font-size:11px;color:#6b7280;margin-top:4px}</style></head><body><div class="hdr"><h1>Master Timetable</h1><p>${masterDay} — ${bTerm} ${bYear}</p></div><table><thead><tr><th style="background:#0f172a;color:#fff;padding:10px;font-size:10px;border:1px solid #1e293b">Period</th>${dh}</tr></thead><tbody>${br}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-black text-gray-800">📋 Master Timetable</h1><p className="text-sm text-gray-500 mt-0.5">All classes at a glance for a selected day</p></div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {DAYS.map(d => <button key={d} onClick={() => setMasterDay(d)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${masterDay === d ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50'}`}>{DAY_SHORT[d]}</button>)}
          </div>
          <button onClick={printMaster} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPrinter size={14} /> Print</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr>
              <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold sticky left-0 z-10">Period</th>
              {activeClasses.map(c => <th key={`${c.formId}-${c.streamId}`} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-2 text-center text-[9px] font-bold min-w-[90px]">{c.formName}<br />{c.streamName}</th>)}
            </tr></thead>
            <tbody>
              {allPeriodsSorted.map(p => {
                if (p.period_type !== 'lesson') return <tr key={p.id}><td colSpan={activeClasses.length + 1} className="text-center py-2 text-[10px] font-bold text-amber-700 bg-amber-50 border">☕ {p.period_name}</td></tr>;
                return (
                  <tr key={p.id} className="hover:bg-blue-50/20">
                    <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10 whitespace-nowrap">{p.period_name}<br /><span className="text-[8px] text-gray-400 font-normal">{p.start_time?.substring(0,5)}</span></td>
                    {activeClasses.map(c => {
                      const e = termEntries.find(x => x.form_id === c.formId && x.stream_id === c.streamId && x.day_of_week === masterDay && x.period_id === p.id);
                      return <td key={`${c.formId}-${c.streamId}`} className="border border-gray-200 text-center p-0.5" style={{ minWidth: 90 }}>{renderCell(e)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

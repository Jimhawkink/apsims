'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { DAYS, getSubjectColor } from './timetable-colors';
import { FiSave, FiX } from 'react-icons/fi';

export default function EditorTab() {
  const ctx = useTimetable();
  const { forms, streams, subjects, teachers, entries, allPeriodsSorted, bTerm, bYear, fetchAll,
    getSubjectCode, getTeacherShort, getSubjectName, getFormName, getStreamName, isTeacherBusy, getTeacherName } = ctx;

  const [bForm, setBForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [bStream, setBStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const [editCell, setEditCell] = useState<{ day: string; periodId: number } | null>(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  const getEntry = (day: string, periodId: number) =>
    entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === Number(bForm) && e.stream_id === Number(bStream) && e.term === bTerm && e.year === bYear);

  const openEdit = (day: string, periodId: number) => {
    const ex = getEntry(day, periodId);
    setEditCell({ day, periodId });
    setCellSubject(ex?.subject_id ? String(ex.subject_id) : '');
    setCellTeacher(ex?.teacher_id ? String(ex.teacher_id) : '');
    setCellRoom(ex?.room || '');
  };

  const handleSaveCell = async () => {
    if (!editCell || !bForm || !bStream) return;
    setSavingCell(true);
    const { day, periodId } = editCell;
    const existing = getEntry(day, periodId);
    if (!cellSubject) {
      if (existing) { await supabase.from('school_timetable_entries').delete().eq('id', existing.id); toast.success('Cleared'); }
    } else {
      if (cellTeacher) {
        const c = isTeacherBusy(Number(cellTeacher), day, periodId, Number(bForm), Number(bStream));
        if (c) { toast.error(`${getTeacherName(Number(cellTeacher))} is busy with ${getFormName(c.form_id)} ${getStreamName(c.stream_id)}`); setSavingCell(false); return; }
      }
      const data = { day_of_week: day, period_id: periodId, form_id: Number(bForm), stream_id: Number(bStream), subject_id: Number(cellSubject) || null, teacher_id: Number(cellTeacher) || null, room: cellRoom || null, term: bTerm, year: bYear };
      if (existing) await supabase.from('school_timetable_entries').update(data).eq('id', existing.id);
      else await supabase.from('school_timetable_entries').upsert([{ ...data, is_double: false }], { onConflict: 'day_of_week,period_id,form_id,stream_id,term,year' });
      toast.success('Saved');
    }
    setEditCell(null); setCellSubject(''); setCellTeacher(''); setCellRoom('');
    await fetchAll(); setSavingCell(false);
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black text-gray-800">✏️ Manual Editor</h1><p className="text-sm text-gray-500 mt-0.5">Click any cell to assign or change a lesson</p></div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={bForm} onChange={e => setBForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={bStream} onChange={e => setBStream(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold">{getFormName(Number(bForm))} {getStreamName(Number(bStream))} — {bTerm} {bYear}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr>
              <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
              <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[55px]">Time</th>
              {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[140px]">{d}</th>)}
            </tr></thead>
            <tbody>
              {allPeriodsSorted.map(p => {
                if (p.period_type !== 'lesson') return (
                  <tr key={p.id}><td colSpan={DAYS.length + 2} className="text-center py-2.5 text-[10px] font-bold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                    ☕ {p.period_name} ({p.start_time?.substring(0, 5)} - {p.end_time?.substring(0, 5)})
                  </td></tr>
                );
                return (
                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                    <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0, 5)}<br />{p.end_time?.substring(0, 5)}</td>
                    {DAYS.map(day => {
                      const entry = getEntry(day, p.id);
                      const isEditing = editCell?.day === day && editCell?.periodId === p.id;
                      const color = entry?.subject_id ? getSubjectColor(entry.subject_id, subjects) : null;
                      return (
                        <td key={day} className="border border-gray-200 p-0 relative" style={{ minWidth: 140 }}>
                          {isEditing ? (
                            <div className="p-2 bg-blue-50 space-y-1.5 border-2 border-blue-300 rounded-lg m-0.5">
                              <select value={cellSubject} onChange={e => setCellSubject(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium"><option value="">— None —</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
                              <select value={cellTeacher} onChange={e => setCellTeacher(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs font-medium"><option value="">— Teacher —</option>{teachers.map(t => { const busy = isTeacherBusy(t.id, day, p.id, Number(bForm), Number(bStream)); return <option key={t.id} value={t.id} disabled={!!busy}>{t.first_name} {t.last_name}{busy ? ' ⚠️' : ''}</option>; })}</select>
                              <input value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder="Room" className="w-full px-2 py-1.5 border rounded-lg text-xs" />
                              <div className="flex gap-1">
                                <button onClick={handleSaveCell} disabled={savingCell} className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs font-bold"><FiSave className="inline mr-1" size={10} />Save</button>
                                <button onClick={() => setEditCell(null)} className="px-3 py-1.5 bg-gray-200 rounded-lg text-xs font-medium"><FiX size={10} /></button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openEdit(day, p.id)} className="w-full h-full min-h-[60px] p-1 hover:bg-blue-50 transition-all text-center group">
                              {entry && entry.subject_id ? (
                                <div className="rounded-xl p-2 mx-0.5 transition-transform group-hover:scale-[1.02]" style={{ background: color?.bg, border: `2px solid ${color?.border}` }}>
                                  <div className="font-black text-[11px] leading-tight" style={{ color: color?.text }}>{getSubjectCode(entry.subject_id)}</div>
                                  <div className="text-[9px] text-gray-500 mt-0.5 font-medium">{getTeacherShort(entry.teacher_id)}</div>
                                  {entry.room && <div className="text-[8px] text-gray-400 mt-0.5">📍 {entry.room}</div>}
                                </div>
                              ) : <span className="text-gray-300 text-xl group-hover:text-blue-400 transition-colors">+</span>}
                            </button>
                          )}
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
    </div>
  );
}

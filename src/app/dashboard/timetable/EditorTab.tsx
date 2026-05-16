'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { DAYS, getSubjectColor } from './timetable-colors';
import { FiSave, FiX, FiAlertTriangle, FiLink, FiUser, FiBook } from 'react-icons/fi';

export default function EditorTab() {
  const ctx = useTimetable();
  const { forms, streams, subjects, teachers, entries, allPeriodsSorted, bTerm, bYear, fetchAll,
    getSubjectCode, getTeacherShort, getSubjectName, getFormName, getStreamName, isTeacherBusy, getTeacherName,
    getAssignmentsForClass, subjectTeachers, termReqs } = ctx;

  const [bForm, setBForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [bStream, setBStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const [editCell, setEditCell] = useState<{ day: string; periodId: number } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  const fId = Number(bForm);
  const sId = Number(bStream);

  // Get subject-teacher links for this class
  const classAssignments = getAssignmentsForClass(fId, sId);

  // Build unique teachers for this class (from Settings links)
  const classTeachers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; subjects: { id: number; name: string }[] }>();
    classAssignments.forEach(a => {
      if (!map.has(a.teacher_id)) {
        map.set(a.teacher_id, { id: a.teacher_id, name: getTeacherName(a.teacher_id), subjects: [] });
      }
      const entry = map.get(a.teacher_id)!;
      if (!entry.subjects.some(s => s.id === a.subject_id)) {
        entry.subjects.push({ id: a.subject_id, name: getSubjectName(a.subject_id) });
      }
    });
    // Also add teachers from existing timetable requirements for this class
    const classReqs = termReqs.filter(r => r.form_id === fId && r.stream_id === sId);
    classReqs.forEach(r => {
      if (r.teacher_id && !map.has(r.teacher_id)) {
        map.set(r.teacher_id, { id: r.teacher_id, name: getTeacherName(r.teacher_id), subjects: [] });
      }
      if (r.teacher_id && r.subject_id) {
        const entry = map.get(r.teacher_id)!;
        if (entry && !entry.subjects.some(s => s.id === r.subject_id)) {
          entry.subjects.push({ id: r.subject_id, name: getSubjectName(r.subject_id) });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classAssignments, termReqs, fId, sId]);

  // Subjects for currently selected teacher
  const teacherSubjects = useMemo(() => {
    if (!selectedTeacher) return [];
    const tid = Number(selectedTeacher);
    const teacher = classTeachers.find(t => t.id === tid);
    return teacher?.subjects || [];
  }, [selectedTeacher, classTeachers]);

  const getEntry = (day: string, periodId: number) =>
    entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === fId && e.stream_id === sId && e.term === bTerm && e.year === bYear);

  const openEdit = (day: string, periodId: number) => {
    const ex = getEntry(day, periodId);
    setEditCell({ day, periodId });
    if (ex?.teacher_id) {
      setSelectedTeacher(String(ex.teacher_id));
      setSelectedSubject(ex.subject_id ? String(ex.subject_id) : '');
    } else {
      setSelectedTeacher('');
      setSelectedSubject('');
    }
  };

  const handleTeacherChange = (tid: string) => {
    setSelectedTeacher(tid);
    // Auto-select subject if teacher has only one
    const teacher = classTeachers.find(t => t.id === Number(tid));
    if (teacher && teacher.subjects.length === 1) {
      setSelectedSubject(String(teacher.subjects[0].id));
    } else {
      setSelectedSubject('');
    }
  };

  const handleSaveCell = async () => {
    if (!editCell || !bForm || !bStream) return;
    setSavingCell(true);
    const { day, periodId } = editCell;
    const existing = getEntry(day, periodId);
    const tid = Number(selectedTeacher);
    const sid = Number(selectedSubject);

    if (!selectedTeacher && !selectedSubject) {
      // Clear the cell
      if (existing) { await supabase.from('school_timetable_entries').delete().eq('id', existing.id); toast.success('Cleared'); }
    } else {
      if (!selectedTeacher || !selectedSubject) { toast.error('Select both teacher and subject'); setSavingCell(false); return; }
      // Check teacher conflict
      const c = isTeacherBusy(tid, day, periodId, fId, sId);
      if (c) {
        toast.error(`${getTeacherName(tid)} is already teaching ${getFormName(c.form_id)} ${getStreamName(c.stream_id)} at this time`);
        setSavingCell(false);
        return;
      }
      const data = { day_of_week: day, period_id: periodId, form_id: fId, stream_id: sId, subject_id: sid, teacher_id: tid, room: null, term: bTerm, year: bYear };
      if (existing) await supabase.from('school_timetable_entries').update(data).eq('id', existing.id);
      else await supabase.from('school_timetable_entries').upsert([{ ...data, is_double: false }], { onConflict: 'day_of_week,period_id,form_id,stream_id,term,year' });
      toast.success('Lesson saved ✅');
    }
    setEditCell(null); setSelectedTeacher(''); setSelectedSubject('');
    await fetchAll(); setSavingCell(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-800">✏️ Manual Editor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Click any cell → Pick a teacher → Choose their subject</p>
      </div>

      {/* Selector Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
          <select value={bForm} onChange={e => setBForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
          <select value={bStream} onChange={e => setBStream(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">
            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
          </select>
        </div>
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold">
          {getFormName(fId)} {getStreamName(sId)} — {bTerm} {bYear}
        </div>
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 flex items-center gap-1.5">
          <FiLink size={12} /> {classTeachers.length} teachers linked
        </div>
      </div>

      {/* Warning if no teachers linked */}
      {classTeachers.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <p className="text-sm font-bold text-amber-800">No teachers linked for this class</p>
            <p className="text-xs text-amber-600 mt-1">Go to <strong>Settings → Subject-Teacher</strong> to link teachers to subjects for {getFormName(fId)} {getStreamName(sId)}, or create lesson cards in the <strong>Cards</strong> tab first.</p>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr>
              <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
              <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[55px]">Time</th>
              {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[150px]">{d}</th>)}
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
                        <td key={day} className="border border-gray-200 p-0 relative align-top" style={{ minWidth: 150 }}>
                          {isEditing ? (
                            <div className="p-2 bg-blue-50 space-y-2 border-2 border-blue-300 rounded-lg m-0.5">
                              {/* Step 1: Select Teacher */}
                              <div>
                                <label className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-1 mb-1"><FiUser size={9} /> 1. Teacher</label>
                                <select value={selectedTeacher} onChange={e => handleTeacherChange(e.target.value)}
                                  className="w-full px-2 py-2 border-2 border-blue-200 rounded-lg text-xs font-medium bg-white focus:border-blue-400 outline-none">
                                  <option value="">— Select Teacher —</option>
                                  {classTeachers.map(t => {
                                    const busy = isTeacherBusy(t.id, day, p.id, fId, sId);
                                    return (
                                      <option key={t.id} value={t.id} disabled={!!busy}>
                                        👤 {t.name} ({t.subjects.length} subj){busy ? ' ⚠️ BUSY' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Step 2: Select Subject (from teacher's linked subjects) */}
                              {selectedTeacher && (
                                <div>
                                  <label className="text-[8px] font-black text-indigo-600 uppercase flex items-center gap-1 mb-1"><FiBook size={9} /> 2. Subject</label>
                                  {teacherSubjects.length === 0 ? (
                                    <p className="text-[10px] text-amber-600 italic">No subjects linked for this teacher</p>
                                  ) : teacherSubjects.length === 1 ? (
                                    <div className="rounded-lg p-2" style={{ background: getSubjectColor(teacherSubjects[0].id, subjects).bg, border: `1.5px solid ${getSubjectColor(teacherSubjects[0].id, subjects).border}` }}>
                                      <div className="font-black text-[11px]" style={{ color: getSubjectColor(teacherSubjects[0].id, subjects).text }}>
                                        ✅ {teacherSubjects[0].name}
                                      </div>
                                    </div>
                                  ) : (
                                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                                      className="w-full px-2 py-2 border-2 border-indigo-200 rounded-lg text-xs font-medium bg-white focus:border-indigo-400 outline-none">
                                      <option value="">— Pick Subject —</option>
                                      {teacherSubjects.map(s => (
                                        <option key={s.id} value={s.id}>📚 {s.name}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              )}

                              {/* Preview */}
                              {selectedTeacher && selectedSubject && (() => {
                                const clr = getSubjectColor(Number(selectedSubject), subjects);
                                return (
                                  <div className="rounded-lg p-2" style={{ background: clr.bg, border: `1.5px solid ${clr.border}` }}>
                                    <div className="font-black text-[11px]" style={{ color: clr.text }}>{getSubjectCode(Number(selectedSubject))}</div>
                                    <div className="text-[9px] text-gray-600 font-semibold">👤 {getTeacherName(Number(selectedTeacher))}</div>
                                  </div>
                                );
                              })()}

                              {/* Actions */}
                              <div className="flex gap-1">
                                <button onClick={handleSaveCell} disabled={savingCell}
                                  className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                  <FiSave className="inline mr-1" size={10} />{savingCell ? '...' : 'Save'}
                                </button>
                                <button onClick={() => { setEditCell(null); setSelectedTeacher(''); setSelectedSubject(''); }}
                                  className="px-3 py-1.5 bg-gray-200 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors">
                                  <FiX size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openEdit(day, p.id)} className="w-full h-full min-h-[60px] p-1 hover:bg-blue-50 transition-all text-center group">
                              {entry && entry.subject_id ? (
                                <div className="rounded-xl p-2 mx-0.5 transition-transform group-hover:scale-[1.02]" style={{ background: color?.bg, border: `2px solid ${color?.border}` }}>
                                  <div className="font-black text-[11px] leading-tight" style={{ color: color?.text }}>{getSubjectCode(entry.subject_id)}</div>
                                  <div className="text-[9px] text-gray-600 mt-0.5 font-semibold">👤 {getTeacherShort(entry.teacher_id)}</div>
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

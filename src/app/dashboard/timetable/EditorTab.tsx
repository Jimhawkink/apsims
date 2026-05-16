'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { DAYS, getSubjectColor } from './timetable-colors';
import { FiSave, FiX, FiAlertTriangle, FiLink, FiUser, FiBook, FiChevronDown, FiCheck } from 'react-icons/fi';

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
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fId = Number(bForm);
  const sId = Number(bStream);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowTeacherPicker(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Get subject-teacher links for this class
  const classAssignments = getAssignmentsForClass(fId, sId);

  // Build rich teacher data with their subjects and scope
  const classTeachers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; subjects: { id: number; name: string; code: string; form: string; stream: string; color: any }[] }>();
    
    // From Settings subject-teacher links
    classAssignments.forEach(a => {
      if (!map.has(a.teacher_id)) {
        map.set(a.teacher_id, { id: a.teacher_id, name: getTeacherName(a.teacher_id), subjects: [] });
      }
      const entry = map.get(a.teacher_id)!;
      if (!entry.subjects.some(s => s.id === a.subject_id)) {
        const color = getSubjectColor(a.subject_id, subjects);
        entry.subjects.push({
          id: a.subject_id,
          name: getSubjectName(a.subject_id),
          code: getSubjectCode(a.subject_id),
          form: a.form_id ? getFormName(a.form_id) : 'All Forms',
          stream: a.stream_id ? getStreamName(a.stream_id) : 'All Streams',
          color,
        });
      }
    });

    // Also from timetable requirements
    const classReqs = termReqs.filter(r => r.form_id === fId && r.stream_id === sId);
    classReqs.forEach(r => {
      if (!r.teacher_id) return;
      if (!map.has(r.teacher_id)) {
        map.set(r.teacher_id, { id: r.teacher_id, name: getTeacherName(r.teacher_id), subjects: [] });
      }
      const entry = map.get(r.teacher_id)!;
      if (r.subject_id && !entry.subjects.some(s => s.id === r.subject_id)) {
        const color = getSubjectColor(r.subject_id, subjects);
        entry.subjects.push({
          id: r.subject_id,
          name: getSubjectName(r.subject_id),
          code: getSubjectCode(r.subject_id),
          form: getFormName(fId),
          stream: getStreamName(sId),
          color,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classAssignments, termReqs, fId, sId]);

  // Subjects for currently selected teacher
  const teacherSubjects = useMemo(() => {
    if (!selectedTeacher) return [];
    return classTeachers.find(t => t.id === Number(selectedTeacher))?.subjects || [];
  }, [selectedTeacher, classTeachers]);

  const getEntry = (day: string, periodId: number) =>
    entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === fId && e.stream_id === sId && e.term === bTerm && e.year === bYear);

  const openEdit = (day: string, periodId: number) => {
    const ex = getEntry(day, periodId);
    setEditCell({ day, periodId });
    setShowTeacherPicker(false);
    if (ex?.teacher_id) {
      setSelectedTeacher(String(ex.teacher_id));
      setSelectedSubject(ex.subject_id ? String(ex.subject_id) : '');
    } else {
      setSelectedTeacher('');
      setSelectedSubject('');
    }
  };

  const handlePickTeacher = (tid: number) => {
    setSelectedTeacher(String(tid));
    setShowTeacherPicker(false);
    const teacher = classTeachers.find(t => t.id === tid);
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
      if (existing) { await supabase.from('school_timetable_entries').delete().eq('id', existing.id); toast.success('Cleared'); }
    } else {
      if (!selectedTeacher || !selectedSubject) { toast.error('Select both teacher and subject'); setSavingCell(false); return; }
      const c = isTeacherBusy(tid, day, periodId, fId, sId);
      if (c) { toast.error(`${getTeacherName(tid)} is already teaching ${getFormName(c.form_id)} ${getStreamName(c.stream_id)}`); setSavingCell(false); return; }
      const data = { day_of_week: day, period_id: periodId, form_id: fId, stream_id: sId, subject_id: sid, teacher_id: tid, room: null, term: bTerm, year: bYear };
      if (existing) await supabase.from('school_timetable_entries').update(data).eq('id', existing.id);
      else await supabase.from('school_timetable_entries').upsert([{ ...data, is_double: false }], { onConflict: 'day_of_week,period_id,form_id,stream_id,term,year' });
      toast.success('Lesson saved ✅');
    }
    setEditCell(null); setSelectedTeacher(''); setSelectedSubject('');
    await fetchAll(); setSavingCell(false);
  };

  const selectedTeacherObj = classTeachers.find(t => t.id === Number(selectedTeacher));

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black text-gray-800">✏️ Manual Editor</h1><p className="text-sm text-gray-500 mt-0.5">Click cell → Pick Teacher → Choose Subject → Save</p></div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-3 items-end flex-wrap">
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={bForm} onChange={e => setBForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={bStream} onChange={e => setBStream(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[130px]">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold">{getFormName(fId)} {getStreamName(sId)} — {bTerm} {bYear}</div>
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 flex items-center gap-1.5"><FiLink size={12} /> {classTeachers.length} teachers</div>
      </div>

      {classTeachers.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div><p className="text-sm font-bold text-amber-800">No teachers linked for this class</p><p className="text-xs text-amber-600 mt-1">Go to <strong>Settings → Subject-Teacher</strong> to link teachers, or create lesson cards in <strong>Cards</strong> tab first.</p></div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr>
              <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
              <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[55px]">Time</th>
              {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[160px]">{d}</th>)}
            </tr></thead>
            <tbody>
              {allPeriodsSorted.map(p => {
                if (p.period_type !== 'lesson') return (
                  <tr key={p.id}><td colSpan={DAYS.length + 2} className="text-center py-2.5 text-[10px] font-bold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">☕ {p.period_name} ({p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)})</td></tr>
                );
                return (
                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                    <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0,5)}<br/>{p.end_time?.substring(0,5)}</td>
                    {DAYS.map(day => {
                      const entry = getEntry(day, p.id);
                      const isEditing = editCell?.day === day && editCell?.periodId === p.id;
                      const color = entry?.subject_id ? getSubjectColor(entry.subject_id, subjects) : null;

                      return (
                        <td key={day} className="border border-gray-200 p-0 relative align-top" style={{ minWidth: 160 }}>
                          {isEditing ? (
                            <div className="p-2 bg-gradient-to-b from-blue-50 to-indigo-50 space-y-2 border-2 border-blue-400 rounded-xl m-0.5 shadow-xl shadow-blue-500/10" ref={pickerRef}>
                              
                              {/* ── STEP 1: TEACHER PICKER (Rich Custom Dropdown) ── */}
                              <div>
                                <label className="text-[8px] font-black text-blue-700 uppercase flex items-center gap-1 mb-1.5 tracking-wider"><FiUser size={9} /> Step 1 · Select Teacher</label>
                                <div className="relative">
                                  <button onClick={() => setShowTeacherPicker(!showTeacherPicker)}
                                    className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-xs font-bold bg-white hover:border-blue-400 outline-none flex items-center justify-between transition-all"
                                    style={selectedTeacher ? { borderColor: '#6366f1', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' } : {}}>
                                    {selectedTeacherObj ? (
                                      <span className="flex items-center gap-2 truncate">
                                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">{selectedTeacherObj.name.charAt(0)}</span>
                                        <span className="truncate">{selectedTeacherObj.name}</span>
                                        <span className="text-[9px] text-indigo-400">({selectedTeacherObj.subjects.length} subj)</span>
                                      </span>
                                    ) : <span className="text-gray-400">— Pick a Teacher —</span>}
                                    <FiChevronDown size={12} className={`transition-transform ${showTeacherPicker ? 'rotate-180' : ''}`} />
                                  </button>

                                  {/* Custom Rich Dropdown */}
                                  {showTeacherPicker && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border-2 border-blue-200 shadow-2xl shadow-blue-500/20 z-50 max-h-[280px] overflow-y-auto" style={{ minWidth: 260 }}>
                                      <div className="p-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase">Teachers for {getFormName(fId)} {getStreamName(sId)}</p>
                                      </div>
                                      {classTeachers.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-400">No teachers linked</div>
                                      ) : classTeachers.map(t => {
                                        const busy = editCell ? isTeacherBusy(t.id, editCell.day, editCell.periodId, fId, sId) : null;
                                        const isSelected = Number(selectedTeacher) === t.id;
                                        return (
                                          <button key={t.id} onClick={() => !busy && handlePickTeacher(t.id)} disabled={!!busy}
                                            className={`w-full text-left p-3 border-b border-gray-50 transition-all ${busy ? 'opacity-40 cursor-not-allowed bg-red-50' : isSelected ? 'bg-indigo-50' : 'hover:bg-blue-50'}`}>
                                            <div className="flex items-center gap-2.5">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${busy ? 'bg-red-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                                {t.name.charAt(0)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-bold text-xs text-gray-800 truncate">{t.name}</span>
                                                  {isSelected && <FiCheck size={12} className="text-indigo-600 flex-shrink-0" />}
                                                  {busy && <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">⚠️ BUSY</span>}
                                                </div>
                                                {/* Show REAL subjects with colors */}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {t.subjects.map(s => (
                                                    <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: s.color.bg, color: s.color.text, border: `1px solid ${s.color.border}` }}>
                                                      {s.name}
                                                      <span className="opacity-50">({s.form} {s.stream})</span>
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ── STEP 2: SUBJECT PICKER ── */}
                              {selectedTeacher && (
                                <div>
                                  <label className="text-[8px] font-black text-indigo-700 uppercase flex items-center gap-1 mb-1.5 tracking-wider"><FiBook size={9} /> Step 2 · Select Subject</label>
                                  {teacherSubjects.length === 0 ? (
                                    <p className="text-[10px] text-amber-600 italic px-2">No subjects linked</p>
                                  ) : teacherSubjects.length === 1 ? (
                                    <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: teacherSubjects[0].color.bg, border: `2px solid ${teacherSubjects[0].color.border}` }}>
                                      <FiCheck size={12} style={{ color: teacherSubjects[0].color.text }} />
                                      <div>
                                        <div className="font-black text-[11px]" style={{ color: teacherSubjects[0].color.text }}>{teacherSubjects[0].name}</div>
                                        <div className="text-[8px] text-gray-500">{teacherSubjects[0].form} {teacherSubjects[0].stream}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {teacherSubjects.map(s => (
                                        <button key={s.id} onClick={() => setSelectedSubject(String(s.id))}
                                          className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2 transition-all ${String(s.id) === selectedSubject ? 'ring-2 ring-indigo-400 shadow-md' : 'hover:shadow-sm'}`}
                                          style={{ background: s.color.bg, border: `1.5px solid ${s.color.border}` }}>
                                          {String(s.id) === selectedSubject && <FiCheck size={11} style={{ color: s.color.text }} />}
                                          <div>
                                            <div className="font-black text-[11px]" style={{ color: s.color.text }}>{s.name}</div>
                                            <div className="text-[8px] text-gray-500">🏫 {s.form} {s.stream}</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── PREVIEW ── */}
                              {selectedTeacher && selectedSubject && (() => {
                                const clr = getSubjectColor(Number(selectedSubject), subjects);
                                return (
                                  <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${clr.bg}, white)`, border: `2px solid ${clr.border}` }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white" style={{ background: clr.text }}>{getSubjectCode(Number(selectedSubject)).substring(0,2)}</div>
                                    <div>
                                      <div className="font-black text-[11px]" style={{ color: clr.text }}>{getSubjectName(Number(selectedSubject))}</div>
                                      <div className="text-[9px] text-gray-600">👤 {getTeacherName(Number(selectedTeacher))}</div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── ACTIONS ── */}
                              <div className="flex gap-1.5 pt-1">
                                <button onClick={handleSaveCell} disabled={savingCell || (!selectedTeacher && !selectedSubject)}
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 hover:shadow-xl transition-all">
                                  <FiSave size={11} />{savingCell ? 'Saving...' : selectedTeacher ? 'Save Lesson' : 'Clear Cell'}
                                </button>
                                <button onClick={() => { setEditCell(null); setSelectedTeacher(''); setSelectedSubject(''); setShowTeacherPicker(false); }}
                                  className="px-3 py-2 bg-gray-200 rounded-xl text-xs font-bold hover:bg-gray-300 transition-colors"><FiX size={11} /></button>
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

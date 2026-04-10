'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiGrid, FiSettings, FiEdit3, FiEye, FiUser, FiBarChart2,
  FiPlus, FiTrash2, FiSave, FiPrinter, FiCheck, FiX,
  FiZap, FiList, FiAlertTriangle, FiRefreshCw,
  FiChevronDown, FiChevronUp, FiTarget, FiSliders, FiCopy,
  FiHome, FiCalendar, FiClock, FiLayers, FiCheckCircle,
  FiAlertCircle, FiInfo, FiRepeat, FiColumns, FiMapPin
} from 'react-icons/fi';
import type { TTab, Period, Form, Stream, Subject, Teacher, Requirement, Entry, Classroom, Substitution, Availability, UnplacedCard, GenSettings, ConflictItem } from './timetable-types';
import { DAYS, DAY_SHORT, SUBJECT_COLORS, getSubjectColor, ROOM_TYPE_COLORS } from './timetable-colors';
import { autoGenerateTimetable, verifyTimetable } from './timetable-generator';

// ═══════════════════════════════════════════════════════════════════
// ═══  ASC TIMETABLE — MAIN COMPONENT  ════════════════════════════
// ═══════════════════════════════════════════════════════════════════

export default function TimetablePage() {
  const [tab, setTab] = useState<TTab>('dashboard');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Global selectors
  const [bTerm, setBTerm] = useState('Term 1');
  const [bYear, setBYear] = useState(new Date().getFullYear());

  // Tab-specific state
  const [bForm, setBForm] = useState('');
  const [bStream, setBStream] = useState('');
  const [editCell, setEditCell] = useState<{ day: string; periodId: number } | null>(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [cForm, setCForm] = useState('');
  const [cStream, setCStream] = useState('');
  const [tTeacher, setTTeacher] = useState('');
  const [reqForm, setReqForm] = useState('');
  const [reqStream, setReqStream] = useState('');
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReqSubject, setNewReqSubject] = useState('');
  const [newReqTeacher, setNewReqTeacher] = useState('');
  const [newReqLessons, setNewReqLessons] = useState(3);
  const [newReqMaxPerDay, setNewReqMaxPerDay] = useState(2);
  const [savingReq, setSavingReq] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genResults, setGenResults] = useState<{ placed: Entry[]; unplaced: UnplacedCard[] } | null>(null);
  const [genSettings, setGenSettings] = useState<GenSettings>({ maxConsecutiveSameSubject: 2, spreadEvenly: true, avoidLastPeriod: [], maxTeacherLessonsPerDay: 7 });
  const [showGenSettings, setShowGenSettings] = useState(false);
  const [editPeriod, setEditPeriod] = useState<any>(null);
  const [newPeriod, setNewPeriod] = useState({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' });
  // Classroom state
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState<Partial<Classroom>>({ room_name: '', room_code: '', room_type: 'classroom', capacity: 40, is_active: true });
  // Availability state
  const [avlTeacher, setAvlTeacher] = useState('');
  // Verification
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [verifying, setVerifying] = useState(false);
  // Room view
  const [viewRoom, setViewRoom] = useState('');
  // Master view
  const [masterDay, setMasterDay] = useState('Monday');
  // Substitutions
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSub, setNewSub] = useState<Partial<Substitution>>({ substitution_date: new Date().toISOString().split('T')[0], status: 'pending' });
  // Sidebar collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, e, f, st, su, t, req, cr, sub, avl] = await Promise.all([
      supabase.from('school_timetable_periods').select('*').order('period_number'),
      supabase.from('school_timetable_entries').select('*').order('day_of_week'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
      supabase.from('school_timetable_requirements').select('*').order('form_id'),
      supabase.from('school_classrooms').select('*').order('room_name'),
      supabase.from('school_substitutions').select('*').order('substitution_date', { ascending: false }),
      supabase.from('school_teacher_availability').select('*'),
    ]);
    setPeriods(p.data || []);
    setEntries(e.data || []);
    setForms(f.data || []);
    setStreams(st.data || []);
    setSubjects(su.data || []);
    setTeachers(t.data || []);
    setRequirements(req.data || []);
    setClassrooms(cr.data || []);
    setSubstitutions(sub.data || []);
    setAvailabilities(avl.data || []);
    if (f.data?.length && !bForm) setBForm(String(f.data[0].id));
    if (st.data?.length && !bStream) setBStream(String(st.data[0].id));
    if (f.data?.length && !cForm) setCForm(String(f.data[0].id));
    if (st.data?.length && !cStream) setCStream(String(st.data[0].id));
    if (f.data?.length && !reqForm) setReqForm(String(f.data[0].id));
    if (st.data?.length && !reqStream) setReqStream(String(st.data[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lessonPeriods = periods.filter(p => p.period_type === 'lesson');
  const allPeriodsSorted = [...periods].sort((a, b) => a.period_number - b.period_number);
  const termEntries = entries.filter(e => e.term === bTerm && e.year === bYear);
  const termReqs = requirements.filter(r => r.term === bTerm && r.year === bYear);

  // ─── Helpers ────────────────────────────────────────────────────
  const gn = (id: any, arr: any[], key: string) => { const i = arr.find((x: any) => x.id === id); return i ? i[key] : ''; };
  const getSubjectName = (id: any) => gn(id, subjects, 'subject_name');
  const getSubjectCode = (id: any) => { const s = subjects.find(x => x.id === id); return s?.subject_code || s?.subject_name?.substring(0, 4).toUpperCase() || ''; };
  const getTeacherName = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name} ${t.last_name}` : ''; };
  const getTeacherShort = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name?.charAt(0)}. ${t.last_name}` : ''; };
  const getFormName = (id: any) => gn(id, forms, 'form_name');
  const getStreamName = (id: any) => gn(id, streams, 'stream_name');

  const getEntry = (day: string, periodId: number, formId?: number, streamId?: number) => {
    const fid = formId || Number(bForm); const sid = streamId || Number(bStream);
    return entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === fid && e.stream_id === sid && e.term === bTerm && e.year === bYear);
  };

  const isTeacherBusy = (teacherId: number, day: string, periodId: number, excludeFormId?: number, excludeStreamId?: number) => {
    return entries.find(e => e.teacher_id === teacherId && e.day_of_week === day && e.period_id === periodId && e.term === bTerm && e.year === bYear && !(e.form_id === excludeFormId && e.stream_id === excludeStreamId));
  };

  const classRequirements = requirements.filter(r => r.form_id === Number(reqForm) && r.stream_id === Number(reqStream) && r.term === bTerm && r.year === bYear);
  const totalRequiredLessons = classRequirements.reduce((sum, r) => sum + r.lessons_per_week, 0);
  const totalAvailableSlots = lessonPeriods.length * DAYS.length;

  // Stats
  const teacherLoads = teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}`, count: termEntries.filter(e => e.teacher_id === t.id).length })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  const maxLoad = teacherLoads.length ? teacherLoads[0].count : 1;
  const classKeys = forms.flatMap(f => streams.map(s => ({ formId: f.id, streamId: s.id, formName: f.form_name, streamName: s.stream_name })));
  const classStats = classKeys.map(c => {
    const filled = termEntries.filter(e => e.form_id === c.formId && e.stream_id === c.streamId).length;
    const required = termReqs.filter(r => r.form_id === c.formId && r.stream_id === c.streamId).reduce((sum, r) => sum + r.lessons_per_week, 0);
    return { ...c, filled, required, pct: required ? Math.round(filled / required * 100) : 0 };
  }).filter(c => c.required > 0).sort((a, b) => b.pct - a.pct);

  // ─── Requirement Handlers ──────────────────────────────────────
  const handleAddRequirement = async () => {
    if (!newReqSubject || !reqForm || !reqStream) { toast.error('Select a subject'); return; }
    setSavingReq(true);
    const data = { form_id: Number(reqForm), stream_id: Number(reqStream), subject_id: Number(newReqSubject), teacher_id: newReqTeacher ? Number(newReqTeacher) : null, lessons_per_week: newReqLessons, max_per_day: newReqMaxPerDay, allow_double: false, term: bTerm, year: bYear };
    const { error } = await supabase.from('school_timetable_requirements').upsert([data], { onConflict: 'form_id,stream_id,subject_id,term,year' });
    if (error) toast.error(error.message);
    else { toast.success('Requirement saved'); setShowAddReq(false); setNewReqSubject(''); setNewReqTeacher(''); setNewReqLessons(3); }
    await fetchAll(); setSavingReq(false);
  };
  const handleDeleteRequirement = async (id: number) => { if (!confirm('Remove this subject requirement?')) return; await supabase.from('school_timetable_requirements').delete().eq('id', id); toast.success('Removed'); fetchAll(); };
  const handleUpdateReqLessons = async (req: Requirement, n: number) => { if (n < 1 || n > 10) return; await supabase.from('school_timetable_requirements').update({ lessons_per_week: n }).eq('id', req.id); fetchAll(); };
  const handleUpdateReqTeacher = async (req: Requirement, tid: string) => { await supabase.from('school_timetable_requirements').update({ teacher_id: tid ? Number(tid) : null }).eq('id', req.id); fetchAll(); };
  const handleCopyRequirements = async () => {
    if (!confirm(`Copy all requirements from ${getFormName(Number(reqForm))} ${getStreamName(Number(reqStream))} to all other streams of ${getFormName(Number(reqForm))}?`)) return;
    if (!classRequirements.length) { toast.error('No requirements'); return; }
    const tgt = streams.filter(s => String(s.id) !== reqStream);
    let c = 0;
    for (const s of tgt) { for (const r of classRequirements) { await supabase.from('school_timetable_requirements').upsert([{ form_id: r.form_id, stream_id: s.id, subject_id: r.subject_id, teacher_id: null, lessons_per_week: r.lessons_per_week, max_per_day: r.max_per_day, allow_double: r.allow_double, term: bTerm, year: bYear }], { onConflict: 'form_id,stream_id,subject_id,term,year' }); c++; } }
    toast.success(`Copied ${c} requirements`); fetchAll();
  };

  // ─── Cell Edit Handlers ────────────────────────────────────────
  const handleSaveCell = async () => {
    if (!editCell || !bForm || !bStream) return;
    setSavingCell(true);
    const { day, periodId } = editCell;
    const existing = getEntry(day, periodId);
    if (!cellSubject) {
      if (existing) { await supabase.from('school_timetable_entries').delete().eq('id', existing.id); toast.success('Cleared'); }
    } else {
      if (cellTeacher) { const c = isTeacherBusy(Number(cellTeacher), day, periodId, Number(bForm), Number(bStream)); if (c) { toast.error(`${getTeacherName(Number(cellTeacher))} is busy with ${getFormName(c.form_id)} ${getStreamName(c.stream_id)}`); setSavingCell(false); return; } }
      const data = { day_of_week: day, period_id: periodId, form_id: Number(bForm), stream_id: Number(bStream), subject_id: Number(cellSubject) || null, teacher_id: Number(cellTeacher) || null, room: cellRoom || null, term: bTerm, year: bYear };
      if (existing) await supabase.from('school_timetable_entries').update(data).eq('id', existing.id);
      else await supabase.from('school_timetable_entries').upsert([data], { onConflict: 'day_of_week,period_id,form_id,stream_id,term,year' });
      toast.success('Saved');
    }
    setEditCell(null); setCellSubject(''); setCellTeacher(''); setCellRoom('');
    await fetchAll(); setSavingCell(false);
  };
  const openEdit = (day: string, periodId: number) => {
    const ex = getEntry(day, periodId);
    setEditCell({ day, periodId }); setCellSubject(ex?.subject_id ? String(ex.subject_id) : ''); setCellTeacher(ex?.teacher_id ? String(ex.teacher_id) : ''); setCellRoom(ex?.room || '');
  };

  // ─── Auto-Generate Handlers ───────────────────────────────────
  const handleGenerate = async () => {
    if (termReqs.length === 0) { toast.error('Add lesson requirements first'); return; }
    const conf = termEntries.length > 0 ? confirm('This will CLEAR all entries for this term and regenerate. Continue?') : true;
    if (!conf) return;
    setGenerating(true); setGenProgress(0); setGenResults(null);
    await supabase.from('school_timetable_entries').delete().eq('term', bTerm).eq('year', bYear);
    setGenProgress(20); await new Promise(r => setTimeout(r, 300));
    const result = autoGenerateTimetable(termReqs, lessonPeriods, [], availabilities, genSettings, bTerm, bYear);
    setGenProgress(70); await new Promise(r => setTimeout(r, 200));
    if (result.placed.length > 0) {
      const bs = 50;
      for (let i = 0; i < result.placed.length; i += bs) {
        const batch = result.placed.slice(i, i + bs).map(e => ({ day_of_week: e.day_of_week, period_id: e.period_id, form_id: e.form_id, stream_id: e.stream_id, subject_id: e.subject_id, teacher_id: e.teacher_id, room: e.room, is_double: e.is_double, term: e.term, year: e.year }));
        await supabase.from('school_timetable_entries').insert(batch);
        setGenProgress(70 + Math.round((i / result.placed.length) * 25));
      }
    }
    setGenProgress(100); setGenResults(result); await fetchAll(); setGenerating(false);
    if (result.unplaced.length === 0) toast.success(`🎉 All ${result.placed.length} lessons placed!`);
    else toast(`${result.placed.length} placed, ${result.unplaced.reduce((s, u) => s + u.remaining, 0)} unplaced`, { icon: '⚠️' });
  };

  // ─── Period Setup Handlers ─────────────────────────────────────
  const handleSavePeriod = async (p: any) => { const { error } = await supabase.from('school_timetable_periods').update({ period_name: p.period_name, start_time: p.start_time, end_time: p.end_time, period_type: p.period_type }).eq('id', p.id); if (error) toast.error(error.message); else { toast.success('Updated'); setEditPeriod(null); fetchAll(); } };
  const handleAddPeriod = async () => { if (!newPeriod.period_name) { toast.error('Fill all fields'); return; } const num = periods.length ? Math.max(...periods.map(p => p.period_number)) + 1 : 1; await supabase.from('school_timetable_periods').insert([{ ...newPeriod, period_number: num }]); toast.success('Added'); setNewPeriod({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' }); fetchAll(); };
  const handleDeletePeriod = async (id: number) => { if (!confirm('Delete this period?')) return; await supabase.from('school_timetable_entries').delete().eq('period_id', id); await supabase.from('school_timetable_periods').delete().eq('id', id); toast.success('Deleted'); fetchAll(); };

  // ─── Classroom Handlers ────────────────────────────────────────
  const handleAddRoom = async () => { if (!newRoom.room_name) { toast.error('Enter room name'); return; } const { error } = await supabase.from('school_classrooms').insert([newRoom]); if (error) toast.error(error.message); else { toast.success('Room added'); setShowAddRoom(false); setNewRoom({ room_name: '', room_code: '', room_type: 'classroom', capacity: 40, is_active: true }); fetchAll(); } };
  const handleDeleteRoom = async (id: number) => { if (!confirm('Delete this room?')) return; await supabase.from('school_classrooms').delete().eq('id', id); toast.success('Deleted'); fetchAll(); };

  // ─── Availability Handler ──────────────────────────────────────
  const toggleAvailability = async (teacherId: number, day: string, periodId: number) => {
    const existing = availabilities.find(a => a.teacher_id === teacherId && a.day_of_week === day && a.period_id === periodId && a.term === bTerm && a.year === bYear);
    if (existing) {
      await supabase.from('school_teacher_availability').update({ is_available: !existing.is_available }).eq('id', existing.id);
    } else {
      await supabase.from('school_teacher_availability').insert([{ teacher_id: teacherId, day_of_week: day, period_id: periodId, is_available: false, term: bTerm, year: bYear }]);
    }
    fetchAll();
  };
  const isAvailable = (teacherId: number, day: string, periodId: number) => {
    const a = availabilities.find(x => x.teacher_id === teacherId && x.day_of_week === day && x.period_id === periodId && x.term === bTerm && x.year === bYear);
    return a ? a.is_available : true;
  };

  // ─── Substitution Handlers ─────────────────────────────────────
  const handleAddSub = async () => {
    if (!newSub.absent_teacher_id || !newSub.period_id || !newSub.form_id || !newSub.stream_id) { toast.error('Fill required fields'); return; }
    const { error } = await supabase.from('school_substitutions').insert([newSub]);
    if (error) toast.error(error.message); else { toast.success('Substitution added'); setShowAddSub(false); setNewSub({ substitution_date: new Date().toISOString().split('T')[0], status: 'pending' }); fetchAll(); }
  };
  const handleDeleteSub = async (id: number) => { if (!confirm('Remove?')) return; await supabase.from('school_substitutions').delete().eq('id', id); toast.success('Removed'); fetchAll(); };

  // ─── Verification ──────────────────────────────────────────────
  const runVerification = () => {
    setVerifying(true);
    setTimeout(() => {
      const c = verifyTimetable(entries, requirements, periods, teachers, forms, streams, subjects, bTerm, bYear, genSettings.maxTeacherLessonsPerDay);
      setConflicts(c); setVerifying(false);
      if (c.length === 0) toast.success('✅ No conflicts found!');
      else toast(`Found ${c.length} issues`, { icon: '⚠️' });
    }, 500);
  };

  // ─── Print ─────────────────────────────────────────────────────
  const printTimetable = (title: string, rows: { period: string; time: string; type: string; cells: { subj: string; teacher: string; room: string; color?: typeof SUBJECT_COLORS[0] }[] }[], dayList: string[] = [...DAYS]) => {
    const w = window.open('', '_blank'); if (!w) return;
    const dh = dayList.map(d => `<th style="background:#1e40af;color:#fff;padding:10px 8px;font-size:11px;text-align:center;border:1px solid #1e3a8a">${d}</th>`).join('');
    const br = rows.map(r => {
      if (r.type !== 'lesson') return `<tr><td style="background:#fef3c7;padding:8px;font-size:10px;font-weight:700;border:1px solid #e5e7eb;text-align:center;color:#92400e" colspan="${dayList.length + 2}">☕ ${r.period} (${r.time})</td></tr>`;
      const cells = r.cells.map(c => {
        if (!c.subj) return `<td style="padding:8px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><span style="color:#d1d5db">—</span></td>`;
        const bg = c.color?.bg || '#dbeafe'; const txt = c.color?.text || '#1e40af'; const brd = c.color?.border || '#93c5fd';
        return `<td style="padding:4px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><div style="background:${bg};border:1px solid ${brd};border-radius:6px;padding:6px 4px"><div style="font-weight:700;color:${txt};font-size:11px">${c.subj}</div><div style="font-size:9px;color:#6b7280;margin-top:2px">${c.teacher}</div>${c.room ? `<div style="font-size:8px;color:#9ca3af">${c.room}</div>` : ''}</div></td>`;
      }).join('');
      return `<tr><td style="background:#f8fafc;padding:8px;font-size:10px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">${r.period}</td><td style="background:#f8fafc;padding:8px;font-size:9px;color:#6b7280;border:1px solid #e5e7eb;white-space:nowrap">${r.time}</td>${cells}</tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:15px}.hdr{text-align:center;margin-bottom:15px}.hdr h1{font-size:20px;color:#1e3a8a;text-transform:uppercase;letter-spacing:1px}.hdr p{font-size:12px;color:#6b7280;margin-top:4px}table{width:100%;border-collapse:collapse}@media print{body{padding:0}}</style></head><body><div class="hdr"><h1>ALPHA SCHOOL</h1><p>${title} — ${bTerm} ${bYear}</p></div><table><thead><tr><th style="background:#0f172a;color:#fff;padding:10px;font-size:11px;border:1px solid #1e293b">Period</th><th style="background:#0f172a;color:#fff;padding:10px;font-size:11px;border:1px solid #1e293b">Time</th>${dh}</tr></thead><tbody>${br}</tbody></table><div style="margin-top:12px;text-align:center;font-size:8px;color:#9ca3af">Generated by APSIMS — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  const buildPrintRows = (filterFn: (day: string, p: Period) => Entry | undefined) => {
    return allPeriodsSorted.map(p => ({
      period: p.period_name, time: `${p.start_time?.substring(0, 5)} - ${p.end_time?.substring(0, 5)}`, type: p.period_type,
      cells: DAYS.map(day => {
        const e = filterFn(day, p);
        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
        return { subj: e?.subject_id ? getSubjectName(e.subject_id) : '', teacher: e?.teacher_id ? getTeacherShort(e.teacher_id) : '', room: e?.room || '', color };
      })
    }));
  };

  const printClassTT = (fId?: number, sId?: number) => {
    const fi = fId || Number(cForm); const si = sId || Number(cStream);
    printTimetable(`Class Timetable — ${getFormName(fi)} ${getStreamName(si)}`,
      buildPrintRows((day, p) => entries.find(e => e.day_of_week === day && e.period_id === p.id && e.form_id === fi && e.stream_id === si && e.term === bTerm && e.year === bYear)));
  };

  const printTeacherTT = (tId?: number) => {
    const tid = tId || Number(tTeacher);
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

  const printAllClassTT = () => { classStats.forEach(c => setTimeout(() => printClassTT(c.formId, c.streamId), 200)); };
  const printAllTeacherTT = () => { teacherLoads.forEach((t, i) => setTimeout(() => printTeacherTT(t.id), i * 200)); };

  // ─── Sidebar Navigation ────────────────────────────────────────
  const NAV_GROUPS = [
    { label: '', items: [{ key: 'dashboard' as TTab, label: 'Dashboard', icon: FiHome, emoji: '📊' }] },
    { label: 'DATA INPUT', items: [
      { key: 'cards' as TTab, label: 'Lesson Cards', icon: FiList, emoji: '📋' },
      { key: 'availability' as TTab, label: 'Teacher Availability', icon: FiCalendar, emoji: '👨‍🏫' },
      { key: 'classrooms' as TTab, label: 'Classrooms', icon: FiMapPin, emoji: '🏫' },
    ]},
    { label: 'GENERATE', items: [
      { key: 'generate' as TTab, label: 'Auto Generate', icon: FiZap, emoji: '⚡' },
      { key: 'editor' as TTab, label: 'Manual Editor', icon: FiEdit3, emoji: '✏️' },
    ]},
    { label: 'VIEW', items: [
      { key: 'class' as TTab, label: 'Class View', icon: FiEye, emoji: '📅' },
      { key: 'teacher' as TTab, label: 'Teacher View', icon: FiUser, emoji: '👤' },
      { key: 'room' as TTab, label: 'Room View', icon: FiMapPin, emoji: '🚪' },
      { key: 'master' as TTab, label: 'Master Timetable', icon: FiColumns, emoji: '📋' },
    ]},
    { label: 'TOOLS', items: [
      { key: 'verify' as TTab, label: 'Verification', icon: FiCheckCircle, emoji: '✅' },
      { key: 'substitutions' as TTab, label: 'Substitutions', icon: FiRepeat, emoji: '🔄' },
      { key: 'stats' as TTab, label: 'Statistics', icon: FiBarChart2, emoji: '📊' },
      { key: 'print' as TTab, label: 'Print Center', icon: FiPrinter, emoji: '🖨️' },
      { key: 'setup' as TTab, label: 'Period Setup', icon: FiSettings, emoji: '⚙️' },
    ]},
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading ASC Timetable...</p>
      </div>
    </div>
  );

  // ─── Cell Renderer (reused in multiple views) ──────────────────
  const renderCell = (e: Entry | undefined, showClass?: boolean) => {
    if (!e || !e.subject_id) return <span className="text-gray-300">—</span>;
    const color = getSubjectColor(e.subject_id, subjects);
    return (
      <div className="rounded-lg p-1.5 mx-0.5" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
        <div className="font-bold text-[11px] leading-tight" style={{ color: color.text }}>{getSubjectCode(e.subject_id)}</div>
        <div className="text-[9px] text-gray-500 mt-0.5">{showClass ? `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : getTeacherShort(e.teacher_id)}</div>
        {e.room && <div className="text-[8px] text-gray-400">{e.room}</div>}
      </div>
    );
  };

  // ─── Grid Table Renderer ───────────────────────────────────────
  const renderGrid = (filterFn: (day: string, p: Period) => Entry | undefined, showClass?: boolean, onClickCell?: (day: string, pId: number) => void) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
            <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[50px]">Time</th>
            {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[120px]">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {allPeriodsSorted.map(p => {
            if (p.period_type !== 'lesson') return (
              <tr key={p.id}><td colSpan={DAYS.length + 2} className="text-center py-2 text-[10px] font-bold text-amber-700 bg-amber-50/80 border border-amber-100">
                ☕ {p.period_name} ({p.start_time?.substring(0, 5)} - {p.end_time?.substring(0, 5)})
              </td></tr>
            );
            return (
              <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200 whitespace-nowrap">{p.start_time?.substring(0, 5)}<br />{p.end_time?.substring(0, 5)}</td>
                {DAYS.map(day => {
                  const e = filterFn(day, p);
                  return (
                    <td key={day} className="border border-gray-200 text-center p-0.5 cursor-pointer hover:bg-blue-50 transition-colors" style={{ minWidth: 120 }}
                      onClick={() => onClickCell?.(day, p.id)}>
                      {renderCell(e, showClass)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex gap-0 -m-4 lg:-m-6 min-h-[calc(100vh-80px)]">
      {/* ═══ ASC-STYLE SIDEBAR ═══ */}
      <aside className={`${sidebarCollapsed ? 'w-[52px]' : 'w-[210px]'} flex-shrink-0 bg-slate-900 transition-all duration-300 overflow-y-auto hidden lg:flex flex-col`}>
        {/* Logo */}
        <div className={`px-3 py-4 border-b border-slate-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          {!sidebarCollapsed && (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                <FiGrid className="text-white" size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">ASC Timetable</h2>
                <p className="text-[9px] text-slate-400">Smart Scheduler</p>
              </div>
            </>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`${sidebarCollapsed ? '' : 'ml-auto'} text-slate-400 hover:text-white transition-colors`}>
            {sidebarCollapsed ? <FiGrid size={18} /> : <FiX size={14} />}
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 py-2 px-1.5 space-y-1">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !sidebarCollapsed && (
                <p className="px-2 pt-3 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</p>
              )}
              {group.label && sidebarCollapsed && <div className="border-t border-slate-700 my-1.5" />}
              {group.items.map(item => (
                <button key={item.key} onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    tab === item.key
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}>
                  <span className="text-sm flex-shrink-0">{item.emoji}</span>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Term Selector */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-slate-700 space-y-2">
            <select value={bTerm} onChange={e => setBTerm(e.target.value)} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
              {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={bYear} onChange={e => setBYear(Number(e.target.value))} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white">
              {[bYear - 1, bYear, bYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </aside>

      {/* ═══ MOBILE TAB BAR ═══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg flex overflow-x-auto px-1 py-1.5">
        {NAV_GROUPS.flatMap(g => g.items).slice(0, 7).map(item => (
          <button key={item.key} onClick={() => setTab(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[9px] font-medium min-w-[56px] ${tab === item.key ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
            <span className="text-lg">{item.emoji}</span>
            <span className="truncate">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 bg-[#f0f4f8] overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        {/* Mobile term selector */}
        <div className="lg:hidden flex gap-2 mb-4">
          <select value={bTerm} onChange={e => setBTerm(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white flex-1">{['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t}>{t}</option>)}</select>
          <select value={bYear} onChange={e => setBYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-white">{[bYear - 1, bYear, bYear + 1].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>

        {/* ════════════ DASHBOARD TAB ════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">📅 Timetable Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">{bTerm} {bYear} — Overview & Quick Actions</p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg">{termEntries.length} lessons placed</div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { val: termEntries.length, label: 'Lessons Placed', icon: '📚', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
                { val: termReqs.reduce((s, r) => s + r.lessons_per_week, 0), label: 'Required', icon: '🎯', color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
                { val: teacherLoads.length, label: 'Teachers Active', icon: '👨‍🏫', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
                { val: classStats.filter(c => c.pct >= 100).length + '/' + classStats.length, label: 'Classes Complete', icon: '✅', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg shadow-lg`}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{s.val}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiZap size={16} className="text-amber-500" /> Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setTab('cards')} className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 flex items-center gap-2">📋 Manage Lesson Cards</button>
                <button onClick={() => setTab('generate')} className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg flex items-center gap-2 shadow">⚡ Auto Generate</button>
                <button onClick={() => setTab('class')} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center gap-2">📅 View Class TT</button>
                <button onClick={() => setTab('verify')} className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 flex items-center gap-2">✅ Run Verification</button>
                <button onClick={() => setTab('print')} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 flex items-center gap-2">🖨️ Print Center</button>
              </div>
            </div>

            {/* Class completion overview */}
            {classStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-3">Class Completion</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {classStats.map(c => (
                    <div key={`${c.formId}-${c.streamId}`} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700">{c.formName} {c.streamName}</span>
                        <span className={`text-xs font-bold ${c.pct >= 100 ? 'text-green-600' : c.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{c.pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct >= 100 ? '#22c55e' : c.pct >= 70 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{c.filled}/{c.required} lessons</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ LESSON CARDS TAB ════════════ */}
        {tab === 'cards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-bold text-gray-800">📋 Lesson Cards (Requirements)</h1><p className="text-sm text-gray-500">Define lessons per week for each subject & class — ASC-style cards</p></div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={reqForm} onChange={e => setReqForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={reqStream} onChange={e => setReqStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
              <div className="flex-1" />
              <div className="text-xs bg-gray-100 px-3 py-2 rounded-lg"><span className="font-bold text-gray-700">{totalRequiredLessons}</span><span className="text-gray-500"> / {totalAvailableSlots} slots used</span>
                {totalRequiredLessons > totalAvailableSlots && <span className="text-red-600 font-bold ml-2">⚠️ OVER CAPACITY!</span>}
              </div>
              <button onClick={() => setShowAddReq(true)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow hover:shadow-lg"><FiPlus size={14} /> Add Subject</button>
              {classRequirements.length > 0 && <button onClick={handleCopyRequirements} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-gray-50"><FiCopy size={14} /> Copy to Streams</button>}
            </div>

            {showAddReq && (
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-lg">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiPlus className="text-blue-500" /> Add Subject for {getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Subject *</label><select value={newReqSubject} onChange={e => setNewReqSubject(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{subjects.filter(s => !classRequirements.some(r => r.subject_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Teacher</label><select value={newReqTeacher} onChange={e => setNewReqTeacher(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Any —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Lessons/Week</label><input type="number" min={1} max={10} value={newReqLessons} onChange={e => setNewReqLessons(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max/Day</label><input type="number" min={1} max={4} value={newReqMaxPerDay} onChange={e => setNewReqMaxPerDay(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddRequirement} disabled={savingReq} className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5"><FiSave size={14} /> {savingReq ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setShowAddReq(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Subject Cards — {getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h3>
                <div className="text-xs text-gray-500">{classRequirements.length} subjects</div>
              </div>
              {classRequirements.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><FiList size={40} className="mx-auto mb-3 opacity-50" /><p className="font-medium">No requirements defined yet</p><p className="text-xs mt-1">Click &quot;Add Subject&quot; to start</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                  {classRequirements.map(req => {
                    const color = getSubjectColor(req.subject_id, subjects);
                    const placed = termEntries.filter(e => e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id).length;
                    return (
                      <div key={req.id} className="rounded-xl border-2 p-4 transition-all hover:shadow-md" style={{ borderColor: color.border, background: color.bg }}>
                        <div className="flex items-start justify-between mb-2">
                          <div><h4 className="font-bold text-sm" style={{ color: color.text }}>{getSubjectName(req.subject_id)}</h4><p className="text-xs mt-0.5" style={{ color: color.text, opacity: 0.7 }}>{getSubjectCode(req.subject_id)}</p></div>
                          <button onClick={() => handleDeleteRequirement(req.id!)} className="text-gray-400 hover:text-red-500 p-1"><FiTrash2 size={13} /></button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1">
                            <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week - 1)} className="text-gray-500 hover:text-gray-800"><FiChevronDown size={12} /></button>
                            <span className="text-sm font-bold min-w-[20px] text-center" style={{ color: color.text }}>{req.lessons_per_week}</span>
                            <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week + 1)} className="text-gray-500 hover:text-gray-800"><FiChevronUp size={12} /></button>
                            <span className="text-[10px] text-gray-500">L/wk</span>
                          </div>
                          <div className="text-[10px] bg-white/60 rounded-lg px-2 py-1" style={{ color: color.text }}>max {req.max_per_day}/day</div>
                          {placed > 0 && <div className={`text-[10px] rounded-lg px-2 py-1 font-bold ${placed >= req.lessons_per_week ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{placed}/{req.lessons_per_week}</div>}
                        </div>
                        <div><label className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Teacher</label>
                          <select value={req.teacher_id || ''} onChange={e => handleUpdateReqTeacher(req, e.target.value)} className="w-full px-2 py-1.5 rounded-lg text-xs border border-gray-200 bg-white/80"><option value="">— Any —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ TEACHER AVAILABILITY TAB ════════════ */}
        {tab === 'availability' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">👨‍🏫 Teacher Availability</h1><p className="text-sm text-gray-500">Mark when teachers are available/unavailable — click cells to toggle</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Teacher</label>
              <select value={avlTeacher} onChange={e => setAvlTeacher(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[250px]"><option value="">— Select Teacher —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
            </div>
            {avlTeacher && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">{getTeacherName(Number(avlTeacher))} — Availability Grid</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 inline-block" /> Available</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block" /> Unavailable</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead><tr><th className="bg-slate-800 text-white px-3 py-2.5 text-left text-[10px] font-bold">Period</th><th className="bg-slate-800 text-white px-2 py-2.5 text-[10px] font-bold">Time</th>
                      {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-3 py-2.5 text-center text-[10px] font-bold">{d}</th>)}
                    </tr></thead>
                    <tbody>
                      {lessonPeriods.map(p => (
                        <tr key={p.id}>
                          <td className="bg-gray-50 px-3 py-2 font-bold text-xs border border-gray-200">{p.period_name}</td>
                          <td className="bg-gray-50 px-2 py-2 text-[10px] text-gray-500 border border-gray-200">{p.start_time?.substring(0, 5)}-{p.end_time?.substring(0, 5)}</td>
                          {DAYS.map(day => {
                            const avail = isAvailable(Number(avlTeacher), day, p.id);
                            return (
                              <td key={day} onClick={() => toggleAvailability(Number(avlTeacher), day, p.id)}
                                className={`border border-gray-200 text-center p-2 cursor-pointer transition-all hover:scale-105 ${avail ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-red-50 hover:bg-red-100'}`}>
                                {avail ? <FiCheck className="mx-auto text-emerald-500" size={18} /> : <FiX className="mx-auto text-red-500" size={18} />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ CLASSROOMS TAB ════════════ */}
        {tab === 'classrooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-bold text-gray-800">🏫 Classrooms & Rooms</h1><p className="text-sm text-gray-500">Manage physical rooms and their properties</p></div>
              <button onClick={() => setShowAddRoom(true)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPlus size={14} /> Add Room</button>
            </div>

            {showAddRoom && (
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-lg">
                <h4 className="font-bold text-gray-800 mb-3">Add New Room</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Room Name *</label><input value={newRoom.room_name} onChange={e => setNewRoom({ ...newRoom, room_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" placeholder="e.g., Classroom 5" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Room Code</label><input value={newRoom.room_code} onChange={e => setNewRoom({ ...newRoom, room_code: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" placeholder="e.g., CR5" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Type</label><select value={newRoom.room_type} onChange={e => setNewRoom({ ...newRoom, room_type: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="classroom">Classroom</option><option value="lab">Science Lab</option><option value="computer_lab">Computer Lab</option><option value="library">Library</option><option value="gym">Gym / Field</option><option value="hall">Hall</option></select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Capacity</label><input type="number" value={newRoom.capacity} onChange={e => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddRoom} className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold"><FiSave className="inline mr-1" size={14} />Save</button>
                  <button onClick={() => setShowAddRoom(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">Cancel</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map(room => {
                const rc = ROOM_TYPE_COLORS[room.room_type] || ROOM_TYPE_COLORS.classroom;
                return (
                  <div key={room.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: rc.bg }}>{rc.icon}</div>
                        <div><h4 className="font-bold text-gray-800 text-sm">{room.room_name}</h4>{room.room_code && <p className="text-[10px] text-gray-500">{room.room_code}</p>}</div>
                      </div>
                      <button onClick={() => handleDeleteRoom(room.id!)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={14} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: rc.bg, color: rc.text }}>{room.room_type}</span>
                      <span className="text-[10px] text-gray-500">👥 {room.capacity}</span>
                    </div>
                  </div>
                );
              })}
              {classrooms.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400"><FiMapPin size={40} className="mx-auto mb-3 opacity-50" /><p className="font-medium">No rooms defined yet</p></div>}
            </div>
          </div>
        )}

        {/* ════════════ AUTO GENERATE TAB ════════════ */}
        {tab === 'generate' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
              <div className="relative z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><FiZap size={24} /> Auto-Generate Timetable</h2>
                <p className="text-indigo-200 text-sm mb-5">Smart constraint-based scheduling engine</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  {[
                    { v: termReqs.length, l: 'Subject Cards' },
                    { v: termReqs.reduce((s, r) => s + r.lessons_per_week, 0), l: 'Total Lessons' },
                    { v: new Set(termReqs.map(r => `${r.form_id}-${r.stream_id}`)).size, l: 'Classes' },
                    { v: lessonPeriods.length * DAYS.length, l: 'Slots / Class' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center"><p className="text-2xl font-bold">{s.v}</p><p className="text-[10px] text-indigo-200 uppercase">{s.l}</p></div>
                  ))}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <button onClick={handleGenerate} disabled={generating || termReqs.length === 0} className="px-6 py-3 bg-white text-indigo-700 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                    {generating ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin" /> Generating...</> : <><FiZap size={16} /> Generate Timetable</>}
                  </button>
                  <button onClick={() => setShowGenSettings(!showGenSettings)} className="px-4 py-3 bg-white/10 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-white/20"><FiSliders size={16} /> Settings</button>
                </div>
                {generating && (
                  <div className="mt-5"><div className="flex items-center justify-between text-xs mb-1"><span>Processing...</span><span>{genProgress}%</span></div><div className="h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-500" style={{ width: `${genProgress}%` }} /></div></div>
                )}
              </div>
            </div>

            {showGenSettings && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiSliders className="text-blue-500" /> Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Consecutive Same Subject</label><input type="number" min={1} max={4} value={genSettings.maxConsecutiveSameSubject} onChange={e => setGenSettings({ ...genSettings, maxConsecutiveSameSubject: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Teacher Lessons/Day</label><input type="number" min={3} max={10} value={genSettings.maxTeacherLessonsPerDay} onChange={e => setGenSettings({ ...genSettings, maxTeacherLessonsPerDay: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                  <div className="flex items-center gap-3"><input type="checkbox" checked={genSettings.spreadEvenly} onChange={e => setGenSettings({ ...genSettings, spreadEvenly: e.target.checked })} className="w-4 h-4" id="se" /><label htmlFor="se" className="text-sm text-gray-700"><span className="font-medium">Spread Evenly</span><span className="block text-[10px] text-gray-400">Distribute across days</span></label></div>
                </div>
              </div>
            )}

            {genResults && (
              <div className="space-y-4">
                <div className={`rounded-2xl p-5 border-2 ${genResults.unplaced.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <h3 className={`font-bold text-lg mb-3 ${genResults.unplaced.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>{genResults.unplaced.length === 0 ? '🎉 Perfect Generation!' : '⚠️ Partial Generation'}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 text-center"><p className="text-xl font-bold text-green-600">{genResults.placed.length}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Placed</p></div>
                    <div className="bg-white rounded-xl p-3 text-center"><p className="text-xl font-bold text-red-500">{genResults.unplaced.reduce((s, u) => s + u.remaining, 0)}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Unplaced</p></div>
                    <div className="bg-white rounded-xl p-3 text-center"><p className="text-xl font-bold text-blue-600">{Math.round(genResults.placed.length / Math.max(1, genResults.placed.length + genResults.unplaced.reduce((s, u) => s + u.remaining, 0)) * 100)}%</p><p className="text-[10px] text-gray-500 uppercase font-bold">Success</p></div>
                  </div>
                </div>
                {genResults.unplaced.length > 0 && (
                  <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
                    <div className="p-4 border-b bg-red-50/50"><h3 className="font-bold text-red-800 flex items-center gap-2"><FiAlertTriangle size={16} /> Unplaced ({genResults.unplaced.reduce((s, u) => s + u.remaining, 0)})</h3></div>
                    <div className="divide-y divide-red-100">{genResults.unplaced.map((u, i) => {
                      const color = getSubjectColor(u.req.subject_id, subjects);
                      return <div key={i} className="p-3 flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: color.bg, color: color.text }}>{u.remaining}</div><div className="flex-1"><p className="text-sm font-bold text-gray-800">{getSubjectName(u.req.subject_id)} — {getFormName(u.req.form_id)} {getStreamName(u.req.stream_id)}</p><p className="text-xs text-gray-500">{u.reason}</p></div></div>;
                    })}</div>
                  </div>
                )}
                <button onClick={() => setTab('class')} className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 flex items-center gap-2"><FiEye size={14} /> View Timetable</button>
              </div>
            )}
          </div>
        )}

        {/* ════════════ MANUAL EDITOR TAB ════════════ */}
        {tab === 'editor' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">✏️ Manual Editor</h1><p className="text-sm text-gray-500">Click any cell to assign or change a lesson</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={bForm} onChange={e => setBForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={bStream} onChange={e => setBStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
              <div className="text-xs font-bold text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">{getFormName(Number(bForm))} {getStreamName(Number(bStream))} — {bTerm} {bYear}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead><tr>
                    <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold uppercase sticky left-0 z-10 min-w-[90px]">Period</th>
                    <th className="bg-slate-800 text-white px-2 py-3 text-left text-[10px] font-bold uppercase min-w-[50px]">Time</th>
                    {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-3 text-center text-[10px] font-bold uppercase min-w-[130px]">{d}</th>)}
                  </tr></thead>
                  <tbody>
                    {allPeriodsSorted.map(p => {
                      if (p.period_type !== 'lesson') return <tr key={p.id}><td colSpan={DAYS.length + 2} className="text-center py-2 text-[10px] font-bold text-amber-700 bg-amber-50/80 border border-amber-100">☕ {p.period_name} ({p.start_time?.substring(0, 5)} - {p.end_time?.substring(0, 5)})</td></tr>;
                      return (
                        <tr key={p.id}>
                          <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10">{p.period_name}</td>
                          <td className="bg-gray-50 px-2 py-1 text-[9px] text-gray-500 border border-gray-200">{p.start_time?.substring(0, 5)}<br />{p.end_time?.substring(0, 5)}</td>
                          {DAYS.map(day => {
                            const entry = getEntry(day, p.id);
                            const isEditing = editCell?.day === day && editCell?.periodId === p.id;
                            const color = entry?.subject_id ? getSubjectColor(entry.subject_id, subjects) : null;
                            return (
                              <td key={day} className="border border-gray-200 p-0 relative" style={{ minWidth: 130 }}>
                                {isEditing ? (
                                  <div className="p-2 bg-blue-50 space-y-1.5">
                                    <select value={cellSubject} onChange={e => setCellSubject(e.target.value)} className="w-full px-2 py-1 border rounded text-xs"><option value="">— None —</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
                                    <select value={cellTeacher} onChange={e => setCellTeacher(e.target.value)} className="w-full px-2 py-1 border rounded text-xs"><option value="">— Teacher —</option>{teachers.map(t => { const busy = isTeacherBusy(t.id, day, p.id, Number(bForm), Number(bStream)); return <option key={t.id} value={t.id} disabled={!!busy}>{t.first_name} {t.last_name}{busy ? ' ⚠️' : ''}</option>; })}</select>
                                    <input value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder="Room" className="w-full px-2 py-1 border rounded text-xs" />
                                    <div className="flex gap-1">
                                      <button onClick={handleSaveCell} disabled={savingCell} className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold"><FiSave className="inline mr-0.5" size={10} /> Save</button>
                                      <button onClick={() => setEditCell(null)} className="px-2 py-1 bg-gray-200 rounded text-xs"><FiX size={10} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => openEdit(day, p.id)} className="w-full h-full min-h-[52px] p-0.5 hover:bg-blue-50 transition-colors text-center">
                                    {entry && entry.subject_id ? (
                                      <div className="rounded-lg p-1.5 mx-0.5" style={{ background: color?.bg, border: `1px solid ${color?.border}` }}>
                                        <div className="font-bold text-[11px]" style={{ color: color?.text }}>{getSubjectCode(entry.subject_id)}</div>
                                        <div className="text-[9px] text-gray-500">{getTeacherShort(entry.teacher_id)}</div>
                                        {entry.room && <div className="text-[8px] text-gray-400">{entry.room}</div>}
                                      </div>
                                    ) : <span className="text-gray-300 text-lg">+</span>}
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
        )}

        {/* ════════════ CLASS VIEW TAB ════════════ */}
        {tab === 'class' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label><select value={cForm} onChange={e => setCForm(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label><select value={cStream} onChange={e => setCStream(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
              <button onClick={() => printClassTT()} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPrinter size={14} /> Print</button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-blue-50/50"><h3 className="font-bold text-lg text-gray-800">📅 {getFormName(Number(cForm))} {getStreamName(Number(cStream))} — {bTerm} {bYear}</h3></div>
              {renderGrid((day, p) => entries.find(e => e.day_of_week === day && e.period_id === p.id && e.form_id === Number(cForm) && e.stream_id === Number(cStream) && e.term === bTerm && e.year === bYear))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Subject Legend</h4>
              <div className="flex flex-wrap gap-2">{subjects.filter(s => termEntries.some(e => e.subject_id === s.id && e.form_id === Number(cForm) && e.stream_id === Number(cStream))).map(s => {
                const color = getSubjectColor(s.id, subjects);
                return <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}><div className="w-2.5 h-2.5 rounded-full" style={{ background: color.text }} />{s.subject_name}</div>;
              })}</div>
            </div>
          </div>
        )}

        {/* ════════════ TEACHER VIEW TAB ════════════ */}
        {tab === 'teacher' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Teacher</label><select value={tTeacher} onChange={e => setTTeacher(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[200px]"><option value="">— Select —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              {tTeacher && <>
                <div className="text-xs bg-blue-50 px-3 py-2 rounded-lg font-bold text-blue-700">{termEntries.filter(e => e.teacher_id === Number(tTeacher)).length} lessons/week</div>
                <button onClick={() => printTeacherTT()} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPrinter size={14} /> Print</button>
              </>}
            </div>
            {tTeacher && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-blue-50/50"><h3 className="font-bold text-lg text-gray-800">👤 {getTeacherName(Number(tTeacher))} — {bTerm} {bYear}</h3></div>
                {renderGrid((day, p) => termEntries.find(x => x.teacher_id === Number(tTeacher) && x.day_of_week === day && x.period_id === p.id), true)}
              </div>
            )}
          </div>
        )}

        {/* ════════════ ROOM VIEW TAB ════════════ */}
        {tab === 'room' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">🚪 Room View</h1><p className="text-sm text-gray-500">See room occupancy across the week</p></div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Room</label>
              <select value={viewRoom} onChange={e => setViewRoom(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm min-w-[200px]"><option value="">— Select —</option>{classrooms.map(r => <option key={r.id} value={r.room_name}>{r.room_name}</option>)}</select>
            </div>
            {viewRoom && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-blue-50/50"><h3 className="font-bold text-lg text-gray-800">🚪 {viewRoom} — {bTerm} {bYear}</h3></div>
                {renderGrid((day, p) => termEntries.find(x => x.room === viewRoom && x.day_of_week === day && x.period_id === p.id), true)}
              </div>
            )}
          </div>
        )}

        {/* ════════════ MASTER TIMETABLE TAB ════════════ */}
        {tab === 'master' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-bold text-gray-800">📋 Master Timetable</h1><p className="text-sm text-gray-500">All classes at a glance for a selected day</p></div>
              <div className="flex gap-1">{DAYS.map(d => <button key={d} onClick={() => setMasterDay(d)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${masterDay === d ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>{DAY_SHORT[d]}</button>)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead><tr>
                    <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold sticky left-0 z-10">Period</th>
                    {classKeys.filter(c => termEntries.some(e => e.form_id === c.formId && e.stream_id === c.streamId)).map(c => (
                      <th key={`${c.formId}-${c.streamId}`} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-2 py-2 text-center text-[9px] font-bold min-w-[90px]">{c.formName}<br />{c.streamName}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allPeriodsSorted.map(p => {
                      const activeClasses = classKeys.filter(c => termEntries.some(e => e.form_id === c.formId && e.stream_id === c.streamId));
                      if (p.period_type !== 'lesson') return <tr key={p.id}><td colSpan={activeClasses.length + 1} className="text-center py-2 text-[10px] font-bold text-amber-700 bg-amber-50 border">☕ {p.period_name}</td></tr>;
                      return (
                        <tr key={p.id}>
                          <td className="bg-gray-50 px-3 py-2 font-bold text-[10px] border border-gray-200 sticky left-0 z-10 whitespace-nowrap">{p.period_name}<br /><span className="text-[8px] text-gray-400 font-normal">{p.start_time?.substring(0, 5)}</span></td>
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
        )}

        {/* ════════════ VERIFICATION TAB ════════════ */}
        {tab === 'verify' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-bold text-gray-800">✅ Timetable Verification</h1><p className="text-sm text-gray-500">Check for conflicts, gaps, and constraint violations</p></div>
              <button onClick={runVerification} disabled={verifying} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 disabled:opacity-50">
                {verifying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking...</> : <><FiCheckCircle size={16} /> Run Verification</>}
              </button>
            </div>

            {conflicts.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'error', label: 'Errors', count: conflicts.filter(c => c.severity === 'error').length, color: 'text-red-600 bg-red-50' },
                    { type: 'warning', label: 'Warnings', count: conflicts.filter(c => c.severity === 'warning').length, color: 'text-amber-600 bg-amber-50' },
                    { type: 'info', label: 'Info', count: conflicts.filter(c => c.severity === 'info').length, color: 'text-blue-600 bg-blue-50' },
                  ].map(s => (
                    <div key={s.type} className={`${s.color} rounded-xl p-4 text-center border`}><p className="text-2xl font-bold">{s.count}</p><p className="text-[10px] uppercase font-bold">{s.label}</p></div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-3 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.severity === 'error' ? 'bg-red-100 text-red-600' : c.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          {c.severity === 'error' ? <FiAlertCircle size={16} /> : c.severity === 'warning' ? <FiAlertTriangle size={16} /> : <FiInfo size={16} />}
                        </div>
                        <div><p className="text-sm font-bold text-gray-800">{c.message}</p><p className="text-xs text-gray-500">{c.details}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <FiCheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">Click &quot;Run Verification&quot; to check your timetable</p>
                <p className="text-xs text-gray-400 mt-1">Checks: teacher clashes, missing assignments, overloads, gaps</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════ SUBSTITUTIONS TAB ════════════ */}
        {tab === 'substitutions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-bold text-gray-800">🔄 Substitutions</h1><p className="text-sm text-gray-500">Manage teacher absences and assign substitutes</p></div>
              <button onClick={() => setShowAddSub(true)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow"><FiPlus size={14} /> Add Substitution</button>
            </div>

            {showAddSub && (
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-lg">
                <h4 className="font-bold text-gray-800 mb-3">New Substitution</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Date</label><input type="date" value={newSub.substitution_date} onChange={e => setNewSub({ ...newSub, substitution_date: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Absent Teacher *</label><select value={newSub.absent_teacher_id || ''} onChange={e => setNewSub({ ...newSub, absent_teacher_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Substitute Teacher</label><select value={newSub.substitute_teacher_id || ''} onChange={e => setNewSub({ ...newSub, substitute_teacher_id: Number(e.target.value) || null })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Period *</label><select value={newSub.period_id || ''} onChange={e => setNewSub({ ...newSub, period_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{lessonPeriods.map(p => <option key={p.id} value={p.id}>{p.period_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form *</label><select value={newSub.form_id || ''} onChange={e => setNewSub({ ...newSub, form_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream *</label><select value={newSub.stream_id || ''} onChange={e => setNewSub({ ...newSub, stream_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"><option value="">— Select —</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                  <div className="sm:col-span-2 lg:col-span-3"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reason</label><input value={newSub.reason || ''} onChange={e => setNewSub({ ...newSub, reason: e.target.value })} placeholder="e.g., Sick leave" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddSub} className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold"><FiSave className="inline mr-1" size={14} />Save</button>
                  <button onClick={() => setShowAddSub(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">{['Date', 'Absent Teacher', 'Substitute', 'Period', 'Class', 'Reason', 'Status', ''].map(h => <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {substitutions.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No substitutions recorded</td></tr> :
                    substitutions.map(sub => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                        <td className="px-4 py-2.5 text-xs font-medium">{sub.substitution_date}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-red-600">{getTeacherName(sub.absent_teacher_id)}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-green-600">{sub.substitute_teacher_id ? getTeacherName(sub.substitute_teacher_id) : '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{periods.find(p => p.id === sub.period_id)?.period_name || ''}</td>
                        <td className="px-4 py-2.5 text-xs">{getFormName(sub.form_id)} {getStreamName(sub.stream_id)}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{sub.reason || '—'}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.status === 'assigned' ? 'bg-green-100 text-green-700' : sub.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{sub.status}</span></td>
                        <td className="px-4 py-2.5"><button onClick={() => handleDeleteSub(sub.id!)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={13} /></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════ STATISTICS TAB ════════════ */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">📊 Statistics & Analytics</h1><p className="text-sm text-gray-500">{bTerm} {bYear} — Workload distribution & utilization</p></div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { val: termEntries.length, label: 'Lessons Placed', color: 'text-blue-600', bg: 'bg-blue-50' },
                { val: termReqs.reduce((s, r) => s + r.lessons_per_week, 0), label: 'Required', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { val: totalAvailableSlots, label: 'Slots/Class', color: 'text-gray-700', bg: 'bg-gray-50' },
                { val: teacherLoads.length, label: 'Teachers', color: 'text-green-600', bg: 'bg-green-50' },
                { val: new Set(termEntries.map(e => e.subject_id)).size, label: 'Subjects', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} border border-gray-200 rounded-xl p-4 text-center`}><p className={`text-2xl font-bold ${s.color}`}>{s.val}</p><p className="text-xs text-gray-500 mt-0.5">{s.label}</p></div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiUser size={16} /> Teacher Workload</h3>
              <div className="space-y-2">
                {teacherLoads.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No assignments</p> :
                  teacherLoads.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-40 text-xs font-medium text-gray-600 truncate">{t.name}</div>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-end pr-2" style={{ width: `${Math.max((t.count / maxLoad) * 100, 8)}%` }}>
                          <span className="text-[10px] font-bold text-white">{t.count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">{t.count} L/wk</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800">Class Completion</h3></div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">{['Class', 'Placed', 'Required', 'Completion'].map(h => <th key={h} className={`px-4 py-2.5 text-xs font-bold text-gray-500 uppercase ${h !== 'Class' ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {classStats.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">No data</td></tr> :
                    classStats.map(c => (
                      <tr key={`${c.formId}-${c.streamId}`} className="border-b border-gray-100">
                        <td className="px-4 py-2.5 font-bold">{c.formName} {c.streamName}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-blue-600">{c.filled}</td>
                        <td className="px-4 py-2.5 text-center">{c.required}</td>
                        <td className="px-4 py-2.5"><div className="flex items-center justify-center gap-2"><div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct >= 100 ? '#22c55e' : c.pct >= 70 ? '#f59e0b' : '#ef4444' }} /></div><span className={`text-xs font-bold ${c.pct >= 100 ? 'text-green-600' : c.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{c.pct}%</span></div></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════ PRINT CENTER TAB ════════════ */}
        {tab === 'print' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">🖨️ Print Center</h1><p className="text-sm text-gray-500">Print and export timetables</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Print All Class Timetables', desc: `Print timetables for all ${classStats.length} classes`, icon: '📅', action: printAllClassTT, color: 'from-blue-500 to-indigo-600' },
                { title: 'Print All Teacher Timetables', desc: `Print timetables for all ${teacherLoads.length} active teachers`, icon: '👤', action: printAllTeacherTT, color: 'from-emerald-500 to-teal-600' },
                { title: 'Print Single Class', desc: 'Select and print one class timetable', icon: '📋', action: () => { setTab('class'); }, color: 'from-purple-500 to-violet-600' },
                { title: 'Print Single Teacher', desc: 'Select and print one teacher timetable', icon: '👨‍🏫', action: () => { setTab('teacher'); }, color: 'from-amber-500 to-orange-600' },
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="bg-white rounded-2xl border border-gray-200 p-6 text-left hover:shadow-lg transition-all group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl shadow-lg mb-3`}>{item.icon}</div>
                  <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ PERIOD SETUP TAB ════════════ */}
        {tab === 'setup' && (
          <div className="space-y-4">
            <div><h1 className="text-xl font-bold text-gray-800">⚙️ Period Setup</h1><p className="text-sm text-gray-500">School day configuration — Kenya MoE standard</p></div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">{['#', 'Period Name', 'Start', 'End', 'Type', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody>
                  {allPeriodsSorted.map(p => (
                    <tr key={p.id} className={`border-b border-gray-100 ${p.period_type === 'break' ? 'bg-amber-50/50' : p.period_type === 'assembly' ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-2 text-gray-400">{p.period_number}</td>
                      {editPeriod?.id === p.id ? (
                        <>
                          <td className="px-4 py-1"><input value={editPeriod.period_name} onChange={e => setEditPeriod({ ...editPeriod, period_name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-1"><input type="time" value={editPeriod.start_time} onChange={e => setEditPeriod({ ...editPeriod, start_time: e.target.value })} className="px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-1"><input type="time" value={editPeriod.end_time} onChange={e => setEditPeriod({ ...editPeriod, end_time: e.target.value })} className="px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-1"><select value={editPeriod.period_type} onChange={e => setEditPeriod({ ...editPeriod, period_type: e.target.value })} className="px-2 py-1 border rounded text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option></select></td>
                          <td className="px-4 py-1 flex gap-1"><button onClick={() => handleSavePeriod(editPeriod)} className="px-2 py-1 bg-green-500 text-white rounded text-xs"><FiCheck size={12} /></button><button onClick={() => setEditPeriod(null)} className="px-2 py-1 bg-gray-300 rounded text-xs"><FiX size={12} /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 font-medium">{p.period_name}</td>
                          <td className="px-4 py-2 text-xs">{p.start_time?.substring(0, 5)}</td>
                          <td className="px-4 py-2 text-xs">{p.end_time?.substring(0, 5)}</td>
                          <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.period_type === 'lesson' ? 'bg-blue-100 text-blue-700' : p.period_type === 'break' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>{p.period_type}</span></td>
                          <td className="px-4 py-2 flex gap-1"><button onClick={() => setEditPeriod({ ...p })} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"><FiEdit3 size={12} /></button><button onClick={() => handleDeletePeriod(p.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"><FiTrash2 size={12} /></button></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Add New Period</p>
                <div className="flex gap-2 items-end flex-wrap">
                  <input placeholder="Period Name" value={newPeriod.period_name} onChange={e => setNewPeriod({ ...newPeriod, period_name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm w-40" />
                  <input type="time" value={newPeriod.start_time} onChange={e => setNewPeriod({ ...newPeriod, start_time: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="time" value={newPeriod.end_time} onChange={e => setNewPeriod({ ...newPeriod, end_time: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <select value={newPeriod.period_type} onChange={e => setNewPeriod({ ...newPeriod, period_type: e.target.value })} className="px-3 py-2 border rounded-lg text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option></select>
                  <button onClick={handleAddPeriod} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 flex items-center gap-1"><FiPlus size={14} /> Add</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

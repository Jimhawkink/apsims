'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { TTab, Period, Form, Stream, Subject, Teacher, Requirement, Entry, Classroom, Substitution, Availability, UnplacedCard, GenSettings, ConflictItem } from './timetable-types';
import { DAYS, getSubjectColor, SUBJECT_COLORS } from './timetable-colors';
import { autoGenerateTimetable, verifyTimetable } from './timetable-generator';

// Subject-Teacher assignment from Settings
export interface SubjectTeacherLink { id: number; subject_id: number; teacher_id: number; form_id: number | null; stream_id: number | null; }

interface TimetableCtx {
  tab: TTab; setTab: (t: TTab) => void;
  periods: Period[]; entries: Entry[]; forms: Form[]; streams: Stream[];
  subjects: Subject[]; teachers: Teacher[]; requirements: Requirement[];
  classrooms: Classroom[]; substitutions: Substitution[]; availabilities: Availability[];
  subjectTeachers: SubjectTeacherLink[];
  loading: boolean; fetchAll: () => Promise<void>;
  bTerm: string; setBTerm: (t: string) => void;
  bYear: number; setBYear: (y: number) => void;
  lessonPeriods: Period[]; allPeriodsSorted: Period[];
  termEntries: Entry[]; termReqs: Requirement[];
  // Helpers
  getSubjectName: (id: any) => string;
  getSubjectCode: (id: any) => string;
  getTeacherName: (id: any) => string;
  getTeacherShort: (id: any) => string;
  getFormName: (id: any) => string;
  getStreamName: (id: any) => string;
  getEntry: (day: string, periodId: number, formId?: number, streamId?: number) => Entry | undefined;
  isTeacherBusy: (tid: number, day: string, pid: number, exF?: number, exS?: number) => Entry | undefined;
  /** Get subject-teacher assignments relevant to a specific class (form+stream) */
  getAssignmentsForClass: (formId: number, streamId: number) => SubjectTeacherLink[];
  /** Get teacher assigned to a subject for a given class */
  getTeacherForSubjectClass: (subjectId: number, formId: number, streamId: number) => number | null;
  // Analytics
  teacherLoads: { id: number; name: string; count: number }[];
  classStats: { formId: number; streamId: number; formName: string; streamName: string; filled: number; required: number; pct: number }[];
  classKeys: { formId: number; streamId: number; formName: string; streamName: string }[];
  totalAvailableSlots: number;
  // Handlers
  handleGenerate: (settings: GenSettings) => Promise<{ placed: Entry[]; unplaced: UnplacedCard[] } | null>;
  runVerification: (settings: GenSettings) => ConflictItem[];
  toggleAvailability: (tid: number, day: string, pid: number) => Promise<void>;
  isAvailable: (tid: number, day: string, pid: number) => boolean;
  // Print
  printTimetable: (title: string, rows: any[], dayList?: string[]) => void;
  buildPrintRows: (filterFn: (day: string, p: Period) => Entry | undefined) => any[];
}

const Ctx = createContext<TimetableCtx | null>(null);
export const useTimetable = () => { const c = useContext(Ctx); if (!c) throw new Error('useTimetable must be inside TimetableProvider'); return c; };

export function TimetableProvider({ children }: { children: ReactNode }) {
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
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacherLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [bTerm, setBTerm] = useState('Term 1');
  const [bYear, setBYear] = useState(new Date().getFullYear());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, e, f, st, su, t, req, cr, sub, avl, stLinks] = await Promise.all([
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
      supabase.from('school_subject_teachers').select('*'),
    ]);
    setPeriods(p.data || []); setEntries(e.data || []); setForms(f.data || []);
    setStreams(st.data || []); setSubjects(su.data || []); setTeachers(t.data || []);
    setRequirements(req.data || []); setClassrooms(cr.data || []);
    setSubstitutions(sub.data || []); setAvailabilities(avl.data || []);
    setSubjectTeachers(stLinks.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lessonPeriods = periods.filter(p => p.period_type === 'lesson');
  const allPeriodsSorted = [...periods].sort((a, b) => a.period_number - b.period_number);
  const termEntries = entries.filter(e => e.term === bTerm && e.year === bYear);
  const termReqs = requirements.filter(r => r.term === bTerm && r.year === bYear);
  const totalAvailableSlots = lessonPeriods.length * DAYS.length;

  // Helpers
  const gn = (id: any, arr: any[], key: string) => { const i = arr.find((x: any) => x.id === id); return i ? i[key] : ''; };
  const getSubjectName = (id: any) => gn(id, subjects, 'subject_name');
  const getSubjectCode = (id: any) => { const s = subjects.find(x => x.id === id); return s?.subject_code || s?.subject_name?.substring(0, 4).toUpperCase() || ''; };
  const getTeacherName = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name} ${t.last_name}` : ''; };
  const getTeacherShort = (id: any) => { const t = teachers.find(x => x.id === id); return t ? `${t.first_name?.charAt(0)}. ${t.last_name}` : ''; };
  const getFormName = (id: any) => gn(id, forms, 'form_name');
  const getStreamName = (id: any) => gn(id, streams, 'stream_name');

  const getEntry = (day: string, periodId: number, formId?: number, streamId?: number) => {
    const fid = formId || 0; const sid = streamId || 0;
    return entries.find(e => e.day_of_week === day && e.period_id === periodId && e.form_id === fid && e.stream_id === sid && e.term === bTerm && e.year === bYear);
  };
  const isTeacherBusy = (teacherId: number, day: string, periodId: number, excludeFormId?: number, excludeStreamId?: number) => {
    return entries.find(e => e.teacher_id === teacherId && e.day_of_week === day && e.period_id === periodId && e.term === bTerm && e.year === bYear && !(e.form_id === excludeFormId && e.stream_id === excludeStreamId));
  };

  // Subject-Teacher assignment helpers
  const getAssignmentsForClass = (formId: number, streamId: number): SubjectTeacherLink[] => {
    return subjectTeachers.filter(st =>
      // Exact match: form+stream
      (st.form_id === formId && st.stream_id === streamId) ||
      // Form match, all streams
      (st.form_id === formId && !st.stream_id) ||
      // All forms (global assignment)
      (!st.form_id)
    );
  };
  const getTeacherForSubjectClass = (subjectId: number, formId: number, streamId: number): number | null => {
    // Priority: exact form+stream > form only > global
    const exact = subjectTeachers.find(st => st.subject_id === subjectId && st.form_id === formId && st.stream_id === streamId);
    if (exact) return exact.teacher_id;
    const formOnly = subjectTeachers.find(st => st.subject_id === subjectId && st.form_id === formId && !st.stream_id);
    if (formOnly) return formOnly.teacher_id;
    const global = subjectTeachers.find(st => st.subject_id === subjectId && !st.form_id);
    return global?.teacher_id || null;
  };

  // Analytics
  const teacherLoads = teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}`, count: termEntries.filter(e => e.teacher_id === t.id).length })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  const classKeys = forms.flatMap(f => streams.map(s => ({ formId: f.id, streamId: s.id, formName: f.form_name, streamName: s.stream_name })));
  const classStats = classKeys.map(c => {
    const filled = termEntries.filter(e => e.form_id === c.formId && e.stream_id === c.streamId).length;
    const required = termReqs.filter(r => r.form_id === c.formId && r.stream_id === c.streamId).reduce((sum, r) => sum + r.lessons_per_week, 0);
    return { ...c, filled, required, pct: required ? Math.round(filled / required * 100) : 0 };
  }).filter(c => c.required > 0).sort((a, b) => b.pct - a.pct);

  // Auto-Generate
  const handleGenerate = async (settings: GenSettings) => {
    if (termReqs.length === 0) { toast.error('Add lesson requirements first'); return null; }
    const conf = termEntries.length > 0 ? confirm('This will CLEAR all entries for this term and regenerate. Continue?') : true;
    if (!conf) return null;
    await supabase.from('school_timetable_entries').delete().eq('term', bTerm).eq('year', bYear);
    const result = autoGenerateTimetable(termReqs, lessonPeriods, [], availabilities, settings, bTerm, bYear);
    if (result.placed.length > 0) {
      const bs = 50;
      for (let i = 0; i < result.placed.length; i += bs) {
        const batch = result.placed.slice(i, i + bs).map(e => ({ day_of_week: e.day_of_week, period_id: e.period_id, form_id: e.form_id, stream_id: e.stream_id, subject_id: e.subject_id, teacher_id: e.teacher_id, room: e.room, is_double: e.is_double, term: e.term, year: e.year }));
        await supabase.from('school_timetable_entries').insert(batch);
      }
    }
    await fetchAll();
    if (result.unplaced.length === 0) toast.success(`🎉 All ${result.placed.length} lessons placed!`);
    else toast(`${result.placed.length} placed, ${result.unplaced.reduce((s, u) => s + u.remaining, 0)} unplaced`, { icon: '⚠️' });
    return result;
  };

  // Verification
  const runVerification = (settings: GenSettings) => {
    return verifyTimetable(entries, requirements, periods, teachers, forms, streams, subjects, bTerm, bYear, settings.maxTeacherLessonsPerDay);
  };

  // Availability
  const toggleAvailability = async (teacherId: number, day: string, periodId: number) => {
    const existing = availabilities.find(a => a.teacher_id === teacherId && a.day_of_week === day && a.period_id === periodId && a.term === bTerm && a.year === bYear);
    if (existing) await supabase.from('school_teacher_availability').update({ is_available: !existing.is_available }).eq('id', existing.id);
    else await supabase.from('school_teacher_availability').insert([{ teacher_id: teacherId, day_of_week: day, period_id: periodId, is_available: false, term: bTerm, year: bYear }]);
    fetchAll();
  };
  const isAvailable = (teacherId: number, day: string, periodId: number) => {
    const a = availabilities.find(x => x.teacher_id === teacherId && x.day_of_week === day && x.period_id === periodId && x.term === bTerm && x.year === bYear);
    return a ? a.is_available : true;
  };

  // Print engine
  const printTimetable = (title: string, rows: any[], dayList: string[] = [...DAYS]) => {
    const w = window.open('', '_blank'); if (!w) return;
    const dh = dayList.map(d => `<th style="background:linear-gradient(135deg,#1e40af,#3730a3);color:#fff;padding:12px 8px;font-size:11px;text-align:center;border:1px solid #1e3a8a;text-transform:uppercase;letter-spacing:0.5px">${d}</th>`).join('');
    const br = rows.map((r: any) => {
      if (r.type !== 'lesson') return `<tr><td style="background:linear-gradient(90deg,#fef3c7,#fffbeb);padding:10px;font-size:10px;font-weight:700;border:1px solid #fcd34d;text-align:center;color:#92400e" colspan="${dayList.length + 2}">☕ ${r.period} (${r.time})</td></tr>`;
      const cells = r.cells.map((c: any) => {
        if (!c.subj) return `<td style="padding:8px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><span style="color:#d1d5db">—</span></td>`;
        const bg = c.color?.bg || '#dbeafe'; const txt = c.color?.text || '#1e40af'; const brd = c.color?.border || '#93c5fd';
        return `<td style="padding:4px;border:1px solid #e5e7eb;text-align:center;min-width:110px"><div style="background:${bg};border:2px solid ${brd};border-radius:8px;padding:8px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.05)"><div style="font-weight:800;color:${txt};font-size:11px;letter-spacing:0.3px">${c.subj}</div><div style="font-size:9px;color:#6b7280;margin-top:3px">${c.teacher}</div><div style="font-size:8px;color:${txt};margin-top:2px;opacity:0.7;font-weight:700">${c.classLabel || ''}</div>${c.room ? `<div style="font-size:8px;color:#9ca3af;margin-top:1px">📍 ${c.room}</div>` : ''}</div></td>`;
      }).join('');
      return `<tr><td style="background:#f8fafc;padding:10px;font-size:10px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">${r.period}</td><td style="background:#f8fafc;padding:10px;font-size:9px;color:#6b7280;border:1px solid #e5e7eb;white-space:nowrap">${r.time}</td>${cells}</tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:20px;background:#fff}.hdr{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #1e3a8a}.hdr h1{font-size:22px;color:#1e3a8a;text-transform:uppercase;letter-spacing:2px;font-weight:900}.hdr p{font-size:12px;color:#6b7280;margin-top:6px}table{width:100%;border-collapse:collapse;box-shadow:0 4px 6px rgba(0,0,0,0.05);border-radius:8px;overflow:hidden}.footer{margin-top:15px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}@media print{body{padding:0}.footer{position:fixed;bottom:5mm}}</style></head><body><div class="hdr"><h1>ALPHA SCHOOL</h1><p>${title} — ${bTerm} ${bYear}</p></div><table><thead><tr><th style="background:#0f172a;color:#fff;padding:12px;font-size:11px;border:1px solid #1e293b;text-transform:uppercase">Period</th><th style="background:#0f172a;color:#fff;padding:12px;font-size:11px;border:1px solid #1e293b;text-transform:uppercase">Time</th>${dh}</tr></thead><tbody>${br}</tbody></table><div class="footer">Generated by APSIMS Timetable Engine — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • Powered by AlphaSchool</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  const buildPrintRows = (filterFn: (day: string, p: Period) => Entry | undefined) => {
    return allPeriodsSorted.map(p => ({
      period: p.period_name, time: `${p.start_time?.substring(0, 5)} - ${p.end_time?.substring(0, 5)}`, type: p.period_type,
      cells: DAYS.map(day => {
        const e = filterFn(day, p);
        const color = e?.subject_id ? getSubjectColor(e.subject_id, subjects) : undefined;
        return { subj: e?.subject_id ? getSubjectName(e.subject_id) : '', teacher: e?.teacher_id ? getTeacherShort(e.teacher_id) : '', room: e?.room || '', color, classLabel: e ? `🏫 ${getFormName(e.form_id)} ${getStreamName(e.stream_id)}` : '' };
      })
    }));
  };

  return (
    <Ctx.Provider value={{
      tab, setTab, periods, entries, forms, streams, subjects, teachers, requirements,
      classrooms, substitutions, availabilities, subjectTeachers, loading, fetchAll,
      bTerm, setBTerm, bYear, setBYear,
      lessonPeriods, allPeriodsSorted, termEntries, termReqs,
      getSubjectName, getSubjectCode, getTeacherName, getTeacherShort, getFormName, getStreamName,
      getEntry, isTeacherBusy, getAssignmentsForClass, getTeacherForSubjectClass,
      teacherLoads, classStats, classKeys, totalAvailableSlots,
      handleGenerate, runVerification, toggleAvailability, isAvailable,
      printTimetable, buildPrintRows,
    }}>
      {children}
    </Ctx.Provider>
  );
}

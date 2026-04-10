// ─── ASC Timetable Auto-Generation Engine ─────────────────────────
import type { Requirement, Period, Entry, UnplacedCard, GenSettings, Availability, ConflictItem } from './timetable-types';
import { DAYS } from './timetable-colors';

interface Card {
  reqId: number; formId: number; streamId: number; subjectId: number;
  teacherId: number | null; lessonIndex: number; maxPerDay: number;
}

export function autoGenerateTimetable(
  requirements: Requirement[],
  lessonPeriods: Period[],
  existingEntries: Entry[],
  availabilities: Availability[],
  settings: GenSettings,
  term: string,
  year: number,
): { placed: Entry[]; unplaced: UnplacedCard[] } {
  const placed: Entry[] = [];
  const unplaced: UnplacedCard[] = [];

  const classGrid: Record<string, Record<number, Record<string, Entry>>> = {};
  const teacherGrid: Record<string, Record<number, Set<number>>> = {};

  DAYS.forEach(day => {
    classGrid[day] = {};
    teacherGrid[day] = {};
    lessonPeriods.forEach(p => {
      classGrid[day][p.id] = {};
      teacherGrid[day][p.id] = new Set();
    });
  });

  existingEntries.forEach(e => {
    if (e.term === term && e.year === year) {
      const ck = `${e.form_id}-${e.stream_id}`;
      if (classGrid[e.day_of_week]?.[e.period_id]) {
        classGrid[e.day_of_week][e.period_id][ck] = e;
        if (e.teacher_id) teacherGrid[e.day_of_week][e.period_id].add(e.teacher_id);
      }
    }
  });

  const cards: Card[] = [];
  requirements.forEach(req => {
    if (req.term !== term || req.year !== year) return;
    const ck = `${req.form_id}-${req.stream_id}`;
    let alreadyPlaced = 0;
    DAYS.forEach(day => {
      lessonPeriods.forEach(p => {
        const entry = classGrid[day][p.id][ck];
        if (entry && entry.subject_id === req.subject_id) alreadyPlaced++;
      });
    });
    const remaining = Math.max(0, req.lessons_per_week - alreadyPlaced);
    for (let i = 0; i < remaining; i++) {
      cards.push({
        reqId: req.id || 0, formId: req.form_id, streamId: req.stream_id,
        subjectId: req.subject_id, teacherId: req.teacher_id,
        lessonIndex: i, maxPerDay: req.max_per_day,
      });
    }
  });

  cards.sort((a, b) => {
    const aT = a.teacherId ? 1 : 0;
    const bT = b.teacherId ? 1 : 0;
    if (bT !== aT) return bT - aT;
    if (a.maxPerDay !== b.maxPerDay) return a.maxPerDay - b.maxPerDay;
    return 0;
  });

  const countSubjectOnDay = (day: string, formId: number, streamId: number, subjectId: number): number => {
    const ck = `${formId}-${streamId}`;
    let c = 0;
    lessonPeriods.forEach(p => { if (classGrid[day][p.id][ck]?.subject_id === subjectId) c++; });
    return c;
  };

  const countTeacherOnDay = (day: string, teacherId: number): number => {
    let c = 0;
    lessonPeriods.forEach(p => { if (teacherGrid[day][p.id].has(teacherId)) c++; });
    return c;
  };

  const isTeacherAvailable = (teacherId: number, day: string, periodId: number): boolean => {
    const av = availabilities.find(a => a.teacher_id === teacherId && a.day_of_week === day && a.period_id === periodId && a.term === term && a.year === year);
    return av ? av.is_available : true;
  };

  const wouldExceedConsecutive = (day: string, periodIdx: number, formId: number, streamId: number, subjectId: number): boolean => {
    const ck = `${formId}-${streamId}`;
    let consecutive = 1;
    for (let i = periodIdx - 1; i >= 0; i--) {
      if (classGrid[day][lessonPeriods[i].id]?.[ck]?.subject_id === subjectId) consecutive++; else break;
    }
    for (let i = periodIdx + 1; i < lessonPeriods.length; i++) {
      if (classGrid[day][lessonPeriods[i].id]?.[ck]?.subject_id === subjectId) consecutive++; else break;
    }
    return consecutive > settings.maxConsecutiveSameSubject;
  };

  for (const card of cards) {
    const ck = `${card.formId}-${card.streamId}`;
    let bestSlot: { day: string; periodId: number; score: number } | null = null;
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.3);

    for (const day of shuffledDays) {
      const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
      if (dayCount >= card.maxPerDay) continue;

      for (let pi = 0; pi < lessonPeriods.length; pi++) {
        const period = lessonPeriods[pi];
        if (classGrid[day][period.id][ck]) continue;
        if (card.teacherId && teacherGrid[day][period.id].has(card.teacherId)) continue;
        if (card.teacherId && countTeacherOnDay(day, card.teacherId) >= settings.maxTeacherLessonsPerDay) continue;
        if (card.teacherId && !isTeacherAvailable(card.teacherId, day, period.id)) continue;
        if (wouldExceedConsecutive(day, pi, card.formId, card.streamId, card.subjectId)) continue;

        let score = 100;
        if (settings.spreadEvenly) score -= dayCount * 30;
        score -= pi * 0.5;
        score += Math.random() * 5;
        if (pi === 0 || pi === lessonPeriods.length - 1) score -= 5;

        if (!bestSlot || score > bestSlot.score) bestSlot = { day, periodId: period.id, score };
      }
    }

    if (bestSlot) {
      const entry: Entry = {
        day_of_week: bestSlot.day, period_id: bestSlot.periodId,
        form_id: card.formId, stream_id: card.streamId,
        subject_id: card.subjectId, teacher_id: card.teacherId,
        room: null, is_double: false, term, year,
      };
      classGrid[bestSlot.day][bestSlot.periodId][ck] = entry;
      if (card.teacherId) teacherGrid[bestSlot.day][bestSlot.periodId].add(card.teacherId);
      placed.push(entry);
    } else {
      const req = requirements.find(r => r.form_id === card.formId && r.stream_id === card.streamId && r.subject_id === card.subjectId && r.term === term && r.year === year);
      if (req) {
        const existing = unplaced.find(u => u.req.form_id === req.form_id && u.req.stream_id === req.stream_id && u.req.subject_id === req.subject_id);
        if (existing) existing.remaining++;
        else unplaced.push({ req, remaining: 1, reason: card.teacherId ? 'Teacher has no available slots' : 'No available slots for this class' });
      }
    }
  }

  return { placed, unplaced };
}

// ─── Verification Engine ──────────────────────────────────────────
export function verifyTimetable(
  entries: Entry[], requirements: Requirement[], periods: Period[],
  teachers: { id: number; first_name: string; last_name: string }[],
  forms: { id: number; form_name: string }[],
  streams: { id: number; stream_name: string }[],
  subjects: { id: number; subject_name: string }[],
  term: string, year: number, maxTeacherPerDay: number
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const te = entries.filter(e => e.term === term && e.year === year);
  const lessonPeriods = periods.filter(p => p.period_type === 'lesson');
  const getName = (id: number, arr: { id: number; first_name?: string; last_name?: string; form_name?: string; stream_name?: string; subject_name?: string }[], type: string) => {
    const item = arr.find(a => a.id === id);
    if (!item) return `Unknown ${type}`;
    if (type === 'teacher') return `${item.first_name} ${item.last_name}`;
    return (item as any).form_name || (item as any).stream_name || (item as any).subject_name || '';
  };

  // 1. Teacher double-booking
  DAYS.forEach(day => {
    lessonPeriods.forEach(p => {
      const dayEntries = te.filter(e => e.day_of_week === day && e.period_id === p.id && e.teacher_id);
      const teacherMap = new Map<number, Entry[]>();
      dayEntries.forEach(e => {
        if (!e.teacher_id) return;
        if (!teacherMap.has(e.teacher_id)) teacherMap.set(e.teacher_id, []);
        teacherMap.get(e.teacher_id)!.push(e);
      });
      teacherMap.forEach((ents, tid) => {
        if (ents.length > 1) {
          const classes = ents.map(e => `${getName(e.form_id, forms as any, 'form')} ${getName(e.stream_id, streams as any, 'stream')}`).join(', ');
          conflicts.push({
            type: 'teacher_clash', severity: 'error',
            message: `${getName(tid, teachers as any, 'teacher')} is double-booked`,
            details: `${day} ${p.period_name}: Teaching ${classes}`,
            day, period: p.period_name,
          });
        }
      });
    });
  });

  // 2. Missing assignments
  const termReqs = requirements.filter(r => r.term === term && r.year === year);
  termReqs.forEach(req => {
    const placed = te.filter(e => e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id).length;
    if (placed < req.lessons_per_week) {
      conflicts.push({
        type: 'missing_assignment', severity: 'warning',
        message: `${getName(req.subject_id, subjects as any, 'subject')} — ${getName(req.form_id, forms as any, 'form')} ${getName(req.stream_id, streams as any, 'stream')}`,
        details: `Only ${placed}/${req.lessons_per_week} lessons placed`,
      });
    }
  });

  // 3. Teacher overload
  teachers.forEach(t => {
    DAYS.forEach(day => {
      const dayCount = te.filter(e => e.teacher_id === t.id && e.day_of_week === day).length;
      if (dayCount > maxTeacherPerDay) {
        conflicts.push({
          type: 'overload', severity: 'warning',
          message: `${t.first_name} ${t.last_name} overloaded on ${day}`,
          details: `${dayCount} lessons (max ${maxTeacherPerDay})`,
          day,
        });
      }
    });
  });

  // 4. Empty slots (gaps)
  const classKeys = new Set(te.map(e => `${e.form_id}-${e.stream_id}`));
  classKeys.forEach(ck => {
    const [fid, sid] = ck.split('-').map(Number);
    DAYS.forEach(day => {
      const dayEntries = te.filter(e => e.form_id === fid && e.stream_id === sid && e.day_of_week === day);
      const filledPeriods = new Set(dayEntries.map(e => e.period_id));
      let hasLesson = false;
      let lastLessonIdx = -1;
      lessonPeriods.forEach((p, i) => {
        if (filledPeriods.has(p.id)) { hasLesson = true; lastLessonIdx = i; }
      });
      if (hasLesson) {
        lessonPeriods.forEach((p, i) => {
          if (i < lastLessonIdx && !filledPeriods.has(p.id)) {
            conflicts.push({
              type: 'gap', severity: 'info',
              message: `Gap in ${getName(fid, forms as any, 'form')} ${getName(sid, streams as any, 'stream')}`,
              details: `${day} ${p.period_name} is empty between scheduled lessons`,
              day, period: p.period_name,
            });
          }
        });
      }
    });
  });

  return conflicts;
}

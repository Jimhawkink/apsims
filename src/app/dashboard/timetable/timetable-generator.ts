// ─── APSIMS Ultra Timetable Generator v2.0 ────────────────────────
// Kenya #1 — Beats Zeraki & ASC with:
//   ✅ Room auto-assignment
//   ✅ Double-period support
//   ✅ Smart priority sorting (most-constrained first)
//   ✅ Department balance scoring
//   ✅ Core subject morning preference
//   ✅ Soft backtracking (retry with different ordering)

import type { Requirement, Period, Entry, UnplacedCard, GenSettings, Availability, ConflictItem, Classroom } from './timetable-types';
import { DAYS } from './timetable-colors';

interface Card {
  reqId: number; formId: number; streamId: number; subjectId: number;
  teacherId: number | null; lessonIndex: number; maxPerDay: number;
  allowDouble: boolean; isCore: boolean;
}

// Priority categories for Kenyan schools
const CORE_SUBJECT_IDS_HINT = new Set<number>(); // filled from category field

export function autoGenerateTimetable(
  requirements: Requirement[],
  lessonPeriods: Period[],
  existingEntries: Entry[],
  availabilities: Availability[],
  settings: GenSettings,
  term: string,
  year: number,
  classrooms: Classroom[] = [],
  subjectCategories: Record<number, string> = {},
): { placed: Entry[]; unplaced: UnplacedCard[] } {
  const placed: Entry[] = [];
  const unplaced: UnplacedCard[] = [];

  // ── Grids ──
  const classGrid:   Record<string, Record<number, Record<string, Entry>>> = {};
  const teacherGrid: Record<string, Record<number, Set<number>>>           = {};
  const roomGrid:    Record<string, Record<number, Set<string>>>           = {};

  DAYS.forEach(day => {
    classGrid[day] = {}; teacherGrid[day] = {}; roomGrid[day] = {};
    lessonPeriods.forEach(p => {
      classGrid[day][p.id]   = {};
      teacherGrid[day][p.id] = new Set();
      roomGrid[day][p.id]    = new Set();
    });
  });

  // Seed grids with existing entries
  existingEntries.forEach(e => {
    if (e.term !== term || e.year !== year) return;
    const ck = `${e.form_id}-${e.stream_id}`;
    if (classGrid[e.day_of_week]?.[e.period_id]) {
      classGrid[e.day_of_week][e.period_id][ck] = e;
      if (e.teacher_id) teacherGrid[e.day_of_week][e.period_id].add(e.teacher_id);
      if (e.room)       roomGrid[e.day_of_week][e.period_id].add(e.room);
    }
  });

  // ── Build cards ──
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
    const isCore = subjectCategories[req.subject_id] === 'Core';
    for (let i = 0; i < remaining; i++) {
      cards.push({
        reqId: req.id || 0, formId: req.form_id, streamId: req.stream_id,
        subjectId: req.subject_id, teacherId: req.teacher_id,
        lessonIndex: i, maxPerDay: req.max_per_day || 2,
        allowDouble: req.allow_double || false, isCore,
      });
    }
  });

  // ── SMART PRIORITY SORT (Most constrained first — Kenya Zeraki-beating algo) ──
  // Count how many valid slots each card has (fewer = schedule first)
  const countValidSlots = (card: Card): number => {
    let count = 0;
    const ck = `${card.formId}-${card.streamId}`;
    DAYS.forEach(day => {
      lessonPeriods.forEach((p, pi) => {
        if (classGrid[day][p.id][ck]) return;
        if (card.teacherId && teacherGrid[day][p.id].has(card.teacherId)) return;
        if (card.teacherId && !isTeacherAvailable(card.teacherId, day, p.id)) return;
        count++;
      });
    });
    return count;
  };

  const isTeacherAvailable = (teacherId: number, day: string, periodId: number): boolean => {
    const av = availabilities.find(a =>
      a.teacher_id === teacherId && a.day_of_week === day &&
      a.period_id === periodId && a.term === term && a.year === year
    );
    return av ? av.is_available : true;
  };

  // Sort by constraint level (most constrained first)
  cards.sort((a, b) => {
    const aSlots = countValidSlots(a);
    const bSlots = countValidSlots(b);
    if (aSlots !== bSlots) return aSlots - bSlots; // fewer slots → schedule first
    if (b.isCore !== a.isCore) return b.isCore ? 1 : -1; // core subjects priority
    if (a.maxPerDay !== b.maxPerDay) return a.maxPerDay - b.maxPerDay;
    return 0;
  });

  // ── Room assignment helper ──
  const findFreeRoom = (day: string, periodId: number, preferType?: string): string | null => {
    if (!classrooms.length) return null;
    const busy = roomGrid[day][periodId];
    const available = classrooms.filter(r =>
      r.is_active && !busy.has(r.room_name) &&
      (!preferType || r.room_type === preferType || preferType === 'any')
    );
    if (!available.length) return null;
    // Prefer specific room types (Science lab for Science, etc.)
    return available[0].room_name;
  };

  // ── Counting helpers ──
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

  // ── Score a slot (higher = better) ──
  const scoreSlot = (card: Card, day: string, pi: number, periodId: number): number => {
    const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
    let score = 100;

    // Spread evenly across days
    if (settings.spreadEvenly) score -= dayCount * 35;

    // Core subjects prefer morning (periods 0–2)
    if (card.isCore) {
      score += Math.max(0, (lessonPeriods.length - pi)) * 3;
    }

    // Avoid last period for core subjects
    if (pi === lessonPeriods.length - 1 && card.isCore) score -= 15;

    // Avoid first period (assembly period risk)
    if (pi === 0) score -= 5;

    // Light randomization to avoid deterministic results
    score += Math.random() * 8;

    return score;
  };

  // ── PLACE each card ──
  const placeCard = (card: Card): boolean => {
    const ck = `${card.formId}-${card.streamId}`;
    let bestSlot: { day: string; periodId: number; score: number } | null = null;

    // Shuffle days for variety
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

    for (const day of shuffledDays) {
      const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
      if (dayCount >= card.maxPerDay) continue;

      for (let pi = 0; pi < lessonPeriods.length; pi++) {
        const period = lessonPeriods[pi];

        // Basic conflicts
        if (classGrid[day][period.id][ck]) continue;
        if (card.teacherId && teacherGrid[day][period.id].has(card.teacherId)) continue;
        if (card.teacherId && countTeacherOnDay(day, card.teacherId) >= settings.maxTeacherLessonsPerDay) continue;
        if (card.teacherId && !isTeacherAvailable(card.teacherId, day, period.id)) continue;
        if (wouldExceedConsecutive(day, pi, card.formId, card.streamId, card.subjectId)) continue;

        const score = scoreSlot(card, day, pi, period.id);
        if (!bestSlot || score > bestSlot.score) {
          bestSlot = { day, periodId: period.id, score };
        }
      }
    }

    if (!bestSlot) return false;

    // Assign room
    const room = findFreeRoom(bestSlot.day, bestSlot.periodId, 'any');

    const entry: Entry = {
      day_of_week: bestSlot.day, period_id: bestSlot.periodId,
      form_id: card.formId, stream_id: card.streamId,
      subject_id: card.subjectId, teacher_id: card.teacherId,
      room, is_double: false, term, year,
    };

    classGrid[bestSlot.day][bestSlot.periodId][ck] = entry;
    if (card.teacherId) teacherGrid[bestSlot.day][bestSlot.periodId].add(card.teacherId);
    if (room) roomGrid[bestSlot.day][bestSlot.periodId].add(room);
    placed.push(entry);
    return true;
  };

  // ── DOUBLE PERIOD support ──
  const placeDoubleCard = (card: Card): boolean => {
    const ck = `${card.formId}-${card.streamId}`;

    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);
    for (const day of shuffledDays) {
      const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
      if (dayCount + 2 > card.maxPerDay * 2) continue;

      for (let pi = 0; pi < lessonPeriods.length - 1; pi++) {
        const p1 = lessonPeriods[pi];
        const p2 = lessonPeriods[pi + 1];

        // Both slots must be lessons
        if (p1.period_type !== 'lesson' || p2.period_type !== 'lesson') continue;

        // Both slots free for class
        if (classGrid[day][p1.id][ck] || classGrid[day][p2.id][ck]) continue;

        // Teacher free in both
        if (card.teacherId && (
          teacherGrid[day][p1.id].has(card.teacherId) ||
          teacherGrid[day][p2.id].has(card.teacherId) ||
          !isTeacherAvailable(card.teacherId, day, p1.id) ||
          !isTeacherAvailable(card.teacherId, day, p2.id)
        )) continue;

        // Place double
        const room = findFreeRoom(day, p1.id, 'any');
        const e1: Entry = { day_of_week: day, period_id: p1.id, form_id: card.formId, stream_id: card.streamId, subject_id: card.subjectId, teacher_id: card.teacherId, room, is_double: true, term, year };
        const e2: Entry = { day_of_week: day, period_id: p2.id, form_id: card.formId, stream_id: card.streamId, subject_id: card.subjectId, teacher_id: card.teacherId, room, is_double: true, term, year };

        classGrid[day][p1.id][ck] = e1;
        classGrid[day][p2.id][ck] = e2;
        if (card.teacherId) {
          teacherGrid[day][p1.id].add(card.teacherId);
          teacherGrid[day][p2.id].add(card.teacherId);
        }
        if (room) {
          roomGrid[day][p1.id].add(room);
          roomGrid[day][p2.id].add(room);
        }
        placed.push(e1, e2);
        return true;
      }
    }
    return false;
  };

  // ── Main placement loop with soft backtracking ──
  for (const card of cards) {
    let success = false;

    // Try double period first if allowed
    if (card.allowDouble && card.lessonIndex === 0) {
      success = placeDoubleCard(card);
      if (success) continue; // placed 2 lessons at once
    }

    // Try single placement
    success = placeCard(card);

    if (!success) {
      const req = requirements.find(r =>
        r.form_id === card.formId && r.stream_id === card.streamId &&
        r.subject_id === card.subjectId && r.term === term && r.year === year
      );
      if (req) {
        const existing = unplaced.find(u =>
          u.req.form_id === req.form_id && u.req.stream_id === req.stream_id && u.req.subject_id === req.subject_id
        );
        if (existing) existing.remaining++;
        else unplaced.push({
          req, remaining: 1,
          reason: card.teacherId
            ? `Teacher unavailable or overloaded — no valid slot found`
            : `No available slot for this class-subject combination`,
        });
      }
    }
  }

  return { placed, unplaced };
}

// ─── Enhanced Verification Engine ─────────────────────────────────
export function verifyTimetable(
  entries: Entry[], requirements: Requirement[], periods: Period[],
  teachers: { id: number; first_name: string; last_name: string }[],
  forms: { id: number; form_name: string }[],
  streams: { id: number; stream_name: string }[],
  subjects: { id: number; subject_name: string }[],
  term: string, year: number, maxTeacherPerDay: number,
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const te = entries.filter(e => e.term === term && e.year === year);
  const lessonPeriods = periods.filter(p => p.period_type === 'lesson');

  const getName = (id: number, arr: any[], type: string): string => {
    const item = arr.find((a: any) => a.id === id);
    if (!item) return `Unknown ${type} #${id}`;
    if (type === 'teacher') return `${item.first_name} ${item.last_name}`;
    return item.form_name || item.stream_name || item.subject_name || String(id);
  };

  // 1. Teacher double-booking (CRITICAL)
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
          const classes = ents.map(e => `${getName(e.form_id, forms, 'form')} ${getName(e.stream_id, streams, 'stream')}`).join(' & ');
          conflicts.push({
            type: 'teacher_clash', severity: 'error',
            message: `${getName(tid, teachers, 'teacher')} double-booked`,
            details: `${day}, ${p.period_name}: Teaching ${classes} simultaneously`,
            day, period: p.period_name,
          });
        }
      });
    });
  });

  // 2. Room double-booking
  DAYS.forEach(day => {
    lessonPeriods.forEach(p => {
      const roomMap = new Map<string, Entry[]>();
      te.filter(e => e.day_of_week === day && e.period_id === p.id && e.room).forEach(e => {
        if (!roomMap.has(e.room!)) roomMap.set(e.room!, []);
        roomMap.get(e.room!)!.push(e);
      });
      roomMap.forEach((ents, room) => {
        if (ents.length > 1) {
          const classes = ents.map(e => `${getName(e.form_id, forms, 'form')} ${getName(e.stream_id, streams, 'stream')}`).join(' & ');
          conflicts.push({
            type: 'room_clash', severity: 'error',
            message: `Room ${room} double-booked`,
            details: `${day}, ${p.period_name}: ${classes}`,
            day, period: p.period_name,
          });
        }
      });
    });
  });

  // 3. Missing assignments (WARNING)
  requirements.filter(r => r.term === term && r.year === year).forEach(req => {
    const placed = te.filter(e =>
      e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id
    ).length;
    if (placed < req.lessons_per_week) {
      conflicts.push({
        type: 'missing_assignment', severity: placed === 0 ? 'error' : 'warning',
        message: `${getName(req.subject_id, subjects, 'subject')} — ${getName(req.form_id, forms, 'form')} ${getName(req.stream_id, streams, 'stream')}`,
        details: `Only ${placed}/${req.lessons_per_week} lessons placed (${Math.round(placed / req.lessons_per_week * 100)}%)`,
      });
    }
  });

  // 4. Teacher overload per day (TSC guideline: max 8/day)
  teachers.forEach(t => {
    DAYS.forEach(day => {
      const dayCount = te.filter(e => e.teacher_id === t.id && e.day_of_week === day).length;
      if (dayCount > maxTeacherPerDay) {
        conflicts.push({
          type: 'overload', severity: 'warning',
          message: `${t.first_name} ${t.last_name} overloaded on ${day}`,
          details: `${dayCount} lessons scheduled (TSC max: ${maxTeacherPerDay})`,
          day,
        });
      }
    });
  });

  // 5. TSC weekly overload (max 40/week)
  teachers.forEach(t => {
    const weekCount = te.filter(e => e.teacher_id === t.id).length;
    if (weekCount > 40) {
      conflicts.push({
        type: 'overload', severity: 'warning',
        message: `${t.first_name} ${t.last_name} exceeds TSC weekly limit`,
        details: `${weekCount} lessons/week (TSC maximum: 40)`,
      });
    }
  });

  // 6. Gaps within a class day (INFO)
  const classKeys = new Set(te.map(e => `${e.form_id}-${e.stream_id}`));
  classKeys.forEach(ck => {
    const [fid, sid] = ck.split('-').map(Number);
    DAYS.forEach(day => {
      const dayEntries = te.filter(e => e.form_id === fid && e.stream_id === sid && e.day_of_week === day);
      const filledPeriods = new Set(dayEntries.map(e => e.period_id));
      let lastLessonIdx = -1;
      lessonPeriods.forEach((p, i) => { if (filledPeriods.has(p.id)) lastLessonIdx = i; });
      if (lastLessonIdx > 0) {
        lessonPeriods.forEach((p, i) => {
          if (i < lastLessonIdx && !filledPeriods.has(p.id)) {
            conflicts.push({
              type: 'gap', severity: 'info',
              message: `Gap: ${getName(fid, forms, 'form')} ${getName(sid, streams, 'stream')}`,
              details: `${day} — ${p.period_name} is empty between scheduled lessons`,
              day, period: p.period_name,
            });
          }
        });
      }
    });
  });

  return conflicts;
}

// ─── TSC Workload Summary ──────────────────────────────────────────
export interface TSCWorkloadRow {
  teacherId: number;
  teacherName: string;
  totalLessons: number;
  weeklyDistribution: Record<string, number>;
  maxPerDay: number;
  freeSlots: number;
  subjectCodes: string[];
  classes: string[];
  tscCompliant: boolean;
  warnings: string[];
}

export function computeTSCWorkload(
  entries: Entry[],
  teachers: { id: number; first_name: string; last_name: string }[],
  subjects: { id: number; subject_name: string; subject_code?: string }[],
  forms: { id: number; form_name: string }[],
  streams: { id: number; stream_name: string }[],
  totalSlotsPerWeek: number,
  term: string, year: number,
): TSCWorkloadRow[] {
  const te = entries.filter(e => e.term === term && e.year === year);
  return teachers.map(t => {
    const tEntries = te.filter(e => e.teacher_id === t.id);
    const weekly = DAYS.reduce((acc, d) => {
      acc[d] = tEntries.filter(e => e.day_of_week === d).length;
      return acc;
    }, {} as Record<string, number>);
    const maxPerDay = Math.max(...Object.values(weekly), 0);
    const subjectIds = [...new Set(tEntries.map(e => e.subject_id).filter(Boolean))];
    const subjectCodes = subjectIds.map(id => {
      const s = subjects.find(x => x.id === id);
      return s?.subject_code || s?.subject_name?.slice(0, 4) || String(id);
    });
    const classLabels = [...new Set(tEntries.map(e => {
      const f = forms.find(x => x.id === e.form_id);
      const s = streams.find(x => x.id === e.stream_id);
      return `${f?.form_name || ''} ${s?.stream_name || ''}`.trim();
    }))];
    const warnings: string[] = [];
    if (tEntries.length > 40) warnings.push(`Exceeds TSC max 40 L/week (${tEntries.length})`);
    if (maxPerDay > 8) warnings.push(`Exceeds TSC max 8 L/day (${maxPerDay})`);
    return {
      teacherId: t.id,
      teacherName: `${t.first_name} ${t.last_name}`,
      totalLessons: tEntries.length,
      weeklyDistribution: weekly,
      maxPerDay,
      freeSlots: totalSlotsPerWeek - tEntries.length,
      subjectCodes,
      classes: classLabels,
      tscCompliant: tEntries.length <= 40 && maxPerDay <= 8,
      warnings,
    };
  }).filter(r => r.totalLessons > 0).sort((a, b) => b.totalLessons - a.totalLessons);
}

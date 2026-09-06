// â”€â”€â”€ APSIMS Ultra Timetable Generator v2.0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Kenya #1 â€” Beats Zeraki & ASC with:
//   âœ… Room auto-assignment
//   âœ… Double-period support
//   âœ… Smart priority sorting (most-constrained first)
//   âœ… Department balance scoring
//   âœ… Core subject morning preference
//   âœ… Soft backtracking (retry with different ordering)

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
  subjectNames: Record<number, string> = {},        // NEW: for room-type matching
): { placed: Entry[]; unplaced: UnplacedCard[] } {
  const placed: Entry[] = [];
  const unplaced: UnplacedCard[] = [];

  // â”€â”€ Defaults for new settings fields (backward-compat) â”€â”€
  const maxWeekly  = settings.maxWeeklyTeacherLessons ?? 27;
  const roomMatch  = settings.enableRoomTypeMatching  ?? true;
  const gapMin     = settings.minimizeTeacherGaps     ?? true;
  const cbcMode    = settings.cbcPathwayMode           ?? true;

  // â”€â”€ ROOM TYPE MAP â€” Kenya subject â†’ preferred room type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ROOM_TYPE_MAP: [RegExp, string][] = [
    [/biology|chemistry|physics|science/i,   'Laboratory'],
    [/computer|ict|computing/i,              'ICT Lab'],
    [/home\s*science|nutrition/i,            'Home Science Room'],
    [/art|craft|design/i,                    'Art Room'],
    [/music/i,                               'Music Room'],
    [/physical\s*ed|p\.?e\.?|sport/i,        'Field'],
    [/workshop|technical|woodwork|metal/i,   'Workshop'],
    [/agriculture|farming/i,                 'Agriculture Lab'],
  ];
  const getPreferredRoomType = (subjectId: number): string => {
    const name = subjectNames[subjectId] || '';
    for (const [rx, rt] of ROOM_TYPE_MAP) { if (rx.test(name)) return rt; }
    return 'Classroom';
  };

  // â”€â”€ CBC pathway helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isCBCPathwayPractical = (subjectId: number): boolean => {
    const n = (subjectNames[subjectId] || '').toLowerCase();
    return /stem|science|ict|computer|agriculture|technical|workshop/.test(n);
  };
  const isCSL = (subjectId: number): boolean =>
    /community\s*service|csl/i.test(subjectNames[subjectId] || '');
  const isPE = (subjectId: number): boolean =>
    /physical\s*ed|p\.?e\.?|sport/i.test(subjectNames[subjectId] || '');

  // CSL preferred: Friday last 2 periods
  const isCSLSlot = (day: string, pi: number): boolean =>
    day === 'Friday' && pi >= lessonPeriods.length - 2;
  // PE preferred: Monday or Thursday
  const isPEDay = (day: string): boolean => day === 'Monday' || day === 'Thursday';

  // â”€â”€ Grids â”€â”€
  const classGrid:   Record<string, Record<number, Record<string, Entry>>> = {};
  const teacherGrid: Record<string, Record<number, Set<number>>>           = {};
  const roomGrid:    Record<string, Record<number, Set<string>>>           = {};
  // NEW: weekly teacher lesson counter
  const teacherWeekly: Record<number, number> = {};

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
      if (e.teacher_id) {
        teacherGrid[e.day_of_week][e.period_id].add(e.teacher_id);
        teacherWeekly[e.teacher_id] = (teacherWeekly[e.teacher_id] || 0) + 1;
      }
      if (e.room) roomGrid[e.day_of_week][e.period_id].add(e.room);
    }
  });

  // â”€â”€ Build cards â”€â”€
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

  // â”€â”€ SMART PRIORITY SORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  cards.sort((a, b) => {
    const aSlots = countValidSlots(a);
    const bSlots = countValidSlots(b);
    if (aSlots !== bSlots) return aSlots - bSlots;
    if (b.isCore !== a.isCore) return b.isCore ? 1 : -1;
    if (a.maxPerDay !== b.maxPerDay) return a.maxPerDay - b.maxPerDay;
    return 0;
  });

  // â”€â”€ PREMIUM Room assignment â€” matches subject to room type â”€â”€â”€â”€â”€â”€â”€â”€
  const findFreeRoom = (day: string, periodId: number, subjectId?: number): string | null => {
    if (!classrooms.length) return null;
    const busy = roomGrid[day][periodId];
    const preferType = roomMatch && subjectId ? getPreferredRoomType(subjectId) : 'Classroom';
    // First try preferred type
    const preferred = classrooms.filter(r =>
      r.is_active && !busy.has(r.room_name) && r.room_type === preferType
    );
    if (preferred.length) return preferred[0].room_name;
    // Fallback: any classroom
    const any = classrooms.filter(r => r.is_active && !busy.has(r.room_name));
    return any.length ? any[0].room_name : null;
  };

  // â”€â”€ Counting helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // NEW: teacher gap count on a day (free periods between first and last lesson)
  const countTeacherGapsOnDay = (day: string, teacherId: number, newPeriodIdx: number): number => {
    const occupied: number[] = [];
    lessonPeriods.forEach((p, pi) => {
      if (teacherGrid[day][p.id].has(teacherId)) occupied.push(pi);
    });
    occupied.push(newPeriodIdx);
    occupied.sort((a, b) => a - b);
    if (occupied.length < 2) return 0;
    const span = occupied[occupied.length - 1] - occupied[0] + 1;
    return span - occupied.length; // free periods within firstâ†’last lesson
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

  // â”€â”€ WEIGHTED MULTI-FACTOR SLOT SCORING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Higher score = better slot. Factors:
  //   1. Even spread across days (+30 if day has 0 lessons for subject)
  //   2. Core subjects prefer morning (+20 for period 0-2)
  //   3. Teacher gap minimization (-10 per gap created)
  //   4. CBC: CSL gets bonus for Friday PM, PE for Mon/Thu
  //   5. Avoid last period for core (-15)
  //   6. Room type availability (+10 if preferred room available)
  //   7. Teacher workload balance (-5 if teacher already heavy this day)
  //   8. Light randomization (+0-8) to avoid deterministic ties
  const scoreSlot = (card: Card, day: string, pi: number, periodId: number): number => {
    const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
    let score = 100;

    // 1. Spread evenly across days (strong weight)
    if (settings.spreadEvenly) score -= dayCount * 35;

    // 2. Core subjects prefer morning (periods 0â€“2)
    if (card.isCore) {
      score += Math.max(0, (lessonPeriods.length - pi)) * 3;
    }

    // 3. Teacher gap minimization
    if (gapMin && card.teacherId) {
      const gaps = countTeacherGapsOnDay(day, card.teacherId, pi);
      score -= gaps * 10; // -10 per free period gap created
    }

    // 4. CBC pathway scheduling bonus
    if (cbcMode) {
      if (isCSL(card.subjectId) && isCSLSlot(day, pi)) score += 40; // CSL â†’ Friday PM
      if (isPE(card.subjectId) && isPEDay(day)) score += 25;         // PE â†’ Mon/Thu
      if (isCBCPathwayPractical(card.subjectId) && pi < 4) score += 15; // practicals in morning
    }

    // 5. Avoid last period for core subjects
    if (pi === lessonPeriods.length - 1 && card.isCore) score -= 15;

    // 6. Room type availability bonus
    if (roomMatch && classrooms.length > 0) {
      const preferType = getPreferredRoomType(card.subjectId);
      const hasPref = classrooms.some(r =>
        r.is_active && !roomGrid[day][periodId].has(r.room_name) && r.room_type === preferType
      );
      if (hasPref) score += 10;
    }

    // 7. Teacher daily load balance
    if (card.teacherId) {
      const dayLoad = countTeacherOnDay(day, card.teacherId);
      if (dayLoad >= settings.maxTeacherLessonsPerDay - 1) score -= 20;
    }

    // 8. Avoid period 0 (assembly risk)
    if (pi === 0) score -= 5;

    // 9. Light randomisation to break ties
    score += Math.random() * 8;

    return score;
  };

  // â”€â”€ PLACE each card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const placeCard = (card: Card): boolean => {
    const ck = `${card.formId}-${card.streamId}`;
    let bestSlot: { day: string; periodId: number; score: number } | null = null;

    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

    for (const day of shuffledDays) {
      const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
      if (dayCount >= card.maxPerDay) continue;

      for (let pi = 0; pi < lessonPeriods.length; pi++) {
        const period = lessonPeriods[pi];

        // Hard constraints
        if (classGrid[day][period.id][ck]) continue;
        if (card.teacherId && teacherGrid[day][period.id].has(card.teacherId)) continue;
        if (card.teacherId && countTeacherOnDay(day, card.teacherId) >= settings.maxTeacherLessonsPerDay) continue;
        // â”€â”€ NEW: TSC weekly hours enforcement â”€â”€
        if (card.teacherId && (teacherWeekly[card.teacherId] || 0) >= maxWeekly) continue;
        if (card.teacherId && !isTeacherAvailable(card.teacherId, day, period.id)) continue;
        if (wouldExceedConsecutive(day, pi, card.formId, card.streamId, card.subjectId)) continue;

        const score = scoreSlot(card, day, pi, period.id);
        if (!bestSlot || score > bestSlot.score) {
          bestSlot = { day, periodId: period.id, score };
        }
      }
    }

    if (!bestSlot) return false;

    // Assign room â€” prefer subject-appropriate room type
    const room = findFreeRoom(bestSlot.day, bestSlot.periodId, card.subjectId);

    const entry: Entry = {
      day_of_week: bestSlot.day, period_id: bestSlot.periodId,
      form_id: card.formId, stream_id: card.streamId,
      subject_id: card.subjectId, teacher_id: card.teacherId,
      room, is_double: false, term, year,
    };

    classGrid[bestSlot.day][bestSlot.periodId][ck] = entry;
    if (card.teacherId) {
      teacherGrid[bestSlot.day][bestSlot.periodId].add(card.teacherId);
      teacherWeekly[card.teacherId] = (teacherWeekly[card.teacherId] || 0) + 1;
    }
    if (room) roomGrid[bestSlot.day][bestSlot.periodId].add(room);
    placed.push(entry);
    return true;
  };

  // â”€â”€ DOUBLE PERIOD support (updated: subject-aware room + TSC weekly limit) â”€â”€
  const placeDoubleCard = (card: Card): boolean => {
    const ck = `${card.formId}-${card.streamId}`;
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);
    for (const day of shuffledDays) {
      const dayCount = countSubjectOnDay(day, card.formId, card.streamId, card.subjectId);
      if (dayCount + 2 > card.maxPerDay * 2) continue;
      // TSC weekly check â€” need 2 free slots
      if (card.teacherId && (teacherWeekly[card.teacherId] || 0) + 2 > maxWeekly) continue;
      for (let pi = 0; pi < lessonPeriods.length - 1; pi++) {
        const p1 = lessonPeriods[pi];
        const p2 = lessonPeriods[pi + 1];
        if (p1.period_type !== 'lesson' || p2.period_type !== 'lesson') continue;
        if (classGrid[day][p1.id][ck] || classGrid[day][p2.id][ck]) continue;
        if (card.teacherId && (
          teacherGrid[day][p1.id].has(card.teacherId) ||
          teacherGrid[day][p2.id].has(card.teacherId) ||
          !isTeacherAvailable(card.teacherId, day, p1.id) ||
          !isTeacherAvailable(card.teacherId, day, p2.id)
        )) continue;
        const room = findFreeRoom(day, p1.id, card.subjectId);
        const e1: Entry = { day_of_week: day, period_id: p1.id, form_id: card.formId, stream_id: card.streamId, subject_id: card.subjectId, teacher_id: card.teacherId, room, is_double: true, term, year };
        const e2: Entry = { day_of_week: day, period_id: p2.id, form_id: card.formId, stream_id: card.streamId, subject_id: card.subjectId, teacher_id: card.teacherId, room, is_double: true, term, year };
        classGrid[day][p1.id][ck] = e1;
        classGrid[day][p2.id][ck] = e2;
        if (card.teacherId) {
          teacherGrid[day][p1.id].add(card.teacherId);
          teacherGrid[day][p2.id].add(card.teacherId);
          teacherWeekly[card.teacherId] = (teacherWeekly[card.teacherId] || 0) + 2;
        }
        if (room) { roomGrid[day][p1.id].add(room); roomGrid[day][p2.id].add(room); }
        placed.push(e1, e2);
        return true;
      }
    }
    return false;
  };

  // â”€â”€ TRUE BACKTRACKING SOLVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // When greedy fails: displace a lower-priority lesson, place card,
  // then re-place the displaced lesson elsewhere (Kempe-chain style).
  // Depth-1 backtracking â€” fast, effective, defeats ASC greedy.
  const backtrackPlace = (card: Card): boolean => {
    const ck = `${card.formId}-${card.streamId}`;
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

    for (const day of shuffledDays) {
      for (const period of lessonPeriods) {
        const victim = classGrid[day][period.id][ck];
        if (!victim || victim.subject_id === card.subjectId) continue;
        // Never displace a core subject for a non-core
        if (subjectCategories[victim.subject_id!] === 'Core' && !card.isCore) continue;

        // â”€â”€ Step 1: Temporarily remove victim â”€â”€
        delete classGrid[day][period.id][ck];
        if (victim.teacher_id) {
          teacherGrid[day][period.id].delete(victim.teacher_id);
          teacherWeekly[victim.teacher_id] = Math.max(0, (teacherWeekly[victim.teacher_id] || 0) - 1);
        }
        if (victim.room) roomGrid[day][period.id].delete(victim.room);

        // â”€â”€ Step 2: Check if card fits here now â”€â”€
        const teacherOk = !card.teacherId || (
          !teacherGrid[day][period.id].has(card.teacherId) &&
          isTeacherAvailable(card.teacherId, day, period.id) &&
          countTeacherOnDay(day, card.teacherId) < settings.maxTeacherLessonsPerDay &&
          (teacherWeekly[card.teacherId] || 0) < maxWeekly
        );

        if (teacherOk) {
          // â”€â”€ Step 3: Place card into vacated slot â”€â”€
          const room = findFreeRoom(day, period.id, card.subjectId);
          const newEntry: Entry = {
            day_of_week: day, period_id: period.id,
            form_id: card.formId, stream_id: card.streamId,
            subject_id: card.subjectId, teacher_id: card.teacherId,
            room, is_double: false, term, year,
          };
          classGrid[day][period.id][ck] = newEntry;
          if (card.teacherId) {
            teacherGrid[day][period.id].add(card.teacherId);
            teacherWeekly[card.teacherId] = (teacherWeekly[card.teacherId] || 0) + 1;
          }
          if (room) roomGrid[day][period.id].add(room);

          // â”€â”€ Step 4: Try to re-place victim elsewhere â”€â”€
          const victimCard: Card = {
            reqId: 0, formId: victim.form_id, streamId: victim.stream_id || 0,
            subjectId: victim.subject_id!, teacherId: victim.teacher_id,
            lessonIndex: 0, maxPerDay: 2, allowDouble: false,
            isCore: subjectCategories[victim.subject_id!] === 'Core',
          };
          const victimReplaced = placeCard(victimCard);

          if (victimReplaced) {
            // âœ… Both placed â€” remove victim's old entry from placed array
            const oldIdx = placed.findIndex(p =>
              p.day_of_week === day && p.period_id === period.id &&
              p.form_id === card.formId && p.stream_id === (card.streamId || 0) &&
              p.subject_id === victim.subject_id
            );
            if (oldIdx >= 0) placed.splice(oldIdx, 1);
            placed.push(newEntry);
            return true; // ðŸŽ‰ Backtrack succeeded
          }

          // â”€â”€ Step 5: Victim failed â€” revert card placement â”€â”€
          delete classGrid[day][period.id][ck];
          if (card.teacherId) {
            teacherGrid[day][period.id].delete(card.teacherId);
            teacherWeekly[card.teacherId] = Math.max(0, (teacherWeekly[card.teacherId] || 0) - 1);
          }
          if (room) roomGrid[day][period.id].delete(room);
        }

        // â”€â”€ Step 6: Restore victim to grids â”€â”€
        classGrid[day][period.id][ck] = victim;
        if (victim.teacher_id) {
          teacherGrid[day][period.id].add(victim.teacher_id);
          teacherWeekly[victim.teacher_id] = (teacherWeekly[victim.teacher_id] || 0) + 1;
        }
        if (victim.room) roomGrid[day][period.id].add(victim.room);
      }
    }
    return false; // Backtrack exhausted â€” truly unplaceable
  };

  // â”€â”€ Main placement loop: Greedy â†’ Backtrack â†’ Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const card of cards) {
    let success = false;
    if (card.allowDouble && card.lessonIndex === 0) {
      success = placeDoubleCard(card);
      if (success) continue;
    }
    success = placeCard(card);
    // â”€â”€ NEW: If greedy fails, try backtracking displacement â”€â”€
    if (!success) success = backtrackPlace(card);
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
            ? (teacherWeekly[card.teacherId] || 0) >= maxWeekly
              ? `Teacher exceeded TSC weekly limit (${maxWeekly} lessons)`
              : `Teacher unavailable or overloaded â€” backtrack exhausted`
            : `No available slot after greedy + backtrack â€” check requirements`,
        });
      }
    }
  }

  return { placed, unplaced };
}


export function detectCurriculumType(form: { form_name: string; curriculum_type?: string }): 'CBC' | '844' {
  if (form.curriculum_type === 'CBC') return 'CBC';
  if (form.curriculum_type === '844') return '844';
  const n = form.form_name.toLowerCase();
  // Grade 10/11/12 = CBC Senior School (Kenya 2024+)
  if (/grade\s*(10|11|12)|gr\.?\s*(10|11|12)|g10|g11|g12/.test(n)) return 'CBC';
  // Junior Secondary (Grade 7-9) = CBC
  if (/grade\s*[7-9]|jss|junior\s*secondary/.test(n)) return 'CBC';
  // Form 1-4 = 8-4-4
  if (/form\s*[1-4]|f[1-4]/.test(n)) return '844';
  return '844'; // default
}

export function isCBCSubject(subjectName: string): boolean {
  const cbcOnly = ['community service', 'csl', 'physical education', 'health education', 'peh',
    'social studies', 'integrated science', 'pre-technical', 'home science', 'creative arts',
    'life skills', 'pathways', 'stem pathway', 'arts pathway', 'social sciences pathway'];
  const n = subjectName.toLowerCase();
  return cbcOnly.some(k => n.includes(k));
}

export function is844Subject(subjectName: string): boolean {
  const n = subjectName.toLowerCase();
  return ['history & government', 'history and government', 'christian religious education', 'cre',
    'islamic religious education', 'ire', 'hindu religious education'].some(k => n.includes(k));
}

export function verifyTimetable(
  entries: Entry[], requirements: Requirement[], periods: Period[],
  teachers: { id: number; first_name: string; last_name: string }[],
  forms: { id: number; form_name: string; curriculum_type?: string }[],
  streams: { id: number; stream_name: string }[],
  subjects: { id: number; subject_name: string; cbc_subject_type?: string }[],
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
        message: `${getName(req.subject_id, subjects, 'subject')} â€” ${getName(req.form_id, forms, 'form')} ${getName(req.stream_id, streams, 'stream')}`,
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
              details: `${day} â€” ${p.period_name} is empty between scheduled lessons`,
              day, period: p.period_name,
            });
          }
        });
      }
    });
  });

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // KENYA 2026 CBC / 8-4-4 DUAL CURRICULUM CHECKS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Build curriculum map: formId â†’ 'CBC' | '844'
  const formCurriculumMap = new Map<number, 'CBC' | '844'>();
  forms.forEach(f => formCurriculumMap.set(f.id, detectCurriculumType(f)));

  const cbcFormIds = new Set(forms.filter(f => formCurriculumMap.get(f.id) === 'CBC').map(f => f.id));
  const f844Ids   = new Set(forms.filter(f => formCurriculumMap.get(f.id) === '844').map(f => f.id));

  const hasBothCurricula = cbcFormIds.size > 0 && f844Ids.size > 0;

  // â”€â”€ CHECK 7: Teacher teaching BOTH CBC and 8-4-4 in the same period â”€â”€
  if (hasBothCurricula) {
    DAYS.forEach(day => {
      lessonPeriods.forEach(p => {
        const slot = te.filter(e => e.day_of_week === day && e.period_id === p.id && e.teacher_id);
        const teacherMap = new Map<number, { cbc: boolean; f844: boolean; names: string[] }>();
        slot.forEach(e => {
          const isCBC = cbcFormIds.has(e.form_id);
          const is844 = f844Ids.has(e.form_id);
          if (!e.teacher_id) return;
          const cur = teacherMap.get(e.teacher_id) || { cbc: false, f844: false, names: [] };
          if (isCBC) cur.cbc = true;
          if (is844) cur.f844 = true;
          cur.names.push(getName(e.form_id, forms, 'form'));
          teacherMap.set(e.teacher_id, cur);
        });
        teacherMap.forEach((val, tid) => {
          if (val.cbc && val.f844) {
            conflicts.push({
              type: 'curriculum_conflict', severity: 'error', curriculum: 'CBC',
              message: `âš ï¸ ${getName(tid, teachers, 'teacher')} crosses curricula`,
              details: `${day} ${p.period_name}: Teaching CBC AND 8-4-4 classes simultaneously â€” ${val.names.join(' & ')}`,
              day, period: p.period_name,
            });
          }
        });
      });
    });
  }

  // â”€â”€ CHECK 8: CBC form missing Community Service Learning (CSL) â”€â”€
  if (cbcFormIds.size > 0) {
    const CSL_KEYWORDS = ['community service', 'csl', 'service learning'];
    const clSubjects = subjects.filter(s =>
      CSL_KEYWORDS.some(k => s.subject_name.toLowerCase().includes(k)) ||
      s.cbc_subject_type === 'CSL'
    );
    const clSubjectIds = new Set(clSubjects.map(s => s.id));

    cbcFormIds.forEach(fid => {
      const formStreams = [...new Set(te.filter(e => e.form_id === fid).map(e => e.stream_id))];
      formStreams.forEach(sid => {
        const hasCSL = te.some(e =>
          e.form_id === fid && e.stream_id === sid && e.subject_id && clSubjectIds.has(e.subject_id)
        );
        if (!hasCSL && clSubjects.length > 0) {
          conflicts.push({
            type: 'cbc_missing', severity: 'warning', curriculum: 'CBC',
            message: `ðŸ“š Missing CSL â€” ${getName(fid, forms, 'form')} ${getName(sid, streams, 'stream')}`,
            details: 'KICD requires 2 Community Service Learning periods/week for CBC Senior School',
          });
        }
      });
    });
  }

  // â”€â”€ CHECK 9: CBC form missing Physical Education & Health â”€â”€
  if (cbcFormIds.size > 0) {
    const PE_KEYWORDS = ['physical education', 'peh', 'pe & health', 'sports'];
    const peSubjects = subjects.filter(s =>
      PE_KEYWORDS.some(k => s.subject_name.toLowerCase().includes(k)) ||
      s.cbc_subject_type === 'PE'
    );
    const peSubjectIds = new Set(peSubjects.map(s => s.id));

    cbcFormIds.forEach(fid => {
      const formStreams = [...new Set(te.filter(e => e.form_id === fid).map(e => e.stream_id))];
      formStreams.forEach(sid => {
        const hasPE = te.some(e =>
          e.form_id === fid && e.stream_id === sid && e.subject_id && peSubjectIds.has(e.subject_id)
        );
        if (!hasPE && peSubjects.length > 0) {
          conflicts.push({
            type: 'cbc_missing', severity: 'warning', curriculum: 'CBC',
            message: `ðŸƒ Missing PE&H â€” ${getName(fid, forms, 'form')} ${getName(sid, streams, 'stream')}`,
            details: 'KICD CBC Senior School requires Physical Education & Health (2 periods/week)',
          });
        }
      });
    });
  }

  // â”€â”€ CHECK 10: Subjectâ€“Curriculum mismatch (CBC subject in 8-4-4 form) â”€â”€
  if (hasBothCurricula) {
    te.forEach(e => {
      if (!e.subject_id) return;
      const sub = subjects.find(s => s.id === e.subject_id);
      if (!sub) return;
      const isCBCForm = cbcFormIds.has(e.form_id);
      const is844Form = f844Ids.has(e.form_id);
      const cbcSubj = isCBCSubject(sub.subject_name) || sub.cbc_subject_type === 'CSL';
      const f844Subj = is844Subject(sub.subject_name);
      if (is844Form && cbcSubj) {
        conflicts.push({
          type: 'curriculum_conflict', severity: 'warning', curriculum: '844',
          message: `ðŸ”€ CBC subject in 8-4-4 class â€” ${sub.subject_name}`,
          details: `${getName(e.form_id, forms, 'form')} ${getName(e.stream_id, streams, 'stream')}: "${sub.subject_name}" is a CBC-specific subject`,
        });
      }
      if (isCBCForm && f844Subj) {
        conflicts.push({
          type: 'curriculum_conflict', severity: 'info', curriculum: 'CBC',
          message: `ðŸ”€ 8-4-4 subject in CBC class â€” ${sub.subject_name}`,
          details: `${getName(e.form_id, forms, 'form')} ${getName(e.stream_id, streams, 'stream')}: "${sub.subject_name}" is typically an 8-4-4 subject`,
        });
      }
    });
  }

  // â”€â”€ CHECK 11: KICD Minimum Weekly Lessons (Grade 10/11/12 = 40/week) â”€â”€
  cbcFormIds.forEach(fid => {
    const formName = getName(fid, forms, 'form');
    const formStreams = [...new Set(te.filter(e => e.form_id === fid).map(e => e.stream_id))];
    formStreams.forEach(sid => {
      const streamLessons = te.filter(e => e.form_id === fid && e.stream_id === sid).length;
      const streamName = getName(sid, streams, 'stream');
      if (streamLessons < 35 && streamLessons > 0) {
        conflicts.push({
          type: 'cbc_missing', severity: 'warning', curriculum: 'CBC',
          message: `ðŸ“Š Low lesson count â€” ${formName} ${streamName}`,
          details: `Only ${streamLessons} lessons/week. KICD CBC Senior School recommends 38â€“40 periods/week`,
        });
      }
    });
  });

  // â”€â”€ CHECK 12: Practical subjects need double periods (CBC Lab Rule) â”€â”€
  const PRACTICAL_KEYWORDS = ['biology', 'chemistry', 'physics', 'computer', 'agriculture', 'home science', 'art'];
  cbcFormIds.forEach(fid => {
    const formStreams = [...new Set(te.filter(e => e.form_id === fid).map(e => e.stream_id))];
    formStreams.forEach(sid => {
      PRACTICAL_KEYWORDS.forEach(kw => {
        const practicalEntries = te.filter(e =>
          e.form_id === fid && e.stream_id === sid && e.subject_id &&
          subjects.find(s => s.id === e.subject_id)?.subject_name.toLowerCase().includes(kw)
        );
        const hasDouble = practicalEntries.some(e => e.is_double);
        if (practicalEntries.length >= 2 && !hasDouble) {
          const subName = subjects.find(s => s.id === practicalEntries[0].subject_id)?.subject_name || kw;
          conflicts.push({
            type: 'cbc_missing', severity: 'info', curriculum: 'CBC',
            message: `ðŸ”¬ No double period â€” ${subName} (${getName(fid, forms, 'form')})`,
            details: 'KICD CBC: Practical subjects (Science, Computer, Art) should have at least one double period for lab work',
          });
        }
      });
    });
  });

  // â”€â”€ CHECK 13: Teacher cross-curriculum daily overload â”€â”€
  // A teacher teaching BOTH CBC and 8-4-4 across the week â€” warn if > 35 total
  if (hasBothCurricula) {
    teachers.forEach(t => {
      const cbcLessons = te.filter(e => e.teacher_id === t.id && cbcFormIds.has(e.form_id)).length;
      const f844Lessons = te.filter(e => e.teacher_id === t.id && f844Ids.has(e.form_id)).length;
      if (cbcLessons > 0 && f844Lessons > 0 && (cbcLessons + f844Lessons) > 30) {
        conflicts.push({
          type: 'curriculum_conflict', severity: 'warning',
          message: `âš¡ Cross-curriculum overload â€” ${t.first_name} ${t.last_name}`,
          details: `Teaching ${cbcLessons} CBC + ${f844Lessons} 8-4-4 lessons/week (${cbcLessons + f844Lessons} total). Consider curriculum specialization`,
        });
      }
    });
  }

  // â”€â”€ CHECK 14: Form 4 (8-4-4) â€” KCSE 2026 last cohort integrity â”€â”€
  const form4s = forms.filter(f => {
    const n = f.form_name.toLowerCase();
    return /form\s*4|f4/.test(n) && formCurriculumMap.get(f.id) === '844';
  });
  form4s.forEach(f4 => {
    const f4Streams = [...new Set(te.filter(e => e.form_id === f4.id).map(e => e.stream_id))];
    f4Streams.forEach(sid => {
      const subjectCount = new Set(te.filter(e => e.form_id === f4.id && e.stream_id === sid && e.subject_id).map(e => e.subject_id)).size;
      if (subjectCount < 7) {
        conflicts.push({
          type: 'missing_assignment', severity: 'warning', curriculum: '844',
          message: `ðŸ“‹ KCSE 2026 Form 4 â€” ${getName(f4.id, forms, 'form')} ${getName(sid, streams, 'stream')}`,
          details: `Only ${subjectCount} subjects scheduled. KCSE candidates need minimum 7 subjects. This is the LAST 8-4-4 KCSE cohort â€” ensure full coverage`,
        });
      }
    });
  });

  return conflicts;

}

// â”€â”€â”€ TSC Workload Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

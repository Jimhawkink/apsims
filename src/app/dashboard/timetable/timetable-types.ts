// ─── APSIMS ULTRA TIMETABLE — TYPE DEFINITIONS ───────────────────
// Kenya Secondary School Timetable Engine — Defeating Zeraki & ASC

export type TTab =
  | 'dashboard' | 'cards' | 'availability' | 'classrooms'
  | 'generate' | 'editor'
  | 'class' | 'teacher' | 'room' | 'master'
  | 'verify' | 'substitutions' | 'stats' | 'print' | 'setup';

export interface Period {
  id: number; period_number: number; period_name: string;
  start_time: string; end_time: string; period_type: string;
}

export interface Form { id: number; form_name: string; form_level: number; }
export interface Stream { id: number; stream_name: string; }
export interface Subject { id: number; subject_name: string; subject_code?: string; category?: string; }
export interface Teacher { id: number; first_name: string; last_name: string; tsc_number?: string; status: string; subjects?: string[]; }

export interface Requirement {
  id?: number; form_id: number; stream_id: number; subject_id: number;
  teacher_id: number | null; lessons_per_week: number; max_per_day: number;
  allow_double: boolean; term: string; year: number;
}

export interface Entry {
  id?: number; day_of_week: string; period_id: number;
  form_id: number; stream_id: number;
  subject_id: number | null; teacher_id: number | null;
  room: string | null; is_double: boolean; term: string; year: number;
}

export interface Classroom {
  id?: number; room_name: string; room_code?: string;
  room_type: string; building?: string; floor_number?: number;
  capacity: number; has_projector?: boolean; is_active: boolean; notes?: string;
}

export interface Substitution {
  id?: number; substitution_date: string;
  absent_teacher_id: number; substitute_teacher_id: number | null;
  period_id: number; form_id: number; stream_id: number;
  subject_id: number | null; reason?: string; status: string; notes?: string;
}

export interface Availability {
  id?: number; teacher_id: number; day_of_week: string;
  period_id: number; is_available: boolean; term: string; year: number;
}

export interface UnplacedCard { req: Requirement; remaining: number; reason: string; }

export interface GenSettings {
  maxConsecutiveSameSubject: number; spreadEvenly: boolean;
  avoidLastPeriod: string[]; maxTeacherLessonsPerDay: number;
}

export interface ConflictItem {
  type: 'teacher_clash' | 'room_clash' | 'missing_assignment' | 'overload' | 'gap';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string;
  day?: string;
  period?: string;
}

// ─── ULTRA Analytics Types ──────────────────────────────────────
export interface TeacherLoadData {
  id: number;
  name: string;
  count: number;
  subjects: string[];
  classes: string[];
  freePeriodsPerDay: Record<string, number>;
  avgLoadPerDay: number;
  maxDayLoad: number;
}

export interface ClassCompletionData {
  formId: number;
  streamId: number;
  formName: string;
  streamName: string;
  filled: number;
  required: number;
  pct: number;
  subjectBreakdown: { subject: string; placed: number; required: number }[];
}

export interface HeatmapCell {
  day: string;
  periodId: number;
  value: number;
  label: string;
}

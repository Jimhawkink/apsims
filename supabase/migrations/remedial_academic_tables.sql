-- ============================================================
-- APSIMS: Academic Remedial Programs Tables
-- Run this in Supabase SQL Editor to enable the Academic
-- Remedial Programs module at /dashboard/remedial/academic
-- ============================================================

-- 1. Programs table
CREATE TABLE IF NOT EXISTS school_remedial_programs (
  id              serial PRIMARY KEY,
  name            text,
  subject_id      int REFERENCES school_subjects(id) ON DELETE CASCADE,
  form_id         int REFERENCES school_forms(id) ON DELETE CASCADE,
  term_id         int REFERENCES school_terms(id),
  teacher_id      int REFERENCES school_teachers(id),
  start_date      date,
  end_date        date,
  schedule        text,
  target_score    int DEFAULT 50,
  max_students    int,
  description     text,
  status          text DEFAULT 'active' CHECK (status IN ('planned','active','completed')),
  created_at      timestamptz DEFAULT now()
);

-- 2. Enrollments table (pre/post scores for improvement tracking)
CREATE TABLE IF NOT EXISTS school_remedial_enrollments (
  id          serial PRIMARY KEY,
  program_id  int REFERENCES school_remedial_programs(id) ON DELETE CASCADE,
  student_id  int REFERENCES school_students(id) ON DELETE CASCADE,
  pre_score   numeric,
  post_score  numeric,
  status      text DEFAULT 'enrolled' CHECK (status IN ('enrolled','completed','dropped')),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE (program_id, student_id)
);

-- 3. Sessions table (individual remedial lesson sessions)
CREATE TABLE IF NOT EXISTS school_remedial_sessions (
  id           serial PRIMARY KEY,
  program_id   int REFERENCES school_remedial_programs(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time   time,
  end_time     time,
  topic        text NOT NULL,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- 4. Attendance table (per student per session)
CREATE TABLE IF NOT EXISTS school_remedial_attendance (
  id         serial PRIMARY KEY,
  session_id int REFERENCES school_remedial_sessions(id) ON DELETE CASCADE,
  student_id int REFERENCES school_students(id) ON DELETE CASCADE,
  status     text DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  notes      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE school_remedial_programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_attendance ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for authenticated users)
DO $$ BEGIN
  DROP POLICY IF EXISTS "all_remedial_programs"    ON school_remedial_programs;
  DROP POLICY IF EXISTS "all_remedial_enrollments" ON school_remedial_enrollments;
  DROP POLICY IF EXISTS "all_remedial_sessions"    ON school_remedial_sessions;
  DROP POLICY IF EXISTS "all_remedial_attendance"  ON school_remedial_attendance;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "all_remedial_programs"    ON school_remedial_programs    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_remedial_enrollments" ON school_remedial_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_remedial_sessions"    ON school_remedial_sessions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_remedial_attendance"  ON school_remedial_attendance  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_remedial_enrollments_program ON school_remedial_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_program    ON school_remedial_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_remedial_attendance_session  ON school_remedial_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_remedial_attendance_student  ON school_remedial_attendance(student_id);

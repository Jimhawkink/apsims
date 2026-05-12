-- ============================================================
-- CBC ULTRA ASSESSMENT SYSTEM — NEW TABLES
-- APSIMS — Powering mark-entry intelligence, teacher notes,
--          configurable rubric thresholds, and intervention flags.
--
-- SAFE TO RE-RUN: All statements are fully idempotent.
-- Run in Supabase SQL Editor (postgres role).
-- ============================================================


-- ============================================================
-- TABLE 1: cbc_mark_scores
-- Stores raw numeric score (0–100) alongside the rubric level.
-- The existing cbc_assessments table only stores rubric_level;
-- this table adds the numeric dimension for analytics, mean
-- computation, trend tracking, and auto-rubric assignment.
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_mark_scores (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id      INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id         INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL
    CHECK (assessment_type IN ('Formative', 'Summative')),
  task_name       TEXT DEFAULT 'Summative',
  raw_score       NUMERIC(5,2) NOT NULL CHECK (raw_score >= 0 AND raw_score <= 100),
  rubric_level    TEXT NOT NULL
    CHECK (rubric_level IN ('EE', 'ME', 'AE', 'BE')),
  teacher_id      INTEGER REFERENCES school_teachers(id),
  assessed_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one score per student/subject/term/assessment_type/task
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbc_mark_scores_unique
  ON cbc_mark_scores (student_id, subject_id, term_id, assessment_type, task_name);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_cbc_mark_scores_student
  ON cbc_mark_scores (student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_mark_scores_subject_term
  ON cbc_mark_scores (subject_id, term_id);
CREATE INDEX IF NOT EXISTS idx_cbc_mark_scores_rubric
  ON cbc_mark_scores (rubric_level);

ALTER TABLE cbc_mark_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_mark_scores"
    ON cbc_mark_scores FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- TABLE 2: cbc_teacher_notes
-- Per-student, per-subject, per-term teacher comments.
-- Supports inline note editing in the ultra mark entry grid.
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_teacher_notes (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id  INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id     INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
  teacher_id  INTEGER REFERENCES school_teachers(id),
  note_text   TEXT NOT NULL DEFAULT '',
  note_type   TEXT DEFAULT 'general'
    CHECK (note_type IN ('general', 'intervention', 'commendation', 'observation')),
  is_flagged  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_teacher_notes_unique
    UNIQUE (student_id, subject_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_cbc_teacher_notes_student
  ON cbc_teacher_notes (student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_teacher_notes_subject_term
  ON cbc_teacher_notes (subject_id, term_id);

ALTER TABLE cbc_teacher_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_teacher_notes"
    ON cbc_teacher_notes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- TABLE 3: cbc_rubric_thresholds
-- Configurable EE/ME/AE/BE score ranges per subject.
-- Different subjects may have different threshold boundaries
-- (e.g., Mathematics might set EE at 75+, while English at 80+).
-- Falls back to global defaults when no subject-specific row exists.
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_rubric_thresholds (
  id            SERIAL PRIMARY KEY,
  subject_id    INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  rubric_level  TEXT NOT NULL
    CHECK (rubric_level IN ('EE', 'ME', 'AE', 'BE')),
  min_score     NUMERIC(5,2) NOT NULL CHECK (min_score >= 0),
  max_score     NUMERIC(5,2) NOT NULL CHECK (max_score <= 100),
  is_global     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_rubric_thresholds_subject_level_key
    UNIQUE (subject_id, rubric_level),
  CONSTRAINT cbc_rubric_thresholds_score_range
    CHECK (min_score <= max_score)
);

CREATE INDEX IF NOT EXISTS idx_cbc_rubric_thresholds_subject
  ON cbc_rubric_thresholds (subject_id);

ALTER TABLE cbc_rubric_thresholds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_rubric_thresholds"
    ON cbc_rubric_thresholds FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed global default thresholds (subject_id = NULL means global)
INSERT INTO cbc_rubric_thresholds (subject_id, rubric_level, min_score, max_score, is_global)
VALUES
  (NULL, 'EE', 80, 100, true),
  (NULL, 'ME', 60,  79, true),
  (NULL, 'AE', 40,  59, true),
  (NULL, 'BE',  0,  39, true)
ON CONFLICT (subject_id, rubric_level) DO UPDATE SET
  min_score = EXCLUDED.min_score,
  max_score = EXCLUDED.max_score,
  is_global = EXCLUDED.is_global;


-- ============================================================
-- TABLE 4: cbc_intervention_flags
-- Track BE students flagged for support/intervention.
-- Links to the student + subject + term with status tracking
-- for follow-up workflows.
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_intervention_flags (
  id                SERIAL PRIMARY KEY,
  student_id        INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id           INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
  flagged_by        INTEGER REFERENCES school_teachers(id),
  rubric_level_at_flag TEXT NOT NULL DEFAULT 'BE'
    CHECK (rubric_level_at_flag IN ('EE', 'ME', 'AE', 'BE')),
  raw_score_at_flag NUMERIC(5,2),
  flag_reason       TEXT DEFAULT 'Below Expectation — requires intervention',
  intervention_type TEXT DEFAULT 'academic_support'
    CHECK (intervention_type IN (
      'academic_support', 'remedial_classes', 'peer_tutoring',
      'parent_meeting', 'counseling', 'special_needs_referral', 'other'
    )),
  intervention_notes TEXT,
  status            TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       INTEGER REFERENCES school_teachers(id),
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_intervention_flags_unique
    UNIQUE (student_id, subject_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_cbc_intervention_flags_student
  ON cbc_intervention_flags (student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_intervention_flags_status
  ON cbc_intervention_flags (status);
CREATE INDEX IF NOT EXISTS idx_cbc_intervention_flags_term
  ON cbc_intervention_flags (term_id);

ALTER TABLE cbc_intervention_flags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_intervention_flags"
    ON cbc_intervention_flags FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- HELPER: Add raw_score column to existing cbc_assessments
-- (backward compatible — existing rows get NULL raw_score)
-- ============================================================

ALTER TABLE cbc_assessments
  ADD COLUMN IF NOT EXISTS raw_score NUMERIC(5,2)
    CHECK (raw_score IS NULL OR (raw_score >= 0 AND raw_score <= 100));


-- ============================================================
-- HELPER VIEW: v_cbc_mark_entry_ultra
-- Joins students, mark_scores, teacher_notes, and previous
-- term data for the ultra mark entry grid.
-- ============================================================

CREATE OR REPLACE VIEW v_cbc_mark_entry_ultra AS
SELECT
  s.id AS student_id,
  s.first_name,
  s.last_name,
  s.admission_no,
  s.admission_number,
  s.form_id,
  s.stream_id,
  s.gender,
  ms.raw_score,
  ms.rubric_level AS current_level,
  ms.assessment_type,
  ms.task_name,
  ms.term_id,
  ms.subject_id,
  tn.note_text AS teacher_note,
  tn.note_type,
  tn.is_flagged AS note_flagged,
  cs.formative_level,
  cs.summative_level,
  cs.overall_level,
  cs.formative_count,
  ifl.status AS intervention_status,
  ifl.intervention_type
FROM school_students s
LEFT JOIN cbc_mark_scores ms
  ON ms.student_id = s.id
LEFT JOIN cbc_teacher_notes tn
  ON tn.student_id = s.id
  AND tn.subject_id = ms.subject_id
  AND tn.term_id = ms.term_id
LEFT JOIN cbc_competency_summaries cs
  ON cs.student_id = s.id
  AND cs.subject_id = ms.subject_id
  AND cs.term_id = ms.term_id
LEFT JOIN cbc_intervention_flags ifl
  ON ifl.student_id = s.id
  AND ifl.subject_id = ms.subject_id
  AND ifl.term_id = ms.term_id
WHERE s.status = 'Active';


-- ============================================================
-- SMOKE-CHECK QUERIES
-- Run after migration to verify tables were created correctly.
-- ============================================================

-- Verify cbc_mark_scores table exists
SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cbc_mark_scores'
  ORDER BY ordinal_position;

-- Verify cbc_teacher_notes table exists
SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cbc_teacher_notes'
  ORDER BY ordinal_position;

-- Verify cbc_rubric_thresholds has global defaults
SELECT rubric_level, min_score, max_score, is_global
  FROM cbc_rubric_thresholds
  WHERE is_global = true
  ORDER BY min_score;

-- Verify cbc_intervention_flags table exists
SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cbc_intervention_flags'
  ORDER BY ordinal_position;

-- Verify raw_score column was added to cbc_assessments
SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cbc_assessments' AND column_name = 'raw_score';

-- ============================================================
-- END OF MIGRATION
-- ============================================================

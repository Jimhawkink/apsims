-- ──────────────────────────────────────────────────────────────────
-- APSIMS: KCSE Historical Analysis Tables
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────

-- 1. KCSE Year-by-Year History
CREATE TABLE IF NOT EXISTS school_kcse_history (
  id                BIGSERIAL PRIMARY KEY,
  year              INT NOT NULL UNIQUE,
  total_candidates  INT DEFAULT 0,
  grade_counts      JSONB DEFAULT '{}',   -- {"A": 5, "A-": 12, "B+": 20, ...}
  mean_points       DECIMAL(5,2) DEFAULT 0,
  mean_grade        TEXT DEFAULT 'C',
  school_position   INT,                  -- position in county
  county_mean       DECIMAL(5,2),
  national_mean     DECIMAL(5,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KCSE Subject Analysis by Year
CREATE TABLE IF NOT EXISTS school_kcse_subject_history (
  id           BIGSERIAL PRIMARY KEY,
  year         INT NOT NULL,
  subject      TEXT NOT NULL,
  mean_score   DECIMAL(5,2) DEFAULT 0,
  mean_grade   TEXT DEFAULT 'C',
  candidates   INT DEFAULT 0,
  pass_rate    DECIMAL(5,2) DEFAULT 0,   -- percentage
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, subject)
);

-- 3. Class Targets (per form, per subject, per term)
CREATE TABLE IF NOT EXISTS school_class_targets (
  id           BIGSERIAL PRIMARY KEY,
  academic_year TEXT NOT NULL,           -- e.g. '2024'
  term         TEXT NOT NULL,            -- 'Term 1', 'Term 2', 'Term 3'
  form_id      INT REFERENCES school_forms(id) ON DELETE CASCADE,
  stream_id    INT REFERENCES school_streams(id) ON DELETE SET NULL,
  subject_id   INT REFERENCES school_subjects(id) ON DELETE CASCADE,
  target_grade TEXT,                     -- 'A', 'B+', etc.
  target_points DECIMAL(5,2),
  attained_points DECIMAL(5,2),
  attained_grade TEXT,
  deviation    DECIMAL(5,2)              -- attained - target
    GENERATED ALWAYS AS (attained_points - target_points) STORED,
  new_target   DECIMAL(5,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year, term, form_id, subject_id, COALESCE(stream_id, 0))
);

-- 4. Internal Exam Series Tracker (Cycle Tests, Arise & Shine, End of Term)
CREATE TABLE IF NOT EXISTS school_exam_series (
  id           BIGSERIAL PRIMARY KEY,
  academic_year TEXT NOT NULL,
  term         TEXT NOT NULL,
  series_name  TEXT NOT NULL,            -- 'Cycle Test 1', 'Arise & Shine', 'End of Term'
  exam_date    DATE,
  form_id      INT REFERENCES school_forms(id) ON DELETE CASCADE,
  stream_id    INT REFERENCES school_streams(id) ON DELETE SET NULL,
  subject_id   INT REFERENCES school_subjects(id) ON DELETE CASCADE,
  mean_score   DECIMAL(5,2),
  mean_grade   TEXT,
  highest_score DECIMAL(5,2),
  lowest_score  DECIMAL(5,2),
  pass_count   INT DEFAULT 0,
  fail_count   INT DEFAULT 0,
  total_students INT DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (permissive for now)
ALTER TABLE school_kcse_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_kcse_subject_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_class_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_exam_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON school_kcse_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON school_kcse_subject_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON school_class_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON school_exam_series FOR ALL USING (true) WITH CHECK (true);

-- Sample data for testing (2024 results)
INSERT INTO school_kcse_history (year, total_candidates, grade_counts, mean_points, mean_grade, county_mean, national_mean)
VALUES (2024, 125, '{"A":3,"A-":8,"B+":15,"B":18,"B-":20,"C+":22,"C":18,"C-":10,"D+":5,"D":4,"D-":2,"E":0}', 7.43, 'C+', 6.82, 5.94)
ON CONFLICT (year) DO NOTHING;

INSERT INTO school_kcse_history (year, total_candidates, grade_counts, mean_points, mean_grade, county_mean, national_mean)
VALUES (2023, 118, '{"A":2,"A-":6,"B+":12,"B":16,"B-":18,"C+":20,"C":21,"C-":12,"D+":6,"D":3,"D-":2,"E":0}', 7.12, 'C+', 6.71, 5.87)
ON CONFLICT (year) DO NOTHING;

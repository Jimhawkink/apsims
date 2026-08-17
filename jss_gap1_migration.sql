-- ============================================================
-- APSIMS JSS CBC TABLES — Gap 1 Migration
-- Run in Supabase SQL Editor
-- Follows school_* naming pattern
-- ============================================================

-- 1. JSS Learning Areas (KICD Official for Grade 7-9)
CREATE TABLE IF NOT EXISTS jss_learning_areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  grade_levels TEXT DEFAULT '7,8,9',
  description TEXT,
  color TEXT DEFAULT '#2563EB',
  icon TEXT DEFAULT '??',
  is_compulsory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JSS Strands per Learning Area
CREATE TABLE IF NOT EXISTS jss_strands (
  id SERIAL PRIMARY KEY,
  learning_area_id INTEGER NOT NULL REFERENCES jss_learning_areas(id) ON DELETE CASCADE,
  strand_name TEXT NOT NULL,
  strand_code TEXT NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level IN (7,8,9)),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(strand_code, grade_level)
);

-- 3. JSS Sub-Strands
CREATE TABLE IF NOT EXISTS jss_sub_strands (
  id SERIAL PRIMARY KEY,
  strand_id INTEGER NOT NULL REFERENCES jss_strands(id) ON DELETE CASCADE,
  sub_strand_name TEXT NOT NULL,
  sub_strand_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. JSS Marks (EE/ME/AE/BE per student per learning area per term)
CREATE TABLE IF NOT EXISTS jss_marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  learning_area_id INTEGER NOT NULL REFERENCES jss_learning_areas(id),
  strand_id INTEGER REFERENCES jss_strands(id),
  term_id INTEGER NOT NULL REFERENCES school_terms(id),
  form_id INTEGER NOT NULL REFERENCES school_forms(id),
  year INTEGER NOT NULL,
  competency_level TEXT NOT NULL CHECK (competency_level IN ('EE','ME','AE','BE')),
  teacher_notes TEXT,
  evidence_description TEXT,
  entered_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, learning_area_id, strand_id, term_id, year)
);

-- 5. JSS SAT Tasks (Summative Assessment Tool)
CREATE TABLE IF NOT EXISTS jss_sat_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  form_id INTEGER NOT NULL REFERENCES school_forms(id),
  learning_area_id INTEGER NOT NULL REFERENCES jss_learning_areas(id),
  strand_id INTEGER REFERENCES jss_strands(id),
  term_id INTEGER NOT NULL REFERENCES school_terms(id),
  year INTEGER NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'Project Work',
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','closed','submitted_knec')),
  hod_approval TEXT DEFAULT 'pending' CHECK (hod_approval IN ('pending','approved','rejected')),
  evidence_required BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. JSS SAT Scores per student per task
CREATE TABLE IF NOT EXISTS jss_sat_scores (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES jss_sat_tasks(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  competency_level TEXT CHECK (competency_level IN ('EE','ME','AE','BE')),
  evidence_url TEXT,
  teacher_notes TEXT,
  submitted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','scored','approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, student_id)
);

-- 7. JSS Learner Profile (end of Grade 9)
CREATE TABLE IF NOT EXISTS jss_learner_profiles (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  overall_competency TEXT CHECK (overall_competency IN ('EE','ME','AE','BE')),
  principal_remarks TEXT,
  teacher_remarks TEXT,
  certificate_number TEXT UNIQUE,
  generated_at TIMESTAMPTZ,
  issued_at DATE,
  nemis_submitted BOOLEAN DEFAULT false,
  pathway_recommendation TEXT,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, year)
);

-- 8. JSS Transition Reports (Grade 9 to Grade 10)
CREATE TABLE IF NOT EXISTS jss_transition_reports (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  from_grade INTEGER DEFAULT 9,
  to_grade INTEGER DEFAULT 10,
  academic_year INTEGER NOT NULL,
  overall_competency TEXT CHECK (overall_competency IN ('EE','ME','AE','BE')),
  recommended_pathway TEXT,
  pathway_confirmed BOOLEAN DEFAULT false,
  parent_consent BOOLEAN DEFAULT false,
  parent_consent_date DATE,
  principal_signature TEXT,
  target_school TEXT,
  transition_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','transferred')),
  knec_submitted BOOLEAN DEFAULT false,
  knec_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year)
);

-- 9. Teacher Subject-Stream Assignment
CREATE TABLE IF NOT EXISTS school_teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES school_teachers(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  learning_area_id INTEGER REFERENCES jss_learning_areas(id) ON DELETE CASCADE,
  form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
  stream_id INTEGER REFERENCES school_streams(id) ON DELETE CASCADE,
  term_id INTEGER REFERENCES school_terms(id),
  year INTEGER NOT NULL,
  is_class_teacher BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  assigned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED: KICD Official JSS Learning Areas
-- ============================================================
INSERT INTO jss_learning_areas (name, code, grade_levels, description, color, icon, is_compulsory, sort_order)
VALUES
  ('English', 'ENG', '7,8,9', 'English Language & Literature', '#2563EB', '??', true, 1),
  ('Kiswahili', 'KSW', '7,8,9', 'Kiswahili Language & Literature', '#059669', '???', true, 2),
  ('Mathematics', 'MAT', '7,8,9', 'Mathematics', '#DC2626', '??', true, 3),
  ('Integrated Science', 'ISC', '7,8,9', 'Integrated Science', '#7C3AED', '??', true, 4),
  ('Social Studies', 'SST', '7,8,9', 'Social Studies', '#D97706', '??', true, 5),
  ('Agriculture', 'AGR', '7,8,9', 'Agriculture & Nutrition', '#16A34A', '??', true, 6),
  ('Pre-Technical Studies', 'PTS', '7,8,9', 'Pre-Technical Studies', '#0891B2', '??', true, 7),
  ('Business Studies', 'BUS', '7,8,9', 'Business Studies', '#9333EA', '??', true, 8),
  ('Creative Arts & Sports', 'CAS', '7,8,9', 'Creative Arts, Music, Drama & PE', '#EC4899', '??', true, 9),
  ('Life Skills Education', 'LSE', '7,8,9', 'Life Skills & Values Education', '#06B6D4', '??', true, 10),
  ('Religious Education', 'CRE', '7,8,9', 'CRE / IRE / HRE', '#6366F1', '??', false, 11)
ON CONFLICT (code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jss_marks_student ON jss_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_jss_marks_term ON jss_marks(term_id, year);
CREATE INDEX IF NOT EXISTS idx_jss_marks_form ON jss_marks(form_id);
CREATE INDEX IF NOT EXISTS idx_jss_sat_scores_task ON jss_sat_scores(task_id);
CREATE INDEX IF NOT EXISTS idx_jss_sat_scores_student ON jss_sat_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_school_teacher_subjects_teacher ON school_teacher_subjects(teacher_id);

-- RLS
ALTER TABLE jss_learning_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_sat_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_sat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jss_transition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_learning_areas') THEN
    CREATE POLICY allow_all_jss_learning_areas ON jss_learning_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_strands') THEN
    CREATE POLICY allow_all_jss_strands ON jss_strands FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_marks') THEN
    CREATE POLICY allow_all_jss_marks ON jss_marks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_sat_tasks') THEN
    CREATE POLICY allow_all_jss_sat_tasks ON jss_sat_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_sat_scores') THEN
    CREATE POLICY allow_all_jss_sat_scores ON jss_sat_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_learner_profiles') THEN
    CREATE POLICY allow_all_jss_learner_profiles ON jss_learner_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_jss_transition_reports') THEN
    CREATE POLICY allow_all_jss_transition_reports ON jss_transition_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_school_teacher_subjects') THEN
    CREATE POLICY allow_all_school_teacher_subjects ON school_teacher_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

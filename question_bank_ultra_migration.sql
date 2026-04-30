-- APSIMS Ultra Question Bank Migration
-- Run ONLY the new tables (existing school_question_bank already exists)

-- Add missing columns to existing question_bank table
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS marking_scheme TEXT;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS calculation_steps TEXT;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS essay_marking_points TEXT[];
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS distractor_analysis JSONB;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS ai_answer TEXT;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS ai_explanation TEXT;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS kcse_frequency INTEGER DEFAULT 0;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS last_kcse_year INTEGER;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS duplicate_of INTEGER;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS stats_attempts INTEGER DEFAULT 0;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS stats_correct INTEGER DEFAULT 0;
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200);
ALTER TABLE school_question_bank ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Past papers table
CREATE TABLE IF NOT EXISTS school_past_papers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  form_id INTEGER REFERENCES school_forms(id),
  year INTEGER NOT NULL,
  exam_type VARCHAR(50) DEFAULT 'KCSE',
  paper_number INTEGER DEFAULT 1,
  file_url TEXT,
  total_marks INTEGER DEFAULT 100,
  duration_minutes INTEGER DEFAULT 150,
  instructions TEXT,
  is_approved BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  uploaded_by VARCHAR(200),
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper versions (A/B/C) for auto generator
CREATE TABLE IF NOT EXISTS school_paper_versions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER,
  version_label VARCHAR(5) DEFAULT 'A',
  paper_config JSONB NOT NULL,
  total_marks INTEGER DEFAULT 100,
  file_url TEXT,
  omr_template_url TEXT,
  is_omr_ready BOOLEAN DEFAULT false,
  generated_by VARCHAR(200),
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student practice sessions
CREATE TABLE IF NOT EXISTS school_student_practice (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  topic_id INTEGER REFERENCES school_topics(id),
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score_percent NUMERIC(5,2) DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  difficulty VARCHAR(20) DEFAULT 'mixed',
  completed_at TIMESTAMPTZ,
  answers JSONB,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KCSE frequency analysis
CREATE TABLE IF NOT EXISTS school_kcse_frequency (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  topic_name VARCHAR(300) NOT NULL,
  year INTEGER NOT NULL,
  appearance_count INTEGER DEFAULT 1,
  marks_allocated NUMERIC(5,2) DEFAULT 0,
  question_types TEXT[],
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, topic_name, year)
);

-- RLS
ALTER TABLE school_past_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_past_papers" ON school_past_papers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_paper_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_paper_versions" ON school_paper_versions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_student_practice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_student_practice" ON school_student_practice FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_kcse_frequency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_kcse_frequency" ON school_kcse_frequency FOR ALL USING (true) WITH CHECK (true);

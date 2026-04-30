-- APSIMS Ultra Academics Migration
CREATE TABLE IF NOT EXISTS school_lesson_plans (
  id SERIAL PRIMARY KEY,
  scheme_id INTEGER REFERENCES school_schemes_of_work(id),
  lesson_number INTEGER NOT NULL,
  lesson_title VARCHAR(300) NOT NULL,
  subject_id INTEGER REFERENCES school_subjects(id),
  form_id INTEGER REFERENCES school_forms(id),
  stream_id INTEGER REFERENCES school_streams(id),
  teacher_id INTEGER REFERENCES school_teachers(id),
  term_id INTEGER REFERENCES school_terms(id),
  lesson_date DATE,
  period_number INTEGER,
  duration_minutes INTEGER DEFAULT 40,
  learning_objectives TEXT[],
  key_inquiry_questions TEXT[],
  learning_activities TEXT[],
  learning_resources TEXT[],
  assessment_methods TEXT[],
  differentiation_strategies TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  approved_by VARCHAR(200),
  approved_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_syllabus_coverage (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  form_id INTEGER NOT NULL REFERENCES school_forms(id),
  term_id INTEGER NOT NULL REFERENCES school_terms(id),
  teacher_id INTEGER REFERENCES school_teachers(id),
  total_topics INTEGER DEFAULT 0,
  covered_topics INTEGER DEFAULT 0,
  coverage_percent NUMERIC(5,2) DEFAULT 0,
  weeks_elapsed INTEGER DEFAULT 0,
  weeks_remaining INTEGER DEFAULT 0,
  predicted_completion_date DATE,
  is_on_track BOOLEAN DEFAULT true,
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, form_id, term_id)
);

CREATE TABLE IF NOT EXISTS school_departments (
  id SERIAL PRIMARY KEY,
  department_name VARCHAR(200) NOT NULL,
  head_teacher_id INTEGER REFERENCES school_teachers(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_name, tenant_id)
);

CREATE TABLE IF NOT EXISTS school_room_bookings (
  id SERIAL PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  room_type VARCHAR(50) DEFAULT 'Classroom',
  capacity INTEGER DEFAULT 40,
  building VARCHAR(100),
  floor VARCHAR(20),
  facilities TEXT[],
  is_available BOOLEAN DEFAULT true,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_room_booking_schedule (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES school_room_bookings(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL,
  period_number INTEGER NOT NULL,
  subject_id INTEGER REFERENCES school_subjects(id),
  teacher_id INTEGER REFERENCES school_teachers(id),
  form_id INTEGER REFERENCES school_forms(id),
  stream_id INTEGER REFERENCES school_streams(id),
  purpose VARCHAR(200),
  is_recurring BOOLEAN DEFAULT true,
  booking_date DATE,
  status VARCHAR(20) DEFAULT 'Confirmed',
  booked_by VARCHAR(200),
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_content_bank (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  content_type VARCHAR(50) NOT NULL DEFAULT 'Note',
  subject_id INTEGER REFERENCES school_subjects(id),
  topic_id INTEGER REFERENCES school_topics(id),
  form_id INTEGER REFERENCES school_forms(id),
  content TEXT,
  file_url TEXT,
  file_type VARCHAR(20),
  is_digital BOOLEAN DEFAULT false,
  source VARCHAR(100) DEFAULT 'Teacher',
  is_approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(200),
  downloads INTEGER DEFAULT 0,
  uploaded_by VARCHAR(200),
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_knec_syllabus (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  form_id INTEGER NOT NULL REFERENCES school_forms(id),
  topic_name VARCHAR(300) NOT NULL,
  topic_code VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  estimated_lessons INTEGER DEFAULT 1,
  is_exam_area BOOLEAN DEFAULT false,
  weight_percent NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_hod_approvals (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(50) NOT NULL,
  reference_id INTEGER NOT NULL,
  requested_by VARCHAR(200) NOT NULL,
  department_id INTEGER REFERENCES school_departments(id),
  status VARCHAR(20) DEFAULT 'Pending',
  hod_comments TEXT,
  hod_id INTEGER REFERENCES school_teachers(id),
  acted_at TIMESTAMPTZ,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_moe_inspections (
  id SERIAL PRIMARY KEY,
  inspection_type VARCHAR(100) NOT NULL,
  inspection_date DATE NOT NULL,
  inspectors TEXT,
  findings TEXT,
  recommendations TEXT,
  rating VARCHAR(20),
  areas_checked TEXT[],
  follow_up_date DATE,
  status VARCHAR(20) DEFAULT 'Scheduled',
  report_url TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE school_lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_lesson_plans" ON school_lesson_plans FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_syllabus_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_syllabus_coverage" ON school_syllabus_coverage FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_departments" ON school_departments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_room_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_room_bookings" ON school_room_bookings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_room_booking_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_room_booking_schedule" ON school_room_booking_schedule FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_content_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_content_bank" ON school_content_bank FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_knec_syllabus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_knec_syllabus" ON school_knec_syllabus FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_hod_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_hod_approvals" ON school_hod_approvals FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE school_moe_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_moe_inspections" ON school_moe_inspections FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS school_digital_textbooks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200),
  publisher VARCHAR(200),
  edition VARCHAR(50),
  isbn VARCHAR(20),
  subject_id INTEGER REFERENCES school_subjects(id),
  form_id INTEGER REFERENCES school_forms(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(20) DEFAULT 'PDF',
  file_size_mb NUMERIC(8,2),
  cover_image_url TEXT,
  description TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(200),
  downloads INTEGER DEFAULT 0,
  uploaded_by VARCHAR(200) NOT NULL,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_digital_textbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_digital_textbooks" ON school_digital_textbooks FOR ALL USING (true) WITH CHECK (true);

-- Seed departments
INSERT INTO school_departments (department_name, description, is_active)
VALUES
  ('Languages', 'English, Kiswahili, Foreign Languages', true),
  ('Sciences', 'Physics, Chemistry, Biology', true),
  ('Mathematics', 'Pure & Applied Mathematics', true),
  ('Humanities', 'History, Geography, CRE/IRE/HRE', true),
  ('Technical', 'Agriculture, Computer Studies, Business', true),
  ('Co-curricular', 'Games, Clubs, Music, Drama', true)
ON CONFLICT (department_name, tenant_id) DO NOTHING;

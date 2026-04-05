-- ============================================================
-- APSIMS Schema Update — Run this in Supabase SQL Editor
-- Only creates NEW tables and columns (safe to re-run)
-- ============================================================

-- 1. Add missing columns to school_users
DO $$ BEGIN
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'teacher';
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
END $$;

-- 2. School Details
CREATE TABLE IF NOT EXISTS school_details (
  id SERIAL PRIMARY KEY,
  school_name VARCHAR(300) NOT NULL DEFAULT 'Alpha School',
  motto VARCHAR(300),
  registration_number VARCHAR(100),
  tsc_code VARCHAR(50),
  knec_code VARCHAR(50),
  sub_county_code VARCHAR(50),
  postal_address VARCHAR(200),
  physical_address VARCHAR(300),
  county VARCHAR(100),
  sub_county VARCHAR(100),
  phone1 VARCHAR(50),
  phone2 VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(200),
  principal_name VARCHAR(200),
  principal_phone VARCHAR(50),
  bank_name VARCHAR(200),
  bank_account_name VARCHAR(200),
  bank_account_number VARCHAR(100),
  bank_branch VARCHAR(200),
  mpesa_paybill VARCHAR(50),
  mpesa_account_name VARCHAR(200),
  logo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_details" ON school_details;
CREATE POLICY "Allow all for school_details" ON school_details FOR ALL USING (true) WITH CHECK (true);

INSERT INTO school_details (school_name, motto) VALUES ('Alpha School', 'Excellence in Education')
ON CONFLICT DO NOTHING;

-- 3. Daily Attendance
CREATE TABLE IF NOT EXISTS school_daily_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present',
  term_id INTEGER,
  recorded_by VARCHAR(100),
  notes VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

ALTER TABLE school_daily_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_daily_attendance" ON school_daily_attendance;
CREATE POLICY "Allow all for school_daily_attendance" ON school_daily_attendance FOR ALL USING (true) WITH CHECK (true);

-- 4. Terms
CREATE TABLE IF NOT EXISTS school_terms (
  id SERIAL PRIMARY KEY,
  term_name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed
DO $$ BEGIN
  ALTER TABLE school_terms ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
  ALTER TABLE school_terms ADD COLUMN IF NOT EXISTS start_date DATE;
  ALTER TABLE school_terms ADD COLUMN IF NOT EXISTS end_date DATE;
  ALTER TABLE school_terms ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE;
END $$;

ALTER TABLE school_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_terms" ON school_terms;
CREATE POLICY "Allow all for school_terms" ON school_terms FOR ALL USING (true) WITH CHECK (true);

INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 1', '2025', TRUE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 1');

INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 2', '2025', FALSE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 2');

INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 3', '2025', FALSE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 3');

-- 5. Fee Structures
CREATE TABLE IF NOT EXISTS school_fee_structures (
  id SERIAL PRIMARY KEY,
  term_id INTEGER REFERENCES school_terms(id),
  form_id INTEGER REFERENCES school_forms(id),
  fee_name VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_compulsory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_fee_structures" ON school_fee_structures;
CREATE POLICY "Allow all for school_fee_structures" ON school_fee_structures FOR ALL USING (true) WITH CHECK (true);

-- 6. Fee Payments
CREATE TABLE IF NOT EXISTS school_fee_payments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  receipt_number VARCHAR(100),
  term_id INTEGER REFERENCES school_terms(id),
  notes VARCHAR(300),
  recorded_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_fee_payments" ON school_fee_payments;
CREATE POLICY "Allow all for school_fee_payments" ON school_fee_payments FOR ALL USING (true) WITH CHECK (true);

-- 7. Exam Marks
CREATE TABLE IF NOT EXISTS school_exam_marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES school_terms(id),
  exam_type VARCHAR(50) NOT NULL DEFAULT 'CAT 1',
  score DECIMAL(5,2),
  grade VARCHAR(5),
  remarks VARCHAR(300),
  entered_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term_id, exam_type)
);

ALTER TABLE school_exam_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for school_exam_marks" ON school_exam_marks;
CREATE POLICY "Allow all for school_exam_marks" ON school_exam_marks FOR ALL USING (true) WITH CHECK (true);

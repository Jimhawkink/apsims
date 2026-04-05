-- ============================================================
-- ALPHA SCHOOL MANAGEMENT SYSTEM - FRESH DATABASE SCHEMA
-- Drop all old apsims_* tables and create new school_* tables
-- Run this on Supabase SQL Editor
-- ============================================================

-- ========== DROP OLD TABLES ==========
DROP TABLE IF EXISTS apsims_exam_results CASCADE;
DROP TABLE IF EXISTS apsims_exam_types CASCADE;
DROP TABLE IF EXISTS apsims_fee_payments CASCADE;
DROP TABLE IF EXISTS apsims_fee_structures CASCADE;
DROP TABLE IF EXISTS apsims_grading_system CASCADE;
DROP TABLE IF EXISTS apsims_income CASCADE;
DROP TABLE IF EXISTS apsims_pocket_money_accounts CASCADE;
DROP TABLE IF EXISTS apsims_remedial_classes CASCADE;
DROP TABLE IF EXISTS apsims_staff CASCADE;
DROP TABLE IF EXISTS apsims_students CASCADE;
DROP TABLE IF EXISTS apsims_subordinate_staff CASCADE;
DROP TABLE IF EXISTS apsims_timetable_slots CASCADE;
DROP TABLE IF EXISTS apsims_users CASCADE;

-- ========== FRESH SCHOOL TABLES ==========

-- 1. Users (system login)
CREATE TABLE IF NOT EXISTS school_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  role VARCHAR(50) NOT NULL DEFAULT 'teacher', -- admin, principal, teacher, accountant
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Forms (Form 1, Form 2, Form 3, Form 4)
CREATE TABLE IF NOT EXISTS school_forms (
  id SERIAL PRIMARY KEY,
  form_name VARCHAR(50) NOT NULL UNIQUE, -- 'Form 1', 'Form 2', etc.
  form_level INTEGER NOT NULL, -- 1, 2, 3, 4
  description VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Streams (East, West, North, South, etc.)
CREATE TABLE IF NOT EXISTS school_streams (
  id SERIAL PRIMARY KEY,
  stream_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Academic Terms
CREATE TABLE IF NOT EXISTS school_terms (
  id SERIAL PRIMARY KEY,
  term_name VARCHAR(50) NOT NULL, -- 'Term 1', 'Term 2', 'Term 3'
  term_number INTEGER NOT NULL, -- 1, 2, 3
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term_number, year)
);

-- 5. Subjects
CREATE TABLE IF NOT EXISTS school_subjects (
  id SERIAL PRIMARY KEY,
  subject_name VARCHAR(100) NOT NULL UNIQUE,
  subject_code VARCHAR(20),
  category VARCHAR(50) DEFAULT 'Core', -- Core, Elective, Technical
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Students
CREATE TABLE IF NOT EXISTS school_students (
  id SERIAL PRIMARY KEY,
  admission_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_name VARCHAR(100),
  gender VARCHAR(10) NOT NULL DEFAULT 'Male',
  date_of_birth DATE,
  form_id INTEGER REFERENCES school_forms(id),
  stream_id INTEGER REFERENCES school_streams(id),
  kcpe_marks INTEGER,
  kcpe_year INTEGER,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive, Transferred, Graduated, Suspended
  guardian_name VARCHAR(200),
  guardian_phone VARCHAR(50),
  guardian_email VARCHAR(200),
  guardian_relationship VARCHAR(50),
  county VARCHAR(100),
  sub_county VARCHAR(100),
  admission_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  medical_info TEXT,
  special_needs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TSC Teachers
CREATE TABLE IF NOT EXISTS school_teachers (
  id SERIAL PRIMARY KEY,
  staff_no VARCHAR(50) UNIQUE,
  tsc_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  gender VARCHAR(10) DEFAULT 'Male',
  id_number VARCHAR(50),
  qualification VARCHAR(100),
  subjects TEXT[], -- Array of subjects they teach
  departments TEXT[],
  date_of_employment DATE,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Support Teachers (non-TSC / contract teachers)
CREATE TABLE IF NOT EXISTS school_support_teachers (
  id SERIAL PRIMARY KEY,
  staff_no VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  gender VARCHAR(10) DEFAULT 'Male',
  id_number VARCHAR(50),
  qualification VARCHAR(100),
  subjects TEXT[],
  contract_type VARCHAR(50) DEFAULT 'Contract', -- Contract, Part-time
  date_hired DATE,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Subordinate Staff (non-teaching)
CREATE TABLE IF NOT EXISTS school_subordinate_staff (
  id SERIAL PRIMARY KEY,
  staff_no VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  gender VARCHAR(10) DEFAULT 'Male',
  id_number VARCHAR(50) UNIQUE,
  role VARCHAR(100) NOT NULL, -- Cook, Driver, Guard, Cleaner, etc.
  department VARCHAR(100),
  date_hired DATE,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Fee Structures
CREATE TABLE IF NOT EXISTS school_fee_structures (
  id SERIAL PRIMARY KEY,
  form_id INTEGER REFERENCES school_forms(id),
  term_id INTEGER REFERENCES school_terms(id),
  category VARCHAR(100) NOT NULL DEFAULT 'Tuition', -- Tuition, Boarding, Activity, Lab, etc.
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description VARCHAR(200),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Fee Payments
CREATE TABLE IF NOT EXISTS school_fee_payments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash', -- Cash, M-Pesa, Bank Transfer, Cheque
  reference_number VARCHAR(100),
  mpesa_code VARCHAR(50),
  bank_name VARCHAR(100),
  term_id INTEGER REFERENCES school_terms(id),
  year INTEGER NOT NULL,
  receipt_number VARCHAR(50),
  received_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Grading System
CREATE TABLE IF NOT EXISTS school_grading_system (
  id SERIAL PRIMARY KEY,
  grade VARCHAR(5) NOT NULL, -- A, A-, B+, B, B-, C+, C, C-, D+, D, D-, E
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  points INTEGER NOT NULL, -- 12, 11, 10, 9, ...
  remarks VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Exam Types
CREATE TABLE IF NOT EXISTS school_exam_types (
  id SERIAL PRIMARY KEY,
  exam_name VARCHAR(100) NOT NULL,
  exam_code VARCHAR(20),
  weight NUMERIC(5,2) DEFAULT 0, -- Weight in final grade calculation
  term_id INTEGER REFERENCES school_terms(id),
  year INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Exam Results
CREATE TABLE IF NOT EXISTS school_exam_results (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id),
  exam_type_id INTEGER NOT NULL REFERENCES school_exam_types(id),
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id),
  score NUMERIC(5,2) NOT NULL,
  grade VARCHAR(5),
  points INTEGER,
  remarks VARCHAR(200),
  entered_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Attendance
CREATE TABLE IF NOT EXISTS school_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id),
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present', -- Present, Absent, Late, Excused
  term_id INTEGER REFERENCES school_terms(id),
  recorded_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

-- 16. Expense Categories
CREATE TABLE IF NOT EXISTS school_expense_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(200),
  icon VARCHAR(10) DEFAULT '💰',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. School Expenses
CREATE TABLE IF NOT EXISTS school_expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id INTEGER REFERENCES school_expense_categories(id),
  description VARCHAR(300) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  reference_number VARCHAR(100),
  approved_by VARCHAR(100),
  recorded_by VARCHAR(100),
  term_id INTEGER REFERENCES school_terms(id),
  year INTEGER,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. School Income (non-fee)
CREATE TABLE IF NOT EXISTS school_income (
  id SERIAL PRIMARY KEY,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(200) NOT NULL, -- Government Grant, Donation, Fundraiser, Rental, etc.
  description VARCHAR(300),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  reference_number VARCHAR(100),
  recorded_by VARCHAR(100),
  term_id INTEGER REFERENCES school_terms(id),
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. School Assets
CREATE TABLE IF NOT EXISTS school_assets (
  id SERIAL PRIMARY KEY,
  asset_name VARCHAR(200) NOT NULL,
  asset_code VARCHAR(50) UNIQUE,
  category VARCHAR(100), -- Furniture, Electronics, Vehicles, Buildings, etc.
  location VARCHAR(200),
  purchase_date DATE,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  condition VARCHAR(50) DEFAULT 'Good', -- New, Good, Fair, Poor, Damaged
  quantity INTEGER DEFAULT 1,
  supplier VARCHAR(200),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Disposed, Under Repair
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Payroll
CREATE TABLE IF NOT EXISTS school_payroll (
  id SERIAL PRIMARY KEY,
  staff_type VARCHAR(50) NOT NULL, -- 'teacher', 'support_teacher', 'subordinate'
  staff_id INTEGER NOT NULL,
  staff_name VARCHAR(200) NOT NULL,
  pay_period VARCHAR(20) NOT NULL, -- 'January 2026', etc.
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  house_allowance NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances NUMERIC(12,2) DEFAULT 0,
  gross_pay NUMERIC(12,2) DEFAULT 0,
  paye NUMERIC(12,2) DEFAULT 0,
  nhif NUMERIC(12,2) DEFAULT 0,
  nssf NUMERIC(12,2) DEFAULT 0,
  loan_deduction NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Paid
  approved_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_type, staff_id, month, year)
);

-- ========== SEED DEFAULT DATA ==========

-- Default Forms
INSERT INTO school_forms (form_name, form_level, description) VALUES
  ('Form 1', 1, 'First year of secondary school'),
  ('Form 2', 2, 'Second year of secondary school'),
  ('Form 3', 3, 'Third year of secondary school'),
  ('Form 4', 4, 'Final year of secondary school')
ON CONFLICT (form_name) DO NOTHING;

-- Default Streams
INSERT INTO school_streams (stream_name, description) VALUES
  ('East', 'East Stream'),
  ('West', 'West Stream'),
  ('North', 'North Stream'),
  ('South', 'South Stream')
ON CONFLICT (stream_name) DO NOTHING;

-- Default Subjects (Kenyan 8-4-4 / CBC subjects)
INSERT INTO school_subjects (subject_name, subject_code, category) VALUES
  ('Mathematics', 'MATH', 'Core'),
  ('English', 'ENG', 'Core'),
  ('Kiswahili', 'KIS', 'Core'),
  ('Biology', 'BIO', 'Core'),
  ('Chemistry', 'CHEM', 'Core'),
  ('Physics', 'PHY', 'Core'),
  ('History', 'HIST', 'Elective'),
  ('Geography', 'GEO', 'Elective'),
  ('CRE', 'CRE', 'Elective'),
  ('IRE', 'IRE', 'Elective'),
  ('Business Studies', 'BUS', 'Elective'),
  ('Agriculture', 'AGR', 'Elective'),
  ('Computer Studies', 'COMP', 'Elective'),
  ('Home Science', 'HOME', 'Elective'),
  ('Art & Design', 'ART', 'Elective'),
  ('French', 'FRE', 'Elective'),
  ('German', 'GER', 'Elective'),
  ('Music', 'MUS', 'Elective')
ON CONFLICT (subject_name) DO NOTHING;

-- Kenyan Grading System (KCSE)
INSERT INTO school_grading_system (grade, min_score, max_score, points, remarks) VALUES
  ('A', 80, 100, 12, 'Excellent'),
  ('A-', 75, 79, 11, 'Very Good'),
  ('B+', 70, 74, 10, 'Good'),
  ('B', 65, 69, 9, 'Good'),
  ('B-', 60, 64, 8, 'Fairly Good'),
  ('C+', 55, 59, 7, 'Average'),
  ('C', 50, 54, 6, 'Average'),
  ('C-', 45, 49, 5, 'Below Average'),
  ('D+', 40, 44, 4, 'Below Average'),
  ('D', 35, 39, 3, 'Poor'),
  ('D-', 30, 34, 2, 'Very Poor'),
  ('E', 0, 29, 1, 'Very Poor');

-- Default Expense Categories
INSERT INTO school_expense_categories (category_name, description, icon) VALUES
  ('Salaries', 'Staff salary payments', '💰'),
  ('Utilities', 'Water, electricity, internet', '💡'),
  ('Maintenance', 'Building and equipment repairs', '🔧'),
  ('Supplies', 'Office and teaching supplies', '📦'),
  ('Transport', 'Vehicle fuel and maintenance', '🚌'),
  ('Food', 'Kitchen and feeding program', '🍽️'),
  ('Examinations', 'Exam printing and materials', '📝'),
  ('Co-curricular', 'Sports, clubs, trips', '⚽'),
  ('Medical', 'Student and staff medical', '🏥'),
  ('Miscellaneous', 'Other expenses', '📋')
ON CONFLICT (category_name) DO NOTHING;

-- Default Current Term
INSERT INTO school_terms (term_name, term_number, year, start_date, end_date, is_current) VALUES
  ('Term 1', 1, 2026, '2026-01-06', '2026-04-04', true),
  ('Term 2', 2, 2026, '2026-05-05', '2026-08-01', false),
  ('Term 3', 3, 2026, '2026-09-01', '2026-11-27', false)
ON CONFLICT (term_number, year) DO NOTHING;

-- Default Admin User (password: admin123)
INSERT INTO school_users (username, password_hash, full_name, email, role) VALUES
  ('admin', '$2a$10$rQnM1v8K6h6HJ1YGqKJHxOkz8K5q9g1LFj7KKz5z5z5z5z5z5z5z5', 'System Administrator', 'admin@alphaschool.co.ke', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ========== DISABLE RLS FOR DEVELOPMENT ==========
ALTER TABLE school_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_users" ON school_users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_forms" ON school_forms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_streams" ON school_streams FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_terms" ON school_terms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_subjects" ON school_subjects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_students" ON school_students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_teachers" ON school_teachers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_support_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_support_teachers" ON school_support_teachers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_subordinate_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_subordinate_staff" ON school_subordinate_staff FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_structures" ON school_fee_structures FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_payments" ON school_fee_payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_grading_system ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_grading_system" ON school_grading_system FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_exam_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_exam_types" ON school_exam_types FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_exam_results" ON school_exam_results FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_attendance" ON school_attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_expense_categories" ON school_expense_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_expenses" ON school_expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_income" ON school_income FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_assets" ON school_assets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_payroll" ON school_payroll FOR ALL USING (true) WITH CHECK (true);

-- ========================================================================
-- ADDITIONAL COLUMNS & TABLES (for enhanced Students, Staff, Settings)
-- ========================================================================

-- Add missing columns to school_students
DO $$ BEGIN
  -- Student extra fields
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Kenyan';
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS village VARCHAR(200);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS guardian_id_no VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS guardian_occupation VARCHAR(100);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS previous_school VARCHAR(200);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS birth_cert_no VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS nemis_no VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS notes TEXT;
END $$;

-- Sync admission_no from admission_number where needed
UPDATE school_students SET admission_no = admission_number WHERE admission_no IS NULL AND admission_number IS NOT NULL;
UPDATE school_students SET middle_name = other_name WHERE middle_name IS NULL AND other_name IS NOT NULL;

-- Add missing columns to school_teachers
DO $$ BEGIN
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS staff_type VARCHAR(50) DEFAULT 'Teaching';
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Kenyan';
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS county VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS specialization VARCHAR(200);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS employment_date DATE;
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(50);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS nhif_no VARCHAR(50);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS nssf_no VARCHAR(50);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS notes TEXT;
END $$;

-- 21. Classes (Form + Stream + Class Teacher)
CREATE TABLE IF NOT EXISTS school_classes (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
  stream_id INTEGER NOT NULL REFERENCES school_streams(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES school_teachers(id) ON DELETE SET NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, stream_id, year)
);

ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_classes" ON school_classes FOR ALL USING (true) WITH CHECK (true);

-- 22. Subject-Teacher Linking
CREATE TABLE IF NOT EXISTS school_subject_teachers (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES school_teachers(id) ON DELETE CASCADE,
  form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, teacher_id, form_id)
);

ALTER TABLE school_subject_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_subject_teachers" ON school_subject_teachers FOR ALL USING (true) WITH CHECK (true);

-- 23. School Details (single-row config)
CREATE TABLE IF NOT EXISTS school_details (
  id SERIAL PRIMARY KEY,
  school_name VARCHAR(300) NOT NULL DEFAULT 'Alpha School',
  motto VARCHAR(300),
  postal_address VARCHAR(200),
  physical_address VARCHAR(300),
  county VARCHAR(100),
  sub_county VARCHAR(100),
  phone1 VARCHAR(50),
  phone2 VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(200),
  logo_url TEXT,
  bank_name VARCHAR(200),
  bank_account_name VARCHAR(200),
  bank_account_number VARCHAR(100),
  bank_branch VARCHAR(100),
  mpesa_paybill VARCHAR(50),
  mpesa_account_name VARCHAR(100),
  registration_number VARCHAR(100),
  tsc_code VARCHAR(50),
  knec_code VARCHAR(50),
  sub_county_code VARCHAR(50),
  principal_name VARCHAR(200),
  principal_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_details" ON school_details FOR ALL USING (true) WITH CHECK (true);

-- Insert default school details
INSERT INTO school_details (school_name, motto) VALUES ('Alpha School', 'Excellence in Education')
ON CONFLICT DO NOTHING;

-- Add enhanced columns to school_users
DO $$ BEGIN
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'teacher';
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
  ALTER TABLE school_users ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
END $$;

-- 24. Daily Attendance Register
CREATE TABLE IF NOT EXISTS school_daily_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present', -- Present, Absent, Late, Excused
  term_id INTEGER REFERENCES school_terms(id),
  recorded_by VARCHAR(100),
  notes VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

ALTER TABLE school_daily_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_daily_attendance" ON school_daily_attendance FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- 25. Terms
-- ================================================================
CREATE TABLE IF NOT EXISTS school_terms (
  id SERIAL PRIMARY KEY,
  term_name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_terms" ON school_terms FOR ALL USING (true) WITH CHECK (true);

-- Seed default terms
INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 1', '2025', TRUE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 1' AND academic_year = '2025');

INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 2', '2025', FALSE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 2' AND academic_year = '2025');

INSERT INTO school_terms (term_name, academic_year, is_current)
SELECT 'Term 3', '2025', FALSE
WHERE NOT EXISTS (SELECT 1 FROM school_terms WHERE term_name = 'Term 3' AND academic_year = '2025');

-- ================================================================
-- 26. Fee Structures (fee items per term / form)
-- ================================================================
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
CREATE POLICY "Allow all for school_fee_structures" ON school_fee_structures FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- 27. Fee Payments
-- ================================================================
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
CREATE POLICY "Allow all for school_fee_payments" ON school_fee_payments FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- 28. Exam Marks (broadsheet per subject/term/exam type)
-- ================================================================
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
CREATE POLICY "Allow all for school_exam_marks" ON school_exam_marks FOR ALL USING (true) WITH CHECK (true);

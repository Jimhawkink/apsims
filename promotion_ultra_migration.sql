-- ============================================================
-- APSIMS ULTRA PROMOTION MODULE - DATABASE MIGRATION
-- Run this on Supabase SQL Editor
-- ============================================================

-- 1. Academic Years
CREATE TABLE IF NOT EXISTS school_academic_years (
  id SERIAL PRIMARY KEY,
  year_name VARCHAR(50) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'Active',
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_name, tenant_id)
);

-- 2. Promotion Rules Engine
CREATE TABLE IF NOT EXISTS school_promotion_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(200) NOT NULL,
  from_form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
  to_form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
  min_average_score NUMERIC(5,2) DEFAULT 0,
  max_subject_failures INTEGER DEFAULT 0,
  failure_threshold NUMERIC(5,2) DEFAULT 30,
  attendance_min_percent NUMERIC(5,2) DEFAULT 0,
  discipline_max_violations INTEGER DEFAULT 999,
  auto_promote BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  description TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_form_id, to_form_id, tenant_id)
);

-- 3. Promotion History (for rollback)
CREATE TABLE IF NOT EXISTS school_promotion_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  from_form_id INTEGER NOT NULL REFERENCES school_forms(id),
  to_form_id INTEGER NOT NULL REFERENCES school_forms(id),
  from_stream_id INTEGER REFERENCES school_streams(id),
  to_stream_id INTEGER REFERENCES school_streams(id),
  action_type VARCHAR(30) NOT NULL DEFAULT 'Promotion',
  academic_year_id INTEGER REFERENCES school_academic_years(id),
  term_id INTEGER REFERENCES school_terms(id),
  average_score NUMERIC(5,2),
  eligibility_status VARCHAR(30) DEFAULT 'Eligible',
  rule_id INTEGER REFERENCES school_promotion_rules(id),
  approved_by VARCHAR(200),
  approval_status VARCHAR(20) DEFAULT 'Auto',
  approval_notes TEXT,
  sms_sent BOOLEAN DEFAULT false,
  sms_phone VARCHAR(50),
  clearance_complete BOOLEAN DEFAULT false,
  notes TEXT,
  reversed_at TIMESTAMPTZ,
  reversed_by VARCHAR(200),
  reversal_reason TEXT,
  reversal_of_id INTEGER REFERENCES school_promotion_history(id),
  performed_by VARCHAR(200),
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Promotion Approvals
CREATE TABLE IF NOT EXISTS school_promotion_approvals (
  id SERIAL PRIMARY KEY,
  promotion_history_id INTEGER NOT NULL REFERENCES school_promotion_history(id) ON DELETE CASCADE,
  approver_type VARCHAR(50) NOT NULL,
  approver_name VARCHAR(200),
  approver_user_id INTEGER REFERENCES school_users(id),
  status VARCHAR(20) DEFAULT 'Pending',
  comments TEXT,
  acted_at TIMESTAMPTZ,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clearance Forms
CREATE TABLE IF NOT EXISTS school_clearance_forms (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES school_academic_years(id),
  clearance_type VARCHAR(30) NOT NULL DEFAULT 'Promotion',
  library_cleared BOOLEAN DEFAULT false,
  library_cleared_by VARCHAR(200),
  library_cleared_at TIMESTAMPTZ,
  lab_cleared BOOLEAN DEFAULT false,
  lab_cleared_by VARCHAR(200),
  lab_cleared_at TIMESTAMPTZ,
  store_cleared BOOLEAN DEFAULT false,
  store_cleared_by VARCHAR(200),
  store_cleared_at TIMESTAMPTZ,
  fees_cleared BOOLEAN DEFAULT false,
  fees_cleared_by VARCHAR(200),
  fees_cleared_at TIMESTAMPTZ,
  hostel_cleared BOOLEAN DEFAULT false,
  hostel_cleared_by VARCHAR(200),
  hostel_cleared_at TIMESTAMPTZ,
  sports_cleared BOOLEAN DEFAULT false,
  sports_cleared_by VARCHAR(200),
  sports_cleared_at TIMESTAMPTZ,
  discipline_cleared BOOLEAN DEFAULT false,
  discipline_cleared_by VARCHAR(200),
  discipline_cleared_at TIMESTAMPTZ,
  principal_cleared BOOLEAN DEFAULT false,
  principal_cleared_by VARCHAR(200),
  principal_cleared_at TIMESTAMPTZ,
  all_cleared BOOLEAN DEFAULT false,
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year_id, clearance_type)
);

-- 6. Alumni Registry
CREATE TABLE IF NOT EXISTS school_alumni (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  graduation_year INTEGER NOT NULL,
  final_form_id INTEGER REFERENCES school_forms(id),
  final_stream_id INTEGER REFERENCES school_streams(id),
  final_average_score NUMERIC(5,2),
  final_grade VARCHAR(5),
  graduation_date DATE,
  alumni_status VARCHAR(30) DEFAULT 'Active',
  current_occupation VARCHAR(200),
  current_employer VARCHAR(200),
  current_phone VARCHAR(50),
  current_email VARCHAR(200),
  current_address TEXT,
  university VARCHAR(200),
  course VARCHAR(200),
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- 7. Promotion Letters
CREATE TABLE IF NOT EXISTS school_promotion_letters (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  promotion_history_id INTEGER REFERENCES school_promotion_history(id),
  letter_type VARCHAR(30) NOT NULL DEFAULT 'Promotion',
  academic_year_id INTEGER REFERENCES school_academic_years(id),
  content TEXT,
  pdf_url TEXT,
  generated_by VARCHAR(200),
  sent_to_parent BOOLEAN DEFAULT false,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== RLS POLICIES ==========
ALTER TABLE school_academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_academic_years" ON school_academic_years FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_promotion_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_promotion_rules" ON school_promotion_rules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_promotion_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_promotion_history" ON school_promotion_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_promotion_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_promotion_approvals" ON school_promotion_approvals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_clearance_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_clearance_forms" ON school_clearance_forms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_alumni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_alumni" ON school_alumni FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_promotion_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_promotion_letters" ON school_promotion_letters FOR ALL USING (true) WITH CHECK (true);

-- ========== SEED DEFAULT ACADEMIC YEAR ==========
INSERT INTO school_academic_years (year_name, start_date, end_date, is_current, status)
VALUES ('2025', '2025-01-06', '2025-12-12', true, 'Active')
ON CONFLICT (year_name, tenant_id) DO NOTHING;

-- ========== SEED DEFAULT PROMOTION RULES ==========
INSERT INTO school_promotion_rules (rule_name, from_form_id, to_form_id, min_average_score, max_subject_failures, failure_threshold, auto_promote, require_approval, priority, description)
SELECT 'Form 1 to Form 2', f1.id, f2.id, 30, 3, 30, true, false, 10, 'Default: Students with avg >= 30 and max 3 failures auto-promote'
FROM school_forms f1, school_forms f2
WHERE f1.form_level = 1 AND f2.form_level = 2
ON CONFLICT (from_form_id, to_form_id, tenant_id) DO NOTHING;

INSERT INTO school_promotion_rules (rule_name, from_form_id, to_form_id, min_average_score, max_subject_failures, failure_threshold, auto_promote, require_approval, priority, description)
SELECT 'Form 2 to Form 3', f1.id, f2.id, 30, 3, 30, true, false, 10, 'Default: Students with avg >= 30 and max 3 failures auto-promote'
FROM school_forms f1, school_forms f2
WHERE f1.form_level = 2 AND f2.form_level = 3
ON CONFLICT (from_form_id, to_form_id, tenant_id) DO NOTHING;

INSERT INTO school_promotion_rules (rule_name, from_form_id, to_form_id, min_average_score, max_subject_failures, failure_threshold, auto_promote, require_approval, priority, description)
SELECT 'Form 3 to Form 4', f1.id, f2.id, 35, 2, 30, false, true, 10, 'Requires approval: Students with avg >= 35 and max 2 failures'
FROM school_forms f1, school_forms f2
WHERE f1.form_level = 3 AND f2.form_level = 4
ON CONFLICT (from_form_id, to_form_id, tenant_id) DO NOTHING;

-- ========== ADD COLUMNS TO school_students ==========
DO $$ BEGIN
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS alumni_id INTEGER;
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS promotion_eligible VARCHAR(30) DEFAULT 'Pending';
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS clearance_status VARCHAR(30) DEFAULT 'Pending';
END $$;

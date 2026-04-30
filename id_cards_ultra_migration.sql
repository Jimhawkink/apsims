-- ============================================================
-- APSIMS ULTRA ID CARDS MODULE - DATABASE MIGRATION
-- Run this on Supabase SQL Editor
-- ============================================================

-- 1. ID Card Templates
CREATE TABLE IF NOT EXISTS school_id_card_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  template_code VARCHAR(50) NOT NULL UNIQUE,
  card_type VARCHAR(30) NOT NULL DEFAULT 'Student', -- Student, Staff, Visitor, BusPass
  orientation VARCHAR(10) DEFAULT 'landscape', -- landscape, portrait
  front_design JSONB DEFAULT '{}', -- colors, header_bg, text_color, logo_position, etc.
  back_design JSONB DEFAULT '{}',
  form_id INTEGER REFERENCES school_forms(id), -- null = all forms
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ID Card Records (issued cards)
CREATE TABLE IF NOT EXISTS school_id_cards (
  id SERIAL PRIMARY KEY,
  card_number VARCHAR(50) NOT NULL UNIQUE,
  card_type VARCHAR(30) NOT NULL DEFAULT 'Student', -- Student, Staff, Visitor, BusPass
  person_id INTEGER NOT NULL, -- student_id or teacher_id
  person_name VARCHAR(200) NOT NULL,
  person_type VARCHAR(20) NOT NULL DEFAULT 'Student', -- Student, Staff
  template_id INTEGER REFERENCES school_id_card_templates(id),
  form_id INTEGER REFERENCES school_forms(id),
  stream_id INTEGER REFERENCES school_streams(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Lost, Expired, Replaced
  qr_code TEXT,
  barcode TEXT,
  photo_url TEXT,
  replacement_count INTEGER DEFAULT 0,
  replacement_fee NUMERIC(10,2) DEFAULT 0,
  lost_date DATE,
  lost_reported_by VARCHAR(200),
  digital_sent BOOLEAN DEFAULT false,
  digital_sent_at TIMESTAMPTZ,
  digital_sent_phone VARCHAR(50),
  printed_at TIMESTAMPTZ,
  printed_by VARCHAR(200),
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lost Card Tracking
CREATE TABLE IF NOT EXISTS school_id_card_losses (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES school_id_cards(id) ON DELETE CASCADE,
  reported_date DATE DEFAULT CURRENT_DATE,
  reported_by VARCHAR(200),
  loss_description TEXT,
  replacement_issued BOOLEAN DEFAULT false,
  replacement_card_id INTEGER REFERENCES school_id_cards(id),
  replacement_fee NUMERIC(10,2) DEFAULT 0,
  fee_paid BOOLEAN DEFAULT false,
  fee_payment_ref VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Reported', -- Reported, Replacement Issued, Closed
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Visitor Cards
CREATE TABLE IF NOT EXISTS school_visitor_cards (
  id SERIAL PRIMARY KEY,
  visitor_name VARCHAR(200) NOT NULL,
  visitor_phone VARCHAR(50),
  visitor_id_number VARCHAR(50),
  visitor_purpose VARCHAR(300),
  host_person VARCHAR(200),
  card_number VARCHAR(50),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'Checked In', -- Checked In, Checked Out
  notes TEXT,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bus Pass Cards
CREATE TABLE IF NOT EXISTS school_bus_pass_cards (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  route_name VARCHAR(200),
  driver_name VARCHAR(200),
  driver_phone VARCHAR(50),
  pickup_point VARCHAR(200),
  dropoff_point VARCHAR(200),
  card_number VARCHAR(50),
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Expired, Cancelled
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- ========== RLS POLICIES ==========
ALTER TABLE school_id_card_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_id_card_templates" ON school_id_card_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_id_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_id_cards" ON school_id_cards FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_id_card_losses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_id_card_losses" ON school_id_card_losses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_visitor_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_visitor_cards" ON school_visitor_cards FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_bus_pass_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_bus_pass_cards" ON school_bus_pass_cards FOR ALL USING (true) WITH CHECK (true);

-- ========== SEED DEFAULT TEMPLATES ==========
INSERT INTO school_id_card_templates (template_name, template_code, card_type, orientation, front_design, is_default, is_active)
VALUES
  ('Blue Classic Student', 'STUDENT_BLUE', 'Student', 'landscape', '{"header_bg":"linear-gradient(135deg, #1e40af, #3b82f6)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#3b82f6","photo_border":"#3b82f6"}', true, true),
  ('Green Classic Student', 'STUDENT_GREEN', 'Student', 'landscape', '{"header_bg":"linear-gradient(135deg, #065f46, #10b981)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#10b981","photo_border":"#10b981"}', false, true),
  ('Purple Modern Student', 'STUDENT_PURPLE', 'Student', 'landscape', '{"header_bg":"linear-gradient(135deg, #5b21b6, #8b5cf6)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#8b5cf6","photo_border":"#8b5cf6"}', false, true),
  ('Red Classic Staff', 'STAFF_RED', 'Staff', 'landscape', '{"header_bg":"linear-gradient(135deg, #991b1b, #ef4444)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#ef4444","photo_border":"#ef4444"}', true, true),
  ('Visitor Pass', 'VISITOR', 'Visitor', 'portrait', '{"header_bg":"linear-gradient(135deg, #92400e, #f59e0b)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#f59e0b","photo_border":"#f59e0b"}', true, true),
  ('Bus Pass', 'BUSPASS', 'BusPass', 'portrait', '{"header_bg":"linear-gradient(135deg, #155e75, #06b6d4)","header_text":"#ffffff","body_bg":"#ffffff","accent":"#06b6d4","photo_border":"#06b6d4"}', true, true)
ON CONFLICT (template_code) DO NOTHING;

-- ========== ADD COLUMNS TO school_students ==========
DO $$ BEGIN
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS card_issued_date DATE;
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS card_expiry_date DATE;
  ALTER TABLE school_students ADD COLUMN IF NOT EXISTS card_status VARCHAR(20) DEFAULT 'Not Issued';
END $$;

-- ========== ADD COLUMNS TO school_teachers ==========
DO $$ BEGIN
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS card_issued_date DATE;
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS card_expiry_date DATE;
  ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS card_status VARCHAR(20) DEFAULT 'Not Issued';
END $$;

-- ============================================================
-- JIBUERP MODULE MIGRATION
-- New tables for: Staff Attendance, Library, Communication Logs
-- Run this on Supabase SQL Editor
-- ============================================================

-- 1. Staff Attendance Register
CREATE TABLE IF NOT EXISTS school_staff_attendance (
  id SERIAL PRIMARY KEY,
  staff_type VARCHAR(50) NOT NULL, -- 'teacher', 'support', 'subordinate'
  staff_id INTEGER NOT NULL,
  staff_name VARCHAR(200) NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'Present', -- Present, Absent, Late, On Leave, Half Day
  time_in TIME,
  time_out TIME,
  recorded_by VARCHAR(100),
  notes VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_type, staff_id, attendance_date)
);

ALTER TABLE school_staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_staff_attendance" ON school_staff_attendance FOR ALL USING (true) WITH CHECK (true);

-- 2. Message Logs (SMS / Notification history)
CREATE TABLE IF NOT EXISTS school_message_logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  recipients VARCHAR(300),
  recipient_count INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Queued', -- Queued, Sent, Failed, Delivered
  sent_by VARCHAR(100),
  sent_at TIMESTAMPTZ,
  message_type VARCHAR(30) DEFAULT 'sms', -- sms, notification, email
  cost NUMERIC(10,2) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_message_logs" ON school_message_logs FOR ALL USING (true) WITH CHECK (true);

-- 3. Library Books Catalog
CREATE TABLE IF NOT EXISTS school_library_books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200),
  isbn VARCHAR(50),
  category VARCHAR(100) DEFAULT 'Textbook', -- Textbook, Reference, Fiction, etc.
  publisher VARCHAR(200),
  year_published INTEGER,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  shelf_location VARCHAR(50),
  condition VARCHAR(30) DEFAULT 'Good', -- New, Good, Fair, Poor, Damaged
  status VARCHAR(30) DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_library_books" ON school_library_books FOR ALL USING (true) WITH CHECK (true);

-- 4. Library Checkouts (book lending ledger)
CREATE TABLE IF NOT EXISTS school_library_checkouts (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES school_library_books(id) ON DELETE CASCADE,
  book_title VARCHAR(300),
  borrower_name VARCHAR(200) NOT NULL,
  borrower_type VARCHAR(50) DEFAULT 'Student', -- Student, Teacher, Staff
  borrower_id VARCHAR(50),
  checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status VARCHAR(30) DEFAULT 'Checked Out', -- Checked Out, Returned, Lost, Damaged
  fine_amount NUMERIC(10,2) DEFAULT 0,
  notes VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_library_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_library_checkouts" ON school_library_checkouts FOR ALL USING (true) WITH CHECK (true);

-- 5. Add curriculum_type column to grading system (if not exists)
DO $$ BEGIN
  ALTER TABLE school_grading_system ADD COLUMN IF NOT EXISTS curriculum_type VARCHAR(20) DEFAULT '8-4-4';
END $$;

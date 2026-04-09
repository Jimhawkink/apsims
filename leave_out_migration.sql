-- Leave Out Management Table for APSIMS
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.school_leave_outs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.school_students(id),
  reason TEXT NOT NULL DEFAULT 'Other',
  reason_details TEXT,
  class_teacher_id INTEGER REFERENCES public.school_teachers(id),
  teacher_name TEXT,
  time_left TIMESTAMPTZ DEFAULT NOW(),
  time_returned TIMESTAMPTZ,
  status TEXT DEFAULT 'Out',
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_phone TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_leave_outs_student ON school_leave_outs(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_outs_date ON school_leave_outs(created_at);
CREATE INDEX IF NOT EXISTS idx_leave_outs_status ON school_leave_outs(status);

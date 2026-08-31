-- ══════════════════════════════════════════════════════════════════
-- ZKTeco Biometric Tables Migration
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. Biometric raw logs (every scan from ZKTeco device)
CREATE TABLE IF NOT EXISTS school_biometric_logs (
  id              BIGSERIAL PRIMARY KEY,
  device_sn       TEXT,
  pin             TEXT NOT NULL,
  punch_time      TIMESTAMPTZ NOT NULL,
  status          INTEGER DEFAULT 0,
  verify_type     INTEGER DEFAULT 0,
  verify_label    TEXT,
  punch_direction TEXT DEFAULT 'IN',
  matched_type    TEXT,
  matched_id      INTEGER,
  matched_name    TEXT,
  processed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Biometric registrations (PIN → person mapping)
CREATE TABLE IF NOT EXISTS school_biometric_registrations (
  id              BIGSERIAL PRIMARY KEY,
  person_type     TEXT NOT NULL,
  person_id       INTEGER NOT NULL,
  person_name     TEXT,
  biometric_pin   TEXT NOT NULL UNIQUE,
  device_sn       TEXT,
  enroll_method   TEXT DEFAULT 'Fingerprint',
  registered_at   TIMESTAMPTZ DEFAULT NOW(),
  registered_by   TEXT,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS biometric_logs_pin_idx ON school_biometric_logs(pin);
CREATE INDEX IF NOT EXISTS biometric_logs_time_idx ON school_biometric_logs(punch_time DESC);
CREATE INDEX IF NOT EXISTS biometric_logs_processed_idx ON school_biometric_logs(processed);
CREATE INDEX IF NOT EXISTS biometric_regs_pin_idx ON school_biometric_registrations(biometric_pin);
CREATE INDEX IF NOT EXISTS biometric_regs_person_idx ON school_biometric_registrations(person_type, person_id);

-- 4. RLS
ALTER TABLE school_biometric_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_biometric_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biometric_logs_all" ON school_biometric_logs;
DROP POLICY IF EXISTS "biometric_regs_all" ON school_biometric_registrations;

CREATE POLICY "biometric_logs_all" ON school_biometric_logs FOR ALL USING (true);
CREATE POLICY "biometric_regs_all" ON school_biometric_registrations FOR ALL USING (true);

-- 5. Also ensure school_staff_attendance exists
CREATE TABLE IF NOT EXISTS school_staff_attendance (
  id              BIGSERIAL PRIMARY KEY,
  staff_type      TEXT NOT NULL,
  staff_id        INTEGER NOT NULL,
  staff_name      TEXT,
  attendance_date DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Present',
  time_in         TEXT,
  time_out        TEXT,
  notes           TEXT,
  recorded_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_att_all" ON school_staff_attendance;
CREATE POLICY "staff_att_all" ON school_staff_attendance FOR ALL USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS staff_att_unique
  ON school_staff_attendance(staff_type, staff_id, attendance_date);

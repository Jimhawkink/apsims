-- ============================================================
-- APSIMS Hostel / Boarding Management Schema
-- ============================================================

-- Dormitory definitions
CREATE TABLE IF NOT EXISTS school_hostels (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  dorm_name      TEXT NOT NULL,
  gender         TEXT NOT NULL CHECK (gender IN ('Male','Female','Mixed')),
  floor_number   INTEGER DEFAULT 1,
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  matron_id      INTEGER REFERENCES school_teachers(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_hostels_tenant ON school_hostels(tenant_id);

-- Bed allocations per student per term
CREATE TABLE IF NOT EXISTS school_hostel_beds (
  id                SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  hostel_id         INTEGER NOT NULL REFERENCES school_hostels(id) ON DELETE CASCADE,
  student_id        INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  bed_number        TEXT NOT NULL,
  term_id           INTEGER NOT NULL REFERENCES school_terms(id),
  allocation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  deallocation_date DATE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  -- One bed per dorm per term
  UNIQUE (hostel_id, bed_number, term_id),
  -- One allocation per student per term
  UNIQUE (student_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_hostel_beds_hostel  ON school_hostel_beds(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_beds_student ON school_hostel_beds(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_beds_term    ON school_hostel_beds(term_id);

-- Roll call sessions (one per dorm per type per date)
CREATE TABLE IF NOT EXISTS school_hostel_attendance (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  hostel_id      INTEGER NOT NULL REFERENCES school_hostels(id) ON DELETE CASCADE,
  roll_call_type TEXT NOT NULL CHECK (roll_call_type IN ('Morning','Evening')),
  roll_call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by    INTEGER REFERENCES school_users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hostel_id, roll_call_type, roll_call_date)
);
CREATE INDEX IF NOT EXISTS idx_hostel_attendance_hostel ON school_hostel_attendance(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_attendance_date   ON school_hostel_attendance(roll_call_date);

-- Per-student roll call status
CREATE TABLE IF NOT EXISTS school_hostel_attendance_items (
  id            SERIAL PRIMARY KEY,
  attendance_id INTEGER NOT NULL REFERENCES school_hostel_attendance(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('Present','Absent','On Leave')),
  remarks       TEXT,
  UNIQUE (attendance_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_hostel_att_items_attendance ON school_hostel_attendance_items(attendance_id);
CREATE INDEX IF NOT EXISTS idx_hostel_att_items_student    ON school_hostel_attendance_items(student_id);

-- Leave passes
CREATE TABLE IF NOT EXISTS school_hostel_leave_passes (
  id                       SERIAL PRIMARY KEY,
  tenant_id                UUID NOT NULL,
  student_id               INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  departure_datetime       TIMESTAMPTZ NOT NULL,
  expected_return_datetime TIMESTAMPTZ NOT NULL,
  actual_return_datetime   TIMESTAMPTZ,
  destination              TEXT NOT NULL,
  reason                   TEXT NOT NULL,
  authorized_by            INTEGER REFERENCES school_users(id),
  sms_sent                 BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leave_passes_student ON school_hostel_leave_passes(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_passes_tenant  ON school_hostel_leave_passes(tenant_id);

-- Hostel fee structures (per form per term)
CREATE TABLE IF NOT EXISTS school_hostel_fee_structures (
  id         SERIAL PRIMARY KEY,
  tenant_id  UUID NOT NULL,
  term_id    INTEGER NOT NULL REFERENCES school_terms(id),
  form_id    INTEGER NOT NULL REFERENCES school_forms(id),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, term_id, form_id)
);
CREATE INDEX IF NOT EXISTS idx_hostel_fee_struct_tenant ON school_hostel_fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_fee_struct_term   ON school_hostel_fee_structures(term_id);

-- Hostel fee payments
CREATE TABLE IF NOT EXISTS school_hostel_fee_payments (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  student_id     INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  term_id        INTEGER NOT NULL REFERENCES school_terms(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  receipt_number TEXT,
  recorded_by    INTEGER REFERENCES school_users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hostel_payments_student ON school_hostel_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_payments_term    ON school_hostel_fee_payments(term_id);
CREATE INDEX IF NOT EXISTS idx_hostel_payments_tenant  ON school_hostel_fee_payments(tenant_id);

-- Hostel discipline incidents
CREATE TABLE IF NOT EXISTS school_hostel_discipline (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  student_id    INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  hostel_id     INTEGER REFERENCES school_hostels(id),
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT NOT NULL,
  action_taken  TEXT,
  recorded_by   INTEGER REFERENCES school_users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hostel_discipline_student ON school_hostel_discipline(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_discipline_hostel  ON school_hostel_discipline(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_discipline_tenant  ON school_hostel_discipline(tenant_id);

-- ─── PTM (Parent-Teacher Meeting) Schema ───

-- 1. PTM Sessions
CREATE TABLE IF NOT EXISTS school_ptm_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID,
    title TEXT NOT NULL,
    session_date DATE NOT NULL,
    venue TEXT NOT NULL,
    target_form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES school_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptm_sessions_tenant ON school_ptm_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptm_sessions_date ON school_ptm_sessions (session_date);
CREATE INDEX IF NOT EXISTS idx_ptm_sessions_form ON school_ptm_sessions (target_form_id);

-- 2. PTM Slots
CREATE TABLE IF NOT EXISTS school_ptm_slots (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES school_ptm_sessions(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    teacher_id INTEGER REFERENCES school_teachers(id) ON DELETE SET NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptm_slots_session ON school_ptm_slots (session_id);
CREATE INDEX IF NOT EXISTS idx_ptm_slots_teacher ON school_ptm_slots (teacher_id);
CREATE INDEX IF NOT EXISTS idx_ptm_slots_booked ON school_ptm_slots (session_id, is_booked);

-- 3. PTM Bookings
CREATE TABLE IF NOT EXISTS school_ptm_bookings (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER NOT NULL REFERENCES school_ptm_slots(id) ON DELETE CASCADE UNIQUE,
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('Booked', 'Cancelled', 'Completed')) DEFAULT 'Booked',
    sms_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ptm_bookings_slot ON school_ptm_bookings (slot_id);
CREATE INDEX IF NOT EXISTS idx_ptm_bookings_student ON school_ptm_bookings (student_id);
CREATE INDEX IF NOT EXISTS idx_ptm_bookings_status ON school_ptm_bookings (status);

-- Row Level Security
ALTER TABLE school_ptm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_ptm_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_ptm_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sessions" ON school_ptm_sessions FOR ALL USING (true);
CREATE POLICY "service_role_all_slots" ON school_ptm_slots FOR ALL USING (true);
CREATE POLICY "service_role_all_bookings" ON school_ptm_bookings FOR ALL USING (true);

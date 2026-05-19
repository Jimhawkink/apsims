-- ============================================================
-- APSIMS ULTRA MIGRATION: Biometric Attendance + WhatsApp Delivery
-- Run this on Supabase SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. BIOMETRIC DEVICES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_biometric_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(200) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'fingerprint', -- fingerprint, face, card, mixed
    brand VARCHAR(100) DEFAULT 'ZKTeco', -- ZKTeco, Hikvision, Suprema, Generic
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    ip_address VARCHAR(50),
    port INTEGER DEFAULT 4370,
    location VARCHAR(200), -- 'Main Gate', 'Staff Room', 'Hostel Entry'
    assigned_forms INTEGER[], -- form_ids this device covers (NULL = all)
    status VARCHAR(20) DEFAULT 'Active', -- Active, Offline, Maintenance, Disabled
    last_sync_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    total_enrolled INTEGER DEFAULT 0,
    api_key VARCHAR(255), -- device-specific API key for push mode
    sync_mode VARCHAR(20) DEFAULT 'pull', -- pull (we fetch), push (device sends)
    sync_interval_minutes INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_biometric_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_biometric_devices" ON school_biometric_devices FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 2. BIOMETRIC ENROLLMENT TABLE (student <-> device fingerprint/face)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_biometric_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES school_biometric_devices(id) ON DELETE SET NULL,
    enrollment_type VARCHAR(20) DEFAULT 'fingerprint', -- fingerprint, face, card
    device_user_id VARCHAR(50), -- the ID used on the biometric device
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    template_data TEXT, -- base64 biometric template (optional backup)
    UNIQUE(student_id, device_id, enrollment_type)
);

ALTER TABLE school_biometric_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_biometric_enrollments" ON school_biometric_enrollments FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 3. BIOMETRIC ATTENDANCE LOGS (raw punch data from devices)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_biometric_logs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES school_biometric_devices(id) ON DELETE SET NULL,
    device_user_id VARCHAR(50), -- ID on the device
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type VARCHAR(20) DEFAULT 'check_in', -- check_in, check_out
    verify_method VARCHAR(20) DEFAULT 'fingerprint', -- fingerprint, face, card, password
    temperature NUMERIC(4,1), -- optional body temp from device
    photo_url TEXT, -- face capture URL (if face recognition)
    synced_to_attendance BOOLEAN DEFAULT false,
    attendance_record_id INTEGER REFERENCES school_daily_attendance(id),
    raw_data JSONB, -- full raw record from device
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_logs_punch_time ON school_biometric_logs(punch_time);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_student ON school_biometric_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_unsynced ON school_biometric_logs(synced_to_attendance) WHERE synced_to_attendance = false;

ALTER TABLE school_biometric_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_biometric_logs" ON school_biometric_logs FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. WHATSAPP MESSAGE LOGS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_whatsapp_logs (
    id SERIAL PRIMARY KEY,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(200),
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    message_type VARCHAR(50) DEFAULT 'report_card', -- report_card, fee_reminder, general, attendance_alert
    template_name VARCHAR(100),
    message_body TEXT,
    whatsapp_message_id VARCHAR(200), -- Meta's message ID
    status VARCHAR(30) DEFAULT 'sent', -- queued, sent, delivered, read, failed
    error_message TEXT,
    cost_saved NUMERIC(8,2) DEFAULT 0, -- KES saved vs SMS
    term_id INTEGER REFERENCES school_terms(id),
    sent_by VARCHAR(100),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_student ON school_whatsapp_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON school_whatsapp_logs(status);

ALTER TABLE school_whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_whatsapp_logs" ON school_whatsapp_logs FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 5. ADD BIOMETRIC FIELDS TO STUDENTS
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    ALTER TABLE school_students ADD COLUMN IF NOT EXISTS biometric_enrolled BOOLEAN DEFAULT false;
    ALTER TABLE school_students ADD COLUMN IF NOT EXISTS biometric_device_user_id VARCHAR(50);
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. ADD WHATSAPP FIELDS TO REPORT CARD DELIVERIES
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    ALTER TABLE school_report_card_deliveries ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(200);
    ALTER TABLE school_report_card_deliveries ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(30);
    ALTER TABLE school_report_card_deliveries ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
    ALTER TABLE school_report_card_deliveries ADD COLUMN IF NOT EXISTS whatsapp_delivered_at TIMESTAMPTZ;
    ALTER TABLE school_report_card_deliveries ADD COLUMN IF NOT EXISTS whatsapp_read_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

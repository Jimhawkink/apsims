-- ============================================================
-- APSIMS COMPLETE NEW MIGRATIONS
-- Run this ONCE in Supabase SQL Editor
-- Contains ALL new tables needed for Priority 1-4 features
-- ============================================================

-- ═══════════════════════════════════════════════════
-- 1. WhatsApp Delivery Tracking Table (Priority #1)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_whatsapp_delivery (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(200) UNIQUE NOT NULL,
    recipient_phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    status_timestamp TIMESTAMPTZ,
    error_code VARCHAR(50),
    error_title VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_whatsapp_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secure_anon_read_wa_delivery" ON public.school_whatsapp_delivery
    FOR SELECT TO anon USING (true);
CREATE POLICY "lockdown_wa_delivery_insert" ON public.school_whatsapp_delivery
    FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "lockdown_wa_delivery_update" ON public.school_whatsapp_delivery
    FOR UPDATE TO anon USING (false);
CREATE POLICY "lockdown_wa_delivery_delete" ON public.school_whatsapp_delivery
    FOR DELETE TO anon USING (false);

-- ═══════════════════════════════════════════════════
-- 2. Message Logs Table (WhatsApp + SMS logging)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_message_logs (
    id SERIAL PRIMARY KEY,
    message TEXT,
    recipients VARCHAR(300),
    recipient_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Sent',
    sent_by VARCHAR(200),
    sent_at TIMESTAMPTZ,
    message_type VARCHAR(50) DEFAULT 'sms',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_message_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "secure_anon_read_message_logs" ON public.school_message_logs
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "lockdown_message_logs_insert" ON public.school_message_logs
        FOR INSERT TO anon WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "lockdown_message_logs_update" ON public.school_message_logs
        FOR UPDATE TO anon USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "lockdown_message_logs_delete" ON public.school_message_logs
        FOR DELETE TO anon USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 3. Backup Logs Table (Ultra Backup feature)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_backup_logs (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL DEFAULT 'full',
    table_count INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    file_size_kb INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Success',
    created_by VARCHAR(200),
    errors TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secure_anon_read_backup_logs" ON public.school_backup_logs
    FOR SELECT TO anon USING (true);
CREATE POLICY "lockdown_backup_logs_insert" ON public.school_backup_logs
    FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "lockdown_backup_logs_update" ON public.school_backup_logs
    FOR UPDATE TO anon USING (false);
CREATE POLICY "lockdown_backup_logs_delete" ON public.school_backup_logs
    FOR DELETE TO anon USING (false);

-- ═══════════════════════════════════════════════════
-- 4. Audit Log Table (security tracking)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(200),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lockdown_audit_log" ON public.school_audit_log
    FOR ALL TO anon USING (false) WITH CHECK (false);

-- ═══════════════════════════════════════════════════
-- 5. Discipline Records Table
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_discipline_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT,
    action_taken VARCHAR(300),
    severity VARCHAR(20) DEFAULT 'Minor',
    reported_by VARCHAR(200),
    status VARCHAR(20) DEFAULT 'Open',
    parent_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_discipline_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "secure_anon_read_discipline" ON public.school_discipline_records
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 6. Health Records Tables
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_health_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER UNIQUE REFERENCES school_students(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    height_cm NUMERIC(5,1),
    weight_kg NUMERIC(5,1),
    vision VARCHAR(50),
    hearing VARCHAR(50),
    dental VARCHAR(50),
    chronic_conditions TEXT,
    disabilities TEXT,
    medications TEXT,
    insurance_provider VARCHAR(200),
    insurance_number VARCHAR(100),
    last_checkup_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_health_allergies (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
    allergy_type VARCHAR(100) NOT NULL,
    allergen VARCHAR(200) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Mild',
    reaction TEXT,
    treatment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_health_allergies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_health" ON public.school_health_records FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_allergies" ON public.school_health_allergies FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 7. Portal Users & Notifications
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_portal_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'parent',
    student_id INTEGER REFERENCES school_students(id),
    teacher_id INTEGER REFERENCES school_teachers(id),
    phone VARCHAR(50),
    email VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_parent_students (
    id SERIAL PRIMARY KEY,
    portal_user_id INTEGER REFERENCES school_portal_users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'Parent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portal_user_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.school_portal_notifications (
    id SERIAL PRIMARY KEY,
    portal_user_id INTEGER REFERENCES school_portal_users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_portal_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_portal_users" ON public.school_portal_users FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_parent_students" ON public.school_parent_students FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_portal_notifs" ON public.school_portal_notifications FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 8. Timetable Tables
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_timetable_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_type VARCHAR(20) DEFAULT 'lesson',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_timetable_entries (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    period_id INTEGER REFERENCES school_timetable_periods(id),
    subject_id INTEGER REFERENCES school_subjects(id),
    teacher_id INTEGER REFERENCES school_teachers(id),
    form_id INTEGER REFERENCES school_forms(id),
    stream_id INTEGER REFERENCES school_streams(id),
    room VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(day_of_week, period_id, form_id, stream_id)
);

ALTER TABLE public.school_timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_tt_periods" ON public.school_timetable_periods FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_tt_entries" ON public.school_timetable_entries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 9. Schemes of Work Tables
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_schemes_of_work (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES school_subjects(id),
    form_id INTEGER REFERENCES school_forms(id),
    term_id INTEGER REFERENCES school_terms(id),
    teacher_id INTEGER REFERENCES school_teachers(id),
    title VARCHAR(300),
    status VARCHAR(20) DEFAULT 'Draft',
    approved_by VARCHAR(200),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_scheme_weeks (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_scheme_lessons (
    id SERIAL PRIMARY KEY,
    week_id INTEGER REFERENCES school_scheme_weeks(id) ON DELETE CASCADE,
    lesson_number INTEGER DEFAULT 1,
    topic VARCHAR(300),
    sub_topic VARCHAR(300),
    objectives TEXT,
    activities TEXT,
    resources TEXT,
    assessment TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_lessons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_schemes" ON public.school_schemes_of_work FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_weeks" ON public.school_scheme_weeks FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_lessons" ON public.school_scheme_lessons FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 10. Topics & Question Bank
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_topics (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES school_subjects(id),
    form_id INTEGER REFERENCES school_forms(id),
    topic_name VARCHAR(300) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_question_bank (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES school_subjects(id),
    form_id INTEGER REFERENCES school_forms(id),
    topic_id INTEGER REFERENCES school_topics(id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer TEXT,
    marks INTEGER DEFAULT 1,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_question_bank ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_topics" ON public.school_topics FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_qbank" ON public.school_question_bank FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 11. CBC Tables
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_cbc_strands (
    id SERIAL PRIMARY KEY,
    learning_area_id INTEGER,
    strand_name VARCHAR(300) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_cbc_sub_strands (
    id SERIAL PRIMARY KEY,
    strand_id INTEGER REFERENCES school_cbc_strands(id) ON DELETE CASCADE,
    sub_strand_name VARCHAR(300) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_cbc_learning_areas (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES school_subjects(id),
    learning_area_name VARCHAR(300) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_cbc_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_cbc_sub_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_cbc_learning_areas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_strands" ON public.school_cbc_strands FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_sub_strands" ON public.school_cbc_sub_strands FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_learning_areas" ON public.school_cbc_learning_areas FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 12. Misc Tables (Store, Clinic, Visitors, etc.)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_store_items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pieces',
    reorder_level INTEGER DEFAULT 5,
    location VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_clinic_visits (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id),
    visit_date DATE DEFAULT CURRENT_DATE,
    complaint TEXT,
    diagnosis TEXT,
    treatment TEXT,
    medication TEXT,
    referred BOOLEAN DEFAULT false,
    attended_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_visitor_log (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(200) NOT NULL,
    id_number VARCHAR(50),
    phone VARCHAR(50),
    purpose VARCHAR(300),
    visiting VARCHAR(200),
    check_in TIMESTAMPTZ DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    badge_number VARCHAR(20),
    notes TEXT,
    recorded_by VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_leave_out_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id),
    leave_date DATE DEFAULT CURRENT_DATE,
    leave_time TIME,
    return_time TIME,
    reason TEXT,
    authorized_by VARCHAR(200),
    parent_notified BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'Out',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_bus_passes (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id),
    route VARCHAR(200),
    pickup_point VARCHAR(200),
    pass_number VARCHAR(50),
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_alumni (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id),
    graduation_year INTEGER,
    kcse_grade VARCHAR(10),
    university VARCHAR(300),
    course VARCHAR(300),
    employer VARCHAR(300),
    phone VARCHAR(50),
    email VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_rim_paper_records (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    department VARCHAR(100),
    teacher VARCHAR(200),
    pages_used INTEGER DEFAULT 0,
    purpose VARCHAR(300),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all misc tables
ALTER TABLE public.school_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_clinic_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visitor_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_leave_out_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bus_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_rim_paper_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "anon_read_store" ON public.school_store_items FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_clinic" ON public.school_clinic_visits FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_visitors" ON public.school_visitor_log FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_leave" ON public.school_leave_out_records FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_bus" ON public.school_bus_passes FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_alumni" ON public.school_alumni FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon_read_rim" ON public.school_rim_paper_records FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- 13. M-Pesa Config & Transactions
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_mpesa_config (
    id SERIAL PRIMARY KEY,
    consumer_key VARCHAR(200),
    consumer_secret VARCHAR(200),
    passkey VARCHAR(200),
    shortcode VARCHAR(50),
    callback_url VARCHAR(500),
    environment VARCHAR(20) DEFAULT 'sandbox',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_mpesa_transactions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES school_students(id),
    phone VARCHAR(50),
    amount NUMERIC(12,2),
    mpesa_receipt VARCHAR(50),
    transaction_date TIMESTAMPTZ,
    result_code INTEGER,
    result_desc TEXT,
    checkout_request_id VARCHAR(200),
    merchant_request_id VARCHAR(200),
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_mpesa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_mpesa_transactions ENABLE ROW LEVEL SECURITY;
-- FULL LOCKDOWN on M-Pesa (contains API keys)
CREATE POLICY "lockdown_mpesa_config" ON public.school_mpesa_config
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "lockdown_mpesa_txns" ON public.school_mpesa_transactions
    FOR ALL TO anon USING (false) WITH CHECK (false);

-- ═══════════════════════════════════════════════════
-- 14. Tenants Table (multi-school)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.school_tenants (
    id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(300) NOT NULL,
    domain VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_tenants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "anon_read_tenants" ON public.school_tenants FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════
-- DONE! Verify all tables exist
-- ═══════════════════════════════════════════════════
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'school_%'
ORDER BY tablename;

-- ══════════════════════════════════════════════════════════════════
-- AlphaSchool Enhancement Migration
-- Features: Health Records, Multi-School, Digital Report Cards,
--           Parent/Student Portals, Payment Integrations
-- ══════════════════════════════════════════════════════════════════

-- ═══ 1. STUDENT HEALTH RECORDS ═══════════════════════════════════

CREATE TABLE IF NOT EXISTS school_health_records (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    genotype VARCHAR(10),
    height_cm NUMERIC(5,1),
    weight_kg NUMERIC(5,1),
    vision_left VARCHAR(20),
    vision_right VARCHAR(20),
    hearing VARCHAR(20),
    dental_notes TEXT,
    chronic_conditions TEXT,
    allergies TEXT,
    current_medications TEXT,
    immunization_status JSONB,
        -- [{disease, date, booster_date}]
    disability_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS school_health_allergies (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    allergen VARCHAR(200) NOT NULL,
    severity VARCHAR(20) DEFAULT 'mild',
        -- mild, moderate, severe, life_threatening
    reaction TEXT,
    management_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_clinic_visits (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    complaint TEXT NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    medication_given TEXT,
    temperature NUMERIC(4,1),
    blood_pressure VARCHAR(20),
    referred_to VARCHAR(200),
    discharged BOOLEAN DEFAULT false,
    discharge_time TIME,
    attended_by VARCHAR(100),
    notes TEXT,
    term_id INTEGER REFERENCES school_terms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    contact_name VARCHAR(200) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(30) NOT NULL,
    alt_phone VARCHAR(30),
    email VARCHAR(200),
    is_primary BOOLEAN DEFAULT false,
    escalation_order INTEGER DEFAULT 1,
    can_authorize_treatment BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 2. MULTI-SCHOOL / MULTI-CAMPUS ═════════════════════════════

CREATE TABLE IF NOT EXISTS school_tenants (
    id BIGSERIAL PRIMARY KEY,
    tenant_code VARCHAR(20) UNIQUE NOT NULL,
    tenant_name VARCHAR(200) NOT NULL,
    logo_url TEXT,
    address TEXT,
    county VARCHAR(100),
    sub_county VARCHAR(100),
    school_type VARCHAR(50),
        -- primary, secondary, mixed, college
    curriculum_type VARCHAR(30) DEFAULT '8-4-4',
        -- 8-4-4, cbc, igcse
    phone VARCHAR(30),
    email VARCHAR(200),
    website VARCHAR(200),
    registration_number VARCHAR(100),
    max_students INTEGER DEFAULT 500,
    subscription_plan VARCHAR(30) DEFAULT 'basic',
        -- basic, standard, premium, enterprise
    subscription_expires DATE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_campuses (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES school_tenants(id) ON DELETE CASCADE,
    campus_name VARCHAR(200) NOT NULL,
    campus_code VARCHAR(20),
    address TEXT,
    phone VARCHAR(30),
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tenant_id to existing tables (nullable for backward compat)
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL;
ALTER TABLE school_users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL;
ALTER TABLE school_students ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL;

-- ═══ 3. DIGITAL REPORT CARD DELIVERY ═════════════════════════════

CREATE TABLE IF NOT EXISTS school_report_card_deliveries (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
    exam_type_id INTEGER REFERENCES school_exam_types(id) ON DELETE SET NULL,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    digital_signature_teacher TEXT,
    digital_signature_principal TEXT,
    teacher_signed_at TIMESTAMPTZ,
    principal_signed_at TIMESTAMPTZ,
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMPTZ,
    whatsapp_phone VARCHAR(30),
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMPTZ,
    sms_phone VARCHAR(30),
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    email_address VARCHAR(200),
    parent_viewed BOOLEAN DEFAULT false,
    parent_viewed_at TIMESTAMPTZ,
    delivery_status VARCHAR(20) DEFAULT 'pending',
        -- pending, generated, signed, delivered, viewed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, term_id, exam_type_id)
);

-- ═══ 4. PARENT & STUDENT PORTAL ═════════════════════════════════

CREATE TABLE IF NOT EXISTS school_portal_users (
    id BIGSERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL,
        -- parent, student
    linked_student_id INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
    linked_parent_id INTEGER,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(30),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_parent_students (
    id BIGSERIAL PRIMARY KEY,
    portal_user_id INTEGER NOT NULL REFERENCES school_portal_users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    relationship VARCHAR(30) DEFAULT 'parent',
        -- parent, guardian, sponsor
    can_view_fees BOOLEAN DEFAULT true,
    can_view_results BOOLEAN DEFAULT true,
    can_view_attendance BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portal_user_id, student_id)
);

CREATE TABLE IF NOT EXISTS school_portal_notifications (
    id BIGSERIAL PRIMARY KEY,
    portal_user_id INTEGER NOT NULL REFERENCES school_portal_users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info',
        -- info, fee, result, attendance, health, general
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_portal_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    portal_user_id INTEGER NOT NULL REFERENCES school_portal_users(id) ON DELETE CASCADE,
    action VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 5. PAYMENT INTEGRATIONS ═════════════════════════════════════

-- M-Pesa
CREATE TABLE IF NOT EXISTS school_mpesa_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE CASCADE,
    shortcode VARCHAR(20) NOT NULL,
    consumer_key VARCHAR(255) NOT NULL,
    consumer_secret VARCHAR(255) NOT NULL,
    passkey VARCHAR(255) NOT NULL,
    is_live BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_mpesa_transactions (
    id BIGSERIAL PRIMARY KEY,
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    result_code VARCHAR(10),
    result_desc TEXT,
    amount NUMERIC(12,2),
    mpesa_receipt VARCHAR(50),
    transaction_date VARCHAR(30),
    phone_number VARCHAR(30),
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    fee_payment_id INTEGER REFERENCES school_fee_payments(id) ON DELETE SET NULL,
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    status VARCHAR(20) DEFAULT 'pending',
        -- pending, processing, completed, failed
    raw_callback JSONB,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jenga (Equity Bank / Finserve)
CREATE TABLE IF NOT EXISTS school_jenga_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE CASCADE,
    partner_id VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    is_live BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_jenga_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(100) UNIQUE,
    jenga_ref VARCHAR(100),
    amount NUMERIC(12,2),
    currency VARCHAR(10) DEFAULT 'KES',
    debit_account VARCHAR(50),
    credit_account VARCHAR(50),
    phone_number VARCHAR(30),
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    fee_payment_id INTEGER REFERENCES school_fee_payments(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    callback_data JSONB,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KCB (Kenya Commercial Bank)
CREATE TABLE IF NOT EXISTS school_kcb_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE CASCADE,
    merchant_id VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    settlement_account VARCHAR(50),
    is_live BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_kcb_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(100) UNIQUE,
    kcb_ref VARCHAR(100),
    amount NUMERIC(12,2),
    currency VARCHAR(10) DEFAULT 'KES',
    phone_number VARCHAR(30),
    payment_method VARCHAR(30),
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    fee_payment_id INTEGER REFERENCES school_fee_payments(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    callback_data JSONB,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified payment attempts
CREATE TABLE IF NOT EXISTS school_payment_attempts (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    channel VARCHAR(30) NOT NULL,
        -- mpesa_stk, mpesa_paybill, jenga, kcb, manual
    status VARCHAR(20) DEFAULT 'initiated',
        -- initiated, processing, completed, failed, cancelled
    external_ref VARCHAR(100),
    internal_ref VARCHAR(100),
    phone_number VARCHAR(30),
    account_reference VARCHAR(100),
    description TEXT,
    fee_structure_ids INTEGER[],
    callback_received BOOLEAN DEFAULT false,
    callback_data JSONB,
    tenant_id INTEGER REFERENCES school_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_health_records_student ON school_health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_student ON school_clinic_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_date ON school_clinic_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_student ON school_emergency_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_tenants_code ON school_tenants(tenant_code);
CREATE INDEX IF NOT EXISTS idx_campuses_tenant ON school_campuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_student ON school_report_card_deliveries(student_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_username ON school_portal_users(username);
CREATE INDEX IF NOT EXISTS idx_portal_users_student ON school_portal_users(linked_student_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_user ON school_portal_notifications(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_checkout ON school_mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_receipt ON school_mpesa_transactions(mpesa_receipt);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_student ON school_mpesa_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_jenga_tx_ref ON school_jenga_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_kcb_tx_ref ON school_kcb_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_student ON school_payment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_channel ON school_payment_attempts(channel);

-- ═══ RLS POLICIES ════════════════════════════════════════════════

ALTER TABLE school_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_health_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_clinic_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_report_card_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_portal_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_mpesa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_jenga_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_jenga_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_kcb_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_kcb_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_payment_attempts ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'school_health_records','school_health_allergies','school_clinic_visits',
        'school_emergency_contacts','school_tenants','school_campuses',
        'school_report_card_deliveries','school_portal_users','school_parent_students',
        'school_portal_notifications','school_portal_activity_logs',
        'school_mpesa_config','school_mpesa_transactions',
        'school_jenga_config','school_jenga_transactions',
        'school_kcb_config','school_kcb_transactions','school_payment_attempts'
    ] LOOP
        EXECUTE format('CREATE POLICY %I_admin ON %I FOR ALL USING (true) WITH CHECK (true)', t || '_admin', t);
    END LOOP;
END $$;

-- ═══ SEED DATA ═══════════════════════════════════════════════════

-- Default tenant (the school itself)
INSERT INTO school_tenants (tenant_code, tenant_name, school_type, curriculum_type, subscription_plan, is_active)
VALUES ('DEFAULT', 'AlphaSchool Demo', 'secondary', 'cbc', 'premium', true)
ON CONFLICT (tenant_code) DO NOTHING;

-- Link existing school details to default tenant
UPDATE school_details SET tenant_id = (SELECT id FROM school_tenants WHERE tenant_code = 'DEFAULT')
WHERE tenant_id IS NULL;

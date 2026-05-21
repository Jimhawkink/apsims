-- ============================================================
-- APSIMS ULTRA MIGRATION: Financial Intelligence Suite
-- Run this on Supabase SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. M-PESA TRANSACTIONS TABLE (for auto-reconciliation)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_mpesa_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    sender_name VARCHAR(200),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    account_reference VARCHAR(200), -- admission number sent by parent
    bill_ref_number VARCHAR(200),
    org_account_balance NUMERIC(12,2),
    transaction_type VARCHAR(50) DEFAULT 'Pay Bill',
    status VARCHAR(30) DEFAULT 'Pending', -- Pending, Matched, Failed
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    matched_at TIMESTAMPTZ,
    matched_by VARCHAR(100),
    fee_payment_id INTEGER,
    raw_callback JSONB, -- full M-Pesa callback data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_tx_status ON school_mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_student ON school_mpesa_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_created ON school_mpesa_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_ref ON school_mpesa_transactions(account_reference);

ALTER TABLE school_mpesa_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_mpesa_transactions" ON school_mpesa_transactions FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 2. FEE RECEIPTS TABLE (for professional receipts)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_fee_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    payment_id INTEGER REFERENCES school_fee_payments(id) ON DELETE SET NULL,
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_words TEXT,
    status VARCHAR(20) DEFAULT 'Issued', -- Issued, Voided, Reprinted
    voided_by VARCHAR(100),
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    reprint_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_student ON school_fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON school_fee_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON school_fee_receipts(payment_id);

ALTER TABLE school_fee_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_receipts" ON school_fee_receipts FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 3. PAYMENT PLANS TABLE (installment schedules)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_payment_plans (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES school_terms(id),
    plan_name VARCHAR(200) DEFAULT 'Standard Plan',
    total_amount NUMERIC(12,2) NOT NULL,
    installments INTEGER NOT NULL DEFAULT 3,
    frequency VARCHAR(30) DEFAULT 'Monthly', -- Weekly, Bi-Weekly, Monthly, Custom
    start_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active', -- Active, Completed, Defaulted, Cancelled
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_payment_plans" ON school_payment_plans FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. PAYMENT PLAN INSTALLMENTS (individual due dates)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_plan_installments (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES school_payment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Paid, Partial, Overdue
    paid_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_plan ON school_plan_installments(plan_id);
CREATE INDEX IF NOT EXISTS idx_installments_due ON school_plan_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON school_plan_installments(status);

ALTER TABLE school_plan_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_plan_installments" ON school_plan_installments FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 5. SCHOLARSHIPS & WAIVERS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_scholarships (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    scholarship_name VARCHAR(200) NOT NULL,
    scholarship_type VARCHAR(50) DEFAULT 'Partial', -- Full, Partial, Bursary, Waiver, Sibling Discount
    sponsor VARCHAR(200), -- CDF, NGO, Church, School Board, etc.
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5,2), -- alternative: 50% off tuition
    applies_to VARCHAR(100) DEFAULT 'All Fees', -- All Fees, Tuition Only, Boarding Only
    term_id INTEGER REFERENCES school_terms(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'Active', -- Active, Expired, Revoked, Pending Approval
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarships_student ON school_scholarships(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON school_scholarships(status);

ALTER TABLE school_scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_scholarships" ON school_scholarships FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 6. ADD KRA PIN TO SCHOOL DETAILS (for receipts)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
    ALTER TABLE school_details ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(20);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. FEE AUDIT LOG (track all financial actions)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_fee_audit_log (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- payment_created, payment_voided, receipt_issued, receipt_voided, plan_created, scholarship_applied
    entity_type VARCHAR(50), -- payment, receipt, plan, scholarship
    entity_id INTEGER,
    student_id INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2),
    details JSONB,
    performed_by VARCHAR(100),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_audit_action ON school_fee_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_fee_audit_student ON school_fee_audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_created ON school_fee_audit_log(created_at);

ALTER TABLE school_fee_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_audit_log" ON school_fee_audit_log FOR ALL USING (true) WITH CHECK (true);

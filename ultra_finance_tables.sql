-- =====================================================
-- APSIMS Ultra Finance Module — Database Tables
-- Run this migration in your Supabase SQL Editor
-- =====================================================

-- 1. Budget Vote Heads
CREATE TABLE IF NOT EXISTS school_budget_votes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  vote_head TEXT NOT NULL,
  category TEXT DEFAULT 'Operations',
  budget_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(15,2) DEFAULT 0,
  academic_year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bank Accounts & Reconciliation
CREATE TABLE IF NOT EXISTS school_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT,
  account_type TEXT DEFAULT 'Current', -- Current, Savings, M-Pesa
  book_balance NUMERIC(15,2) DEFAULT 0,
  bank_balance NUMERIC(15,2) DEFAULT 0,
  reconciliation_status TEXT DEFAULT 'Pending', -- Pending, Reconciled, Unreconciled
  last_reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Capitation Grants (MoE disbursements per form/stream)
CREATE TABLE IF NOT EXISTS school_capitation (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  form_id BIGINT REFERENCES school_forms(id),
  stream_id BIGINT REFERENCES school_streams(id),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'MoE', -- MoE, County, CDF, Other
  disbursement_date DATE,
  reference_number TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Credited, Received, Rejected
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bursary Records (HELB, County, CDF, NGO)
CREATE TABLE IF NOT EXISTS school_bursary_records (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  student_id BIGINT REFERENCES school_students(id),
  bursary_type TEXT NOT NULL DEFAULT 'HELB', -- HELB, County Bursary, CDF, NGO, Other
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  disbursement_date DATE,
  reference_number TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Credited, Queued, Rejected
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KRA eTIMS Configuration
CREATE TABLE IF NOT EXISTS school_etims_config (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  kra_pin TEXT,
  vscu_status TEXT DEFAULT 'Active', -- Active, Expired, Suspended
  token_expiry TEXT,
  receipts_pending INT DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  paye_status TEXT DEFAULT 'Pending', -- Pending, Filed, Overdue
  paye_amount NUMERIC(15,2) DEFAULT 0,
  paye_reference TEXT,
  nssf_status TEXT DEFAULT 'Pending', -- Pending, Remitted, Overdue
  nssf_amount NUMERIC(15,2) DEFAULT 0,
  nssf_due_date TEXT,
  nhif_status TEXT DEFAULT 'Pending',
  nhif_amount NUMERIC(15,2) DEFAULT 0,
  tcc_valid BOOLEAN DEFAULT TRUE,
  tcc_expiry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payroll Schedule
CREATE TABLE IF NOT EXISTS school_payroll_schedule (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT auth.uid(),
  staff_id BIGINT,
  staff_name TEXT,
  designation TEXT,
  basic_salary NUMERIC(15,2) DEFAULT 0,
  allowances NUMERIC(15,2) DEFAULT 0,
  deductions NUMERIC(15,2) DEFAULT 0,
  net_salary NUMERIC(15,2) DEFAULT 0,
  pay_month TEXT, -- e.g. 'May 2026'
  status TEXT DEFAULT 'Pending', -- Pending, Processed, Paid
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security on all new tables
-- =====================================================
ALTER TABLE school_budget_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_capitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_bursary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_etims_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_payroll_schedule ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated users
-- (Adjust these based on your tenant isolation strategy)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'school_budget_votes',
    'school_bank_accounts',
    'school_capitation',
    'school_bursary_records',
    'school_etims_config',
    'school_payroll_schedule'
  ]) LOOP
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "%s_all_access" ON %I
        FOR ALL
        USING (true)
        WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_budget_year ON school_budget_votes(academic_year);
CREATE INDEX IF NOT EXISTS idx_capitation_form ON school_capitation(form_id);
CREATE INDEX IF NOT EXISTS idx_bursary_student ON school_bursary_records(student_id);
CREATE INDEX IF NOT EXISTS idx_bursary_type ON school_bursary_records(bursary_type);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON school_payroll_schedule(pay_month);
CREATE INDEX IF NOT EXISTS idx_bank_status ON school_bank_accounts(reconciliation_status);

-- =====================================================
-- Done! All finance tables are ready.
-- =====================================================

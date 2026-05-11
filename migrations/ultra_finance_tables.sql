-- ============================================================
-- APSIMS Ultra Finance Dashboard — Missing Tables Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Budget Vote Heads (Budget vs Actual)
CREATE TABLE IF NOT EXISTS public.school_budget_votes (
  id SERIAL PRIMARY KEY,
  vote_head VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'Operations',
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC DEFAULT 0,
  term_id INTEGER REFERENCES public.school_terms(id),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  notes TEXT,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bank Accounts (Bank Reconciliation)
CREATE TABLE IF NOT EXISTS public.school_bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR NOT NULL,
  account_name VARCHAR NOT NULL,
  account_number VARCHAR NOT NULL,
  account_type VARCHAR DEFAULT 'Current',
  book_balance NUMERIC DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  last_reconciled_date DATE,
  reconciliation_status VARCHAR DEFAULT 'Pending',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Capitation Records (Government Capitation)
CREATE TABLE IF NOT EXISTS public.school_capitation (
  id SERIAL PRIMARY KEY,
  term_id INTEGER REFERENCES public.school_terms(id),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  form_id INTEGER REFERENCES public.school_forms(id),
  stream_id INTEGER REFERENCES public.school_streams(id),
  capitation_type VARCHAR DEFAULT 'National' CHECK (capitation_type IN ('National','County','CDF','Other')),
  amount_expected NUMERIC DEFAULT 0,
  amount_received NUMERIC DEFAULT 0,
  disbursement_date DATE,
  reference_number VARCHAR,
  status VARCHAR DEFAULT 'Pending' CHECK (status IN ('Pending','Partial','Received','Overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HELB & Bursary Tracking
CREATE TABLE IF NOT EXISTS public.school_bursary_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.school_students(id),
  term_id INTEGER REFERENCES public.school_terms(id),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  bursary_type VARCHAR NOT NULL DEFAULT 'HELB' CHECK (bursary_type IN ('HELB','County Bursary','CDF','NG-CDF','Constituency','Other')),
  amount_applied NUMERIC DEFAULT 0,
  amount_approved NUMERIC DEFAULT 0,
  amount_disbursed NUMERIC DEFAULT 0,
  application_date DATE DEFAULT CURRENT_DATE,
  disbursement_date DATE,
  reference_number VARCHAR,
  status VARCHAR DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Disbursed','Credited','Rejected','Queued')),
  credited_to_fees BOOLEAN DEFAULT FALSE,
  notes TEXT,
  recorded_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KRA eTIMS Configuration & Compliance
CREATE TABLE IF NOT EXISTS public.school_etims_config (
  id SERIAL PRIMARY KEY,
  vscu_serial VARCHAR,
  vscu_status VARCHAR DEFAULT 'Active' CHECK (vscu_status IN ('Active','Inactive','Expired','Suspended')),
  token_expiry_date DATE,
  kra_pin VARCHAR,
  tcc_number VARCHAR,
  tcc_expiry_date DATE,
  last_sync_at TIMESTAMPTZ,
  receipts_pending INTEGER DEFAULT 0,
  receipts_uploaded INTEGER DEFAULT 0,
  paye_status VARCHAR DEFAULT 'Filed',
  paye_amount NUMERIC DEFAULT 0,
  paye_reference VARCHAR,
  paye_due_date DATE,
  nssf_status VARCHAR DEFAULT 'Filed',
  nssf_amount NUMERIC DEFAULT 0,
  nssf_due_date DATE,
  nhif_sha_status VARCHAR DEFAULT 'Filed',
  nhif_sha_amount NUMERIC DEFAULT 0,
  nhif_sha_due_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Fee Vote Head Payments (linking payments to vote heads)
CREATE TABLE IF NOT EXISTS public.school_fee_payment_votes (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES public.school_fee_payments(id),
  vote_head VARCHAR NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payroll Schedule (for payroll due alerts)
CREATE TABLE IF NOT EXISTS public.school_payroll_schedule (
  id SERIAL PRIMARY KEY,
  pay_period VARCHAR NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_staff INTEGER DEFAULT 0,
  gross_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  status VARCHAR DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Paid','Overdue')),
  prepared_by VARCHAR,
  approved_by VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Seed default data
-- ============================================================

-- Default bank accounts
INSERT INTO public.school_bank_accounts (bank_name, account_name, account_number, account_type, book_balance, bank_balance, reconciliation_status)
VALUES
  ('KCB', 'Alpha School Main', '1129****2', 'Current', 0, 0, 'Pending'),
  ('Equity', 'Alpha School Equity', '0023****7', 'Current', 0, 0, 'Pending'),
  ('Co-op', 'Alpha School Co-op', '3341****9', 'Current', 0, 0, 'Pending'),
  ('M-Pesa Paybill', 'M-Pesa Collections', '522400', 'Mobile', 0, 0, 'Today')
ON CONFLICT DO NOTHING;

-- Default eTIMS config
INSERT INTO public.school_etims_config (vscu_status, token_expiry_date, paye_status, nssf_status, nhif_sha_status)
VALUES ('Active', CURRENT_DATE + INTERVAL '30 days', 'Filed', 'Filed', 'Filed')
ON CONFLICT DO NOTHING;

-- Default budget votes
INSERT INTO public.school_budget_votes (vote_head, category, allocated_amount, year)
VALUES
  ('Salaries & Wages', 'HR', 0, EXTRACT(YEAR FROM NOW())),
  ('Operations', 'Operations', 0, EXTRACT(YEAR FROM NOW())),
  ('Procurement', 'Procurement', 0, EXTRACT(YEAR FROM NOW())),
  ('Infrastructure', 'Infrastructure', 0, EXTRACT(YEAR FROM NOW())),
  ('Library & ICT', 'Library', 0, EXTRACT(YEAR FROM NOW())),
  ('Extra-curricular', 'Activities', 0, EXTRACT(YEAR FROM NOW()))
ON CONFLICT DO NOTHING;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_school_bursary_student ON public.school_bursary_records(student_id);
CREATE INDEX IF NOT EXISTS idx_school_bursary_term ON public.school_bursary_records(term_id);
CREATE INDEX IF NOT EXISTS idx_school_capitation_term ON public.school_capitation(term_id);
CREATE INDEX IF NOT EXISTS idx_school_budget_votes_year ON public.school_budget_votes(year);
CREATE INDEX IF NOT EXISTS idx_school_payroll_schedule_year ON public.school_payroll_schedule(year, month);

-- ============================================================
-- APSIMS Ultra Stores, Procurement & Finance Upgrade
-- Ultra-Premium: Approval Workflows, Full Tracking, Audit Trail
-- ============================================================

-- ─── 1. ENRICH school_store_items (add missing columns) ───────────────────
ALTER TABLE public.school_store_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_id INTEGER,
  ADD COLUMN IF NOT EXISTS supplier VARCHAR(200),
  ADD COLUMN IF NOT EXISTS is_kitchen BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_received NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_issued NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);

-- ─── 2. school_store_issuances (full approval workflow) ────────────────────
CREATE TABLE IF NOT EXISTS public.school_store_issuances (
  id SERIAL PRIMARY KEY,
  issuance_number VARCHAR(50) UNIQUE,
  item_id INTEGER REFERENCES public.school_store_items(id),
  item_name VARCHAR(200),
  item_code VARCHAR(50),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'Pieces',
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  issued_to VARCHAR(200) NOT NULL,
  issued_to_type VARCHAR(50) DEFAULT 'Staff' CHECK (issued_to_type IN ('Staff','Student','Kitchen','Office','Department','Visitor','Other')),
  department VARCHAR(200),
  purpose TEXT,
  notes TEXT,
  -- Approval workflow
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Issued','Cancelled')),
  requested_by VARCHAR(200),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approval_required_from VARCHAR(50) DEFAULT 'Principal' CHECK (approval_required_from IN ('Principal','Deputy Principal','HOD','Bursar')),
  approved_by VARCHAR(200),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  issued_by VARCHAR(200),
  issued_at TIMESTAMPTZ,
  -- Tracking
  school_id INTEGER,
  term_id INTEGER,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. school_store_issuance_approvals (audit trail for approvals) ────────
CREATE TABLE IF NOT EXISTS public.school_store_issuance_approvals (
  id SERIAL PRIMARY KEY,
  issuance_id INTEGER REFERENCES public.school_store_issuances(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN ('Requested','Approved','Rejected','Issued','Cancelled','Recalled')),
  action_by VARCHAR(200) NOT NULL,
  action_by_role VARCHAR(100),
  action_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. school_store_purchases / GRN (Goods Received Notes) ───────────────
CREATE TABLE IF NOT EXISTS public.school_store_purchases (
  id SERIAL PRIMARY KEY,
  grn_number VARCHAR(50) UNIQUE,
  po_id INTEGER,
  invoice_id INTEGER,
  item_id INTEGER REFERENCES public.school_store_items(id),
  item_name VARCHAR(200),
  item_code VARCHAR(50),
  quantity NUMERIC(12,2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'Pieces',
  unit_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  supplier_id INTEGER,
  supplier VARCHAR(200),
  invoice_ref VARCHAR(100),
  delivery_date DATE DEFAULT CURRENT_DATE,
  -- Authorization
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending','Authorized','Rejected','Received','Variance')),
  received_by VARCHAR(200),
  received_at TIMESTAMPTZ,
  authorized_by VARCHAR(200),
  authorized_by_role VARCHAR(100) DEFAULT 'Principal' CHECK (authorized_by_role IN ('Principal','Deputy Principal')),
  authorized_at TIMESTAMPTZ,
  authorization_notes TEXT,
  variance_qty NUMERIC(12,2) DEFAULT 0,
  variance_notes TEXT,
  notes TEXT,
  -- Tracking
  school_id INTEGER,
  created_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. school_payment_vouchers (full PV workflow) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.school_payment_vouchers (
  id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(50) UNIQUE,
  voucher_date DATE DEFAULT CURRENT_DATE,
  payee_name VARCHAR(300) NOT NULL,
  payee_type VARCHAR(50) DEFAULT 'Supplier' CHECK (payee_type IN ('Supplier','Staff','Contractor','Utility','Other')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Cheque' CHECK (payment_method IN ('Cheque','Bank Transfer','Cash','M-Pesa','RTGS','EFT')),
  cheque_number VARCHAR(100),
  bank_name VARCHAR(200),
  account_number VARCHAR(100),
  reference_number VARCHAR(200),
  vote_head VARCHAR(200),
  budget_vote_id INTEGER,
  po_id INTEGER,
  invoice_id INTEGER,
  supplier_id INTEGER,
  -- Approval
  status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft','Pending Approval','Approved','Paid','Rejected','Cancelled','Void')),
  prepared_by VARCHAR(200),
  prepared_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by VARCHAR(200),
  approved_at TIMESTAMPTZ,
  paid_by VARCHAR(200),
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Tracking
  school_id INTEGER,
  term_id INTEGER,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. school_income_records (all school income) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.school_income_records (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(50) UNIQUE,
  income_date DATE DEFAULT CURRENT_DATE,
  income_type VARCHAR(100) NOT NULL CHECK (income_type IN (
    'Capitation Grant','NG-CDF Bursary','County Bursary','Tuition Fees',
    'Boarding Fees','Activity Fees','Exam Fees','Admission Fees',
    'Transport Fees','Uniform Sales','Book Sales','Canteen',
    'Hire of Facilities','Donation','Other'
  )),
  source VARCHAR(300) NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Bank Transfer','Cheque','Cash','M-Pesa','RTGS','EFT')),
  reference_number VARCHAR(200),
  bank_name VARCHAR(200),
  vote_head VARCHAR(200),
  -- Student link (optional)
  student_id INTEGER,
  -- Term/Year
  term_id INTEGER,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  -- Verification
  received_by VARCHAR(200),
  verified_by VARCHAR(200),
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  school_id INTEGER,
  created_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. school_expense_vouchers (all school expenses) ──────────────────────
CREATE TABLE IF NOT EXISTS public.school_expense_vouchers (
  id SERIAL PRIMARY KEY,
  expense_number VARCHAR(50) UNIQUE,
  expense_date DATE DEFAULT CURRENT_DATE,
  expense_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) DEFAULT 'Operations',
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Cheque',
  reference_number VARCHAR(200),
  vendor VARCHAR(300),
  vote_head VARCHAR(200),
  payment_voucher_id INTEGER REFERENCES public.school_payment_vouchers(id),
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Paid','Rejected')),
  approved_by VARCHAR(200),
  approved_at TIMESTAMPTZ,
  term_id INTEGER,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  school_id INTEGER,
  created_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. school_store_audit_log (full audit trail) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.school_store_audit_log (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'ITEM_ADDED','ITEM_UPDATED','ITEM_DELETED',
    'ISSUANCE_REQUESTED','ISSUANCE_APPROVED','ISSUANCE_REJECTED','ISSUANCE_COMPLETED',
    'GRN_CREATED','GRN_AUTHORIZED','GRN_RECEIVED',
    'VOUCHER_CREATED','VOUCHER_APPROVED','VOUCHER_PAID',
    'INCOME_RECORDED','STOCK_ADJUSTED','LOW_STOCK_ALERT'
  )),
  table_name VARCHAR(100),
  record_id INTEGER,
  record_ref VARCHAR(100),
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  actor VARCHAR(200),
  actor_role VARCHAR(100),
  ip_address VARCHAR(50),
  school_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. Indexes for performance ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_issuances_status ON public.school_store_issuances(status);
CREATE INDEX IF NOT EXISTS idx_store_issuances_item ON public.school_store_issuances(item_id);
CREATE INDEX IF NOT EXISTS idx_store_issuances_date ON public.school_store_issuances(requested_at);
CREATE INDEX IF NOT EXISTS idx_store_purchases_item ON public.school_store_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_status ON public.school_store_purchases(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON public.school_payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON public.school_payment_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_income_records_date ON public.school_income_records(income_date);
CREATE INDEX IF NOT EXISTS idx_income_records_type ON public.school_income_records(income_type);
CREATE INDEX IF NOT EXISTS idx_store_audit_log_date ON public.school_store_audit_log(created_at);

-- ─── 10. RLS Policies ──────────────────────────────────────────────────────
ALTER TABLE public.school_store_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_store_issuance_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_store_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_expense_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_store_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_all_issuances" ON public.school_store_issuances FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_issuances" ON public.school_store_issuances FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_approvals" ON public.school_store_issuance_approvals FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_approvals" ON public.school_store_issuance_approvals FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_purchases" ON public.school_store_purchases FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_purchases" ON public.school_store_purchases FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_vouchers" ON public.school_payment_vouchers FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_vouchers" ON public.school_payment_vouchers FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_income" ON public.school_income_records FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_income" ON public.school_income_records FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_expense" ON public.school_expense_vouchers FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_expense" ON public.school_expense_vouchers FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_audit" ON public.school_store_audit_log FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_audit" ON public.school_store_audit_log FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_store_items" ON public.school_store_items FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_store_items" ON public.school_store_items FOR ALL TO service_role USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

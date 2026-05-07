-- ─── Fee Defaulter Automation Schema ───
-- Table: school_fee_defaulter_rules
-- Stores escalation steps for automated fee demand communications

CREATE TABLE IF NOT EXISTS school_fee_defaulter_rules (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 5),
    days_offset INTEGER NOT NULL,  -- negative = before due date, positive = after due date
    message_template TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('SMS', 'WhatsApp', 'Both')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, step_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_defaulter_rules_tenant ON school_fee_defaulter_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_defaulter_rules_step ON school_fee_defaulter_rules (tenant_id, step_number);
CREATE INDEX IF NOT EXISTS idx_fee_defaulter_rules_active ON school_fee_defaulter_rules (tenant_id, is_active);

-- Row Level Security
ALTER TABLE school_fee_defaulter_rules ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON school_fee_defaulter_rules
    FOR ALL USING (true);

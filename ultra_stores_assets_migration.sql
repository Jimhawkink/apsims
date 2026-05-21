-- ============================================================
-- APSIMS ULTRA: Stores GRN + Asset Management Tables (FIXED)
-- Run on Supabase SQL Editor
-- ============================================================

-- 1. GOODS RECEIVED NOTES (GRN)
CREATE TABLE IF NOT EXISTS school_store_purchases (
    id SERIAL PRIMARY KEY,
    item_id INTEGER,
    item_name VARCHAR(200),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2) DEFAULT 0,
    total_cost NUMERIC(12,2) DEFAULT 0,
    supplier VARCHAR(200),
    invoice_ref VARCHAR(100),
    received_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE school_store_purchases ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Allow all for school_store_purchases" ON school_store_purchases;
CREATE POLICY "Allow all for school_store_purchases" ON school_store_purchases FOR ALL USING (true) WITH CHECK (true);

-- 2. Add missing columns to store items
DO $$ BEGIN ALTER TABLE school_store_items ADD COLUMN IF NOT EXISTS purpose VARCHAR(200); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_store_items ADD COLUMN IF NOT EXISTS is_kitchen BOOLEAN DEFAULT FALSE; EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Add missing columns to store issuances
DO $$ BEGIN ALTER TABLE school_store_issuances ADD COLUMN IF NOT EXISTS purpose VARCHAR(200); EXCEPTION WHEN others THEN NULL; END $$;

-- 4. ADD MISSING COLUMNS TO school_assets (if table already exists)
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS barcode VARCHAR(100); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS purchase_date DATE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) DEFAULT 0; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS current_value NUMERIC(12,2) DEFAULT 0; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS warranty_expiry DATE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(200); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC(5,2) DEFAULT 10; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS insurance_value NUMERIC(12,2) DEFAULT 0; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS photo_url TEXT; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS last_maintenance_date DATE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS next_maintenance_date DATE; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS description TEXT; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS supplier VARCHAR(200); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS notes TEXT; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE school_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN others THEN NULL; END $$;

-- 5. ASSET MAINTENANCE LOG
CREATE TABLE IF NOT EXISTS school_asset_maintenance (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER,
    maintenance_type VARCHAR(50) DEFAULT 'Repair',
    description TEXT,
    cost NUMERIC(12,2) DEFAULT 0,
    performed_by VARCHAR(200),
    vendor VARCHAR(200),
    maintenance_date DATE DEFAULT CURRENT_DATE,
    next_due_date DATE,
    status VARCHAR(20) DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE school_asset_maintenance ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Allow all for school_asset_maintenance" ON school_asset_maintenance;
CREATE POLICY "Allow all for school_asset_maintenance" ON school_asset_maintenance FOR ALL USING (true) WITH CHECK (true);

-- 6. ASSET DISPOSAL LOG
CREATE TABLE IF NOT EXISTS school_asset_disposals (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER,
    asset_name VARCHAR(300),
    disposal_type VARCHAR(30) DEFAULT 'Sale',
    disposal_date DATE DEFAULT CURRENT_DATE,
    disposal_value NUMERIC(12,2) DEFAULT 0,
    buyer_name VARCHAR(200),
    reason TEXT,
    approved_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE school_asset_disposals ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Allow all for school_asset_disposals" ON school_asset_disposals;
CREATE POLICY "Allow all for school_asset_disposals" ON school_asset_disposals FOR ALL USING (true) WITH CHECK (true);

-- Done! All columns added safely.

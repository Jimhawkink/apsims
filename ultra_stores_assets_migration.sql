-- ============================================================
-- APSIMS ULTRA: Stores GRN + Asset Management Tables  
-- Run on Supabase SQL Editor
-- ============================================================

-- 1. GOODS RECEIVED NOTES (GRN)
CREATE TABLE IF NOT EXISTS school_store_purchases (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES school_store_items(id) ON DELETE SET NULL,
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

ALTER TABLE school_store_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_store_purchases" ON school_store_purchases FOR ALL USING (true) WITH CHECK (true);

-- 2. Add purpose column to issuances if not exists
DO $$ BEGIN
    ALTER TABLE school_store_issuances ADD COLUMN IF NOT EXISTS purpose VARCHAR(200);
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Add is_kitchen flag to store items
DO $$ BEGIN
    ALTER TABLE school_store_items ADD COLUMN IF NOT EXISTS is_kitchen BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4. ULTRA ASSET REGISTER
CREATE TABLE IF NOT EXISTS school_assets (
    id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE,
    asset_name VARCHAR(300) NOT NULL,
    category VARCHAR(50) DEFAULT 'Furniture', -- Furniture, Electronics, Vehicles, Lab Equipment, Sports, Kitchen, Office, ICT, Musical, Buildings
    description TEXT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_price NUMERIC(12,2) DEFAULT 0,
    current_value NUMERIC(12,2) DEFAULT 0,
    supplier VARCHAR(200),
    warranty_expiry DATE,
    location VARCHAR(200),
    assigned_to VARCHAR(200),
    condition VARCHAR(20) DEFAULT 'Good', -- Excellent, Good, Fair, Poor, Damaged, Disposed
    status VARCHAR(20) DEFAULT 'Active', -- Active, Under Repair, Disposed, Lost, Donated
    depreciation_rate NUMERIC(5,2) DEFAULT 10, -- Annual % depreciation
    insurance_value NUMERIC(12,2) DEFAULT 0,
    barcode VARCHAR(100),
    photo_url TEXT,
    notes TEXT,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_category ON school_assets(category);
CREATE INDEX IF NOT EXISTS idx_asset_status ON school_assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_location ON school_assets(location);

ALTER TABLE school_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_assets" ON school_assets FOR ALL USING (true) WITH CHECK (true);

-- 5. ASSET MAINTENANCE LOG
CREATE TABLE IF NOT EXISTS school_asset_maintenance (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES school_assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) DEFAULT 'Repair', -- Repair, Service, Inspection, Replacement
    description TEXT,
    cost NUMERIC(12,2) DEFAULT 0,
    performed_by VARCHAR(200),
    vendor VARCHAR(200),
    maintenance_date DATE DEFAULT CURRENT_DATE,
    next_due_date DATE,
    status VARCHAR(20) DEFAULT 'Completed', -- Scheduled, In Progress, Completed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_asset_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_asset_maintenance" ON school_asset_maintenance FOR ALL USING (true) WITH CHECK (true);

-- 6. ASSET DISPOSAL LOG
CREATE TABLE IF NOT EXISTS school_asset_disposals (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES school_assets(id) ON DELETE SET NULL,
    asset_name VARCHAR(300),
    disposal_type VARCHAR(30) DEFAULT 'Sale', -- Sale, Donation, Scrap, Write-off
    disposal_date DATE DEFAULT CURRENT_DATE,
    disposal_value NUMERIC(12,2) DEFAULT 0,
    buyer_name VARCHAR(200),
    reason TEXT,
    approved_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_asset_disposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_asset_disposals" ON school_asset_disposals FOR ALL USING (true) WITH CHECK (true);

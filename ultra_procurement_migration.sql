-- ============================================================
-- APSIMS ULTRA: Procurement & Supplier Management Tables
-- Run on Supabase SQL Editor
-- ============================================================

-- 1. SUPPLIERS DIRECTORY
CREATE TABLE IF NOT EXISTS school_suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(150),
    kra_pin VARCHAR(20),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_branch VARCHAR(100),
    address TEXT,
    category VARCHAR(50) DEFAULT 'General', -- General, Stationery, Food, Cleaning, Lab, Uniforms, Construction, IT, Fuel, Medical
    rating INTEGER DEFAULT 3, -- 1-5
    status VARCHAR(20) DEFAULT 'Active', -- Active, Blacklisted, Inactive
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_suppliers" ON school_suppliers FOR ALL USING (true) WITH CHECK (true);

-- 2. PURCHASE ORDERS (LPOs)
CREATE TABLE IF NOT EXISTS school_purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL, -- LPO-2026-00001
    supplier_id INTEGER REFERENCES school_suppliers(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Approved, Sent, Partial, Delivered, Cancelled
    total_amount NUMERIC(12,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    delivery_address TEXT,
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON school_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON school_purchase_orders(status);

ALTER TABLE school_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_purchase_orders" ON school_purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- 3. PO LINE ITEMS
CREATE TABLE IF NOT EXISTS school_po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES school_purchase_orders(id) ON DELETE CASCADE,
    item_description VARCHAR(300) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(30) DEFAULT 'Pieces',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    received_qty NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_po_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_po_items" ON school_po_items FOR ALL USING (true) WITH CHECK (true);

-- 4. SUPPLIER INVOICES
CREATE TABLE IF NOT EXISTS school_supplier_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INTEGER REFERENCES school_suppliers(id) ON DELETE SET NULL,
    po_id INTEGER REFERENCES school_purchase_orders(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Partial, Paid, Overdue, Disputed, Voided
    category VARCHAR(50),
    description TEXT,
    attachment_url TEXT,
    verified_by VARCHAR(100),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sinv_supplier ON school_supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sinv_status ON school_supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sinv_due ON school_supplier_invoices(due_date);

ALTER TABLE school_supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_supplier_invoices" ON school_supplier_invoices FOR ALL USING (true) WITH CHECK (true);

-- 5. SUPPLIER PAYMENTS
CREATE TABLE IF NOT EXISTS school_supplier_payments (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES school_suppliers(id) ON DELETE SET NULL,
    invoice_id INTEGER REFERENCES school_supplier_invoices(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) DEFAULT 'Bank Transfer', -- Bank Transfer, Cheque, M-Pesa, Cash, EFT
    reference_number VARCHAR(100), -- Cheque no, M-Pesa code, EFT ref
    bank_name VARCHAR(100),
    approved_by VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spay_supplier ON school_supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spay_invoice ON school_supplier_payments(invoice_id);

ALTER TABLE school_supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_supplier_payments" ON school_supplier_payments FOR ALL USING (true) WITH CHECK (true);

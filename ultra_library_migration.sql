-- ============================================================
-- APSIMS ULTRA: Library Management Tables
-- Run on Supabase SQL Editor
-- ============================================================

-- 1. LIBRARY BOOKS CATALOG
CREATE TABLE IF NOT EXISTS school_library_books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300),
    isbn VARCHAR(20),
    barcode VARCHAR(100),
    genre VARCHAR(50) DEFAULT 'Fiction',
    publisher VARCHAR(200),
    publish_year VARCHAR(10),
    copies_total INTEGER DEFAULT 1,
    copies_available INTEGER DEFAULT 1,
    shelf_location VARCHAR(50),
    condition VARCHAR(20) DEFAULT 'Good', -- Excellent, Good, Fair, Poor, Damaged
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_isbn ON school_library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_library_barcode ON school_library_books(barcode);
CREATE INDEX IF NOT EXISTS idx_library_genre ON school_library_books(genre);

ALTER TABLE school_library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_library_books" ON school_library_books FOR ALL USING (true) WITH CHECK (true);

-- 2. LIBRARY CHECKOUTS (Issue/Return)
CREATE TABLE IF NOT EXISTS school_library_checkouts (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES school_library_books(id) ON DELETE SET NULL,
    book_title VARCHAR(500),
    borrower_name VARCHAR(200) NOT NULL,
    borrower_type VARCHAR(20) DEFAULT 'Student', -- Student, Teacher, Staff, Other
    borrower_id VARCHAR(50),
    checkout_date TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,
    returned_at TIMESTAMPTZ,
    return_condition VARCHAR(20),
    fine_amount NUMERIC(10,2) DEFAULT 0,
    fine_paid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_book ON school_library_checkouts(book_id);
CREATE INDEX IF NOT EXISTS idx_checkout_borrower ON school_library_checkouts(borrower_name);
CREATE INDEX IF NOT EXISTS idx_checkout_returned ON school_library_checkouts(returned_at);
CREATE INDEX IF NOT EXISTS idx_checkout_due ON school_library_checkouts(due_date);

ALTER TABLE school_library_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_library_checkouts" ON school_library_checkouts FOR ALL USING (true) WITH CHECK (true);

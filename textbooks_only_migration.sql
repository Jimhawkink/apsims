-- Run this ONLY for the digital textbooks table (already ran the rest)
CREATE TABLE IF NOT EXISTS school_digital_textbooks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200),
  publisher VARCHAR(200),
  edition VARCHAR(50),
  isbn VARCHAR(20),
  subject_id INTEGER REFERENCES school_subjects(id),
  form_id INTEGER REFERENCES school_forms(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(20) DEFAULT 'PDF',
  file_size_mb NUMERIC(8,2),
  cover_image_url TEXT,
  description TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(200),
  downloads INTEGER DEFAULT 0,
  uploaded_by VARCHAR(200) NOT NULL,
  tenant_id INTEGER REFERENCES school_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_digital_textbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_digital_textbooks" ON school_digital_textbooks FOR ALL USING (true) WITH CHECK (true);

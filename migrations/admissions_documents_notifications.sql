-- ================================================================
-- APSIMS Online Admissions: Document Upload + Notification System
-- Run this in your Supabase SQL Editor
-- ================================================================

-- 1. Document uploads table
CREATE TABLE IF NOT EXISTS school_admission_documents (
  id             BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES school_admission_applications(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  document_type  TEXT NOT NULL, -- 'Birth Certificate','KCPE Result Slip','Passport Photo','Medical Report','Other'
  document_name  TEXT NOT NULL,
  file_url       TEXT,
  file_size      BIGINT,
  mime_type      TEXT,
  uploaded_by    TEXT DEFAULT 'Applicant',
  uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
  verified       BOOLEAN DEFAULT FALSE,
  verified_at    TIMESTAMPTZ,
  verified_by    TEXT,
  verification_notes TEXT
);

-- 2. Notifications (school ↔ applicant messaging)
CREATE TABLE IF NOT EXISTS school_admission_notifications (
  id             BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES school_admission_applications(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  sender_type    TEXT NOT NULL CHECK (sender_type IN ('applicant','school')),
  message_type   TEXT NOT NULL DEFAULT 'general',
  -- message_type: 'document_upload' | 'doc_acknowledged' | 'status_update' | 'general' | 'request_docs'
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  is_read_by_admin   BOOLEAN DEFAULT FALSE,
  is_read_by_applicant BOOLEAN DEFAULT FALSE,
  admin_read_at  TIMESTAMPTZ,
  applicant_read_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_admission_docs_app    ON school_admission_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_docs_ref    ON school_admission_documents(reference_number);
CREATE INDEX IF NOT EXISTS idx_admission_notif_app   ON school_admission_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_notif_ref   ON school_admission_notifications(reference_number);
CREATE INDEX IF NOT EXISTS idx_admission_notif_type  ON school_admission_notifications(sender_type, is_read_by_admin);

-- 4. RLS (open for applicant via reference_number, admin via session)
ALTER TABLE school_admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admission_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_docs_all"   ON school_admission_documents       FOR ALL USING (true);
CREATE POLICY "service_role_notif_all"  ON school_admission_notifications    FOR ALL USING (true);

-- 5. Add document_submitted_at column to applications (for quick badge check)
ALTER TABLE school_admission_applications 
  ADD COLUMN IF NOT EXISTS last_document_upload_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS document_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS docs_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS docs_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS docs_acknowledged_by TEXT;

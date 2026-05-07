-- ============================================================
-- APSIMS Online Admissions Schema
-- ============================================================

-- Admission applications (public-facing)
CREATE TABLE IF NOT EXISTS school_admission_applications (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL,
  reference_number      TEXT NOT NULL UNIQUE,
  student_first_name    TEXT NOT NULL,
  student_middle_name   TEXT,
  student_last_name     TEXT NOT NULL,
  date_of_birth         DATE NOT NULL,
  gender                TEXT NOT NULL CHECK (gender IN ('Male','Female')),
  previous_school       TEXT,
  kcpe_index_number     TEXT NOT NULL,
  kcpe_total_marks      INTEGER CHECK (kcpe_total_marks >= 0 AND kcpe_total_marks <= 500),
  form_applied_for      INTEGER REFERENCES school_forms(id),
  guardian_full_name    TEXT NOT NULL,
  guardian_phone        TEXT NOT NULL,
  guardian_email        TEXT,
  guardian_national_id  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'Submitted'
                          CHECK (status IN ('Submitted','Under Review','Approved','Rejected','Waitlisted')),
  review_notes          TEXT,
  reviewed_by           INTEGER REFERENCES school_users(id),
  reviewed_at           TIMESTAMPTZ,
  converted_student_id  INTEGER REFERENCES school_students(id),
  sms_sent              BOOLEAN DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, kcpe_index_number)
);

CREATE INDEX IF NOT EXISTS idx_admission_apps_tenant     ON school_admission_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admission_apps_status     ON school_admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_apps_ref        ON school_admission_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_admission_apps_kcpe       ON school_admission_applications(kcpe_index_number);

-- Supporting documents per application
CREATE TABLE IF NOT EXISTS school_admission_documents (
  id               SERIAL PRIMARY KEY,
  application_id   INTEGER NOT NULL REFERENCES school_admission_applications(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL CHECK (document_type IN ('birth_certificate','kcpe_slip','passport_photo')),
  file_url         TEXT NOT NULL,
  file_name        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admission_docs_application ON school_admission_documents(application_id);

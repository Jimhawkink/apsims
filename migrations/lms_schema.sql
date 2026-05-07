-- ============================================================
-- APSIMS LMS / E-Learning Module Schema
-- ============================================================

-- Resource library: lesson notes, PDFs, Word docs, video links
CREATE TABLE IF NOT EXISTS school_lms_resources (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  subject_id      INTEGER REFERENCES school_subjects(id) ON DELETE SET NULL,
  form_id         INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
  topic_name      TEXT NOT NULL,
  resource_title  TEXT NOT NULL,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('PDF','Word','Video Link','Other')),
  file_url        TEXT,
  video_url       TEXT,
  upload_date     DATE DEFAULT CURRENT_DATE,
  uploaded_by     INTEGER REFERENCES school_users(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_resources_tenant     ON school_lms_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_resources_subject    ON school_lms_resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_lms_resources_form       ON school_lms_resources(form_id);
CREATE INDEX IF NOT EXISTS idx_lms_resources_type       ON school_lms_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_lms_resources_active     ON school_lms_resources(is_active);

-- Access logs: track when students view/download resources
CREATE TABLE IF NOT EXISTS school_lms_resource_access_logs (
  id           SERIAL PRIMARY KEY,
  resource_id  INTEGER NOT NULL REFERENCES school_lms_resources(id) ON DELETE CASCADE,
  student_id   INTEGER REFERENCES school_students(id) ON DELETE SET NULL,
  accessed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_access_logs_resource ON school_lms_resource_access_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_lms_access_logs_student  ON school_lms_resource_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_access_logs_time     ON school_lms_resource_access_logs(accessed_at);

-- Assignments created by teachers
CREATE TABLE IF NOT EXISTS school_lms_assignments (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  subject_id      INTEGER REFERENCES school_subjects(id) ON DELETE SET NULL,
  form_id         INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
  stream_id       INTEGER REFERENCES school_streams(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        TIMESTAMPTZ NOT NULL,
  max_marks       INTEGER NOT NULL DEFAULT 100,
  attachment_url  TEXT,
  created_by      INTEGER REFERENCES school_users(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_assignments_tenant   ON school_lms_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_subject  ON school_lms_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_form     ON school_lms_assignments(form_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_stream   ON school_lms_assignments(stream_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_due      ON school_lms_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_active   ON school_lms_assignments(is_active);

-- Student submissions for assignments
CREATE TABLE IF NOT EXISTS school_lms_submissions (
  id               SERIAL PRIMARY KEY,
  assignment_id    INTEGER NOT NULL REFERENCES school_lms_assignments(id) ON DELETE CASCADE,
  student_id       INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  submission_text  TEXT,
  file_url         TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  is_late          BOOLEAN DEFAULT FALSE,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_submissions_assignment ON school_lms_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_lms_submissions_student    ON school_lms_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_submissions_submitted  ON school_lms_submissions(submitted_at);

-- Grades awarded by teachers for submissions
CREATE TABLE IF NOT EXISTS school_lms_grades (
  id               SERIAL PRIMARY KEY,
  submission_id    INTEGER NOT NULL REFERENCES school_lms_submissions(id) ON DELETE CASCADE UNIQUE,
  marks_awarded    INTEGER NOT NULL,
  teacher_comments TEXT,
  graded_by        INTEGER REFERENCES school_users(id) ON DELETE SET NULL,
  graded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_grades_submission ON school_lms_grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_lms_grades_graded_by  ON school_lms_grades(graded_by);

-- ══════════════════════════════════════════════════════════════════
-- Add Teacher Support to Portal Users
-- ══════════════════════════════════════════════════════════════════

-- 1. Add linked_teacher_id column
ALTER TABLE school_portal_users 
  ADD COLUMN IF NOT EXISTS linked_teacher_id INTEGER REFERENCES school_teachers(id) ON DELETE CASCADE;

-- 2. Index for fast teacher lookups
CREATE INDEX IF NOT EXISTS idx_portal_users_teacher ON school_portal_users(linked_teacher_id);

-- 3. Update user_type check comment (parent, student, teacher now supported)
COMMENT ON COLUMN school_portal_users.user_type IS 'parent, student, or teacher';

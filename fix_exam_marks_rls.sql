-- ============================================================
-- FIX: Allow anon key to INSERT and UPDATE school_exam_marks
-- This is required for the mobile app (APSIMS) which uses the
-- anon key directly to save teacher-entered marks.
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Drop the blocking deny policies first (they were set in security_rls_policies.sql)
DROP POLICY IF EXISTS "deny_anon_insert_exam_marks" ON public.school_exam_marks;
DROP POLICY IF EXISTS "deny_anon_update_exam_marks" ON public.school_exam_marks;
DROP POLICY IF EXISTS "deny_anon_delete_exam_marks" ON public.school_exam_marks;

-- Allow anon to INSERT marks (teachers entering marks via mobile/web)
DO $$ BEGIN
  CREATE POLICY "anon_insert_exam_marks"
    ON public.school_exam_marks
    FOR INSERT TO anon
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow anon to UPDATE marks (teachers editing existing marks)
DO $$ BEGIN
  CREATE POLICY "anon_update_exam_marks"
    ON public.school_exam_marks
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Keep SELECT open (already set in security_rls_policies.sql)
-- "anon_read_exam_marks" policy already exists — no change needed

-- Verify policies are in place
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'school_exam_marks'
ORDER BY cmd;

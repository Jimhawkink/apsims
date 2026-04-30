-- Quick fix: Grant anon access to all scheme-related tables
-- Run this in Supabase SQL Editor

-- Disable RLS on reference tables (public curriculum data, no sensitive info)
ALTER TABLE school_cbc_learning_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_strands DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_sub_strands DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_learning_outcomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_topics DISABLE ROW LEVEL SECURITY;

-- Add anon policies for scheme tables
DO $$ BEGIN CREATE POLICY "Anon can view schemes" ON school_schemes_of_work FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can insert schemes" ON school_schemes_of_work FOR INSERT TO anon WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can update schemes" ON school_schemes_of_work FOR UPDATE TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can delete schemes" ON school_schemes_of_work FOR DELETE TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Anon full access weeks" ON school_scheme_weeks FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon full access lessons" ON school_scheme_lessons FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon full access resources" ON school_scheme_resources FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon full access remarks" ON school_scheme_remarks FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Also ensure anon can read school_subjects, school_forms, school_terms, school_teachers
DO $$ BEGIN CREATE POLICY "Anon read subjects" ON school_subjects FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon read forms" ON school_forms FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon read terms" ON school_terms FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon read teachers" ON school_teachers FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

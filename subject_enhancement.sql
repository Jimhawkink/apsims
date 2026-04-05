-- ============================================================
-- APSIMS: Subject Enhancement Migration
-- Adds initials, max_score to subjects; stream_id, teacher_initials to subject_teachers
-- Run this on Supabase SQL Editor
-- ============================================================

-- Add new columns to school_subjects
DO $$ BEGIN
  ALTER TABLE school_subjects ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
  ALTER TABLE school_subjects ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100;
  ALTER TABLE school_subjects ADD COLUMN IF NOT EXISTS group_number INTEGER;
END $$;

-- Add new columns to school_subject_teachers
DO $$ BEGIN
  ALTER TABLE school_subject_teachers ADD COLUMN IF NOT EXISTS stream_id INTEGER REFERENCES school_streams(id) ON DELETE SET NULL;
  ALTER TABLE school_subject_teachers ADD COLUMN IF NOT EXISTS teacher_initials VARCHAR(10);
END $$;

-- Update existing subjects with KNEC codes and initials
UPDATE school_subjects SET subject_code = '121', initials = '121', category = 'Compulsory' WHERE subject_name = 'Mathematics' AND (subject_code IS NULL OR subject_code = 'MATH');
UPDATE school_subjects SET subject_code = '101', initials = '101', category = 'Compulsory' WHERE subject_name = 'English' AND (subject_code IS NULL OR subject_code = 'ENG');
UPDATE school_subjects SET subject_code = '102', initials = '102', category = 'Compulsory' WHERE subject_name = 'Kiswahili' AND (subject_code IS NULL OR subject_code = 'KIS');
UPDATE school_subjects SET subject_code = '231', initials = '231', category = 'Science' WHERE subject_name = 'Biology' AND (subject_code IS NULL OR subject_code = 'BIO');
UPDATE school_subjects SET subject_code = '232', initials = '232', category = 'Science' WHERE subject_name = 'Physics' AND (subject_code IS NULL OR subject_code = 'PHY');
UPDATE school_subjects SET subject_code = '233', initials = '233', category = 'Science' WHERE subject_name = 'Chemistry' AND (subject_code IS NULL OR subject_code = 'CHEM');
UPDATE school_subjects SET subject_code = '311', initials = '311', category = 'Humanities' WHERE subject_name ILIKE '%History%' AND (subject_code IS NULL OR subject_code = 'HIST');
UPDATE school_subjects SET subject_code = '312', initials = '312', category = 'Humanities' WHERE subject_name = 'Geography' AND (subject_code IS NULL OR subject_code = 'GEO');
UPDATE school_subjects SET subject_code = '313', initials = '313', category = 'Humanities' WHERE subject_name = 'CRE' AND (subject_code IS NULL OR subject_code = 'CRE');
UPDATE school_subjects SET subject_code = '314', initials = '314', category = 'Humanities' WHERE subject_name = 'IRE' AND (subject_code IS NULL OR subject_code = 'IRE');
UPDATE school_subjects SET subject_code = '565', initials = '565', category = 'Applied' WHERE subject_name ILIKE '%Business%' AND (subject_code IS NULL OR subject_code = 'BUS');
UPDATE school_subjects SET subject_code = '443', initials = '443', category = 'Technical' WHERE subject_name = 'Agriculture' AND (subject_code IS NULL OR subject_code = 'AGR');
UPDATE school_subjects SET subject_code = '451', initials = '451', category = 'Technical' WHERE subject_name ILIKE '%Computer%' AND (subject_code IS NULL OR subject_code = 'COMP');
UPDATE school_subjects SET subject_code = '441', initials = '441', category = 'Technical' WHERE subject_name ILIKE '%Home Science%' AND (subject_code IS NULL OR subject_code = 'HOME');
UPDATE school_subjects SET subject_code = '442', initials = '442', category = 'Technical' WHERE subject_name ILIKE '%Art%' AND (subject_code IS NULL OR subject_code = 'ART');
UPDATE school_subjects SET subject_code = '501', initials = '501', category = 'Languages' WHERE subject_name = 'French' AND (subject_code IS NULL OR subject_code = 'FRE');
UPDATE school_subjects SET subject_code = '502', initials = '502', category = 'Languages' WHERE subject_name = 'German' AND (subject_code IS NULL OR subject_code = 'GER');
UPDATE school_subjects SET subject_code = '511', initials = '511', category = 'Creative' WHERE subject_name = 'Music' AND (subject_code IS NULL OR subject_code = 'MUS');

-- Set default max_score to 100 for all subjects that don't have it
UPDATE school_subjects SET max_score = 100 WHERE max_score IS NULL;

-- Done!
SELECT 'Migration complete! Subjects enhanced with KNEC codes and initials.' AS status;

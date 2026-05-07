-- ============================================================
-- ADD GRADE 11 AND GRADE 12 FORMS (CBC Senior School)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add Grade 11
INSERT INTO school_forms (form_name, form_level, description, is_active, education_system)
VALUES ('Grade 11', 11, 'CBC Senior School — Second Year (2027 Cohort)', true, 'CBC_Senior_School')
ON CONFLICT (form_name) DO UPDATE SET
    form_level       = 11,
    description      = 'CBC Senior School — Second Year (2027 Cohort)',
    is_active        = true,
    education_system = 'CBC_Senior_School';

-- Add Grade 12
INSERT INTO school_forms (form_name, form_level, description, is_active, education_system)
VALUES ('Grade 12', 12, 'CBC Senior School — Final Year (2028 Cohort)', true, 'CBC_Senior_School')
ON CONFLICT (form_name) DO UPDATE SET
    form_level       = 12,
    description      = 'CBC Senior School — Final Year (2028 Cohort)',
    is_active        = true,
    education_system = 'CBC_Senior_School';

-- Verify all forms
SELECT id, form_name, form_level, education_system, is_active
FROM school_forms
ORDER BY form_level;

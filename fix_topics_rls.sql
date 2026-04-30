-- Fix: Ensure Agriculture topics exist AND are readable
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on topics table (public reference data)
ALTER TABLE school_topics DISABLE ROW LEVEL SECURITY;

-- 2. Add unique constraint if missing (needed for ON CONFLICT)
DO $$ BEGIN
    ALTER TABLE school_topics ADD CONSTRAINT school_topics_unique UNIQUE (subject_id, topic_name, form_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Insert Agriculture topics (safe upsert)
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order, is_active) VALUES
    -- Form 1
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Introduction to Agriculture', 'AG1-01', (SELECT id FROM school_forms WHERE form_name = 'Form 1' OR form_name = 'Form 1 East' OR form_level = 1 LIMIT 1), 1, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Factors Influencing Agriculture', 'AG1-02', (SELECT id FROM school_forms WHERE form_name = 'Form 1' OR form_name = 'Form 1 East' OR form_level = 1 LIMIT 1), 2, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Crop Production I', 'AG1-03', (SELECT id FROM school_forms WHERE form_name = 'Form 1' OR form_name = 'Form 1 East' OR form_level = 1 LIMIT 1), 3, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Livestock Production I', 'AG1-04', (SELECT id FROM school_forms WHERE form_name = 'Form 1' OR form_name = 'Form 1 East' OR form_level = 1 LIMIT 1), 4, true),
    -- Form 2
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Soil & Water Conservation', 'AG2-01', (SELECT id FROM school_forms WHERE form_name = 'Form 2' OR form_name = 'Form 2 East' OR form_level = 2 LIMIT 1), 1, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Weed & Pest Control', 'AG2-02', (SELECT id FROM school_forms WHERE form_name = 'Form 2' OR form_name = 'Form 2 East' OR form_level = 2 LIMIT 1), 2, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Farm Structures', 'AG2-03', (SELECT id FROM school_forms WHERE form_name = 'Form 2' OR form_name = 'Form 2 East' OR form_level = 2 LIMIT 1), 3, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Crop Production II', 'AG2-04', (SELECT id FROM school_forms WHERE form_name = 'Form 2' OR form_name = 'Form 2 East' OR form_level = 2 LIMIT 1), 4, true),
    -- Form 3
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Agricultural Economics', 'AG3-01', (SELECT id FROM school_forms WHERE form_name = 'Form 3' OR form_name = 'Form 3 East' OR form_level = 3 LIMIT 1), 1, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Land Preparation', 'AG3-02', (SELECT id FROM school_forms WHERE form_name = 'Form 3' OR form_name = 'Form 3 East' OR form_level = 3 LIMIT 1), 2, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Planting & Nursery Practices', 'AG3-03', (SELECT id FROM school_forms WHERE form_name = 'Form 3' OR form_name = 'Form 3 East' OR form_level = 3 LIMIT 1), 3, true),
    -- Form 4
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Crop Production IV', 'AG4-01', (SELECT id FROM school_forms WHERE form_name = 'Form 4' OR form_name = 'Form 4 East' OR form_level = 4 LIMIT 1), 1, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Livestock Production IV', 'AG4-02', (SELECT id FROM school_forms WHERE form_name = 'Form 4' OR form_name = 'Form 4 East' OR form_level = 4 LIMIT 1), 2, true),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Farm Power & Machinery', 'AG4-03', (SELECT id FROM school_forms WHERE form_name = 'Form 4' OR form_name = 'Form 4 East' OR form_level = 4 LIMIT 1), 3, true)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- 4. Verify: check what topics exist
SELECT t.id, t.topic_name, t.topic_code, f.form_name, s.subject_name
FROM school_topics t
JOIN school_subjects s ON s.id = t.subject_id
LEFT JOIN school_forms f ON f.id = t.form_id
WHERE s.subject_name = 'Agriculture'
ORDER BY t.topic_code;

-- 5. Also disable RLS on other reference tables if not done
ALTER TABLE school_cbc_learning_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_strands DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_sub_strands DISABLE ROW LEVEL SECURITY;

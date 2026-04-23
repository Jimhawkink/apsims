-- ══════════════════════════════════════════════════════════════════════════════
-- SCHEMES OF WORK MIGRATION — AlphaSchool (Kenya CBC + 8-4-4)
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════
-- PART 1: SCHEMES OF WORK TABLES
-- ════════════════════════════════════════════════════════════

-- Main scheme header
CREATE TABLE IF NOT EXISTS school_schemes_of_work (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES school_teachers(id) ON DELETE SET NULL,
    curriculum_type VARCHAR(10) NOT NULL DEFAULT 'CBC',
    strand_id INTEGER REFERENCES school_cbc_strands(id) ON DELETE SET NULL,
    sub_strand_id INTEGER REFERENCES school_cbc_sub_strands(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    total_lessons INTEGER DEFAULT 0,
    total_weeks INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Draft',
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, form_id, term_id, curriculum_type)
);

-- Scheme weeks
CREATE TABLE IF NOT EXISTS school_scheme_weeks (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    week_title VARCHAR(200),
    start_date DATE,
    end_date DATE,
    is_holiday BOOLEAN DEFAULT FALSE,
    is_midterm BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, week_number)
);

-- Scheme lessons (detailed CBC/8-4-4 lesson plan)
CREATE TABLE IF NOT EXISTS school_scheme_lessons (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES school_scheme_weeks(id) ON DELETE CASCADE,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    lesson_title VARCHAR(300) NOT NULL,
    sub_strand_id INTEGER REFERENCES school_cbc_sub_strands(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    learning_outcomes TEXT[] DEFAULT '{}',
    key_inquiry_questions TEXT[] DEFAULT '{}',
    learning_activities TEXT[] DEFAULT '{}',
    learning_resources TEXT[] DEFAULT '{}',
    assessment_methods TEXT[] DEFAULT '{}',
    core_competencies TEXT[] DEFAULT '{}',
    values TEXT[] DEFAULT '{}',
    links_to_other_subjects TEXT[] DEFAULT '{}',
    community_service_learning TEXT,
    non_formal_activity TEXT,
    lesson_duration_minutes INTEGER DEFAULT 40,
    is_double_lesson BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson resources (detailed)
CREATE TABLE IF NOT EXISTS school_scheme_resources (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES school_scheme_lessons(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_title VARCHAR(200) NOT NULL,
    resource_details TEXT,
    is_digital BOOLEAN DEFAULT FALSE,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheme remarks / reflections
CREATE TABLE IF NOT EXISTS school_scheme_remarks (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    week_id INTEGER REFERENCES school_scheme_weeks(id) ON DELETE SET NULL,
    lesson_id INTEGER REFERENCES school_scheme_lessons(id) ON DELETE SET NULL,
    remark_type VARCHAR(30) DEFAULT 'weekly',
    remark_text TEXT NOT NULL,
    challenges TEXT,
    improvements TEXT,
    recorded_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schemes_subject ON school_schemes_of_work(subject_id);
CREATE INDEX IF NOT EXISTS idx_schemes_form ON school_schemes_of_work(form_id);
CREATE INDEX IF NOT EXISTS idx_schemes_term ON school_schemes_of_work(term_id);
CREATE INDEX IF NOT EXISTS idx_scheme_weeks_scheme ON school_scheme_weeks(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_lessons_scheme ON school_scheme_lessons(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_lessons_week ON school_scheme_lessons(week_id);
CREATE INDEX IF NOT EXISTS idx_scheme_resources_lesson ON school_scheme_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scheme_remarks_scheme ON school_scheme_remarks(scheme_id);

-- RLS
ALTER TABLE school_schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_scheme_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_scheme_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_scheme_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_scheme_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schemes" ON school_schemes_of_work FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert schemes" ON school_schemes_of_work FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update schemes" ON school_schemes_of_work FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete schemes" ON school_schemes_of_work FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users full access weeks" ON school_scheme_weeks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access lessons" ON school_scheme_lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access resources" ON school_scheme_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access remarks" ON school_scheme_remarks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════
-- PART 2: KENYA CBC LEARNING AREAS
-- ════════════════════════════════════════════════════════════

INSERT INTO school_subjects (subject_name, subject_code, category, is_active) VALUES
    ('Mathematics', '121', 'Compulsory', true),
    ('English', '101', 'Compulsory', true),
    ('Kiswahili', '102', 'Compulsory', true),
    ('Integrated Science', '231', 'Science', true),
    ('Health Education', '232', 'Science', true),
    ('Pre-Technical Studies', '443', 'Technical', true),
    ('Social Studies', '311', 'Humanities', true),
    ('Religious Education', '313', 'Humanities', true),
    ('Creative Arts', '442', 'Creative', true),
    ('Physical Education', '441', 'Creative', true),
    ('Agriculture', '443', 'Technical', true),
    ('Computer Studies', '451', 'Technical', true),
    ('Life Skills', '999', 'Compulsory', true),
    ('Biology', '231', 'Science', true),
    ('Physics', '232', 'Science', true),
    ('Chemistry', '233', 'Science', true),
    ('History & Government', '311', 'Humanities', true),
    ('Geography', '312', 'Humanities', true),
    ('CRE', '313', 'Humanities', true),
    ('Business Studies', '565', 'Applied', true),
    ('Home Science', '441', 'Technical', true)
ON CONFLICT (subject_name) DO NOTHING;

INSERT INTO school_cbc_learning_areas (area_name, area_code, description, sort_order) VALUES
    ('Mathematics', 'MATH', 'Mathematics — Junior Secondary CBC', 1),
    ('English', 'ENG', 'English — Junior Secondary CBC', 2),
    ('Kiswahili', 'KISW', 'Kiswahili — Junior Secondary CBC', 3),
    ('Integrated Science', 'IS', 'Integrated Science — Junior Secondary CBC', 4),
    ('Health Education', 'HE', 'Health Education — Junior Secondary CBC', 5),
    ('Pre-Technical Studies', 'PTS', 'Pre-Technical Studies — Junior Secondary CBC', 6),
    ('Social Studies', 'SS', 'Social Studies — Junior Secondary CBC', 7),
    ('Religious Education', 'RE', 'Religious Education — Junior Secondary CBC', 8),
    ('Creative Arts & Sports', 'CAS', 'Creative Arts & Sports — Junior Secondary CBC', 9),
    ('Life Skills Education', 'LSE', 'Life Skills Education — Junior Secondary CBC', 10)
ON CONFLICT (area_name) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- PART 3: CBC STRANDS (using area_name lookups + ON CONFLICT DO UPDATE)
-- ════════════════════════════════════════════════════════════

-- First, fix any existing strands that may lack strand_code
UPDATE school_cbc_strands s SET strand_code = sub.code
FROM (VALUES
    ('Mathematics','Numbers','M-NUM'),('Mathematics','Algebra','M-ALG'),('Mathematics','Measurement','M-MEA'),
    ('Mathematics','Geometry','M-GEO'),('Mathematics','Data Handling & Probability','M-DAT'),
    ('English','Listening & Speaking','E-LS'),('English','Reading','E-RD'),('English','Writing','E-WR'),
    ('English','Grammar in Use','E-GU'),('English','Literature','E-LIT'),
    ('Kiswahili','Kusikiliza na Kusema','K-KS'),('Kiswahili','Kusoma','K-KU'),
    ('Kiswahili','Kuandika','K-KA'),('Kiswahili','Sarufi','K-SA'),('Kiswahili','Fasihi','K-FA'),
    ('Integrated Science','Scientific Investigation','IS-SI'),('Integrated Science','Matter','IS-MT'),
    ('Integrated Science','Force & Energy','IS-FE'),('Integrated Science','Earth & Space','IS-ES'),
    ('Integrated Science','Living Things','IS-LT'),('Integrated Science','Ecology','IS-EC'),
    ('Social Studies','People & Population','SS-PP'),('Social Studies','Resources & Economic Activities','SS-RE'),
    ('Social Studies','Political Development & Governance','SS-PG'),
    ('Social Studies','Social Interactions & Cultural Heritage','SS-SC'),
    ('Social Studies','Devolution & Governance','SS-DG'),
    ('Health Education','Health & Wellness','HE-HW'),('Health Education','Nutrition','HE-NU'),
    ('Health Education','First Aid','HE-FA'),('Health Education','Substance Abuse','HE-SA'),
    ('Health Education','Reproductive Health','HE-RH'),
    ('Pre-Technical Studies','Safety & Security','PTS-SS'),('Pre-Technical Studies','Tools & Equipment','PTS-TE'),
    ('Pre-Technical Studies','Materials','PTS-MA'),('Pre-Technical Studies','Drawing & Design','PTS-DD'),
    ('Pre-Technical Studies','Entrepreneurship','PTS-EN'),
    ('Creative Arts & Sports','Visual Arts','CAS-VA'),('Creative Arts & Sports','Performing Arts','CAS-PA'),
    ('Creative Arts & Sports','Physical Education','CAS-PE'),('Creative Arts & Sports','Sports & Games','CAS-SG'),
    ('Religious Education','Creation','RE-CR'),('Religious Education','Faith & Worship','RE-FW'),
    ('Religious Education','Morality','RE-MO'),('Religious Education','Contemporary Living','RE-CL'),
    ('Life Skills Education','Self-Awareness','LSE-SA'),('Life Skills Education','Self-Management','LSE-SM'),
    ('Life Skills Education','Social Relationships','LSE-SR'),('Life Skills Education','Decision Making','LSE-DM'),
    ('Life Skills Education','Effective Communication','LSE-EC')
) AS sub(area_name, strand_name, code)
JOIN school_cbc_learning_areas la ON la.area_name = sub.area_name
WHERE s.learning_area_id = la.id AND s.strand_name = sub.strand_name AND (s.strand_code IS NULL OR s.strand_code = '');

-- Now insert strands (upsert to ensure codes are set)
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    -- Mathematics
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Mathematics'), 'Numbers', 'M-NUM', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Mathematics'), 'Algebra', 'M-ALG', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Mathematics'), 'Measurement', 'M-MEA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Mathematics'), 'Geometry', 'M-GEO', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Mathematics'), 'Data Handling & Probability', 'M-DAT', 5),
    -- English
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'English'), 'Listening & Speaking', 'E-LS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'English'), 'Reading', 'E-RD', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'English'), 'Writing', 'E-WR', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'English'), 'Grammar in Use', 'E-GU', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'English'), 'Literature', 'E-LIT', 5),
    -- Kiswahili
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Kiswahili'), 'Kusikiliza na Kusema', 'K-KS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Kiswahili'), 'Kusoma', 'K-KU', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Kiswahili'), 'Kuandika', 'K-KA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Kiswahili'), 'Sarufi', 'K-SA', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Kiswahili'), 'Fasihi', 'K-FA', 5),
    -- Integrated Science
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Scientific Investigation', 'IS-SI', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Matter', 'IS-MT', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Force & Energy', 'IS-FE', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Earth & Space', 'IS-ES', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Living Things', 'IS-LT', 5),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Integrated Science'), 'Ecology', 'IS-EC', 6),
    -- Social Studies
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Social Studies'), 'People & Population', 'SS-PP', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Social Studies'), 'Resources & Economic Activities', 'SS-RE', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Social Studies'), 'Political Development & Governance', 'SS-PG', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Social Studies'), 'Social Interactions & Cultural Heritage', 'SS-SC', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Social Studies'), 'Devolution & Governance', 'SS-DG', 5),
    -- Health Education
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Health Education'), 'Health & Wellness', 'HE-HW', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Health Education'), 'Nutrition', 'HE-NU', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Health Education'), 'First Aid', 'HE-FA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Health Education'), 'Substance Abuse', 'HE-SA', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Health Education'), 'Reproductive Health', 'HE-RH', 5),
    -- Pre-Technical Studies
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Pre-Technical Studies'), 'Safety & Security', 'PTS-SS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Pre-Technical Studies'), 'Tools & Equipment', 'PTS-TE', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Pre-Technical Studies'), 'Materials', 'PTS-MA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Pre-Technical Studies'), 'Drawing & Design', 'PTS-DD', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Pre-Technical Studies'), 'Entrepreneurship', 'PTS-EN', 5),
    -- Creative Arts & Sports
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Creative Arts & Sports'), 'Visual Arts', 'CAS-VA', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Creative Arts & Sports'), 'Performing Arts', 'CAS-PA', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Creative Arts & Sports'), 'Physical Education', 'CAS-PE', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Creative Arts & Sports'), 'Sports & Games', 'CAS-SG', 4),
    -- Religious Education
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Religious Education'), 'Creation', 'RE-CR', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Religious Education'), 'Faith & Worship', 'RE-FW', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Religious Education'), 'Morality', 'RE-MO', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Religious Education'), 'Contemporary Living', 'RE-CL', 4),
    -- Life Skills Education
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Life Skills Education'), 'Self-Awareness', 'LSE-SA', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Life Skills Education'), 'Self-Management', 'LSE-SM', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Life Skills Education'), 'Social Relationships', 'LSE-SR', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Life Skills Education'), 'Decision Making', 'LSE-DM', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_name = 'Life Skills Education'), 'Effective Communication', 'LSE-EC', 5)
ON CONFLICT (learning_area_id, strand_name) DO UPDATE SET strand_code = EXCLUDED.strand_code, sort_order = EXCLUDED.sort_order;

-- ════════════════════════════════════════════════════════════
-- PART 4: CBC SUB-STRANDS (using JOIN on area_name + strand_name)
-- ════════════════════════════════════════════════════════════

-- Mathematics Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Whole Numbers', 'M-NUM-WN', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Fractions', 'M-NUM-FR', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Decimals', 'M-NUM-DC', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Percentages', 'M-NUM-PC', 4),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Integers', 'M-NUM-INT', 5),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Numbers'), 'Ratios & Proportions', 'M-NUM-RP', 6),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Algebra'), 'Algebraic Expressions', 'M-ALG-AE', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Algebra'), 'Linear Equations', 'M-ALG-LE', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Algebra'), 'Inequalities', 'M-ALG-IN', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Length', 'M-MEA-LN', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Area', 'M-MEA-AR', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Volume & Capacity', 'M-MEA-VC', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Mass', 'M-MEA-MS', 4),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Time', 'M-MEA-TM', 5),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Measurement'), 'Money', 'M-MEA-MN', 6),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Geometry'), 'Angles', 'M-GEO-AN', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Geometry'), 'Geometrical Constructions', 'M-GEO-GC', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Geometry'), 'Transformation', 'M-GEO-TR', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Geometry'), 'Coordinates & Graphs', 'M-GEO-CG', 4),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Data Handling & Probability'), 'Data Representation', 'M-DAT-DR', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Data Handling & Probability'), 'Probability', 'M-DAT-PR', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Mathematics' AND s.strand_name = 'Data Handling & Probability'), 'Statistics', 'M-DAT-ST', 3)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- English Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Listening & Speaking'), 'Listening Comprehension', 'E-LS-LC', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Listening & Speaking'), 'Oral Presentations', 'E-LS-OP', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Listening & Speaking'), 'Conversations & Discussions', 'E-LS-CD', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Reading'), 'Comprehension', 'E-RD-CO', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Reading'), 'Study Skills', 'E-RD-SS', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Reading'), 'Extensive Reading', 'E-RD-ER', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Writing'), 'Functional Writing', 'E-WR-FW', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Writing'), 'Creative Writing', 'E-WR-CW', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Writing'), 'Summary Writing', 'E-WR-SW', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Grammar in Use'), 'Word Formation', 'E-GU-WF', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Grammar in Use'), 'Sentence Construction', 'E-GU-SC', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Grammar in Use'), 'Punctuation & Spelling', 'E-GU-PS', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Literature'), 'Poetry', 'E-LIT-PO', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Literature'), 'Short Stories', 'E-LIT-SS', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'English' AND s.strand_name = 'Literature'), 'Novels & Plays', 'E-LIT-NP', 3)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- Integrated Science Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Scientific Investigation'), 'Laboratory Safety', 'IS-SI-LS', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Scientific Investigation'), 'Scientific Method', 'IS-SI-SM', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Scientific Investigation'), 'Measurement', 'IS-SI-MS', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Matter'), 'States of Matter', 'IS-MT-SM', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Matter'), 'Mixtures & Compounds', 'IS-MT-MC', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Matter'), 'Atoms & Elements', 'IS-MT-AE', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Force', 'IS-FE-FO', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Magnetism', 'IS-FE-MG', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Electricity', 'IS-FE-EL', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Light', 'IS-FE-LI', 4),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Sound', 'IS-FE-SO', 5),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Force & Energy'), 'Heat', 'IS-FE-HT', 6),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Living Things'), 'Cells', 'IS-LT-CL', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Living Things'), 'Human Body Systems', 'IS-LT-HB', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Living Things'), 'Reproduction', 'IS-LT-RP', 3),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Living Things'), 'Classification', 'IS-LT-CF', 4),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Ecology'), 'Ecosystems', 'IS-EC-ES', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Ecology'), 'Environmental Conservation', 'IS-EC-EC', 2),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Earth & Space'), 'Solar System', 'IS-ES-SS', 1),
    ((SELECT s.id FROM school_cbc_strands s JOIN school_cbc_learning_areas la ON s.learning_area_id = la.id WHERE la.area_name = 'Integrated Science' AND s.strand_name = 'Earth & Space'), 'Weather & Climate', 'IS-ES-WC', 2)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- PART 5: 8-4-4 SENIOR SCHOOL TOPICS (Form 1-4)
-- ════════════════════════════════════════════════════════════

-- Mathematics 8-4-4 Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Numbers & Numeration', 'M1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Fractions & Decimals', 'M1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Approximation & Errors', 'M1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Ratio & Proportion', 'M1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Percentages & Profit', 'M1-05', (SELECT id FROM school_forms WHERE form_level = 1), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Algebraic Expressions', 'M1-06', (SELECT id FROM school_forms WHERE form_level = 1), 6),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Linear Equations', 'M1-07', (SELECT id FROM school_forms WHERE form_level = 1), 7),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Length & Area', 'M1-08', (SELECT id FROM school_forms WHERE form_level = 1), 8),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Geometric Constructions', 'M1-09', (SELECT id FROM school_forms WHERE form_level = 1), 9),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Angle Properties', 'M1-10', (SELECT id FROM school_forms WHERE form_level = 1), 10),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Data Representation', 'M1-11', (SELECT id FROM school_forms WHERE form_level = 1), 11),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Commercial Arithmetic', 'M2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Quadratic Expressions', 'M2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Simultaneous Equations', 'M2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Circles & Volumes', 'M2-04', (SELECT id FROM school_forms WHERE form_level = 2), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Matrices & Transformations', 'M2-05', (SELECT id FROM school_forms WHERE form_level = 2), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Trigonometry', 'M3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Quadratic Equations', 'M3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Probability', 'M3-03', (SELECT id FROM school_forms WHERE form_level = 3), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Statistics', 'M3-04', (SELECT id FROM school_forms WHERE form_level = 3), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Differentiation', 'M4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Integration', 'M4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Binomial Expansion', 'M4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Mathematics'), 'Vectors', 'M4-04', (SELECT id FROM school_forms WHERE form_level = 4), 4)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- English 8-4-4 Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Comprehension Skills', 'E1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Functional Writing', 'E1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Creative Writing', 'E1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Grammar & Vocabulary', 'E1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Oral Skills', 'E1-05', (SELECT id FROM school_forms WHERE form_level = 1), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Poetry', 'E1-06', (SELECT id FROM school_forms WHERE form_level = 1), 6),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'The Novel', 'E1-07', (SELECT id FROM school_forms WHERE form_level = 1), 7),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Drama', 'E1-08', (SELECT id FROM school_forms WHERE form_level = 1), 8),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Summary Writing', 'E2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'English'), 'Note-Making', 'E2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Biology 8-4-4 Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Introduction to Biology', 'B1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Classification I', 'B1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'The Cell', 'B1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Physiology & Nutrition', 'B1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Respiration', 'B1-05', (SELECT id FROM school_forms WHERE form_level = 1), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Transport in Plants & Animals', 'B2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Gaseous Exchange', 'B2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Excretion', 'B2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Reproduction', 'B3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Ecology', 'B3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Genetics', 'B4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Evolution', 'B4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Biology'), 'Response & Support', 'B4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Chemistry 8-4-4 Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Introduction to Chemistry', 'C1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Matter & Its Properties', 'C1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Classification of Matter', 'C1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Water', 'C1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Atomic Structure', 'C2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Chemical Bonding', 'C2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Structure & Bonding', 'C2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Salts', 'C2-04', (SELECT id FROM school_forms WHERE form_level = 2), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Organic Chemistry I', 'C3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Moles & Stoichiometry', 'C3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Electrochemistry', 'C4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Organic Chemistry II', 'C4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Rates of Reaction', 'C4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Chemistry'), 'Equilibrium', 'C4-04', (SELECT id FROM school_forms WHERE form_level = 4), 4)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Physics 8-4-4 Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Introduction to Physics', 'P1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Measurement I', 'P1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Force', 'P1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Work, Energy & Power', 'P1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Current Electricity', 'P2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Magnetism', 'P2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Measurement II', 'P2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Waves', 'P3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Refraction of Light', 'P3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Thin Lenses', 'P3-03', (SELECT id FROM school_forms WHERE form_level = 3), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Electromagnetic Induction', 'P4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Radioactivity', 'P4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Physics'), 'Electronics', 'P4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- History & Government Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Introduction to History', 'H1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Early Man', 'H1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Development of Agriculture', 'H1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'People & Population', 'H1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Social & Economic Developments', 'H1-05', (SELECT id FROM school_forms WHERE form_level = 1), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'National Integration', 'H2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Trade', 'H2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Development of Transport', 'H2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Development of Industry', 'H2-04', (SELECT id FROM school_forms WHERE form_level = 2), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Political Development & Struggle', 'H3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Rise of African Nationalism', 'H3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'World Wars', 'H3-03', (SELECT id FROM school_forms WHERE form_level = 3), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'International Relations', 'H4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'Cooperation in Africa', 'H4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'History & Government'), 'National Philosophy', 'H4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Geography Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Introduction to Geography', 'G1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'The Earth & Solar System', 'G1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Weather & Climate', 'G1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Statistical Methods', 'G1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Map Work', 'G1-05', (SELECT id FROM school_forms WHERE form_level = 1), 5),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Internal Land-Forming Processes', 'G2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'External Land-Forming Processes', 'G2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Population', 'G3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Settlement', 'G3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Management & Conservation of Environment', 'G4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Industry', 'G4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Trade', 'G4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Geography'), 'Transport & Communication', 'G4-04', (SELECT id FROM school_forms WHERE form_level = 4), 4)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Agriculture Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Introduction to Agriculture', 'AG1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Factors Influencing Agriculture', 'AG1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Crop Production', 'AG1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Livestock Production', 'AG1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Soil & Water Conservation', 'AG2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Weed & Pest Control', 'AG2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Farm Structures', 'AG2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Agricultural Economics', 'AG3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Land Preparation', 'AG3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Planting & Nursery Practices', 'AG3-03', (SELECT id FROM school_forms WHERE form_level = 3), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Crop Production IV', 'AG4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Livestock Production IV', 'AG4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Agriculture'), 'Farm Power & Machinery', 'AG4-03', (SELECT id FROM school_forms WHERE form_level = 4), 3)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Business Studies Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Introduction to Business', 'BS1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Business Environment', 'BS1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Entrepreneurship', 'BS1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Business Organizations', 'BS1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Government & Business', 'BS2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Production', 'BS2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Marketing', 'BS3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Insurance', 'BS3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Accounting', 'BS4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Business Studies'), 'Financial Statements', 'BS4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- CRE Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'Creation & Fall of Man', 'CRE1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'Faith & Gods Promises', 'CRE1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'The Sinai Covenant', 'CRE1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'Leadership in Israel', 'CRE1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'The Kingdom of God', 'CRE2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'The Prophets of Israel', 'CRE2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'The Life & Ministry of Jesus', 'CRE3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'The Sermon on the Mount', 'CRE3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'Christian Ethics', 'CRE4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'CRE'), 'Contemporary Christian Living', 'CRE4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Home Science Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Introduction to Home Science', 'HS1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Nutrition & Meal Planning', 'HS1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Textiles & Clothing', 'HS1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'First Aid & Home Nursing', 'HS1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Food Preparation & Preservation', 'HS2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Laundry & Home Care', 'HS2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Consumer Education', 'HS3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Child Development', 'HS3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Interior Decoration', 'HS4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Home Science'), 'Family & Community Health', 'HS4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

-- Computer Studies Topics
INSERT INTO school_topics (subject_id, topic_name, topic_code, form_id, sort_order) VALUES
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Introduction to Computers', 'CS1-01', (SELECT id FROM school_forms WHERE form_level = 1), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Computer Hardware', 'CS1-02', (SELECT id FROM school_forms WHERE form_level = 1), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Operating Systems', 'CS1-03', (SELECT id FROM school_forms WHERE form_level = 1), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Word Processing', 'CS1-04', (SELECT id FROM school_forms WHERE form_level = 1), 4),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Spreadsheets', 'CS2-01', (SELECT id FROM school_forms WHERE form_level = 2), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Database Management', 'CS2-02', (SELECT id FROM school_forms WHERE form_level = 2), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Desktop Publishing', 'CS2-03', (SELECT id FROM school_forms WHERE form_level = 2), 3),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Programming', 'CS3-01', (SELECT id FROM school_forms WHERE form_level = 3), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Data Security & Ethics', 'CS3-02', (SELECT id FROM school_forms WHERE form_level = 3), 2),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Networking & Internet', 'CS4-01', (SELECT id FROM school_forms WHERE form_level = 4), 1),
    ((SELECT id FROM school_subjects WHERE subject_name = 'Computer Studies'), 'Systems Development', 'CS4-02', (SELECT id FROM school_forms WHERE form_level = 4), 2)
ON CONFLICT (subject_id, topic_name, form_id) DO NOTHING;

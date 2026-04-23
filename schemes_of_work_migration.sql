-- ============================================================
-- ALPHA SCHOOL — SCHEMES OF WORK MODULE
-- Based on Kenya CBC (Competency Based Curriculum) & 8-4-4 Syllabus
-- Run this on Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- PART 1: SCHEMES OF WORK TABLES
-- ════════════════════════════════════════════════════════════

-- 1a. Schemes of Work (main header — one per subject per term per form)
CREATE TABLE IF NOT EXISTS school_schemes_of_work (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES school_forms(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES school_teachers(id) ON DELETE SET NULL,
    curriculum_type VARCHAR(10) NOT NULL DEFAULT 'CBC',
        -- CBC, 8-4-4
    strand_id INTEGER REFERENCES school_cbc_strands(id) ON DELETE SET NULL,
    sub_strand_id INTEGER REFERENCES school_cbc_sub_strands(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    total_lessons INTEGER DEFAULT 0,
    total_weeks INTEGER DEFAULT 14,
    status VARCHAR(20) DEFAULT 'Draft',
        -- Draft, Active, Completed, Archived
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, form_id, term_id, strand_id, sub_strand_id, topic_id)
);

-- 1b. Scheme Weeks (each week within a scheme)
CREATE TABLE IF NOT EXISTS school_scheme_weeks (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    week_title VARCHAR(300),
    start_date DATE,
    end_date DATE,
    is_holiday BOOLEAN DEFAULT false,
    is_midterm BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, week_number)
);

-- 1c. Scheme Lessons (individual lessons within each week)
CREATE TABLE IF NOT EXISTS school_scheme_lessons (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES school_scheme_weeks(id) ON DELETE CASCADE,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    lesson_title VARCHAR(300) NOT NULL,
    sub_strand_id INTEGER REFERENCES school_cbc_sub_strands(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    learning_outcomes TEXT[],
        -- Array of specific outcomes for this lesson
    key_inquiry_questions TEXT[],
        -- CBC key inquiry questions
    learning_activities TEXT[],
        -- Teaching/learning activities
    learning_resources TEXT[],
        -- Materials, textbooks, digital resources
    assessment_methods TEXT[],
        -- How learning will be assessed
    core_competencies TEXT[],
        -- CBC core competencies: Communication, Collaboration, Critical Thinking, Creativity, Citizenship, Self-Efficacy, Digital Literacy
    values TEXT[],
        -- CBC values: Love, Responsibility, Respect, Unity, Peace, Patriotism, Integrity
    links_to_other_subjects TEXT[],
        -- Cross-curricular links
    community_service_learning TEXT,
        -- CBC community service learning activities
    non_formal_activity TEXT,
        -- CBC non-formal activity
    lesson_duration_minutes INTEGER DEFAULT 40,
    is_double_lesson BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_id, lesson_number)
);

-- 1d. Scheme Lesson Resources (detailed resource linking)
CREATE TABLE IF NOT EXISTS school_scheme_resources (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES school_scheme_lessons(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
        -- textbook, worksheet, digital, apparatus, chart, realia, video, reference_book
    resource_title VARCHAR(300) NOT NULL,
    resource_details TEXT,
    is_digital BOOLEAN DEFAULT false,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1e. Scheme Remarks / Reflections (teacher reflections after lessons)
CREATE TABLE IF NOT EXISTS school_scheme_remarks (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES school_schemes_of_work(id) ON DELETE CASCADE,
    week_id INTEGER REFERENCES school_scheme_weeks(id) ON DELETE SET NULL,
    lesson_id INTEGER REFERENCES school_scheme_lessons(id) ON DELETE SET NULL,
    remark_type VARCHAR(30) NOT NULL DEFAULT 'weekly',
        -- weekly, lesson, term, hod_review
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
CREATE INDEX IF NOT EXISTS idx_schemes_status ON school_schemes_of_work(status);
CREATE INDEX IF NOT EXISTS idx_scheme_weeks_scheme ON school_scheme_weeks(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_lessons_week ON school_scheme_lessons(week_id);
CREATE INDEX IF NOT EXISTS idx_scheme_lessons_scheme ON school_scheme_lessons(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_resources_lesson ON school_scheme_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scheme_remarks_scheme ON school_scheme_remarks(scheme_id);

-- RLS
ALTER TABLE school_schemes_of_work ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_schemes_of_work" ON school_schemes_of_work FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_scheme_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_scheme_weeks" ON school_scheme_weeks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_scheme_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_scheme_lessons" ON school_scheme_lessons FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_scheme_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_scheme_resources" ON school_scheme_resources FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_scheme_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_scheme_remarks" ON school_scheme_remarks FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- PART 2: KENYA CBC LEARNING AREAS & STRANDS DATA
-- (Junior Secondary: Grade 7, 8, 9 mapped to Forms 1, 2, 3)
-- ════════════════════════════════════════════════════════════

-- Ensure core subjects exist
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

-- CBC Learning Areas for Junior Secondary (Grades 7-9)
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
-- PART 3: CBC STRANDS & SUB-STRANDS DATA
-- ════════════════════════════════════════════════════════════

-- Mathematics Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Numbers', 'M-NUM', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Algebra', 'M-ALG', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Measurement', 'M-MEA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Geometry', 'M-GEO', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Data Handling & Probability', 'M-DAT', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Mathematics Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    -- Numbers
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Whole Numbers', 'M-NUM-WN', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Fractions', 'M-NUM-FR', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Decimals', 'M-NUM-DC', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Percentages', 'M-NUM-PC', 4),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Integers', 'M-NUM-INT', 5),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-NUM'), 'Ratios & Proportions', 'M-NUM-RP', 6),
    -- Algebra
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-ALG'), 'Algebraic Expressions', 'M-ALG-AE', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-ALG'), 'Linear Equations', 'M-ALG-LE', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-ALG'), 'Inequalities', 'M-ALG-IN', 3),
    -- Measurement
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Length', 'M-MEA-LN', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Area', 'M-MEA-AR', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Volume & Capacity', 'M-MEA-VC', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Mass', 'M-MEA-MS', 4),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Time', 'M-MEA-TM', 5),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-MEA'), 'Money', 'M-MEA-MN', 6),
    -- Geometry
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-GEO'), 'Angles', 'M-GEO-AN', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-GEO'), 'Geometrical Constructions', 'M-GEO-GC', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-GEO'), 'Transformation', 'M-GEO-TR', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-GEO'), 'Coordinates & Graphs', 'M-GEO-CG', 4),
    -- Data Handling
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-DAT'), 'Data Representation', 'M-DAT-DR', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-DAT'), 'Probability', 'M-DAT-PR', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'M-DAT'), 'Statistics', 'M-DAT-ST', 3)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- English Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Listening & Speaking', 'E-LS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Reading', 'E-RD', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Writing', 'E-WR', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Grammar in Use', 'E-GU', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Literature', 'E-LIT', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- English Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    -- Listening & Speaking
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LS'), 'Listening Comprehension', 'E-LS-LC', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LS'), 'Oral Presentations', 'E-LS-OP', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LS'), 'Conversations & Discussions', 'E-LS-CD', 3),
    -- Reading
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-RD'), 'Comprehension', 'E-RD-CO', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-RD'), 'Study Skills', 'E-RD-SS', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-RD'), 'Extensive Reading', 'E-RD-ER', 3),
    -- Writing
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-WR'), 'Functional Writing', 'E-WR-FW', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-WR'), 'Creative Writing', 'E-WR-CW', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-WR'), 'Summary Writing', 'E-WR-SW', 3),
    -- Grammar
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-GU'), 'Word Formation', 'E-GU-WF', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-GU'), 'Sentence Construction', 'E-GU-SC', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-GU'), 'Punctuation & Spelling', 'E-GU-PS', 3),
    -- Literature
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LIT'), 'Poetry', 'E-LIT-PO', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LIT'), 'Short Stories', 'E-LIT-SS', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'E-LIT'), 'Novels & Plays', 'E-LIT-NP', 3)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- Kiswahili Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'KISW'), 'Kusikiliza na Kusema', 'K-KS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'KISW'), 'Kusoma', 'K-KU', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'KISW'), 'Kuandika', 'K-KA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'KISW'), 'Sarufi', 'K-SA', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'KISW'), 'Fasihi', 'K-FA', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Integrated Science Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Scientific Investigation', 'IS-SI', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Matter', 'IS-MT', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Force & Energy', 'IS-FE', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Earth & Space', 'IS-ES', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Living Things', 'IS-LT', 5),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'IS'), 'Ecology', 'IS-EC', 6)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Integrated Science Sub-Strands
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    -- Scientific Investigation
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-SI'), 'Laboratory Safety', 'IS-SI-LS', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-SI'), 'Scientific Method', 'IS-SI-SM', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-SI'), 'Measurement', 'IS-SI-MS', 3),
    -- Matter
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-MT'), 'States of Matter', 'IS-MT-SM', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-MT'), 'Mixtures & Compounds', 'IS-MT-MC', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-MT'), 'Atoms & Elements', 'IS-MT-AE', 3),
    -- Force & Energy
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Force', 'IS-FE-FO', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Magnetism', 'IS-FE-MG', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Electricity', 'IS-FE-EL', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Light', 'IS-FE-LI', 4),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Sound', 'IS-FE-SO', 5),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-FE'), 'Heat', 'IS-FE-HT', 6),
    -- Living Things
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-LT'), 'Cells', 'IS-LT-CL', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-LT'), 'Human Body Systems', 'IS-LT-HB', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-LT'), 'Reproduction', 'IS-LT-RP', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-LT'), 'Classification', 'IS-LT-CF', 4),
    -- Ecology
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-EC'), 'Ecosystems', 'IS-EC-ES', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-EC'), 'Environmental Conservation', 'IS-EC-EC', 2),
    -- Earth & Space
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-ES'), 'Solar System', 'IS-ES-SS', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'IS-ES'), 'Weather & Climate', 'IS-ES-WC', 2)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- Social Studies Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SS'), 'People & Population', 'SS-PP', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SS'), 'Resources & Economic Activities', 'SS-RE', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SS'), 'Political Development & Governance', 'SS-PG', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SS'), 'Social Interactions & Cultural Heritage', 'SS-SC', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SS'), 'Devolution & Governance', 'SS-DG', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Health Education Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'HE'), 'Health & Wellness', 'HE-HW', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'HE'), 'Nutrition', 'HE-NU', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'HE'), 'First Aid', 'HE-FA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'HE'), 'Substance Abuse', 'HE-SA', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'HE'), 'Reproductive Health', 'HE-RH', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Pre-Technical Studies Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'PTS'), 'Safety & Security', 'PTS-SS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'PTS'), 'Tools & Equipment', 'PTS-TE', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'PTS'), 'Materials', 'PTS-MA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'PTS'), 'Drawing & Design', 'PTS-DD', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'PTS'), 'Entrepreneurship', 'PTS-EN', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Creative Arts & Sports Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'CAS'), 'Visual Arts', 'CAS-VA', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'CAS'), 'Performing Arts', 'CAS-PA', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'CAS'), 'Physical Education', 'CAS-PE', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'CAS'), 'Sports & Games', 'CAS-SG', 4)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Religious Education Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'RE'), 'Creation', 'RE-CR', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'RE'), 'Faith & Worship', 'RE-FW', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'RE'), 'Morality', 'RE-MO', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'RE'), 'Contemporary Living', 'RE-CL', 4)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Life Skills Education Strands
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'LSE'), 'Self-Awareness', 'LSE-SA', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'LSE'), 'Self-Management', 'LSE-SM', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'LSE'), 'Social Relationships', 'LSE-SR', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'LSE'), 'Decision Making', 'LSE-DM', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'LSE'), 'Effective Communication', 'LSE-EC', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- PART 4: 8-4-4 SENIOR SCHOOL TOPICS (Form 1-4)
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

-- ============================================================
-- ALPHA SCHOOL — ULTRA FEATURES MIGRATION
-- 1. Question Bank & Exam Paper Generation
-- 2. AI-Assisted Question Generation (metadata tables)
-- 3. CBC Competency Tracking (Strands, Sub-Strands, Outcomes, Assessments)
-- Run this on Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- PART 1: QUESTION BANK & EXAM PAPER GENERATION
-- ════════════════════════════════════════════════════════════

-- 1a. Topics/Chapters per subject
CREATE TABLE IF NOT EXISTS school_topics (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
    topic_name VARCHAR(200) NOT NULL,
    topic_code VARCHAR(20),
    form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, topic_name, form_id)
);

-- 1b. Question Bank
CREATE TABLE IF NOT EXISTS school_question_bank (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
        -- multiple_choice, true_false, short_answer, essay, fill_blank, matching
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
        -- easy, medium, hard
    marks NUMERIC(5,2) NOT NULL DEFAULT 1,
    options JSONB,
        -- For MCQ: [{"key":"A","value":"..."},{"key":"B","value":"..."},...]
    correct_answer TEXT,
    explanation TEXT,
    blooms_level VARCHAR(30),
        -- remember, understand, apply, analyze, evaluate, create
    source VARCHAR(50) DEFAULT 'manual',
        -- manual, ai_generated, imported
    ai_model VARCHAR(50),
        -- openai-gpt4, gemini-pro, etc. (if AI-generated)
    ai_prompt_used TEXT,
    is_approved BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. Exam Papers (generated or manual)
CREATE TABLE IF NOT EXISTS school_exam_papers (
    id SERIAL PRIMARY KEY,
    paper_title VARCHAR(300) NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
    form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    term_id INTEGER REFERENCES school_terms(id) ON DELETE SET NULL,
    exam_type_id INTEGER REFERENCES school_exam_types(id) ON DELETE SET NULL,
    total_marks NUMERIC(6,2) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60,
    instructions TEXT,
    paper_content JSONB,
        -- Ordered array of question references + layout info
    paper_type VARCHAR(30) DEFAULT 'teacher_created',
        -- teacher_created, ai_generated, auto_generated
    status VARCHAR(20) DEFAULT 'Draft',
        -- Draft, Published, Archived
    is_printable BOOLEAN DEFAULT true,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1d. Exam Paper Questions (linking table with order)
CREATE TABLE IF NOT EXISTS school_exam_paper_questions (
    id SERIAL PRIMARY KEY,
    paper_id INTEGER NOT NULL REFERENCES school_exam_papers(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES school_question_bank(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL DEFAULT 1,
    marks_override NUMERIC(5,2),
    section_label VARCHAR(100),
        -- e.g. "Section A", "Section B"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(paper_id, question_id)
);

-- Indexes for question bank performance
CREATE INDEX IF NOT EXISTS idx_qb_subject ON school_question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_qb_topic ON school_question_bank(topic_id);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON school_question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_type ON school_question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_qb_source ON school_question_bank(source);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON school_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_subject ON school_exam_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper ON school_exam_paper_questions(paper_id);

-- RLS for Question Bank tables
ALTER TABLE school_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_topics" ON school_topics FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_question_bank" ON school_question_bank FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_exam_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_exam_papers" ON school_exam_papers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_exam_paper_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_exam_paper_questions" ON school_exam_paper_questions FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- PART 2: AI QUESTION GENERATION LOG
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS school_ai_generation_logs (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES school_subjects(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES school_topics(id) ON DELETE SET NULL,
    form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    ai_model VARCHAR(50) NOT NULL DEFAULT 'openai-gpt4o',
    prompt_text TEXT NOT NULL,
    generation_params JSONB,
        -- {difficulty, question_type, count, blooms_level, language}
    questions_generated INTEGER DEFAULT 0,
    questions_saved INTEGER DEFAULT 0,
    raw_response JSONB,
    status VARCHAR(20) DEFAULT 'pending',
        -- pending, completed, failed
    error_message TEXT,
    duration_ms INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_ai_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_ai_generation_logs" ON school_ai_generation_logs FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- PART 3: CBC COMPETENCY TRACKING
-- ════════════════════════════════════════════════════════════

-- 3a. CBC Learning Areas (top level — e.g. Mathematics, English, Science)
CREATE TABLE IF NOT EXISTS school_cbc_learning_areas (
    id SERIAL PRIMARY KEY,
    area_name VARCHAR(200) NOT NULL UNIQUE,
    area_code VARCHAR(20),
    description TEXT,
    form_id INTEGER REFERENCES school_forms(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. CBC Strands (e.g. "Numbers", "Measurement", "Geometry" under Math)
CREATE TABLE IF NOT EXISTS school_cbc_strands (
    id SERIAL PRIMARY KEY,
    learning_area_id INTEGER NOT NULL REFERENCES school_cbc_learning_areas(id) ON DELETE CASCADE,
    strand_name VARCHAR(200) NOT NULL,
    strand_code VARCHAR(20),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(learning_area_id, strand_name)
);

-- 3c. CBC Sub-Strands (e.g. "Whole Numbers", "Fractions" under "Numbers")
CREATE TABLE IF NOT EXISTS school_cbc_sub_strands (
    id SERIAL PRIMARY KEY,
    strand_id INTEGER NOT NULL REFERENCES school_cbc_strands(id) ON DELETE CASCADE,
    sub_strand_name VARCHAR(200) NOT NULL,
    sub_strand_code VARCHAR(20),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strand_id, sub_strand_name)
);

-- 3d. CBC Learning Outcomes (specific assessable outcomes)
CREATE TABLE IF NOT EXISTS school_cbc_learning_outcomes (
    id SERIAL PRIMARY KEY,
    sub_strand_id INTEGER NOT NULL REFERENCES school_cbc_sub_strands(id) ON DELETE CASCADE,
    outcome_code VARCHAR(30) NOT NULL,
    outcome_description TEXT NOT NULL,
    assessment_criteria TEXT,
        -- What evidence demonstrates competency
    rubric_ee TEXT,
        -- Exceeding Expectations description
    rubric_me TEXT,
        -- Meeting Expectations description
    rubric_ae TEXT,
        -- Approaching Expectations description
    rubric_be TEXT,
        -- Below Expectations description
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sub_strand_id, outcome_code)
);

-- 3e. CBC Student Assessments (per-student per-outcome rubric rating)
CREATE TABLE IF NOT EXISTS school_cbc_assessments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    learning_outcome_id INTEGER NOT NULL REFERENCES school_cbc_learning_outcomes(id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES school_terms(id),
    assessment_type VARCHAR(30) NOT NULL DEFAULT 'formative',
        -- formative, summative, observation, project, portfolio
    rubric_level VARCHAR(5) NOT NULL DEFAULT 'ME',
        -- EE, ME, AE, BE
    evidence TEXT,
        -- Description of evidence observed
    comments TEXT,
    assessed_by VARCHAR(100),
    assessment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, learning_outcome_id, term_id, assessment_type)
);

-- 3f. CBC Competency Summary (aggregated per student per strand per term)
CREATE TABLE IF NOT EXISTS school_cbc_competency_summary (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
    strand_id INTEGER NOT NULL REFERENCES school_cbc_strands(id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES school_terms(id),
    total_outcomes INTEGER DEFAULT 0,
    ee_count INTEGER DEFAULT 0,
    me_count INTEGER DEFAULT 0,
    ae_count INTEGER DEFAULT 0,
    be_count INTEGER DEFAULT 0,
    competency_percentage NUMERIC(5,2) DEFAULT 0,
        -- % of outcomes at ME or EE
    overall_level VARCHAR(5),
        -- EE, ME, AE, BE (computed from majority)
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, strand_id, term_id)
);

-- Indexes for CBC performance
CREATE INDEX IF NOT EXISTS idx_cbc_la_active ON school_cbc_learning_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_cbc_strands_la ON school_cbc_strands(learning_area_id);
CREATE INDEX IF NOT EXISTS idx_cbc_substrands_strand ON school_cbc_sub_strands(strand_id);
CREATE INDEX IF NOT EXISTS idx_cbc_outcomes_ss ON school_cbc_learning_outcomes(sub_strand_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_student ON school_cbc_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_outcome ON school_cbc_assessments(learning_outcome_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_term ON school_cbc_assessments(term_id);
CREATE INDEX IF NOT EXISTS idx_cbc_summary_student ON school_cbc_competency_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_summary_strand ON school_cbc_competency_summary(strand_id);

-- RLS for CBC tables
ALTER TABLE school_cbc_learning_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_learning_areas" ON school_cbc_learning_areas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_cbc_strands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_strands" ON school_cbc_strands FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_cbc_sub_strands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_sub_strands" ON school_cbc_sub_strands FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_cbc_learning_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_learning_outcomes" ON school_cbc_learning_outcomes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_cbc_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_assessments" ON school_cbc_assessments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_cbc_competency_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_cbc_competency_summary" ON school_cbc_competency_summary FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- SEED DATA: Default CBC Learning Areas & Sample Strands
-- ════════════════════════════════════════════════════════════

-- CBC Learning Areas (Junior Secondary - Grade 7-9)
INSERT INTO school_cbc_learning_areas (area_name, area_code, description, sort_order) VALUES
    ('Mathematics', 'MATH', 'Mathematical thinking and application', 1),
    ('English', 'ENG', 'English language and literacy', 2),
    ('Kiswahili', 'KIS', 'Kiswahili language and literacy', 3),
    ('Integrated Science', 'SCI', 'Scientific inquiry and application', 4),
    ('Social Studies', 'SOC', 'People, places and environments', 5),
    ('Religious Education', 'RE', 'Religious and moral values', 6),
    ('Creative Arts & Sports', 'ART', 'Creative expression and physical well-being', 7),
    ('Pre-Technical Studies', 'TECH', 'Technical and vocational skills', 8),
    ('Agriculture', 'AGR', 'Agricultural practices and sustainability', 9),
    ('Life Skills', 'LIFE', 'Personal development and citizenship', 10)
ON CONFLICT (area_name) DO NOTHING;

-- Sample Strands for Mathematics
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Numbers', 'MATH-NUM', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Algebra', 'MATH-ALG', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Measurement', 'MATH-MEA', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Geometry', 'MATH-GEO', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'MATH'), 'Data Handling', 'MATH-DAT', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Sample Strands for English
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Listening and Speaking', 'ENG-LS', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Reading', 'ENG-READ', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Writing', 'ENG-WRI', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Grammar in Use', 'ENG-GRAM', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'ENG'), 'Literature', 'ENG-LIT', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Sample Strands for Integrated Science
INSERT INTO school_cbc_strands (learning_area_id, strand_name, strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SCI'), 'Scientific Investigation', 'SCI-SI', 1),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SCI'), 'Living Things', 'SCI-LT', 2),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SCI'), 'Non-Living Things', 'SCI-NLT', 3),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SCI'), 'Earth and Space', 'SCI-ES', 4),
    ((SELECT id FROM school_cbc_learning_areas WHERE area_code = 'SCI'), 'Science and Technology', 'SCI-ST', 5)
ON CONFLICT (learning_area_id, strand_name) DO NOTHING;

-- Sample Sub-Strands for Mathematics / Numbers
INSERT INTO school_cbc_sub_strands (strand_id, sub_strand_name, sub_strand_code, sort_order) VALUES
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'MATH-NUM'), 'Whole Numbers', 'MATH-NUM-WN', 1),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'MATH-NUM'), 'Fractions', 'MATH-NUM-FR', 2),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'MATH-NUM'), 'Decimals', 'MATH-NUM-DC', 3),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'MATH-NUM'), 'Percentages', 'MATH-NUM-PC', 4),
    ((SELECT id FROM school_cbc_strands WHERE strand_code = 'MATH-NUM'), 'Integers', 'MATH-NUM-INT', 5)
ON CONFLICT (strand_id, sub_strand_name) DO NOTHING;

-- Sample Learning Outcomes for Whole Numbers sub-strand
INSERT INTO school_cbc_learning_outcomes (sub_strand_id, outcome_code, outcome_description, rubric_ee, rubric_me, rubric_ae, rubric_be, sort_order) VALUES
    ((SELECT id FROM school_cbc_sub_strands WHERE sub_strand_code = 'MATH-NUM-WN'), 'MATH-NUM-WN-01',
     'Read, write and compare whole numbers up to billions',
     'Independently reads, writes and compares numbers beyond billions with precision and explains relationships',
     'Accurately reads, writes and compares whole numbers up to billions',
     'Reads and writes whole numbers up to billions but makes errors in comparison',
     'Cannot reliably read, write or compare whole numbers beyond millions',
     1),
    ((SELECT id FROM school_cbc_sub_strands WHERE sub_strand_code = 'MATH-NUM-WN'), 'MATH-NUM-WN-02',
     'Perform operations on whole numbers (addition, subtraction, multiplication, division)',
     'Applies operations accurately to complex multi-step problems and can verify using inverse operations',
     'Performs all four operations on whole numbers accurately',
     'Performs operations but makes errors in multi-digit calculations',
     'Struggles with basic operations on whole numbers',
     2),
    ((SELECT id FROM school_cbc_sub_strands WHERE sub_strand_code = 'MATH-NUM-WN'), 'MATH-NUM-WN-03',
     'Apply divisibility tests and solve word problems involving whole numbers',
     'Creates and solves complex word problems using divisibility rules with clear reasoning',
     'Applies divisibility tests and solves word problems correctly',
     'Knows some divisibility tests but struggles with application in word problems',
     'Cannot apply divisibility tests or solve word problems',
     3)
ON CONFLICT (sub_strand_id, outcome_code) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════
SELECT 'Ultra features migration complete! Question Bank, AI Generation, CBC Competency Tracking tables created.' AS status;

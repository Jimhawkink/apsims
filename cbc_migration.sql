-- ============================================================
-- CBC ULTRA-COMPLIANCE MIGRATION
-- APSIMS — Additive schema for Kenya's dual education system
-- 8-4-4 (Form 3 & 4) + CBC Senior School (Grade 10+)
--
-- SAFE TO RE-RUN: All statements are fully idempotent.
-- Uses CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- ON CONFLICT DO NOTHING / ON CONFLICT DO UPDATE throughout.
--
-- Run in Supabase SQL Editor (postgres role).
-- ============================================================

-- ============================================================
-- SECTION 1: school_forms — add education_system column
-- ============================================================

ALTER TABLE school_forms
  ADD COLUMN IF NOT EXISTS education_system TEXT
    CHECK (education_system IN ('8-4-4', 'CBC_Senior_School'))
    DEFAULT '8-4-4';

-- Backfill: 8-4-4 forms (Form 3 & Form 4)
UPDATE school_forms
  SET education_system = '8-4-4'
  WHERE form_level IN (3, 4)
    AND (education_system IS NULL OR education_system <> '8-4-4');

-- Backfill: CBC Senior School (Grade 10)
UPDATE school_forms
  SET education_system = 'CBC_Senior_School'
  WHERE form_level = 10
    AND (education_system IS NULL OR education_system <> 'CBC_Senior_School');

-- Ensure all remaining NULL rows default to 8-4-4
UPDATE school_forms
  SET education_system = '8-4-4'
  WHERE education_system IS NULL;

-- ============================================================
-- SECTION 2: cbc_pathways
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_pathways (
  id           SERIAL PRIMARY KEY,
  pathway_name TEXT NOT NULL,
  pathway_code TEXT NOT NULL,
  description  TEXT,
  color_hex    TEXT DEFAULT '#6366f1',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_pathways_pathway_name_key UNIQUE (pathway_name),
  CONSTRAINT cbc_pathways_pathway_code_key UNIQUE (pathway_code)
);

ALTER TABLE cbc_pathways ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_pathways"
    ON cbc_pathways FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 3: cbc_pathway_subjects
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_pathway_subjects (
  id            SERIAL PRIMARY KEY,
  pathway_id    INTEGER REFERENCES cbc_pathways(id) ON DELETE CASCADE,
  subject_id    INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  is_compulsory BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_pathway_subjects_pathway_subject_key UNIQUE (pathway_id, subject_id)
);

ALTER TABLE cbc_pathway_subjects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_pathway_subjects"
    ON cbc_pathway_subjects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 4: cbc_student_subjects
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_student_subjects (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
  pathway_id  INTEGER REFERENCES cbc_pathways(id),
  subject_id  INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  is_elective BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_student_subjects_student_subject_key UNIQUE (student_id, subject_id)
);

ALTER TABLE cbc_student_subjects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_student_subjects"
    ON cbc_student_subjects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 5: cbc_assessments
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_assessments (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id      INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id         INTEGER REFERENCES school_terms(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL
    CHECK (assessment_type IN ('Formative', 'Summative')),
  task_name       TEXT,
  rubric_level    TEXT NOT NULL
    CHECK (rubric_level IN ('EE', 'ME', 'AE', 'BE')),
  teacher_id      INTEGER REFERENCES school_teachers(id),
  notes           TEXT,
  assessed_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one Summative per student/subject/term
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbc_assessments_summative_unique
  ON cbc_assessments (student_id, subject_id, term_id)
  WHERE assessment_type = 'Summative';

ALTER TABLE cbc_assessments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_assessments"
    ON cbc_assessments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 6: cbc_competency_summaries
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_competency_summaries (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
  subject_id       INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
  term_id          INTEGER REFERENCES school_terms(id) ON DELETE CASCADE,
  formative_level  TEXT CHECK (formative_level IN ('EE', 'ME', 'AE', 'BE')),
  summative_level  TEXT CHECK (summative_level IN ('EE', 'ME', 'AE', 'BE')),
  overall_level    TEXT CHECK (overall_level IN ('EE', 'ME', 'AE', 'BE')),
  formative_count  INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_competency_summaries_student_subject_term_key
    UNIQUE (student_id, subject_id, term_id)
);

ALTER TABLE cbc_competency_summaries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_competency_summaries"
    ON cbc_competency_summaries FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 7: cbc_rubric_config
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_rubric_config (
  id          SERIAL PRIMARY KEY,
  level_code  TEXT NOT NULL
    CHECK (level_code IN ('EE', 'ME', 'AE', 'BE')),
  level_label TEXT NOT NULL,
  color_hex   TEXT NOT NULL,
  bg_hex      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL,
  CONSTRAINT cbc_rubric_config_level_code_key UNIQUE (level_code)
);

ALTER TABLE cbc_rubric_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_rubric_config"
    ON cbc_rubric_config FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed rubric levels (idempotent — update label/colors if already present)
INSERT INTO cbc_rubric_config (level_code, level_label, color_hex, bg_hex, sort_order)
VALUES
  ('EE', 'Exceeds Expectation',    '#15803d', '#f0fdf4', 1),
  ('ME', 'Meets Expectation',      '#1d4ed8', '#eff6ff', 2),
  ('AE', 'Approaches Expectation', '#b45309', '#fffbeb', 3),
  ('BE', 'Below Expectation',      '#b91c1c', '#fef2f2', 4)
ON CONFLICT (level_code) DO UPDATE SET
  level_label = EXCLUDED.level_label,
  color_hex   = EXCLUDED.color_hex,
  bg_hex      = EXCLUDED.bg_hex,
  sort_order  = EXCLUDED.sort_order;

-- ============================================================
-- SECTION 8: cbc_report_card_comments
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_report_card_comments (
  id                SERIAL PRIMARY KEY,
  student_id        INTEGER REFERENCES school_students(id) ON DELETE CASCADE,
  term_id           INTEGER REFERENCES school_terms(id) ON DELETE CASCADE,
  teacher_comment   TEXT,
  principal_comment TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cbc_report_card_comments_student_term_key
    UNIQUE (student_id, term_id)
);

ALTER TABLE cbc_report_card_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all for cbc_report_card_comments"
    ON cbc_report_card_comments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 9: Seed cbc_pathways
-- ============================================================

INSERT INTO cbc_pathways (pathway_name, pathway_code, description, color_hex, is_active)
VALUES
  ('STEM',                  'STEM', 'Science, Technology, Engineering and Mathematics', '#2563eb', true),
  ('Social Sciences',       'SS',   'Languages, Literature, Humanities and Business Studies', '#7c3aed', true),
  ('Arts & Sports Science', 'ASS',  'Arts, Music, Theatre, Film and Sports Science',           '#ea580c', true)
ON CONFLICT (pathway_name) DO UPDATE SET
  pathway_code = EXCLUDED.pathway_code,
  description  = EXCLUDED.description,
  color_hex    = EXCLUDED.color_hex,
  is_active    = EXCLUDED.is_active;

-- ============================================================
-- SECTION 10: Seed cbc_pathway_subjects
-- Compulsory subjects linked to ALL three pathways (is_compulsory = true)
-- Elective subjects linked to their respective pathway (is_compulsory = false)
--
-- Uses a DO block so we can resolve subject IDs and pathway IDs by name,
-- making the seed fully portable across databases.
-- ============================================================

DO $$
DECLARE
  v_stem_id  INTEGER;
  v_ss_id    INTEGER;
  v_ass_id   INTEGER;

  -- Compulsory subject IDs
  v_eng_id   INTEGER;
  v_ksw_id   INTEGER;
  v_pe_id    INTEGER;
  v_clp_id   INTEGER;

  -- STEM elective subject IDs
  v_math_id  INTEGER;
  v_bio_id   INTEGER;
  v_chem_id  INTEGER;
  v_phy_id   INTEGER;
  v_gsci_id  INTEGER;
  v_agri_id  INTEGER;
  v_cs_id    INTEGER;
  v_hsc_id   INTEGER;
  v_bc_id    INTEGER;
  v_elec_id  INTEGER;
  v_metl_id  INTEGER;
  v_pmec_id  INTEGER;
  v_wood_id  INTEGER;
  v_dd_id    INTEGER;
  v_avtn_id  INTEGER;
  v_mdia_id  INTEGER;

  -- Social Sciences elective subject IDs
  v_lit_id   INTEGER;
  v_aeng_id  INTEGER;
  v_hist_id  INTEGER;
  v_geo_id   INTEGER;
  v_bs_id    INTEGER;
  v_cre_id   INTEGER;
  v_frn_id   INTEGER;
  v_ger_id   INTEGER;
  v_arb_id   INTEGER;
  v_chn_id   INTEGER;

  -- Arts & Sports Science elective subject IDs
  v_spr_id   INTEGER;
  v_mus_id   INTEGER;
  v_thtr_id  INTEGER;
  v_fart_id  INTEGER;

BEGIN
  -- Resolve pathway IDs
  SELECT id INTO v_stem_id FROM cbc_pathways WHERE pathway_code = 'STEM';
  SELECT id INTO v_ss_id   FROM cbc_pathways WHERE pathway_code = 'SS';
  SELECT id INTO v_ass_id  FROM cbc_pathways WHERE pathway_code = 'ASS';

  IF v_stem_id IS NULL OR v_ss_id IS NULL OR v_ass_id IS NULL THEN
    RAISE EXCEPTION 'cbc_pathways seed missing — run Section 9 first.';
  END IF;

  -- -------------------------------------------------------
  -- Ensure compulsory subjects exist in school_subjects
  -- -------------------------------------------------------
  INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
  VALUES
    ('English',                    'ENG',  'Core', true, 100),
    ('Kiswahili',                  'KSW',  'Core', true, 100),
    ('Physical Education',         'PE',   'Core', true, 100),
    ('Community Learning Project', 'CLP',  'Core', true, 100)
  ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category     = EXCLUDED.category,
    is_active    = true;

  -- -------------------------------------------------------
  -- Ensure STEM elective subjects exist
  -- -------------------------------------------------------
  INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
  VALUES
    ('Mathematics',               'MATH', 'STEM', true, 100),
    ('Biology',                   'BIO',  'STEM', true, 100),
    ('Chemistry',                 'CHEM', 'STEM', true, 100),
    ('Physics',                   'PHY',  'STEM', true, 100),
    ('General Science',           'GSCI', 'STEM', true, 100),
    ('Agriculture',               'AGRI', 'STEM', true, 100),
    ('Computer Science',          'CS',   'STEM', true, 100),
    ('Home Science',              'HSC',  'STEM', true, 100),
    ('Building and Construction', 'BC',   'STEM', true, 100),
    ('Electrical Technology',     'ELEC', 'STEM', true, 100),
    ('Metal Technology',          'METL', 'STEM', true, 100),
    ('Power Mechanics',           'PMEC', 'STEM', true, 100),
    ('Wood Technology',           'WOOD', 'STEM', true, 100),
    ('Drawing and Design',        'DD',   'STEM', true, 100),
    ('Aviation Technology',       'AVTN', 'STEM', true, 100),
    ('Media Technology',          'MDIA', 'STEM', true, 100)
  ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category     = EXCLUDED.category,
    is_active    = true;

  -- -------------------------------------------------------
  -- Ensure Social Sciences elective subjects exist
  -- -------------------------------------------------------
  INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
  VALUES
    ('Literature in English',        'LIT',  'Social Sciences', true, 100),
    ('Advanced English',             'AENG', 'Social Sciences', true, 100),
    ('History and Citizenship',      'HIST', 'Social Sciences', true, 100),
    ('Geography',                    'GEO',  'Social Sciences', true, 100),
    ('Business Studies',             'BS',   'Social Sciences', true, 100),
    ('Christian Religious Education','CRE',  'Social Sciences', true, 100),
    ('French',                       'FRN',  'Social Sciences', true, 100),
    ('German',                       'GER',  'Social Sciences', true, 100),
    ('Arabic',                       'ARB',  'Social Sciences', true, 100),
    ('Mandarin Chinese',             'CHN',  'Social Sciences', true, 100)
  ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category     = EXCLUDED.category,
    is_active    = true;

  -- -------------------------------------------------------
  -- Ensure Arts & Sports Science elective subjects exist
  -- -------------------------------------------------------
  INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
  VALUES
    ('Sports and Recreation', 'SPR',  'Arts & Sports Science', true, 100),
    ('Music and Dance',       'MUS',  'Arts & Sports Science', true, 100),
    ('Theatre and Film',      'THTR', 'Arts & Sports Science', true, 100),
    ('Fine Arts',             'FART', 'Arts & Sports Science', true, 100)
  ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category     = EXCLUDED.category,
    is_active    = true;

  -- -------------------------------------------------------
  -- Resolve compulsory subject IDs
  -- -------------------------------------------------------
  SELECT id INTO v_eng_id  FROM school_subjects WHERE subject_name = 'English'                    LIMIT 1;
  SELECT id INTO v_ksw_id  FROM school_subjects WHERE subject_name = 'Kiswahili'                  LIMIT 1;
  SELECT id INTO v_pe_id   FROM school_subjects WHERE subject_name = 'Physical Education'         LIMIT 1;
  SELECT id INTO v_clp_id  FROM school_subjects WHERE subject_name = 'Community Learning Project' LIMIT 1;

  -- -------------------------------------------------------
  -- Resolve STEM elective subject IDs
  -- -------------------------------------------------------
  SELECT id INTO v_math_id FROM school_subjects WHERE subject_name = 'Mathematics'               LIMIT 1;
  SELECT id INTO v_bio_id  FROM school_subjects WHERE subject_name = 'Biology'                   LIMIT 1;
  SELECT id INTO v_chem_id FROM school_subjects WHERE subject_name = 'Chemistry'                 LIMIT 1;
  SELECT id INTO v_phy_id  FROM school_subjects WHERE subject_name = 'Physics'                   LIMIT 1;
  SELECT id INTO v_gsci_id FROM school_subjects WHERE subject_name = 'General Science'           LIMIT 1;
  SELECT id INTO v_agri_id FROM school_subjects WHERE subject_name = 'Agriculture'               LIMIT 1;
  SELECT id INTO v_cs_id   FROM school_subjects WHERE subject_name = 'Computer Science'          LIMIT 1;
  SELECT id INTO v_hsc_id  FROM school_subjects WHERE subject_name = 'Home Science'              LIMIT 1;
  SELECT id INTO v_bc_id   FROM school_subjects WHERE subject_name = 'Building and Construction' LIMIT 1;
  SELECT id INTO v_elec_id FROM school_subjects WHERE subject_name = 'Electrical Technology'     LIMIT 1;
  SELECT id INTO v_metl_id FROM school_subjects WHERE subject_name = 'Metal Technology'          LIMIT 1;
  SELECT id INTO v_pmec_id FROM school_subjects WHERE subject_name = 'Power Mechanics'           LIMIT 1;
  SELECT id INTO v_wood_id FROM school_subjects WHERE subject_name = 'Wood Technology'           LIMIT 1;
  SELECT id INTO v_dd_id   FROM school_subjects WHERE subject_name = 'Drawing and Design'        LIMIT 1;
  SELECT id INTO v_avtn_id FROM school_subjects WHERE subject_name = 'Aviation Technology'       LIMIT 1;
  SELECT id INTO v_mdia_id FROM school_subjects WHERE subject_name = 'Media Technology'          LIMIT 1;

  -- -------------------------------------------------------
  -- Resolve Social Sciences elective subject IDs
  -- -------------------------------------------------------
  SELECT id INTO v_lit_id  FROM school_subjects WHERE subject_name = 'Literature in English'         LIMIT 1;
  SELECT id INTO v_aeng_id FROM school_subjects WHERE subject_name = 'Advanced English'              LIMIT 1;
  SELECT id INTO v_hist_id FROM school_subjects WHERE subject_name = 'History and Citizenship'       LIMIT 1;
  SELECT id INTO v_geo_id  FROM school_subjects WHERE subject_name = 'Geography'                     LIMIT 1;
  SELECT id INTO v_bs_id   FROM school_subjects WHERE subject_name = 'Business Studies'              LIMIT 1;
  SELECT id INTO v_cre_id  FROM school_subjects WHERE subject_name = 'Christian Religious Education' LIMIT 1;
  SELECT id INTO v_frn_id  FROM school_subjects WHERE subject_name = 'French'                        LIMIT 1;
  SELECT id INTO v_ger_id  FROM school_subjects WHERE subject_name = 'German'                        LIMIT 1;
  SELECT id INTO v_arb_id  FROM school_subjects WHERE subject_name = 'Arabic'                        LIMIT 1;
  SELECT id INTO v_chn_id  FROM school_subjects WHERE subject_name = 'Mandarin Chinese'              LIMIT 1;

  -- -------------------------------------------------------
  -- Resolve Arts & Sports Science elective subject IDs
  -- -------------------------------------------------------
  SELECT id INTO v_spr_id  FROM school_subjects WHERE subject_name = 'Sports and Recreation' LIMIT 1;
  SELECT id INTO v_mus_id  FROM school_subjects WHERE subject_name = 'Music and Dance'       LIMIT 1;
  SELECT id INTO v_thtr_id FROM school_subjects WHERE subject_name = 'Theatre and Film'      LIMIT 1;
  SELECT id INTO v_fart_id FROM school_subjects WHERE subject_name = 'Fine Arts'             LIMIT 1;

  -- -------------------------------------------------------
  -- Link compulsory subjects to ALL THREE pathways
  -- is_compulsory = true
  -- -------------------------------------------------------
  INSERT INTO cbc_pathway_subjects (pathway_id, subject_id, is_compulsory)
  VALUES
    -- STEM — compulsory
    (v_stem_id, v_eng_id,  true),
    (v_stem_id, v_ksw_id,  true),
    (v_stem_id, v_pe_id,   true),
    (v_stem_id, v_clp_id,  true),
    -- Social Sciences — compulsory
    (v_ss_id,   v_eng_id,  true),
    (v_ss_id,   v_ksw_id,  true),
    (v_ss_id,   v_pe_id,   true),
    (v_ss_id,   v_clp_id,  true),
    -- Arts & Sports Science — compulsory
    (v_ass_id,  v_eng_id,  true),
    (v_ass_id,  v_ksw_id,  true),
    (v_ass_id,  v_pe_id,   true),
    (v_ass_id,  v_clp_id,  true)
  ON CONFLICT (pathway_id, subject_id) DO UPDATE SET
    is_compulsory = EXCLUDED.is_compulsory;

  -- -------------------------------------------------------
  -- Link STEM elective subjects (is_compulsory = false)
  -- -------------------------------------------------------
  INSERT INTO cbc_pathway_subjects (pathway_id, subject_id, is_compulsory)
  VALUES
    (v_stem_id, v_math_id, false),
    (v_stem_id, v_bio_id,  false),
    (v_stem_id, v_chem_id, false),
    (v_stem_id, v_phy_id,  false),
    (v_stem_id, v_gsci_id, false),
    (v_stem_id, v_agri_id, false),
    (v_stem_id, v_cs_id,   false),
    (v_stem_id, v_hsc_id,  false),
    (v_stem_id, v_bc_id,   false),
    (v_stem_id, v_elec_id, false),
    (v_stem_id, v_metl_id, false),
    (v_stem_id, v_pmec_id, false),
    (v_stem_id, v_wood_id, false),
    (v_stem_id, v_dd_id,   false),
    (v_stem_id, v_avtn_id, false),
    (v_stem_id, v_mdia_id, false)
  ON CONFLICT (pathway_id, subject_id) DO UPDATE SET
    is_compulsory = EXCLUDED.is_compulsory;

  -- -------------------------------------------------------
  -- Link Social Sciences elective subjects (is_compulsory = false)
  -- -------------------------------------------------------
  INSERT INTO cbc_pathway_subjects (pathway_id, subject_id, is_compulsory)
  VALUES
    (v_ss_id, v_lit_id,  false),
    (v_ss_id, v_aeng_id, false),
    (v_ss_id, v_hist_id, false),
    (v_ss_id, v_geo_id,  false),
    (v_ss_id, v_bs_id,   false),
    (v_ss_id, v_cre_id,  false),
    (v_ss_id, v_frn_id,  false),
    (v_ss_id, v_ger_id,  false),
    (v_ss_id, v_arb_id,  false),
    (v_ss_id, v_chn_id,  false)
  ON CONFLICT (pathway_id, subject_id) DO UPDATE SET
    is_compulsory = EXCLUDED.is_compulsory;

  -- -------------------------------------------------------
  -- Link Arts & Sports Science elective subjects (is_compulsory = false)
  -- -------------------------------------------------------
  INSERT INTO cbc_pathway_subjects (pathway_id, subject_id, is_compulsory)
  VALUES
    (v_ass_id, v_spr_id,  false),
    (v_ass_id, v_mus_id,  false),
    (v_ass_id, v_thtr_id, false),
    (v_ass_id, v_fart_id, false)
  ON CONFLICT (pathway_id, subject_id) DO UPDATE SET
    is_compulsory = EXCLUDED.is_compulsory;

  RAISE NOTICE '✅ cbc_pathway_subjects seeded successfully.';
END $$;

-- ============================================================
-- SECTION 11: Smoke-check queries
-- Run these after the migration to verify correctness.
-- ============================================================

-- Verify education_system column is populated on all forms
SELECT form_name, form_level, education_system
  FROM school_forms
  ORDER BY form_level;

-- Verify cbc_rubric_config has exactly 4 rows
SELECT level_code, level_label, color_hex, sort_order
  FROM cbc_rubric_config
  ORDER BY sort_order;

-- Verify cbc_pathways has exactly 3 rows
SELECT pathway_name, pathway_code, color_hex, is_active
  FROM cbc_pathways
  ORDER BY id;

-- Verify compulsory subjects are linked to all 3 pathways
SELECT
  p.pathway_name,
  s.subject_name,
  ps.is_compulsory
FROM cbc_pathway_subjects ps
JOIN cbc_pathways p ON p.id = ps.pathway_id
JOIN school_subjects s ON s.id = ps.subject_id
WHERE ps.is_compulsory = true
ORDER BY p.pathway_name, s.subject_name;

-- Verify elective counts per pathway
SELECT
  p.pathway_name,
  COUNT(*) FILTER (WHERE ps.is_compulsory = false) AS elective_count,
  COUNT(*) FILTER (WHERE ps.is_compulsory = true)  AS compulsory_count
FROM cbc_pathway_subjects ps
JOIN cbc_pathways p ON p.id = ps.pathway_id
GROUP BY p.pathway_name
ORDER BY p.pathway_name;

-- ============================================================
-- END OF MIGRATION
-- ============================================================

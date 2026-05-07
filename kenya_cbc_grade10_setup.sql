-- ============================================================
-- KENYA EDUCATION SYSTEM SETUP — 2026
-- Covers BOTH systems running simultaneously:
--
-- 1. 8-4-4 (Legacy) — Form 3 & Form 4 only
--    (Form 1 & 2 phased out — replaced by CBC Junior School Grade 7-9)
--
-- 2. CBC Senior School — Grade 10 (started Jan 2026)
--    Grade 11 starts 2027, Grade 12 starts 2028
--
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: UPDATE EXISTING FORMS (8-4-4)
-- Remove Form 1 & Form 2 if they exist (no longer used)
-- Keep Form 3 & Form 4
-- ============================================================

-- Rename existing forms to match current reality
-- (Only Form 3 and Form 4 remain in 8-4-4)
UPDATE school_forms SET form_name = 'Form 3', form_level = 3
WHERE form_level = 3 OR form_name ILIKE '%form 3%';

UPDATE school_forms SET form_name = 'Form 4', form_level = 4
WHERE form_level = 4 OR form_name ILIKE '%form 4%';

-- Deactivate Form 1 and Form 2 (no longer admitting students)
UPDATE school_forms SET is_active = false
WHERE form_level IN (1, 2) OR form_name ILIKE '%form 1%' OR form_name ILIKE '%form 2%';

-- ============================================================
-- STEP 2: ADD CBC GRADE 10 FORM
-- ============================================================

INSERT INTO school_forms (form_name, form_level, description, is_active)
VALUES ('Grade 10', 10, 'CBC Senior School — First Year (2026 Cohort)', true)
ON CONFLICT (form_name) DO UPDATE SET
    form_level = 10,
    description = 'CBC Senior School — First Year (2026 Cohort)',
    is_active = true;

-- ============================================================
-- STEP 3: ADD CBC GRADE 10 SUBJECTS
-- ============================================================

-- COMPULSORY SUBJECTS (all Grade 10 students take these)
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('English',                    'ENG',  'Core',     true, 100),
    ('Kiswahili',                  'KSW',  'Core',     true, 100),
    ('Physical Education',         'PE',   'Core',     true, 100),
    ('Community Learning Project', 'CLP',  'Core',     true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- STEM PATHWAY — Pure Sciences
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Mathematics',                'MATH', 'STEM',     true, 100),
    ('Mathematics Advanced',       'MTHA', 'STEM',     true, 100),
    ('Biology',                    'BIO',  'STEM',     true, 100),
    ('Chemistry',                  'CHEM', 'STEM',     true, 100),
    ('Physics',                    'PHY',  'STEM',     true, 100),
    ('General Science',            'GSCI', 'STEM',     true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- STEM PATHWAY — Applied Sciences
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Agriculture',                'AGRI', 'STEM',     true, 100),
    ('Computer Science',           'CS',   'STEM',     true, 100),
    ('Home Science',               'HSC',  'STEM',     true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- STEM PATHWAY — Technical Studies
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Building and Construction',  'BC',   'STEM',     true, 100),
    ('Electrical Technology',      'ELEC', 'STEM',     true, 100),
    ('Metal Technology',           'METL', 'STEM',     true, 100),
    ('Power Mechanics',            'PMEC', 'STEM',     true, 100),
    ('Wood Technology',            'WOOD', 'STEM',     true, 100),
    ('Drawing and Design',         'DD',   'STEM',     true, 100),
    ('Aviation Technology',        'AVTN', 'STEM',     true, 100),
    ('Media Technology',           'MDIA', 'STEM',     true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- SOCIAL SCIENCES PATHWAY — Languages & Literature
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Literature in English',      'LIT',  'Social Sciences', true, 100),
    ('Advanced English',           'AENG', 'Social Sciences', true, 100),
    ('Kiswahili Kipevu',           'KSWK', 'Social Sciences', true, 100),
    ('Fasihi ya Kiswahili',        'FKIW', 'Social Sciences', true, 100),
    ('French',                     'FRN',  'Social Sciences', true, 100),
    ('German',                     'GER',  'Social Sciences', true, 100),
    ('Arabic',                     'ARB',  'Social Sciences', true, 100),
    ('Mandarin Chinese',           'CHN',  'Social Sciences', true, 100),
    ('Sign Language',              'SL',   'Social Sciences', true, 100),
    ('Indigenous Languages',       'INDL', 'Social Sciences', true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- SOCIAL SCIENCES PATHWAY — Humanities & Business Studies
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('History and Citizenship',    'HIST', 'Social Sciences', true, 100),
    ('Geography',                  'GEO',  'Social Sciences', true, 100),
    ('Business Studies',           'BS',   'Social Sciences', true, 100),
    ('Christian Religious Education', 'CRE', 'Social Sciences', true, 100),
    ('Islamic Religious Education',   'IRE', 'Social Sciences', true, 100),
    ('Hindu Religious Education',     'HRE', 'Social Sciences', true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- ARTS & SPORTS SCIENCE PATHWAY
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Sports and Recreation',      'SPR',  'Arts & Sports', true, 100),
    ('Music and Dance',            'MUS',  'Arts & Sports', true, 100),
    ('Theatre and Film',           'THTR', 'Arts & Sports', true, 100),
    ('Fine Arts',                  'FART', 'Arts & Sports', true, 100)
ON CONFLICT (subject_name) DO UPDATE SET
    subject_code = EXCLUDED.subject_code,
    category = EXCLUDED.category,
    is_active = true;

-- 8-4-4 SUBJECTS (Form 3 & 4 — keep existing, ensure they exist)
INSERT INTO school_subjects (subject_name, subject_code, category, is_active, max_score)
VALUES
    ('Mathematics',                'MATH', 'Core',     true, 100),
    ('English',                    'ENG',  'Core',     true, 100),
    ('Kiswahili',                  'KSW',  'Core',     true, 100),
    ('Biology',                    'BIO',  'Sciences', true, 100),
    ('Chemistry',                  'CHEM', 'Sciences', true, 100),
    ('Physics',                    'PHY',  'Sciences', true, 100),
    ('History & Government',       'HIST', 'Humanities', true, 100),
    ('Geography',                  'GEO',  'Humanities', true, 100),
    ('Christian Religious Education', 'CRE', 'Humanities', true, 100),
    ('Business Studies',           'BS',   'Humanities', true, 100),
    ('Agriculture',                'AGRI', 'Technical', true, 100),
    ('Computer Studies',           'CS',   'Technical', true, 100),
    ('Home Science',               'HSC',  'Technical', true, 100),
    ('Art and Design',             'ART',  'Technical', true, 100),
    ('Music',                      'MUS',  'Technical', true, 100),
    ('French',                     'FRN',  'Languages', true, 100),
    ('German',                     'GER',  'Languages', true, 100),
    ('Arabic',                     'ARB',  'Languages', true, 100)
ON CONFLICT (subject_name) DO NOTHING;

-- ============================================================
-- STEP 4: ADD CBC TERMS (Grade 10 — 2026)
-- Kenya 2026 school calendar:
-- Term 1: Jan 5 – Apr 2, 2026
-- Term 2: Apr 28 – Aug 7, 2026
-- Term 3: Sep 1 – Nov 27, 2026
-- ============================================================

INSERT INTO school_terms (term_name, term_number, year, start_date, end_date, is_current, academic_year)
VALUES
    ('Term 1 2026', 1, 2026, '2026-01-05', '2026-04-02', false, '2026'),
    ('Term 2 2026', 2, 2026, '2026-04-28', '2026-08-07', true,  '2026'),
    ('Term 3 2026', 3, 2026, '2026-09-01', '2026-11-27', false, '2026')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 5: SEED 40 GRADE 10 STUDENTS (20M, 20F)
-- Evenly split across 2 streams
-- ============================================================

DO $$
DECLARE
    g10_id INT;
    s1 INT; s2 INT;
    t_id INT;
BEGIN
    SELECT id INTO g10_id FROM school_forms WHERE form_name = 'Grade 10' LIMIT 1;
    SELECT id INTO s1 FROM school_streams ORDER BY stream_name LIMIT 1;
    SELECT id INTO s2 FROM school_streams ORDER BY stream_name LIMIT 1 OFFSET 1;
    IF s2 IS NULL THEN s2 := s1; END IF;
    SELECT id INTO t_id FROM school_tenants LIMIT 1;

    IF g10_id IS NULL THEN
        RAISE NOTICE 'Grade 10 form not found. Run STEP 2 first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Grade 10 form ID: %, Stream1: %, Stream2: %', g10_id, s1, s2;

    -- Grade 10 Stream 1 — 20 students (10M, 10F)
    INSERT INTO school_students
        (admission_number, first_name, last_name, gender, form_id, stream_id, status, date_of_birth, guardian_name, guardian_phone, admission_date, tenant_id)
    VALUES
        ('G10/2026/001','CALEB','MUTAI','Male',g10_id,s1,'Active','2011-03-12','JOHN MUTAI','0712346001',CURRENT_DATE,t_id),
        ('G10/2026/002','ELIJAH','OMONDI','Male',g10_id,s1,'Active','2011-07-22','PETER OMONDI','0712346002',CURRENT_DATE,t_id),
        ('G10/2026/003','FELIX','KIPNGETICH','Male',g10_id,s1,'Active','2011-01-15','SAMUEL KIPNGETICH','0712346003',CURRENT_DATE,t_id),
        ('G10/2026/004','GABRIEL','KAMAU','Male',g10_id,s1,'Active','2011-09-08','JAMES KAMAU','0712346004',CURRENT_DATE,t_id),
        ('G10/2026/005','HAROLD','OCHIENG','Male',g10_id,s1,'Active','2011-11-30','PAUL OCHIENG','0712346005',CURRENT_DATE,t_id),
        ('G10/2026/006','IVAN','NJOROGE','Male',g10_id,s1,'Active','2011-05-10','DAVID NJOROGE','0712346006',CURRENT_DATE,t_id),
        ('G10/2026/007','JACOB','WEKESA','Male',g10_id,s1,'Active','2011-10-17','MOSES WEKESA','0712346007',CURRENT_DATE,t_id),
        ('G10/2026/008','KELVIN','KORIR','Male',g10_id,s1,'Active','2011-03-28','ELIJAH KORIR','0712346008',CURRENT_DATE,t_id),
        ('G10/2026/009','LEVI','GITONGA','Male',g10_id,s1,'Active','2011-07-05','STEPHEN GITONGA','0712346009',CURRENT_DATE,t_id),
        ('G10/2026/010','MOSES','NDUNGU','Male',g10_id,s1,'Active','2011-01-22','JOSEPH NDUNGU','0712346010',CURRENT_DATE,t_id),
        ('G10/2026/011','ABIGAIL','WANJIKU','Female',g10_id,s1,'Active','2011-04-18','MARY WANJIKU','0712346011',CURRENT_DATE,t_id),
        ('G10/2026/012','CHARITY','AKINYI','Female',g10_id,s1,'Active','2011-06-25','ROSE AKINYI','0712346012',CURRENT_DATE,t_id),
        ('G10/2026/013','DORCAS','NJERI','Female',g10_id,s1,'Active','2011-02-14','ANN NJERI','0712346013',CURRENT_DATE,t_id),
        ('G10/2026/014','EUNICE','CHEBET','Female',g10_id,s1,'Active','2011-08-03','JANE CHEBET','0712346014',CURRENT_DATE,t_id),
        ('G10/2026/015','FLORENCE','MUTUA','Female',g10_id,s1,'Active','2011-12-20','LUCY MUTUA','0712346015',CURRENT_DATE,t_id),
        ('G10/2026/016','GLADYS','WAMBUI','Female',g10_id,s1,'Active','2011-09-14','HANNAH WAMBUI','0712346016',CURRENT_DATE,t_id),
        ('G10/2026/017','HOPE','ATIENO','Female',g10_id,s1,'Active','2011-11-07','RUTH ATIENO','0712346017',CURRENT_DATE,t_id),
        ('G10/2026/018','IVY','KARIMI','Female',g10_id,s1,'Active','2011-04-30','SARAH KARIMI','0712346018',CURRENT_DATE,t_id),
        ('G10/2026/019','JOYCE','CHEPKOECH','Female',g10_id,s1,'Active','2011-06-12','MIRIAM CHEPKOECH','0712346019',CURRENT_DATE,t_id),
        ('G10/2026/020','KAREN','MUTHONI','Female',g10_id,s1,'Active','2011-02-08','ESTHER MUTHONI','0712346020',CURRENT_DATE,t_id);

    -- Grade 10 Stream 2 — 20 students (10M, 10F)
    INSERT INTO school_students
        (admission_number, first_name, last_name, gender, form_id, stream_id, status, date_of_birth, guardian_name, guardian_phone, admission_date, tenant_id)
    VALUES
        ('G10/2026/021','NATHAN','ROTICH','Male',g10_id,s2,'Active','2011-02-17','NATHAN ROTICH SR','0712346021',CURRENT_DATE,t_id),
        ('G10/2026/022','OLIVER','ODHIAMBO','Male',g10_id,s2,'Active','2011-06-30','OLIVER ODHIAMBO SR','0712346022',CURRENT_DATE,t_id),
        ('G10/2026/023','PATRICK','GICHUKI','Male',g10_id,s2,'Active','2011-10-12','PATRICK GICHUKI SR','0712346023',CURRENT_DATE,t_id),
        ('G10/2026/024','QUENTIN','SANG','Male',g10_id,s2,'Active','2011-01-25','QUENTIN SANG SR','0712346024',CURRENT_DATE,t_id),
        ('G10/2026/025','ROBERT','MAINA','Male',g10_id,s2,'Active','2011-05-08','ROBERT MAINA SR','0712346025',CURRENT_DATE,t_id),
        ('G10/2026/026','SIMON','NJUGUNA','Male',g10_id,s2,'Active','2011-01-04','SAMUEL NJUGUNA','0712346026',CURRENT_DATE,t_id),
        ('G10/2026/027','TIMOTHY','KIPTOO','Male',g10_id,s2,'Active','2011-05-17','TIMOTHY KIPTOO SR','0712346027',CURRENT_DATE,t_id),
        ('G10/2026/028','URIAH','ONYANGO','Male',g10_id,s2,'Active','2011-09-29','URIAH ONYANGO SR','0712346028',CURRENT_DATE,t_id),
        ('G10/2026/029','VICTOR','KARIUKI','Male',g10_id,s2,'Active','2011-02-11','VICTOR KARIUKI SR','0712346029',CURRENT_DATE,t_id),
        ('G10/2026/030','WALTER','BETT','Male',g10_id,s2,'Active','2011-06-24','WALTER BETT SR','0712346030',CURRENT_DATE,t_id),
        ('G10/2026/031','LEAH','MORAA','Female',g10_id,s2,'Active','2011-04-06','REBECCA MORAA','0712346031',CURRENT_DATE,t_id),
        ('G10/2026/032','MIRIAM','WANJIKU','Female',g10_id,s2,'Active','2011-08-19','SOPHIA WANJIKU','0712346032',CURRENT_DATE,t_id),
        ('G10/2026/033','NAOMI','ACHIENG','Female',g10_id,s2,'Active','2011-12-01','TINA ACHIENG','0712346033',CURRENT_DATE,t_id),
        ('G10/2026/034','OLIVIA','WAMBUA','Female',g10_id,s2,'Active','2011-03-14','UNA WAMBUA','0712346034',CURRENT_DATE,t_id),
        ('G10/2026/035','PRISCILLA','CHEPKURUI','Female',g10_id,s2,'Active','2011-07-27','VIOLET CHEPKURUI','0712346035',CURRENT_DATE,t_id),
        ('G10/2026/036','QUEEN','NJAMBI','Female',g10_id,s2,'Active','2011-02-09','WAMBUI NJAMBI','0712346036',CURRENT_DATE,t_id),
        ('G10/2026/037','REBECCA','ATIENO','Female',g10_id,s2,'Active','2011-06-22','XENIA ATIENO','0712346037',CURRENT_DATE,t_id),
        ('G10/2026/038','STELLA','WANGUI','Female',g10_id,s2,'Active','2011-10-05','WENDY WANGUI','0712346038',CURRENT_DATE,t_id),
        ('G10/2026/039','TABITHA','CHEPKWONY','Female',g10_id,s2,'Active','2011-01-18','VIVIAN CHEPKWONY','0712346039',CURRENT_DATE,t_id),
        ('G10/2026/040','URSULA','MWENDE','Female',g10_id,s2,'Active','2011-05-31','URSULA MWENDE SR','0712346040',CURRENT_DATE,t_id);

    RAISE NOTICE '✅ 40 Grade 10 students inserted: 20 per stream, 20 Male, 20 Female';
END $$;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT
    sf.form_name,
    ss.stream_name,
    COUNT(*) AS total,
    SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) AS males,
    SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) AS females
FROM school_students s
JOIN school_forms sf ON s.form_id = sf.id
LEFT JOIN school_streams ss ON s.stream_id = ss.id
WHERE s.admission_number LIKE 'G10/%'
GROUP BY sf.form_name, ss.stream_name
ORDER BY sf.form_name, ss.stream_name;

-- Show all active forms
SELECT form_name, form_level, description, is_active FROM school_forms ORDER BY form_level;

-- Show CBC subjects
SELECT subject_name, subject_code, category FROM school_subjects
WHERE category IN ('Core','STEM','Social Sciences','Arts & Sports')
ORDER BY category, subject_name;

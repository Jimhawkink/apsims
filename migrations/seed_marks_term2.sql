-- ══════════════════════════════════════════════════════════════════════════════
-- APSIMS — Term 2 Marks Seed Script
-- Seeds:
--   1. Grade 10 (CBC) → cbc_student_subjects + cbc_assessments (Summative)
--   2. Form 3 (8-4-4) → school_exam_marks (End-Term)
-- Run this ONCE in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_term2_id      INT;
  v_year          INT := 2026;
  v_g10_form_id   INT;
  v_f3_form_id    INT;
  rec             RECORD;
  sub_rec         RECORD;
  v_score         INT;
  v_level         TEXT;
  v_grade         TEXT;
  v_points        INT;
  v_remarks       TEXT;
  v_seed          INT;
  v_idx           INT;
  scores_pool     INT[] := ARRAY[
    82,91,75,63,88,55,47,79,84,68,
    93,71,58,45,77,86,62,51,89,73,
    66,44,95,80,57,38,74,87,69,53,
    92,61,48,76,85,70,56,43,88,64,
    78,82,91,55,67,72,83,59,46,90
  ];
BEGIN

  -- ── 0. Find Term 2 ──────────────────────────────────────────────────────────
  SELECT id INTO v_term2_id
  FROM school_terms
  WHERE LOWER(term_name) LIKE '%term 2%' OR LOWER(term_name) LIKE '%term2%'
     OR term_number = 2
  ORDER BY id ASC LIMIT 1;

  IF v_term2_id IS NULL THEN
    -- Fallback: try by is_current or second term
    SELECT id INTO v_term2_id FROM school_terms ORDER BY id ASC LIMIT 1 OFFSET 1;
  END IF;

  IF v_term2_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Term 2 in school_terms table. Please check school_terms.';
  END IF;

  RAISE NOTICE 'Using Term 2 ID: %', v_term2_id;

  -- ── 1. Find Grade 10 form ───────────────────────────────────────────────────
  SELECT id INTO v_g10_form_id
  FROM school_forms
  WHERE form_level = 10
     OR (education_system = 'CBC_Senior_School' AND form_level = 10)
  LIMIT 1;

  -- Also try Grade 10 by name
  IF v_g10_form_id IS NULL THEN
    SELECT id INTO v_g10_form_id
    FROM school_forms
    WHERE LOWER(form_name) LIKE '%grade 10%' OR LOWER(form_name) LIKE '%gr 10%' OR LOWER(form_name) LIKE '%g10%'
    LIMIT 1;
  END IF;

  IF v_g10_form_id IS NULL THEN
    SELECT id INTO v_g10_form_id
    FROM school_forms
    WHERE education_system = 'CBC_Senior_School'
    ORDER BY form_level DESC LIMIT 1;
  END IF;

  RAISE NOTICE 'Grade 10 / CBC Senior form ID: %', v_g10_form_id;

  -- ── 2. Find Form 3 (8-4-4) ──────────────────────────────────────────────────
  SELECT id INTO v_f3_form_id
  FROM school_forms
  WHERE (education_system = '8-4-4' OR education_system IS NULL OR education_system = '')
    AND form_level = 3
  LIMIT 1;

  IF v_f3_form_id IS NULL THEN
    SELECT id INTO v_f3_form_id
    FROM school_forms
    WHERE LOWER(form_name) LIKE '%form 3%' OR LOWER(form_name) LIKE '%form3%'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Form 3 / 8-4-4 form ID: %', v_f3_form_id;

  -- ════════════════════════════════════════════════════════════════════════════
  -- SECTION A: GRADE 10 CBC — cbc_student_subjects + cbc_assessments
  -- ════════════════════════════════════════════════════════════════════════════
  IF v_g10_form_id IS NOT NULL THEN

    -- ── A1. Create cbc_student_subjects if missing ───────────────────────────
    CREATE TABLE IF NOT EXISTS cbc_student_subjects (
      id         BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL,
      subject_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, subject_id)
    );

    -- ── A2. Create cbc_assessments if missing ────────────────────────────────
    CREATE TABLE IF NOT EXISTS cbc_assessments (
      id              BIGSERIAL PRIMARY KEY,
      student_id      BIGINT NOT NULL,
      subject_id      BIGINT NOT NULL,
      term_id         BIGINT NOT NULL,
      assessment_type TEXT NOT NULL DEFAULT 'Summative',
      task_name       TEXT,
      rubric_level    TEXT CHECK (rubric_level IN ('EE','ME','AE','BE')),
      raw_score       NUMERIC(5,1),
      notes           TEXT,
      assessed_at     TIMESTAMPTZ DEFAULT NOW(),
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS (permissive)
    ALTER TABLE cbc_assessments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_all_cbc_assessments" ON cbc_assessments;
    CREATE POLICY "allow_all_cbc_assessments" ON cbc_assessments
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    ALTER TABLE cbc_student_subjects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_all_cbc_ss" ON cbc_student_subjects;
    CREATE POLICY "allow_all_cbc_ss" ON cbc_student_subjects
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- ── A3. Assign all Grade 10 students to all active subjects ─────────────
    RAISE NOTICE 'Assigning Grade 10 students to subjects...';
    v_idx := 0;

    FOR rec IN
      SELECT s.id AS student_id
      FROM school_students s
      WHERE s.form_id = v_g10_form_id AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
    LOOP
      FOR sub_rec IN
        SELECT id AS subject_id FROM school_subjects WHERE is_active = true ORDER BY subject_name
      LOOP
        INSERT INTO cbc_student_subjects (student_id, subject_id)
        VALUES (rec.student_id, sub_rec.subject_id)
        ON CONFLICT (student_id, subject_id) DO NOTHING;
      END LOOP;
    END LOOP;

    -- ── A4. Delete existing Term 2 Summative marks for Grade 10 ─────────────
    DELETE FROM cbc_assessments
    WHERE term_id = v_term2_id
      AND assessment_type = 'Summative'
      AND student_id IN (
        SELECT id FROM school_students WHERE form_id = v_g10_form_id AND status = 'Active'
      );

    -- ── A5. Seed cbc_assessments for Grade 10 ───────────────────────────────
    RAISE NOTICE 'Seeding CBC marks for Grade 10...';
    v_idx := 0;

    FOR rec IN
      SELECT s.id AS student_id, s.first_name, s.last_name
      FROM school_students s
      WHERE s.form_id = v_g10_form_id AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
    LOOP
      v_seed := 0;
      FOR sub_rec IN
        SELECT id AS subject_id, subject_name FROM school_subjects WHERE is_active = true ORDER BY subject_name
      LOOP
        -- Pick a varied score from the pool based on student+subject index
        v_score := scores_pool[ ((v_idx + v_seed) % array_length(scores_pool, 1)) + 1 ];

        -- Determine rubric level
        v_level := CASE
          WHEN v_score >= 80 THEN 'EE'
          WHEN v_score >= 60 THEN 'ME'
          WHEN v_score >= 40 THEN 'AE'
          ELSE 'BE'
        END;

        INSERT INTO cbc_assessments (
          student_id, subject_id, term_id,
          assessment_type, task_name,
          rubric_level, raw_score, notes, assessed_at
        ) VALUES (
          rec.student_id, sub_rec.subject_id, v_term2_id,
          'Summative', 'Summative',
          v_level, v_score,
          CASE v_level
            WHEN 'EE' THEN 'Exceeds Expectation — Excellent performance'
            WHEN 'ME' THEN 'Meets Expectation — Good performance'
            WHEN 'AE' THEN 'Approaches Expectation — Needs improvement'
            ELSE            'Below Expectation — Requires intervention'
          END,
          NOW()
        );

        v_seed := v_seed + 7; -- shift by 7 per subject for variety
      END LOOP;
      v_idx := v_idx + 1;
    END LOOP;

    RAISE NOTICE 'Grade 10 CBC marks seeded successfully ✓';

  ELSE
    RAISE NOTICE 'WARNING: Grade 10 / CBC form not found — skipping CBC seed';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- SECTION B: FORM 3 (8-4-4) — school_exam_marks
  -- ════════════════════════════════════════════════════════════════════════════
  IF v_f3_form_id IS NOT NULL THEN

    -- ── B1. Create school_exam_marks if missing ──────────────────────────────
    CREATE TABLE IF NOT EXISTS school_exam_marks (
      id         BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL,
      subject_id BIGINT NOT NULL,
      term_id    BIGINT NOT NULL,
      exam_type  TEXT NOT NULL DEFAULT 'End-Term',
      score      NUMERIC(5,1),
      grade      TEXT,
      points     INT,
      remarks    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, subject_id, term_id, exam_type)
    );

    ALTER TABLE school_exam_marks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "allow_all_exam_marks" ON school_exam_marks;
    CREATE POLICY "allow_all_exam_marks" ON school_exam_marks
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    -- ── B2. Delete existing Term 2 End-Term marks for Form 3 ─────────────────
    DELETE FROM school_exam_marks
    WHERE term_id = v_term2_id
      AND exam_type = 'End-Term'
      AND student_id IN (
        SELECT id FROM school_students WHERE form_id = v_f3_form_id AND status = 'Active'
      );

    -- ── B3. Seed school_exam_marks for Form 3 ────────────────────────────────
    RAISE NOTICE 'Seeding 8-4-4 marks for Form 3...';
    v_idx := 3; -- different starting offset from CBC

    FOR rec IN
      SELECT s.id AS student_id, s.first_name, s.last_name
      FROM school_students s
      WHERE s.form_id = v_f3_form_id AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
    LOOP
      v_seed := 0;
      FOR sub_rec IN
        SELECT id AS subject_id, subject_name FROM school_subjects WHERE is_active = true ORDER BY subject_name
      LOOP
        -- Pick a varied score
        v_score := scores_pool[ ((v_idx + v_seed) % array_length(scores_pool, 1)) + 1 ];

        -- 8-4-4 grading (KNEC scale)
        v_grade := CASE
          WHEN v_score >= 80 THEN 'A'
          WHEN v_score >= 75 THEN 'A-'
          WHEN v_score >= 70 THEN 'B+'
          WHEN v_score >= 65 THEN 'B'
          WHEN v_score >= 60 THEN 'B-'
          WHEN v_score >= 55 THEN 'C+'
          WHEN v_score >= 50 THEN 'C'
          WHEN v_score >= 45 THEN 'C-'
          WHEN v_score >= 40 THEN 'D+'
          WHEN v_score >= 35 THEN 'D'
          WHEN v_score >= 30 THEN 'D-'
          ELSE 'E'
        END;

        v_points := CASE
          WHEN v_score >= 80 THEN 12
          WHEN v_score >= 75 THEN 11
          WHEN v_score >= 70 THEN 10
          WHEN v_score >= 65 THEN  9
          WHEN v_score >= 60 THEN  8
          WHEN v_score >= 55 THEN  7
          WHEN v_score >= 50 THEN  6
          WHEN v_score >= 45 THEN  5
          WHEN v_score >= 40 THEN  4
          WHEN v_score >= 35 THEN  3
          WHEN v_score >= 30 THEN  2
          ELSE 1
        END;

        v_remarks := CASE
          WHEN v_score >= 70 THEN 'Excellent'
          WHEN v_score >= 55 THEN 'Good'
          WHEN v_score >= 40 THEN 'Average'
          ELSE 'Below Average'
        END;

        INSERT INTO school_exam_marks (
          student_id, subject_id, term_id,
          exam_type, score, grade, points, remarks
        ) VALUES (
          rec.student_id, sub_rec.subject_id, v_term2_id,
          'End-Term', v_score, v_grade, v_points, v_remarks
        )
        ON CONFLICT (student_id, subject_id, term_id, exam_type) DO UPDATE
          SET score = EXCLUDED.score, grade = EXCLUDED.grade,
              points = EXCLUDED.points, remarks = EXCLUDED.remarks;

        v_seed := v_seed + 11;
      END LOOP;
      v_idx := v_idx + 1;
    END LOOP;

    RAISE NOTICE 'Form 3 8-4-4 marks seeded successfully ✓';

  ELSE
    RAISE NOTICE 'WARNING: Form 3 not found — skipping 8-4-4 seed';
  END IF;

END $$;

-- ── Quick verification queries ─────────────────────────────────────────────────
SELECT 'cbc_assessments'    AS tbl, COUNT(*) AS rows FROM cbc_assessments    WHERE assessment_type='Summative'
UNION ALL
SELECT 'school_exam_marks'  AS tbl, COUNT(*) AS rows FROM school_exam_marks   WHERE exam_type='End-Term'
UNION ALL
SELECT 'cbc_student_subjects' AS tbl, COUNT(*) AS rows FROM cbc_student_subjects;

-- ============================================================
-- ULTRA EXAM ENGINE MIGRATION — APSIMS (Fixed)
-- Uses SERIAL/BIGSERIAL instead of manual nextval() 
-- so sequences are auto-created by PostgreSQL
-- ============================================================

-- 1. Add columns to school_exam_types (if not exists)
ALTER TABLE school_exam_types ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 0;
ALTER TABLE school_exam_types ADD COLUMN IF NOT EXISTS max_score numeric NOT NULL DEFAULT 100;
ALTER TABLE school_exam_types ADD COLUMN IF NOT EXISTS is_combined boolean DEFAULT false;
ALTER TABLE school_exam_types ADD COLUMN IF NOT EXISTS component_exam_ids integer[] DEFAULT '{}';

-- 2. Add combined score columns to school_exam_marks
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS weighted_score numeric DEFAULT 0;
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS combined_score numeric DEFAULT 0;
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS combined_grade character varying;
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS class_position integer;
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS stream_position integer;
ALTER TABLE school_exam_marks ADD COLUMN IF NOT EXISTS subject_teacher_remark text;

-- 3. Student ranking history across terms
CREATE TABLE IF NOT EXISTS school_student_rankings (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL,
    term_id integer NOT NULL,
    form_id integer NOT NULL,
    stream_id integer,
    total_score numeric DEFAULT 0,
    mean_score numeric DEFAULT 0,
    mean_grade character varying,
    class_position integer,
    stream_position integer,
    total_students integer DEFAULT 0,
    best_position_ever integer,
    subjects_passed integer DEFAULT 0,
    subjects_failed integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_student_rankings_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_student_rankings_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id),
    CONSTRAINT school_student_rankings_form_id_fkey FOREIGN KEY (form_id) REFERENCES school_forms(id),
    CONSTRAINT school_student_rankings_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES school_streams(id),
    CONSTRAINT school_student_rankings_unique UNIQUE (student_id, term_id, form_id)
);

-- 4. Subject teacher remarks per student per term
CREATE TABLE IF NOT EXISTS school_subject_remarks (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    term_id integer NOT NULL,
    teacher_id integer,
    remark text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_subject_remarks_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_subject_remarks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES school_subjects(id),
    CONSTRAINT school_subject_remarks_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id),
    CONSTRAINT school_subject_remarks_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES school_teachers(id),
    CONSTRAINT school_subject_remarks_unique UNIQUE (student_id, subject_id, term_id)
);

-- 5. Report card layout configuration
CREATE TABLE IF NOT EXISTS school_report_card_layouts (
    id SERIAL PRIMARY KEY,
    layout_name character varying NOT NULL,
    layout_code character varying NOT NULL UNIQUE,
    description text,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. KCSE Prediction model
CREATE TABLE IF NOT EXISTS school_kcse_predictions (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL,
    term_id integer NOT NULL,
    predicted_mean_grade character varying,
    predicted_mean_score numeric DEFAULT 0,
    confidence_level character varying DEFAULT 'Medium'::character varying,
    prediction_method character varying DEFAULT 'weighted_average'::character varying,
    subject_predictions jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_kcse_predictions_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_kcse_predictions_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id),
    CONSTRAINT school_kcse_predictions_unique UNIQUE (student_id, term_id)
);

-- 7. Grade distribution cache
CREATE TABLE IF NOT EXISTS school_grade_distributions (
    id SERIAL PRIMARY KEY,
    subject_id integer NOT NULL,
    term_id integer NOT NULL,
    form_id integer NOT NULL,
    exam_type_id integer,
    grade character varying NOT NULL,
    count integer NOT NULL DEFAULT 0,
    percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_grade_distributions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES school_subjects(id),
    CONSTRAINT school_grade_distributions_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id),
    CONSTRAINT school_grade_distributions_form_id_fkey FOREIGN KEY (form_id) REFERENCES school_forms(id),
    CONSTRAINT school_grade_distributions_exam_type_id_fkey FOREIGN KEY (exam_type_id) REFERENCES school_exam_types(id)
);

-- 8. Academic calendar & events
CREATE TABLE IF NOT EXISTS school_academic_events (
    id SERIAL PRIMARY KEY,
    event_name character varying NOT NULL,
    event_type character varying NOT NULL DEFAULT 'General'::character varying,
    description text,
    start_date date NOT NULL,
    end_date date,
    term_id integer,
    is_school_wide boolean DEFAULT true,
    form_ids integer[] DEFAULT '{}',
    color character varying DEFAULT '#3b82f6'::character varying,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_academic_events_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id)
);

-- 9. Homework & assignments
CREATE TABLE IF NOT EXISTS school_homework (
    id SERIAL PRIMARY KEY,
    subject_id integer NOT NULL,
    form_id integer NOT NULL,
    stream_id integer,
    teacher_id integer NOT NULL,
    title character varying NOT NULL,
    description text,
    due_date date NOT NULL,
    term_id integer,
    status character varying DEFAULT 'Active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_homework_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES school_subjects(id),
    CONSTRAINT school_homework_form_id_fkey FOREIGN KEY (form_id) REFERENCES school_forms(id),
    CONSTRAINT school_homework_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES school_streams(id),
    CONSTRAINT school_homework_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES school_teachers(id),
    CONSTRAINT school_homework_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id)
);

CREATE TABLE IF NOT EXISTS school_homework_submissions (
    id SERIAL PRIMARY KEY,
    homework_id integer NOT NULL,
    student_id integer NOT NULL,
    submitted_at timestamp with time zone,
    status character varying DEFAULT 'Pending'::character varying,
    remarks text,
    acknowledged_by_parent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_homework_submissions_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES school_homework(id) ON DELETE CASCADE,
    CONSTRAINT school_homework_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_homework_submissions_unique UNIQUE (homework_id, student_id)
);

-- 10. Clubs & co-curriculars
CREATE TABLE IF NOT EXISTS school_clubs (
    id SERIAL PRIMARY KEY,
    club_name character varying NOT NULL,
    club_type character varying DEFAULT 'Club'::character varying,
    description text,
    patron_teacher_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_clubs_patron_teacher_id_fkey FOREIGN KEY (patron_teacher_id) REFERENCES school_teachers(id)
);

CREATE TABLE IF NOT EXISTS school_club_members (
    id SERIAL PRIMARY KEY,
    club_id integer NOT NULL,
    student_id integer NOT NULL,
    role character varying DEFAULT 'Member'::character varying,
    joined_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_club_members_club_id_fkey FOREIGN KEY (club_id) REFERENCES school_clubs(id) ON DELETE CASCADE,
    CONSTRAINT school_club_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_club_members_unique UNIQUE (club_id, student_id)
);

-- 11. Fee enhancements
ALTER TABLE school_fee_structures ADD COLUMN IF NOT EXISTS sibling_discount_pct numeric DEFAULT 0;
ALTER TABLE school_fee_structures ADD COLUMN IF NOT EXISTS scholarship_amount numeric DEFAULT 0;
ALTER TABLE school_fee_structures ADD COLUMN IF NOT EXISTS government_capitation numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS school_fee_waivers (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL,
    term_id integer NOT NULL,
    waiver_type character varying NOT NULL DEFAULT 'Scholarship'::character varying,
    amount numeric NOT NULL DEFAULT 0,
    reason text,
    requested_by character varying,
    approved_by character varying,
    status character varying DEFAULT 'Pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_fee_waivers_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_fee_waivers_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id)
);

-- 12. Fee invoices
CREATE TABLE IF NOT EXISTS school_fee_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number character varying NOT NULL UNIQUE,
    student_id integer NOT NULL,
    term_id integer NOT NULL,
    form_id integer,
    total_amount numeric NOT NULL DEFAULT 0,
    amount_paid numeric DEFAULT 0,
    balance numeric DEFAULT 0,
    due_date date,
    status character varying DEFAULT 'Unpaid'::character varying,
    line_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_fee_invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_fee_invoices_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id),
    CONSTRAINT school_fee_invoices_form_id_fkey FOREIGN KEY (form_id) REFERENCES school_forms(id)
);

-- 13. Demand letters for fee defaulters
CREATE TABLE IF NOT EXISTS school_demand_letters (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL,
    term_id integer,
    letter_type character varying NOT NULL DEFAULT 'First Notice'::character varying,
    subject character varying NOT NULL,
    body text NOT NULL,
    amount_owed numeric DEFAULT 0,
    deadline_date date,
    delivery_method character varying DEFAULT 'SMS'::character varying,
    sms_sent boolean DEFAULT false,
    whatsapp_sent boolean DEFAULT false,
    email_sent boolean DEFAULT false,
    status character varying DEFAULT 'Draft'::character varying,
    issued_by character varying,
    parent_acknowledged boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_demand_letters_student_id_fkey FOREIGN KEY (student_id) REFERENCES school_students(id) ON DELETE CASCADE,
    CONSTRAINT school_demand_letters_term_id_fkey FOREIGN KEY (term_id) REFERENCES school_terms(id)
);

-- 14. Audit trail
CREATE TABLE IF NOT EXISTS school_audit_log (
    id BIGSERIAL PRIMARY KEY,
    action character varying NOT NULL,
    actor_id integer,
    actor_name character varying,
    actor_role character varying,
    target_type character varying,
    target_id integer,
    details jsonb,
    ip_address character varying,
    created_at timestamp with time zone DEFAULT now()
);

-- 15. Insert default report card layouts
INSERT INTO school_report_card_layouts (layout_name, layout_code, description, config, is_default) VALUES
('Standard Kenya', 'standard_ke', 'Standard Kenyan report card with all component exams inline', 
 '{"showComponentExams":true,"showSparklines":true,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":true,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":true,"showFeeBalance":true,"showAttendance":true,"showHomework":true,"showClubs":false}', true),
('Compact', 'compact', 'Compact layout — combined scores only, no component breakdown', 
 '{"showComponentExams":false,"showSparklines":false,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":false,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":false,"showFeeBalance":true,"showAttendance":true,"showHomework":false,"showClubs":false}', false),
('Detailed CBC', 'detailed_cbc', 'CBC curriculum layout with strands, sub-strands, and rubric assessments', 
 '{"showComponentExams":true,"showSparklines":true,"showStudentPhoto":true,"showClassPosition":false,"showStreamPosition":false,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":true,"showFeeBalance":true,"showAttendance":true,"showHomework":true,"showClubs":true,"showStrands":true,"showRubric":true}', false),
('Parent Friendly', 'parent_friendly', 'Simplified layout for parents — grades, remarks, fee balance only', 
 '{"showComponentExams":false,"showSparklines":false,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":false,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":false,"showFeeBalance":true,"showAttendance":true,"showHomework":false,"showClubs":false,"largeFont":true}', false),
('KCSE Prediction', 'kcse_prediction', 'Includes KCSE predicted grades alongside current performance', 
 '{"showComponentExams":true,"showSparklines":true,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":true,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":true,"showFeeBalance":true,"showAttendance":true,"showHomework":false,"showClubs":false,"showKCSEPrediction":true}', false),
('Multi-Term Comparison', 'multi_term', 'Shows current and previous term scores side by side with trend arrows', 
 '{"showComponentExams":true,"showSparklines":true,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":true,"showSubjectRemarks":true,"showClassTeacherRemark":true,"showPrincipalRemark":true,"showDigitalSignature":true,"showFeeBalance":true,"showAttendance":true,"showHomework":false,"showClubs":false,"showPreviousTerm":true}', false),
('Official Transcript', 'official_transcript', 'Formal transcript layout for university/college applications', 
 '{"showComponentExams":false,"showSparklines":false,"showStudentPhoto":true,"showClassPosition":true,"showStreamPosition":true,"showSubjectRemarks":false,"showClassTeacherRemark":false,"showPrincipalRemark":true,"showDigitalSignature":true,"showFeeBalance":false,"showAttendance":true,"showHomework":false,"showClubs":true,"showAllTerms":true,"officialSeal":true}', false)
ON CONFLICT (layout_code) DO NOTHING;

-- 16. Add RLS policies for new tables
ALTER TABLE school_student_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_student_rankings" ON school_student_rankings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_subject_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_subject_remarks" ON school_subject_remarks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_report_card_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_report_card_layouts" ON school_report_card_layouts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_kcse_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_kcse_predictions" ON school_kcse_predictions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_grade_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_grade_distributions" ON school_grade_distributions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_academic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_academic_events" ON school_academic_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_homework" ON school_homework FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_homework_submissions" ON school_homework_submissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_clubs" ON school_clubs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_club_members" ON school_club_members FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_fee_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_waivers" ON school_fee_waivers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_fee_invoices" ON school_fee_invoices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_demand_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_demand_letters" ON school_demand_letters FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_audit_log" ON school_audit_log FOR ALL USING (true) WITH CHECK (true);

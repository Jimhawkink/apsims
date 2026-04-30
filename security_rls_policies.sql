-- ============================================================
-- SECURITY: Enable Row Level Security on ALL school tables
-- Run this in Supabase SQL Editor
-- Only includes tables that actually exist in the database
-- ============================================================

-- 1. Enable RLS on every school_ table
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scheme_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_portal_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_mpesa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_kcb_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subordinate_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_support_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_cbc_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_cbc_sub_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_remedial_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_remedial_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_remedial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_rim_paper ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_leave_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_library_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_report_card_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tenants ENABLE ROW LEVEL SECURITY;

-- 2. Read-only access for reference/lookup tables (anon key)
CREATE POLICY "anon_read_subjects" ON public.school_subjects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_forms" ON public.school_forms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_streams" ON public.school_streams FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_terms" ON public.school_terms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_exam_types" ON public.school_exam_types FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_periods" ON public.school_timetable_periods FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_strands" ON public.school_cbc_strands FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_sub_strands" ON public.school_cbc_sub_strands FOR SELECT TO anon USING (true);

-- 3. Read access for dashboard display data (anon key)
CREATE POLICY "anon_read_students" ON public.school_students FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_teachers" ON public.school_teachers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_attendance" ON public.school_daily_attendance FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_fee_structures" ON public.school_fee_structures FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_fee_payments" ON public.school_fee_payments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_exam_marks" ON public.school_exam_marks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_schemes" ON public.school_schemes_of_work FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_scheme_weeks" ON public.school_scheme_weeks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_scheme_lessons" ON public.school_scheme_lessons FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_topics" ON public.school_topics FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_subject_teachers" ON public.school_subject_teachers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_timetable" ON public.school_timetable_entries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tenants" ON public.school_tenants FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_users" ON public.school_users FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_portal_users" ON public.school_portal_users FOR SELECT TO anon USING (true);

-- 4. Deny anon write access to critical tables
-- Students
CREATE POLICY "deny_anon_insert_students" ON public.school_students FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_students" ON public.school_students FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_students" ON public.school_students FOR DELETE TO anon USING (false);

-- Fee Payments
CREATE POLICY "deny_anon_insert_payments" ON public.school_fee_payments FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_payments" ON public.school_fee_payments FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_payments" ON public.school_fee_payments FOR DELETE TO anon USING (false);

-- Users
CREATE POLICY "deny_anon_insert_users" ON public.school_users FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_users" ON public.school_users FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_users" ON public.school_users FOR DELETE TO anon USING (false);

-- Portal Users
CREATE POLICY "deny_anon_insert_portal_users" ON public.school_portal_users FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_portal_users" ON public.school_portal_users FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_portal_users" ON public.school_portal_users FOR DELETE TO anon USING (false);

-- Exam Marks
CREATE POLICY "deny_anon_insert_exam_marks" ON public.school_exam_marks FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_exam_marks" ON public.school_exam_marks FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_exam_marks" ON public.school_exam_marks FOR DELETE TO anon USING (false);

-- Discipline
CREATE POLICY "deny_anon_insert_discipline" ON public.school_discipline_records FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_delete_discipline" ON public.school_discipline_records FOR DELETE TO anon USING (false);

-- Payroll
CREATE POLICY "deny_anon_insert_payroll" ON public.school_payroll FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_payroll" ON public.school_payroll FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_payroll" ON public.school_payroll FOR DELETE TO anon USING (false);

-- M-Pesa Config (most sensitive — contains API keys)
CREATE POLICY "deny_anon_all_mpesa_config" ON public.school_mpesa_config FOR ALL TO anon USING (false) WITH CHECK (false);

-- Tenants
CREATE POLICY "deny_anon_insert_tenants" ON public.school_tenants FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_anon_update_tenants" ON public.school_tenants FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_anon_delete_tenants" ON public.school_tenants FOR DELETE TO anon USING (false);

-- 5. Service role bypasses RLS (already default in Supabase)
-- Use service_role key ONLY in server-side API routes, NEVER in client code

-- ============================================================
-- IMPORTANT: After running this, you MUST:
-- 1. Move all write operations to API routes that use SUPABASE_SERVICE_ROLE_KEY
-- 2. Keep NEXT_PUBLIC_SUPABASE_ANON_KEY for read-only client queries
-- 3. Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables
-- ============================================================

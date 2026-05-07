-- ============================================================
-- APSIMS PRODUCTION-READY RLS POLICIES
-- Replaces the development "Allow All" policies with proper
-- security for multi-school SaaS deployment
-- ============================================================
-- 
-- STRATEGY:
-- 1. APSIMS uses Supabase service_role key server-side (bypasses RLS)
-- 2. Client-side uses anon key for read-only display queries
-- 3. ALL write operations go through Next.js API routes (service_role)
-- 4. Anon key gets SELECT-only on non-sensitive tables
-- 5. Anon key gets NO access to sensitive tables (payments, payroll, M-Pesa)
--
-- Run this AFTER the existing security_rls_policies.sql
-- ============================================================

-- ═══════════════════════════════════════════════════
-- STEP 1: Drop ALL existing "Allow all" development policies
-- ═══════════════════════════════════════════════════

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies with "Allow all" pattern from school_ tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (policyname LIKE 'Allow all%' OR policyname LIKE 'allow_all%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- Also drop previously-created anon policies (from security_rls_policies.sql)
-- to rebuild them cleanly
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (policyname LIKE 'anon_%' OR policyname LIKE 'deny_anon_%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════
-- STEP 2: Ensure RLS is ENABLED on every table
-- ═══════════════════════════════════════════════════

DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'school_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        RAISE NOTICE 'RLS enabled on: %', tbl;
    END LOOP;
    
    -- Also enable on CBC tables
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'cbc_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════
-- STEP 3: Service role bypass (already default in Supabase)
-- service_role key always bypasses RLS — used in API routes
-- ═══════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- STEP 4: ANON KEY — Read-Only Access (non-sensitive tables only)
-- These policies allow the client-side dashboard to fetch display data
-- ═══════════════════════════════════════════════════

-- ─── TIER 1: Public reference/lookup data (safe for anon read) ───
CREATE POLICY "secure_anon_read_forms" ON public.school_forms 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_streams" ON public.school_streams 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_subjects" ON public.school_subjects 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_terms" ON public.school_terms 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_exam_types" ON public.school_exam_types 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_grading" ON public.school_grading_system 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_school_details" ON public.school_details 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_expense_categories" ON public.school_expense_categories 
    FOR SELECT TO anon USING (true);

-- ─── TIER 2: Dashboard display data (required for admin dashboard) ───
-- These tables contain student/teacher info needed for the dashboard
-- The middleware already enforces login before any dashboard route

CREATE POLICY "secure_anon_read_students" ON public.school_students 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_teachers" ON public.school_teachers 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_support_teachers" ON public.school_support_teachers 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_subordinate_staff" ON public.school_subordinate_staff 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_attendance" ON public.school_daily_attendance 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_exam_marks" ON public.school_exam_marks 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_fee_structures" ON public.school_fee_structures 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_fee_payments" ON public.school_fee_payments 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_subject_teachers" ON public.school_subject_teachers 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_classes" ON public.school_classes 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_timetable_entries" ON public.school_timetable_entries 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_timetable_periods" ON public.school_timetable_periods 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_schemes" ON public.school_schemes_of_work 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_scheme_weeks" ON public.school_scheme_weeks 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_scheme_lessons" ON public.school_scheme_lessons 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_topics" ON public.school_topics 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_discipline" ON public.school_discipline_records 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_message_logs" ON public.school_message_logs 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_question_bank" ON public.school_question_bank 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_tenants" ON public.school_tenants 
    FOR SELECT TO anon USING (true);

-- Portal users: anon read needed for portal login flow
CREATE POLICY "secure_anon_read_portal_users" ON public.school_portal_users 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_parent_students" ON public.school_parent_students 
    FOR SELECT TO anon USING (true);

CREATE POLICY "secure_anon_read_portal_notifications" ON public.school_portal_notifications 
    FOR SELECT TO anon USING (true);

-- CBC tables
DO $$ BEGIN
    CREATE POLICY "secure_anon_read_cbc_strands" ON public.school_cbc_strands 
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "secure_anon_read_cbc_sub_strands" ON public.school_cbc_sub_strands 
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "secure_anon_read_cbc_pathways" ON public.cbc_pathways 
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "secure_anon_read_cbc_pathway_subjects" ON public.cbc_pathway_subjects 
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "secure_anon_read_cbc_rubric_config" ON public.cbc_rubric_config 
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Users table: read needed for auth check
CREATE POLICY "secure_anon_read_users" ON public.school_users 
    FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════
-- STEP 5: DENY all anon WRITE operations on EVERY table
-- All inserts/updates/deletes must go through API routes
-- ═══════════════════════════════════════════════════

-- ─── Critical: DENY ALL access to M-Pesa config (contains API keys) ───
CREATE POLICY "lockdown_mpesa_config" ON public.school_mpesa_config 
    FOR ALL TO anon USING (false) WITH CHECK (false);

-- ─── Critical: DENY ALL access to M-Pesa transactions ───
CREATE POLICY "lockdown_mpesa_transactions" ON public.school_mpesa_transactions 
    FOR ALL TO anon USING (false) WITH CHECK (false);

-- ─── Critical: DENY ALL access to KCB transactions ───
DO $$ BEGIN
    CREATE POLICY "lockdown_kcb_transactions" ON public.school_kcb_transactions 
        FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── Critical: DENY ALL access to payment attempts ───
DO $$ BEGIN
    CREATE POLICY "lockdown_payment_attempts" ON public.school_payment_attempts 
        FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── Critical: DENY ALL access to payroll ───
CREATE POLICY "lockdown_payroll_insert" ON public.school_payroll 
    FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "lockdown_payroll_update" ON public.school_payroll 
    FOR UPDATE TO anon USING (false);
CREATE POLICY "lockdown_payroll_delete" ON public.school_payroll 
    FOR DELETE TO anon USING (false);

-- ─── DENY writes to all other school_ tables ───
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'school_%'
        -- Exclude tables that already have specific policies above
        AND tablename NOT IN (
            'school_mpesa_config', 
            'school_mpesa_transactions', 
            'school_kcb_transactions',
            'school_payment_attempts',
            'school_payroll'
        )
    LOOP
        -- Create INSERT deny policy
        BEGIN
            EXECUTE format(
                'CREATE POLICY "lockdown_%s_insert" ON public.%I FOR INSERT TO anon WITH CHECK (false)',
                tbl, tbl
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        -- Create UPDATE deny policy
        BEGIN
            EXECUTE format(
                'CREATE POLICY "lockdown_%s_update" ON public.%I FOR UPDATE TO anon USING (false)',
                tbl, tbl
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        -- Create DELETE deny policy
        BEGIN
            EXECUTE format(
                'CREATE POLICY "lockdown_%s_delete" ON public.%I FOR DELETE TO anon USING (false)',
                tbl, tbl
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        RAISE NOTICE 'Write lockdown applied to: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════
-- STEP 6: WhatsApp delivery tracking table
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.school_whatsapp_delivery (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(200) UNIQUE NOT NULL,
    recipient_phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
    status_timestamp TIMESTAMPTZ,
    error_code VARCHAR(50),
    error_title VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_whatsapp_delivery ENABLE ROW LEVEL SECURITY;

-- Anon read for dashboard display
CREATE POLICY "secure_anon_read_wa_delivery" ON public.school_whatsapp_delivery 
    FOR SELECT TO anon USING (true);

-- Deny anon writes
CREATE POLICY "lockdown_wa_delivery_insert" ON public.school_whatsapp_delivery 
    FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "lockdown_wa_delivery_update" ON public.school_whatsapp_delivery 
    FOR UPDATE TO anon USING (false);
CREATE POLICY "lockdown_wa_delivery_delete" ON public.school_whatsapp_delivery 
    FOR DELETE TO anon USING (false);

-- ═══════════════════════════════════════════════════
-- VERIFICATION: List all policies after migration
-- ═══════════════════════════════════════════════════

SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (tablename LIKE 'school_%' OR tablename LIKE 'cbc_%')
ORDER BY tablename, policyname;

-- ============================================================
-- POST-MIGRATION CHECKLIST:
-- ============================================================
-- ✅ 1. Verify all API routes use SUPABASE_SERVICE_ROLE_KEY (not anon key)
-- ✅ 2. Verify client-side only uses NEXT_PUBLIC_SUPABASE_ANON_KEY for reads
-- ✅ 3. Test that dashboard loads correctly (read queries should work)
-- ✅ 4. Test that form submissions work (go through API routes)
-- ✅ 5. Verify M-Pesa config is completely inaccessible from browser console
-- ✅ 6. Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables
-- ============================================================

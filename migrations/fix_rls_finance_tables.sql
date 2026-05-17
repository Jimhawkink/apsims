-- =====================================================
-- Fix RLS on finance tables that use auth.uid() tenant_id
-- These tables use custom JWT auth, not Supabase Auth,
-- so auth.uid() is always NULL causing RLS violations.
-- Solution: disable RLS (access is controlled at app level)
-- =====================================================

-- Disable RLS on budget votes
ALTER TABLE public.school_budget_votes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other finance tables with same issue
ALTER TABLE public.school_bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_capitation DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_bursary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payroll_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_budget_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_etims_config DISABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies on these tables
DROP POLICY IF EXISTS "tenant_isolation" ON public.school_budget_votes;
DROP POLICY IF EXISTS "Users can manage their own budget votes" ON public.school_budget_votes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.school_bank_accounts;
DROP POLICY IF EXISTS "tenant_isolation" ON public.school_capitation;
DROP POLICY IF EXISTS "tenant_isolation" ON public.school_bursary_records;
DROP POLICY IF EXISTS "tenant_isolation" ON public.school_payroll_schedule;

-- Grant full access to anon and authenticated roles
GRANT ALL ON public.school_budget_votes TO anon, authenticated;
GRANT ALL ON public.school_bank_accounts TO anon, authenticated;
GRANT ALL ON public.school_capitation TO anon, authenticated;
GRANT ALL ON public.school_bursary_records TO anon, authenticated;
GRANT ALL ON public.school_payroll_schedule TO anon, authenticated;
GRANT ALL ON public.school_etims_config TO anon, authenticated;

-- Also grant sequence access for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

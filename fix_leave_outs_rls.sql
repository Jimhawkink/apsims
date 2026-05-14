-- ═══════════════════════════════════════════════════════════════
-- FIX: Add RLS policies for school_leave_outs
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add missing columns (leave_days, expected_return)
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS leave_days integer DEFAULT 0;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS expected_return timestamp with time zone;

-- 2. Add RLS policies for leave_outs (SELECT + INSERT + UPDATE for anon)
DO $$ BEGIN
  CREATE POLICY "anon_read_leave_outs" ON public.school_leave_outs FOR SELECT TO anon USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_leave_outs" ON public.school_leave_outs FOR INSERT TO anon WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_leave_outs" ON public.school_leave_outs FOR UPDATE TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Also add SMS fields to school_details if not done
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_provider character varying DEFAULT 'AfricasTalking';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_api_key character varying;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_username character varying DEFAULT 'sandbox';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_sender_id character varying DEFAULT 'APSIMS';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_is_sandbox boolean DEFAULT true;

-- Done! ✅ Now leave-out issuance will work.

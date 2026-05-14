-- ═══════════════════════════════════════════════════════════════
-- APSIMS Leave-Out Enhancement + SMS Configuration Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add new columns to school_leave_outs for days tracking
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS leave_days integer DEFAULT 0;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS expected_return timestamp with time zone;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS authorized_by text;

-- 2. Add SMS fields to school_details if not exist
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_provider character varying DEFAULT 'AfricasTalking';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_api_key character varying;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_username character varying DEFAULT 'sandbox';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_sender_id character varying DEFAULT 'APSIMS';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_is_sandbox boolean DEFAULT true;

-- Done! ✅

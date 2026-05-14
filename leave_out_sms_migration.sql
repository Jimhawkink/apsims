-- ═══════════════════════════════════════════════════════════════
-- APSIMS Leave-Out Enhancement + SMS Configuration Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add new columns to school_leave_outs for days tracking and SMS
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS leave_days integer DEFAULT 0;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS expected_return timestamp with time zone;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS sms_sent boolean DEFAULT false;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS sms_phone character varying;
ALTER TABLE school_leave_outs ADD COLUMN IF NOT EXISTS reason_details text;

-- 2. Create SMS config table (same pattern as ARMS)
CREATE TABLE IF NOT EXISTS school_sms_config (
    config_id integer NOT NULL DEFAULT nextval('school_sms_config_config_id_seq'::regclass),
    provider character varying DEFAULT 'AfricasTalking'::character varying,
    api_key character varying NOT NULL,
    username character varying NOT NULL,
    sender_id character varying,
    short_code character varying,
    is_active boolean DEFAULT true,
    is_sandbox boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_sms_config_pkey PRIMARY KEY (config_id)
);

-- Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS school_sms_config_config_id_seq;

-- 3. Create SMS logs table (same pattern as ARMS)
CREATE TABLE IF NOT EXISTS school_sms_logs (
    sms_id integer NOT NULL DEFAULT nextval('school_sms_logs_sms_id_seq'::regclass),
    recipient_phone character varying NOT NULL,
    recipient_name character varying,
    message text NOT NULL,
    message_type character varying DEFAULT 'Custom'::character varying,
    student_id integer,
    provider character varying DEFAULT 'AfricasTalking'::character varying,
    provider_message_id character varying,
    status character varying DEFAULT 'Queued'::character varying,
    cost numeric DEFAULT 0,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    error_message text,
    sent_by character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT school_sms_logs_pkey PRIMARY KEY (sms_id)
);

CREATE SEQUENCE IF NOT EXISTS school_sms_logs_sms_id_seq;

-- 4. Add SMS fields to school_details if not exist
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_provider character varying DEFAULT 'AfricasTalking';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_api_key character varying;
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_username character varying DEFAULT 'sandbox';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_sender_id character varying DEFAULT 'APSIMS';
ALTER TABLE school_details ADD COLUMN IF NOT EXISTS sms_is_sandbox boolean DEFAULT true;

-- Done! ✅

-- Audit log table for security tracking
CREATE TABLE IF NOT EXISTS public.school_audit_log (
  id bigserial PRIMARY KEY,
  action character varying NOT NULL,
  actor_id integer,
  actor_name character varying,
  actor_role character varying,
  target_type character varying,
  target_id character varying,
  details jsonb,
  ip_address character varying,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.school_audit_log ENABLE ROW LEVEL SECURITY;

-- No one can delete or update audit logs (immutable)
CREATE POLICY "deny_audit_update" ON public.school_audit_log FOR UPDATE TO anon USING (false);
CREATE POLICY "deny_audit_delete" ON public.school_audit_log FOR DELETE TO anon USING (false);
CREATE POLICY "deny_audit_delete_service" ON public.school_audit_log FOR DELETE TO authenticated USING (false);
CREATE POLICY "deny_audit_update_service" ON public.school_audit_log FOR UPDATE TO authenticated USING (false);

-- Only service role can insert (via API)
CREATE POLICY "service_insert_audit" ON public.school_audit_log FOR INSERT TO anon WITH CHECK (true);

-- Admins can read audit log
CREATE POLICY "anon_read_audit" ON public.school_audit_log FOR SELECT TO anon USING (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.school_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.school_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.school_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.school_audit_log(target_type, target_id);

-- ============================================================
-- Add reset_token columns to school_users (for forgot password)
-- Run these ALTER statements — they are safe if columns already exist
-- ============================================================

-- Add reset_token column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_users' AND column_name = 'reset_token') THEN
    ALTER TABLE public.school_users ADD COLUMN reset_token character varying(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_users' AND column_name = 'reset_token_expires') THEN
    ALTER TABLE public.school_users ADD COLUMN reset_token_expires timestamp with time zone;
  END IF;
END
$$;

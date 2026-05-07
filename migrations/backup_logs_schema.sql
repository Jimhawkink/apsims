-- ============================================================
-- APSIMS Backup Logs Table
-- Tracks all backup and restore operations
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_backup_logs (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL DEFAULT 'full',  -- full, restore, partial
    table_count INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    file_size_kb INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Success',  -- Success, Partial, Failed
    created_by VARCHAR(200),
    errors TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_backup_logs ENABLE ROW LEVEL SECURITY;

-- Anon can read backup history for dashboard display
CREATE POLICY "secure_anon_read_backup_logs" ON public.school_backup_logs
    FOR SELECT TO anon USING (true);

-- Deny anon writes (backups go through service_role API)
CREATE POLICY "lockdown_backup_logs_insert" ON public.school_backup_logs
    FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "lockdown_backup_logs_update" ON public.school_backup_logs
    FOR UPDATE TO anon USING (false);
CREATE POLICY "lockdown_backup_logs_delete" ON public.school_backup_logs
    FOR DELETE TO anon USING (false);

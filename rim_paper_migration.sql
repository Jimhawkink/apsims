-- Rim Paper Tracking Tables
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.school_rim_paper (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.school_students(id),
    term_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    brought BOOLEAN NOT NULL DEFAULT false,
    brought_date DATE,
    registered_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, term_name, year)
);

-- Enable RLS
ALTER TABLE public.school_rim_paper ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_rim_paper" ON public.school_rim_paper FOR ALL USING (true) WITH CHECK (true);

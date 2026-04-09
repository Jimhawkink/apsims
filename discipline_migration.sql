-- Student Discipline Management Tables (Kenya CBC Aligned)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.school_discipline_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.school_students(id),
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'Minor',
    description TEXT NOT NULL,
    action_taken VARCHAR(200) NOT NULL,
    action_details TEXT,
    reported_by VARCHAR(200),
    teacher_id INTEGER REFERENCES public.school_teachers(id),
    parent_notified BOOLEAN NOT NULL DEFAULT false,
    parent_notified_date DATE,
    counseling_referred BOOLEAN NOT NULL DEFAULT false,
    counseling_notes TEXT,
    follow_up_date DATE,
    follow_up_notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Open',
    term VARCHAR(20) DEFAULT 'Term 1',
    year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Enable RLS
ALTER TABLE public.school_discipline_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for school_discipline_records" ON public.school_discipline_records FOR ALL USING (true) WITH CHECK (true);

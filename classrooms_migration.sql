-- ============================================
-- CLASSROOMS & SUBSTITUTIONS TABLES
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Classrooms / Rooms
CREATE TABLE IF NOT EXISTS public.school_classrooms (
    id SERIAL PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL UNIQUE,
    room_code VARCHAR(20),
    room_type VARCHAR(50) NOT NULL DEFAULT 'classroom',
    building VARCHAR(100),
    floor_number INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 40,
    has_projector BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Substitutions
CREATE TABLE IF NOT EXISTS public.school_substitutions (
    id SERIAL PRIMARY KEY,
    substitution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    absent_teacher_id INTEGER NOT NULL REFERENCES public.school_teachers(id) ON DELETE CASCADE,
    substitute_teacher_id INTEGER REFERENCES public.school_teachers(id) ON DELETE SET NULL,
    period_id INTEGER NOT NULL REFERENCES public.school_timetable_periods(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES public.school_forms(id),
    stream_id INTEGER NOT NULL REFERENCES public.school_streams(id),
    subject_id INTEGER REFERENCES public.school_subjects(id),
    reason VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_substitutions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_classrooms') THEN
        CREATE POLICY "Allow all for school_classrooms" ON public.school_classrooms FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_substitutions') THEN
        CREATE POLICY "Allow all for school_substitutions" ON public.school_substitutions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Seed default classrooms
INSERT INTO public.school_classrooms (room_name, room_code, room_type, capacity) VALUES
    ('Classroom 1', 'CR1', 'classroom', 45),
    ('Classroom 2', 'CR2', 'classroom', 45),
    ('Classroom 3', 'CR3', 'classroom', 45),
    ('Classroom 4', 'CR4', 'classroom', 45),
    ('Science Lab 1', 'LAB1', 'lab', 35),
    ('Science Lab 2', 'LAB2', 'lab', 35),
    ('Computer Lab', 'COMP', 'computer_lab', 30),
    ('Library', 'LIB', 'library', 60),
    ('Hall', 'HALL', 'hall', 200),
    ('Sports Field', 'FIELD', 'gym', 100)
ON CONFLICT (room_name) DO NOTHING;

-- ============================================
-- TIMETABLE MANAGEMENT TABLES (ASC-Style)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Period/slot definitions for the school day
CREATE TABLE IF NOT EXISTS public.school_timetable_periods (
    id SERIAL PRIMARY KEY,
    period_number INTEGER NOT NULL,
    period_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'lesson',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Lesson requirements per class (ASC-style "cards")
--    e.g., Form 1 East needs 5 Math lessons/week taught by Mr. Smith
CREATE TABLE IF NOT EXISTS public.school_timetable_requirements (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES public.school_forms(id) ON DELETE CASCADE,
    stream_id INTEGER NOT NULL REFERENCES public.school_streams(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES public.school_teachers(id) ON DELETE SET NULL,
    lessons_per_week INTEGER NOT NULL DEFAULT 1 CHECK (lessons_per_week BETWEEN 1 AND 10),
    max_per_day INTEGER NOT NULL DEFAULT 2 CHECK (max_per_day BETWEEN 1 AND 4),
    allow_double BOOLEAN NOT NULL DEFAULT false,
    term VARCHAR(20) NOT NULL DEFAULT 'Term 1',
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(form_id, stream_id, subject_id, term, year)
);

-- 3. Teacher availability constraints
--    Mark specific slots as unavailable for a teacher
CREATE TABLE IF NOT EXISTS public.school_teacher_availability (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES public.school_teachers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    period_id INTEGER NOT NULL REFERENCES public.school_timetable_periods(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    term VARCHAR(20) NOT NULL DEFAULT 'Term 1',
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teacher_id, day_of_week, period_id, term, year)
);

-- 4. Timetable entries (actual lesson assignments — generated or manual)
CREATE TABLE IF NOT EXISTS public.school_timetable_entries (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    period_id INTEGER NOT NULL REFERENCES public.school_timetable_periods(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES public.school_forms(id),
    stream_id INTEGER NOT NULL REFERENCES public.school_streams(id),
    subject_id INTEGER REFERENCES public.school_subjects(id),
    teacher_id INTEGER REFERENCES public.school_teachers(id),
    room VARCHAR(100),
    is_double BOOLEAN NOT NULL DEFAULT false,
    term VARCHAR(20) NOT NULL DEFAULT 'Term 1',
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(day_of_week, period_id, form_id, stream_id, term, year)
);

-- Enable RLS
ALTER TABLE public.school_timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_entries ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for authenticated)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_timetable_periods') THEN
        CREATE POLICY "Allow all for school_timetable_periods" ON public.school_timetable_periods FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_timetable_requirements') THEN
        CREATE POLICY "Allow all for school_timetable_requirements" ON public.school_timetable_requirements FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_teacher_availability') THEN
        CREATE POLICY "Allow all for school_teacher_availability" ON public.school_teacher_availability FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for school_timetable_entries') THEN
        CREATE POLICY "Allow all for school_timetable_entries" ON public.school_timetable_entries FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Insert Kenya MoE default periods (skip if already exist)
INSERT INTO public.school_timetable_periods (period_number, period_name, start_time, end_time, period_type)
SELECT * FROM (VALUES
    (1,  'Assembly',         '08:00'::TIME, '08:20'::TIME, 'assembly'),
    (2,  'Lesson 1',         '08:20'::TIME, '09:00'::TIME, 'lesson'),
    (3,  'Lesson 2',         '09:00'::TIME, '09:40'::TIME, 'lesson'),
    (4,  'Morning Break',    '09:40'::TIME, '09:50'::TIME, 'break'),
    (5,  'Lesson 3',         '09:50'::TIME, '10:30'::TIME, 'lesson'),
    (6,  'Lesson 4',         '10:30'::TIME, '11:10'::TIME, 'lesson'),
    (7,  'Mid-Morning Break','11:10'::TIME, '11:40'::TIME, 'break'),
    (8,  'Lesson 5',         '11:40'::TIME, '12:20'::TIME, 'lesson'),
    (9,  'Lesson 6',         '12:20'::TIME, '13:00'::TIME, 'lesson'),
    (10, 'Lunch Break',      '13:00'::TIME, '14:00'::TIME, 'break'),
    (11, 'Lesson 7',         '14:00'::TIME, '14:40'::TIME, 'lesson'),
    (12, 'Lesson 8',         '14:40'::TIME, '15:20'::TIME, 'lesson')
) AS v(period_number, period_name, start_time, end_time, period_type)
WHERE NOT EXISTS (SELECT 1 FROM public.school_timetable_periods LIMIT 1);

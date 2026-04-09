-- Remedial Management Tables
-- Run this in your Supabase SQL Editor

-- Remedial terms/periods configuration
CREATE TABLE IF NOT EXISTS public.school_remedial_terms (
    id SERIAL PRIMARY KEY,
    term_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    fee_amount NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student remedial enrollments
CREATE TABLE IF NOT EXISTS public.school_remedial_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.school_students(id),
    remedial_term_id INTEGER NOT NULL REFERENCES public.school_remedial_terms(id),
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_by VARCHAR(100),
    UNIQUE(student_id, remedial_term_id)
);

-- Remedial payments
CREATE TABLE IF NOT EXISTS public.school_remedial_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.school_students(id),
    remedial_term_id INTEGER NOT NULL REFERENCES public.school_remedial_terms(id),
    amount NUMERIC(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Enable RLS
ALTER TABLE public.school_remedial_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_remedial_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_remedial_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all for school_remedial_terms" ON public.school_remedial_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for school_remedial_enrollments" ON public.school_remedial_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for school_remedial_payments" ON public.school_remedial_payments FOR ALL USING (true) WITH CHECK (true);

-- Insert default term
INSERT INTO public.school_remedial_terms (term_name, year, fee_amount, status)
VALUES ('Term 1', 2026, 1500.00, 'Active');

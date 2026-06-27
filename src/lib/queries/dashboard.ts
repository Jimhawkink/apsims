import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (year: number) => [...dashboardKeys.all, 'stats', year] as const,
  students: (year: number) => [...dashboardKeys.all, 'students', year] as const,
  staff: (year: number) => [...dashboardKeys.all, 'staff', year] as const,
  payments: (year: number, from?: string, to?: string) =>
    [...dashboardKeys.all, 'payments', year, from, to] as const,
  attendance: (date: string) => [...dashboardKeys.all, 'attendance', date] as const,
};

// ─── Students Query ──────────────────────────────────────────────────────────
export function useStudents(year?: number) {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: dashboardKeys.students(currentYear),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_students')
        .select('id, full_name, admission_no, form_id, stream_id, gender, status, enrollment_year, photo_url')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min — student list doesn't change that fast
  });
}

// ─── Staff Query ─────────────────────────────────────────────────────────────
export function useStaff() {
  return useQuery({
    queryKey: ['staff', 'all'],
    queryFn: async () => {
      const [teachers, support, subordinate] = await Promise.all([
        supabase.from('school_teachers').select('id, full_name, tsc_number, is_active').eq('is_active', true),
        supabase.from('school_support_teachers').select('id, full_name, is_active').eq('is_active', true),
        supabase.from('school_subordinate_staff').select('id, full_name, is_active').eq('is_active', true),
      ]);
      return {
        teachers: teachers.data || [],
        support: support.data || [],
        subordinate: subordinate.data || [],
        total: (teachers.data?.length || 0) + (support.data?.length || 0) + (subordinate.data?.length || 0),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 min — staff changes rarely
  });
}

// ─── Fee Payments Query ──────────────────────────────────────────────────────
export function useFeePayments(from: string, to: string) {
  return useQuery({
    queryKey: ['fee-payments', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_fee_payments')
        .select('id, student_id, amount, payment_method, payment_date, receipt_no, student_name')
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 min — payments can come in frequently
  });
}

// ─── Fee Structures Query ─────────────────────────────────────────────────────
export function useFeeStructures(termId?: number) {
  return useQuery({
    queryKey: ['fee-structures', termId],
    queryFn: async () => {
      let query = supabase.from('school_fee_structures').select('*');
      if (termId) query = query.eq('term_id', termId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 min — fee structures are set per term
    enabled: true,
  });
}

// ─── Today Attendance Query ───────────────────────────────────────────────────
export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: dashboardKeys.attendance(today),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_attendance')
        .select('id, student_id, status, attendance_date, form_id')
        .eq('attendance_date', today);
      if (error) throw error;
      const present = data?.filter(r => r.status === 'present').length || 0;
      const absent = data?.filter(r => r.status === 'absent').length || 0;
      const late = data?.filter(r => r.status === 'late').length || 0;
      const total = (present + absent + late) || 1;
      return { records: data || [], present, absent, late, rate: Math.round((present / total) * 100) };
    },
    staleTime: 60 * 1000, // 1 min — attendance changes during school hours
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

// ─── Forms + Streams ──────────────────────────────────────────────────────────
export function useFormsAndStreams() {
  return useQuery({
    queryKey: ['forms-streams'],
    queryFn: async () => {
      const [forms, streams] = await Promise.all([
        supabase.from('school_forms').select('*').order('form_number'),
        supabase.from('school_streams').select('*'),
      ]);
      return { forms: forms.data || [], streams: streams.data || [] };
    },
    staleTime: 30 * 60 * 1000, // 30 min — forms/streams rarely change
  });
}

// ─── Terms Query ──────────────────────────────────────────────────────────────
export function useTerms() {
  return useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_terms')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour — terms change 3x per year
  });
}

// ─── Dashboard Summary (aggregated) ──────────────────────────────────────────
export function useDashboardSummary(currentYear: number) {
  const studentsQuery = useStudents(currentYear);
  const staffQuery = useStaff();

  return {
    students: studentsQuery.data,
    staff: staffQuery.data,
    isLoading: studentsQuery.isLoading || staffQuery.isLoading,
    isError: studentsQuery.isError || staffQuery.isError,
  };
}

// ─── Expenses Query ───────────────────────────────────────────────────────────
export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: ['expenses', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_expenses')
        .select('*')
        .gte('expense_date', from)
        .lte('expense_date', to);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Prefetch Helper — call this on route hover to preload data ───────────────
export async function prefetchStudents(queryClient: ReturnType<typeof useQueryClient>, year: number) {
  await queryClient.prefetchQuery({
    queryKey: dashboardKeys.students(year),
    queryFn: async () => {
      const { data } = await supabase
        .from('school_students')
        .select('id, full_name, admission_no, form_id, stream_id, gender, status')
        .eq('status', 'active');
      return data || [];
    },
  });
}

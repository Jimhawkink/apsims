import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const feeKeys = {
  all: ['fees'] as const,
  payments: (from: string, to: string) => [...feeKeys.all, 'payments', from, to] as const,
  outstanding: (formId?: number) => [...feeKeys.all, 'outstanding', formId] as const,
  structures: (termId?: number) => [...feeKeys.all, 'structures', termId] as const,
  studentBalance: (studentId: number) => [...feeKeys.all, 'balance', studentId] as const,
};

// ─── Record a new fee payment (mutation) ──────────────────────────────────────
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      student_id: number;
      student_name: string;
      amount: number;
      payment_method: 'cash' | 'mpesa' | 'bank' | 'cheque';
      payment_date: string;
      term_id?: number;
      receipt_no?: string;
      mpesa_code?: string;
      notes?: string;
      recorded_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('school_fee_payments')
        .insert([payment])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    // Optimistic update — show new payment immediately before server confirms
    onMutate: async (newPayment) => {
      // Cancel outgoing queries for payments
      await queryClient.cancelQueries({ queryKey: feeKeys.all });
      // Return context for rollback
      return { previousData: queryClient.getQueryData(feeKeys.all) };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(feeKeys.all, context.previousData);
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch all fee-related queries
      queryClient.invalidateQueries({ queryKey: feeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Update student balance immediately
      queryClient.invalidateQueries({
        queryKey: feeKeys.studentBalance(data.student_id),
      });
    },
  });
}

// ─── Outstanding Fees ─────────────────────────────────────────────────────────
export function useOutstandingFees(formId?: number) {
  return useQuery({
    queryKey: feeKeys.outstanding(formId),
    queryFn: async () => {
      let query = supabase
        .from('school_students')
        .select(`
          id, full_name, admission_no, form_id, stream_id,
          school_forms(name),
          school_streams(name)
        `)
        .eq('status', 'active');
      if (formId) query = query.eq('form_id', formId);
      const { data: students, error } = await query;
      if (error) throw error;
      return students || [];
    },
    staleTime: 3 * 60 * 1000,
  });
}

// ─── Student Fee Balance ───────────────────────────────────────────────────────
export function useStudentFeeBalance(studentId: number, termId?: number) {
  return useQuery({
    queryKey: feeKeys.studentBalance(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_fee_payments')
        .select('amount, payment_date, payment_method')
        .eq('student_id', studentId);
      if (error) throw error;
      const totalPaid = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      return { totalPaid, payments: data || [] };
    },
    enabled: studentId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Fee Collection Summary ───────────────────────────────────────────────────
export function useFeeCollectionSummary(from: string, to: string) {
  return useQuery({
    queryKey: feeKeys.payments(from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_fee_payments')
        .select('amount, payment_method, payment_date, student_name')
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      const payments = data || [];
      const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const byCash = payments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + p.amount, 0);
      const byMpesa = payments.filter(p => p.payment_method === 'mpesa').reduce((s, p) => s + p.amount, 0);
      const byBank = payments.filter(p => p.payment_method === 'bank').reduce((s, p) => s + p.amount, 0);
      return { payments, total, byCash, byMpesa, byBank, count: payments.length };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000, // Auto-refresh every 3 min during school hours
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const studentKeys = {
  all: ['students'] as const,
  list: (filters?: Record<string, any>) => [...studentKeys.all, 'list', filters] as const,
  detail: (id: number) => [...studentKeys.all, 'detail', id] as const,
  byForm: (formId: number) => [...studentKeys.all, 'form', formId] as const,
  byStream: (streamId: number) => [...studentKeys.all, 'stream', streamId] as const,
  search: (query: string) => [...studentKeys.all, 'search', query] as const,
};

// ─── All Students List ────────────────────────────────────────────────────────
export function useStudentsList(filters?: {
  formId?: number;
  streamId?: number;
  status?: string;
  gender?: string;
}) {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('school_students')
        .select(`
          id, full_name, admission_no, form_id, stream_id,
          gender, status, enrollment_year, photo_url,
          date_of_birth, phone, guardian_name, guardian_phone,
          school_forms(id, name, form_number),
          school_streams(id, name)
        `)
        .order('full_name');

      if (filters?.formId) query = query.eq('form_id', filters.formId);
      if (filters?.streamId) query = query.eq('stream_id', filters.streamId);
      if (filters?.status) query = query.eq('status', filters.status);
      else query = query.eq('status', 'active');
      if (filters?.gender) query = query.eq('gender', filters.gender);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Single Student Detail ────────────────────────────────────────────────────
export function useStudentDetail(studentId: number) {
  return useQuery({
    queryKey: studentKeys.detail(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_students')
        .select(`
          *,
          school_forms(id, name, form_number),
          school_streams(id, name)
        `)
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: studentId > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Student Search ───────────────────────────────────────────────────────────
export function useStudentSearch(searchQuery: string) {
  return useQuery({
    queryKey: studentKeys.search(searchQuery),
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('school_students')
        .select('id, full_name, admission_no, form_id, school_forms(name)')
        .or(`full_name.ilike.%${searchQuery}%,admission_no.ilike.%${searchQuery}%`)
        .eq('status', 'active')
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

'use client';
/**
 * useSchoolForms — Drop-in replacement for:
 *   supabase.from('school_forms').select('*').order('form_level')
 *
 * Usage in any page:
 *   const { forms, primaryForms, secondaryForms, mode } = useSchoolForms();
 *
 * Returns ONLY forms matching the current school_mode from localStorage.
 * No changes needed to DB queries — just replace the forms state with this hook.
 */
import { useSchoolMode } from '@/contexts/SchoolModeContext';

export function useSchoolForms() {
  return useSchoolMode();
}

export default useSchoolForms;

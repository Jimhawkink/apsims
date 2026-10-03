import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient<any, 'public', any> | null = null;

// ── Build-safe no-op client ──────────────────────────────────────────────────
function createNoopProxy(): any {
  const noop: any = new Proxy(
    () => Promise.resolve({ data: null, error: null }),
    {
      get: (_t, _p) => noop,
      apply: (_t, _th, args) => {
        const last = args[args.length - 1];
        if (typeof last === 'function') last(null, null);
        return {
          ...noop,
          then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
          select: () => noop,
          insert: () => noop,
          update: () => noop,
          delete: () => noop,
          eq:     () => noop,
          neq:    () => noop,
          single: () => Promise.resolve({ data: null, error: null }),
          order:  () => noop,
          limit:  () => noop,
          data:   null,
          error:  null,
        };
      },
    }
  );
  return noop;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🏫 SCHOOL SECTION HELPER — reads from logged-in user in localStorage
// ══════════════════════════════════════════════════════════════════════════════
// SAFETY RULES:
//  1. Returns 'both' (= NO filter) for null / undefined / missing / 'both'
//  2. Returns 'both' on any error or during SSR
//  3. Only returns 'primary' or 'secondary' when EXPLICITLY set in DB
//  4. This means ALL existing users are completely unaffected until they are
//     explicitly assigned a section in User Management
// ══════════════════════════════════════════════════════════════════════════════
function getSchoolSection(): 'primary' | 'secondary' | 'both' {
  if (typeof window === 'undefined') return 'both'; // SSR — never filter
  try {
    const stored = localStorage.getItem('school_user');
    if (!stored) return 'both';
    const user = JSON.parse(stored);
    const s = user?.school_section;
    if (s === 'primary')   return 'primary';
    if (s === 'secondary') return 'secondary';
    return 'both'; // null / undefined / 'both' / anything else → NO filter
  } catch {
    return 'both';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 🧠 SECTION-FILTERED TABLES
// ══════════════════════════════════════════════════════════════════════════════
// These tables have a `section` column added by the SQL migration.
// The interceptor adds a WHERE clause automatically so ALL 100+ pages that
// query these tables get the right data for the logged-in user's section.
//
// school_forms    — PP1/Grade1-6 vs Form1-4/Grade7-12
// school_subjects — Mathematical Activities vs Mathematics, etc.
//
// Everything else (school_students, school_exam_marks, school_attendance,
// school_fee_payments, etc.) flows automatically because they all JOIN
// through form_id or subject_id which are already section-filtered.
//
// section = 'primary'   → .eq('section', 'primary')
// section = 'secondary' → .neq('section', 'primary')   [catches NULL too]
// section = 'both'      → NO filter (Admin/Principal sees all)
// ══════════════════════════════════════════════════════════════════════════════
const SECTION_FILTERED_TABLES = new Set(['school_forms', 'school_subjects']);

function applySection(query: any, section: 'primary' | 'secondary' | 'both'): any {
  if (section === 'primary')   return query.eq('section', 'primary');
  if (section === 'secondary') return query.neq('section', 'primary');
  return query; // 'both' → unfiltered
}

// ── Lazy real client ─────────────────────────────────────────────────────────
export const supabase = new Proxy({} as SupabaseClient<any, 'public', any>, {
  get(_, prop) {
    if (!supabaseUrl || !supabaseAnonKey) return createNoopProxy();

    if (!_supabase) {
      _supabase = createClient<any>(supabaseUrl, supabaseAnonKey);
    }

    // ── Smart section filter ──────────────────────────────────────────────────
    // Intercepts .from('school_forms') and .from('school_subjects') ONLY.
    // For ALL other tables: passes through unchanged — zero impact.
    // For 'both' section (all existing users until DB migration runs): no filter.
    // ─────────────────────────────────────────────────────────────────────────
    if (prop === 'from') {
      return (table: string) => {
        const query = (_supabase as any).from(table);
        if (!SECTION_FILTERED_TABLES.has(table)) return query;
        const section = getSchoolSection();
        if (section === 'both') return query; // no filter — safe default
        return applySection(query, section);
      };
    }

    const val = (_supabase as any)[prop];
    return typeof val === 'function' ? val.bind(_supabase) : val;
  },
});

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
// School section override — used by primary-specific pages only.
// Shared pages (students, fees, attendance, etc.) do NOT filter by section
// at the DB level. They work for ALL users as-is.
//
// Primary differentiation happens at:
//  1. Sidebar menu (layout.tsx filterMenuGroups)
//  2. Primary-specific pages (/dashboard/primary/*)
//  3. Settings page (school_details section='primary' row)
// ══════════════════════════════════════════════════════════════════════════════
let _sectionOverride: 'primary' | 'secondary' | 'both' | null = null;

export function setSchoolSectionOverride(section: 'primary' | 'secondary' | 'both') {
  _sectionOverride = section;
}

export function clearSchoolSectionOverride() {
  _sectionOverride = null;
}

export function getSchoolSection(): 'primary' | 'secondary' | 'both' {
  if (_sectionOverride !== null) return _sectionOverride;
  if (typeof window === 'undefined') return 'both';
  try {
    const stored = localStorage.getItem('school_user');
    if (!stored) return 'both';
    const user = JSON.parse(stored);
    const s = user?.school_section;
    if (s === 'primary')   return 'primary';
    if (s === 'secondary') return 'secondary';
    return 'both';
  } catch {
    return 'both';
  }
}

// ── Plain Supabase client — NO query interception ────────────────────────────
// Removing the proxy interceptor that was filtering school_forms/school_subjects
// globally. That approach broke 100+ pages that depend on full form data.
//
// Primary-specific pages fetch with explicit .eq('section','primary') filters
// where needed. All other pages work normally.
// ────────────────────────────────────────────────────────────────────────────
export const supabase = new Proxy({} as SupabaseClient<any, 'public', any>, {
  get(_, prop) {
    if (!supabaseUrl || !supabaseAnonKey) return createNoopProxy();
    if (!_supabase) {
      _supabase = createClient<any>(supabaseUrl, supabaseAnonKey);
    }
    const val = (_supabase as any)[prop as string];
    return typeof val === 'function' ? val.bind(_supabase) : val;
  },
});

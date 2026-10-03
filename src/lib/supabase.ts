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
// 🏫 SCHOOL SECTION — module-level override + localStorage fallback
// ══════════════════════════════════════════════════════════════════════════════
//
// TWO-LAYER system:
//  Layer 1: _sectionOverride — set by layout.tsx immediately after DB fetch.
//           This is the most reliable source. Always wins.
//  Layer 2: localStorage.school_user.school_section — fallback, populated:
//           a) At login (login API now includes school_section)
//           b) After verifySession updates it from DB
//
// SAFETY: Returns 'both' (= NO filter) if section is unknown → zero data loss.
// ══════════════════════════════════════════════════════════════════════════════
let _sectionOverride: 'primary' | 'secondary' | 'both' | null = null;

/** Called by layout.tsx immediately after fetching fresh school_section from DB */
export function setSchoolSectionOverride(section: 'primary' | 'secondary' | 'both') {
  _sectionOverride = section;
}

export function clearSchoolSectionOverride() {
  _sectionOverride = null;
}

function getSchoolSection(): 'primary' | 'secondary' | 'both' {
  // Layer 1: module-level override (set by layout after fresh DB fetch)
  if (_sectionOverride !== null) return _sectionOverride;

  // Layer 2: localStorage (set at login or by verifySession)
  if (typeof window === 'undefined') return 'both'; // SSR — never filter
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

// ══════════════════════════════════════════════════════════════════════════════
// 🧠 SECTION-FILTERED TABLES
// ══════════════════════════════════════════════════════════════════════════════
// school_forms    — PP1/Grade1-6 vs Form1-4/Grade7-12
// school_subjects — Mathematical Activities vs Mathematics, etc.
//
// section = 'primary'   → .eq('section', 'primary')
// section = 'secondary' → .neq('section', 'primary')
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

    if (prop === 'from') {
      return (table: string) => {
        const query = (_supabase as any).from(table);
        if (!SECTION_FILTERED_TABLES.has(table)) return query;
        const section = getSchoolSection();
        if (section === 'both') return query;
        return applySection(query, section);
      };
    }

    const val = (_supabase as any)[prop];
    return typeof val === 'function' ? val.bind(_supabase) : val;
  },
});

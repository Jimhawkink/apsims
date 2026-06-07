import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient<any, 'public', any> | null = null;

// ── Build-safe no-op client ──────────────────────────────────────────────────
// During Next.js static-page generation (build time) env vars are not set.
// Instead of throwing and crashing the build, return a chainable no-op object
// that resolves with { data: null, error: null } so pages render gracefully.
function createNoopProxy(): any {
  const noop: any = new Proxy(
    () => Promise.resolve({ data: null, error: null }),
    {
      get: (_t, _p) => noop,
      apply: (_t, _th, args) => {
        // Last arg sometimes expects a callback; if so, ignore
        const last = args[args.length - 1];
        if (typeof last === 'function') last(null, null);
        return {
          ...noop,
          then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
          select: () => noop,
          insert: () => noop,
          update: () => noop,
          delete: () => noop,
          eq: () => noop,
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => noop,
          limit: () => noop,
          data: null,
          error: null,
        };
      },
    }
  );
  return noop;
}

// ── Lazy real client ─────────────────────────────────────────────────────────
export const supabase = new Proxy({} as SupabaseClient<any, 'public', any>, {
  get(_, prop) {
    // No env vars → build-time / CI: use no-op proxy, never throw
    if (!supabaseUrl || !supabaseAnonKey) {
      return createNoopProxy();
    }
    if (!_supabase) {
      _supabase = createClient<any>(supabaseUrl, supabaseAnonKey);
    }
    const val = (_supabase as any)[prop];
    return typeof val === 'function' ? val.bind(_supabase) : val;
  },
});

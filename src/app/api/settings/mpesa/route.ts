export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

// Service role client bypasses ALL RLS policies
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const MPESA_KEYS = [
  'mpesa_consumer_key',
  'mpesa_consumer_secret',
  'mpesa_shortcode',
  'mpesa_passkey',
  'mpesa_callback_url',
  'mpesa_environment',
  'mpesa_account_type',
  'mpesa_till_number',
];

// ── GET /api/settings/mpesa ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('school_settings')
      .select('key, value')
      .in('key', MPESA_KEYS);

    if (error) throw error;

    const config: Record<string, string> = {};
    (data || []).forEach((r: any) => { config[r.key] = r.value || ''; });

    return NextResponse.json({ config });
  } catch (err: any) {
    console.error('GET /api/settings/mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/settings/mpesa ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = ['admin', 'principal', 'bursar'];
    if (!allowed.includes((session.role || '').toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden: Admin/Principal/Bursar only' }, { status: 403 });
    }

    const body = await req.json();

    // Build upsert rows — only known keys
    const rows = MPESA_KEYS
      .filter(k => body[k] !== undefined && body[k] !== null)
      .map(k => ({ key: k, value: String(body[k]) }));

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No config keys provided' }, { status: 400 });
    }

    const supabase = adminClient();
    const { error } = await supabase
      .from('school_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true, saved: rows.length });
  } catch (err: any) {
    console.error('POST /api/settings/mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

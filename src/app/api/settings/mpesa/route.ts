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

// ── GET /api/settings/mpesa ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = adminClient();

    // Primary: school_mpesa_config (dedicated table with proper columns)
    const { data: cfg } = await supabase
      .from('school_mpesa_config')
      .select('consumer_key, consumer_secret, passkey, shortcode, callback_url, environment')
      .limit(1)
      .maybeSingle();

    // Extra: account_type + till_number stored in school_settings
    const { data: extras } = await supabase
      .from('school_settings')
      .select('key, value')
      .in('key', ['mpesa_account_type', 'mpesa_till_number']);

    const extrasMap: Record<string, string> = {};
    (extras || []).forEach((r: any) => { extrasMap[r.key] = r.value || ''; });

    const config = {
      mpesa_consumer_key:    cfg?.consumer_key    || '',
      mpesa_consumer_secret: cfg?.consumer_secret || '',
      mpesa_shortcode:       cfg?.shortcode       || '',
      mpesa_passkey:         cfg?.passkey         || '',
      mpesa_callback_url:    cfg?.callback_url    || '',
      mpesa_environment:     cfg?.environment     || 'production',
      mpesa_account_type:    extrasMap.mpesa_account_type || 'Till',
      mpesa_till_number:     extrasMap.mpesa_till_number  || '',
    };

    return NextResponse.json({ config });
  } catch (err: any) {
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
    const {
      mpesa_consumer_key, mpesa_consumer_secret, mpesa_shortcode,
      mpesa_passkey, mpesa_callback_url, mpesa_environment,
      mpesa_account_type, mpesa_till_number,
    } = body;

    const supabase = adminClient();

    // Check if a row exists in school_mpesa_config
    const { data: existing } = await supabase
      .from('school_mpesa_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    const configRow = {
      consumer_key:   mpesa_consumer_key    || '',
      consumer_secret: mpesa_consumer_secret || '',
      passkey:        mpesa_passkey         || '',
      shortcode:      mpesa_shortcode       || '',
      callback_url:   mpesa_callback_url    || '',
      environment:    mpesa_environment     || 'production',
      is_active:      true,
    };

    let cfgError: any;
    if (existing?.id) {
      // Update existing row
      const { error } = await supabase
        .from('school_mpesa_config')
        .update(configRow)
        .eq('id', existing.id);
      cfgError = error;
    } else {
      // Insert first row
      const { error } = await supabase
        .from('school_mpesa_config')
        .insert([configRow]);
      cfgError = error;
    }

    if (cfgError) throw new Error(`school_mpesa_config: ${cfgError.message}`);

    // Save account_type + till_number to school_settings
    if (mpesa_account_type || mpesa_till_number) {
      const extraRows = [
        { key: 'mpesa_account_type', value: mpesa_account_type || 'Till' },
        { key: 'mpesa_till_number',  value: mpesa_till_number  || '' },
      ].filter(r => r.value !== undefined);

      const { error: extErr } = await supabase
        .from('school_settings')
        .upsert(extraRows, { onConflict: 'key' });

      if (extErr) console.warn('school_settings extra save failed (non-fatal):', extErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Save M-Pesa config error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

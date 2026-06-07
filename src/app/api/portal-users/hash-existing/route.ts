export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { hashPassword, isBcryptHash } from '@/lib/auth';

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST: One-time migration to hash all existing plaintext passwords
export async function POST() {
  const supabase = getServiceClient();
  const { data: users, error } = await supabase
    .from('school_portal_users')
    .select('id, username, password_hash');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let upgraded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users || []) {
    if (!user.password_hash || isBcryptHash(user.password_hash)) {
      skipped++;
      continue;
    }
    try {
      const newHash = await hashPassword(user.password_hash);
      const { error: updateErr } = await supabase
        .from('school_portal_users')
        .update({ password_hash: newHash })
        .eq('id', user.id);
      if (updateErr) errors.push(`${user.username}: ${updateErr.message}`);
      else upgraded++;
    } catch (e: any) {
      errors.push(`${user.username}: ${e.message}`);
    }
  }

  return NextResponse.json({ upgraded, skipped, errors: errors.length ? errors : undefined });
}

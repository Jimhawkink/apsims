export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// PATCH: Toggle is_active status
export async function PATCH(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { id, is_active } = body;
  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_portal_users')
    .update({ is_active })
    .eq('id', id)
    .select('id, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

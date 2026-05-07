import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── PATCH /api/visitors/[id]/checkout ───
// Record check-out timestamp; restrict to Admin/Receptionist
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Receptionist'];
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Receptionist role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid visitor ID' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_visitor_cards')
    .update({ check_out_time: new Date().toISOString() })
    .eq('id', id)
    .is('check_out_time', null) // Only check out if not already checked out
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Visitor not found or already checked out' }, { status: 404 });

  return NextResponse.json({ data });
}

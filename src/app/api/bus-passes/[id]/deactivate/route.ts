import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── PATCH /api/bus-passes/[id]/deactivate ───
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Bursar'];
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid pass ID' }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch { /* reason is optional */ }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_bus_pass_cards')
    .update({
      status: 'Inactive',
      deactivation_date: new Date().toISOString().split('T')[0],
      deactivation_reason: body.reason?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Bus pass not found' }, { status: 404 });

  return NextResponse.json({ data });
}

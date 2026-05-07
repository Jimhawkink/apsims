import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const writeRoles = ['Admin', 'Receptionist'];

// ─── PATCH /api/emergency-contacts/[id] ───
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const update: any = {};
  if (body.contact_full_name !== undefined) update.contact_full_name = body.contact_full_name?.trim();
  if (body.relationship !== undefined) update.relationship = body.relationship?.trim();
  if (body.primary_phone !== undefined) update.primary_phone = body.primary_phone?.trim();
  if (body.secondary_phone !== undefined) update.secondary_phone = body.secondary_phone?.trim() || null;
  if (body.email !== undefined) update.email = body.email?.trim() || null;
  if (body.escalation_order !== undefined) update.escalation_order = Number(body.escalation_order);
  if (body.authorized_to_collect !== undefined) update.authorized_to_collect = body.authorized_to_collect === true || body.authorized_to_collect === 'true';

  const { data, error } = await supabase
    .from('school_emergency_contacts')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json({ data });
}

// ─── DELETE /api/emergency-contacts/[id] ───
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase.from('school_emergency_contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const writeRoles = ['Admin', 'Principal'];

// ─── PATCH /api/academic-events/[id] ───
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const update: any = {};
  if (body.title !== undefined) update.title = body.title?.trim();
  if (body.event_type !== undefined) update.event_type = body.event_type;
  if (body.start_date !== undefined) update.start_date = body.start_date;
  if (body.end_date !== undefined) update.end_date = body.end_date;
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.target_audience !== undefined) update.target_audience = body.target_audience;
  if (body.color_code !== undefined) update.color_code = body.color_code;

  const { data, error } = await supabase
    .from('school_academic_events')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json({ data });
}

// ─── DELETE /api/academic-events/[id] ───
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!writeRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase.from('school_academic_events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

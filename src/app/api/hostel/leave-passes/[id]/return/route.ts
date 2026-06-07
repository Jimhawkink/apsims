export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// PATCH /api/hostel/leave-passes/[id]/return — record actual return datetime
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid leave pass ID' }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch { /* use defaults */ }

  const actual_return_datetime = body.actual_return_datetime || new Date().toISOString();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_hostel_leave_passes')
    .update({ actual_return_datetime })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Leave pass not found' }, { status: 404 });
  return NextResponse.json({ data });
}

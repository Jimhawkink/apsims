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

// ─── PATCH /api/alumni/[id] ───
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['Admin', 'Principal'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid alumni ID' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const update: any = {};

  if (body.current_occupation !== undefined) update.current_occupation = body.current_occupation;
  if (body.employer_university !== undefined) update.employer_university = body.employer_university?.trim() || null;
  if (body.city_county !== undefined) update.city_county = body.city_county?.trim() || null;
  if (body.email !== undefined) update.email = body.email?.trim() || null;
  if (body.phone !== undefined) update.phone = body.phone?.trim() || null;
  if (body.full_name !== undefined) update.full_name = body.full_name?.trim();

  const { data, error } = await supabase
    .from('school_alumni')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Alumni record not found' }, { status: 404 });

  return NextResponse.json({ data });
}

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

// ─── PATCH /api/clinic/visits/[id] ───
// Support discharge (discharged=true, discharge_time) and referral note updates (referred_to)
// Restrict to Admin/Receptionist
export async function PATCH(
  req: NextRequest,
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
    return NextResponse.json({ error: 'Invalid visit ID' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const updateData: any = {};

  // Discharge flow
  if (body.discharged === true) {
    updateData.discharged = true;
    updateData.discharge_time = body.discharge_time || new Date().toISOString();
  }

  // Referral note update
  if (body.referred_to !== undefined) {
    updateData.referred_to = body.referred_to?.trim() || null;
  }

  // Allow updating other fields too
  if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis?.trim() || null;
  if (body.treatment !== undefined) updateData.treatment = body.treatment?.trim() || null;
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('school_clinic_visits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Visit not found' }, { status: 404 });

  return NextResponse.json({ data });
}

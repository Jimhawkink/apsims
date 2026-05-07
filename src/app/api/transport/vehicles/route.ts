import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/transport/vehicles — list vehicles for tenant joined with driver name
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_transport_vehicles')
    .select(`
      *,
      school_transport_drivers (
        id, full_name, phone, licence_number, licence_expiry_date
      )
    `)
    .order('registration_no');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/transport/vehicles — register a new vehicle; restrict to Admin/Bursar
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Bursar'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { registration_no, make_model, seating_capacity, driver_id } = body;

  if (!registration_no?.trim()) {
    return NextResponse.json({ error: 'registration_no is required' }, { status: 400 });
  }
  if (!make_model?.trim()) {
    return NextResponse.json({ error: 'make_model is required' }, { status: 400 });
  }
  if (!seating_capacity || Number(seating_capacity) < 1) {
    return NextResponse.json({ error: 'seating_capacity must be at least 1' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_transport_vehicles')
    .insert([{
      tenant_id: session.id,
      registration_no: registration_no.trim().toUpperCase(),
      make_model: make_model.trim(),
      seating_capacity: Number(seating_capacity),
      driver_id: driver_id || null,
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A vehicle with this registration number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/transport/routes — list routes with occupancy (active assignments vs vehicle capacity)
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();

  // Get current term
  const { data: currentTerm } = await supabase
    .from('school_terms')
    .select('id')
    .eq('is_current', true)
    .maybeSingle();

  const currentTermId = currentTerm?.id;

  // Get all routes with vehicle info
  const { data: routes, error } = await supabase
    .from('school_transport_routes')
    .select(`
      *,
      school_transport_vehicles (
        id, registration_no, make_model, seating_capacity
      )
    `)
    .order('route_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get active assignment counts per route for current term
  let assignmentCounts: Record<number, number> = {};
  if (currentTermId) {
    const { data: assignments } = await supabase
      .from('school_transport_assignments')
      .select('route_id')
      .eq('term_id', currentTermId)
      .eq('is_active', true);

    (assignments || []).forEach((a: any) => {
      assignmentCounts[a.route_id] = (assignmentCounts[a.route_id] || 0) + 1;
    });
  }

  const result = (routes || []).map((r: any) => ({
    ...r,
    stops_count: Array.isArray(r.stops) ? r.stops.length : 0,
    assigned_count: assignmentCounts[r.id] || 0,
    vehicle_capacity: r.school_transport_vehicles?.seating_capacity || 0,
  }));

  return NextResponse.json({ data: result });
}

// POST /api/transport/routes — create a new route; restrict to Admin/Bursar
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

  const { route_name, stops, total_distance_km, vehicle_id } = body;

  if (!route_name?.trim()) {
    return NextResponse.json({ error: 'route_name is required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_transport_routes')
    .insert([{
      tenant_id: session.id,
      route_name: route_name.trim(),
      stops: Array.isArray(stops) ? stops : [],
      total_distance_km: total_distance_km ? Number(total_distance_km) : null,
      vehicle_id: vehicle_id || null,
      is_active: true,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

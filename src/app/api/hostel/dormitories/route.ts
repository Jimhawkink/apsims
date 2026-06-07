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

// GET /api/hostel/dormitories — list all dorms with occupancy counts
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

  // Get all dorms
  const { data: dorms, error } = await supabase
    .from('school_hostels')
    .select('*, school_teachers(id, full_name)')
    .order('dorm_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get active bed counts per dorm for current term
  let bedCounts: Record<number, number> = {};
  if (currentTermId) {
    const { data: beds } = await supabase
      .from('school_hostel_beds')
      .select('hostel_id')
      .eq('is_active', true)
      .eq('term_id', currentTermId);

    (beds || []).forEach((b: any) => {
      bedCounts[b.hostel_id] = (bedCounts[b.hostel_id] || 0) + 1;
    });
  }

  const result = (dorms || []).map((d: any) => ({
    ...d,
    occupied_beds: bedCounts[d.id] || 0,
    occupancy_rate: d.total_capacity > 0
      ? Math.round(((bedCounts[d.id] || 0) / d.total_capacity) * 100)
      : 0,
  }));

  return NextResponse.json({ data: result });
}

// POST /api/hostel/dormitories — create dorm; restrict to Admin
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { dorm_name, gender, floor_number, total_capacity, matron_id } = body;
  if (!dorm_name?.trim() || !gender || !total_capacity) {
    return NextResponse.json({ error: 'dorm_name, gender, and total_capacity are required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_hostels')
    .insert([{
      tenant_id: session.id, // use session tenant or a fixed tenant
      dorm_name: dorm_name.trim(),
      gender,
      floor_number: floor_number || 1,
      total_capacity: Number(total_capacity),
      matron_id: matron_id || null,
      is_active: true,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

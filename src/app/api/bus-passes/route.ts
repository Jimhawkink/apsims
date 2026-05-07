import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/bus-passes ───
// Query params: route, status (Active|Inactive|Expired), form_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route = searchParams.get('route');
  const status = searchParams.get('status');
  const form_id = searchParams.get('form_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_bus_pass_cards')
    .select(`
      *,
      school_students (
        id,
        first_name,
        last_name,
        admission_number,
        admission_no,
        form_id
      )
    `)
    .order('issue_date', { ascending: false });

  if (route) query = query.eq('route_name', route);
  if (status === 'Active') query = query.eq('status', 'Active');
  if (status === 'Inactive') query = query.eq('status', 'Inactive');
  if (status === 'Expired') {
    query = query.lt('expiry_date', new Date().toISOString().split('T')[0]);
  }
  if (form_id) query = query.eq('school_students.form_id', Number(form_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/bus-passes ───
// Issue a new bus pass; restrict to Admin/Bursar
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Bursar'];
  if (!writeRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id, route_name, driver_name, pickup_point, issue_date, expiry_date } = body;

  if (!student_id || !route_name || !expiry_date) {
    return NextResponse.json({ error: 'student_id, route_name, and expiry_date are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Check for existing active pass
  const { data: active } = await supabase
    .from('school_bus_pass_cards')
    .select('id')
    .eq('student_id', Number(student_id))
    .eq('status', 'Active')
    .maybeSingle();

  if (active) {
    return NextResponse.json(
      { error: 'Student already has an active bus pass. Deactivate it first before issuing a new one.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('school_bus_pass_cards')
    .insert([{
      student_id: Number(student_id),
      route_name: route_name.trim(),
      driver_name: driver_name?.trim() || null,
      pickup_point: pickup_point?.trim() || null,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      expiry_date,
      status: 'Active',
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}


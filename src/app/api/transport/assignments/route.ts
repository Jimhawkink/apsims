import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/transport/assignments?route_id=&term_id=&form_id=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route_id = searchParams.get('route_id');
  const form_id = searchParams.get('form_id');
  let term_id = searchParams.get('term_id');

  const supabase = getServiceClient();

  // Default to current term if not provided
  if (!term_id) {
    const { data: currentTerm } = await supabase
      .from('school_terms')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();
    term_id = currentTerm?.id?.toString();
  }

  let query = supabase
    .from('school_transport_assignments')
    .select(`
      *,
      school_students (
        id, first_name, last_name, admission_number, admission_no, form_id,
        school_forms (id, form_name)
      ),
      school_transport_routes (id, route_name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (route_id) query = query.eq('route_id', Number(route_id));
  if (term_id) query = query.eq('term_id', Number(term_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by form_id if provided (via student join)
  let result = data || [];
  if (form_id) {
    result = result.filter((a: any) => a.school_students?.form_id === Number(form_id));
  }

  return NextResponse.json({ data: result });
}

// POST /api/transport/assignments — assign student to route; restrict to Admin/Bursar
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

  const { student_id, route_id, pickup_stop, assignment_date, term_id } = body;

  if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
  if (!route_id) return NextResponse.json({ error: 'route_id is required' }, { status: 400 });
  if (!pickup_stop?.trim()) return NextResponse.json({ error: 'pickup_stop is required' }, { status: 400 });
  if (!term_id) return NextResponse.json({ error: 'term_id is required' }, { status: 400 });

  const supabase = getServiceClient();

  // Check UNIQUE(student_id, term_id) — student can only be on one route per term
  const { data: existing } = await supabase
    .from('school_transport_assignments')
    .select('id')
    .eq('student_id', Number(student_id))
    .eq('term_id', Number(term_id))
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'This student is already assigned to a transport route for this term. Remove the existing assignment first.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('school_transport_assignments')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      route_id: Number(route_id),
      pickup_stop: pickup_stop.trim(),
      assignment_date: assignment_date || new Date().toISOString().split('T')[0],
      term_id: Number(term_id),
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This student is already assigned to a transport route for this term.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

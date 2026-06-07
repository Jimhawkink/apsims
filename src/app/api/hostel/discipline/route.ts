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

// GET /api/hostel/discipline?hostel_id=&student_id=&date_from=&date_to=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostel_id = searchParams.get('hostel_id');
  const student_id = searchParams.get('student_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_hostel_discipline')
    .select(`
      *,
      school_students (id, first_name, last_name, admission_number, admission_no),
      school_hostels (id, dorm_name)
    `)
    .order('incident_date', { ascending: false });

  if (hostel_id) query = query.eq('hostel_id', Number(hostel_id));
  if (student_id) query = query.eq('student_id', Number(student_id));
  if (date_from) query = query.gte('incident_date', date_from);
  if (date_to) query = query.lte('incident_date', date_to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/hostel/discipline — record incident; restrict to Admin/Principal
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Principal'];
  if (!writeRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id, hostel_id, incident_date, description, action_taken } = body;
  if (!student_id || !description?.trim()) {
    return NextResponse.json({ error: 'student_id and description are required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_hostel_discipline')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      hostel_id: hostel_id ? Number(hostel_id) : null,
      incident_date: incident_date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      action_taken: action_taken?.trim() || null,
      recorded_by: session.id,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}


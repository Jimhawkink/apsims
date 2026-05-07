import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/hostel/beds — list bed allocations filtered by hostel_id and term_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostel_id = searchParams.get('hostel_id');
  const term_id = searchParams.get('term_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_hostel_beds')
    .select(`
      *,
      school_students (id, first_name, last_name, admission_number, admission_no),
      school_hostels (id, dorm_name)
    `)
    .order('bed_number');

  if (hostel_id) query = query.eq('hostel_id', Number(hostel_id));
  if (term_id) query = query.eq('term_id', Number(term_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/hostel/beds — allocate bed; restrict to Admin
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id, hostel_id, bed_number, term_id } = body;
  if (!student_id || !hostel_id || !bed_number?.trim() || !term_id) {
    return NextResponse.json({ error: 'student_id, hostel_id, bed_number, and term_id are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_hostel_beds')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      hostel_id: Number(hostel_id),
      bed_number: bed_number.trim(),
      term_id: Number(term_id),
      allocation_date: new Date().toISOString().split('T')[0],
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    // Unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('student_id')) {
        return NextResponse.json(
          { error: 'This student is already allocated a bed in this term.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Bed ${bed_number} in this dorm is already allocated for this term.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

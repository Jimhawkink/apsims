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

// GET /api/hostel/attendance?hostel_id=&date=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hostel_id = searchParams.get('hostel_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!hostel_id) return NextResponse.json({ error: 'hostel_id is required' }, { status: 400 });

  const supabase = getServiceClient();

  const { data: sessions, error } = await supabase
    .from('school_hostel_attendance')
    .select(`
      *,
      school_hostel_attendance_items (
        *,
        school_students (id, first_name, last_name, admission_number, admission_no)
      )
    `)
    .eq('hostel_id', Number(hostel_id))
    .eq('roll_call_date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: sessions || [] });
}

// POST /api/hostel/attendance — upsert roll call session + items
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { hostel_id, roll_call_type, roll_call_date, items } = body;
  if (!hostel_id || !roll_call_type || !roll_call_date) {
    return NextResponse.json({ error: 'hostel_id, roll_call_type, and roll_call_date are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Upsert the roll call session
  const { data: attendanceSession, error: sessionError } = await supabase
    .from('school_hostel_attendance')
    .upsert({
      tenant_id: session.id,
      hostel_id: Number(hostel_id),
      roll_call_type,
      roll_call_date,
      recorded_by: session.id,
    }, { onConflict: 'hostel_id,roll_call_type,roll_call_date' })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // Upsert attendance items
  if (items && Array.isArray(items) && items.length > 0) {
    const itemsToUpsert = items.map((item: any) => ({
      attendance_id: attendanceSession.id,
      student_id: Number(item.student_id),
      status: item.status,
      remarks: item.remarks || null,
    }));

    const { error: itemsError } = await supabase
      .from('school_hostel_attendance_items')
      .upsert(itemsToUpsert, { onConflict: 'attendance_id,student_id' });

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: attendanceSession }, { status: 201 });
}


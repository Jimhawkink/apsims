import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/hostel/leave-passes?status=active|overdue|all
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';

  const supabase = getServiceClient();

  let query = supabase
    .from('school_hostel_leave_passes')
    .select(`
      *,
      school_students (id, first_name, last_name, admission_number, admission_no, guardian_phone)
    `)
    .order('departure_datetime', { ascending: false });

  if (status === 'active') {
    query = query.is('actual_return_datetime', null);
  } else if (status === 'overdue') {
    query = query
      .is('actual_return_datetime', null)
      .lt('expected_return_datetime', new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/hostel/leave-passes — create leave pass + send SMS
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id, departure_datetime, expected_return_datetime, destination, reason } = body;
  if (!student_id || !departure_datetime || !expected_return_datetime || !destination?.trim() || !reason?.trim()) {
    return NextResponse.json(
      { error: 'student_id, departure_datetime, expected_return_datetime, destination, and reason are required' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Get student + guardian phone
  const { data: student } = await supabase
    .from('school_students')
    .select('id, first_name, last_name, guardian_phone')
    .eq('id', Number(student_id))
    .maybeSingle();

  const { data: leavePass, error } = await supabase
    .from('school_hostel_leave_passes')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      departure_datetime,
      expected_return_datetime,
      destination: destination.trim(),
      reason: reason.trim(),
      authorized_by: session.id,
      sms_sent: false,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send SMS to guardian
  let smsSent = false;
  if (student?.guardian_phone) {
    try {
      const studentName = `${student.first_name} ${student.last_name}`;
      const depDate = new Date(departure_datetime).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      const retDate = new Date(expected_return_datetime).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      const message = `Dear Parent, ${studentName} has been granted leave from ${depDate} to ${retDate}. Destination: ${destination}. - APSIMS`;

      const smsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: student.guardian_phone, message }),
      });

      if (smsRes.ok) {
        smsSent = true;
        await supabase
          .from('school_hostel_leave_passes')
          .update({ sms_sent: true })
          .eq('id', leavePass.id);
      }
    } catch {
      // SMS failure should not block the leave pass creation
    }
  }

  return NextResponse.json({ data: { ...leavePass, sms_sent: smsSent } }, { status: 201 });
}

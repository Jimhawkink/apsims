import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/transport/notify — trigger bus departure/arrival SMS to all guardians on a route
// Restrict to Admin/Receptionist
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Receptionist'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Receptionist role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { route_id, notification_type, departure_time, arrival_time, estimated_arrival } = body;

  if (!route_id) return NextResponse.json({ error: 'route_id is required' }, { status: 400 });
  if (!notification_type || !['Departed', 'Arrived'].includes(notification_type)) {
    return NextResponse.json({ error: 'notification_type must be "Departed" or "Arrived"' }, { status: 400 });
  }
  if (notification_type === 'Departed' && !departure_time) {
    return NextResponse.json({ error: 'departure_time is required for Departed notifications' }, { status: 400 });
  }
  if (notification_type === 'Arrived' && !arrival_time) {
    return NextResponse.json({ error: 'arrival_time is required for Arrived notifications' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Get route name
  const { data: route, error: routeError } = await supabase
    .from('school_transport_routes')
    .select('id, route_name')
    .eq('id', Number(route_id))
    .maybeSingle();

  if (routeError || !route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  // Get current term
  const { data: currentTerm } = await supabase
    .from('school_terms')
    .select('id')
    .eq('is_current', true)
    .maybeSingle();

  if (!currentTerm) {
    return NextResponse.json({ error: 'No current term found' }, { status: 400 });
  }

  // Fetch all active assignments for this route in current term, join with student guardian phone
  const { data: assignments, error: assignError } = await supabase
    .from('school_transport_assignments')
    .select(`
      student_id,
      school_students (
        id, first_name, last_name, guardian_phone
      )
    `)
    .eq('route_id', Number(route_id))
    .eq('term_id', currentTerm.id)
    .eq('is_active', true);

  if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 });

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ data: { sent: 0, message: 'No active assignments for this route in the current term' } });
  }

  // Build message based on notification type
  const buildMessage = (routeName: string): string => {
    if (notification_type === 'Departed') {
      const eta = estimated_arrival ? ` ETA: ${estimated_arrival}.` : '';
      return `Dear Parent, the ${routeName} bus departed at ${departure_time}.${eta} - APSIMS`;
    } else {
      return `Dear Parent, the ${routeName} bus has arrived at ${arrival_time}. Your child is safely home. - APSIMS`;
    }
  };

  const message = buildMessage(route.route_name);

  // Get CSRF token from cookies for internal API call
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const csrfToken = cookieStore.get('alpha_csrf')?.value || '';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let sentCount = 0;
  const logRecords: any[] = [];

  // Send SMS to each guardian and collect log records
  for (const assignment of assignments) {
    const student = (assignment as any).school_students;
    const guardianPhone = student?.guardian_phone;

    if (!guardianPhone) continue;

    // Call /api/send-sms
    try {
      await fetch(`${baseUrl}/api/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          // Forward session cookie
          'Cookie': req.headers.get('cookie') || '',
        },
        body: JSON.stringify({ phone: guardianPhone, message }),
      });
      sentCount++;
    } catch (smsErr) {
      console.error('[Transport Notify] SMS error for student', assignment.student_id, smsErr);
    }

    logRecords.push({
      tenant_id: session.id,
      route_id: Number(route_id),
      notification_type,
      message_content: message,
      recipient_phone: guardianPhone,
      student_id: assignment.student_id,
      delivery_status: 'Sent',
    });
  }

  // Insert log records
  if (logRecords.length > 0) {
    const { error: logError } = await supabase
      .from('school_transport_sms_logs')
      .insert(logRecords);

    if (logError) {
      console.error('[Transport Notify] Log insert error:', logError.message);
    }
  }

  return NextResponse.json({
    data: {
      sent: sentCount,
      total_recipients: assignments.length,
      notification_type,
      route_name: route.route_name,
    },
  });
}

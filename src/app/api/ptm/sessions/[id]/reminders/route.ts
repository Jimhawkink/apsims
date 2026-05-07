import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/ptm/sessions/[id]/reminders ───
// Send SMS reminders to all guardians with confirmed bookings for sessions within 24 hours
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const sessionId = Number(params.id);
  if (!sessionId || isNaN(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ─── Get the PTM session ───
  const { data: ptmSession, error: sessionError } = await supabase
    .from('school_ptm_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  if (!ptmSession) return NextResponse.json({ error: 'PTM session not found' }, { status: 404 });

  // ─── Check session is within 24 hours ───
  const sessionDate = new Date(ptmSession.session_date);
  const now = new Date();
  const diffMs = sessionDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 24 || diffHours < -24) {
    return NextResponse.json({
      error: 'Reminders can only be sent for sessions occurring within 24 hours',
      session_date: ptmSession.session_date,
      hours_until: Math.round(diffHours),
    }, { status: 400 });
  }

  // ─── Get all confirmed bookings for this session ───
  const { data: bookings, error: bookingsError } = await supabase
    .from('school_ptm_bookings')
    .select(`
      *,
      school_ptm_slots!inner(
        start_time,
        end_time,
        session_id,
        school_teachers(first_name, last_name)
      )
    `)
    .eq('status', 'Booked')
    .eq('school_ptm_slots.session_id', sessionId);

  if (bookingsError) return NextResponse.json({ error: bookingsError.message }, { status: 500 });

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No confirmed bookings found for this session', sent: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  let sentCount = 0;

  for (const booking of bookings) {
    const slot = booking.school_ptm_slots;
    const teacherName = slot?.school_teachers
      ? `${slot.school_teachers.first_name} ${slot.school_teachers.last_name}`.trim()
      : 'your teacher';

    const message = `REMINDER: Dear ${booking.guardian_name}, your PTM appointment is TOMORROW. Session: ${ptmSession.title}, Date: ${ptmSession.session_date}, Time: ${slot?.start_time}-${slot?.end_time}, Venue: ${ptmSession.venue}, Teacher: ${teacherName}. - APSIMS`;

    try {
      const smsRes = await fetch(`${baseUrl}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: booking.guardian_phone, message }),
      });
      if (smsRes.ok) sentCount++;
    } catch (err) {
      console.error('[PTM Reminders] SMS error for booking', booking.id, err);
    }
  }

  return NextResponse.json({
    success: true,
    sent: sentCount,
    total: bookings.length,
    message: `Sent ${sentCount} reminder SMS messages`,
  });
}

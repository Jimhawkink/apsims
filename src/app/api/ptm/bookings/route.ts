import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/ptm/bookings ───
// Book a PTM slot for a guardian
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    slot_id,
    student_id,
    guardian_name,
    guardian_phone,
  }: {
    slot_id: number;
    student_id?: number;
    guardian_name: string;
    guardian_phone: string;
  } = body;

  if (!slot_id || !guardian_name?.trim() || !guardian_phone?.trim()) {
    return NextResponse.json({ error: 'slot_id, guardian_name, and guardian_phone are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ─── Check slot exists and is not already booked ───
  const { data: slot, error: slotError } = await supabase
    .from('school_ptm_slots')
    .select(`
      *,
      school_teachers(first_name, last_name),
      school_ptm_sessions(title, session_date, venue)
    `)
    .eq('id', slot_id)
    .maybeSingle();

  if (slotError) return NextResponse.json({ error: slotError.message }, { status: 500 });
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

  if (slot.is_booked) {
    return NextResponse.json({ error: 'This slot is already booked. Please choose another slot.' }, { status: 409 });
  }

  // ─── Insert booking ───
  const { data: booking, error: bookingError } = await supabase
    .from('school_ptm_bookings')
    .insert([{
      slot_id,
      student_id: student_id || null,
      guardian_name: guardian_name.trim(),
      guardian_phone: guardian_phone.trim(),
      status: 'Booked',
      sms_sent: false,
    }])
    .select()
    .single();

  if (bookingError) {
    if (bookingError.code === '23505') {
      return NextResponse.json({ error: 'This slot is already booked.' }, { status: 409 });
    }
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // ─── Mark slot as booked ───
  await supabase
    .from('school_ptm_slots')
    .update({ is_booked: true })
    .eq('id', slot_id);

  // ─── Send SMS confirmation ───
  const sessionInfo = slot.school_ptm_sessions;
  const teacherName = slot.school_teachers
    ? `${slot.school_teachers.first_name} ${slot.school_teachers.last_name}`.trim()
    : 'your teacher';

  const smsMessage = `Dear ${guardian_name.trim()}, your PTM slot is confirmed. Session: ${sessionInfo?.title || 'PTM'}, Date: ${sessionInfo?.session_date || ''}, Time: ${slot.start_time}-${slot.end_time}, Venue: ${sessionInfo?.venue || ''}, Teacher: ${teacherName}. - APSIMS`;

  let smsSent = false;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const smsRes = await fetch(`${baseUrl}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: guardian_phone.trim(), message: smsMessage }),
    });
    if (smsRes.ok) {
      smsSent = true;
      await supabase
        .from('school_ptm_bookings')
        .update({ sms_sent: true })
        .eq('id', booking.id);
    }
  } catch (err) {
    console.error('[PTM Booking] SMS send error:', err);
  }

  return NextResponse.json({
    data: { ...booking, sms_sent: smsSent },
    message: `Slot booked successfully${smsSent ? '. Confirmation SMS sent.' : '.'}`,
  }, { status: 201 });
}

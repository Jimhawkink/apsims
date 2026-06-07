export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/ptm/sessions/[id]/slots ───
// List all slots for session with booking status and teacher name
// No auth required (for portal access)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = Number(params.id);
  if (!sessionId || isNaN(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: slots, error } = await supabase
    .from('school_ptm_slots')
    .select(`
      *,
      school_teachers(first_name, last_name),
      school_ptm_bookings(id, guardian_name, guardian_phone, status, booked_at, student_id)
    `)
    .eq('session_id', sessionId)
    .order('start_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (slots || []).map((slot: any) => ({
    ...slot,
    teacher_name: slot.school_teachers
      ? `${slot.school_teachers.first_name} ${slot.school_teachers.last_name}`.trim()
      : null,
    booking: slot.school_ptm_bookings?.[0] || null,
    school_teachers: undefined,
    school_ptm_bookings: undefined,
  }));

  return NextResponse.json({ data: enriched });
}

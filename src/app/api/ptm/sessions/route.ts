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

// ─── GET /api/ptm/sessions ───
// List PTM sessions with slot counts
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal', 'Teacher'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin, Principal, or Teacher role required' }, { status: 403 });
  }

  const supabase = getServiceClient();

  const { data: sessions, error } = await supabase
    .from('school_ptm_sessions')
    .select(`
      *,
      school_forms(form_name),
      school_ptm_slots(id, is_booked)
    `)
    .order('session_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute slot counts
  const enriched = (sessions || []).map((s: any) => {
    const slots = s.school_ptm_slots || [];
    return {
      ...s,
      total_slots: slots.length,
      booked_slots: slots.filter((sl: any) => sl.is_booked).length,
      form_name: s.school_forms?.form_name || null,
      school_ptm_slots: undefined,
      school_forms: undefined,
    };
  });

  return NextResponse.json({ data: enriched });
}

// ─── POST /api/ptm/sessions ───
// Insert session with slots
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    title,
    session_date,
    venue,
    target_form_id,
    slots,
  }: {
    title: string;
    session_date: string;
    venue: string;
    target_form_id?: number;
    slots: Array<{ start_time: string; end_time: string; teacher_id: number }>;
  } = body;

  if (!title?.trim() || !session_date || !venue?.trim()) {
    return NextResponse.json({ error: 'title, session_date, and venue are required' }, { status: 400 });
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'At least one slot is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Insert session
  const { data: newSession, error: sessionError } = await supabase
    .from('school_ptm_sessions')
    .insert([{
      title: title.trim(),
      session_date,
      venue: venue.trim(),
      target_form_id: target_form_id || null,
      created_by: session.id,
    }])
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // Insert slots
  const slotRows = slots.map(slot => ({
    session_id: newSession.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    teacher_id: slot.teacher_id || null,
    is_booked: false,
  }));

  const { error: slotsError } = await supabase
    .from('school_ptm_slots')
    .insert(slotRows);

  if (slotsError) {
    // Rollback session
    await supabase.from('school_ptm_sessions').delete().eq('id', newSession.id);
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: newSession }, { status: 201 });
}


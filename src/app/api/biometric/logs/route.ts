import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const device_id = searchParams.get('device_id');
  const student_id = searchParams.get('student_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');
  const synced = searchParams.get('synced');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);

  let query = supabase
    .from('school_biometric_logs')
    .select(`
      *,
      student:school_students(id, first_name, last_name, admission_number),
      device:school_biometric_devices(id, device_name, brand, location)
    `)
    .order('punch_time', { ascending: false })
    .limit(limit);

  if (device_id) query = query.eq('device_id', device_id);
  if (student_id) query = query.eq('student_id', student_id);
  if (date_from) query = query.gte('punch_time', date_from);
  if (date_to) query = query.lte('punch_time', date_to);
  if (synced !== null) query = query.eq('synced_to_attendance', synced === 'true');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data, total: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.punch_time) return NextResponse.json({ error: 'punch_time is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('school_biometric_logs')
    .insert([{ ...body, synced_to_attendance: false }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data }, { status: 201 });
}

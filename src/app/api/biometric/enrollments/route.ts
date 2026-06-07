export const dynamic = 'force-dynamic';
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
  const is_active = searchParams.get('is_active');

  let query = supabase
    .from('school_biometric_enrollments')
    .select(`
      *,
      student:school_students(id, first_name, last_name, admission_number, form_id, stream_id),
      device:school_biometric_devices(id, device_name, brand, location)
    `)
    .order('enrolled_at', { ascending: false });

  if (device_id) query = query.eq('device_id', device_id);
  if (student_id) query = query.eq('student_id', student_id);
  if (is_active !== null) query = query.eq('is_active', is_active === 'true');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollments: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  const { student_id, device_id, enrollment_type, device_user_id } = body;
  if (!student_id || !device_id || !enrollment_type || !device_user_id) {
    return NextResponse.json({ error: 'student_id, device_id, enrollment_type, and device_user_id are required' }, { status: 400 });
  }

  // Upsert enrollment — update device_user_id on conflict
  const { data: enrollment, error: enrollError } = await supabase
    .from('school_biometric_enrollments')
    .upsert(
      [{ student_id, device_id, enrollment_type, device_user_id, is_active: true, enrolled_at: new Date().toISOString() }],
      { onConflict: 'student_id,device_id,enrollment_type' }
    )
    .select()
    .single();

  if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 500 });

  // Update student biometric fields
  await supabase
    .from('school_students')
    .update({ biometric_enrolled: true, biometric_device_user_id: device_user_id })
    .eq('id', student_id);

  return NextResponse.json({ enrollment }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from('school_biometric_enrollments')
    .update(updates)
    .eq('id', id)
    .select('*, student:school_students(id)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If deactivating, update student biometric_enrolled
  if (updates.is_active === false && data?.student) {
    const student = data.student as { id: number };
    await supabase
      .from('school_students')
      .update({ biometric_enrolled: false })
      .eq('id', student.id);
  }

  return NextResponse.json({ enrollment: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('school_biometric_enrollments')
    .update({ is_active: false })
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
